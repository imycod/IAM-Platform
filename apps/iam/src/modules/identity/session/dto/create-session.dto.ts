import { IsDateString, IsOptional, IsString, Length } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  @Length(26, 26)
  userId: string;

  @IsString()
  @Length(1, 255)
  token: string;

  @IsDateString()
  expiresAt: string;

  @IsOptional()
  @IsString()
  @Length(0, 64)
  ipAddress?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  userAgent?: string;

  @IsOptional()
  @IsString()
  @Length(26, 26)
  deviceId?: string;
}
