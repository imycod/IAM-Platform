import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationEntity } from '../../application/application/entities/application.entity';
import { OauthClientEntity } from './entities/oauth-client.entity';
import { OauthClientService } from './services/oauth-client.service';
import { OauthClientController } from './controllers/oauth-client.controller';

@Module({
  imports: [TypeOrmModule.forFeature([OauthClientEntity, ApplicationEntity])],
  controllers: [OauthClientController],
  providers: [OauthClientService],
  exports: [OauthClientService],
})
export class OauthClientModule {}
