import { randomBytes } from 'crypto';
import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserRepository } from '../../user/repositories/user.repository';
import { AccountService } from '../../account/services/account.service';
import { SessionService } from '../../session/services/session.service';
import { ProfileService } from '../../profile/services/profile.service';
import { UserEntity, UserStatus } from '../../user/entities/user.entity';
import { LoginHistoryService } from '../../login-history/services/login-history.service';
import { LoginType } from '../../login-history/entities/login-history.entity';
import { PortalSessionKind } from '../../session/session-kind.enum';

const CREDENTIAL_PROVIDER = 'credential';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface LoginContext {
  ip?: string;
  userAgent?: string;
  deviceId?: string;
  loginType?: LoginType;
}

export interface AuthResult {
  user: UserEntity;
  token: string;
  expiresAt: Date;
}

/**
 * identity/auth：纯认证逻辑（账号密码 / 会话），不感知 OIDC 协议。
 * 这是"封装 better-auth"的边界：内部实现可切换为 better-auth 引擎（见 better-auth.factory.ts），
 * 但对外只暴露 register / verifyCredentials / login / logout 这几个语义。
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly accountService: AccountService,
    private readonly sessionService: SessionService,
    private readonly profileService: ProfileService,
    private readonly loginHistoryService: LoginHistoryService,
  ) {}

  async register(params: {
    email: string;
    password: string;
    name?: string;
    nickname?: string;
  }): Promise<UserEntity> {
    const existing = await this.userRepository.findByEmail(params.email);
    if (existing) {
      throw new UnauthorizedException('该邮箱已注册');
    }

    const user = await this.userRepository.save(
      this.userRepository.create({
        email: params.email,
        name: params.name ?? null,
        status: UserStatus.ACTIVE,
      }),
    );

    const passwordHash = await bcrypt.hash(params.password, 10);
    await this.accountService.link({
      userId: user.id,
      providerId: CREDENTIAL_PROVIDER,
      accountId: params.email,
      password: passwordHash,
    });

    await this.profileService.upsert(user.id, { nickname: params.nickname ?? params.name });
    return user;
  }

  /** 校验账号密码，返回用户（供 interaction 桥接层调用）。 */
  async verifyCredentials(email: string, password: string): Promise<UserEntity> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('账号或密码错误');
    }
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('账号不可用');
    }
    const account = await this.accountService.findByProvider(CREDENTIAL_PROVIDER, email);
    if (!account?.password) {
      throw new UnauthorizedException('账号或密码错误');
    }
    const ok = await bcrypt.compare(password, account.password);
    if (!ok) {
      throw new UnauthorizedException('账号或密码错误');
    }
    return user;
  }

  /** 校验凭证；失败时写入登录审计（成功由 OIDC authorization.success 统一记录）。 */
  async verifyCredentialsWithAudit(
    email: string,
    password: string,
    ctx: LoginContext = {},
  ): Promise<UserEntity> {
    const loginType = ctx.loginType ?? LoginType.SSO;
    try {
      return await this.verifyCredentials(email, password);
    } catch (error) {
      await this.recordLoginAttempt({
        success: false,
        identifier: email,
        loginType,
        ip: ctx.ip ?? null,
        userAgent: ctx.userAgent ?? null,
        failReason: error instanceof UnauthorizedException ? error.message : '登录失败',
      });
      throw error;
    }
  }

  /** 登录：校验凭证并签发门户会话。 */
  async login(email: string, password: string, ctx: LoginContext = {}): Promise<AuthResult> {
    const loginType = ctx.loginType ?? LoginType.PASSWORD;
    try {
      const user = await this.verifyCredentials(email, password);
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
      await this.sessionService.createFromPartial({
        userId: user.id,
        kind: PortalSessionKind.PORTAL_PASSWORD,
        token,
        expiresAt,
        ipAddress: ctx.ip ?? null,
        userAgent: ctx.userAgent ?? null,
        deviceId: ctx.deviceId ?? null,
      });
      await this.userRepository.update(user.id, { lastLoginAt: new Date() });
      await this.recordLoginAttempt({
        success: true,
        userId: user.id,
        identifier: email,
        loginType,
        ip: ctx.ip ?? null,
        userAgent: ctx.userAgent ?? null,
      });
      return { user, token, expiresAt };
    } catch (error) {
      await this.recordLoginAttempt({
        success: false,
        identifier: email,
        loginType,
        ip: ctx.ip ?? null,
        userAgent: ctx.userAgent ?? null,
        failReason: error instanceof UnauthorizedException ? error.message : '登录失败',
      });
      throw error;
    }
  }

  private async recordLoginAttempt(data: {
    success: boolean;
    userId?: string;
    identifier: string;
    loginType: LoginType;
    ip?: string | null;
    userAgent?: string | null;
    failReason?: string;
  }): Promise<void> {
    try {
      await this.loginHistoryService.record(data);
    } catch {
      // 审计写入失败不应阻断登录流程
    }
  }

  /** 校验会话 token，返回对应用户。 */
  async validateSession(token: string): Promise<UserEntity | null> {
    const session = await this.sessionService.findByToken(token);
    if (!session || session.expiresAt.getTime() < Date.now()) {
      return null;
    }
    return this.userRepository.findById(session.userId);
  }

  async logout(token: string): Promise<void> {
    const session = await this.sessionService.findByToken(token);
    if (session) {
      await this.sessionService.revoke(session.id);
    }
  }
}
