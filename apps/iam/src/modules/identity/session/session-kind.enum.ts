/** 门户 session 表中的会话类型（OIDC 会话不在此表，由 registry 聚合展示）。 */
export enum PortalSessionKind {
  PORTAL_PASSWORD = 'portal_password',
}

/** 会话中心统一视图中的会话类型。 */
export enum UnifiedSessionKind {
  PORTAL_PASSWORD = 'portal_password',
  OIDC_SSO = 'oidc_sso',
  OIDC_ACCESS_TOKEN = 'oidc_access_token',
}
