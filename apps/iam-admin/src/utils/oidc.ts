/** iam-client OIDC SSO（与 public/oidc.js 逻辑一致，供 Vue 内调用） */
import { sha256 } from "./pkce-sha256";
export interface IamClientConfig {
  iamBaseUrl: string;
  oidcIssuer: string;
  clientId: string;
  redirectUri: string;
  scopes: string;
  appCode: string;
}

function resolveClientConfig(): IamClientConfig {
  const fromWindow = (window as unknown as { IAM_CLIENT_CONFIG?: IamClientConfig })
    .IAM_CLIENT_CONFIG;
  if (fromWindow?.oidcIssuer) {
    return { redirectUri: "", ...fromWindow };
  }
  // 兜底：优先读 Vite 注入的 import.meta.env（构建期），再退回 localhost
  const env = import.meta.env as Record<string, string | undefined>;
  return {
    iamBaseUrl: env.VITE_IAM_BASE_URL || "http://localhost:3000",
    oidcIssuer: env.VITE_OIDC_ISSUER || "http://localhost:3000/oidc",
    clientId: env.VITE_OIDC_CLIENT_ID || "iam-admin-spa",
    redirectUri: "",
    scopes: env.VITE_OIDC_SCOPES || "openid profile email",
    appCode: env.VITE_APP_CODE || "iam-admin"
  };
}

export const IAM_CLIENT_CONFIG: IamClientConfig = resolveClientConfig();

/** IdP 源（auth 域）：SSO Session cookie 所在域，探测会话必须打这里 */
export function resolveIdpOrigin(cfg: IamClientConfig = IAM_CLIENT_CONFIG): string {
  try {
    return new URL(cfg.oidcIssuer).origin;
  } catch {
    return cfg.iamBaseUrl.replace(/\/$/, "");
  }
}

export function resolveOidcRedirectUri(
  cfg: IamClientConfig = IAM_CLIENT_CONFIG
): string {
  return cfg.redirectUri || `${window.location.origin}/callback.html`;
}

const STORAGE_VERIFIER_PREFIX = "iam_client_pkce_verifier:";
const STORAGE_SILENT_PREFIX = "iam_client_oidc_silent:";
const STORAGE_STATE = "iam_client_oauth_state";
const REDIRECT_LOCK = "iam_client_oidc_redirecting";
const STORAGE_TOKENS = "iam_client_oidc_tokens";
const SKIP_SSO_KEY = "iam_client_skip_auto_sso";
const REDIRECT_LOCK_TTL_MS = 120_000;

function pkceStore(): Storage {
  return localStorage;
}

function acquireRedirectLock(): boolean {
  const store = pkceStore();
  const raw = store.getItem(REDIRECT_LOCK);
  if (raw) {
    const ts = Number(raw);
    if (!Number.isNaN(ts) && Date.now() - ts < REDIRECT_LOCK_TTL_MS) {
      return false;
    }
  }
  store.setItem(REDIRECT_LOCK, String(Date.now()));
  return true;
}

function releaseRedirectLock(): void {
  pkceStore().removeItem(REDIRECT_LOCK);
}

function unwrapApiData<T extends Record<string, unknown>>(json: T): T {
  const wrapped = json as T & { code?: number; data?: T };
  if (wrapped.code === 0 && wrapped.data != null) {
    return wrapped.data as T;
  }
  return json;
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = "";
  bytes.forEach(b => {
    str += String.fromCharCode(b);
  });
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomString(len: number): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, x => chars[x % chars.length]).join("");
}

export interface OidcAuthorizeOptions {
  silent?: boolean;
}

async function startOidcAuthorize(
  cfg: IamClientConfig = IAM_CLIENT_CONFIG,
  options?: OidcAuthorizeOptions
): Promise<void> {
  if (!acquireRedirectLock()) {
    throw new Error("oidc_redirect_lock_busy");
  }

  const store = pkceStore();
  const verifier = randomString(64);
  const challenge = base64UrlEncode(await sha256(verifier));
  const state = randomString(32);
  store.setItem(`${STORAGE_VERIFIER_PREFIX}${state}`, verifier);
  store.setItem(STORAGE_STATE, state);
  if (options?.silent) {
    store.setItem(`${STORAGE_SILENT_PREFIX}${state}`, "1");
  }

  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: resolveOidcRedirectUri(cfg),
    response_type: "code",
    scope: cfg.scopes,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256"
  });
  if (options?.silent) {
    params.set("prompt", "none");
  }

  window.location.href = `${cfg.oidcIssuer}/auth?${params.toString()}`;
}

export function startOidcLogin(
  cfg: IamClientConfig = IAM_CLIENT_CONFIG
): Promise<void> {
  return startOidcAuthorize(cfg);
}

export function trySilentOidcLogin(
  cfg: IamClientConfig = IAM_CLIENT_CONFIG
): Promise<void> {
  return startOidcAuthorize(cfg, { silent: true });
}

export async function checkIamSsoSession(
  cfg: IamClientConfig = IAM_CLIENT_CONFIG
): Promise<boolean> {
  try {
    // 必须打 IdP 同源（auth），SSO cookie 不在业务 api 域
    const res = await fetch(
      `${resolveIdpOrigin(cfg)}/api/interaction/sso/status`,
      { credentials: "include" }
    );
    if (!res.ok) {
      return false;
    }
    const json = (await res.json()) as { authenticated?: boolean } & {
      code?: number;
      data?: { authenticated?: boolean };
    };
    const data = unwrapApiData(json);
    return !!data.authenticated;
  } catch {
    return false;
  }
}

export function skipAutoSso(): void {
  sessionStorage.setItem(SKIP_SSO_KEY, "1");
}

export function shouldAutoSso(): boolean {
  return sessionStorage.getItem(SKIP_SSO_KEY) !== "1";
}

export function clearSkipAutoSso(): void {
  sessionStorage.removeItem(SKIP_SSO_KEY);
}

export function getLoginRouteQuery(): URLSearchParams {
  const hash = window.location.hash || "";
  const q = hash.indexOf("?") >= 0 ? hash.slice(hash.indexOf("?") + 1) : "";
  return new URLSearchParams(q);
}

export function clearOidcRedirectLock(): void {
  releaseRedirectLock();
}

/** 登出时清理 PKCE 状态，避免残留 state 干扰其它 Tab SSO */
export function clearOidcPkceState(): void {
  const store = pkceStore();
  const keysToRemove: string[] = [];
  for (let i = 0; i < store.length; i++) {
    const key = store.key(i);
    if (
      key &&
      (key.startsWith(STORAGE_VERIFIER_PREFIX) ||
        key.startsWith(STORAGE_SILENT_PREFIX) ||
        key === STORAGE_STATE ||
        key === REDIRECT_LOCK)
    ) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(k => store.removeItem(k));
}

export function resolvePostLogoutRedirectUri(
  cfg: IamClientConfig = IAM_CLIENT_CONFIG
): string {
  return `${window.location.origin}/logout.html`;
}

export function getStoredOidcTokens(): {
  id_token?: string;
  access_token?: string;
} | null {
  const raw = localStorage.getItem(STORAGE_TOKENS);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as { id_token?: string; access_token?: string };
  } catch {
    return null;
  }
}

/** 仅清本应用 SSO 本地会话（不触发 IdP 登出） */
export function clearLocalSsoSession(): void {
  localStorage.removeItem(STORAGE_TOKENS);
  clearOidcPkceState();
}

/** 吊销当前 access_token，保留 IdP SSO Session（业务系统本地退出） */
export async function revokeCurrentOidcAccessToken(
  cfg: IamClientConfig = IAM_CLIENT_CONFIG
): Promise<void> {
  const tokens = getStoredOidcTokens();
  const accessToken = tokens?.access_token;
  if (!accessToken) {
    return;
  }
  try {
    await fetch(`${cfg.iamBaseUrl.replace(/\/$/, "")}/api/auth/oidc-local-logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  } catch {
    // ignore
  }
}

/** RP-Initiated Logout：销毁 IdP SSO 会话并通知其它已登录应用 */
export function performGlobalLogout(
  cfg: IamClientConfig = IAM_CLIENT_CONFIG
): void {
  const tokens = getStoredOidcTokens();
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    post_logout_redirect_uri: resolvePostLogoutRedirectUri(cfg)
  });
  if (tokens?.id_token) {
    params.set("id_token_hint", tokens.id_token);
  }
  window.location.href = `${cfg.oidcIssuer}/session/end?${params.toString()}`;
}

/**
 * 应用入口 SSO：先探测 IdP 会话，有则静默，无则交互式（最终到 auth 登录页 ?uid=）。
 * 供路由守卫调用，避免先落到 /#/login。
 */
export async function beginSsoRedirect(
  cfg: IamClientConfig = IAM_CLIENT_CONFIG
): Promise<void> {
  if (!shouldAutoSso()) {
    return;
  }
  clearOidcRedirectLock();
  const iamSession = await checkIamSsoSession(cfg);
  if (iamSession) {
    await trySilentOidcLogin(cfg);
  } else {
    await startOidcLogin(cfg);
  }
}
