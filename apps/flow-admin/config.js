/** flow-admin SSO 演示配置（redirectUri 运行时按当前 origin 解析，见 oidc.js） */
window.FLOW_ADMIN_CONFIG = {
  iamBaseUrl: 'http://localhost:3000',
  oidcIssuer: 'http://localhost:3000/oidc',
  clientId: 'flow-admin-spa',
  scopes: 'openid profile email',
  /** flow-admin 应用 ID（seed 后可在 IAM 库 application 表查看） */
  applicationId: '01KWEVEXEC0EY4W4A3RC5QCAGZ',
};
