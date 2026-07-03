import { Injectable } from '@nestjs/common';
import type { VisibleMenuNode } from './user-context.service';

export interface PureAdminRouteMeta {
  title: string;
  icon?: string | null;
  rank?: number;
  showLink?: boolean;
  /** 单子菜单时也保留父级目录（用于三级菜单展示） */
  showParent?: boolean;
}

export interface PureAdminRoute {
  path: string;
  name?: string;
  component?: string;
  redirect?: string;
  meta: PureAdminRouteMeta;
  children?: PureAdminRoute[];
}

/**
 * 将 IAM application_menu 树转为 vue-pure-admin 动态路由格式。
 */
@Injectable()
export class PortalMenuService {
  toPureAdminRoutes(nodes: VisibleMenuNode[]): PureAdminRoute[] {
    return nodes.map((node) => this.convertNode(node));
  }

  private convertNode(node: VisibleMenuNode): PureAdminRoute {
    const route: PureAdminRoute = {
      path: node.path ?? '/',
      meta: {
        title: node.name,
        icon: node.icon ?? 'ep:menu',
        rank: node.sort,
      },
    };

    if (node.children?.length) {
      route.name = this.directoryName(node.path, node.id);
      route.children = node.children.map((child) => this.convertNode(child));
      this.applyShowParentForSingleChildChain(route);
      const redirectPath = this.resolveRedirectPath(node);
      if (node.path && redirectPath) {
        route.redirect = redirectPath;
      }
    } else if (node.path) {
      Object.assign(route, this.leafFields(node.path));
    }

    return route;
  }

  /** 单子节点链路递归标记 showParent，保证 sidebar 至少展示 3 级（域 → 模块 → 页面） */
  private applyShowParentForSingleChildChain(route: PureAdminRoute): void {
    if (route.children?.length !== 1) {
      return;
    }
    route.children[0].meta.showParent = true;
    this.applyShowParentForSingleChildChain(route.children[0]);
  }

  /** 目录 redirect 指向第一个叶子页面（支持三级及以上菜单） */
  private resolveRedirectPath(node: VisibleMenuNode): string | undefined {
    if (!node.children?.length) {
      return node.path ?? undefined;
    }
    for (const child of node.children) {
      const target = this.resolveRedirectPath(child);
      if (target) return target;
    }
    return undefined;
  }

  private leafFields(path: string): Pick<PureAdminRoute, 'name' | 'component'> {
    const segments = path.split('/').filter(Boolean);
    const viewPath = segments.join('/');
    const name = this.pathToRouteName(segments);
    return { name, component: viewPath };
  }

  /** 目录节点 name（无 component，仅用于路由标识） */
  private directoryName(path: string | null, id: string): string {
    const segments = (path ?? '').split('/').filter(Boolean);
    if (segments.length) {
      return `${this.pathToRouteName(segments)}Group`;
    }
    return `Menu${id}Group`;
  }

  private pathToRouteName(segments: string[]): string {
    return segments
      .map((s) => s.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()))
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join('');
  }
}
