import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOauthClientConsentMode1783000000007 implements MigrationInterface {
  name = 'AddOauthClientConsentMode1783000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`oauth_client\` ADD \`consent_mode\` varchar(20) NOT NULL DEFAULT 'never'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`oauth_client\` DROP COLUMN \`consent_mode\``);
  }
}
