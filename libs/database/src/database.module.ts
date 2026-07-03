import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import type { DatabaseConfig } from '@app/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const db = config.getOrThrow<DatabaseConfig>('database');
        const isProd = config.get<string>('app.env') === 'production';
        return {
          type: 'mysql',
          host: db.host,
          port: db.port,
          username: db.username,
          password: db.password,
          database: db.database,
          charset: 'utf8mb4',
          timezone: 'Z',
          namingStrategy: new SnakeNamingStrategy(),
          // 各域用 forFeature 注册的实体会被自动装载
          autoLoadEntities: true,
          // 生产环境严禁 synchronize，统一走 migration
          synchronize: false,
          migrationsRun: false,
          logging: isProd ? ['error', 'warn'] : ['error', 'warn', 'schema'],
        };
      },
    }),
  ],
})
export class DatabaseModule {}
