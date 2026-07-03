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

  private redirectToLoginPage(res: Response, uid: string, error?: string): void {
    const base = this.getIamLoginUrl();
    if (!base) {
      return;
    }
    const url = new URL(base);
    url.searchParams.set('uid', uid);
    if (error) {
      url.searchParams.set('error', error);
    }
    res.redirect(url.toString());
  }

  @Get(':uid')
  async details(@Param('uid') uid: string, @Req() req: Request, @Res() res: Response) {
    const oidc = this.ensureOidc();
    const details = await oidc.getDetails(req, res);

    // 登录后若仍需 consent，自动完成授权（避免卡在 /oidc/auth/:resume 303 循环）
    if (details.prompt?.name === 'consent') {
      await oidc.finishConsent(req, res);
      return;
    }

    const iamLoginUrl = this.getIamLoginUrl();
    if (iamLoginUrl) {
      this.redirectToLoginPage(res, uid);
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
    try {
      const user = await this.authService.verifyCredentialsWithAudit(email, password, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      await oidc.finishLogin(req, res, { accountId: user.id, remember: true });
    } catch {
      if (this.getIamLoginUrl()) {
        this.redirectToLoginPage(res, uid, 'invalid_credentials');
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
