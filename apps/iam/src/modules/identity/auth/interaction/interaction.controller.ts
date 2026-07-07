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

const DEFAULT_APP_RETURN_URLS: Record<string, Record<string, string>> = {
  nginx: {
    'iam-admin-spa': 'http://admin.pinshuai.local/',
    'flow-admin-spa': 'http://flow.pinshuai.local/',
  },
  local: {
    'iam-admin-spa': 'http://localhost:8848/',
    'flow-admin-spa': 'http://localhost:8849/',
  },
};

function resolveDefaultAppReturnUrls(issuer: string): Record<string, string> {
  return issuer.includes('iam.local') ? DEFAULT_APP_RETURN_URLS.nginx : DEFAULT_APP_RETURN_URLS.local;
}

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

/** 按 redirect_uri 推断 issuer / 回跳地址，避免 nginx 访问时仍返回 localhost。 */
function resolveOidcIssuerForParams(baseIssuer: string, params: Record<string, unknown>): string {
  const redirectUri = params.redirect_uri as string | undefined;
  if (redirectUri?.includes('.pinshuai.local')) {
    return 'http://api.pinshuai.local/oidc';
  }
  return baseIssuer;
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

  private getOidcIssuer(): string {
    return this.config.get<string>('OIDC_ISSUER') ?? 'http://localhost:3000/oidc';
  }

  private resolveAppReturnUrl(clientId: string | undefined): string | null {
    if (!clientId) {
      return null;
    }
    const map = resolveDefaultAppReturnUrls(this.getOidcIssuer());
    return map[clientId] ?? null;
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

  /** 登录成功后写入跨子域 cookie，供 login.pinshuai.local 其它 Tab 感知。 */
  private broadcastSsoLoginEvent(req: Request, res: Response, clientId?: string): void {
    const host = req.hostname;
    const value = clientId ? `${Date.now()}:${clientId}` : String(Date.now());
    const opts: {
      maxAge: number;
      path: string;
      sameSite: 'lax';
      httpOnly: boolean;
      domain?: string;
    } = {
      maxAge: 60_000,
      path: '/',
      sameSite: 'lax',
      httpOnly: false,
    };
    if (host.endsWith('iam.local')) {
      opts.domain = '.pinshuai.local';
    }
    res.cookie('iam_sso_login_event', value, opts);
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

  private async buildMetaPayload(req: Request, res: Response, details: { uid: string; prompt?: { name: string }; params: Record<string, unknown> }) {
    const oidc = this.ensureOidc();
    const clientId = details.params.client_id as string | undefined;
    const redirectUri = details.params.redirect_uri as string | undefined;
    const sessionAccountId = await oidc.getSessionAccountId(req, res);
    const issuer = resolveOidcIssuerForParams(this.getOidcIssuer(), details.params);
    return {
      uid: details.uid,
      clientId: clientId ?? null,
      prompt: details.prompt?.name ?? null,
      params: pickOidcAuthParams(details.params),
      restartAuthUrl: buildRestartAuthUrl(issuer, details.params),
      appReturnUrl:
        resolveAppReturnUrlFromRedirectUri(redirectUri) ?? this.resolveAppReturnUrl(clientId),
      hasSession: !!sessionAccountId,
    };
  }

  /**
   * 读取当前 _interaction cookie 对应的 meta（不依赖 URL uid）。
   * login 页用于纠正 URL ?uid= 与 cookie 不一致的 stale tab。
   */
  @Get('active/meta')
  async activeMeta(@Req() req: Request, @Res() res: Response) {
    const details = await this.readInteractionDetails(req, res);
    res.json(await this.buildMetaPayload(req, res, details));
  }

  /** iam-login 拉取 interaction 元数据，用于跨 Tab 重启授权链路。 */
  @Get(':uid/meta')
  async meta(@Param('uid') uid: string, @Req() req: Request, @Res() res: Response) {
    const details = await this.readInteractionDetails(req, res);
    this.assertInteractionUid(details, uid);
    res.json(await this.buildMetaPayload(req, res, details));
  }

  /** SPA 探测：当前浏览器是否已有 IAM SSO 会话（用于静默续登 / Tab 恢复）。 */
  @Get('sso/status')
  async ssoStatus(@Req() req: Request, @Res() res: Response) {
    const accountId = await this.ensureOidc().getSessionAccountId(req, res);
    res.json({ authenticated: !!accountId });
  }

  @Get(':uid')
  async details(@Param('uid') uid: string, @Req() req: Request, @Res() res: Response) {
    const oidc = this.ensureOidc();
    let details;
    try {
      details = await oidc.getDetails(req, res);
    } catch (err) {
      if (this.getIamLoginUrl() && this.isInvalidInteractionError(err)) {
        this.redirectToLoginPage(res, uid, 'interaction_expired');
        return;
      }
      throw err;
    }

    try {
      this.assertInteractionUid(details, uid);
    } catch (mismatch) {
      if (this.getIamLoginUrl()) {
        const cid = details.params?.client_id as string | undefined;
        this.redirectToLoginPage(res, uid, 'interaction_expired', cid);
        return;
      }
      throw mismatch;
    }

    // 登录后若仍需 consent，自动完成授权（避免卡在 /oidc/auth/:resume 303 循环）
    if (details.prompt?.name === 'consent') {
      await oidc.finishConsent(req, res);
      return;
    }

    // 已有 IAM SSO 会话：直接完成 login interaction，无需再跳 4180
    if (details.prompt?.name === 'login' && details.session?.accountId) {
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
      details = await oidc.getDetails(req, res);
      this.assertInteractionUid(details, uid);
    } catch (err) {
      if (this.getIamLoginUrl() && this.isInvalidInteractionError(err)) {
        this.redirectToLoginPage(res, uid, 'interaction_expired');
        return;
      }
      if (
        this.getIamLoginUrl() &&
        err instanceof NotFoundException &&
        typeof (err.getResponse() as { code?: string })?.code === 'string' &&
        (err.getResponse() as { code: string }).code === 'interaction_mismatch'
      ) {
        this.redirectToLoginPage(res, uid, 'interaction_expired');
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
        this.redirectToLoginPage(res, uid, 'interaction_expired');
        return;
      }
      if (this.getIamLoginUrl()) {
        this.redirectToLoginPage(res, uid, 'invalid_credentials', loginClientId);
        return;
      }
      throw new UnauthorizedException('邮箱或密码错误');
    }
  }

  @Post(':uid/abort')
  async abort(@Req() req: Request, @Res() res: Response) {
    await this.ensureOidc().abort(req, res, 'access_denied', '用户取消登录');
    res.status(200).json({ success: true });
  }
}
