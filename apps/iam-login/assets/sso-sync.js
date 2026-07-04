/**
 * iam-login 跨 Tab SSO 同步
 * 注意：浏览器 _interaction cookie 同时只能有一个，URL uid 必须与 cookie 一致。
 */
(function (global) {
  const BC_NAME = 'iam-login-sso';
  const LS_KEY = 'iam_sso_login_event';
  const CTX_PREFIX = 'iam_login_ctx:';
  const INTENT_KEY = 'iam_login_page_intent';

  let interactionMeta = null;
  let currentUid = null;
  let restarting = false;
  let toastShown = false;
  let broadcastChannel = null;
  let lastLoginEventTs = 0;
  let lastLoginClientId = '';
  let cookiePollTimer = null;

  function getCfg() {
    return global.IAM_LOGIN_CONFIG || { apiBaseUrl: 'http://localhost:3000' };
  }

  function apiBase() {
    return getCfg().apiBaseUrl.replace(/\/$/, '');
  }

  function ctxKey(uid) {
    return CTX_PREFIX + uid;
  }

  function unwrapApiData(json) {
    if (json && json.code === 0 && json.data != null) {
      return json.data;
    }
    return json;
  }

  function saveLoginCtx(uid, meta) {
    if (!uid || !meta || meta.expired || meta.uid !== uid) {
      return;
    }
    try {
      sessionStorage.setItem(
        ctxKey(uid),
        JSON.stringify({
          uid: meta.uid,
          clientId: meta.clientId,
          restartAuthUrl: meta.restartAuthUrl,
          appReturnUrl: meta.appReturnUrl,
        })
      );
    } catch {
      // ignore
    }
  }

  function loadLoginCtx(uid) {
    if (!uid) {
      return null;
    }
    try {
      const raw = sessionStorage.getItem(ctxKey(uid));
      if (!raw) {
        return null;
      }
      const ctx = JSON.parse(raw);
      return ctx.uid === uid ? ctx : null;
    } catch {
      return null;
    }
  }

  function getMyClientId(uid) {
    uid = uid || currentUid;
    if (interactionMeta && interactionMeta.uid === uid && interactionMeta.clientId) {
      return interactionMeta.clientId;
    }
    const ctx = loadLoginCtx(uid);
    return ctx?.clientId || null;
  }

  function resolveAppReturnUrl(clientId) {
    const cfg = getCfg();
    if (clientId && cfg.appReturnUrls && cfg.appReturnUrls[clientId]) {
      return cfg.appReturnUrls[clientId];
    }
    return null;
  }

  function savePageIntent(urlUid, clientId) {
    if (!urlUid || !clientId) {
      return;
    }
    try {
      sessionStorage.setItem(
        INTENT_KEY,
        JSON.stringify({ urlUid: urlUid, clientId: clientId, ts: Date.now() })
      );
    } catch {
      // ignore
    }
  }

  function loadPageIntent() {
    try {
      const raw = sessionStorage.getItem(INTENT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function inferClientFromReferrer() {
    const ref = document.referrer || '';
    if (ref.indexOf('admin.iam.local') >= 0 || ref.indexOf(':8848') >= 0) {
      return 'iam-admin-spa';
    }
    if (ref.indexOf('flow.iam.local') >= 0 || ref.indexOf(':8849') >= 0) {
      return 'flow-admin-spa';
    }
    return null;
  }

  function resolveIntendedClientId(urlUid) {
    const urlClientId = readUrlClientId();
    if (urlClientId) {
      return urlClientId;
    }
    const ctx = urlUid ? loadLoginCtx(urlUid) : null;
    if (ctx?.clientId) {
      return ctx.clientId;
    }
    const intent = loadPageIntent();
    if (intent && intent.clientId) {
      if (!urlUid || intent.urlUid === urlUid) {
        return intent.clientId;
      }
    }
    return inferClientFromReferrer();
  }

  function resolveAppFromReferrer() {
    const clientId = inferClientFromReferrer();
    return clientId ? resolveAppReturnUrl(clientId) : null;
  }

  function resolveAppFallback(uid) {
    const ctx = uid ? loadLoginCtx(uid) : null;
    const clientId =
      (interactionMeta && interactionMeta.uid === uid && interactionMeta.clientId) ||
      ctx?.clientId ||
      getMyClientId(uid);

    const fromClient = resolveAppReturnUrl(clientId);
    if (fromClient) {
      return fromClient;
    }
    if (ctx?.appReturnUrl) {
      return ctx.appReturnUrl;
    }
    if (interactionMeta?.uid === uid && interactionMeta.appReturnUrl) {
      return interactionMeta.appReturnUrl;
    }
    return resolveAppFromReferrer();
  }

  function resolveRestartUrl(reason, uid) {
    uid = uid || currentUid;
    const ctx = uid ? loadLoginCtx(uid) : null;
    const metaOk = interactionMeta && interactionMeta.uid === uid && !interactionMeta.expired;

    if (reason === 'interaction_expired' || reason === 'interaction_mismatch') {
      return resolveAppFallback(uid);
    }

    if (uid && metaOk) {
      if (
        reason === 'existing_session' ||
        reason === 'session_probe' ||
        reason === 'cross_tab' ||
        reason === 'cookie'
      ) {
        return apiBase() + '/api/interaction/' + encodeURIComponent(uid);
      }
    }

    if (metaOk && interactionMeta.restartAuthUrl) {
      return interactionMeta.restartAuthUrl;
    }
    if (ctx?.restartAuthUrl) {
      return ctx.restartAuthUrl;
    }

    return resolveAppFallback(uid);
  }

  function showToast(message) {
    let el = document.getElementById('sso-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'sso-toast';
      el.className = 'sso-toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('visible');
  }

  function hideToast() {
    const el = document.getElementById('sso-toast');
    if (el) {
      el.classList.remove('visible');
    }
  }

  function lockLoginForm() {
    const btn = document.getElementById('btn-login');
    if (btn) {
      btn.disabled = true;
    }
    const form = document.getElementById('login-form');
    if (form) {
      form.querySelectorAll('input').forEach(function (input) {
        input.disabled = true;
      });
    }
  }

  function clearLoginEventCookie() {
    const host = global.location.hostname;
    const domain = host.endsWith('iam.local') ? '; domain=.iam.local' : '';
    document.cookie = 'iam_sso_login_event=; Max-Age=0; path=/' + domain;
  }

  function stopCookiePolling() {
    if (cookiePollTimer) {
      clearInterval(cookiePollTimer);
      cookiePollTimer = null;
    }
  }

  function restartAuthChain(reason, uid) {
    uid = uid || currentUid;
    if (restarting) {
      return;
    }

    const target = resolveRestartUrl(reason, uid);
    if (!target) {
      if (!toastShown) {
        showToast('登录会话已失效，请关闭此页并从应用重新登录。');
        toastShown = true;
      }
      stopCookiePolling();
      return;
    }

    restarting = true;
    stopCookiePolling();
    clearLoginEventCookie();
    lockLoginForm();
    hideToast();

    if (reason === 'cross_tab' || reason === 'cookie') {
      showToast('检测到您已在其他页面登录，正在自动继续…');
    } else if (reason !== 'interaction_expired' && reason !== 'interaction_mismatch') {
      showToast('正在恢复登录状态…');
    }

    global.location.href = target;
  }

  async function onLoginSuccessEvent(source, loginClientId) {
    if (restarting || !currentUid) {
      return;
    }

    const myClientId = getMyClientId(currentUid);
    if (loginClientId && myClientId && loginClientId === myClientId) {
      return;
    }

    const hasSession = await checkIamSession();
    if (!hasSession) {
      return;
    }

    if (interactionMeta && interactionMeta.uid !== currentUid) {
      restartAuthChain('interaction_mismatch', currentUid);
      return;
    }

    restartAuthChain(source === 'cookie' ? 'cookie' : 'cross_tab', currentUid);
  }

  function parseLoginEventCookie(raw) {
    const parts = String(raw).split(':');
    return { ts: Number(parts[0]), clientId: parts[1] || '' };
  }

  function pollLoginCookie() {
    if (restarting) {
      return;
    }
    const m = document.cookie.match(/(?:^|;\s*)iam_sso_login_event=([^;]+)/);
    if (!m) {
      return;
    }
    const parsed = parseLoginEventCookie(decodeURIComponent(m[1]));
    if (parsed.ts > lastLoginEventTs) {
      lastLoginEventTs = parsed.ts;
      lastLoginClientId = parsed.clientId;
      void onLoginSuccessEvent('cookie', parsed.clientId);
    }
  }

  function setupCookiePolling() {
    pollLoginCookie();
    stopCookiePolling();
    cookiePollTimer = setInterval(pollLoginCookie, 1500);
  }

  function setupCrossTabListeners() {
    if (typeof BroadcastChannel !== 'undefined') {
      broadcastChannel = new BroadcastChannel(BC_NAME);
      broadcastChannel.onmessage = function (e) {
        if (e.data && e.data.type === 'LOGIN_SUCCESS') {
          void onLoginSuccessEvent('broadcast', e.data.clientId || '');
        }
      };
    }

    global.addEventListener('storage', function (e) {
      if (e.key === LS_KEY && e.newValue) {
        void onLoginSuccessEvent('storage', '');
      }
    });

    setupCookiePolling();
  }

  async function fetchActiveMeta() {
    const res = await fetch(apiBase() + '/api/interaction/active/meta', {
      credentials: 'include',
      cache: 'no-store',
    });
    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      throw new Error('active_meta_failed');
    }
    return unwrapApiData(await res.json());
  }

  /**
   * URL uid 与 cookie uid 不一致时的处理：
   * - 同一应用：同步 URL uid（stale tab）
   * - 不同应用：回跳用户原本要登录的应用，禁止 admin 页被 flow cookie 劫持
   */
  async function syncUidWithActiveCookie(urlUid) {
    let active;
    try {
      active = await fetchActiveMeta();
    } catch {
      return urlUid;
    }
    if (!active || !active.uid) {
      return urlUid;
    }
    if (!urlUid || urlUid === active.uid) {
      return active.uid;
    }

    const intendedClient = resolveIntendedClientId(urlUid);
    if (intendedClient && active.clientId && intendedClient !== active.clientId) {
      const appUrl = resolveAppReturnUrl(intendedClient);
      if (appUrl) {
        restarting = true;
        stopCookiePolling();
        global.location.replace(appUrl);
        return null;
      }
    }

    if (!intendedClient || intendedClient === active.clientId) {
      const next = new URL(global.location.href);
      next.searchParams.set('uid', active.uid);
      if (intendedClient || active.clientId) {
        next.searchParams.set('client_id', intendedClient || active.clientId);
      }
      next.searchParams.delete('error');
      global.location.replace(next.toString());
      return null;
    }

    return urlUid;
  }

  async function fetchInteractionMeta(uid) {
    const res = await fetch(
      apiBase() + '/api/interaction/' + encodeURIComponent(uid) + '/meta',
      { credentials: 'include', cache: 'no-store' }
    );
    if (res.status === 404) {
      const body = await res.json().catch(function () {
        return {};
      });
      const msg = body.message;
      const code = typeof msg === 'object' && msg ? msg.code : null;
      if (code === 'interaction_expired' || code === 'interaction_mismatch') {
        return { expired: true, mismatch: code === 'interaction_mismatch', uid };
      }
      return { expired: true, uid };
    }
    if (!res.ok) {
      throw new Error('meta_fetch_failed');
    }
    const meta = unwrapApiData(await res.json());
    if (meta.uid && meta.uid !== uid) {
      return { expired: true, mismatch: true, uid };
    }
    return meta;
  }

  async function checkIamSession() {
    try {
      const res = await fetch(apiBase() + '/api/interaction/sso/status', {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!res.ok) {
        return false;
      }
      const data = unwrapApiData(await res.json());
      return !!data.authenticated;
    } catch {
      return false;
    }
  }

  async function probeSessionOnVisible() {
    if (restarting || document.hidden || !currentUid) {
      return;
    }
    if (interactionMeta?.expired || interactionMeta?.mismatch) {
      return;
    }
    if (interactionMeta && interactionMeta.uid !== currentUid) {
      return;
    }
    const hasSession = await checkIamSession();
    if (hasSession) {
      restartAuthChain('session_probe', currentUid);
    }
  }

  function setupVisibilityProbe() {
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) {
        void probeSessionOnVisible();
      }
    });
    global.addEventListener('focus', function () {
      void probeSessionOnVisible();
    });
  }

  function readUrlClientId() {
    return new URLSearchParams(global.location.search).get('client_id');
  }

  async function initSsoSync(uid, options) {
    setupCrossTabListeners();
    setupVisibilityProbe();

    if (!uid) {
      return null;
    }

    const urlClientId = readUrlClientId();
    if (urlClientId) {
      savePageIntent(uid, urlClientId);
    }

    const syncedUid = await syncUidWithActiveCookie(uid);
    if (syncedUid === null) {
      return null;
    }
    uid = syncedUid;
    currentUid = uid;

    const forceExpired = options && options.forceExpired;

    try {
      interactionMeta = await fetchActiveMeta();
      if (interactionMeta && interactionMeta.uid !== uid) {
        const intendedClient = resolveIntendedClientId(uid);
        if (
          intendedClient &&
          interactionMeta.clientId &&
          intendedClient !== interactionMeta.clientId
        ) {
          interactionMeta = { expired: true, mismatch: true, uid: uid };
        }
      }
      if (!interactionMeta) {
        interactionMeta = await fetchInteractionMeta(uid);
      }
    } catch {
      interactionMeta = loadLoginCtx(uid) ? { ...loadLoginCtx(uid), expired: true } : null;
    }

    if (interactionMeta?.mismatch) {
      restartAuthChain('interaction_mismatch', uid);
      return interactionMeta;
    }

    if (forceExpired || interactionMeta?.expired) {
      interactionMeta = interactionMeta || { expired: true, uid: uid };
      restartAuthChain('interaction_expired', uid);
      return interactionMeta;
    }

    saveLoginCtx(uid, interactionMeta);
    if (interactionMeta.clientId) {
      savePageIntent(uid, interactionMeta.clientId);
    }

    if (interactionMeta.hasSession) {
      restartAuthChain('existing_session', uid);
      return interactionMeta;
    }

    return interactionMeta;
  }

  function isInvalidInteractionError(errorCode) {
    return errorCode === 'interaction_expired' || errorCode === 'invalid_session';
  }

  global.IamLoginSsoSync = {
    initSsoSync: initSsoSync,
    restartAuthChain: restartAuthChain,
    isInvalidInteractionError: isInvalidInteractionError,
    probeSessionOnVisible: probeSessionOnVisible,
    getInteractionMeta: function () {
      return interactionMeta;
    },
  };
})(window);
