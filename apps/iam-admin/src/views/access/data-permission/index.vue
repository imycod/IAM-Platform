<script setup lang="ts">
import { PureTableBar } from "@/components/RePureTableBar";
import {
  createDataPermission,
  deleteDataPermission,
  getDataPermission,
  getDataPermissions,
  updateDataPermission,
  type DataPermissionForm,
  type DataPermissionItem,
  type DataScope
} from "@/api/data-permission";
import { getResources, type ResourceItem } from "@/api/resource";
import { getRoles, type RoleItem } from "@/api/role";
import { message } from "@/utils/message";
import type { FormInstance, FormRules } from "element-plus";
import { ElMessageBox } from "element-plus";
import { computed, onMounted, reactive, ref, watch } from "vue";

defineOptions({
  name: "AccessDataPermission"
});

const scopeOptions: { label: string; value: DataScope; hint: string }[] = [
  { label: "仅本人", value: "self", hint: "只能访问自己创建/拥有的数据" },
  { label: "本部门", value: "dept", hint: "可访问本部门范围内的数据" },
  {
    label: "本部门及子部门",
    value: "dept_and_child",
    hint: "可访问本部门及下级部门数据"
  },
  { label: "全部", value: "all", hint: "可访问该资源下的全部数据" },
  { label: "自定义", value: "custom", hint: "通过 JSON 表达式定义过滤条件" }
];

const scopeLabelMap = Object.fromEntries(
  scopeOptions.map(item => [item.value, item.label])
) as Record<DataScope, string>;

const resourceOptions = ref<ResourceItem[]>([]);

const tableRef = ref();
const loading = ref(false);
const dataList = ref<DataPermissionItem[]>([]);
const roleOptions = ref<RoleItem[]>([]);

const filters = reactive({
  roleId: "",
  resource: "",
  scope: "" as DataScope | ""
});

const filteredList = computed(() => {
  return dataList.value.filter(row => {
    const scopeOk = !filters.scope || row.scope === filters.scope;
    return scopeOk;
  });
});

const columns: TableColumnList = [
  { label: "角色", prop: "roleName", minWidth: 120, formatter: ({ roleName }) => roleName ?? "-" },
  {
    label: "角色编码",
    prop: "roleCode",
    minWidth: 160,
    formatter: ({ roleCode }) => roleCode ?? "-"
  },
  {
    label: "资源标识",
    prop: "resource",
    minWidth: 180,
    formatter: ({ resource, resourceName }) =>
      resourceName ? `${resourceName}（${resource}）` : resource
  },
  {
    label: "数据范围",
    prop: "scope",
    minWidth: 140,
    formatter: ({ scope }) => scopeLabelMap[scope as DataScope] ?? scope
  },
  {
    label: "自定义表达式",
    prop: "customExpr",
    minWidth: 200,
    formatter: ({ customExpr }) =>
      customExpr ? JSON.stringify(customExpr) : "-"
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
const dialogTitle = ref("添加数据权限");
const submitting = ref(false);
const editingId = ref<string | null>(null);
const formRef = ref<FormInstance>();

const formModel = reactive<DataPermissionForm & { customExprText: string }>({
  roleId: "",
  resource: "",
  scope: "self",
  customExpr: null,
  customExprText: ""
});

const showCustomExpr = computed(() => formModel.scope === "custom");

const currentScopeHint = computed(
  () => scopeOptions.find(item => item.value === formModel.scope)?.hint ?? ""
);

const formRules: FormRules = {
  roleId: [{ required: true, message: "请选择角色", trigger: "change" }],
  resource: [{ required: true, message: "请选择资源", trigger: "change" }],
  scope: [{ required: true, message: "请选择数据范围", trigger: "change" }],
  customExprText: [
    {
      validator: (_rule, value, callback) => {
        if (formModel.scope !== "custom") {
          callback();
          return;
        }
        if (!value?.trim()) {
          callback(new Error("自定义范围需填写 JSON 表达式"));
          return;
        }
        try {
          JSON.parse(value);
          callback();
        } catch {
          callback(new Error("自定义表达式必须是合法 JSON"));
        }
      },
      trigger: "blur"
    }
  ]
};

watch(
  () => formModel.scope,
  scope => {
    if (scope !== "custom") {
      formModel.customExprText = "";
      formModel.customExpr = null;
    }
  }
);

async function loadResources() {
  try {
    resourceOptions.value = await getResources();
  } catch (error: any) {
    message(
      error?.response?.data?.message ?? error?.message ?? "加载资源失败",
      { type: "error" }
    );
  }
}

async function loadRoles() {
  try {
    roleOptions.value = await getRoles({ all: true });
  } catch (error: any) {
    message(
      error?.response?.data?.message ?? error?.message ?? "加载角色失败",
      { type: "error" }
    );
  }
}

async function onSearch() {
  loading.value = true;
  try {
    dataList.value = await getDataPermissions({
      roleId: filters.roleId || undefined,
      resource: filters.resource.trim() || undefined
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
  formModel.roleId = "";
  formModel.resource = "";
  formModel.scope = "self";
  formModel.customExpr = null;
  formModel.customExprText = "";
  editingId.value = null;
  formRef.value?.clearValidate();
}

function openCreateDialog() {
  resetForm();
  dialogTitle.value = "添加数据权限";
  dialogVisible.value = true;
}

async function openEditDialog(row: DataPermissionItem) {
  resetForm();
  editingId.value = row.id;
  dialogTitle.value = "编辑数据权限";
  dialogVisible.value = true;
  try {
    const detail = await getDataPermission(row.id);
    formModel.roleId = detail.roleId;
    formModel.resource = detail.resource;
    formModel.scope = detail.scope;
    formModel.customExpr = detail.customExpr;
    formModel.customExprText = detail.customExpr
      ? JSON.stringify(detail.customExpr, null, 2)
      : "";
  } catch (error: any) {
    message(
      error?.response?.data?.message ?? error?.message ?? "加载详情失败",
      { type: "error" }
    );
    dialogVisible.value = false;
  }
}

function buildCreatePayload(): DataPermissionForm {
  return {
    roleId: formModel.roleId,
    resource: formModel.resource.trim(),
    scope: formModel.scope,
    customExpr:
      formModel.scope === "custom"
        ? JSON.parse(formModel.customExprText)
        : null
  };
}

function buildUpdatePayload(): Partial<DataPermissionForm> {
  return {
    scope: formModel.scope,
    customExpr:
      formModel.scope === "custom"
        ? JSON.parse(formModel.customExprText)
        : null
  };
}

async function submitForm() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    if (editingId.value) {
      await updateDataPermission(editingId.value, buildUpdatePayload());
      message("更新成功", { type: "success" });
    } else {
      await createDataPermission(buildCreatePayload());
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

async function handleDelete(row: DataPermissionItem) {
  try {
    await ElMessageBox.confirm(
      `确定删除「${row.roleName ?? row.roleId} / ${row.resource}」的数据权限吗？`,
      "提示",
      { type: "warning", confirmButtonText: "删除", cancelButtonText: "取消" }
    );
    await deleteDataPermission(row.id);
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

onMounted(async () => {
  await Promise.all([loadRoles(), loadResources()]);
  await onSearch();
});
</script>

<template>
  <div class="main">
    <el-alert
      type="info"
      :closable="false"
      show-icon
      class="mx-8 mt-3 mb-0"
      title="数据权限控制角色在某一已注册资源上能看多少行数据。资源标识来自「资源管理」；与功能权限（菜单/API）互补：功能权限决定「能不能进」，数据权限决定「能看哪些数据」。"
    />

    <el-form
      :inline="true"
      class="search-form bg-bg_color w-full pl-8 pt-[12px] overflow-auto"
    >
      <el-form-item label="角色">
        <el-select
          v-model="filters.roleId"
          clearable
          filterable
          placeholder="全部角色"
          class="w-[220px]!"
        >
          <el-option
            v-for="role in roleOptions"
            :key="role.id"
            :label="`${role.name}（${role.code}）`"
            :value="role.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="资源">
        <el-select
          v-model="filters.resource"
          clearable
          filterable
          placeholder="全部资源"
          class="w-[220px]!"
        >
          <el-option
            v-for="item in resourceOptions"
            :key="item.code"
            :label="`${item.name}（${item.code}）`"
            :value="item.code"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="数据范围">
        <el-select
          v-model="filters.scope"
          clearable
          placeholder="全部"
          class="w-[160px]!"
        >
          <el-option
            v-for="item in scopeOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="loading" @click="onSearch">
          查询
        </el-button>
      </el-form-item>
    </el-form>

    <PureTableBar title="数据权限" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button type="primary" @click="openCreateDialog">
          添加数据权限
        </el-button>
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
      width="580px"
      destroy-on-close
      @closed="resetForm"
    >
      <el-form
        ref="formRef"
        :model="formModel"
        :rules="formRules"
        label-width="110px"
      >
        <el-form-item label="角色" prop="roleId">
          <el-select
            v-model="formModel.roleId"
            filterable
            placeholder="请选择角色"
            class="w-full!"
            :disabled="!!editingId"
          >
            <el-option
              v-for="role in roleOptions"
              :key="role.id"
              :label="`${role.name}（${role.code}）`"
              :value="role.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="资源" prop="resource">
          <el-select
            v-model="formModel.resource"
            filterable
            placeholder="请从资源管理中选择"
            class="w-full!"
            :disabled="!!editingId"
          >
            <el-option
              v-for="item in resourceOptions"
              :key="item.code"
              :label="`${item.name}（${item.code}）`"
              :value="item.code"
            />
          </el-select>
          <p v-if="!resourceOptions.length" class="scope-hint">
            暂无资源，请先在「资源管理」添加或点击「从权限同步」
          </p>
        </el-form-item>
        <el-form-item label="数据范围" prop="scope">
          <el-select
            v-model="formModel.scope"
            placeholder="请选择数据范围"
            class="w-full!"
          >
            <el-option
              v-for="item in scopeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
          <p v-if="currentScopeHint" class="scope-hint">{{ currentScopeHint }}</p>
        </el-form-item>
        <el-form-item
          v-if="showCustomExpr"
          label="自定义表达式"
          prop="customExprText"
        >
          <el-input
            v-model="formModel.customExprText"
            type="textarea"
            :rows="6"
            placeholder='如 {"field":"owner_id","op":"eq","value":"${userId}"}'
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

.scope-hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
}
</style>
