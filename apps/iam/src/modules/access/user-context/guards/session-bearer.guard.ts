import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createAuthSessionTerminatedException } from '@app/common';
import { AuthService } from '../../../identity/auth/services/auth.service';

/**
 * 校验 Authorization: Bearer <portal_session_token>，将 userId 写入 request.user.id。
 * 供 iam-client 等门户 SPA 使用（/auth/login 签发的 session token）。
 */
@Injectable()
export class SessionBearerGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header: string | undefined = request.headers?.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('缺少 Bearer session token');
    }

    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedException('session token 为空');
    }

    try {
      const user = await this.authService.assertPortalSession(token);
      request.user = { id: user.id };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw createAuthSessionTerminatedException('session 无效或已过期');
    }
  }
}
