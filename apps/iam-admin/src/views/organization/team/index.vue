<script setup lang="ts">
import { PureTableBar } from "@/components/RePureTableBar";
import {
  createTeam,
  deleteTeam,
  getOrganizations,
  getTeams,
  updateTeam,
  type OrganizationItem,
  type TeamForm,
  type TeamItem
} from "@/api/organization";
import { message } from "@/utils/message";
import type { FormInstance, FormRules } from "element-plus";
import { ElMessageBox } from "element-plus";
import { onMounted, reactive, ref, watch } from "vue";

defineOptions({ name: "OrganizationTeamIndex" });

const loading = ref(false);
const dataList = ref<TeamItem[]>([]);
const orgList = ref<OrganizationItem[]>([]);
const filterOrgId = ref("");

const columns: TableColumnList = [
  { label: "团队名称", prop: "name", minWidth: 140 },
  { label: "团队编码", prop: "code", minWidth: 140 },
  { label: "组织", prop: "organizationName", minWidth: 120, formatter: ({ organizationName }) => organizationName ?? "-" },
  { label: "成员数", prop: "memberCount", minWidth: 90, formatter: ({ memberCount }) => memberCount ?? 0 },
  { label: "描述", prop: "description", minWidth: 180, formatter: ({ description }) => description ?? "-" },
  { label: "操作", fixed: "right", width: 160, slot: "operation" }
];

const dialogVisible = ref(false);
const dialogTitle = ref("添加团队");
const submitting = ref(false);
const editingId = ref<string | null>(null);
const formRef = ref<FormInstance>();
const formModel = reactive<TeamForm>({
  organizationId: "",
  name: "",
  code: "",
  description: ""
});

const formRules: FormRules = {
  organizationId: [{ required: true, message: "请选择组织", trigger: "change" }],
  name: [{ required: true, message: "请输入团队名称", trigger: "blur" }],
  code: [{ required: true, message: "请输入团队编码", trigger: "blur" }]
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
    dataList.value = await getTeams(
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
  formModel.description = "";
  editingId.value = null;
  formRef.value?.clearValidate();
}

function openCreateDialog() {
  resetForm();
  dialogTitle.value = "添加团队";
  dialogVisible.value = true;
}

function openEditDialog(row: TeamItem) {
  resetForm();
  editingId.value = row.id;
  dialogTitle.value = "编辑团队";
  formModel.organizationId = row.organizationId;
  formModel.name = row.name;
  formModel.code = row.code;
  formModel.description = row.description ?? "";
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
      description: formModel.description?.trim() || null
    };
    if (editingId.value) {
      await updateTeam(editingId.value, {
        name: payload.name,
        code: payload.code,
        description: payload.description
      });
      message("更新成功", { type: "success" });
    } else {
      await createTeam(payload);
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

async function handleDelete(row: TeamItem) {
  try {
    await ElMessageBox.confirm(`确定删除团队「${row.name}」吗？`, "提示", { type: "warning" });
    await deleteTeam(row.id);
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

    <PureTableBar title="团队管理" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button type="primary" @click="openCreateDialog">添加团队</el-button>
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
        <el-form-item label="团队名称" prop="name">
          <el-input v-model="formModel.name" />
        </el-form-item>
        <el-form-item label="团队编码" prop="code">
          <el-input v-model="formModel.code" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="formModel.description" type="textarea" :rows="3" />
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
