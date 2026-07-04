import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { TeamService } from '../services/team.service';
import { AddTeamMemberDto, CreateTeamDto, QueryTeamDto, UpdateTeamDto } from '../dto/team.dto';

@Controller('teams')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Post()
  create(@Body() dto: CreateTeamDto) {
    return this.teamService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryTeamDto) {
    return this.teamService.findAll(query);
  }

  @Get(':id/members')
  listMembers(@Param('id') id: string) {
    return this.teamService.listMembers(id);
  }

  @Post(':id/members')
  addMember(@Param('id') id: string, @Body() dto: AddTeamMemberDto) {
    return this.teamService.addMember(id, dto);
  }

  @Delete(':id/members/:memberId')
  removeMember(@Param('id') id: string, @Param('memberId') memberId: string) {
    return this.teamService.removeMember(id, memberId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teamService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTeamDto) {
    return this.teamService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.teamService.remove(id);
  }
}
