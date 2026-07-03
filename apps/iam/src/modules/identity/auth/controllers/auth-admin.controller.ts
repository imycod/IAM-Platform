import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { IsString, Length, MinLength } from 'class-validator';
import { AccountService } from '../../account/services/account.service';
import { SessionService } from '../../session/services/session.service';
import { QueryAccountDto } from '../../account/dto/query-account.dto';
import { QuerySessionDto } from '../../session/dto/query-session.dto';
import {
  CreateCredentialAdminDto,
  UpdateCredentialAdminDto,
} from '../dto/auth-admin.dto';
import { AuthAdminService } from '../services/auth-admin.service';

class ResetPasswordDto {
  @IsString()
  @Length(26, 26)
  userId: string;

  @IsString()
  @MinLength(6)
  password: string;
}

/** 身份认证管理：凭证账户与活跃会话。 */
@Controller('auth/admin')
export class AuthAdminController {
  constructor(
    private readonly accountService: AccountService,
    private readonly sessionService: SessionService,
    private readonly authAdminService: AuthAdminService,
  ) {}

  @Get('credentials')
  listCredentials(@Query() query: QueryAccountDto) {
    return this.accountService.findManyCredentials(query);
  }

  @Post('credentials')
  createCredential(@Body() dto: CreateCredentialAdminDto) {
    return this.authAdminService.createCredential(dto);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.accountService.resetCredentialPassword(dto.userId, dto.password);
  }

  @Patch('credentials/:id')
  updateCredential(@Param('id') id: string, @Body() dto: UpdateCredentialAdminDto) {
    return this.authAdminService.updateCredential(id, dto);
  }

  @Delete('credentials/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeCredential(@Param('id') id: string) {
    return this.accountService.remove(id);
  }

  @Get('sessions')
  listSessions(@Query() query: QuerySessionDto) {
    return this.sessionService.findMany(query);
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  revokeSession(@Param('id') id: string) {
    return this.sessionService.remove(id);
  }
}
