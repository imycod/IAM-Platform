import { IsDateString, IsOptional, IsString, Length } from 'class-validator';

export class UpdateVerificationDto {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  value?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsDateString()
  consumedAt?: string;
}
