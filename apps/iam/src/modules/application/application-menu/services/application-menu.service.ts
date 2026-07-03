import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicationMenuEntity } from '../entities/application-menu.entity';
import { CreateApplicationMenuDto } from '../dto/create-application-menu.dto';
import { UpdateApplicationMenuDto } from '../dto/update-application-menu.dto';

export interface ApplicationMenuTreeNode {
  id: string;
  applicationId: string;
  parentId: string | null;
  name: string;
  path: string | null;
  icon: string | null;
  permissionCode: string | null;
  sort: number;
  children: ApplicationMenuTreeNode[];
}

@Injectable()
export class ApplicationMenuService {
  constructor(
    @InjectRepository(ApplicationMenuEntity)
    private readonly repo: Repository<ApplicationMenuEntity>,
  ) {}

  create(applicationId: string, dto: CreateApplicationMenuDto): Promise<ApplicationMenuEntity> {
    return this.repo.save(
      this.repo.create({
        applicationId,
        parentId: dto.parentId ?? null,
        name: dto.name,
        path: dto.path ?? null,
        icon: dto.icon ?? null,
        permissionCode: dto.permissionCode ?? null,
        sort: dto.sort ?? 0,
      }),
    );
  }

  findAll(applicationId: string): Promise<ApplicationMenuEntity[]> {
    return this.repo.find({
      where: { applicationId },
      order: { sort: 'ASC', createdAt: 'ASC' },
    });
  }

  /** 将扁平菜单列表组装为树（根节点 parentId 为 null）。 */
  findTree(applicationId: string): Promise<ApplicationMenuTreeNode[]> {
    return this.findAll(applicationId).then((items) => this.buildTree(items));
  }

  async findOne(applicationId: string, id: string): Promise<ApplicationMenuEntity> {
    const menu = await this.repo.findOne({ where: { id, applicationId } });
    if (!menu) {
      throw new NotFoundException('应用菜单不存在');
    }
    return menu;
  }

  async update(
    applicationId: string,
    id: string,
    dto: UpdateApplicationMenuDto,
  ): Promise<ApplicationMenuEntity> {
    await this.findOne(applicationId, id);
    await this.repo.update({ id, applicationId }, dto);
    return this.findOne(applicationId, id);
  }

  async remove(applicationId: string, id: string): Promise<void> {
    await this.findOne(applicationId, id);
    await this.repo.softDelete({ id, applicationId });
  }

  private buildTree(items: ApplicationMenuEntity[]): ApplicationMenuTreeNode[] {
    const map = new Map<string, ApplicationMenuTreeNode>();
    const roots: ApplicationMenuTreeNode[] = [];

    for (const item of items) {
      map.set(item.id, {
        id: item.id,
        applicationId: item.applicationId,
        parentId: item.parentId,
        name: item.name,
        path: item.path,
        icon: item.icon,
        permissionCode: item.permissionCode,
        sort: item.sort,
        children: [],
      });
    }

    for (const node of map.values()) {
      if (node.parentId && map.has(node.parentId)) {
        map.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }
}
