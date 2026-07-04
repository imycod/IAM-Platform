<script setup lang="ts">
import { PureTableBar } from "@/components/RePureTableBar";
import {
  createPosition,
  deletePosition,
  getOrganizations,
  getPositions,
  updatePosition,
  type OrganizationItem,
  type PositionForm,
  type PositionItem
} from "@/api/organization";
import { message } from "@/utils/message";
import type { FormInstance, FormRules } from "element-plus";
import { ElMessageBox } from "element-plus";
import { onMounted, reactive, ref, watch } from "vue";

defineOptions({ name: "OrganizationPositionIndex" });

const loading = ref(false);
const dataList = ref<PositionItem[]>([]);
const orgList = ref<OrganizationItem[]>([]);
const filterOrgId = ref("");

const columns: TableColumnList = [
  { label: "岗位名称", prop: "name", minWidth: 140 },
  { label: "岗位编码", prop: "code", minWidth: 140 },
  { label: "职级", prop: "level", minWidth: 80 },
  { label: "组织 ID", prop: "organizationId", minWidth: 200 },
  { label: "操作", fixed: "right", width: 160, slot: "operation" }
];

const dialogVisible = ref(false);
const dialogTitle = ref("添加岗位");
const submitting = ref(false);
const editingId = ref<string | null>(null);
const formRef = ref<FormInstance>();
const formModel = reactive<PositionForm>({
  organizationId: "",
  name: "",
  code: "",
  level: 0
});

const formRules: FormRules = {
  organizationId: [{ required: true, message: "请选择组织", trigger: "change" }],
  name: [{ required: true, message: "请输入岗位名称", trigger: "blur" }],
  code: [{ required: true, message: "请输入岗位编码", trigger: "blur" }]
};

async function loadOrgs() {
  orgList.value = await getOrganizations();
  if (!filterOrgId.value && orgList.value.length) {
    filterOrgId.value = orgList.value[0].id;
  }
}

async function onSearch() {
  loading.value = true;
  try {
    dataList.value = await getPositions(
      filterOrgId.value ? { organizationId: filterOrgId.value } : undefined
    );
  } finally {
    loading.value = false;
  }
}

watch(filterOrgId, onSearch);

function resetForm() {
  formModel.organizationId = filterOrgId.value || "";
  formModel.name = "";
  formModel.code = "";
  formModel.level = 0;
  editingId.value = null;
  formRef.value?.clearValidate();
}

function openCreateDialog() {
  resetForm();
  dialogTitle.value = "添加岗位";
  dialogVisible.value = true;
}

function openEditDialog(row: PositionItem) {
  resetForm();
  editingId.value = row.id;
  dialogTitle.value = "编辑岗位";
  formModel.organizationId = row.organizationId;
  formModel.name = row.name;
  formModel.code = row.code;
  formModel.level = row.level;
  dialogVisible.value = true;
}

async function submitForm() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  submitting.value = true;
  try {
    const payload = {
      organizationId: formModel.organizationId,
      name: formModel.name.trim(),
      code: formModel.code.trim(),
      level: formModel.level ?? 0
    };
    if (editingId.value) {
      await updatePosition(editingId.value, {
        name: payload.name,
        code: payload.code,
        level: payload.level
      });
      message("更新成功", { type: "success" });
    } else {
      await createPosition(payload);
      message("创建成功", { type: "success" });
    }
    dialogVisible.value = false;
    await onSearch();
  } catch (error: any) {
    message(error?.response?.data?.message ?? error?.message ?? "操作失败", { type: "error" });
  } finally {
    submitting.value = false;
  }
}

async function handleDelete(row: PositionItem) {
  try {
    await ElMessageBox.confirm(`确定删除岗位「${row.name}」吗？`, "提示", { type: "warning" });
    await deletePosition(row.id);
    message("删除成功", { type: "success" });
    await onSearch();
  } catch (error: any) {
    if (error === "cancel" || error === "close") return;
    message(error?.response?.data?.message ?? error?.message ?? "删除失败", { type: "error" });
  }
}

onMounted(async () => {
  await loadOrgs();
  await onSearch();
});
</script>

<template>
  <div class="main">
    <el-form :inline="true" class="search-form bg-bg_color w-full pl-8 pt-[12px] overflow-auto">
      <el-form-item label="组织">
        <el-select v-model="filterOrgId" clearable class="w-[240px]!">
          <el-option v-for="item in orgList" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="loading" @click="onSearch">查询</el-button>
      </el-form-item>
    </el-form>

    <PureTableBar title="岗位管理" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button type="primary" @click="openCreateDialog">添加岗位</el-button>
      </template>
      <template #default="{ size, dynamicColumns }">
        <pure-table adaptive align-whole="center" row-key="id" showOverflowTooltip :loading="loading" :size="size" :data="dataList" :columns="dynamicColumns">
          <template #operation="{ row }">
            <el-button link type="primary" @click="openEditDialog(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </pure-table>
      </template>
    </PureTableBar>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="520px" destroy-on-close @closed="resetForm">
      <el-form ref="formRef" :model="formModel" :rules="formRules" label-width="90px">
        <el-form-item label="所属组织" prop="organizationId">
          <el-select v-model="formModel.organizationId" class="w-full!" :disabled="!!editingId">
            <el-option v-for="item in orgList" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="岗位名称" prop="name">
          <el-input v-model="formModel.name" />
        </el-form-item>
        <el-form-item label="岗位编码" prop="code">
          <el-input v-model="formModel.code" />
        </el-form-item>
        <el-form-item label="职级">
          <el-input-number v-model="formModel.level" :min="0" class="w-full!" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.main { margin: 16px; }
</style>
