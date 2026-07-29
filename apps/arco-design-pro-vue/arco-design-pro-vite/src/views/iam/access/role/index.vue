<template>
  <IamCrudPage
    :breadcrumb="['menu.iam', 'menu.iam.access.role']"
    title="角色管理"
    :columns="columns"
    :data="filteredList as any"
    :loading="loading"
    :submitting="submitting"
    :visible="dialogVisible"
    :modal-title="dialogTitle"
    @search="loadList"
    @reset="
      () => {
        filters.name = '';
        filters.code = '';
      }
    "
    @create="onCreate"
    @submit="onSubmit"
    @cancel="dialogVisible = false"
  >
    <template #filters>
      <a-form :model="filters" layout="inline">
        <a-form-item label="名称"
          ><a-input v-model="filters.name" allow-clear
        /></a-form-item>
        <a-form-item label="编码"
          ><a-input v-model="filters.code" allow-clear
        /></a-form-item>
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
        <a-form-item label="角色名称" field="name" :rules="[{ required: true }]"
          ><a-input v-model="formModel.name"
        /></a-form-item>
        <a-form-item label="角色编码" field="code" :rules="[{ required: true }]"
          ><a-input v-model="formModel.code"
        /></a-form-item>
        <a-form-item label="类型"
          ><a-select v-model="formModel.type" :options="typeOptions"
        /></a-form-item>
        <a-form-item label="描述"
          ><a-textarea v-model="formModel.description as string"
        /></a-form-item>
      </a-form>
    </template>
  </IamCrudPage>
</template>

<script lang="ts" setup>
  import { computed, onMounted, reactive, ref } from 'vue';
  import type { FormInstance, TableColumnData } from '@arco-design/web-vue';
  import { useIamCrud } from '@/hooks/use-iam-crud';
  import {
    createRole,
    deleteRole,
    getRoles,
    updateRole,
    type RoleForm,
    type RoleItem,
    type RoleType,
  } from '@/api/iam/role';
  import IamCrudPage from '../../components/iam-crud-page.vue';

  const filters = reactive({ name: '', code: '' });
  const typeOptions = [
    { label: '系统', value: 'system' },
    { label: '自定义', value: 'custom' },
    { label: '应用', value: 'application' },
  ];
  const formRef = ref<FormInstance>();
  const formModel = reactive<RoleForm>({
    name: '',
    code: '',
    type: 'application',
    description: '',
  });
  const columns: TableColumnData[] = [
    { title: '角色名称', dataIndex: 'name' },
    { title: '编码', dataIndex: 'code' },
    { title: '类型', dataIndex: 'type' },
    { title: '描述', dataIndex: 'description' },
    { title: '操作', slotName: 'operations', width: 140 },
  ];
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
  } = useIamCrud<RoleItem>({
    fetchList: () => getRoles({ all: true }),
    createItem: createRole,
    updateItem: updateRole,
    deleteItem: deleteRole,
  });
  const filteredList = computed(() =>
    dataList.value.filter((r) => {
      const n =
        !filters.name ||
        r.name.toLowerCase().includes(filters.name.trim().toLowerCase());
      const c =
        !filters.code ||
        r.code.toLowerCase().includes(filters.code.trim().toLowerCase());
      return n && c;
    })
  );
  function resetForm() {
    formModel.name = '';
    formModel.code = '';
    formModel.type = 'application';
    formModel.description = '';
  }
  function onCreate() {
    resetForm();
    openCreate('添加角色');
  }
  function onEdit(r: RoleItem) {
    resetForm();
    openEdit(r, '编辑角色');
    Object.assign(formModel, {
      name: r.name,
      code: r.code,
      type: r.type as RoleType,
      description: r.description || '',
    });
  }
  async function onSubmit() {
    if (await formRef.value?.validate()) return;
    await submitForm({
      ...formModel,
      name: formModel.name.trim(),
      code: formModel.code.trim(),
    });
  }
  onMounted(loadList);
</script>
