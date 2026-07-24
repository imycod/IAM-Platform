/**
 * OIDC 客户端：从授权服务器 /jwks 拉取公钥，按 JWT header.kid 验签。
 * 密钥轮换时旧 kid 仍在 JWKS 中即可继续验；未知 kid 会强制刷新缓存。
 */
import type { IamClientConfig } from './oidc';
import { IAM_CLIENT_CONFIG } from './oidc';

export type OidcPublicJwk = {
  kty: string;
  use?: string;
  alg?: string;
  kid?: string;
  n?: string;
  e?: string;
};

export type OidcPublicJwks = {
  keys: OidcPublicJwk[];
};

export type VerifiedIdToken = {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
};

type JwksCache = {
  jwks: OidcPublicJwks;
  fetchedAt: number;
};

const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000;
const jwksCacheByIssuer = new Map<string, JwksCache>();

function base64UrlToUint8Array(input: string): Uint8Array {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (padded.length % 4)) % 4;
  const base64 = padded + '='.repeat(padLength);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function decodeJwtPart(part: string): Record<string, unknown> {
  const json = new TextDecoder().decode(base64UrlToUint8Array(part));
  return JSON.parse(json) as Record<string, unknown>;
}

function jwksUri(issuer: string): string {
  return `${issuer.replace(/\/$/, '')}/jwks`;
}

async function fetchJwks(issuer: string): Promise<OidcPublicJwks> {
  const res = await fetch(jwksUri(issuer), {
    headers: { Accept: 'application/json' },
    cache: 'no-store'
  });
  if (!res.ok) {
    throw new Error(`拉取 JWKS 失败: HTTP ${res.status} (${jwksUri(issuer)})`);
  }
  const json = (await res.json()) as OidcPublicJwks;
  if (!json?.keys || !Array.isArray(json.keys)) {
    throw new Error('JWKS 响应格式无效');
  }
  return json;
}

/** 获取 JWKS（带 TTL 缓存）；forceRefresh 用于未知 kid 时的密钥轮换。 */
export async function getOidcJwks(
  issuer: string,
  options?: { forceRefresh?: boolean; cacheTtlMs?: number }
): Promise<OidcPublicJwks> {
  const ttl = options?.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  const cached = jwksCacheByIssuer.get(issuer);
  if (
    !options?.forceRefresh &&
    cached &&
    Date.now() - cached.fetchedAt < ttl
  ) {
    return cached.jwks;
  }
  const jwks = await fetchJwks(issuer);
  jwksCacheByIssuer.set(issuer, { jwks, fetchedAt: Date.now() });
  return jwks;
}

export function clearOidcJwksCache(issuer?: string): void {
  if (issuer) {
    jwksCacheByIssuer.delete(issuer);
    return;
  }
  jwksCacheByIssuer.clear();
}

function findKey(
  jwks: OidcPublicJwks,
  kid: string | undefined
): OidcPublicJwk | undefined {
  if (kid) {
    return jwks.keys.find(k => k.kid === kid);
  }
  // 无 kid 时仅当 JWKS 只有一把 RSA 公钥才可接受
  return jwks.keys.length === 1 ? jwks.keys[0] : undefined;
}

async function importRsaVerifyKey(jwk: OidcPublicJwk): Promise<CryptoKey> {
  if (jwk.kty !== 'RSA' || !jwk.n || !jwk.e) {
    throw new Error('JWKS 条目不是可用的 RSA 公钥');
  }
  return crypto.subtle.importKey(
    'jwk',
    {
      kty: 'RSA',
      n: jwk.n,
      e: jwk.e,
      alg: jwk.alg ?? 'RS256',
      ext: true,
      key_ops: ['verify']
    },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
}

/**
 * 用授权服务器 JWKS 验签 id_token（RS256）。
 * 若 header.kid 在缓存中找不到，会强制刷新 JWKS 再试一次（支持手动密钥轮换）。
 */
export async function verifyOidcIdToken(
  idToken: string,
  options?: {
    cfg?: IamClientConfig;
    audience?: string | string[];
    clockToleranceSec?: number;
  }
): Promise<VerifiedIdToken> {
  const cfg = options?.cfg ?? IAM_CLIENT_CONFIG;
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('id_token 不是合法 JWT');
  }
  const [headerB64, payloadB64, signatureB64] = parts;
  const header = decodeJwtPart(headerB64);
  const payload = decodeJwtPart(payloadB64);

  if (header.alg !== 'RS256') {
    throw new Error(`不支持的 id_token alg: ${String(header.alg)}`);
  }

  const kid = typeof header.kid === 'string' ? header.kid : undefined;
  let jwks = await getOidcJwks(cfg.oidcIssuer);
  let jwk = findKey(jwks, kid);
  if (!jwk) {
    jwks = await getOidcJwks(cfg.oidcIssuer, { forceRefresh: true });
    jwk = findKey(jwks, kid);
  }
  if (!jwk) {
    throw new Error(
      kid
        ? `JWKS 中找不到 kid=${kid}（可能尚未完成密钥轮换发布）`
        : 'JWKS 无法匹配签名密钥'
    );
  }

  const key = await importRsaVerifyKey(jwk);
  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = base64UrlToUint8Array(signatureB64);
  const ok = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    signature,
    data
  );
  if (!ok) {
    throw new Error('id_token 签名校验失败');
  }

  const issuer = cfg.oidcIssuer.replace(/\/$/, '');
  if (payload.iss !== issuer) {
    throw new Error(`id_token iss 不匹配: ${String(payload.iss)}`);
  }

  const audience = options?.audience ?? cfg.clientId;
  const aud = payload.aud;
  const audList = Array.isArray(aud) ? aud : [aud];
  const expected = Array.isArray(audience) ? audience : [audience];
  if (!expected.some(a => audList.includes(a))) {
    throw new Error(`id_token aud 不匹配: ${JSON.stringify(aud)}`);
  }

  const now = Math.floor(Date.now() / 1000);
  const skew = options?.clockToleranceSec ?? 60;
  if (typeof payload.exp === 'number' && now > payload.exp + skew) {
    throw new Error('id_token 已过期');
  }
  if (typeof payload.nbf === 'number' && now + skew < payload.nbf) {
    throw new Error('id_token 尚未生效');
  }

  return { header, payload };
}
