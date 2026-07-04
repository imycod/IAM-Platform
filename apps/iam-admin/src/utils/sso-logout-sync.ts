import Cookies from "js-cookie";
import { getToken, multipleTabsKey } from "@/utils/auth";

const LOGOUT_EVENT_COOKIE = "iam_sso_logout_event";
const LOGIN_AT_KEY = "iam_sso_login_at";

let lastLogoutEventTs = 0;
let probeTimer: ReturnType<typeof setTimeout> | null = null;

function hasLocalSession(): boolean {
  const token = getToken();
  return !!(Cookies.get(multipleTabsKey) && token?.accessToken);
}

function parseLogoutEventCookie(): number {
  const m = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${LOGOUT_EVENT_COOKIE}=([^;]+)`)
  );
  if (!m) {
    return 0;
  }
  const ts = Number(decodeURIComponent(m[1]).split(":")[0]);
  return Number.isNaN(ts) ? 0 : ts;
}

function getLoginAt(): number {
  const raw = sessionStorage.getItem(LOGIN_AT_KEY);
  if (!raw) {
    return 0;
  }
  const ts = Number(raw);
  return Number.isNaN(ts) ? 0 : ts;
}

/** 登录成功后调用：忽略此前的 logout 事件 cookie，避免切 Tab 误触发本地登出 */
export function markSsoLoginComplete(): void {
  sessionStorage.setItem(LOGIN_AT_KEY, String(Date.now()));
  lastLogoutEventTs = parseLogoutEventCookie();
}

function probeRemoteLogout(onRemoteLogout: () => void): void {
  if (!hasLocalSession()) {
    return;
  }

  const cookieTs = parseLogoutEventCookie();
  const loginAt = getLoginAt();

  if (cookieTs > 0 && cookieTs > lastLogoutEventTs && cookieTs > loginAt) {
    lastLogoutEventTs = cookieTs;
    onRemoteLogout();
  }
}

/** 监听 IdP 全局登出：其它应用 RP-Initiated Logout 后，本应用清本地会话 */
export function setupSsoLogoutSync(onRemoteLogout: () => void): void {
  if (hasLocalSession()) {
    markSsoLoginComplete();
  }

  const scheduleProbe = () => {
    if (document.visibilityState !== "visible") {
      return;
    }
    if (probeTimer) {
      clearTimeout(probeTimer);
    }
    probeTimer = setTimeout(() => {
      probeTimer = null;
      probeRemoteLogout(onRemoteLogout);
    }, 300);
  };

  document.addEventListener("visibilitychange", scheduleProbe);
  window.addEventListener("focus", scheduleProbe);
}
