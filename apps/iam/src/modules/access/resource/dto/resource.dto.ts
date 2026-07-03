import { IsObject, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class CreateResourceDto {
  @IsString()
  @Length(1, 100)
  name: string;

  @IsString()
  @Length(1, 50)
  code: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  type?: string;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown> | null;
}

export class UpdateResourceDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  type?: string;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown> | null;
}

export class QueryResourceDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  type?: string;
}
