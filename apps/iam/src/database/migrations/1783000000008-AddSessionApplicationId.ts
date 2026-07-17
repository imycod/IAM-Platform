import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSessionApplicationId1783000000008 implements MigrationInterface {
  name = 'AddSessionApplicationId1783000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`session\` ADD \`application_id\` char(26) NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_session_application_id\` ON \`session\` (\`application_id\`)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX \`IDX_session_application_id\` ON \`session\``);
    await queryRunner.query(`ALTER TABLE \`session\` DROP COLUMN \`application_id\``);
  }
}
