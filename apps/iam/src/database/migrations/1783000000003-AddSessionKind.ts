import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSessionKind1783000000003 implements MigrationInterface {
  name = 'AddSessionKind1783000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`session\` ADD \`kind\` varchar(30) NOT NULL DEFAULT 'portal_password'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`session\` DROP COLUMN \`kind\``);
  }
}
