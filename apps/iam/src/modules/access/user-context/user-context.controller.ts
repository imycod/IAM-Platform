import { Controller, ForbiddenException, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { PortalOrOidcGuard } from './guards/portal-or-oidc.guard';
import { UserContextService } from './user-context.service';
import { DataPermissionService } from '../data-permission/services/data-permission.service';
import { ApplicationService } from '../../application/services/application.service';

interface AuthedRequest extends Request {
  user: { id: string };
}

@Controller('me')
@UseGuards(PortalOrOidcGuard)
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

  // 兼容旧客户端：返回 scope + 标准化 filters
  @Get('data-scope')
  async dataScope(
    @Req() req: AuthedRequest,
    @Query('resource') resource: string,
    @Query('applicationId') applicationId?: string,
  ) {
    if (!applicationId) {
      throw new ForbiddenException('applicationId 必填');
    }
    if (!resource?.trim()) {
      throw new ForbiddenException('resource 必填');
    }
    await this.applicationService.assertUserCanAccess(applicationId, req.user.id);
    const resourceCode = resource.trim();
    const scope = await this.dataPermissionService.resolveForUser(
      req.user.id,
      resourceCode,
      applicationId,
    );
    const filters = await this.dataPermissionService.resolveFiltersForUser(
      req.user.id,
      resourceCode,
      applicationId,
    );
    return { ...scope, filters: filters.filters, groups: filters.groups, unrestricted: filters.unrestricted, denyAll: filters.denyAll };
  }

  /** 标准数据权限 API：返回 ABAC filters，业务系统映射字段后拼 SQL */
  @Get('data-filters')
  async dataFilters(
    @Req() req: AuthedRequest,
    @Query('resource') resource: string,
    @Query('applicationId') applicationId?: string,
  ) {
    if (!applicationId) {
      throw new ForbiddenException('applicationId 必填');
    }
    if (!resource?.trim()) {
      throw new ForbiddenException('resource 必填');
    }
    await this.applicationService.assertUserCanAccess(applicationId, req.user.id);
    return this.dataPermissionService.resolveFiltersForUser(
      req.user.id,
      resource.trim(),
      applicationId,
    );
  }
}
