import { ForbiddenException, HttpException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Provider as OidcProvider } from 'oidc-provider';
import type { Request, Response } from 'express';
import { dynamicImport } from '@app/common';
import type { AppConfig } from '@app/config';
import type { IOidcInteraction, OidcInteractionDetails, OidcLoginResult } from '@app/contracts';
import { UserEntity } from '../../../identity/user/entities/user.entity';
import { LoginHistoryService } from '../../../identity/login-history/services/login-history.service';
import { LoginType } from '../../../identity/login-history/entities/login-history.entity';
import { OidcPayloadEntity } from '../entities/oidc-payload.entity';
import { createOidcAdapter } from '../adapters/oidc-payload.adapter';
import { OauthClientService } from '../../oauth-client/services/oauth-client.service';
import { DEFAULT_CONSENT_MODE } from '../../oauth-client/constants/consent-mode';
import { ApplicationService } from '../../../application/services/application.service';
import { AuthSessionSettingsService } from '../../../system/auth-session/auth-session-settings.service';

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
export class OidcService implements IOidcInteraction, OnModuleInit {
  private readonly logger = new Logger(OidcService.name);
  private provider: OidcProvider | null = null;
  private callbackFn: RequestListener | null = null;
  /** oauth_client 变更检测：seed 新客户端后无需重启 IAM */
  private clientsSnapshot: string | null = null;
  /** 会话策略变更检测：平台配置更新后重建 provider */
  private settingsSnapshot: string | null = null;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(OidcPayloadEntity)
    private readonly payloadRepo: Repository<OidcPayloadEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly oauthClientService: OauthClientService,
    private readonly applicationService: ApplicationService,
    private readonly loginHistoryService: LoginHistoryService,
    private readonly authSessionSettings: AuthSessionSettingsService,
  ) {}

  onModuleInit(): void {
    this.authSessionSettings.registerOnChange(() => this.invalidateProvider());
  }

  invalidateProvider(): void {
    this.provider = null;
    this.clientsSnapshot = null;
    this.settingsSnapshot = null;
    this.callbackFn = null;
  }

  private async buildClientsSnapshot(): Promise<string> {
    const clients = await this.oauthClientService.toOidcClients();
    return JSON.stringify(
      clients
        .map((c) => ({
          id: c.client_id,
          uris: c.redirect_uris.sort(),
          postLogout: (c.post_logout_redirect_uris ?? []).sort(),
          consentMode: c.consent_mode,
        }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    );
  }

  async getProvider(): Promise<OidcProvider> {
    const snapshot = await this.buildClientsSnapshot();
    const settingsSnap = await this.authSessionSettings.getSnapshot();
    if (
      this.provider &&
      this.clientsSnapshot === snapshot &&
      this.settingsSnapshot === settingsSnap
    ) {
      return this.provider;
    }

    if (this.provider) {
      this.logger.log('检测到 oauth_client 或会话策略变更，重新加载 node-oidc-provider');
      this.callbackFn = null;
    }

    const issuer = this.config.get<string>('OIDC_ISSUER') ?? 'http://localhost:3000/oidc';
    const cookieKeys = (this.config.get<string>('OIDC_COOKIE_KEYS') ?? 'dev-key-1,dev-key-2').split(
      ',',
    );
    const appCfg = this.config.getOrThrow<AppConfig>('app');
    const prefix = appCfg.globalPrefix;
    // 授权服务器自身的源（= issuer 的 origin）。登录/consent 页与 /oidc 同源，
    // interaction 走 per-uid 路径，_interaction cookie 天然按 uid 隔离，杜绝多 client 串号。
    const issuerOrigin = new URL(issuer).origin;
    const clients = await this.oauthClientService.toOidcClients();
    const sessionPolicy = await this.authSessionSettings.getEffective();
    const sessionTtlSeconds = sessionPolicy.oidcSessionTtlSeconds;
    const accessTokenTtlSeconds = sessionPolicy.oidcAccessTokenTtlSeconds;
    const refreshTokenTtlSeconds = sessionPolicy.oidcRefreshTokenTtlSeconds;
    const authorizationCodeTtlSeconds = sessionPolicy.oidcAuthorizationCodeTtlSeconds;

    const mod = await dynamicImport<{
      default: new (issuer: string, config: unknown) => OidcProvider;
    }>('oidc-provider');
    const Provider = mod.default;

    this.clientsSnapshot = snapshot;
    this.settingsSnapshot = settingsSnap;
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
        rpInitiatedLogout: {
          enabled: true,
          logoutSource: async (
            ctx: { type: string; body: string },
            form: string,
          ) => {
            ctx.type = 'html';
            ctx.body = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>正在退出统一登录…</title>
</head>
<body>
  ${form}
  <input type="hidden" name="logout" value="yes" form="op.logoutForm">
  <script>document.getElementById('op.logoutForm').submit();</script>
</body>
</html>`;
          },
        },
      },
      // http 子域下 SameSite=None 会被浏览器拒收（需 Secure），导致 _session 种不上、
      // 「登上就会话过期」。所有 SSO 流程都是顶层 GET 跳转，SameSite=Lax 足够且能种上。
      cookies: {
        keys: cookieKeys,
        long: { sameSite: 'lax' },
        short: { sameSite: 'lax' },
      },
      /**
       * 默认 scopes 不含 offline_access 时，oidc-provider 会把 authorization code 绑定到 SSO Session。
       * 多 SPA（8848/8849）并行授权时 Session 可能被新登录替换，导致 code 换 token 报 invalid_grant。
       * 演示环境关闭该绑定，code 仍受 PKCE + 短 TTL 保护。
       */
      expiresWithSession: async () => false,
      ttl: {
        Session: sessionTtlSeconds,
        Grant: sessionTtlSeconds,
        AccessToken: accessTokenTtlSeconds,
        IdToken: accessTokenTtlSeconds,
        RefreshToken: refreshTokenTtlSeconds,
        Interaction: sessionTtlSeconds,
        AuthorizationCode: authorizationCodeTtlSeconds,
      },
      interactions: {
        // login 与 consent 统一走同源 per-uid 路径；InteractionController 在此渲染 UI。
        url: (_ctx: unknown, interaction: { uid: string }) =>
          `${issuerOrigin}/${prefix}/interaction/${interaction.uid}`,
      },
      /**
       * 按 oauth_client.consentMode 决定是否自动建立 Grant：
       * - never：自动授权（跳过 consent 确认页）
       * - first_time：仅复用已有 Grant，首次需用户确认
       * - always：不复用已有 Grant，每次均需用户确认
       */
      loadExistingGrant: async (ctx: {
        oidc: {
          result?: { consent?: { grantId?: string } };
          session?: {
            accountId?: string;
            grantIdFor: ((clientId: string) => string | undefined) &
              ((clientId: string, value: string) => void);
          };
          client?: { clientId: string };
          provider: OidcProvider;
          requestParamOIDCScopes?: Set<string>;
        };
      }) => {
        const { oidc } = ctx;
        const clientId = oidc.client?.clientId;
        if (!clientId) {
          return undefined;
        }

        const oauthClient = await this.oauthClientService.findByClientId(clientId);
        const consentMode = oauthClient?.consentMode ?? DEFAULT_CONSENT_MODE;

        // 当前 interaction 刚完成 consent 时，必须使用本次提交的 grant（避免 always 模式死循环）
        const justConsentedId = oidc.result?.consent?.grantId;
        if (justConsentedId) {
          const justConsented = await oidc.provider.Grant.find(justConsentedId);
          if (justConsented) {
            return justConsented;
          }
        }

        const existingId =
          consentMode === 'always'
            ? undefined
            : oidc.session?.grantIdFor(clientId);
        if (existingId) {
          const existing = await oidc.provider.Grant.find(existingId);
          if (existing) {
            return existing;
          }
        }

        const accountId = oidc.session?.accountId;
        if (!accountId || !oidc.client) {
          return undefined;
        }

        if (consentMode !== 'never') {
          return undefined;
        }

        const grant = new oidc.provider.Grant({
          accountId,
          clientId,
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
        if (oidc.session) {
          oidc.session.grantIdFor(clientId, grant.jti);
        }
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
    this.attachLogoutListeners(this.provider);
    this.logger.log(
      `node-oidc-provider 已初始化, issuer=${issuer}, clients=${clients
        .map((c) => c.client_id)
        .join(', ')}, sessionTtl=${sessionTtlSeconds}s, accessTtl=${accessTokenTtlSeconds}s, refreshTtl=${refreshTokenTtlSeconds}s`,
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

  /** 全局登出成功后广播事件，供其它 SPA Tab 感知 SSO 会话已销毁 */
  private attachLogoutListeners(provider: OidcProvider): void {
    provider.on(
      'end_session.success',
      (ctx: {
        req?: Request;
        res?: Response;
        oidc?: {
          params?: { client_id?: string };
          session?: { state?: { clientId?: string } };
          client?: { clientId?: string };
        };
      }) => {
        const res = ctx.res;
        if (!res) {
          return;
        }
        const clientId =
          ctx.oidc?.session?.state?.clientId ??
          ctx.oidc?.params?.client_id ??
          ctx.oidc?.client?.clientId ??
          '';
        this.setSsoLogoutEventCookie(res, ctx.req, clientId);
      },
    );
  }

  private setSsoLogoutEventCookie(res: Response, req: Request | undefined, clientId: string): void {
    const value = `${Date.now()}:${clientId}`;
    const host = req?.headers?.host?.split(':')[0] ?? '';
    const cookieOpts = {
      maxAge: 60_000,
      // Path 限定在 /oidc，避免 localhost 多端口共享 host 时被其它 SPA 误读
      path: '/oidc',
      sameSite: 'lax' as const,
      httpOnly: false,
      ...(host.endsWith('pinshuai.local') ? { domain: '.pinshuai.local' } : {}),
    };
    if (typeof res.cookie === 'function') {
      res.cookie('iam_sso_logout_event', value, cookieOpts);
      return;
    }
    let header = `iam_sso_logout_event=${encodeURIComponent(value)}; Max-Age=60; Path=/oidc; SameSite=Lax`;
    if (host.endsWith('pinshuai.local')) {
      header += '; Domain=.pinshuai.local';
    }
    res.setHeader('Set-Cookie', header);
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
   * 进门资格以 application_user 为准；无权限时记失败审计，不更新 lastLoginAt。
   */
  private async recordSsoAuthorizationSuccess(ctx: OidcAuthorizationContext): Promise<void> {
    const accountId = ctx.oidc?.session?.accountId;
    if (!accountId) {
      return;
    }

    const req = ctx.req;
    try {
      const sessionId = ctx.oidc?.session?.id;
      const clientId = ctx.oidc?.client?.clientId ?? null;
      if (sessionId) {
        await this.stampOidcPayloadMeta('Session', sessionId, {
          loginIp: req?.ip ?? null,
          loginUserAgent: req?.headers?.['user-agent'] ?? null,
          clientId,
        });
      }

      const appMeta = await this.resolveClientApplicationMeta(clientId);
      if (appMeta.applicationId) {
        const allowed = await this.applicationService.canUserAccess(
          appMeta.applicationId,
          accountId,
        );
        if (!allowed) {
          await this.recordSsoLoginHistory({
            success: false,
            accountId,
            clientId,
            ...appMeta,
            req,
            failReason: '无权访问该应用，请联系管理员开通 application_user',
          });
          return;
        }
      }

      await this.recordSsoLoginHistory({
        success: true,
        accountId,
        clientId,
        ...appMeta,
        req,
      });
    } catch (error) {
      this.logger.warn(`SSO 登录审计写入失败: ${String(error)}`);
    }
  }

  private async resolveClientApplicationMeta(clientId: string | null): Promise<{
    applicationId: string | null;
    applicationCode: string | null;
    applicationName: string | null;
  }> {
    if (!clientId) {
      return { applicationId: null, applicationCode: null, applicationName: null };
    }
    const oauthClient = await this.oauthClientService.findByClientId(clientId);
    if (!oauthClient) {
      return { applicationId: null, applicationCode: null, applicationName: null };
    }
    try {
      const app = await this.applicationService.findOne(oauthClient.applicationId);
      return {
        applicationId: oauthClient.applicationId,
        applicationCode: app.code,
        applicationName: app.name,
      };
    } catch {
      return {
        applicationId: oauthClient.applicationId,
        applicationCode: null,
        applicationName: null,
      };
    }
  }

  private resolveSsoFailReason(error: unknown): string {
    if (error instanceof ForbiddenException) {
      return error.message;
    }
    if (error instanceof HttpException) {
      const msg = error.message;
      return typeof msg === 'string' && msg.length > 0 ? msg : '登录失败';
    }
    return '登录失败';
  }

  private async recordSsoLoginHistory(params: {
    success: boolean;
    accountId: string;
    clientId: string | null;
    applicationId: string | null;
    applicationCode: string | null;
    applicationName: string | null;
    req?: Request;
    failReason?: string | null;
  }): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: params.accountId } });
    await this.loginHistoryService.record({
      success: params.success,
      userId: params.accountId,
      identifier: user?.email ?? params.accountId,
      loginType: LoginType.SSO,
      ip: params.req?.ip ?? null,
      userAgent: params.req?.headers?.['user-agent'] ?? null,
      clientId: params.clientId,
      applicationId: params.applicationId,
      applicationCode: params.applicationCode,
      applicationName: params.applicationName,
      failReason: params.failReason ?? null,
    });
    if (params.success) {
      await this.userRepo.update(params.accountId, { lastLoginAt: new Date() });
    }
  }

  private async recordSsoApplicationAccessDenied(
    accountId: string,
    clientId: string | undefined,
    applicationId: string,
    req: unknown,
    error: unknown,
  ): Promise<void> {
    try {
      const appMeta = await this.resolveClientApplicationMeta(clientId ?? null);
      await this.recordSsoLoginHistory({
        success: false,
        accountId,
        clientId: clientId ?? null,
        applicationId: appMeta.applicationId ?? applicationId,
        applicationCode: appMeta.applicationCode,
        applicationName: appMeta.applicationName,
        req: req as Request | undefined,
        failReason: this.resolveSsoFailReason(error),
      });
    } catch (auditError) {
      this.logger.warn(`SSO 进门失败审计写入失败: ${String(auditError)}`);
    }
  }

  // ---- IOidcInteraction 实现 ----

  async getSessionAccountId(req: unknown, res: unknown): Promise<string | null> {
    const provider = await this.getProvider();
    try {
      const session = await provider.Session.get({ req, res } as never);
      return session?.accountId ?? null;
    } catch {
      return null;
    }
  }

  async getDetails(req: unknown, res: unknown): Promise<OidcInteractionDetails> {
    const provider = await this.getProvider();
    return provider.interactionDetails(
      req as never,
      res as never,
    ) as unknown as OidcInteractionDetails;
  }

  async findInteractionByUid(uid: string): Promise<OidcInteractionDetails | null> {
    const provider = await this.getProvider();
    try {
      const interaction = await provider.Interaction.find(uid);
      if (!interaction) {
        return null;
      }
      return interaction as unknown as OidcInteractionDetails;
    } catch {
      return null;
    }
  }

  /**
   * 按 URL uid 结束 interaction 并 303 回跳 returnTo。
   * 标准同源模型下 URL uid 是权威来源，避免浏览器未带上 per-path _interaction cookie 时
   * provider.interactionDetails() 读不到 cookie 而报 interaction session not found。
   */
  private async completeInteractionByUid(
    uid: string,
    res: Response,
    result: Record<string, unknown>,
    mergeWithLastSubmission = true,
  ): Promise<void> {
    const provider = await this.getProvider();
    const interaction = await provider.Interaction.find(uid);
    if (!interaction) {
      throw new ForbiddenException('interaction session not found');
    }

    const lastSubmission = (interaction as { lastSubmission?: Record<string, unknown> })
      .lastSubmission;
    if (mergeWithLastSubmission && !('error' in result)) {
      interaction.result = { ...lastSubmission, ...result };
    } else {
      interaction.result = result;
    }

    const exp = (interaction as { exp?: number }).exp;
    if (typeof exp !== 'number') {
      throw new ForbiddenException('interaction session not found');
    }
    const epochTime = (await dynamicImport<{ default: (date?: Date) => number }>(
      'oidc-provider/lib/helpers/epoch_time.js',
    )).default;
    await interaction.save(exp - epochTime());

    const returnTo = (interaction as { returnTo?: string }).returnTo;
    if (!returnTo) {
      throw new ForbiddenException('interaction returnTo missing');
    }
    res.redirect(303, returnTo);
  }

  async finishLogin(
    req: unknown,
    res: unknown,
    result: OidcLoginResult,
    uid: string,
  ): Promise<void> {
    const provider = await this.getProvider();
    const details = (await provider.Interaction.find(uid)) as OidcInteractionDetails | undefined;
    if (!details) {
      throw new ForbiddenException('interaction session not found');
    }

    const clientId = details.params?.client_id as string | undefined;
    if (clientId) {
      const oauthClient = await this.oauthClientService.findByClientId(clientId);
      if (oauthClient?.applicationId) {
        try {
          await this.applicationService.assertUserCanAccess(
            oauthClient.applicationId,
            result.accountId,
          );
        } catch (error) {
          await this.recordSsoApplicationAccessDenied(
            result.accountId,
            clientId,
            oauthClient.applicationId,
            req,
            error,
          );
          throw error;
        }
      }
    }

    await this.completeInteractionByUid(
      uid,
      res as Response,
      {
        login: {
          accountId: result.accountId,
          remember: result.remember ?? true,
        },
      },
      true,
    );
  }

  async shouldAutoConsent(clientId: string): Promise<boolean> {
    const client = await this.oauthClientService.findByClientId(clientId);
    return (client?.consentMode ?? DEFAULT_CONSENT_MODE) === 'never';
  }

  async finishConsent(req: unknown, res: unknown, uid: string): Promise<void> {
    const provider = await this.getProvider();
    const details = (await provider.Interaction.find(uid)) as OidcInteractionDetails & {
      session?: { accountId?: string };
    };
    if (!details) {
      throw new ForbiddenException('interaction session not found');
    }

    const accountId = details.session?.accountId;
    const clientId = details.params.client_id as string | undefined;
    if (!accountId || !clientId) {
      throw new Error('consent 交互缺少 accountId 或 clientId');
    }

    const oauthClient = await this.oauthClientService.findByClientId(clientId);
    if (oauthClient?.applicationId) {
      try {
        await this.applicationService.assertUserCanAccess(oauthClient.applicationId, accountId);
      } catch (error) {
        await this.recordSsoApplicationAccessDenied(
          accountId,
          clientId,
          oauthClient.applicationId,
          req,
          error,
        );
        throw error;
      }
    }

    const grant = new provider.Grant({ accountId, clientId });
    const scopeStr = details.params.scope as string | undefined;
    const scopes = scopeStr?.split(' ').filter(Boolean) ?? ['openid', 'profile', 'email'];
    for (const scope of scopes) {
      grant.addOIDCScope(scope);
    }
    await grant.save();

    await this.completeInteractionByUid(
      uid,
      res as Response,
      { consent: { grantId: grant.jti } },
      true,
    );
  }

  async abort(req: unknown, res: unknown, error: string, description?: string): Promise<void> {
    const provider = await this.getProvider();
    await provider.interactionFinished(req as never, res as never, {
      error,
      error_description: description,
    });
  }

  /** 使用 refresh_token 换取新的 access_token（公共 SPA 客户端，无 client_secret）。 */
  async refreshAccessToken(
    clientId: string,
    refreshToken: string,
  ): Promise<{ access_token: string; refresh_token?: string; expires_in: number } | null> {
    const issuer = (this.config.get<string>('OIDC_ISSUER') ?? 'http://localhost:3000/oidc').replace(
      /\/$/,
      '',
    );
    try {
      const res = await fetch(`${issuer}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: clientId,
        }),
      });
      const json = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        return null;
      }
      const accessToken = json.access_token;
      const expiresIn = json.expires_in;
      if (typeof accessToken !== 'string' || typeof expiresIn !== 'number') {
        return null;
      }
      return {
        access_token: accessToken,
        refresh_token: typeof json.refresh_token === 'string' ? json.refresh_token : undefined,
        expires_in: expiresIn,
      };
    } catch (error) {
      this.logger.warn(`OIDC refresh_token 失败: ${String(error)}`);
      return null;
    }
  }
}
