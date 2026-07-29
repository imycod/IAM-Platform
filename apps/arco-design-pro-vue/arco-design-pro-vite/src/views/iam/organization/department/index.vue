<template>
  <IamCrudPage
    :breadcrumb="['menu.iam', 'menu.iam.organization.department']"
    title="部门管理"
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
    <template #filters>
      <a-form :model="{ org: filterOrgId }" layout="inline">
        <a-form-item label="组织">
          <a-select
            v-model="filterOrgId"
            :options="orgOptions"
            style="width: 220px"
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
          @click="confirmDelete(record, record.name)"
          >删除</a-button
        >
      </a-space>
    </template>
    <template #form>
      <a-form ref="formRef" :model="formModel" layout="vertical">
        <a-form-item
          label="组织"
          field="organizationId"
          :rules="[{ required: true, message: '请选择组织' }]"
        >
          <a-select v-model="formModel.organizationId" :options="orgOptions" />
        </a-form-item>
        <a-form-item
          label="部门名称"
          field="name"
          :rules="[{ required: true, message: '请输入名称' }]"
        >
          <a-input v-model="formModel.name" />
        </a-form-item>
        <a-form-item
          label="部门编码"
          field="code"
          :rules="[{ required: true, message: '请输入编码' }]"
        >
          <a-input v-model="formModel.code" />
        </a-form-item>
        <a-form-item label="排序"
          ><a-input-number v-model="formModel.sort" :min="0"
        /></a-form-item>
      </a-form>
    </template>
  </IamCrudPage>
</template>

<script lang="ts" setup>
  import { onMounted, reactive, ref, watch } from 'vue';
  import type { FormInstance, TableColumnData } from '@arco-design/web-vue';
  import { useIamCrud } from '@/hooks/use-iam-crud';
  import {
    createDepartment,
    deleteDepartment,
    getDepartments,
    getOrganizations,
    updateDepartment,
    type DepartmentForm,
    type DepartmentItem,
  } from '@/api/iam/organization';
  import IamCrudPage from '../../components/iam-crud-page.vue';

  const formRef = ref<FormInstance>();
  const filterOrgId = ref('');
  const orgOptions = ref<{ label: string; value: string }[]>([]);
  const formModel = reactive<DepartmentForm>({
    organizationId: '',
    name: '',
    code: '',
    parentId: null,
    sort: 0,
  });
  const columns: TableColumnData[] = [
    { title: '部门名称', dataIndex: 'name' },
    { title: '部门编码', dataIndex: 'code' },
    { title: '组织ID', dataIndex: 'organizationId' },
    { title: '排序', dataIndex: 'sort' },
    { title: '操作', slotName: 'operations', width: 140 },
  ];
  const crud = useIamCrud<DepartmentItem>({
    fetchList: () =>
      getDepartments(
        filterOrgId.value ? { organizationId: filterOrgId.value } : undefined
      ),
    createItem: createDepartment,
    updateItem: updateDepartment,
    deleteItem: deleteDepartment,
  });
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
  } = crud;

  async function loadOrgs() {
    const orgs = await getOrganizations();
    orgOptions.value = orgs.map((o) => ({ label: o.name, value: o.id }));
    if (!filterOrgId.value && orgs.length) filterOrgId.value = orgs[0].id;
  }
  function resetForm() {
    formModel.organizationId = filterOrgId.value || '';
    formModel.name = '';
    formModel.code = '';
    formModel.parentId = null;
    formModel.sort = 0;
  }
  function onCreate() {
    resetForm();
    openCreate('添加部门');
  }
  function onEdit(record: DepartmentItem) {
    resetForm();
    openEdit(record, '编辑部门');
    formModel.organizationId = record.organizationId;
    formModel.name = record.name;
    formModel.code = record.code;
    formModel.parentId = record.parentId;
    formModel.sort = record.sort;
  }
  async function onSubmit() {
    if (await formRef.value?.validate()) return;
    await submitForm({
      organizationId: formModel.organizationId,
      name: formModel.name.trim(),
      code: formModel.code.trim(),
      parentId: formModel.parentId,
      sort: formModel.sort ?? 0,
    });
  }
  watch(filterOrgId, loadList);
  onMounted(async () => {
    await loadOrgs();
    await loadList();
  });
</script>
