import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  @MaxLength(26)
  userId: string;

  @IsString()
  @MaxLength(26)
  organizationId: string;

  @IsOptional()
  @IsString()
  @MaxLength(26)
  departmentId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(26)
  positionId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  employeeNo?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;

  @IsOptional()
  @IsDateString()
  hiredAt?: string | null;
}

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  @MaxLength(26)
  departmentId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(26)
  positionId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  employeeNo?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;

  @IsOptional()
  @IsDateString()
  hiredAt?: string | null;
}

export class QueryEmployeeDto {
  @IsOptional()
  @IsString()
  @MaxLength(26)
  organizationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(26)
  userId?: string;
}
