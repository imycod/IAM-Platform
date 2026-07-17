import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { createAuthSessionTerminatedException } from '@app/common';
import { AuthService } from '../../../identity/auth/services/auth.service';
import { OidcService } from '../../../security/oidc/services/oidc.service';

/**
 * 同时接受 OIDC access_token 与 portal session token。
 * OIDC 优先（flow-admin / iam-client SSO 共用 IAM 会话签发的 token）。
 */
@Injectable()
export class PortalOrOidcGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly oidcService: OidcService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header: string | undefined = request.headers?.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('缺少 Bearer token');
    }

    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedException('token 为空');
    }

    const provider = await this.oidcService.getProvider();
    const stored = await provider.AccessToken.find(token);
    if (stored) {
      if (stored.isExpired) {
        throw createAuthSessionTerminatedException('访问令牌已过期，请重新登录');
      }
      if (stored.accountId) {
        request.user = { id: stored.accountId };
        return true;
      }
    }

    try {
      const user = await this.authService.assertPortalSession(token);
      request.user = { id: user.id };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw createAuthSessionTerminatedException('token 无效或已过期');
    }
  }
}
