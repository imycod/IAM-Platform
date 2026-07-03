import { BaseEntity } from '@app/database';
import { Column, Entity, Index } from 'typeorm';

/**
 * 协议令牌的可读/可吊销索引（权威存储在 oidc_payload）。供后台"令牌管理/吊销"。
 */
@Entity('token')
export class TokenEntity extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 26 })
  userId: string;

  @Index()
  @Column({ type: 'varchar', length: 100 })
  clientId: string;

  @Column({ type: 'varchar', length: 20 })
  type: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  tokenRef: string;

  @Column({ type: 'json', nullable: true })
  scopes: string[] | null;

  @Index()
  @Column({ type: 'datetime', precision: 3 })
  expiresAt: Date;

  @Column({ type: 'boolean', default: false })
  revoked: boolean;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  revokedAt: Date | null;
}
