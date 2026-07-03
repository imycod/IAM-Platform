/** iam-client OIDC SSO 配置（redirectUri 运行时按当前 origin 解析，见 public/oidc.js） */
window.IAM_CLIENT_CONFIG = {
  iamBaseUrl: "http://localhost:3000",
  oidcIssuer: "http://localhost:3000/oidc",
  clientId: "iam-admin-spa",
  scopes: "openid profile email",
  appCode: "iam-admin"
};
