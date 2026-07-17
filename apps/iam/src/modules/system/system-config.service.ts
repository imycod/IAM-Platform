import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemConfigEntity } from './config/entities/system-config.entity';

@Injectable()
export class SystemConfigService {
  constructor(
    @InjectRepository(SystemConfigEntity)
    private readonly repo: Repository<SystemConfigEntity>,
  ) {}

  async get(key: string): Promise<string | null> {
    const row = await this.repo.findOne({ where: { configKey: key } });
    return row?.configValue ?? null;
  }

  set(data: Partial<SystemConfigEntity>): Promise<SystemConfigEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async upsertByKey(
    data: Partial<SystemConfigEntity> & { configKey: string },
  ): Promise<SystemConfigEntity> {
    const existing = await this.repo.findOne({ where: { configKey: data.configKey } });
    if (existing) {
      Object.assign(existing, data);
      return this.repo.save(existing);
    }
    return this.repo.save(this.repo.create(data));
  }

  async removeByKey(key: string): Promise<void> {
    await this.repo.delete({ configKey: key });
  }

  listPublic(): Promise<SystemConfigEntity[]> {
    return this.repo.find({ where: { isPublic: true } });
  }
}
