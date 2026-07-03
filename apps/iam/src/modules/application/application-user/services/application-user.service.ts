import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  ApplicationUserEntity,
  ApplicationUserStatus,
} from '../entities/application-user.entity';
import { ApplicationEntity } from '../../application/entities/application.entity';
import { ApplicationRoleEntity } from '../../application-role/entities/application-role.entity';
import { UserEntity } from '../../../identity/user/entities/user.entity';
import { RoleService } from '../../../access/role/services/role.service';
import { ApplicationRoleService } from '../../application-role/services/application-role.service';
import { CreateApplicationUserDto } from '../dto/create-application-user.dto';
import { UpdateApplicationUserDto } from '../dto/update-application-user.dto';
import type { ApplicationUserDetailDto } from '../dto/application-user-detail.dto';

@Injectable()
export class ApplicationUserService {
  constructor(
    @InjectRepository(ApplicationUserEntity)
    private readonly applicationUserRepository: Repository<ApplicationUserEntity>,
    @InjectRepository(ApplicationEntity)
    private readonly applicationRepository: Repository<ApplicationEntity>,
    @InjectRepository(ApplicationRoleEntity)
    private readonly applicationRoleRepository: Repository<ApplicationRoleEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly applicationRoleService: ApplicationRoleService,
    private readonly roleService: RoleService,
  ) {}

  async create(
    applicationId: string,
    dto: CreateApplicationUserDto,
  ): Promise<ApplicationUserDetailDto> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
    });
    if (!application) {
      throw new NotFoundException('应用不存在');
    }

    const userId = await this.resolveUserId(dto);

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const existing = await this.applicationUserRepository.findOne({
      where: { applicationId, userId },
      withDeleted: true,
    });
    if (existing?.deletedAt) {
      if (dto.applicationRoleId) {
        await this.assertApplicationRole(applicationId, dto.applicationRoleId);
      }
      await this.applicationUserRepository.recover(existing);
      existing.applicationRoleId = dto.applicationRoleId ?? null;
      existing.status = dto.status ?? ApplicationUserStatus.ACTIVE;
      existing.grantedAt = new Date();
      const saved = await this.applicationUserRepository.save(existing);

      if (saved.applicationRoleId && saved.status === ApplicationUserStatus.ACTIVE) {
        await this.grantAccessRole(applicationId, userId, saved.applicationRoleId);
      }

      return this.findOne(applicationId, saved.id);
    }
    if (existing) {
      throw new ConflictException('该用户已关联此应用');
    }

    if (dto.applicationRoleId) {
      await this.assertApplicationRole(applicationId, dto.applicationRoleId);
    }

    const status = dto.status ?? ApplicationUserStatus.ACTIVE;
    const row = await this.applicationUserRepository.save(
      this.applicationUserRepository.create({
        applicationId,
        userId,
        applicationRoleId: dto.applicationRoleId ?? null,
        status,
        grantedAt: new Date(),
      }),
    );

    if (dto.applicationRoleId && status === ApplicationUserStatus.ACTIVE) {
      await this.grantAccessRole(applicationId, userId, dto.applicationRoleId);
    }

    return this.findOne(applicationId, row.id);
  }

  async findAll(applicationId: string): Promise<ApplicationUserDetailDto[]> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
    });
    if (!application) {
      throw new NotFoundException('应用不存在');
    }

    const rows = await this.applicationUserRepository.find({
      where: { applicationId },
      order: { createdAt: 'DESC' },
    });
    if (rows.length === 0) {
      return [];
    }

    const userIds = [...new Set(rows.map((row) => row.userId))];
    const users = await this.userRepository.find({ where: { id: In(userIds) } });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const roleIds = [
      ...new Set(rows.map((row) => row.applicationRoleId).filter(Boolean) as string[]),
    ];
    const roleMap = await this.loadApplicationRoleMap(roleIds);

    return rows.map((row) =>
      this.toDetail(
        row,
        userMap.get(row.userId) ?? null,
        application,
        row.applicationRoleId ? roleMap.get(row.applicationRoleId) ?? null : null,
      ),
    );
  }

  async findOne(applicationId: string, id: string): Promise<ApplicationUserDetailDto> {
    const row = await this.applicationUserRepository.findOne({
      where: { id, applicationId },
    });
    if (!row) {
      throw new NotFoundException('应用用户关联不存在');
    }

    const [user, application, applicationRole] = await Promise.all([
      this.userRepository.findOne({ where: { id: row.userId } }),
      this.applicationRepository.findOne({ where: { id: applicationId } }),
      row.applicationRoleId
        ? this.applicationRoleRepository.findOne({ where: { id: row.applicationRoleId } })
        : Promise.resolve(null),
    ]);

    return this.toDetail(row, user, application, applicationRole);
  }

  async update(
    applicationId: string,
    id: string,
    dto: UpdateApplicationUserDto,
  ): Promise<ApplicationUserDetailDto> {
    const row = await this.applicationUserRepository.findOne({
      where: { id, applicationId },
    });
    if (!row) {
      throw new NotFoundException('应用用户关联不存在');
    }

    const previousRoleId = row.applicationRoleId;
    let previousAccessRoleId: string | null = null;
    if (previousRoleId) {
      previousAccessRoleId = await this.applicationRoleService.resolveAccessRoleId(
        applicationId,
        previousRoleId,
      );
    }

    if (dto.applicationRoleId) {
      await this.assertApplicationRole(applicationId, dto.applicationRoleId);
    }

    if (dto.status !== undefined) {
      row.status = dto.status;
    }
    if (dto.applicationRoleId !== undefined) {
      row.applicationRoleId = dto.applicationRoleId;
    }

    const saved = await this.applicationUserRepository.save(row);

    if (previousAccessRoleId) {
      await this.roleService.revokeFromUser(saved.userId, previousAccessRoleId);
    }

    if (
      saved.applicationRoleId &&
      saved.status === ApplicationUserStatus.ACTIVE
    ) {
      await this.grantAccessRole(applicationId, saved.userId, saved.applicationRoleId);
    }

    return this.findOne(applicationId, saved.id);
  }

  async remove(applicationId: string, id: string): Promise<void> {
    const row = await this.applicationUserRepository.findOne({
      where: { id, applicationId },
    });
    if (!row) {
      throw new NotFoundException('应用用户关联不存在');
    }

    if (row.applicationRoleId) {
      const accessRoleId = await this.applicationRoleService.resolveAccessRoleId(
        applicationId,
        row.applicationRoleId,
      );
      await this.roleService.revokeFromUser(row.userId, accessRoleId);
    }

    await this.applicationUserRepository.softDelete({ id });
  }

  private async assertApplicationRole(
    applicationId: string,
    applicationRoleId: string,
  ): Promise<void> {
    const role = await this.applicationRoleRepository.findOne({
      where: { id: applicationRoleId, applicationId },
    });
    if (!role) {
      throw new NotFoundException('应用角色不存在');
    }
  }

  private async grantAccessRole(
    applicationId: string,
    userId: string,
    applicationRoleId: string,
  ): Promise<void> {
    const accessRoleId = await this.applicationRoleService.resolveAccessRoleId(
      applicationId,
      applicationRoleId,
    );
    await this.roleService.assignToUser(userId, accessRoleId, applicationId);
  }

  private async loadApplicationRoleMap(
    roleIds: string[],
  ): Promise<Map<string, ApplicationRoleEntity>> {
    if (!roleIds.length) {
      return new Map();
    }
    const roles = await this.applicationRoleRepository.find({ where: { id: In(roleIds) } });
    return new Map(roles.map((role) => [role.id, role]));
  }

  private toDetail(
    row: ApplicationUserEntity,
    user: UserEntity | null | undefined,
    application: ApplicationEntity | null | undefined,
    applicationRole: ApplicationRoleEntity | null | undefined,
  ): ApplicationUserDetailDto {
    return {
      id: row.id,
      applicationId: row.applicationId,
      userId: row.userId,
      applicationRoleId: row.applicationRoleId,
      status: row.status,
      grantedAt: row.grantedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      user: user
        ? {
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            status: user.status,
          }
        : null,
      application: application
        ? {
            id: application.id,
            name: application.name,
            code: application.code,
            status: application.status,
          }
        : null,
      applicationRole: applicationRole
        ? {
            id: applicationRole.id,
            name: applicationRole.name,
            code: applicationRole.code,
            accessRoleId: applicationRole.accessRoleId,
          }
        : null,
    };
  }

  private async resolveUserId(dto: CreateApplicationUserDto): Promise<string> {
    if (dto.userId) {
      return dto.userId;
    }
    const email = dto.email?.trim();
    if (!email) {
      throw new BadRequestException('请提供用户邮箱');
    }
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('未找到该邮箱对应的用户，请先在身份管理中创建用户');
    }
    return user.id;
  }
}
