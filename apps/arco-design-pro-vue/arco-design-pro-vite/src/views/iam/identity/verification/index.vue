<template>
  <IamCrudPage
    :breadcrumb="[
      'menu.iam',
      'menu.iam.identity',
      'menu.iam.identity.verification',
    ]"
    title="验证码管理"
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
        <a-form-item label="标识符">
          <a-input v-model="filters.identifier" allow-clear />
        </a-form-item>
        <a-form-item label="类型">
          <a-input v-model="filters.type" allow-clear />
        </a-form-item>
      </a-form>
    </template>
    <template #operations="{ record }">
      <a-space>
        <a-button
          type="text"
          size="small"
          status="danger"
          @click="confirmDelete(record, record.identifier)"
          >删除</a-button
        >
      </a-space>
    </template>
    <template #form>
      <a-form ref="formRef" :model="formModel" layout="vertical">
        <a-form-item
          label="标识符"
          field="identifier"
          :rules="[{ required: true, message: '请输入标识符' }]"
        >
          <a-input v-model="formModel.identifier" />
        </a-form-item>
        <a-form-item
          label="验证码"
          field="value"
          :rules="[{ required: true, message: '请输入验证码' }]"
        >
          <a-input v-model="formModel.value" />
        </a-form-item>
        <a-form-item
          label="类型"
          field="type"
          :rules="[{ required: true, message: '请输入类型' }]"
        >
          <a-input
            v-model="formModel.type"
            placeholder="email / phone / reset_password"
          />
        </a-form-item>
        <a-form-item label="TTL（秒）">
          <a-input-number v-model="formModel.ttlSeconds" :min="60" />
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
    createVerification,
    deleteVerification,
    getVerifications,
    type VerificationForm,
    type VerificationItem,
  } from '@/api/iam/identity-verification';
  import IamCrudPage from '../../components/iam-crud-page.vue';

  const filters = reactive({ identifier: '', type: '' });
  const formRef = ref<FormInstance>();
  const formModel = reactive<VerificationForm>({
    identifier: '',
    value: '',
    type: 'email',
    ttlSeconds: 300,
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
  } = useIamCrudPaginated<VerificationItem>({
    fetchList: ({ page: p, pageSize: ps }) =>
      getVerifications({
        page: p,
        pageSize: ps,
        identifier: filters.identifier || undefined,
        type: filters.type || undefined,
      }).then((res) => ({ items: res.items, total: res.total })),
    createItem: createVerification,
    deleteItem: deleteVerification,
  });

  const pagination = computed(() => ({
    current: page.value,
    pageSize: pageSize.value,
    total: total.value,
    showTotal: true,
    showPageSize: true,
  }));

  const columns: TableColumnData[] = [
    { title: '标识符', dataIndex: 'identifier' },
    { title: '类型', dataIndex: 'type' },
    { title: '过期时间', dataIndex: 'expiresAt' },
    { title: '使用时间', dataIndex: 'consumedAt' },
    { title: '创建时间', dataIndex: 'createdAt' },
    { title: '操作', slotName: 'operations', width: 80 },
  ];

  function resetForm() {
    formModel.identifier = '';
    formModel.value = '';
    formModel.type = 'email';
    formModel.ttlSeconds = 300;
  }

  function onReset() {
    filters.identifier = '';
    filters.type = '';
    loadList();
  }

  function onCreate() {
    resetForm();
    openCreate('创建验证码');
  }

  async function onSubmit() {
    const err = await formRef.value?.validate();
    if (err) return;
    await submitForm({ ...formModel });
  }

  onMounted(loadList);
</script>
