import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ProfileService } from '../services/profile.service';
import { UpsertProfileDto } from '../dto/upsert-profile.dto';

@Controller('users/:userId/profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  get(@Param('userId') userId: string) {
    return this.profileService.getByUserId(userId);
  }

  @Put()
  upsert(@Param('userId') userId: string, @Body() dto: UpsertProfileDto) {
    return this.profileService.upsert(userId, dto);
  }
}
