import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../src/views/iam');

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith('.vue')) files.push(full);
  }
  return files;
}

function fixBrokenImports(content) {
  return content.replace(
    /(import \{ useIamCrud[\s\S]*?;\n)(\s*\n\s+(?:create|delete|get|update|assign|revoke|type ))/g,
    '$1  import {\n$2'
  );
}

function fixImportOrder(content) {
  const match = content.match(/<script lang="ts" setup>\n([\s\S]*?)\n<\/script>/);
  if (!match) return content;

  const lines = match[1].split('\n');
  const imports = [];
  const rest = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim().startsWith('import ')) {
      let block = [line];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('import ') && lines[i].trim() !== '' && !lines[i].trim().startsWith('const ') && !lines[i].trim().startsWith('function ') && !lines[i].trim().startsWith('async ')) {
        block.push(lines[i]);
        i += 1;
      }
      imports.push(block.join('\n'));
      continue;
    }
    if (line.trim() === '' && rest.length === 0 && i + 1 < lines.length && lines[i + 1].trim().startsWith('const ')) {
      i += 1;
      continue;
    }
    rest.push(line);
    i += 1;
  }

  const vue = imports.filter((s) => s.includes("from 'vue'"));
  const arco = imports.filter((s) => s.includes('@arco-design'));
  const alias = imports.filter((s) => s.includes("from '@/"));
  const relative = imports.filter((s) => s.includes('iam-crud-page.vue'));
  const ordered = [...vue, ...arco, ...alias, ...relative];

  let body = [...ordered, '', ...rest.filter((l) => l.trim() !== '' || rest.indexOf(l) > 0)].join('\n');

  if (!/\bcomputed\s*\(/.test(body)) {
    body = body
      .replace(/import \{\s*computed,\s*/g, 'import { ')
      .replace(/,\s*computed(?=,\s*)/g, '')
      .replace(/,\s*computed\s*\}/g, ' }');
  }

  return content.replace(match[0], `<script lang="ts" setup>\n${body}\n</script>`);
}

let count = 0;
for (const file of walk(root)) {
  let content = fs.readFileSync(file, 'utf8');
  const fixed = fixImportOrder(fixBrokenImports(content));
  if (fixed !== content) {
    fs.writeFileSync(file, fixed);
    count += 1;
    console.log('fixed', path.relative(root, file));
  }
}
console.log(`Done. ${count} files updated.`);
