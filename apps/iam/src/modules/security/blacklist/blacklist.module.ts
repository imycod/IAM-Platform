import { Injectable, Module } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlacklistEntity } from './entities/blacklist.entity';

@Injectable()
export class BlacklistService {
  constructor(
    @InjectRepository(BlacklistEntity) private readonly repo: Repository<BlacklistEntity>,
  ) {}

  add(data: Partial<BlacklistEntity>): Promise<BlacklistEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async isBlacklisted(type: string, value: string): Promise<boolean> {
    const now = new Date();
    const hit = await this.repo.findOne({ where: { type, value } });
    if (!hit) {
      return false;
    }
    return !hit.expiresAt || hit.expiresAt.getTime() > now.getTime();
  }

  async purgeExpired(): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .delete()
      .where('expires_at IS NOT NULL AND expires_at < :now', { now: new Date() })
      .execute();
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([BlacklistEntity])],
  providers: [BlacklistService],
  exports: [BlacklistService],
})
export class BlacklistModule {}
