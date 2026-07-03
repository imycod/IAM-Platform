import { registerAs } from '@nestjs/config';

export interface AppConfig {
  port: number;
  env: string;
  url: string;
  globalPrefix: string;
  /** iam-login 统一登录页，未配置时 interaction 使用内置简易页 */
  iamLoginUrl: string | null;
}

export const appConfig = registerAs(
  'app',
  (): AppConfig => ({
    port: parseInt(process.env.APP_PORT ?? '3000', 10),
    env: process.env.APP_ENV ?? 'development',
    url: process.env.APP_URL ?? 'http://localhost:3000',
    globalPrefix: process.env.APP_GLOBAL_PREFIX ?? 'api',
    iamLoginUrl: process.env.IAM_LOGIN_URL?.replace(/\/$/, '') ?? null,
  }),
);
