import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '@app/common';

export class QueryProfileDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  userId?: string;
}
