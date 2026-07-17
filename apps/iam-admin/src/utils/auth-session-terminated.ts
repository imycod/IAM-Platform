import type { AxiosError } from "axios";
import { message } from "@/utils/message";
import { useUserStoreHook } from "@/store/modules/user";
import { skipAutoSso } from "@/utils/oidc";

/** 与 IAM `createAuthSessionTerminatedException` 一致 */
export const AUTH_SESSION_TERMINATED = "AUTH_SESSION_TERMINATED";

const DEFAULT_MESSAGE = "登录会话已失效，请重新登录";

let handling = false;

function normalizeMessage(raw: unknown): string {
  if (typeof raw === "string" && raw.trim()) return raw;
  if (Array.isArray(raw)) {
    const joined = raw.filter((item) => typeof item === "string").join(", ");
    if (joined) return joined;
  }
  return DEFAULT_MESSAGE;
}

/** 从 axios / IAM / Nest 错误体解析会话失效文案 */
export function extractAuthSessionTerminatedMessage(
  error: unknown
): string | null {
  const axiosErr = error as AxiosError<Record<string, unknown>>;
  const data = axiosErr?.response?.data;
  if (!data || typeof data !== "object") return null;

  const errorCode = data.errorCode;
  if (errorCode === AUTH_SESSION_TERMINATED) {
    return normalizeMessage(data.message);
  }

  const code = data.code ?? data.statusCode;
  if (code === 401 && errorCode === AUTH_SESSION_TERMINATED) {
    return normalizeMessage(data.message);
  }

  return null;
}

/**
 * 捕获会话/令牌失效：提示后端 message，清本地登录态并跳转登录页。
 * @returns 是否已处理（调用方可选择不再弹通用错误）
 */
export async function handleAuthSessionTerminatedIfNeeded(
  error: unknown
): Promise<boolean> {
  const text = extractAuthSessionTerminatedMessage(error);
  if (!text || handling) return false;

  handling = true;
  try {
    skipAutoSso();
    message(text, { type: "error", duration: 4000, showClose: true });
    await useUserStoreHook().logOutLocal();
    return true;
  } finally {
    handling = false;
  }
}
