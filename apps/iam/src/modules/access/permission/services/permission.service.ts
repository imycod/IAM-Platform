import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { ApplicationEntity } from '../../../application/application/entities/application.entity';
import { PermissionEntity } from '../entities/permission.entity';
import { RolePermissionEntity } from '../../role/entities/role-permission.entity';
import { UserRoleEntity } from '../../role/entities/user-role.entity';
import { CreatePermissionDto, UpdatePermissionDto } from '../dto/permission.dto';
import type { PermissionDetailDto } from '../dto/permission-detail.dto';

/** 与 iam-client 前端 hasPerms 一致：拥有全部按钮/菜单权限 */
export const ALL_PERMISSIONS_CODE = '*:*:*';

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(PermissionEntity)
    private readonly permissionRepo: Repository<PermissionEntity>,
    @InjectRepository(RolePermissionEntity)
    private readonly rolePermissionRepo: Repository<RolePermissionEntity>,
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepo: Repository<UserRoleEntity>,
    @InjectRepository(ApplicationEntity)
    private readonly applicationRepo: Repository<ApplicationEntity>,
  ) {}

  async create(dto: CreatePermissionDto): Promise<PermissionDetailDto> {
    const applicationId = dto.applicationId ?? null;
    if (applicationId) {
      await this.assertApplicationExists(applicationId);
    }
    const existing = await this.permissionRepo.findOne({
      where: { applicationId: applicationId ?? IsNull(), code: dto.code },
      withDeleted: true,
    });
    if (existing?.deletedAt) {
      await this.permissionRepo.recover(existing);
      existing.name = dto.name;
      existing.resource = dto.resource;
      existing.action = dto.action;
      const saved = await this.permissionRepo.save(existing);
      const [enriched] = await this.attachApplicationInfo([saved]);
      return enriched;
    }
    if (existing) {
      throw new ConflictException('权限编码已存在');
    }
    const saved = await this.permissionRepo.save(
      this.permissionRepo.create({
        applicationId,
        name: dto.name,
        code: dto.code,
        resource: dto.resource,
        action: dto.action,
      }),
    );
    const [enriched] = await this.attachApplicationInfo([saved]);
    return enriched;
  }

  async findAll(filters?: {
    applicationId?: string;
    resource?: string;
    code?: string;
    name?: string;
  }): Promise<PermissionDetailDto[]> {
    const qb = this.permissionRepo
      .createQueryBuilder('p')
      .orderBy('p.resource', 'ASC')
      .addOrderBy('p.action', 'ASC');

    if (filters?.applicationId === 'platform') {
      qb.andWhere('p.applicationId IS NULL');
    } else if (filters?.applicationId) {
      qb.andWhere('p.applicationId = :applicationId', {
        applicationId: filters.applicationId,
      });
    }
    if (filters?.resource?.trim()) {
      qb.andWhere('p.resource LIKE :resource', {
        resource: `%${filters.resource.trim()}%`,
      });
    }
    if (filters?.code?.trim()) {
      qb.andWhere('p.code LIKE :code', { code: `%${filters.code.trim()}%` });
    }
    if (filters?.name?.trim()) {
      qb.andWhere('p.name LIKE :name', { name: `%${filters.name.trim()}%` });
    }

    const rows = await qb.getMany();
    return this.attachApplicationInfo(rows);
  }

  async findOne(id: string): Promise<PermissionDetailDto> {
    const row = await this.permissionRepo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('权限不存在');
    }
    const [enriched] = await this.attachApplicationInfo([row]);
    return enriched;
  }

  async update(id: string, dto: UpdatePermissionDto): Promise<PermissionDetailDto> {
    const row = await this.permissionRepo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('权限不存在');
    }
    const code = dto.code ?? row.code;
    if (code !== row.code) {
      const exists = await this.permissionRepo.findOne({
        where: { applicationId: row.applicationId ?? IsNull(), code },
        withDeleted: true,
      });
      if (exists && exists.id !== id && !exists.deletedAt) {
        throw new ConflictException('权限编码已存在');
      }
    }

    if (dto.name !== undefined) row.name = dto.name;
    if (dto.code !== undefined) row.code = dto.code;
    if (dto.resource !== undefined) row.resource = dto.resource;
    if (dto.action !== undefined) row.action = dto.action;

    const saved = await this.permissionRepo.save(row);
    const [enriched] = await this.attachApplicationInfo([saved]);
    return enriched;
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.rolePermissionRepo.delete({ permissionId: id });
    await this.permissionRepo.softDelete({ id });
  }

  private async assertApplicationExists(applicationId: string): Promise<void> {
    const app = await this.applicationRepo.findOne({ where: { id: applicationId } });
    if (!app) {
      throw new NotFoundException('应用不存在');
    }
  }

  private async attachApplicationInfo(
    rows: PermissionEntity[],
  ): Promise<PermissionDetailDto[]> {
    if (!rows.length) {
      return [];
    }
    const appIds = [
      ...new Set(rows.map((row) => row.applicationId).filter(Boolean) as string[]),
    ];
    const apps = appIds.length
      ? await this.applicationRepo.find({ where: { id: In(appIds) } })
      : [];
    const appMap = new Map(apps.map((app) => [app.id, app]));

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      resource: row.resource,
      action: row.action,
      applicationId: row.applicationId,
      application: row.applicationId
        ? appMap.get(row.applicationId)
          ? {
              id: row.applicationId,
              name: appMap.get(row.applicationId)!.name,
              code: appMap.get(row.applicationId)!.code,
            }
          : null
        : null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  /**
   * 计算某用户在指定应用（可选）下拥有的全部权限编码集合。
   * user_role → role_permission → permission。
   */
  async resolveUserPermissionCodes(userId: string, applicationId?: string): Promise<string[]> {
    const userRoles = await this.userRoleRepo.find({ where: { userId } });
    const roleIds = userRoles
      .filter((ur) => !applicationId || !ur.applicationId || ur.applicationId === applicationId)
      .map((ur) => ur.roleId);
    if (roleIds.length === 0) {
      return [];
    }

    const rolePermissions = await this.rolePermissionRepo.find({
      where: { roleId: In(roleIds) },
    });
    const permissionIds = [...new Set(rolePermissions.map((rp) => rp.permissionId))];
    if (permissionIds.length === 0) {
      return [];
    }

    const permissions = await this.permissionRepo.find({ where: { id: In(permissionIds) } });
    return [...new Set(permissions.map((p) => p.code))];
  }

  hasAllPermissions(codes: string[]): boolean {
    return codes.includes(ALL_PERMISSIONS_CODE);
  }
}
