import { PartialType } from '@nestjs/mapped-types';
import { UpsertProfileDto } from './upsert-profile.dto';

export class UpdateProfileDto extends PartialType(UpsertProfileDto) {}
