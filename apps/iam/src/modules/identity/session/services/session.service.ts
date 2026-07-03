import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, LessThan, Repository } from 'typeorm';
import type { PaginatedResult } from '@app/common';
import { SessionEntity } from '../entities/session.entity';
import { CreateSessionDto } from '../dto/create-session.dto';
import { UpdateSessionDto } from '../dto/update-session.dto';
import { QuerySessionDto } from '../dto/query-session.dto';

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(SessionEntity)
    private readonly repo: Repository<SessionEntity>,
  ) {}

  create(dto: CreateSessionDto): Promise<SessionEntity> {
    return this.repo.save(
      this.repo.create({
        userId: dto.userId,
        token: dto.token,
        expiresAt: new Date(dto.expiresAt),
        ipAddress: dto.ipAddress ?? null,
        userAgent: dto.userAgent ?? null,
        deviceId: dto.deviceId ?? null,
      }),
    );
  }

  createFromPartial(data: Partial<SessionEntity>): Promise<SessionEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async findMany(query: QuerySessionDto): Promise<PaginatedResult<SessionEntity>> {
    const where: FindOptionsWhere<SessionEntity> = {};
    if (query.userId) where.userId = query.userId;
    const [items, total] = await this.repo.findAndCount({
      where,
      skip: query.skip,
      take: query.take,
      order: { createdAt: 'DESC' },
      relations: ['user', 'device'],
    });
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async findOne(id: string): Promise<SessionEntity> {
    const session = await this.repo.findOne({
      where: { id },
      relations: ['user', 'device'],
    });
    if (!session) {
      throw new NotFoundException('会话不存在');
    }
    return session;
  }

  async update(id: string, dto: UpdateSessionDto): Promise<SessionEntity> {
    const session = await this.findOne(id);
    if (dto.expiresAt !== undefined) session.expiresAt = new Date(dto.expiresAt);
    if (dto.ipAddress !== undefined) session.ipAddress = dto.ipAddress ?? null;
    if (dto.userAgent !== undefined) session.userAgent = dto.userAgent ?? null;
    if (dto.deviceId !== undefined) session.deviceId = dto.deviceId ?? null;
    return this.repo.save(session);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.repo.softDelete({ id });
  }

  findByToken(token: string): Promise<SessionEntity | null> {
    return this.repo.findOne({ where: { token } });
  }

  listByUser(userId: string): Promise<SessionEntity[]> {
    return this.repo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async revoke(id: string): Promise<void> {
    await this.repo.softDelete({ id });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.repo.softDelete({ userId });
  }

  async purgeExpired(): Promise<number> {
    const result = await this.repo.delete({ expiresAt: LessThan(new Date()) });
    return result.affected ?? 0;
  }
}
