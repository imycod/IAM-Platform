<template>
  <IamCrudPage
    :breadcrumb="['menu.iam', 'menu.iam.access', 'menu.iam.access.resource']"
    title="资源管理"
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
    <template #extra-actions>
      <a-button @click="onSync">从权限同步</a-button>
    </template>
    <template #filters>
      <a-form :model="filters" layout="inline">
        <a-form-item label="名称">
          <a-input v-model="filters.name" allow-clear />
        </a-form-item>
        <a-form-item label="编码">
          <a-input v-model="filters.code" allow-clear />
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
          label="资源名称"
          field="name"
          :rules="[{ required: true, message: '请输入资源名称' }]"
        >
          <a-input v-model="formModel.name" />
        </a-form-item>
        <a-form-item
          label="资源编码"
          field="code"
          :rules="[{ required: true, message: '请输入资源编码' }]"
        >
          <a-input v-model="formModel.code" />
        </a-form-item>
        <a-form-item label="类型">
          <a-input v-model="formModel.type" />
        </a-form-item>
      </a-form>
    </template>
  </IamCrudPage>
</template>

<script lang="ts" setup>
  import { computed, onMounted, reactive, ref } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import type { FormInstance, TableColumnData } from '@arco-design/web-vue';
  import { useIamCrud } from '@/hooks/use-iam-crud';
  import {
    createResource,
    deleteResource,
    getResources,
    syncResourcesFromPermissions,
    updateResource,
    type ResourceForm,
    type ResourceItem,
  } from '@/api/iam/resource';
  import IamCrudPage from '../../components/iam-crud-page.vue';

  const filters = reactive({ name: '', code: '' });
  const formRef = ref<FormInstance>();
  const formModel = reactive<ResourceForm>({ name: '', code: '', type: '' });

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
  } = useIamCrud<ResourceItem>({
    fetchList: () =>
      getResources({
        name: filters.name || undefined,
        code: filters.code || undefined,
      }),
    createItem: createResource,
    updateItem: updateResource,
    deleteItem: deleteResource,
  });

  const dataList = computed(() => rawList.value);

  const columns: TableColumnData[] = [
    { title: '资源名称', dataIndex: 'name' },
    { title: '资源编码', dataIndex: 'code' },
    { title: '类型', dataIndex: 'type' },
    { title: '操作', slotName: 'operations', width: 140 },
  ];

  function resetForm() {
    formModel.name = '';
    formModel.code = '';
    formModel.type = '';
  }

  function onReset() {
    filters.name = '';
    filters.code = '';
    loadList();
  }

  function onCreate() {
    resetForm();
    openCreate('添加资源');
  }

  function onEdit(record: ResourceItem) {
    resetForm();
    openEdit(record, '编辑资源');
    formModel.name = record.name;
    formModel.code = record.code;
    formModel.type = record.type ?? '';
  }

  async function onSubmit() {
    const err = await formRef.value?.validate();
    if (err) return;
    await submitForm({
      name: formModel.name.trim(),
      code: formModel.code.trim(),
      type: formModel.type || undefined,
    });
  }

  async function onSync() {
    const res = await syncResourcesFromPermissions();
    Message.success(`同步完成：新建 ${res.created}，跳过 ${res.skipped}`);
    await loadList();
  }

  onMounted(loadList);
</script>
