const params = new URLSearchParams(window.location.search);
const urlUid = params.get('uid');
const urlClientId = params.get('client_id');
const urlScope = params.get('scope');
const urlError = params.get('error');
const cfg = window.IAM_LOGIN_CONFIG || { apiBaseUrl: 'http://localhost:3000', appReturnUrls: {} };
const apiBase = cfg.apiBaseUrl.replace(/\/$/, '');

const clientEl = document.getElementById('consent-client-id');
const scopesEl = document.getElementById('consent-scopes');
const errorEl = document.getElementById('consent-error');
const consentForm = document.getElementById('consent-form');
const actionInput = document.getElementById('consent-action');
const approveBtn = consentForm.querySelector('[data-action="approve"]');
const denyBtn = consentForm.querySelector('[data-action="deny"]');
const returnBtn = document.getElementById('consent-return-btn');
const clientIdInput = document.getElementById('consent-client-id-input');

function showError(message) {
  errorEl.textContent = message;
  errorEl.style.display = 'block';
}

function unwrapApiData(json) {
  if (json && json.code === 0 && json.data != null) {
    return json.data;
  }
  return json;
}

function parseErrorCode(body) {
  if (!body) {
    return null;
  }
  if (typeof body.code === 'string') {
    return body.code;
  }
  if (typeof body.message === 'object' && body.message?.code) {
    return body.message.code;
  }
  return null;
}

function resolveAppReturnUrl(clientId) {
  if (!clientId) {
    return null;
  }
  return cfg.appReturnUrls?.[clientId] ?? null;
}

function showExpiredState(clientId, message) {
  showError(
    message ||
      'Authorization session expired or was denied. Please return to your application and sign in again.',
  );
  consentForm.style.display = 'none';
  const backUrl = resolveAppReturnUrl(clientId || urlClientId);
  if (backUrl && returnBtn) {
    returnBtn.href = backUrl;
    returnBtn.style.display = 'inline-flex';
  }
}

function syncUrlParams(uid, clientId, scope) {
  const next = new URL(window.location.href);
  next.searchParams.set('uid', uid);
  if (clientId) {
    next.searchParams.set('client_id', clientId);
  }
  if (scope) {
    next.searchParams.set('scope', scope);
  }
  next.searchParams.delete('error');
  window.history.replaceState(null, '', next.toString());
}

function renderMeta(meta) {
  const clientId = meta.clientId || urlClientId || '';
  const scopeStr =
    meta.params?.scope || urlScope || 'openid profile email';
  syncUrlParams(meta.uid, clientId || undefined, String(scopeStr));
  consentForm.action = `${apiBase}/api/interaction/${encodeURIComponent(meta.uid)}/consent`;
  clientEl.textContent = clientId || 'Unknown application';
  if (clientIdInput) {
    clientIdInput.value = clientId;
  }
  const scopes = String(scopeStr).split(' ').filter(Boolean);
  scopesEl.textContent = scopes.length ? scopes.join(', ') : 'openid, profile, email';
}

/** IAM 302 到 consent.html 时已在 URL 携带 client_id / scope，无需跨域 fetch cookie */
function renderFromUrlParams() {
  if (!urlUid || !urlClientId || urlError) {
    return false;
  }
  renderMeta({
    uid: urlUid,
    clientId: urlClientId,
    params: { scope: urlScope || 'openid profile email' },
  });
  return true;
}

function resumeViaIam(uid) {
  window.location.replace(`${apiBase}/api/interaction/${encodeURIComponent(uid)}`);
}

async function fetchActiveMeta() {
  const res = await fetch(`${apiBase}/api/interaction/active/meta`, {
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

async function fetchUidMeta(uid) {
  const res = await fetch(`${apiBase}/api/interaction/${encodeURIComponent(uid)}/meta`, {
    credentials: 'include',
    cache: 'no-store',
  });
  if (res.status === 404) {
    const body = await res.json().catch(() => null);
    const code = parseErrorCode(body);
    return {
      expired: true,
      mismatch: code === 'interaction_mismatch',
      code: code || 'interaction_expired',
    };
  }
  if (!res.ok) {
    throw new Error('meta_fetch_failed');
  }
  const meta = unwrapApiData(await res.json());
  if (meta.uid && meta.uid !== uid) {
    return { expired: true, mismatch: true, code: 'interaction_mismatch' };
  }
  return meta;
}

async function loadMeta() {
  if (renderFromUrlParams()) {
    return { uid: urlUid, clientId: urlClientId };
  }

  if (urlError === 'access_denied') {
    showExpiredState(urlClientId);
    return null;
  }

  if (urlError === 'interaction_expired' && urlUid) {
    resumeViaIam(urlUid);
    return null;
  }

  try {
    const active = await fetchActiveMeta();
    if (active?.uid) {
      if (active.prompt !== 'consent') {
        resumeViaIam(active.uid);
        return null;
      }
      renderMeta(active);
      return active;
    }
  } catch {
    // fall through
  }

  if (!urlUid) {
    showExpiredState(urlClientId, 'Invalid authorization session. Please start sign-in from your application again.');
    return null;
  }

  if (urlClientId) {
    renderMeta({
      uid: urlUid,
      clientId: urlClientId,
      params: { scope: urlScope || 'openid profile email' },
    });
    return { uid: urlUid };
  }

  resumeViaIam(urlUid);
  return null;
}

consentForm.addEventListener('submit', (event) => {
  const submitter = event.submitter;
  const action = submitter?.dataset?.action === 'deny' ? 'deny' : 'approve';
  actionInput.value = action;
  approveBtn.disabled = true;
  denyBtn.disabled = true;
  if (action === 'approve') {
    approveBtn.textContent = 'Authorizing...';
  } else {
    denyBtn.textContent = 'Denying...';
  }
});

void loadMeta();
