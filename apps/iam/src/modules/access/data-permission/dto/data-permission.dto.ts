import { IsBoolean, IsEnum, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { DataScope } from '../entities/data-permission.entity';

export class CreateDataPermissionDto {
  @IsString()
  roleId: string;

  @IsString()
  @MaxLength(50)
  resource: string;

  @IsEnum(DataScope)
  scope: DataScope;

  @IsOptional()
  @IsObject()
  customExpr?: Record<string, unknown> | null;

  /** scope=all 时：true 跨组织可见，false 仅本组织内全部（默认） */
  @IsOptional()
  @IsBoolean()
  unrestricted?: boolean;
}

export class UpdateDataPermissionDto {
  @IsOptional()
  @IsString()
  roleId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  resource?: string;

  @IsOptional()
  @IsEnum(DataScope)
  scope?: DataScope;

  @IsOptional()
  @IsObject()
  customExpr?: Record<string, unknown> | null;

  @IsOptional()
  @IsBoolean()
  unrestricted?: boolean;
}
