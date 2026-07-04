import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DepartmentEntity } from '../entities/department.entity';
import { OrganizationEntity } from '../../organization/entities/organization.entity';
import {
  CreateDepartmentDto,
  QueryDepartmentDto,
  UpdateDepartmentDto,
} from '../dto/department.dto';

@Injectable()
export class DepartmentService {
  constructor(
    @InjectRepository(DepartmentEntity)
    private readonly repo: Repository<DepartmentEntity>,
    @InjectRepository(OrganizationEntity)
    private readonly orgRepo: Repository<OrganizationEntity>,
  ) {}

  async create(dto: CreateDepartmentDto): Promise<DepartmentEntity> {
    await this.assertOrganization(dto.organizationId);
    const exists = await this.repo.findOne({
      where: { organizationId: dto.organizationId, code: dto.code },
    });
    if (exists) {
      throw new ConflictException('该组织下部门编码已存在');
    }
    let parentPath = '/';
    if (dto.parentId) {
      const parent = await this.findOne(dto.parentId);
      if (parent.organizationId !== dto.organizationId) {
        throw new ConflictException('上级部门不属于同一组织');
      }
      parentPath = parent.path ?? '/';
    }

    const row = await this.repo.save(
      this.repo.create({
        organizationId: dto.organizationId,
        name: dto.name,
        code: dto.code,
        parentId: dto.parentId ?? null,
        leaderEmployeeId: dto.leaderEmployeeId ?? null,
        sort: dto.sort ?? 0,
        path: null,
      }),
    );
    row.path = `${parentPath}${row.id}/`;
    return this.repo.save(row);
  }

  async findAll(query?: QueryDepartmentDto): Promise<DepartmentEntity[]> {
    const qb = this.repo.createQueryBuilder('d').orderBy('d.sort', 'ASC').addOrderBy('d.createdAt', 'DESC');
    if (query?.organizationId) {
      qb.andWhere('d.organizationId = :organizationId', { organizationId: query.organizationId });
    }
    return qb.getMany();
  }

  async findOne(id: string): Promise<DepartmentEntity> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('部门不存在');
    }
    return row;
  }

  async update(id: string, dto: UpdateDepartmentDto): Promise<DepartmentEntity> {
    const row = await this.findOne(id);
    if (dto.code && dto.code !== row.code) {
      const exists = await this.repo.findOne({
        where: { organizationId: row.organizationId, code: dto.code },
      });
      if (exists) {
        throw new ConflictException('该组织下部门编码已存在');
      }
    }
    if (dto.parentId !== undefined && dto.parentId) {
      if (dto.parentId === id) {
        throw new ConflictException('上级部门不能是自己');
      }
      const parent = await this.findOne(dto.parentId);
      if (parent.organizationId !== row.organizationId) {
        throw new ConflictException('上级部门不属于同一组织');
      }
    }
    Object.assign(row, dto);
    return this.repo.save(row);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.repo.softDelete({ id });
  }

  private async assertOrganization(organizationId: string): Promise<void> {
    const org = await this.orgRepo.findOne({ where: { id: organizationId } });
    if (!org) {
      throw new NotFoundException('组织不存在');
    }
  }
}
