import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '@app/common';

export class QueryLoginHistoryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsBoolean()
  success?: boolean;

  @IsOptional()
  @IsString()
  applicationCode?: string;

  @IsOptional()
  @IsString()
  clientId?: string;
}
