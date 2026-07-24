#!/usr/bin/env node
/**
 * 手动生成 / 轮换 OIDC RSA JWKS（私钥）。
 *
 * 用法：
 *   node scripts/generate-oidc-jwks.js                  # 生成新 JWKS 到 secrets/oidc-jwks.json
 *   node scripts/generate-oidc-jwks.js --out path.json  # 指定输出
 *   node scripts/generate-oidc-jwks.js --rotate         # 在现有 JWKS 末尾追加新钥（轮换步骤 1）
 *   node scripts/generate-oidc-jwks.js --promote        # 把末尾新钥提到首位（轮换步骤 2）
 *   node scripts/generate-oidc-jwks.js --promote --kid xxx
 *   node scripts/generate-oidc-jwks.js --public         # 打印公钥 JWKS（不含 d）
 *
 * 轮换推荐顺序：
 *   1. --rotate 后滚动重启（新钥出现在 /oidc/jwks，尚未签发）
 *   2. --promote 后再滚动重启（新钥开始签发 ID Token）
 *   3. 旧钥可在 access/id token TTL 过期后从 JWKS 删除
 */
const { createHash, generateKeyPairSync, randomUUID } = require('node:crypto');
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const { dirname, isAbsolute, resolve } = require('node:path');

function calculateRsaKid(jwk) {
  return createHash('sha256')
    .update(JSON.stringify({ e: jwk.e, kty: 'RSA', n: jwk.n }))
    .digest('base64url');
}

function generateRsaSigningJwk(modulusLength = 2048) {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength,
    publicExponent: 0x10001,
  });
  const exported = privateKey.export({ format: 'jwk' });
  const jwk = {
    ...exported,
    kty: 'RSA',
    use: 'sig',
    alg: 'RS256',
  };
  jwk.kid = calculateRsaKid(jwk);
  return jwk;
}

function parseArgs(argv) {
  const out = {
    out: 'secrets/oidc-jwks.json',
    rotate: false,
    promote: false,
    publicOnly: false,
    kid: undefined,
    modulusLength: 2048,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--rotate') out.rotate = true;
    else if (arg === '--promote') out.promote = true;
    else if (arg === '--public') out.publicOnly = true;
    else if (arg === '--out') out.out = argv[++i];
    else if (arg.startsWith('--out=')) out.out = arg.slice('--out='.length);
    else if (arg === '--kid') out.kid = argv[++i];
    else if (arg.startsWith('--kid=')) out.kid = arg.slice('--kid='.length);
    else if (arg === '--bits') out.modulusLength = Number(argv[++i]);
    else if (arg.startsWith('--bits=')) out.modulusLength = Number(arg.slice('--bits='.length));
    else if (arg === '--help' || arg === '-h') {
      console.log(`Usage: node scripts/generate-oidc-jwks.js [--out file] [--rotate|--promote] [--kid id] [--public]`);
      process.exit(0);
    } else {
      console.error(`Unknown arg: ${arg}`);
      process.exit(1);
    }
  }
  return out;
}

function resolvePath(filePath) {
  return isAbsolute(filePath) ? filePath : resolve(process.cwd(), filePath);
}

function readJwks(filePath) {
  const raw = JSON.parse(readFileSync(filePath, 'utf8'));
  if (!raw || !Array.isArray(raw.keys)) {
    throw new Error(`Invalid JWKS file: ${filePath}`);
  }
  return raw;
}

function toPublic(jwks) {
  return {
    keys: jwks.keys.map((k) => ({
      kty: k.kty,
      use: k.use || 'sig',
      alg: k.alg || 'RS256',
      kid: k.kid || calculateRsaKid(k),
      n: k.n,
      e: k.e,
    })),
  };
}

function main() {
  const args = parseArgs(process.argv);
  const filePath = resolvePath(args.out);

  let jwks;
  if (args.rotate || args.promote || args.publicOnly) {
    if (!existsSync(filePath)) {
      console.error(`JWKS file not found: ${filePath}`);
      process.exit(1);
    }
    jwks = readJwks(filePath);
  }

  if (args.publicOnly) {
    console.log(JSON.stringify(toPublic(jwks), null, 2));
    return;
  }

  if (args.rotate) {
    const nextKey = generateRsaSigningJwk(args.modulusLength);
    jwks = { keys: [...jwks.keys, nextKey] };
    console.log(`Appended rotation key kid=${nextKey.kid} (still at end; promote after reload)`);
  } else if (args.promote) {
    const targetKid = args.kid || jwks.keys[jwks.keys.length - 1]?.kid;
    const idx = jwks.keys.findIndex((k) => k.kid === targetKid);
    if (idx < 0) {
      console.error(`kid not found: ${targetKid}`);
      process.exit(1);
    }
    if (idx > 0) {
      const next = [...jwks.keys];
      const [moved] = next.splice(idx, 1);
      next.unshift(moved);
      jwks = { keys: next };
    }
    console.log(`Signing key is now kid=${jwks.keys[0].kid}`);
  } else {
    jwks = { keys: [generateRsaSigningJwk(args.modulusLength)] };
    console.log(`Generated new JWKS with signing kid=${jwks.keys[0].kid}`);
  }

  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(jwks, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  console.log(`Wrote ${filePath}`);
  console.log(`Public JWKS preview:\n${JSON.stringify(toPublic(jwks), null, 2)}`);
  console.log(`Set OIDC_JWKS_FILE=${filePath.replace(/\\/g, '/')} (or paste into OIDC_JWKS)`);
}

main();
