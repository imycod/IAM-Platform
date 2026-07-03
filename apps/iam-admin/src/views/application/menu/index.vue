<script setup lang="ts">
import { PureTableBar } from "@/components/RePureTableBar";
import { getApplications, type ApplicationItem } from "@/api/application";
import {
  createApplicationMenu,
  deleteApplicationMenu,
  getApplicationMenus,
  updateApplicationMenu,
  type ApplicationMenuForm,
  type ApplicationMenuItem
} from "@/api/application-menu";
import { message } from "@/utils/message";
import type { FormInstance, FormRules } from "element-plus";
import { ElMessageBox } from "element-plus";
import { computed, onMounted, reactive, ref, watch } from "vue";

defineOptions({
  name: "ApplicationMenuIndex"
});

const tableRef = ref();
const loading = ref(false);
const applicationsLoading = ref(false);
const dataList = ref<ApplicationMenuItem[]>([]);
const flatMenuList = ref<ApplicationMenuItem[]>([]);
const applicationList = ref<ApplicationItem[]>([]);
const selectedApplicationId = ref("");
const treeMode = ref(true);

const dialogVisible = ref(false);
const dialogTitle = ref("添加菜单");
const submitting = ref(false);
const editingId = ref<string | null>(null);
const formRef = ref<FormInstance>();

const formModel = reactive<ApplicationMenuForm>({
  parentId: undefined,
  name: "",
  path: "",
  icon: "",
  sort: 0,
  permissionCode: ""
});

const formRules: FormRules = {
  name: [{ required: true, message: "请输入菜单名称", trigger: "blur" }]
};

const parentOptions = computed(() => {
  return flatMenuList.value
    .filter(item => item.id !== editingId.value)
    .map(item => ({
      label: item.name,
      value: item.id
    }));
});

const columns: TableColumnList = [
  { label: "菜单名称", prop: "name", minWidth: 160, align: "left" },
  {
    label: "路径",
    prop: "path",
    minWidth: 180,
    formatter: ({ path }) => path || "-"
  },
  {
    label: "图标",
    prop: "icon",
    minWidth: 120,
    formatter: ({ icon }) => icon || "-"
  },
  { label: "排序", prop: "sort", minWidth: 80 },
  { label: "操作", fixed: "right", width: 160, slot: "operation" }
];

function flattenMenus(
  menus: ApplicationMenuItem[],
  result: ApplicationMenuItem[] = []
) {
  for (const menu of menus) {
    result.push(menu);
    if (menu.children?.length) {
      flattenMenus(menu.children, result);
    }
  }
  return result;
}

async function loadApplications() {
  applicationsLoading.value = true;
  try {
    applicationList.value = await getApplications();
    if (!selectedApplicationId.value && applicationList.value.length) {
      selectedApplicationId.value = applicationList.value[0].id;
    }
  } catch (error: any) {
    message(
      error?.response?.data?.message ?? error?.message ?? "获取应用失败",
      { type: "error" }
    );
  } finally {
    applicationsLoading.value = false;
  }
}

async function onSearch() {
  if (!selectedApplicationId.value) {
    dataList.value = [];
    flatMenuList.value = [];
    return;
  }

  loading.value = true;
  try {
    const res = await getApplicationMenus(
      selectedApplicationId.value,
      treeMode.value
    );
    dataList.value = res;
    flatMenuList.value = treeMode.value ? flattenMenus(res) : res;
  } catch (error: any) {
    message(
      error?.response?.data?.message ?? error?.message ?? "加载失败",
      { type: "error" }
    );
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  formModel.parentId = undefined;
  formModel.name = "";
  formModel.path = "";
  formModel.icon = "";
  formModel.sort = 0;
  formModel.permissionCode = "";
  editingId.value = null;
  formRef.value?.clearValidate();
}

function openCreateDialog() {
  if (!selectedApplicationId.value) {
    message("请先选择应用", { type: "warning" });
    return;
  }
  resetForm();
  dialogTitle.value = "添加菜单";
  dialogVisible.value = true;
}

function openEditDialog(row: ApplicationMenuItem) {
  resetForm();
  editingId.value = row.id;
  dialogTitle.value = "编辑菜单";
  formModel.parentId = row.parentId ?? undefined;
  formModel.name = row.name;
  formModel.path = row.path ?? "";
  formModel.icon = row.icon ?? "";
  formModel.sort = row.sort;
  formModel.permissionCode = row.permissionCode ?? "";
  dialogVisible.value = true;
}

function buildPayload(): ApplicationMenuForm {
  return {
    parentId: formModel.parentId || undefined,
    name: formModel.name.trim(),
    path: formModel.path?.trim() || undefined,
    icon: formModel.icon?.trim() || undefined,
    sort: formModel.sort ?? 0,
    permissionCode: formModel.permissionCode?.trim() || undefined
  };
}

async function submitForm() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid || !selectedApplicationId.value) return;

  submitting.value = true;
  try {
    const payload = buildPayload();
    if (editingId.value) {
      await updateApplicationMenu(
        selectedApplicationId.value,
        editingId.value,
        payload
      );
      message("更新成功", { type: "success" });
    } else {
      await createApplicationMenu(selectedApplicationId.value, payload);
      message("创建成功", { type: "success" });
    }
    dialogVisible.value = false;
    await onSearch();
  } catch (error: any) {
    message(
      error?.response?.data?.message ??
        error?.message ??
        "操作失败，请稍后重试",
      { type: "error" }
    );
  } finally {
    submitting.value = false;
  }
}

async function handleDelete(row: ApplicationMenuItem) {
  if (!selectedApplicationId.value) return;

  try {
    await ElMessageBox.confirm(
      `确定删除菜单「${row.name}」吗？`,
      "提示",
      { type: "warning", confirmButtonText: "删除", cancelButtonText: "取消" }
    );
    await deleteApplicationMenu(selectedApplicationId.value, row.id);
    message("删除成功", { type: "success" });
    await onSearch();
  } catch (error: any) {
    if (error === "cancel" || error === "close") return;
    message(
      error?.response?.data?.message ??
        error?.message ??
        "删除失败，请稍后重试",
      { type: "error" }
    );
  }
}

watch(selectedApplicationId, () => {
  onSearch();
});

watch(treeMode, () => {
  onSearch();
});

onMounted(async () => {
  await loadApplications();
  await onSearch();
});
</script>

<template>
  <div class="main">
    <el-form
      :inline="true"
      class="search-form bg-bg_color w-full pl-8 pt-[12px] overflow-auto"
    >
      <el-form-item label="应用">
        <el-select
          v-model="selectedApplicationId"
          placeholder="请选择应用"
          class="w-[260px]!"
          :loading="applicationsLoading"
          filterable
        >
          <el-option
            v-for="item in applicationList"
            :key="item.id"
            :label="`${item.name}（${item.code}）`"
            :value="item.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="展示方式">
        <el-radio-group v-model="treeMode">
          <el-radio-button :value="true">树形</el-radio-button>
          <el-radio-button :value="false">平铺</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="loading" @click="onSearch">
          刷新
        </el-button>
      </el-form-item>
    </el-form>

    <PureTableBar title="应用菜单" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button type="primary" @click="openCreateDialog">添加菜单</el-button>
      </template>
      <template #default="{ size, dynamicColumns }">
        <pure-table
          ref="tableRef"
          adaptive
          :adaptiveConfig="{ offsetBottom: 108 }"
          align-whole="center"
          row-key="id"
          showOverflowTooltip
          table-layout="auto"
          :loading="loading"
          :size="size"
          :data="dataList"
          :columns="dynamicColumns"
          :tree-props="treeMode ? { children: 'children', hasChildren: 'hasChildren' } : undefined"
          :default-expand-all="treeMode"
        >
          <template #operation="{ row }">
            <el-button link type="primary" @click="openEditDialog(row)">
              编辑
            </el-button>
            <el-button link type="danger" @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </pure-table>
      </template>
    </PureTableBar>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="560px"
      destroy-on-close
      @closed="resetForm"
    >
      <el-form
        ref="formRef"
        :model="formModel"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="上级菜单">
          <el-select
            v-model="formModel.parentId"
            placeholder="无（顶级菜单）"
            clearable
            class="w-full!"
          >
            <el-option
              v-for="item in parentOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="菜单名称" prop="name">
          <el-input
            v-model="formModel.name"
            placeholder="菜单名称"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="路径">
          <el-input
            v-model="formModel.path"
            placeholder="如 /application/menu/index"
            maxlength="200"
          />
        </el-form-item>
        <el-form-item label="图标">
          <el-input
            v-model="formModel.icon"
            placeholder="如 ep:menu"
            maxlength="100"
          />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="formModel.sort" :min="0" class="w-full!" />
        </el-form-item>
        <el-form-item label="权限码">
          <el-input
            v-model="formModel.permissionCode"
            placeholder="可选"
            maxlength="100"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.main {
  :deep(.el-dropdown-menu__item i) {
    margin: 0;
  }
}
</style>
