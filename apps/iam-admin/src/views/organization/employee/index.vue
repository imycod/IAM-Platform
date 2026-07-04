<script setup lang="ts">
import { PureTableBar } from "@/components/RePureTableBar";
import {
  createEmployee,
  deleteEmployee,
  getDepartments,
  getEmployees,
  getOrganizations,
  getPositions,
  updateEmployee,
  type DepartmentItem,
  type EmployeeForm,
  type EmployeeItem,
  type OrganizationItem,
  type PositionItem
} from "@/api/organization";
import { getIdentityUsers, type IdentityUserItem } from "@/api/identity-user";
import { message } from "@/utils/message";
import type { FormInstance, FormRules } from "element-plus";
import { ElMessageBox } from "element-plus";
import { onMounted, reactive, ref, watch } from "vue";

defineOptions({ name: "OrganizationEmployeeIndex" });

const loading = ref(false);
const dataList = ref<EmployeeItem[]>([]);
const orgList = ref<OrganizationItem[]>([]);
const deptList = ref<DepartmentItem[]>([]);
const posList = ref<PositionItem[]>([]);
const userList = ref<IdentityUserItem[]>([]);
const filterOrgId = ref("");

const columns: TableColumnList = [
  { label: "工号", prop: "employeeNo", minWidth: 100, formatter: ({ employeeNo }) => employeeNo ?? "-" },
  { label: "用户", prop: "userEmail", minWidth: 160, formatter: ({ userEmail, userName }) => userName ? `${userName}（${userEmail}）` : userEmail ?? "-" },
  { label: "组织", prop: "organizationName", minWidth: 120, formatter: ({ organizationName }) => organizationName ?? "-" },
  { label: "部门", prop: "departmentName", minWidth: 120, formatter: ({ departmentName }) => departmentName ?? "-" },
  { label: "岗位", prop: "positionName", minWidth: 120, formatter: ({ positionName }) => positionName ?? "-" },
  { label: "状态", prop: "status", minWidth: 90 },
  { label: "操作", fixed: "right", width: 160, slot: "operation" }
];

const dialogVisible = ref(false);
const dialogTitle = ref("添加员工");
const submitting = ref(false);
const editingId = ref<string | null>(null);
const formRef = ref<FormInstance>();
const formModel = reactive<EmployeeForm>({
  userId: "",
  organizationId: "",
  departmentId: null,
  positionId: null,
  employeeNo: "",
  status: "active",
  hiredAt: null
});

const formRules: FormRules = {
  userId: [{ required: true, message: "请选择用户", trigger: "change" }],
  organizationId: [{ required: true, message: "请选择组织", trigger: "change" }]
};

async function loadOrgs() {
  orgList.value = await getOrganizations();
  if (!filterOrgId.value && orgList.value.length) {
    filterOrgId.value = orgList.value[0].id;
  }
}

async function loadOrgOptions(orgId: string) {
  if (!orgId) {
    deptList.value = [];
    posList.value = [];
    return;
  }
  [deptList.value, posList.value] = await Promise.all([
    getDepartments({ organizationId: orgId }),
    getPositions({ organizationId: orgId })
  ]);
}

async function onSearch() {
  loading.value = true;
  try {
    dataList.value = await getEmployees(
      filterOrgId.value ? { organizationId: filterOrgId.value } : undefined
    );
  } finally {
    loading.value = false;
  }
}

watch(filterOrgId, onSearch);

function resetForm() {
  formModel.userId = "";
  formModel.organizationId = filterOrgId.value || "";
  formModel.departmentId = null;
  formModel.positionId = null;
  formModel.employeeNo = "";
  formModel.status = "active";
  formModel.hiredAt = null;
  editingId.value = null;
  formRef.value?.clearValidate();
}

async function openCreateDialog() {
  resetForm();
  try {
    userList.value = (await getIdentityUsers({ page: 1, pageSize: 100 })).items;
  } catch (error: any) {
    message(error?.response?.data?.message ?? error?.message ?? "加载用户列表失败", {
      type: "error"
    });
    return;
  }
  await loadOrgOptions(formModel.organizationId);
  dialogTitle.value = "添加员工";
  dialogVisible.value = true;
}

async function openEditDialog(row: EmployeeItem) {
  resetForm();
  editingId.value = row.id;
  dialogTitle.value = "编辑员工";
  formModel.userId = row.userId;
  formModel.organizationId = row.organizationId;
  formModel.departmentId = row.departmentId;
  formModel.positionId = row.positionId;
  formModel.employeeNo = row.employeeNo ?? "";
  formModel.status = row.status;
  formModel.hiredAt = row.hiredAt;
  await loadOrgOptions(row.organizationId);
  dialogVisible.value = true;
}

async function submitForm() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  submitting.value = true;
  try {
    const payload = {
      userId: formModel.userId,
      organizationId: formModel.organizationId,
      departmentId: formModel.departmentId || null,
      positionId: formModel.positionId || null,
      employeeNo: formModel.employeeNo?.trim() || null,
      status: formModel.status,
      hiredAt: formModel.hiredAt || null
    };
    if (editingId.value) {
      await updateEmployee(editingId.value, {
        departmentId: payload.departmentId,
        positionId: payload.positionId,
        employeeNo: payload.employeeNo,
        status: payload.status,
        hiredAt: payload.hiredAt
      });
      message("更新成功", { type: "success" });
    } else {
      await createEmployee(payload);
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

async function handleDelete(row: EmployeeItem) {
  try {
    await ElMessageBox.confirm(`确定删除员工档案吗？`, "提示", { type: "warning" });
    await deleteEmployee(row.id);
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

    <PureTableBar title="员工管理" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button type="primary" @click="openCreateDialog">添加员工</el-button>
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

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="560px" destroy-on-close @closed="resetForm">
      <el-form ref="formRef" :model="formModel" :rules="formRules" label-width="90px">
        <el-form-item label="用户" prop="userId">
          <el-select v-model="formModel.userId" filterable class="w-full!" :disabled="!!editingId">
            <el-option v-for="item in userList" :key="item.id" :label="item.email ?? item.name ?? item.id" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="所属组织" prop="organizationId">
          <el-select v-model="formModel.organizationId" class="w-full!" :disabled="!!editingId" @change="loadOrgOptions">
            <el-option v-for="item in orgList" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="部门">
          <el-select v-model="formModel.departmentId" clearable class="w-full!">
            <el-option v-for="item in deptList" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="岗位">
          <el-select v-model="formModel.positionId" clearable class="w-full!">
            <el-option v-for="item in posList" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="工号">
          <el-input v-model="formModel.employeeNo" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="formModel.status" class="w-full!">
            <el-option label="在职" value="active" />
            <el-option label="离职" value="inactive" />
          </el-select>
        </el-form-item>
        <el-form-item label="入职日期">
          <el-date-picker v-model="formModel.hiredAt" type="date" value-format="YYYY-MM-DD" class="w-full!" />
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
