import { Injectable, Module } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { LoginPolicyEntity } from './entities/login-policy.entity';

@Injectable()
export class LoginPolicyService {
  constructor(
    @InjectRepository(LoginPolicyEntity) private readonly repo: Repository<LoginPolicyEntity>,
  ) {}

  /** 取生效策略：优先组织级，回退全局。 */
  async resolve(organizationId?: string): Promise<LoginPolicyEntity | null> {
    if (organizationId) {
      const orgPolicy = await this.repo.findOne({ where: { organizationId } });
      if (orgPolicy) {
        return orgPolicy;
      }
    }
    return this.repo.findOne({ where: { organizationId: IsNull() } });
  }

  upsertGlobal(data: Partial<LoginPolicyEntity>): Promise<LoginPolicyEntity> {
    return this.repo.save(this.repo.create({ ...data, organizationId: null }));
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([LoginPolicyEntity])],
  providers: [LoginPolicyService],
  exports: [LoginPolicyService],
})
export class LoginPolicyModule {}
