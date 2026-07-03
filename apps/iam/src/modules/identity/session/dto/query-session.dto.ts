import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '@app/common';

export class QuerySessionDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  userId?: string;
}
