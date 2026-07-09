import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  MaxLength,
} from 'class-validator';

import { CONSENT_MODES } from '../constants/consent-mode';

const TOKEN_AUTH_METHODS = ['none', 'client_secret_basic', 'client_secret_post'] as const;

export class CreateOauthClientDto {
  @IsString()
  @Length(26, 26)
  applicationId: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  clientId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsUrl({ require_tld: false }, { each: true })
  redirectUris: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  grantTypes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  responseTypes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];

  @IsOptional()
  @IsIn(TOKEN_AUTH_METHODS)
  tokenEndpointAuthMethod?: string;

  @IsOptional()
  @IsBoolean()
  requirePkce?: boolean;

  @IsOptional()
  @IsIn(CONSENT_MODES)
  consentMode?: (typeof CONSENT_MODES)[number];
}
