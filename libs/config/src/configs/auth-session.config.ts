import { registerAs } from '@nestjs/config';

export const DEFAULT_PORTAL_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
/** IdP SSO Session / Grant / Interaction（生产默认 30 天） */
export const DEFAULT_OIDC_SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
/** AccessToken / IdToken（生产默认 2 小时） */
export const DEFAULT_OIDC_ACCESS_TOKEN_TTL_SECONDS = 2 * 60 * 60;
/** RefreshToken（生产默认 30 天，须 ≥ access） */
export const DEFAULT_OIDC_REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
/** 授权码（生产默认 5 分钟） */
export const DEFAULT_OIDC_AUTHORIZATION_CODE_TTL_SECONDS = 300;

export interface AuthSessionConfig {
  /** 账密门户 session token（秒） */
  portalSessionTtlSeconds: number;
  /** OIDC SSO Session、Grant、Interaction（秒） */
  oidcSessionTtlSeconds: number;
  /** OIDC AccessToken、IdToken（秒） */
  oidcAccessTokenTtlSeconds: number;
  /** OIDC RefreshToken（秒），应 ≥ access */
  oidcRefreshTokenTtlSeconds: number;
  /** 授权码 AuthorizationCode（秒） */
  oidcAuthorizationCodeTtlSeconds: number;
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === '') {
    return fallback;
  }
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 1 ? n : fallback;
}

export const authSessionConfig = registerAs(
  'authSession',
  (): AuthSessionConfig => {
    const oidcSessionTtlSeconds = parsePositiveInt(
      process.env.OIDC_SESSION_TTL_SECONDS,
      DEFAULT_OIDC_SESSION_TTL_SECONDS,
    );
    return {
      portalSessionTtlSeconds: parsePositiveInt(
        process.env.PORTAL_SESSION_TTL_SECONDS,
        DEFAULT_PORTAL_SESSION_TTL_SECONDS,
      ),
      oidcSessionTtlSeconds,
      oidcAccessTokenTtlSeconds: parsePositiveInt(
        process.env.OIDC_ACCESS_TOKEN_TTL_SECONDS,
        DEFAULT_OIDC_ACCESS_TOKEN_TTL_SECONDS,
      ),
      oidcRefreshTokenTtlSeconds: parsePositiveInt(
        process.env.OIDC_REFRESH_TOKEN_TTL_SECONDS,
        DEFAULT_OIDC_REFRESH_TOKEN_TTL_SECONDS,
      ),
      oidcAuthorizationCodeTtlSeconds: parsePositiveInt(
        process.env.OIDC_AUTHORIZATION_CODE_TTL_SECONDS,
        DEFAULT_OIDC_AUTHORIZATION_CODE_TTL_SECONDS,
      ),
    };
  },
);
