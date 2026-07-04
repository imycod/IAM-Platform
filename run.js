const { spawn } = require('child_process');
const path = require('path');

const root = __dirname;
const adminDir = path.join(root, 'apps', 'iam-admin');

const children = [];

function start(label, command, args, cwd) {
  console.log(`[${label}] starting...`);

  const child = spawn(command, args, {
    cwd,
    shell: true,
    stdio: 'inherit',
    env: process.env,
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
  start('iam-backend', 'pnpm', ['run', 'start:dev:nginx'], root);
  await sleep(3000);

  start('iam-login', 'pnpm', ['run', 'iam-login:dev'], root);
  await sleep(2000);

  start('iam-admin', 'pnpm', ['run', 'dev'], adminDir);

  console.log('\nAll services started. Press Ctrl+C to stop.\n');
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

main().catch((err) => {
  console.error(err);
  shutdown();
  process.exit(1);
});
