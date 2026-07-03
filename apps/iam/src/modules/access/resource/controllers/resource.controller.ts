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
  Query,
} from '@nestjs/common';
import {
  CreateResourceDto,
  QueryResourceDto,
  UpdateResourceDto,
} from '../dto/resource.dto';
import { ResourceService } from '../services/resource.service';

@Controller('resources')
export class ResourceController {
  constructor(private readonly resourceService: ResourceService) {}

  @Post()
  create(@Body() dto: CreateResourceDto) {
    return this.resourceService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryResourceDto) {
    return this.resourceService.findAll(query);
  }

  @Post('sync-from-permissions')
  syncFromPermissions() {
    return this.resourceService.syncFromPermissions();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resourceService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateResourceDto) {
    return this.resourceService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.resourceService.remove(id);
  }
}
