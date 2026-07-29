<template>
  <IamCrudPage
    :breadcrumb="['menu.iam', 'menu.iam.application.app']"
    title="应用管理"
    :columns="columns"
    :data="dataList as any"
    :loading="loading"
    :submitting="submitting"
    :visible="dialogVisible"
    :modal-title="dialogTitle"
    @search="loadList"
    @reset="loadList"
    @create="onCreate"
    @submit="onSubmit"
    @cancel="dialogVisible = false"
  >
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
        <a-form-item label="应用名称" field="name" :rules="[{ required: true }]"
          ><a-input v-model="formModel.name"
        /></a-form-item>
        <a-form-item label="应用编码" field="code" :rules="[{ required: true }]"
          ><a-input v-model="formModel.code"
        /></a-form-item>
        <a-form-item label="类型"
          ><a-input v-model="formModel.type"
        /></a-form-item>
        <a-form-item label="状态"
          ><a-select
            v-model="formModel.status"
            :options="[
              { label: '启用', value: 'active' },
              { label: '停用', value: 'inactive' },
            ]"
        /></a-form-item>
        <a-form-item label="描述"
          ><a-textarea v-model="formModel.description as string"
        /></a-form-item>
      </a-form>
    </template>
  </IamCrudPage>
</template>

<script lang="ts" setup>
  import { onMounted, reactive, ref } from 'vue';
  import type { FormInstance, TableColumnData } from '@arco-design/web-vue';
  import { useIamCrud } from '@/hooks/use-iam-crud';
  import {
    createApplication,
    deleteApplication,
    getApplications,
    updateApplication,
    type ApplicationForm,
    type ApplicationItem,
  } from '@/api/iam/application';
  import IamCrudPage from '../../components/iam-crud-page.vue';

  const formRef = ref<FormInstance>();
  const formModel = reactive<ApplicationForm>({
    name: '',
    code: '',
    type: 'web',
    status: 'active',
    description: '',
  });
  const columns: TableColumnData[] = [
    { title: '名称', dataIndex: 'name' },
    { title: '编码', dataIndex: 'code' },
    { title: '类型', dataIndex: 'type' },
    { title: '状态', dataIndex: 'status' },
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
  } = useIamCrud<ApplicationItem>({
    fetchList: getApplications,
    createItem: createApplication,
    updateItem: updateApplication,
    deleteItem: deleteApplication,
  });
  function resetForm() {
    formModel.name = '';
    formModel.code = '';
    formModel.type = 'web';
    formModel.status = 'active';
    formModel.description = '';
  }
  function onCreate() {
    resetForm();
    openCreate('添加应用');
  }
  function onEdit(r: ApplicationItem) {
    resetForm();
    openEdit(r, '编辑应用');
    Object.assign(formModel, {
      name: r.name,
      code: r.code,
      type: r.type,
      status: r.status,
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
