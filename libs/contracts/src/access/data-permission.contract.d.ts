export type DataFilterOperator = '=' | '!=' | 'in' | 'not_in' | '>' | '>=' | '<' | '<=' | 'like' | 'is_null' | 'is_not_null';
export interface DataFilterCondition {
    field: string;
    operator: DataFilterOperator;
    value?: string | number | boolean | string[] | number[] | null;
}
export interface DataFilterGroup {
    logic: 'and' | 'or';
    filters: Array<DataFilterCondition | DataFilterGroup>;
}
export interface ResolvedDataPermission {
    resource: string;
    scope: string;
    unrestricted: boolean;
    denyAll: boolean;
    logic: 'and' | 'or';
    filters: DataFilterCondition[];
    groups?: DataFilterGroup[];
    meta?: {
        userId?: string;
        organizationId?: string | null;
        departmentId?: string | null;
        departmentIds?: string[];
        customExpr?: Record<string, unknown> | null;
    };
}
export interface ResourceDataPermissionFieldMapping {
    selfFields?: string[];
    deptField?: string;
    orgField?: string;
}
