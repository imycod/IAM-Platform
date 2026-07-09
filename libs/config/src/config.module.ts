import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { join } from 'node:path';
import { appConfig } from './configs/app.config';
import { databaseConfig } from './configs/database.config';
import { redisConfig } from './configs/redis.config';
import { envValidationSchema } from './env.validation';

const envName = process.env.NODE_ENV ?? 'development';
const envDir = process.cwd();

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      // 环境专用文件优先，避免 .env 里的 localhost 覆盖 .env.nginx / .env.production
      envFilePath: [join(envDir, `.env.${envName}`), join(envDir, '.env')],
      load: [appConfig, databaseConfig, redisConfig],
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
  ],
})
export class ConfigModule {}
