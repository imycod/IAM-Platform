import { BaseEntity } from '@app/database';
import { Column, Entity, Index } from 'typeorm';

/**
 * JWT / Token / IP / User 黑名单。到期自动失效。
 */
@Entity('blacklist')
@Index('uq_blacklist_type_value', ['type', 'value'], { unique: true })
export class BlacklistEntity extends BaseEntity {
  @Index()
  @Column({ type: 'varchar', length: 20 })
  type: string;

  @Index()
  @Column({ type: 'varchar', length: 255 })
  value: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  reason: string | null;

  @Index()
  @Column({ type: 'datetime', precision: 3, nullable: true })
  expiresAt: Date | null;
}
