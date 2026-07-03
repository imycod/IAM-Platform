import { Module } from '@nestjs/common';
import { OauthClientModule } from './oauth-client/oauth-client.module';
import { OidcModule } from './oidc/oidc.module';
import { TokenModule } from './token/token.module';
import { ApiKeyModule } from './api-key/api-key.module';
import { AuditModule } from './audit/audit.module';
import { LoginPolicyModule } from './login-policy/login-policy.module';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { BlacklistModule } from './blacklist/blacklist.module';

/**
 * Security 域：安全协议与安全治理。
 * OidcModule 导出 OIDC_INTERACTION 契约，供 identity/auth/interaction 桥接。
 */
@Module({
  imports: [
    OauthClientModule,
    OidcModule,
    TokenModule,
    ApiKeyModule,
    AuditModule,
    LoginPolicyModule,
    RateLimitModule,
    BlacklistModule,
  ],
  exports: [
    OauthClientModule,
    OidcModule,
    TokenModule,
    ApiKeyModule,
    AuditModule,
    LoginPolicyModule,
    RateLimitModule,
    BlacklistModule,
  ],
})
export class SecurityModule {}
