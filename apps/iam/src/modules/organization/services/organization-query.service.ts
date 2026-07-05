import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    const ids = new Set<string>();
    for (const dept of led) {
      for (const id of await this.collectSubtreeDepartmentIds(dept.id, dept.organizationId)) {
        ids.add(id);
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
    if (!ownDept) {
      return [...ids];
    }

    for (const id of await this.collectSubtreeDepartmentIds(ownDept.id, ownDept.organizationId)) {
      ids.add(id);
    }

    return [...ids];
  }

  /** 按 parentId BFS 收集子树；path 历史数据有误时仍以 parentId 为准 */
  private async collectSubtreeDepartmentIds(
    rootId: string,
    organizationId: string,
  ): Promise<string[]> {
    const all = await this.departmentRepo.find({ where: { organizationId } });
    const childrenByParent = new Map<string | null, string[]>();

    for (const dept of all) {
      const parentId = dept.parentId ?? null;
      const siblings = childrenByParent.get(parentId) ?? [];
      siblings.push(dept.id);
      childrenByParent.set(parentId, siblings);
    }

    const ids: string[] = [];
    const seen = new Set<string>();
    const queue = [rootId];

    while (queue.length > 0) {
      const id = queue.shift()!;
      if (seen.has(id)) {
        continue;
      }
      seen.add(id);
      ids.push(id);
      for (const childId of childrenByParent.get(id) ?? []) {
        queue.push(childId);
      }
    }

    return ids;
  }
}
