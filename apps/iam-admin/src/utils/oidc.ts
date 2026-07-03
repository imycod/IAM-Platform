/** iam-client OIDC SSO（与 public/oidc.js 逻辑一致，供 Vue 内调用） */
export interface IamClientConfig {
  iamBaseUrl: string;
  oidcIssuer: string;
  clientId: string;
  redirectUri: string;
  scopes: string;
  appCode: string;
}

export const IAM_CLIENT_CONFIG: IamClientConfig = {
  iamBaseUrl: "http://localhost:3000",
  oidcIssuer: "http://localhost:3000/oidc",
  clientId: "iam-admin-spa",
  redirectUri: "",
  scopes: "openid profile email",
  appCode: "iam-admin"
};

/** 与 public/oidc.js resolveRedirectUri 一致 */
export function resolveOidcRedirectUri(cfg: IamClientConfig = IAM_CLIENT_CONFIG): string {
  return cfg.redirectUri || `${window.location.origin}/callback.html`;
}

const STORAGE_VERIFIER = "iam_client_pkce_verifier";
const STORAGE_STATE = "iam_client_oauth_state";

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = "";
  bytes.forEach(b => {
    str += String.fromCharCode(b);
  });
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(plain));
}

function randomString(len: number): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, x => chars[x % chars.length]).join("");
}

/** 跳转 IAM OIDC 授权（若已在 flow-admin 等处登录，IAM SSO 会话会自动放行） */
export async function startOidcLogin(cfg: IamClientConfig = IAM_CLIENT_CONFIG): Promise<void> {
  const verifier = randomString(64);
  const challenge = base64UrlEncode(await sha256(verifier));
  const state = randomString(32);
  sessionStorage.setItem(STORAGE_VERIFIER, verifier);
  sessionStorage.setItem(STORAGE_STATE, state);
  const redirectUri = resolveOidcRedirectUri(cfg);

  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: cfg.scopes,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256"
  });

  window.location.href = `${cfg.oidcIssuer}/auth?${params.toString()}`;
}

/** 是否允许自动跳转 SSO（用户可点「账密登录」跳过） */
const SKIP_SSO_KEY = "iam_client_skip_auto_sso";

export function skipAutoSso(): void {
  sessionStorage.setItem(SKIP_SSO_KEY, "1");
}

export function shouldAutoSso(): boolean {
  return sessionStorage.getItem(SKIP_SSO_KEY) !== "1";
}

export function clearSkipAutoSso(): void {
  sessionStorage.removeItem(SKIP_SSO_KEY);
}
