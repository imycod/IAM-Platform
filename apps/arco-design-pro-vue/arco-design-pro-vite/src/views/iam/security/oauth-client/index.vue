<template>
  <IamCrudPage
    :breadcrumb="[
      'menu.iam',
      'menu.iam.security',
      'menu.iam.security.oauthClient',
    ]"
    title="OAuth 客户端"
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
        <a-form-item label="应用">
          <a-select
            v-model="filters.applicationId"
            :options="appOptions"
            allow-clear
            placeholder="全部"
            style="width: 200px"
          />
        </a-form-item>
        <a-form-item label="Client ID">
          <a-input v-model="filters.clientId" allow-clear />
        </a-form-item>
      </a-form>
    </template>
    <template #operations="{ record }">
      <a-space>
        <a-button type="text" size="small" @click="onEdit(record)"
          >编辑</a-button
        >
        <a-button type="text" size="small" @click="onRotate(record)"
          >轮换密钥</a-button
        >
        <a-button
          type="text"
          size="small"
          status="danger"
          @click="confirmDelete(record, record.clientId)"
          >删除</a-button
        >
      </a-space>
    </template>
    <template #form>
      <a-form ref="formRef" :model="formModel" layout="vertical">
        <a-form-item
          v-if="!editingId"
          label="应用"
          field="applicationId"
          :rules="[{ required: true, message: '请选择应用' }]"
        >
          <a-select v-model="formModel.applicationId" :options="appOptions" />
        </a-form-item>
        <a-form-item label="Client ID">
          <a-input v-model="formModel.clientId" />
        </a-form-item>
        <a-form-item label="Redirect URIs">
          <a-textarea v-model="redirectUrisText" placeholder="每行一个 URI" />
        </a-form-item>
        <a-form-item label="Grant Types">
          <a-input
            v-model="grantTypesText"
            placeholder="authorization_code,refresh_token"
          />
        </a-form-item>
        <a-form-item label="Scopes">
          <a-input v-model="scopesText" placeholder="openid,profile" />
        </a-form-item>
        <a-form-item label="需要 PKCE">
          <a-switch v-model="formModel.requirePkce" />
        </a-form-item>
        <a-form-item label="Consent 模式">
          <a-select v-model="formModel.consentMode" :options="consentOptions" />
        </a-form-item>
      </a-form>
    </template>
  </IamCrudPage>
</template>

<script lang="ts" setup>
  import { computed, onMounted, reactive, ref } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import type { FormInstance, TableColumnData } from '@arco-design/web-vue';
  import { useIamCrudPaginated } from '@/hooks/use-iam-crud';
  import { getApplications } from '@/api/iam/application';
  import {
    createOauthClient,
    deleteOauthClient,
    getOauthClients,
    rotateOauthClientSecret,
    updateOauthClient,
    type OauthClientForm,
    type OauthClientItem,
    type OauthClientUpdateForm,
  } from '@/api/iam/oauth-client';
  import IamCrudPage from '../../components/iam-crud-page.vue';

  const filters = reactive({ applicationId: '', clientId: '' });
  const appOptions = ref<{ label: string; value: string }[]>([]);
  const formRef = ref<FormInstance>();
  const redirectUrisText = ref('');
  const grantTypesText = ref('authorization_code,refresh_token');
  const scopesText = ref('openid,profile');
  const formModel = reactive<OauthClientForm & OauthClientUpdateForm>({
    applicationId: '',
    clientId: '',
    redirectUris: [],
    grantTypes: ['authorization_code', 'refresh_token'],
    scopes: ['openid', 'profile'],
    requirePkce: true,
    consentMode: 'first_time',
  });

  const consentOptions = [
    { label: '始终', value: 'always' },
    { label: '首次', value: 'first_time' },
    { label: '从不', value: 'never' },
  ];

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
  } = useIamCrudPaginated<OauthClientItem>({
    fetchList: ({ page: p, pageSize: ps }) =>
      getOauthClients({
        page: p,
        pageSize: ps,
        applicationId: filters.applicationId || undefined,
        clientId: filters.clientId || undefined,
      }).then((res) => ({ items: res.items, total: res.total })),
    createItem: (data) => createOauthClient(data as OauthClientForm),
    updateItem: (id, data) =>
      updateOauthClient(id, data as OauthClientUpdateForm),
    deleteItem: deleteOauthClient,
  });

  const pagination = computed(() => ({
    current: page.value,
    pageSize: pageSize.value,
    total: total.value,
    showTotal: true,
    showPageSize: true,
  }));

  const columns: TableColumnData[] = [
    { title: 'Client ID', dataIndex: 'clientId' },
    {
      title: '应用',
      render: ({ record }) => record.application?.name ?? record.applicationId,
    },
    { title: '密钥', dataIndex: 'clientSecretMasked' },
    {
      title: 'PKCE',
      render: ({ record }) => (record.requirePkce ? '是' : '否'),
    },
    { title: 'Consent', dataIndex: 'consentMode' },
    { title: '操作', slotName: 'operations', width: 200 },
  ];

  function splitLines(text: string) {
    return text
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function buildPayload() {
    return {
      ...formModel,
      redirectUris: splitLines(redirectUrisText.value),
      grantTypes: splitLines(grantTypesText.value),
      scopes: splitLines(scopesText.value),
    };
  }

  async function loadApps() {
    const apps = await getApplications();
    appOptions.value = apps.map((a) => ({ label: a.name, value: a.id }));
  }

  function resetForm() {
    formModel.applicationId = '';
    formModel.clientId = '';
    formModel.requirePkce = true;
    formModel.consentMode = 'first_time';
    redirectUrisText.value = '';
    grantTypesText.value = 'authorization_code,refresh_token';
    scopesText.value = 'openid,profile';
  }

  function onReset() {
    filters.applicationId = '';
    filters.clientId = '';
    loadList();
  }

  function onCreate() {
    resetForm();
    openCreate('添加 OAuth 客户端');
  }

  function onEdit(record: OauthClientItem) {
    resetForm();
    openEdit(record, '编辑 OAuth 客户端');
    formModel.clientId = record.clientId;
    formModel.requirePkce = record.requirePkce;
    formModel.consentMode = record.consentMode;
    redirectUrisText.value = record.redirectUris.join('\n');
    grantTypesText.value = record.grantTypes.join(',');
    scopesText.value = record.scopes.join(',');
  }

  async function onSubmit() {
    const err = await formRef.value?.validate();
    if (err) return;
    await submitForm(buildPayload());
  }

  async function onRotate(record: OauthClientItem) {
    const updated = await rotateOauthClientSecret(record.id);
    Message.success(
      `新密钥：${updated.clientSecretPlain ?? updated.clientSecretMasked}`
    );
    await loadList();
  }

  onMounted(async () => {
    await loadApps();
    await loadList();
  });
</script>
