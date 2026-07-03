import { MigrationInterface, QueryRunner } from 'typeorm';

const MENU_PERMISSION_UPDATES = [
  {
    id: '01KWEVEXFENS63DN8MDC6CXA7Q',
    permissionCode: 'flow_admin:products:view',
  },
  {
    id: '01KWEVEXG2EWNPJ9V37VPNXYDH',
    permissionCode: 'flow_admin:materials:view',
  },
  {
    id: '01KWEVEXGHKHX2R2849NPKT3A1',
    permissionCode: 'flow_admin:tasks:view',
  },
] as const;

const FLOW_ADMIN_APP_ID = '01KWEVEXEC0EY4W4A3RC5QCAGZ';
const FLOW_ADMIN_ROLE_ID = '01KWEVEXK0QEMJ2BCG6Q8XQH15';

const PERMISSION_SEEDS = [
  {
    id: '01KWEXRZZE6ZP3JBJRN0B2ZCVD',
    name: '流程管理产品列表',
    code: 'flow_admin:products:view',
    resource: 'flow_admin:products',
    action: 'view',
    rolePermissionId: '01KWEXRZZR2J4302XM2429E7Y1',
  },
  {
    id: '01KWEXRZZR60D241SGGYDN718H',
    name: '流程管理素材列表',
    code: 'flow_admin:materials:view',
    resource: 'flow_admin:materials',
    action: 'view',
    rolePermissionId: '01KWEXRZZRG3D7TEGNBP6WBYWE',
  },
  {
    id: '01KWEXRZZRR7SQ3CPYGZNM01FP',
    name: '流程管理任务列表',
    code: 'flow_admin:tasks:view',
    resource: 'flow_admin:tasks',
    action: 'view',
    rolePermissionId: '01KWEXRZZRGZY0VN62B23QFZCY',
  },
] as const;

export class AddApplicationMenuPermissionCode1783000000001 implements MigrationInterface {
  name = 'AddApplicationMenuPermissionCode1783000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`application_menu\` ADD \`permission_code\` varchar(100) NULL`,
    );

    for (const row of MENU_PERMISSION_UPDATES) {
      await queryRunner.query(
        `UPDATE \`application_menu\` SET \`permission_code\` = ? WHERE \`id\` = ?`,
        [row.permissionCode, row.id],
      );
    }

    for (const perm of PERMISSION_SEEDS) {
      const exists = await queryRunner.query(
        `SELECT id FROM \`permission\` WHERE \`application_id\` = ? AND \`code\` = ? AND \`deleted_at\` IS NULL LIMIT 1`,
        [FLOW_ADMIN_APP_ID, perm.code],
      );
      if (exists.length > 0) {
        continue;
      }

      await queryRunner.query(
        `INSERT INTO \`permission\` (\`id\`, \`application_id\`, \`name\`, \`code\`, \`resource\`, \`action\`)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [perm.id, FLOW_ADMIN_APP_ID, perm.name, perm.code, perm.resource, perm.action],
      );

      await queryRunner.query(
        `INSERT INTO \`role_permission\` (\`id\`, \`role_id\`, \`permission_id\`)
         VALUES (?, ?, ?)`,
        [perm.rolePermissionId, FLOW_ADMIN_ROLE_ID, perm.id],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const perm of PERMISSION_SEEDS) {
      await queryRunner.query(`DELETE FROM \`role_permission\` WHERE \`id\` = ?`, [
        perm.rolePermissionId,
      ]);
      await queryRunner.query(`DELETE FROM \`permission\` WHERE \`id\` = ?`, [perm.id]);
    }

    await queryRunner.query(`ALTER TABLE \`application_menu\` DROP COLUMN \`permission_code\``);
  }
}
