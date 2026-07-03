<script setup lang="ts">
import { PureTableBar } from "@/components/RePureTableBar";
import {
  assignRoleToUser,
  getRoles,
  getUserRoleAssignments,
  revokeRoleFromUser,
  type RoleItem,
  type UserRoleAssignmentItem
} from "@/api/role";
import { getIdentityUsers, type IdentityUserItem } from "@/api/identity-user";
import { message } from "@/utils/message";
import type { FormInstance, FormRules } from "element-plus";
import { ElMessageBox } from "element-plus";
import { onMounted, reactive, ref } from "vue";

defineOptions({ name: "AccessRoleUserIndex" });

const loading = ref(false);
const roles = ref<RoleItem[]>([]);
const users = ref<IdentityUserItem[]>([]);
const assignments = ref<UserRoleAssignmentItem[]>([]);

const filters = reactive({
  roleId: "",
  userId: ""
});

const dialogVisible = ref(false);
const submitting = ref(false);
const formRef = ref<FormInstance>();
const formModel = reactive({ roleId: "", userId: "" });
const formRules: FormRules = {
  roleId: [{ required: true, message: "请选择角色", trigger: "change" }],
  userId: [{ required: true, message: "请选择用户", trigger: "change" }]
};

const columns: TableColumnList = [
  { label: "角色名称", prop: "role.name", minWidth: 140, formatter: ({ role }) => role.name },
  { label: "角色编码", prop: "role.code", minWidth: 160, formatter: ({ role }) => role.code },
  {
    label: "用户",
    minWidth: 200,
    formatter: ({ user }) => user.email ?? user.name ?? user.id
  },
  {
    label: "应用 ID",
    minWidth: 200,
    formatter: ({ applicationId }) => applicationId ?? "平台级"
  },
  {
    label: "分配时间",
    prop: "createdAt",
    minWidth: 170,
    formatter: ({ createdAt }) => createdAt ?? "-"
  },
  { label: "操作", fixed: "right", width: 100, slot: "operation" }
];

async function loadOptions() {
  try {
    const [roleList, userRes] = await Promise.all([
      getRoles({ all: true }),
      getIdentityUsers({ page: 1, pageSize: 100 })
    ]);
    roles.value = roleList;
    users.value = userRes.items;
  } catch (error: any) {
    message(error?.response?.data?.message ?? error?.message ?? "加载选项失败", {
      type: "error"
    });
  }
}

async function loadAssignments() {
  loading.value = true;
  try {
    assignments.value = await getUserRoleAssignments({
      roleId: filters.roleId || undefined,
      userId: filters.userId || undefined
    });
  } catch (error: any) {
    message(error?.response?.data?.message ?? error?.message ?? "加载列表失败", {
      type: "error"
    });
  } finally {
    loading.value = false;
  }
}

async function onSearch() {
  await loadAssignments();
}

function openAssignDialog() {
  formModel.roleId = "";
  formModel.userId = "";
  formRef.value?.clearValidate();
  dialogVisible.value = true;
}

async function submitAssign() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    const role = roles.value.find(r => r.id === formModel.roleId)!;
    await assignRoleToUser(role.id, {
      userId: formModel.userId,
      applicationId: role.applicationId
    });
    message("分配成功", { type: "success" });
    dialogVisible.value = false;
    await loadAssignments();
  } catch (error: any) {
    message(error?.response?.data?.message ?? error?.message ?? "分配失败", { type: "error" });
  } finally {
    submitting.value = false;
  }
}

async function handleRevoke(row: UserRoleAssignmentItem) {
  try {
    await ElMessageBox.confirm(
      `确定移除用户「${row.user.email ?? row.user.id}」的角色「${row.role.name}」吗？`,
      "提示",
      { type: "warning" }
    );
    await revokeRoleFromUser(row.role.id, row.user.id);
    message("已移除", { type: "success" });
    await loadAssignments();
  } catch (error: any) {
    if (error === "cancel" || error === "close") return;
    message(error?.response?.data?.message ?? "操作失败", { type: "error" });
  }
}

onMounted(async () => {
  await loadOptions();
  await loadAssignments();
});
</script>

<template>
  <div class="main">
    <el-form :inline="true" class="search-form bg-bg_color w-full pl-8 pt-[12px] overflow-auto">
      <el-form-item label="角色">
        <el-select
          v-model="filters.roleId"
          clearable
          filterable
          placeholder="全部"
          class="w-[220px]!"
        >
          <el-option
            v-for="item in roles"
            :key="item.id"
            :label="`${item.name}（${item.code}）`"
            :value="item.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="用户">
        <el-select
          v-model="filters.userId"
          clearable
          filterable
          placeholder="全部"
          class="w-[220px]!"
        >
          <el-option
            v-for="item in users"
            :key="item.id"
            :label="item.email ?? item.name ?? item.id"
            :value="item.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="loading" @click="onSearch">查询</el-button>
      </el-form-item>
    </el-form>

    <PureTableBar title="用户角色配置" :columns="columns" @refresh="loadAssignments">
      <template #buttons>
        <el-button type="primary" @click="openAssignDialog">分配角色</el-button>
      </template>
      <template #default="{ size, dynamicColumns }">
        <pure-table
          adaptive
          align-whole="center"
          row-key="id"
          showOverflowTooltip
          :loading="loading"
          :size="size"
          :data="assignments"
          :columns="dynamicColumns"
        >
          <template #operation="{ row }">
            <el-button link type="danger" @click="handleRevoke(row)">移除</el-button>
          </template>
        </pure-table>
      </template>
    </PureTableBar>

    <el-dialog v-model="dialogVisible" title="分配角色" width="480px" destroy-on-close>
      <el-form ref="formRef" :model="formModel" :rules="formRules" label-width="90px">
        <el-form-item label="角色" prop="roleId">
          <el-select v-model="formModel.roleId" placeholder="请选择角色" class="w-full!">
            <el-option
              v-for="item in roles"
              :key="item.id"
              :label="`${item.name}（${item.code}）`"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="用户" prop="userId">
          <el-select v-model="formModel.userId" placeholder="请选择用户" class="w-full!" filterable>
            <el-option
              v-for="item in users"
              :key="item.id"
              :label="item.email ?? item.name ?? item.id"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitAssign">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>
