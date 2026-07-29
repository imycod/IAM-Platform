<template>
  <IamCrudPage
    :breadcrumb="[
      'menu.iam',
      'menu.iam.application',
      'menu.iam.application.user',
    ]"
    title="应用用户"
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
          v-if="!editingId"
          label="用户 ID"
          field="userId"
          :rules="[{ required: true, message: '请输入用户 ID' }]"
        >
          <a-input v-model="formModel.userId" />
        </a-form-item>
        <a-form-item label="应用角色">
          <a-select
            v-model="formModel.applicationRoleId"
            :options="roleOptions"
            allow-clear
          />
        </a-form-item>
        <a-form-item label="状态">
          <a-select v-model="formModel.status" :options="statusOptions" />
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
  import { getApplicationRoles } from '@/api/iam/application-role';
  import {
    createApplicationUser,
    deleteApplicationUser,
    getApplicationUsers,
    updateApplicationUser,
    type ApplicationUserForm,
    type ApplicationUserItem,
    type ApplicationUserStatus,
  } from '@/api/iam/application-user';
  import IamCrudPage from '../../components/iam-crud-page.vue';

  const filters = reactive({ applicationId: '' });
  const appOptions = ref<{ label: string; value: string }[]>([]);
  const roleOptions = ref<{ label: string; value: string }[]>([]);
  const loading = ref(false);
  const submitting = ref(false);
  const dialogVisible = ref(false);
  const dialogTitle = ref('添加用户');
  const editingId = ref<string | null>(null);
  const formRef = ref<FormInstance>();
  const formModel = reactive<ApplicationUserForm>({
    userId: '',
    applicationRoleId: '',
    status: 'active',
  });
  const dataList = ref<ApplicationUserItem[]>([]);

  const statusOptions = [
    { label: '正常', value: 'active' },
    { label: '停用', value: 'inactive' },
    { label: '待审核', value: 'pending' },
    { label: '已拒绝', value: 'rejected' },
  ];

  const columns: TableColumnData[] = [
    {
      title: '用户',
      render: ({ record }) =>
        record.user?.email ?? record.user?.name ?? record.userId,
    },
    {
      title: '应用角色',
      render: ({ record }) => record.applicationRole?.name ?? '-',
    },
    { title: '状态', dataIndex: 'status' },
    { title: '授权时间', dataIndex: 'grantedAt' },
    { title: '操作', slotName: 'operations', width: 140 },
  ];

  async function loadApps() {
    const apps = await getApplications();
    appOptions.value = apps.map((a) => ({ label: a.name, value: a.id }));
    if (!filters.applicationId && apps.length)
      filters.applicationId = apps[0].id;
  }

  async function loadRoles() {
    if (!filters.applicationId) return;
    const roles = await getApplicationRoles(filters.applicationId);
    roleOptions.value = roles.map((r) => ({ label: r.name, value: r.id }));
  }

  async function loadList() {
    if (!filters.applicationId) return;
    loading.value = true;
    try {
      dataList.value = await getApplicationUsers(filters.applicationId);
    } finally {
      loading.value = false;
    }
  }

  function resetForm() {
    formModel.userId = '';
    formModel.applicationRoleId = '';
    formModel.status = 'active';
    editingId.value = null;
  }

  function onCreate() {
    resetForm();
    dialogTitle.value = '添加用户';
    dialogVisible.value = true;
  }

  function onEdit(record: ApplicationUserItem) {
    resetForm();
    editingId.value = record.id;
    dialogTitle.value = '编辑用户';
    formModel.applicationRoleId = record.applicationRoleId ?? '';
    formModel.status = record.status as ApplicationUserStatus;
    dialogVisible.value = true;
  }

  async function onSubmit() {
    const err = await formRef.value?.validate();
    if (err || !filters.applicationId) return;
    submitting.value = true;
    try {
      if (editingId.value) {
        await updateApplicationUser(filters.applicationId, editingId.value, {
          applicationRoleId: formModel.applicationRoleId || null,
          status: formModel.status,
        });
        Message.success('更新成功');
      } else {
        await createApplicationUser(filters.applicationId, formModel);
        Message.success('创建成功');
      }
      dialogVisible.value = false;
      await loadList();
    } finally {
      submitting.value = false;
    }
  }

  function onDelete(record: ApplicationUserItem) {
    Modal.confirm({
      title: '确认删除',
      content: '确定移除该应用用户吗？',
      onOk: async () => {
        await deleteApplicationUser(filters.applicationId, record.id);
        Message.success('删除成功');
        await loadList();
      },
    });
  }

  watch(
    () => filters.applicationId,
    async () => {
      await loadRoles();
      await loadList();
    }
  );

  onMounted(async () => {
    await loadApps();
    await loadRoles();
    await loadList();
  });
</script>
