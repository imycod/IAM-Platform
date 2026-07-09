/**
 * 静态兜底配置（server.js 会优先动态返回 /config.js）。
 * interaction API 必须打 IdP 源，不能打业务 api 域。
 */
(function () {
  const host = location.hostname;
  const isLocal =
    host === "localhost" || host === "127.0.0.1" || host === "::1";
  const isAuthHost =
    host === "auth.pinshuai.local" ||
    host === "login.pinshuai.local" ||
    host.startsWith("auth.");

  if (isAuthHost) {
    window.IAM_LOGIN_CONFIG = {
      apiBaseUrl: location.origin,
      oidcIssuer: location.origin + "/oidc",
      appReturnUrls: {
        "iam-admin-spa": "http://admin.pinshuai.local/",
        "flow-admin-spa": "http://flow.pinshuai.local/"
      }
    };
    return;
  }

  if (isLocal) {
    window.IAM_LOGIN_CONFIG = {
      apiBaseUrl: "http://localhost:3000",
      oidcIssuer: "http://localhost:3000/oidc",
      appReturnUrls: {
        "iam-admin-spa": "http://localhost:8088/",
        "flow-admin-spa": "http://localhost:8089/"
      }
    };
    return;
  }

  window.IAM_LOGIN_CONFIG = {
    apiBaseUrl: "http://auth.pinshuai.local",
    oidcIssuer: "http://auth.pinshuai.local/oidc",
    appReturnUrls: {
      "iam-admin-spa": "http://admin.pinshuai.local/",
      "flow-admin-spa": "http://flow.pinshuai.local/"
    }
  };
})();
