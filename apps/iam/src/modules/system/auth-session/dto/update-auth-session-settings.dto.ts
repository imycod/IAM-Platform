import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateAuthSessionSettingsDto {
  /** 账密门户 session 全局默认（秒） */
  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(365 * 24 * 60 * 60)
  portalSessionTtlSeconds?: number;

  /** OIDC SSO Session / Grant / Interaction（秒） */
  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(365 * 24 * 60 * 60)
  oidcSessionTtlSeconds?: number;

  /** OIDC AccessToken / IdToken（秒） */
  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(365 * 24 * 60 * 60)
  oidcAccessTokenTtlSeconds?: number;

  /** OIDC RefreshToken（秒） */
  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(365 * 24 * 60 * 60)
  oidcRefreshTokenTtlSeconds?: number;

  /** OIDC 授权码（秒） */
  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(3600)
  oidcAuthorizationCodeTtlSeconds?: number;
}
