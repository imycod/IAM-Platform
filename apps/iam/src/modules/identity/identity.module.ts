import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ProfileModule } from './profile/profile.module';
import { SessionModule } from './session/session.module';
import { AccountModule } from './account/account.module';
import { VerificationModule } from './verification/verification.module';
import { DeviceModule } from './device/device.module';
import { LoginHistoryModule } from './login-history/login-history.module';

/**
 * Identity 域：回答"这个用户是谁，以及如何登录"。
 * auth（better-auth 封装）与 auth/interaction（对接 node-oidc-provider 的桥接层）后续补充。
 */
@Module({
  imports: [
    UserModule,
    ProfileModule,
    SessionModule,
    AccountModule,
    VerificationModule,
    DeviceModule,
    LoginHistoryModule,
    AuthModule,
  ],
  exports: [
    UserModule,
    ProfileModule,
    SessionModule,
    AccountModule,
    VerificationModule,
    DeviceModule,
    LoginHistoryModule,
    AuthModule,
  ],
})
export class IdentityModule {}
