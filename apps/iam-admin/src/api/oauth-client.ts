import { http } from "@/utils/http";
import { unwrapIamPayload } from "@/utils/iam-api";
import type { Paginated } from "./identity-auth";

export interface OauthClientApplicationBrief {
  id: string;
  name: string;
  code: string;
  status: string;
}

export interface OauthClientItem {
  id: string;
  applicationId: string;
  clientId: string;
  clientSecretMasked: string;
  clientSecretPlain?: string | null;
  redirectUris: string[];
  grantTypes: string[];
  responseTypes: string[];
  scopes: string[];
  tokenEndpointAuthMethod: string;
  requirePkce: boolean;
  application?: OauthClientApplicationBrief | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface OauthClientForm {
  applicationId: string;
  clientId?: string;
  redirectUris: string[];
  grantTypes?: string[];
  responseTypes?: string[];
  scopes?: string[];
  tokenEndpointAuthMethod?: string;
  requirePkce?: boolean;
}

export interface OauthClientUpdateForm {
  clientId?: string;
  redirectUris?: string[];
  grantTypes?: string[];
  responseTypes?: string[];
  scopes?: string[];
  tokenEndpointAuthMethod?: string;
  requirePkce?: boolean;
}

export const getOauthClients = (params?: {
  page?: number;
  pageSize?: number;
  applicationId?: string;
  clientId?: string;
  keyword?: string;
}) =>
  http
    .get<unknown>("/api/oauth-clients", { params })
    .then(body => unwrapIamPayload<Paginated<OauthClientItem>>(body));

export const getOauthClient = (id: string) =>
  http
    .get<unknown>(`/api/oauth-clients/${id}`)
    .then(body => unwrapIamPayload<OauthClientItem>(body));

export const getOauthClientByApplication = (applicationId: string) =>
  http
    .get<unknown>(`/api/oauth-clients/by-application/${applicationId}`)
    .then(body => unwrapIamPayload<OauthClientItem | null>(body));

export const createOauthClient = (data: OauthClientForm) =>
  http
    .post<unknown>("/api/oauth-clients", { data })
    .then(body => unwrapIamPayload<OauthClientItem>(body));

export const updateOauthClient = (id: string, data: OauthClientUpdateForm) =>
  http
    .request<unknown>("patch", `/api/oauth-clients/${id}`, { data })
    .then(body => unwrapIamPayload<OauthClientItem>(body));

export const rotateOauthClientSecret = (id: string) =>
  http
    .post<unknown>(`/api/oauth-clients/${id}/rotate-secret`)
    .then(body => unwrapIamPayload<OauthClientItem>(body));

export const deleteOauthClient = (id: string) =>
  http.request<unknown>("delete", `/api/oauth-clients/${id}`);
