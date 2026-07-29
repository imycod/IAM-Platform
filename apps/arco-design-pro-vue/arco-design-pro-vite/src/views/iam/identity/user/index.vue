<template>
  <IamCrudPage
    :breadcrumb="['menu.iam', 'menu.iam.identity.user']"
    title="用户管理"
    :columns="columns"
    :data="dataList as any"
    :loading="loading"
    :submitting="submitting"
    :visible="dialogVisible"
    :modal-title="dialogTitle"
    :pagination="{ total, current: page, pageSize }"
    @search="loadList"
    @reset="
      () => {
        statusFilter = '';
        loadList();
      }
    "
    @create="onCreate"
    @submit="onSubmit"
    @cancel="dialogVisible = false"
    @page-change="onPageChange"
    @page-size-change="onPageSizeChange"
  >
    <template #filters>
      <a-form :model="{ status: statusFilter }" layout="inline">
        <a-form-item label="状态">
          <a-select
            v-model="statusFilter"
            allow-clear
            :options="statusOptions"
            style="width: 140px"
          />
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
          @click="confirmDelete(record, record.email || record.name)"
          >删除</a-button
        >
      </a-space>
    </template>
    <template #form>
      <a-form ref="formRef" :model="formModel" layout="vertical">
        <a-form-item label="邮箱"
          ><a-input v-model="formModel.email"
        /></a-form-item>
        <a-form-item label="手机"
          ><a-input v-model="formModel.phone"
        /></a-form-item>
        <a-form-item label="姓名"
          ><a-input v-model="formModel.name"
        /></a-form-item>
        <a-form-item label="状态"
          ><a-select v-model="formModel.status" :options="statusOptions"
        /></a-form-item>
      </a-form>
    </template>
  </IamCrudPage>
</template>

<script lang="ts" setup>
  import { onMounted, reactive, ref } from 'vue';
  import type { FormInstance, TableColumnData } from '@arco-design/web-vue';
  import { useIamCrudPaginated } from '@/hooks/use-iam-crud';
  import {
    createIdentityUser,
    deleteIdentityUser,
    getIdentityUsers,
    updateIdentityUser,
    type IdentityUserForm,
    type IdentityUserItem,
  } from '@/api/iam/identity-user';
  import IamCrudPage from '../../components/iam-crud-page.vue';

  const statusOptions = [
    { label: '正常', value: 'active' },
    { label: '禁用', value: 'disabled' },
    { label: '锁定', value: 'locked' },
    { label: '待激活', value: 'pending' },
  ];
  const statusFilter = ref('');
  const formRef = ref<FormInstance>();
  const formModel = reactive<IdentityUserForm>({
    email: '',
    phone: '',
    name: '',
    status: 'pending',
  });
  const columns: TableColumnData[] = [
    { title: '邮箱', dataIndex: 'email' },
    { title: '手机', dataIndex: 'phone' },
    { title: '姓名', dataIndex: 'name' },
    { title: '状态', dataIndex: 'status' },
    { title: '最后登录', dataIndex: 'lastLoginAt' },
    { title: '操作', slotName: 'operations', width: 140 },
  ];
  const {
    loading,
    submitting,
    dataList,
    dialogVisible,
    dialogTitle,
    page,
    pageSize,
    total,
    loadList,
    onPageChange,
    onPageSizeChange,
    openCreate,
    openEdit,
    submitForm,
    confirmDelete,
  } = useIamCrudPaginated<IdentityUserItem>({
    fetchList: (p) =>
      getIdentityUsers({ ...p, status: statusFilter.value || undefined }),
    createItem: createIdentityUser,
    updateItem: updateIdentityUser,
    deleteItem: deleteIdentityUser,
  });
  function resetForm() {
    formModel.email = '';
    formModel.phone = '';
    formModel.name = '';
    formModel.status = 'pending';
  }
  function onCreate() {
    resetForm();
    openCreate('添加用户');
  }
  function onEdit(r: IdentityUserItem) {
    resetForm();
    openEdit(r, '编辑用户');
    Object.assign(formModel, {
      email: r.email || '',
      phone: r.phone || '',
      name: r.name || '',
      status: r.status,
    });
  }
  async function onSubmit() {
    if (await formRef.value?.validate()) return;
    await submitForm({ ...formModel });
  }
  onMounted(loadList);
</script>
