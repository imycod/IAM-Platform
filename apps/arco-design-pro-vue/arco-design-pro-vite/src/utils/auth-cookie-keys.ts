/** localhost 多 SPA 共用 cookie 时按端口隔离 */
function cookieKeySuffix(): string {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return `-${window.location.port || '80'}`;
  }
  return '';
}

export const TokenKey = `authorized-token${cookieKeySuffix()}`;
export const multipleTabsKey = `multiple-tabs${cookieKeySuffix()}`;
