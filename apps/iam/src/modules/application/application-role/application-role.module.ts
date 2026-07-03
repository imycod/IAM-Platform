import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleModule } from '../../access/role/role.module';
import { PermissionModule } from '../../access/permission/permission.module';
import { ApplicationEntity } from '../application/entities/application.entity';
import { ApplicationRoleController } from './controlers/application-role.controller';
import { ApplicationRoleService } from './services/application-role.service';
import { ApplicationRoleEntity } from './entities/application-role.entity';
import { RoleEntity } from '../../access/role/entities/role.entity';
import { PermissionEntity } from '../../access/permission/entities/permission.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ApplicationRoleEntity,
      ApplicationEntity,
      RoleEntity,
      PermissionEntity,
    ]),
    RoleModule,
    PermissionModule,
  ],
  controllers: [ApplicationRoleController],
  providers: [ApplicationRoleService],
  exports: [ApplicationRoleService],
})
export class ApplicationRoleModule {}
