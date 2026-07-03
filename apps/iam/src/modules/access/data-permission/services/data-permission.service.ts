import { ConflictException, Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ORGANIZATION_QUERY, type IOrganizationQuery } from '@app/contracts';
import { ResourceService } from '../../resource/services/resource.service';
import { RoleEntity } from '../../role/entities/role.entity';
import { UserRoleEntity } from '../../role/entities/user-role.entity';
import { DataPermissionEntity, DataScope } from '../entities/data-permission.entity';
import { CreateDataPermissionDto, UpdateDataPermissionDto } from '../dto/data-permission.dto';

export interface ResolvedDataScope {
  scope: DataScope;
  departmentIds?: string[];
  customExpr?: Record<string, unknown> | null;
}

export type DataPermissionListItem = Pick<
  DataPermissionEntity,
  'id' | 'roleId' | 'resource' | 'scope' | 'customExpr' | 'createdAt' | 'updatedAt' | 'deletedAt'
> & {
  roleName?: string | null;
  roleCode?: string | null;
  resourceName?: string | null;
};

@Injectable()
export class DataPermissionService {
  constructor(
    @InjectRepository(DataPermissionEntity)
    private readonly repo: Repository<DataPermissionEntity>,
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepo: Repository<UserRoleEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepo: Repository<RoleEntity>,
    private readonly resourceService: ResourceService,
    @Optional()
    @Inject(ORGANIZATION_QUERY)
    private readonly organizationQuery?: IOrganizationQuery,
  ) {}

  async findAll(filters?: {
    roleId?: string;
    resource?: string;
  }): Promise<DataPermissionListItem[]> {
    const qb = this.repo.createQueryBuilder('dp').orderBy('dp.createdAt', 'DESC');
    if (filters?.roleId) {
      qb.andWhere('dp.roleId = :roleId', { roleId: filters.roleId });
    }
    if (filters?.resource) {
      qb.andWhere('dp.resource LIKE :resource', { resource: `%${filters.resource}%` });
    }
    const rows = await qb.getMany();
    return this.attachRoleInfo(rows);
  }

  async findOne(id: string): Promise<DataPermissionListItem> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('数据权限不存在');
    }
    const [enriched] = await this.attachRoleInfo([row]);
    return enriched;
  }

  async create(dto: CreateDataPermissionDto): Promise<DataPermissionListItem> {
    await this.assertRoleExists(dto.roleId);
    const resourceCode = dto.resource.trim();
    await this.resourceService.assertExistsByCode(resourceCode);
    await this.assertUniqueRoleResource(dto.roleId, resourceCode);
    const saved = await this.repo.save(
      this.repo.create({
        roleId: dto.roleId,
        resource: resourceCode,
        scope: dto.scope,
        customExpr: dto.scope === DataScope.CUSTOM ? dto.customExpr ?? null : null,
      }),
    );
    const [enriched] = await this.attachRoleInfo([saved]);
    return enriched;
  }

  async update(id: string, dto: UpdateDataPermissionDto): Promise<DataPermissionListItem> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('数据权限不存在');
    }
    const roleId = dto.roleId ?? row.roleId;
    const resource = dto.resource !== undefined ? dto.resource.trim() : row.resource;
    if (dto.roleId !== undefined) {
      await this.assertRoleExists(dto.roleId);
    }
    if (dto.resource !== undefined) {
      await this.resourceService.assertExistsByCode(resource);
    }
    if (dto.roleId !== undefined || dto.resource !== undefined) {
      await this.assertUniqueRoleResource(roleId, resource, id);
    }

    if (dto.roleId !== undefined) row.roleId = dto.roleId;
    if (dto.resource !== undefined) row.resource = dto.resource;
    if (dto.scope !== undefined) row.scope = dto.scope;
    if (dto.scope !== undefined || dto.customExpr !== undefined) {
      const scope = dto.scope ?? row.scope;
      row.customExpr = scope === DataScope.CUSTOM ? dto.customExpr ?? row.customExpr ?? null : null;
    }

    const saved = await this.repo.save(row);
    const [enriched] = await this.attachRoleInfo([saved]);
    return enriched;
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.repo.softDelete({ id });
  }

  async resolveForUser(userId: string, resource: string): Promise<ResolvedDataScope> {
    const userRoles = await this.userRoleRepo.find({ where: { userId } });
    const roleIds = userRoles.map((ur) => ur.roleId);
    if (roleIds.length === 0) {
      return { scope: DataScope.SELF };
    }

    const rows = await this.repo.find({ where: { roleId: In(roleIds), resource } });
    if (rows.length === 0) {
      return { scope: DataScope.SELF };
    }

    const order = [DataScope.SELF, DataScope.DEPT, DataScope.DEPT_AND_CHILD, DataScope.ALL];
    let widest = rows[0];
    for (const row of rows) {
      if (order.indexOf(row.scope) > order.indexOf(widest.scope)) {
        widest = row;
      }
    }

    const result: ResolvedDataScope = { scope: widest.scope, customExpr: widest.customExpr };
    if (
      (widest.scope === DataScope.DEPT || widest.scope === DataScope.DEPT_AND_CHILD) &&
      this.organizationQuery
    ) {
      result.departmentIds = await this.organizationQuery.getManagedDepartmentIds(userId);
    }
    return result;
  }

  private async attachRoleInfo(rows: DataPermissionEntity[]): Promise<DataPermissionListItem[]> {
    if (rows.length === 0) {
      return [];
    }
    const roleIds = [...new Set(rows.map((r) => r.roleId))];
    const roles = await this.roleRepo.find({ where: { id: In(roleIds) } });
    const roleMap = new Map(roles.map((r) => [r.id, r]));

    const resourceCodes = [...new Set(rows.map((r) => r.resource))];
    const resources = await Promise.all(
      resourceCodes.map((code) => this.resourceService.findByCode(code)),
    );
    const resourceMap = new Map(
      resources.filter(Boolean).map((r) => [r!.code, r!.name]),
    );

    return rows.map((row) => ({
      ...row,
      roleName: roleMap.get(row.roleId)?.name ?? null,
      roleCode: roleMap.get(row.roleId)?.code ?? null,
      resourceName: resourceMap.get(row.resource) ?? null,
    }));
  }

  private async assertRoleExists(roleId: string): Promise<void> {
    const role = await this.roleRepo.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException('角色不存在');
    }
  }

  private async assertUniqueRoleResource(
    roleId: string,
    resource: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.repo.findOne({ where: { roleId, resource } });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException('该角色在此资源上已存在数据权限配置');
    }
  }
}
