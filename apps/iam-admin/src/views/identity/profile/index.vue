<script setup lang="ts">
import { PureTableBar } from "@/components/RePureTableBar";
import {
  createProfile,
  deleteProfile,
  getProfiles,
  updateProfile,
  type ProfileForm,
  type ProfileItem
} from "@/api/identity-profile";
import { message } from "@/utils/message";
import type { FormInstance, FormRules } from "element-plus";
import { ElMessageBox } from "element-plus";
import { onMounted, reactive, ref } from "vue";

defineOptions({
  name: "IdentityProfileIndex"
});

type Gender = "male" | "female" | "unknown";

const genderOptions: { label: string; value: Gender }[] = [
  { label: "男", value: "male" },
  { label: "女", value: "female" },
  { label: "未知", value: "unknown" }
];

const genderLabelMap = Object.fromEntries(
  genderOptions.map(item => [item.value, item.label])
) as Record<Gender, string>;

const tableRef = ref();
const loading = ref(false);
const dataList = ref<ProfileItem[]>([]);

const filters = reactive({
  userId: "",
  nickname: ""
});

const columns: TableColumnList = [
  { label: "用户 ID", prop: "userId", minWidth: 200 },
  {
    label: "昵称",
    prop: "nickname",
    minWidth: 120,
    formatter: ({ nickname }) => nickname ?? "-"
  },
  {
    label: "头像",
    prop: "avatar",
    minWidth: 160,
    formatter: ({ avatar }) => avatar ?? "-"
  },
  {
    label: "性别",
    prop: "gender",
    minWidth: 80,
    formatter: ({ gender }) => genderLabelMap[gender as Gender] ?? gender
  },
  { label: "语言", prop: "language", minWidth: 100 },
  { label: "时区", prop: "timezone", minWidth: 140 },
  {
    label: "简介",
    prop: "bio",
    minWidth: 180,
    formatter: ({ bio }) => bio ?? "-"
  },
  { label: "操作", fixed: "right", width: 160, slot: "operation" }
];

const dialogVisible = ref(false);
const dialogTitle = ref("添加资料");
const submitting = ref(false);
const editingId = ref<string | null>(null);
const formRef = ref<FormInstance>();

const formModel = reactive<ProfileForm & { gender: Gender }>({
  userId: "",
  nickname: "",
  avatar: "",
  gender: "unknown",
  language: "zh-CN",
  timezone: "Asia/Shanghai",
  bio: ""
});

const formRules: FormRules = {
  userId: [{ required: true, message: "请输入用户 ID", trigger: "blur" }],
  gender: [{ required: true, message: "请选择性别", trigger: "change" }],
  language: [{ required: true, message: "请输入语言", trigger: "blur" }],
  timezone: [{ required: true, message: "请输入时区", trigger: "blur" }]
};

async function onSearch() {
  loading.value = true;
  try {
    const res = await getProfiles({
      page: 1,
      pageSize: 100,
      userId: filters.userId.trim() || undefined
    });
    dataList.value = res.items.filter(row => {
      if (!filters.nickname.trim()) return true;
      return (row.nickname ?? "")
        .toLowerCase()
        .includes(filters.nickname.trim().toLowerCase());
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
  formModel.nickname = "";
  formModel.avatar = "";
  formModel.gender = "unknown";
  formModel.language = "zh-CN";
  formModel.timezone = "Asia/Shanghai";
  formModel.bio = "";
  editingId.value = null;
  formRef.value?.clearValidate();
}

function openCreateDialog() {
  resetForm();
  dialogTitle.value = "添加资料";
  dialogVisible.value = true;
}

function openEditDialog(row: ProfileItem) {
  resetForm();
  editingId.value = row.id;
  dialogTitle.value = "编辑资料";
  formModel.userId = row.userId;
  formModel.nickname = row.nickname ?? "";
  formModel.avatar = row.avatar ?? "";
  formModel.gender = (row.gender as Gender) || "unknown";
  formModel.language = row.language;
  formModel.timezone = row.timezone;
  formModel.bio = row.bio ?? "";
  dialogVisible.value = true;
}

function buildPayload(): ProfileForm {
  return {
    userId: formModel.userId.trim(),
    nickname: formModel.nickname?.trim() || undefined,
    avatar: formModel.avatar?.trim() || undefined,
    gender: formModel.gender,
    language: formModel.language.trim(),
    timezone: formModel.timezone.trim(),
    bio: formModel.bio?.trim() || undefined
  };
}

async function submitForm() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    const payload = buildPayload();
    if (editingId.value) {
      const { userId: _userId, ...updatePayload } = payload;
      await updateProfile(editingId.value, updatePayload);
      message("更新成功", { type: "success" });
    } else {
      await createProfile(payload);
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

async function handleDelete(row: ProfileItem) {
  try {
    await ElMessageBox.confirm(
      `确定删除用户「${row.userId}」的资料吗？`,
      "提示",
      { type: "warning", confirmButtonText: "删除", cancelButtonText: "取消" }
    );
    await deleteProfile(row.id);
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
      <el-form-item label="昵称">
        <el-input
          v-model="filters.nickname"
          clearable
          placeholder="模糊搜索"
          class="w-[220px]!"
          @keyup.enter="onSearch"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="loading" @click="onSearch">查询</el-button>
      </el-form-item>
    </el-form>

    <PureTableBar title="用户资料" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button type="primary" @click="openCreateDialog">添加资料</el-button>
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
          <el-input v-model="formModel.userId" :disabled="!!editingId" placeholder="26 位 ULID" />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="formModel.nickname" placeholder="可选" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="头像">
          <el-input v-model="formModel.avatar" placeholder="头像 URL" />
        </el-form-item>
        <el-form-item label="性别" prop="gender">
          <el-select v-model="formModel.gender" placeholder="请选择" class="w-full!">
            <el-option
              v-for="item in genderOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="语言" prop="language">
          <el-input v-model="formModel.language" placeholder="如 zh-CN" />
        </el-form-item>
        <el-form-item label="时区" prop="timezone">
          <el-input v-model="formModel.timezone" placeholder="如 Asia/Shanghai" />
        </el-form-item>
        <el-form-item label="简介">
          <el-input
            v-model="formModel.bio"
            type="textarea"
            :rows="4"
            placeholder="个人简介（可选）"
            maxlength="500"
            show-word-limit
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
