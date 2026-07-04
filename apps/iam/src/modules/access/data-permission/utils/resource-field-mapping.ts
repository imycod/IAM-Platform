import type { ResourceDataPermissionFieldMapping } from '@app/contracts';

/** 平台默认：resource code → 业务表字段映射（可被 resource.attributes.dataPermission 覆盖） */
export const DEFAULT_RESOURCE_FIELD_MAPPINGS: Record<string, ResourceDataPermissionFieldMapping> = {
  'flow_admin:products': {
    selfFields: ['creator_id'],
    deptField: 'dept_id',
    orgField: 'organization_id',
  },
  'flow_admin:materials': {
    selfFields: ['creator_id'],
    deptField: 'dept_id',
    orgField: 'organization_id',
  },
  'flow_admin:tasks': {
    selfFields: ['assignee_id', 'creator_id'],
    deptField: 'assignee_dept_id',
    orgField: 'organization_id',
  },
  'iam_admin:identity_user': {
    selfFields: ['id'],
    deptField: 'department_id',
  },
};

export function resolveResourceFieldMapping(
  resourceCode: string,
  attributes?: Record<string, unknown> | null,
): ResourceDataPermissionFieldMapping {
  const fromAttributes = attributes?.dataPermission as ResourceDataPermissionFieldMapping | undefined;
  const defaults = DEFAULT_RESOURCE_FIELD_MAPPINGS[resourceCode] ?? {
    selfFields: ['owner_id', 'creator_id'],
    deptField: 'dept_id',
    orgField: 'organization_id',
  };

  return {
    selfFields: fromAttributes?.selfFields ?? defaults.selfFields,
    deptField: fromAttributes?.deptField ?? defaults.deptField,
    orgField: fromAttributes?.orgField ?? defaults.orgField,
  };
}
