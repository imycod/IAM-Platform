import { BaseEntity } from '@app/database';
import { Column, Entity, Index } from 'typeorm';

/**
 * 应用（Admin/Workflow/AutoVE...）。业务元数据权威来源；client_secret 归 oauth_client。
 */
@Entity('application')
export class ApplicationEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 20, default: 'web' })
  type: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  /** 账密门户 session 有效期（秒）；NULL 时使用全局默认策略 */
  @Column({ type: 'int', nullable: true, name: 'portal_session_ttl_seconds' })
  portalSessionTtlSeconds: number | null;
}
