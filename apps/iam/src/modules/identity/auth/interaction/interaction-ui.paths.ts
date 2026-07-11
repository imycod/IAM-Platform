import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  isDevelopmentEnv,
  resolveAppPath,
  resolveAppPathFrom,
  resolveAppSrcPath,
  resolveDistAppPath,
  resolveDistRootFrom,
  resolveFirstExisting,
} from '@app/common';

const APP_NAME = process.env.APP_NAME ?? 'iam';
const UI_SEGMENTS = ['assets', 'interaction'] as const;
const MARKER_FILE = 'login.html';

/** OIDC interaction 登录/consent 静态 UI 根目录（dev / prod 均可解析）。 */
export function resolveInteractionUiDir(): string {
  const fromEnv = process.env.IAM_INTERACTION_UI_DIR?.trim();

  if (fromEnv && existsSync(join(fromEnv, MARKER_FILE))) {
    return fromEnv;
  }

  const fallback = resolveAppPath(APP_NAME, __dirname, ...UI_SEGMENTS);
  const distRoot = resolveDistRootFrom(__dirname);
  const candidates = isDevelopmentEnv()
    ? [
        resolveAppSrcPath(APP_NAME, ...UI_SEGMENTS),
        resolveDistAppPath(APP_NAME, 'src', ...UI_SEGMENTS),
        resolveDistAppPath(APP_NAME, ...UI_SEGMENTS),
      ]
    : [
        // Nest build 将 assets 复制到 dist/apps/iam/src/assets/interaction
        join(distRoot, 'apps', APP_NAME, 'src', ...UI_SEGMENTS),
        resolveAppPathFrom(APP_NAME, __dirname, ...UI_SEGMENTS),
        join(distRoot, ...UI_SEGMENTS),
      ];

  return resolveFirstExisting(MARKER_FILE, candidates, fallback);
}
