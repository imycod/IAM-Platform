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
import { VerificationService } from '../services/verification.service';
import { CreateVerificationDto } from '../dto/create-verification.dto';
import { UpdateVerificationDto } from '../dto/update-verification.dto';
import { QueryVerificationDto } from '../dto/query-verification.dto';

@Controller('verifications')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post()
  create(@Body() dto: CreateVerificationDto) {
    return this.verificationService.create(dto);
  }

  @Get()
  findMany(@Query() query: QueryVerificationDto) {
    return this.verificationService.findMany(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.verificationService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateVerificationDto) {
    return this.verificationService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.verificationService.remove(id);
  }
}
