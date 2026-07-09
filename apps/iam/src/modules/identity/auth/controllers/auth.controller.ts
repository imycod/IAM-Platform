import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { OidcSessionAdminService } from '../../../security/oidc/services/oidc-session-admin.service';
import { OidcBearerGuard } from '../../../security/guards/oidc-bearer.guard';
import { AuthService } from '../services/auth.service';

class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  nickname?: string;
}

class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly oidcSessionAdmin: OidcSessionAdminService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const user = await this.authService.register(dto);
    return { id: user.id, email: user.email };
  }

  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto.email, dto.password, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('logout')
  async logout(@Body('token') token: string) {
    await this.authService.logout(token);
    return { success: true };
  }

  /**
   * 业务系统本地退出：仅吊销当前 Bearer access_token，不销毁 IdP SSO Session。
   * 全局退出请走 /oidc/session/end（RP-Initiated Logout）。
   */
  @Post('oidc-local-logout')
  @UseGuards(OidcBearerGuard)
  async oidcLocalLogout(@Req() req: Request) {
    const header = req.headers.authorization ?? '';
    const accessToken = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (accessToken) {
      await this.oidcSessionAdmin.revokeAccessTokenOnly(accessToken);
    }
    return { success: true };
  }
}
