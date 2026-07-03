import { http } from "@/utils/http";
import { unwrapIamPayload } from "@/utils/iam-api";

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuthCredentialItem {
  id: string;
  userId: string;
  providerId: string;
  accountId: string;
  user?: { email?: string | null; name?: string | null; phone?: string | null };
  createdAt?: string;
}

export interface CredentialForm {
  userId: string;
  password?: string;
}

export interface CredentialUpdateForm {
  password: string;
}

export interface AuthSessionItem {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  user?: { email?: string | null; name?: string | null };
  createdAt?: string;
}

export const getAuthCredentials = (params?: {
  page?: number;
  pageSize?: number;
  userId?: string;
}) =>
  http
    .get<unknown>("/api/auth/admin/credentials", { params })
    .then(body => unwrapIamPayload<Paginated<AuthCredentialItem>>(body));

export const createAuthCredential = (data: CredentialForm) =>
  http
    .post<unknown>("/api/auth/admin/credentials", { data })
    .then(body => unwrapIamPayload<AuthCredentialItem>(body));

export const updateAuthCredential = (id: string, data: CredentialUpdateForm) =>
  http
    .request<unknown>("patch", `/api/auth/admin/credentials/${id}`, { data })
    .then(body => unwrapIamPayload<AuthCredentialItem>(body));

export const resetAuthPassword = (data: { userId: string; password: string }) =>
  http
    .post<unknown>("/api/auth/admin/reset-password", { data })
    .then(body => unwrapIamPayload<AuthCredentialItem>(body));

export const deleteAuthCredential = (id: string) =>
  http.request<unknown>("delete", `/api/auth/admin/credentials/${id}`);

export const getAuthSessions = (params?: {
  page?: number;
  pageSize?: number;
  userId?: string;
}) =>
  http
    .get<unknown>("/api/auth/admin/sessions", { params })
    .then(body => unwrapIamPayload<Paginated<AuthSessionItem>>(body));

export const revokeAuthSession = (id: string) =>
  http.request<unknown>("delete", `/api/auth/admin/sessions/${id}`);
