<script setup lang="ts">
import { PureTableBar } from "@/components/RePureTableBar";
import {
  createAuthCredential,
  deleteAuthCredential,
  getAuthCredentials,
  getAuthSessions,
  revokeAuthSession,
  updateAuthCredential,
  type AuthCredentialItem,
  type AuthSessionItem
} from "@/api/identity-auth";
import { getIdentityUsers, type IdentityUserItem } from "@/api/identity-user";
import { message } from "@/utils/message";
import type { FormInstance, FormRules } from "element-plus";
import { ElMessageBox } from "element-plus";
import { computed, onMounted, reactive, ref } from "vue";

defineOptions({ name: "IdentityAuthIndex" });

const DEFAULT_INITIAL_PASSWORD = "123456";

const activeTab = ref("credentials");
const loading = ref(false);
const credentials = ref<AuthCredentialItem[]>([]);
const sessions = ref<AuthSessionItem[]>([]);
const userOptions = ref<IdentityUserItem[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);

const credentialUserIds = computed(
  () => new Set(credentials.value.map(item => item.userId))
);

const eligibleUsers = computed(() =>
  userOptions.value.filter(user => {
    if (user.status === "disabled" || user.status === "locked") return false;
    if (!user.email?.trim()) return false;
    if (credentialUserIds.value.has(user.id)) return false;
    return true;
  })
);

const selectedUser = computed(() =>
  userOptions.value.find(item => item.id === formModel.userId)
);

const credentialColumns: TableColumnList = [
  { label: "登录邮箱", prop: "accountId", minWidth: 180 },
  { label: "姓名", minWidth: 120, formatter: ({ user }) => user?.name ?? "-" },
  { label: "电话", minWidth: 130, formatter: ({ user }) => user?.phone ?? "-" },
  { label: "用户 ID", prop: "userId", minWidth: 200 },
  { label: "创建时间", prop: "createdAt", minWidth: 170 },
  { label: "操作", fixed: "right", width: 180, slot: "credentialOp" }
];

const sessionColumns: TableColumnList = [
  {
    label: "用户",
    minWidth: 200,
    formatter: ({ user, userId }) => user?.email ?? user?.name ?? userId
  },
  { label: "Token", minWidth: 160, formatter: ({ token }) => `${token.slice(0, 12)}...` },
  { label: "过期时间", prop: "expiresAt", minWidth: 170 },
  { label: "IP", prop: "ipAddress", minWidth: 130, formatter: ({ ipAddress }) => ipAddress ?? "-" },
  { label: "操作", fixed: "right", width: 100, slot: "sessionOp" }
];

const dialogVisible = ref(false);
const dialogTitle = ref("开通凭证登录");
const submitting = ref(false);
const editingId = ref<string | null>(null);
const formRef = ref<FormInstance>();

const formModel = reactive({
  userId: "",
  password: ""
});

const isEditing = computed(() => !!editingId.value);

const formRules: FormRules = {
  userId: [{ required: true, message: "请选择用户", trigger: "change" }],
  password: [
    {
      validator: (_rule, value, callback) => {
        if (isEditing.value && !value?.trim()) {
          callback(new Error("请输入新密码"));
          return;
        }
        if (value?.trim() && value.trim().length < 6) {
          callback(new Error("密码至少 6 位"));
          return;
        }
        callback();
      },
      trigger: "blur"
    }
  ]
};

function formatUserLabel(user: IdentityUserItem) {
  const name = user.name ? ` / ${user.name}` : "";
  const status =
    user.status === "pending" ? "（待激活）" : user.status === "active" ? "" : `（${user.status}）`;
  return `${user.email}${name}${status}`;
}

async function loadUsers() {
  try {
    const pageSizeLimit = 100;
    let pageNo = 1;
    let allItems: IdentityUserItem[] = [];
    let totalCount = 0;

    do {
      const res = await getIdentityUsers({ page: pageNo, pageSize: pageSizeLimit });
      allItems = allItems.concat(res.items);
      totalCount = res.total;
      pageNo += 1;
    } while (allItems.length < totalCount);

    userOptions.value = allItems;
  } catch (error: any) {
    message(
      error?.response?.data?.message ?? error?.message ?? "加载用户列表失败",
      { type: "error" }
    );
  }
}

async function loadData() {
  loading.value = true;
  try {
    if (activeTab.value === "credentials") {
      const res = await getAuthCredentials({ page: page.value, pageSize: pageSize.value });
      credentials.value = res.items;
      total.value = res.total;
    } else {
      const res = await getAuthSessions({ page: page.value, pageSize: pageSize.value });
      sessions.value = res.items;
      total.value = res.total;
    }
  } finally {
    loading.value = false;
  }
}

function onTabChange() {
  page.value = 1;
  loadData();
}

function resetForm() {
  formModel.userId = "";
  formModel.password = "";
  editingId.value = null;
  formRef.value?.clearValidate();
}

function openCreateDialog() {
  resetForm();
  dialogTitle.value = "开通凭证登录";
  dialogVisible.value = true;
}

function openResetPasswordDialog(row: AuthCredentialItem) {
  resetForm();
  editingId.value = row.id;
  dialogTitle.value = "重置密码";
  formModel.userId = row.userId;
  dialogVisible.value = true;
}

async function submitForm() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    if (editingId.value) {
      await updateAuthCredential(editingId.value, {
        password: formModel.password.trim()
      });
      message("密码已重置", { type: "success" });
    } else {
      await createAuthCredential({
        userId: formModel.userId,
        password: formModel.password.trim() || undefined
      });
      message(
        `凭证登录已开通，初始密码为 ${formModel.password.trim() || DEFAULT_INITIAL_PASSWORD}`,
        { type: "success" }
      );
    }
    dialogVisible.value = false;
    await Promise.all([loadData(), loadUsers()]);
  } catch (error: any) {
    message(
      error?.response?.data?.message ?? error?.message ?? "操作失败",
      { type: "error" }
    );
  } finally {
    submitting.value = false;
  }
}

async function handleDeleteCredential(row: AuthCredentialItem) {
  try {
    await ElMessageBox.confirm(
      `确定删除「${row.accountId}」的邮箱密码登录吗？删除后该用户无法用密码登录，用户档案仍保留在「用户管理」。`,
      "提示",
      { type: "warning" }
    );
    await deleteAuthCredential(row.id);
    message("删除成功", { type: "success" });
    await Promise.all([loadData(), loadUsers()]);
  } catch (error: any) {
    if (error === "cancel" || error === "close") return;
    message(error?.response?.data?.message ?? "删除失败", { type: "error" });
  }
}

async function handleRevokeSession(row: AuthSessionItem) {
  try {
    await ElMessageBox.confirm("确定踢下线该会话吗？", "提示", { type: "warning" });
    await revokeAuthSession(row.id);
    message("已踢下线", { type: "success" });
    await loadData();
  } catch (error: any) {
    if (error === "cancel" || error === "close") return;
    message(error?.response?.data?.message ?? "操作失败", { type: "error" });
  }
}

onMounted(async () => {
  await Promise.all([loadUsers(), loadData()]);
});
</script>

<template>
  <div class="main">
    <el-alert
      type="info"
      :closable="false"
      show-icon
      class="mx-8 mt-3 mb-0"
      title="身份认证管「怎么登录」：请先在「用户管理」创建用户，再在此为其开通邮箱密码登录。用户资料（邮箱/姓名/手机）在用户管理维护；GitHub/微信等第三方登录在「账户管理」绑定。"
    />

    <el-tabs v-model="activeTab" class="px-8 pt-3" @tab-change="onTabChange">
      <el-tab-pane label="凭证账户" name="credentials">
        <PureTableBar title="邮箱密码登录" :columns="credentialColumns" @refresh="loadData">
          <template #buttons>
            <el-button type="primary" @click="openCreateDialog">开通凭证登录</el-button>
          </template>
          <template #default="{ size, dynamicColumns }">
            <pure-table
              adaptive
              align-whole="center"
              row-key="id"
              showOverflowTooltip
              :loading="loading"
              :size="size"
              :data="credentials"
              :columns="dynamicColumns"
            >
              <template #credentialOp="{ row }">
                <el-button link type="primary" @click="openResetPasswordDialog(row)">
                  重置密码
                </el-button>
                <el-button link type="danger" @click="handleDeleteCredential(row)">
                  删除
                </el-button>
              </template>
            </pure-table>
          </template>
        </PureTableBar>
      </el-tab-pane>
      <el-tab-pane label="活跃会话" name="sessions">
        <PureTableBar title="活跃会话" :columns="sessionColumns" @refresh="loadData">
          <template #default="{ size, dynamicColumns }">
            <pure-table
              adaptive
              align-whole="center"
              row-key="id"
              showOverflowTooltip
              :loading="loading"
              :size="size"
              :data="sessions"
              :columns="dynamicColumns"
            >
              <template #sessionOp="{ row }">
                <el-button link type="danger" @click="handleRevokeSession(row)">踢下线</el-button>
              </template>
            </pure-table>
          </template>
        </PureTableBar>
      </el-tab-pane>
    </el-tabs>

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
        <template v-if="isEditing">
          <el-form-item label="用户">
            <el-input
              :model-value="
                selectedUser
                  ? formatUserLabel(selectedUser)
                  : credentials.find(item => item.id === editingId)?.accountId ?? '-'
              "
              disabled
            />
          </el-form-item>
          <el-form-item label="新密码" prop="password">
            <el-input
              v-model="formModel.password"
              type="password"
              show-password
              placeholder="至少 6 位"
            />
          </el-form-item>
        </template>
        <template v-else>
          <el-form-item label="选择用户" prop="userId">
            <el-select
              v-model="formModel.userId"
              filterable
              placeholder="从用户管理选择"
              class="w-full!"
            >
              <el-option
                v-for="user in eligibleUsers"
                :key="user.id"
                :label="formatUserLabel(user)"
                :value="user.id"
              />
            </el-select>
            <p v-if="eligibleUsers.length === 0" class="field-hint warn">
              没有可开通的用户。请先在「用户管理」创建用户并填写邮箱，且该用户尚未开通凭证登录。
            </p>
          </el-form-item>
          <el-form-item v-if="selectedUser" label="用户资料">
            <div class="user-preview">
              <p>邮箱：{{ selectedUser.email ?? "-" }}</p>
              <p>姓名：{{ selectedUser.name ?? "-" }}</p>
              <p>电话：{{ selectedUser.phone ?? "-" }}</p>
            </div>
            <p class="field-hint">资料来自用户管理，此处只读</p>
          </el-form-item>
          <el-form-item label="初始密码" prop="password">
            <el-input
              v-model="formModel.password"
              type="password"
              show-password
              placeholder="留空则使用 123456"
            />
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.field-hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.4;

  &.warn {
    color: var(--el-color-warning);
  }
}

.user-preview {
  width: 100%;
  padding: 8px 12px;
  font-size: 13px;
  line-height: 1.6;
  background: var(--el-fill-color-light);
  border-radius: 4px;

  p {
    margin: 0;
  }
}
</style>
