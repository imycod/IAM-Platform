/**
 * iam-login 静态文件服务（零依赖），默认 http://localhost:4180
 *
 * 配置来源（优先级从高到低）：
 * 1. 进程环境变量
 * 2. 仓库根目录 .env / .env.${NODE_ENV}
 * 3. 按 hostname 推断（auth.* → 同源）
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PLATFORM_ROOT = path.resolve(ROOT, '../..');

const nodeEnv = process.env.NODE_ENV || 'development';
// 与 Nest ConfigModule 一致：先 .env，再 .env.${NODE_ENV} 覆盖；不覆盖 shell 预置变量
const fromFile = new Set();
function loadEnvFileTracked(filePath, override) {
  if (!fs.existsSync(filePath)) {
    return;
  }
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!override) {
      if (process.env[key] !== undefined) {
        continue;
      }
      process.env[key] = value;
      fromFile.add(key);
      continue;
    }
    // override：可覆盖来自 .env 的值，但不覆盖 shell 预置且不在 fromFile 中的值
    if (process.env[key] !== undefined && !fromFile.has(key)) {
      continue;
    }
    process.env[key] = value;
    fromFile.add(key);
  }
}

loadEnvFileTracked(path.join(PLATFORM_ROOT, '.env'), false);
loadEnvFileTracked(path.join(PLATFORM_ROOT, `.env.${nodeEnv}`), true);
const PORT = Number(process.env.IAM_LOGIN_PORT || 4180);

function parseAppReturnUrls() {
  const raw = process.env.APP_RETURN_URLS;
  if (!raw) {
    return {
      'iam-admin-spa': 'http://localhost:8088/',
      'flow-admin-spa': 'http://localhost:8089/',
    };
  }
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function buildRuntimeConfig(reqHost) {
  const host = (reqHost || '').split(':')[0].toLowerCase();
  const isLocal =
    host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';
  const isAuthHost =
    host === 'auth.pinshuai.local' ||
    host === 'login.pinshuai.local' ||
    host.startsWith('auth.');

  const appReturnUrls = parseAppReturnUrls();

  // interaction / SSO cookie 必须打 IdP 源，绝不能打业务 api 域。
  // - auth.*：同源（nginx 正确用法）
  // - localhost：始终本机 :3000（即使 NODE_ENV=nginx，直连 4180 也不能用 api.pinshuai.local）
  if (isAuthHost) {
    const origin = `http://${host}`;
    return {
      apiBaseUrl: origin,
      oidcIssuer: process.env.OIDC_ISSUER || `${origin}/oidc`,
      appReturnUrls,
    };
  }

  if (isLocal) {
    return {
      apiBaseUrl: 'http://localhost:3000',
      oidcIssuer: 'http://localhost:3000/oidc',
      appReturnUrls: {
        'iam-admin-spa': 'http://localhost:8088/',
        'flow-admin-spa': 'http://localhost:8089/',
        ...appReturnUrls,
      },
    };
  }

  // 其它 host：优先 OIDC_ISSUER 的 origin
  try {
    const issuer = process.env.OIDC_ISSUER;
    if (issuer) {
      const origin = new URL(issuer).origin;
      return {
        apiBaseUrl: origin,
        oidcIssuer: issuer,
        appReturnUrls,
      };
    }
  } catch {
    // ignore
  }

  return {
    apiBaseUrl: 'http://localhost:3000',
    oidcIssuer: 'http://localhost:3000/oidc',
    appReturnUrls,
  };
}

function renderConfigJs(reqHost) {
  const cfg = buildRuntimeConfig(reqHost);
  return `/** iam-login runtime config (from .env / request host) */\nwindow.IAM_LOGIN_CONFIG = ${JSON.stringify(cfg, null, 2)};\n`;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  let urlPath = req.url?.split('?')[0] || '/';
  if (urlPath === '/') {
    urlPath = '/index.html';
  }

  // 动态配置：避免前端写死 URL
  if (urlPath === '/config.js') {
    const body = renderConfigJs(req.headers.host);
    res.writeHead(200, {
      'Content-Type': 'text/javascript; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(body);
    return;
  }

  const filePath = path.join(ROOT, path.normalize(urlPath).replace(/^(\.\.[/\\])+/, ''));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(err.code === 'ENOENT' ? 404 : 500);
      res.end(err.code === 'ENOENT' ? 'Not Found' : 'Error');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`iam-login: http://localhost:${PORT}`);
  // eslint-disable-next-line no-console
  console.log(
    `  OIDC_ISSUER=${process.env.OIDC_ISSUER || '(default)'}, APP_URL=${process.env.APP_URL || '(default)'}`,
  );
});
