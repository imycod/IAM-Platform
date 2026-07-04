import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { EmployeeEntity } from '../entities/employee.entity';
import { OrganizationEntity } from '../../organization/entities/organization.entity';
import { DepartmentEntity } from '../../department/entities/department.entity';
import { PositionEntity } from '../../position/entities/position.entity';
import { UserEntity } from '../../../identity/user/entities/user.entity';
import {
  CreateEmployeeDto,
  QueryEmployeeDto,
  UpdateEmployeeDto,
} from '../dto/employee.dto';

export type EmployeeListItem = Pick<
  EmployeeEntity,
  | 'id'
  | 'userId'
  | 'organizationId'
  | 'departmentId'
  | 'positionId'
  | 'employeeNo'
  | 'status'
  | 'hiredAt'
  | 'createdAt'
  | 'updatedAt'
> & {
  userEmail?: string | null;
  userName?: string | null;
  organizationName?: string | null;
  departmentName?: string | null;
  positionName?: string | null;
};

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(EmployeeEntity)
    private readonly repo: Repository<EmployeeEntity>,
    @InjectRepository(OrganizationEntity)
    private readonly orgRepo: Repository<OrganizationEntity>,
    @InjectRepository(DepartmentEntity)
    private readonly deptRepo: Repository<DepartmentEntity>,
    @InjectRepository(PositionEntity)
    private readonly positionRepo: Repository<PositionEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  async create(dto: CreateEmployeeDto): Promise<EmployeeListItem> {
    await this.assertOrganization(dto.organizationId);
    await this.assertUser(dto.userId);
    if (dto.departmentId) {
      await this.assertDepartment(dto.departmentId, dto.organizationId);
    }
    if (dto.positionId) {
      await this.assertPosition(dto.positionId, dto.organizationId);
    }
    const exists = await this.repo.findOne({
      where: { organizationId: dto.organizationId, userId: dto.userId },
    });
    if (exists) {
      throw new ConflictException('该用户在此组织下已有员工档案');
    }
    const saved = await this.repo.save(
      this.repo.create({
        userId: dto.userId,
        organizationId: dto.organizationId,
        departmentId: dto.departmentId ?? null,
        positionId: dto.positionId ?? null,
        employeeNo: dto.employeeNo ?? null,
        status: dto.status ?? 'active',
        hiredAt: dto.hiredAt ?? null,
      }),
    );
    return this.findOne(saved.id);
  }

  async findAll(query?: QueryEmployeeDto): Promise<EmployeeListItem[]> {
    const qb = this.repo.createQueryBuilder('e').orderBy('e.createdAt', 'DESC');
    if (query?.organizationId) {
      qb.andWhere('e.organizationId = :organizationId', { organizationId: query.organizationId });
    }
    if (query?.userId) {
      qb.andWhere('e.userId = :userId', { userId: query.userId });
    }
    const rows = await qb.getMany();
    return this.enrich(rows);
  }

  async findOne(id: string): Promise<EmployeeListItem> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('员工不存在');
    }
    const [enriched] = await this.enrich([row]);
    return enriched;
  }

  async findByUser(userId: string): Promise<EmployeeEntity | null> {
    return this.repo.findOne({ where: { userId } });
  }

  async update(id: string, dto: UpdateEmployeeDto): Promise<EmployeeListItem> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('员工不存在');
    }
    if (dto.departmentId !== undefined && dto.departmentId) {
      await this.assertDepartment(dto.departmentId, row.organizationId);
    }
    if (dto.positionId !== undefined && dto.positionId) {
      await this.assertPosition(dto.positionId, row.organizationId);
    }
    Object.assign(row, dto);
    const saved = await this.repo.save(row);
    return this.findOne(saved.id);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.repo.softDelete({ id });
  }

  private async enrich(rows: EmployeeEntity[]): Promise<EmployeeListItem[]> {
    if (rows.length === 0) {
      return [];
    }
    const userIds = [...new Set(rows.map((r) => r.userId))];
    const orgIds = [...new Set(rows.map((r) => r.organizationId))];
    const deptIds = [...new Set(rows.map((r) => r.departmentId).filter(Boolean) as string[])];
    const posIds = [...new Set(rows.map((r) => r.positionId).filter(Boolean) as string[])];

    const [users, orgs, depts, positions] = await Promise.all([
      this.userRepo.find({ where: { id: In(userIds) } }),
      this.orgRepo.find({ where: { id: In(orgIds) } }),
      deptIds.length ? this.deptRepo.find({ where: { id: In(deptIds) } }) : Promise.resolve([]),
      posIds.length ? this.positionRepo.find({ where: { id: In(posIds) } }) : Promise.resolve([]),
    ]);

    const userMap = new Map(users.map((u) => [u.id, u]));
    const orgMap = new Map(orgs.map((o) => [o.id, o]));
    const deptMap = new Map(depts.map((d) => [d.id, d]));
    const posMap = new Map(positions.map((p) => [p.id, p]));

    return rows.map((row) => ({
      ...row,
      userEmail: userMap.get(row.userId)?.email ?? null,
      userName: userMap.get(row.userId)?.name ?? null,
      organizationName: orgMap.get(row.organizationId)?.name ?? null,
      departmentName: row.departmentId ? deptMap.get(row.departmentId)?.name ?? null : null,
      positionName: row.positionId ? posMap.get(row.positionId)?.name ?? null : null,
    }));
  }

  private async assertOrganization(organizationId: string): Promise<void> {
    const org = await this.orgRepo.findOne({ where: { id: organizationId } });
    if (!org) {
      throw new NotFoundException('组织不存在');
    }
  }

  private async assertUser(userId: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
  }

  private async assertDepartment(departmentId: string, organizationId: string): Promise<void> {
    const dept = await this.deptRepo.findOne({ where: { id: departmentId } });
    if (!dept || dept.organizationId !== organizationId) {
      throw new NotFoundException('部门不存在或不属于该组织');
    }
  }

  private async assertPosition(positionId: string, organizationId: string): Promise<void> {
    const pos = await this.positionRepo.findOne({ where: { id: positionId } });
    if (!pos || pos.organizationId !== organizationId) {
      throw new NotFoundException('岗位不存在或不属于该组织');
    }
  }
}
