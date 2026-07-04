import dataSource from '../data-source';
import { ApplicationEntity } from '../../modules/application/application/entities/application.entity';
import { ApplicationMenuEntity } from '../../modules/application/application-menu/entities/application-menu.entity';
import { ApplicationRoleEntity } from '../../modules/application/application-role/entities/application-role.entity';
import {
  ApplicationUserEntity,
  ApplicationUserStatus,
} from '../../modules/application/application-user/entities/application-user.entity';
import { UserEntity, UserStatus } from '../../modules/identity/user/entities/user.entity';
import { RoleEntity, RoleType } from '../../modules/access/role/entities/role.entity';
import { UserRoleEntity } from '../../modules/access/role/entities/user-role.entity';
import { PermissionEntity } from '../../modules/access/permission/entities/permission.entity';
import { RolePermissionEntity } from '../../modules/access/role/entities/role-permission.entity';

const APP_CODE = 'flow-admin';
const USER_EMAIL = 'admin@qq.com';

const MENUS = [
  {
    name: '产品列表',
    path: '/products/index',
    sort: 1,
    permissionCode: 'flow_admin:products:view',
  },
  {
    name: '素材列表',
    path: '/materials/index',
    sort: 2,
    permissionCode: 'flow_admin:materials:view',
  },
  { name: '任务列表', path: '/tasks/index', sort: 3, permissionCode: 'flow_admin:tasks:view' },
] as const;

/**
 * 初始化 flow-admin 流程管理平台种子数据。
 * 运行：pnpm seed:flow-admin
 */
async function run(): Promise<void> {
  await dataSource.initialize();
  try {
    const appRepo = dataSource.getRepository(ApplicationEntity);
    const menuRepo = dataSource.getRepository(ApplicationMenuEntity);
    const userRepo = dataSource.getRepository(UserEntity);
    const appUserRepo = dataSource.getRepository(ApplicationUserEntity);
    const appRoleRepo = dataSource.getRepository(ApplicationRoleEntity);
    const roleRepo = dataSource.getRepository(RoleEntity);
    const userRoleRepo = dataSource.getRepository(UserRoleEntity);
    const permissionRepo = dataSource.getRepository(PermissionEntity);
    const rolePermissionRepo = dataSource.getRepository(RolePermissionEntity);

    let app = await appRepo.findOne({ where: { code: APP_CODE } });
    if (app) {
      // eslint-disable-next-line no-console
      console.log(`[seed:flow-admin] 应用 ${APP_CODE} 已存在，跳过`);
      return;
    }

    app = await appRepo.save(
      appRepo.create({
        name: '流程管理平台',
        code: APP_CODE,
        type: 'web',
        status: 'active',
        description: '流程管理业务系统',
      }),
    );
    // eslint-disable-next-line no-console
    console.log(`[seed:flow-admin] 已创建应用: ${app.name} (id=${app.id})`);

    for (const item of MENUS) {
      await menuRepo.save(
        menuRepo.create({
          applicationId: app.id,
          name: item.name,
          path: item.path,
          permissionCode: item.permissionCode,
          sort: item.sort,
        }),
      );
    }
    // eslint-disable-next-line no-console
    console.log(`[seed:flow-admin] 已创建 ${MENUS.length} 个应用菜单`);

    let user = await userRepo.findOne({ where: { email: USER_EMAIL } });
    if (!user) {
      user = await userRepo.save(
        userRepo.create({
          email: USER_EMAIL,
          phone: '13400705847',
          name: '武兴师',
          status: UserStatus.ACTIVE,
          isSystem: false,
        }),
      );
      // eslint-disable-next-line no-console
      console.log(`[seed:flow-admin] 已创建用户: ${USER_EMAIL} (id=${user.id})`);
    } else {
      // eslint-disable-next-line no-console
      console.log(`[seed:flow-admin] 用户 ${USER_EMAIL} 已存在，复用 (id=${user.id})`);
    }

    await appUserRepo.save(
      appUserRepo.create({
        applicationId: app.id,
        userId: user.id,
        status: ApplicationUserStatus.ACTIVE,
        grantedAt: new Date(),
      }),
    );
    // eslint-disable-next-line no-console
    console.log('[seed:flow-admin] 已授权用户访问 flow-admin');

    await appRoleRepo.save(
      appRoleRepo.create({
        applicationId: app.id,
        name: '超级管理员',
        code: 'super_admin',
      }),
    );
    // eslint-disable-next-line no-console
    console.log('[seed:flow-admin] 已创建 application_role: super_admin');

    const accessRole = await roleRepo.save(
      roleRepo.create({
        applicationId: app.id,
        name: '流程管理员',
        code: 'flow_admin:manager',
        type: RoleType.APPLICATION,
        description: '流程管理系统的管理员',
      }),
    );
    // eslint-disable-next-line no-console
    console.log(`[seed:flow-admin] 已创建 access.role: flow_admin:manager (id=${accessRole.id})`);

    await userRoleRepo.save(
      userRoleRepo.create({
        userId: user.id,
        roleId: accessRole.id,
        applicationId: app.id,
      }),
    );
    // eslint-disable-next-line no-console
    console.log('[seed:flow-admin] 已关联 user_role');

    const permissions = [
      {
        name: '流程管理产品列表',
        code: 'flow_admin:products:view',
        resource: 'flow_admin:products',
        action: 'view',
      },
      {
        name: '流程管理素材列表',
        code: 'flow_admin:materials:view',
        resource: 'flow_admin:materials',
        action: 'view',
      },
      {
        name: '流程管理任务列表',
        code: 'flow_admin:tasks:view',
        resource: 'flow_admin:tasks',
        action: 'view',
      },
    ] as const;

    for (const perm of permissions) {
      const permission = await permissionRepo.save(
        permissionRepo.create({
          applicationId: app.id,
          ...perm,
        }),
      );
      await rolePermissionRepo.save(
        rolePermissionRepo.create({
          roleId: accessRole.id,
          permissionId: permission.id,
        }),
      );
      // eslint-disable-next-line no-console
      console.log(`[seed:flow-admin] 已创建并关联 permission: ${perm.code}`);
    }
  } finally {
    await dataSource.destroy();
  }
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[seed:flow-admin] 失败:', err);
  process.exit(1);
});
