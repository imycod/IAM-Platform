import { IsOptional, IsString, MinLength } from 'class-validator';

export class PortalRefreshTokenDto {
  @IsString()
  @MinLength(1)
  refreshToken: string;

  @IsOptional()
  @IsString()
  appCode?: string;
}
