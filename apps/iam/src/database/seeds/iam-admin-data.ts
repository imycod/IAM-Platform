import * as bcrypt from 'bcryptjs';
import dataSource from '../data-source';
import { ApplicationEntity } from '../../modules/application/application/entities/application.entity';
import { ApplicationMenuEntity } from '../../modules/application/application-menu/entities/application-menu.entity';
import { ApplicationRoleEntity } from '../../modules/application/application-role/entities/application-role.entity';
import {
  ApplicationUserEntity,
  ApplicationUserStatus,
} from '../../modules/application/application-user/entities/application-user.entity';
import { UserEntity } from '../../modules/identity/user/entities/user.entity';
import { AccountEntity } from '../../modules/identity/account/entities/account.entity';
import { RoleEntity, RoleType } from '../../modules/access/role/entities/role.entity';
import { UserRoleEntity } from '../../modules/access/role/entities/user-role.entity';
import { PermissionEntity } from '../../modules/access/permission/entities/permission.entity';
import { RolePermissionEntity } from '../../modules/access/role/entities/role-permission.entity';
import {
  collectMenuPaths,
  cleanupMenusUnderPrefix,
  type MenuSeed,
  upsertMenuTree,
} from './menu-seed.util';

const APP_CODE = 'iam-admin';
const ADMIN_EMAIL = 'admin@qq.com';
const ADMIN_PASSWORD = '123456';
const CREDENTIAL_PROVIDER = 'credential';
const MANAGER_ROLE_CODE = 'iam_admin:manager';

/** 访问控制：仅 role 分支为三级，其余为二级（域 → 页面） */
const ACCESS_MENUS: MenuSeed[] = [
  {
    name: '访问控制',
    path: '/access',
    icon: 'ep:lock',
    sort: 10,
    permissionCode: null,
    children: [
      {
        name: '角色管理',
        path: '/access/role',
        icon: 'ep:user',
        sort: 1,
        permissionCode: null,
        children: [
          {
            name: '角色配置',
            path: '/access/role/index',
            icon: 'ep:setting',
            sort: 1,
            permissionCode: 'iam_admin:role:view',
          },
          {
            name: '用户角色配置',
            path: '/access/role/user/index',
            icon: 'ep:user-filled',
            sort: 2,
            permissionCode: 'iam_admin:role_user:view',
          },
        ],
      },
      {
        name: '菜单管理',
        path: '/access/menu/index',
        icon: 'ep:menu',
        sort: 2,
        permissionCode: 'iam_admin:menu:view',
      },
      {
        name: '权限管理',
        path: '/access/permission/index',
        icon: 'ep:key',
        sort: 3,
        permissionCode: 'iam_admin:permission:view',
      },
      {
        name: '资源管理',
        path: '/access/resource/index',
        icon: 'ep:box',
        sort: 4,
        permissionCode: 'iam_admin:resource:view',
      },
      {
        name: '数据权限',
        path: '/access/data-permission/index',
        icon: 'ep:data-analysis',
        sort: 5,
        permissionCode: 'iam_admin:data_permission:view',
      },
    ],
  },
];

const PERMISSIONS = [
  { name: '角色管理查看', code: 'iam_admin:role:view', resource: 'iam_admin:role', action: 'view' },
  {
    name: '用户角色配置查看',
    code: 'iam_admin:role_user:view',
    resource: 'iam_admin:role_user',
    action: 'view',
  },
  { name: '菜单管理查看', code: 'iam_admin:menu:view', resource: 'iam_admin:menu', action: 'view' },
  {
    name: '权限管理查看',
    code: 'iam_admin:permission:view',
    resource: 'iam_admin:permission',
    action: 'view',
  },
  {
    name: '资源管理查看',
    code: 'iam_admin:resource:view',
    resource: 'iam_admin:resource',
    action: 'view',
  },
  {
    name: '数据权限查看',
    code: 'iam_admin:data_permission:view',
    resource: 'iam_admin:data_permission',
    action: 'view',
  },
] as const;

/**
 * IAM 管理平台（iam-client）种子：应用、访问控制菜单、权限、管理员账号。
 * 运行：pnpm seed:iam-admin
 */
async function run(): Promise<void> {
  await dataSource.initialize();
  try {
    const appRepo = dataSource.getRepository(ApplicationEntity);
    const menuRepo = dataSource.getRepository(ApplicationMenuEntity);
    const appRoleRepo = dataSource.getRepository(ApplicationRoleEntity);
    const userRepo = dataSource.getRepository(UserEntity);
    const accountRepo = dataSource.getRepository(AccountEntity);
    const appUserRepo = dataSource.getRepository(ApplicationUserEntity);
    const roleRepo = dataSource.getRepository(RoleEntity);
    const userRoleRepo = dataSource.getRepository(UserRoleEntity);
    const permissionRepo = dataSource.getRepository(PermissionEntity);
    const rolePermissionRepo = dataSource.getRepository(RolePermissionEntity);

    let app = await appRepo.findOne({ where: { code: APP_CODE } });
    if (!app) {
      app = await appRepo.save(
        appRepo.create({
          name: 'IAM 管理平台',
          code: APP_CODE,
          type: 'web',
          status: 'active',
          description: 'IAM 访问控制与管理后台（iam-client）',
        }),
      );
      // eslint-disable-next-line no-console
      console.log(`[seed:iam-admin] 已创建应用: ${app.name} (id=${app.id})`);
    } else {
      // eslint-disable-next-line no-console
      console.log(`[seed:iam-admin] 应用 ${APP_CODE} 已存在 (id=${app.id})`);
    }

    for (const group of ACCESS_MENUS) {
      await upsertMenuTree(menuRepo, app.id, [group], null, '[seed:iam-admin]');
    }
    await cleanupMenusUnderPrefix(
      menuRepo,
      app.id,
      '/access',
      collectMenuPaths(ACCESS_MENUS),
      '[seed:iam-admin]',
    );

    let managerRole = await roleRepo.findOne({
      where: { applicationId: app.id, code: MANAGER_ROLE_CODE },
    });
    if (!managerRole) {
      managerRole = await roleRepo.save(
        roleRepo.create({
          applicationId: app.id,
          name: 'IAM 管理员',
          code: MANAGER_ROLE_CODE,
          type: RoleType.APPLICATION,
          description: 'IAM 管理平台管理员，可访问访问控制模块',
        }),
      );
      // eslint-disable-next-line no-console
      console.log(`[seed:iam-admin] 已创建 role: ${MANAGER_ROLE_CODE}`);
    }

    for (const perm of PERMISSIONS) {
      let permission = await permissionRepo.findOne({
        where: { applicationId: app.id, code: perm.code },
      });
      if (!permission) {
        permission = await permissionRepo.save(
          permissionRepo.create({ applicationId: app.id, ...perm }),
        );
        // eslint-disable-next-line no-console
        console.log(`[seed:iam-admin] 已创建 permission: ${perm.code}`);
      }

      const linked = await rolePermissionRepo.findOne({
        where: { roleId: managerRole.id, permissionId: permission.id },
      });
      if (!linked) {
        await rolePermissionRepo.save(
          rolePermissionRepo.create({ roleId: managerRole.id, permissionId: permission.id }),
        );
      }
    }

    const appRoleExists = await appRoleRepo.findOne({
      where: { applicationId: app.id, code: 'super_admin' },
    });
    if (!appRoleExists) {
      await appRoleRepo.save(
        appRoleRepo.create({
          applicationId: app.id,
          name: '超级管理员',
          code: 'super_admin',
        }),
      );
    }

    const user = await userRepo.findOne({ where: { email: ADMIN_EMAIL } });
    if (!user) {
      throw new Error(`用户 ${ADMIN_EMAIL} 不存在，请先运行 pnpm seed:flow-admin`);
    }

    const account = await accountRepo.findOne({
      where: { providerId: CREDENTIAL_PROVIDER, accountId: ADMIN_EMAIL },
    });
    if (!account) {
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
      await accountRepo.save(
        accountRepo.create({
          userId: user.id,
          providerId: CREDENTIAL_PROVIDER,
          accountId: ADMIN_EMAIL,
          password: passwordHash,
        }),
      );
      // eslint-disable-next-line no-console
      console.log(`[seed:iam-admin] 已创建 credential 账号: ${ADMIN_EMAIL}`);
    }

    const appUser = await appUserRepo.findOne({
      where: { applicationId: app.id, userId: user.id },
    });
    if (!appUser) {
      await appUserRepo.save(
        appUserRepo.create({
          applicationId: app.id,
          userId: user.id,
          status: ApplicationUserStatus.ACTIVE,
          grantedAt: new Date(),
        }),
      );
      // eslint-disable-next-line no-console
      console.log(`[seed:iam-admin] 已授权 ${ADMIN_EMAIL} 访问 iam-admin`);
    }

    const userRole = await userRoleRepo.findOne({
      where: { userId: user.id, roleId: managerRole.id, applicationId: app.id },
    });
    if (!userRole) {
      await userRoleRepo.save(
        userRoleRepo.create({
          userId: user.id,
          roleId: managerRole.id,
          applicationId: app.id,
        }),
      );
      // eslint-disable-next-line no-console
      console.log(`[seed:iam-admin] 已关联 user_role: ${ADMIN_EMAIL} → ${MANAGER_ROLE_CODE}`);
    }

    // eslint-disable-next-line no-console
    console.log(`[seed:iam-admin] 完成。iam-client 配置 applicationCode=${APP_CODE}`);
    // eslint-disable-next-line no-console
    console.log(`[seed:iam-admin] applicationId=${app.id}`);
  } finally {
    await dataSource.destroy();
  }
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[seed:iam-admin] 失败:', err);
  process.exit(1);
});
