import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from '../../identity/auth/services/auth.service';
import { UserEntity } from '../../identity/user/entities/user.entity';
import { ApplicationEntity } from '../../application/application/entities/application.entity';
import { ApplicationService } from '../../application/services/application.service';
import { PermissionService } from '../permission/services/permission.service';
import { RoleService } from '../role/services/role.service';
import { UserContextService } from './user-context.service';
import { PortalMenuService } from './portal-menu.service';
import { PortalOrOidcGuard } from './guards/portal-or-oidc.guard';
import { OidcBearerGuard } from '../../security/guards/oidc-bearer.guard';
import type { VisibleMenuNode } from './user-context.service';

interface AuthedRequest extends Request {
  user: { id: string };
}

class PortalLoginDto {
  @IsString()
  username: string;

  @IsString()
  @MinLength(1)
  password: string;

  @IsOptional()
  @IsString()
  appCode?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}

/** iam-client 门户：支持 OIDC SSO 与账密 session 两种登录 */
@Controller('portal')
export class PortalController {
  constructor(
    private readonly authService: AuthService,
    private readonly applicationService: ApplicationService,
    private readonly permissionService: PermissionService,
    private readonly roleService: RoleService,
    private readonly userContextService: UserContextService,
    private readonly portalMenuService: PortalMenuService,
    @InjectRepository(ApplicationEntity)
    private readonly appRepo: Repository<ApplicationEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  private async resolveApp(appCode?: string): Promise<ApplicationEntity> {
    const code = appCode ?? 'iam-admin';
    const app = await this.appRepo.findOne({ where: { code } });
    if (!app) {
      throw new NotFoundException(`应用 ${code} 不存在，请先运行 pnpm seed:iam-admin`);
    }
    return app;
  }

  private async buildPortalUserData(userId: string, app: ApplicationEntity, accessToken: string, refreshToken?: string) {
    await this.applicationService.assertUserCanAccess(app.id, userId);
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }
    const permissions = await this.permissionService.resolveUserPermissionCodes(userId, app.id);
    const roles = await this.roleService.getUserRoles(userId);
    const roleCodes = roles
      .filter((r) => !r.applicationId || r.applicationId === app.id)
      .map((r) => r.code);

    return {
      avatar: '',
      username: user.email ?? user.id,
      nickname: user.name ?? user.email ?? user.id,
      roles: roleCodes,
      permissions,
      accessToken,
      refreshToken: refreshToken ?? accessToken,
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      applicationId: app.id,
      applicationCode: app.code,
    };
  }

  /** 账密登录（非 SSO，独立 session） */
  @Post('login')
  async login(@Body() dto: PortalLoginDto, @Req() req: Request) {
    const email = dto.email ?? dto.username;
    const app = await this.resolveApp(dto.appCode);

    const result = await this.authService.login(email, dto.password, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const data = await this.buildPortalUserData(result.user.id, app, result.token, result.token);
    return { success: true, data: { ...data, expires: result.expiresAt } };
  }

  /** OIDC 回调后拉取用户信息（Bearer = OIDC access_token） */
  @Get('oidc-bootstrap')
  @UseGuards(OidcBearerGuard)
  async oidcBootstrap(@Req() req: AuthedRequest, @Query('appCode') appCode?: string) {
    const app = await this.resolveApp(appCode);
    const header = req.headers.authorization ?? '';
    const accessToken = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    const data = await this.buildPortalUserData(req.user.id, app, accessToken, accessToken);
    return { success: true, data };
  }

  /** 动态路由（OIDC access_token 或 portal session 均可） */
  @Get('get-async-routes')
  @UseGuards(PortalOrOidcGuard)
  async asyncRoutes(
    @Req() req: AuthedRequest,
    @Query('appCode') appCode?: string,
    @Query('applicationId') applicationId?: string,
  ) {
    let app: ApplicationEntity | null = null;
    if (applicationId) {
      app = await this.appRepo.findOne({ where: { id: applicationId } });
    } else {
      app = await this.resolveApp(appCode);
    }
    if (!app) {
      throw new NotFoundException('应用不存在');
    }

    const menus = (await this.userContextService.resolveVisibleMenus(
      req.user.id,
      app.id,
      true,
    )) as VisibleMenuNode[];

    return { success: true, data: this.portalMenuService.toPureAdminRoutes(menus) };
  }
}

