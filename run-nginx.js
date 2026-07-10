/**
 * Nginx 子域模式下一键启动：IAM(backend nginx env) + iam-login + iam-admin
 * 用法：pnpm dev:nginx
 */
const { spawn } = require('child_process');
const path = require('path');

const root = __dirname;
const adminDir = path.join(root, 'apps', 'iam-admin');

const children = [];

const NO_PROXY_HOSTS =
  'localhost,127.0.0.1,*.pinshuai.local,pinshuai.local';

function mergeEnv(extraEnv = {}) {
  const base = { ...process.env, ...extraEnv };
  const existing = base.NO_PROXY || base.no_proxy || '';
  const merged = [...new Set([...existing.split(','), ...NO_PROXY_HOSTS.split(',')])]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(',');
  return { ...base, NO_PROXY: merged, no_proxy: merged };
}

function start(label, command, args, cwd, extraEnv = {}) {
  console.log(`[${label}] starting...`);

  const child = spawn(command, args, {
    cwd,
    shell: true,
    stdio: 'inherit',
    env: mergeEnv(extraEnv),
  });

  child.on('error', (err) => {
    console.error(`[${label}] failed: ${err.message}`);
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      console.log(`[${label}] stopped (${signal})`);
    } else {
      console.log(`[${label}] exited (code ${code ?? 'unknown'})`);
    }
  });

  children.push({ label, child });
  return child;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shutdown() {
  if (children.length === 0) {
    process.exit(0);
    return;
  }

  console.log('\nStopping all services...');
  for (const { label, child } of children) {
    if (!child.killed) {
      console.log(`[${label}] stopping...`);
      child.kill();
    }
  }
}

async function main() {
  console.log('\n=== Nginx 子域模式 (auth/api/admin/flow.pinshuai.local) ===');
  console.log('请确认 hosts 已配置（含 auth.pinshuai.local）且 docker nginx 已启动：');
  console.log('  docker compose -f deploy/docker-compose.nginx.yaml up -d');
  console.log('\n若 localhost 正常但 *.pinshuai.local 502：请将 *.pinshuai.local 加入代理绕过（Clash DIRECT）\n');

  // 登录/consent UI 由 IAM 后端在 auth.pinshuai.local 同源渲染，无需再单独起 :4180 静态服务。
  start('iam-backend', 'pnpm', ['run', 'start:dev:nginx'], root);
  await sleep(4000);

  start('iam-admin', 'pnpm', ['run', 'dev'], adminDir);

  console.log('\n访问 http://admin.pinshuai.local （未登录应跳转 http://auth.pinshuai.local 的统一登录页）');
  console.log('Press Ctrl+C to stop.\n');
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

main().catch((err) => {
  console.error(err);
  shutdown();
  process.exit(1);
});
