import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** 是否为本地开发环境（development）。 */
export function isDevelopmentEnv(): boolean {
  return process.env.NODE_ENV === 'development';
}

/** 向上查找满足条件的祖先目录。 */
export function findAncestorDir(
  fromDir: string,
  predicate: (dir: string, normalized: string) => boolean,
): string | null {
  let current = fromDir;
  while (true) {
    const normalized = current.replace(/\\/g, '/');
    if (predicate(current, normalized)) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return null;
}

/** 源码树：{cwd}/apps/{appName}/src/... */
export function resolveAppSrcPath(appName: string, ...segments: string[]): string {
  return join(process.cwd(), 'apps', appName, 'src', ...segments);
}

/** 构建产物：{cwd}/dist/apps/{appName}/... */
export function resolveDistAppPath(appName: string, ...segments: string[]): string {
  return join(process.cwd(), 'dist', 'apps', appName, ...segments);
}

/**
 * 从已编译模块目录定位 dist/apps/{appName}，再拼接子路径。
 * 适用于 production / nginx 等非 development 环境。
 */
export function resolveAppPathFrom(
  appName: string,
  fromModuleDir: string,
  ...segments: string[]
): string {
  const appDir =
    findAncestorDir(fromModuleDir, (_dir, normalized) =>
      normalized.endsWith(`/apps/${appName}`),
    ) ?? resolveDistAppPath(appName);
  return join(appDir, ...segments);
}

/** 从已编译模块目录定位 dist 根目录。 */
export function resolveDistRootFrom(fromModuleDir: string): string {
  return (
    findAncestorDir(fromModuleDir, (_dir, normalized) => normalized.endsWith('/dist')) ??
    join(process.cwd(), 'dist')
  );
}

/**
 * 按环境解析 app 路径：
 * - development：`apps/{appName}/src/...`（基于 cwd）
 * - 其它：从 fromModuleDir 定位 `dist/apps/{appName}/...`
 */
export function resolveAppPath(
  appName: string,
  fromModuleDir: string,
  ...segments: string[]
): string {
  return isDevelopmentEnv()
    ? resolveAppSrcPath(appName, ...segments)
    : resolveAppPathFrom(appName, fromModuleDir, ...segments);
}

/** 在候选目录中返回首个包含 marker 文件的路径，否则返回 fallback。 */
export function resolveFirstExisting(
  marker: string,
  candidates: string[],
  fallback: string,
): string {
  for (const dir of candidates) {
    if (existsSync(join(dir, marker))) {
      return dir;
    }
  }
  return fallback;
}
