import { onMounted, onUnmounted, ref } from "vue";
import Cookies from "js-cookie";
import { getToken, multipleTabsKey } from "@/utils/auth";
import {
  clearOidcRedirectLock,
  clearSkipAutoSso,
  getLoginRouteQuery,
  shouldAutoSso,
  skipAutoSso,
  startOidcLogin,
  trySilentOidcLogin
} from "@/utils/oidc";
import { markSsoLoginComplete } from "@/utils/sso-logout-sync";
import { isSsoSession } from "@/utils/login-session";

export type SsoLoginPhase = "probing" | "entering" | "ready";

/**
 * Google 式 SSO：IdP 已有会话时自动 silent 续登（consent 由 consentMode 决定）；
 * 本地退出后 skipAutoSso 阻止自动续登；手动点击 SSO 走交互式授权。
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
    debugger
    if (redirecting || ssoBusy.value) {
      return;
    }
    clearSkipAutoSso();
    clearOidcRedirectLock();
    await beginAuthorize(false);
  }

  onMounted(async () => {
    document.addEventListener("visibilitychange", onTabVisible);
    window.addEventListener("focus", onTabVisible);
    debugger
    if (hasLocalSession()) {
      if (isSsoSession()) {
        markSsoLoginComplete();
      }
      onEnterApp();
      return;
    }

    const routeQuery = getLoginRouteQuery();
    if (routeQuery.get("sso_error") === "access_denied") {
      statusText.value = "您已拒绝授权，请重新点击 IAM 登录。";
      phase.value = "ready";
      return;
    }
    if (routeQuery.get("sso_interactive") === "1") {
      clearSkipAutoSso();
      await beginAuthorize(false);
      return;
    }

    if (shouldAutoSso()) {
      // 直接发起授权：IdP 有会话则静默回跳 code，否则落授权服务器登录页。
      // 不再跨源探测 sso/status（SameSite=Lax 跨源不带 cookie，探测不可靠）。
      await beginAuthorize(false);
      return;
    }
    skipAutoSso();

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
