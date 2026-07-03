import { http } from "@/utils/http";
import { unwrapIamPayload } from "@/utils/iam-api";

export interface PermissionApplicationBrief {
  id: string;
  name: string;
  code: string;
}

export interface PermissionItem {
  id: string;
  name: string;
  code: string;
  resource: string;
  action: string;
  applicationId: string | null;
  application?: PermissionApplicationBrief | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PermissionForm {
  applicationId?: string;
  name: string;
  code: string;
  resource: string;
  action: string;
}

export const getPermissions = (params?: {
  applicationId?: string;
  resource?: string;
  code?: string;
  name?: string;
}) =>
  http
    .get<unknown>("/api/permissions", { params })
    .then(body => unwrapIamPayload<PermissionItem[]>(body));

export const getPermission = (id: string) =>
  http
    .get<unknown>(`/api/permissions/${id}`)
    .then(body => unwrapIamPayload<PermissionItem>(body));

export const createPermission = (data: PermissionForm) =>
  http
    .post<unknown>("/api/permissions", { data })
    .then(body => unwrapIamPayload<PermissionItem>(body));

export const updatePermission = (id: string, data: Partial<PermissionForm>) =>
  http
    .request<unknown>("patch", `/api/permissions/${id}`, { data })
    .then(body => unwrapIamPayload<PermissionItem>(body));

export const deletePermission = (id: string) =>
  http
    .request<unknown>("delete", `/api/permissions/${id}`)
    .then(body => unwrapIamPayload<{ success?: boolean } | void>(body));
