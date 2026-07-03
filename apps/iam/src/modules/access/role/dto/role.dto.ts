import { IsArray, IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { RoleType } from '../entities/role.entity';

export class CreateRoleDto {
  @IsOptional()
  @IsString()
  applicationId?: string;

  @IsString()
  @Length(1, 100)
  name: string;

  @IsString()
  @Length(1, 50)
  code: string;

  @IsOptional()
  @IsEnum(RoleType)
  type?: RoleType;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;
}

export class SetPermissionsDto {
  @IsArray()
  @IsString({ each: true })
  permissionIds: string[];
}

export class AssignRoleDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  applicationId?: string;
}
