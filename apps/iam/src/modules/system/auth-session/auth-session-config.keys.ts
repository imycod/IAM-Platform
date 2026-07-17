export const AUTH_SESSION_CONFIG_GROUP = 'auth.session';

export const AUTH_SESSION_CONFIG_KEYS = {
  portalTtlSeconds: 'auth.session.portal_ttl_seconds',
  oidcTtlSeconds: 'auth.session.oidc_ttl_seconds',
  oidcAccessTokenTtlSeconds: 'auth.session.oidc_access_token_ttl_seconds',
  oidcRefreshTokenTtlSeconds: 'auth.session.oidc_refresh_token_ttl_seconds',
  oidcAuthorizationCodeTtlSeconds: 'auth.session.oidc_authorization_code_ttl_seconds',
} as const;
