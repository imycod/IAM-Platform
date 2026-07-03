<script setup lang="ts">
import Motion from "./utils/motion";
import { useRouter } from "vue-router";
import { message } from "@/utils/message";
import { loginRules } from "./utils/rule";
import { onMounted, ref, reactive, toRaw } from "vue";
import { debounce } from "@pureadmin/utils";
import { useNav } from "@/layout/hooks/useNav";
import { useEventListener } from "@vueuse/core";
import type { FormInstance } from "element-plus";
import { useLayout } from "@/layout/hooks/useLayout";
import { useUserStoreHook } from "@/store/modules/user";
import { initRouter, getTopMenu } from "@/router/utils";
import { bg, avatar, illustration } from "./utils/static";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { useDataThemeChange } from "@/layout/hooks/useDataThemeChange";
import {
  startOidcLogin,
  shouldAutoSso,
  skipAutoSso,
  clearSkipAutoSso
} from "@/utils/oidc";
import Cookies from "js-cookie";
import { getToken, multipleTabsKey } from "@/utils/auth";

import dayIcon from "@/assets/svg/day.svg?component";
import darkIcon from "@/assets/svg/dark.svg?component";
import Lock from "~icons/ri/lock-fill";
import User from "~icons/ri/user-3-fill";

defineOptions({
  name: "Login"
});

const router = useRouter();
const loading = ref(false);
const disabled = ref(false);
const ruleFormRef = ref<FormInstance>();

const { initStorage } = useLayout();
initStorage();

const { dataTheme, overallStyle, dataThemeChange } = useDataThemeChange();
dataThemeChange(overallStyle.value);
const { title } = useNav();

const ruleForm = reactive({
  username: "admin@qq.com",
  password: "123456"
});

const showPasswordForm = ref(!shouldAutoSso());

const onSsoLogin = () => {
  clearSkipAutoSso();
  loading.value = true;
  startOidcLogin().catch(() => {
    loading.value = false;
    message("跳转 SSO 失败", { type: "error" });
  });
};

const onUsePasswordLogin = () => {
  skipAutoSso();
  showPasswordForm.value = true;
};

onMounted(() => {
  const token = getToken();
  if (Cookies.get(multipleTabsKey) && token?.accessToken) {
    initRouter().then(() => {
      router.replace(getTopMenu(true)?.path ?? "/welcome");
    });
    return;
  }
  if (shouldAutoSso()) {
    onSsoLogin();
  }
});

const onLogin = async (formEl: FormInstance | undefined) => {
  if (!formEl) return;
  await formEl.validate(valid => {
    if (valid) {
      loading.value = true;
      useUserStoreHook()
        .loginByUsername({
          username: ruleForm.username,
          password: ruleForm.password
        })
        .then(res => {
          if (res.success) {
            // 获取后端路由
            return initRouter().then(() => {
              disabled.value = true;
              router
                .push(getTopMenu(true).path)
                .then(() => {
                  message("登录成功", { type: "success" });
                })
                .finally(() => (disabled.value = false));
            });
          } else {
            message("登录失败", { type: "error" });
          }
        })
        .catch(error => {
          message(error?.response?.data?.message ?? error?.message ?? "登录失败", { type: "error" });
        })
        .finally(() => (loading.value = false));
    }
  });
};

const immediateDebounce: any = debounce(
  formRef => onLogin(formRef),
  1000,
  true
);

useEventListener(document, "keydown", ({ code }) => {
  if (
    ["Enter", "NumpadEnter"].includes(code) &&
    !disabled.value &&
    !loading.value
  )
    immediateDebounce(ruleFormRef.value);
});
</script>

<template>
  <div class="select-none">
    <img :src="bg" class="wave" />
    <div class="flex-c absolute right-5 top-3">
      <!-- 主题 -->
      <el-switch
        v-model="dataTheme"
        inline-prompt
        :active-icon="dayIcon"
        :inactive-icon="darkIcon"
        @change="dataThemeChange"
      />
    </div>
    <div class="login-container">
      <div class="img">
        <component :is="toRaw(illustration)" />
      </div>
      <div class="login-box">
        <div class="login-form">
          <avatar class="avatar" />
          <Motion>
            <h2 class="outline-hidden">{{ title }}</h2>
          </Motion>

          <Motion v-if="!showPasswordForm" :delay="100">
            <p class="text-center text-gray-500 text-sm mb-4">
              正在跳转 IAM 统一认证…
            </p>
          </Motion>

          <template v-if="!showPasswordForm">
            <Motion :delay="200">
              <el-button
                class="w-full"
                size="default"
                type="primary"
                :loading="loading"
                @click="onSsoLogin"
              >
                SSO 登录（IAM 统一认证）
              </el-button>
            </Motion>
            <Motion :delay="250">
              <el-button
                class="w-full mt-2!"
                size="default"
                link
                type="primary"
                @click="onUsePasswordLogin"
              >
                使用账密登录（非 SSO）
              </el-button>
            </Motion>
          </template>

          <el-form
            v-if="showPasswordForm"
            ref="ruleFormRef"
            :model="ruleForm"
            :rules="loginRules"
            size="large"
          >
            <Motion :delay="100">
              <el-form-item
                :rules="[
                  {
                    required: true,
                    message: '请输入账号',
                    trigger: 'blur'
                  }
                ]"
                prop="username"
              >
                <el-input
                  v-model="ruleForm.username"
                  clearable
                  placeholder="账号"
                  :prefix-icon="useRenderIcon(User)"
                />
              </el-form-item>
            </Motion>

            <Motion :delay="150">
              <el-form-item prop="password">
                <el-input
                  v-model="ruleForm.password"
                  clearable
                  show-password
                  placeholder="密码"
                  :prefix-icon="useRenderIcon(Lock)"
                />
              </el-form-item>
            </Motion>

            <Motion :delay="250">
              <el-button
                class="w-full mt-4!"
                size="default"
                type="primary"
                :loading="loading"
                :disabled="disabled"
                @click="onLogin(ruleFormRef)"
              >
                账密登录
              </el-button>
            </Motion>
            <Motion :delay="300">
              <el-button
                class="w-full mt-2!"
                size="default"
                link
                type="primary"
                @click="onSsoLogin"
              >
                改用 SSO 登录
              </el-button>
            </Motion>
          </el-form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url("@/style/login.css");
</style>

<style lang="scss" scoped>
:deep(.el-input-group__append, .el-input-group__prepend) {
  padding: 0;
}
</style>
