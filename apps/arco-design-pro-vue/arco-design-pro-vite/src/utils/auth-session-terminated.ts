import type { AxiosError } from 'axios';
import { Message } from '@arco-design/web-vue';
import { removeToken } from '@/utils/auth';
import {
  isSessionLogoutCommitted,
  setSessionLogoutCommitted,
} from '@/utils/auth-session-state';

export { resetAuthSessionTerminatedState } from '@/utils/auth-session-state';

export const AUTH_SESSION_TERMINATED = 'AUTH_SESSION_TERMINATED';

const DEFAULT_MESSAGE = '登录会话已失效，请重新登录';

export type AuthSessionTerminatedError = AxiosError & {
  authSessionTerminated?: boolean;
};

function normalizeMessage(raw: unknown): string {
  if (typeof raw === 'string' && raw.trim()) return raw;
  if (Array.isArray(raw)) {
    const joined = raw.filter((item) => typeof item === 'string').join(', ');
    if (joined) return joined;
  }
  return DEFAULT_MESSAGE;
}

function parseErrorPayload(raw: unknown): Record<string, unknown> | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
    return null;
  }
  if (typeof raw === 'object') {
    return raw as Record<string, unknown>;
  }
  return null;
}

export function extractAuthSessionTerminatedFromBody(
  body: unknown
): string | null {
  const data = parseErrorPayload(body);
  if (!data) return null;
  if (data.errorCode === AUTH_SESSION_TERMINATED) {
    return normalizeMessage(data.message);
  }
  return null;
}

export function extractAuthSessionTerminatedMessage(
  error: unknown
): string | null {
  if (!error || typeof error !== 'object') return null;
  const axiosErr = error as AxiosError<unknown>;
  const fromResponse = extractAuthSessionTerminatedFromBody(
    axiosErr.response?.data
  );
  if (fromResponse) return fromResponse;
  return extractAuthSessionTerminatedFromBody(error);
}

export function tagAuthSessionTerminatedError(error: unknown): void {
  if (!error || typeof error !== 'object') return;
  (error as AuthSessionTerminatedError).authSessionTerminated = true;
}

export function isAuthSessionTerminatedError(error: unknown): boolean {
  if (
    error &&
    typeof error === 'object' &&
    (error as AuthSessionTerminatedError).authSessionTerminated
  ) {
    return true;
  }
  return (
    isSessionLogoutCommitted() &&
    extractAuthSessionTerminatedMessage(error) !== null
  );
}

export async function handleAuthSessionTerminatedIfNeeded(
  error: unknown
): Promise<boolean> {
  const text = extractAuthSessionTerminatedMessage(error);
  if (!text) return false;

  tagAuthSessionTerminatedError(error);

  if (isSessionLogoutCommitted()) return true;

  setSessionLogoutCommitted(true);
  Message.error({ content: text, duration: 4000 });
  try {
    removeToken();
    const loginPath = `${import.meta.env.BASE_URL || '/'}login`.replace(
      /([^:]\/)\/+/g,
      '$1'
    );
    window.location.assign(loginPath);
  } catch {
    setSessionLogoutCommitted(false);
    throw new Error('会话失效后本地登出失败');
  }
  return true;
}
