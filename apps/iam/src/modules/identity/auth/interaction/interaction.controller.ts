import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveInteractionUiDir } from './interaction-ui.paths';
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
   * 解析本 URL uid 对应的 interaction：URL path 的 uid 为权威来源，直接按 uid 查库。
   * 不依赖浏览器 _interaction cookie（per-path cookie 在跨 302 或代理场景下常未就绪）。
   */
  private async resolveDetails(_req: Request, res: Response, uid: string) {
    const details = await this.ensureOidc().findInteractionByUid(uid);
    if (!details) {
      return null;
    }
    this.setInteractionCookiesOnResponse(res, uid);
    return details;
  }

  /** 给浏览器种 per-uid interaction cookie，便于后续 /oidc/auth/:uid resume。 */
  private setInteractionCookiesOnResponse(res: Response, uid: string): void {
    const prefix = this.getGlobalPrefix();
    const path = `/${prefix}/interaction/${uid}`;
    const opts = { path, httpOnly: true, sameSite: 'lax' as const, maxAge: 3600_000 };
    res.cookie('_interaction', uid, opts);
    res.clearCookie('_interaction', { path: '/' });
    res.clearCookie('_interaction.sig', { path: '/' });
  }

  /** 读取 interaction UI 静态外壳，把资源指向同源 /interaction-assets，缓存一次。 */
  private loadShell(kind: 'login' | 'consent'): string {
    if (kind === 'login' && this.loginShell) {
      return this.loginShell;
    }
    if (kind === 'consent' && this.consentShell) {
      return this.consentShell;
    }
    const baseDir = resolveInteractionUiDir();
    const file = kind === 'login' ? 'login.html' : 'consent.html';
    const raw = readFileSync(join(baseDir, file), 'utf8');
    const transformed = raw.replace(/\.\/assets\//g, '/interaction-assets/');
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
        await oidc.finishConsent(req, res, uid);
        return;
      }
      this.renderInteractionPage(res, 'consent', await this.buildBootstrap('consent', details, error));
      return;
    }

    // 已有 IAM SSO 会话：直接完成 login interaction（静默 SSO / 跨 tab 续登）
    if (details.prompt?.name === 'login' && details.session?.accountId) {
      await oidc.finishLogin(req, res, { accountId: details.session.accountId, remember: true }, uid);
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
      await oidc.finishLogin(req, res, { accountId: user.id, remember: true }, uid);
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

    await oidc.finishConsent(req, res, uid);
  }

  @Post(':uid/abort')
  async abort(@Req() req: Request, @Res() res: Response) {
    await this.ensureOidc().abort(req, res, 'access_denied', '用户取消登录');
    res.status(200).json({ success: true });
  }
}
