import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { OidcService } from '../oidc/services/oidc.service';

/**
 * 校验 Authorization: Bearer <oidc_access_token>，将 accountId 写入 request.user.id。
 */
@Injectable()
export class OidcBearerGuard implements CanActivate {
  constructor(private readonly oidcService: OidcService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header: string | undefined = request.headers?.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('缺少 Bearer access_token');
    }

    const accessToken = header.slice('Bearer '.length).trim();
    if (!accessToken) {
      throw new UnauthorizedException('access_token 为空');
    }

    const provider = await this.oidcService.getProvider();
    const stored = await provider.AccessToken.find(accessToken);
    if (!stored) {
      throw new UnauthorizedException('access_token 无效');
    }

    if (stored.isExpired) {
      throw new UnauthorizedException('access_token 已过期');
    }

    const accountId = stored.accountId;
    if (!accountId) {
      throw new UnauthorizedException('access_token 缺少 accountId');
    }

    request.user = { id: accountId };
    return true;
  }
}
