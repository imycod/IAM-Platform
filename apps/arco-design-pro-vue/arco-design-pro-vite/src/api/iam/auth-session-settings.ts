import http from '@/utils/http';
import { unwrapIamPayload } from '@/utils/iam-api';

export interface AuthSessionEnvDefaults {
  portalSessionTtlSeconds: number;
  oidcSessionTtlSeconds: number;
  oidcAccessTokenTtlSeconds: number;
  oidcRefreshTokenTtlSeconds: number;
  oidcAuthorizationCodeTtlSeconds: number;
}

export interface ApplicationPortalSessionPolicy {
  applicationId: string;
  applicationCode: string;
  applicationName: string;
  portalSessionTtlSeconds: number | null;
  effectivePortalSessionTtlSeconds: number;
}

export interface AuthSessionSettings extends AuthSessionEnvDefaults {
  envDefaults: AuthSessionEnvDefaults;
  overrides: {
    portalSessionTtlSeconds: boolean;
    oidcSessionTtlSeconds: boolean;
    oidcAccessTokenTtlSeconds: boolean;
    oidcRefreshTokenTtlSeconds: boolean;
    oidcAuthorizationCodeTtlSeconds: boolean;
  };
  applicationPortalPolicies: ApplicationPortalSessionPolicy[];
}

export interface UpdateAuthSessionSettingsPayload {
  portalSessionTtlSeconds?: number;
  oidcSessionTtlSeconds?: number;
  oidcAccessTokenTtlSeconds?: number;
  oidcRefreshTokenTtlSeconds?: number;
  oidcAuthorizationCodeTtlSeconds?: number;
}

export const getAuthSessionSettings = () =>
  http
    .get<unknown>('/api/system/auth-session-settings')
    .then((res) => unwrapIamPayload<AuthSessionSettings>(res));

export const updateAuthSessionSettings = (
  data: UpdateAuthSessionSettingsPayload
) =>
  http
    .request<unknown>('patch', '/api/system/auth-session-settings', { data })
    .then((res) => unwrapIamPayload<AuthSessionSettings>(res));

export const updateApplicationPortalSessionTtl = (
  applicationId: string,
  portalSessionTtlSeconds: number | null
) =>
  http
    .request<unknown>(
      'patch',
      `/api/system/auth-session-settings/applications/${applicationId}/portal-session-ttl`,
      { data: { portalSessionTtlSeconds } }
    )
    .then((res) => unwrapIamPayload<AuthSessionSettings>(res));

export const resetAuthSessionSettings = () =>
  http
    .post<unknown>('/api/system/auth-session-settings/reset')
    .then((res) => unwrapIamPayload<AuthSessionSettings>(res));
