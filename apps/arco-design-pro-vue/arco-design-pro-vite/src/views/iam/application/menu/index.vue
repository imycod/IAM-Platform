<template>
  <IamCrudPage
    :breadcrumb="[
      'menu.iam',
      'menu.iam.application',
      'menu.iam.application.menu',
    ]"
    title="应用菜单"
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
          label="菜单名称"
          field="name"
          :rules="[{ required: true, message: '请输入菜单名称' }]"
        >
          <a-input v-model="formModel.name" />
        </a-form-item>
        <a-form-item label="上级菜单">
          <a-select
            v-model="formModel.parentId"
            :options="parentOptions"
            allow-clear
            placeholder="顶级"
          />
        </a-form-item>
        <a-form-item label="路径">
          <a-input v-model="formModel.path" />
        </a-form-item>
        <a-form-item label="图标">
          <a-input v-model="formModel.icon" />
        </a-form-item>
        <a-form-item label="权限编码">
          <a-input v-model="formModel.permissionCode" />
        </a-form-item>
        <a-form-item label="排序">
          <a-input-number v-model="formModel.sort" :min="0" />
        </a-form-item>
      </a-form>
    </template>
  </IamCrudPage>
</template>

<script lang="ts" setup>
  import { computed, onMounted, reactive, ref, watch } from 'vue';
  import { Message, Modal } from '@arco-design/web-vue';
  import type { FormInstance, TableColumnData } from '@arco-design/web-vue';
  import { getApplications } from '@/api/iam/application';
  import {
    createApplicationMenu,
    deleteApplicationMenu,
    getApplicationMenus,
    updateApplicationMenu,
    type ApplicationMenuForm,
    type ApplicationMenuItem,
  } from '@/api/iam/application-menu';
  import IamCrudPage from '../../components/iam-crud-page.vue';

  const filters = reactive({ applicationId: '' });
  const appOptions = ref<{ label: string; value: string }[]>([]);
  const flatMenus = ref<ApplicationMenuItem[]>([]);
  const loading = ref(false);
  const submitting = ref(false);
  const dialogVisible = ref(false);
  const dialogTitle = ref('添加菜单');
  const editingId = ref<string | null>(null);
  const formRef = ref<FormInstance>();
  const formModel = reactive<ApplicationMenuForm>({
    name: '',
    path: '',
    icon: '',
    sort: 0,
    permissionCode: '',
  });

  const dataList = ref<ApplicationMenuItem[]>([]);

  const parentOptions = computed(() =>
    flatMenus.value
      .filter((m) => m.id !== editingId.value)
      .map((m) => ({ label: m.name, value: m.id }))
  );

  const columns: TableColumnData[] = [
    { title: '菜单名称', dataIndex: 'name' },
    { title: '路径', dataIndex: 'path' },
    { title: '图标', dataIndex: 'icon' },
    { title: '权限编码', dataIndex: 'permissionCode' },
    { title: '排序', dataIndex: 'sort' },
    { title: '操作', slotName: 'operations', width: 140 },
  ];

  function flatten(menus: ApplicationMenuItem[]): ApplicationMenuItem[] {
    return menus.flatMap((m) => [
      m,
      ...(m.children?.length ? flatten(m.children) : []),
    ]);
  }

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
      const menus = await getApplicationMenus(filters.applicationId, true);
      dataList.value = menus;
      flatMenus.value = flatten(menus);
    } finally {
      loading.value = false;
    }
  }

  function resetForm() {
    formModel.parentId = undefined;
    formModel.name = '';
    formModel.path = '';
    formModel.icon = '';
    formModel.sort = 0;
    formModel.permissionCode = '';
    editingId.value = null;
  }

  function onCreate() {
    resetForm();
    dialogTitle.value = '添加菜单';
    dialogVisible.value = true;
  }

  function onEdit(record: ApplicationMenuItem) {
    resetForm();
    editingId.value = record.id;
    dialogTitle.value = '编辑菜单';
    formModel.parentId = record.parentId ?? undefined;
    formModel.name = record.name;
    formModel.path = record.path ?? '';
    formModel.icon = record.icon ?? '';
    formModel.sort = record.sort;
    formModel.permissionCode = record.permissionCode ?? '';
    dialogVisible.value = true;
  }

  async function onSubmit() {
    const err = await formRef.value?.validate();
    if (err || !filters.applicationId) return;
    submitting.value = true;
    try {
      if (editingId.value) {
        await updateApplicationMenu(
          filters.applicationId,
          editingId.value,
          formModel
        );
        Message.success('更新成功');
      } else {
        await createApplicationMenu(filters.applicationId, formModel);
        Message.success('创建成功');
      }
      dialogVisible.value = false;
      await loadList();
    } finally {
      submitting.value = false;
    }
  }

  function onDelete(record: ApplicationMenuItem) {
    Modal.confirm({
      title: '确认删除',
      content: `确定删除「${record.name}」吗？`,
      onOk: async () => {
        await deleteApplicationMenu(filters.applicationId, record.id);
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
