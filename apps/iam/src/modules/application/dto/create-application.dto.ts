import { IsIn, IsOptional, IsString, Length } from 'class-validator';

export class CreateApplicationDto {
  @IsString()
  @Length(1, 100)
  name: string;

  @IsString()
  @Length(1, 50)
  code: string;

  @IsOptional()
  @IsString()
  type?: string;

  /** 不传时实体默认 active */
  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive', 'disabled'])
  status?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
