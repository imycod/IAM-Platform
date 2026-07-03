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
import { ApplicationMenuService } from '../services/application-menu.service';
import { CreateApplicationMenuDto } from '../dto/create-application-menu.dto';
import { UpdateApplicationMenuDto } from '../dto/update-application-menu.dto';

@Controller('applications/:applicationId/menus')
export class ApplicationMenuController {
  constructor(private readonly applicationMenuService: ApplicationMenuService) {}

  @Post()
  create(@Param('applicationId') applicationId: string, @Body() dto: CreateApplicationMenuDto) {
    return this.applicationMenuService.create(applicationId, dto);
  }

  @Get()
  findAll(
    @Param('applicationId') applicationId: string,
    @Query('tree') tree?: string,
  ) {
    if (tree === 'true') {
      return this.applicationMenuService.findTree(applicationId);
    }
    return this.applicationMenuService.findAll(applicationId);
  }

  @Get(':id')
  findOne(@Param('applicationId') applicationId: string, @Param('id') id: string) {
    return this.applicationMenuService.findOne(applicationId, id);
  }

  @Patch(':id')
  update(
    @Param('applicationId') applicationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateApplicationMenuDto,
  ) {
    return this.applicationMenuService.update(applicationId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('applicationId') applicationId: string, @Param('id') id: string) {
    return this.applicationMenuService.remove(applicationId, id);
  }
}
