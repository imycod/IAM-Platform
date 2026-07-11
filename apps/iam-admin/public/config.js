/** iam-client OIDC SSO：按访问环境自动解析，不上线写死域名 */
(function () {
  const host = location.hostname;
  const isLocalHost = host === "localhost" || host === "127.0.0.1";
  const cookieSuffix = isLocalHost ? "-" + (location.port || "80") : "";
  window.IAM_APP_COOKIE_KEYS = {
    token: "authorized-token" + cookieSuffix,
    multipleTabs: "multiple-tabs" + cookieSuffix
  };

  const SHARED = {
    clientId: "iam-admin-spa",
    scopes: "openid profile email",
    appCode: "iam-admin"
  };

  /**
   * 子域模式（stage / production 共用）：
   * admin.<root> → api.<root> + auth.<root>
   * 例：admin.pinshuai.local / admin.pinshuai.com
   */
  function fromSubdomainHost(hostname) {
    const parts = hostname.split(".");
    if (parts.length < 3) return null;
    const root = parts.slice(1).join(".");
    const protocol = location.protocol;
    return {
      iamBaseUrl: protocol + "//api." + root,
      oidcIssuer: protocol + "//auth." + root + "/oidc",
      redirectUri: location.origin + "/callback.html",
      ...SHARED
    };
  }

  // NAS 局域网：iam-admin 固定走 :9446（admin 容器 Nginx 反代 /api + /oidc）
  const isLanIp = /^\d+\.\d+\.\d+\.\d+$/.test(host);
  if (isLanIp) {
    const adminOrigin = "http://" + host + ":9446";
    window.IAM_CLIENT_CONFIG = {
      iamBaseUrl: adminOrigin,
      oidcIssuer: adminOrigin + "/oidc",
      redirectUri: adminOrigin + "/callback.html",
      ...SHARED
    };
    return;
  }

  if (isLocalHost) {
    window.IAM_CLIENT_CONFIG = {
      iamBaseUrl: "http://localhost:3000",
      oidcIssuer: "http://localhost:3000/oidc",
      redirectUri:
        "http://localhost:" + (location.port || "8848") + "/callback.html",
      ...SHARED
    };
    return;
  }

  // stage（*.pinshuai.local）与 production（正式多级子域）同一套推导
  window.IAM_CLIENT_CONFIG =
    fromSubdomainHost(host) || {
      iamBaseUrl: location.origin,
      oidcIssuer: location.origin + "/oidc",
      redirectUri: location.origin + "/callback.html",
      ...SHARED
    };
})();
