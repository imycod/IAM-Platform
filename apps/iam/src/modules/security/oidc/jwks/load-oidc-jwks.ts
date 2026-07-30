import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { Logger } from '@nestjs/common';
import { createOidcJwks } from './generate-rsa-jwk';
import type { OidcJwks, OidcRsaPrivateJwk } from './oidc-jwks.types';

const logger = new Logger('OidcJwks');

const RSA_PRIVATE_FIELDS = ['n', 'e', 'd', 'p', 'q', 'dp', 'dq', 'qi'] as const;

function assertPrivateRsaJwk(key: unknown, index: number): asserts key is OidcRsaPrivateJwk {
  if (!key || typeof key !== 'object') {
    throw new Error(`OIDC JWKS keys[${index}] 必须是对象`);
  }
  const jwk = key as Record<string, unknown>;
  if (jwk.kty !== 'RSA') {
    throw new Error(`OIDC JWKS keys[${index}].kty 必须为 RSA（当前: ${String(jwk.kty)}）`);
  }
  for (const field of RSA_PRIVATE_FIELDS) {
    if (typeof jwk[field] !== 'string' || !jwk[field]) {
      throw new Error(
        `OIDC JWKS keys[${index}] 缺少私钥字段 ${field}（node-oidc-provider 签发 ID Token 需要完整 RSA 私钥）`,
      );
    }
  }
}

export function parseOidcJwks(raw: string, source: string): OidcJwks {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`解析 OIDC JWKS 失败（${source}）: ${String(error)}`);
  }
  if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as OidcJwks).keys)) {
    throw new Error(`OIDC JWKS（${source}）必须是 { keys: [...] } 格式`);
  }
  const jwks = parsed as OidcJwks;
  if (jwks.keys.length === 0) {
    throw new Error(`OIDC JWKS（${source}）keys 不能为空`);
  }
  jwks.keys.forEach((key, index) => assertPrivateRsaJwk(key, index));
  return {
    keys: jwks.keys.map((key) => ({
      ...key,
      kty: 'RSA',
      use: key.use ?? 'sig',
      alg: key.alg ?? 'RS256',
    })),
  };
}

function resolveJwksFilePath(filePath: string): string {
  return isAbsolute(filePath) ? filePath : resolve(process.cwd(), filePath);
}

/**
 * 显式加载 OIDC 签名 JWKS（私钥）。
 *
 * 优先级：
 * 1. OIDC_JWKS — 内联 JSON（适合密钥管理注入）
 * 2. OIDC_JWKS_FILE — 文件路径（适合手动配置 / 轮换）
 * 3. development — 若均未配置，自动生成并写入 secrets/oidc-jwks.json
 * 4. 其它环境 — 未配置则启动失败
 *
 * 轮换约定（与 oidc-provider 一致）：
 * - keys[0] 用于签名；其余密钥仅发布到 /oidc/jwks 供客户端验旧 token
 * - 先把新钥 append 到末尾并重启 → 客户端可验；再 promote 到首位并重启 → 开始签发
 */
export function loadOidcJwks(env: NodeJS.ProcessEnv = process.env): OidcJwks {
  const inline = env.OIDC_JWKS?.trim();
  if (inline) {
    const jwks = parseOidcJwks(inline, 'OIDC_JWKS');
    logger.log(`已从 OIDC_JWKS 加载 ${jwks.keys.length} 把签名密钥（当前签名 kid=${jwks.keys[0]?.kid}）`);
    return jwks;
  }

  const fileFromEnv = env.OIDC_JWKS_FILE?.trim();
  if (fileFromEnv) {
    const absolute = resolveJwksFilePath(fileFromEnv);
    if (!existsSync(absolute)) {
      throw new Error(`OIDC_JWKS_FILE 不存在: ${absolute}`);
    }
    const jwks = parseOidcJwks(readFileSync(absolute, 'utf8'), absolute);
    logger.log(
      `已从 OIDC_JWKS_FILE=${absolute} 加载 ${jwks.keys.length} 把签名密钥（当前签名 kid=${jwks.keys[0]?.kid}）`,
    );
    return jwks;
  }

  const nodeEnv = env.NODE_ENV ?? 'development';
  if (nodeEnv !== 'development' && nodeEnv !== 'test') {
    throw new Error(
      '生产环境必须显式配置 OIDC_JWKS 或 OIDC_JWKS_FILE（含 RSA 私钥 JWK Set）。可用 pnpm oidc:jwks:generate 生成。',
    );
  }

  const defaultPath = resolveJwksFilePath(env.OIDC_JWKS_DEV_FILE?.trim() || 'secrets/oidc-jwks.json');
  if (existsSync(defaultPath)) {
    const jwks = parseOidcJwks(readFileSync(defaultPath, 'utf8'), defaultPath);
    logger.warn(
      `未配置 OIDC_JWKS/OIDC_JWKS_FILE，使用开发文件 ${defaultPath}（签名 kid=${jwks.keys[0]?.kid}）`,
    );
    return jwks;
  }

  const jwks = createOidcJwks({ keyCount: 1 });
  mkdirSync(dirname(defaultPath), { recursive: true });
  writeFileSync(defaultPath, `${JSON.stringify(jwks, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  logger.warn(
    `未配置 OIDC JWKS，已自动生成开发密钥并写入 ${defaultPath}（签名 kid=${jwks.keys[0]?.kid}）。生产请改用手动配置。`,
  );
  return jwks;
}
