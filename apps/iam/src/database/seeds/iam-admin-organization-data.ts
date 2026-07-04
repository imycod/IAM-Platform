import dataSource from '../data-source';
import { ApplicationEntity } from '../../modules/application/application/entities/application.entity';
import { ApplicationMenuEntity } from '../../modules/application/application-menu/entities/application-menu.entity';
import { RoleEntity } from '../../modules/access/role/entities/role.entity';
import { PermissionEntity } from '../../modules/access/permission/entities/permission.entity';
import { RolePermissionEntity } from '../../modules/access/role/entities/role-permission.entity';
import { ResourceEntity } from '../../modules/access/resource/entities/resource.entity';
import { OrganizationEntity } from '../../modules/organization/organization/entities/organization.entity';
import { DepartmentEntity } from '../../modules/organization/department/entities/department.entity';
import { PositionEntity } from '../../modules/organization/position/entities/position.entity';
import { TeamEntity } from '../../modules/organization/team/entities/team.entity';
import { TeamMemberEntity } from '../../modules/organization/team/entities/team-member.entity';
import { EmployeeEntity } from '../../modules/organization/employee/entities/employee.entity';
import { UserEntity } from '../../modules/identity/user/entities/user.entity';
import {
  collectMenuPaths,
  cleanupMenusUnderPrefix,
  type MenuSeed,
  upsertMenuTree,
} from './menu-seed.util';

const APP_CODE = 'iam-admin';
const MANAGER_ROLE_CODE = 'iam_admin:manager';
const ADMIN_EMAIL = 'admin@qq.com';

const ORG_CODE = 'default_org';
const DEPT_HQ_CODE = 'hq';
const DEPT_RND_CODE = 'rnd';
const POS_MANAGER_CODE = 'manager';
const POS_STAFF_CODE = 'staff';
const TEAM_PLATFORM_CODE = 'platform_team';

/** 二级菜单：组织域 → 页面 */
const ORGANIZATION_MENUS: MenuSeed[] = [
  {
    name: '组织域',
    path: '/organization',
    icon: 'ep:office-building',
    sort: 25,
    permissionCode: null,
    children: [
      {
        name: '组织管理',
        path: '/organization/organization/index',
        icon: 'ep:home-filled',
        sort: 1,
        permissionCode: 'iam_admin:organization:view',
      },
      {
        name: '部门管理',
        path: '/organization/department/index',
        icon: 'ep:share',
        sort: 2,
        permissionCode: 'iam_admin:department:view',
      },
      {
        name: '岗位管理',
        path: '/organization/position/index',
        icon: 'ep:briefcase',
        sort: 3,
        permissionCode: 'iam_admin:position:view',
      },
      {
        name: '员工管理',
        path: '/organization/employee/index',
        icon: 'ep:user-filled',
        sort: 4,
        permissionCode: 'iam_admin:employee:view',
      },
      {
        name: '团队管理',
        path: '/organization/team/index',
        icon: 'ep:coordinate',
        sort: 5,
        permissionCode: 'iam_admin:team:view',
      },
    ],
  },
];

const PERMISSIONS = [
  {
    name: '组织管理查看',
    code: 'iam_admin:organization:view',
    resource: 'iam_admin:organization',
    action: 'view',
  },
  {
    name: '部门管理查看',
    code: 'iam_admin:department:view',
    resource: 'iam_admin:department',
    action: 'view',
  },
  {
    name: '岗位管理查看',
    code: 'iam_admin:position:view',
    resource: 'iam_admin:position',
    action: 'view',
  },
  {
    name: '员工管理查看',
    code: 'iam_admin:employee:view',
    resource: 'iam_admin:employee',
    action: 'view',
  },
  {
    name: '团队管理查看',
    code: 'iam_admin:team:view',
    resource: 'iam_admin:team',
    action: 'view',
  },
] as const;

const RESOURCES = [
  { name: '组织', code: 'iam_admin:organization', type: 'organization' },
  { name: '部门', code: 'iam_admin:department', type: 'department' },
  { name: '岗位', code: 'iam_admin:position', type: 'position' },
  { name: '员工', code: 'iam_admin:employee', type: 'employee' },
  { name: '团队', code: 'iam_admin:team', type: 'team' },
] as const;

/**
 * IAM 管理平台 — 组织域菜单、权限与演示数据。
 * 运行：pnpm seed:iam-admin-organization（需先 pnpm seed:iam-admin）
 */
async function run(): Promise<void> {
  await dataSource.initialize();
  try {
    const appRepo = dataSource.getRepository(ApplicationEntity);
    const menuRepo = dataSource.getRepository(ApplicationMenuEntity);
    const roleRepo = dataSource.getRepository(RoleEntity);
    const permissionRepo = dataSource.getRepository(PermissionEntity);
    const rolePermissionRepo = dataSource.getRepository(RolePermissionEntity);
    const resourceRepo = dataSource.getRepository(ResourceEntity);
    const orgRepo = dataSource.getRepository(OrganizationEntity);
    const deptRepo = dataSource.getRepository(DepartmentEntity);
    const positionRepo = dataSource.getRepository(PositionEntity);
    const teamRepo = dataSource.getRepository(TeamEntity);
    const teamMemberRepo = dataSource.getRepository(TeamMemberEntity);
    const employeeRepo = dataSource.getRepository(EmployeeEntity);
    const userRepo = dataSource.getRepository(UserEntity);

    const app = await appRepo.findOne({ where: { code: APP_CODE } });
    if (!app) {
      throw new Error(`应用 ${APP_CODE} 不存在，请先运行 pnpm seed:iam-admin`);
    }

    for (const group of ORGANIZATION_MENUS) {
      await upsertMenuTree(menuRepo, app.id, [group], null, '[seed:iam-admin-organization]');
    }
    await cleanupMenusUnderPrefix(
      menuRepo,
      app.id,
      '/organization',
      collectMenuPaths(ORGANIZATION_MENUS),
      '[seed:iam-admin-organization]',
    );

    for (const res of RESOURCES) {
      let resource = await resourceRepo.findOne({ where: { code: res.code } });
      if (!resource) {
        resource = await resourceRepo.save(resourceRepo.create(res));
        // eslint-disable-next-line no-console
        console.log(`[seed:iam-admin-organization] 已创建 resource: ${res.code}`);
      }
    }

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
        console.log(`[seed:iam-admin-organization] 已创建 permission: ${perm.code}`);
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

    let org = await orgRepo.findOne({ where: { code: ORG_CODE } });
    if (!org) {
      org = await orgRepo.save(
        orgRepo.create({
          name: '默认组织',
          code: ORG_CODE,
          type: 'company',
          status: 'active',
          sort: 0,
        }),
      );
      // eslint-disable-next-line no-console
      console.log('[seed:iam-admin-organization] 已创建组织: 默认组织');
    }

    let deptHq = await deptRepo.findOne({
      where: { organizationId: org.id, code: DEPT_HQ_CODE },
    });
    if (!deptHq) {
      deptHq = await deptRepo.save(
        deptRepo.create({
          organizationId: org.id,
          name: '总部',
          code: DEPT_HQ_CODE,
          parentId: null,
          sort: 0,
          path: null,
        }),
      );
      deptHq.path = `/${deptHq.id}/`;
      deptHq = await deptRepo.save(deptHq);
    }

    let deptRnd = await deptRepo.findOne({
      where: { organizationId: org.id, code: DEPT_RND_CODE },
    });
    if (!deptRnd) {
      deptRnd = await deptRepo.save(
        deptRepo.create({
          organizationId: org.id,
          name: '研发部',
          code: DEPT_RND_CODE,
          parentId: deptHq.id,
          sort: 1,
          path: null,
        }),
      );
      deptRnd.path = `${deptHq.path}${deptRnd.id}/`;
      deptRnd = await deptRepo.save(deptRnd);
    }

    let posManager = await positionRepo.findOne({
      where: { organizationId: org.id, code: POS_MANAGER_CODE },
    });
    if (!posManager) {
      posManager = await positionRepo.save(
        positionRepo.create({
          organizationId: org.id,
          name: '经理',
          code: POS_MANAGER_CODE,
          level: 10,
        }),
      );
    }

    let posStaff = await positionRepo.findOne({
      where: { organizationId: org.id, code: POS_STAFF_CODE },
    });
    if (!posStaff) {
      posStaff = await positionRepo.save(
        positionRepo.create({
          organizationId: org.id,
          name: '员工',
          code: POS_STAFF_CODE,
          level: 1,
        }),
      );
    }

    let team = await teamRepo.findOne({
      where: { organizationId: org.id, code: TEAM_PLATFORM_CODE },
    });
    if (!team) {
      team = await teamRepo.save(
        teamRepo.create({
          organizationId: org.id,
          name: '平台团队',
          code: TEAM_PLATFORM_CODE,
          description: 'IAM 平台研发与运维',
        }),
      );
    }

    const adminUser = await userRepo.findOne({ where: { email: ADMIN_EMAIL } });
    if (adminUser) {
      let employee = await employeeRepo.findOne({
        where: { organizationId: org.id, userId: adminUser.id },
      });
      if (!employee) {
        employee = await employeeRepo.save(
          employeeRepo.create({
            userId: adminUser.id,
            organizationId: org.id,
            departmentId: deptHq.id,
            positionId: posManager.id,
            employeeNo: 'E001',
            status: 'active',
            hiredAt: new Date().toISOString().slice(0, 10),
          }),
        );
        // eslint-disable-next-line no-console
        console.log(`[seed:iam-admin-organization] 已为 ${ADMIN_EMAIL} 创建员工档案`);
      }

      const memberExists = await teamMemberRepo.findOne({
        where: { teamId: team.id, employeeId: employee.id },
      });
      if (!memberExists) {
        await teamMemberRepo.save(
          teamMemberRepo.create({
            teamId: team.id,
            employeeId: employee.id,
            roleInTeam: 'leader',
          }),
        );
      }

      if (!deptHq.leaderEmployeeId) {
        deptHq.leaderEmployeeId = employee.id;
        await deptRepo.save(deptHq);
      }
    }

    // eslint-disable-next-line no-console
    console.log('[seed:iam-admin-organization] 完成');
  } finally {
    await dataSource.destroy();
  }
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[seed:iam-admin-organization] 失败:', err);
  process.exit(1);
});
