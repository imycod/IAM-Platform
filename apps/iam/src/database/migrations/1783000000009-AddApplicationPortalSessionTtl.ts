import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddApplicationPortalSessionTtl1783000000009 implements MigrationInterface {
  name = 'AddApplicationPortalSessionTtl1783000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`application\` ADD \`portal_session_ttl_seconds\` int NULL COMMENT '账密门户 session TTL（秒），NULL 表示使用全局默认'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`application\` DROP COLUMN \`portal_session_ttl_seconds\``,
    );
  }
}
