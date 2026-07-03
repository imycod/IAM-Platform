import { RoleType } from '../../../access/role/entities/role.entity';

/** 应用编码 iam-admin → iam_admin，再拼接业务角色编码 */
export function buildAccessRoleCode(applicationCode: string, roleCode: string): string {
  const appPrefix = applicationCode.replace(/-/g, '_');
  return `${appPrefix}:${roleCode}`;
}

export { RoleType };
