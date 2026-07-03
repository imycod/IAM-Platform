import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { RoleType } from '../entities/role.entity';

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  code?: string;

  @IsOptional()
  @IsEnum(RoleType)
  type?: RoleType;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string | null;
}
