import { IsEnum, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';
import { VerificationType } from '../entities/verification.entity';

export class CreateVerificationDto {
  @IsString()
  @Length(1, 255)
  identifier: string;

  @IsString()
  @Length(1, 255)
  value: string;

  @IsEnum(VerificationType)
  type: VerificationType;

  @IsOptional()
  @IsInt()
  @Min(60)
  ttlSeconds?: number;

  @IsOptional()
  @IsString()
  expiresAt?: string;
}
