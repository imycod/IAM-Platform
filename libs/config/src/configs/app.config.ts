import { registerAs } from '@nestjs/config';

function parseCsv(value: string | undefined): string[] {
  if (!value?.trim()) {
    return [];
  }
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseAppReturnUrls(raw: string | undefined): Record<string, string> {
  if (!raw?.trim()) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'string' && value.length > 0) {
        out[key] = value.endsWith('/') ? value : `${value}/`;
      }
    }
    return out;
  } catch {
    return {};
  }
}

export interface AppConfig {
  port: number;
  env: string;
  url: string;
  globalPrefix: string;
  /** iam-login 统一登录页，未配置时 interaction 使用内置简易页 */
  iamLoginUrl: string | null;
  /** CORS 允许的 Origin 列表 */
  corsOrigins: string[];
  /** client_id → 应用首页（consent deny / 会话失效回跳） */
  appReturnUrls: Record<string, string>;
}

export const appConfig = registerAs(
  'app',
  (): AppConfig => ({
    port: parseInt(process.env.APP_PORT ?? '3000', 10),
    env: process.env.APP_ENV ?? 'development',
    url: process.env.APP_URL ?? 'http://localhost:3000',
    globalPrefix: process.env.APP_GLOBAL_PREFIX ?? 'api',
    iamLoginUrl: process.env.IAM_LOGIN_URL?.replace(/\/$/, '') ?? null,
    corsOrigins: parseCsv(process.env.CORS_ORIGINS),
    appReturnUrls: parseAppReturnUrls(process.env.APP_RETURN_URLS),
  }),
);
