import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, LessThan, Repository } from 'typeorm';
import type { PaginatedResult } from '@app/common';
import { VerificationEntity, VerificationType } from '../entities/verification.entity';
import { CreateVerificationDto } from '../dto/create-verification.dto';
import { UpdateVerificationDto } from '../dto/update-verification.dto';
import { QueryVerificationDto } from '../dto/query-verification.dto';

@Injectable()
export class VerificationService {
  constructor(
    @InjectRepository(VerificationEntity)
    private readonly repo: Repository<VerificationEntity>,
  ) {}

  create(dto: CreateVerificationDto): Promise<VerificationEntity> {
    const ttlSeconds = dto.ttlSeconds ?? 600;
    const expiresAt = dto.expiresAt
      ? new Date(dto.expiresAt)
      : new Date(Date.now() + ttlSeconds * 1000);
    return this.repo.save(
      this.repo.create({
        identifier: dto.identifier,
        value: dto.value,
        type: dto.type,
        expiresAt,
      }),
    );
  }

  issue(params: {
    identifier: string;
    value: string;
    type: VerificationType;
    ttlSeconds: number;
  }): Promise<VerificationEntity> {
    return this.create({
      identifier: params.identifier,
      value: params.value,
      type: params.type,
      ttlSeconds: params.ttlSeconds,
    });
  }

  async findMany(query: QueryVerificationDto): Promise<PaginatedResult<VerificationEntity>> {
    const where: FindOptionsWhere<VerificationEntity> = {};
    if (query.identifier) where.identifier = query.identifier;
    if (query.type) where.type = query.type;
    const [items, total] = await this.repo.findAndCount({
      where,
      skip: query.skip,
      take: query.take,
      order: { createdAt: 'DESC' },
    });
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async findOne(id: string): Promise<VerificationEntity> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('验证记录不存在');
    }
    return row;
  }

  async update(id: string, dto: UpdateVerificationDto): Promise<VerificationEntity> {
    const row = await this.findOne(id);
    if (dto.value !== undefined) row.value = dto.value;
    if (dto.expiresAt !== undefined) row.expiresAt = new Date(dto.expiresAt);
    if (dto.consumedAt !== undefined) row.consumedAt = dto.consumedAt ? new Date(dto.consumedAt) : null;
    return this.repo.save(row);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.repo.softDelete({ id });
  }

  async verify(identifier: string, value: string, type: VerificationType): Promise<boolean> {
    const record = await this.repo.findOne({
      where: { identifier, value, type },
      order: { createdAt: 'DESC' },
    });
    if (!record || record.consumedAt || record.expiresAt.getTime() < Date.now()) {
      return false;
    }
    record.consumedAt = new Date();
    await this.repo.save(record);
    return true;
  }

  async purgeExpired(): Promise<number> {
    const result = await this.repo.delete({ expiresAt: LessThan(new Date()) });
    return result.affected ?? 0;
  }
}
