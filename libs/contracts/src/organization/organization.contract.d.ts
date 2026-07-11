export declare const ORGANIZATION_QUERY: unique symbol;
export interface UserOrgContext {
    organizationId: string;
    departmentId?: string | null;
    positionId?: string | null;
}
export interface IOrganizationQuery {
    getManagedDepartmentIds(userId: string): Promise<string[]>;
    getAccessibleDepartmentIds(userId: string, includeSubtree: boolean): Promise<string[]>;
    getUserOrgContext(userId: string): Promise<UserOrgContext | null>;
}
