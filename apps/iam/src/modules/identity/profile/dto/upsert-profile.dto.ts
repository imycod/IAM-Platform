import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { Gender } from '../entities/profile.entity';

export class UpsertProfileDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  nickname?: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  avatar?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsString()
  birthday?: string;

  @IsOptional()
  @IsString()
  @Length(1, 10)
  language?: string;

  @IsOptional()
  @IsString()
  @Length(1, 64)
  timezone?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  bio?: string;
}
