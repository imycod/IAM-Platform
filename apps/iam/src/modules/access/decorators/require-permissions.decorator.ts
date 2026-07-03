import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PERMISSIONS_KEY = 'require_permissions';

/**
 * 标注接口所需权限编码（AND 语义：需全部具备）。
 * 用法：@RequirePermissions('task:create', 'task:read')
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(REQUIRE_PERMISSIONS_KEY, permissions);
