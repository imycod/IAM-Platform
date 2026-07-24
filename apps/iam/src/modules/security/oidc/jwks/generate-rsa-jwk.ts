import { createHash, generateKeyPairSync, randomUUID } from 'node:crypto';
import type { OidcJwks, OidcRsaPrivateJwk } from './oidc-jwks.types';

/** 与 node-oidc-provider 一致：kid = base64url(sha256(canonical public components)) */
export function calculateRsaKid(jwk: Pick<OidcRsaPrivateJwk, 'kty' | 'n' | 'e'>): string {
  const components = { e: jwk.e, kty: 'RSA', n: jwk.n };
  return createHash('sha256')
    .update(JSON.stringify(components))
    .digest('base64url');
}

/** 生成一把可用于 oidc-provider 签名的 RSA 私钥 JWK（含 p/q/dp/dq/qi）。 */
export function generateRsaSigningJwk(modulusLength = 2048): OidcRsaPrivateJwk {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength,
    publicExponent: 0x10001,
  });
  const exported = privateKey.export({ format: 'jwk' }) as Omit<OidcRsaPrivateJwk, 'use' | 'alg' | 'kid'>;
  const jwk: OidcRsaPrivateJwk = {
    ...exported,
    kty: 'RSA',
    use: 'sig',
    alg: 'RS256',
  };
  jwk.kid = calculateRsaKid(jwk);
  return jwk;
}

export function createOidcJwks(options?: { keyCount?: number; modulusLength?: number }): OidcJwks {
  const keyCount = Math.max(1, options?.keyCount ?? 1);
  const keys = Array.from({ length: keyCount }, () =>
    generateRsaSigningJwk(options?.modulusLength ?? 2048),
  );
  return { keys };
}

/**
 * 轮换：在 JWKS 末尾追加一把新私钥。
 * 部署顺序（与 oidc-provider 文档一致）：
 * 1) 先 append 并 reload（新钥可验、尚未签发）
 * 2) 再把新钥挪到 keys[0] 并 reload（新钥开始签发）
 */
export function appendRotationKey(jwks: OidcJwks, modulusLength = 2048): OidcJwks {
  return {
    keys: [...jwks.keys, generateRsaSigningJwk(modulusLength)],
  };
}

/** 把指定 kid（或末尾一把）移到首位，作为当前签名密钥。 */
export function promoteSigningKey(jwks: OidcJwks, kid?: string): OidcJwks {
  if (jwks.keys.length === 0) {
    throw new Error('JWKS 为空，无法提升签名密钥');
  }
  const targetKid = kid ?? jwks.keys[jwks.keys.length - 1]?.kid;
  const idx = jwks.keys.findIndex((k) => k.kid === targetKid);
  if (idx < 0) {
    throw new Error(`JWKS 中找不到 kid=${targetKid}`);
  }
  if (idx === 0) {
    return { keys: [...jwks.keys] };
  }
  const next = [...jwks.keys];
  const [moved] = next.splice(idx, 1);
  next.unshift(moved);
  return { keys: next };
}

/** 去掉私钥材料，仅保留可公开的验签 JWK（供文档/调试；线上仍走 /oidc/jwks）。 */
export function toPublicJwks(jwks: OidcJwks): { keys: Record<string, unknown>[] } {
  return {
    keys: jwks.keys.map((k) => ({
      kty: k.kty,
      use: k.use ?? 'sig',
      alg: k.alg ?? 'RS256',
      kid: k.kid ?? calculateRsaKid(k),
      n: k.n,
      e: k.e,
    })),
  };
}

/** 生成不落库的调试标记，避免误把 DEV 密钥当生产。 */
export function jwksFingerprint(jwks: OidcJwks): string {
  const kids = jwks.keys.map((k) => k.kid ?? calculateRsaKid(k)).join(',');
  return createHash('sha256').update(kids || randomUUID()).digest('hex').slice(0, 12);
}
