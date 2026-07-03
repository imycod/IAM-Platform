<script setup lang="ts">
import { PureTableBar } from "@/components/RePureTableBar";
import {
  createLoginHistory,
  deleteLoginHistory,
  getLoginHistories,
  updateLoginHistory,
  type LoginHistoryForm,
  type LoginHistoryItem
} from "@/api/identity-login-history";
import { message } from "@/utils/message";
import type { FormInstance, FormRules } from "element-plus";
import { ElMessageBox } from "element-plus";
import { onMounted, reactive, ref } from "vue";

defineOptions({
  name: "IdentityLoginHistoryIndex"
});

const tableRef = ref();
const loading = ref(false);
const dataList = ref<LoginHistoryItem[]>([]);

const filters = reactive({
  userId: "",
  identifier: "",
  success: "" as boolean | ""
});

const successFilterOptions = [
  { label: "成功", value: true },
  { label: "失败", value: false }
];

const columns: TableColumnList = [
  {
    label: "用户 ID",
    prop: "userId",
    minWidth: 200,
    formatter: ({ userId }) => userId ?? "-"
  },
  {
    label: "标识",
    prop: "identifier",
    minWidth: 160,
    formatter: ({ identifier }) => identifier ?? "-"
  },
  { label: "IP", prop: "ip", minWidth: 130, formatter: ({ ip }) => ip ?? "-" },
  {
    label: "结果",
    prop: "success",
    minWidth: 80,
    formatter: ({ success }) => (success ? "成功" : "失败")
  },
  {
    label: "登录类型",
    prop: "loginType",
    minWidth: 120,
    formatter: ({ loginType }) => loginType ?? "-"
  },
  {
    label: "失败原因",
    prop: "failReason",
    minWidth: 160,
    formatter: ({ failReason }) => failReason ?? "-"
  },
  { label: "时间", prop: "createdAt", minWidth: 170 },
  { label: "操作", fixed: "right", width: 160, slot: "operation" }
];

const dialogVisible = ref(false);
const dialogTitle = ref("添加登录记录");
const submitting = ref(false);
const editingId = ref<string | null>(null);
const formRef = ref<FormInstance>();

const formModel = reactive<LoginHistoryForm>({
  userId: "",
  identifier: "",
  ip: "",
  success: true,
  loginType: "",
  failReason: ""
});

const formRules: FormRules = {
  success: [{ required: true, message: "请选择登录结果", trigger: "change" }]
};

async function onSearch() {
  loading.value = true;
  try {
    const res = await getLoginHistories({
      page: 1,
      pageSize: 100,
      userId: filters.userId.trim() || undefined,
      success: filters.success === "" ? undefined : filters.success
    });
    dataList.value = res.items.filter(row => {
      if (!filters.identifier.trim()) return true;
      return (row.identifier ?? "")
        .toLowerCase()
        .includes(filters.identifier.trim().toLowerCase());
    });
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
  formModel.identifier = "";
  formModel.ip = "";
  formModel.success = true;
  formModel.loginType = "";
  formModel.failReason = "";
  editingId.value = null;
  formRef.value?.clearValidate();
}

function openCreateDialog() {
  resetForm();
  dialogTitle.value = "添加登录记录";
  dialogVisible.value = true;
}

function openEditDialog(row: LoginHistoryItem) {
  resetForm();
  editingId.value = row.id;
  dialogTitle.value = "编辑登录记录";
  formModel.userId = row.userId ?? "";
  formModel.identifier = row.identifier ?? "";
  formModel.ip = row.ip ?? "";
  formModel.success = row.success;
  formModel.loginType = row.loginType ?? "";
  formModel.failReason = row.failReason ?? "";
  dialogVisible.value = true;
}

function buildPayload(): LoginHistoryForm {
  return {
    userId: formModel.userId?.trim() || undefined,
    identifier: formModel.identifier?.trim() || undefined,
    ip: formModel.ip?.trim() || undefined,
    success: formModel.success,
    loginType: formModel.loginType?.trim() || undefined,
    failReason: formModel.failReason?.trim() || undefined
  };
}

async function submitForm() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    const payload = buildPayload();
    if (editingId.value) {
      await updateLoginHistory(editingId.value, payload);
      message("更新成功", { type: "success" });
    } else {
      await createLoginHistory(payload);
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

async function handleDelete(row: LoginHistoryItem) {
  try {
    await ElMessageBox.confirm(
      `确定删除该登录记录吗？`,
      "提示",
      { type: "warning", confirmButtonText: "删除", cancelButtonText: "取消" }
    );
    await deleteLoginHistory(row.id);
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
      <el-form-item label="标识">
        <el-input
          v-model="filters.identifier"
          clearable
          placeholder="模糊搜索"
          class="w-[220px]!"
          @keyup.enter="onSearch"
        />
      </el-form-item>
      <el-form-item label="结果">
        <el-select v-model="filters.success" clearable placeholder="全部" class="w-[120px]!">
          <el-option
            v-for="item in successFilterOptions"
            :key="String(item.value)"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="loading" @click="onSearch">查询</el-button>
      </el-form-item>
    </el-form>

    <PureTableBar title="登录历史" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button type="primary" @click="openCreateDialog">添加记录</el-button>
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
        <el-form-item label="用户 ID">
          <el-input v-model="formModel.userId" placeholder="可选" />
        </el-form-item>
        <el-form-item label="标识">
          <el-input v-model="formModel.identifier" placeholder="邮箱 / 手机号等" />
        </el-form-item>
        <el-form-item label="IP">
          <el-input v-model="formModel.ip" placeholder="如 192.168.1.1" />
        </el-form-item>
        <el-form-item label="结果" prop="success">
          <el-radio-group v-model="formModel.success">
            <el-radio :value="true">成功</el-radio>
            <el-radio :value="false">失败</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="登录类型">
          <el-input v-model="formModel.loginType" placeholder="如 password / oauth" />
        </el-form-item>
        <el-form-item label="失败原因">
          <el-input
            v-model="formModel.failReason"
            type="textarea"
            :rows="3"
            placeholder="登录失败时填写"
          />
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
