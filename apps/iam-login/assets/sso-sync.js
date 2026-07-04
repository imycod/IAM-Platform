/**
 * iam-login 跨 Tab SSO 同步
 * 任一应用在 login.iam.local 完成登录后，其它 Tab 利用 IdP SSO 会话自动续登。
 * 注意：浏览器 _interaction cookie 同时只能有一个，跨应用时走 restartAuthUrl 重建授权链。
 */
(function (global) {
  const BC_NAME = 'iam-login-sso';
  const LS_KEY = 'iam_sso_login_event';
  const LOGOUT_EVENT_COOKIE = 'iam_sso_logout_event';
  const CTX_PREFIX = 'iam_login_ctx:';
  const INTENT_PREFIX = 'iam_login_page_intent:';
  const RESTART_GUARD_PREFIX = 'iam_restart_guard:';
  const PAGE_LOAD_TS = Date.now();
  const LOGIN_EVENT_GRACE_MS = 3000;
  const RESTART_GUARD_WINDOW_MS = 15000;
  const RESTART_GUARD_MAX = 3;

  let interactionMeta = null;
  let currentUid = null;
  let restarting = false;
  let toastShown = false;
  let broadcastChannel = null;
  let lastLoginEventTs = 0;
  let lastLogoutEventTs = 0;
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

  function intentKey(uid) {
    return INTENT_PREFIX + uid;
  }

  function restartGuardKey(uid) {
    return RESTART_GUARD_PREFIX + uid;
  }

  function unwrapApiData(json) {
    if (json && json.code === 0 && json.data != null) {
      return json.data;
    }
    return json;
  }

  function saveLoginCtx(uid, meta) {
    if (!uid || !meta || meta.uid !== uid) {
      return;
    }
    if (meta.expired && !meta.restartAuthUrl && !meta.clientId) {
      return;
    }
    try {
      const prev = loadLoginCtx(uid);
      sessionStorage.setItem(
        ctxKey(uid),
        JSON.stringify({
          uid: meta.uid || uid,
          clientId: meta.clientId || prev?.clientId || null,
          restartAuthUrl: meta.restartAuthUrl || prev?.restartAuthUrl || null,
          appReturnUrl: meta.appReturnUrl || prev?.appReturnUrl || null,
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
    return ctx?.clientId || resolveIntendedClientId(uid);
  }

  function resolveAppReturnUrl(clientId) {
    const cfg = getCfg();
    if (clientId && cfg.appReturnUrls && cfg.appReturnUrls[clientId]) {
      return cfg.appReturnUrls[clientId];
    }
    return null;
  }

  function appLoginUrl(clientId) {
    const base = resolveAppReturnUrl(clientId);
    if (!base) {
      return null;
    }
    return base.replace(/\/$/, '') + '/#/login';
  }

  function savePageIntent(urlUid, clientId) {
    if (!urlUid || !clientId) {
      return;
    }
    try {
      sessionStorage.setItem(
        intentKey(urlUid),
        JSON.stringify({ urlUid: urlUid, clientId: clientId, ts: Date.now() })
      );
    } catch {
      // ignore
    }
  }

  function loadPageIntent(urlUid) {
    if (!urlUid) {
      return null;
    }
    try {
      const raw = sessionStorage.getItem(intentKey(urlUid));
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
    const intent = urlUid ? loadPageIntent(urlUid) : null;
    if (intent?.clientId) {
      return intent.clientId;
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
      getMyClientId(uid) ||
      resolveIntendedClientId(uid);

    const loginUrl = appLoginUrl(clientId);
    if (loginUrl) {
      return loginUrl;
    }
    if (ctx?.appReturnUrl) {
      return ctx.appReturnUrl.replace(/\/$/, '') + '/#/login';
    }
    const refApp = resolveAppFromReferrer();
    return refApp ? refApp.replace(/\/$/, '') + '/#/login' : null;
  }

  function interactionResumeUrl(uid) {
    return apiBase() + '/api/interaction/' + encodeURIComponent(uid);
  }

  function isMetaOk(uid) {
    return !!(
      interactionMeta &&
      interactionMeta.uid === uid &&
      !interactionMeta.expired &&
      !interactionMeta.mismatch
    );
  }

  function resolveRestartUrl(reason, uid) {
    uid = uid || currentUid;
    const ctx = uid ? loadLoginCtx(uid) : null;
    const metaOk = isMetaOk(uid);

    if (reason === 'interaction_expired' || reason === 'interaction_mismatch') {
      return resolveAppFallback(uid);
    }

    const resumeReasons = ['existing_session', 'session_probe', 'cross_tab', 'cookie'];

    // cookie 与 uid 一致：直接 resume interaction
    if (uid && metaOk && resumeReasons.indexOf(reason) >= 0) {
      return interactionResumeUrl(uid);
    }

    // 跨应用 / cookie 不一致：用保存的 OIDC auth URL 重建链路（SSO 会话会跳过密码）
    if (resumeReasons.indexOf(reason) >= 0) {
      if (ctx?.restartAuthUrl) {
        return ctx.restartAuthUrl;
      }
      if (interactionMeta?.restartAuthUrl && interactionMeta.uid === uid) {
        return interactionMeta.restartAuthUrl;
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
    toastShown = true;
  }

  function hideToast() {
    const el = document.getElementById('sso-toast');
    if (el) {
      el.classList.remove('visible');
    }
    toastShown = false;
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

  function unlockLoginForm() {
    const btn = document.getElementById('btn-login');
    if (btn) {
      btn.disabled = false;
    }
    const form = document.getElementById('login-form');
    if (form) {
      form.querySelectorAll('input').forEach(function (input) {
        input.disabled = false;
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

  function parseLogoutEventCookie() {
    const m = document.cookie.match(
      new RegExp('(?:^|;\\s*)' + LOGOUT_EVENT_COOKIE + '=([^;]+)')
    );
    if (!m) {
      return 0;
    }
    const ts = Number(decodeURIComponent(m[1]).split(':')[0]);
    return Number.isNaN(ts) ? 0 : ts;
  }

  function resetLoginPageState() {
    restarting = false;
    toastShown = false;
    hideToast();
    unlockLoginForm();
    if (currentUid) {
      try {
        sessionStorage.removeItem(restartGuardKey(currentUid));
      } catch {
        // ignore
      }
    }
    lastLoginEventTs = Date.now();
  }

  function pollLogoutCookie() {
    const ts = parseLogoutEventCookie();
    if (ts > lastLogoutEventTs) {
      lastLogoutEventTs = ts;
      clearLoginEventCookie();
      resetLoginPageState();
    }
  }

  function canAttemptRestart(uid) {
    if (!uid) {
      return true;
    }
    try {
      const raw = sessionStorage.getItem(restartGuardKey(uid));
      if (!raw) {
        return true;
      }
      const guard = JSON.parse(raw);
      if (guard.count >= RESTART_GUARD_MAX && Date.now() - guard.lastTs < RESTART_GUARD_WINDOW_MS) {
        return false;
      }
      return true;
    } catch {
      return true;
    }
  }

  function recordRestartAttempt(uid) {
    if (!uid) {
      return;
    }
    try {
      const key = restartGuardKey(uid);
      const raw = sessionStorage.getItem(key);
      const now = Date.now();
      let guard = { count: 0, lastTs: now };
      if (raw) {
        guard = JSON.parse(raw);
        if (now - guard.lastTs > RESTART_GUARD_WINDOW_MS) {
          guard = { count: 0, lastTs: now };
        }
      }
      guard.count += 1;
      guard.lastTs = now;
      sessionStorage.setItem(key, JSON.stringify(guard));
    } catch {
      // ignore
    }
  }

  function showRestartBlocked() {
    if (!toastShown) {
      showToast('无法自动恢复登录，请关闭此页并从应用重新点击 SSO 登录。');
    }
    stopCookiePolling();
    unlockLoginForm();
  }

  function showInteractionBlocked(kind) {
    if (toastShown) {
      return;
    }
    stopCookiePolling();
    unlockLoginForm();
    if (kind === 'interaction_mismatch') {
      showToast('当前登录会话已失效，请关闭此页并从应用重新点击 SSO 登录。');
    } else {
      showToast('登录会话已失效，请关闭此页并从应用重新点击 SSO 登录。');
    }
  }

  function restartAuthChain(reason, uid) {
    uid = uid || currentUid;
    if (restarting) {
      return;
    }

    if (!canAttemptRestart(uid)) {
      showRestartBlocked();
      return;
    }

    const target = resolveRestartUrl(reason, uid);
    if (!target) {
      showRestartBlocked();
      return;
    }

    restarting = true;
    recordRestartAttempt(uid);
    stopCookiePolling();
    clearLoginEventCookie();
    lockLoginForm();
    hideToast();

    if (reason === 'cross_tab' || reason === 'cookie') {
      showToast('检测到 SSO 已登录，正在自动继续…');
    } else if (reason !== 'interaction_expired' && reason !== 'interaction_mismatch') {
      showToast('正在恢复登录状态…');
    }

    global.location.href = target;
  }

  async function onLoginSuccessEvent(source) {
    if (restarting || !currentUid) {
      return;
    }

    if (source === 'cookie' || source === 'broadcast' || source === 'storage') {
      restartAuthChain(source === 'cookie' ? 'cookie' : 'cross_tab', currentUid);
      return;
    }

    const hasSession = await checkIamSession();
    if (hasSession) {
      restartAuthChain('cross_tab', currentUid);
    }
  }

  function parseLoginEventCookie(raw) {
    const parts = String(raw).split(':');
    return { ts: Number(parts[0]), clientId: parts[1] || '' };
  }

  function shouldIgnoreLoginEvent(parsed) {
    if (!parsed.ts) {
      return true;
    }
    const age = Date.now() - parsed.ts;
    if (age > 65_000) {
      return true;
    }
    if (parsed.ts <= lastLogoutEventTs) {
      return true;
    }
    return parsed.ts < PAGE_LOAD_TS - LOGIN_EVENT_GRACE_MS;
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
    if (parsed.ts <= lastLoginEventTs) {
      return;
    }
    if (shouldIgnoreLoginEvent(parsed)) {
      lastLoginEventTs = parsed.ts;
      clearLoginEventCookie();
      return;
    }
    lastLoginEventTs = parsed.ts;
    void onLoginSuccessEvent('cookie');
  }

  function setupCookiePolling() {
    lastLogoutEventTs = parseLogoutEventCookie();
    pollLogoutCookie();
    pollLoginCookie();
    stopCookiePolling();
    cookiePollTimer = setInterval(function () {
      pollLogoutCookie();
      pollLoginCookie();
    }, 1500);
  }

  function setupCrossTabListeners() {
    if (typeof BroadcastChannel !== 'undefined') {
      broadcastChannel = new BroadcastChannel(BC_NAME);
      broadcastChannel.onmessage = function (e) {
        if (e.data && e.data.type === 'LOGIN_SUCCESS') {
          void onLoginSuccessEvent('broadcast');
        }
      };
    }

    global.addEventListener('storage', function (e) {
      if (e.key === LS_KEY && e.newValue) {
        void onLoginSuccessEvent('storage');
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
   * URL uid 与 cookie uid 不一致：
   * - 同应用：同步 URL
   * - 跨应用：保留本 Tab uid，等待 SSO 登录事件后自动续登
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
      return urlUid;
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

  async function tryAutoLoginWithSso(uid) {
    const ctx = loadLoginCtx(uid);
    const hasSession = (interactionMeta && interactionMeta.hasSession) || (await checkIamSession());
    if (!hasSession) {
      return false;
    }
    if (!ctx?.restartAuthUrl && !interactionMeta?.restartAuthUrl) {
      return false;
    }
    restartAuthChain('existing_session', uid);
    return true;
  }

  async function probeSessionOnVisible() {
    if (restarting || document.hidden || !currentUid) {
      return;
    }

    const hasSession = await checkIamSession();
    if (!hasSession) {
      if (toastShown) {
        resetLoginPageState();
      }
      return;
    }

    restartAuthChain('session_probe', currentUid);
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
      if (!interactionMeta || interactionMeta.uid !== uid) {
        const fetched = await fetchInteractionMeta(uid);
        if (fetched) {
          interactionMeta = Object.assign({}, loadLoginCtx(uid), fetched);
        }
      }
    } catch {
      interactionMeta = loadLoginCtx(uid) ? { ...loadLoginCtx(uid), expired: true } : null;
    }

    saveLoginCtx(uid, interactionMeta || loadLoginCtx(uid) || { uid: uid, clientId: urlClientId });
    if (interactionMeta?.clientId) {
      savePageIntent(uid, interactionMeta.clientId);
    }

    if (interactionMeta?.mismatch || interactionMeta?.expired) {
      if (forceExpired) {
        if (!(await tryAutoLoginWithSso(uid))) {
          showInteractionBlocked('interaction_expired');
        }
        return interactionMeta;
      }
      if (await tryAutoLoginWithSso(uid)) {
        return interactionMeta;
      }
      if (interactionMeta?.mismatch) {
        return interactionMeta;
      }
      if (interactionMeta?.expired) {
        showInteractionBlocked('interaction_expired');
        return interactionMeta;
      }
    }

    if (interactionMeta?.hasSession) {
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
