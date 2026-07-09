(function (global) {
  const STORAGE_VERIFIER_PREFIX = "iam_client_pkce_verifier:";
  const STORAGE_SILENT_PREFIX = "iam_client_oidc_silent:";
  const STORAGE_STATE = "iam_client_oauth_state";
  const REDIRECT_LOCK = "iam_client_oidc_redirecting";
  const STORAGE_TOKENS = "iam_client_oidc_tokens";
  const REDIRECT_LOCK_TTL_MS = 120000;

  /** PKCE 跨 Tab 共享（同 origin 多 Tab SSO 回调） */
  function pkceStore() {
    return localStorage;
  }

  function acquireRedirectLock() {
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

  function releaseRedirectLock() {
    pkceStore().removeItem(REDIRECT_LOCK);
  }

  function base64UrlEncode(buffer) {
    const bytes = new Uint8Array(buffer);
    let str = "";
    bytes.forEach(b => {
      str += String.fromCharCode(b);
    });
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  async function sha256(plain) {
    return PkceSha256.sha256(plain);
  }

  function randomString(len) {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
    const arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    return Array.from(arr, x => chars[x % chars.length]).join("");
  }

  function resolveRedirectUri(cfg) {
    return cfg.redirectUri || `${window.location.origin}/callback.html`;
  }

  async function startLogin(cfg, options) {
    if (!acquireRedirectLock()) {
      return;
    }

    const store = pkceStore();
    const verifier = randomString(64);
    const challenge = base64UrlEncode(await sha256(verifier));
    const state = randomString(32);
    store.setItem(`${STORAGE_VERIFIER_PREFIX}${state}`, verifier);
    store.setItem(STORAGE_STATE, state);
    if (options && options.silent) {
      store.setItem(`${STORAGE_SILENT_PREFIX}${state}`, "1");
    }
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
    if (options && options.silent) {
      params.set("prompt", "none");
    }

    window.location.href = `${cfg.oidcIssuer}/auth?${params.toString()}`;
  }

  async function exchangeCode(cfg, code, state) {
    const store = pkceStore();
    const verifier = store.getItem(`${STORAGE_VERIFIER_PREFIX}${state}`);
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
      throw new Error(json.error_detail || json.error_description || json.error || "换 token 失败");
    }

    store.removeItem(`${STORAGE_VERIFIER_PREFIX}${state}`);
    store.removeItem(`${STORAGE_SILENT_PREFIX}${state}`);
    releaseRedirectLock();
    localStorage.setItem(STORAGE_TOKENS, JSON.stringify(json));
    return json;
  }

  function getTokens() {
    const raw = localStorage.getItem(STORAGE_TOKENS);
    return raw ? JSON.parse(raw) : null;
  }

  function clearAllPkceState() {
    const store = pkceStore();
    const keys = [];
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i);
      if (
        key &&
        (key.indexOf(STORAGE_VERIFIER_PREFIX) === 0 ||
          key.indexOf(STORAGE_SILENT_PREFIX) === 0 ||
          key === STORAGE_STATE ||
          key === REDIRECT_LOCK)
      ) {
        keys.push(key);
      }
    }
    keys.forEach(function (k) {
      store.removeItem(k);
    });
  }

  function clearSession() {
    localStorage.removeItem(STORAGE_TOKENS);
    clearAllPkceState();
  }

  function appCookieKeys() {
    const fromWindow = global.IAM_APP_COOKIE_KEYS;
    if (fromWindow?.token) {
      return fromWindow;
    }
    return { token: "authorized-token", multipleTabs: "multiple-tabs" };
  }

  function clearPortalSession() {
    clearSession();
    const keys = appCookieKeys();
    document.cookie = keys.token + "=; Max-Age=0; path=/";
    document.cookie = keys.multipleTabs + "=; Max-Age=0; path=/";
    localStorage.removeItem("user-info");
    sessionStorage.removeItem("iam_client_login_method");
  }

  function resolvePostLogoutRedirectUri(cfg) {
    return cfg.postLogoutRedirectUri || `${window.location.origin}/logout.html`;
  }

  function buildEndSessionUrl(cfg) {
    const tokens = getTokens();
    const params = new URLSearchParams({
      client_id: cfg.clientId,
      post_logout_redirect_uri: resolvePostLogoutRedirectUri(cfg)
    });
    if (tokens && tokens.id_token) {
      params.set("id_token_hint", tokens.id_token);
    }
    return `${cfg.oidcIssuer}/session/end?${params.toString()}`;
  }

  function performGlobalLogout(cfg) {
    window.location.href = buildEndSessionUrl(cfg);
  }

  function getSavedState() {
    return pkceStore().getItem(STORAGE_STATE);
  }

  function hasPendingAuth(state) {
    return !!(state && pkceStore().getItem(`${STORAGE_VERIFIER_PREFIX}${state}`));
  }

  function clearSavedState(state) {
    const store = pkceStore();
    const key = state ?? store.getItem(STORAGE_STATE);
    if (key) {
      store.removeItem(`${STORAGE_VERIFIER_PREFIX}${key}`);
      store.removeItem(`${STORAGE_SILENT_PREFIX}${key}`);
    }
    store.removeItem(STORAGE_STATE);
    releaseRedirectLock();
  }

  function isSilentState(state) {
    return state && pkceStore().getItem(`${STORAGE_SILENT_PREFIX}${state}`) === "1";
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

  function persistPortalSession(bootstrap, tokens) {
    const expiresIn = tokens.expires_in ?? 3600;
    const expiresMs = Date.now() + expiresIn * 1000;
    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token || accessToken;
    const keys = appCookieKeys();

    const tokenCookie = JSON.stringify({
      accessToken,
      expires: expiresMs,
      refreshToken
    });
    document.cookie = keys.token + "=" + encodeURIComponent(tokenCookie) + "; path=/";
    document.cookie = keys.multipleTabs + "=true; path=/";

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
    sessionStorage.setItem("iam_client_login_method", "sso");
    sessionStorage.setItem("iam_sso_login_at", String(Date.now()));
  }

  global.IamClientOidc = {
    startLogin,
    exchangeCode,
    getTokens,
    clearSession,
    clearPortalSession,
    buildEndSessionUrl,
    performGlobalLogout,
    getSavedState,
    hasPendingAuth,
    clearSavedState,
    isSilentState,
    fetchOidcBootstrap,
    persistPortalSession
  };
})(window);
