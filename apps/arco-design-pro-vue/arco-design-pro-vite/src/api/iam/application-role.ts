import http from '@/utils/http';
import { unwrapIamPayload } from '@/utils/iam-api';

export interface ApplicationRoleAccessRoleBrief {
  id: string;
  code: string;
  name: string;
  description?: string | null;
}

export interface ApplicationRoleItem {
  id: string;
  applicationId: string;
  name: string;
  code: string;
  accessRoleId: string | null;
  accessRole?: ApplicationRoleAccessRoleBrief | null;
  permissionIds?: string[];
  permissionCodes?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ApplicationRoleForm {
  name: string;
  code: string;
}

export interface ApplicationRoleUpdateForm {
  name?: string;
  description?: string;
}

export const getApplicationRoles = (applicationId: string) =>
  http
    .get<unknown>(`/api/applications/${applicationId}/roles`)
    .then((body) => unwrapIamPayload<ApplicationRoleItem[]>(body));

export const getApplicationRole = (applicationId: string, id: string) =>
  http
    .get<unknown>(`/api/applications/${applicationId}/roles/${id}`)
    .then((body) => unwrapIamPayload<ApplicationRoleItem>(body));

export const createApplicationRole = (
  applicationId: string,
  data: ApplicationRoleForm
) =>
  http
    .post<unknown>(`/api/applications/${applicationId}/roles`, { data })
    .then((body) => unwrapIamPayload<ApplicationRoleItem>(body));

export const updateApplicationRole = (
  applicationId: string,
  id: string,
  data: ApplicationRoleUpdateForm
) =>
  http
    .request<unknown>(
      'patch',
      `/api/applications/${applicationId}/roles/${id}`,
      { data }
    )
    .then((body) => unwrapIamPayload<ApplicationRoleItem>(body));

export const getApplicationRolePermissions = (
  applicationId: string,
  id: string
) =>
  http
    .get<unknown>(`/api/applications/${applicationId}/roles/${id}/permissions`)
    .then((body) => unwrapIamPayload<string[]>(body));

export const setApplicationRolePermissions = (
  applicationId: string,
  id: string,
  permissionIds: string[]
) =>
  http
    .request<unknown>(
      'put',
      `/api/applications/${applicationId}/roles/${id}/permissions`,
      {
        data: { permissionIds },
      }
    )
    .then((body) => unwrapIamPayload<ApplicationRoleItem>(body));

export const deleteApplicationRole = (applicationId: string, id: string) =>
  http.request<unknown>(
    'delete',
    `/api/applications/${applicationId}/roles/${id}`
  );
