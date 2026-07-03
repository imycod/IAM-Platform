import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import type { PaginatedResult } from '@app/common';
import { ProfileEntity } from '../entities/profile.entity';
import { CreateProfileDto } from '../dto/create-profile.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { QueryProfileDto } from '../dto/query-profile.dto';
import { UpsertProfileDto } from '../dto/upsert-profile.dto';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(ProfileEntity)
    private readonly repo: Repository<ProfileEntity>,
  ) {}

  async create(dto: CreateProfileDto): Promise<ProfileEntity> {
    const exists = await this.repo.findOne({ where: { userId: dto.userId } });
    if (exists) {
      throw new ConflictException('该用户已有档案');
    }
    const { userId, ...rest } = dto;
    return this.repo.save(this.repo.create({ userId, ...rest }));
  }

  async findMany(query: QueryProfileDto): Promise<PaginatedResult<ProfileEntity>> {
    const where: FindOptionsWhere<ProfileEntity> = {};
    if (query.userId) where.userId = query.userId;
    const [items, total] = await this.repo.findAndCount({
      where,
      skip: query.skip,
      take: query.take,
      order: { createdAt: 'DESC' },
      relations: ['user'],
    });
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async findOne(id: string): Promise<ProfileEntity> {
    const profile = await this.repo.findOne({ where: { id }, relations: ['user'] });
    if (!profile) {
      throw new NotFoundException('资料不存在');
    }
    return profile;
  }

  async update(id: string, dto: UpdateProfileDto): Promise<ProfileEntity> {
    const profile = await this.findOne(id);
    Object.assign(profile, dto);
    return this.repo.save(profile);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.repo.softDelete({ id });
  }

  async getByUserId(userId: string): Promise<ProfileEntity> {
    const profile = await this.repo.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('资料不存在');
    }
    return profile;
  }

  async upsert(userId: string, dto: UpsertProfileDto): Promise<ProfileEntity> {
    let profile = await this.repo.findOne({ where: { userId } });
    if (!profile) {
      profile = this.repo.create({ userId, ...dto });
    } else {
      Object.assign(profile, dto);
    }
    return this.repo.save(profile);
  }
}
