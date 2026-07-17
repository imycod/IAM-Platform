import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import type { PaginatedResult } from '@app/common';
import { LoginHistoryEntity } from '../entities/login-history.entity';
import { CreateLoginHistoryDto } from '../dto/create-login-history.dto';
import { UpdateLoginHistoryDto } from '../dto/update-login-history.dto';
import { QueryLoginHistoryDto } from '../dto/query-login-history.dto';

@Injectable()
export class LoginHistoryService {
  constructor(
    @InjectRepository(LoginHistoryEntity)
    private readonly repo: Repository<LoginHistoryEntity>,
  ) {}

  create(dto: CreateLoginHistoryDto): Promise<LoginHistoryEntity> {
    return this.repo.save(this.repo.create(dto));
  }

  record(data: Partial<LoginHistoryEntity>): Promise<LoginHistoryEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async findMany(query: QueryLoginHistoryDto): Promise<PaginatedResult<LoginHistoryEntity>> {
    const where: FindOptionsWhere<LoginHistoryEntity> = {};
    if (query.userId) where.userId = query.userId;
    if (query.success !== undefined) where.success = query.success;
    if (query.applicationCode) where.applicationCode = query.applicationCode;
    if (query.clientId) where.clientId = query.clientId;
    const [items, total] = await this.repo.findAndCount({
      where,
      skip: query.skip,
      take: query.take,
      order: { createdAt: 'DESC' },
    });
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async findOne(id: string): Promise<LoginHistoryEntity> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('登录历史不存在');
    }
    return row;
  }

  async update(id: string, dto: UpdateLoginHistoryDto): Promise<LoginHistoryEntity> {
    await this.findOne(id);
    await this.repo.update({ id }, dto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.repo.softDelete({ id });
  }

  /** 按筛选条件批量软删除；无条件时清空全部登录历史 */
  async removeAll(query: QueryLoginHistoryDto): Promise<{ deleted: number }> {
    const where: FindOptionsWhere<LoginHistoryEntity> = {};
    if (query.userId) where.userId = query.userId;
    if (query.success !== undefined) where.success = query.success;
    if (query.applicationCode) where.applicationCode = query.applicationCode;
    if (query.clientId) where.clientId = query.clientId;

    const result =
      Object.keys(where).length > 0
        ? await this.repo.softDelete(where)
        : await this.repo.createQueryBuilder().softDelete().execute();

    return { deleted: result.affected ?? 0 };
  }

  async listByUser(
    userId: string,
    page = 1,
    pageSize = 20,
  ): Promise<PaginatedResult<LoginHistoryEntity>> {
    return this.findMany({ page, pageSize, userId } as QueryLoginHistoryDto);
  }
}
