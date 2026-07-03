import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { RoleService } from '../services/role.service';
import { AssignRoleDto, CreateRoleDto, SetPermissionsDto } from '../dto/role.dto';

@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  create(@Body() dto: CreateRoleDto) {
    return this.roleService.create(dto);
  }

  @Get()
  findAll(@Query('applicationId') applicationId?: string, @Query('all') all?: string) {
    return this.roleService.findAll(applicationId, all === 'true');
  }

  @Get('assignments')
  listAssignments(
    @Query('applicationId') applicationId?: string,
    @Query('roleId') roleId?: string,
    @Query('userId') userId?: string,
  ) {
    return this.roleService.listUserRoleAssignments({ applicationId, roleId, userId });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roleService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.roleService.remove(id);
  }

  @Get(':id/permissions')
  getPermissions(@Param('id') id: string) {
    return this.roleService.getPermissionIds(id);
  }

  @Put(':id/permissions')
  setPermissions(@Param('id') id: string, @Body() dto: SetPermissionsDto) {
    return this.roleService.setPermissions(id, dto.permissionIds);
  }

  @Post(':id/assign')
  assign(@Param('id') id: string, @Body() dto: AssignRoleDto) {
    return this.roleService.assignToUser(dto.userId, id, dto.applicationId);
  }

  @Delete(':id/users/:userId')
  revoke(@Param('id') id: string, @Param('userId') userId: string) {
    return this.roleService.revokeFromUser(userId, id);
  }
}
