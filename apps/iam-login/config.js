/** iam-login 统一登录页（按 hostname 自动切换 localhost / Nginx 子域） */
(function () {
  const nginx = location.hostname.endsWith(".pinshuai.local");
  window.IAM_LOGIN_CONFIG = nginx
    ? {
        apiBaseUrl: "http://api.pinshuai.local",
        oidcIssuer: "http://api.pinshuai.local/oidc",
        appReturnUrls: {
          "iam-admin-spa": "http://admin.pinshuai.local/",
          "flow-admin-spa": "http://flow.pinshuai.local/"
        }
      }
    : {
        apiBaseUrl: "http://localhost:3000",
        oidcIssuer: "http://localhost:3000/oidc",
        appReturnUrls: {
          "iam-admin-spa": "http://localhost:8848/",
          "flow-admin-spa": "http://localhost:8849/"
        }
      };
})();
