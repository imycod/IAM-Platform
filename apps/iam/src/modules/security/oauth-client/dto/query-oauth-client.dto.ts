import { PaginationQueryDto } from '@app/common';
import { IsOptional, IsString, Length } from 'class-validator';

export class QueryOauthClientDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @Length(26, 26)
  applicationId?: string;

  @IsOptional()
  @IsString()
  clientId?: string;
}
