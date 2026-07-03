import { BaseEntity } from '@app/database';
import { Column, Entity, Index } from 'typeorm';

export enum UserStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled',
  LOCKED = 'locked',
  PENDING = 'pending',
}

/**
 * 用户身份核心表。只保存"用户是谁 + 如何登录"的最小字段。
 * 密码 hash 不在此表，放 account(provider_id='credential')，与 better-auth 一致。
 * 头像/昵称等业务资料放 profile。
 */
@Entity('user')
export class UserEntity extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'boolean', default: false })
  emailVerified: boolean;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 32, nullable: true })
  phone: string | null;

  @Column({ type: 'boolean', default: false })
  phoneVerified: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  name: string | null;

  @Index()
  @Column({ type: 'varchar', length: 20, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ type: 'boolean', default: false })
  isSystem: boolean;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  lastLoginAt: Date | null;
}
