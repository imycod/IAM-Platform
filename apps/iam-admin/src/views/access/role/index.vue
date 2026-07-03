<script setup lang="ts">
import { PureTableBar } from "@/components/RePureTableBar";
import {
  createRole,
  deleteRole,
  getRoles,
  updateRole,
  type RoleForm,
  type RoleItem,
  type RoleType
} from "@/api/role";
import { message } from "@/utils/message";
import type { FormInstance, FormRules } from "element-plus";
import { ElMessageBox } from "element-plus";
import { computed, onMounted, reactive, ref } from "vue";
import { getApplications as getApplicationsApi } from "@/api/application";

defineOptions({
  name: "AccessRoleIndex"
});

const typeOptions: { label: string; value: RoleType }[] = [
  { label: "系统", value: "system" },
  { label: "自定义", value: "custom" },
  { label: "应用", value: "application" }
];

const typeLabelMap = Object.fromEntries(
  typeOptions.map(item => [item.value, item.label])
) as Record<RoleType, string>;


const tableRef = ref();
const loading = ref(false);
const dataList = ref<RoleItem[]>([]);
const applicationOptions = ref<{ label: string; value: string }[]>([]);

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
  { label: "角色名称", prop: "name", minWidth: 140 },
  { label: "角色编码", prop: "code", minWidth: 160 },
  {
    label: "类型",
    prop: "type",
    minWidth: 100,
    formatter: ({ type }) => typeLabelMap[type as RoleType] ?? type
  },
  {
    label: "应用 ID",
    prop: "applicationId",
    minWidth: 200,
    formatter: ({ applicationId }) => applicationId ?? "平台级"
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
const dialogTitle = ref("添加角色");
const submitting = ref(false);
const editingId = ref<string | null>(null);
const formRef = ref<FormInstance>();

const formModel = reactive<RoleForm>({
  name: "",
  code: "",
  type: "application",
  description: ""
});

const formRules: FormRules = {
  name: [{ required: true, message: "请输入角色名称", trigger: "blur" }],
  code: [{ required: true, message: "请输入角色编码", trigger: "blur" }],
  type: [{ required: true, message: "请选择角色类型", trigger: "change" }]
};

async function onSearch() {
  loading.value = true;
  try {
    dataList.value = await getRoles({ all: true });
  } finally {
    loading.value = false;
  }
}

async function getApplications() {
  const res = await getApplicationsApi();
  try {
    applicationOptions.value = res.map(item => ({
      label: item.name,
      value: item.id,
    }));
  } catch (error: any) {
    message(error?.message ?? "获取应用失败", { type: "error" });
  }
}

function resetForm() {
  formModel.name = "";
  formModel.code = "";
  formModel.type = "application";
  formModel.description = "";
  formModel.applicationId = undefined;
  editingId.value = null;
  formRef.value?.clearValidate();
}

async function openCreateDialog() {
  await getApplications();
  resetForm();
  dialogTitle.value = "添加角色";
  dialogVisible.value = true;
}

async function openEditDialog(row: RoleItem) {
  await getApplications();
  resetForm();
  editingId.value = row.id;
  dialogTitle.value = "编辑角色";
  formModel.name = row.name;
  formModel.code = row.code;
  formModel.type = row.type;
  formModel.description = row.description ?? "";
  formModel.applicationId = row.applicationId;
  dialogVisible.value = true;
}

function buildPayload(): RoleForm {
  return {
    name: formModel.name.trim(),
    code: formModel.code.trim(),
    type: formModel.type,
    description: formModel.description?.trim() || null,
    applicationId: formModel.applicationId ?? null
  };
}

async function submitForm() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    const payload = buildPayload();
    if (editingId.value) {
      await updateRole(editingId.value, {
        name: payload.name,
        code: payload.code,
        type: payload.type,
        description: payload.description
      });
      message("更新成功", { type: "success" });
    } else {
      await createRole(payload);
      message("创建成功", { type: "success" });
    }
    dialogVisible.value = false;
    await onSearch();
  } catch (error: any) {
    const msg =
      error?.response?.data?.message ??
      error?.message ??
      "操作失败，请稍后重试";
    message(msg, { type: "error" });
  } finally {
    submitting.value = false;
  }
}

async function handleDelete(row: RoleItem) {
  try {
    await ElMessageBox.confirm(
      `确定删除角色「${row.name}（${row.code}）」吗？`,
      "提示",
      { type: "warning", confirmButtonText: "删除", cancelButtonText: "取消" }
    );
    await deleteRole(row.id);
    message("删除成功", { type: "success" });
    await onSearch();
  } catch (error: any) {
    if (error === "cancel" || error === "close") return;
    const msg =
      error?.response?.data?.message ??
      error?.message ??
      "删除失败，请稍后重试";
    message(msg, { type: "error" });
  }
}

onMounted(() => {
  onSearch();
});
</script>

<template>
  <div class="main">
    <el-form :inline="true" class="search-form bg-bg_color w-full pl-8 pt-[12px] overflow-auto">
      <el-form-item label="角色名称">
        <el-input
          v-model="filters.name"
          clearable
          placeholder="模糊搜索"
          class="w-[220px]!"
          @keyup.enter="onSearch"
        />
      </el-form-item>
      <el-form-item label="角色编码">
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

    <PureTableBar title="角色管理" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button type="primary" @click="openCreateDialog">添加角色</el-button>
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
        <el-form-item label="角色名称" prop="name">
          <el-input
            v-model="formModel.name"
            placeholder="如 IAM 管理员"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="角色编码" prop="code">
          <el-input
            v-model="formModel.code"
            placeholder="如 iam_admin:manager"
            maxlength="50"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="角色类型" prop="type">
          <el-select v-model="formModel.type" placeholder="请选择角色类型" class="w-full!">
            <el-option
              v-for="item in typeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <!-- 关联应用 -->
        <el-form-item label="关联应用" prop="applicationId">
          <el-select v-model="formModel.applicationId" placeholder="请选择关联应用" class="w-full!">
            <el-option
              v-for="item in applicationOptions"
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
            placeholder="角色说明（可选）"
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
