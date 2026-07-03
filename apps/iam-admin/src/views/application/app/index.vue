<script setup lang="ts">
import { PureTableBar } from "@/components/RePureTableBar";
import {
  createApplication,
  deleteApplication,
  getApplications,
  updateApplication,
  type ApplicationForm,
  type ApplicationItem
} from "@/api/application";
import { message } from "@/utils/message";
import type { FormInstance, FormRules } from "element-plus";
import { ElMessageBox } from "element-plus";
import { computed, onMounted, reactive, ref } from "vue";

defineOptions({
  name: "ApplicationAppIndex"
});

const typeOptions = [
  { label: "Web", value: "web" },
  { label: "Mobile", value: "mobile" },
  { label: "API", value: "api" },
  { label: "Internal", value: "internal" }
];

const statusOptions = [
  { label: "启用", value: "active" },
  { label: "停用", value: "inactive" },
  { label: "禁用", value: "disabled" }
];

const typeLabelMap = Object.fromEntries(
  typeOptions.map(item => [item.value, item.label])
);
const statusLabelMap = Object.fromEntries(
  statusOptions.map(item => [item.value, item.label])
);

const tableRef = ref();
const loading = ref(false);
const dataList = ref<ApplicationItem[]>([]);

const filters = reactive({
  name: "",
  code: ""
});

const filteredList = computed(() => {
  return dataList.value.filter(row => {
    const nameOk =
      !filters.name ||
      row.name.toLowerCase().includes(filters.name.trim().toLowerCase());
    const codeOk =
      !filters.code ||
      row.code.toLowerCase().includes(filters.code.trim().toLowerCase());
    return nameOk && codeOk;
  });
});

const columns: TableColumnList = [
  { label: "应用名称", prop: "name", minWidth: 140 },
  { label: "应用编码", prop: "code", minWidth: 160 },
  {
    label: "类型",
    prop: "type",
    minWidth: 100,
    formatter: ({ type }) => typeLabelMap[type] ?? type
  },
  {
    label: "状态",
    prop: "status",
    minWidth: 100,
    formatter: ({ status }) => statusLabelMap[status] ?? status
  },
  {
    label: "描述",
    prop: "description",
    minWidth: 180,
    formatter: ({ description }) => description || "-"
  },
  { label: "操作", fixed: "right", width: 160, slot: "operation" }
];

const dialogVisible = ref(false);
const dialogTitle = ref("添加应用");
const submitting = ref(false);
const editingId = ref<string | null>(null);
const formRef = ref<FormInstance>();

const formModel = reactive<ApplicationForm>({
  name: "",
  code: "",
  type: "web",
  status: "active",
  description: ""
});

const formRules: FormRules = {
  name: [{ required: true, message: "请输入应用名称", trigger: "blur" }],
  code: [{ required: true, message: "请输入应用编码", trigger: "blur" }],
  type: [{ required: true, message: "请选择应用类型", trigger: "change" }],
  status: [{ required: true, message: "请选择状态", trigger: "change" }]
};

async function onSearch() {
  loading.value = true;
  try {
    dataList.value = await getApplications();
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
  formModel.type = "web";
  formModel.status = "active";
  formModel.description = "";
  editingId.value = null;
  formRef.value?.clearValidate();
}

function openCreateDialog() {
  resetForm();
  dialogTitle.value = "添加应用";
  dialogVisible.value = true;
}

function openEditDialog(row: ApplicationItem) {
  resetForm();
  editingId.value = row.id;
  dialogTitle.value = "编辑应用";
  formModel.name = row.name;
  formModel.code = row.code;
  formModel.type = row.type;
  formModel.status = row.status;
  formModel.description = row.description ?? "";
  dialogVisible.value = true;
}

function buildPayload(): ApplicationForm {
  return {
    name: formModel.name.trim(),
    code: formModel.code.trim(),
    type: formModel.type,
    status: formModel.status,
    description: formModel.description?.trim() || null
  };
}

async function submitForm() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    const payload = buildPayload();
    if (editingId.value) {
      await updateApplication(editingId.value, payload);
      message("更新成功", { type: "success" });
    } else {
      await createApplication(payload);
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

async function handleDelete(row: ApplicationItem) {
  try {
    await ElMessageBox.confirm(
      `确定删除应用「${row.name}（${row.code}）」吗？`,
      "提示",
      { type: "warning", confirmButtonText: "删除", cancelButtonText: "取消" }
    );
    await deleteApplication(row.id);
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

onMounted(() => {
  onSearch();
});
</script>

<template>
  <div class="main">
    <el-form
      :inline="true"
      class="search-form bg-bg_color w-full pl-8 pt-[12px] overflow-auto"
    >
      <el-form-item label="应用名称">
        <el-input
          v-model="filters.name"
          clearable
          placeholder="模糊搜索"
          class="w-[220px]!"
          @keyup.enter="onSearch"
        />
      </el-form-item>
      <el-form-item label="应用编码">
        <el-input
          v-model="filters.code"
          clearable
          placeholder="模糊搜索"
          class="w-[220px]!"
          @keyup.enter="onSearch"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="loading" @click="onSearch">
          查询
        </el-button>
      </el-form-item>
    </el-form>

    <PureTableBar title="应用管理" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button type="primary" @click="openCreateDialog">添加应用</el-button>
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
        <el-form-item label="应用名称" prop="name">
          <el-input
            v-model="formModel.name"
            placeholder="如 IAM Admin"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="应用编码" prop="code">
          <el-input
            v-model="formModel.code"
            placeholder="如 iam-admin"
            maxlength="50"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="应用类型" prop="type">
          <el-select
            v-model="formModel.type"
            placeholder="请选择应用类型"
            class="w-full!"
          >
            <el-option
              v-for="item in typeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select
            v-model="formModel.status"
            placeholder="请选择状态"
            class="w-full!"
          >
            <el-option
              v-for="item in statusOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="formModel.description"
            type="textarea"
            :rows="4"
            placeholder="应用说明（可选）"
            maxlength="500"
            show-word-limit
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
