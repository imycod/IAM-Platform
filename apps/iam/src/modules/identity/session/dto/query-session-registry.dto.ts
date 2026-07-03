import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '@app/common';
import { UnifiedSessionKind } from '../session-kind.enum';

export class QuerySessionRegistryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsEnum(UnifiedSessionKind)
  kind?: UnifiedSessionKind;
}
