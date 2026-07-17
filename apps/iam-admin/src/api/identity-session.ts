import { http } from "@/utils/http";
import { unwrapIamPayload } from "@/utils/iam-api";
import type { Paginated } from "./identity-auth";

export type UnifiedSessionKind =
  | "portal_password"
  | "oidc_sso"
  | "oidc_access_token";

export type SessionClientAccessStatus = "allow" | "deny";

export interface UnifiedSessionItem {
  id: string;
  kind: UnifiedSessionKind;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  clientId: string | null;
  clientName: string | null;
  applicationCode: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: string | null;
  createdAt: string | null;
  tokenPreview: string | null;
  /** 未过期且服务端仍存在 → 活跃 */
  active: boolean;
  /** 当前是否具备该应用/客户端的 application_user 进门资格 */
  accessStatus: SessionClientAccessStatus | null;
}

/** @deprecated 使用 UnifiedSessionItem */
export interface SessionItem {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceId?: string | null;
  user?: { email?: string | null; name?: string | null };
  createdAt?: string;
}

export interface SessionForm {
  userId: string;
  token: string;
  expiresAt: string;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
}

export const getSessionRegistry = (params?: {
  page?: number;
  pageSize?: number;
  userId?: string;
  kind?: UnifiedSessionKind;
}) =>
  http
    .get<unknown>("/api/sessions/registry", { params })
    .then(body => unwrapIamPayload<Paginated<UnifiedSessionItem>>(body));

export const revokeSessionRegistry = (kind: UnifiedSessionKind, id: string) =>
  http.request<unknown>("delete", `/api/sessions/registry/${kind}/${id}`);

export const revokeAllSessionRegistry = (params?: {
  userId?: string;
  kind?: UnifiedSessionKind;
}) =>
  http
    .request<{ revoked: number }>("delete", "/api/sessions/registry/all", {
      params
    })
    .then(body => unwrapIamPayload<{ revoked: number }>(body));

export const getSessions = (params?: { page?: number; pageSize?: number; userId?: string }) =>
  http.get<unknown>("/api/sessions", { params }).then(body => unwrapIamPayload<Paginated<SessionItem>>(body));

export const createSession = (data: SessionForm) =>
  http.post<unknown>("/api/sessions", { data }).then(body => unwrapIamPayload<SessionItem>(body));

export const updateSession = (id: string, data: Partial<SessionForm>) =>
  http.request<unknown>("patch", `/api/sessions/${id}`, { data }).then(body => unwrapIamPayload<SessionItem>(body));

export const deleteSession = (id: string) => http.request<unknown>("delete", `/api/sessions/${id}`);
