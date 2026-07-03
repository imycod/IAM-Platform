import { BaseEntity } from '@app/database';
import { Column, Entity, Index } from 'typeorm';

@Entity('notification_log')
export class NotificationLogEntity extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 26, nullable: true })
  templateId: string | null;

  @Index()
  @Column({ type: 'varchar', length: 20 })
  channel: string;

  @Index()
  @Column({ type: 'varchar', length: 255 })
  recipient: string;

  @Column({ type: 'char', length: 26, nullable: true })
  userId: string | null;

  @Column({ type: 'json', nullable: true })
  payload: Record<string, unknown> | null;

  @Index()
  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  error: string | null;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  sentAt: Date | null;

  @Column({ type: 'int', default: 0 })
  retryCount: number;
}
