/** iam-client OIDC SSO（按 hostname 自动切换 localhost / Nginx 子域 / 当前访问源） */
(function () {
  const isLocalHost =
    location.hostname === "localhost" || location.hostname === "127.0.0.1";
  const cookieSuffix = isLocalHost ? "-" + (location.port || "80") : "";
  window.IAM_APP_COOKIE_KEYS = {
    token: "authorized-token" + cookieSuffix,
    multipleTabs: "multiple-tabs" + cookieSuffix
  };

  const nginx = location.hostname.endsWith(".pinshuai.local");
  // Docker/NAS：admin Nginx 反代 /api 与 /oidc，全部走当前 origin（如 http://192.168.50.100:9446）
  const sameOrigin = location.origin;

  window.IAM_CLIENT_CONFIG = nginx
    ? {
        iamBaseUrl: "http://api.pinshuai.local",
        oidcIssuer: "http://auth.pinshuai.local/oidc",
        clientId: "iam-admin-spa",
        scopes: "openid profile email",
        appCode: "iam-admin"
      }
    : isLocalHost
      ? {
          iamBaseUrl: "http://localhost:3000",
          oidcIssuer: "http://localhost:3000/oidc",
          clientId: "iam-admin-spa",
          scopes: "openid profile email",
          appCode: "iam-admin"
        }
      : {
          iamBaseUrl: sameOrigin,
          oidcIssuer: sameOrigin + "/oidc",
          clientId: "iam-admin-spa",
          scopes: "openid profile email",
          appCode: "iam-admin"
        };
})();
