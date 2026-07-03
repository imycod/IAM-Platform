import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1782888580712 implements MigrationInterface {
    name = 'Migration1782888580712'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`verification\` (\`id\` char(26) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, \`identifier\` varchar(255) NOT NULL, \`value\` varchar(255) NOT NULL, \`type\` varchar(30) NOT NULL, \`expires_at\` datetime(3) NOT NULL, \`consumed_at\` datetime(3) NULL, INDEX \`IDX_896e5902333fa9991d1733e5ee\` (\`identifier\`), INDEX \`IDX_a3158a931b46cbb4ca60a16fd7\` (\`expires_at\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`user\` (\`id\` char(26) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, \`email\` varchar(255) NULL, \`email_verified\` tinyint NOT NULL DEFAULT 0, \`phone\` varchar(32) NULL, \`phone_verified\` tinyint NOT NULL DEFAULT 0, \`name\` varchar(100) NULL, \`status\` varchar(20) NOT NULL DEFAULT 'active', \`is_system\` tinyint NOT NULL DEFAULT 0, \`last_login_at\` datetime(3) NULL, UNIQUE INDEX \`IDX_e12875dfb3b1d92d7d7c5377e2\` (\`email\`), UNIQUE INDEX \`IDX_8e1f623798118e629b46a9e629\` (\`phone\`), INDEX \`IDX_3d44ccf43b8a0d6b9978affb88\` (\`status\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`profile\` (\`id\` char(26) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, \`user_id\` char(26) NOT NULL, \`nickname\` varchar(100) NULL, \`avatar\` varchar(500) NULL, \`gender\` varchar(10) NOT NULL DEFAULT 'unknown', \`birthday\` date NULL, \`language\` varchar(10) NOT NULL DEFAULT 'zh-CN', \`timezone\` varchar(64) NOT NULL DEFAULT 'Asia/Shanghai', \`bio\` varchar(500) NULL, UNIQUE INDEX \`IDX_d752442f45f258a8bdefeebb2f\` (\`user_id\`), UNIQUE INDEX \`REL_d752442f45f258a8bdefeebb2f\` (\`user_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`device\` (\`id\` char(26) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, \`user_id\` char(26) NOT NULL, \`device_name\` varchar(100) NULL, \`device_type\` varchar(20) NOT NULL DEFAULT 'unknown', \`os\` varchar(50) NULL, \`browser\` varchar(50) NULL, \`fingerprint\` varchar(128) NULL, \`trusted\` tinyint NOT NULL DEFAULT 0, \`last_active_at\` datetime(3) NULL, INDEX \`IDX_ae7154510495c7ddda951b07a0\` (\`user_id\`), INDEX \`IDX_88e6ccf20875fa2c42538d709c\` (\`fingerprint\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`session\` (\`id\` char(26) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, \`user_id\` char(26) NOT NULL, \`token\` varchar(255) NOT NULL, \`expires_at\` datetime(3) NOT NULL, \`ip_address\` varchar(64) NULL, \`user_agent\` varchar(500) NULL, \`device_id\` char(26) NULL, INDEX \`IDX_30e98e8746699fb9af235410af\` (\`user_id\`), UNIQUE INDEX \`IDX_232f8e85d7633bd6ddfad42169\` (\`token\`), INDEX \`IDX_2223e981900a413ce4ce6386f9\` (\`expires_at\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`login_history\` (\`id\` char(26) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, \`user_id\` char(26) NULL, \`identifier\` varchar(255) NULL, \`ip\` varchar(64) NULL, \`user_agent\` varchar(500) NULL, \`region\` varchar(100) NULL, \`success\` tinyint NOT NULL, \`fail_reason\` varchar(100) NULL, \`login_type\` varchar(30) NULL, INDEX \`IDX_ad9ce49cb73c0b33746a56b6bd\` (\`user_id\`), INDEX \`IDX_7c03e495294640bd6aaa50adcd\` (\`ip\`), INDEX \`IDX_f1451dc8fc9e81bd78e7430e6e\` (\`success\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`account\` (\`id\` char(26) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, \`user_id\` char(26) NOT NULL, \`provider_id\` varchar(50) NOT NULL, \`account_id\` varchar(255) NOT NULL, \`password\` varchar(255) NULL, \`access_token\` text NULL, \`refresh_token\` text NULL, \`id_token\` text NULL, \`access_token_expires_at\` datetime(3) NULL, \`scope\` varchar(500) NULL, INDEX \`IDX_efef1e5fdbe318a379c06678c5\` (\`user_id\`), UNIQUE INDEX \`uq_account_provider\` (\`provider_id\`, \`account_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`profile\` ADD CONSTRAINT \`FK_d752442f45f258a8bdefeebb2f2\` FOREIGN KEY (\`user_id\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`device\` ADD CONSTRAINT \`FK_ae7154510495c7ddda951b07a07\` FOREIGN KEY (\`user_id\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`session\` ADD CONSTRAINT \`FK_30e98e8746699fb9af235410aff\` FOREIGN KEY (\`user_id\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`session\` ADD CONSTRAINT \`FK_0439eebad5445f7def6a9dd50d7\` FOREIGN KEY (\`device_id\`) REFERENCES \`device\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`account\` ADD CONSTRAINT \`FK_efef1e5fdbe318a379c06678c51\` FOREIGN KEY (\`user_id\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`account\` DROP FOREIGN KEY \`FK_efef1e5fdbe318a379c06678c51\``);
        await queryRunner.query(`ALTER TABLE \`session\` DROP FOREIGN KEY \`FK_0439eebad5445f7def6a9dd50d7\``);
        await queryRunner.query(`ALTER TABLE \`session\` DROP FOREIGN KEY \`FK_30e98e8746699fb9af235410aff\``);
        await queryRunner.query(`ALTER TABLE \`device\` DROP FOREIGN KEY \`FK_ae7154510495c7ddda951b07a07\``);
        await queryRunner.query(`ALTER TABLE \`profile\` DROP FOREIGN KEY \`FK_d752442f45f258a8bdefeebb2f2\``);
        await queryRunner.query(`DROP INDEX \`uq_account_provider\` ON \`account\``);
        await queryRunner.query(`DROP INDEX \`IDX_efef1e5fdbe318a379c06678c5\` ON \`account\``);
        await queryRunner.query(`DROP TABLE \`account\``);
        await queryRunner.query(`DROP INDEX \`IDX_f1451dc8fc9e81bd78e7430e6e\` ON \`login_history\``);
        await queryRunner.query(`DROP INDEX \`IDX_7c03e495294640bd6aaa50adcd\` ON \`login_history\``);
        await queryRunner.query(`DROP INDEX \`IDX_ad9ce49cb73c0b33746a56b6bd\` ON \`login_history\``);
        await queryRunner.query(`DROP TABLE \`login_history\``);
        await queryRunner.query(`DROP INDEX \`IDX_2223e981900a413ce4ce6386f9\` ON \`session\``);
        await queryRunner.query(`DROP INDEX \`IDX_232f8e85d7633bd6ddfad42169\` ON \`session\``);
        await queryRunner.query(`DROP INDEX \`IDX_30e98e8746699fb9af235410af\` ON \`session\``);
        await queryRunner.query(`DROP TABLE \`session\``);
        await queryRunner.query(`DROP INDEX \`IDX_88e6ccf20875fa2c42538d709c\` ON \`device\``);
        await queryRunner.query(`DROP INDEX \`IDX_ae7154510495c7ddda951b07a0\` ON \`device\``);
        await queryRunner.query(`DROP TABLE \`device\``);
        await queryRunner.query(`DROP INDEX \`REL_d752442f45f258a8bdefeebb2f\` ON \`profile\``);
        await queryRunner.query(`DROP INDEX \`IDX_d752442f45f258a8bdefeebb2f\` ON \`profile\``);
        await queryRunner.query(`DROP TABLE \`profile\``);
        await queryRunner.query(`DROP INDEX \`IDX_3d44ccf43b8a0d6b9978affb88\` ON \`user\``);
        await queryRunner.query(`DROP INDEX \`IDX_8e1f623798118e629b46a9e629\` ON \`user\``);
        await queryRunner.query(`DROP INDEX \`IDX_e12875dfb3b1d92d7d7c5377e2\` ON \`user\``);
        await queryRunner.query(`DROP TABLE \`user\``);
        await queryRunner.query(`DROP INDEX \`IDX_a3158a931b46cbb4ca60a16fd7\` ON \`verification\``);
        await queryRunner.query(`DROP INDEX \`IDX_896e5902333fa9991d1733e5ee\` ON \`verification\``);
        await queryRunner.query(`DROP TABLE \`verification\``);
    }

}
