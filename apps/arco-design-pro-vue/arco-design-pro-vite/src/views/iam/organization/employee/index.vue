<template>
  <IamCrudPage
    :breadcrumb="['menu.iam', 'menu.iam.organization.employee']"
    title="员工管理"
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
        <a-form-item label="组织"
          ><a-select
            v-model="filterOrgId"
            :options="orgOptions"
            style="width: 200px"
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
          @click="
            confirmDelete(record, record.userName || record.employeeNo || '')
          "
          >删除</a-button
        >
      </a-space>
    </template>
    <template #form>
      <a-form ref="formRef" :model="formModel" layout="vertical">
        <a-form-item label="用户ID" field="userId" :rules="[{ required: true }]"
          ><a-input v-model="formModel.userId"
        /></a-form-item>
        <a-form-item
          label="组织"
          field="organizationId"
          :rules="[{ required: true }]"
          ><a-select v-model="formModel.organizationId" :options="orgOptions"
        /></a-form-item>
        <a-form-item label="工号"
          ><a-input v-model="formModel.employeeNo"
        /></a-form-item>
        <a-form-item label="状态"
          ><a-select
            v-model="formModel.status"
            :options="[
              { label: '在职', value: 'active' },
              { label: '离职', value: 'inactive' },
            ]"
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
    createEmployee,
    deleteEmployee,
    getEmployees,
    getOrganizations,
    updateEmployee,
    type EmployeeForm,
    type EmployeeItem,
  } from '@/api/iam/organization';
  import IamCrudPage from '../../components/iam-crud-page.vue';

  const formRef = ref<FormInstance>();
  const filterOrgId = ref('');
  const orgOptions = ref<{ label: string; value: string }[]>([]);
  const formModel = reactive<EmployeeForm>({
    userId: '',
    organizationId: '',
    employeeNo: '',
    status: 'active',
  });
  const columns: TableColumnData[] = [
    { title: '姓名', dataIndex: 'userName' },
    { title: '工号', dataIndex: 'employeeNo' },
    { title: '组织', dataIndex: 'organizationName' },
    { title: '部门', dataIndex: 'departmentName' },
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
  } = useIamCrud<EmployeeItem>({
    fetchList: () =>
      getEmployees(
        filterOrgId.value ? { organizationId: filterOrgId.value } : undefined
      ),
    createItem: createEmployee,
    updateItem: updateEmployee,
    deleteItem: deleteEmployee,
  });
  async function loadOrgs() {
    const orgs = await getOrganizations();
    orgOptions.value = orgs.map((o) => ({ label: o.name, value: o.id }));
    if (!filterOrgId.value && orgs.length) filterOrgId.value = orgs[0].id;
  }
  function resetForm() {
    formModel.userId = '';
    formModel.organizationId = filterOrgId.value || '';
    formModel.employeeNo = '';
    formModel.status = 'active';
  }
  function onCreate() {
    resetForm();
    openCreate('添加员工');
  }
  function onEdit(r: EmployeeItem) {
    resetForm();
    openEdit(r, '编辑员工');
    Object.assign(formModel, {
      userId: r.userId,
      organizationId: r.organizationId,
      employeeNo: r.employeeNo,
      status: r.status,
    });
  }
  async function onSubmit() {
    if (await formRef.value?.validate()) return;
    await submitForm({ ...formModel });
  }
  watch(filterOrgId, loadList);
  onMounted(async () => {
    await loadOrgs();
    await loadList();
  });
</script>
