/**
 * Cookie 不区分端口：localhost / 局域网 IP 上多 SPA（如 :9445 / :9446）
 * 共用 `authorized-token` 会互相覆盖/清除。按端口隔离 cookie 名；
 * Nginx 子域模式下各 origin 天然隔离，保持默认键名。
 */
function cookieKeySuffix(): string {
  const host = location.hostname;
  const isLocalHost = host === "localhost" || host === "127.0.0.1";
  const isLanIp = /^\d+\.\d+\.\d+\.\d+$/.test(host);
  if (isLocalHost || isLanIp) {
    return `-${location.port || "80"}`;
  }
  return "";
}

export const TokenKey = `authorized-token${cookieKeySuffix()}`;
export const multipleTabsKey = `multiple-tabs${cookieKeySuffix()}`;
