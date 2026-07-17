import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AuthSessionConfig } from '@app/config';
import { ApplicationEntity } from '../../application/application/entities/application.entity';
import { SystemConfigService } from '../system-config.service';
import {
  AUTH_SESSION_CONFIG_GROUP,
  AUTH_SESSION_CONFIG_KEYS,
} from './auth-session-config.keys';
import type { UpdateAuthSessionSettingsDto } from './dto/update-auth-session-settings.dto';
import type { UpdateApplicationPortalSessionTtlDto } from './dto/update-application-portal-session-ttl.dto';

export interface AuthSessionEffectiveSettings {
  /** 账密门户 session 全局默认 TTL（秒） */
  portalSessionTtlSeconds: number;
  /** OIDC SSO Session / Grant / Interaction */
  oidcSessionTtlSeconds: number;
  /** OIDC AccessToken / IdToken */
  oidcAccessTokenTtlSeconds: number;
  /** OIDC RefreshToken */
  oidcRefreshTokenTtlSeconds: number;
  oidcAuthorizationCodeTtlSeconds: number;
  envDefaults: AuthSessionConfig;
  overrides: {
    portalSessionTtlSeconds: boolean;
    oidcSessionTtlSeconds: boolean;
    oidcAccessTokenTtlSeconds: boolean;
    oidcRefreshTokenTtlSeconds: boolean;
    oidcAuthorizationCodeTtlSeconds: boolean;
  };
}

export interface ApplicationPortalSessionPolicy {
  applicationId: string;
  applicationCode: string;
  applicationName: string;
  /** 应用级覆盖（秒），null = 未覆盖 */
  portalSessionTtlSeconds: number | null;
  /** 实际生效（覆盖 ?? 全局默认） */
  effectivePortalSessionTtlSeconds: number;
}

export interface AuthSessionSettingsView extends AuthSessionEffectiveSettings {
  applicationPortalPolicies: ApplicationPortalSessionPolicy[];
}

@Injectable()
export class AuthSessionSettingsService {
  private readonly changeListeners = new Set<() => void>();

  constructor(
    private readonly config: ConfigService,
    private readonly systemConfig: SystemConfigService,
    @InjectRepository(ApplicationEntity)
    private readonly applicationRepo: Repository<ApplicationEntity>,
  ) {}

  registerOnChange(listener: () => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  private notifyChange(): void {
    for (const fn of this.changeListeners) {
      fn();
    }
  }

  private envDefaults(): AuthSessionConfig {
    return this.config.getOrThrow<AuthSessionConfig>('authSession');
  }

  private parseDbSeconds(raw: string | null): number | null {
    if (raw === null || raw === '') {
      return null;
    }
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 1 ? n : null;
  }

  async getEffective(): Promise<AuthSessionEffectiveSettings> {
    const env = this.envDefaults();
    const [portalDb, oidcDb, accessDb, refreshDb, codeDb] = await Promise.all([
      this.systemConfig.get(AUTH_SESSION_CONFIG_KEYS.portalTtlSeconds),
      this.systemConfig.get(AUTH_SESSION_CONFIG_KEYS.oidcTtlSeconds),
      this.systemConfig.get(AUTH_SESSION_CONFIG_KEYS.oidcAccessTokenTtlSeconds),
      this.systemConfig.get(AUTH_SESSION_CONFIG_KEYS.oidcRefreshTokenTtlSeconds),
      this.systemConfig.get(AUTH_SESSION_CONFIG_KEYS.oidcAuthorizationCodeTtlSeconds),
    ]);

    const portalParsed = this.parseDbSeconds(portalDb);
    const oidcParsed = this.parseDbSeconds(oidcDb);
    const accessParsed = this.parseDbSeconds(accessDb);
    const refreshParsed = this.parseDbSeconds(refreshDb);
    const codeParsed = this.parseDbSeconds(codeDb);

    const oidcAccessTokenTtlSeconds = accessParsed ?? env.oidcAccessTokenTtlSeconds;
    const oidcRefreshTokenTtlSeconds = refreshParsed ?? env.oidcRefreshTokenTtlSeconds;

    return {
      portalSessionTtlSeconds: portalParsed ?? env.portalSessionTtlSeconds,
      oidcSessionTtlSeconds: oidcParsed ?? env.oidcSessionTtlSeconds,
      oidcAccessTokenTtlSeconds,
      oidcRefreshTokenTtlSeconds,
      oidcAuthorizationCodeTtlSeconds:
        codeParsed ?? env.oidcAuthorizationCodeTtlSeconds,
      envDefaults: env,
      overrides: {
        portalSessionTtlSeconds: portalParsed !== null,
        oidcSessionTtlSeconds: oidcParsed !== null,
        oidcAccessTokenTtlSeconds: accessParsed !== null,
        oidcRefreshTokenTtlSeconds: refreshParsed !== null,
        oidcAuthorizationCodeTtlSeconds: codeParsed !== null,
      },
    };
  }

  /** 账密门户 session：按应用覆盖，无覆盖则用全局默认 */
  async resolvePortalSessionTtlSeconds(applicationId?: string | null): Promise<number> {
    const globalDefault = (await this.getEffective()).portalSessionTtlSeconds;
    if (!applicationId) {
      return globalDefault;
    }
    const app = await this.applicationRepo.findOne({ where: { id: applicationId } });
    if (!app?.portalSessionTtlSeconds) {
      return globalDefault;
    }
    return app.portalSessionTtlSeconds;
  }

  async getSettingsView(): Promise<AuthSessionSettingsView> {
    const effective = await this.getEffective();
    const apps = await this.applicationRepo.find({ order: { code: 'ASC' } });
    const applicationPortalPolicies: ApplicationPortalSessionPolicy[] = apps.map((app) => ({
      applicationId: app.id,
      applicationCode: app.code,
      applicationName: app.name,
      portalSessionTtlSeconds: app.portalSessionTtlSeconds,
      effectivePortalSessionTtlSeconds:
        app.portalSessionTtlSeconds ?? effective.portalSessionTtlSeconds,
    }));
    return { ...effective, applicationPortalPolicies };
  }

  async getSnapshot(): Promise<string> {
    const effective = await this.getEffective();
    const apps = await this.applicationRepo.find({
      select: ['id', 'portalSessionTtlSeconds'],
    });
    return JSON.stringify({
      portal: effective.portalSessionTtlSeconds,
      oidcSession: effective.oidcSessionTtlSeconds,
      oidcAccess: effective.oidcAccessTokenTtlSeconds,
      oidcRefresh: effective.oidcRefreshTokenTtlSeconds,
      code: effective.oidcAuthorizationCodeTtlSeconds,
      appPortal: apps.map((a) => [a.id, a.portalSessionTtlSeconds]),
    });
  }

  private assertOidcRefreshNotShorterThanAccess(
    accessSeconds: number,
    refreshSeconds: number,
  ): void {
    if (refreshSeconds < accessSeconds) {
      throw new BadRequestException(
        'OIDC RefreshToken 有效期不能短于 AccessToken 有效期',
      );
    }
  }

  async update(dto: UpdateAuthSessionSettingsDto): Promise<AuthSessionSettingsView> {
    const current = await this.getEffective();
    const nextAccess =
      dto.oidcAccessTokenTtlSeconds ?? current.oidcAccessTokenTtlSeconds;
    const nextRefresh =
      dto.oidcRefreshTokenTtlSeconds ?? current.oidcRefreshTokenTtlSeconds;
    if (
      dto.oidcAccessTokenTtlSeconds !== undefined ||
      dto.oidcRefreshTokenTtlSeconds !== undefined
    ) {
      this.assertOidcRefreshNotShorterThanAccess(nextAccess, nextRefresh);
    }

    const descriptions: Record<string, string> = {
      [AUTH_SESSION_CONFIG_KEYS.portalTtlSeconds]:
        '账密门户 session 全局默认有效期（秒）',
      [AUTH_SESSION_CONFIG_KEYS.oidcTtlSeconds]:
        'OIDC SSO Session / Grant / Interaction 有效期（秒）',
      [AUTH_SESSION_CONFIG_KEYS.oidcAccessTokenTtlSeconds]:
        'OIDC AccessToken / IdToken 有效期（秒）',
      [AUTH_SESSION_CONFIG_KEYS.oidcRefreshTokenTtlSeconds]:
        'OIDC RefreshToken 有效期（秒）',
      [AUTH_SESSION_CONFIG_KEYS.oidcAuthorizationCodeTtlSeconds]:
        'OIDC 授权码 AuthorizationCode 有效期（秒）',
    };

    const entries: Array<{ key: string; value: number | undefined }> = [
      { key: AUTH_SESSION_CONFIG_KEYS.portalTtlSeconds, value: dto.portalSessionTtlSeconds },
      { key: AUTH_SESSION_CONFIG_KEYS.oidcTtlSeconds, value: dto.oidcSessionTtlSeconds },
      {
        key: AUTH_SESSION_CONFIG_KEYS.oidcAccessTokenTtlSeconds,
        value: dto.oidcAccessTokenTtlSeconds,
      },
      {
        key: AUTH_SESSION_CONFIG_KEYS.oidcRefreshTokenTtlSeconds,
        value: dto.oidcRefreshTokenTtlSeconds,
      },
      {
        key: AUTH_SESSION_CONFIG_KEYS.oidcAuthorizationCodeTtlSeconds,
        value: dto.oidcAuthorizationCodeTtlSeconds,
      },
    ];

    for (const { key, value } of entries) {
      if (value === undefined) {
        continue;
      }
      await this.systemConfig.upsertByKey({
        configKey: key,
        configValue: String(value),
        configGroup: AUTH_SESSION_CONFIG_GROUP,
        valueType: 'number',
        description: descriptions[key],
        isPublic: false,
      });
    }

    this.notifyChange();
    return this.getSettingsView();
  }

  async updateApplicationPortalTtl(
    applicationId: string,
    dto: UpdateApplicationPortalSessionTtlDto,
  ): Promise<AuthSessionSettingsView> {
    const app = await this.applicationRepo.findOne({ where: { id: applicationId } });
    if (!app) {
      throw new NotFoundException('应用不存在');
    }
    if (dto.portalSessionTtlSeconds === undefined) {
      return this.getSettingsView();
    }
    app.portalSessionTtlSeconds = dto.portalSessionTtlSeconds;
    await this.applicationRepo.save(app);
    return this.getSettingsView();
  }

  async resetToEnvDefaults(): Promise<AuthSessionSettingsView> {
    await Promise.all(
      Object.values(AUTH_SESSION_CONFIG_KEYS).map((key) => this.systemConfig.removeByKey(key)),
    );
    this.notifyChange();
    return this.getSettingsView();
  }
}
