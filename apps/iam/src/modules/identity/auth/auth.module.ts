import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { AccountModule } from '../account/account.module';
import { SessionModule } from '../session/session.module';
import { ProfileModule } from '../profile/profile.module';
import { LoginHistoryModule } from '../login-history/login-history.module';
import { OidcModule } from '../../security/oidc/oidc.module';
import { SystemModule } from '../../system/system.module';
import { AuthService } from './services/auth.service';
import { AuthAdminService } from './services/auth-admin.service';
import { AuthController } from './controllers/auth.controller';
import { AuthAdminController } from './controllers/auth-admin.controller';
import { BetterAuthFactory } from './better-auth/better-auth.factory';
import { InteractionController } from './interaction/interaction.controller';

/**
 * identity/auth：封装认证逻辑（credential + 可插拔 better-auth 引擎）与 OIDC 交互桥接。
 *
 * 这里 import OidcModule 仅为拿到 OIDC_INTERACTION 契约（唯一桥接点），
 * InteractionController 只依赖契约、不依赖 security 的具体实现。OidcModule 不反向依赖 identity，无循环。
 */
@Module({
  imports: [UserModule, AccountModule, SessionModule, ProfileModule, LoginHistoryModule, OidcModule, SystemModule],
  controllers: [AuthController, AuthAdminController, InteractionController],
  providers: [AuthService, AuthAdminService, BetterAuthFactory],
  exports: [AuthService],
})
export class AuthModule {}
