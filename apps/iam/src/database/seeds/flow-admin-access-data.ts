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

const FLOW_RESOURCES = {
  products: 'flow_admin:products',
  materials: 'flow_admin:materials',
  tasks: 'flow_admin:tasks',
} as const;

const FLOW_VIEW_PERMISSIONS = [
  {
    name: '流程管理产品列表',
    code: 'flow_admin:products:view',
    resource: FLOW_RESOURCES.products,
    action: 'view',
  },
  {
    name: '流程管理素材列表',
    code: 'flow_admin:materials:view',
    resource: FLOW_RESOURCES.materials,
    action: 'view',
  },
  {
    name: '流程管理任务列表',
    code: 'flow_admin:tasks:view',
    resource: FLOW_RESOURCES.tasks,
    action: 'view',
  },
] as const;

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

async function ensureViewPermissions(
  permissionRepo: ReturnType<typeof dataSource.getRepository<PermissionEntity>>,
  rolePermissionRepo: ReturnType<typeof dataSource.getRepository<RolePermissionEntity>>,
  applicationId: string,
  roleId: string,
): Promise<void> {
  for (const perm of FLOW_VIEW_PERMISSIONS) {
    let permission = await permissionRepo.findOne({
      where: { applicationId, code: perm.code },
    });
    if (!permission) {
      permission = await permissionRepo.save(
        permissionRepo.create({
          applicationId,
          name: perm.name,
          code: perm.code,
          resource: perm.resource,
          action: perm.action,
        }),
      );
      // eslint-disable-next-line no-console
      console.log(`[seed:flow-admin-access] 已创建 permission: ${perm.code}`);
    }

    const linked = await rolePermissionRepo.findOne({
      where: { roleId, permissionId: permission.id },
    });
    if (!linked) {
      await rolePermissionRepo.save(
        rolePermissionRepo.create({ roleId, permissionId: permission.id }),
      );
      // eslint-disable-next-line no-console
      console.log(`[seed:flow-admin-access] 已关联 permission ${perm.code} → role`);
    }
  }
}

/**
 * 为 flow-admin 配置数据权限，并创建 viewer 演示账号。
 * 运行：pnpm seed:flow-admin-access
 *
 * manager（admin@qq.com）→ products/materials/tasks scope=all
 * viewer（viewer@qq.com）→ products scope=dept, materials/tasks scope=self
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

    for (const resource of Object.values(FLOW_RESOURCES)) {
      await upsertDataPermission(dataPermissionRepo, managerRole.id, resource, DataScope.ALL);
      // eslint-disable-next-line no-console
      console.log(
        `[seed:flow-admin-access] ${MANAGER_EMAIL} (${MANAGER_ROLE_CODE}) → ${resource} scope=all`,
      );
    }

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
    }

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
          description: '演示数据权限：产品按部门、素材/任务仅本人',
        }),
      );
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
    }

    await ensureViewPermissions(permissionRepo, rolePermissionRepo, app.id, viewerRole.id);

    await upsertDataPermission(
      dataPermissionRepo,
      viewerRole.id,
      FLOW_RESOURCES.products,
      DataScope.DEPT,
    );
    await upsertDataPermission(
      dataPermissionRepo,
      viewerRole.id,
      FLOW_RESOURCES.materials,
      DataScope.SELF,
    );
    await upsertDataPermission(
      dataPermissionRepo,
      viewerRole.id,
      FLOW_RESOURCES.tasks,
      DataScope.SELF,
    );

    // eslint-disable-next-line no-console
    console.log(
      `[seed:flow-admin-access] ${VIEWER_EMAIL} (${VIEWER_ROLE_CODE}) → products=dept, materials/tasks=self`,
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
