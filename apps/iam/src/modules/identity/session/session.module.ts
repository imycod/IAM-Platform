import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationModule } from '../../application/application.module';
import { OidcModule } from '../../security/oidc/oidc.module';
import { OauthClientModule } from '../../security/oauth-client/oauth-client.module';
import { UserModule } from '../user/user.module';
import { SessionEntity } from './entities/session.entity';
import { SessionService } from './services/session.service';
import { SessionRegistryService } from './services/session-registry.service';
import { SessionController } from './controllers/session.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([SessionEntity]),
    OidcModule,
    OauthClientModule,
    ApplicationModule,
    UserModule,
  ],
  controllers: [SessionController],
  providers: [SessionService, SessionRegistryService],
  exports: [SessionService, SessionRegistryService],
})
export class SessionModule {}
