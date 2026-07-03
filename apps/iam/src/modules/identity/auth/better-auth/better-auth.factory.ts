import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPool, type Pool } from 'mysql2/promise';
import { dynamicImport } from '@app/common';
import type { DatabaseConfig } from '@app/config';

export const AUTH_INSTANCE = Symbol('AUTH_INSTANCE');

/**
 * better-auth 是纯 ESM 包，本项目为 CommonJS 构建，因此通过 dynamicImport 懒加载，
 * 并复用 mysql2 连接池（better-auth 内置 Kysely 适配器可直接吃 mysql2 Pool）。
 *
 * 说明：better-auth 默认会管理 user/session/account/verification 四张表。
 * 本项目这些表已由 TypeORM 实体拥有，接入时需通过 better-auth 的字段映射对齐，
 * 或让 AuthService（credential 实现）作为默认引擎。此工厂提供可插拔的 better-auth 引擎。
 */
@Injectable()
export class BetterAuthFactory {
  private readonly logger = new Logger(BetterAuthFactory.name);
  private instance: unknown | null = null;
  private pool: Pool | null = null;

  constructor(private readonly config: ConfigService) {}

  async getInstance(): Promise<unknown> {
    if (this.instance) {
      return this.instance;
    }
    const db = this.config.getOrThrow<DatabaseConfig>('database');
    this.pool = createPool({
      host: db.host,
      port: db.port,
      user: db.username,
      password: db.password,
      database: db.database,
    });

    const { betterAuth } = await dynamicImport<{ betterAuth: (opts: unknown) => unknown }>(
      'better-auth',
    );

    this.instance = betterAuth({
      database: this.pool,
      secret: this.config.get<string>('BETTER_AUTH_SECRET'),
      baseURL: this.config.get<string>('BETTER_AUTH_URL'),
      emailAndPassword: { enabled: true },
    });
    this.logger.log('better-auth 实例已初始化');
    return this.instance;
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool?.end();
  }
}
