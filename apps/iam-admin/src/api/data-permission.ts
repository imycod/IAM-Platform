import { http } from "@/utils/http";
import { unwrapIamPayload } from "@/utils/iam-api";

export type DataScope = "self" | "dept" | "dept_and_child" | "all" | "custom";

export interface DataPermissionItem {
  id: string;
  roleId: string;
  resource: string;
  scope: DataScope;
  customExpr: Record<string, unknown> | null;
  /** scope=all 时 true=跨组织可见 */
  unrestricted?: boolean;
  roleName?: string | null;
  roleCode?: string | null;
  resourceName?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface DataPermissionForm {
  roleId: string;
  resource: string;
  scope: DataScope;
  customExpr?: Record<string, unknown> | null;
  unrestricted?: boolean;
}

export const getDataPermissions = (params?: {
  roleId?: string;
  resource?: string;
}) =>
  http
    .get<unknown>("/api/data-permissions", { params })
    .then(body => unwrapIamPayload<DataPermissionItem[]>(body));

export const getDataPermission = (id: string) =>
  http
    .get<unknown>(`/api/data-permissions/${id}`)
    .then(body => unwrapIamPayload<DataPermissionItem>(body));

export const createDataPermission = (data: DataPermissionForm) =>
  http
    .post<unknown>("/api/data-permissions", { data })
    .then(body => unwrapIamPayload<DataPermissionItem>(body));

export const updateDataPermission = (
  id: string,
  data: Partial<DataPermissionForm>
) =>
  http
    .request<unknown>("patch", `/api/data-permissions/${id}`, { data })
    .then(body => unwrapIamPayload<DataPermissionItem>(body));

export const deleteDataPermission = (id: string) =>
  http
    .request<unknown>("delete", `/api/data-permissions/${id}`)
    .then(body => unwrapIamPayload<{ success?: boolean } | void>(body));
