<script setup lang="ts">
import { PureTableBar } from "@/components/RePureTableBar";
import { getApplications, type ApplicationItem } from "@/api/application";
import {
  createApplicationUser,
  deleteApplicationUser,
  getApplicationUsers,
  updateApplicationUser,
  type ApplicationUserForm,
  type ApplicationUserItem,
  type ApplicationUserStatus
} from "@/api/application-user";
import { getApplicationRoles, type ApplicationRoleItem } from "@/api/application-role";
import { getAccounts, type AccountItem } from "@/api/identity-account";
import { message } from "@/utils/message";
import type { FormInstance, FormRules } from "element-plus";
import { ElMessageBox } from "element-plus";
import { computed, onMounted, reactive, ref, watch } from "vue";

defineOptions({
  name: "ApplicationUserIndex"
});

const statusOptions: { label: string; value: ApplicationUserStatus }[] = [
  { label: "正常", value: "active" },
  { label: "停用", value: "inactive" },
  { label: "待审批", value: "pending" },
  { label: "已拒绝", value: "rejected" }
];

const statusLabelMap = Object.fromEntries(
  statusOptions.map(item => [item.value, item.label])
) as Record<ApplicationUserStatus, string>;

const tableRef = ref();
const loading = ref(false);
const applicationsLoading = ref(false);
const accountsLoading = ref(false);
const rolesLoading = ref(false);
const dataList = ref<ApplicationUserItem[]>([]);
const applicationList = ref<ApplicationItem[]>([]);
const accountList = ref<AccountItem[]>([]);
const applicationRoleList = ref<ApplicationRoleItem[]>([]);
const selectedApplicationId = ref("");

const filters = reactive({
  userId: "",
  email: "",
  status: "" as ApplicationUserStatus | ""
});

const filteredList = computed(() => {
  return dataList.value.filter(row => {
    const userIdOk =
      !filters.userId ||
      row.userId.toLowerCase().includes(filters.userId.trim().toLowerCase());
    const emailOk =
      !filters.email ||
      (row.user?.email ?? "")
        .toLowerCase()
        .includes(filters.email.trim().toLowerCase());
    const statusOk = !filters.status || row.status === filters.status;
    return userIdOk && emailOk && statusOk;
  });
});

function formatUserOptionLabel(account: AccountItem): string {
  const email = account.user?.email ?? account.userEmail;
  const name = account.user?.name ?? account.userName;
  if (name && email) return `${name}（${email}）`;
  if (email) return email;
  if (name) return name;
  return account.userId;
}

const userOptions = computed(() => {
  const map = new Map<string, AccountItem>();
  for (const account of accountList.value) {
    const existing = map.get(account.userId);
    if (!existing) {
      map.set(account.userId, account);
      continue;
    }
    if (
      account.providerId === "credential" &&
      existing.providerId !== "credential"
    ) {
      map.set(account.userId, account);
    }
  }
  return Array.from(map.values())
    .map(account => ({
      userId: account.userId,
      label: formatUserOptionLabel(account)
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "zh-CN"));
});

const columns: TableColumnList = [
  {
    label: "应用",
    minWidth: 160,
    formatter: ({ application }) =>
      application ? `${application.name}（${application.code}）` : "-"
  },
  { label: "用户 ID", prop: "userId", minWidth: 200 },
  {
    label: "邮箱",
    minWidth: 180,
    formatter: ({ user }) => user?.email ?? "-"
  },
  {
    label: "姓名",
    minWidth: 120,
    formatter: ({ user }) => user?.name ?? "-"
  },
  {
    label: "手机",
    minWidth: 130,
    formatter: ({ user }) => user?.phone ?? "-"
  },
  {
    label: "应用角色",
    minWidth: 140,
    formatter: ({ applicationRole }) =>
      applicationRole ? `${applicationRole.name}（${applicationRole.code}）` : "-"
  },
  {
    label: "关联状态",
    prop: "status",
    minWidth: 100,
    formatter: ({ status }) =>
      statusLabelMap[status as ApplicationUserStatus] ?? status
  },
  {
    label: "授权时间",
    prop: "grantedAt",
    minWidth: 170,
    formatter: ({ grantedAt }) => grantedAt || "-"
  },
  { label: "操作", fixed: "right", width: 160, slot: "operation" }
];

const dialogVisible = ref(false);
const dialogTitle = ref("添加应用用户");
const submitting = ref(false);
const editingId = ref<string | null>(null);
const formRef = ref<FormInstance>();

const formModel = reactive<
  ApplicationUserForm & {
    applicationId: string;
    applicationRoleId: string;
    status: ApplicationUserStatus;
  }
>({
  applicationId: "",
  userId: "",
  applicationRoleId: "",
  status: "active"
});

const editingUserBrief = ref<ApplicationUserItem["user"]>(null);
const editingApplicationBrief = ref<ApplicationUserItem["application"]>(null);

const formRules: FormRules = {
  applicationId: [{ required: true, message: "请选择应用", trigger: "change" }],
  userId: [{ required: true, message: "请选择用户", trigger: "change" }],
  status: [{ required: true, message: "请选择状态", trigger: "change" }]
};

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

async function loadApplicationRoles(applicationId: string) {
  if (!applicationId) {
    applicationRoleList.value = [];
    return;
  }
  rolesLoading.value = true;
  try {
    applicationRoleList.value = await getApplicationRoles(applicationId);
  } catch (error: any) {
    applicationRoleList.value = [];
    message(
      error?.response?.data?.message ?? error?.message ?? "获取应用角色失败",
      { type: "error" }
    );
  } finally {
    rolesLoading.value = false;
  }
}

async function loadAccounts() {
  accountsLoading.value = true;
  try {
    const res = await getAccounts({ page: 1, pageSize: 100 });
    accountList.value = res.items;
  } catch (error: any) {
    message(
      error?.response?.data?.message ?? error?.message ?? "获取用户列表失败",
      { type: "error" }
    );
  } finally {
    accountsLoading.value = false;
  }
}

async function onSearch() {
  if (!selectedApplicationId.value) {
    dataList.value = [];
    return;
  }

  loading.value = true;
  try {
    dataList.value = await getApplicationUsers(selectedApplicationId.value);
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
  formModel.applicationId = "";
  formModel.userId = "";
  formModel.applicationRoleId = "";
  formModel.status = "active";
  editingId.value = null;
  editingUserBrief.value = null;
  editingApplicationBrief.value = null;
  formRef.value?.clearValidate();
}

async function openCreateDialog() {
  resetForm();
  dialogTitle.value = "添加应用用户";
  formModel.applicationId =
    selectedApplicationId.value || applicationList.value[0]?.id || "";
  dialogVisible.value = true;
  await loadApplicationRoles(formModel.applicationId);
  if (!accountList.value.length) {
    await loadAccounts();
  }
}

function openEditDialog(row: ApplicationUserItem) {
  editingId.value = row.id;
  dialogTitle.value = "编辑应用用户";
  formModel.userId = row.userId;
  formModel.applicationRoleId = row.applicationRoleId ?? "";
  formModel.status = (row.status as ApplicationUserStatus) ?? "active";
  editingUserBrief.value = row.user ?? null;
  editingApplicationBrief.value = row.application ?? null;
  dialogVisible.value = true;
  void loadApplicationRoles(selectedApplicationId.value);
}

function normalizeOptionalId(value?: string | null): string | undefined {
  const trimmed = (value ?? "").trim();
  return trimmed || undefined;
}

function buildPayload(): ApplicationUserForm {
  return {
    userId: formModel.userId.trim(),
    applicationRoleId: normalizeOptionalId(formModel.applicationRoleId),
    status: formModel.status
  };
}

async function submitForm() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  const applicationId = editingId.value
    ? selectedApplicationId.value
    : formModel.applicationId;
  if (!applicationId) return;

  submitting.value = true;
  try {
    if (editingId.value) {
      await updateApplicationUser(applicationId, editingId.value, {
        status: formModel.status,
        applicationRoleId: normalizeOptionalId(formModel.applicationRoleId) ?? null
      });
      message("更新成功", { type: "success" });
    } else {
      await createApplicationUser(applicationId, buildPayload());
      message("创建成功", { type: "success" });
      if (selectedApplicationId.value !== applicationId) {
        selectedApplicationId.value = applicationId;
      }
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

async function handleDelete(row: ApplicationUserItem) {
  if (!selectedApplicationId.value) return;
  const userLabel = row.user?.email ?? row.user?.name ?? row.userId;
  try {
    await ElMessageBox.confirm(
      `确定删除用户「${userLabel}」与该应用的关联吗？删除后用户将无法访问该应用。`,
      "提示",
      { type: "warning", confirmButtonText: "删除", cancelButtonText: "取消" }
    );
    await deleteApplicationUser(selectedApplicationId.value, row.id);
    message("删除成功", { type: "success" });
    await onSearch();
  } catch (error: any) {
    if (error === "cancel" || error === "close") return;
    message(
      error?.response?.data?.message ?? error?.message ?? "删除失败，请稍后重试",
      { type: "error" }
    );
  }
}

watch(selectedApplicationId, () => {
  onSearch();
  void loadApplicationRoles(selectedApplicationId.value);
});

onMounted(async () => {
  await loadApplications();
  await onSearch();
  if (selectedApplicationId.value) {
    await loadApplicationRoles(selectedApplicationId.value);
  }
});
</script>

<template>
  <div class="main">
    <el-alert
      type="info"
      :closable="false"
      show-icon
      class="mx-8 mt-3 mb-0"
      title="将用户关联到应用。选择应用角色后会自动写入 user_role，菜单与 API 权限据此生效；设为「停用」会撤销访问并拒绝登录。"
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
      <el-form-item label="用户 ID">
        <el-input
          v-model="filters.userId"
          clearable
          placeholder="模糊搜索"
          class="w-[200px]!"
        />
      </el-form-item>
      <el-form-item label="邮箱">
        <el-input
          v-model="filters.email"
          clearable
          placeholder="模糊搜索"
          class="w-[200px]!"
        />
      </el-form-item>
      <el-form-item label="状态">
        <el-select
          v-model="filters.status"
          clearable
          placeholder="全部"
          class="w-[140px]!"
        >
          <el-option
            v-for="item in statusOptions"
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

    <PureTableBar title="应用用户" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button type="primary" @click="openCreateDialog">添加用户</el-button>
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
        <el-form-item v-if="!editingId" label="应用" prop="applicationId">
          <el-select
            v-model="formModel.applicationId"
            placeholder="请选择应用"
            filterable
            class="w-full!"
            :loading="applicationsLoading"
            @change="loadApplicationRoles(formModel.applicationId)"
          >
            <el-option
              v-for="item in applicationList"
              :key="item.id"
              :label="`${item.name}（${item.code}）`"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-else-if="editingApplicationBrief" label="应用">
          <el-input
            :model-value="`${editingApplicationBrief.name}（${editingApplicationBrief.code}）`"
            disabled
          />
        </el-form-item>
        <el-form-item v-if="!editingId" label="用户" prop="userId">
          <el-select
            v-model="formModel.userId"
            placeholder="请选择用户，可输入邮箱搜索"
            filterable
            class="w-full!"
            :loading="accountsLoading"
          >
            <el-option
              v-for="item in userOptions"
              :key="item.userId"
              :label="item.label"
              :value="item.userId"
            />
          </el-select>
        </el-form-item>
        <template v-else-if="editingUserBrief">
          <el-form-item label="邮箱">
            <el-input :model-value="editingUserBrief.email ?? '-'" disabled />
          </el-form-item>
          <el-form-item label="姓名">
            <el-input :model-value="editingUserBrief.name ?? '-'" disabled />
          </el-form-item>
          <el-form-item label="手机">
            <el-input :model-value="editingUserBrief.phone ?? '-'" disabled />
          </el-form-item>
        </template>
        <el-form-item label="应用角色">
          <el-select
            v-model="formModel.applicationRoleId"
            clearable
            placeholder="可选，分配后同步访问权限"
            filterable
            class="w-full!"
            :loading="rolesLoading"
          >
            <el-option
              v-for="item in applicationRoleList"
              :key="item.id"
              :label="`${item.name}（${item.code}）`"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="关联状态" prop="status">
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
