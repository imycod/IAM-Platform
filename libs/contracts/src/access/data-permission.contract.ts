/**
 * 跨服务数据权限标准契约（IAM → 业务系统）。
 * IAM 根据 RBAC scope + 组织上下文输出 filters，业务系统映射到本地表字段后拼 SQL。
 */

export type DataFilterOperator =
  | '='
  | '!='
  | 'in'
  | 'not_in'
  | '>'
  | '>='
  | '<'
  | '<='
  | 'like'
  | 'is_null'
  | 'is_not_null';

export interface DataFilterCondition {
  field: string;
  operator: DataFilterOperator;
  value?: string | number | boolean | string[] | number[] | null;
}

export interface DataFilterGroup {
  logic: 'and' | 'or';
  filters: Array<DataFilterCondition | DataFilterGroup>;
}

/** IAM /api/me/data-filters 标准响应 */
export interface ResolvedDataPermission {
  resource: string;
  scope: string;
  /** scope=all，业务侧无需追加 where */
  unrestricted: boolean;
  /** 无任何可见数据 */
  denyAll: boolean;
  logic: 'and' | 'or';
  filters: DataFilterCondition[];
  /** 复杂 OR 条件（如 self 多字段） */
  groups?: DataFilterGroup[];
  meta?: {
    userId?: string;
    organizationId?: string | null;
    departmentIds?: string[];
    customExpr?: Record<string, unknown> | null;
  };
}

/** resource.attributes.dataPermission 或平台默认映射 */
export interface ResourceDataPermissionFieldMapping {
  /** self：用户 ID 匹配字段，多个字段时 OR */
  selfFields?: string[];
  deptField?: string;
  orgField?: string;
}
