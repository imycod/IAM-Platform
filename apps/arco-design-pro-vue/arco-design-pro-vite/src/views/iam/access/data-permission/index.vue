<template>
  <IamCrudPage
    :breadcrumb="[
      'menu.iam',
      'menu.iam.access',
      'menu.iam.access.dataPermission',
    ]"
    title="数据权限"
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
        <a-form-item label="角色 ID">
          <a-input v-model="filters.roleId" allow-clear />
        </a-form-item>
        <a-form-item label="资源">
          <a-input v-model="filters.resource" allow-clear />
        </a-form-item>
      </a-form>
    </template>
    <template #scope="{ record }">
      {{ scopeLabelMap[record.scope] ?? record.scope }}
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
          @click="confirmDelete(record, record.resource)"
          >删除</a-button
        >
      </a-space>
    </template>
    <template #form>
      <a-form ref="formRef" :model="formModel" layout="vertical">
        <a-form-item
          label="角色"
          field="roleId"
          :rules="[{ required: true, message: '请选择角色' }]"
        >
          <a-select v-model="formModel.roleId" :options="roleOptions" />
        </a-form-item>
        <a-form-item
          label="资源"
          field="resource"
          :rules="[{ required: true, message: '请选择资源' }]"
        >
          <a-select
            v-model="formModel.resource"
            :options="resourceOptions"
            allow-search
          />
        </a-form-item>
        <a-form-item
          label="数据范围"
          field="scope"
          :rules="[{ required: true, message: '请选择范围' }]"
        >
          <a-select v-model="formModel.scope" :options="scopeOptions" />
        </a-form-item>
        <a-form-item v-if="formModel.scope === 'all'" label="跨组织可见">
          <a-switch v-model="formModel.unrestricted" />
        </a-form-item>
      </a-form>
    </template>
  </IamCrudPage>
</template>

<script lang="ts" setup>
  import { onMounted, reactive, ref } from 'vue';
  import type { FormInstance, TableColumnData } from '@arco-design/web-vue';
  import { useIamCrud } from '@/hooks/use-iam-crud';
  import { getResources } from '@/api/iam/resource';
  import { getRoles } from '@/api/iam/role';
  import {
    createDataPermission,
    deleteDataPermission,
    getDataPermissions,
    updateDataPermission,
    type DataPermissionForm,
    type DataPermissionItem,
    type DataScope,
  } from '@/api/iam/data-permission';
  import IamCrudPage from '../../components/iam-crud-page.vue';

  const filters = reactive({ roleId: '', resource: '' });
  const formRef = ref<FormInstance>();
  const roleOptions = ref<{ label: string; value: string }[]>([]);
  const resourceOptions = ref<{ label: string; value: string }[]>([]);
  const formModel = reactive<DataPermissionForm>({
    roleId: '',
    resource: '',
    scope: 'self',
    unrestricted: false,
  });

  const scopeOptions = [
    { label: '仅本人', value: 'self' },
    { label: '本部门', value: 'dept' },
    { label: '本部门及子部门', value: 'dept_and_child' },
    { label: '全部', value: 'all' },
    { label: '自定义', value: 'custom' },
  ];
  const scopeLabelMap = Object.fromEntries(
    scopeOptions.map((o) => [o.value, o.label])
  );

  const {
    loading,
    submitting,
    dataList,
    dialogVisible,
    dialogTitle,
    loadList,
    openCreate,
    openEdit,
    submitForm,
    confirmDelete,
  } = useIamCrud<DataPermissionItem>({
    fetchList: () =>
      getDataPermissions({
        roleId: filters.roleId || undefined,
        resource: filters.resource || undefined,
      }),
    createItem: createDataPermission,
    updateItem: updateDataPermission,
    deleteItem: deleteDataPermission,
  });

  const columns: TableColumnData[] = [
    { title: '角色', dataIndex: 'roleName' },
    { title: '资源', dataIndex: 'resource' },
    { title: '范围', slotName: 'scope' },
    {
      title: '跨组织',
      render: ({ record }) => (record.unrestricted ? '是' : '否'),
    },
    { title: '操作', slotName: 'operations', width: 140 },
  ];

  async function loadOptions() {
    const [roles, resources] = await Promise.all([
      getRoles({ all: true }),
      getResources(),
    ]);
    roleOptions.value = roles.map((r) => ({
      label: `${r.name} (${r.code})`,
      value: r.id,
    }));
    resourceOptions.value = resources.map((r) => ({
      label: `${r.name} (${r.code})`,
      value: r.code,
    }));
  }

  function resetForm() {
    formModel.roleId = '';
    formModel.resource = '';
    formModel.scope = 'self';
    formModel.unrestricted = false;
  }

  function onReset() {
    filters.roleId = '';
    filters.resource = '';
    loadList();
  }

  function onCreate() {
    resetForm();
    openCreate('添加数据权限');
  }

  function onEdit(record: DataPermissionItem) {
    resetForm();
    openEdit(record, '编辑数据权限');
    formModel.roleId = record.roleId;
    formModel.resource = record.resource;
    formModel.scope = record.scope as DataScope;
    formModel.unrestricted = record.unrestricted ?? false;
  }

  async function onSubmit() {
    const err = await formRef.value?.validate();
    if (err) return;
    await submitForm({ ...formModel });
  }

  onMounted(async () => {
    await loadOptions();
    await loadList();
  });
</script>
