import { BaseEntity } from '@app/database';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UserEntity } from '../../user/entities/user.entity';
import { DeviceEntity } from '../../device/entities/device.entity';
import { PortalSessionKind } from '../session-kind.enum';

/**
 * 门户登录态（对应 better-auth session）。
 * 注意：session = 门户登录态；security/token = 下游系统协议令牌，语义不同。
 */
@Entity('session')
export class SessionEntity extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 26 })
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @Column({ type: 'varchar', length: 30, default: PortalSessionKind.PORTAL_PASSWORD })
  kind: PortalSessionKind;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  token: string;

  @Index()
  @Column({ type: 'datetime', precision: 3 })
  expiresAt: Date;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ipAddress: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent: string | null;

  @Column({ type: 'char', length: 26, nullable: true })
  deviceId: string | null;

  @Index()
  @Column({ type: 'char', length: 26, nullable: true, name: 'application_id' })
  applicationId: string | null;

  @ManyToOne(() => DeviceEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'device_id' })
  device?: DeviceEntity | null;
}
