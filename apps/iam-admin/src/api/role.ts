import { http } from "@/utils/http";
import { unwrapIamPayload } from "@/utils/iam-api";

export type RoleType = "system" | "custom" | "application";

export interface RoleItem {
  id: string;
  name: string;
  code: string;
  applicationId: string | null;
  type: RoleType;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface RoleForm {
  name: string;
  code: string;
  type: RoleType;
  description?: string | null;
  applicationId?: string | null;
}

export const getRoles = (params?: { applicationId?: string; all?: boolean }) =>
  http
    .get<unknown>("/api/roles", {
      params: {
        ...params,
        all: params?.all ? "true" : undefined
      }
    })
    .then(body => unwrapIamPayload<RoleItem[]>(body));

export const getRole = (id: string) =>
  http
    .get<unknown>(`/api/roles/${id}`)
    .then(body => unwrapIamPayload<RoleItem>(body));

export const createRole = (data: RoleForm) =>
  http
    .post<unknown>("/api/roles", { data })
    .then(body => unwrapIamPayload<RoleItem>(body));

export const updateRole = (id: string, data: Partial<RoleForm>) =>
  http
    .request<unknown>("patch", `/api/roles/${id}`, { data })
    .then(body => unwrapIamPayload<RoleItem>(body));

export const deleteRole = (id: string) =>
  http
    .request<unknown>("delete", `/api/roles/${id}`)
    .then(body => unwrapIamPayload<{ success?: boolean } | void>(body));

export const assignRoleToUser = (
  roleId: string,
  data: { userId: string; applicationId?: string | null }
) =>
  http
    .post<unknown>(`/api/roles/${roleId}/assign`, { data })
    .then(body => unwrapIamPayload<unknown>(body));

export const revokeRoleFromUser = (roleId: string, userId: string) =>
  http.request<unknown>("delete", `/api/roles/${roleId}/users/${userId}`);

export interface UserRoleAssignmentItem {
  id: string;
  userId: string;
  roleId: string;
  applicationId: string | null;
  createdAt?: string;
  role: RoleItem;
  user: {
    id: string;
    email: string | null;
    name: string | null;
    phone: string | null;
  };
}

export const getUserRoleAssignments = (params?: {
  applicationId?: string;
  roleId?: string;
  userId?: string;
}) =>
  http
    .get<unknown>("/api/roles/assignments", { params })
    .then(body => unwrapIamPayload<UserRoleAssignmentItem[]>(body));
