import { IsBoolean, IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { LoginType } from '../entities/login-history.entity';

export class CreateLoginHistoryDto {
  @IsOptional()
  @IsString()
  @Length(26, 26)
  userId?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  identifier?: string;

  @IsOptional()
  @IsString()
  @Length(0, 64)
  ip?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  userAgent?: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  region?: string;

  @IsBoolean()
  success: boolean;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  failReason?: string;

  @IsOptional()
  @IsEnum(LoginType)
  loginType?: LoginType;

  @IsOptional()
  @IsString()
  @Length(0, 128)
  clientId?: string;

  @IsOptional()
  @IsString()
  @Length(26, 26)
  applicationId?: string;

  @IsOptional()
  @IsString()
  @Length(0, 64)
  applicationCode?: string;

  @IsOptional()
  @IsString()
  @Length(0, 128)
  applicationName?: string;
}
