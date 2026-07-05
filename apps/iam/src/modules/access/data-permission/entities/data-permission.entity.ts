import { BaseEntity } from '@app/database';
import { Column, Entity, Index } from 'typeorm';

export enum DataScope {
  SELF = 'self',
  DEPT = 'dept',
  DEPT_AND_CHILD = 'dept_and_child',
  ALL = 'all',
  CUSTOM = 'custom', // 自定义SQL 需要明确字段和值
}

/**
 * 数据权限范围。scope=dept* 时的部门范围通过 @app/contracts 的 IOrganizationQuery 获取，
 * 不直接查 organization 表。
 */
@Entity('data_permission')
export class DataPermissionEntity extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 26 })
  roleId: string;

  @Column({ type: 'varchar', length: 50 })
  resource: string;

  @Column({ type: 'varchar', length: 20, default: DataScope.SELF })
  scope: DataScope;

  @Column({ type: 'json', nullable: true })
  customExpr: Record<string, unknown> | null;

  /**
   * 仅 scope=all 时生效。true=跨组织（平台级全量）；false=当前组织内全部（租户边界，默认）。
   */
  @Column({ type: 'boolean', default: false })
  unrestricted: boolean;
}
