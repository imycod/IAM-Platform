import * as bcrypt from 'bcryptjs';
import dataSource from '../data-source';
import { ApplicationEntity } from '../../modules/application/application/entities/application.entity';
import { ApplicationRoleEntity } from '../../modules/application/application-role/entities/application-role.entity';
import {
  ApplicationUserEntity,
  ApplicationUserStatus,
} from '../../modules/application/application-user/entities/application-user.entity';
import { UserEntity, UserStatus } from '../../modules/identity/user/entities/user.entity';
import { AccountEntity } from '../../modules/identity/account/entities/account.entity';
import { RoleEntity, RoleType } from '../../modules/access/role/entities/role.entity';
import { UserRoleEntity } from '../../modules/access/role/entities/user-role.entity';
import { PermissionEntity } from '../../modules/access/permission/entities/permission.entity';
import { RolePermissionEntity } from '../../modules/access/role/entities/role-permission.entity';
import {
  DataPermissionEntity,
  DataScope,
} from '../../modules/access/data-permission/entities/data-permission.entity';

const APP_CODE = 'flow-admin';
const MANAGER_EMAIL = 'admin@qq.com';
const VIEWER_EMAIL = 'viewer@qq.com';
const VIEWER_PASSWORD = '123456';
const CREDENTIAL_PROVIDER = 'credential';

const MANAGER_ROLE_CODE = 'flow_admin:manager';
const VIEWER_ROLE_CODE = 'flow_admin:viewer';
const TASK_RESOURCE = 'flow_admin:tasks';
const TASK_PERMISSION_CODE = 'flow_admin:tasks:view';

async function upsertDataPermission(
  repo: ReturnType<typeof dataSource.getRepository<DataPermissionEntity>>,
  roleId: string,
  resource: string,
  scope: DataScope,
): Promise<DataPermissionEntity> {
  const existing = await repo.findOne({ where: { roleId, resource } });
  if (existing) {
    if (existing.scope !== scope) {
      existing.scope = scope;
      return repo.save(existing);
    }
    return existing;
  }
  return repo.save(repo.create({ roleId, resource, scope }));
}

async function ensureTaskViewPermission(
  permissionRepo: ReturnType<typeof dataSource.getRepository<PermissionEntity>>,
  rolePermissionRepo: ReturnType<typeof dataSource.getRepository<RolePermissionEntity>>,
  applicationId: string,
  roleId: string,
): Promise<PermissionEntity> {
  let permission = await permissionRepo.findOne({
    where: { applicationId, code: TASK_PERMISSION_CODE },
  });
  if (!permission) {
    permission = await permissionRepo.save(
      permissionRepo.create({
        applicationId,
        name: '流程管理任务列表',
        code: TASK_PERMISSION_CODE,
        resource: TASK_RESOURCE,
        action: 'view',
      }),
    );
    // eslint-disable-next-line no-console
    console.log(`[seed:flow-admin-access] 已创建 permission: ${TASK_PERMISSION_CODE}`);
  }

  const linked = await rolePermissionRepo.findOne({
    where: { roleId, permissionId: permission.id },
  });
  if (!linked) {
    await rolePermissionRepo.save(
      rolePermissionRepo.create({ roleId, permissionId: permission.id }),
    );
    // eslint-disable-next-line no-console
    console.log(`[seed:flow-admin-access] 已关联 permission → role (${roleId})`);
  }

  return permission;
}

/**
 * 为 flow-admin 配置数据权限，并创建 viewer 演示账号。
 * 运行：pnpm seed:flow-admin-access
 *
 * - admin@qq.com（flow_admin:manager）→ flow_admin:tasks data scope = all
 * - viewer@qq.com（flow_admin:viewer）→ 同 tasks:view 权限，data scope = self
 */
async function run(): Promise<void> {
  await dataSource.initialize();
  try {
    const appRepo = dataSource.getRepository(ApplicationEntity);
    const appRoleRepo = dataSource.getRepository(ApplicationRoleEntity);
    const appUserRepo = dataSource.getRepository(ApplicationUserEntity);
    const userRepo = dataSource.getRepository(UserEntity);
    const accountRepo = dataSource.getRepository(AccountEntity);
    const roleRepo = dataSource.getRepository(RoleEntity);
    const userRoleRepo = dataSource.getRepository(UserRoleEntity);
    const permissionRepo = dataSource.getRepository(PermissionEntity);
    const rolePermissionRepo = dataSource.getRepository(RolePermissionEntity);
    const dataPermissionRepo = dataSource.getRepository(DataPermissionEntity);

    const app = await appRepo.findOne({ where: { code: APP_CODE } });
    if (!app) {
      throw new Error(`应用 ${APP_CODE} 不存在，请先运行 pnpm seed:flow-admin`);
    }

    // ── 1. manager：data scope = all ──────────────────────────────────────
    const managerUser = await userRepo.findOne({ where: { email: MANAGER_EMAIL } });
    if (!managerUser) {
      throw new Error(`用户 ${MANAGER_EMAIL} 不存在，请先运行 pnpm seed:flow-admin`);
    }

    const managerRole = await roleRepo.findOne({
      where: { applicationId: app.id, code: MANAGER_ROLE_CODE },
    });
    if (!managerRole) {
      throw new Error(`角色 ${MANAGER_ROLE_CODE} 不存在，请先运行 pnpm seed:flow-admin`);
    }

    await upsertDataPermission(
      dataPermissionRepo,
      managerRole.id,
      TASK_RESOURCE,
      DataScope.ALL,
    );
    // eslint-disable-next-line no-console
    console.log(
      `[seed:flow-admin-access] ${MANAGER_EMAIL} (${MANAGER_ROLE_CODE}) → ${TASK_RESOURCE} scope=all`,
    );

    // ── 2. viewer 用户 + credential 账号 ──────────────────────────────────
    let viewerUser = await userRepo.findOne({ where: { email: VIEWER_EMAIL } });
    if (!viewerUser) {
      viewerUser = await userRepo.save(
        userRepo.create({
          email: VIEWER_EMAIL,
          emailVerified: true,
          name: '流程查看者',
          status: UserStatus.ACTIVE,
          isSystem: false,
        }),
      );
      // eslint-disable-next-line no-console
      console.log(`[seed:flow-admin-access] 已创建用户: ${VIEWER_EMAIL} (id=${viewerUser.id})`);
    } else {
      // eslint-disable-next-line no-console
      console.log(`[seed:flow-admin-access] 用户 ${VIEWER_EMAIL} 已存在，复用 (id=${viewerUser.id})`);
    }

    const existingAccount = await accountRepo.findOne({
      where: { providerId: CREDENTIAL_PROVIDER, accountId: VIEWER_EMAIL },
    });
    if (!existingAccount) {
      const passwordHash = await bcrypt.hash(VIEWER_PASSWORD, 10);
      await accountRepo.save(
        accountRepo.create({
          userId: viewerUser.id,
          providerId: CREDENTIAL_PROVIDER,
          accountId: VIEWER_EMAIL,
          password: passwordHash,
        }),
      );
      // eslint-disable-next-line no-console
      console.log(`[seed:flow-admin-access] 已创建 credential 账号: ${VIEWER_EMAIL}，密码: ${VIEWER_PASSWORD}`);
    } else {
      // eslint-disable-next-line no-console
      console.log(`[seed:flow-admin-access] credential 账号 ${VIEWER_EMAIL} 已存在，跳过`);
    }

    const existingAppUser = await appUserRepo.findOne({
      where: { applicationId: app.id, userId: viewerUser.id },
    });
    if (!existingAppUser) {
      await appUserRepo.save(
        appUserRepo.create({
          applicationId: app.id,
          userId: viewerUser.id,
          status: ApplicationUserStatus.ACTIVE,
          grantedAt: new Date(),
        }),
      );
      // eslint-disable-next-line no-console
      console.log(`[seed:flow-admin-access] 已授权 ${VIEWER_EMAIL} 访问 flow-admin`);
    }

    // ── 3. viewer 角色 + 权限 + data scope = self ─────────────────────────
    let viewerAppRole = await appRoleRepo.findOne({
      where: { applicationId: app.id, code: 'viewer' },
    });
    if (!viewerAppRole) {
      viewerAppRole = await appRoleRepo.save(
        appRoleRepo.create({
          applicationId: app.id,
          name: '查看者',
          code: 'viewer',
        }),
      );
      // eslint-disable-next-line no-console
      console.log('[seed:flow-admin-access] 已创建 application_role: viewer');
    }

    let viewerRole = await roleRepo.findOne({
      where: { applicationId: app.id, code: VIEWER_ROLE_CODE },
    });
    if (!viewerRole) {
      viewerRole = await roleRepo.save(
        roleRepo.create({
          applicationId: app.id,
          name: '流程查看者',
          code: VIEWER_ROLE_CODE,
          type: RoleType.APPLICATION,
          description: '只能查看自己的任务数据',
        }),
      );
      // eslint-disable-next-line no-console
      console.log(`[seed:flow-admin-access] 已创建 access.role: ${VIEWER_ROLE_CODE}`);
    }

    const existingUserRole = await userRoleRepo.findOne({
      where: { userId: viewerUser.id, roleId: viewerRole.id, applicationId: app.id },
    });
    if (!existingUserRole) {
      await userRoleRepo.save(
        userRoleRepo.create({
          userId: viewerUser.id,
          roleId: viewerRole.id,
          applicationId: app.id,
        }),
      );
      // eslint-disable-next-line no-console
      console.log(`[seed:flow-admin-access] 已关联 user_role: ${VIEWER_EMAIL} → ${VIEWER_ROLE_CODE}`);
    }

    await ensureTaskViewPermission(permissionRepo, rolePermissionRepo, app.id, viewerRole.id);

    await upsertDataPermission(
      dataPermissionRepo,
      viewerRole.id,
      TASK_RESOURCE,
      DataScope.SELF,
    );
    // eslint-disable-next-line no-console
    console.log(
      `[seed:flow-admin-access] ${VIEWER_EMAIL} (${VIEWER_ROLE_CODE}) → ${TASK_RESOURCE} scope=self`,
    );
  } finally {
    await dataSource.destroy();
  }
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[seed:flow-admin-access] 失败:', err);
  process.exit(1);
});
