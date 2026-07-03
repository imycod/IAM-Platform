import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationMenuEntity } from '../../application/application-menu/entities/application-menu.entity';
import { ApplicationEntity } from '../../application/application/entities/application.entity';
import { UserEntity } from '../../identity/user/entities/user.entity';
import { ApplicationModule } from '../../application/application.module';
import { SecurityModule } from '../../security/security.module';
import { IdentityModule } from '../../identity/identity.module';
import { PermissionModule } from '../permission/permission.module';
import { RoleModule } from '../role/role.module';
import { DataPermissionModule } from '../data-permission/data-permission.module';
import { PermissionsGuard } from '../guards/permissions.guard';
import { OidcBearerGuard } from '../../security/guards/oidc-bearer.guard';
import { UserContextController } from './user-context.controller';
import { ApplicationRuntimeController } from './application-runtime.controller';
import { PortalController } from './portal.controller';
import { UserContextService } from './user-context.service';
import { PortalMenuService } from './portal-menu.service';
import { SessionBearerGuard } from './guards/session-bearer.guard';
import { PortalOrOidcGuard } from './guards/portal-or-oidc.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([ApplicationMenuEntity, ApplicationEntity, UserEntity]),
    PermissionModule,
    RoleModule,
    DataPermissionModule,
    SecurityModule,
    ApplicationModule,
    IdentityModule,
  ],
  controllers: [UserContextController, ApplicationRuntimeController, PortalController],
  providers: [
    UserContextService,
    PortalMenuService,
    PermissionsGuard,
    OidcBearerGuard,
    SessionBearerGuard,
    PortalOrOidcGuard,
  ],
})
export class UserContextModule {}
