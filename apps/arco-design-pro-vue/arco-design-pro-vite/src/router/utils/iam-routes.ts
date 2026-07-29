import type { RouteRecordRaw } from 'vue-router';
import { DEFAULT_LAYOUT } from '../routes/base';

export interface IamMenuRoute {
  path: string;
  name?: string;
  component?: string;
  redirect?: string;
  meta?: {
    title?: string;
    icon?: string;
    rank?: number;
    showLink?: boolean;
    showParent?: boolean;
  };
  children?: IamMenuRoute[];
}

const viewModules = import.meta.glob('@/views/iam/**/*.vue');
const viewModuleKeys = Object.keys(viewModules);

let routesRegistered = false;

function resolveViewComponent(componentPath?: string) {
  const normalized = (componentPath ?? '')
    .replace(/^\/+|\/+$/g, '')
    .replace(/\.vue$/, '');
  if (!normalized) return undefined;

  const key = viewModuleKeys.find((item) =>
    item.replace(/\\/g, '/').endsWith(`/views/iam/${normalized}.vue`)
  );
  return key ? viewModules[key] : undefined;
}

function transformMeta(meta?: IamMenuRoute['meta']) {
  return {
    locale: meta?.title,
    title: meta?.title,
    icon: meta?.icon,
    order: meta?.rank ?? 0,
    requiresAuth: true,
    roles: ['*'],
    hideInMenu: meta?.showLink === false,
    showParent: meta?.showParent,
  };
}

function toRelativePath(absolutePath: string, parentPath: string) {
  const prefix = parentPath.endsWith('/') ? parentPath : `${parentPath}/`;
  if (absolutePath.startsWith(prefix)) {
    return absolutePath.slice(prefix.length);
  }
  return absolutePath.replace(/^\//, '');
}

function transformMenuNode(route: IamMenuRoute): RouteRecordRaw | null {
  if (route.meta?.showLink === false) return null;

  const result = {
    path: route.path,
    name: route.name,
    redirect: route.redirect,
    meta: transformMeta(route.meta),
  } as RouteRecordRaw;

  if (route.children?.length) {
    result.children = route.children
      .map((child) => transformMenuNode(child))
      .filter(Boolean) as RouteRecordRaw[];
  }

  return result;
}

export function transformIamMenuRoutes(routes: IamMenuRoute[]) {
  return routes
    .map((route) => transformMenuNode(route))
    .filter(Boolean) as RouteRecordRaw[];
}

function collectLeafRoutes(
  node: IamMenuRoute,
  domainPath: string,
  leaves: RouteRecordRaw[]
) {
  if (node.component) {
    const component = resolveViewComponent(node.component);
    if (component) {
      leaves.push({
        path: toRelativePath(node.path, domainPath),
        name: node.name,
        component,
        meta: transformMeta(node.meta),
      });
    } else {
      console.warn(
        `[iam-routes] 未找到页面组件: ${node.component} (${node.path})`
      );
    }
    return;
  }

  node.children?.forEach((child) =>
    collectLeafRoutes(child, domainPath, leaves)
  );
}

export function buildIamRouterRoutes(routes: IamMenuRoute[]) {
  return routes.map((domain) => {
    const children: RouteRecordRaw[] = [];
    domain.children?.forEach((child) =>
      collectLeafRoutes(child, domain.path, children)
    );

    return {
      path: domain.path,
      name: domain.name,
      component: DEFAULT_LAYOUT,
      redirect: domain.redirect,
      meta: transformMeta(domain.meta),
      children,
    } as RouteRecordRaw;
  });
}

export function registerIamRoutes(
  router: {
    hasRoute: (name: string | symbol) => boolean;
    addRoute: (route: RouteRecordRaw) => void;
  },
  routes: IamMenuRoute[]
) {
  if (routesRegistered) return;

  buildIamRouterRoutes(routes).forEach((route) => {
    if (route.name && !router.hasRoute(route.name)) {
      router.addRoute(route);
    }
  });

  routesRegistered = true;
}

export function resetIamRouteRegistration() {
  routesRegistered = false;
}

/** 取服务端菜单中第一个可访问的叶子页面 */
export function findFirstLeafRoute(
  menus: RouteRecordRaw[]
): { name: string; path: string } | null {
  const match = menus
    .map((menu) => {
      if (!menu.children?.length && menu.name) {
        return { name: menu.name as string, path: menu.path };
      }
      if (menu.children?.length) {
        return findFirstLeafRoute(menu.children);
      }
      return null;
    })
    .find(Boolean);
  return match ?? null;
}
