import { BaseEntity } from '@app/database';
import { Column, Entity, Index } from 'typeorm';

@Entity('scheduled_job')
export class ScheduledJobEntity extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  cron: string;

  @Column({ type: 'varchar', length: 200 })
  handler: string;

  @Column({ type: 'varchar', length: 20, default: 'enabled' })
  status: string;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  lastRunAt: Date | null;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  nextRunAt: Date | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  lastResult: string | null;
}
