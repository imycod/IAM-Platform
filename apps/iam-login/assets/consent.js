// 后端在同源 /api/interaction/:uid（consent 提示）渲染本页时注入 window.__INTERACTION__。
const interaction = window.__INTERACTION__ || {};
const uid = interaction.uid || null;
const clientId = interaction.clientId || '';
const scope = interaction.scope || 'openid profile email';
const errorCode = interaction.error || null;
const appReturnUrl = interaction.appReturnUrl || null;

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

function showReturnState(message) {
  showError(message);
  consentForm.style.display = 'none';
  if (appReturnUrl && returnBtn) {
    returnBtn.href = appReturnUrl;
    returnBtn.style.display = 'inline-flex';
  }
}

function render() {
  if (!uid) {
    showReturnState('Invalid authorization session. Please start sign-in from your application again.');
    return;
  }
  consentForm.action = `/api/interaction/${encodeURIComponent(uid)}/consent`;
  clientEl.textContent = clientId || 'Unknown application';
  if (clientIdInput) {
    clientIdInput.value = clientId;
  }
  const scopes = String(scope).split(' ').filter(Boolean);
  scopesEl.textContent = scopes.length ? scopes.join(', ') : 'openid, profile, email';

  if (errorCode === 'access_denied') {
    showReturnState('Authorization was denied. Please return to your application.');
  } else if (errorCode === 'interaction_expired') {
    showReturnState('Authorization session expired. Please return to your application and sign in again.');
  }
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

render();
