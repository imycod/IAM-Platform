import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { appConfig } from './configs/app.config';
import { databaseConfig } from './configs/database.config';
import { redisConfig } from './configs/redis.config';
import { envValidationSchema } from './env.validation';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      // 环境专属文件优先于基础 .env（@nestjs/config 取数组中先出现者）。
      // NODE_ENV=stage → .env.stage；NODE_ENV=production → .env.production
      envFilePath: [`.env.${process.env.NODE_ENV}`, `.env`],
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
