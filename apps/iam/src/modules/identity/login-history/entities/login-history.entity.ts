import { BaseEntity } from '@app/database';
import { Column, Entity, Index } from 'typeorm';

export enum LoginType {
  PASSWORD = 'password',
  OAUTH = 'oauth',
  MAGIC_LINK = 'magic_link',
  SSO = 'sso',
}

/**
 * 登录审计。只增不删，供风控 / 异常登录 / 最近登录展示。
 * 失败场景可能没有 userId（账号不存在）。
 */
@Entity('login_history')
export class LoginHistoryEntity extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 26, nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  identifier: string | null;

  @Index()
  @Column({ type: 'varchar', length: 64, nullable: true })
  ip: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  region: string | null;

  @Index()
  @Column({ type: 'boolean' })
  success: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  failReason: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  loginType: LoginType | null;

  /** OIDC client_id（SSO 登录时有值） */
  @Index()
  @Column({ type: 'varchar', length: 128, nullable: true, name: 'client_id' })
  clientId: string | null;

  @Index()
  @Column({ type: 'char', length: 26, nullable: true, name: 'application_id' })
  applicationId: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'application_code' })
  applicationCode: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true, name: 'application_name' })
  applicationName: string | null;
}
