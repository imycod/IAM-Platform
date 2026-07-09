/**
 * localhost 开发时 cookie 不区分端口，多 SPA 共用 `authorized-token` 会互相覆盖/清除。
 * 按端口隔离 cookie 名；Nginx 子域模式下各 origin 天然隔离，保持默认键名。
 */
function cookieKeySuffix(): string {
  const host = location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return `-${location.port || "80"}`;
  }
  return "";
}

export const TokenKey = `authorized-token${cookieKeySuffix()}`;
export const multipleTabsKey = `multiple-tabs${cookieKeySuffix()}`;
