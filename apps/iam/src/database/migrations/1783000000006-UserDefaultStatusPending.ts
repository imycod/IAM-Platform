import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserDefaultStatusPending1783000000006 implements MigrationInterface {
  name = 'UserDefaultStatusPending1783000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`user\` MODIFY \`status\` varchar(20) NOT NULL DEFAULT 'pending'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`user\` MODIFY \`status\` varchar(20) NOT NULL DEFAULT 'active'`,
    );
  }
}
