import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDataPermissionUnrestricted1783000000005 implements MigrationInterface {
  name = 'AddDataPermissionUnrestricted1783000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`data_permission\` ADD \`unrestricted\` tinyint NOT NULL DEFAULT 0 COMMENT 'scope=all 时 true=跨组织可见，false=仅当前组织内全部'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`data_permission\` DROP COLUMN \`unrestricted\``);
  }
}
