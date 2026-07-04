import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationEntity } from '../entities/organization.entity';
import { CreateOrganizationDto, UpdateOrganizationDto } from '../dto/organization.dto';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectRepository(OrganizationEntity)
    private readonly repo: Repository<OrganizationEntity>,
  ) {}

  async create(dto: CreateOrganizationDto): Promise<OrganizationEntity> {
    const exists = await this.repo.findOne({ where: { code: dto.code } });
    if (exists) {
      throw new ConflictException('组织编码已存在');
    }
    if (dto.parentId) {
      await this.findOne(dto.parentId);
    }
    return this.repo.save(
      this.repo.create({
        name: dto.name,
        code: dto.code,
        parentId: dto.parentId ?? null,
        type: dto.type ?? 'company',
        status: dto.status ?? 'active',
        sort: dto.sort ?? 0,
      }),
    );
  }

  async findAll(): Promise<OrganizationEntity[]> {
    return this.repo.find({ order: { sort: 'ASC', createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<OrganizationEntity> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('组织不存在');
    }
    return row;
  }

  async update(id: string, dto: UpdateOrganizationDto): Promise<OrganizationEntity> {
    const row = await this.findOne(id);
    if (dto.code && dto.code !== row.code) {
      const exists = await this.repo.findOne({ where: { code: dto.code } });
      if (exists) {
        throw new ConflictException('组织编码已存在');
      }
    }
    if (dto.parentId !== undefined && dto.parentId) {
      if (dto.parentId === id) {
        throw new ConflictException('上级组织不能是自己');
      }
      await this.findOne(dto.parentId);
    }
    Object.assign(row, dto);
    return this.repo.save(row);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.repo.softDelete({ id });
  }
}
