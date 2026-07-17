import type { AxiosError } from "axios";
import { ElMessage } from "element-plus";
import { useUserStoreHook } from "@/store/modules/user";
import { skipAutoSso } from "@/utils/oidc";

/** 与 IAM `createAuthSessionTerminatedException` 一致 */
export const AUTH_SESSION_TERMINATED = "AUTH_SESSION_TERMINATED";

const DEFAULT_MESSAGE = "登录会话已失效，请重新登录";

/** 已触发会话失效退出，后续同类错误不再弹窗 */
let sessionLogoutCommitted = false;

export type AuthSessionTerminatedError = AxiosError & {
  authSessionTerminated?: boolean;
};

function normalizeMessage(raw: unknown): string {
  if (typeof raw === "string" && raw.trim()) return raw;
  if (Array.isArray(raw)) {
    const joined = raw.filter(item => typeof item === "string").join(", ");
    if (joined) return joined;
  }
  return DEFAULT_MESSAGE;
}

function parseErrorPayload(raw: unknown): Record<string, unknown> | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "string") {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
    return null;
  }
  if (typeof raw === "object") {
    return raw as Record<string, unknown>;
  }
  return null;
}

/** 从 IAM 响应体（含 axios error）解析是否为会话失效 */
export function extractAuthSessionTerminatedFromBody(body: unknown): string | null {
  const data = parseErrorPayload(body);
  if (!data) return null;
  if (data.errorCode === AUTH_SESSION_TERMINATED) {
    return normalizeMessage(data.message);
  }
  return null;
}

/** 从 axios / IAM / Nest 错误体解析会话失效文案 */
export function extractAuthSessionTerminatedMessage(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const axiosErr = error as AxiosError<unknown>;
  const fromResponse = extractAuthSessionTerminatedFromBody(axiosErr.response?.data);
  if (fromResponse) return fromResponse;
  return extractAuthSessionTerminatedFromBody(error);
}

export function tagAuthSessionTerminatedError(error: unknown): void {
  if (!error || typeof error !== "object") return;
  (error as AuthSessionTerminatedError).authSessionTerminated = true;
}

export function isSessionLogoutCommitted(): boolean {
  return sessionLogoutCommitted;
}

/** 会话失效流程中或已标记的错误，页面 catch 应跳过二次提示 */
export function isAuthSessionTerminatedError(error: unknown): boolean {
  if (
    error &&
    typeof error === "object" &&
    (error as AuthSessionTerminatedError).authSessionTerminated
  ) {
    return true;
  }
  return sessionLogoutCommitted && extractAuthSessionTerminatedMessage(error) !== null;
}

function showSessionTerminatedMessage(text: string): void {
  ElMessage.closeAll();
  ElMessage({
    message: text,
    type: "error",
    duration: 4000,
    showClose: true,
    grouping: true,
    customClass: "pure-message"
  });
}

/**
 * 捕获会话/令牌失效：提示后端 message，清本地登录态并跳转登录页。
 * @returns 是否已处理（调用方可选择不再弹通用错误）
 */
export async function handleAuthSessionTerminatedIfNeeded(
  error: unknown
): Promise<boolean> {
  const text = extractAuthSessionTerminatedMessage(error);
  if (!text) return false;

  tagAuthSessionTerminatedError(error);

  if (sessionLogoutCommitted) return true;

  sessionLogoutCommitted = true;
  skipAutoSso();
  showSessionTerminatedMessage(text);
  try {
    await useUserStoreHook().logOutLocal();
  } catch {
    sessionLogoutCommitted = false;
    throw new Error("会话失效后本地登出失败");
  }
  return true;
}

/** 登录成功后重置，避免上次会话失效状态影响新会话 */
export function resetAuthSessionTerminatedState(): void {
  sessionLogoutCommitted = false;
}

/** @deprecated 单测用 */
export function resetAuthSessionTerminatedStateForTests(): void {
  resetAuthSessionTerminatedState();
}
