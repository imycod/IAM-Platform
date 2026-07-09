import { setLoginMethod } from "@/utils/login-session";

const LOGIN_AT_KEY = "iam_sso_login_at";

/** SSO 登录成功后调用（记录登录方式，供登录页逻辑使用） */
export function markSsoLoginComplete(): void {
  setLoginMethod("sso");
  sessionStorage.setItem(LOGIN_AT_KEY, String(Date.now()));
}

/** 各 SaaS 独立退出，不跨应用同步登出（保留 API 兼容 main.ts） */
export function setupSsoLogoutSync(_onRemoteLogout: () => void): void {
  // no-op
}
