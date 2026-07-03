<script setup lang="ts">
import { PureTableBar } from "@/components/RePureTableBar";
import {
  createDevice,
  deleteDevice,
  getDevices,
  updateDevice,
  type DeviceForm,
  type DeviceItem
} from "@/api/identity-device";
import { message } from "@/utils/message";
import type { FormInstance, FormRules } from "element-plus";
import { ElMessageBox } from "element-plus";
import { onMounted, reactive, ref } from "vue";

defineOptions({
  name: "IdentityDeviceIndex"
});

type DeviceType = "desktop" | "mobile" | "tablet" | "unknown";

const deviceTypeOptions: { label: string; value: DeviceType }[] = [
  { label: "桌面", value: "desktop" },
  { label: "手机", value: "mobile" },
  { label: "平板", value: "tablet" },
  { label: "未知", value: "unknown" }
];

const deviceTypeLabelMap = Object.fromEntries(
  deviceTypeOptions.map(item => [item.value, item.label])
) as Record<DeviceType, string>;

const tableRef = ref();
const loading = ref(false);
const dataList = ref<DeviceItem[]>([]);

const filters = reactive({
  userId: "",
  deviceType: "" as DeviceType | ""
});

const columns: TableColumnList = [
  { label: "用户 ID", prop: "userId", minWidth: 200 },
  {
    label: "设备名称",
    prop: "deviceName",
    minWidth: 140,
    formatter: ({ deviceName }) => deviceName ?? "-"
  },
  {
    label: "设备类型",
    prop: "deviceType",
    minWidth: 100,
    formatter: ({ deviceType }) =>
      deviceTypeLabelMap[deviceType as DeviceType] ?? deviceType
  },
  { label: "操作系统", prop: "os", minWidth: 120, formatter: ({ os }) => os ?? "-" },
  {
    label: "浏览器",
    prop: "browser",
    minWidth: 120,
    formatter: ({ browser }) => browser ?? "-"
  },
  {
    label: "可信",
    prop: "trusted",
    minWidth: 80,
    formatter: ({ trusted }) => (trusted ? "是" : "否")
  },
  { label: "最后活跃", prop: "lastActiveAt", minWidth: 170 },
  { label: "操作", fixed: "right", width: 160, slot: "operation" }
];

const dialogVisible = ref(false);
const dialogTitle = ref("添加设备");
const submitting = ref(false);
const editingId = ref<string | null>(null);
const formRef = ref<FormInstance>();

const formModel = reactive<DeviceForm & { deviceType: DeviceType }>({
  userId: "",
  deviceName: "",
  deviceType: "unknown",
  os: "",
  browser: "",
  trusted: false
});

const formRules: FormRules = {
  userId: [{ required: true, message: "请输入用户 ID", trigger: "blur" }],
  deviceType: [{ required: true, message: "请选择设备类型", trigger: "change" }]
};

async function onSearch() {
  loading.value = true;
  try {
    const res = await getDevices({
      page: 1,
      pageSize: 100,
      userId: filters.userId.trim() || undefined
    });
    dataList.value = res.items.filter(row => {
      if (!filters.deviceType) return true;
      return row.deviceType === filters.deviceType;
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
  formModel.deviceName = "";
  formModel.deviceType = "unknown";
  formModel.os = "";
  formModel.browser = "";
  formModel.trusted = false;
  editingId.value = null;
  formRef.value?.clearValidate();
}

function openCreateDialog() {
  resetForm();
  dialogTitle.value = "添加设备";
  dialogVisible.value = true;
}

function openEditDialog(row: DeviceItem) {
  resetForm();
  editingId.value = row.id;
  dialogTitle.value = "编辑设备";
  formModel.userId = row.userId;
  formModel.deviceName = row.deviceName ?? "";
  formModel.deviceType = (row.deviceType as DeviceType) || "unknown";
  formModel.os = row.os ?? "";
  formModel.browser = row.browser ?? "";
  formModel.trusted = row.trusted;
  dialogVisible.value = true;
}

function buildPayload(): DeviceForm {
  return {
    userId: formModel.userId.trim(),
    deviceName: formModel.deviceName?.trim() || undefined,
    deviceType: formModel.deviceType,
    os: formModel.os?.trim() || undefined,
    browser: formModel.browser?.trim() || undefined,
    trusted: formModel.trusted
  };
}

async function submitForm() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    const payload = buildPayload();
    if (editingId.value) {
      await updateDevice(editingId.value, payload);
      message("更新成功", { type: "success" });
    } else {
      await createDevice(payload);
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

async function handleDelete(row: DeviceItem) {
  try {
    await ElMessageBox.confirm(
      `确定删除设备「${row.deviceName ?? row.id}」吗？`,
      "提示",
      { type: "warning", confirmButtonText: "删除", cancelButtonText: "取消" }
    );
    await deleteDevice(row.id);
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
      <el-form-item label="设备类型">
        <el-select v-model="filters.deviceType" clearable placeholder="全部" class="w-[160px]!">
          <el-option
            v-for="item in deviceTypeOptions"
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

    <PureTableBar title="设备管理" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button type="primary" @click="openCreateDialog">添加设备</el-button>
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
        <el-form-item label="用户 ID" prop="userId">
          <el-input v-model="formModel.userId" placeholder="26 位 ULID" />
        </el-form-item>
        <el-form-item label="设备名称">
          <el-input v-model="formModel.deviceName" placeholder="可选" />
        </el-form-item>
        <el-form-item label="设备类型" prop="deviceType">
          <el-select v-model="formModel.deviceType" placeholder="请选择" class="w-full!">
            <el-option
              v-for="item in deviceTypeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="操作系统">
          <el-input v-model="formModel.os" placeholder="如 Windows / iOS" />
        </el-form-item>
        <el-form-item label="浏览器">
          <el-input v-model="formModel.browser" placeholder="如 Chrome" />
        </el-form-item>
        <el-form-item label="可信设备">
          <el-switch v-model="formModel.trusted" />
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
