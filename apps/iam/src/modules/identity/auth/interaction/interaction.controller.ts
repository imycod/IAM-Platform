import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Optional,
  Param,
  Post,
  Req,
  Res,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import type { AppConfig } from '@app/config';
import { OIDC_INTERACTION, type IOidcInteraction } from '@app/contracts';
import { AuthService } from '../services/auth.service';

function renderLoginPage(uid: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>IAM 登录</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 360px; margin: 48px auto; padding: 0 16px; }
    h1 { font-size: 1.25rem; }
    label { display: block; margin-top: 12px; font-size: 0.875rem; }
    input { width: 100%; box-sizing: border-box; padding: 8px; margin-top: 4px; }
    button { margin-top: 16px; width: 100%; padding: 10px; cursor: pointer; }
    .hint { color: #666; font-size: 0.8rem; margin-top: 8px; }
  </style>
</head>
<body>
  <h1>IAM 统一登录</h1>
  <p class="hint">未配置 IAM_LOGIN_URL 时的简易页 · interaction ${uid}</p>
  <form method="POST" action="/api/interaction/${uid}/login">
    <label>邮箱<input type="email" name="email" value="admin@qq.com" required /></label>
    <label>密码<input type="password" name="password" value="123456" required /></label>
    <button type="submit">登录</button>
  </form>
</body>
</html>`;
}

function renderConsentPage(uid: string, clientId: string, scopes: string[]): string {
  const scopeText = scopes.length ? scopes.join(' ') : 'openid profile email';
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>授权确认</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 420px; margin: 48px auto; padding: 0 16px; }
    h1 { font-size: 1.25rem; }
    .scopes { background: #f5f5f5; padding: 12px; border-radius: 8px; font-size: 0.875rem; }
    .actions { display: flex; gap: 12px; margin-top: 20px; }
    button { flex: 1; padding: 10px; cursor: pointer; }
    .deny { background: #fff; border: 1px solid #ccc; }
    .approve { background: #1677ff; color: #fff; border: none; }
  </style>
</head>
<body>
  <h1>授权确认</h1>
  <p>应用 <strong>${clientId}</strong> 请求访问以下信息：</p>
  <div class="scopes">${scopeText}</div>
  <form class="actions" method="POST" action="/api/interaction/${uid}/consent">
    <button type="submit" name="action" value="deny" class="deny">拒绝</button>
    <button type="submit" name="action" value="approve" class="approve">同意授权</button>
  </form>
</body>
</html>`;
}

/** 用于重建 /oidc/auth 的授权请求参数（不含 interaction 内部字段）。 */
const OIDC_AUTH_PARAM_KEYS = [
  'client_id',
  'redirect_uri',
  'response_type',
  'scope',
  'state',
  'code_challenge',
  'code_challenge_method',
  'nonce',
  'response_mode',
  'max_age',
  'login_hint',
] as const;

function pickOidcAuthParams(params: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of OIDC_AUTH_PARAM_KEYS) {
    const value = params[key];
    if (typeof value === 'string' && value.length > 0) {
      out[key] = value;
    }
  }
  return out;
}

function buildRestartAuthUrl(issuer: string, params: Record<string, unknown>): string | null {
  const authParams = pickOidcAuthParams(params);
  if (!authParams.client_id || !authParams.redirect_uri) {
    return null;
  }
  const url = new URL(`${issuer.replace(/\/$/, '')}/auth`);
  for (const [key, value] of Object.entries(authParams)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

function resolveAppReturnUrlFromRedirectUri(redirectUri: string | undefined): string | null {
  if (!redirectUri) {
    return null;
  }
  try {
    return `${new URL(redirectUri).origin}/`;
  } catch {
    return null;
  }
}

function hostnameFromUri(uri: string | undefined): string | null {
  if (!uri) {
    return null;
  }
  try {
    return new URL(uri).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * OIDC 交互桥接层：接住 node-oidc-provider 抛出的 /interaction/:uid，
 * 调 identity/auth 校验凭证，再调 security/oidc 的 interactionFinished()。
 */
@Controller('interaction')
export class InteractionController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
    @Optional()
    @Inject(OIDC_INTERACTION)
    private readonly oidc?: IOidcInteraction,
  ) {}

  private ensureOidc(): IOidcInteraction {
    if (!this.oidc) {
      throw new ServiceUnavailableException('OIDC 未启用');
    }
    return this.oidc;
  }

  private getIamLoginUrl(): string | null {
    return this.config.getOrThrow<AppConfig>('app').iamLoginUrl;
  }

  private redirectToLoginPage(
    res: Response,
    uid: string,
    error?: string,
    clientId?: string,
  ): void {
    const base = this.getIamLoginUrl();
    if (!base) {
      return;
    }
    const url = new URL(base);
    url.searchParams.set('uid', uid);
    if (clientId) {
      url.searchParams.set('client_id', clientId);
    }
    if (error) {
      url.searchParams.set('error', error);
    }
    res.redirect(url.toString());
  }

  private redirectToConsentPage(
    res: Response,
    uid: string,
    clientId?: string,
    scope?: string,
    error?: string,
  ): void {
    const base = this.getIamLoginUrl();
    if (!base) {
      return;
    }
    const url = new URL('consent.html', base.endsWith('/') ? base : `${base}/`);
    url.searchParams.set('uid', uid);
    if (clientId) {
      url.searchParams.set('client_id', clientId);
    }
    if (scope) {
      url.searchParams.set('scope', scope);
    }
    if (error) {
      url.searchParams.set('error', error);
    }
    res.redirect(url.toString());
  }

  private getOidcIssuer(): string {
    const configured = this.config.get<string>('OIDC_ISSUER') ?? 'http://localhost:3000/oidc';
    const loginUrl = this.getIamLoginUrl();
    if (configured.includes('localhost') && loginUrl?.includes('.pinshuai.local')) {
      try {
        return `${new URL(loginUrl).origin}/oidc`;
      } catch {
        return 'http://auth.pinshuai.local/oidc';
      }
    }
    if (
      (process.env.NODE_ENV === 'nginx' || process.env.NODE_ENV === 'production') &&
      !configured.includes('.pinshuai.local')
    ) {
      return 'http://auth.pinshuai.local/oidc';
    }
    return configured;
  }

  /**
   * 生成 restartAuthUrl 等对外链接用的 issuer。
   * nginx/子域场景下即使 .env 仍残留 localhost，也按 redirect_uri / 请求 Host 纠正为 auth 域。
   */
  private resolveOidcIssuer(
    req: Request,
    params?: Record<string, unknown>,
  ): string {
    const configured = this.getOidcIssuer();
    const redirectUri = params?.redirect_uri as string | undefined;
    const redirectHost = hostnameFromUri(redirectUri);
    const requestHost = (req.hostname ?? '').toLowerCase();
    const loginUrl = this.getIamLoginUrl();

    const isSubdomainDeploy =
      redirectHost?.endsWith('.pinshuai.local') ||
      requestHost.endsWith('.pinshuai.local');

    if (isSubdomainDeploy) {
      if (configured.includes('.pinshuai.local')) {
        return configured;
      }
      if (loginUrl?.includes('.pinshuai.local')) {
        try {
          return `${new URL(loginUrl).origin}/oidc`;
        } catch {
          // ignore
        }
      }
      if (requestHost === 'auth.pinshuai.local' || requestHost.startsWith('auth.')) {
        return `http://${requestHost}/oidc`;
      }
      return 'http://auth.pinshuai.local/oidc';
    }

    return configured;
  }

  private resolveAppReturnUrl(clientId: string | undefined): string | null {
    if (!clientId) {
      return null;
    }
    const map = this.config.getOrThrow<AppConfig>('app').appReturnUrls;
    return map[clientId] ?? null;
  }

  /** consent deny / 会话失效：优先 redirect_uri 同源，其次 APP_RETURN_URLS */
  private resolveClientLoginUrl(
    clientId: string | undefined,
    redirectUri: string | undefined,
  ): string | null {
    const origin =
      resolveAppReturnUrlFromRedirectUri(redirectUri) ?? this.resolveAppReturnUrl(clientId);
    if (!origin) {
      return null;
    }
    return `${origin.replace(/\/$/, '')}/#/login`;
  }

  private isInvalidInteractionError(err: unknown): boolean {
    const e = err as { error?: string; message?: string; error_description?: string };
    const text = `${e?.error ?? ''} ${e?.message ?? ''} ${e?.error_description ?? ''}`.toLowerCase();
    return (
      text.includes('interaction') &&
      (text.includes('expired') ||
        text.includes('not found') ||
        text.includes('session not found'))
    );
  }

  /**
   * 登录成功后写入 cookie，供 auth 域其它登录 Tab 感知。
   * IdP 已统一到 auth.* 同源后，无需再跨子域广播；仅同 host 即可。
   */
  private broadcastSsoLoginEvent(req: Request, res: Response, clientId?: string): void {
    const value = clientId ? `${Date.now()}:${clientId}` : String(Date.now());
    res.cookie('iam_sso_login_event', value, {
      maxAge: 60_000,
      path: '/',
      sameSite: 'lax',
      httpOnly: false,
    });
  }

  /**
   * 登录域（iam-login / auth.*）上 _interaction 是单例 cookie。
   * 多 client 同时 SSO 时必须按 URL path uid 锁定，否则会串到其它 client。
   * localhost 开发同理（多端口共享 cookie）。
   */
  private shouldPinInteractionByPathUid(req: Request): boolean {
    const host = (req.hostname ?? '').toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]') {
      return true;
    }
    const loginUrl = this.getIamLoginUrl();
    if (!loginUrl) {
      return false;
    }
    try {
      return new URL(loginUrl).hostname.toLowerCase() === host;
    } catch {
      return false;
    }
  }

  private assertInteractionUid(details: { uid: string }, uid: string): void {
    if (details.uid !== uid) {
      throw new NotFoundException({
        code: 'interaction_mismatch',
        uid,
        actualUid: details.uid,
      });
    }
  }

  private async readInteractionDetails(req: Request, res: Response) {
    const oidc = this.ensureOidc();
    try {
      return await oidc.getDetails(req, res);
    } catch (err) {
      if (this.isInvalidInteractionError(err)) {
        throw new NotFoundException({ code: 'interaction_expired' });
      }
      throw err;
    }
  }

  /** 按 path uid 读取（登录域上 pin 签名 cookie，多 client 不串）。 */
  private async readDetailsForUid(req: Request, res: Response, uid: string) {
    const oidc = this.ensureOidc();
    try {
      if (this.shouldPinInteractionByPathUid(req)) {
        const details = await oidc.getDetailsByUid(req, res, uid);
        this.assertInteractionUid(details, uid);
        return details;
      }
      const details = await oidc.getDetails(req, res);
      this.assertInteractionUid(details, uid);
      return details;
    } catch (err) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      if (this.isInvalidInteractionError(err)) {
        throw new NotFoundException({ code: 'interaction_expired' });
      }
      throw err;
    }
  }

  private async buildMetaPayload(req: Request, res: Response, details: { uid: string; prompt?: { name: string }; params: Record<string, unknown> }) {
    const oidc = this.ensureOidc();
    const clientId = details.params.client_id as string | undefined;
    const redirectUri = details.params.redirect_uri as string | undefined;
    const sessionAccountId = await oidc.getSessionAccountId(req, res);
    const issuer = this.resolveOidcIssuer(req, details.params);
    return {
      uid: details.uid,
      clientId: clientId ?? null,
      prompt: details.prompt?.name ?? null,
      params: pickOidcAuthParams(details.params),
      restartAuthUrl: buildRestartAuthUrl(issuer, details.params),
      appReturnUrl:
        resolveAppReturnUrlFromRedirectUri(redirectUri) ?? this.resolveAppReturnUrl(clientId),
      appLoginUrl: this.resolveClientLoginUrl(clientId, redirectUri),
      hasSession: !!sessionAccountId,
    };
  }

  /**
   * 读取当前 _interaction cookie 对应的 meta（不依赖 URL uid）。
   * login 页用于纠正 URL ?uid= 与 cookie 不一致的 stale tab。
   */
  /**
   * 读取当前 _interaction cookie 对应的 meta。
   * 无 cookie 时返回 active:false（非 404），避免多 client 场景误报错误。
   */
  @Get('active/meta')
  async activeMeta(@Req() req: Request, @Res() res: Response) {
    try {
      const details = await this.readInteractionDetails(req, res);
      res.json(await this.buildMetaPayload(req, res, details));
    } catch (err) {
      if (
        err instanceof NotFoundException &&
        (err.getResponse() as { code?: string })?.code === 'interaction_expired'
      ) {
        res.json({ active: false, uid: null, clientId: null, hasSession: false });
        return;
      }
      if (this.isInvalidInteractionError(err)) {
        res.json({ active: false, uid: null, clientId: null, hasSession: false });
        return;
      }
      throw err;
    }
  }

  /**
   * 按 URL uid 读取 interaction 元数据（不依赖 _interaction cookie）。
   * 双 Tab 跨 client 时 cookie 可能被其它应用占用，用此接口取本 Tab 的 restartAuthUrl。
   */
  @Get(':uid/snapshot-meta')
  async snapshotMeta(@Param('uid') uid: string, @Req() req: Request, @Res() res: Response) {
    const details = await this.ensureOidc().findInteractionByUid(uid);
    if (!details) {
      throw new NotFoundException({ code: 'interaction_expired' });
    }
    // 顺带 pin 签名 cookie，方便本 Tab 后续 login POST（多 client 不串）
    if (this.shouldPinInteractionByPathUid(req)) {
      await this.ensureOidc().pinInteractionCookie(req, res, uid);
    }
    res.json(await this.buildMetaPayload(req, res, details));
  }

  /** iam-login 拉取 interaction 元数据，用于跨 Tab 重启授权链路。 */
  @Get(':uid/meta')
  async meta(@Param('uid') uid: string, @Req() req: Request, @Res() res: Response) {
    const details = await this.readDetailsForUid(req, res, uid);
    res.json(await this.buildMetaPayload(req, res, details));
  }

  /** SPA 探测：当前浏览器是否已有 IAM SSO 会话（用于静默续登 / Tab 恢复）。 */
  @Get('sso/status')
  async ssoStatus(@Req() req: Request, @Res() res: Response) {
    const accountId = await this.ensureOidc().getSessionAccountId(req, res);
    res.json({ authenticated: !!accountId });
  }

  /**
   * URL uid 与 _interaction cookie 不一致时：
   * - 同一 client：同步到 cookie 中的有效 uid（stale tab）
   * - 跨 client：返回 interaction_mismatch，由前端按 client 重建授权链
   */
  private handleInteractionUidMismatch(
    res: Response,
    req: Request,
    urlUid: string,
    details: { uid: string; params?: Record<string, unknown> },
  ): void {
    const activeClientId = details.params?.client_id as string | undefined;
    const urlClientId = req.query.client_id as string | undefined;
    if (urlClientId && activeClientId && urlClientId === activeClientId) {
      this.redirectToLoginPage(res, details.uid, undefined, activeClientId);
      return;
    }
    this.redirectToLoginPage(res, urlUid, 'interaction_mismatch', activeClientId ?? urlClientId);
  }

  @Get(':uid')
  async details(@Param('uid') uid: string, @Req() req: Request, @Res() res: Response) {
    const oidc = this.ensureOidc();
    let details;
    try {
      details = await this.readDetailsForUid(req, res, uid);
    } catch (err) {
      if (this.getIamLoginUrl() && err instanceof NotFoundException) {
        const code = (err.getResponse() as { code?: string })?.code;
        if (code === 'interaction_expired') {
          this.redirectToLoginPage(res, uid, 'interaction_expired', req.query.client_id as string | undefined);
          return;
        }
        if (code === 'interaction_mismatch') {
          // 尽量读 cookie 上的 active interaction 做纠偏
          try {
            const active = await oidc.getDetails(req, res);
            this.handleInteractionUidMismatch(res, req, uid, active);
            return;
          } catch {
            this.redirectToLoginPage(res, uid, 'interaction_mismatch', req.query.client_id as string | undefined);
            return;
          }
        }
      }
      if (this.getIamLoginUrl() && this.isInvalidInteractionError(err)) {
        this.redirectToLoginPage(res, uid, 'interaction_expired', req.query.client_id as string | undefined);
        return;
      }
      throw err;
    }

    // consentMode=never 时自动完成授权；否则展示授权确认页
    if (details.prompt?.name === 'consent') {
      const clientId = details.params.client_id as string | undefined;
      if (clientId && (await oidc.shouldAutoConsent(clientId))) {
        await oidc.finishConsent(req, res);
        return;
      }

      const iamLoginUrl = this.getIamLoginUrl();
      if (iamLoginUrl) {
        const scopeStr = details.params.scope as string | undefined;
        this.redirectToConsentPage(res, uid, clientId, scopeStr);
        return;
      }

      const scopeStr = details.params.scope as string | undefined;
      const scopes = scopeStr?.split(' ').filter(Boolean) ?? ['openid', 'profile', 'email'];
      const accept = req.headers.accept ?? '';
      if (accept.includes('text/html')) {
        res.type('html').send(renderConsentPage(uid, clientId ?? 'unknown', scopes));
        return;
      }
      res.json({
        uid: details.uid,
        prompt: details.prompt,
        clientId,
        scopes,
        consentRequired: true,
      });
      return;
    }

    // 已有 IAM SSO 会话：直接完成 login interaction，无需再跳 4180
    if (details.prompt?.name === 'login' && details.session?.accountId) {
      const loginClientId = details.params?.client_id as string | undefined;
      this.broadcastSsoLoginEvent(req, res, loginClientId);
      await oidc.finishLogin(req, res, {
        accountId: details.session.accountId,
        remember: true,
      });
      return;
    }

    const iamLoginUrl = this.getIamLoginUrl();
    if (iamLoginUrl) {
      this.redirectToLoginPage(
        res,
        uid,
        undefined,
        details.params.client_id as string | undefined,
      );
      return;
    }

    const accept = req.headers.accept ?? '';
    if (accept.includes('text/html')) {
      res.type('html').send(renderLoginPage(uid));
      return;
    }
    res.json({ uid: details.uid, prompt: details.prompt, params: details.params });
  }

  @Post(':uid/login')
  async login(@Param('uid') uid: string, @Req() req: Request, @Res() res: Response) {
    const email = String(req.body?.email ?? '').trim();
    const password = String(req.body?.password ?? '');
    if (!email || !password) {
      if (this.getIamLoginUrl()) {
        this.redirectToLoginPage(res, uid, 'missing_credentials');
        return;
      }
      throw new UnauthorizedException('请提供邮箱和密码');
    }

    const oidc = this.ensureOidc();
    let details;

    try {
      details = await this.readDetailsForUid(req, res, uid);
    } catch (err) {
      if (this.getIamLoginUrl() && this.isInvalidInteractionError(err)) {
        this.redirectToLoginPage(res, uid, 'interaction_expired', req.query.client_id as string | undefined);
        return;
      }
      if (this.getIamLoginUrl() && err instanceof NotFoundException) {
        const code = (err.getResponse() as { code?: string })?.code;
        this.redirectToLoginPage(
          res,
          uid,
          code === 'interaction_mismatch' ? 'interaction_mismatch' : 'interaction_expired',
          req.body?.client_id as string | undefined,
        );
        return;
      }
      throw err;
    }

    const loginClientId = details.params?.client_id as string | undefined;

    try {
      const user = await this.authService.verifyCredentialsWithAudit(email, password, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      this.broadcastSsoLoginEvent(req, res, loginClientId);
      await oidc.finishLogin(req, res, { accountId: user.id, remember: true });
    } catch (err) {
      if (this.getIamLoginUrl() && this.isInvalidInteractionError(err)) {
        this.redirectToLoginPage(res, uid, 'interaction_expired', loginClientId);
        return;
      }
      if (this.getIamLoginUrl()) {
        this.redirectToLoginPage(res, uid, 'invalid_credentials', loginClientId);
        return;
      }
      throw new UnauthorizedException('邮箱或密码错误');
    }
  }

  @Post(':uid/consent')
  async consent(@Param('uid') uid: string, @Req() req: Request, @Res() res: Response) {
    const oidc = this.ensureOidc();
    let details;

    try {
      details = await this.readDetailsForUid(req, res, uid);
    } catch (err) {
      if (this.getIamLoginUrl() && this.isInvalidInteractionError(err)) {
        const clientId = req.body?.client_id as string | undefined;
        this.redirectToConsentPage(res, uid, clientId, undefined, 'interaction_expired');
        return;
      }
      if (this.getIamLoginUrl() && err instanceof NotFoundException) {
        const clientId = req.body?.client_id as string | undefined;
        this.redirectToConsentPage(res, uid, clientId, undefined, 'interaction_expired');
        return;
      }
      throw err;
    }

    if (details.prompt?.name !== 'consent') {
      throw new NotFoundException({ code: 'consent_not_required' });
    }

    const action = String(req.body?.action ?? 'approve').trim();
    if (action === 'deny') {
      await oidc.abort(req, res, 'access_denied', '用户拒绝授权');
      return;
    }

    await oidc.finishConsent(req, res);
  }

  @Post(':uid/abort')
  async abort(@Req() req: Request, @Res() res: Response) {
    await this.ensureOidc().abort(req, res, 'access_denied', '用户取消登录');
    res.status(200).json({ success: true });
  }
}
