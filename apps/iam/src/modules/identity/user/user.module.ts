import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountModule } from '../account/account.module';
import { SessionEntity } from '../session/entities/session.entity';
import { UserEntity } from './entities/user.entity';
import { UserRepository } from './repositories/user.repository';
import { UserService } from './services/user.service';
import { UserController } from './controllers/user.controller';

//  一个人 (user) 这个人是谁 + 多种登录方式（account）type： password、wechat、google
@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, SessionEntity]),
    AccountModule,
  ],
  controllers: [UserController],
  providers: [UserRepository, UserService],
  exports: [UserService, UserRepository],
})
export class UserModule {}
