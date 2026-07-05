import { Inject, Injectable, Optional } from '@nestjs/common';
import type {
  DataFilterCondition,
  DataFilterGroup,
  ResolvedDataPermission,
  ResourceDataPermissionFieldMapping,
} from '@app/contracts';
import { ORGANIZATION_QUERY, type IOrganizationQuery } from '@app/contracts';
import { DataScope } from '../entities/data-permission.entity';
import type { ResolvedDataScope, ResolvedDataScopePart } from '../services/data-permission.service';
import { resolveResourceFieldMapping } from '../utils/resource-field-mapping';
import { normalizeCustomExpr } from '../utils/custom-expr.util';

@Injectable()
export class DataPermissionFilterResolver {
  constructor(
    @Optional()
    @Inject(ORGANIZATION_QUERY)
    private readonly organizationQuery?: IOrganizationQuery,
  ) {}

  resolve(
    userId: string,
    resource: string,
    scopeResult: ResolvedDataScope,
    fieldMapping: ResourceDataPermissionFieldMapping,
    orgContext?: { organizationId?: string | null; departmentId?: string | null },
  ): ResolvedDataPermission {
    if (scopeResult.unionParts && scopeResult.unionParts.length > 1) {
      return this.resolveUnion(userId, resource, scopeResult, fieldMapping, orgContext);
    }

    return this.resolveSingle(userId, resource, scopeResult, fieldMapping, orgContext);
  }

  private resolveSingle(
    userId: string,
    resource: string,
    scopeResult: ResolvedDataScope | ResolvedDataScopePart,
    fieldMapping: ResourceDataPermissionFieldMapping,
    orgContext?: { organizationId?: string | null; departmentId?: string | null },
  ): ResolvedDataPermission {
    const base: ResolvedDataPermission = {
      resource,
      scope: scopeResult.scope,
      unrestricted: false,
      denyAll: false,
      logic: 'and',
      filters: [],
      meta: {
        userId,
        organizationId: orgContext?.organizationId ?? null,
        departmentId: orgContext?.departmentId ?? null,
        departmentIds: scopeResult.departmentIds,
        customExpr: scopeResult.customExpr ?? null,
      },
    };

    if (scopeResult.scope === DataScope.ALL) {
      if (scopeResult.crossOrgUnrestricted) {
        return { ...base, unrestricted: true, filters: [] };
      }
      // 组织内全部：不加 unrestricted，由 resolveWithOrgContext 追加 organization_id 过滤
      return { ...base, unrestricted: false, filters: [] };
    }

    if (scopeResult.scope === DataScope.CUSTOM) {
      return this.resolveCustom(base, scopeResult.customExpr);
    }

    if (scopeResult.scope === DataScope.SELF) {
      return this.resolveSelf(base, userId, fieldMapping);
    }

    if (scopeResult.scope === DataScope.DEPT || scopeResult.scope === DataScope.DEPT_AND_CHILD) {
      return this.resolveDept(base, scopeResult.departmentIds ?? [], fieldMapping);
    }

    return this.resolveSelf(base, userId, fieldMapping);
  }

  private resolveUnion(
    userId: string,
    resource: string,
    scopeResult: ResolvedDataScope,
    fieldMapping: ResourceDataPermissionFieldMapping,
    orgContext?: { organizationId?: string | null; departmentId?: string | null },
  ): ResolvedDataPermission {
    const parts = scopeResult.unionParts ?? [];
    const resolvedParts = parts.map((part) =>
      this.resolveSingle(userId, resource, part, fieldMapping, orgContext),
    );

    if (resolvedParts.some((part) => part.unrestricted)) {
      return {
        resource,
        scope: DataScope.ALL,
        unrestricted: true,
        denyAll: false,
        logic: 'and',
        filters: [],
        meta: {
          userId,
          organizationId: orgContext?.organizationId ?? null,
          departmentId: orgContext?.departmentId ?? null,
        },
      };
    }

    const visibleParts = resolvedParts.filter((part) => !part.denyAll);
    if (visibleParts.length === 0) {
      return {
        resource,
        scope: scopeResult.scope,
        unrestricted: false,
        denyAll: true,
        logic: 'and',
        filters: [{ field: '1', operator: '=', value: 0 }],
        meta: {
          userId,
          organizationId: orgContext?.organizationId ?? null,
          departmentId: orgContext?.departmentId ?? null,
        },
      };
    }

    const unionBranches: DataFilterGroup[] = visibleParts.flatMap((part) =>
      this.toUnionBranch(part),
    );

    const base: ResolvedDataPermission = {
      resource,
      scope: scopeResult.scope,
      unrestricted: false,
      denyAll: false,
      logic: 'and',
      filters: [],
      groups: [{ logic: 'or', filters: unionBranches }],
      meta: {
        userId,
        organizationId: orgContext?.organizationId ?? null,
        departmentId: orgContext?.departmentId ?? null,
        departmentIds: this.collectDepartmentIds(parts),
      },
    };

    return base;
  }

  private toUnionBranch(part: ResolvedDataPermission): DataFilterGroup[] {
    if (part.groups?.length) {
      return part.groups;
    }
    if (part.filters.length > 0) {
      return [{ logic: part.logic, filters: part.filters }];
    }
    return [];
  }

  private collectDepartmentIds(parts: ResolvedDataScopePart[]): string[] {
    const ids = new Set<string>();
    for (const part of parts) {
      for (const id of part.departmentIds ?? []) {
        ids.add(id);
      }
    }
    return [...ids];
  }

  async resolveWithOrgContext(
    userId: string,
    resource: string,
    scopeResult: ResolvedDataScope,
    attributes?: Record<string, unknown> | null,
  ): Promise<ResolvedDataPermission> {
    const mapping = resolveResourceFieldMapping(resource, attributes);
    const orgContext = this.organizationQuery
      ? await this.organizationQuery.getUserOrgContext(userId)
      : null;
    let departmentIds = scopeResult.departmentIds;
    if (scopeResult.unionParts?.length) {
      scopeResult = {
        ...scopeResult,
        unionParts: await Promise.all(
          scopeResult.unionParts.map(async (part) => this.enrichScopePart(userId, part)),
        ),
      };
    } else if (
      (scopeResult.scope === DataScope.DEPT || scopeResult.scope === DataScope.DEPT_AND_CHILD) &&
      this.organizationQuery
    ) {
      departmentIds = await this.organizationQuery.getAccessibleDepartmentIds(
        userId,
        scopeResult.scope === DataScope.DEPT_AND_CHILD,
      );
      scopeResult = { ...scopeResult, departmentIds };
    }

    const resolved = this.resolve(userId, resource, scopeResult, mapping, orgContext ?? undefined);

    return this.applyOrganizationTenantBoundary(resolved, scopeResult, mapping, orgContext);
  }

  /**
   * 组织租户边界：非 cross-org 的 scope 均叠加 organization_id；
   * scope=all 且未开启 unrestricted 时，无员工组织上下文则 denyAll。
   */
  private applyOrganizationTenantBoundary(
    resolved: ResolvedDataPermission,
    scopeResult: ResolvedDataScope,
    mapping: ResourceDataPermissionFieldMapping,
    orgContext?: { organizationId?: string | null; departmentId?: string | null } | null,
  ): ResolvedDataPermission {
    if (resolved.unrestricted || resolved.denyAll || !mapping.orgField) {
      return resolved;
    }

    if (orgContext?.organizationId) {
      resolved.filters.unshift({
        field: mapping.orgField,
        operator: '=',
        value: orgContext.organizationId,
      });
      return resolved;
    }

    if (scopeResult.scope === DataScope.ALL && !scopeResult.crossOrgUnrestricted) {
      return {
        ...resolved,
        denyAll: true,
        filters: [{ field: '1', operator: '=', value: 0 }],
      };
    }

    return resolved;
  }

  private async enrichScopePart(
    userId: string,
    part: ResolvedDataScopePart,
  ): Promise<ResolvedDataScopePart> {
    if (
      (part.scope === DataScope.DEPT || part.scope === DataScope.DEPT_AND_CHILD) &&
      this.organizationQuery
    ) {
      const departmentIds = await this.organizationQuery.getAccessibleDepartmentIds(
        userId,
        part.scope === DataScope.DEPT_AND_CHILD,
      );
      return { ...part, departmentIds };
    }
    return part;
  }

  private resolveSelf(
    base: ResolvedDataPermission,
    userId: string,
    mapping: ResourceDataPermissionFieldMapping,
  ): ResolvedDataPermission {
    const fields = mapping.selfFields?.length ? mapping.selfFields : ['owner_id'];

    if (fields.length === 1) {
      return {
        ...base,
        filters: [{ field: fields[0], operator: '=', value: userId }],
      };
    }

    const orGroup: DataFilterGroup = {
      logic: 'or',
      filters: fields.map((field) => ({
        field,
        operator: '=' as const,
        value: userId,
      })),
    };

    return {
      ...base,
      filters: [],
      groups: [orGroup],
    };
  }

  private resolveDept(
    base: ResolvedDataPermission,
    departmentIds: string[],
    mapping: ResourceDataPermissionFieldMapping,
  ): ResolvedDataPermission {
    const deptField = mapping.deptField ?? 'dept_id';

    if (departmentIds.length === 0) {
      return {
        ...base,
        denyAll: true,
        filters: [{ field: '1', operator: '=', value: 0 }],
      };
    }

    if (departmentIds.length === 1) {
      return {
        ...base,
        filters: [{ field: deptField, operator: '=', value: departmentIds[0] }],
        meta: { ...base.meta, departmentIds },
      };
    }

    return {
      ...base,
      filters: [{ field: deptField, operator: 'in', value: departmentIds }],
      meta: { ...base.meta, departmentIds },
    };
  }

  private resolveCustom(
    base: ResolvedDataPermission,
    customExpr?: Record<string, unknown> | null,
  ): ResolvedDataPermission {
    if (!customExpr) {
      return { ...base, denyAll: true, filters: [{ field: '1', operator: '=', value: 0 }] };
    }

    const normalized = normalizeCustomExpr(customExpr, {
      userId: base.meta?.userId,
      departmentId: base.meta?.departmentId,
      organizationId: base.meta?.organizationId,
    });

    if (!normalized) {
      return { ...base, denyAll: true, filters: [{ field: '1', operator: '=', value: 0 }] };
    }

    return {
      ...base,
      denyAll: false,
      logic: normalized.logic,
      filters: normalized.filters,
      groups: normalized.groups,
    };
  }
}
