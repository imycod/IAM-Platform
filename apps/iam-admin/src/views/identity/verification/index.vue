<script setup lang="ts">
import { PureTableBar } from "@/components/RePureTableBar";
import {
  createVerification,
  deleteVerification,
  getVerifications,
  updateVerification,
  type VerificationForm,
  type VerificationItem
} from "@/api/identity-verification";
import { message } from "@/utils/message";
import type { FormInstance, FormRules } from "element-plus";
import { ElMessageBox } from "element-plus";
import { onMounted, reactive, ref } from "vue";

defineOptions({
  name: "IdentityVerificationIndex"
});

type VerificationType =
  | "email_verify"
  | "phone_otp"
  | "magic_link"
  | "password_reset";

const typeOptions: { label: string; value: VerificationType }[] = [
  { label: "邮箱验证", value: "email_verify" },
  { label: "手机 OTP", value: "phone_otp" },
  { label: "Magic Link", value: "magic_link" },
  { label: "密码重置", value: "password_reset" }
];

const typeLabelMap = Object.fromEntries(
  typeOptions.map(item => [item.value, item.label])
) as Record<VerificationType, string>;

const tableRef = ref();
const loading = ref(false);
const dataList = ref<VerificationItem[]>([]);

const filters = reactive({
  identifier: "",
  type: "" as VerificationType | ""
});

const columns: TableColumnList = [
  { label: "标识", prop: "identifier", minWidth: 180 },
  {
    label: "验证码",
    minWidth: 140,
    formatter: ({ value }) => (value ? `${value.slice(0, 8)}...` : "-")
  },
  {
    label: "类型",
    prop: "type",
    minWidth: 120,
    formatter: ({ type }) => typeLabelMap[type as VerificationType] ?? type
  },
  { label: "过期时间", prop: "expiresAt", minWidth: 170 },
  {
    label: "已消费",
    minWidth: 100,
    formatter: ({ consumedAt }) => (consumedAt ? "是" : "否")
  },
  { label: "创建时间", prop: "createdAt", minWidth: 170 },
  { label: "操作", fixed: "right", width: 160, slot: "operation" }
];

const dialogVisible = ref(false);
const dialogTitle = ref("添加验证码");
const submitting = ref(false);
const editingId = ref<string | null>(null);
const formRef = ref<FormInstance>();

const formModel = reactive<VerificationForm & { type: VerificationType }>({
  identifier: "",
  value: "",
  type: "email_verify",
  ttlSeconds: 300
});

const formRules: FormRules = {
  identifier: [{ required: true, message: "请输入标识", trigger: "blur" }],
  value: [{ required: true, message: "请输入验证码", trigger: "blur" }],
  type: [{ required: true, message: "请选择类型", trigger: "change" }],
  ttlSeconds: [
    {
      validator: (_rule, value, callback) => {
        if (editingId.value) {
          callback();
          return;
        }
        if (value == null || value <= 0) {
          callback(new Error("TTL 必须大于 0"));
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
    const res = await getVerifications({
      page: 1,
      pageSize: 100,
      identifier: filters.identifier.trim() || undefined,
      type: filters.type || undefined
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
  formModel.identifier = "";
  formModel.value = "";
  formModel.type = "email_verify";
  formModel.ttlSeconds = 300;
  editingId.value = null;
  formRef.value?.clearValidate();
}

function openCreateDialog() {
  resetForm();
  dialogTitle.value = "添加验证码";
  dialogVisible.value = true;
}

function openEditDialog(row: VerificationItem) {
  resetForm();
  editingId.value = row.id;
  dialogTitle.value = "编辑验证码";
  formModel.identifier = row.identifier;
  formModel.value = row.value;
  formModel.type = (row.type as VerificationType) || "email_verify";
  dialogVisible.value = true;
}

function buildPayload(): VerificationForm {
  return {
    identifier: formModel.identifier.trim(),
    value: formModel.value.trim(),
    type: formModel.type,
    ttlSeconds: formModel.ttlSeconds
  };
}

async function submitForm() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    const payload = buildPayload();
    if (editingId.value) {
      const { ttlSeconds: _ttl, ...updatePayload } = payload;
      await updateVerification(editingId.value, updatePayload);
      message("更新成功", { type: "success" });
    } else {
      await createVerification(payload);
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

async function handleDelete(row: VerificationItem) {
  try {
    await ElMessageBox.confirm(
      `确定删除验证码「${row.identifier}」吗？`,
      "提示",
      { type: "warning", confirmButtonText: "删除", cancelButtonText: "取消" }
    );
    await deleteVerification(row.id);
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
      <el-form-item label="标识">
        <el-input
          v-model="filters.identifier"
          clearable
          placeholder="邮箱 / 手机号"
          class="w-[220px]!"
          @keyup.enter="onSearch"
        />
      </el-form-item>
      <el-form-item label="类型">
        <el-select v-model="filters.type" clearable placeholder="全部" class="w-[160px]!">
          <el-option
            v-for="item in typeOptions"
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

    <PureTableBar title="验证码管理" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button type="primary" @click="openCreateDialog">添加验证码</el-button>
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
        <el-form-item label="标识" prop="identifier">
          <el-input v-model="formModel.identifier" placeholder="邮箱 / 手机号" />
        </el-form-item>
        <el-form-item label="验证码" prop="value">
          <el-input v-model="formModel.value" placeholder="验证码内容" />
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-select v-model="formModel.type" placeholder="请选择" class="w-full!">
            <el-option
              v-for="item in typeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="!editingId" label="TTL（秒）" prop="ttlSeconds">
          <el-input-number v-model="formModel.ttlSeconds" :min="1" :max="86400" class="w-full!" />
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
