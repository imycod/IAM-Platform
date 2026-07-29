import http from '@/utils/http';
import { unwrapIamPayload } from '@/utils/iam-api';
import type { Paginated } from './identity-auth';

export interface LoginHistoryItem {
  id: string;
  userId?: string | null;
  identifier?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  region?: string | null;
  success: boolean;
  failReason?: string | null;
  loginType?: string | null;
  clientId?: string | null;
  applicationId?: string | null;
  applicationCode?: string | null;
  applicationName?: string | null;
  createdAt?: string;
}

export interface LoginHistoryForm {
  userId?: string;
  identifier?: string;
  ip?: string;
  userAgent?: string;
  region?: string;
  success: boolean;
  failReason?: string;
  loginType?: string;
  clientId?: string;
  applicationId?: string;
  applicationCode?: string;
  applicationName?: string;
}

export const getLoginHistories = (params?: {
  page?: number;
  pageSize?: number;
  userId?: string;
  success?: boolean;
  applicationCode?: string;
  clientId?: string;
}) =>
  http
    .get<unknown>('/api/login-histories', { params })
    .then((body) => unwrapIamPayload<Paginated<LoginHistoryItem>>(body));

export const createLoginHistory = (data: LoginHistoryForm) =>
  http
    .post<unknown>('/api/login-histories', { data })
    .then((body) => unwrapIamPayload<LoginHistoryItem>(body));

export const updateLoginHistory = (
  id: string,
  data: Partial<LoginHistoryForm>
) =>
  http
    .request<unknown>('patch', `/api/login-histories/${id}`, { data })
    .then((body) => unwrapIamPayload<LoginHistoryItem>(body));

export const deleteLoginHistory = (id: string) =>
  http.request<unknown>('delete', `/api/login-histories/${id}`);

export const deleteAllLoginHistories = (params?: {
  userId?: string;
  success?: boolean;
  applicationCode?: string;
  clientId?: string;
}) =>
  http
    .request<{ deleted: number }>('delete', '/api/login-histories/all', {
      params,
    })
    .then((body) => unwrapIamPayload<{ deleted: number }>(body));
