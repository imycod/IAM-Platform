import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionEntity } from '../../permission/entities/permission.entity';
import { DataPermissionEntity } from '../../data-permission/entities/data-permission.entity';
import { ResourceEntity } from '../entities/resource.entity';
import { CreateResourceDto, QueryResourceDto, UpdateResourceDto } from '../dto/resource.dto';

@Injectable()
export class ResourceService {
  constructor(
    @InjectRepository(ResourceEntity)
    private readonly resourceRepo: Repository<ResourceEntity>,
    @InjectRepository(PermissionEntity)
    private readonly permissionRepo: Repository<PermissionEntity>,
    @InjectRepository(DataPermissionEntity)
    private readonly dataPermissionRepo: Repository<DataPermissionEntity>,
  ) {}

  async create(dto: CreateResourceDto): Promise<ResourceEntity> {
    const code = dto.code.trim();
    const exists = await this.resourceRepo.findOne({ where: { code } });
    if (exists) {
      throw new ConflictException('资源编码已存在');
    }
    return this.resourceRepo.save(
      this.resourceRepo.create({
        name: dto.name.trim(),
        code,
        type: dto.type?.trim() || null,
        attributes: dto.attributes ?? null,
      }),
    );
  }

  async findAll(filters?: QueryResourceDto): Promise<ResourceEntity[]> {
    const qb = this.resourceRepo
      .createQueryBuilder('r')
      .orderBy('r.code', 'ASC');

    if (filters?.code?.trim()) {
      qb.andWhere('r.code LIKE :code', { code: `%${filters.code.trim()}%` });
    }
    if (filters?.name?.trim()) {
      qb.andWhere('r.name LIKE :name', { name: `%${filters.name.trim()}%` });
    }
    if (filters?.type?.trim()) {
      qb.andWhere('r.type = :type', { type: filters.type.trim() });
    }

    return qb.getMany();
  }

  async findOne(id: string): Promise<ResourceEntity> {
    const row = await this.resourceRepo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('资源不存在');
    }
    return row;
  }

  async findByCode(code: string): Promise<ResourceEntity | null> {
    return this.resourceRepo.findOne({ where: { code: code.trim() } });
  }

  async assertExistsByCode(code: string): Promise<ResourceEntity> {
    const row = await this.findByCode(code);
    if (!row) {
      throw new NotFoundException(`资源「${code}」未在资源管理中注册，请先在资源管理页创建`);
    }
    return row;
  }

  async update(id: string, dto: UpdateResourceDto): Promise<ResourceEntity> {
    const row = await this.findOne(id);
    if (dto.name !== undefined) row.name = dto.name.trim();
    if (dto.type !== undefined) row.type = dto.type?.trim() || null;
    if (dto.attributes !== undefined) row.attributes = dto.attributes ?? null;
    return this.resourceRepo.save(row);
  }

  async remove(id: string): Promise<void> {
    const row = await this.findOne(id);
    const usedByDataPermission = await this.dataPermissionRepo.count({
      where: { resource: row.code },
    });
    if (usedByDataPermission > 0) {
      throw new ConflictException(
        `资源「${row.code}」已被 ${usedByDataPermission} 条数据权限引用，无法删除`,
      );
    }
    await this.resourceRepo.softDelete({ id });
  }

  /** 从 permission 表去重 resource 字段，补建尚未注册的资源 */
  async syncFromPermissions(): Promise<{ created: number; skipped: number }> {
    const permissions = await this.permissionRepo.find();
    const codes = [
      ...new Set(
        permissions
          .map((p) => p.resource?.trim())
          .filter((code): code is string => !!code),
      ),
    ];

    let created = 0;
    let skipped = 0;
    for (const code of codes) {
      const exists = await this.resourceRepo.findOne({ where: { code } });
      if (exists) {
        skipped += 1;
        continue;
      }
      await this.resourceRepo.save(
        this.resourceRepo.create({
          name: code,
          code,
          type: 'permission',
          attributes: { source: 'sync-from-permissions' },
        }),
      );
      created += 1;
    }
    return { created, skipped };
  }
}
