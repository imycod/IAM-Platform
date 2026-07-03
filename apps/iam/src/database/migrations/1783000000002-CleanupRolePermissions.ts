import { MigrationInterface, QueryRunner } from 'typeorm';

const KEPT_PERMISSION_ID = '01KWEXRZZE6ZP3JBJRN0B2ZCVD';

const REMOVED_ROLE_PERMISSIONS = [
  {
    id: '01KWEVEXN0RW9TPVAWEK883S4B',
    roleId: '01KWEVEXK0QEMJ2BCG6Q8XQH15',
    permissionId: '01KWEVEXM7KVC250R1N4M82WME',
  },
  {
    id: '01KWEXRZZRG3D7TEGNBP6WBYWE',
    roleId: '01KWEVEXK0QEMJ2BCG6Q8XQH15',
    permissionId: '01KWEXRZZR60D241SGGYDN718H',
  },
  {
    id: '01KWEXRZZRGZY0VN62B23QFZCY',
    roleId: '01KWEVEXK0QEMJ2BCG6Q8XQH15',
    permissionId: '01KWEXRZZRR7SQ3CPYGZNM01FP',
  },
] as const;

export class CleanupRolePermissions1783000000002 implements MigrationInterface {
  name = 'CleanupRolePermissions1783000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM \`role_permission\` WHERE \`permission_id\` <> ?`,
      [KEPT_PERMISSION_ID],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const row of REMOVED_ROLE_PERMISSIONS) {
      const exists = await queryRunner.query(
        `SELECT id FROM \`role_permission\` WHERE \`id\` = ? LIMIT 1`,
        [row.id],
      );
      if (exists.length > 0) {
        continue;
      }

      await queryRunner.query(
        `INSERT INTO \`role_permission\` (\`id\`, \`role_id\`, \`permission_id\`)
         VALUES (?, ?, ?)`,
        [row.id, row.roleId, row.permissionId],
      );
    }
  }
}
