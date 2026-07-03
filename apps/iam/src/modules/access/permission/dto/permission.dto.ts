import { IsOptional, IsString, Length } from 'class-validator';

export class CreatePermissionDto {
  @IsOptional()
  @IsString()
  applicationId?: string;

  @IsString()
  @Length(1, 100)
  name: string;

  @IsString()
  @Length(1, 100)
  code: string;

  @IsString()
  @Length(1, 50)
  resource: string;

  @IsString()
  @Length(1, 50)
  action: string;
}

export class UpdatePermissionDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  code?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  resource?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  action?: string;
}

export class QueryPermissionDto {
  @IsOptional()
  @IsString()
  applicationId?: string;

  @IsOptional()
  @IsString()
  resource?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;
}
