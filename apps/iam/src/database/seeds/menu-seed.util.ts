import { Repository } from 'typeorm';
import { ApplicationMenuEntity } from '../../modules/application/application-menu/entities/application-menu.entity';

export type MenuSeed = {
  name: string;
  path: string;
  icon: string;
  sort: number;
  permissionCode: string | null;
  children?: readonly MenuSeed[];
};

export function collectMenuPaths(items: readonly MenuSeed[], paths = new Set<string>()): Set<string> {
  for (const item of items) {
    paths.add(item.path);
    if (item.children?.length) {
      collectMenuPaths(item.children, paths);
    }
  }
  return paths;
}

export async function upsertMenuTree(
  menuRepo: Repository<ApplicationMenuEntity>,
  applicationId: string,
  items: readonly MenuSeed[],
  parentId: string | null,
  logPrefix: string,
): Promise<void> {
  for (const item of items) {
    let row = await menuRepo.findOne({
      where: { applicationId, path: item.path },
    });
    if (!row) {
      row = await menuRepo.save(
        menuRepo.create({
          applicationId,
          parentId,
          name: item.name,
          path: item.path,
          icon: item.icon,
          permissionCode: item.permissionCode,
          sort: item.sort,
        }),
      );
      // eslint-disable-next-line no-console
      console.log(`${logPrefix} 已创建菜单: ${item.name}`);
    } else {
      row.parentId = parentId;
      row.name = item.name;
      row.icon = item.icon;
      row.permissionCode = item.permissionCode;
      row.sort = item.sort;
      row = await menuRepo.save(row);
      // eslint-disable-next-line no-console
      console.log(`${logPrefix} 已更新菜单: ${item.name}`);
    }
    if (item.children?.length) {
      await upsertMenuTree(menuRepo, applicationId, item.children, row.id, logPrefix);
    }
  }
}

/** 删除该前缀下已不在 seed 定义中的菜单（清理历史中间层目录） */
export async function cleanupMenusUnderPrefix(
  menuRepo: Repository<ApplicationMenuEntity>,
  applicationId: string,
  pathPrefix: string,
  validPaths: Set<string>,
  logPrefix: string,
): Promise<void> {
  const rows = await menuRepo.find({ where: { applicationId } });
  for (const row of rows) {
    if (!row.path?.startsWith(pathPrefix) || validPaths.has(row.path)) {
      continue;
    }
    await menuRepo.softDelete({ id: row.id });
    // eslint-disable-next-line no-console
    console.log(`${logPrefix} 已删除过时菜单: ${row.path}`);
  }
}
