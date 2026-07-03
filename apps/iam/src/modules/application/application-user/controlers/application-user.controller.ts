import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApplicationUserService } from '../services/application-user.service';
import { CreateApplicationUserDto } from '../dto/create-application-user.dto';
import { UpdateApplicationUserDto } from '../dto/update-application-user.dto';
import type { ApplicationUserDetailDto } from '../dto/application-user-detail.dto';

@Controller('applications/:applicationId/users')
export class ApplicationUserController {
  constructor(private readonly applicationUserService: ApplicationUserService) {}

  @Post()
  create(
    @Param('applicationId') applicationId: string,
    @Body() dto: CreateApplicationUserDto,
  ): Promise<ApplicationUserDetailDto> {
    return this.applicationUserService.create(applicationId, dto);
  }

  @Get()
  findAll(@Param('applicationId') applicationId: string): Promise<ApplicationUserDetailDto[]> {
    return this.applicationUserService.findAll(applicationId);
  }

  @Get(':id')
  findOne(
    @Param('applicationId') applicationId: string,
    @Param('id') id: string,
  ): Promise<ApplicationUserDetailDto> {
    return this.applicationUserService.findOne(applicationId, id);
  }

  @Patch(':id')
  update(
    @Param('applicationId') applicationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateApplicationUserDto,
  ): Promise<ApplicationUserDetailDto> {
    return this.applicationUserService.update(applicationId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('applicationId') applicationId: string, @Param('id') id: string): Promise<void> {
    return this.applicationUserService.remove(applicationId, id);
  }
}
