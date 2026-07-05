import type {
  DataFilterCondition,
  DataFilterGroup,
  DataFilterOperator,
} from '@app/contracts';

export interface NormalizedCustomExpr {
  logic: 'and' | 'or';
  filters: DataFilterCondition[];
  groups?: DataFilterGroup[];
}

export interface CustomExprContext {
  userId?: string;
  departmentId?: string | null;
  organizationId?: string | null;
}

const OP_ALIASES: Record<string, DataFilterOperator> = {
  eq: '=',
  '=': '=',
  ne: '!=',
  neq: '!=',
  '!=': '!=',
  gt: '>',
  gte: '>=',
  ge: '>=',
  lt: '<',
  lte: '<=',
  le: '<=',
  in: 'in',
  not_in: 'not_in',
  notin: 'not_in',
  like: 'like',
  is_null: 'is_null',
  isnull: 'is_null',
  is_not_null: 'is_not_null',
  isnotnull: 'is_not_null',
};

/** 兼容 IAM Admin 简写 { field, op, value } 与标准 { logic, filters, groups } */
export function normalizeCustomExpr(
  customExpr: Record<string, unknown>,
  context?: CustomExprContext,
): NormalizedCustomExpr | null {
  const filtersRaw = customExpr.filters;
  const groupsRaw = customExpr.groups;

  if (Array.isArray(filtersRaw) || Array.isArray(groupsRaw)) {
    const filters = Array.isArray(filtersRaw)
      ? filtersRaw
          .map((item) => normalizeCondition(item, context))
          .filter((item): item is DataFilterCondition => item !== null)
      : [];

    const groups = Array.isArray(groupsRaw) ? (groupsRaw as DataFilterGroup[]) : undefined;

    if (filters.length === 0 && (!groups || groups.length === 0)) {
      return null;
    }

    return {
      logic: (customExpr.logic as 'and' | 'or' | undefined) ?? 'and',
      filters,
      groups,
    };
  }

  const single = normalizeCondition(customExpr, context);
  if (single) {
    return { logic: 'and', filters: [single] };
  }

  return null;
}

function normalizeCondition(
  raw: unknown,
  context?: CustomExprContext,
): DataFilterCondition | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const field = record.field;
  if (typeof field !== 'string' || !field.trim()) {
    return null;
  }

  const operator = normalizeOperator(record.operator ?? record.op);
  const value = resolveTemplateValue(record.value, context) as DataFilterCondition['value'];

  return { field: field.trim(), operator, value };
}

function normalizeOperator(raw: unknown): DataFilterOperator {
  if (typeof raw !== 'string') {
    return '=';
  }
  const key = raw.trim().toLowerCase();
  return OP_ALIASES[key] ?? '=';
}

function resolveTemplateValue(value: unknown, context?: CustomExprContext): unknown {
  if (typeof value !== 'string' || !context) {
    return value;
  }

  switch (value) {
    case '${userId}':
      return context.userId ?? value;
    case '${departmentId}':
      return context.departmentId ?? value;
    case '${organizationId}':
      return context.organizationId ?? value;
    default:
      return value;
  }
}
