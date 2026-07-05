import { DataScope } from '../entities/data-permission.entity';

/** scope 宽度权重：数值越大权限越宽；新增 scope 时在此补充即可 */
export const DATA_SCOPE_WEIGHT: Readonly<Record<DataScope, number>> = {
  [DataScope.SELF]: 10,
  [DataScope.CUSTOM]: 20,
  [DataScope.DEPT]: 30,
  [DataScope.DEPT_AND_CHILD]: 40,
  [DataScope.ALL]: 100,
};

export function getDataScopeWeight(scope: DataScope): number {
  return DATA_SCOPE_WEIGHT[scope] ?? 0;
}

export function pickWidestScope(scopes: DataScope[]): DataScope {
  if (scopes.length === 0) {
    return DataScope.SELF;
  }
  return scopes.reduce((widest, current) =>
    getDataScopeWeight(current) > getDataScopeWeight(widest) ? current : widest,
  );
}
