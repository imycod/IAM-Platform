import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleModule } from '../../access/role/role.module';
import { ApplicationRoleModule } from '../application-role/application-role.module';
import { ApplicationUserController } from './controlers/application-user.controller';
import { ApplicationUserService } from './services/application-user.service';
import { ApplicationUserEntity } from './entities/application-user.entity';
import { ApplicationEntity } from '../application/entities/application.entity';
import { ApplicationRoleEntity } from '../application-role/entities/application-role.entity';
import { UserEntity } from '../../identity/user/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ApplicationUserEntity,
      ApplicationEntity,
      ApplicationRoleEntity,
      UserEntity,
    ]),
    ApplicationRoleModule,
    RoleModule,
  ],
  controllers: [ApplicationUserController],
  providers: [ApplicationUserService],
  exports: [ApplicationUserService],
})
export class ApplicationUserModule {}
