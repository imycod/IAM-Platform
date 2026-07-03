import { Controller, Get, Injectable, Module } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { SystemConfigEntity } from './config/entities/system-config.entity';
import { DictionaryEntity } from './dictionary/entities/dictionary.entity';
import { DictionaryItemEntity } from './dictionary/entities/dictionary-item.entity';
import { ParameterEntity } from './parameter/entities/parameter.entity';
import { ScheduledJobEntity } from './scheduler/entities/scheduled-job.entity';

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

  listPublic(): Promise<SystemConfigEntity[]> {
    return this.repo.find({ where: { isPublic: true } });
  }
}

@Injectable()
export class DictionaryService {
  constructor(
    @InjectRepository(DictionaryEntity)
    private readonly dictRepo: Repository<DictionaryEntity>,
    @InjectRepository(DictionaryItemEntity)
    private readonly itemRepo: Repository<DictionaryItemEntity>,
  ) {}

  async getItems(code: string): Promise<DictionaryItemEntity[]> {
    const dict = await this.dictRepo.findOne({ where: { code } });
    if (!dict) {
      return [];
    }
    return this.itemRepo.find({
      where: { dictionaryId: dict.id, enabled: true },
      order: { sort: 'ASC' },
    });
  }
}

@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  async check() {
    let db = 'down';
    try {
      await this.dataSource.query('SELECT 1');
      db = 'up';
    } catch {
      db = 'down';
    }
    return { status: db === 'up' ? 'ok' : 'degraded', db, timestamp: new Date().toISOString() };
  }
}

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SystemConfigEntity,
      DictionaryEntity,
      DictionaryItemEntity,
      ParameterEntity,
      ScheduledJobEntity,
    ]),
  ],
  controllers: [HealthController],
  providers: [SystemConfigService, DictionaryService],
  exports: [SystemConfigService, DictionaryService],
})
export class SystemModule {}
