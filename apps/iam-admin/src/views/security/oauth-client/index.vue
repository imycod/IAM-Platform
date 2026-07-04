<script setup lang="ts">
import { PureTableBar } from "@/components/RePureTableBar";
import { getApplications, type ApplicationItem } from "@/api/application";
import {
  createOauthClient,
  deleteOauthClient,
  getOauthClients,
  rotateOauthClientSecret,
  updateOauthClient,
  type OauthClientForm,
  type OauthClientItem
} from "@/api/oauth-client";
import { message } from "@/utils/message";
import type { FormInstance, FormRules } from "element-plus";
import { ElMessageBox } from "element-plus";
import { computed, onMounted, reactive, ref } from "vue";

defineOptions({
  name: "SecurityOauthClientIndex"
});

const authMethodOptions = [
  { label: "无（公共 SPA + PKCE）", value: "none" },
  { label: "client_secret_basic", value: "client_secret_basic" },
  { label: "client_secret_post", value: "client_secret_post" }
];

const authMethodLabelMap = Object.fromEntries(
  authMethodOptions.map(item => [item.value, item.label])
);

const scopePresets = ["openid", "profile", "email", "offline_access"];
const grantPresets = ["authorization_code", "refresh_token"];
const responsePresets = ["code"];

const tableRef = ref();
const loading = ref(false);
const applicationsLoading = ref(false);
const dataList = ref<OauthClientItem[]>([]);
const applicationList = ref<ApplicationItem[]>([]);
const allBoundApplicationIds = ref<Set<string>>(new Set());
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);

const filters = reactive({
  applicationId: "",
  clientId: ""
});

/** 已有客户端的应用 ID，创建时不可重复选 */
const boundApplicationIds = computed(() => allBoundApplicationIds.value);

const availableApplications = computed(() =>
  applicationList.value.filter(app => !boundApplicationIds.value.has(app.id))
);

const columns: TableColumnList = [
  {
    label: "应用",
    minWidth: 160,
    formatter: ({ application }) =>
      application ? `${application.name}（${application.code}）` : "-"
  },
  { label: "Client ID", prop: "clientId", minWidth: 180 },
  {
    label: "Secret",
    prop: "clientSecretMasked",
    minWidth: 100
  },
  {
    label: "认证方式",
    prop: "tokenEndpointAuthMethod",
    minWidth: 140,
    formatter: ({ tokenEndpointAuthMethod }) =>
      authMethodLabelMap[tokenEndpointAuthMethod] ?? tokenEndpointAuthMethod
  },
  {
    label: "PKCE",
    prop: "requirePkce",
    minWidth: 70,
    formatter: ({ requirePkce }) => (requirePkce ? "是" : "否")
  },
  {
    label: "Redirect URIs",
    minWidth: 220,
    formatter: ({ redirectUris }) => redirectUris?.join(", ") ?? "-"
  },
  {
    label: "Scopes",
    minWidth: 180,
    formatter: ({ scopes }) => scopes?.join(" ") ?? "-"
  },
  { label: "创建时间", prop: "createdAt", minWidth: 170 },
  { label: "操作", fixed: "right", width: 220, slot: "operation" }
];

const dialogVisible = ref(false);
const dialogTitle = ref("添加 OAuth 客户端");
const submitting = ref(false);
const editingId = ref<string | null>(null);
const formRef = ref<FormInstance>();

const formModel = reactive({
  applicationId: "",
  clientId: "",
  redirectUrisText: "",
  scopes: [...scopePresets.slice(0, 3)] as string[],
  grantTypes: [...grantPresets] as string[],
  responseTypes: [...responsePresets] as string[],
  tokenEndpointAuthMethod: "none",
  requirePkce: true
});

const isEditing = computed(() => !!editingId.value);

const formRules: FormRules = {
  applicationId: [{ required: true, message: "请选择应用", trigger: "change" }],
  redirectUrisText: [{ required: true, message: "请填写 Redirect URI", trigger: "blur" }],
  tokenEndpointAuthMethod: [
    { required: true, message: "请选择认证方式", trigger: "change" }
  ]
};

function parseRedirectUris(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map(item => item.trim())
    .filter(Boolean);
}

function formatRedirectUris(uris: string[]): string {
  return uris.join("\n");
}

async function refreshBoundApplications() {
  try {
    const res = await getOauthClients({ page: 1, pageSize: 100 });
    allBoundApplicationIds.value = new Set(res.items.map(item => item.applicationId));
  } catch {
    allBoundApplicationIds.value = new Set();
  }
}

async function loadApplications() {
  applicationsLoading.value = true;
  try {
    applicationList.value = await getApplications();
  } catch (error: any) {
    message(
      error?.response?.data?.message ?? error?.message ?? "加载应用失败",
      { type: "error" }
    );
  } finally {
    applicationsLoading.value = false;
  }
}

async function onSearch() {
  loading.value = true;
  try {
    const res = await getOauthClients({
      page: page.value,
      pageSize: pageSize.value,
      applicationId: filters.applicationId || undefined,
      clientId: filters.clientId.trim() || undefined
    });
    dataList.value = res.items;
    total.value = res.total;
  } catch (error: any) {
    message(
      error?.response?.data?.message ?? error?.message ?? "加载失败",
      { type: "error" }
    );
  } finally {
    loading.value = false;
  }
}

function onPageChange(p: number) {
  page.value = p;
  onSearch();
}

function onPageSizeChange(size: number) {
  pageSize.value = size;
  page.value = 1;
  onSearch();
}

function resetForm() {
  formModel.applicationId = "";
  formModel.clientId = "";
  formModel.redirectUrisText = "";
  formModel.scopes = [...scopePresets.slice(0, 3)];
  formModel.grantTypes = [...grantPresets];
  formModel.responseTypes = [...responsePresets];
  formModel.tokenEndpointAuthMethod = "none";
  formModel.requirePkce = true;
  editingId.value = null;
  formRef.value?.clearValidate();
}

function openCreateDialog() {
  resetForm();
  dialogTitle.value = "添加 OAuth 客户端";
  dialogVisible.value = true;
}

function openEditDialog(row: OauthClientItem) {
  editingId.value = row.id;
  dialogTitle.value = "编辑 OAuth 客户端";
  formModel.applicationId = row.applicationId;
  formModel.clientId = row.clientId;
  formModel.redirectUrisText = formatRedirectUris(row.redirectUris);
  formModel.scopes = [...row.scopes];
  formModel.grantTypes = [...row.grantTypes];
  formModel.responseTypes = [...row.responseTypes];
  formModel.tokenEndpointAuthMethod = row.tokenEndpointAuthMethod;
  formModel.requirePkce = row.requirePkce;
  dialogVisible.value = true;
}

function buildPayload(): OauthClientForm {
  return {
    applicationId: formModel.applicationId,
    clientId: formModel.clientId.trim() || undefined,
    redirectUris: parseRedirectUris(formModel.redirectUrisText),
    scopes: formModel.scopes,
    grantTypes: formModel.grantTypes,
    responseTypes: formModel.responseTypes,
    tokenEndpointAuthMethod: formModel.tokenEndpointAuthMethod,
    requirePkce: formModel.requirePkce
  };
}

function showSecret(plain: string | null | undefined, title: string) {
  if (!plain) return;
  ElMessageBox.alert(plain, title, {
    confirmButtonText: "已复制到剪贴板",
    callback: () => {
      void navigator.clipboard?.writeText(plain);
    }
  });
}

async function submitForm() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  const redirectUris = parseRedirectUris(formModel.redirectUrisText);
  if (!redirectUris.length) {
    message("请至少填写一个 Redirect URI", { type: "warning" });
    return;
  }

  submitting.value = true;
  try {
    if (editingId.value) {
      await updateOauthClient(editingId.value, {
        clientId: formModel.clientId.trim() || undefined,
        redirectUris,
        scopes: formModel.scopes,
        grantTypes: formModel.grantTypes,
        responseTypes: formModel.responseTypes,
        tokenEndpointAuthMethod: formModel.tokenEndpointAuthMethod,
        requirePkce: formModel.requirePkce
      });
      message("更新成功", { type: "success" });
    } else {
      const created = await createOauthClient(buildPayload());
      message("创建成功", { type: "success" });
      if (created.clientSecretPlain) {
        showSecret(created.clientSecretPlain, "新客户端 Secret（请妥善保存）");
      }
    }
    dialogVisible.value = false;
    await refreshBoundApplications();
    await onSearch();
  } catch (error: any) {
    message(
      error?.response?.data?.message ??
        error?.message ??
        "操作失败，请稍后重试",
      { type: "error" }
    );
  } finally {
    submitting.value = false;
  }
}

async function handleRotateSecret(row: OauthClientItem) {
  if (row.tokenEndpointAuthMethod === "none") {
    message("公共客户端无需轮换 Secret", { type: "info" });
    return;
  }
  try {
    await ElMessageBox.confirm(
      `确定轮换客户端「${row.clientId}」的 Secret 吗？旧 Secret 将立即失效。`,
      "轮换 Secret",
      { type: "warning" }
    );
    const updated = await rotateOauthClientSecret(row.id);
    message("Secret 已轮换", { type: "success" });
    if (updated.clientSecretPlain) {
      showSecret(updated.clientSecretPlain, "新 Secret（请妥善保存）");
    }
    await onSearch();
  } catch (error: any) {
    if (error === "cancel" || error === "close") return;
    message(
      error?.response?.data?.message ?? error?.message ?? "操作失败",
      { type: "error" }
    );
  }
}

async function handleDelete(row: OauthClientItem) {
  try {
    await ElMessageBox.confirm(
      `确定删除 OAuth 客户端「${row.clientId}」吗？关联应用的 SSO 将不可用。`,
      "删除确认",
      { type: "warning" }
    );
    await deleteOauthClient(row.id);
    message("已删除", { type: "success" });
    await refreshBoundApplications();
    await onSearch();
  } catch (error: any) {
    if (error === "cancel" || error === "close") return;
    message(
      error?.response?.data?.message ?? error?.message ?? "删除失败",
      { type: "error" }
    );
  }
}

onMounted(async () => {
  await Promise.all([loadApplications(), refreshBoundApplications()]);
  await onSearch();
});
</script>

<template>
  <div class="main">
    <el-alert
      type="info"
      :closable="false"
      show-icon
      class="mx-8 mt-3 mb-0"
      title="OAuth 客户端与 application 1:1 绑定。SPA 推荐使用「无（公共 + PKCE）」；机密客户端可轮换 Secret。"
    />

    <el-form :inline="true" class="search-form bg-bg_color w-full pl-8 pt-[12px] overflow-auto">
      <el-form-item label="应用">
        <el-select
          v-model="filters.applicationId"
          clearable
          filterable
          placeholder="全部"
          class="w-[220px]!"
          :loading="applicationsLoading"
        >
          <el-option
            v-for="app in applicationList"
            :key="app.id"
            :label="`${app.name}（${app.code}）`"
            :value="app.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="Client ID">
        <el-input
          v-model="filters.clientId"
          clearable
          placeholder="模糊搜索"
          class="w-[200px]!"
          @keyup.enter="onSearch"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="loading" @click="onSearch">查询</el-button>
        <el-button type="primary" @click="openCreateDialog">添加客户端</el-button>
      </el-form-item>
    </el-form>

    <PureTableBar title="OAuth 客户端" :columns="columns" @refresh="onSearch">
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
          :pagination="{ total, pageSize, currentPage: page }"
          @page-current-change="onPageChange"
          @page-size-change="onPageSizeChange"
        >
          <template #operation="{ row }">
            <el-button link type="primary" @click="openEditDialog(row)">编辑</el-button>
            <el-button
              v-if="row.tokenEndpointAuthMethod !== 'none'"
              link
              type="warning"
              @click="handleRotateSecret(row)"
            >
              轮换 Secret
            </el-button>
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
      <el-form ref="formRef" :model="formModel" :rules="formRules" label-width="120px">
        <el-form-item label="关联应用" prop="applicationId">
          <el-select
            v-model="formModel.applicationId"
            filterable
            placeholder="选择应用"
            class="w-full!"
            :disabled="isEditing"
          >
            <el-option
              v-for="app in isEditing ? applicationList : availableApplications"
              :key="app.id"
              :label="`${app.name}（${app.code}）`"
              :value="app.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="Client ID">
          <el-input
            v-model="formModel.clientId"
            placeholder="留空则自动生成"
            clearable
          />
        </el-form-item>
        <el-form-item label="Redirect URIs" prop="redirectUrisText">
          <el-input
            v-model="formModel.redirectUrisText"
            type="textarea"
            :rows="4"
            placeholder="每行一个，如 http://localhost:8848/callback.html"
          />
        </el-form-item>
        <el-form-item label="Scopes">
          <el-select v-model="formModel.scopes" multiple filterable allow-create class="w-full!">
            <el-option v-for="s in scopePresets" :key="s" :label="s" :value="s" />
          </el-select>
        </el-form-item>
        <el-form-item label="Grant Types">
          <el-select v-model="formModel.grantTypes" multiple filterable allow-create class="w-full!">
            <el-option v-for="g in grantPresets" :key="g" :label="g" :value="g" />
          </el-select>
        </el-form-item>
        <el-form-item label="Response Types">
          <el-select
            v-model="formModel.responseTypes"
            multiple
            filterable
            allow-create
            class="w-full!"
          >
            <el-option v-for="r in responsePresets" :key="r" :label="r" :value="r" />
          </el-select>
        </el-form-item>
        <el-form-item label="Token 认证" prop="tokenEndpointAuthMethod">
          <el-select v-model="formModel.tokenEndpointAuthMethod" class="w-full!">
            <el-option
              v-for="item in authMethodOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="要求 PKCE">
          <el-switch v-model="formModel.requirePkce" />
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
