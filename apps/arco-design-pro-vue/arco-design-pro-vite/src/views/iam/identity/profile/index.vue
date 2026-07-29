<template>
  <IamCrudPage
    :breadcrumb="['menu.iam', 'menu.iam.identity', 'menu.iam.identity.profile']"
    title="用户资料"
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
        <a-button type="text" size="small" @click="onEdit(record)"
          >编辑</a-button
        >
        <a-button
          type="text"
          size="small"
          status="danger"
          @click="confirmDelete(record, record.nickname ?? record.id)"
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
          <a-input v-model="formModel.userId" :disabled="!!editingId" />
        </a-form-item>
        <a-form-item label="昵称">
          <a-input v-model="formModel.nickname" />
        </a-form-item>
        <a-form-item label="性别">
          <a-select v-model="formModel.gender" :options="genderOptions" />
        </a-form-item>
        <a-form-item label="语言">
          <a-input v-model="formModel.language" />
        </a-form-item>
        <a-form-item label="时区">
          <a-input v-model="formModel.timezone" />
        </a-form-item>
        <a-form-item label="简介">
          <a-textarea v-model="formModel.bio" />
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
    createProfile,
    deleteProfile,
    getProfiles,
    updateProfile,
    type ProfileForm,
    type ProfileItem,
  } from '@/api/iam/identity-profile';
  import IamCrudPage from '../../components/iam-crud-page.vue';

  const filters = reactive({ userId: '' });
  const formRef = ref<FormInstance>();
  const formModel = reactive<ProfileForm>({
    userId: '',
    nickname: '',
    gender: 'unknown',
    language: 'zh-CN',
    timezone: 'Asia/Shanghai',
    bio: '',
  });

  const genderOptions = [
    { label: '未知', value: 'unknown' },
    { label: '男', value: 'male' },
    { label: '女', value: 'female' },
  ];

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
  } = useIamCrudPaginated<ProfileItem>({
    fetchList: ({ page: p, pageSize: ps }) =>
      getProfiles({
        page: p,
        pageSize: ps,
        userId: filters.userId || undefined,
      }).then((res) => ({ items: res.items, total: res.total })),
    createItem: createProfile,
    updateItem: updateProfile,
    deleteItem: deleteProfile,
  });

  const pagination = computed(() => ({
    current: page.value,
    pageSize: pageSize.value,
    total: total.value,
    showTotal: true,
    showPageSize: true,
  }));

  const columns: TableColumnData[] = [
    { title: '昵称', dataIndex: 'nickname' },
    {
      title: '用户',
      render: ({ record }) =>
        record.user?.email ?? record.user?.name ?? record.userId,
    },
    { title: '性别', dataIndex: 'gender' },
    { title: '语言', dataIndex: 'language' },
    { title: '时区', dataIndex: 'timezone' },
    { title: '操作', slotName: 'operations', width: 140 },
  ];

  function resetForm() {
    formModel.userId = '';
    formModel.nickname = '';
    formModel.gender = 'unknown';
    formModel.language = 'zh-CN';
    formModel.timezone = 'Asia/Shanghai';
    formModel.bio = '';
  }

  function onReset() {
    filters.userId = '';
    loadList();
  }

  function onCreate() {
    resetForm();
    openCreate('添加资料');
  }

  function onEdit(record: ProfileItem) {
    resetForm();
    openEdit(record, '编辑资料');
    formModel.userId = record.userId;
    formModel.nickname = record.nickname ?? '';
    formModel.gender = record.gender;
    formModel.language = record.language;
    formModel.timezone = record.timezone;
    formModel.bio = record.bio ?? '';
  }

  async function onSubmit() {
    const err = await formRef.value?.validate();
    if (err) return;
    await submitForm({ ...formModel });
  }

  onMounted(loadList);
</script>
