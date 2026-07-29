<template>
  <IamCrudPage
    :breadcrumb="['menu.iam', 'menu.iam.identity', 'menu.iam.identity.device']"
    title="设备管理"
    :columns="columns"
    :data="dataList"
    :loading="loading"
    :submitting="submitting"
    :visible="dialogVisible"
    :modal-title="dialogTitle"
    :pagination="pagination"
    @search="loadList"
    @reset="onReset"
    @create="onCreate"
    @submit="onSubmit"
    @cancel="dialogVisible = false"
    @page-change="onPageChange"
    @page-size-change="onPageSizeChange"
  >
    <template #filters>
      <a-form :model="filters" layout="inline">
        <a-form-item label="用户 ID">
          <a-input v-model="filters.userId" allow-clear />
        </a-form-item>
      </a-form>
    </template>
    <template #trusted="{ record }">
      <a-tag :color="record.trusted ? 'green' : 'gray'">{{
        record.trusted ? '可信' : '未信任'
      }}</a-tag>
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
          @click="confirmDelete(record, record.deviceName ?? record.id)"
          >删除</a-button
        >
      </a-space>
    </template>
    <template #form>
      <a-form ref="formRef" :model="formModel" layout="vertical">
        <a-form-item
          label="用户 ID"
          field="userId"
          :rules="[{ required: true, message: '请输入用户 ID' }]"
        >
          <a-input v-model="formModel.userId" :disabled="!!editingId" />
        </a-form-item>
        <a-form-item label="设备名称">
          <a-input v-model="formModel.deviceName" />
        </a-form-item>
        <a-form-item label="设备类型">
          <a-input v-model="formModel.deviceType" />
        </a-form-item>
        <a-form-item label="操作系统">
          <a-input v-model="formModel.os" />
        </a-form-item>
        <a-form-item label="浏览器">
          <a-input v-model="formModel.browser" />
        </a-form-item>
        <a-form-item label="可信设备">
          <a-switch v-model="formModel.trusted" />
        </a-form-item>
      </a-form>
    </template>
  </IamCrudPage>
</template>

<script lang="ts" setup>
  import { computed, onMounted, reactive, ref } from 'vue';
  import type { FormInstance, TableColumnData } from '@arco-design/web-vue';
  import { useIamCrudPaginated } from '@/hooks/use-iam-crud';
  import {
    createDevice,
    deleteDevice,
    getDevices,
    updateDevice,
    type DeviceForm,
    type DeviceItem,
  } from '@/api/iam/identity-device';
  import IamCrudPage from '../../components/iam-crud-page.vue';

  const filters = reactive({ userId: '' });
  const formRef = ref<FormInstance>();
  const formModel = reactive<DeviceForm>({
    userId: '',
    deviceName: '',
    deviceType: 'web',
    os: '',
    browser: '',
    trusted: false,
  });

  const {
    loading,
    submitting,
    dataList,
    dialogVisible,
    dialogTitle,
    editingId,
    loadList,
    openCreate,
    openEdit,
    submitForm,
    confirmDelete,
    page,
    pageSize,
    total,
    onPageChange,
    onPageSizeChange,
  } = useIamCrudPaginated<DeviceItem>({
    fetchList: ({ page: p, pageSize: ps }) =>
      getDevices({
        page: p,
        pageSize: ps,
        userId: filters.userId || undefined,
      }).then((res) => ({ items: res.items, total: res.total })),
    createItem: createDevice,
    updateItem: updateDevice,
    deleteItem: deleteDevice,
  });

  const pagination = computed(() => ({
    current: page.value,
    pageSize: pageSize.value,
    total: total.value,
    showTotal: true,
    showPageSize: true,
  }));

  const columns: TableColumnData[] = [
    { title: '设备名称', dataIndex: 'deviceName' },
    { title: '类型', dataIndex: 'deviceType' },
    { title: 'OS', dataIndex: 'os' },
    { title: '浏览器', dataIndex: 'browser' },
    { title: '可信', slotName: 'trusted', width: 90 },
    { title: '最后活跃', dataIndex: 'lastActiveAt' },
    { title: '操作', slotName: 'operations', width: 140 },
  ];

  function resetForm() {
    formModel.userId = '';
    formModel.deviceName = '';
    formModel.deviceType = 'web';
    formModel.os = '';
    formModel.browser = '';
    formModel.trusted = false;
  }

  function onReset() {
    filters.userId = '';
    loadList();
  }

  function onCreate() {
    resetForm();
    openCreate('添加设备');
  }

  function onEdit(record: DeviceItem) {
    resetForm();
    openEdit(record, '编辑设备');
    formModel.userId = record.userId;
    formModel.deviceName = record.deviceName ?? '';
    formModel.deviceType = record.deviceType;
    formModel.os = record.os ?? '';
    formModel.browser = record.browser ?? '';
    formModel.trusted = record.trusted;
  }

  async function onSubmit() {
    const err = await formRef.value?.validate();
    if (err) return;
    await submitForm({ ...formModel });
  }

  onMounted(loadList);
</script>
