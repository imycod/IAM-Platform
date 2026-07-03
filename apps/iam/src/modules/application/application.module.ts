import { Body, Controller, Get, Module, Post } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationEntity } from './application/entities/application.entity';
import { CreateApplicationDto } from './dto/create-application.dto';
import { ApplicationUserEntity } from './application-user/entities/application-user.entity';
import { ApplicationRoleEntity } from './application-role/entities/application-role.entity';
import { ApplicationSettingEntity } from './application-setting/entities/application-setting.entity';
import { ApplicationMenuModule } from './application-menu/application-menu.module';
import { ApplicationRoleModule } from './application-role/application-role.module';
import { ApplicationUserModule } from './application-user/application-user.module';
import { ApplicationService } from './services/application.service';
import { ApplicationUserGuard } from './guards/application-user.guard';

@Controller('applications')
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Post()
  create(@Body() dto: CreateApplicationDto) {
    return this.applicationService.create(dto);
  }

  @Get()
  findAll() {
    return this.applicationService.findAll();
  }
}

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ApplicationEntity,
      ApplicationUserEntity,
      ApplicationRoleEntity,
      ApplicationSettingEntity,
    ]),
    ApplicationMenuModule,
    ApplicationRoleModule,
    ApplicationUserModule,
  ],
  controllers: [ApplicationController],
  providers: [ApplicationService, ApplicationUserGuard],
  exports: [ApplicationService, ApplicationUserGuard, ApplicationRoleModule],
})
export class ApplicationModule {}
