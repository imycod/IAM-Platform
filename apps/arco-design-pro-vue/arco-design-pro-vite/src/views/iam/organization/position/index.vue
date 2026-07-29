<template>
  <IamCrudPage
    :breadcrumb="['menu.iam', 'menu.iam.organization.position']"
    title="岗位管理"
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
          :rules="[{ required: true }]"
          ><a-select v-model="formModel.organizationId" :options="orgOptions"
        /></a-form-item>
        <a-form-item label="岗位名称" field="name" :rules="[{ required: true }]"
          ><a-input v-model="formModel.name"
        /></a-form-item>
        <a-form-item label="岗位编码" field="code" :rules="[{ required: true }]"
          ><a-input v-model="formModel.code"
        /></a-form-item>
        <a-form-item label="级别"
          ><a-input-number v-model="formModel.level" :min="1"
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
    createPosition,
    deletePosition,
    getOrganizations,
    getPositions,
    updatePosition,
    type PositionForm,
    type PositionItem,
  } from '@/api/iam/organization';
  import IamCrudPage from '../../components/iam-crud-page.vue';

  const formRef = ref<FormInstance>();
  const filterOrgId = ref('');
  const orgOptions = ref<{ label: string; value: string }[]>([]);
  const formModel = reactive<PositionForm>({
    organizationId: '',
    name: '',
    code: '',
    level: 1,
  });
  const columns: TableColumnData[] = [
    { title: '岗位名称', dataIndex: 'name' },
    { title: '岗位编码', dataIndex: 'code' },
    { title: '级别', dataIndex: 'level' },
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
  } = useIamCrud<PositionItem>({
    fetchList: () =>
      getPositions(
        filterOrgId.value ? { organizationId: filterOrgId.value } : undefined
      ),
    createItem: createPosition,
    updateItem: updatePosition,
    deleteItem: deletePosition,
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
    formModel.level = 1;
  }
  function onCreate() {
    resetForm();
    openCreate('添加岗位');
  }
  function onEdit(r: PositionItem) {
    resetForm();
    openEdit(r, '编辑岗位');
    Object.assign(formModel, {
      organizationId: r.organizationId,
      name: r.name,
      code: r.code,
      level: r.level,
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
