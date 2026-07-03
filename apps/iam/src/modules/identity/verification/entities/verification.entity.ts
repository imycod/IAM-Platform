import { BaseEntity } from '@app/database';
import { Column, Entity, Index } from 'typeorm';

export enum VerificationType {
  EMAIL_VERIFY = 'email_verify',
  PHONE_OTP = 'phone_otp',
  MAGIC_LINK = 'magic_link',
  PASSWORD_RESET = 'password_reset',
}

/**
 * 验证码 / Magic Link / 邮箱验证 / 密码重置。到期由定时任务清理。
 */
@Entity('verification')
export class VerificationEntity extends BaseEntity {
  @Index()
  @Column({ type: 'varchar', length: 255 })
  identifier: string;

  @Column({ type: 'varchar', length: 255 })
  value: string;

  @Column({ type: 'varchar', length: 30 })
  type: VerificationType;

  @Index()
  @Column({ type: 'datetime', precision: 3 })
  expiresAt: Date;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  consumedAt: Date | null;
}
