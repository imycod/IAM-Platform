(function (global) {
  const STORAGE_VERIFIER = 'flow_admin_pkce_verifier';
  const STORAGE_STATE = 'flow_admin_oauth_state';
  const STORAGE_TOKENS = 'flow_admin_tokens';

  function base64UrlEncode(buffer) {
    const bytes = new Uint8Array(buffer);
    let str = '';
    bytes.forEach((b) => {
      str += String.fromCharCode(b);
    });
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  async function sha256(plain) {
    const data = new TextEncoder().encode(plain);
    return crypto.subtle.digest('SHA-256', data);
  }

  function randomString(len) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    return Array.from(arr, (x) => chars[x % chars.length]).join('');
  }

  async function createPkce() {
    const verifier = randomString(64);
    const challenge = base64UrlEncode(await sha256(verifier));
    return { verifier, challenge };
  }

  async function startLogin(cfg) {
    const { verifier, challenge } = await createPkce();
    const state = randomString(32);
    sessionStorage.setItem(STORAGE_VERIFIER, verifier);
    sessionStorage.setItem(STORAGE_STATE, state);
    const redirectUri = cfg.redirectUri || `${window.location.origin}/callback.html`;

    const params = new URLSearchParams({
      client_id: cfg.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: cfg.scopes,
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });

    window.location.href = `${cfg.oidcIssuer}/auth?${params.toString()}`;
  }

  async function exchangeCode(cfg, code) {
    const verifier = sessionStorage.getItem(STORAGE_VERIFIER);
    if (!verifier) {
      throw new Error('缺少 PKCE verifier，请重新登录');
    }

    const redirectUri = cfg.redirectUri || `${window.location.origin}/callback.html`;
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: cfg.clientId,
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    });

    const res = await fetch(`${cfg.oidcIssuer}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error_description || json.error || '换 token 失败');
    }

    sessionStorage.removeItem(STORAGE_VERIFIER);
    sessionStorage.setItem(STORAGE_TOKENS, JSON.stringify(json));
    return json;
  }

  function getTokens() {
    const raw = sessionStorage.getItem(STORAGE_TOKENS);
    return raw ? JSON.parse(raw) : null;
  }

  function clearSession() {
    sessionStorage.removeItem(STORAGE_TOKENS);
    sessionStorage.removeItem(STORAGE_VERIFIER);
    sessionStorage.removeItem(STORAGE_STATE);
  }

  function getSavedState() {
    return sessionStorage.getItem(STORAGE_STATE);
  }

  function clearSavedState() {
    sessionStorage.removeItem(STORAGE_STATE);
  }

  async function fetchUserInfo(cfg, accessToken) {
    const res = await fetch(`${cfg.oidcIssuer}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new Error('userinfo 失败');
    }
    return res.json();
  }

  /** IAM 统一响应 { code, data, message } */
  async function fetchIamApi(cfg, path, accessToken) {
    const res = await fetch(`${cfg.iamBaseUrl}/api${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = await res.json();
    if (!res.ok) {
      const msg = json.message || json.error_description || json.error || 'IAM API 失败';
      throw new Error(`${msg} (${res.status})`);
    }
    return json.data !== undefined ? json.data : json;
  }

  global.FlowAdminOidc = {
    startLogin,
    exchangeCode,
    getTokens,
    clearSession,
    getSavedState,
    clearSavedState,
    fetchUserInfo,
    fetchIamApi,
  };
})(window);
