<template>
  <div class="table-box">
    <SearchForm v-show="isShowSearch" :search="_search" :reset="_reset" :columns="searchColumns"
      :search-param="searchParam" :search-col="searchCol" />

    <div class="card table-main">
      <div class="table-header">
        <div class="header-button-lf">
          <slot name="tableHeader" :selected-list="selectedList" :selected-list-ids="selectedListIds"
            :is-selected="isSelected" />
        </div>
        <div v-if="toolButton" class="header-button-ri">
          <slot name="toolButton">
            <el-tooltip v-if="showToolButton('refresh')" content="刷新" placement="top">
              <span class="pro-table-tool" @click="getTableList">
                <RefreshIcon class="pro-table-tool__icon" />
              </span>
            </el-tooltip>
            <el-divider v-if="showToolButton('refresh') && (showToolButton('setting') || showToolButton('search'))"
              direction="vertical" />
            <el-tooltip v-if="showToolButton('setting') && columns.length" content="列设置" placement="top">
              <span class="pro-table-tool" @click="openColSetting">
                <SettingIcon class="pro-table-tool__icon" />
              </span>
            </el-tooltip>
            <el-divider v-if="showToolButton('setting') && showToolButton('search') && searchColumns?.length"
              direction="vertical" />
            <el-tooltip v-if="showToolButton('search') && searchColumns?.length"
              :content="isShowSearch ? '隐藏搜索' : '显示搜索'" placement="top">
              <span class="pro-table-tool" @click="isShowSearch = !isShowSearch">
                <Search class="pro-table-tool__icon" />
              </span>
            </el-tooltip>
          </slot>
        </div>
      </div>

      <el-table :id="uuid" ref="tableRef" v-bind="$attrs" :data="processTableData" :border="border" :row-key="rowKey"
        @selection-change="selectionChange">
        <slot />
        <template v-for="item in tableColumns" :key="item">
          <el-table-column v-if="item.type && columnTypes.includes(item.type)" v-bind="item"
            :align="item.align ?? 'center'" :reserve-selection="item.type == 'selection'">
            <template #default="scope">
              <template v-if="item.type == 'expand'">
                <component :is="item.render" v-bind="scope" v-if="item.render" />
                <slot v-else :name="item.type" v-bind="scope" />
              </template>
              <el-radio v-if="item.type == 'radio'" v-model="radio" :value="scope.row[rowKey]">
                <i />
              </el-radio>
              <el-tag v-if="item.type == 'sort'" class="move">
                <el-icon>
                  <DCaret />
                </el-icon>
              </el-tag>
            </template>
          </el-table-column>
          <TableColumn v-else :column="item">
            <template v-for="slot in Object.keys($slots)" #[slot]="scope">
              <slot :name="slot" v-bind="scope" />
            </template>
          </TableColumn>
        </template>
        <template #append>
          <slot name="append" />
        </template>
        <template #empty>
          <div class="table-empty">
            <slot name="empty">
              <img src="@/assets/table/notData.png" alt="notData" />
              <div>暂无数据</div>
            </slot>
          </div>
        </template>
      </el-table>

      <slot name="pagination">
        <Pagination v-if="pagination" :pageable="pageable" :handle-size-change="handleSizeChange"
          :handle-current-change="handleCurrentChange" />
      </slot>
    </div>

    <ColSetting v-if="toolButton" ref="colRef" :col-setting="colSetting" />
  </div>
</template>

<script setup lang="ts" name="ProTable">
import { ref, watch, provide, onMounted, unref, computed, reactive } from "vue";
import { ElTable } from "element-plus";
import { useTable } from "@/hooks/useTable";
import { useSelection } from "@/hooks/useSelection";
import { BreakPoint } from "@/components/Grid/interface";
import { ColumnProps, TypeProps } from "@/components/ProTable/interface";
import { generateUUID, handleProp } from "@/utils/proTable";
import SearchForm from "@/components/SearchForm/index.vue";
import Pagination from "./components/Pagination.vue";
import ColSetting from "./components/ColSetting.vue";
import TableColumn from "./components/TableColumn.vue";
import Sortable from "sortablejs";
import Search from "~icons/ep/search";
import DCaret from "~icons/ep/d-caret";
import RefreshIcon from "@/assets/table-bar/refresh.svg?component";
import SettingIcon from "@/assets/table-bar/settings.svg?component";

export interface ProTableProps {
  columns: ColumnProps[];
  data?: any[];
  requestApi?: (params: any) => Promise<any>;
  requestAuto?: boolean;
  requestError?: (params: any) => void;
  dataCallback?: (data: any) => any;
  title?: string;
  pagination?: boolean;
  initParam?: any;
  border?: boolean;
  toolButton?: ("refresh" | "setting" | "search")[] | boolean;
  rowKey?: string;
  searchCol?: number | Record<BreakPoint, number>;
}

const props = withDefaults(defineProps<ProTableProps>(), {
  columns: () => [],
  requestAuto: true,
  pagination: true,
  initParam: () => ({}),
  border: true,
  toolButton: true,
  rowKey: "id",
  searchCol: () => ({ xs: 1, sm: 2, md: 2, lg: 3, xl: 4 })
});

const tableRef = ref<InstanceType<typeof ElTable>>();
const uuid = ref("id-" + generateUUID());
const columnTypes: TypeProps[] = ["selection", "radio", "index", "expand", "sort"];
const isShowSearch = ref(true);

const showToolButton = (key: "refresh" | "setting" | "search") => {
  return Array.isArray(props.toolButton)
    ? props.toolButton.includes(key)
    : props.toolButton;
};

const radio = ref("");

const { selectionChange, selectedList, selectedListIds, isSelected } = useSelection(
  props.rowKey
);

const {
  tableData,
  pageable,
  searchParam,
  searchInitParam,
  getTableList,
  search,
  reset,
  handleSizeChange,
  handleCurrentChange
} = useTable(
  props.requestApi,
  props.initParam,
  props.pagination,
  props.dataCallback,
  props.requestError
);

const clearSelection = () => tableRef.value!.clearSelection();

onMounted(() => {
  dragSort();
  props.requestAuto && getTableList();
  props.data && (pageable.value.total = props.data.length);
});

const processTableData = computed(() => {
  if (!props.data) return tableData.value;
  if (!props.pagination) return props.data;
  return props.data.slice(
    (pageable.value.pageNum - 1) * pageable.value.pageSize,
    pageable.value.pageSize * pageable.value.pageNum
  );
});

watch(() => props.initParam, getTableList, { deep: true });

const tableColumns = reactive<ColumnProps[]>(props.columns);
const flatColumns = computed(() => flatColumnsFunc(tableColumns));

const enumMap = ref(new Map<string, { [key: string]: any }[]>());
const setEnumMap = async ({ prop, enum: enumValue }: ColumnProps) => {
  if (!enumValue) return;
  if (enumMap.value.has(prop!) && (typeof enumValue === "function" || enumMap.value.get(prop!) === enumValue))
    return;
  if (typeof enumValue !== "function") return enumMap.value.set(prop!, unref(enumValue!));
  enumMap.value.set(prop!, []);
  const result = await enumValue();
  const data = result?.data !== undefined ? result.data : result;
  enumMap.value.set(prop!, data);
};

provide("enumMap", enumMap);

const flatColumnsFunc = (columns: ColumnProps[], flatArr: ColumnProps[] = []) => {
  columns.forEach(async col => {
    if (col._children?.length) flatArr.push(...flatColumnsFunc(col._children));
    flatArr.push(col);
    col.isShow = col.isShow ?? true;
    col.isSetting = col.isSetting ?? true;
    col.isFilterEnum = col.isFilterEnum ?? true;
    await setEnumMap(col);
  });
  return flatArr.filter(item => !item._children?.length);
};

const searchColumns = computed(() => {
  return flatColumns.value
    ?.filter(item => item.search?.el || item.search?.render)
    .sort((a, b) => a.search!.order! - b.search!.order!);
});

searchColumns.value?.forEach((column, index) => {
  column.search!.order = column.search?.order ?? index + 2;
  const key = column.search?.key ?? handleProp(column.prop!);
  const defaultValue = column.search?.defaultValue;
  if (defaultValue !== undefined && defaultValue !== null) {
    searchParam.value[key] = defaultValue;
    searchInitParam.value[key] = defaultValue;
  }
});

const colRef = ref();
const colSetting = tableColumns!.filter(item => {
  const { type, prop, isSetting } = item;
  return !columnTypes.includes(type!) && prop !== "operation" && isSetting;
});
const openColSetting = () => colRef.value.openColSetting();

const emit = defineEmits<{
  search: [];
  reset: [];
  dragSort: [{ newIndex?: number; oldIndex?: number }];
}>();

const _search = () => {
  search();
  emit("search");
};

const _reset = () => {
  reset();
  emit("reset");
};

const dragSort = () => {
  const tbody = document.querySelector(`#${uuid.value} tbody`) as HTMLElement;
  if (!tbody) return;
  Sortable.create(tbody, {
    handle: ".move",
    animation: 300,
    onEnd({ newIndex, oldIndex }) {
      const [removedItem] = processTableData.value.splice(oldIndex!, 1);
      processTableData.value.splice(newIndex!, 0, removedItem);
      emit("dragSort", { newIndex, oldIndex });
    }
  });
};

defineExpose({
  element: tableRef,
  tableData: processTableData,
  radio,
  pageable,
  searchParam,
  searchInitParam,
  isSelected,
  selectedList,
  selectedListIds,
  getTableList,
  search,
  reset,
  handleSizeChange,
  handleCurrentChange,
  clearSelection,
  enumMap
});
</script>
