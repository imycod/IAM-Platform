import { IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateApplicationMenuDto {
  @IsOptional()
  @IsString()
  parentId?: string;

  @IsString()
  @Length(1, 100)
  name: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  path?: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  icon?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  permissionCode?: string;
}
