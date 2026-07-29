<template>
  <IamCrudPage
    :breadcrumb="['menu.iam', 'menu.iam.identity', 'menu.iam.identity.session']"
    title="会话管理"
    :columns="columns"
    :data="dataList"
    :loading="loading"
    :pagination="pagination"
    :show-create="false"
    @search="loadList"
    @reset="onReset"
    @page-change="onPageChange"
    @page-size-change="onPageSizeChange"
  >
    <template #filters>
      <a-form :model="filters" layout="inline">
        <a-form-item label="用户 ID">
          <a-input v-model="filters.userId" allow-clear />
        </a-form-item>
        <a-form-item label="类型">
          <a-select
            v-model="filters.kind"
            :options="kindOptions"
            allow-clear
            placeholder="全部"
            style="width: 140px"
          />
        </a-form-item>
      </a-form>
    </template>
    <template #extra-actions>
      <a-button status="warning" @click="onRevokeAll">撤销全部</a-button>
    </template>
    <template #active="{ record }">
      <a-tag :color="record.active ? 'green' : 'gray'">{{
        record.active ? '活跃' : '已失效'
      }}</a-tag>
    </template>
    <template #kind="{ record }">
      {{ kindLabelMap[record.kind] ?? record.kind }}
    </template>
    <template #user="{ record }">
      {{ formatUser(record) }}
    </template>
    <template #operations="{ record }">
      <a-button
        v-if="record.active"
        type="text"
        size="small"
        status="danger"
        @click="onRevoke(record)"
      >
        撤销
      </a-button>
    </template>
  </IamCrudPage>
</template>

<script lang="ts" setup>
  import { computed, onMounted, reactive } from 'vue';
  import { Message, Modal } from '@arco-design/web-vue';
  import type { TableColumnData } from '@arco-design/web-vue';
  import { useIamCrudPaginated } from '@/hooks/use-iam-crud';
  import {
    getSessionRegistry,
    revokeAllSessionRegistry,
    revokeSessionRegistry,
    type UnifiedSessionItem,
    type UnifiedSessionKind,
  } from '@/api/iam/identity-session';
  import IamCrudPage from '../../components/iam-crud-page.vue';

  const filters = reactive({ userId: '', kind: '' as UnifiedSessionKind | '' });

  const kindOptions = [
    { label: '账密门户', value: 'portal_password' },
    { label: 'SSO 会话', value: 'oidc_sso' },
    { label: 'OIDC 访问令牌', value: 'oidc_access_token' },
  ];
  const kindLabelMap: Record<UnifiedSessionKind, string> = {
    portal_password: '账密门户',
    oidc_sso: 'SSO 会话',
    oidc_access_token: 'OIDC 访问令牌',
  };

  const {
    loading,
    dataList,
    loadList,
    page,
    pageSize,
    total,
    onPageChange,
    onPageSizeChange,
  } = useIamCrudPaginated<UnifiedSessionItem>({
    fetchList: ({ page: p, pageSize: ps }) =>
      getSessionRegistry({
        page: p,
        pageSize: ps,
        userId: filters.userId || undefined,
        kind: filters.kind || undefined,
      }).then((res) => ({ items: res.items, total: res.total })),
  });

  const pagination = computed(() => ({
    current: page.value,
    pageSize: pageSize.value,
    total: total.value,
    showTotal: true,
    showPageSize: true,
  }));

  const columns: TableColumnData[] = [
    { title: '状态', slotName: 'active', width: 90 },
    { title: '类型', slotName: 'kind', width: 120 },
    { title: '登录用户', slotName: 'user', width: 200 },
    { title: '用户 ID', dataIndex: 'userId' },
    {
      title: '应用/客户端',
      render: ({ record }) =>
        record.applicationCode
          ? `${record.clientName}（${record.applicationCode}）`
          : record.clientName ?? '-',
    },
    { title: 'Token', dataIndex: 'tokenPreview' },
    { title: '过期时间', dataIndex: 'expiresAt' },
    { title: '操作', slotName: 'operations', width: 80 },
  ];

  function formatUser(row: UnifiedSessionItem) {
    if (row.userName && row.userEmail)
      return `${row.userName}（${row.userEmail}）`;
    return row.userEmail ?? row.userName ?? row.userId ?? '-';
  }

  function onReset() {
    filters.userId = '';
    filters.kind = '';
    loadList();
  }

  function onRevoke(row: UnifiedSessionItem) {
    Modal.confirm({
      title: '撤销会话',
      content: '确定撤销该会话吗？',
      onOk: async () => {
        await revokeSessionRegistry(row.kind, row.id);
        Message.success('已撤销');
        await loadList();
      },
    });
  }

  function onRevokeAll() {
    Modal.confirm({
      title: '撤销全部会话',
      content: '确定撤销符合条件的全部会话吗？',
      onOk: async () => {
        const res = await revokeAllSessionRegistry({
          userId: filters.userId || undefined,
          kind: filters.kind || undefined,
        });
        Message.success(`已撤销 ${res.revoked} 条会话`);
        await loadList();
      },
    });
  }

  onMounted(loadList);
</script>
