<template>
  <div class="container">
    <Breadcrumb
      :items="[
        'menu.iam',
        'menu.iam.security',
        'menu.iam.security.authSessionSettings',
      ]"
    />
    <a-spin :loading="loading" style="width: 100%">
      <a-card class="general-card" title="会话策略设置">
        <a-alert v-if="envHint" type="info" style="margin-bottom: 16px">{{
          envHint
        }}</a-alert>
        <a-form :model="form" layout="vertical" style="max-width: 640px">
          <a-form-item label="门户 Session（分钟）">
            <a-input-number
              v-model="form.portalMinutes"
              :min="1"
              :max="525600"
            />
          </a-form-item>
          <a-form-item label="OIDC SSO Session（分钟）">
            <a-input-number
              v-model="form.oidcSessionMinutes"
              :min="1"
              :max="525600"
            />
          </a-form-item>
          <a-form-item label="OIDC Access Token（分钟）">
            <a-input-number
              v-model="form.oidcAccessMinutes"
              :min="1"
              :max="525600"
            />
          </a-form-item>
          <a-form-item label="OIDC Refresh Token（分钟）">
            <a-input-number
              v-model="form.oidcRefreshMinutes"
              :min="1"
              :max="525600"
            />
          </a-form-item>
          <a-form-item label="授权码（分钟）">
            <a-input-number
              v-model="form.authCodeMinutes"
              :min="1"
              :max="525600"
            />
          </a-form-item>
          <a-space>
            <a-button type="primary" :loading="saving" @click="onSaveGlobal"
              >保存全局策略</a-button
            >
            <a-button :loading="saving" @click="onReset">恢复全局默认</a-button>
          </a-space>
        </a-form>
      </a-card>
      <a-card
        class="general-card"
        title="应用账密 Session 策略"
        style="margin-top: 16px"
      >
        <a-table :columns="appColumns" :data="appPolicies" :pagination="false">
          <template #portalMinutes="{ record }">
            <a-input-number
              v-model="appPortalMinutes[record.applicationId]"
              :min="1"
              :max="525600"
              placeholder="使用全局"
              allow-clear
            />
          </template>
          <template #effective="{ record }">
            {{ formatDuration(record.effectivePortalSessionTtlSeconds) }}
          </template>
          <template #operations="{ record }">
            <a-button
              type="text"
              size="small"
              :loading="savingAppId === record.applicationId"
              @click="onSaveApp(record)"
            >
              保存
            </a-button>
          </template>
        </a-table>
      </a-card>
    </a-spin>
  </div>
</template>

<script lang="ts" setup>
  import { computed, onMounted, reactive, ref } from 'vue';
  import { Message, Modal } from '@arco-design/web-vue';
  import type { TableColumnData } from '@arco-design/web-vue';
  import {
    getAuthSessionSettings,
    resetAuthSessionSettings,
    updateApplicationPortalSessionTtl,
    updateAuthSessionSettings,
    type ApplicationPortalSessionPolicy,
    type AuthSessionSettings,
  } from '@/api/iam/auth-session-settings';

  const SECONDS_PER_MINUTE = 60;
  const SECONDS_PER_DAY = 24 * 60 * 60;

  function secondsToMinutes(seconds: number) {
    return Math.max(1, Math.round(seconds / SECONDS_PER_MINUTE));
  }

  function formatDuration(seconds: number) {
    const minutes = secondsToMinutes(seconds);
    const days = seconds / SECONDS_PER_DAY;
    const dayText =
      Number.isInteger(days) || days >= 10
        ? String(Math.round(days))
        : String(Math.round(days * 100) / 100);
    return `${minutes} 分钟 / ${dayText} 天`;
  }

  const loading = ref(false);
  const saving = ref(false);
  const savingAppId = ref<string | null>(null);
  const appPolicies = ref<ApplicationPortalSessionPolicy[]>([]);
  const appPortalMinutes = reactive<Record<string, number | null>>({});

  const form = reactive({
    portalMinutes: 7 * 24 * 60,
    oidcSessionMinutes: 30 * 24 * 60,
    oidcAccessMinutes: 2 * 60,
    oidcRefreshMinutes: 30 * 24 * 60,
    authCodeMinutes: 5,
  });

  const envHint = computed(() => {
    const env = settings.value?.envDefaults;
    if (!env) return '';
    return `环境变量默认：门户 ${secondsToMinutes(
      env.portalSessionTtlSeconds
    )} 分钟；OIDC SSO ${secondsToMinutes(env.oidcSessionTtlSeconds)} 分钟`;
  });

  const settings = ref<AuthSessionSettings | null>(null);

  const appColumns: TableColumnData[] = [
    { title: '应用', dataIndex: 'applicationName' },
    { title: '应用编码', dataIndex: 'applicationCode' },
    { title: '覆盖（分钟）', slotName: 'portalMinutes', width: 180 },
    { title: '当前生效', slotName: 'effective', width: 180 },
    { title: '操作', slotName: 'operations', width: 80 },
  ];

  function applyFromSettings(data: AuthSessionSettings) {
    settings.value = data;
    appPolicies.value = data.applicationPortalPolicies ?? [];
    form.portalMinutes = secondsToMinutes(data.portalSessionTtlSeconds);
    form.oidcSessionMinutes = secondsToMinutes(data.oidcSessionTtlSeconds);
    form.oidcAccessMinutes = secondsToMinutes(data.oidcAccessTokenTtlSeconds);
    form.oidcRefreshMinutes = secondsToMinutes(data.oidcRefreshTokenTtlSeconds);
    form.authCodeMinutes = secondsToMinutes(
      data.oidcAuthorizationCodeTtlSeconds
    );
    for (const row of appPolicies.value) {
      appPortalMinutes[row.applicationId] = row.portalSessionTtlSeconds
        ? secondsToMinutes(row.portalSessionTtlSeconds)
        : null;
    }
  }

  async function load() {
    loading.value = true;
    try {
      applyFromSettings(await getAuthSessionSettings());
    } finally {
      loading.value = false;
    }
  }

  async function onSaveGlobal() {
    if (form.oidcRefreshMinutes < form.oidcAccessMinutes) {
      Message.error('OIDC RefreshToken 时长不能短于 AccessToken');
      return;
    }
    saving.value = true;
    try {
      applyFromSettings(
        await updateAuthSessionSettings({
          portalSessionTtlSeconds: form.portalMinutes * SECONDS_PER_MINUTE,
          oidcSessionTtlSeconds: form.oidcSessionMinutes * SECONDS_PER_MINUTE,
          oidcAccessTokenTtlSeconds:
            form.oidcAccessMinutes * SECONDS_PER_MINUTE,
          oidcRefreshTokenTtlSeconds:
            form.oidcRefreshMinutes * SECONDS_PER_MINUTE,
          oidcAuthorizationCodeTtlSeconds:
            form.authCodeMinutes * SECONDS_PER_MINUTE,
        })
      );
      Message.success('全局策略已保存');
    } finally {
      saving.value = false;
    }
  }

  async function onSaveApp(row: ApplicationPortalSessionPolicy) {
    savingAppId.value = row.applicationId;
    try {
      const minutes = appPortalMinutes[row.applicationId];
      const portalSessionTtlSeconds =
        minutes === null || minutes === undefined
          ? null
          : minutes * SECONDS_PER_MINUTE;
      applyFromSettings(
        await updateApplicationPortalSessionTtl(
          row.applicationId,
          portalSessionTtlSeconds
        )
      );
      Message.success(`已更新「${row.applicationName}」策略`);
    } finally {
      savingAppId.value = null;
    }
  }

  async function onReset() {
    try {
      await Modal.confirm({
        title: '恢复全局默认',
        content: '将清除平台上的 OIDC/门户全局覆盖，恢复为环境变量默认值。',
      });
    } catch {
      return;
    }
    saving.value = true;
    try {
      applyFromSettings(await resetAuthSessionSettings());
      Message.success('已恢复全局默认策略');
    } finally {
      saving.value = false;
    }
  }

  onMounted(load);
</script>

<style scoped lang="less">
  .container {
    padding: 0 20px 20px;
  }
</style>
