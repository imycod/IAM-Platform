const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const stagedModules = path.join(root, 'dist', 'modules');
const appModules = path.join(root, 'dist', 'apps', 'iam', 'modules');

if (!fs.existsSync(stagedModules)) {
  process.exit(0);
}

fs.mkdirSync(path.dirname(appModules), { recursive: true });
fs.cpSync(stagedModules, appModules, { recursive: true });
fs.rmSync(stagedModules, { recursive: true, force: true });
