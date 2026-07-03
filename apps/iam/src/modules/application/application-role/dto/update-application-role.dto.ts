import { IsArray, IsOptional, IsString, Length } from 'class-validator';

export class UpdateApplicationRoleDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;
}

export class SetApplicationRolePermissionsDto {
  @IsArray()
  @IsString({ each: true })
  permissionIds: string[];
}
