import http from '@/utils/http';
import { unwrapIamPayload } from '@/utils/iam-api';
import type { Paginated } from './identity-auth';

export interface IdentityUserItem {
  id: string;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  status: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
}

export interface IdentityUserForm {
  email?: string;
  phone?: string;
  name?: string;
  status?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
}

export const getIdentityUsers = (params?: {
  page?: number;
  pageSize?: number;
  status?: string;
}) =>
  http
    .get<unknown>('/api/users', { params })
    .then((body) => unwrapIamPayload<Paginated<IdentityUserItem>>(body));

export const createIdentityUser = (data: IdentityUserForm) =>
  http
    .post<unknown>('/api/users', { data })
    .then((body) => unwrapIamPayload<IdentityUserItem>(body));

export const updateIdentityUser = (
  id: string,
  data: Partial<IdentityUserForm>
) =>
  http
    .request<unknown>('patch', `/api/users/${id}`, { data })
    .then((body) => unwrapIamPayload<IdentityUserItem>(body));

export const deleteIdentityUser = (id: string) =>
  http.request<unknown>('delete', `/api/users/${id}`);
