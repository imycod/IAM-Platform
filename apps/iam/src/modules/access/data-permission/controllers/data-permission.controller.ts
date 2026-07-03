import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { DataPermissionService } from '../services/data-permission.service';
import { CreateDataPermissionDto, UpdateDataPermissionDto } from '../dto/data-permission.dto';

@Controller('data-permissions')
export class DataPermissionController {
  constructor(private readonly dataPermissionService: DataPermissionService) {}

  @Post()
  create(@Body() dto: CreateDataPermissionDto) {
    return this.dataPermissionService.create(dto);
  }

  @Get()
  findAll(@Query('roleId') roleId?: string, @Query('resource') resource?: string) {
    return this.dataPermissionService.findAll({ roleId, resource });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dataPermissionService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDataPermissionDto) {
    return this.dataPermissionService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.dataPermissionService.remove(id);
  }
}
