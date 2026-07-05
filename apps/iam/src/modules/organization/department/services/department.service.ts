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
    if (dto.parentId !== undefined) {
      await this.rebuildPath(row);
      return row;
    }
    return this.repo.save(row);
  }

  /** 按 parentId 链重建本节点及全部后代的 path */
  async rebuildPath(dept: DepartmentEntity): Promise<void> {
    dept.path = await this.computePathFromParentChain(dept.id, dept.organizationId);
    await this.repo.save(dept);

    const children = await this.repo.find({ where: { parentId: dept.id } });
    for (const child of children) {
      await this.rebuildPath(child);
    }
  }

  /** 修复组织内全部部门的物化 path（历史数据 parentId 正确但 path 错误时使用） */
  async repairPathsForOrganization(organizationId: string): Promise<number> {
    const all = await this.repo.find({ where: { organizationId } });
    const byId = new Map(all.map((d) => [d.id, d]));
    let count = 0;

    const compute = (id: string, visiting = new Set<string>()): string => {
      if (visiting.has(id)) {
        throw new ConflictException('部门树存在循环引用');
      }
      visiting.add(id);
      const dept = byId.get(id);
      if (!dept) {
        return `/${id}/`;
      }
      if (!dept.parentId) {
        return `/${id}/`;
      }
      const parent = byId.get(dept.parentId);
      const parentPath = parent ? compute(dept.parentId, visiting) : '/';
      return `${parentPath}${id}/`;
    };

    for (const dept of all) {
      const next = compute(dept.id);
      if (dept.path !== next) {
        dept.path = next;
        count += 1;
      }
    }

    if (count > 0) {
      await this.repo.save(all);
    }
    return count;
  }

  private async computePathFromParentChain(
    id: string,
    organizationId: string,
  ): Promise<string> {
    const chain: string[] = [];
    let currentId: string | null = id;
    const visited = new Set<string>();

    while (currentId) {
      if (visited.has(currentId)) {
        throw new ConflictException('部门树存在循环引用');
      }
      visited.add(currentId);
      const dept = await this.repo.findOne({ where: { id: currentId, organizationId } });
      if (!dept) {
        break;
      }
      chain.unshift(dept.id);
      currentId = dept.parentId;
    }

    return `/${chain.join('/')}/`;
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
