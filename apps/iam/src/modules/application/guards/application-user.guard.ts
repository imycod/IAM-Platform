import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ApplicationService } from '../services/application.service';

/**
 * 校验 request.user 是否具备 application_user 进门资格。
 * 需与 OidcBearerGuard 联用（前置），applicationId 来自路由 params / query / x-application-id。
 */
@Injectable()
export class ApplicationUserGuard implements CanActivate {
  constructor(private readonly applicationService: ApplicationService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId: string | undefined = request.user?.id;
    if (!userId) {
      throw new UnauthorizedException('未认证');
    }

    const applicationId: string | undefined =
      request.params?.applicationId ??
      request.query?.applicationId ??
      request.headers?.['x-application-id'];

    if (!applicationId) {
      throw new ForbiddenException('缺少 applicationId');
    }

    await this.applicationService.assertUserCanAccess(applicationId, userId);
    return true;
  }
}
