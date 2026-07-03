import { BaseEntity } from '@app/database';
import { Column, Entity, Index } from 'typeorm';

@Entity('system_config')
export class SystemConfigEntity extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100 })
  configKey: string;

  @Column({ type: 'text', nullable: true })
  configValue: string | null;

  @Index()
  @Column({ type: 'varchar', length: 50, nullable: true })
  configGroup: string | null;

  @Column({ type: 'varchar', length: 20, default: 'string' })
  valueType: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: false })
  isPublic: boolean;
}
