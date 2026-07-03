import { BaseEntity } from '@app/database';
import { Column, Entity, Index } from 'typeorm';

/**
 * OAuth 客户端，与 application 1:1（application_id）。
 * client_secret 加密存储；application 只存业务元数据，敏感凭证归这里。
 */
@Entity('oauth_client')
export class OauthClientEntity extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'char', length: 26 })
  applicationId: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100 })
  clientId: string;

  @Column({ type: 'varchar', length: 255 })
  clientSecret: string;

  @Column({ type: 'json' })
  redirectUris: string[];

  @Column({ type: 'json' })
  grantTypes: string[];

  @Column({ type: 'json' })
  responseTypes: string[];

  @Column({ type: 'json' })
  scopes: string[];

  @Column({ type: 'varchar', length: 50, default: 'client_secret_basic' })
  tokenEndpointAuthMethod: string;

  @Column({ type: 'boolean', default: true })
  requirePkce: boolean;
}
