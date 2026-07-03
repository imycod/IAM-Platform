import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionEntity } from '../permission/entities/permission.entity';
import { DataPermissionEntity } from '../data-permission/entities/data-permission.entity';
import { ResourceEntity } from './entities/resource.entity';
import { ResourceService } from './services/resource.service';
import { ResourceController } from './controllers/resource.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ResourceEntity,
      PermissionEntity,
      DataPermissionEntity,
    ]),
  ],
  controllers: [ResourceController],
  providers: [ResourceService],
  exports: [ResourceService],
})
export class ResourceModule {}
