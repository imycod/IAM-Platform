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
import { LoginHistoryService } from '../services/login-history.service';
import { CreateLoginHistoryDto } from '../dto/create-login-history.dto';
import { UpdateLoginHistoryDto } from '../dto/update-login-history.dto';
import { QueryLoginHistoryDto } from '../dto/query-login-history.dto';

@Controller('login-histories')
export class LoginHistoryController {
  constructor(private readonly loginHistoryService: LoginHistoryService) {}

  @Post()
  create(@Body() dto: CreateLoginHistoryDto) {
    return this.loginHistoryService.create(dto);
  }

  @Get()
  findMany(@Query() query: QueryLoginHistoryDto) {
    return this.loginHistoryService.findMany(query);
  }

  /** 一键删除：按查询条件批量软删除（无条件则清空全部） */
  @Delete('all')
  @HttpCode(HttpStatus.OK)
  removeAll(@Query() query: QueryLoginHistoryDto) {
    return this.loginHistoryService.removeAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.loginHistoryService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLoginHistoryDto) {
    return this.loginHistoryService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.loginHistoryService.remove(id);
  }
}
