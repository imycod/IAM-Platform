import type { ConsentMode } from '../constants/consent-mode';

export interface OauthClientApplicationBrief {
  id: string;
  name: string;
  code: string;
  status: string;
}

export interface OauthClientDetailDto {
  id: string;
  applicationId: string;
  clientId: string;
  /** 脱敏后的 secret，如 ****abcd */
  clientSecretMasked: string;
  /** 仅创建/轮换 secret 时返回明文，其它接口为 null */
  clientSecretPlain: string | null;
  redirectUris: string[];
  grantTypes: string[];
  responseTypes: string[];
  scopes: string[];
  tokenEndpointAuthMethod: string;
  requirePkce: boolean;
  consentMode: ConsentMode;
  application: OauthClientApplicationBrief | null;
  createdAt: Date;
  updatedAt: Date;
}
