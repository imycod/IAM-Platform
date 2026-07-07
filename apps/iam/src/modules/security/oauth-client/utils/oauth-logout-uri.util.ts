/** 从 redirect_uris 推导 RP-Initiated Logout / Front-Channel Logout 地址 */

function collectOrigins(redirectUris: string[]): string[] {
  const origins = new Set<string>();
  for (const uri of redirectUris) {
    try {
      origins.add(new URL(uri).origin);
    } catch {
      // ignore invalid URI
    }
  }
  return [...origins];
}

/** 各 origin 的 post_logout_redirect_uri（logout.html 落地页） */
export function postLogoutRedirectUris(redirectUris: string[]): string[] {
  return collectOrigins(redirectUris).map((origin) => `${origin}/logout.html`);
}

/** 单客户端 front-channel logout 页（优先 nginx 子域） */
export function frontchannelLogoutUri(redirectUris: string[]): string | undefined {
  const origins = collectOrigins(redirectUris);
  if (!origins.length) {
    return undefined;
  }
  const nginx = origins.find((o) => o.includes('.pinshuai.local'));
  const primary = nginx ?? origins[0];
  return `${primary}/frontchannel-logout.html`;
}
