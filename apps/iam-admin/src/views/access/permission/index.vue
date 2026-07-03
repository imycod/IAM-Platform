<script setup lang="ts">
import { PureTableBar } from "@/components/RePureTableBar";
import { getApplications, type ApplicationItem } from "@/api/application";
import {
  createPermission,
  deletePermission,
  getPermission,
  getPermissions,
  updatePermission,
  type PermissionForm,
  type PermissionItem
} from "@/api/permission";
import { getResources, type ResourceItem } from "@/api/resource";
import { message } from "@/utils/message";
import type { FormInstance, FormRules } from "element-plus";
import { ElMessageBox } from "element-plus";
import { computed, onMounted, reactive, ref, watch } from "vue";

defineOptions({
  name: "AccessPermissionIndex"
});

const PLATFORM_VALUE = "platform";

const actionPresets = ["view", "create", "update", "delete", "manage"];

const tableRef = ref();
const loading = ref(false);
const dataList = ref<PermissionItem[]>([]);
const applicationOptions = ref<ApplicationItem[]>([]);
const resourceOptions = ref<ResourceItem[]>([]);

const filters = reactive({
  applicationId: "",
  name: "",
  code: "",
  resource: ""
});

const columns: TableColumnList = [
  { label: "权限名称", prop: "name", minWidth: 140 },
  { label: "权限编码", prop: "code", minWidth: 200 },
  { label: "资源", prop: "resource", minWidth: 160 },
  { label: "操作", prop: "action", minWidth: 90 },
  {
    label: "所属应用",
    prop: "application",
    minWidth: 160,
    formatter: ({ application, applicationId }) =>
      application ? `${application.name}（${application.code}）` : applicationId ? "-" : "平台级"
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
const dialogTitle = ref("添加权限");
const submitting = ref(false);
const editingId = ref<string | null>(null);
const formRef = ref<FormInstance>();

const formModel = reactive<
  PermissionForm & { applicationSelect: string }
>({
  applicationSelect: "",
  applicationId: undefined,
  name: "",
  code: "",
  resource: "",
  action: "view"
});

const isEditing = computed(() => !!editingId.value);

/** 应用 code → 权限前缀，如 iam-admin → iam_admin */
function getAppPrefix(appSelect: string): string {
  if (!appSelect || appSelect === PLATFORM_VALUE) return "platform";
  const app = applicationOptions.value.find(item => item.id === appSelect);
  return app?.code?.replace(/-/g, "_") ?? "platform";
}

/**
 * 资源字段规范：存完整标识 {应用前缀}:{业务名}，如 iam_admin:role。
 * 若用户只填短名 role，提交前补全前缀。
 */
function normalizeResourceCode(resource: string, appSelect: string): string {
  const value = resource.trim();
  if (!value) return "";
  if (value.includes(":")) return value;
  return `${getAppPrefix(appSelect)}:${value}`;
}

/**
 * 权限编码 = {完整 resource}:{action}，不再重复拼应用前缀。
 * 例：resource=iam_admin:role, action=view → iam_admin:role:view
 */
function buildPermissionCode(
  resource: string,
  action: string,
  appSelect: string
): string {
  const fullResource = normalizeResourceCode(resource, appSelect);
  const act = action.trim();
  if (!fullResource || !act) return "";
  return `${fullResource}:${act}`;
}

const dialogResourceOptions = computed(() => {
  const appSelect = formModel.applicationSelect;
  if (!appSelect || appSelect === PLATFORM_VALUE) {
    return resourceOptions.value;
  }
  const prefix = getAppPrefix(appSelect);
  return resourceOptions.value.filter(item => item.code.startsWith(`${prefix}:`));
});

const formRules: FormRules = {
  applicationSelect: [
    { required: true, message: "请选择所属应用", trigger: "change" }
  ],
  name: [{ required: true, message: "请输入权限名称", trigger: "blur" }],
  code: [{ required: true, message: "请输入权限编码", trigger: "blur" }],
  resource: [{ required: true, message: "请选择或输入资源", trigger: "change" }],
  action: [{ required: true, message: "请选择或输入操作", trigger: "change" }]
};

watch(
  () => [formModel.resource, formModel.action, formModel.applicationSelect] as const,
  ([resource, action, appSelect]) => {
    if (isEditing.value) return;
    formModel.code = buildPermissionCode(resource, action, appSelect);
  }
);

watch(
  () => formModel.applicationSelect,
  () => {
    if (isEditing.value || !formModel.resource) return;
    formModel.code = buildPermissionCode(
      formModel.resource,
      formModel.action,
      formModel.applicationSelect
    );
  }
);

function formatApplicationLabel(app: ApplicationItem) {
  return `${app.name}（${app.code}）`;
}

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

async function loadApplications() {
  try {
    applicationOptions.value = await getApplications();
  } catch (error: any) {
    message(
      error?.response?.data?.message ?? error?.message ?? "加载应用失败",
      { type: "error" }
    );
  }
}

async function onSearch() {
  loading.value = true;
  try {
    dataList.value = await getPermissions({
      applicationId: filters.applicationId || undefined,
      name: filters.name.trim() || undefined,
      code: filters.code.trim() || undefined,
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
  formModel.applicationSelect = "";
  formModel.applicationId = undefined;
  formModel.name = "";
  formModel.code = "";
  formModel.resource = "";
  formModel.action = "view";
  editingId.value = null;
  formRef.value?.clearValidate();
}

function openCreateDialog() {
  resetForm();
  dialogTitle.value = "添加权限";
  dialogVisible.value = true;
}

async function openEditDialog(row: PermissionItem) {
  resetForm();
  editingId.value = row.id;
  dialogTitle.value = "编辑权限";
  dialogVisible.value = true;
  try {
    const detail = await getPermission(row.id);
    formModel.applicationSelect = detail.applicationId ?? PLATFORM_VALUE;
    formModel.applicationId = detail.applicationId ?? undefined;
    formModel.name = detail.name;
    formModel.code = detail.code;
    formModel.resource = detail.resource;
    formModel.action = detail.action;
  } catch (error: any) {
    message(
      error?.response?.data?.message ?? error?.message ?? "加载详情失败",
      { type: "error" }
    );
    dialogVisible.value = false;
  }
}

function buildCreatePayload(): PermissionForm {
  const applicationId =
    formModel.applicationSelect === PLATFORM_VALUE
      ? undefined
      : formModel.applicationSelect;
  const resource = normalizeResourceCode(
    formModel.resource,
    formModel.applicationSelect
  );
  const action = formModel.action.trim();
  return {
    applicationId,
    name: formModel.name.trim(),
    code: formModel.code.trim() || buildPermissionCode(resource, action, formModel.applicationSelect),
    resource,
    action
  };
}

function buildUpdatePayload(): Partial<PermissionForm> {
  return {
    name: formModel.name.trim(),
    resource: formModel.resource.trim(),
    action: formModel.action.trim()
  };
}

async function submitForm() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    if (editingId.value) {
      await updatePermission(editingId.value, buildUpdatePayload());
      message("更新成功", { type: "success" });
    } else {
      await createPermission(buildCreatePayload());
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

async function handleDelete(row: PermissionItem) {
  try {
    await ElMessageBox.confirm(
      `确定删除权限「${row.name}（${row.code}）」吗？已绑定该权限的角色将失去对应能力。`,
      "提示",
      { type: "warning", confirmButtonText: "删除", cancelButtonText: "取消" }
    );
    await deletePermission(row.id);
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
  await Promise.all([loadApplications(), loadResources()]);
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
      title="功能权限：资源为完整标识（应用前缀:业务名，如 iam_admin:role），权限编码 = 资源:操作（如 iam_admin:role:view）。资源请先在「资源管理」注册，或只填短名 role 由系统自动补前缀。"
    />

    <el-form
      :inline="true"
      class="search-form bg-bg_color w-full pl-8 pt-[12px] overflow-auto"
    >
      <el-form-item label="所属应用">
        <el-select
          v-model="filters.applicationId"
          clearable
          filterable
          placeholder="全部"
          class="w-[220px]!"
        >
          <el-option label="平台级" :value="PLATFORM_VALUE" />
          <el-option
            v-for="app in applicationOptions"
            :key="app.id"
            :label="formatApplicationLabel(app)"
            :value="app.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="权限名称">
        <el-input
          v-model="filters.name"
          clearable
          placeholder="模糊搜索"
          class="w-[160px]!"
          @keyup.enter="onSearch"
        />
      </el-form-item>
      <el-form-item label="权限编码">
        <el-input
          v-model="filters.code"
          clearable
          placeholder="模糊搜索"
          class="w-[180px]!"
          @keyup.enter="onSearch"
        />
      </el-form-item>
      <el-form-item label="资源">
        <el-input
          v-model="filters.resource"
          clearable
          placeholder="模糊搜索"
          class="w-[160px]!"
          @keyup.enter="onSearch"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="loading" @click="onSearch">
          查询
        </el-button>
      </el-form-item>
    </el-form>

    <PureTableBar title="权限管理" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button type="primary" @click="openCreateDialog">
          添加权限
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
          :data="dataList"
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
        <el-form-item label="所属应用" prop="applicationSelect">
          <el-select
            v-model="formModel.applicationSelect"
            filterable
            placeholder="请选择应用"
            class="w-full!"
            :disabled="isEditing"
          >
            <el-option label="平台级" :value="PLATFORM_VALUE" />
            <el-option
              v-for="app in applicationOptions"
              :key="app.id"
              :label="formatApplicationLabel(app)"
              :value="app.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="资源" prop="resource">
          <el-select
            v-model="formModel.resource"
            filterable
            allow-create
            default-first-option
            placeholder="选择资源或输入短名 role"
            class="w-full!"
            :disabled="isEditing"
          >
            <el-option
              v-for="item in dialogResourceOptions"
              :key="item.code"
              :label="`${item.name}（${item.code}）`"
              :value="item.code"
            />
          </el-select>
          <p v-if="!isEditing" class="field-hint">
            完整资源如 iam_admin:role；只填 role 也会自动补前缀。编码 = 资源:操作，不会重复拼前缀
          </p>
        </el-form-item>
        <el-form-item label="操作" prop="action">
          <el-select
            v-model="formModel.action"
            filterable
            allow-create
            default-first-option
            placeholder="如 view"
            class="w-full!"
            :disabled="isEditing"
          >
            <el-option
              v-for="item in actionPresets"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="权限名称" prop="name">
          <el-input v-model="formModel.name" placeholder="如 角色管理查看" />
        </el-form-item>
        <el-form-item label="权限编码" prop="code">
          <el-input
            v-model="formModel.code"
            placeholder="如 iam_admin:role:view"
            :disabled="isEditing"
          />
          <p v-if="!isEditing" class="field-hint">
            自动生成：{完整资源}:{操作}，也可手动修改
          </p>
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
