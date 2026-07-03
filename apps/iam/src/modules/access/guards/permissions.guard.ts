import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { PermissionService } from '../permission/services/permission.service';

/**
 * RBAC 权限守卫：读取 @RequirePermissions 元数据，校验 request.user 是否具备全部权限。
 * request.user 由认证守卫（identity/auth）注入。
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(REQUIRE_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId: string | undefined = request.user?.id;
    if (!userId) {
      throw new UnauthorizedException('未认证');
    }

    const applicationId: string | undefined =
      request.params?.applicationId ??
      request.headers?.['x-application-id'] ??
      request.query?.applicationId;
    const owned = await this.permissionService.resolveUserPermissionCodes(userId, applicationId);
    const ownedSet = new Set(owned);
    const missing = required.filter((code) => !ownedSet.has(code));
    if (missing.length > 0) {
      throw new ForbiddenException(`缺少权限: ${missing.join(', ')}`);
    }
    return true;
  }
}
