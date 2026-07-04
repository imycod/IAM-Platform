/**
 * Organization 域对外暴露的只读查询契约。
 * Access 域计算数据权限（scope=dept*）时，通过此接口获取用户的组织上下文与可管辖部门，
 * 而不是直接查询 organization 的表 —— 从而保持依赖方向单向、消除跨域耦合。
 */
export const ORGANIZATION_QUERY = Symbol('ORGANIZATION_QUERY');

export interface UserOrgContext {
  organizationId: string;
  departmentId?: string | null;
  positionId?: string | null;
}

export interface IOrganizationQuery {
  /** 用户能管辖的部门 id 列表（含下级），供数据权限判定使用。 */
  getManagedDepartmentIds(userId: string): Promise<string[]>;

  /**
   * 用户可访问的部门 id 列表。
   * includeSubtree=false → 仅所属部门；true → 所属部门及子部门 + 作为负责人的部门树。
   */
  getAccessibleDepartmentIds(userId: string, includeSubtree: boolean): Promise<string[]>;

  /** 用户的组织上下文（所属组织/部门/岗位）。 */
  getUserOrgContext(userId: string): Promise<UserOrgContext | null>;
}
