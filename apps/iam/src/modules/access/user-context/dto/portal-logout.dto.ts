import { IsOptional, IsString, MinLength } from 'class-validator';

export class PortalLogoutDto {
  @IsString()
  @MinLength(1)
  refreshToken: string;

  @IsOptional()
  @IsString()
  appCode?: string;
}
