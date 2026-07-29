<template>
  <IamCrudPage
    :breadcrumb="['menu.iam', 'menu.iam.access', 'menu.iam.access.permission']"
    title="权限管理"
    :columns="columns"
    :data="dataList"
    :loading="loading"
    :submitting="submitting"
    :visible="dialogVisible"
    :modal-title="dialogTitle"
    @search="loadList"
    @reset="onReset"
    @create="onCreate"
    @submit="onSubmit"
    @cancel="dialogVisible = false"
  >
    <template #filters>
      <a-form :model="filters" layout="inline">
        <a-form-item label="名称">
          <a-input v-model="filters.name" allow-clear />
        </a-form-item>
        <a-form-item label="编码">
          <a-input v-model="filters.code" allow-clear />
        </a-form-item>
        <a-form-item label="资源">
          <a-input v-model="filters.resource" allow-clear />
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
          @click="confirmDelete(record, record.name)"
          >删除</a-button
        >
      </a-space>
    </template>
    <template #form>
      <a-form ref="formRef" :model="formModel" layout="vertical">
        <a-form-item
          label="权限名称"
          field="name"
          :rules="[{ required: true, message: '请输入权限名称' }]"
        >
          <a-input v-model="formModel.name" />
        </a-form-item>
        <a-form-item
          label="权限编码"
          field="code"
          :rules="[{ required: true, message: '请输入权限编码' }]"
        >
          <a-input v-model="formModel.code" />
        </a-form-item>
        <a-form-item
          label="资源"
          field="resource"
          :rules="[{ required: true, message: '请输入资源' }]"
        >
          <a-input v-model="formModel.resource" />
        </a-form-item>
        <a-form-item
          label="操作"
          field="action"
          :rules="[{ required: true, message: '请输入操作' }]"
        >
          <a-input
            v-model="formModel.action"
            placeholder="read / write / delete"
          />
        </a-form-item>
        <a-form-item label="应用">
          <a-select
            v-model="formModel.applicationId"
            :options="appOptions"
            allow-clear
            placeholder="平台级"
          />
        </a-form-item>
      </a-form>
    </template>
  </IamCrudPage>
</template>

<script lang="ts" setup>
  import { computed, onMounted, reactive, ref } from 'vue';
  import type { FormInstance, TableColumnData } from '@arco-design/web-vue';
  import { useIamCrud } from '@/hooks/use-iam-crud';
  import { getApplications } from '@/api/iam/application';
  import {
    createPermission,
    deletePermission,
    getPermissions,
    updatePermission,
    type PermissionForm,
    type PermissionItem,
  } from '@/api/iam/permission';
  import IamCrudPage from '../../components/iam-crud-page.vue';

  const filters = reactive({ name: '', code: '', resource: '' });
  const formRef = ref<FormInstance>();
  const appOptions = ref<{ label: string; value: string }[]>([]);
  const formModel = reactive<PermissionForm>({
    name: '',
    code: '',
    resource: '',
    action: 'read',
    applicationId: undefined,
  });

  const {
    loading,
    submitting,
    dataList: rawList,
    dialogVisible,
    dialogTitle,
    loadList,
    openCreate,
    openEdit,
    submitForm,
    confirmDelete,
  } = useIamCrud<PermissionItem>({
    fetchList: () =>
      getPermissions({
        name: filters.name || undefined,
        code: filters.code || undefined,
        resource: filters.resource || undefined,
      }),
    createItem: createPermission,
    updateItem: updatePermission,
    deleteItem: deletePermission,
  });

  const dataList = computed(() => rawList.value);

  const columns: TableColumnData[] = [
    { title: '权限名称', dataIndex: 'name' },
    { title: '权限编码', dataIndex: 'code' },
    { title: '资源', dataIndex: 'resource' },
    { title: '操作', dataIndex: 'action' },
    {
      title: '应用',
      render: ({ record }) => record.application?.name ?? '平台级',
    },
    { title: '操作', slotName: 'operations', width: 140 },
  ];

  async function loadApps() {
    const apps = await getApplications();
    appOptions.value = apps.map((a) => ({ label: a.name, value: a.id }));
  }

  function resetForm() {
    formModel.name = '';
    formModel.code = '';
    formModel.resource = '';
    formModel.action = 'read';
    formModel.applicationId = undefined;
  }

  function onReset() {
    filters.name = '';
    filters.code = '';
    filters.resource = '';
    loadList();
  }

  function onCreate() {
    resetForm();
    openCreate('添加权限');
  }

  function onEdit(record: PermissionItem) {
    resetForm();
    openEdit(record, '编辑权限');
    formModel.name = record.name;
    formModel.code = record.code;
    formModel.resource = record.resource;
    formModel.action = record.action;
    formModel.applicationId = record.applicationId ?? undefined;
  }

  async function onSubmit() {
    const err = await formRef.value?.validate();
    if (err) return;
    await submitForm({
      ...formModel,
      name: formModel.name.trim(),
      code: formModel.code.trim(),
    });
  }

  onMounted(async () => {
    await loadApps();
    await loadList();
  });
</script>
