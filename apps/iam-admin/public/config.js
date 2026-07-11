/** iam-client OIDC SSO（按 hostname 自动切换 localhost / Nginx 子域 / NAS） */
(function () {
  const isLocalHost =
    location.hostname === "localhost" || location.hostname === "127.0.0.1";
  const cookieSuffix = isLocalHost ? "-" + (location.port || "80") : "";
  window.IAM_APP_COOKIE_KEYS = {
    token: "authorized-token" + cookieSuffix,
    multipleTabs: "multiple-tabs" + cookieSuffix
  };

  const nginx = location.hostname.endsWith(".pinshuai.local");
  // NAS 局域网：iam-admin 固定走 :9446（admin 容器 Nginx 反代 /api + /oidc）
  // 不要用 location.origin —— 从 NAS :5000 等其它网关入口打开会误把 OIDC 指到 5000
  const isLanIp = /^\d+\.\d+\.\d+\.\d+$/.test(location.hostname);
  const adminOrigin = isLanIp
    ? "http://" + location.hostname + ":9446"
    : null;

  window.IAM_CLIENT_CONFIG = nginx
    ? {
        iamBaseUrl: "http://api.pinshuai.local",
        oidcIssuer: "http://auth.pinshuai.local/oidc",
        clientId: "iam-admin-spa",
        scopes: "openid profile email",
        appCode: "iam-admin"
      }
    : adminOrigin
      ? {
          iamBaseUrl: adminOrigin,
          oidcIssuer: adminOrigin + "/oidc",
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
            iamBaseUrl: location.origin,
            oidcIssuer: location.origin + "/oidc",
            clientId: "iam-admin-spa",
            scopes: "openid profile email",
            appCode: "iam-admin"
          };
})();
