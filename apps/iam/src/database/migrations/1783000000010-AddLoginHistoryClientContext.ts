import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLoginHistoryClientContext1783000000010 implements MigrationInterface {
  name = 'AddLoginHistoryClientContext1783000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`login_history\` ADD \`client_id\` varchar(128) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`login_history\` ADD \`application_id\` char(26) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`login_history\` ADD \`application_code\` varchar(64) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`login_history\` ADD \`application_name\` varchar(128) NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_login_history_client_id\` ON \`login_history\` (\`client_id\`)`,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_login_history_application_id\` ON \`login_history\` (\`application_id\`)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`IDX_login_history_application_id\` ON \`login_history\``,
    );
    await queryRunner.query(`DROP INDEX \`IDX_login_history_client_id\` ON \`login_history\``);
    await queryRunner.query(`ALTER TABLE \`login_history\` DROP COLUMN \`application_name\``);
    await queryRunner.query(`ALTER TABLE \`login_history\` DROP COLUMN \`application_code\``);
    await queryRunner.query(`ALTER TABLE \`login_history\` DROP COLUMN \`application_id\``);
    await queryRunner.query(`ALTER TABLE \`login_history\` DROP COLUMN \`client_id\``);
  }
}
