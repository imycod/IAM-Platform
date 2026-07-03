import { MigrationInterface, QueryRunner } from 'typeorm';

/** 固定 ULID，便于 down 回滚 */
const IDS = {
  application: '01KWEV9SVM0S46KT3VG7PJR6QY',
  user: '01KWEV9SVWZ8EG0ZPSZK8J0VTC',
  menuProduct: '01KWEV9SVW6580PH36TT77A4GG',
  menuMaterial: '01KWEV9SVX2FKNAD6SB925BJTY',
  menuTask: '01KWEV9SVXRVQ8K7CZMJQKV9ST',
  applicationRole: '01KWEV9SVX9NX2YN4YG40ACH19',
  accessRole: '01KWEV9SVXWDRNNBPX5EW76J0Z',
  userRole: '01KWEV9SVXYDK250VPT28D29KQ',
  permission: '01KWEV9SVXSV2Q1210GMFP49TR',
  rolePermission: '01KWEV9SVYE0SW75H7DAQSX61Y',
  applicationUser: '01KWEV9SVY502CN7458BGTAP0Y',
} as const;

const APP_CODE = 'flow-admin';

export class SeedFlowAdminData1783000000000 implements MigrationInterface {
  name = 'SeedFlowAdminData1783000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const existing = await queryRunner.query(
      `SELECT id FROM \`application\` WHERE \`code\` = ? AND \`deleted_at\` IS NULL LIMIT 1`,
      [APP_CODE],
    );
    if (existing.length > 0) {
      return;
    }

    // 1. application — 流程管理平台 flow-admin
    await queryRunner.query(
      `INSERT INTO \`application\` (\`id\`, \`name\`, \`code\`, \`type\`, \`status\`, \`description\`)
       VALUES (?, ?, ?, 'web', 'active', ?)`,
      [IDS.application, '流程管理平台', APP_CODE, '流程管理业务系统'],
    );

    // 2. application_menu — 产品列表 / 素材列表 / 任务列表
    await queryRunner.query(
      `INSERT INTO \`application_menu\` (\`id\`, \`application_id\`, \`parent_id\`, \`name\`, \`path\`, \`icon\`, \`sort\`)
       VALUES
         (?, ?, NULL, '产品列表', '/products', NULL, 1),
         (?, ?, NULL, '素材列表', '/materials', NULL, 2),
         (?, ?, NULL, '任务列表', '/tasks', NULL, 3)`,
      [IDS.menuProduct, IDS.application, IDS.menuMaterial, IDS.application, IDS.menuTask, IDS.application],
    );

    // 3. user — 武兴师（is_system=0 表示非内置系统账号，可正常删除/管理）
    await queryRunner.query(
      `INSERT INTO \`user\` (\`id\`, \`email\`, \`email_verified\`, \`phone\`, \`phone_verified\`, \`name\`, \`status\`, \`is_system\`)
       VALUES (?, ?, 0, ?, 0, ?, 'active', 0)`,
      [IDS.user, 'admin@qq.com', '13400705847', '武兴师'],
    );

    // 4. application_user — 授权用户可登录 flow-admin
    await queryRunner.query(
      `INSERT INTO \`application_user\` (\`id\`, \`application_id\`, \`user_id\`, \`status\`, \`granted_at\`)
       VALUES (?, ?, ?, 'active', NOW(3))`,
      [IDS.applicationUser, IDS.application, IDS.user],
    );

    // 5. application_role — 超级管理员 super_admin
    await queryRunner.query(
      `INSERT INTO \`application_role\` (\`id\`, \`application_id\`, \`name\`, \`code\`)
       VALUES (?, ?, '管理员', 'admin')`,
      [IDS.applicationRole, IDS.application],
    );

    // 6. access.role — 流程管理员 flow_admin:manager
    await queryRunner.query(
      `INSERT INTO \`role\` (\`id\`, \`application_id\`, \`name\`, \`code\`, \`type\`, \`description\`)
       VALUES (?, ?, '流程管理员', 'flow_admin:manager', 'application', '流程管理系统的管理员')`,
      [IDS.accessRole, IDS.application],
    );

    // 7. user_role — 用户 ↔ 角色（作用域 flow-admin）
    await queryRunner.query(
      `INSERT INTO \`user_role\` (\`id\`, \`user_id\`, \`role_id\`, \`application_id\`)
       VALUES (?, ?, ?, ?)`,
      [IDS.userRole, IDS.user, IDS.accessRole, IDS.application],
    );

    // 8. permission — flow_admin:task:view
    await queryRunner.query(
      `INSERT INTO \`permission\` (\`id\`, \`application_id\`, \`name\`, \`code\`, \`resource\`, \`action\`)
       VALUES (?, ?, '流程管理任务列表', 'flow_admin:task:view', 'flow_admin:task', 'view')`,
      [IDS.permission, IDS.application],
    );

    // 9. role_permission — 角色 ↔ 权限
    await queryRunner.query(
      `INSERT INTO \`role_permission\` (\`id\`, \`role_id\`, \`permission_id\`)
       VALUES (?, ?, ?)`,
      [IDS.rolePermission, IDS.accessRole, IDS.permission],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM \`role_permission\` WHERE \`id\` = ?`, [IDS.rolePermission]);
    await queryRunner.query(`DELETE FROM \`permission\` WHERE \`id\` = ?`, [IDS.permission]);
    await queryRunner.query(`DELETE FROM \`user_role\` WHERE \`id\` = ?`, [IDS.userRole]);
    await queryRunner.query(`DELETE FROM \`role\` WHERE \`id\` = ?`, [IDS.accessRole]);
    await queryRunner.query(`DELETE FROM \`application_role\` WHERE \`id\` = ?`, [IDS.applicationRole]);
    await queryRunner.query(`DELETE FROM \`application_user\` WHERE \`id\` = ?`, [IDS.applicationUser]);
    await queryRunner.query(`DELETE FROM \`user\` WHERE \`id\` = ?`, [IDS.user]);
    await queryRunner.query(`DELETE FROM \`application_menu\` WHERE \`application_id\` = ?`, [IDS.application]);
    await queryRunner.query(`DELETE FROM \`application\` WHERE \`id\` = ?`, [IDS.application]);
  }
}
