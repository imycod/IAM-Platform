import { Injectable, Module } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RateLimitRuleEntity } from './entities/rate-limit-rule.entity';

@Injectable()
export class RateLimitService {
  constructor(
    @InjectRepository(RateLimitRuleEntity) private readonly repo: Repository<RateLimitRuleEntity>,
  ) {}

  create(data: Partial<RateLimitRuleEntity>): Promise<RateLimitRuleEntity> {
    return this.repo.save(this.repo.create(data));
  }

  listEnabled(): Promise<RateLimitRuleEntity[]> {
    return this.repo.find({ where: { enabled: true } });
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([RateLimitRuleEntity])],
  providers: [RateLimitService],
  exports: [RateLimitService],
})
export class RateLimitModule {}
