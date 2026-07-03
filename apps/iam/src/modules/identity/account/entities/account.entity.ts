import { BaseEntity } from '@app/database';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UserEntity } from '../../user/entities/user.entity';

/**
 * 账号来源：凭证登录 + 第三方/联邦（github/google/wechat/feishu/ldap...）。
 * 联邦登录不新增域，只是在此表新增 provider_id 取值。
 */
@Entity('account')
@Index('uq_account_provider', ['providerId', 'accountId'], { unique: true })
export class AccountEntity extends BaseEntity {
  @Index()
  @Column({ type: 'char', length: 26 })
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  /** credential / github / google / wechat / feishu / ldap ... */
  @Column({ type: 'varchar', length: 50 })
  providerId: string;

  @Column({ type: 'varchar', length: 255 })
  accountId: string;

  /** provider_id='credential' 时的密码 hash（其余 provider 为 null）。 */
  @Column({ type: 'varchar', length: 255, nullable: true })
  password: string | null;

  @Column({ type: 'text', nullable: true })
  accessToken: string | null;

  @Column({ type: 'text', nullable: true })
  refreshToken: string | null;

  @Column({ type: 'text', nullable: true })
  idToken: string | null;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  accessTokenExpiresAt: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  scope: string | null;
}
