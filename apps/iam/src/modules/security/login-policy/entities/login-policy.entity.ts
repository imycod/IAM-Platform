import { BaseEntity } from '@app/database';
import { Column, Entity, Index } from 'typeorm';

/**
 * 登录/安全策略。organization_id 为 null 表示全局策略。
 */
@Entity('login_policy')
export class LoginPolicyEntity extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 26, nullable: true })
  organizationId: string | null;

  @Column({ type: 'int', default: 8 })
  minPasswordLength: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  passwordComplexity: string | null;

  @Column({ type: 'boolean', default: false })
  requireMfa: boolean;

  @Column({ type: 'int', default: 5 })
  maxFailedAttempts: number;

  @Column({ type: 'int', default: 15 })
  lockoutMinutes: number;

  @Column({ type: 'int', default: 1440 })
  sessionTtlMinutes: number;

  @Column({ type: 'boolean', default: false })
  requireCaptcha: boolean;
}
