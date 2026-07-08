<script setup lang="ts">
import { PureTableBar } from "@/components/RePureTableBar";
import {
  createIdentityUser,
  deleteIdentityUser,
  getIdentityUsers,
  updateIdentityUser,
  type IdentityUserForm,
  type IdentityUserItem
} from "@/api/identity-user";
import { message } from "@/utils/message";
import type { FormInstance, FormRules } from "element-plus";
import { ElMessageBox } from "element-plus";
import { computed, onMounted, reactive, ref } from "vue";

defineOptions({
  name: "IdentityUserIndex"
});

type UserStatus = "active" | "disabled" | "locked" | "pending";

const statusOptions: { label: string; value: UserStatus }[] = [
  { label: "正常", value: "active" },
  { label: "禁用", value: "disabled" },
  { label: "锁定", value: "locked" },
  { label: "待激活", value: "pending" }
];

const statusLabelMap = Object.fromEntries(
  statusOptions.map(item => [item.value, item.label])
) as Record<UserStatus, string>;

const statusTagTypeMap: Record<
  UserStatus,
  "success" | "warning" | "info" | "danger"
> = {
  active: "success",
  pending: "warning",
  disabled: "info",
  locked: "danger"
};

function resolveStatusTagType(status?: string) {
  return statusTagTypeMap[status as UserStatus] ?? "info";
}

const tableRef = ref();
const loading = ref(false);
const dataList = ref<IdentityUserItem[]>([]);

const filters = reactive({
  email: "",
  phone: "",
  name: "",
  status: "" as UserStatus | ""
});

const filteredList = computed(() => {
  return dataList.value.filter(row => {
    const emailOk =
      !filters.email ||
      (row.email ?? "").toLowerCase().includes(filters.email.trim().toLowerCase());
    const phoneOk =
      !filters.phone ||
      (row.phone ?? "").includes(filters.phone.trim());
    const nameOk =
      !filters.name ||
      (row.name ?? "").toLowerCase().includes(filters.name.trim().toLowerCase());
    return emailOk && phoneOk && nameOk;
  });
});

const columns: TableColumnList = [
  { label: "邮箱", prop: "email", minWidth: 180, formatter: ({ email }) => email ?? "-" },
  { label: "手机", prop: "phone", minWidth: 140, formatter: ({ phone }) => phone ?? "-" },
  { label: "姓名", prop: "name", minWidth: 120, formatter: ({ name }) => name ?? "-" },
  {
    label: "状态",
    prop: "status",
    minWidth: 100,
    slot: "status"
  },
  { label: "最后登录", prop: "lastLoginAt", minWidth: 170 },
  { label: "创建时间", prop: "createdAt", minWidth: 170 },
  { label: "操作", fixed: "right", width: 160, slot: "operation" }
];

const dialogVisible = ref(false);
const dialogTitle = ref("添加用户");
const submitting = ref(false);
const editingId = ref<string | null>(null);
const formRef = ref<FormInstance>();

const formModel = reactive<IdentityUserForm & { status: UserStatus }>({
  email: "",
  phone: "",
  name: "",
  status: "pending"
});

const formRules: FormRules = {
  status: [{ required: true, message: "请选择状态", trigger: "change" }],
  email: [
    {
      validator: (_rule, _value, callback) => {
        if (!formModel.email?.trim() && !formModel.phone?.trim()) {
          callback(new Error("邮箱和手机号至少填写一项"));
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
    const res = await getIdentityUsers({
      page: 1,
      pageSize: 100,
      status: filters.status || undefined
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
  formModel.email = "";
  formModel.phone = "";
  formModel.name = "";
  formModel.status = "pending";
  editingId.value = null;
  formRef.value?.clearValidate();
}

function openCreateDialog() {
  resetForm();
  dialogTitle.value = "添加用户";
  dialogVisible.value = true;
}

function openEditDialog(row: IdentityUserItem) {
  resetForm();
  editingId.value = row.id;
  dialogTitle.value = "编辑用户";
  formModel.email = row.email ?? "";
  formModel.phone = row.phone ?? "";
  formModel.name = row.name ?? "";
  formModel.status = (row.status as UserStatus) || "active";
  dialogVisible.value = true;
}

function buildPayload(): IdentityUserForm {
  return {
    email: formModel.email?.trim() || undefined,
    phone: formModel.phone?.trim() || undefined,
    name: formModel.name?.trim() || undefined,
    status: formModel.status
  };
}

async function submitForm() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    const payload = buildPayload();
    if (editingId.value) {
      await updateIdentityUser(editingId.value, payload);
      message("更新成功", { type: "success" });
    } else {
      await createIdentityUser(payload);
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

async function handleDelete(row: IdentityUserItem) {
  const label = row.email ?? row.phone ?? row.name ?? row.id;
  try {
    await ElMessageBox.confirm(
      `确定删除用户「${label}」吗？`,
      "提示",
      { type: "warning", confirmButtonText: "删除", cancelButtonText: "取消" }
    );
    await deleteIdentityUser(row.id);
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
      <el-form-item label="邮箱">
        <el-input
          v-model="filters.email"
          clearable
          placeholder="模糊搜索"
          class="w-[200px]!"
          @keyup.enter="onSearch"
        />
      </el-form-item>
      <el-form-item label="手机">
        <el-input
          v-model="filters.phone"
          clearable
          placeholder="模糊搜索"
          class="w-[160px]!"
          @keyup.enter="onSearch"
        />
      </el-form-item>
      <el-form-item label="姓名">
        <el-input
          v-model="filters.name"
          clearable
          placeholder="模糊搜索"
          class="w-[160px]!"
          @keyup.enter="onSearch"
        />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="filters.status" clearable placeholder="全部" class="w-[120px]!">
          <el-option
            v-for="item in statusOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="loading" @click="onSearch">查询</el-button>
      </el-form-item>
    </el-form>

    <PureTableBar title="用户管理" :columns="columns" @refresh="onSearch">
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
          <template #status="{ row }">
            <el-tag
              :type="resolveStatusTagType(row.status)"
              size="small"
              effect="light"
            >
              {{ statusLabelMap[row.status as UserStatus] ?? row.status ?? "-" }}
            </el-tag>
          </template>
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
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="formModel.email" placeholder="可选" />
        </el-form-item>
        <el-form-item label="手机">
          <el-input v-model="formModel.phone" placeholder="可选" />
        </el-form-item>
        <el-form-item label="姓名">
          <el-input v-model="formModel.name" placeholder="可选" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="formModel.status" placeholder="请选择" class="w-full!">
            <el-option
              v-for="item in statusOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
          <p v-if="!editingId" class="form-hint">
            新建用户默认为「待激活」；在「身份认证 → 凭证账户」开通邮箱密码登录后自动变为「正常」。
          </p>
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
.form-hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
}
</style>
