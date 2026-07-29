import http from '@/utils/http';
import { unwrapIamPayload } from '@/utils/iam-api';

export type ApplicationUserStatus =
  | 'active'
  | 'inactive'
  | 'pending'
  | 'rejected';

export interface ApplicationUserBrief {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  status: string;
}

export interface ApplicationBrief {
  id: string;
  name: string;
  code: string;
  status: string;
}

export interface ApplicationUserRoleBrief {
  id: string;
  name: string;
  code: string;
  accessRoleId: string | null;
}

export interface ApplicationUserItem {
  id: string;
  applicationId: string;
  userId: string;
  applicationRoleId?: string | null;
  status: ApplicationUserStatus | string;
  grantedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  user?: ApplicationUserBrief | null;
  application?: ApplicationBrief | null;
  applicationRole?: ApplicationUserRoleBrief | null;
}

export interface ApplicationUserForm {
  userId: string;
  email?: string;
  applicationRoleId?: string;
  status?: ApplicationUserStatus;
}

export interface ApplicationUserUpdateForm {
  status?: ApplicationUserStatus;
  applicationRoleId?: string | null;
}

export const getApplicationUsers = (applicationId: string) =>
  http
    .get<unknown>(`/api/applications/${applicationId}/users`)
    .then((body) => unwrapIamPayload<ApplicationUserItem[]>(body));

export const getApplicationUser = (applicationId: string, id: string) =>
  http
    .get<unknown>(`/api/applications/${applicationId}/users/${id}`)
    .then((body) => unwrapIamPayload<ApplicationUserItem>(body));

export const createApplicationUser = (
  applicationId: string,
  data: ApplicationUserForm
) =>
  http
    .post<unknown>(`/api/applications/${applicationId}/users`, { data })
    .then((body) => unwrapIamPayload<ApplicationUserItem>(body));

export const updateApplicationUser = (
  applicationId: string,
  id: string,
  data: ApplicationUserUpdateForm
) =>
  http
    .request<unknown>(
      'patch',
      `/api/applications/${applicationId}/users/${id}`,
      { data }
    )
    .then((body) => unwrapIamPayload<ApplicationUserItem>(body));

export const deleteApplicationUser = (applicationId: string, id: string) =>
  http.request<unknown>(
    'delete',
    `/api/applications/${applicationId}/users/${id}`
  );
