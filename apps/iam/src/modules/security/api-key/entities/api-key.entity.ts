import { BaseEntity } from '@app/database';
import { Column, Entity, Index } from 'typeorm';

/**
 * 机器凭证（非 OAuth）。存 hash，不存明文。
 */
@Entity('api_key')
export class ApiKeyEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Index()
  @Column({ type: 'varchar', length: 16 })
  keyPrefix: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  keyHash: string;

  @Column({ type: 'char', length: 26, nullable: true })
  userId: string | null;

  @Column({ type: 'char', length: 26, nullable: true })
  applicationId: string | null;

  @Column({ type: 'json', nullable: true })
  scopes: string[] | null;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  lastUsedAt: Date | null;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;
}
