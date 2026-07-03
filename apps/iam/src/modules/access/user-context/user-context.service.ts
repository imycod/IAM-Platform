import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicationMenuEntity } from '../../application/application-menu/entities/application-menu.entity';
import { ApplicationService } from '../../application/services/application.service';
import { PermissionService } from '../permission/services/permission.service';

export interface VisibleMenuNode {
  id: string;
  name: string;
  path: string | null;
  icon: string | null;
  permissionCode: string | null;
  sort: number;
  children: VisibleMenuNode[];
}

@Injectable()
export class UserContextService {
  constructor(
    @InjectRepository(ApplicationMenuEntity)
    private readonly menuRepo: Repository<ApplicationMenuEntity>,
    private readonly permissionService: PermissionService,
    private readonly applicationService: ApplicationService,
  ) {}

  private async ensureAppAccess(userId: string, applicationId?: string): Promise<void> {
    if (!applicationId) {
      return;
    }
    await this.applicationService.assertUserCanAccess(applicationId, userId);
  }

  async resolvePermissions(userId: string, applicationId?: string): Promise<string[]> {
    await this.ensureAppAccess(userId, applicationId);
    return this.permissionService.resolveUserPermissionCodes(userId, applicationId);
  }

  async resolveVisibleMenus(
    userId: string,
    applicationId: string,
    tree = false,
  ): Promise<VisibleMenuNode[] | ApplicationMenuEntity[]> {
    if (!applicationId) {
      throw new ForbiddenException('applicationId 必填');
    }
    await this.ensureAppAccess(userId, applicationId);
    const owned = await this.permissionService.resolveUserPermissionCodes(userId, applicationId);
    const items = await this.menuRepo.find({
      where: { applicationId },
      order: { sort: 'ASC', createdAt: 'ASC' },
    });

    if (this.permissionService.hasAllPermissions(owned)) {
      if (!tree) {
        return items;
      }
      return this.buildTree(items);
    }

    const childrenByParent = this.groupMenusByParent(items);
    const ownedSet = new Set(owned);
    const visible = items.filter((menu) =>
      this.isMenuVisible(menu, ownedSet, childrenByParent),
    );
    if (!tree) {
      return visible;
    }
    const withAncestors = this.includeAncestorMenus(items, visible);
    return this.buildTree(withAncestors);
  }

  /** 按 parentId 分组，便于判断目录节点是否有可见子项 */
  private groupMenusByParent(
    items: ApplicationMenuEntity[],
  ): Map<string | null, ApplicationMenuEntity[]> {
    const map = new Map<string | null, ApplicationMenuEntity[]>();
    for (const item of items) {
      const parentId = item.parentId ?? null;
      const siblings = map.get(parentId) ?? [];
      siblings.push(item);
      map.set(parentId, siblings);
    }
    return map;
  }

  /**
   * 叶子：无 permissionCode 或用户拥有对应权限。
   * 目录：自身有权限，或至少一个子菜单可见（避免空目录泄漏）。
   */
  private isMenuVisible(
    menu: ApplicationMenuEntity,
    owned: Set<string>,
    childrenByParent: Map<string | null, ApplicationMenuEntity[]>,
  ): boolean {
    const children = childrenByParent.get(menu.id) ?? [];
    if (children.length === 0) {
      return !menu.permissionCode || owned.has(menu.permissionCode);
    }
    if (menu.permissionCode && owned.has(menu.permissionCode)) {
      return true;
    }
    return children.some((child) => this.isMenuVisible(child, owned, childrenByParent));
  }

  /** 子菜单可见时，自动补全祖先目录节点，避免目录被权限过滤后子项变平级 */
  private includeAncestorMenus(
    all: ApplicationMenuEntity[],
    visible: ApplicationMenuEntity[],
  ): ApplicationMenuEntity[] {
    const byId = new Map(all.map((m) => [m.id, m]));
    const included = new Map(visible.map((m) => [m.id, m]));
    for (const item of visible) {
      let parentId = item.parentId;
      while (parentId) {
        if (included.has(parentId)) break;
        const parent = byId.get(parentId);
        if (!parent) break;
        included.set(parent.id, parent);
        parentId = parent.parentId;
      }
    }
    return [...included.values()].sort(
      (a, b) => a.sort - b.sort || a.createdAt.getTime() - b.createdAt.getTime(),
    );
  }

  private buildTree(items: ApplicationMenuEntity[]): VisibleMenuNode[] {
    const map = new Map<string, VisibleMenuNode>();
    const roots: VisibleMenuNode[] = [];
    for (const item of items) {
      map.set(item.id, {
        id: item.id,
        name: item.name,
        path: item.path,
        icon: item.icon,
        permissionCode: item.permissionCode,
        sort: item.sort,
        children: [],
      });
    }
    for (const node of map.values()) {
      const parentId = items.find((i) => i.id === node.id)?.parentId;
      if (parentId && map.has(parentId)) {
        map.get(parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    const sortNodes = (nodes: VisibleMenuNode[]) => {
      nodes.sort((a, b) => a.sort - b.sort);
      nodes.forEach((n) => sortNodes(n.children));
    };
    sortNodes(roots);
    return roots;
  }
}
