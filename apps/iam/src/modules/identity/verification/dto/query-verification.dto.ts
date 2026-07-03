import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '@app/common';
import { VerificationType } from '../entities/verification.entity';

export class QueryVerificationDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  identifier?: string;

  @IsOptional()
  @IsEnum(VerificationType)
  type?: VerificationType;
}
