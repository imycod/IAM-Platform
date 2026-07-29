<template>
  <IamCrudPage
    :breadcrumb="['menu.iam', 'menu.iam.access', 'menu.iam.access.roleUser']"
    title="角色用户分配"
    :columns="columns"
    :data="dataList"
    :loading="loading"
    :submitting="submitting"
    :visible="dialogVisible"
    modal-title="分配角色"
    :show-create="true"
    @search="loadList"
    @reset="onReset"
    @create="openAssign"
    @submit="onSubmit"
    @cancel="dialogVisible = false"
  >
    <template #filters>
      <a-form :model="filters" layout="inline">
        <a-form-item label="角色">
          <a-select
            v-model="filters.roleId"
            :options="roleOptions"
            allow-clear
            placeholder="全部"
            style="width: 200px"
          />
        </a-form-item>
        <a-form-item label="用户">
          <a-select
            v-model="filters.userId"
            :options="userOptions"
            allow-clear
            allow-search
            placeholder="全部"
            style="width: 200px"
          />
        </a-form-item>
      </a-form>
    </template>
    <template #user="{ record }">
      {{ record.user.email ?? record.user.name ?? record.user.id }}
    </template>
    <template #operations="{ record }">
      <a-button
        type="text"
        size="small"
        status="danger"
        @click="onRevoke(record)"
        >撤销</a-button
      >
    </template>
    <template #form>
      <a-form ref="formRef" :model="formModel" layout="vertical">
        <a-form-item
          label="角色"
          field="roleId"
          :rules="[{ required: true, message: '请选择角色' }]"
        >
          <a-select v-model="formModel.roleId" :options="roleOptions" />
        </a-form-item>
        <a-form-item
          label="用户"
          field="userId"
          :rules="[{ required: true, message: '请选择用户' }]"
        >
          <a-select
            v-model="formModel.userId"
            :options="userOptions"
            allow-search
          />
        </a-form-item>
      </a-form>
    </template>
  </IamCrudPage>
</template>

<script lang="ts" setup>
  import { onMounted, reactive, ref } from 'vue';
  import { Message, Modal } from '@arco-design/web-vue';
  import type { FormInstance, TableColumnData } from '@arco-design/web-vue';
  import { getIdentityUsers } from '@/api/iam/identity-user';
  import {
    assignRoleToUser,
    getRoles,
    getUserRoleAssignments,
    revokeRoleFromUser,
    type UserRoleAssignmentItem,
  } from '@/api/iam/role';
  import IamCrudPage from '../../../components/iam-crud-page.vue';

  const loading = ref(false);
  const submitting = ref(false);
  const dialogVisible = ref(false);
  const dataList = ref<UserRoleAssignmentItem[]>([]);
  const roleOptions = ref<{ label: string; value: string }[]>([]);
  const userOptions = ref<{ label: string; value: string }[]>([]);
  const filters = reactive({ roleId: '', userId: '' });
  const formRef = ref<FormInstance>();
  const formModel = reactive({ roleId: '', userId: '' });

  const columns: TableColumnData[] = [
    { title: '角色名称', render: ({ record }) => record.role.name },
    { title: '角色编码', render: ({ record }) => record.role.code },
    { title: '用户', slotName: 'user' },
    {
      title: '应用 ID',
      render: ({ record }) => record.applicationId ?? '平台级',
    },
    { title: '分配时间', dataIndex: 'createdAt' },
    { title: '操作', slotName: 'operations', width: 80 },
  ];

  async function loadOptions() {
    const [roles, userRes] = await Promise.all([
      getRoles({ all: true }),
      getIdentityUsers({ page: 1, pageSize: 100 }),
    ]);
    roleOptions.value = roles.map((r) => ({
      label: `${r.name} (${r.code})`,
      value: r.id,
    }));
    userOptions.value = userRes.items.map((u) => ({
      label: u.email ?? u.name ?? u.id,
      value: u.id,
    }));
  }

  async function loadList() {
    loading.value = true;
    try {
      dataList.value = await getUserRoleAssignments({
        roleId: filters.roleId || undefined,
        userId: filters.userId || undefined,
      });
    } finally {
      loading.value = false;
    }
  }

  function onReset() {
    filters.roleId = '';
    filters.userId = '';
    loadList();
  }

  function openAssign() {
    formModel.roleId = '';
    formModel.userId = '';
    dialogVisible.value = true;
  }

  async function onSubmit() {
    const err = await formRef.value?.validate();
    if (err) return;
    submitting.value = true;
    try {
      await assignRoleToUser(formModel.roleId, { userId: formModel.userId });
      Message.success('分配成功');
      dialogVisible.value = false;
      await loadList();
    } finally {
      submitting.value = false;
    }
  }

  function onRevoke(record: UserRoleAssignmentItem) {
    Modal.confirm({
      title: '撤销分配',
      content: '确定撤销该角色分配吗？',
      onOk: async () => {
        await revokeRoleFromUser(record.roleId, record.userId);
        Message.success('已撤销');
        await loadList();
      },
    });
  }

  onMounted(async () => {
    await loadOptions();
    await loadList();
  });
</script>
