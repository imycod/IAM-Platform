import type {
  Router,
  RouteLocationNormalized,
  RouteRecordNormalized,
} from 'vue-router';
import NProgress from 'nprogress'; // progress bar

import usePermission from '@/hooks/permission';
import { useUserStore, useAppStore } from '@/store';
import { appRoutes } from '../routes';
import { WHITE_LIST, NOT_FOUND } from '../constants';
import { findFirstLeafRoute, registerIamRoutes } from '../utils/iam-routes';

function isWhiteListRoute(name?: string | symbol | null) {
  return WHITE_LIST.some((el) => el.name === name);
}

function existsInServerMenu(
  menus: RouteRecordNormalized[],
  to: RouteLocationNormalized
) {
  const stack = [...menus];
  while (stack.length) {
    const element = stack.shift();
    if (element?.name === to.name || element?.path === to.path) {
      return true;
    }
    if (element?.children?.length) {
      stack.push(...(element.children as RouteRecordNormalized[]));
    }
  }
  return false;
}

function resolveServerMenuTarget(
  menus: RouteRecordNormalized[],
  to: RouteLocationNormalized
) {
  if (isWhiteListRoute(to.name)) {
    return to;
  }

  if (existsInServerMenu(menus, to)) {
    return { ...to, replace: true };
  }

  const firstLeaf = findFirstLeafRoute(menus);
  if (firstLeaf) {
    return { name: firstLeaf.name, replace: true };
  }

  return NOT_FOUND;
}

export default function setupPermissionGuard(router: Router) {
  router.beforeEach(async (to, from, next) => {
    const appStore = useAppStore();
    const userStore = useUserStore();
    const Permission = usePermission();
    const permissionsAllow = Permission.accessRouter(to);

    if (appStore.menuFromServer) {
      if (!isWhiteListRoute(to.name)) {
        const routes = await appStore.fetchServerMenuConfig();
        if (!routes?.length) {
          next(NOT_FOUND);
          return;
        }
        registerIamRoutes(router, routes);
      }

      if (isWhiteListRoute(to.name)) {
        next();
        return;
      }

      const exist = existsInServerMenu(appStore.appAsyncMenus, to);
      if (exist && permissionsAllow) {
        next();
      } else if (appStore.appAsyncMenus.length) {
        next(resolveServerMenuTarget(appStore.appAsyncMenus, to));
      } else {
        next(NOT_FOUND);
      }
    } else if (permissionsAllow) {
      next();
    } else {
      const destination =
        Permission.findFirstPermissionRoute(appRoutes, userStore.role) ||
        NOT_FOUND;
      next(destination);
    }

    NProgress.done();
  });
}
