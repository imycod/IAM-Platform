import { IsEnum, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
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
}
