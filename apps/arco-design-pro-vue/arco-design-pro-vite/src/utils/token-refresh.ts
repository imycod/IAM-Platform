export const TOKEN_REFRESH_AHEAD_MS = 2 * 60 * 1000;

const MIN_AHEAD_MS = 10 * 1000;

export function parseExpiresMs(expires: number | string | undefined): number {
  if (expires === undefined || expires === null) {
    return 0;
  }
  if (typeof expires === 'number') {
    return expires;
  }
  const n = parseInt(expires, 10);
  if (!Number.isNaN(n) && String(n) === String(expires).trim()) {
    return n;
  }
  const parsed = Date.parse(expires);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function shouldRefreshAccessToken(
  expires: number | string | undefined
): boolean {
  const exp = parseExpiresMs(expires);
  if (!exp) {
    return false;
  }
  const remaining = exp - Date.now();
  if (remaining <= 0) {
    return true;
  }
  const ahead = Math.min(
    TOKEN_REFRESH_AHEAD_MS,
    Math.max(MIN_AHEAD_MS, remaining * 0.5)
  );
  return remaining <= ahead;
}

export type RefreshQueueItem = {
  resolve: (accessToken: string) => void;
  reject: (error: unknown) => void;
};

export function flushRefreshQueue(
  queue: RefreshQueueItem[],
  result: { ok: true; accessToken: string } | { ok: false; error: unknown }
): void {
  const pending = queue.splice(0, queue.length);
  if (result.ok) {
    pending.forEach((item) => item.resolve(result.accessToken));
  } else {
    pending.forEach((item) => item.reject(result.error));
  }
}
