import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { RoleService } from '../../../access/role/services/role.service';
import { PermissionEntity } from '../../../access/permission/entities/permission.entity';
import { RoleEntity, RoleType } from '../../../access/role/entities/role.entity';
import { ApplicationEntity } from '../../application/entities/application.entity';
import { ApplicationRoleEntity } from '../entities/application-role.entity';
import { CreateApplicationRoleDto } from '../dto/create-application-role.dto';
import { UpdateApplicationRoleDto } from '../dto/update-application-role.dto';
import type { ApplicationRoleDetailDto } from '../dto/application-role-detail.dto';
import { buildAccessRoleCode } from '../utils/access-role-code.util';

@Injectable()
export class ApplicationRoleService {
  constructor(
    @InjectRepository(ApplicationRoleEntity)
    private readonly applicationRoleRepo: Repository<ApplicationRoleEntity>,
    @InjectRepository(ApplicationEntity)
    private readonly applicationRepo: Repository<ApplicationEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepo: Repository<RoleEntity>,
    @InjectRepository(PermissionEntity)
    private readonly permissionRepo: Repository<PermissionEntity>,
    private readonly roleService: RoleService,
  ) {}

  async create(dto: CreateApplicationRoleDto): Promise<ApplicationRoleDetailDto> {
    const application = await this.requireApplication(dto.applicationId!);

    const exists = await this.applicationRoleRepo.findOne({
      where: { applicationId: application.id, code: dto.code },
    });
    if (exists) {
      throw new ConflictException('该应用下角色编码已存在');
    }

    const accessRoleCode = buildAccessRoleCode(application.code, dto.code);
    let accessRole = await this.roleRepo.findOne({
      where: { applicationId: application.id, code: accessRoleCode },
      withDeleted: true,
    });
    if (accessRole?.deletedAt) {
      await this.roleRepo.recover(accessRole);
      accessRole.name = dto.name;
      accessRole.description = `应用角色「${dto.name}」的访问控制映射`;
      accessRole = await this.roleRepo.save(accessRole);
    } else if (!accessRole) {
      accessRole = await this.roleService.create({
        applicationId: application.id,
        name: dto.name,
        code: accessRoleCode,
        type: RoleType.APPLICATION,
        description: `应用角色「${dto.name}」的访问控制映射`,
      });
    }

    const row = await this.applicationRoleRepo.save(
      this.applicationRoleRepo.create({
        applicationId: application.id,
        name: dto.name,
        code: dto.code,
        accessRoleId: accessRole.id,
      }),
    );

    return this.toDetail(row, accessRole, []);
  }

  async findAll(applicationId?: string): Promise<ApplicationRoleDetailDto[]> {
    const rows = await this.applicationRoleRepo.find({
      where: { applicationId: applicationId ?? IsNull() },
      order: { createdAt: 'DESC' },
    });

    const results: ApplicationRoleDetailDto[] = [];
    for (const row of rows) {
      results.push(await this.toDetailWithSync(row));
    }
    return results;
  }

  async findOne(applicationId: string, id: string): Promise<ApplicationRoleDetailDto> {
    const row = await this.requireApplicationRole(applicationId, id);
    return this.toDetailWithSync(row);
  }

  async update(
    applicationId: string,
    id: string,
    dto: UpdateApplicationRoleDto,
  ): Promise<ApplicationRoleDetailDto> {
    const row = await this.requireApplicationRole(applicationId, id);
    const accessRole = await this.ensureAccessRoleLinked(row);

    if (dto.name !== undefined) {
      row.name = dto.name;
      accessRole.name = dto.name;
    }
    if (dto.description !== undefined) {
      accessRole.description = dto.description;
    }

    await this.roleRepo.save(accessRole);
    const saved = await this.applicationRoleRepo.save(row);
    const permissionIds = await this.roleService.getPermissionIds(accessRole.id);
    return this.toDetail(saved, accessRole, permissionIds);
  }

  async getPermissionIds(applicationId: string, id: string): Promise<string[]> {
    const row = await this.requireApplicationRole(applicationId, id);
    const accessRole = await this.ensureAccessRoleLinked(row);
    return this.roleService.getPermissionIds(accessRole.id);
  }

  async setPermissions(
    applicationId: string,
    id: string,
    permissionIds: string[],
  ): Promise<ApplicationRoleDetailDto> {
    const row = await this.requireApplicationRole(applicationId, id);
    const accessRole = await this.ensureAccessRoleLinked(row);

    if (permissionIds.length > 0) {
      const valid = await this.permissionRepo
        .createQueryBuilder('p')
        .where('p.id IN (:...ids)', { ids: permissionIds })
        .andWhere('(p.application_id = :applicationId OR p.application_id IS NULL)', {
          applicationId,
        })
        .getMany();
      if (valid.length !== permissionIds.length) {
        throw new ConflictException('存在不属于该应用的权限');
      }
    }

    await this.roleService.setPermissions(accessRole.id, permissionIds);
    return this.findOne(applicationId, id);
  }

  async remove(applicationId: string, id: string): Promise<void> {
    const row = await this.requireApplicationRole(applicationId, id);
    if (row.accessRoleId) {
      await this.roleService.remove(row.accessRoleId);
    }
    await this.applicationRoleRepo.softDelete({ id });
  }

  /** 供 ApplicationUserService：解析应用角色绑定的 access role */
  async resolveAccessRoleId(
    applicationId: string,
    applicationRoleId: string,
  ): Promise<string> {
    const row = await this.requireApplicationRole(applicationId, applicationRoleId);
    const accessRole = await this.ensureAccessRoleLinked(row);
    return accessRole.id;
  }

  private async requireApplication(applicationId: string): Promise<ApplicationEntity> {
    const application = await this.applicationRepo.findOne({ where: { id: applicationId } });
    if (!application) {
      throw new NotFoundException('应用不存在');
    }
    return application;
  }

  private async requireApplicationRole(
    applicationId: string,
    id: string,
  ): Promise<ApplicationRoleEntity> {
    const row = await this.applicationRoleRepo.findOne({
      where: { id, applicationId },
    });
    if (!row) {
      throw new NotFoundException('应用角色不存在');
    }
    return row;
  }

  /** 若历史数据未桥接，尝试按约定编码匹配或补建 access role */
  private async ensureAccessRoleLinked(row: ApplicationRoleEntity): Promise<RoleEntity> {
    if (row.accessRoleId) {
      const linked = await this.roleRepo.findOne({
        where: { id: row.accessRoleId },
        withDeleted: true,
      });
      if (linked) {
        if (linked.deletedAt) {
          await this.roleRepo.recover(linked);
        }
        return linked;
      }
    }

    const application = await this.requireApplication(row.applicationId);
    const accessRoleCode = buildAccessRoleCode(application.code, row.code);

    let accessRole = await this.roleRepo.findOne({
      where: { applicationId: row.applicationId, code: accessRoleCode },
      withDeleted: true,
    });
    if (accessRole?.deletedAt) {
      await this.roleRepo.recover(accessRole);
      accessRole.name = row.name;
      accessRole.description = `应用角色「${row.name}」的访问控制映射`;
      accessRole = await this.roleRepo.save(accessRole);
    } else if (!accessRole) {
      accessRole = await this.roleService.create({
        applicationId: row.applicationId,
        name: row.name,
        code: accessRoleCode,
        type: RoleType.APPLICATION,
        description: `应用角色「${row.name}」的访问控制映射`,
      });
    }

    row.accessRoleId = accessRole.id;
    await this.applicationRoleRepo.save(row);
    return accessRole;
  }

  private async toDetailWithSync(row: ApplicationRoleEntity): Promise<ApplicationRoleDetailDto> {
    const accessRole = await this.ensureAccessRoleLinked(row);
    const permissionIds = await this.roleService.getPermissionIds(accessRole.id);
    const permissions = permissionIds.length
      ? await this.permissionRepo.find({ where: { id: In(permissionIds) } })
      : [];
    return this.toDetail(
      row,
      accessRole,
      permissionIds,
      permissions.map((p) => p.code),
    );
  }

  private toDetail(
    row: ApplicationRoleEntity,
    accessRole: RoleEntity,
    permissionIds: string[],
    permissionCodes: string[] = [],
  ): ApplicationRoleDetailDto {
    return {
      id: row.id,
      applicationId: row.applicationId,
      name: row.name,
      code: row.code,
      accessRoleId: accessRole.id,
      accessRole: {
        id: accessRole.id,
        code: accessRole.code,
        name: accessRole.name,
        description: accessRole.description,
      },
      permissionIds,
      permissionCodes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
