import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import { AllExceptionsFilter, TransformInterceptor } from '@app/common';
import type { AppConfig } from '@app/config';
import { AppModule } from './app.module';
import { OidcService } from './modules/security/oidc/services/oidc.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);
  const appCfg = config.getOrThrow<AppConfig>('app');

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);
  expressApp.use(cookieParser());

  const corsOrigins = new Set([
    'http://localhost:4173',
    'http://127.0.0.1:4173',
    'http://localhost:8848',
    'http://127.0.0.1:8848',
    'http://localhost:4180',
    'http://127.0.0.1:4180',
  ]);
  const iamLoginUrl = appCfg.iamLoginUrl;
  if (iamLoginUrl) {
    try {
      corsOrigins.add(new URL(iamLoginUrl).origin);
    } catch {
      // ignore invalid IAM_LOGIN_URL
    }
  }

  app.enableCors({
    origin: [...corsOrigins],
    credentials: true,
  });

  // 挂载 node-oidc-provider 到 /oidc（express 会自动剥离前缀，符合 provider 路由预期）。
  // 放在全局前缀与校验管道之前，让 OIDC 协议端点独立于 /api 业务接口。
  const oidcService = app.get(OidcService, { strict: false });
  expressApp.use('/oidc', (req: Request, res: Response, next: NextFunction) => {
    oidcService
      .getCallback()
      .then((handler) => handler(req, res))
      .catch((err) => next(err));
  });

  app.setGlobalPrefix(appCfg.globalPrefix);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  await app.listen(appCfg.port);
  Logger.log(
    `IAM Platform 已启动: ${appCfg.url}/${appCfg.globalPrefix} [${appCfg.env}]`,
    'Bootstrap',
  );
}

void bootstrap();
