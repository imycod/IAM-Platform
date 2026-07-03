import { Module } from '@nestjs/common';
import { ConfigModule } from '@app/config';
import { DatabaseModule } from '@app/database';
import { IdentityModule } from './modules/identity/identity.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { ApplicationModule } from './modules/application/application.module';
import { AccessModule } from './modules/access/access.module';
import { SecurityModule } from './modules/security/security.module';
import { NotificationModule } from './modules/notification/notification.module';
import { StorageModule } from './modules/storage/storage.module';
import { SystemModule } from './modules/system/system.module';

@Module({
  imports: [
    // 基础设施
    ConfigModule,
    DatabaseModule,

    // 业务域（依赖方向：Identity → Organization → Application → Access → Security）
    IdentityModule,
    OrganizationModule,
    ApplicationModule,
    AccessModule,
    SecurityModule,

    // 平台能力（任意域可依赖）
    NotificationModule,
    StorageModule,
    SystemModule,
  ],
})
export class AppModule {}
