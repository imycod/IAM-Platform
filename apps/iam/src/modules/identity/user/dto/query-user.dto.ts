import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '@app/common';
import { UserStatus } from '../entities/user.entity';

export class QueryUserDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
