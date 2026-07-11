/** iam-client OIDC SSO（按 hostname 自动切换 localhost / Nginx 子域） */
(function () {
  const isLocalHost =
    location.hostname === "localhost" || location.hostname === "127.0.0.1";
  const cookieSuffix = isLocalHost ? "-" + (location.port || "80") : "";
  window.IAM_APP_COOKIE_KEYS = {
    token: "authorized-token" + cookieSuffix,
    multipleTabs: "multiple-tabs" + cookieSuffix
  };
  // 192.168.50.100 地址是这个 就走 192.168.50.100 配置
  const is19216850100 = location.hostname === "192.168.50.100";
  if (is19216850100) {
    window.IAM_CLIENT_CONFIG = {
      iamBaseUrl: "http://192.168.50.100:3000",
      oidcIssuer: "http://192.168.50.100:3000/oidc",
      clientId: "iam-admin-spa",
      scopes: "openid profile email",
      appCode: "iam-admin"
    };
  } else {
    const nginx = location.hostname.endsWith(".pinshuai.local");
    // oidcIssuer 指向专用授权服务器源 auth.pinshuai.local；业务 API 仍走 api.pinshuai.local。
    window.IAM_CLIENT_CONFIG = nginx
      ? {
          iamBaseUrl: "http://api.pinshuai.local",
          oidcIssuer: "http://auth.pinshuai.local/oidc",
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
      }
})();
