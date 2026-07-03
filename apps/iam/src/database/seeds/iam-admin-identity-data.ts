import dataSource from '../data-source';
import { ApplicationEntity } from '../../modules/application/application/entities/application.entity';
import { ApplicationMenuEntity } from '../../modules/application/application-menu/entities/application-menu.entity';
import { RoleEntity } from '../../modules/access/role/entities/role.entity';
import { PermissionEntity } from '../../modules/access/permission/entities/permission.entity';
import { RolePermissionEntity } from '../../modules/access/role/entities/role-permission.entity';
import {
  collectMenuPaths,
  cleanupMenusUnderPrefix,
  type MenuSeed,
  upsertMenuTree,
} from './menu-seed.util';

const APP_CODE = 'iam-admin';
const MANAGER_ROLE_CODE = 'iam_admin:manager';

/** 二级菜单：身份域 → 页面 */
const IDENTITY_MENUS: MenuSeed[] = [
  {
    name: '身份域',
    path: '/identity',
    icon: 'ep:user',
    sort: 30,
    permissionCode: null,
    children: [
      {
        name: '身份认证',
        path: '/identity/auth/index',
        icon: 'ep:key',
        sort: 1,
        permissionCode: 'iam_admin:identity_auth:view',
      },
      {
        name: '账户管理',
        path: '/identity/account/index',
        icon: 'ep:connection',
        sort: 2,
        permissionCode: 'iam_admin:account:view',
      },
      {
        name: '设备管理',
        path: '/identity/device/index',
        icon: 'ep:monitor',
        sort: 3,
        permissionCode: 'iam_admin:device:view',
      },
      {
        name: '登录历史',
        path: '/identity/login-history/index',
        icon: 'ep:clock',
        sort: 4,
        permissionCode: 'iam_admin:login_history:view',
      },
      {
        name: '用户档案',
        path: '/identity/profile/index',
        icon: 'ep:postcard',
        sort: 5,
        permissionCode: 'iam_admin:profile:view',
      },
      {
        name: '会话管理',
        path: '/identity/session/index',
        icon: 'ep:chat-dot-round',
        sort: 6,
        permissionCode: 'iam_admin:session:view',
      },
      {
        name: '用户管理',
        path: '/identity/user/index',
        icon: 'ep:avatar',
        sort: 7,
        permissionCode: 'iam_admin:identity_user:view',
      },
      {
        name: '验证管理',
        path: '/identity/verification/index',
        icon: 'ep:message',
        sort: 8,
        permissionCode: 'iam_admin:verification:view',
      },
    ],
  },
];

const PERMISSIONS = [
  {
    name: '身份认证查看',
    code: 'iam_admin:identity_auth:view',
    resource: 'iam_admin:identity_auth',
    action: 'view',
  },
  {
    name: '账户管理查看',
    code: 'iam_admin:account:view',
    resource: 'iam_admin:account',
    action: 'view',
  },
  {
    name: '设备管理查看',
    code: 'iam_admin:device:view',
    resource: 'iam_admin:device',
    action: 'view',
  },
  {
    name: '登录历史查看',
    code: 'iam_admin:login_history:view',
    resource: 'iam_admin:login_history',
    action: 'view',
  },
  {
    name: '用户档案查看',
    code: 'iam_admin:profile:view',
    resource: 'iam_admin:profile',
    action: 'view',
  },
  {
    name: '会话管理查看',
    code: 'iam_admin:session:view',
    resource: 'iam_admin:session',
    action: 'view',
  },
  {
    name: '身份用户查看',
    code: 'iam_admin:identity_user:view',
    resource: 'iam_admin:identity_user',
    action: 'view',
  },
  {
    name: '验证管理查看',
    code: 'iam_admin:verification:view',
    resource: 'iam_admin:verification',
    action: 'view',
  },
] as const;

/**
 * IAM 管理平台 — 身份域二级菜单与权限种子。
 * 运行：pnpm seed:iam-admin-identity（需先 pnpm seed:iam-admin）
 */
async function run(): Promise<void> {
  await dataSource.initialize();
  try {
    const appRepo = dataSource.getRepository(ApplicationEntity);
    const menuRepo = dataSource.getRepository(ApplicationMenuEntity);
    const roleRepo = dataSource.getRepository(RoleEntity);
    const permissionRepo = dataSource.getRepository(PermissionEntity);
    const rolePermissionRepo = dataSource.getRepository(RolePermissionEntity);

    const app = await appRepo.findOne({ where: { code: APP_CODE } });
    if (!app) {
      throw new Error(`应用 ${APP_CODE} 不存在，请先运行 pnpm seed:iam-admin`);
    }

    for (const group of IDENTITY_MENUS) {
      await upsertMenuTree(menuRepo, app.id, [group], null, '[seed:iam-admin-identity]');
    }
    await cleanupMenusUnderPrefix(
      menuRepo,
      app.id,
      '/identity',
      collectMenuPaths(IDENTITY_MENUS),
      '[seed:iam-admin-identity]',
    );

    const managerRole = await roleRepo.findOne({
      where: { applicationId: app.id, code: MANAGER_ROLE_CODE },
    });
    if (!managerRole) {
      throw new Error(`角色 ${MANAGER_ROLE_CODE} 不存在，请先运行 pnpm seed:iam-admin`);
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
        console.log(`[seed:iam-admin-identity] 已创建 permission: ${perm.code}`);
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

    // eslint-disable-next-line no-console
    console.log('[seed:iam-admin-identity] 完成');
  } finally {
    await dataSource.destroy();
  }
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[seed:iam-admin-identity] 失败:', err);
  process.exit(1);
});
