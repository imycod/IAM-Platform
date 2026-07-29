import { DEFAULT_LAYOUT } from '../base';
import { AppRouteRecordRaw } from '../types';

const IAM: AppRouteRecordRaw = {
  path: '/iam',
  name: 'iam',
  component: DEFAULT_LAYOUT,
  meta: {
    locale: 'menu.iam',
    requiresAuth: true,
    icon: 'icon-settings',
    order: 1,
  },
  children: [
    {
      path: 'organization/list',
      name: 'IamOrganizationList',
      component: () =>
        import('@/views/iam/organization/organization/index.vue'),
      meta: {
        locale: 'menu.iam.organization.list',
        requiresAuth: true,
        roles: ['*'],
      },
    },
    {
      path: 'organization/department',
      name: 'IamDepartment',
      component: () => import('@/views/iam/organization/department/index.vue'),
      meta: {
        locale: 'menu.iam.organization.department',
        requiresAuth: true,
        roles: ['*'],
      },
    },
    {
      path: 'organization/position',
      name: 'IamPosition',
      component: () => import('@/views/iam/organization/position/index.vue'),
      meta: {
        locale: 'menu.iam.organization.position',
        requiresAuth: true,
        roles: ['*'],
      },
    },
    {
      path: 'organization/employee',
      name: 'IamEmployee',
      component: () => import('@/views/iam/organization/employee/index.vue'),
      meta: {
        locale: 'menu.iam.organization.employee',
        requiresAuth: true,
        roles: ['*'],
      },
    },
    {
      path: 'organization/team',
      name: 'IamTeam',
      component: () => import('@/views/iam/organization/team/index.vue'),
      meta: {
        locale: 'menu.iam.organization.team',
        requiresAuth: true,
        roles: ['*'],
      },
    },
    {
      path: 'identity/user',
      name: 'IamIdentityUser',
      component: () => import('@/views/iam/identity/user/index.vue'),
      meta: {
        locale: 'menu.iam.identity.user',
        requiresAuth: true,
        roles: ['*'],
      },
    },
    {
      path: 'identity/account',
      name: 'IamIdentityAccount',
      component: () => import('@/views/iam/identity/account/index.vue'),
      meta: {
        locale: 'menu.iam.identity.account',
        requiresAuth: true,
        roles: ['*'],
      },
    },
    {
      path: 'identity/auth',
      name: 'IamIdentityAuth',
      component: () => import('@/views/iam/identity/auth/index.vue'),
      meta: {
        locale: 'menu.iam.identity.auth',
        requiresAuth: true,
        roles: ['*'],
      },
    },
    {
      path: 'identity/session',
      name: 'IamIdentitySession',
      component: () => import('@/views/iam/identity/session/index.vue'),
      meta: {
        locale: 'menu.iam.identity.session',
        requiresAuth: true,
        roles: ['*'],
      },
    },
    {
      path: 'identity/device',
      name: 'IamIdentityDevice',
      component: () => import('@/views/iam/identity/device/index.vue'),
      meta: {
        locale: 'menu.iam.identity.device',
        requiresAuth: true,
        roles: ['*'],
      },
    },
    {
      path: 'identity/profile',
      name: 'IamIdentityProfile',
      component: () => import('@/views/iam/identity/profile/index.vue'),
      meta: {
        locale: 'menu.iam.identity.profile',
        requiresAuth: true,
        roles: ['*'],
      },
    },
    {
      path: 'identity/verification',
      name: 'IamIdentityVerification',
      component: () => import('@/views/iam/identity/verification/index.vue'),
      meta: {
        locale: 'menu.iam.identity.verification',
        requiresAuth: true,
        roles: ['*'],
      },
    },
    {
      path: 'identity/login-history',
      name: 'IamLoginHistory',
      component: () => import('@/views/iam/identity/login-history/index.vue'),
      meta: {
        locale: 'menu.iam.identity.loginHistory',
        requiresAuth: true,
        roles: ['*'],
      },
    },
    {
      path: 'access/role',
      name: 'IamAccessRole',
      component: () => import('@/views/iam/access/role/index.vue'),
      meta: {
        locale: 'menu.iam.access.role',
        requiresAuth: true,
        roles: ['*'],
      },
    },
    {
      path: 'access/role/user',
      name: 'IamAccessRoleUser',
      component: () => import('@/views/iam/access/role/user/index.vue'),
      meta: {
        locale: 'menu.iam.access.roleUser',
        requiresAuth: true,
        roles: ['*'],
      },
    },
    {
      path: 'access/permission',
      name: 'IamAccessPermission',
      component: () => import('@/views/iam/access/permission/index.vue'),
      meta: {
        locale: 'menu.iam.access.permission',
        requiresAuth: true,
        roles: ['*'],
      },
    },
    {
      path: 'access/resource',
      name: 'IamAccessResource',
      component: () => import('@/views/iam/access/resource/index.vue'),
      meta: {
        locale: 'menu.iam.access.resource',
        requiresAuth: true,
        roles: ['*'],
      },
    },
    {
      path: 'access/data-permission',
      name: 'IamDataPermission',
      component: () => import('@/views/iam/access/data-permission/index.vue'),
      meta: {
        locale: 'menu.iam.access.dataPermission',
        requiresAuth: true,
        roles: ['*'],
      },
    },
    {
      path: 'application/app',
      name: 'IamApplicationApp',
      component: () => import('@/views/iam/application/app/index.vue'),
      meta: {
        locale: 'menu.iam.application.app',
        requiresAuth: true,
        roles: ['*'],
      },
    },
    {
      path: 'application/menu',
      name: 'IamApplicationMenu',
      component: () => import('@/views/iam/application/menu/index.vue'),
      meta: {
        locale: 'menu.iam.application.menu',
        requiresAuth: true,
        roles: ['*'],
      },
    },
    {
      path: 'application/role',
      name: 'IamApplicationRole',
      component: () => import('@/views/iam/application/role/index.vue'),
      meta: {
        locale: 'menu.iam.application.role',
        requiresAuth: true,
        roles: ['*'],
      },
    },
    {
      path: 'application/user',
      name: 'IamApplicationUser',
      component: () => import('@/views/iam/application/user/index.vue'),
      meta: {
        locale: 'menu.iam.application.user',
        requiresAuth: true,
        roles: ['*'],
      },
    },
    {
      path: 'security/oauth-client',
      name: 'IamOauthClient',
      component: () => import('@/views/iam/security/oauth-client/index.vue'),
      meta: {
        locale: 'menu.iam.security.oauthClient',
        requiresAuth: true,
        roles: ['*'],
      },
    },
    {
      path: 'security/auth-session-settings',
      name: 'IamAuthSessionSettings',
      component: () =>
        import('@/views/iam/security/auth-session-settings/index.vue'),
      meta: {
        locale: 'menu.iam.security.authSessionSettings',
        requiresAuth: true,
        roles: ['*'],
      },
    },
  ],
};

export default IAM;
