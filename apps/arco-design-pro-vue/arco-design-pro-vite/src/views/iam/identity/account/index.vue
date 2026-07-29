<template>
  <IamCrudPage
    :breadcrumb="['menu.iam', 'menu.iam.identity', 'menu.iam.identity.account']"
    title="账号管理"
    :columns="columns"
    :data="dataList"
    :loading="loading"
    :submitting="submitting"
    :visible="dialogVisible"
    :modal-title="dialogTitle"
    :pagination="pagination"
    @search="loadList"
    @reset="onReset"
    @create="onCreate"
    @submit="onSubmit"
    @cancel="dialogVisible = false"
    @page-change="onPageChange"
    @page-size-change="onPageSizeChange"
  >
    <template #filters>
      <a-form :model="filters" layout="inline">
        <a-form-item label="用户 ID">
          <a-input v-model="filters.userId" allow-clear />
        </a-form-item>
        <a-form-item label="Provider">
          <a-input v-model="filters.providerId" allow-clear />
        </a-form-item>
      </a-form>
    </template>
    <template #operations="{ record }">
      <a-space>
        <a-button type="text" size="small" @click="onEdit(record)"
          >编辑</a-button
        >
        <a-button
          type="text"
          size="small"
          status="danger"
          @click="confirmDelete(record, record.accountId)"
          >删除</a-button
        >
      </a-space>
    </template>
    <template #form>
      <a-form ref="formRef" :model="formModel" layout="vertical">
        <a-form-item
          v-if="!editingId"
          label="用户 ID"
          field="userId"
          :rules="[{ required: true, message: '请输入用户 ID' }]"
        >
          <a-input v-model="formModel.userId" />
        </a-form-item>
        <a-form-item
          v-if="!editingId"
          label="Provider"
          field="providerId"
          :rules="[{ required: true, message: '请输入 Provider' }]"
        >
          <a-input v-model="formModel.providerId" />
        </a-form-item>
        <a-form-item
          v-if="!editingId"
          label="账号 ID"
          field="accountId"
          :rules="[{ required: true, message: '请输入账号 ID' }]"
        >
          <a-input v-model="formModel.accountId" />
        </a-form-item>
        <a-form-item label="密码">
          <a-input-password v-model="formModel.password" />
        </a-form-item>
        <a-form-item label="Scope">
          <a-input v-model="formModel.scope" />
        </a-form-item>
      </a-form>
    </template>
  </IamCrudPage>
</template>

<script lang="ts" setup>
  import { computed, onMounted, reactive, ref } from 'vue';
  import type { FormInstance, TableColumnData } from '@arco-design/web-vue';
  import { useIamCrudPaginated } from '@/hooks/use-iam-crud';
  import {
    createAccount,
    deleteAccount,
    getAccounts,
    updateAccount,
    type AccountForm,
    type AccountItem,
  } from '@/api/iam/identity-account';
  import IamCrudPage from '../../components/iam-crud-page.vue';

  const filters = reactive({ userId: '', providerId: '' });
  const formRef = ref<FormInstance>();
  const formModel = reactive<AccountForm>({
    userId: '',
    providerId: '',
    accountId: '',
    password: '',
    scope: '',
  });

  const {
    loading,
    submitting,
    dataList,
    dialogVisible,
    dialogTitle,
    editingId,
    loadList,
    openCreate,
    openEdit,
    submitForm,
    confirmDelete,
    page,
    pageSize,
    total,
    onPageChange,
    onPageSizeChange,
  } = useIamCrudPaginated<AccountItem>({
    fetchList: ({ page: p, pageSize: ps }) =>
      getAccounts({
        page: p,
        pageSize: ps,
        userId: filters.userId || undefined,
        providerId: filters.providerId || undefined,
      }).then((res) => ({ items: res.items, total: res.total })),
    createItem: createAccount,
    updateItem: (id, data) => updateAccount(id, data),
    deleteItem: deleteAccount,
  });

  const pagination = computed(() => ({
    current: page.value,
    pageSize: pageSize.value,
    total: total.value,
    showTotal: true,
    showPageSize: true,
  }));

  const columns: TableColumnData[] = [
    { title: '账号 ID', dataIndex: 'accountId' },
    { title: 'Provider', dataIndex: 'providerId' },
    { title: '用户', dataIndex: 'userEmail' },
    { title: 'Scope', dataIndex: 'scope' },
    { title: '创建时间', dataIndex: 'createdAt' },
    { title: '操作', slotName: 'operations', width: 140 },
  ];

  function resetForm() {
    formModel.userId = '';
    formModel.providerId = '';
    formModel.accountId = '';
    formModel.password = '';
    formModel.scope = '';
  }

  function onReset() {
    filters.userId = '';
    filters.providerId = '';
    loadList();
  }

  function onCreate() {
    resetForm();
    openCreate('添加账号');
  }

  function onEdit(record: AccountItem) {
    resetForm();
    openEdit(record, '编辑账号');
    formModel.scope = record.scope ?? '';
  }

  async function onSubmit() {
    const err = await formRef.value?.validate();
    if (err) return;
    if (editingId.value) {
      await submitForm({
        scope: formModel.scope?.trim() || undefined,
        password: formModel.password || undefined,
      });
    } else {
      await submitForm({
        userId: formModel.userId.trim(),
        providerId: formModel.providerId.trim(),
        accountId: formModel.accountId.trim(),
        password: formModel.password || undefined,
        scope: formModel.scope?.trim() || undefined,
      });
    }
  }

  onMounted(loadList);
</script>
