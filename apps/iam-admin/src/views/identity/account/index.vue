<script setup lang="ts">
import { PureTableBar } from "@/components/RePureTableBar";
import {
  createAccount,
  deleteAccount,
  getAccounts,
  updateAccount,
  type AccountForm,
  type AccountItem
} from "@/api/identity-account";
import { message } from "@/utils/message";
import type { FormInstance, FormRules } from "element-plus";
import { ElMessageBox } from "element-plus";
import { computed, onMounted, reactive, ref } from "vue";

defineOptions({
  name: "IdentityAccountIndex"
});

const tableRef = ref();
const loading = ref(false);
const dataList = ref<AccountItem[]>([]);

const filters = reactive({
  userId: "",
  providerId: "",
  accountId: ""
});

const filteredList = computed(() => {
  return dataList.value.filter(row => {
    const accountIdOk =
      !filters.accountId ||
      row.accountId.toLowerCase().includes(filters.accountId.trim().toLowerCase());
    return accountIdOk;
  });
});

const columns: TableColumnList = [
  { label: "用户 ID", prop: "userId", minWidth: 200 },
  { label: "Provider ID", prop: "providerId", minWidth: 140 },
  { label: "账户 ID", prop: "accountId", minWidth: 160 },
  {
    label: "Scope",
    prop: "scope",
    minWidth: 120,
    formatter: ({ scope }) => scope ?? "-"
  },
  {
    label: "用户邮箱",
    minWidth: 180,
    formatter: ({ user }) => user.email ?? "-"
  },
  { label: "创建时间", prop: "createdAt", minWidth: 170 },
  { label: "操作", fixed: "right", width: 160, slot: "operation" }
];

const dialogVisible = ref(false);
const dialogTitle = ref("添加账户");
const submitting = ref(false);
const editingId = ref<string | null>(null);
const formRef = ref<FormInstance>();

const formModel = reactive<AccountForm>({
  userId: "",
  providerId: "",
  accountId: "",
  password: "",
  scope: ""
});

const formRules: FormRules = {
  userId: [{ required: true, message: "请输入用户 ID", trigger: "blur" }],
  providerId: [{ required: true, message: "请输入 Provider ID", trigger: "blur" }],
  accountId: [{ required: true, message: "请输入账户 ID", trigger: "blur" }],
  password: [
    {
      validator: (_rule, value, callback) => {
        if (editingId.value) {
          callback();
          return;
        }
        if (!value?.trim()) {
          callback(new Error("请输入密码"));
          return;
        }
        if (value.trim().length < 6) {
          callback(new Error("密码至少 6 位"));
          return;
        }
        callback();
      },
      trigger: "blur"
    }
  ]
};

async function onSearch() {
  loading.value = true;
  try {
    const res = await getAccounts({
      page: 1,
      pageSize: 100,
      userId: filters.userId.trim() || undefined,
      providerId: filters.providerId.trim() || undefined
    });
    dataList.value = res.items;
  } catch (error: any) {
    message(error?.response?.data?.message ?? error?.message ?? "加载失败", {
      type: "error"
    });
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  formModel.userId = "";
  formModel.providerId = "";
  formModel.accountId = "";
  formModel.password = "";
  formModel.scope = "";
  editingId.value = null;
  formRef.value?.clearValidate();
}

function openCreateDialog() {
  resetForm();
  dialogTitle.value = "添加账户";
  dialogVisible.value = true;
}

function openEditDialog(row: AccountItem) {
  resetForm();
  editingId.value = row.id;
  dialogTitle.value = "编辑账户";
  formModel.userId = row.userId;
  formModel.providerId = row.providerId;
  formModel.accountId = row.accountId;
  formModel.scope = row.scope ?? "";
  dialogVisible.value = true;
}

function buildPayload(): AccountForm {
  return {
    userId: formModel.userId.trim(),
    providerId: formModel.providerId.trim(),
    accountId: formModel.accountId.trim(),
    scope: formModel.scope?.trim() || undefined,
    password: formModel.password?.trim() || undefined
  };
}

async function submitForm() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    const payload = buildPayload();
    if (editingId.value) {
      await updateAccount(editingId.value, { scope: payload.scope });
      message("更新成功", { type: "success" });
    } else {
      await createAccount(payload);
      message("创建成功", { type: "success" });
    }
    dialogVisible.value = false;
    await onSearch();
  } catch (error: any) {
    message(
      error?.response?.data?.message ?? error?.message ?? "操作失败，请稍后重试",
      { type: "error" }
    );
  } finally {
    submitting.value = false;
  }
}

async function handleDelete(row: AccountItem) {
  try {
    await ElMessageBox.confirm(
      `确定删除账户「${row.accountId}」吗？`,
      "提示",
      { type: "warning", confirmButtonText: "删除", cancelButtonText: "取消" }
    );
    await deleteAccount(row.id);
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

onMounted(onSearch);
</script>

<template>
  <div class="main">
    <el-form :inline="true" class="search-form bg-bg_color w-full pl-8 pt-[12px] overflow-auto">
      <el-form-item label="用户 ID">
        <el-input
          v-model="filters.userId"
          clearable
          placeholder="精确匹配"
          class="w-[220px]!"
          @keyup.enter="onSearch"
        />
      </el-form-item>
      <el-form-item label="Provider ID">
        <el-input
          v-model="filters.providerId"
          clearable
          placeholder="精确匹配"
          class="w-[220px]!"
          @keyup.enter="onSearch"
        />
      </el-form-item>
      <el-form-item label="账户 ID">
        <el-input
          v-model="filters.accountId"
          clearable
          placeholder="模糊搜索"
          class="w-[220px]!"
          @keyup.enter="onSearch"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="loading" @click="onSearch">查询</el-button>
      </el-form-item>
    </el-form>

    <PureTableBar title="账户管理" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button type="primary" @click="openCreateDialog">添加账户</el-button>
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
            <el-button link type="primary" @click="openEditDialog(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
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
      <el-form ref="formRef" :model="formModel" :rules="formRules" label-width="100px">
        <el-form-item label="用户 ID" prop="userId">
          <el-input
            v-model="formModel.userId"
            :disabled="!!editingId"
            placeholder="26 位 ULID"
          />
        </el-form-item>
        <el-form-item label="Provider ID" prop="providerId">
          <el-input v-model="formModel.providerId" :disabled="!!editingId" placeholder="如 credential" />
        </el-form-item>
        <el-form-item label="账户 ID" prop="accountId">
          <el-input v-model="formModel.accountId" :disabled="!!editingId" placeholder="登录标识" />
        </el-form-item>
        <el-form-item v-if="!editingId" label="密码" prop="password">
          <el-input v-model="formModel.password" type="password" show-password />
        </el-form-item>
        <el-form-item label="Scope">
          <el-input v-model="formModel.scope" placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">确定</el-button>
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
