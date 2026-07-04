import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import {
  ORGANIZATION_QUERY,
  type IOrganizationQuery,
  type UserOrgContext,
} from '@app/contracts';
import { EmployeeEntity } from '../employee/entities/employee.entity';
import { DepartmentEntity } from '../department/entities/department.entity';

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

  async getAccessibleDepartmentIds(userId: string, includeSubtree: boolean): Promise<string[]> {
    const emp = await this.employeeRepo.findOne({ where: { userId } });
    if (!emp?.departmentId) {
      return this.getManagedDepartmentIds(userId);
    }

    const ids = new Set<string>(await this.getManagedDepartmentIds(userId));
    ids.add(emp.departmentId);

    if (!includeSubtree) {
      return [...ids];
    }

    const ownDept = await this.departmentRepo.findOne({ where: { id: emp.departmentId } });
    if (ownDept?.path) {
      const subtree = await this.departmentRepo.find({
        where: { path: Like(`${ownDept.path}%`) },
      });
      subtree.forEach((d) => ids.add(d.id));
    }

    return [...ids];
  }
}
