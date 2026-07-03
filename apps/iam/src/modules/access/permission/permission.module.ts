import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationEntity } from '../../application/application/entities/application.entity';
import { PermissionEntity } from './entities/permission.entity';
import { RolePermissionEntity } from '../role/entities/role-permission.entity';
import { UserRoleEntity } from '../role/entities/user-role.entity';
import { PermissionService } from './services/permission.service';
import { PermissionController } from './controllers/permission.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PermissionEntity,
      RolePermissionEntity,
      UserRoleEntity,
      ApplicationEntity,
    ]),
  ],
  controllers: [PermissionController],
  providers: [PermissionService],
  exports: [PermissionService],
})
export class PermissionModule {}
