const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const stagedAssets = path.join(root, 'dist', 'assets');
const appAssets = path.join(root, 'dist', 'apps', 'iam', 'assets');

if (!fs.existsSync(stagedAssets)) {
  process.exit(0);
}

fs.mkdirSync(path.dirname(appAssets), { recursive: true });
fs.cpSync(stagedAssets, appAssets, { recursive: true });
fs.rmSync(stagedAssets, { recursive: true, force: true });
