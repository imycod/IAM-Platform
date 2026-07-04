import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  @MaxLength(26)
  organizationId: string;

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
  @MaxLength(26)
  leaderEmployeeId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;
}

export class UpdateDepartmentDto {
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
  @MaxLength(26)
  leaderEmployeeId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;
}

export class QueryDepartmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(26)
  organizationId?: string;
}
