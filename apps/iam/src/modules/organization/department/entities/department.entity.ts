import { BaseEntity } from '@app/database';
import { Column, Entity, Index } from 'typeorm';

/**
 * 部门（树）。path 为物化路径，加速子树查询。
 */
@Entity('department')
@Index('uq_department_org_code', ['organizationId', 'code'], { unique: true })
export class DepartmentEntity extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 26 })
  organizationId: string;

  @Index()
  @Column({ type: 'char', length: 26, nullable: true })
  parentId: string | null;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Index()
  @Column({ type: 'varchar', length: 500, nullable: true })
  path: string | null;

  @Column({ type: 'char', length: 26, nullable: true })
  leaderEmployeeId: string | null;

  @Column({ type: 'int', default: 0 })
  sort: number;
}
