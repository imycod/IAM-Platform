import { Controller, ForbiddenException, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { OidcBearerGuard } from '../../security/guards/oidc-bearer.guard';
import { UserContextService } from './user-context.service';
import { DataPermissionService } from '../data-permission/services/data-permission.service';
import { ApplicationService } from '../../application/services/application.service';

interface AuthedRequest extends Request {
  user: { id: string };
}

@Controller('me')
@UseGuards(OidcBearerGuard)
export class UserContextController {
  constructor(
    private readonly userContextService: UserContextService,
    private readonly dataPermissionService: DataPermissionService,
    private readonly applicationService: ApplicationService,
  ) {}

  @Get('permissions')
  permissions(@Req() req: AuthedRequest, @Query('applicationId') applicationId?: string) {
    return this.userContextService.resolvePermissions(req.user.id, applicationId);
  }

  @Get('menus')
  menus(
    @Req() req: AuthedRequest,
    @Query('applicationId') applicationId: string,
    @Query('tree') tree?: string,
  ) {
    return this.userContextService.resolveVisibleMenus(req.user.id, applicationId, tree === 'true');
  }

  // IAM 侧 — 建议新增（伪代码，当前仓库还没有）
  @Get('data-scope')
  @UseGuards(OidcBearerGuard)
  async dataScope(
    @Req() req: AuthedRequest,
    @Query('resource') resource: string,
    @Query('applicationId') applicationId?: string,
  ) {
    if (!applicationId) {
      throw new ForbiddenException('applicationId 必填');
    }
    await this.applicationService.assertUserCanAccess(applicationId, req.user.id);
    return this.dataPermissionService.resolveForUser(req.user.id, resource);
  }
}
