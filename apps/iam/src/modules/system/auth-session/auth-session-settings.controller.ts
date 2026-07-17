import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { AuthSessionSettingsService } from './auth-session-settings.service';
import { UpdateAuthSessionSettingsDto } from './dto/update-auth-session-settings.dto';
import { UpdateApplicationPortalSessionTtlDto } from './dto/update-application-portal-session-ttl.dto';

@Controller('system/auth-session-settings')
export class AuthSessionSettingsController {
  constructor(private readonly settings: AuthSessionSettingsService) {}

  @Get()
  getSettings() {
    return this.settings.getSettingsView();
  }

  @Patch()
  update(@Body() dto: UpdateAuthSessionSettingsDto) {
    return this.settings.update(dto);
  }

  @Patch('applications/:applicationId/portal-session-ttl')
  updateApplicationPortalTtl(
    @Param('applicationId') applicationId: string,
    @Body() dto: UpdateApplicationPortalSessionTtlDto,
  ) {
    return this.settings.updateApplicationPortalTtl(applicationId, dto);
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  reset() {
    return this.settings.resetToEnvDefaults();
  }
}
