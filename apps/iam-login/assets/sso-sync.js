/**
 * iam-login 跨 Tab SSO 同步
 * 任一应用在 login.pinshuai.local 完成登录后，其它 Tab 利用 IdP SSO 会话自动续登。
 * 注意：浏览器 _interaction cookie 同时只能有一个，跨应用时走 restartAuthUrl 重建授权链。
 */
(function (global) {
  const BC_NAME = 'iam-login-sso';
  const LS_KEY = 'iam_sso_login_event';
  const LOGOUT_EVENT_COOKIE = 'iam_sso_logout_event';
  const CTX_PREFIX = 'iam_login_ctx:';
  const CLIENT_CTX_PREFIX = 'iam_login_client_ctx:';
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
  let initInProgress = false;

  function readUrlClientId() {
    return new URLSearchParams(global.location.search).get('client_id');
  }

  function readUrlUid() {
    return new URLSearchParams(global.location.search).get('uid');
  }

  function isCrossClientInteraction(urlUid, activeMeta) {
    if (!activeMeta || !activeMeta.uid || !urlUid) {
      return false;
    }
    if (activeMeta.uid === urlUid) {
      return false;
    }
    const urlClientId = readUrlClientId();
    if (urlClientId && activeMeta.clientId) {
      return urlClientId !== activeMeta.clientId;
    }
    const intendedClient = resolveIntendedClientId(urlUid);
    if (intendedClient && activeMeta.clientId) {
      return intendedClient !== activeMeta.clientId;
    }
    // cookie 有 uid 但缺少 clientId 时，保守视为跨应用冲突
    return !!urlClientId;
  }

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

  function clientCtxKey(clientId) {
    return CLIENT_CTX_PREFIX + clientId;
  }

  function saveClientLoginCtx(clientId, meta) {
    if (!clientId || !meta?.restartAuthUrl) {
      return;
    }
    try {
      sessionStorage.setItem(
        clientCtxKey(clientId),
        JSON.stringify({
          clientId,
          restartAuthUrl: meta.restartAuthUrl,
          appReturnUrl: meta.appReturnUrl || null,
          ts: Date.now(),
        })
      );
    } catch {
      // ignore
    }
  }

  function loadClientLoginCtx(clientId) {
    if (!clientId) {
      return null;
    }
    try {
      const raw = sessionStorage.getItem(clientCtxKey(clientId));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function getTabClientId(uid) {
    return resolveIntendedClientId(uid || currentUid);
  }

  function resolveRestartAuthUrl(uid) {
    uid = uid || currentUid;
    const clientId = getTabClientId(uid);
    const ctx = uid ? loadLoginCtx(uid) : null;
    const clientCtx = clientId ? loadClientLoginCtx(clientId) : null;
    return (
      ctx?.restartAuthUrl ||
      (interactionMeta && interactionMeta.uid === uid && interactionMeta.restartAuthUrl) ||
      clientCtx?.restartAuthUrl ||
      null
    );
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
      if (meta.clientId && meta.restartAuthUrl) {
        saveClientLoginCtx(meta.clientId, meta);
      }
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
    if (ref.indexOf('admin.pinshuai.local') >= 0 || ref.indexOf(':8848') >= 0) {
      return 'iam-admin-spa';
    }
    if (ref.indexOf('flow.pinshuai.local') >= 0 || ref.indexOf(':8849') >= 0) {
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

    // 存在 SSO 会话时优先走保存的 /oidc/auth 链路：provider 会跳过密码，
    // 按 consentMode 自动完成授权（never→直接登录）或跳转 consent.html。
    // 直接 resume 旧 interaction 只会重渲染 login 页，无法利用新会话。
    if (resumeReasons.indexOf(reason) >= 0) {
      const restartUrl =
        resolveRestartAuthUrl(uid) ||
        ctx?.restartAuthUrl ||
        (interactionMeta?.restartAuthUrl && interactionMeta.uid === uid
          ? interactionMeta.restartAuthUrl
          : null);
      if (restartUrl) {
        return restartUrl;
      }
      if (uid && metaOk) {
        return interactionResumeUrl(uid);
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
    const domain = host.endsWith('iam.local') ? '; domain=.pinshuai.local' : '';
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
      showToast(
        '另一个应用正在登录，请先关闭其它 4180 标签页，或从应用重新点击 SSO 登录。'
      );
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

    // 无论哪个应用触发登录事件，都以“是否真有 SSO 会话”为准再续登，
    // 避免误触发时把本 Tab 打回 login 页。
    const hasSession = await checkIamSession();
    if (!hasSession) {
      return;
    }
    restartAuthChain(source === 'cookie' ? 'cookie' : 'cross_tab', currentUid);
  }

  function canResumeCurrentInteraction(uid) {
    return isMetaOk(uid);
  }

  async function shouldRestartForSession(uid) {
    // 只要拿得到本 Tab 自己 client 的 /oidc/auth 链路即可续登：
    // 跳转后 provider 依据 SSO 会话跳过密码，并按 consentMode 决定直登或跳 consent。
    return !!resolveRestartAuthUrl(uid);
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
    if (parsed.ts < PAGE_LOAD_TS - LOGIN_EVENT_GRACE_MS) {
      return true;
    }
    // 跨 client 也要响应：任一应用在 4180 完成登录即建立 IdP SSO 会话，
    // 本 Tab 应据此静默续登（是否真有会话由 onLoginSuccessEvent 再确认）。
    return false;
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

  async function fetchSnapshotMeta(uid) {
    const res = await fetch(
      apiBase() + '/api/interaction/' + encodeURIComponent(uid) + '/snapshot-meta',
      { credentials: 'include', cache: 'no-store' }
    );
    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      throw new Error('snapshot_meta_failed');
    }
    return unwrapApiData(await res.json());
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
    const restartUrl = resolveRestartAuthUrl(uid);
    const hasSession = (interactionMeta && interactionMeta.hasSession) || (await checkIamSession());
    if (!hasSession) {
      return false;
    }
    if (!restartUrl && !canResumeCurrentInteraction(uid)) {
      return false;
    }
    restartAuthChain('existing_session', uid);
    return true;
  }

  async function probeSessionOnVisible() {
    if (initInProgress || restarting || document.hidden || !currentUid) {
      return;
    }

    const hasSession = await checkIamSession();
    if (!hasSession) {
      if (toastShown) {
        resetLoginPageState();
      }
      return;
    }

    if (!(await shouldRestartForSession(currentUid))) {
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

  async function restartFromSnapshot(uid) {
    uid = uid || currentUid || readUrlUid();
    if (!uid) {
      return false;
    }
    try {
      const snapshot = await fetchSnapshotMeta(uid);
      if (snapshot?.restartAuthUrl) {
        saveLoginCtx(uid, snapshot);
        global.location.href = snapshot.restartAuthUrl;
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  }

  async function initSsoSync(uid, options) {
    initInProgress = true;
    setupCrossTabListeners();
    setupVisibilityProbe();

    try {
      if (!uid) {
        return null;
      }

      const urlClientId = readUrlClientId();
      if (urlClientId) {
        savePageIntent(uid, urlClientId);
      }

      let activeMeta = null;
      try {
        activeMeta = await fetchActiveMeta();
      } catch {
        activeMeta = null;
      }

      if (activeMeta?.clientId && activeMeta?.restartAuthUrl && !isCrossClientInteraction(uid, activeMeta)) {
        saveClientLoginCtx(activeMeta.clientId, activeMeta);
      }

      const syncedUid = await syncUidWithActiveCookieUsingActive(uid, activeMeta);
      if (syncedUid === null) {
        return null;
      }
      uid = syncedUid;
      currentUid = uid;

      if (urlClientId) {
        savePageIntent(uid, urlClientId);
      }

      // 双 Tab 共享 _interaction cookie：后端 :uid/meta 已按 path uid 锁定，
      // 这里只需按 uid 拉取本 Tab 真实 meta。
      const crossClient = !!(activeMeta && isCrossClientInteraction(uid, activeMeta));

      const forceExpired = options && options.forceExpired;

      try {
        if (activeMeta && activeMeta.uid === uid && !crossClient) {
          interactionMeta = activeMeta;
        } else {
          const fetched = await fetchInteractionMeta(uid);
          if (fetched) {
            interactionMeta = Object.assign({}, loadLoginCtx(uid), fetched);
          } else {
            interactionMeta = loadLoginCtx(uid) ? { ...loadLoginCtx(uid), expired: true } : null;
          }
        }
      } catch {
        interactionMeta = loadLoginCtx(uid) ? { ...loadLoginCtx(uid), expired: true } : null;
      }

      saveLoginCtx(uid, interactionMeta || loadLoginCtx(uid) || { uid: uid, clientId: urlClientId });
      if (interactionMeta?.clientId && interactionMeta.uid === uid && !interactionMeta.mismatch) {
        savePageIntent(uid, interactionMeta.clientId);
      }

      if (interactionMeta?.mismatch || interactionMeta?.expired) {
        if (forceExpired) {
          if (!(await tryAutoLoginWithSso(uid))) {
            showInteractionBlocked(
              interactionMeta?.mismatch ? 'interaction_mismatch' : 'interaction_expired'
            );
          }
          return interactionMeta;
        }
        if (await tryAutoLoginWithSso(uid)) {
          return interactionMeta;
        }
        if (interactionMeta?.mismatch) {
          showInteractionBlocked('interaction_mismatch');
          return interactionMeta;
        }
        if (interactionMeta?.expired) {
          showInteractionBlocked('interaction_expired');
          return interactionMeta;
        }
      }

      if (
        interactionMeta?.hasSession &&
        interactionMeta.uid === uid &&
        !interactionMeta.mismatch &&
        !interactionMeta.expired
      ) {
        if (interactionMeta.prompt === 'consent') {
          const consentUrl = new URL('consent.html', global.location.href);
          consentUrl.searchParams.set('uid', uid);
          if (interactionMeta.clientId) {
            consentUrl.searchParams.set('client_id', interactionMeta.clientId);
          }
          global.location.replace(consentUrl.toString());
          return interactionMeta;
        }
        if (canResumeCurrentInteraction(uid) || resolveRestartAuthUrl(uid)) {
          restartAuthChain('existing_session', uid);
        }
        return interactionMeta;
      }

      return interactionMeta;
    } finally {
      initInProgress = false;
    }
  }

  async function syncUidWithActiveCookieUsingActive(urlUid, active) {
    if (!active || !active.uid) {
      return urlUid;
    }
    if (!urlUid || urlUid === active.uid) {
      return active.uid;
    }
    if (isCrossClientInteraction(urlUid, active)) {
      return urlUid;
    }
    const intendedClient = resolveIntendedClientId(urlUid);
    if (intendedClient && active.clientId && intendedClient === active.clientId) {
      const next = new URL(global.location.href);
      next.searchParams.set('uid', active.uid);
      next.searchParams.set('client_id', active.clientId);
      next.searchParams.delete('error');
      global.location.replace(next.toString());
      return null;
    }
    return urlUid;
  }

  function isInvalidInteractionError(errorCode) {
    return (
      errorCode === 'interaction_expired' ||
      errorCode === 'interaction_mismatch' ||
      errorCode === 'invalid_session'
    );
  }

  global.IamLoginSsoSync = {
    initSsoSync: initSsoSync,
    restartAuthChain: restartAuthChain,
    restartFromSnapshot: restartFromSnapshot,
    isInvalidInteractionError: isInvalidInteractionError,
    probeSessionOnVisible: probeSessionOnVisible,
    getCurrentInteractionUid: function () {
      return currentUid || readUrlUid();
    },
    getInteractionMeta: function () {
      return interactionMeta;
    },
  };
})(window);
