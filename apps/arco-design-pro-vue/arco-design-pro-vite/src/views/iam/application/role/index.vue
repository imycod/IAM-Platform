<template>
  <IamCrudPage
    :breadcrumb="[
      'menu.iam',
      'menu.iam.application',
      'menu.iam.application.role',
    ]"
    title="应用角色"
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
        <a-form-item label="应用">
          <a-select
            v-model="filters.applicationId"
            :options="appOptions"
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
          @click="onDelete(record)"
          >删除</a-button
        >
      </a-space>
    </template>
    <template #form>
      <a-form ref="formRef" :model="formModel" layout="vertical">
        <a-form-item
          label="角色名称"
          field="name"
          :rules="[{ required: true, message: '请输入角色名称' }]"
        >
          <a-input v-model="formModel.name" :disabled="!!editingId" />
        </a-form-item>
        <a-form-item
          v-if="!editingId"
          label="角色编码"
          field="code"
          :rules="[{ required: true, message: '请输入角色编码' }]"
        >
          <a-input v-model="formModel.code" />
        </a-form-item>
      </a-form>
    </template>
  </IamCrudPage>
</template>

<script lang="ts" setup>
  import { onMounted, reactive, ref, watch } from 'vue';
  import { Message, Modal } from '@arco-design/web-vue';
  import type { FormInstance, TableColumnData } from '@arco-design/web-vue';
  import { getApplications } from '@/api/iam/application';
  import {
    createApplicationRole,
    deleteApplicationRole,
    getApplicationRoles,
    updateApplicationRole,
    type ApplicationRoleForm,
    type ApplicationRoleItem,
  } from '@/api/iam/application-role';
  import IamCrudPage from '../../components/iam-crud-page.vue';

  const filters = reactive({ applicationId: '' });
  const appOptions = ref<{ label: string; value: string }[]>([]);
  const loading = ref(false);
  const submitting = ref(false);
  const dialogVisible = ref(false);
  const dialogTitle = ref('添加角色');
  const editingId = ref<string | null>(null);
  const formRef = ref<FormInstance>();
  const formModel = reactive<ApplicationRoleForm>({ name: '', code: '' });
  const dataList = ref<ApplicationRoleItem[]>([]);

  const columns: TableColumnData[] = [
    { title: '角色名称', dataIndex: 'name' },
    { title: '角色编码', dataIndex: 'code' },
    {
      title: '访问角色',
      render: ({ record }) => record.accessRole?.name ?? '-',
    },
    { title: '操作', slotName: 'operations', width: 140 },
  ];

  async function loadApps() {
    const apps = await getApplications();
    appOptions.value = apps.map((a) => ({ label: a.name, value: a.id }));
    if (!filters.applicationId && apps.length)
      filters.applicationId = apps[0].id;
  }

  async function loadList() {
    if (!filters.applicationId) return;
    loading.value = true;
    try {
      dataList.value = await getApplicationRoles(filters.applicationId);
    } finally {
      loading.value = false;
    }
  }

  function resetForm() {
    formModel.name = '';
    formModel.code = '';
    editingId.value = null;
  }

  function onCreate() {
    resetForm();
    dialogTitle.value = '添加角色';
    dialogVisible.value = true;
  }

  function onEdit(record: ApplicationRoleItem) {
    resetForm();
    editingId.value = record.id;
    dialogTitle.value = '编辑角色';
    formModel.name = record.name;
    dialogVisible.value = true;
  }

  async function onSubmit() {
    const err = await formRef.value?.validate();
    if (err || !filters.applicationId) return;
    submitting.value = true;
    try {
      if (editingId.value) {
        await updateApplicationRole(filters.applicationId, editingId.value, {
          name: formModel.name,
        });
        Message.success('更新成功');
      } else {
        await createApplicationRole(filters.applicationId, formModel);
        Message.success('创建成功');
      }
      dialogVisible.value = false;
      await loadList();
    } finally {
      submitting.value = false;
    }
  }

  function onDelete(record: ApplicationRoleItem) {
    Modal.confirm({
      title: '确认删除',
      content: `确定删除「${record.name}」吗？`,
      onOk: async () => {
        await deleteApplicationRole(filters.applicationId, record.id);
        Message.success('删除成功');
        await loadList();
      },
    });
  }

  watch(() => filters.applicationId, loadList);

  onMounted(async () => {
    await loadApps();
    await loadList();
  });
</script>
