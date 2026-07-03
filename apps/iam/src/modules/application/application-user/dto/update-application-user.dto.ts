import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { ApplicationUserStatus } from '../entities/application-user.entity';

export class UpdateApplicationUserDto {
  @IsOptional()
  @IsEnum(ApplicationUserStatus)
  status?: ApplicationUserStatus;

  @IsOptional()
  @IsString()
  @Length(26, 26)
  applicationRoleId?: string | null;
}
