import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Provider as OidcProvider } from 'oidc-provider';
import type { Request } from 'express';
import { dynamicImport } from '@app/common';
import type { AppConfig } from '@app/config';
import type { IOidcInteraction, OidcInteractionDetails, OidcLoginResult } from '@app/contracts';
import { UserEntity } from '../../../identity/user/entities/user.entity';
import { LoginHistoryService } from '../../../identity/login-history/services/login-history.service';
import { LoginType } from '../../../identity/login-history/entities/login-history.entity';
import { OidcPayloadEntity } from '../entities/oidc-payload.entity';
import { createOidcAdapter } from '../adapters/oidc-payload.adapter';
import { OauthClientService } from '../../oauth-client/services/oauth-client.service';
import { ApplicationService } from '../../../application/services/application.service';

type RequestListener = (req: unknown, res: unknown) => void;

type OidcAuthorizationContext = {
  req?: Request;
  oidc?: {
    session?: { accountId?: string; id?: string };
    client?: { clientId?: string };
  };
};

type OidcGrantContext = {
  req?: Request;
  oidc?: {
    client?: { clientId?: string };
    entities?: { AccessToken?: { jti?: string } };
  };
};

/**
 * security/oidc：封装 node-oidc-provider（ESM，懒加载）。
 * 只负责协议（签发 code/token、SSO session），不懂密码校验 —— 后者由 identity/auth 负责，
 * 两者通过 IOidcInteraction 契约在 interaction 桥接点交互。
 */
@Injectable()
export class OidcService implements IOidcInteraction {
  private readonly logger = new Logger(OidcService.name);
  private provider: OidcProvider | null = null;
  private callbackFn: RequestListener | null = null;
  /** oauth_client 变更检测：seed 新客户端后无需重启 IAM */
  private clientsSnapshot: string | null = null;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(OidcPayloadEntity)
    private readonly payloadRepo: Repository<OidcPayloadEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly oauthClientService: OauthClientService,
    private readonly applicationService: ApplicationService,
    private readonly loginHistoryService: LoginHistoryService,
  ) {}

  private async buildClientsSnapshot(): Promise<string> {
    const clients = await this.oauthClientService.toOidcClients();
    return JSON.stringify(
      clients
        .map((c) => ({ id: c.client_id, uris: c.redirect_uris.sort() }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    );
  }

  async getProvider(): Promise<OidcProvider> {
    const snapshot = await this.buildClientsSnapshot();
    if (this.provider && this.clientsSnapshot === snapshot) {
      return this.provider;
    }

    if (this.provider) {
      this.logger.log('检测到 oauth_client 变更，重新加载 node-oidc-provider');
      this.callbackFn = null;
    }

    const issuer = this.config.get<string>('OIDC_ISSUER') ?? 'http://localhost:3000/oidc';
    const cookieKeys = (this.config.get<string>('OIDC_COOKIE_KEYS') ?? 'dev-key-1,dev-key-2').split(
      ',',
    );
    const appCfg = this.config.getOrThrow<AppConfig>('app');
    const prefix = appCfg.globalPrefix;
    const iamLoginUrl = appCfg.iamLoginUrl;
    const clients = await this.oauthClientService.toOidcClients();
    const sessionTtlRaw = this.config.get<string>('OIDC_SESSION_TTL_SECONDS');
    const sessionTtlSeconds = sessionTtlRaw
      ? parseInt(sessionTtlRaw, 10)
      : 14 * 24 * 60 * 60;

    const mod = await dynamicImport<{
      default: new (issuer: string, config: unknown) => OidcProvider;
    }>('oidc-provider');
    const Provider = mod.default;

    this.clientsSnapshot = snapshot;
    this.provider = new Provider(issuer, {
      adapter: createOidcAdapter(this.payloadRepo),
      clients,
      claims: {
        openid: ['sub'],
        profile: ['name'],
        email: ['email', 'email_verified'],
      },
      features: {
        devInteractions: { enabled: false },
        revocation: { enabled: true },
        introspection: { enabled: true },
      },
      cookies: { keys: cookieKeys },
      ttl: {
        Session: sessionTtlSeconds,
        Grant: sessionTtlSeconds,
        AccessToken: sessionTtlSeconds,
        IdToken: sessionTtlSeconds,
        RefreshToken: sessionTtlSeconds,
        Interaction: sessionTtlSeconds,
      },
      interactions: {
        url: (_ctx: unknown, interaction: { uid: string }) =>
          iamLoginUrl
            ? `${iamLoginUrl}?uid=${encodeURIComponent(interaction.uid)}`
            : `/${prefix}/interaction/${interaction.uid}`,
      },
      /**
       * 演示环境：用户登录后自动建立 Grant 并授权请求的 scope，跳过 consent 确认页。
       * 否则 resume 到 /oidc/auth/:uid 后会再次进入 consent 交互，导致无法跳回 flow-admin。
       */
      loadExistingGrant: async (ctx: {
        oidc: {
          result?: { consent?: { grantId?: string } };
          session?: { accountId?: string; grantIdFor: (clientId: string) => string | undefined };
          client?: { clientId: string };
          provider: OidcProvider;
          requestParamOIDCScopes?: Set<string>;
        };
      }) => {
        const { oidc } = ctx;
        const existingId =
          oidc.result?.consent?.grantId ??
          (oidc.client ? oidc.session?.grantIdFor(oidc.client.clientId) : undefined);
        if (existingId) {
          return oidc.provider.Grant.find(existingId);
        }

        const accountId = oidc.session?.accountId;
        if (!accountId || !oidc.client) {
          return undefined;
        }

        const grant = new oidc.provider.Grant({
          accountId,
          clientId: oidc.client.clientId,
        });
        const scopes = oidc.requestParamOIDCScopes;
        if (scopes?.size) {
          for (const scope of scopes) {
            grant.addOIDCScope(scope);
          }
        } else {
          grant.addOIDCScope('openid');
          grant.addOIDCScope('profile');
          grant.addOIDCScope('email');
        }
        await grant.save();
        return grant;
      },
      findAccount: async (_ctx: unknown, id: string) => {
        const user = await this.userRepo.findOne({ where: { id } });
        return {
          accountId: id,
          claims: async () => ({
            sub: id,
            name: user?.name ?? undefined,
            email: user?.email ?? undefined,
            email_verified: user?.emailVerified ?? false,
          }),
        };
      },
    });
    this.provider.proxy = true;
    this.attachLoginAuditListeners(this.provider);
    this.logger.log(
      `node-oidc-provider 已初始化, issuer=${issuer}, clients=${clients
        .map((c) => c.client_id)
        .join(', ')}, sessionTtl=${sessionTtlSeconds}s`,
    );
    return this.provider;
  }

  /** 供中间件挂载：返回 provider 的请求处理器。 */
  async getCallback(): Promise<RequestListener> {
    const provider = await this.getProvider();
    if (!this.callbackFn) {
      this.callbackFn = provider.callback() as unknown as RequestListener;
    }
    return this.callbackFn;
  }

  private attachLoginAuditListeners(provider: OidcProvider): void {
    provider.on('authorization.success', (ctx: OidcAuthorizationContext) => {
      void this.recordSsoAuthorizationSuccess(ctx);
    });
    provider.on('grant.success', (ctx: OidcGrantContext) => {
      void this.recordGrantClientMeta(ctx);
    });
  }

  /** 授权码换 token 时记录客户端 IP（AccessToken 在此时才生成）。 */
  private async recordGrantClientMeta(ctx: OidcGrantContext): Promise<void> {
    const jti = ctx.oidc?.entities?.AccessToken?.jti;
    if (!jti) {
      return;
    }
    const req = ctx.req;
    try {
      await this.stampOidcPayloadMeta('AccessToken', jti, {
        loginIp: req?.ip ?? null,
        loginUserAgent: req?.headers?.['user-agent'] ?? null,
        clientId: ctx.oidc?.client?.clientId ?? null,
      });
    } catch (error) {
      this.logger.warn(`OIDC AccessToken IP 写入失败: ${String(error)}`);
    }
  }

  private async stampOidcPayloadMeta(
    model: string,
    id: string,
    meta: {
      loginIp?: string | null;
      loginUserAgent?: string | null;
      clientId?: string | null;
    },
  ): Promise<void> {
    const row = await this.payloadRepo.findOne({ where: { id, model } });
    if (!row) {
      return;
    }
    row.payload = {
      ...(row.payload ?? {}),
      ...meta,
    };
    await this.payloadRepo.save(row);
  }

  /**
   * OIDC 授权成功（含静默 SSO：已有 IAM 会话 cookie 时不会经过 interaction 登录页）。
   */
  private async recordSsoAuthorizationSuccess(ctx: OidcAuthorizationContext): Promise<void> {
    const accountId = ctx.oidc?.session?.accountId;
    if (!accountId) {
      return;
    }

    const req = ctx.req;
    try {
      const sessionId = ctx.oidc?.session?.id;
      if (sessionId) {
        await this.stampOidcPayloadMeta('Session', sessionId, {
          loginIp: req?.ip ?? null,
          loginUserAgent: req?.headers?.['user-agent'] ?? null,
          clientId: ctx.oidc?.client?.clientId ?? null,
        });
      }

      const user = await this.userRepo.findOne({ where: { id: accountId } });
      await this.loginHistoryService.record({
        success: true,
        userId: accountId,
        identifier: user?.email ?? accountId,
        loginType: LoginType.SSO,
        ip: req?.ip ?? null,
        userAgent: req?.headers?.['user-agent'] ?? null,
      });
      await this.userRepo.update(accountId, { lastLoginAt: new Date() });
    } catch (error) {
      this.logger.warn(`SSO 登录审计写入失败: ${String(error)}`);
    }
  }

  // ---- IOidcInteraction 实现 ----

  async getDetails(req: unknown, res: unknown): Promise<OidcInteractionDetails> {
    const provider = await this.getProvider();
    return provider.interactionDetails(
      req as never,
      res as never,
    ) as unknown as OidcInteractionDetails;
  }

  async finishLogin(req: unknown, res: unknown, result: OidcLoginResult): Promise<void> {
    const provider = await this.getProvider();
    const details = (await provider.interactionDetails(
      req as never,
      res as never,
    )) as OidcInteractionDetails;

    const clientId = details.params?.client_id as string | undefined;
    if (clientId) {
      const oauthClient = await this.oauthClientService.findByClientId(clientId);
      if (oauthClient?.applicationId) {
        await this.applicationService.assertUserCanAccess(
          oauthClient.applicationId,
          result.accountId,
        );
      }
    }

    await provider.interactionFinished(
      req as never,
      res as never,
      {
        login: {
          accountId: result.accountId,
          remember: result.remember ?? true,
        },
      },
      { mergeWithLastSubmission: true },
    );
  }

  async finishConsent(req: unknown, res: unknown): Promise<void> {
    const provider = await this.getProvider();
    const details = (await provider.interactionDetails(
      req as never,
      res as never,
    )) as OidcInteractionDetails & {
      session?: { accountId?: string };
    };

    const accountId = details.session?.accountId;
    const clientId = details.params.client_id as string | undefined;
    if (!accountId || !clientId) {
      throw new Error('consent 交互缺少 accountId 或 clientId');
    }

    const grant = new provider.Grant({ accountId, clientId });
    const scopeStr = details.params.scope as string | undefined;
    const scopes = scopeStr?.split(' ').filter(Boolean) ?? ['openid', 'profile', 'email'];
    for (const scope of scopes) {
      grant.addOIDCScope(scope);
    }
    await grant.save();

    await provider.interactionFinished(
      req as never,
      res as never,
      { consent: { grantId: grant.jti } },
      { mergeWithLastSubmission: true },
    );
  }

  async abort(req: unknown, res: unknown, error: string, description?: string): Promise<void> {
    const provider = await this.getProvider();
    await provider.interactionFinished(req as never, res as never, {
      error,
      error_description: description,
    });
  }
}
