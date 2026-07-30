/**
 * 浏览器端 JWKS：按 kid 验签 id_token，未知 kid 时强制刷新（密钥轮换）。
 * 挂到 window.IamClientOidcJwks，供 callback / oidc.js 使用。
 */
(function (global) {
  const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000;
  const cacheByIssuer = Object.create(null);

  function base64UrlToUint8Array(input) {
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

  function decodeJwtPart(part) {
    return JSON.parse(new TextDecoder().decode(base64UrlToUint8Array(part)));
  }

  function jwksUri(issuer) {
    return issuer.replace(/\/$/, '') + '/jwks';
  }

  async function fetchJwks(issuer) {
    const res = await fetch(jwksUri(issuer), {
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });
    if (!res.ok) {
      throw new Error('拉取 JWKS 失败: HTTP ' + res.status);
    }
    const json = await res.json();
    if (!json || !Array.isArray(json.keys)) {
      throw new Error('JWKS 响应格式无效');
    }
    return json;
  }

  async function getJwks(issuer, forceRefresh) {
    const cached = cacheByIssuer[issuer];
    if (
      !forceRefresh &&
      cached &&
      Date.now() - cached.fetchedAt < DEFAULT_CACHE_TTL_MS
    ) {
      return cached.jwks;
    }
    const jwks = await fetchJwks(issuer);
    cacheByIssuer[issuer] = { jwks: jwks, fetchedAt: Date.now() };
    return jwks;
  }

  function findKey(jwks, kid) {
    if (kid) {
      return jwks.keys.find(function (k) {
        return k.kid === kid;
      });
    }
    return jwks.keys.length === 1 ? jwks.keys[0] : undefined;
  }

  async function importRsaVerifyKey(jwk) {
    if (jwk.kty !== 'RSA' || !jwk.n || !jwk.e) {
      throw new Error('JWKS 条目不是可用的 RSA 公钥');
    }
    return crypto.subtle.importKey(
      'jwk',
      {
        kty: 'RSA',
        n: jwk.n,
        e: jwk.e,
        alg: jwk.alg || 'RS256',
        ext: true,
        key_ops: ['verify']
      },
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );
  }

  async function verifyIdToken(idToken, cfg, options) {
    options = options || {};
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      throw new Error('id_token 不是合法 JWT');
    }
    const header = decodeJwtPart(parts[0]);
    const payload = decodeJwtPart(parts[1]);
    if (header.alg !== 'RS256') {
      throw new Error('不支持的 id_token alg: ' + header.alg);
    }

    const kid = typeof header.kid === 'string' ? header.kid : undefined;
    let jwks = await getJwks(cfg.oidcIssuer, false);
    let jwk = findKey(jwks, kid);
    if (!jwk) {
      jwks = await getJwks(cfg.oidcIssuer, true);
      jwk = findKey(jwks, kid);
    }
    if (!jwk) {
      throw new Error(
        kid
          ? 'JWKS 中找不到 kid=' + kid + '（可能尚未完成密钥轮换发布）'
          : 'JWKS 无法匹配签名密钥'
      );
    }
    const key = await importRsaVerifyKey(jwk);
    const data = new TextEncoder().encode(parts[0] + '.' + parts[1]);
    const signature = base64UrlToUint8Array(parts[2]);
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
      throw new Error('id_token iss 不匹配: ' + payload.iss);
    }

    const audience = options.audience || cfg.clientId;
    const audList = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    const expected = Array.isArray(audience) ? audience : [audience];
    const audOk = expected.some(function (a) {
      return audList.indexOf(a) >= 0;
    });
    if (!audOk) {
      throw new Error('id_token aud 不匹配: ' + JSON.stringify(payload.aud));
    }

    const now = Math.floor(Date.now() / 1000);
    const skew = options.clockToleranceSec != null ? options.clockToleranceSec : 60;
    if (typeof payload.exp === 'number' && now > payload.exp + skew) {
      throw new Error('id_token 已过期');
    }
    if (typeof payload.nbf === 'number' && now + skew < payload.nbf) {
      throw new Error('id_token 尚未生效');
    }

    return { header: header, payload: payload };
  }

  global.IamClientOidcJwks = {
    getJwks: getJwks,
    verifyIdToken: verifyIdToken,
    clearCache: function (issuer) {
      if (issuer) {
        delete cacheByIssuer[issuer];
      } else {
        Object.keys(cacheByIssuer).forEach(function (k) {
          delete cacheByIssuer[k];
        });
      }
    }
  };
})(window);
