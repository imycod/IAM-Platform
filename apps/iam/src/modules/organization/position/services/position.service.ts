import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PositionEntity } from '../entities/position.entity';
import { OrganizationEntity } from '../../organization/entities/organization.entity';
import { CreatePositionDto, QueryPositionDto, UpdatePositionDto } from '../dto/position.dto';

@Injectable()
export class PositionService {
  constructor(
    @InjectRepository(PositionEntity)
    private readonly repo: Repository<PositionEntity>,
    @InjectRepository(OrganizationEntity)
    private readonly orgRepo: Repository<OrganizationEntity>,
  ) {}

  async create(dto: CreatePositionDto): Promise<PositionEntity> {
    await this.assertOrganization(dto.organizationId);
    const exists = await this.repo.findOne({
      where: { organizationId: dto.organizationId, code: dto.code },
    });
    if (exists) {
      throw new ConflictException('该组织下岗位编码已存在');
    }
    return this.repo.save(
      this.repo.create({
        organizationId: dto.organizationId,
        name: dto.name,
        code: dto.code,
        level: dto.level ?? 0,
      }),
    );
  }

  async findAll(query?: QueryPositionDto): Promise<PositionEntity[]> {
    const qb = this.repo.createQueryBuilder('p').orderBy('p.level', 'DESC').addOrderBy('p.createdAt', 'DESC');
    if (query?.organizationId) {
      qb.andWhere('p.organizationId = :organizationId', { organizationId: query.organizationId });
    }
    return qb.getMany();
  }

  async findOne(id: string): Promise<PositionEntity> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('岗位不存在');
    }
    return row;
  }

  async update(id: string, dto: UpdatePositionDto): Promise<PositionEntity> {
    const row = await this.findOne(id);
    if (dto.code && dto.code !== row.code) {
      const exists = await this.repo.findOne({
        where: { organizationId: row.organizationId, code: dto.code },
      });
      if (exists) {
        throw new ConflictException('该组织下岗位编码已存在');
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
