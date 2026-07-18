import dataSource from '../data-source';
import { ApplicationEntity } from '../../modules/application/application/entities/application.entity';
import { ApplicationRoleEntity } from '../../modules/application/application-role/entities/application-role.entity';
import {
  ApplicationUserEntity,
  ApplicationUserStatus,
} from '../../modules/application/application-user/entities/application-user.entity';
import { UserEntity } from '../../modules/identity/user/entities/user.entity';
import { AccountEntity } from '../../modules/identity/account/entities/account.entity';
import { RoleEntity } from '../../modules/access/role/entities/role.entity';
import { UserRoleEntity } from '../../modules/access/role/entities/user-role.entity';
import { PermissionEntity } from '../../modules/access/permission/entities/permission.entity';
import { RolePermissionEntity } from '../../modules/access/role/entities/role-permission.entity';
import { buildAccessRoleCode } from '../../modules/application/application-role/utils/access-role-code.util';

const APP_CODE = 'iam-admin';
const CREDENTIAL_PROVIDER = 'credential';
const DEFAULT_ADMIN_EMAIL = 'admin@qq.com';
const APP_ROLE_CODE = 'manager';

/**
 * 为指定用户分配 iam-admin 应用的 admin 角色（访问角色 iam_admin:admin）。
 *
 * 运行：pnpm seed:assign-iam-admin-admin
 *
 * 环境变量（可选）：
 *   SEED_ADMIN_EMAIL=admin@qq.com
 */
async function run(): Promise<void> {
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL).trim();

  await dataSource.initialize();
  try {
    const appRepo = dataSource.getRepository(ApplicationEntity);
    const userRepo = dataSource.getRepository(UserEntity);
    const accountRepo = dataSource.getRepository(AccountEntity);
    const appRoleRepo = dataSource.getRepository(ApplicationRoleEntity);
    const appUserRepo = dataSource.getRepository(ApplicationUserEntity);
    const roleRepo = dataSource.getRepository(RoleEntity);
    const userRoleRepo = dataSource.getRepository(UserRoleEntity);
    const permissionRepo = dataSource.getRepository(PermissionEntity);
    const rolePermissionRepo = dataSource.getRepository(RolePermissionEntity);

    const users = await userRepo.find({ order: { createdAt: 'ASC' } });
    // eslint-disable-next-line no-console
    console.log('[seed:assign-admin] 用户列表:');
    for (const u of users) {
      // eslint-disable-next-line no-console
      console.log(`  - id=${u.id} email=${u.email ?? '-'} name=${u.name ?? '-'}`);
    }

    const accounts = await accountRepo.find({
      where: { providerId: CREDENTIAL_PROVIDER },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
    // eslint-disable-next-line no-console
    console.log('[seed:assign-admin] credential 账户列表:');
    for (const a of accounts) {
      // eslint-disable-next-line no-console
      console.log(
        `  - id=${a.id} userId=${a.userId} accountId=${a.accountId} email=${a.user?.email ?? '-'}`,
      );
    }

    const app = await appRepo.findOne({ where: { code: APP_CODE } });
    if (!app) {
      throw new Error(`应用 ${APP_CODE} 不存在，请先运行 pnpm seed:iam-admin`);
    }

    const user = await userRepo.findOne({ where: { email: adminEmail } });
    if (!user) {
      throw new Error(`用户 ${adminEmail} 不存在，请先在身份认证页创建账户`);
    }

    const account = await accountRepo.findOne({
      where: { providerId: CREDENTIAL_PROVIDER, accountId: adminEmail },
    });
    if (!account) {
      throw new Error(`credential 账户 ${adminEmail} 不存在`);
    }
    if (account.userId !== user.id) {
      throw new Error(`账户 userId=${account.userId} 与用户 id=${user.id} 不一致`);
    }

    const accessRoleCode = buildAccessRoleCode(app.code, APP_ROLE_CODE);
    let accessRole = await roleRepo.findOne({
      where: { applicationId: app.id, code: accessRoleCode },
      withDeleted: true,
    });
    if (accessRole?.deletedAt) {
      await roleRepo.recover(accessRole);
      // eslint-disable-next-line no-console
      console.log(`[seed:assign-admin] 已恢复软删除的 access role: ${accessRoleCode}`);
    }
    if (!accessRole) {
      throw new Error(
        `访问角色 ${accessRoleCode} 不存在，请先在应用角色页创建 code=${APP_ROLE_CODE} 的角色`,
      );
    }

    const roles = await roleRepo.find({
      where: { applicationId: app.id },
      withDeleted: true,
      order: { code: 'ASC' },
    });
    // eslint-disable-next-line no-console
    console.log('[seed:assign-admin] 应用访问角色列表:');
    for (const r of roles) {
      // eslint-disable-next-line no-console
      console.log(
        `  - id=${r.id} code=${r.code} name=${r.name}${r.deletedAt ? ' (已软删)' : ''}`,
      );
    }

    let appRole = await appRoleRepo.findOne({
      where: { applicationId: app.id, code: APP_ROLE_CODE },
    });
    if (!appRole) {
      appRole = await appRoleRepo.save(
        appRoleRepo.create({
          applicationId: app.id,
          name: '管理员',
          code: APP_ROLE_CODE,
          accessRoleId: accessRole.id,
        }),
      );
      // eslint-disable-next-line no-console
      console.log(`[seed:assign-admin] 已创建 application_role: ${APP_ROLE_CODE}`);
    } else if (appRole.accessRoleId !== accessRole.id) {
      appRole.accessRoleId = accessRole.id;
      await appRoleRepo.save(appRole);
      // eslint-disable-next-line no-console
      console.log(`[seed:assign-admin] 已更新 application_role 桥接 accessRoleId`);
    }

    let appUser = await appUserRepo.findOne({
      where: { applicationId: app.id, userId: user.id },
      withDeleted: true,
    });
    if (appUser?.deletedAt) {
      await appUserRepo.recover(appUser);
      // eslint-disable-next-line no-console
      console.log('[seed:assign-admin] 已恢复软删除的 application_user');
    }
    if (!appUser) {
      appUser = await appUserRepo.save(
        appUserRepo.create({
          applicationId: app.id,
          userId: user.id,
          applicationRoleId: appRole.id,
          status: ApplicationUserStatus.ACTIVE,
          grantedAt: new Date(),
        }),
      );
      // eslint-disable-next-line no-console
      console.log(`[seed:assign-admin] 已创建 application_user`);
    } else {
      appUser.applicationRoleId = appRole.id;
      appUser.status = ApplicationUserStatus.ACTIVE;
      appUser.grantedAt = new Date();
      await appUserRepo.save(appUser);
      // eslint-disable-next-line no-console
      console.log(`[seed:assign-admin] 已更新 application_user → 角色 ${APP_ROLE_CODE}`);
    }

    const userRoleExists = await userRoleRepo.findOne({
      where: { userId: user.id, roleId: accessRole.id, applicationId: app.id },
    });
    if (!userRoleExists) {
      await userRoleRepo.save(
        userRoleRepo.create({
          userId: user.id,
          roleId: accessRole.id,
          applicationId: app.id,
        }),
      );
      // eslint-disable-next-line no-console
      console.log(`[seed:assign-admin] 已写入 user_role: ${adminEmail} → ${accessRoleCode}`);
    } else {
      // eslint-disable-next-line no-console
      console.log(`[seed:assign-admin] user_role 已存在，跳过`);
    }

    const permissions = await permissionRepo.find({ where: { applicationId: app.id } });
    let linkedCount = 0;
    for (const perm of permissions) {
      const linked = await rolePermissionRepo.findOne({
        where: { roleId: accessRole.id, permissionId: perm.id },
      });
      if (!linked) {
        await rolePermissionRepo.save(
          rolePermissionRepo.create({ roleId: accessRole.id, permissionId: perm.id }),
        );
        linkedCount += 1;
      }
    }
    if (linkedCount > 0) {
      // eslint-disable-next-line no-console
      console.log(`[seed:assign-admin] 已为 ${accessRoleCode} 补全 ${linkedCount} 条权限`);
    }

    // eslint-disable-next-line no-console
    console.log('[seed:assign-admin] 完成');
    // eslint-disable-next-line no-console
    console.log(`  userId=${user.id}`);
    // eslint-disable-next-line no-console
    console.log(`  accountId=${account.id}`);
    // eslint-disable-next-line no-console
    console.log(`  accessRoleId=${accessRole.id} code=${accessRoleCode}`);
    // eslint-disable-next-line no-console
    console.log(`  applicationRoleId=${appRole.id} code=${APP_ROLE_CODE}`);
    // eslint-disable-next-line no-console
    console.log(`  请重新登录 ${adminEmail} 以刷新 roles / permissions`);
  } finally {
    await dataSource.destroy();
  }
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[seed:assign-admin] 失败:', err);
  process.exit(1);
});
