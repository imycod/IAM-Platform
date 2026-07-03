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
import { SessionService } from '../services/session.service';
import { SessionRegistryService } from '../services/session-registry.service';
import { CreateSessionDto } from '../dto/create-session.dto';
import { UpdateSessionDto } from '../dto/update-session.dto';
import { QuerySessionDto } from '../dto/query-session.dto';
import { QuerySessionRegistryDto } from '../dto/query-session-registry.dto';
import { UnifiedSessionKind } from '../session-kind.enum';

@Controller('sessions')
export class SessionController {
  constructor(
    private readonly sessionService: SessionService,
    private readonly sessionRegistryService: SessionRegistryService,
  ) {}

  /** 会话中心：聚合门户 session + OIDC SSO / AccessToken */
  @Get('registry')
  findRegistry(@Query() query: QuerySessionRegistryDto) {
    return this.sessionRegistryService.findMany(query);
  }

  /** 踢下线：按 kind 吊销对应会话/令牌 */
  @Delete('registry/:kind/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  revokeRegistry(@Param('kind') kind: UnifiedSessionKind, @Param('id') id: string) {
    return this.sessionRegistryService.revoke(kind, id);
  }

  @Post()
  create(@Body() dto: CreateSessionDto) {
    return this.sessionService.create(dto);
  }

  @Get()
  findMany(@Query() query: QuerySessionDto) {
    return this.sessionService.findMany(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sessionService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSessionDto) {
    return this.sessionService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.sessionService.remove(id);
  }
}
