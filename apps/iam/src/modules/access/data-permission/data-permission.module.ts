import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataPermissionEntity } from './entities/data-permission.entity';
import { UserRoleEntity } from '../role/entities/user-role.entity';
import { RoleEntity } from '../role/entities/role.entity';
import { ResourceModule } from '../resource/resource.module';
import { DataPermissionService } from './services/data-permission.service';
import { DataPermissionController } from './controllers/data-permission.controller';

export type { ResolvedDataScope, DataPermissionListItem } from './services/data-permission.service';
export { DataScope } from './entities/data-permission.entity';
export { DataPermissionService } from './services/data-permission.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([DataPermissionEntity, UserRoleEntity, RoleEntity]),
    ResourceModule,
  ],
  controllers: [DataPermissionController],
  providers: [DataPermissionService],
  exports: [DataPermissionService],
})
export class DataPermissionModule {}
