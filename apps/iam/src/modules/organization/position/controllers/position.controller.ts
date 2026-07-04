import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { PositionService } from '../services/position.service';
import { CreatePositionDto, QueryPositionDto, UpdatePositionDto } from '../dto/position.dto';

@Controller('positions')
export class PositionController {
  constructor(private readonly positionService: PositionService) {}

  @Post()
  create(@Body() dto: CreatePositionDto) {
    return this.positionService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryPositionDto) {
    return this.positionService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.positionService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePositionDto) {
    return this.positionService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.positionService.remove(id);
  }
}
