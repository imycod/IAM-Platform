(function (global) {
  const STORAGE_VERIFIER = "iam_client_pkce_verifier";
  const STORAGE_STATE = "iam_client_oauth_state";
  /** 使用 localStorage 持久化，关闭浏览器后仍可复用 token / 触发 SSO */
  const STORAGE_TOKENS = "iam_client_oidc_tokens";

  function base64UrlEncode(buffer) {
    const bytes = new Uint8Array(buffer);
    let str = "";
    bytes.forEach(b => {
      str += String.fromCharCode(b);
    });
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  async function sha256(plain) {
    const data = new TextEncoder().encode(plain);
    return crypto.subtle.digest("SHA-256", data);
  }

  function randomString(len) {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
    const arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    return Array.from(arr, x => chars[x % chars.length]).join("");
  }

  async function createPkce() {
    const verifier = randomString(64);
    const challenge = base64UrlEncode(await sha256(verifier));
    return { verifier, challenge };
  }

  function resolveRedirectUri(cfg) {
    return cfg.redirectUri || `${window.location.origin}/callback.html`;
  }

  async function startLogin(cfg) {
    const { verifier, challenge } = await createPkce();
    const state = randomString(32);
    sessionStorage.setItem(STORAGE_VERIFIER, verifier);
    sessionStorage.setItem(STORAGE_STATE, state);
    const redirectUri = resolveRedirectUri(cfg);

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

  async function exchangeCode(cfg, code) {
    const verifier = sessionStorage.getItem(STORAGE_VERIFIER);
    if (!verifier) {
      throw new Error("缺少 PKCE verifier，请重新登录");
    }

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: cfg.clientId,
      code,
      redirect_uri: resolveRedirectUri(cfg),
      code_verifier: verifier
    });

    const res = await fetch(`${cfg.oidcIssuer}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error_description || json.error || "换 token 失败");
    }

    sessionStorage.removeItem(STORAGE_VERIFIER);
    localStorage.setItem(STORAGE_TOKENS, JSON.stringify(json));
    return json;
  }

  function getTokens() {
    const raw = localStorage.getItem(STORAGE_TOKENS);
    return raw ? JSON.parse(raw) : null;
  }

  function clearSession() {
    localStorage.removeItem(STORAGE_TOKENS);
    sessionStorage.removeItem(STORAGE_VERIFIER);
    sessionStorage.removeItem(STORAGE_STATE);
  }

  function getSavedState() {
    return sessionStorage.getItem(STORAGE_STATE);
  }

  function clearSavedState() {
    sessionStorage.removeItem(STORAGE_STATE);
  }

  async function fetchOidcBootstrap(cfg, accessToken) {
    const url = new URL(`${cfg.iamBaseUrl}/api/portal/oidc-bootstrap`);
    url.searchParams.set("appCode", cfg.appCode);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const json = await res.json();
    if (!res.ok) {
      const msg = json.message || json.error_description || "bootstrap 失败";
      throw new Error(msg);
    }
    let layer = json;
    if (layer?.code === 0) layer = layer.data;
    if (layer?.success && layer?.data) layer = layer.data;
    return layer;
  }

  /** 写入 pure-admin 使用的 cookie / localStorage */
  function persistPortalSession(bootstrap, tokens) {
    const expiresIn = tokens.expires_in ?? 3600;
    const expiresMs = Date.now() + expiresIn * 1000;
    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token || accessToken;

    const tokenCookie = JSON.stringify({
      accessToken,
      expires: expiresMs,
      refreshToken
    });
    document.cookie = `authorized-token=${encodeURIComponent(tokenCookie)}; path=/`;
    document.cookie = "multiple-tabs=true; path=/";

    const userInfo = {
      refreshToken,
      expires: expiresMs,
      avatar: bootstrap.avatar || "",
      username: bootstrap.username,
      nickname: bootstrap.nickname,
      roles: bootstrap.roles || [],
      permissions: bootstrap.permissions || []
    };
    localStorage.setItem("user-info", JSON.stringify(userInfo));
  }

  global.IamClientOidc = {
    startLogin,
    exchangeCode,
    getTokens,
    clearSession,
    getSavedState,
    clearSavedState,
    fetchOidcBootstrap,
    persistPortalSession
  };
})(window);
