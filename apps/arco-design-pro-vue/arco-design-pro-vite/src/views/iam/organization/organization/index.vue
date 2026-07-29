<template>
  <IamCrudPage
    :breadcrumb="['menu.iam', 'menu.iam.organization.list']"
    title="组织管理"
    :columns="columns"
    :data="dataList"
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
          label="组织名称"
          field="name"
          :rules="[{ required: true, message: '请输入组织名称' }]"
        >
          <a-input v-model="formModel.name" />
        </a-form-item>
        <a-form-item
          label="组织编码"
          field="code"
          :rules="[{ required: true, message: '请输入组织编码' }]"
        >
          <a-input v-model="formModel.code" />
        </a-form-item>
        <a-form-item label="类型">
          <a-select v-model="formModel.type" :options="typeOptions" />
        </a-form-item>
        <a-form-item label="状态">
          <a-select v-model="formModel.status" :options="statusOptions" />
        </a-form-item>
        <a-form-item label="排序">
          <a-input-number v-model="formModel.sort" :min="0" />
        </a-form-item>
      </a-form>
    </template>
  </IamCrudPage>
</template>

<script lang="ts" setup>
  import { computed, reactive, ref, onMounted } from 'vue';
  import type { FormInstance, TableColumnData } from '@arco-design/web-vue';
  import { useIamCrud } from '@/hooks/use-iam-crud';
  import {
    createOrganization,
    deleteOrganization,
    getOrganizations,
    updateOrganization,
    type OrganizationForm,
    type OrganizationItem,
  } from '@/api/iam/organization';
  import IamCrudPage from '../../components/iam-crud-page.vue';

  const filters = reactive({ name: '', code: '' });
  const formRef = ref<FormInstance>();
  const formModel = reactive<OrganizationForm>({
    name: '',
    code: '',
    type: 'company',
    status: 'active',
    sort: 0,
  });

  const typeOptions = [
    { label: '公司', value: 'company' },
    { label: '部门', value: 'department' },
  ];
  const statusOptions = [
    { label: '启用', value: 'active' },
    { label: '停用', value: 'inactive' },
  ];

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
  } = useIamCrud<OrganizationItem>({
    fetchList: getOrganizations,
    createItem: createOrganization,
    updateItem: updateOrganization,
    deleteItem: deleteOrganization,
  });

  const dataList = computed(() =>
    rawList.value.filter((row) => {
      const nameOk =
        !filters.name ||
        row.name.toLowerCase().includes(filters.name.trim().toLowerCase());
      const codeOk =
        !filters.code ||
        row.code.toLowerCase().includes(filters.code.trim().toLowerCase());
      return nameOk && codeOk;
    })
  );

  const columns: TableColumnData[] = [
    { title: '组织名称', dataIndex: 'name' },
    { title: '组织编码', dataIndex: 'code' },
    { title: '类型', dataIndex: 'type' },
    { title: '状态', dataIndex: 'status' },
    { title: '排序', dataIndex: 'sort' },
    { title: '操作', slotName: 'operations', width: 140 },
  ];

  function resetForm() {
    formModel.name = '';
    formModel.code = '';
    formModel.type = 'company';
    formModel.status = 'active';
    formModel.sort = 0;
  }

  function onCreate() {
    resetForm();
    openCreate('添加组织');
  }

  function onEdit(record: OrganizationItem) {
    resetForm();
    openEdit(record, '编辑组织');
    formModel.name = record.name;
    formModel.code = record.code;
    formModel.type = record.type;
    formModel.status = record.status;
    formModel.sort = record.sort;
  }

  async function onSubmit() {
    const err = await formRef.value?.validate();
    if (err) return;
    await submitForm({
      name: formModel.name.trim(),
      code: formModel.code.trim(),
      type: formModel.type,
      status: formModel.status,
      sort: formModel.sort ?? 0,
    });
  }

  onMounted(loadList);
</script>
