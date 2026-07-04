import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TeamEntity } from '../entities/team.entity';
import { TeamMemberEntity } from '../entities/team-member.entity';
import { OrganizationEntity } from '../../organization/entities/organization.entity';
import { EmployeeEntity } from '../../employee/entities/employee.entity';
import {
  AddTeamMemberDto,
  CreateTeamDto,
  QueryTeamDto,
  UpdateTeamDto,
} from '../dto/team.dto';

export type TeamListItem = Pick<
  TeamEntity,
  'id' | 'organizationId' | 'name' | 'code' | 'description' | 'createdAt' | 'updatedAt'
> & {
  organizationName?: string | null;
  memberCount?: number;
};

export type TeamMemberListItem = Pick<
  TeamMemberEntity,
  'id' | 'teamId' | 'employeeId' | 'roleInTeam' | 'createdAt'
> & {
  employeeNo?: string | null;
  userEmail?: string | null;
  userName?: string | null;
};

@Injectable()
export class TeamService {
  constructor(
    @InjectRepository(TeamEntity)
    private readonly repo: Repository<TeamEntity>,
    @InjectRepository(TeamMemberEntity)
    private readonly memberRepo: Repository<TeamMemberEntity>,
    @InjectRepository(OrganizationEntity)
    private readonly orgRepo: Repository<OrganizationEntity>,
    @InjectRepository(EmployeeEntity)
    private readonly employeeRepo: Repository<EmployeeEntity>,
  ) {}

  async create(dto: CreateTeamDto): Promise<TeamListItem> {
    await this.assertOrganization(dto.organizationId);
    const exists = await this.repo.findOne({
      where: { organizationId: dto.organizationId, code: dto.code },
    });
    if (exists) {
      throw new ConflictException('该组织下团队编码已存在');
    }
    const saved = await this.repo.save(
      this.repo.create({
        organizationId: dto.organizationId,
        name: dto.name,
        code: dto.code,
        description: dto.description ?? null,
      }),
    );
    return this.findOne(saved.id);
  }

  async findAll(query?: QueryTeamDto): Promise<TeamListItem[]> {
    const qb = this.repo.createQueryBuilder('t').orderBy('t.createdAt', 'DESC');
    if (query?.organizationId) {
      qb.andWhere('t.organizationId = :organizationId', { organizationId: query.organizationId });
    }
    const rows = await qb.getMany();
    return this.enrichTeams(rows);
  }

  async findOne(id: string): Promise<TeamListItem> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('团队不存在');
    }
    const [enriched] = await this.enrichTeams([row]);
    return enriched;
  }

  async update(id: string, dto: UpdateTeamDto): Promise<TeamListItem> {
    const row = await this.findOne(id);
    if (dto.code && dto.code !== row.code) {
      const exists = await this.repo.findOne({
        where: { organizationId: row.organizationId, code: dto.code },
      });
      if (exists) {
        throw new ConflictException('该组织下团队编码已存在');
      }
    }
    Object.assign(row, dto);
    const saved = await this.repo.save(row);
    return this.findOne(saved.id);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.memberRepo.softDelete({ teamId: id });
    await this.repo.softDelete({ id });
  }

  async listMembers(teamId: string): Promise<TeamMemberListItem[]> {
    await this.findOne(teamId);
    const members = await this.memberRepo.find({ where: { teamId }, order: { createdAt: 'DESC' } });
    if (members.length === 0) {
      return [];
    }
    const employeeIds = members.map((m) => m.employeeId);
    const employees = await this.employeeRepo.find({ where: { id: In(employeeIds) } });
    const empMap = new Map(employees.map((e) => [e.id, e]));
    return members.map((m) => {
      const emp = empMap.get(m.employeeId);
      return {
        ...m,
        employeeNo: emp?.employeeNo ?? null,
        userEmail: null,
        userName: null,
      };
    });
  }

  async addMember(teamId: string, dto: AddTeamMemberDto): Promise<TeamMemberEntity> {
    const team = await this.findOne(teamId);
    const employee = await this.employeeRepo.findOne({ where: { id: dto.employeeId } });
    if (!employee || employee.organizationId !== team.organizationId) {
      throw new NotFoundException('员工不存在或不属于该团队所在组织');
    }
    const exists = await this.memberRepo.findOne({
      where: { teamId, employeeId: dto.employeeId },
    });
    if (exists) {
      throw new ConflictException('该员工已在团队中');
    }
    return this.memberRepo.save(
      this.memberRepo.create({
        teamId,
        employeeId: dto.employeeId,
        roleInTeam: dto.roleInTeam ?? null,
      }),
    );
  }

  async removeMember(teamId: string, memberId: string): Promise<void> {
    await this.findOne(teamId);
    const member = await this.memberRepo.findOne({ where: { id: memberId, teamId } });
    if (!member) {
      throw new NotFoundException('团队成员不存在');
    }
    await this.memberRepo.softDelete({ id: memberId });
  }

  private async enrichTeams(rows: TeamEntity[]): Promise<TeamListItem[]> {
    if (rows.length === 0) {
      return [];
    }
    const orgIds = [...new Set(rows.map((r) => r.organizationId))];
    const orgs = await this.orgRepo.find({ where: { id: In(orgIds) } });
    const orgMap = new Map(orgs.map((o) => [o.id, o]));

    const teamIds = rows.map((r) => r.id);
    const counts = await this.memberRepo
      .createQueryBuilder('m')
      .select('m.teamId', 'teamId')
      .addSelect('COUNT(*)', 'cnt')
      .where('m.teamId IN (:...teamIds)', { teamIds })
      .groupBy('m.teamId')
      .getRawMany<{ teamId: string; cnt: string }>();
    const countMap = new Map(counts.map((c) => [c.teamId, Number(c.cnt)]));

    return rows.map((row) => ({
      ...row,
      organizationName: orgMap.get(row.organizationId)?.name ?? null,
      memberCount: countMap.get(row.id) ?? 0,
    }));
  }

  private async assertOrganization(organizationId: string): Promise<void> {
    const org = await this.orgRepo.findOne({ where: { id: organizationId } });
    if (!org) {
      throw new NotFoundException('组织不存在');
    }
  }
}
