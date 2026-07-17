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

/** 安全域菜单 */
const SECURITY_MENUS: MenuSeed[] = [
  {
    name: '安全域',
    path: '/security',
    icon: 'ep:lock',
    sort: 40,
    permissionCode: null,
    children: [
      {
        name: 'OAuth 客户端',
        path: '/security/oauth-client/index',
        icon: 'ep:key',
        sort: 1,
        permissionCode: 'iam_admin:oauth_client:view',
      },
      {
        name: '会话过期策略',
        path: '/security/auth-session-settings/index',
        icon: 'ep:timer',
        sort: 2,
        permissionCode: 'iam_admin:auth_session:view',
      },
    ],
  },
];

const PERMISSIONS = [
  {
    name: 'OAuth 客户端查看',
    code: 'iam_admin:oauth_client:view',
    resource: 'iam_admin:oauth_client',
    action: 'view',
  },
  {
    name: 'OAuth 客户端管理',
    code: 'iam_admin:oauth_client:manage',
    resource: 'iam_admin:oauth_client',
    action: 'manage',
  },
  {
    name: '会话过期策略查看',
    code: 'iam_admin:auth_session:view',
    resource: 'iam_admin:auth_session',
    action: 'view',
  },
  {
    name: '会话过期策略管理',
    code: 'iam_admin:auth_session:manage',
    resource: 'iam_admin:auth_session',
    action: 'manage',
  },
] as const;

/**
 * IAM 管理平台 — 安全域菜单与权限种子。
 * 运行：pnpm seed:iam-admin-security（需先 pnpm seed:iam-admin）
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

    for (const group of SECURITY_MENUS) {
      await upsertMenuTree(menuRepo, app.id, [group], null, '[seed:iam-admin-security]');
    }
    await cleanupMenusUnderPrefix(
      menuRepo,
      app.id,
      '/security',
      collectMenuPaths(SECURITY_MENUS),
      '[seed:iam-admin-security]',
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
        console.log(`[seed:iam-admin-security] 已创建 permission: ${perm.code}`);
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
    console.log('[seed:iam-admin-security] 完成');
  } finally {
    await dataSource.destroy();
  }
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[seed:iam-admin-security] 失败:', err);
  process.exit(1);
});
