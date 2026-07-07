import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import express from 'express';
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
  expressApp.use(express.urlencoded({ extended: false }));

  const corsOrigins = new Set([
    'http://localhost:4173',
    'http://127.0.0.1:4173',
    'http://localhost:8848',
    'http://127.0.0.1:8848',
    'http://127.0.0.1:8849',
    'http://localhost:8849',
    'http://localhost:4180',
    'http://127.0.0.1:4180',
    // Nginx 子域模拟（deploy/nginx）
    'http://login.pinshuai.local',
    'http://api.pinshuai.local',
    'http://admin.pinshuai.local',
    'http://flow.pinshuai.local',
  ]);
  const appUrl = appCfg.url;
  if (appUrl) {
    try {
      corsOrigins.add(new URL(appUrl).origin);
    } catch {
      // ignore invalid APP_URL
    }
  }
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
    exposedHeaders: ['Location'],
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
  const oidcIssuer = config.get<string>('OIDC_ISSUER') ?? 'http://localhost:3000/oidc';
  Logger.log(
    `IAM Platform 已启动: ${appCfg.url}/${appCfg.globalPrefix} [${appCfg.env}]`,
    'Bootstrap',
  );
  Logger.log(
    `OIDC issuer=${oidcIssuer}, IAM_LOGIN_URL=${appCfg.iamLoginUrl ?? '(内置简易页)'}`,
    'Bootstrap',
  );
  if (appCfg.iamLoginUrl?.includes('localhost') && process.env.NODE_ENV === 'nginx') {
    Logger.warn('NODE_ENV=nginx 但 IAM_LOGIN_URL 仍指向 localhost，请检查 .env.nginx', 'Bootstrap');
  }
}

void bootstrap();
