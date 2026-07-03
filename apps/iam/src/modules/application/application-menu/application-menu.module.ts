import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationMenuEntity } from './entities/application-menu.entity';
import { ApplicationMenuService } from './services/application-menu.service';
import { ApplicationMenuController } from './controllers/application-menu.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ApplicationMenuEntity])],
  controllers: [ApplicationMenuController],
  providers: [ApplicationMenuService],
  exports: [ApplicationMenuService],
})
export class ApplicationMenuModule {}
