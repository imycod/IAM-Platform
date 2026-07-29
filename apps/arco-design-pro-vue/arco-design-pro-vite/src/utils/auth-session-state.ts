/** 会话失效状态（独立模块，避免 auth ↔ store 循环依赖） */
let sessionLogoutCommitted = false;

export function isSessionLogoutCommitted(): boolean {
  return sessionLogoutCommitted;
}

export function setSessionLogoutCommitted(value: boolean): void {
  sessionLogoutCommitted = value;
}

export function resetAuthSessionTerminatedState(): void {
  sessionLogoutCommitted = false;
}
