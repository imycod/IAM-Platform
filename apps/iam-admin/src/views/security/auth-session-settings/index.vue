<script setup lang="ts">
import {
  getAuthSessionSettings,
  resetAuthSessionSettings,
  updateApplicationPortalSessionTtl,
  updateAuthSessionSettings,
  type ApplicationPortalSessionPolicy,
  type AuthSessionSettings
} from "@/api/auth-session-settings";
import { message } from "@/utils/message";
import { ElMessageBox } from "element-plus";
import { computed, onMounted, reactive, ref } from "vue";

defineOptions({
  name: "SecurityAuthSessionSettingsIndex"
});

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_DAY = 24 * 60 * 60;
/** 最长约 365 天（分钟） */
const MAX_MINUTES = 365 * 24 * 60;

function secondsToMinutes(seconds: number): number {
  return Math.max(1, Math.round(seconds / SECONDS_PER_MINUTE));
}

/** 当前生效：xx 分钟 / xx 天 */
function formatEffectiveDuration(seconds: number): string {
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
const settings = ref<AuthSessionSettings | null>(null);
const appPolicies = ref<ApplicationPortalSessionPolicy[]>([]);

const form = reactive({
  portalMinutes: 7 * 24 * 60,
  oidcSessionMinutes: 30 * 24 * 60,
  oidcAccessMinutes: 2 * 60,
  oidcRefreshMinutes: 30 * 24 * 60,
  authCodeMinutes: 5
});

/** 应用级编辑：分钟，null 表示使用全局默认 */
const appPortalMinutes = reactive<Record<string, number | null>>({});

const envHint = computed(() => {
  const env = settings.value?.envDefaults;
  if (!env) return "";
  return `环境变量默认：门户 ${secondsToMinutes(env.portalSessionTtlSeconds)} 分钟；OIDC SSO Session ${secondsToMinutes(env.oidcSessionTtlSeconds)} 分钟，AccessToken ${secondsToMinutes(env.oidcAccessTokenTtlSeconds)} 分钟，RefreshToken ${secondsToMinutes(env.oidcRefreshTokenTtlSeconds)} 分钟；授权码 ${secondsToMinutes(env.oidcAuthorizationCodeTtlSeconds)} 分钟`;
});

function applyFromSettings(data: AuthSessionSettings) {
  settings.value = data;
  appPolicies.value = data.applicationPortalPolicies ?? [];
  form.portalMinutes = secondsToMinutes(data.portalSessionTtlSeconds);
  form.oidcSessionMinutes = secondsToMinutes(data.oidcSessionTtlSeconds);
  form.oidcAccessMinutes = secondsToMinutes(data.oidcAccessTokenTtlSeconds);
  form.oidcRefreshMinutes = secondsToMinutes(data.oidcRefreshTokenTtlSeconds);
  form.authCodeMinutes = secondsToMinutes(data.oidcAuthorizationCodeTtlSeconds);
  for (const row of appPolicies.value) {
    appPortalMinutes[row.applicationId] = row.portalSessionTtlSeconds
      ? secondsToMinutes(row.portalSessionTtlSeconds)
      : null;
  }
}

async function load() {
  loading.value = true;
  try {
    const data = await getAuthSessionSettings();
    applyFromSettings(data);
  } catch (e: unknown) {
    message((e as Error)?.message ?? "加载会话策略失败", { type: "error" });
  } finally {
    loading.value = false;
  }
}

async function onSaveGlobal() {
  if (form.oidcRefreshMinutes < form.oidcAccessMinutes) {
    message("OIDC RefreshToken 时长不能短于 AccessToken", { type: "error" });
    return;
  }
  saving.value = true;
  try {
    const data = await updateAuthSessionSettings({
      portalSessionTtlSeconds: form.portalMinutes * SECONDS_PER_MINUTE,
      oidcSessionTtlSeconds: form.oidcSessionMinutes * SECONDS_PER_MINUTE,
      oidcAccessTokenTtlSeconds: form.oidcAccessMinutes * SECONDS_PER_MINUTE,
      oidcRefreshTokenTtlSeconds: form.oidcRefreshMinutes * SECONDS_PER_MINUTE,
      oidcAuthorizationCodeTtlSeconds: form.authCodeMinutes * SECONDS_PER_MINUTE
    });
    applyFromSettings(data);
    message("全局策略已保存", { type: "success" });
  } catch (e: unknown) {
    message((e as Error)?.message ?? "保存失败", { type: "error" });
  } finally {
    saving.value = false;
  }
}

async function onSaveApp(row: ApplicationPortalSessionPolicy) {
  savingAppId.value = row.applicationId;
  try {
    const minutes = appPortalMinutes[row.applicationId];
    const portalSessionTtlSeconds =
      minutes === null || minutes === undefined ? null : minutes * SECONDS_PER_MINUTE;
    const data = await updateApplicationPortalSessionTtl(
      row.applicationId,
      portalSessionTtlSeconds
    );
    applyFromSettings(data);
    message(`已更新「${row.applicationName}」账密 session 策略`, { type: "success" });
  } catch (e: unknown) {
    message((e as Error)?.message ?? "保存失败", { type: "error" });
  } finally {
    savingAppId.value = null;
  }
}

async function onReset() {
  try {
    await ElMessageBox.confirm(
      "将清除平台上的 OIDC/门户全局覆盖，恢复为环境变量默认值。各应用的账密 session 单独配置不受影响。",
      "恢复全局默认",
      { type: "warning" }
    );
  } catch {
    return;
  }
  saving.value = true;
  try {
    const data = await resetAuthSessionSettings();
    applyFromSettings(data);
    message("已恢复全局 OIDC/门户默认策略", { type: "success" });
  } catch (e: unknown) {
    message((e as Error)?.message ?? "操作失败", { type: "error" });
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  void load();
});
</script>

<template>
  <div v-loading="loading" class="main">
    <el-card shadow="never" class="mb-4">
      <template #header>
        <div class="card-header">
          <span>全局策略（OIDC + 账密默认）</span>
          <span class="hint">{{ envHint }}</span>
        </div>
      </template>

      <el-alert
        type="info"
        show-icon
        :closable="false"
        class="mb-4"
        title="说明"
      >
        <template #default>
          <p class="alert-p">
            所有时长均以分钟配置（保存后按秒存储）。账密登录使用单一 session token，前端在过期前调用
            <code>/api/portal/refresh-token</code> 滑动续期；可按应用单独覆盖门户 session，不含 SSO。
          </p>
          <p class="alert-p">
            OIDC SSO 为典型「短 AccessToken + 长 RefreshToken」：AccessToken / IdToken 用较短 TTL，RefreshToken
            用较长 TTL；SSO Session / Grant 单独配置。授权码全平台统一。RefreshToken 时长不得短于 AccessToken。
            联调极短 TTL（如 1 分钟 access）时，前端会在剩余约一半时间再 refresh，且 RefreshToken 需明显长于 AccessToken。
          </p>
        </template>
      </el-alert>

      <el-form label-width="240px" label-position="left" class="max-w-xl">
        <el-form-item label="账密门户 session 默认">
          <el-input-number v-model="form.portalMinutes" :min="1" :max="MAX_MINUTES" :step="1" />
          <span class="unit">分钟</span>
          <span v-if="settings" class="effective">
            当前生效：{{ formatEffectiveDuration(settings.portalSessionTtlSeconds) }}
          </span>
          <el-tag v-if="settings?.overrides.portalSessionTtlSeconds" size="small" type="warning" class="ml-2">
            平台覆盖
          </el-tag>
        </el-form-item>

        <el-form-item label="OIDC SSO Session / Grant">
          <el-input-number v-model="form.oidcSessionMinutes" :min="1" :max="MAX_MINUTES" :step="1" />
          <span class="unit">分钟</span>
          <span v-if="settings" class="effective">
            当前生效：{{ formatEffectiveDuration(settings.oidcSessionTtlSeconds) }}
          </span>
          <el-tag v-if="settings?.overrides.oidcSessionTtlSeconds" size="small" type="warning" class="ml-2">
            平台覆盖
          </el-tag>
        </el-form-item>

        <el-form-item label="OIDC AccessToken / IdToken">
          <el-input-number v-model="form.oidcAccessMinutes" :min="1" :max="MAX_MINUTES" :step="1" />
          <span class="unit">分钟</span>
          <span v-if="settings" class="effective">
            当前生效：{{ formatEffectiveDuration(settings.oidcAccessTokenTtlSeconds) }}
          </span>
          <el-tag
            v-if="settings?.overrides.oidcAccessTokenTtlSeconds"
            size="small"
            type="warning"
            class="ml-2"
          >
            平台覆盖
          </el-tag>
        </el-form-item>

        <el-form-item label="OIDC RefreshToken">
          <el-input-number v-model="form.oidcRefreshMinutes" :min="1" :max="MAX_MINUTES" :step="1" />
          <span class="unit">分钟</span>
          <span v-if="settings" class="effective">
            当前生效：{{ formatEffectiveDuration(settings.oidcRefreshTokenTtlSeconds) }}
          </span>
          <el-tag
            v-if="settings?.overrides.oidcRefreshTokenTtlSeconds"
            size="small"
            type="warning"
            class="ml-2"
          >
            平台覆盖
          </el-tag>
        </el-form-item>

        <el-form-item label="OIDC 授权码">
          <el-input-number v-model="form.authCodeMinutes" :min="1" :max="MAX_MINUTES" :step="1" />
          <span class="unit">分钟</span>
          <el-tag
            v-if="settings?.overrides.oidcAuthorizationCodeTtlSeconds"
            size="small"
            type="warning"
            class="ml-2"
          >
            平台覆盖
          </el-tag>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="saving" @click="onSaveGlobal">保存全局策略</el-button>
          <el-button :loading="saving" @click="onReset">恢复全局环境变量默认</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <template #header>
        <span>按应用：账密门户 session 过期时间</span>
      </template>

      <el-table :data="appPolicies" border stripe>
        <el-table-column label="应用" min-width="160">
          <template #default="{ row }">
            {{ row.applicationName }}
            <span class="hint">（{{ row.applicationCode }}）</span>
          </template>
        </el-table-column>
        <el-table-column label="单独配置（分钟）" width="220">
          <template #default="{ row }">
            <el-input-number
              v-model="appPortalMinutes[row.applicationId]"
              :min="1"
              :max="MAX_MINUTES"
              :step="1"
              :placeholder="'默认 ' + form.portalMinutes + ' 分钟'"
              controls-position="right"
              class="w-full"
            />
          </template>
        </el-table-column>
        <el-table-column label="当前生效" min-width="180">
          <template #default="{ row }">
            {{ formatEffectiveDuration(row.effectivePortalSessionTtlSeconds) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              :loading="savingAppId === row.applicationId"
              @click="onSaveApp(row)"
            >
              保存
            </el-button>
            <el-button
              link
              type="info"
              @click="
                appPortalMinutes[row.applicationId] = null;
                onSaveApp(row);
              "
            >
              用默认
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<style scoped>
.card-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
.hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.unit {
  margin-left: 8px;
  color: var(--el-text-color-secondary);
}
.mb-4 {
  margin-bottom: 16px;
}
.max-w-xl {
  max-width: 640px;
}
.effective {
  display: block;
  width: 100%;
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.alert-p {
  margin: 0 0 8px;
  line-height: 1.5;
}
.alert-p:last-child {
  margin-bottom: 0;
}
.w-full {
  width: 100%;
}
</style>
