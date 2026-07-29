import http from '@/utils/http';
import { unwrapIamPayload } from '@/utils/iam-api';
import type { Paginated } from './identity-auth';

export interface AccountItem {
  id: string;
  userId: string;
  providerId: string;
  accountId: string;
  scope: string | null;
  userEmail?: string | null;
  userName?: string | null;
  user?: {
    id: string;
    email?: string | null;
    name?: string | null;
    phone?: string | null;
  } | null;
  createdAt?: string;
}

export interface AccountForm {
  userId: string;
  providerId: string;
  accountId: string;
  password?: string;
  scope?: string;
}

export const getAccounts = (params?: {
  page?: number;
  pageSize?: number;
  userId?: string;
  providerId?: string;
}) =>
  http
    .get<unknown>('/api/accounts', { params })
    .then((body) => unwrapIamPayload<Paginated<AccountItem>>(body));

export const createAccount = (data: AccountForm) =>
  http
    .post<unknown>('/api/accounts', { data })
    .then((body) => unwrapIamPayload<AccountItem>(body));

export const updateAccount = (
  id: string,
  data: { scope?: string; password?: string }
) =>
  http
    .request<unknown>('patch', `/api/accounts/${id}`, { data })
    .then((body) => unwrapIamPayload<AccountItem>(body));

export const deleteAccount = (id: string) =>
  http.request<unknown>('delete', `/api/accounts/${id}`);
