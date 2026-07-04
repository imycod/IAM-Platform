import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsString()
  @MaxLength(50)
  code: string;

  @IsOptional()
  @IsString()
  @MaxLength(26)
  parentId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;
}

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(26)
  parentId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;
}
