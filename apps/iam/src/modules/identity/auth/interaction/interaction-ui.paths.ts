import { existsSync } from 'node:fs';
import { join } from 'node:path';

const UI_RELATIVE = join('assets', 'interaction');

/** OIDC interaction 登录/consent 静态 UI 根目录（dev / prod 均可解析）。 */
export function resolveInteractionUiDir(): string {
  const fromEnv = process.env.IAM_INTERACTION_UI_DIR?.trim();
  if (fromEnv && existsSync(join(fromEnv, 'login.html'))) {
    return fromEnv;
  }

  const candidates = [
    join(process.cwd(), 'apps', 'iam', 'src', UI_RELATIVE),
    join(process.cwd(), 'dist', 'apps', 'iam', UI_RELATIVE),
    join(process.cwd(), 'dist', UI_RELATIVE),
  ];

  for (const dir of candidates) {
    if (existsSync(join(dir, 'login.html'))) {
      return dir;
    }
  }

  return join(process.cwd(), 'apps', 'iam', 'src', UI_RELATIVE);
}
