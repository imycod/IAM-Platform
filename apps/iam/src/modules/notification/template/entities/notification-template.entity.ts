import { BaseEntity } from '@app/database';
import { Column, Entity, Index } from 'typeorm';

@Entity('notification_template')
@Index('uq_notification_template', ['code', 'channel'], { unique: true })
export class NotificationTemplateEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  code: string;

  @Index()
  @Column({ type: 'varchar', length: 20 })
  channel: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  subject: string | null;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'json', nullable: true })
  variables: Record<string, unknown> | null;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;
}
