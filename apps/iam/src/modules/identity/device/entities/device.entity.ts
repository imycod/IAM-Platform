import { BaseEntity } from '@app/database';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UserEntity } from '../../user/entities/user.entity';

export enum DeviceType {
  DESKTOP = 'desktop',
  MOBILE = 'mobile',
  TABLET = 'tablet',
  UNKNOWN = 'unknown',
}

/**
 * 登录设备。支持可信设备 / Remember Me / 设备管理。
 */
@Entity('device')
export class DeviceEntity extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 26 })
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @Column({ type: 'varchar', length: 100, nullable: true })
  deviceName: string | null;

  @Column({ type: 'varchar', length: 20, default: DeviceType.UNKNOWN })
  deviceType: DeviceType;

  @Column({ type: 'varchar', length: 50, nullable: true })
  os: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  browser: string | null;

  @Index()
  @Column({ type: 'varchar', length: 128, nullable: true })
  fingerprint: string | null;

  @Column({ type: 'boolean', default: false })
  trusted: boolean;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  lastActiveAt: Date | null;
}
