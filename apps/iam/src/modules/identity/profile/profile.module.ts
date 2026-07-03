import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileEntity } from './entities/profile.entity';
import { ProfileService } from './services/profile.service';
import { ProfileController } from './controllers/profile.controller';
import { ProfileAdminController } from './controllers/profile-admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProfileEntity])],
  controllers: [ProfileController, ProfileAdminController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
