import { BaseEntity } from '@app/database';
import { Column, Entity, Index } from 'typeorm';

@Entity('application_setting')
@Index('uq_application_setting', ['applicationId', 'configKey'], { unique: true })
export class ApplicationSettingEntity extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 26 })
  applicationId: string;

  @Column({ type: 'varchar', length: 100 })
  configKey: string;

  @Column({ type: 'text', nullable: true })
  configValue: string | null;
}
