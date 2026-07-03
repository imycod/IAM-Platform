<script setup lang="ts">
import { PureTableBar } from "@/components/RePureTableBar";
import {
  createResource,
  deleteResource,
  getResources,
  syncResourcesFromPermissions,
  updateResource,
  type ResourceForm,
  type ResourceItem
} from "@/api/resource";
import { message } from "@/utils/message";
import type { FormInstance, FormRules } from "element-plus";
import { ElMessageBox } from "element-plus";
import { computed, onMounted, reactive, ref } from "vue";

defineOptions({
  name: "AccessResource"
});

const typePresets = ["entity", "api", "permission", "custom"];

const tableRef = ref();
const loading = ref(false);
const syncing = ref(false);
const dataList = ref<ResourceItem[]>([]);

const filters = reactive({
  code: "",
  name: "",
  type: ""
});

const filteredList = computed(() => {
  return dataList.value.filter(row => {
    const codeOk =
      !filters.code ||
      row.code.toLowerCase().includes(filters.code.trim().toLowerCase());
    const nameOk =
      !filters.name ||
      row.name.toLowerCase().includes(filters.name.trim().toLowerCase());
    const typeOk = !filters.type || row.type === filters.type;
    return codeOk && nameOk && typeOk;
  });
});

const columns: TableColumnList = [
  { label: "资源名称", prop: "name", minWidth: 140 },
  { label: "资源编码", prop: "code", minWidth: 200 },
  {
    label: "类型",
    prop: "type",
    minWidth: 100,
    formatter: ({ type }) => type ?? "-"
  },
  {
    label: "创建时间",
    prop: "createdAt",
    minWidth: 170,
    formatter: ({ createdAt }) => createdAt ?? "-"
  },
  { label: "操作", fixed: "right", width: 160, slot: "operation" }
];

const dialogVisible = ref(false);
const dialogTitle = ref("添加资源");
const submitting = ref(false);
const editingId = ref<string | null>(null);
const formRef = ref<FormInstance>();

const formModel = reactive<ResourceForm>({
  name: "",
  code: "",
  type: ""
});

const formRules: FormRules = {
  name: [{ required: true, message: "请输入资源名称", trigger: "blur" }],
  code: [{ required: true, message: "请输入资源编码", trigger: "blur" }]
};

async function onSearch() {
  loading.value = true;
  try {
    dataList.value = await getResources({
      code: filters.code.trim() || undefined,
      name: filters.name.trim() || undefined,
      type: filters.type || undefined
    });
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
  formModel.name = "";
  formModel.code = "";
  formModel.type = "";
  editingId.value = null;
  formRef.value?.clearValidate();
}

function openCreateDialog() {
  resetForm();
  dialogTitle.value = "添加资源";
  dialogVisible.value = true;
}

function openEditDialog(row: ResourceItem) {
  editingId.value = row.id;
  dialogTitle.value = "编辑资源";
  formModel.name = row.name;
  formModel.code = row.code;
  formModel.type = row.type ?? "";
  dialogVisible.value = true;
}

function buildCreatePayload(): ResourceForm {
  return {
    name: formModel.name.trim(),
    code: formModel.code.trim(),
    type: formModel.type?.trim() || undefined
  };
}

function buildUpdatePayload(): Partial<ResourceForm> {
  return {
    name: formModel.name.trim(),
    type: formModel.type?.trim() || undefined
  };
}

async function submitForm() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    if (editingId.value) {
      await updateResource(editingId.value, buildUpdatePayload());
      message("更新成功", { type: "success" });
    } else {
      await createResource(buildCreatePayload());
      message("创建成功", { type: "success" });
    }
    dialogVisible.value = false;
    await onSearch();
  } catch (error: any) {
    message(
      error?.response?.data?.message ?? error?.message ?? "操作失败",
      { type: "error" }
    );
  } finally {
    submitting.value = false;
  }
}

async function handleDelete(row: ResourceItem) {
  try {
    await ElMessageBox.confirm(
      `确定删除资源「${row.name}（${row.code}）」吗？若已被数据权限引用将无法删除。`,
      "提示",
      { type: "warning", confirmButtonText: "删除", cancelButtonText: "取消" }
    );
    await deleteResource(row.id);
    message("删除成功", { type: "success" });
    await onSearch();
  } catch (error: any) {
    if (error === "cancel" || error === "close") return;
    message(
      error?.response?.data?.message ?? error?.message ?? "删除失败",
      { type: "error" }
    );
  }
}

async function handleSyncFromPermissions() {
  syncing.value = true;
  try {
    const res = await syncResourcesFromPermissions();
    message(`同步完成：新增 ${res.created} 条，已存在 ${res.skipped} 条`, {
      type: "success"
    });
    await onSearch();
  } catch (error: any) {
    message(
      error?.response?.data?.message ?? error?.message ?? "同步失败",
      { type: "error" }
    );
  } finally {
    syncing.value = false;
  }
}

onMounted(onSearch);
</script>

<template>
  <div class="main">
    <el-alert
      type="info"
      :closable="false"
      show-icon
      class="mx-8 mt-3 mb-0"
      title="资源是 ABAC / 数据权限的统一标识（如 flow_admin:tasks）。数据权限页只能从本页已注册的资源中选择；编码建议与权限管理中的 resource 字段一致。"
    />

    <el-form
      :inline="true"
      class="search-form bg-bg_color w-full pl-8 pt-[12px] overflow-auto"
    >
      <el-form-item label="资源编码">
        <el-input
          v-model="filters.code"
          clearable
          placeholder="模糊搜索"
          class="w-[180px]!"
          @keyup.enter="onSearch"
        />
      </el-form-item>
      <el-form-item label="资源名称">
        <el-input
          v-model="filters.name"
          clearable
          placeholder="模糊搜索"
          class="w-[160px]!"
          @keyup.enter="onSearch"
        />
      </el-form-item>
      <el-form-item label="类型">
        <el-select
          v-model="filters.type"
          clearable
          placeholder="全部"
          class="w-[120px]!"
        >
          <el-option
            v-for="item in typePresets"
            :key="item"
            :label="item"
            :value="item"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="loading" @click="onSearch">
          查询
        </el-button>
      </el-form-item>
    </el-form>

    <PureTableBar title="资源管理" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button :loading="syncing" @click="handleSyncFromPermissions">
          从权限同步
        </el-button>
        <el-button type="primary" @click="openCreateDialog">添加资源</el-button>
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
          :data="filteredList"
          :columns="dynamicColumns"
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
      width="520px"
      destroy-on-close
      @closed="resetForm"
    >
      <el-form
        ref="formRef"
        :model="formModel"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="资源名称" prop="name">
          <el-input v-model="formModel.name" placeholder="如 任务列表" />
        </el-form-item>
        <el-form-item label="资源编码" prop="code">
          <el-input
            v-model="formModel.code"
            placeholder="如 flow_admin:tasks"
            :disabled="!!editingId"
          />
          <p v-if="!editingId" class="field-hint">
            与权限 resource、数据权限资源标识保持一致
          </p>
        </el-form-item>
        <el-form-item label="类型">
          <el-select
            v-model="formModel.type"
            clearable
            filterable
            allow-create
            default-first-option
            placeholder="可选"
            class="w-full!"
          >
            <el-option
              v-for="item in typePresets"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>
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

.field-hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
}
</style>
