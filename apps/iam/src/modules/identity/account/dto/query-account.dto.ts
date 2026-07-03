import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '@app/common';

export class QueryAccountDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  providerId?: string;
}
