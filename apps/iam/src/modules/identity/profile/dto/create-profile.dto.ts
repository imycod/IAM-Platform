import { IsString, Length } from 'class-validator';
import { UpsertProfileDto } from './upsert-profile.dto';

export class CreateProfileDto extends UpsertProfileDto {
  @IsString()
  @Length(26, 26)
  userId: string;
}
