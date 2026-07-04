import { onMounted, onUnmounted, ref } from "vue";
import Cookies from "js-cookie";
import { getToken, multipleTabsKey } from "@/utils/auth";
import {
  checkIamSsoSession,
  clearSkipAutoSso,
  getLoginRouteQuery,
  shouldAutoSso,
  skipAutoSso,
  startOidcLogin,
  trySilentOidcLogin
} from "@/utils/oidc";
import { markSsoLoginComplete } from "@/utils/sso-logout-sync";

export type SsoLoginPhase = "probing" | "entering" | "ready";

export function useSsoLoginPage(onEnterApp: () => void) {
  const phase = ref<SsoLoginPhase>("probing");
  const statusText = ref("正在检测登录状态…");
  const ssoBusy = ref(false);
  const showPasswordForm = ref(!shouldAutoSso());

  let redirecting = false;
  let lastProbeAt = 0;

  function hasLocalSession(): boolean {
    const token = getToken();
    return !!(Cookies.get(multipleTabsKey) && token?.accessToken);
  }

  async function beginAuthorize(silent: boolean) {
    if (redirecting) {
      return;
    }
    redirecting = true;
    ssoBusy.value = true;
    phase.value = "entering";
    statusText.value = silent
      ? "检测到统一登录会话，正在进入…"
      : "正在跳转 IAM 统一认证…";
    try {
      if (silent) {
        await trySilentOidcLogin();
      } else {
        await startOidcLogin();
      }
    } catch {
      redirecting = false;
      ssoBusy.value = false;
      phase.value = "ready";
      statusText.value = "";
    }
  }

  async function probeAndRecover(silentOnly: boolean) {
    if (!shouldAutoSso() || redirecting || hasLocalSession()) {
      if (hasLocalSession()) {
        onEnterApp();
      }
      return;
    }

    const now = Date.now();
    if (now - lastProbeAt < 800) {
      return;
    }
    lastProbeAt = now;

    phase.value = "probing";
    statusText.value = "正在检测登录状态…";

    const iamSession = await checkIamSsoSession();
    if (iamSession) {
      await beginAuthorize(true);
      return;
    }

    if (!silentOnly) {
      await beginAuthorize(false);
      return;
    }

    phase.value = "ready";
    statusText.value = "";
    ssoBusy.value = false;
  }

  function onTabVisible() {
    if (document.visibilityState !== "visible") {
      return;
    }
    if (hasLocalSession()) {
      markSsoLoginComplete();
      onEnterApp();
      return;
    }
    if (phase.value === "ready" && shouldAutoSso() && !redirecting) {
      void probeAndRecover(false);
      return;
    }
    void probeAndRecover(true);
  }

  async function onManualSsoLogin() {
    if (redirecting || ssoBusy.value) {
      return;
    }
    clearSkipAutoSso();
    const iamSession = await checkIamSsoSession();
    await beginAuthorize(iamSession);
  }

  function onUsePasswordLogin() {
    skipAutoSso();
    showPasswordForm.value = true;
    phase.value = "ready";
    statusText.value = "";
  }

  onMounted(async () => {
    document.addEventListener("visibilitychange", onTabVisible);
    window.addEventListener("focus", onTabVisible);

    if (hasLocalSession()) {
      markSsoLoginComplete();
      onEnterApp();
      return;
    }

    if (!shouldAutoSso()) {
      phase.value = "ready";
      statusText.value = "";
      return;
    }

    const routeQuery = getLoginRouteQuery();
    if (routeQuery.get("sso_interactive") === "1") {
      await beginAuthorize(false);
      return;
    }

    const iamSession = await checkIamSsoSession();
    if (iamSession) {
      await beginAuthorize(true);
      return;
    }

    if (document.visibilityState === "visible") {
      await beginAuthorize(false);
    } else {
      phase.value = "ready";
      statusText.value = "";
      ssoBusy.value = false;
    }
  });

  onUnmounted(() => {
    document.removeEventListener("visibilitychange", onTabVisible);
    window.removeEventListener("focus", onTabVisible);
  });

  return {
    phase,
    statusText,
    ssoBusy,
    showPasswordForm,
    onManualSsoLogin,
    onUsePasswordLogin
  };
}
