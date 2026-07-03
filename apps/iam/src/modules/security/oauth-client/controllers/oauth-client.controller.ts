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
import { OauthClientService } from '../services/oauth-client.service';
import { CreateOauthClientDto } from '../dto/create-oauth-client.dto';
import { UpdateOauthClientDto } from '../dto/update-oauth-client.dto';
import { QueryOauthClientDto } from '../dto/query-oauth-client.dto';
import type { OauthClientDetailDto } from '../dto/oauth-client-detail.dto';

@Controller('oauth-clients')
export class OauthClientController {
  constructor(private readonly oauthClientService: OauthClientService) {}

  @Post()
  create(@Body() dto: CreateOauthClientDto): Promise<OauthClientDetailDto> {
    return this.oauthClientService.create(dto);
  }

  @Get()
  findMany(@Query() query: QueryOauthClientDto) {
    return this.oauthClientService.findMany(query);
  }

  @Get('by-application/:applicationId')
  findByApplication(
    @Param('applicationId') applicationId: string,
  ): Promise<OauthClientDetailDto | null> {
    return this.oauthClientService.findByApplicationId(applicationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<OauthClientDetailDto> {
    return this.oauthClientService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOauthClientDto,
  ): Promise<OauthClientDetailDto> {
    return this.oauthClientService.update(id, dto);
  }

  @Post(':id/rotate-secret')
  rotateSecret(@Param('id') id: string): Promise<OauthClientDetailDto> {
    return this.oauthClientService.rotateSecret(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.oauthClientService.remove(id);
  }
}
