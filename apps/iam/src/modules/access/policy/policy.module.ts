import { Injectable, Module } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PolicyEntity } from './entities/policy.entity';

@Injectable()
export class PolicyService {
  constructor(
    @InjectRepository(PolicyEntity) private readonly repo: Repository<PolicyEntity>,
  ) {}

  create(data: Partial<PolicyEntity>): Promise<PolicyEntity> {
    return this.repo.save(this.repo.create(data));
  }

  findByRole(roleId: string): Promise<PolicyEntity[]> {
    return this.repo.find({ where: { roleId } });
  }

  findAll(): Promise<PolicyEntity[]> {
    return this.repo.find();
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([PolicyEntity])],
  providers: [PolicyService],
  exports: [PolicyService],
})
export class PolicyModule {}
