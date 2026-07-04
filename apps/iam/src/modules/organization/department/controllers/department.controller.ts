import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { DepartmentService } from '../services/department.service';
import {
  CreateDepartmentDto,
  QueryDepartmentDto,
  UpdateDepartmentDto,
} from '../dto/department.dto';

@Controller('departments')
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Post()
  create(@Body() dto: CreateDepartmentDto) {
    return this.departmentService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryDepartmentDto) {
    return this.departmentService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.departmentService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.departmentService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.departmentService.remove(id);
  }
}
