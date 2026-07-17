import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OIDC_INTERACTION } from '@app/contracts';
import { OidcPayloadEntity } from './entities/oidc-payload.entity';
import { OidcService } from './services/oidc.service';
import { OidcSessionAdminService } from './services/oidc-session-admin.service';
import { OidcBearerGuard } from '../guards/oidc-bearer.guard';
import { OauthClientModule } from '../oauth-client/oauth-client.module';
import { ApplicationModule } from '../../application/application.module';
import { UserEntity } from '../../identity/user/entities/user.entity';
import { LoginHistoryModule } from '../../identity/login-history/login-history.module';
import { SystemModule } from '../../system/system.module';

/**
 * node-oidc-provider 的请求处理器在 main.ts 里通过 express 的 app.use('/oidc', ...) 挂载，
 * express 会自动剥离 /oidc 前缀，正好符合 provider 路由（相对根路径）的预期。
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([OidcPayloadEntity, UserEntity]),
    OauthClientModule,
    ApplicationModule,
    LoginHistoryModule,
    SystemModule,
  ],
  providers: [
    OidcService,
    OidcSessionAdminService,
    OidcBearerGuard,
    // 通过契约暴露给 identity/auth/interaction 桥接层
    { provide: OIDC_INTERACTION, useExisting: OidcService },
  ],
  exports: [OidcService, OidcSessionAdminService, OidcBearerGuard, OIDC_INTERACTION],
})
export class OidcModule {}
