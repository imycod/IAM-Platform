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

/** 二级菜单：应用域 → 页面 */
const APPLICATION_MENUS: MenuSeed[] = [
  {
    name: '应用域',
    path: '/application',
    icon: 'ep:grid',
    sort: 20,
    permissionCode: null,
    children: [
      {
        name: '应用管理',
        path: '/application/app/index',
        icon: 'ep:platform',
        sort: 1,
        permissionCode: 'iam_admin:application:view',
      },
      {
        name: '菜单管理',
        path: '/application/menu/index',
        icon: 'ep:menu',
        sort: 2,
        permissionCode: 'iam_admin:application_menu:view',
      },
      {
        name: '角色管理',
        path: '/application/role/index',
        icon: 'ep:user-filled',
        sort: 3,
        permissionCode: 'iam_admin:application_role:view',
      },
      {
        name: '系统设置',
        path: '/application/setting/index',
        icon: 'ep:setting',
        sort: 4,
        permissionCode: 'iam_admin:application_setting:view',
      },
      {
        name: '用户管理',
        path: '/application/user/index',
        icon: 'ep:avatar',
        sort: 5,
        permissionCode: 'iam_admin:user:view',
      },
    ],
  },
];

const PERMISSIONS = [
  {
    name: '应用管理查看',
    code: 'iam_admin:application:view',
    resource: 'iam_admin:application',
    action: 'view',
  },
  {
    name: '应用菜单查看',
    code: 'iam_admin:application_menu:view',
    resource: 'iam_admin:application_menu',
    action: 'view',
  },
  {
    name: '应用角色查看',
    code: 'iam_admin:application_role:view',
    resource: 'iam_admin:application_role',
    action: 'view',
  },
  {
    name: '应用设置查看',
    code: 'iam_admin:application_setting:view',
    resource: 'iam_admin:application_setting',
    action: 'view',
  },
  { name: '用户管理查看', code: 'iam_admin:user:view', resource: 'iam_admin:user', action: 'view' },
] as const;

/**
 * IAM 管理平台 — 应用域二级菜单与权限种子。
 * 运行：pnpm seed:iam-admin-application（需先 pnpm seed:iam-admin）
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

    for (const group of APPLICATION_MENUS) {
      await upsertMenuTree(menuRepo, app.id, [group], null, '[seed:iam-admin-application]');
    }
    await cleanupMenusUnderPrefix(
      menuRepo,
      app.id,
      '/application',
      collectMenuPaths(APPLICATION_MENUS),
      '[seed:iam-admin-application]',
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
        console.log(`[seed:iam-admin-application] 已创建 permission: ${perm.code}`);
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
    console.log('[seed:iam-admin-application] 完成');
  } finally {
    await dataSource.destroy();
  }
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[seed:iam-admin-application] 失败:', err);
  process.exit(1);
});
