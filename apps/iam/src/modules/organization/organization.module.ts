import { Injectable, Module } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import {
  ORGANIZATION_QUERY,
  type IOrganizationQuery,
  type UserOrgContext,
} from '@app/contracts';
import { OrganizationEntity } from './organization/entities/organization.entity';
import { DepartmentEntity } from './department/entities/department.entity';
import { TeamEntity } from './team/entities/team.entity';
import { TeamMemberEntity } from './team/entities/team-member.entity';
import { PositionEntity } from './position/entities/position.entity';
import { EmployeeEntity } from './employee/entities/employee.entity';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectRepository(OrganizationEntity)
    private readonly repo: Repository<OrganizationEntity>,
  ) {}

  create(data: Partial<OrganizationEntity>): Promise<OrganizationEntity> {
    return this.repo.save(this.repo.create(data));
  }

  findAll(): Promise<OrganizationEntity[]> {
    return this.repo.find({ order: { sort: 'ASC' } });
  }
}

@Injectable()
export class DepartmentService {
  constructor(
    @InjectRepository(DepartmentEntity)
    private readonly repo: Repository<DepartmentEntity>,
  ) {}

  create(data: Partial<DepartmentEntity>): Promise<DepartmentEntity> {
    return this.repo.save(this.repo.create(data));
  }

  findByOrg(organizationId: string): Promise<DepartmentEntity[]> {
    return this.repo.find({ where: { organizationId }, order: { sort: 'ASC' } });
  }
}

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(EmployeeEntity)
    private readonly repo: Repository<EmployeeEntity>,
  ) {}

  create(data: Partial<EmployeeEntity>): Promise<EmployeeEntity> {
    return this.repo.save(this.repo.create(data));
  }

  findByUser(userId: string): Promise<EmployeeEntity | null> {
    return this.repo.findOne({ where: { userId } });
  }
}

/**
 * 对外暴露的组织查询能力（实现 @app/contracts 的 IOrganizationQuery）。
 * Access 域算数据权限时只依赖此接口，不直接查 organization 的表。
 */
@Injectable()
export class OrganizationQueryService implements IOrganizationQuery {
  constructor(
    @InjectRepository(EmployeeEntity)
    private readonly employeeRepo: Repository<EmployeeEntity>,
    @InjectRepository(DepartmentEntity)
    private readonly departmentRepo: Repository<DepartmentEntity>,
  ) {}

  async getUserOrgContext(userId: string): Promise<UserOrgContext | null> {
    const emp = await this.employeeRepo.findOne({ where: { userId } });
    if (!emp) {
      return null;
    }
    return {
      organizationId: emp.organizationId,
      departmentId: emp.departmentId,
      positionId: emp.positionId,
    };
  }

  async getManagedDepartmentIds(userId: string): Promise<string[]> {
    const emp = await this.employeeRepo.findOne({ where: { userId } });
    if (!emp) {
      return [];
    }
    // 用户作为负责人的部门 + 其子树（物化路径前缀匹配）
    const led = await this.departmentRepo.find({ where: { leaderEmployeeId: emp.id } });
    if (led.length === 0) {
      return [];
    }
    const ids = new Set<string>(led.map((d) => d.id));
    for (const dept of led) {
      if (dept.path) {
        const children = await this.departmentRepo.find({
          where: { path: Like(`${dept.path}%`) },
        });
        children.forEach((c) => ids.add(c.id));
      }
    }
    return [...ids];
  }
}

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrganizationEntity,
      DepartmentEntity,
      TeamEntity,
      TeamMemberEntity,
      PositionEntity,
      EmployeeEntity,
    ]),
  ],
  providers: [
    OrganizationService,
    DepartmentService,
    EmployeeService,
    OrganizationQueryService,
    { provide: ORGANIZATION_QUERY, useExisting: OrganizationQueryService },
  ],
  exports: [
    OrganizationService,
    DepartmentService,
    EmployeeService,
    ORGANIZATION_QUERY,
  ],
})
export class OrganizationModule {}
