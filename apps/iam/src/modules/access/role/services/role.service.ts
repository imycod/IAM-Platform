import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { RoleEntity } from '../entities/role.entity';
import { RolePermissionEntity } from '../entities/role-permission.entity';
import { UserRoleEntity } from '../entities/user-role.entity';
import { UserEntity } from '../../../identity/user/entities/user.entity';
import { UpdateRoleDto } from '../dto/update-role.dto';
import type { UserRoleAssignmentItem } from '../dto/user-role-assignment.dto';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepo: Repository<RoleEntity>,
    @InjectRepository(RolePermissionEntity)
    private readonly rolePermissionRepo: Repository<RolePermissionEntity>,
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepo: Repository<UserRoleEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  async create(data: Partial<RoleEntity>): Promise<RoleEntity> {
    const existing = await this.roleRepo.findOne({
      where: { applicationId: data.applicationId ?? IsNull(), code: data.code },
      withDeleted: true,
    });
    if (existing?.deletedAt) {
      await this.roleRepo.recover(existing);
      if (data.name !== undefined) existing.name = data.name;
      if (data.type !== undefined) existing.type = data.type;
      if (data.description !== undefined) existing.description = data.description;
      return this.roleRepo.save(existing);
    }
    if (existing) {
      throw new ConflictException('角色编码已存在');
    }
    return this.roleRepo.save(this.roleRepo.create(data));
  }

  findAll(applicationId?: string, all?: boolean): Promise<RoleEntity[]> {
    if (all) {
      return this.roleRepo.find({ order: { createdAt: 'DESC' } });
    }
    return this.roleRepo.find({
      where: { applicationId: applicationId ?? IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<RoleEntity> {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException('角色不存在');
    }
    return role;
  }

  async update(id: string, dto: UpdateRoleDto): Promise<RoleEntity> {
    const role = await this.findOne(id);
    const code = dto.code ?? role.code;
    if (code !== role.code) {
      const exists = await this.roleRepo.findOne({
        where: { applicationId: role.applicationId ?? IsNull(), code },
      });
      if (exists && exists.id !== id) {
        throw new ConflictException('角色编码已存在');
      }
    }
    if (dto.name !== undefined) role.name = dto.name;
    if (dto.code !== undefined) role.code = dto.code;
    if (dto.type !== undefined) role.type = dto.type;
    if (dto.description !== undefined) role.description = dto.description;
    return this.roleRepo.save(role);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.rolePermissionRepo.delete({ roleId: id });
    await this.userRoleRepo.delete({ roleId: id });
    await this.roleRepo.softDelete({ id });
  }

  /** 全量设置角色的权限。 */
  async setPermissions(roleId: string, permissionIds: string[]): Promise<void> {
    await this.findOne(roleId);
    await this.rolePermissionRepo.delete({ roleId });
    if (permissionIds.length > 0) {
      const rows = permissionIds.map((permissionId) =>
        this.rolePermissionRepo.create({ roleId, permissionId }),
      );
      await this.rolePermissionRepo.save(rows);
    }
  }

  async getPermissionIds(roleId: string): Promise<string[]> {
    const rows = await this.rolePermissionRepo.find({ where: { roleId } });
    return rows.map((r) => r.permissionId);
  }

  /** 给用户授予角色（幂等）。 */
  async assignToUser(userId: string, roleId: string, applicationId?: string): Promise<void> {
    await this.findOne(roleId);
    const exists = await this.userRoleRepo.findOne({
      where: { userId, roleId, applicationId: applicationId ?? IsNull() },
    });
    if (!exists) {
      await this.userRoleRepo.save(
        this.userRoleRepo.create({ userId, roleId, applicationId: applicationId ?? null }),
      );
    }
  }

  async revokeFromUser(userId: string, roleId: string): Promise<void> {
    await this.userRoleRepo.delete({ userId, roleId });
  }

  /** 用户角色分配列表（访问控制 → 用户角色配置） */
  async listUserRoleAssignments(filters?: {
    applicationId?: string;
    roleId?: string;
    userId?: string;
  }): Promise<UserRoleAssignmentItem[]> {
    const qb = this.userRoleRepo
      .createQueryBuilder('ur')
      .orderBy('ur.createdAt', 'DESC');

    if (filters?.applicationId) {
      qb.andWhere('ur.applicationId = :applicationId', {
        applicationId: filters.applicationId,
      });
    }
    if (filters?.roleId) {
      qb.andWhere('ur.roleId = :roleId', { roleId: filters.roleId });
    }
    if (filters?.userId) {
      qb.andWhere('ur.userId = :userId', { userId: filters.userId });
    }

    const rows = await qb.getMany();
    if (rows.length === 0) {
      return [];
    }

    const roleIds = [...new Set(rows.map((row) => row.roleId))];
    const userIds = [...new Set(rows.map((row) => row.userId))];
    const [roles, users] = await Promise.all([
      this.roleRepo.find({ where: { id: In(roleIds) } }),
      this.userRepo.find({ where: { id: In(userIds) } }),
    ]);
    const roleMap = new Map(roles.map((role) => [role.id, role]));
    const userMap = new Map(users.map((user) => [user.id, user]));

    const result: UserRoleAssignmentItem[] = [];
    for (const row of rows) {
      const role = roleMap.get(row.roleId);
      const user = userMap.get(row.userId);
      if (!role || !user) {
        continue;
      }
      result.push({
        id: row.id,
        userId: row.userId,
        roleId: row.roleId,
        applicationId: row.applicationId,
        createdAt: row.createdAt,
        role: {
          id: role.id,
          name: role.name,
          code: role.code,
          applicationId: role.applicationId,
          type: role.type,
        },
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
        },
      });
    }
    return result;
  }

  async getUserRoles(userId: string): Promise<RoleEntity[]> {
    const userRoles = await this.userRoleRepo.find({ where: { userId } });
    const roleIds = userRoles.map((ur) => ur.roleId);
    if (roleIds.length === 0) {
      return [];
    }
    return this.roleRepo.find({ where: { id: In(roleIds) } });
  }
}
