/** iam-client OIDC SSO（按 hostname 自动切换 localhost / Nginx 子域） */
(function () {
  const nginx = location.hostname.endsWith(".pinshuai.local");
  window.IAM_CLIENT_CONFIG = nginx
    ? {
        iamBaseUrl: "http://api.pinshuai.local",
        oidcIssuer: "http://api.pinshuai.local/oidc",
        clientId: "iam-admin-spa",
        scopes: "openid profile email",
        appCode: "iam-admin"
      }
    : {
        iamBaseUrl: "http://localhost:3000",
        oidcIssuer: "http://localhost:3000/oidc",
        clientId: "iam-admin-spa",
        scopes: "openid profile email",
        appCode: "iam-admin"
      };
})();
