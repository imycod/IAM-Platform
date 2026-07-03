import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoginHistoryEntity } from './entities/login-history.entity';
import { LoginHistoryService } from './services/login-history.service';
import { LoginHistoryController } from './controllers/login-history.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LoginHistoryEntity])],
  controllers: [LoginHistoryController],
  providers: [LoginHistoryService],
  exports: [LoginHistoryService],
})
export class LoginHistoryModule {}
