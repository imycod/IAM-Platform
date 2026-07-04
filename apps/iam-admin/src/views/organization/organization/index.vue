<script setup lang="ts">
import { PureTableBar } from "@/components/RePureTableBar";
import {
  createOrganization,
  deleteOrganization,
  getOrganizations,
  updateOrganization,
  type OrganizationForm,
  type OrganizationItem
} from "@/api/organization";
import { message } from "@/utils/message";
import type { FormInstance, FormRules } from "element-plus";
import { ElMessageBox } from "element-plus";
import { computed, onMounted, reactive, ref } from "vue";

defineOptions({ name: "OrganizationIndex" });

const loading = ref(false);
const dataList = ref<OrganizationItem[]>([]);
const filters = reactive({ name: "", code: "" });

const filteredList = computed(() =>
  dataList.value.filter(row => {
    const nameOk =
      !filters.name ||
      row.name.toLowerCase().includes(filters.name.trim().toLowerCase());
    const codeOk =
      !filters.code ||
      row.code.toLowerCase().includes(filters.code.trim().toLowerCase());
    return nameOk && codeOk;
  })
);

const columns: TableColumnList = [
  { label: "组织名称", prop: "name", minWidth: 140 },
  { label: "组织编码", prop: "code", minWidth: 140 },
  { label: "类型", prop: "type", minWidth: 100 },
  { label: "状态", prop: "status", minWidth: 100 },
  { label: "排序", prop: "sort", minWidth: 80 },
  { label: "操作", fixed: "right", width: 160, slot: "operation" }
];

const dialogVisible = ref(false);
const dialogTitle = ref("添加组织");
const submitting = ref(false);
const editingId = ref<string | null>(null);
const formRef = ref<FormInstance>();
const formModel = reactive<OrganizationForm>({
  name: "",
  code: "",
  type: "company",
  status: "active",
  sort: 0
});

const formRules: FormRules = {
  name: [{ required: true, message: "请输入组织名称", trigger: "blur" }],
  code: [{ required: true, message: "请输入组织编码", trigger: "blur" }]
};

async function onSearch() {
  loading.value = true;
  try {
    dataList.value = await getOrganizations();
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  formModel.name = "";
  formModel.code = "";
  formModel.type = "company";
  formModel.status = "active";
  formModel.sort = 0;
  editingId.value = null;
  formRef.value?.clearValidate();
}

function openCreateDialog() {
  resetForm();
  dialogTitle.value = "添加组织";
  dialogVisible.value = true;
}

function openEditDialog(row: OrganizationItem) {
  resetForm();
  editingId.value = row.id;
  dialogTitle.value = "编辑组织";
  formModel.name = row.name;
  formModel.code = row.code;
  formModel.type = row.type;
  formModel.status = row.status;
  formModel.sort = row.sort;
  dialogVisible.value = true;
}

async function submitForm() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  submitting.value = true;
  try {
    const payload = {
      name: formModel.name.trim(),
      code: formModel.code.trim(),
      type: formModel.type,
      status: formModel.status,
      sort: formModel.sort ?? 0
    };
    if (editingId.value) {
      await updateOrganization(editingId.value, payload);
      message("更新成功", { type: "success" });
    } else {
      await createOrganization(payload);
      message("创建成功", { type: "success" });
    }
    dialogVisible.value = false;
    await onSearch();
  } catch (error: any) {
    message(error?.response?.data?.message ?? error?.message ?? "操作失败", {
      type: "error"
    });
  } finally {
    submitting.value = false;
  }
}

async function handleDelete(row: OrganizationItem) {
  try {
    await ElMessageBox.confirm(`确定删除组织「${row.name}」吗？`, "提示", {
      type: "warning"
    });
    await deleteOrganization(row.id);
    message("删除成功", { type: "success" });
    await onSearch();
  } catch (error: any) {
    if (error === "cancel" || error === "close") return;
    message(error?.response?.data?.message ?? error?.message ?? "删除失败", {
      type: "error"
    });
  }
}

onMounted(onSearch);
</script>

<template>
  <div class="main">
    <el-form :inline="true" class="search-form bg-bg_color w-full pl-8 pt-[12px] overflow-auto">
      <el-form-item label="组织名称">
        <el-input v-model="filters.name" clearable placeholder="模糊搜索" class="w-[200px]!" />
      </el-form-item>
      <el-form-item label="组织编码">
        <el-input v-model="filters.code" clearable placeholder="模糊搜索" class="w-[200px]!" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="loading" @click="onSearch">查询</el-button>
      </el-form-item>
    </el-form>

    <PureTableBar title="组织管理" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button type="primary" @click="openCreateDialog">添加组织</el-button>
      </template>
      <template #default="{ size, dynamicColumns }">
        <pure-table
          adaptive
          align-whole="center"
          row-key="id"
          showOverflowTooltip
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

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="520px" destroy-on-close @closed="resetForm">
      <el-form ref="formRef" :model="formModel" :rules="formRules" label-width="90px">
        <el-form-item label="组织名称" prop="name">
          <el-input v-model="formModel.name" maxlength="200" />
        </el-form-item>
        <el-form-item label="组织编码" prop="code">
          <el-input v-model="formModel.code" maxlength="50" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="formModel.type" class="w-full!">
            <el-option label="公司" value="company" />
            <el-option label="子公司" value="subsidiary" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="formModel.status" class="w-full!">
            <el-option label="启用" value="active" />
            <el-option label="停用" value="inactive" />
          </el-select>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="formModel.sort" :min="0" class="w-full!" />
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
