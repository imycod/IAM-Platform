// ============ PASSWORD TOGGLE ============
const passwordInput = document.getElementById('password');
const emailInput = document.getElementById('email');
const toggleBtn = document.getElementById('toggle-password');
const eyeIcon = document.getElementById('eye-icon');
const eyeOffIcon = document.getElementById('eye-off-icon');
let showPassword = false;
let isLoginError = false;

toggleBtn.addEventListener('click', () => {
  showPassword = !showPassword;
  passwordInput.type = showPassword ? 'text' : 'password';
  eyeIcon.style.display = showPassword ? 'none' : 'block';
  eyeOffIcon.style.display = showPassword ? 'block' : 'none';
  updateCharacters();
});

// ============ MOUSE TRACKING & CHARACTER ANIMATION ============
let mouseX = 0, mouseY = 0;
let isTyping = false;
let isLookingAtEachOther = false;
let isPurpleBlinking = false;
let isBlackBlinking = false;
let isPurplePeeking = false;
let typingTimer = null;

document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  if (!isTyping && !isLoginError) updateCharacters();
});

let isPasswordFocused = false;

// Typing detection
emailInput.addEventListener('focus', () => { setTyping(true); });
emailInput.addEventListener('blur', () => { setTyping(false); });
emailInput.addEventListener('input', () => { updateCharacters(); });
passwordInput.addEventListener('focus', () => { isPasswordFocused = true; updateCharacters(); });
passwordInput.addEventListener('blur', () => { isPasswordFocused = false; updateCharacters(); });
passwordInput.addEventListener('input', () => { updateCharacters(); });

function setTyping(typing) {
  isTyping = typing;
  if (typing) {
    isLookingAtEachOther = true;
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => { isLookingAtEachOther = false; updateCharacters(); }, 800);
  } else {
    isLookingAtEachOther = false;
  }
  updateCharacters();
}

// Blinking
function scheduleBlinkPurple() {
  setTimeout(() => {
    isPurpleBlinking = true;
    updateCharacters();
    setTimeout(() => {
      isPurpleBlinking = false;
      updateCharacters();
      scheduleBlinkPurple();
    }, 150);
  }, Math.random() * 4000 + 3000);
}

function scheduleBlinkBlack() {
  setTimeout(() => {
    isBlackBlinking = true;
    updateCharacters();
    setTimeout(() => {
      isBlackBlinking = false;
      updateCharacters();
      scheduleBlinkBlack();
    }, 150);
  }, Math.random() * 4000 + 3000);
}

scheduleBlinkPurple();
scheduleBlinkBlack();

// Purple peeking when password is visible
function schedulePeek() {
  if (passwordInput.value.length > 0 && showPassword) {
    setTimeout(() => {
      if (passwordInput.value.length > 0 && showPassword) {
        isPurplePeeking = true;
        updateCharacters();
        setTimeout(() => {
          isPurplePeeking = false;
          updateCharacters();
          schedulePeek();
        }, 800);
      }
    }, Math.random() * 3000 + 2000);
  }
}

// Watch for password visibility changes to trigger peeking
toggleBtn.addEventListener('click', () => {
  if (showPassword) schedulePeek();
});

// Calculate character position based on mouse
function calcPosition(el) {
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 3;
  const dx = mouseX - cx;
  const dy = mouseY - cy;
  const faceX = Math.max(-15, Math.min(15, dx / 20));
  const faceY = Math.max(-10, Math.min(10, dy / 30));
  const bodySkew = Math.max(-6, Math.min(6, -dx / 120));
  return { faceX, faceY, bodySkew };
}

function calcPupilOffset(el, maxDist) {
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = mouseX - cx;
  const dy = mouseY - cy;
  const dist = Math.min(Math.sqrt(dx * dx + dy * dy), maxDist);
  const angle = Math.atan2(dy, dx);
  return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist };
}

function updateCharacters() {
  const purple = document.getElementById('char-purple');
  const black = document.getElementById('char-black');
  const orange = document.getElementById('char-orange');
  const yellow = document.getElementById('char-yellow');

  const purplePos = calcPosition(purple);
  const blackPos = calcPosition(black);
  const orangePos = calcPosition(orange);
  const yellowPos = calcPosition(yellow);

  const pwdLen = passwordInput.value.length;
  const isShowingPwd = pwdLen > 0 && showPassword;
  // Characters look away when password field is focused (hiding password)
  const isLookingAway = isPasswordFocused && !showPassword;

  // ---- Purple body ----
  if (isShowingPwd) {
    purple.style.transform = 'skewX(0deg)';
    purple.style.height = '370px';
  } else if (isLookingAway) {
    // Tilt away from the form (lean left)
    purple.style.transform = 'skewX(-14deg) translateX(-20px)';
    purple.style.height = '410px';
  } else if (isTyping) {
    purple.style.transform = `skewX(${(purplePos.bodySkew || 0) - 12}deg) translateX(40px)`;
    purple.style.height = '410px';
  } else {
    purple.style.transform = `skewX(${purplePos.bodySkew}deg)`;
    purple.style.height = '370px';
  }

  // Purple eyes
  const purpleEyes = document.getElementById('purple-eyes');
  const purpleEyeL = document.getElementById('purple-eye-l');
  const purpleEyeR = document.getElementById('purple-eye-r');
  const purplePupilL = document.getElementById('purple-pupil-l');
  const purplePupilR = document.getElementById('purple-pupil-r');

  purpleEyeL.style.height = isPurpleBlinking ? '2px' : '18px';
  purpleEyeR.style.height = isPurpleBlinking ? '2px' : '18px';

  if (isLoginError) {
    // Sad look down-left
    purpleEyes.style.left = '30px';
    purpleEyes.style.top = '55px';
    purplePupilL.style.transform = 'translate(-3px, 4px)';
    purplePupilR.style.transform = 'translate(-3px, 4px)';
  } else if (isLookingAway) {
    // Eyes look up-left (away from form)
    purpleEyes.style.left = '20px';
    purpleEyes.style.top = '25px';
    purplePupilL.style.transform = 'translate(-5px, -5px)';
    purplePupilR.style.transform = 'translate(-5px, -5px)';
  } else if (isShowingPwd) {
    purpleEyes.style.left = '20px';
    purpleEyes.style.top = '35px';
    const px = isPurplePeeking ? 4 : -4;
    const py = isPurplePeeking ? 5 : -4;
    purplePupilL.style.transform = `translate(${px}px, ${py}px)`;
    purplePupilR.style.transform = `translate(${px}px, ${py}px)`;
  } else if (isLookingAtEachOther) {
    purpleEyes.style.left = '55px';
    purpleEyes.style.top = '65px';
    purplePupilL.style.transform = 'translate(3px, 4px)';
    purplePupilR.style.transform = 'translate(3px, 4px)';
  } else {
    purpleEyes.style.left = (45 + purplePos.faceX) + 'px';
    purpleEyes.style.top = (40 + purplePos.faceY) + 'px';
    const po = calcPupilOffset(purpleEyeL, 5);
    purplePupilL.style.transform = `translate(${po.x}px, ${po.y}px)`;
    purplePupilR.style.transform = `translate(${po.x}px, ${po.y}px)`;
  }

  // ---- Black body ----
  if (isShowingPwd) {
    black.style.transform = 'skewX(0deg)';
  } else if (isLookingAway) {
    black.style.transform = 'skewX(12deg) translateX(-10px)';
  } else if (isLookingAtEachOther) {
    black.style.transform = `skewX(${(blackPos.bodySkew || 0) * 1.5 + 10}deg) translateX(20px)`;
  } else if (isTyping) {
    black.style.transform = `skewX(${(blackPos.bodySkew || 0) * 1.5}deg)`;
  } else {
    black.style.transform = `skewX(${blackPos.bodySkew}deg)`;
  }

  // Black eyes
  const blackEyes = document.getElementById('black-eyes');
  const blackEyeL = document.getElementById('black-eye-l');
  const blackEyeR = document.getElementById('black-eye-r');
  const blackPupilL = document.getElementById('black-pupil-l');
  const blackPupilR = document.getElementById('black-pupil-r');

  blackEyeL.style.height = isBlackBlinking ? '2px' : '16px';
  blackEyeR.style.height = isBlackBlinking ? '2px' : '16px';

  if (isLoginError) {
    blackEyes.style.left = '15px';
    blackEyes.style.top = '40px';
    blackPupilL.style.transform = 'translate(-3px, 4px)';
    blackPupilR.style.transform = 'translate(-3px, 4px)';
  } else if (isLookingAway) {
    blackEyes.style.left = '10px';
    blackEyes.style.top = '20px';
    blackPupilL.style.transform = 'translate(-4px, -5px)';
    blackPupilR.style.transform = 'translate(-4px, -5px)';
  } else if (isShowingPwd) {
    blackEyes.style.left = '10px';
    blackEyes.style.top = '28px';
    blackPupilL.style.transform = 'translate(-4px, -4px)';
    blackPupilR.style.transform = 'translate(-4px, -4px)';
  } else if (isLookingAtEachOther) {
    blackEyes.style.left = '32px';
    blackEyes.style.top = '12px';
    blackPupilL.style.transform = 'translate(0px, -4px)';
    blackPupilR.style.transform = 'translate(0px, -4px)';
  } else {
    blackEyes.style.left = (26 + blackPos.faceX) + 'px';
    blackEyes.style.top = (32 + blackPos.faceY) + 'px';
    const bo = calcPupilOffset(blackEyeL, 4);
    blackPupilL.style.transform = `translate(${bo.x}px, ${bo.y}px)`;
    blackPupilR.style.transform = `translate(${bo.x}px, ${bo.y}px)`;
  }

  // ---- Orange body ----
  const orangeMouth = document.getElementById('orange-mouth');
  if (isLoginError) {
    orangeMouth.style.left = (80 + orangePos.faceX) + 'px';
    orangeMouth.style.top = '130px';
  }
  if (isShowingPwd) {
    orange.style.transform = 'skewX(0deg)';
  } else {
    orange.style.transform = `skewX(${orangePos.bodySkew}deg)`;
  }

  // Orange eyes
  const orangeEyes = document.getElementById('orange-eyes');
  const orangePupilL = document.getElementById('orange-pupil-l');
  const orangePupilR = document.getElementById('orange-pupil-r');

  if (isLoginError) {
    orangeEyes.style.left = '60px';
    orangeEyes.style.top = '95px';
    orangePupilL.style.transform = 'translate(-3px, 4px)';
    orangePupilR.style.transform = 'translate(-3px, 4px)';
  } else if (isLookingAway) {
    orangeEyes.style.left = '50px';
    orangeEyes.style.top = '75px';
    orangePupilL.style.transform = 'translate(-5px, -5px)';
    orangePupilR.style.transform = 'translate(-5px, -5px)';
  } else if (isShowingPwd) {
    orangeEyes.style.left = '50px';
    orangeEyes.style.top = '85px';
    orangePupilL.style.transform = 'translate(-5px, -4px)';
    orangePupilR.style.transform = 'translate(-5px, -4px)';
  } else {
    orangeEyes.style.left = (82 + orangePos.faceX) + 'px';
    orangeEyes.style.top = (90 + orangePos.faceY) + 'px';
    const oo = calcPupilOffset(orangePupilL, 5);
    orangePupilL.style.transform = `translate(${oo.x}px, ${oo.y}px)`;
    orangePupilR.style.transform = `translate(${oo.x}px, ${oo.y}px)`;
  }

  // ---- Yellow body ----
  if (isShowingPwd) {
    yellow.style.transform = 'skewX(0deg)';
  } else {
    yellow.style.transform = `skewX(${yellowPos.bodySkew}deg)`;
  }

  // Yellow eyes & mouth
  const yellowEyes = document.getElementById('yellow-eyes');
  const yellowPupilL = document.getElementById('yellow-pupil-l');
  const yellowPupilR = document.getElementById('yellow-pupil-r');
  const yellowMouth = document.getElementById('yellow-mouth');

  if (isLoginError) {
    yellowEyes.style.left = '35px';
    yellowEyes.style.top = '45px';
    yellowPupilL.style.transform = 'translate(-3px, 4px)';
    yellowPupilR.style.transform = 'translate(-3px, 4px)';
    yellowMouth.style.left = '30px';
    yellowMouth.style.top = '92px';
    yellowMouth.style.transform = 'rotate(-8deg)';
  } else if (isLookingAway) {
    yellowEyes.style.left = '20px';
    yellowEyes.style.top = '30px';
    yellowPupilL.style.transform = 'translate(-5px, -5px)';
    yellowPupilR.style.transform = 'translate(-5px, -5px)';
    yellowMouth.style.left = '15px';
    yellowMouth.style.top = '78px';
    yellowMouth.style.transform = 'rotate(0deg)';
  } else if (isShowingPwd) {
    yellowEyes.style.left = '20px';
    yellowEyes.style.top = '35px';
    yellowPupilL.style.transform = 'translate(-5px, -4px)';
    yellowPupilR.style.transform = 'translate(-5px, -4px)';
    yellowMouth.style.left = '10px';
    yellowMouth.style.top = '88px';
    yellowMouth.style.transform = 'rotate(0deg)';
  } else {
    yellowEyes.style.left = (52 + yellowPos.faceX) + 'px';
    yellowEyes.style.top = (40 + yellowPos.faceY) + 'px';
    const yo = calcPupilOffset(yellowPupilL, 5);
    yellowPupilL.style.transform = `translate(${yo.x}px, ${yo.y}px)`;
    yellowPupilR.style.transform = `translate(${yo.x}px, ${yo.y}px)`;
    yellowMouth.style.left = (40 + yellowPos.faceX) + 'px';
    yellowMouth.style.top = (88 + yellowPos.faceY) + 'px';
    yellowMouth.style.transform = 'rotate(0deg)';
  }
}

// ============ LOGIN ERROR ANIMATION ============
let errorRecoverTimer = null;
const shakeIds = ['purple-eyes', 'black-eyes', 'orange-eyes', 'yellow-eyes', 'yellow-mouth', 'orange-mouth'];

function triggerLoginError() {
  // Clear any previous error recovery timer so repeated clicks work
  if (errorRecoverTimer) {
    clearTimeout(errorRecoverTimer);
    errorRecoverTimer = null;
  }

  // Reset shake animation (remove class, force reflow, re-add)
  const shakeEls = shakeIds.map(id => document.getElementById(id));
  shakeEls.forEach(el => el.classList.remove('shake-head'));
  // Force reflow to restart animation even on repeated clicks
  void document.body.offsetHeight;

  isLoginError = true;
  isPasswordFocused = false;
  updateCharacters();

  // Show sad mouth on orange
  document.getElementById('orange-mouth').classList.add('visible');

  // Start shake after sad pose settles (the 0.7s body transition)
  setTimeout(() => {
    shakeEls.forEach(el => el.classList.add('shake-head'));
  }, 350);

  // Recover after 2.5 seconds
  errorRecoverTimer = setTimeout(() => {
    isLoginError = false;
    errorRecoverTimer = null;
    document.getElementById('orange-mouth').classList.remove('visible');
    shakeEls.forEach(el => el.classList.remove('shake-head'));
    updateCharacters();
  }, 2500);
}

// ============ OIDC INTERACTION LOGIN ============
const loginParams = new URLSearchParams(window.location.search);
const interactionUid = loginParams.get('uid');
const loginErrorCode = loginParams.get('error');
const iamLoginCfg = window.IAM_LOGIN_CONFIG || { apiBaseUrl: 'http://localhost:3000' };

const ERROR_MESSAGES = {
  invalid_credentials: 'Invalid email or password. Please try again.',
  missing_credentials: 'Please enter your email and password.',
  missing_uid: 'Invalid login session. Please start sign-in from your application again.',
  interaction_expired: 'Login session expired. Please return to your app and click SSO again.',
  invalid_session: 'Login session expired. Please return to your app and click SSO again.',
};

function showLoginError(message) {
  const errEl = document.getElementById('error-msg');
  errEl.textContent = message;
  errEl.style.display = 'block';
  triggerLoginError();
}

async function initOidcLoginPage() {
  if (!interactionUid) {
    showLoginError(ERROR_MESSAGES.missing_uid);
    document.getElementById('btn-login').disabled = true;
    return;
  }

  if (window.IamLoginSsoSync) {
    const forceExpired =
      !!loginErrorCode && IamLoginSsoSync.isInvalidInteractionError(loginErrorCode);
    await IamLoginSsoSync.initSsoSync(interactionUid, { forceExpired });
  }

  if (loginErrorCode === 'invalid_credentials') {
    showLoginError(ERROR_MESSAGES.invalid_credentials);
  } else if (
    loginErrorCode &&
    !(window.IamLoginSsoSync && IamLoginSsoSync.isInvalidInteractionError(loginErrorCode))
  ) {
    showLoginError(ERROR_MESSAGES[loginErrorCode] || 'Login failed. Please try again.');
  }
}

initOidcLoginPage();

async function submitInteractionLogin(email, password) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = `${iamLoginCfg.apiBaseUrl.replace(/\/$/, '')}/api/interaction/${encodeURIComponent(interactionUid)}/login`;
  form.style.display = 'none';

  const emailInputEl = document.createElement('input');
  emailInputEl.type = 'hidden';
  emailInputEl.name = 'email';
  emailInputEl.value = email;
  form.appendChild(emailInputEl);

  const passwordInputEl = document.createElement('input');
  passwordInputEl.type = 'hidden';
  passwordInputEl.name = 'password';
  passwordInputEl.value = password;
  form.appendChild(passwordInputEl);

  document.body.appendChild(form);
  form.submit();
}

// ============ FORM VALIDATION ============
document.getElementById('login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const email = emailInput.value.trim();
  const pwd = passwordInput.value;
  const errEl = document.getElementById('error-msg');
  const emailLabel = document.getElementById('email-label');
  const pwdLabel = document.getElementById('password-label');

  // Reset
  errEl.style.display = 'none';
  emailInput.classList.remove('error');
  passwordInput.classList.remove('error');
  emailLabel.classList.remove('error-label');
  pwdLabel.classList.remove('error-label');

  if (!interactionUid) {
    showLoginError(ERROR_MESSAGES.missing_uid);
    return;
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    emailInput.classList.add('error');
    emailLabel.classList.add('error-label');
    errEl.textContent = 'Please enter a valid email address.';
    errEl.style.display = 'block';
    triggerLoginError();
    return;
  }

  if (!pwd || pwd.length < 6) {
    passwordInput.classList.add('error');
    pwdLabel.classList.add('error-label');
    errEl.textContent = 'Password must be at least 6 characters.';
    errEl.style.display = 'block';
    triggerLoginError();
    return;
  }

  const btn = document.getElementById('btn-login');
  btn.querySelector('.btn-text').textContent = 'Signing in...';
  btn.disabled = true;

  void submitInteractionLogin(email, pwd);
});

// Initial render
updateCharacters();