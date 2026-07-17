<script setup lang="ts">
import { PureTableBar } from "@/components/RePureTableBar";
import {
  getSessionRegistry,
  revokeAllSessionRegistry,
  revokeSessionRegistry,
  type UnifiedSessionItem,
  type UnifiedSessionKind
} from "@/api/identity-session";
import { message } from "@/utils/message";
import { ElMessageBox } from "element-plus";
import { onMounted, reactive, ref } from "vue";

defineOptions({
  name: "IdentitySessionIndex"
});

const tableRef = ref();
const loading = ref(false);
const dataList = ref<UnifiedSessionItem[]>([]);

const kindOptions: { label: string; value: UnifiedSessionKind | "" }[] = [
  { label: "全部", value: "" },
  { label: "账密门户", value: "portal_password" },
  { label: "SSO 会话", value: "oidc_sso" },
  { label: "OIDC 访问令牌", value: "oidc_access_token" }
];

const kindLabelMap: Record<UnifiedSessionKind, string> = {
  portal_password: "账密门户",
  oidc_sso: "SSO 会话",
  oidc_access_token: "OIDC 访问令牌"
};

function resolveRowActive(row: UnifiedSessionItem): boolean {
  if (typeof row.active === "boolean") return row.active;
  if (!row.expiresAt) return true;
  return Date.parse(row.expiresAt) > Date.now();
}

function formatLoginUser(row: UnifiedSessionItem): string {
  const { userName, userEmail, userId } = row;
  if (userName && userEmail) return `${userName}（${userEmail}）`;
  if (userEmail) return userEmail;
  if (userName) return userName;
  return userId ?? "-";
}

const filters = reactive({
  userId: "",
  ipAddress: "",
  kind: "" as UnifiedSessionKind | ""
});

const columns: TableColumnList = [
  {
    label: "状态",
    prop: "active",
    width: 100,
    slot: "activeStatus"
  },
  {
    label: "类型",
    prop: "kind",
    minWidth: 120,
    formatter: ({ kind }) => kindLabelMap[kind as UnifiedSessionKind] ?? kind
  },
  {
    label: "登录用户",
    minWidth: 200,
    formatter: row => formatLoginUser(row)
  },
  {
    label: "用户 ID",
    prop: "userId",
    minWidth: 200,
    formatter: ({ userId }) => userId ?? "-"
  },
  {
    label: "应用/客户端",
    minWidth: 160,
    formatter: ({ clientName, applicationCode }) =>
      applicationCode ? `${clientName}（${applicationCode}）` : (clientName ?? "-")
  },
  {
    label: "Token",
    minWidth: 140,
    formatter: ({ tokenPreview }) => tokenPreview ?? "-"
  },
  {
    label: "过期时间",
    prop: "expiresAt",
    minWidth: 170,
    formatter: ({ expiresAt }) => expiresAt ?? "-"
  },
  {
    label: "IP",
    prop: "ipAddress",
    minWidth: 130,
    formatter: ({ ipAddress }) => ipAddress ?? "-"
  },
  {
    label: "User Agent",
    prop: "userAgent",
    minWidth: 180,
    formatter: ({ userAgent }) => userAgent ?? "-"
  },
  { label: "操作", fixed: "right", width: 100, slot: "operation" }
];

async function onSearch() {
  loading.value = true;
  try {
    const res = await getSessionRegistry({
      page: 1,
      pageSize: 100,
      userId: filters.userId.trim() || undefined,
      kind: filters.kind || undefined
    });
    dataList.value = res.items.filter(row => {
      if (!filters.ipAddress.trim()) return true;
      return (row.ipAddress ?? "")
        .toLowerCase()
        .includes(filters.ipAddress.trim().toLowerCase());
    });
  } catch (error: any) {
    message(error?.response?.data?.message ?? error?.message ?? "加载失败", {
      type: "error"
    });
  } finally {
    loading.value = false;
  }
}

async function handleRevokeAll() {
  const scopeParts: string[] = [];
  if (filters.userId.trim()) {
    scopeParts.push(`用户 ${filters.userId.trim()}`);
  }
  if (filters.kind) {
    scopeParts.push(kindLabelMap[filters.kind]);
  }
  const scope =
    scopeParts.length > 0
      ? `将踢下线${scopeParts.join("、")}下的`
      : "将踢下线系统中";
  const countHint =
    dataList.value.length > 0 ? `当前列表共 ${dataList.value.length} 条，` : "";
  const ipHint = filters.ipAddress.trim()
    ? "（IP 筛选仅影响列表展示，批量下线按用户 ID 与会话类型执行）"
    : "";

  try {
    await ElMessageBox.confirm(
      `${countHint}${scope}所有活跃会话与 OIDC 令牌。用户需重新登录才能继续访问各 SaaS 应用。${ipHint}`,
      "一键全部下线",
      { type: "warning", confirmButtonText: "全部下线", cancelButtonText: "取消" }
    );
    const res = await revokeAllSessionRegistry({
      userId: filters.userId.trim() || undefined,
      kind: filters.kind || undefined
    });
    message(`已下线 ${res.revoked} 条会话/令牌`, { type: "success" });
    await onSearch();
  } catch (error: any) {
    if (error === "cancel" || error === "close") return;
    message(
      error?.response?.data?.message ?? error?.message ?? "操作失败，请稍后重试",
      { type: "error" }
    );
  }
}

async function handleRevoke(row: UnifiedSessionItem) {
  const kindLabel = kindLabelMap[row.kind] ?? row.kind;
  try {
    await ElMessageBox.confirm(
      `确定踢下线该${kindLabel}吗？用户需重新登录才能继续访问。`,
      "强制下线",
      { type: "warning", confirmButtonText: "踢下线", cancelButtonText: "取消" }
    );
    await revokeSessionRegistry(row.kind, row.id);
    message("已踢下线", { type: "success" });
    await onSearch();
  } catch (error: any) {
    if (error === "cancel" || error === "close") return;
    message(
      error?.response?.data?.message ?? error?.message ?? "操作失败，请稍后重试",
      { type: "error" }
    );
  }
}

onMounted(onSearch);
</script>

<template>
  <div class="main">
    <el-alert
      type="info"
      :closable="false"
      show-icon
      class="mx-8 mt-3 mb-0"
      title="会话中心聚合门户账密会话与 OIDC SSO/访问令牌。踢下线会吊销服务端会话，用户下次请求需重新登录。"
    />

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
      <el-form-item label="IP">
        <el-input
          v-model="filters.ipAddress"
          clearable
          placeholder="模糊搜索"
          class="w-[180px]!"
          @keyup.enter="onSearch"
        />
      </el-form-item>
      <el-form-item label="类型">
        <el-select v-model="filters.kind" clearable placeholder="全部" class="w-[160px]!">
          <el-option
            v-for="item in kindOptions"
            :key="item.value || 'all'"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="loading" @click="onSearch">查询</el-button>
      </el-form-item>
    </el-form>

    <PureTableBar title="会话中心" :columns="columns" @refresh="onSearch">
      <template #buttons>
        <el-button type="danger" plain :loading="loading" @click="handleRevokeAll">
          一键全部下线
        </el-button>
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
          <template #activeStatus="{ row }">
            <span
              class="session-status"
              :class="
                resolveRowActive(row)
                  ? 'session-status--active'
                  : 'session-status--offline'
              "
            >
              <span class="session-status__dot" aria-hidden="true" />
              {{ resolveRowActive(row) ? "活跃" : "已下线" }}
            </span>
          </template>
          <template #operation="{ row }">
            <el-button
              link
              type="danger"
              :disabled="!resolveRowActive(row)"
              @click="handleRevoke(row)"
            >
              踢下线
            </el-button>
          </template>
        </pure-table>
      </template>
    </PureTableBar>
  </div>
</template>

<style scoped lang="scss">
.main {
  :deep(.el-dropdown-menu__item i) {
    margin: 0;
  }
}

.session-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.session-status__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.session-status--active {
  color: var(--el-color-success);

  .session-status__dot {
    background: var(--el-color-success);
    box-shadow: 0 0 0 2px rgb(103 194 58 / 25%);
  }
}

.session-status--offline {
  color: var(--el-color-danger);

  .session-status__dot {
    background: var(--el-color-danger);
    box-shadow: 0 0 0 2px rgb(245 108 108 / 25%);
  }
}
</style>
