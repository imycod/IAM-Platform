import { registerAs } from '@nestjs/config';

export interface AppConfig {
  port: number;
  env: string;
  url: string;
  globalPrefix: string;
}

export const appConfig = registerAs(
  'app',
  (): AppConfig => ({
    port: parseInt(process.env.APP_PORT ?? '3000', 10),
    env: process.env.APP_ENV ?? 'development',
    url: process.env.APP_URL ?? 'http://localhost:3000',
    globalPrefix: process.env.APP_GLOBAL_PREFIX ?? 'api',
  }),
);
