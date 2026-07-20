import { BaseEntity } from '@app/database';
import { Column, Entity, Index } from 'typeorm';
import {
  CONSENT_MODES,
  DEFAULT_CONSENT_MODE,
  type ConsentMode,
} from '../constants/consent-mode';

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
  @Column({ type: 'varchar', length: 100, comment: '应用标识，如 internal-oa' })
  clientId: string;

  @Column({ type: 'varchar', length: 255, comment: '应用密钥，要加密存储' })
  clientSecret: string;

  @Column({ type: 'json', comment: '允许的回跳地址，如 ["http://localhost:8080/callback.html"]' })
  redirectUris: string[];

  @Column({ type: 'json', comment: '允许的授权类型，如 ["authorization_code", "refresh_token"]' })
  grantTypes: string[];

  @Column({ type: 'json', comment: '允许的响应类型，如 ["code", "token"]' })
  responseTypes: string[];

  @Column({ type: 'json', comment: '允许的授权范围，如 ["openid", "profile", "email"]' })
  scopes: string[];

  @Column({ type: 'varchar', length: 50, default: 'client_secret_basic', comment: 'token 端点认证方法' })
  tokenEndpointAuthMethod: string;

  @Column({ type: 'boolean', default: true, comment: '是否需要 PKCE' })
  requirePkce: boolean;

  /** 授权确认策略：never 自动跳过；first_time 首次授权需确认；always 每次均需确认。 */
  @Column({ type: 'varchar', length: 20, default: DEFAULT_CONSENT_MODE })
  consentMode: ConsentMode;
}

export { CONSENT_MODES, DEFAULT_CONSENT_MODE, type ConsentMode };
