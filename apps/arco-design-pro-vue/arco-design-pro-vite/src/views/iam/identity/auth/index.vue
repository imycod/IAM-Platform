<template>
  <IamCrudPage
    :breadcrumb="['menu.iam', 'menu.iam.identity', 'menu.iam.identity.auth']"
    title="凭证管理"
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
      </a-form>
    </template>
    <template #operations="{ record }">
      <a-space>
        <a-button type="text" size="small" @click="onResetPassword(record)"
          >重置密码</a-button
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
          label="用户 ID"
          field="userId"
          :rules="[{ required: true, message: '请输入用户 ID' }]"
        >
          <a-input v-model="formModel.userId" />
        </a-form-item>
        <a-form-item label="初始密码">
          <a-input-password
            v-model="formModel.password"
            placeholder="默认 123456"
          />
        </a-form-item>
      </a-form>
    </template>
  </IamCrudPage>
</template>

<script lang="ts" setup>
  import { computed, onMounted, reactive, ref } from 'vue';
  import { Message, Modal } from '@arco-design/web-vue';
  import type { FormInstance, TableColumnData } from '@arco-design/web-vue';
  import { useIamCrudPaginated } from '@/hooks/use-iam-crud';
  import {
    createAuthCredential,
    deleteAuthCredential,
    getAuthCredentials,
    updateAuthCredential,
    type AuthCredentialItem,
    type CredentialForm,
  } from '@/api/iam/identity-auth';
  import IamCrudPage from '../../components/iam-crud-page.vue';

  const DEFAULT_PASSWORD = '123456';
  const filters = reactive({ userId: '' });
  const formRef = ref<FormInstance>();
  const formModel = reactive<CredentialForm>({
    userId: '',
    password: DEFAULT_PASSWORD,
  });

  const {
    loading,
    submitting,
    dataList,
    dialogVisible,
    dialogTitle,
    loadList,
    openCreate,
    submitForm,
    confirmDelete,
    page,
    pageSize,
    total,
    onPageChange,
    onPageSizeChange,
  } = useIamCrudPaginated<AuthCredentialItem>({
    fetchList: ({ page: p, pageSize: ps }) =>
      getAuthCredentials({
        page: p,
        pageSize: ps,
        userId: filters.userId || undefined,
      }).then((res) => ({ items: res.items, total: res.total })),
    createItem: createAuthCredential,
    deleteItem: deleteAuthCredential,
  });

  const pagination = computed(() => ({
    current: page.value,
    pageSize: pageSize.value,
    total: total.value,
    showTotal: true,
    showPageSize: true,
  }));

  const columns: TableColumnData[] = [
    { title: '登录邮箱', dataIndex: 'accountId' },
    { title: '姓名', render: ({ record }) => record.user?.name ?? '-' },
    { title: '电话', render: ({ record }) => record.user?.phone ?? '-' },
    { title: '用户 ID', dataIndex: 'userId' },
    { title: '创建时间', dataIndex: 'createdAt' },
    { title: '操作', slotName: 'operations', width: 180 },
  ];

  function resetForm() {
    formModel.userId = '';
    formModel.password = DEFAULT_PASSWORD;
  }

  function onReset() {
    filters.userId = '';
    loadList();
  }

  function onCreate() {
    resetForm();
    openCreate('开通凭证');
  }

  async function onSubmit() {
    const err = await formRef.value?.validate();
    if (err) return;
    await submitForm({
      userId: formModel.userId.trim(),
      password: formModel.password?.trim() || DEFAULT_PASSWORD,
    });
  }

  function onResetPassword(record: AuthCredentialItem) {
    Modal.confirm({
      title: '重置密码',
      content: `确定重置「${record.accountId}」的密码吗？`,
      onOk: async () => {
        await updateAuthCredential(record.id, { password: DEFAULT_PASSWORD });
        Message.success('密码已重置');
        await loadList();
      },
    });
  }

  onMounted(loadList);
</script>
