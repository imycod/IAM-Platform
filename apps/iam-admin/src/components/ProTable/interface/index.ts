import { VNode, ComponentPublicInstance, Ref } from "vue";
import { BreakPoint, Responsive } from "@/components/Grid/interface";
import { TableColumnCtx } from "element-plus/es/components/table/src/table-column/defaults";
import { ProTableProps } from "@/components/ProTable/index.vue";
import ProTable from "@/components/ProTable/index.vue";

export interface EnumProps {
  label?: string;
  value?: string | number | boolean | any[];
  disabled?: boolean;
  tagType?: string;
  children?: EnumProps[];
  [key: string]: any;
}

export type TypeProps = "index" | "selection" | "radio" | "expand" | "sort";

export type SearchType =
  | "input"
  | "input-number"
  | "select"
  | "select-v2"
  | "tree-select"
  | "cascader"
  | "date-picker"
  | "time-picker"
  | "time-select"
  | "switch"
  | "slider";

export type SearchRenderScope = {
  searchParam: { [key: string]: any };
  placeholder: string;
  clearable: boolean;
  options: EnumProps[];
  data: EnumProps[];
};

export type SearchProps = {
  el?: SearchType;
  label?: string;
  props?: any;
  key?: string;
  tooltip?: string;
  order?: number;
  span?: number;
  offset?: number;
  defaultValue?: string | number | boolean | any[] | Ref<any>;
  render?: (scope: SearchRenderScope) => VNode;
} & Partial<Record<BreakPoint, Responsive>>;

export type FieldNamesProps = {
  label: string;
  value: string;
  children?: string;
};

export type RenderScope<T> = {
  row: T;
  $index: number;
  column: TableColumnCtx<T>;
  [key: string]: any;
};

export type HeaderRenderScope<T> = {
  $index: number;
  column: TableColumnCtx<T>;
  [key: string]: any;
};

export interface ColumnProps<T = any>
  extends Partial<
    Omit<TableColumnCtx<T>, "type" | "children" | "renderCell" | "renderHeader">
  > {
  type?: TypeProps;
  tag?: boolean | Ref<boolean>;
  isShow?: boolean | Ref<boolean>;
  isSetting?: boolean | Ref<boolean>;
  search?: SearchProps | undefined;
  enum?: EnumProps[] | Ref<EnumProps[]> | ((params?: any) => Promise<any>);
  isFilterEnum?: boolean | Ref<boolean>;
  fieldNames?: FieldNamesProps;
  headerRender?: (scope: HeaderRenderScope<T>) => VNode;
  render?: (scope: RenderScope<T>) => VNode | string;
  _children?: ColumnProps<T>[];
}

export type ProTableInstance = Omit<
  InstanceType<typeof ProTable>,
  keyof ComponentPublicInstance | keyof ProTableProps
>;
