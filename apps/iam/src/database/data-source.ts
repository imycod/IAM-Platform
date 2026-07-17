import 'dotenv/config';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

/** Docker / 生产构建后 migration 在 dist 下，开发时在源码树。 */
const distMigrationsDir = join(process.cwd(), 'dist/apps/iam/src/database/migrations');
const useDistMigrations = existsSync(distMigrationsDir);

/**
 * seed / typeorm CLI 均通过 ts-node 跑源码，Repository 传入的是 .ts 实体类。
 * 若 entities 指向 dist 下的 .js，会与 import 的类不是同一构造函数，导致 EntityMetadataNotFoundError。
 */
const runningViaTsNode =
  process.execArgv.some((arg) => arg.includes('ts-node')) ||
  process.argv.some((arg) => arg.replace(/\\/g, '/').includes('/database/seeds/'));

const entityGlob = runningViaTsNode
  ? 'apps/iam/src/**/*.entity.ts'
  : useDistMigrations
    ? 'dist/apps/iam/src/**/*.entity.js'
    : 'apps/iam/src/**/*.entity.{ts,js}';

const migrationGlob = useDistMigrations
  ? 'dist/apps/iam/src/database/migrations/*.js'
  : 'apps/iam/src/database/migrations/*.{ts,js}';

/**
 * 仅供 TypeORM CLI 使用（migration:generate / run / revert）。
 * 运行时连接由 libs/database 的 DatabaseModule 通过 ConfigService 建立。
 */
export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '3306', 10),
  username: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_DATABASE ?? 'iam',
  charset: 'utf8mb4',
  timezone: 'Z',
  namingStrategy: new SnakeNamingStrategy(),
  synchronize: false,
  entities: [entityGlob],
  migrations: [migrationGlob],
});
