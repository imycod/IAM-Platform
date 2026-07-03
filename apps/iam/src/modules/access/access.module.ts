import { Module } from '@nestjs/common';
import { RoleModule } from './role/role.module';
import { PermissionModule } from './permission/permission.module';
import { MenuModule } from './menu/menu.module';
import { PolicyModule } from './policy/policy.module';
import { ResourceModule } from './resource/resource.module';
import { DataPermissionModule } from './data-permission/data-permission.module';
import { UserContextModule } from './user-context/user-context.module';
import { PermissionsGuard } from './guards/permissions.guard';

/**
 * Access 域：用户在应用里能做什么（RBAC + ABAC）。
 * 依赖方向：位于 Identity/Organization/Application 之下。
 */
@Module({
  imports: [
    RoleModule,
    PermissionModule,
    MenuModule,
    PolicyModule,
    ResourceModule,
    DataPermissionModule,
    UserContextModule,
  ],
  providers: [PermissionsGuard],
  exports: [
    RoleModule,
    PermissionModule,
    MenuModule,
    PolicyModule,
    ResourceModule,
    DataPermissionModule,
    PermissionsGuard,
  ],
})
export class AccessModule {}
