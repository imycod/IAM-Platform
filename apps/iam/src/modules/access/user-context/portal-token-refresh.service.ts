import { Injectable, NotFoundException } from '@nestjs/common';
import { createAuthSessionTerminatedException } from '@app/common';
import { AuthService } from '../../identity/auth/services/auth.service';
import { ApplicationEntity } from '../../application/application/entities/application.entity';
import { OauthClientService } from '../../security/oauth-client/services/oauth-client.service';
import { OidcService } from '../../security/oidc/services/oidc.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

export interface PortalRefreshResult {
  accessToken: string;
  refreshToken: string;
  expires: Date;
}

@Injectable()
export class PortalTokenRefreshService {
  constructor(
    private readonly authService: AuthService,
    private readonly oidcService: OidcService,
    private readonly oauthClientService: OauthClientService,
    @InjectRepository(ApplicationEntity)
    private readonly appRepo: Repository<ApplicationEntity>,
  ) {}

  private async resolveApp(appCode?: string): Promise<ApplicationEntity> {
    const code = appCode ?? 'iam-admin';
    const app = await this.appRepo.findOne({ where: { code } });
    if (!app) {
      throw new NotFoundException(`应用 ${code} 不存在`);
    }
    return app;
  }

  async refresh(refreshToken: string, appCode?: string): Promise<PortalRefreshResult> {
    const app = await this.resolveApp(appCode);

    const portal = await this.authService.refreshPortalSessionIfApplicable(refreshToken);
    if (portal) {
      return {
        accessToken: portal.token,
        refreshToken: portal.token,
        expires: portal.expiresAt,
      };
    }

    const client = await this.oauthClientService.findByApplicationId(app.id);
    if (client?.clientId) {
      const oidc = await this.oidcService.refreshAccessToken(client.clientId, refreshToken);
      if (oidc) {
        const expires = new Date(Date.now() + oidc.expires_in * 1000);
        return {
          accessToken: oidc.access_token,
          refreshToken: oidc.refresh_token ?? refreshToken,
          expires,
        };
      }
      throw createAuthSessionTerminatedException('登录会话已过期，请重新登录');
    }

    throw createAuthSessionTerminatedException('登录会话已失效，请重新登录');
  }
}
