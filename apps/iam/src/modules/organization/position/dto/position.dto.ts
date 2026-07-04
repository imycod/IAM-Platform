import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreatePositionDto {
  @IsString()
  @MaxLength(26)
  organizationId: string;

  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(50)
  code: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  level?: number;
}

export class UpdatePositionDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  level?: number;
}

export class QueryPositionDto {
  @IsOptional()
  @IsString()
  @MaxLength(26)
  organizationId?: string;
}
