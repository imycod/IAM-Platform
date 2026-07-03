import { BaseEntity } from '@app/database';
import { Column, Entity, Index } from 'typeorm';

/**
 * 敏感操作审计（删除用户/修改权限/登录等）。只增不删。
 */
@Entity('audit_log')
export class AuditLogEntity extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 26, nullable: true })
  actorId: string | null;

  @Index()
  @Column({ type: 'varchar', length: 100 })
  action: string;

  @Index()
  @Column({ type: 'varchar', length: 50, nullable: true })
  resourceType: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  resourceId: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent: string | null;

  @Column({ type: 'json', nullable: true })
  detail: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 20, default: 'success' })
  result: string;
}
