/**
 * Nginx 子域模式下一键启动：IAM(backend nginx env) + iam-login + iam-admin
 * 用法：pnpm dev:nginx
 */
const { spawn } = require('child_process');
const path = require('path');

const root = __dirname;
const adminDir = path.join(root, 'apps', 'iam-admin');

const children = [];

function start(label, command, args, cwd, extraEnv = {}) {
  console.log(`[${label}] starting...`);

  const child = spawn(command, args, {
    cwd,
    shell: true,
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
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
  console.log('\n=== Nginx 子域模式 (admin/login/api/flow.iam.local) ===');
  console.log('请确认 hosts 已配置且 docker nginx 已启动：');
  console.log('  docker compose -f deploy/docker-compose.nginx.yaml up -d\n');

  start('iam-backend', 'pnpm', ['run', 'start:dev:nginx'], root);
  await sleep(4000);

  start('iam-login', 'pnpm', ['run', 'iam-login:dev'], root, {
    IAM_LOGIN_PORT: process.env.IAM_LOGIN_PORT || '5180',
    IAM_LOGIN_HOST: process.env.IAM_LOGIN_HOST || '127.0.0.1',
  });
  await sleep(2000);

  start('iam-admin', 'pnpm', ['run', 'dev'], adminDir);

  console.log('\n访问 http://admin.iam.local （未登录应跳转 http://login.iam.local）');
  console.log('Press Ctrl+C to stop.\n');
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

main().catch((err) => {
  console.error(err);
  shutdown();
  process.exit(1);
});
