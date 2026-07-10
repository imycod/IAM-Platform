import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  Controller,
  Get,
  Inject,
  Optional,
  Param,
  Post,
  Req,
  Res,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { OIDC_INTERACTION, type IOidcInteraction } from '@app/contracts';
import { AuthService } from '../services/auth.service';

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
  return issuer.includes('pinshuai.local')
    ? DEFAULT_APP_RETURN_URLS.nginx
    : DEFAULT_APP_RETURN_URLS.local;
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

interface InteractionBootstrap {
  uid: string;
  prompt: 'login' | 'consent';
  clientId: string | null;
  scope: string;
  restartAuthUrl: string | null;
  appReturnUrl: string | null;
  error: string | null;
  ssoStatusUrl: string;
}

/**
 * OIDC 交互桥接层（标准同源授权服务器模型）：
 * node-oidc-provider 把 login/consent 交互抛到同源 per-uid 路径 /api/interaction/:uid，
 * 本控制器在此渲染登录/授权 UI，并把凭证校验交给 identity/auth，再调 interactionFinished()。
 * 因为登录页与 /oidc 同源、_interaction cookie 按 uid 路径隔离，多 client / 多 tab 并发不会串号，
 * 无需任何跨域 cookie / 跨 tab 补丁。
 */
@Controller('interaction')
export class InteractionController {
  private loginShell: string | null = null;
  private consentShell: string | null = null;

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

  private getOidcIssuer(): string {
    return this.config.get<string>('OIDC_ISSUER') ?? 'http://localhost:3000/oidc';
  }

  private getGlobalPrefix(): string {
    return this.config.get<string>('APP_GLOBAL_PREFIX') ?? 'api';
  }

  private interactionUrl(uid: string, error?: string): string {
    const prefix = this.getGlobalPrefix();
    return error
      ? `/${prefix}/interaction/${encodeURIComponent(uid)}?error=${encodeURIComponent(error)}`
      : `/${prefix}/interaction/${encodeURIComponent(uid)}`;
  }

  private resolveAppReturnUrl(clientId: string | undefined): string | null {
    if (!clientId) {
      return null;
    }
    return resolveDefaultAppReturnUrls(this.getOidcIssuer())[clientId] ?? null;
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
   * 把请求的 _interaction cookie 覆写为 URL path 里的 uid。
   *
   * 同源 per-uid 路径模型下，URL 的 :uid 是权威来源（每个 interaction 独占
   * /api/interaction/:uid 路径）。当浏览器未带上 _interaction cookie（本地多端口共享
   * localhost 的历史脏 cookie、或 cookie 尚未跨端口就绪）时，用 path uid 兜底重绑，
   * 使 provider 作用于本 URL 对应的 interaction。uid 不可猜、且登录仍需校验凭证，安全。
   */
  private pinCookie(req: Request, name: string, value: string): void {
    const raw = req.headers.cookie ?? '';
    const kept = raw
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .filter((part) => !part.startsWith(`${name}=`) && !part.startsWith(`${name}.sig=`));
    kept.push(`${name}=${value}`);
    req.headers.cookie = kept.join('; ');
    const parsed = (req as Request & { cookies?: Record<string, string> }).cookies;
    if (parsed && typeof parsed === 'object') {
      parsed[name] = value;
    }
  }

  private pinInteractionCookie(req: Request, uid: string): void {
    this.pinCookie(req, '_interaction', uid);
  }

  private pinInteractionResumeCookie(req: Request, uid: string): void {
    this.pinCookie(req, '_interaction_resume', uid);
  }

  /** 清掉旧架构遗留的 path=/ interaction cookie，避免与 per-uid cookie 双发干扰 provider。 */
  private clearLegacyInteractionCookies(res: Response): void {
    const opts = { path: '/' as const };
    res.clearCookie('_interaction', opts);
    res.clearCookie('_interaction.sig', opts);
    res.clearCookie('_interaction_resume', { path: '/oidc' });
  }

  /**
   * 解析本 URL uid 对应的 interaction：URL path 的 uid 为权威来源，始终先 pin cookie 再 getDetails。
   * 返回 null 表示该 interaction 确实已失效。
   */
  private async resolveDetails(req: Request, res: Response, uid: string) {
    const oidc = this.ensureOidc();
    const alive = await oidc.findInteractionByUid(uid);
    if (!alive) {
      return null;
    }
    this.pinInteractionCookie(req, uid);
    this.pinInteractionResumeCookie(req, uid);
    try {
      const details = await oidc.getDetails(req, res);
      if (details.uid === uid) {
        return details;
      }
    } catch (err) {
      if (!this.isInvalidInteractionError(err)) {
        throw err;
      }
    }
    return null;
  }

  /** 读取 iam-login 静态外壳，剥离旧脚本、把资源指向同源 /interaction-assets，缓存一次。 */
  private loadShell(kind: 'login' | 'consent'): string {
    if (kind === 'login' && this.loginShell) {
      return this.loginShell;
    }
    if (kind === 'consent' && this.consentShell) {
      return this.consentShell;
    }
    const baseDir = process.env.IAM_LOGIN_DIR || join(process.cwd(), 'apps', 'iam-login');
    const file = kind === 'login' ? 'index.html' : 'consent.html';
    const raw = readFileSync(join(baseDir, file), 'utf8');
    const transformed = raw
      .replace(/<script src="\.\/config\.js"><\/script>\s*/g, '')
      .replace(/<script src="\.\/assets\/sso-sync\.js"><\/script>\s*/g, '')
      .replace(/\.\/assets\//g, '/interaction-assets/');
    if (kind === 'login') {
      this.loginShell = transformed;
    } else {
      this.consentShell = transformed;
    }
    return transformed;
  }

  private renderInteractionPage(
    res: Response,
    kind: 'login' | 'consent',
    bootstrap: InteractionBootstrap,
  ): void {
    this.clearLegacyInteractionCookies(res);
    const inject = `<script>window.__INTERACTION__=${JSON.stringify(bootstrap)};</script>`;
    const html = this.loadShell(kind).replace('</head>', `${inject}</head>`);
    res.type('html').send(html);
  }

  private renderExpiredPage(res: Response): void {
    res.status(400).type('html').send(`<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>会话已失效</title>
<style>body{font-family:system-ui,sans-serif;max-width:420px;margin:64px auto;padding:0 16px;color:#333;text-align:center}</style>
</head><body>
<h1>登录会话已失效</h1>
<p>请返回应用重新发起登录。</p>
</body></html>`);
  }

  private async buildBootstrap(
    prompt: 'login' | 'consent',
    details: { uid: string; params: Record<string, unknown> },
    error?: string,
  ): Promise<InteractionBootstrap> {
    const clientId = (details.params.client_id as string | undefined) ?? null;
    const redirectUri = details.params.redirect_uri as string | undefined;
    const scope = (details.params.scope as string | undefined) ?? 'openid profile email';
    const prefix = this.getGlobalPrefix();
    return {
      uid: details.uid,
      prompt,
      clientId,
      scope,
      restartAuthUrl: buildRestartAuthUrl(this.getOidcIssuer(), details.params),
      appReturnUrl:
        resolveAppReturnUrlFromRedirectUri(redirectUri) ?? this.resolveAppReturnUrl(clientId ?? undefined),
      error: error ?? null,
      ssoStatusUrl: `/${prefix}/interaction/sso/status`,
    };
  }

  /** SPA / 登录页探测：当前浏览器是否已有 IAM SSO 会话（同源调用，用于跨 tab 续登）。 */
  @Get('sso/status')
  async ssoStatus(@Req() req: Request, @Res() res: Response) {
    const accountId = await this.ensureOidc().getSessionAccountId(req, res);
    res.json({ authenticated: !!accountId });
  }

  /** 交互入口：按 prompt 渲染登录/授权 UI，或在已有会话/免授权时直接放行。 */
  @Get(':uid')
  async details(@Param('uid') uid: string, @Req() req: Request, @Res() res: Response) {
    const oidc = this.ensureOidc();
    const details = await this.resolveDetails(req, res, uid);
    if (!details) {
      this.renderExpiredPage(res);
      return;
    }

    const error = typeof req.query.error === 'string' ? req.query.error : undefined;

    if (details.prompt?.name === 'consent') {
      const clientId = details.params.client_id as string | undefined;
      // consentMode=never：自动建立 Grant 并完成授权，不展示确认页
      if (clientId && (await oidc.shouldAutoConsent(clientId))) {
        await oidc.finishConsent(req, res);
        return;
      }
      this.renderInteractionPage(res, 'consent', await this.buildBootstrap('consent', details, error));
      return;
    }

    // 已有 IAM SSO 会话：直接完成 login interaction（静默 SSO / 跨 tab 续登）
    if (details.prompt?.name === 'login' && details.session?.accountId) {
      await oidc.finishLogin(req, res, { accountId: details.session.accountId, remember: true });
      return;
    }

    this.renderInteractionPage(res, 'login', await this.buildBootstrap('login', details, error));
  }

  @Post(':uid/login')
  async login(@Param('uid') uid: string, @Req() req: Request, @Res() res: Response) {
    const email = String(req.body?.email ?? '').trim();
    const password = String(req.body?.password ?? '');
    if (!email || !password) {
      res.redirect(this.interactionUrl(uid, 'missing_credentials'));
      return;
    }

    const oidc = this.ensureOidc();
    const details = await this.resolveDetails(req, res, uid);
    if (!details) {
      res.redirect(this.interactionUrl(uid, 'interaction_expired'));
      return;
    }

    try {
      const user = await this.authService.verifyCredentialsWithAudit(email, password, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      await oidc.finishLogin(req, res, { accountId: user.id, remember: true });
    } catch (err) {
      if (this.isInvalidInteractionError(err)) {
        res.redirect(this.interactionUrl(uid, 'interaction_expired'));
        return;
      }
      res.redirect(this.interactionUrl(uid, 'invalid_credentials'));
    }
  }

  @Post(':uid/consent')
  async consent(@Param('uid') uid: string, @Req() req: Request, @Res() res: Response) {
    const oidc = this.ensureOidc();
    const details = await this.resolveDetails(req, res, uid);
    if (!details) {
      res.redirect(this.interactionUrl(uid, 'interaction_expired'));
      return;
    }

    if (details.prompt?.name !== 'consent') {
      res.redirect(this.interactionUrl(uid));
      return;
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
