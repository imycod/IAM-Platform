import { onMounted, onUnmounted, ref } from "vue";
import Cookies from "js-cookie";
import { getToken, multipleTabsKey } from "@/utils/auth";
import {
  checkIamSsoSession,
  clearOidcRedirectLock,
  clearSkipAutoSso,
  getLoginRouteQuery,
  skipAutoSso,
  startOidcLogin,
  trySilentOidcLogin
} from "@/utils/oidc";
import { markSsoLoginComplete } from "@/utils/sso-logout-sync";
import { isSsoSession } from "@/utils/login-session";

export type SsoLoginPhase = "probing" | "entering" | "ready";

/**
 * 默认账密登录；仅点击 SSO 才走 OIDC / login.iam.local。
 * sso_interactive 回调、已有 SSO 本地会话时自动续登。
 */
export function useSsoLoginPage(onEnterApp: () => void) {
  const phase = ref<SsoLoginPhase>("ready");
  const statusText = ref("");
  const ssoBusy = ref(false);

  let redirecting = false;

  function hasLocalSession(): boolean {
    const token = getToken();
    return !!(Cookies.get(multipleTabsKey) && token?.accessToken);
  }

  function resetSsoBusy() {
    redirecting = false;
    ssoBusy.value = false;
    phase.value = "ready";
    statusText.value = "";
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
      clearOidcRedirectLock();
      if (silent) {
        await trySilentOidcLogin();
      } else {
        await startOidcLogin();
      }
    } catch (err) {
      const lockBusy =
        err instanceof Error && err.message === "oidc_redirect_lock_busy";
      resetSsoBusy();
      if (lockBusy) {
        statusText.value = "正在重试 SSO…";
        ssoBusy.value = true;
        clearOidcRedirectLock();
        await new Promise(r => setTimeout(r, 200));
        return beginAuthorize(silent);
      }
    }
  }

  function onTabVisible() {
    if (document.visibilityState !== "visible") {
      return;
    }
    if (hasLocalSession()) {
      if (isSsoSession()) {
        markSsoLoginComplete();
      }
      onEnterApp();
    }
  }

  async function onManualSsoLogin() {
    if (redirecting || ssoBusy.value) {
      return;
    }
    clearSkipAutoSso();
    clearOidcRedirectLock();
    const iamSession = await checkIamSsoSession();
    await beginAuthorize(iamSession);
  }

  onMounted(async () => {
    skipAutoSso();

    document.addEventListener("visibilitychange", onTabVisible);
    window.addEventListener("focus", onTabVisible);

    if (hasLocalSession()) {
      if (isSsoSession()) {
        markSsoLoginComplete();
      }
      onEnterApp();
      return;
    }

    const routeQuery = getLoginRouteQuery();
    if (routeQuery.get("sso_interactive") === "1") {
      clearSkipAutoSso();
      await beginAuthorize(false);
      return;
    }

    phase.value = "ready";
    statusText.value = "";
    ssoBusy.value = false;
  });

  onUnmounted(() => {
    document.removeEventListener("visibilitychange", onTabVisible);
    window.removeEventListener("focus", onTabVisible);
  });

  return {
    phase,
    statusText,
    ssoBusy,
    onManualSsoLogin
  };
}
