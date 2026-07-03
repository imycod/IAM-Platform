import { BaseEntity } from '@app/database';
import { Column, Entity, Index } from 'typeorm';

/**
 * 权限点，如 task:create。resource + action 供 CASL/ABAC 使用。
 */
@Entity('permission')
@Index('uq_permission_app_code', ['applicationId', 'code'], { unique: true })
export class PermissionEntity extends BaseEntity {
  @Column({ type: 'char', length: 26, nullable: true })
  applicationId: string | null;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  code: string;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  resource: string;

  @Column({ type: 'varchar', length: 50 })
  action: string;
}
