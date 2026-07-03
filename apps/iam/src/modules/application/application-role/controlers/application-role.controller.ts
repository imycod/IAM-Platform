import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { ApplicationRoleService } from '../services/application-role.service';
import { CreateApplicationRoleDto } from '../dto/create-application-role.dto';
import { UpdateApplicationRoleDto } from '../dto/update-application-role.dto';
import { SetApplicationRolePermissionsDto } from '../dto/update-application-role.dto';
import type { ApplicationRoleDetailDto } from '../dto/application-role-detail.dto';

@Controller('applications/:applicationId/roles')
export class ApplicationRoleController {
  constructor(private readonly applicationRoleService: ApplicationRoleService) {}

  @Post()
  create(
    @Param('applicationId') applicationId: string,
    @Body() dto: CreateApplicationRoleDto,
  ): Promise<ApplicationRoleDetailDto> {
    Object.assign(dto, { applicationId });
    return this.applicationRoleService.create(dto);
  }

  @Get()
  findAll(@Param('applicationId') applicationId: string): Promise<ApplicationRoleDetailDto[]> {
    return this.applicationRoleService.findAll(applicationId);
  }

  @Get(':id')
  findOne(
    @Param('applicationId') applicationId: string,
    @Param('id') id: string,
  ): Promise<ApplicationRoleDetailDto> {
    return this.applicationRoleService.findOne(applicationId, id);
  }

  @Patch(':id')
  update(
    @Param('applicationId') applicationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateApplicationRoleDto,
  ): Promise<ApplicationRoleDetailDto> {
    return this.applicationRoleService.update(applicationId, id, dto);
  }

  @Get(':id/permissions')
  getPermissions(
    @Param('applicationId') applicationId: string,
    @Param('id') id: string,
  ): Promise<string[]> {
    return this.applicationRoleService.getPermissionIds(applicationId, id);
  }

  @Put(':id/permissions')
  setPermissions(
    @Param('applicationId') applicationId: string,
    @Param('id') id: string,
    @Body() dto: SetApplicationRolePermissionsDto,
  ): Promise<ApplicationRoleDetailDto> {
    return this.applicationRoleService.setPermissions(applicationId, id, dto.permissionIds);
  }

  @Delete(':id')
  remove(@Param('applicationId') applicationId: string, @Param('id') id: string) {
    return this.applicationRoleService.remove(applicationId, id);
  }
}
