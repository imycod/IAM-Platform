<template>
  <IamCrudPage
    :breadcrumb="[
      'menu.iam',
      'menu.iam.identity',
      'menu.iam.identity.loginHistory',
    ]"
    title="登录历史"
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
        <a-form-item label="应用编码">
          <a-input v-model="filters.applicationCode" allow-clear />
        </a-form-item>
        <a-form-item label="结果">
          <a-select
            v-model="filters.success"
            :options="successOptions"
            allow-clear
            placeholder="全部"
            style="width: 100px"
          />
        </a-form-item>
      </a-form>
    </template>
    <template #success="{ record }">
      <a-tag :color="record.success ? 'green' : 'red'">{{
        record.success ? '成功' : '失败'
      }}</a-tag>
    </template>
    <template #operations="{ record }">
      <a-button
        type="text"
        size="small"
        status="danger"
        @click="confirmDelete(record)"
        >删除</a-button
      >
    </template>
  </IamCrudPage>
</template>

<script lang="ts" setup>
  import { computed, onMounted, reactive } from 'vue';
  import type { TableColumnData } from '@arco-design/web-vue';
  import { useIamCrudPaginated } from '@/hooks/use-iam-crud';
  import {
    deleteLoginHistory,
    getLoginHistories,
    type LoginHistoryItem,
  } from '@/api/iam/identity-login-history';
  import IamCrudPage from '../../components/iam-crud-page.vue';

  const filters = reactive({
    userId: '',
    applicationCode: '',
    success: '' as '' | 'true' | 'false',
  });

  const successOptions = [
    { label: '成功', value: 'true' },
    { label: '失败', value: 'false' },
  ];

  const {
    loading,
    dataList,
    loadList,
    confirmDelete,
    page,
    pageSize,
    total,
    onPageChange,
    onPageSizeChange,
  } = useIamCrudPaginated<LoginHistoryItem>({
    fetchList: ({ page: p, pageSize: ps }) =>
      getLoginHistories({
        page: p,
        pageSize: ps,
        userId: filters.userId || undefined,
        applicationCode: filters.applicationCode || undefined,
        success:
          filters.success === '' ? undefined : filters.success === 'true',
      }).then((res) => ({ items: res.items, total: res.total })),
    deleteItem: deleteLoginHistory,
  });

  const pagination = computed(() => ({
    current: page.value,
    pageSize: pageSize.value,
    total: total.value,
    showTotal: true,
    showPageSize: true,
  }));

  const columns: TableColumnData[] = [
    { title: '结果', slotName: 'success', width: 80 },
    { title: '标识符', dataIndex: 'identifier' },
    { title: '用户 ID', dataIndex: 'userId' },
    { title: '应用', dataIndex: 'applicationName' },
    { title: 'IP', dataIndex: 'ip' },
    { title: '失败原因', dataIndex: 'failReason' },
    { title: '时间', dataIndex: 'createdAt' },
    { title: '操作', slotName: 'operations', width: 80 },
  ];

  function onReset() {
    filters.userId = '';
    filters.applicationCode = '';
    filters.success = '';
    loadList();
  }

  onMounted(loadList);
</script>
