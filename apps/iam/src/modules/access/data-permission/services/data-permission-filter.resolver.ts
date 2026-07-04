import { Inject, Injectable, Optional } from '@nestjs/common';
import type {
  DataFilterCondition,
  DataFilterGroup,
  ResolvedDataPermission,
  ResourceDataPermissionFieldMapping,
} from '@app/contracts';
import { ORGANIZATION_QUERY, type IOrganizationQuery } from '@app/contracts';
import { DataScope } from '../entities/data-permission.entity';
import type { ResolvedDataScope } from '../services/data-permission.service';
import { resolveResourceFieldMapping } from '../utils/resource-field-mapping';

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
        departmentIds: scopeResult.departmentIds,
        customExpr: scopeResult.customExpr ?? null,
      },
    };

    if (scopeResult.scope === DataScope.ALL) {
      return { ...base, unrestricted: true, filters: [] };
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
    if (
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

    if (orgContext?.organizationId && mapping.orgField && !resolved.unrestricted && !resolved.denyAll) {
      resolved.filters.unshift({
        field: mapping.orgField,
        operator: '=',
        value: orgContext.organizationId,
      });
    }

    return resolved;
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

    const filters = (customExpr.filters as DataFilterCondition[] | undefined) ?? [];
    const logic = (customExpr.logic as 'and' | 'or' | undefined) ?? 'and';
    const groups = customExpr.groups as DataFilterGroup[] | undefined;

    if (filters.length === 0 && (!groups || groups.length === 0)) {
      return { ...base, denyAll: true, filters: [{ field: '1', operator: '=', value: 0 }] };
    }

    return {
      ...base,
      logic,
      filters,
      groups,
    };
  }
}
