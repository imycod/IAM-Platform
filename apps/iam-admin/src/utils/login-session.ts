/** 区分 SSO（OIDC）与账密（portal）登录，控制全局登出范围 */

const LOGIN_METHOD_KEY = "iam_client_login_method";

export type LoginMethod = "sso" | "password";

export function setLoginMethod(method: LoginMethod): void {
  sessionStorage.setItem(LOGIN_METHOD_KEY, method);
}

export function getLoginMethod(): LoginMethod | null {
  const v = sessionStorage.getItem(LOGIN_METHOD_KEY);
  return v === "sso" || v === "password" ? v : null;
}

export function isSsoSession(): boolean {
  return getLoginMethod() === "sso";
}

export function clearLoginMethod(): void {
  sessionStorage.removeItem(LOGIN_METHOD_KEY);
}
