<script setup lang="ts">
import { PureTableBar } from "@/components/RePureTableBar";
import {
  createDepartment,
  deleteDepartment,
  getDepartments,
  getOrganizations,
  updateDepartment,
  type DepartmentForm,
  type DepartmentItem,
  type OrganizationItem
} from "@/api/organization";
import { message } from "@/utils/message";
import type { FormInstance, FormRules } from "element-plus";
import { ElMessageBox } from "element-plus";
import { onMounted, reactive, ref, watch } from "vue";

defineOptions({ name: "OrganizationDepartmentIndex" });

const loading = ref(false);
const dataList = ref<DepartmentItem[]>([]);
const orgList = ref<OrganizationItem[]>([]);
const filterOrgId = ref("");

const columns: TableColumnList = [
  { label: "部门名称", prop: "name", minWidth: 140 },
  { label: "部门编码", prop: "code", minWidth: 120 },
  { label: "组织 ID", prop: "organizationId", minWidth: 200 },
  { label: "上级部门", prop: "parentId", minWidth: 200, formatter: ({ parentId }) => parentId ?? "-" },
  { label: "路径", prop: "path", minWidth: 220, formatter: ({ path }) => path ?? "-" },
  { label: "排序", prop: "sort", minWidth: 80 },
  { label: "操作", fixed: "right", width: 160, slot: "operation" }
];

const dialogVisible = ref(false);
const dialogTitle = ref("添加部门");
const submitting = ref(false);
const editingId = ref<string | null>(null);
const formRef = ref<FormInstance>();
const formModel = reactive<DepartmentForm>({
  organizationId: "",
  name: "",
  code: "",
  parentId: null,
  sort: 0
});

const formRules: FormRules = {
  organizationId: [{ required: true, message: "请选择组织", trigger: "change" }],
  name: [{ required: true, message: "请输入部门名称", trigger: "blur" }],
  code: [{ required: true, message: "请输入部门编码", trigger: "blur" }]
};

const parentOptions = ref<DepartmentItem[]>([]);

async function loadOrgs() {
  orgList.value = await getOrganizations();
  if (!filterOrgId.value && orgList.value.length) {
    filterOrgId.value = orgList.value[0].id;
  }
}

async function onSearch() {
  loading.value = true;
  try {
    dataList.value = await getDepartments(
      filterOrgId.value ? { organizationId: filterOrgId.value } : undefined
    );
  } finally {
    loading.value = false;
  }
}

watch(filterOrgId, onSearch);

async function loadParentOptions(orgId: string) {
  parentOptions.value = orgId
    ? await getDepartments({ organizationId: orgId })
    : [];
}

function resetForm() {
  formModel.organizationId = filterOrgId.value || "";
  formModel.name = "";
  formModel.code = "";
  formModel.parentId = null;
  formModel.sort = 0;
  editingId.value = null;
  formRef.value?.clearValidate();
}

async function openCreateDialog() {
  resetForm();
  await loadParentOptions(formModel.organizationId);
  dialogTitle.value = "添加部门";
  dialogVisible.value = true;
}

async function openEditDialog(row: DepartmentItem) {
  resetForm();
  editingId.value = row.id;
  dialogTitle.value = "编辑部门";
  formModel.organizationId = row.organizationId;
  formModel.name = row.name;
  formModel.code = row.code;
  formModel.parentId = row.parentId;
  formModel.sort = row.sort;
  await loadParentOptions(row.organizationId);
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
      parentId: formModel.parentId || null,
      sort: formModel.sort ?? 0
    };
    if (editingId.value) {
      await updateDepartment(editingId.value, {
        name: payload.name,
        code: payload.code,
        parentId: payload.parentId,
        sort: payload.sort
      });
      message("更新成功", { type: "success" });
    } else {
      await createDepartment(payload);
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

async function handleDelete(row: DepartmentItem) {
  try {
    await ElMessageBox.confirm(`确定删除部门「${row.name}」吗？`, "提示", { type: "warning" });
    await deleteDepartment(row.id);
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
        <el-select v-model="filterOrgId" clearable placeholder="全部组织" class="w-[240px]!">
          <el-option v-for="item in orgList" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="loading" @click="onSearch">查询</el-button>
      </el-form-item>
    </el-form>

    <PureTableBar title="部门管理" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button type="primary" @click="openCreateDialog">添加部门</el-button>
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
          <el-select v-model="formModel.organizationId" class="w-full!" :disabled="!!editingId" @change="loadParentOptions">
            <el-option v-for="item in orgList" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="部门名称" prop="name">
          <el-input v-model="formModel.name" />
        </el-form-item>
        <el-form-item label="部门编码" prop="code">
          <el-input v-model="formModel.code" />
        </el-form-item>
        <el-form-item label="上级部门">
          <el-select v-model="formModel.parentId" clearable class="w-full!">
            <el-option v-for="item in parentOptions.filter(d => d.id !== editingId)" :key="item.id" :label="item.name" :value="item.id" />
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
