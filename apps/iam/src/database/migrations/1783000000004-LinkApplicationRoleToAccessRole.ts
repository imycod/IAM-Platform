import { MigrationInterface, QueryRunner } from 'typeorm';

export class LinkApplicationRoleToAccessRole1783000000004 implements MigrationInterface {
  name = 'LinkApplicationRoleToAccessRole1783000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`application_role\` ADD \`access_role_id\` char(26) NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_application_role_access_role_id\` ON \`application_role\` (\`access_role_id\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`application_user\` ADD \`application_role_id\` char(26) NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_application_user_application_role_id\` ON \`application_user\` (\`application_role_id\`)`,
    );

    // 回填：application_role.code → access role 约定编码 {app_code}:{role_code}
    await queryRunner.query(`
      UPDATE \`application_role\` ar
      INNER JOIN \`application\` a ON a.id = ar.application_id AND a.deleted_at IS NULL
      INNER JOIN \`role\` r ON r.application_id = ar.application_id
        AND r.code = CONCAT(REPLACE(a.code, '-', '_'), ':', ar.code)
        AND r.deleted_at IS NULL
      SET ar.access_role_id = r.id
      WHERE ar.deleted_at IS NULL AND ar.access_role_id IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`IDX_application_user_application_role_id\` ON \`application_user\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`application_user\` DROP COLUMN \`application_role_id\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_application_role_access_role_id\` ON \`application_role\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`application_role\` DROP COLUMN \`access_role_id\``,
    );
  }
}
