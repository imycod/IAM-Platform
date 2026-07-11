import 'dotenv/config';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

/** Docker / 生产构建后 migration 在 dist 下，开发时在源码树。 */
const useDist = existsSync(join(process.cwd(), 'dist/apps/iam/src/database/migrations'));
const entityGlob = useDist
  ? 'dist/apps/iam/src/**/*.entity.js'
  : 'apps/iam/src/**/*.entity.{ts,js}';
const migrationGlob = useDist
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
