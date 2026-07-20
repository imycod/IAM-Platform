/**
 * 在 CommonJS 运行时里加载 ESM-only 的包（如 better-auth、oidc-provider）。
 *
 * 直接写 `import()` 会被 tsc（module=commonjs）降级成 require()，从而无法加载纯 ESM 包。
 * 用 Function 构造器包一层，绕过 tsc 的转换，保留真正的动态 import()。
 */
const nativeDynamicImport = new Function('specifier', 'return import(specifier)') as <T = unknown>(
  specifier: string,
) => Promise<T>;

const cache = new Map<string, Promise<unknown>>();

export function dynamicImportWithCache<T = unknown>(specifier: string): Promise<T> {
  if (!cache.has(specifier)) {
    cache.set(specifier, nativeDynamicImport<T>(specifier));
  }
  return cache.get(specifier) as Promise<T>;
}

export function dynamicImport<T = unknown>(specifier: string): Promise<T> {
  return nativeDynamicImport<T>(specifier);
}
