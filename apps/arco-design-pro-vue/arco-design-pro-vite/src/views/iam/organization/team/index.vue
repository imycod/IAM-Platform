<template>
  <IamCrudPage
    :breadcrumb="['menu.iam', 'menu.iam.organization.team']"
    title="团队管理"
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
      <a-form :model="{ org: filterOrgId }" layout="inline"
        ><a-form-item label="组织"
          ><a-select
            v-model="filterOrgId"
            :options="orgOptions"
            style="width: 200px" /></a-form-item
      ></a-form>
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
          :rules="[{ required: true }]"
          ><a-select v-model="formModel.organizationId" :options="orgOptions"
        /></a-form-item>
        <a-form-item label="团队名称" field="name" :rules="[{ required: true }]"
          ><a-input v-model="formModel.name"
        /></a-form-item>
        <a-form-item label="团队编码" field="code" :rules="[{ required: true }]"
          ><a-input v-model="formModel.code"
        /></a-form-item>
        <a-form-item label="描述"
          ><a-textarea v-model="formModel.description as string"
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
    createTeam,
    deleteTeam,
    getOrganizations,
    getTeams,
    updateTeam,
    type TeamForm,
    type TeamItem,
  } from '@/api/iam/organization';
  import IamCrudPage from '../../components/iam-crud-page.vue';

  const formRef = ref<FormInstance>();
  const filterOrgId = ref('');
  const orgOptions = ref<{ label: string; value: string }[]>([]);
  const formModel = reactive<TeamForm>({
    organizationId: '',
    name: '',
    code: '',
    description: '',
  });
  const columns: TableColumnData[] = [
    { title: '团队名称', dataIndex: 'name' },
    { title: '编码', dataIndex: 'code' },
    { title: '成员数', dataIndex: 'memberCount' },
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
  } = useIamCrud<TeamItem>({
    fetchList: () =>
      getTeams(
        filterOrgId.value ? { organizationId: filterOrgId.value } : undefined
      ),
    createItem: createTeam,
    updateItem: updateTeam,
    deleteItem: deleteTeam,
  });
  async function loadOrgs() {
    const orgs = await getOrganizations();
    orgOptions.value = orgs.map((o) => ({ label: o.name, value: o.id }));
    if (!filterOrgId.value && orgs.length) filterOrgId.value = orgs[0].id;
  }
  function resetForm() {
    formModel.organizationId = filterOrgId.value || '';
    formModel.name = '';
    formModel.code = '';
    formModel.description = '';
  }
  function onCreate() {
    resetForm();
    openCreate('添加团队');
  }
  function onEdit(r: TeamItem) {
    resetForm();
    openEdit(r, '编辑团队');
    Object.assign(formModel, {
      organizationId: r.organizationId,
      name: r.name,
      code: r.code,
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
  watch(filterOrgId, loadList);
  onMounted(async () => {
    await loadOrgs();
    await loadList();
  });
</script>
