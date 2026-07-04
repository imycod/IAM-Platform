import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTeamDto {
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
  @MaxLength(500)
  description?: string | null;
}

export class UpdateTeamDto {
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
  @MaxLength(500)
  description?: string | null;
}

export class QueryTeamDto {
  @IsOptional()
  @IsString()
  @MaxLength(26)
  organizationId?: string;
}

export class AddTeamMemberDto {
  @IsString()
  @MaxLength(26)
  employeeId: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  roleInTeam?: string | null;
}
