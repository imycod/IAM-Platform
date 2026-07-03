import { IsEmail, IsEnum, IsOptional, IsString, Length, ValidateIf } from 'class-validator';
import { ApplicationUserStatus } from '../entities/application-user.entity';

export class CreateApplicationUserDto {
  @ValidateIf((dto: CreateApplicationUserDto) => !dto.email)
  @IsString()
  @Length(26, 26)
  userId?: string;

  @ValidateIf((dto: CreateApplicationUserDto) => !dto.userId)
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Length(26, 26)
  applicationRoleId?: string;

  @IsOptional()
  @IsEnum(ApplicationUserStatus)
  status?: ApplicationUserStatus;

  /** 由路由参数注入，无需客户端传递 */
  applicationId?: string;
}
