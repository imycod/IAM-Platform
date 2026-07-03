<script setup lang="ts">
import { PureTableBar } from "@/components/RePureTableBar";
import { getApplications, type ApplicationItem } from "@/api/application";
import {
  createApplicationRole,
  deleteApplicationRole,
  getApplicationRolePermissions,
  getApplicationRoles,
  setApplicationRolePermissions,
  updateApplicationRole,
  type ApplicationRoleForm,
  type ApplicationRoleItem
} from "@/api/application-role";
import { getPermissions, type PermissionItem } from "@/api/permission";
import { message } from "@/utils/message";
import type { FormInstance, FormRules } from "element-plus";
import { ElMessageBox } from "element-plus";
import { computed, onMounted, reactive, ref, watch } from "vue";

defineOptions({
  name: "ApplicationRoleIndex"
});

const tableRef = ref();
const loading = ref(false);
const applicationsLoading = ref(false);
const permissionsLoading = ref(false);
const dataList = ref<ApplicationRoleItem[]>([]);
const applicationList = ref<ApplicationItem[]>([]);
const selectedApplicationId = ref("");
const permissionOptions = ref<PermissionItem[]>([]);
const permissionDialogVisible = ref(false);
const permissionSubmitting = ref(false);
const permissionEditingRole = ref<ApplicationRoleItem | null>(null);
const selectedPermissionIds = ref<string[]>([]);

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
  { label: "角色编码", prop: "code", minWidth: 140 },
  {
    label: "访问角色",
    minWidth: 180,
    formatter: ({ accessRole }) => accessRole?.code ?? "-"
  },
  {
    label: "权限数",
    minWidth: 90,
    formatter: ({ permissionIds }) => permissionIds?.length ?? 0
  },
  { label: "创建时间", prop: "createdAt", minWidth: 170 },
  { label: "操作", fixed: "right", width: 260, slot: "operation" }
];

const dialogVisible = ref(false);
const dialogTitle = ref("添加角色");
const editingId = ref<string | null>(null);
const submitting = ref(false);
const formRef = ref<FormInstance>();

const formModel = reactive<ApplicationRoleForm & { description: string }>({
  name: "",
  code: "",
  description: ""
});

const formRules: FormRules = {
  name: [{ required: true, message: "请输入角色名称", trigger: "blur" }],
  code: [{ required: true, message: "请输入角色编码", trigger: "blur" }]
};

const editingAccessRoleCode = ref("");

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
    return;
  }

  loading.value = true;
  try {
    dataList.value = await getApplicationRoles(selectedApplicationId.value);
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
  formModel.description = "";
  editingId.value = null;
  editingAccessRoleCode.value = "";
  formRef.value?.clearValidate();
}

function openCreateDialog() {
  if (!selectedApplicationId.value) {
    message("请先选择应用", { type: "warning" });
    return;
  }
  resetForm();
  dialogTitle.value = "添加角色";
  dialogVisible.value = true;
}

function openEditDialog(row: ApplicationRoleItem) {
  editingId.value = row.id;
  dialogTitle.value = "编辑角色";
  formModel.name = row.name;
  formModel.code = row.code;
  formModel.description = row.accessRole?.description ?? "";
  editingAccessRoleCode.value = row.accessRole?.code ?? "";
  dialogVisible.value = true;
}

function buildPayload(): ApplicationRoleForm {
  return {
    name: formModel.name.trim(),
    code: formModel.code.trim()
  };
}

async function submitForm() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid || !selectedApplicationId.value) return;

  submitting.value = true;
  try {
    if (editingId.value) {
      await updateApplicationRole(selectedApplicationId.value, editingId.value, {
        name: formModel.name.trim(),
        description: formModel.description.trim() || undefined
      });
      message("更新成功", { type: "success" });
    } else {
      await createApplicationRole(selectedApplicationId.value, buildPayload());
      message("创建成功，已同步创建访问控制角色", { type: "success" });
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

async function openPermissionDialog(row: ApplicationRoleItem) {
  if (!selectedApplicationId.value) return;
  permissionEditingRole.value = row;
  permissionsLoading.value = true;
  permissionDialogVisible.value = true;
  try {
    const [permissions, permissionIds] = await Promise.all([
      getPermissions({ applicationId: selectedApplicationId.value }),
      getApplicationRolePermissions(selectedApplicationId.value, row.id)
    ]);
    permissionOptions.value = permissions;
    selectedPermissionIds.value = permissionIds;
  } catch (error: any) {
    message(
      error?.response?.data?.message ?? error?.message ?? "加载权限失败",
      { type: "error" }
    );
    permissionDialogVisible.value = false;
  } finally {
    permissionsLoading.value = false;
  }
}

async function submitPermissions() {
  if (!selectedApplicationId.value || !permissionEditingRole.value) return;
  permissionSubmitting.value = true;
  try {
    await setApplicationRolePermissions(
      selectedApplicationId.value,
      permissionEditingRole.value.id,
      selectedPermissionIds.value
    );
    message("权限已保存", { type: "success" });
    permissionDialogVisible.value = false;
    await onSearch();
  } catch (error: any) {
    message(
      error?.response?.data?.message ?? error?.message ?? "保存失败",
      { type: "error" }
    );
  } finally {
    permissionSubmitting.value = false;
  }
}

async function handleDelete(row: ApplicationRoleItem) {
  if (!selectedApplicationId.value) return;

  try {
    await ElMessageBox.confirm(
      `确定删除角色「${row.name}（${row.code}）」吗？将同时删除绑定的访问控制角色。`,
      "提示",
      { type: "warning", confirmButtonText: "删除", cancelButtonText: "取消" }
    );
    await deleteApplicationRole(selectedApplicationId.value, row.id);
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

onMounted(async () => {
  await loadApplications();
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
      title="应用角色会自动桥接到访问控制域的 role（编码规则：应用code_角色code）。在此配置权限后，分配给用户的应用角色会通过 user_role 生效。"
    />

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
      <el-form-item label="角色名称">
        <el-input
          v-model="filters.name"
          clearable
          placeholder="模糊搜索"
          class="w-[220px]!"
        />
      </el-form-item>
      <el-form-item label="角色编码">
        <el-input
          v-model="filters.code"
          clearable
          placeholder="模糊搜索"
          class="w-[220px]!"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="loading" @click="onSearch">
          查询
        </el-button>
      </el-form-item>
    </el-form>

    <PureTableBar title="应用角色" :columns="columns" @refresh="onSearch">
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
            <el-button link type="primary" @click="openPermissionDialog(row)">
              配置权限
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
        <el-form-item label="角色名称" prop="name">
          <el-input
            v-model="formModel.name"
            placeholder="如 应用管理员"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="角色编码" prop="code">
          <el-input
            v-model="formModel.code"
            placeholder="如 app_admin，访问角色为 iam_admin:app_admin"
            maxlength="50"
            show-word-limit
            :disabled="!!editingId"
          />
        </el-form-item>
        <el-form-item v-if="editingId" label="访问角色">
          <el-input :model-value="editingAccessRoleCode" disabled />
        </el-form-item>
        <el-form-item v-if="editingId" label="描述">
          <el-input
            v-model="formModel.description"
            type="textarea"
            :rows="3"
            placeholder="同步更新到绑定的访问控制角色"
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

    <el-dialog
      v-model="permissionDialogVisible"
      :title="`配置权限 — ${permissionEditingRole?.name ?? ''}`"
      width="640px"
      destroy-on-close
    >
      <div v-loading="permissionsLoading">
        <p class="text-sm text-gray-500 mb-3">
          访问角色：{{ permissionEditingRole?.accessRole?.code ?? "-" }}。勾选后保存即写入
          role_permission，菜单与 API 鉴权据此生效。
        </p>
        <el-checkbox-group v-model="selectedPermissionIds" class="perm-group">
          <el-checkbox
            v-for="item in permissionOptions"
            :key="item.id"
            :value="item.id"
            class="perm-item"
          >
            {{ item.name }}（{{ item.code }}）
          </el-checkbox>
        </el-checkbox-group>
        <el-empty v-if="!permissionsLoading && !permissionOptions.length" description="该应用暂无权限点" />
      </div>
      <template #footer>
        <el-button @click="permissionDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="permissionSubmitting"
          @click="submitPermissions"
        >
          保存
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

.perm-group {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  max-height: 360px;
  overflow: auto;
}

.perm-item {
  margin: 0 0 8px;
  height: auto;
  white-space: normal;
}
</style>
