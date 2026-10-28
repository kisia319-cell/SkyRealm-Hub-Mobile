(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const API_BASE = String(window.SKYREALM_CONFIG?.apiBaseUrl || '').trim().replace(/\/+$/, '');
  const API_KEY = String(window.SKYREALM_CONFIG?.supabaseAnonKey || '').trim();
  let currentLanguage = ['ru', 'en'].includes(localStorage.getItem('skyrealm_language')) ? localStorage.getItem('skyrealm_language') : 'ru';
  const LANGUAGE_TEXT = {
    ru: {
      pageHome:'ИГРОВОЙ ЦЕНТР', pageNews:'ХРОНИКИ МИРА', pageShop:'МАГАЗИН ПРИКЛЮЧЕНИЙ', pageCommunity:'СООБЩЕСТВО', pageSettings:'НАСТРОЙКИ',
      loginTitle:'Войти в SkyRealm', registerTitle:'Создай аккаунт', loginIntro:'Войди, чтобы открыть свой профиль, или создай новый аккаунт.', registerIntro:'Заполни данные ниже. После регистрации мы попросим подтвердить почту кодом.',
      usernameLogin:'Почта или имя игрока', usernameRegister:'Имя игрока', usernamePlaceholderLogin:'Введите почту или имя игрока', usernamePlaceholderRegister:'Придумай имя (3–20 символов)',
      passwordPlaceholderLogin:'Введите пароль', passwordPlaceholderRegister:'Не менее 8 символов', submitLogin:'Войти в аккаунт <span>→</span>', submitRegister:'Создать аккаунт <span>→</span>', switchLogin:'Создать аккаунт <span>→</span>', switchRegister:'← Вернуться ко входу',
      switchHintLogin:'Впервые в SkyRealm?', switchHintRegister:'Уже есть аккаунт?', authFootLogin:'<span class="shield">⬡</span> Защищённая регистрация · подтверждение по почте', authFootRegister:'<span class="shield">⬡</span> После регистрации подтверди адрес почты. Не используй пароль от почты.',
      verificationTitle:'Подтверди почту', verificationIntro:'Введи все цифры из письма. Код действует ограниченное время.', verificationKicker:'ПОСЛЕДНИЙ ШАГ', verifyLabel:'Код подтверждения', verifySubmit:'Подтвердить почту <span>→</span>', verifyResend:'Отправить код повторно', verifyBack:'← Назад к регистрации', verifyFoot:'<span class="shield">⬡</span> Никому не сообщай код подтверждения.',
      profileTitle:'Твой профиль', profileUser:'Игрок', profileKicker:'ПРОФИЛЬ SKYREALM', verified:'<span>✓</span> Почта подтверждена', profileNote:'Твой аккаунт готов к будущим игровым приключениям.', profileFoot:'<span class="shield">⬡</span> Аккаунт защищён серверной проверкой почты.', logout:'Выйти из аккаунта',
      busyConnect:'Подключаемся к серверу…', busyVerify:'Проверяем код…', busyResend:'Отправляем…', languageChanged:'Language saved.', statusChecking:'Проверяем сервер…', statusOnline:'Облачный сервер онлайн', statusOffline:'Нет связи с облаком', statusUnconfigured:'Сервер не настроен'
    },
    en: {
      pageHome:'GAME CENTER', pageNews:'WORLD CHRONICLES', pageShop:'ADVENTURE SHOP', pageCommunity:'COMMUNITY', pageSettings:'SETTINGS',
      loginTitle:'Sign in to SkyRealm', registerTitle:'Create your account', loginIntro:'Sign in to open your profile, or create a new account.', registerIntro:'Fill in the details below. We’ll ask you to verify your email after registration.',
      usernameLogin:'Email or player name', usernameRegister:'Player name', usernamePlaceholderLogin:'Enter email or username', usernamePlaceholderRegister:'Choose a name (3–20 characters)',
      passwordPlaceholderLogin:'Enter password', passwordPlaceholderRegister:'At least 8 characters', submitLogin:'Sign in <span>→</span>', submitRegister:'Create account <span>→</span>', switchLogin:'Create account <span>→</span>', switchRegister:'← Back to sign in',
      switchHintLogin:'New to SkyRealm?', switchHintRegister:'Already have an account?', authFootLogin:'<span class="shield">⬡</span> Secure sign-up · email verification', authFootRegister:'<span class="shield">⬡</span> Verify your email after registration. Never reuse your email password.',
      verificationTitle:'Verify your email', verificationIntro:'Enter every digit from the email. The code expires after a short time.', verificationKicker:'ONE LAST STEP', verifyLabel:'Verification code', verifySubmit:'Verify email <span>→</span>', verifyResend:'Send a new code', verifyBack:'← Back to registration', verifyFoot:'<span class="shield">⬡</span> Never share your verification code.',
      profileTitle:'Your profile', profileUser:'Player', profileKicker:'SKYREALM PROFILE', verified:'<span>✓</span> Email verified', profileNote:'Your account is ready for future adventures.', profileFoot:'<span class="shield">⬡</span> Your account is protected by server-side email verification.', logout:'Sign out',
      busyConnect:'Connecting to server…', busyVerify:'Checking code…', busyResend:'Sending…', languageChanged:'Language saved.', statusChecking:'Checking server…', statusOnline:'Cloud server online', statusOffline:'Cloud server unreachable', statusUnconfigured:'Server not configured'
    }
  };
  const t = (key) => LANGUAGE_TEXT[currentLanguage][key] || LANGUAGE_TEXT.ru[key] || key;
  const getPageNames = () => ({home:t('pageHome'),news:t('pageNews'),shop:t('pageShop'),community:t('pageCommunity'),settings:t('pageSettings')});
  let pageNames = getPageNames();
  let gameLaunchBusy = false;
  const toast = (message) => {
    const t = $('#toast');
    t.textContent = message;
    t.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove('show'), 3600);
  };

  const dataFolderButton = document.getElementById('open-data-folder');
  if (dataFolderButton) dataFolderButton.addEventListener('click', async () => {
    try {
      if (!window.pywebview?.api?.open_data_folder) { toast(currentLanguage === 'en' ? 'This action is available in the desktop launcher.' : 'Эта функция доступна в настольном лаунчере.'); return; }
      const result = await window.pywebview.api.open_data_folder();
      if (result?.ok) toast(currentLanguage === 'en' ? 'SkyRealm data folder opened.' : 'Папка SkyRealm открыта.');
      else toast(result?.message || (currentLanguage === 'en' ? 'Could not open folder.' : 'Не удалось открыть папку.'));
    } catch (_) { toast(currentLanguage === 'en' ? 'Could not open folder.' : 'Не удалось открыть папку.'); }
  });

  function showPage(name) {
    $$('.page').forEach(p => p.classList.toggle('active', p.id === `page-${name}`));
    $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.page === name));
    $('#crumb-label').textContent = pageNames[name] || pageNames.home;
    $('.main').scrollTop = 0;
    if (name === 'settings') loadSettings();
  }
  $$('[data-page]').forEach(b => b.addEventListener('click', () => showPage(b.dataset.page)));
  $$('.news-item').forEach(b => b.addEventListener('click', () => showPage('news')));

  function apiConfigured() {
    return /^https?:\/\//i.test(API_BASE) && !/REPLACE-WITH-YOUR|YOUR-SERVER|example\.com/i.test(API_BASE) && API_KEY.length > 10;
  }
  function setCloudStatus(state, title, copy) {
    const dotClass = state === 'online' ? 'status-online' : (state === 'offline' ? 'status-offline' : 'status-checking');
    ['#top-status-dot', '#sidebar-status-dot', '#card-status-dot'].forEach(sel => {
      const el = $(sel);
      if (!el) return;
      el.classList.remove('status-online', 'status-offline', 'status-checking');
      el.classList.add(dotClass);
    });
    if ($('#top-status-label')) $('#top-status-label').textContent = title;
    if ($('#sidebar-status-label')) $('#sidebar-status-label').textContent = state === 'online' ? (currentLanguage === 'en' ? 'Cloud online' : 'Облако доступно') : (state === 'offline' ? (currentLanguage === 'en' ? 'Cloud unreachable' : 'Нет связи с облаком') : (currentLanguage === 'en' ? 'Checking server' : 'Проверяем сервер'));
    if ($('#card-status-title')) $('#card-status-title').textContent = title;
    if ($('#card-status-copy')) $('#card-status-copy').textContent = copy;
  }
  async function checkCloudStatus() {
    if (!apiConfigured()) {
      setCloudStatus('offline', currentLanguage === 'en' ? 'Server not configured' : 'Сервер не настроен', currentLanguage === 'en' ? 'Check the address in config.js.' : 'Проверь адрес в config.js.');
      return;
    }
    setCloudStatus('checking', currentLanguage === 'en' ? 'Checking server…' : 'Проверяем сервер…', currentLanguage === 'en' ? 'This may take a few seconds.' : 'Это может занять пару секунд.');
    try {
      const endpoint = new URL(API_BASE);
      endpoint.searchParams.set('route', '/health');
      const response = await fetch(endpoint.toString(), {
        method: 'GET',
        headers: {'apikey': API_KEY, 'Authorization': 'Bearer ' + API_KEY},
        cache: 'no-store'
      });
      const data = await response.json();
      if (response.ok && data.status === 'ok') {
        setCloudStatus('online', currentLanguage === 'en' ? 'Cloud server online' : 'Облачный сервер онлайн', currentLanguage === 'en' ? 'Server is available. Registration can be tested.' : 'Сервер доступен. Можно проверять регистрацию.');
      } else {
        setCloudStatus('offline', currentLanguage === 'en' ? 'Server returned an error' : 'Сервер ответил с ошибкой', currentLanguage === 'en' ? 'Check your connection and try again.' : 'Проверь подключение и попробуй позже.');
      }
    } catch (_) {
      setCloudStatus('offline', currentLanguage === 'en' ? 'Cloud unreachable' : 'Нет связи с облаком', currentLanguage === 'en' ? 'Check your internet connection.' : 'Проверь интернет. API может быть временно недоступен.');
    }
  }
  function currentToken() {
    return localStorage.getItem('skyrealm_token') || sessionStorage.getItem('skyrealm_token') || '';
  }
  function saveToken(token) {
    localStorage.removeItem('skyrealm_token');
    sessionStorage.removeItem('skyrealm_token');
    if ($('#remember').checked) localStorage.setItem('skyrealm_token', token);
    else sessionStorage.setItem('skyrealm_token', token);
  }
  function clearToken() {
    localStorage.removeItem('skyrealm_token');
    sessionStorage.removeItem('skyrealm_token');
  }
  async function requestApi(path, {method='GET', body=null, token=null} = {}) {
    if (!apiConfigured()) {
      throw new Error('Сервер авторизации ещё не подключён. Нужно развернуть сервер SkyRealm, настроить отправку писем и указать его HTTPS-адрес в config.js.');
    }
    let response;
    try {
      // Pass the route in the query string. Some Supabase Edge gateways normalize
      // path suffixes after the function name, so /api/auth/... may be stripped.
      const endpoint = new URL(API_BASE);
      endpoint.searchParams.set('route', path);
      response = await fetch(endpoint.toString(), {
        method,
        headers: {
          'apikey': API_KEY,
          'Authorization': `Bearer ${token || currentToken() || API_KEY}`,
          ...(body ? {'Content-Type':'application/json'} : {})
        },
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store'
      });
    } catch (_) {
      throw new Error('Не удалось связаться с сервером SkyRealm. Проверь интернет и доступность сервера.');
    }
    let data = {};
    try { data = await response.json(); } catch (_) { /* empty response */ }
    if (!response.ok) {
      const detail = data.detail;
      const validationMessage = Array.isArray(detail) ? (detail[0]?.msg || '') : '';
      const error = new Error(typeof detail === 'string' ? detail : (detail?.message || validationMessage || data.message || `Ошибка сервера (${response.status}).`));
      if (detail && typeof detail === 'object') {
        error.code = detail.code || '';
        error.email = detail.email || '';
      }
      error.status = response.status;
      throw error;
    }
    return data;
  }
  function localizeError(message, code = '') {
    if (currentLanguage !== 'en') return message;
    const byCode = {
      INVALID_USERNAME:'Player name must contain 3–20 letters, numbers, or underscores.',
      INVALID_EMAIL:'Enter a valid email address.',
      INVALID_PASSWORD:'Password must contain 8–128 characters.',
      USERNAME_EXISTS:'That player name is already taken.',
      ACCOUNT_EXISTS:'That email address is already registered.',
      EMAIL_NOT_VERIFIED:'This account is not verified yet. Enter the email code or request a new one.',
      EMAIL_SEND_FAILED:'The account may be waiting for email verification, but the message could not be sent. Check the email service settings.',
      INVALID_CREDENTIALS:'Incorrect email/username or password.',
      INVALID_CODE:'The verification code is incorrect. Check the entire code and try again.',
      INVALID_OR_EXPIRED_CODE:'This code is invalid or expired. Request a new code and enter it in full.',
      RATE_LIMITED:'Too many requests. Wait a little and try again.',
      EMAIL_SEND_FAILED:'The verification email could not be sent. Check the mail settings and try again.',
      NO_SESSION:'Please sign in again.'
    };
    return byCode[code] || message;
  }

  function setMessage(selector, message, kind='') {
    const node = $(selector);
    node.textContent = message;
    node.classList.remove('error', 'success');
    if (kind) node.classList.add(kind);
  }
  function setBusy(button, busy, busyText='Подожди…') {
    if (!button) return;
    if (busy) {
      button.dataset.originalText = button.innerHTML;
      button.innerHTML = busyText;
      button.disabled = true;
    } else {
      button.innerHTML = button.dataset.originalText || button.innerHTML;
      button.disabled = false;
    }
  }

  let authMode = 'login';
  let verificationEmail = sessionStorage.getItem('skyrealm_pending_email') || '';
  function hideVerification() {
    $('#verification-view').hidden = true;
    $('#auth-form').hidden = false;
    $('.auth-tabs').hidden = false;
    $('#profile-view').hidden = true;
  }
  function setAuthMode(mode) {
    authMode = mode;
    hideVerification();
    $$('.auth-tab').forEach(b => {
      const active = b.dataset.auth === mode;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    const register = mode === 'register';
    $('#auth-title').textContent = t(register ? 'registerTitle' : 'loginTitle');
    $('#auth-intro').textContent = t(register ? 'registerIntro' : 'loginIntro');
    $('#username-label').textContent = t(register ? 'usernameRegister' : 'usernameLogin');
    $('#username').placeholder = t(register ? 'usernamePlaceholderRegister' : 'usernamePlaceholderLogin');
    $('#username').setAttribute('autocomplete', register ? 'username' : 'username');
    $('#username').setAttribute('maxlength', register ? '20' : '254');
    $('#email-field').style.display = register ? 'block' : 'none';
    $('#email').required = register;
    $('#password').autocomplete = register ? 'new-password' : 'current-password';
    $('#password').placeholder = t(register ? 'passwordPlaceholderRegister' : 'passwordPlaceholderLogin');
    $('#submit-auth').innerHTML = t(register ? 'submitRegister' : 'submitLogin');
    $('#switch-auth').innerHTML = t(register ? 'switchRegister' : 'switchLogin');
    $('#auth-switch-hint').querySelector('span').textContent = t(register ? 'switchHintRegister' : 'switchHintLogin');
    $('#auth-message').textContent = '';
    $('#auth-message').classList.remove('error','success');
    $('#auth-foot').innerHTML = t(register ? 'authFootRegister' : 'authFootLogin');
  }
  function showVerification(email, message='Мы отправили код на указанный адрес. Введи все цифры из письма; сейчас код содержит 8 цифр. Код действует 10 минут.') {
    verificationEmail = (email || '').trim().toLowerCase();
    sessionStorage.setItem('skyrealm_pending_email', verificationEmail);
    $('#auth-form').hidden = true;
    $('.auth-tabs').hidden = true;
    $('#profile-view').hidden = true;
    $('#verification-view').hidden = false;
    $('#auth-title').textContent = t('verificationTitle');
    const verificationText = currentLanguage === 'en'
      ? 'We sent a code to this address. Enter every digit from your email; codes expire after 10 minutes.'
      : (message || 'Мы отправили код на указанный адрес. Введи все цифры из письма; код действует 10 минут.');
    $('#verification-description').textContent = `${verificationText} ${currentLanguage === 'en' ? 'Email:' : 'Адрес:'} ${verificationEmail}`;
    $('#verification-code').value = '';
    setMessage('#verification-message', '');
    $('#auth-foot').innerHTML = t('verifyFoot');
    $('#verification-code').focus();
  }
  function showProfile(user) {
    hideVerification();
    $('#auth-form').hidden = true;
    $('.auth-tabs').hidden = true;
    $('#profile-view').hidden = false;
    $('#auth-title').textContent = t('profileTitle');
    $('#profile-name').textContent = user.username || t('profileUser');
    $('#profile-email').textContent = user.email || '';
    $('#auth-foot').innerHTML = t('profileFoot');
    verificationEmail = '';
    sessionStorage.removeItem('skyrealm_pending_email');
  }
  function showAuthAfterLogout() {
    hideVerification();
    $('#profile-view').hidden = true;
    $('#auth-form').hidden = false;
    $('.auth-tabs').hidden = false;
    $('#auth-title').textContent = t('loginTitle');
    $('#auth-foot').innerHTML = t('authFootLogin');
    setAuthMode('login');
  }

  $$('.auth-tab').forEach(b => b.addEventListener('click', () => setAuthMode(b.dataset.auth)));
  $('#switch-auth').addEventListener('click', () => setAuthMode(authMode === 'login' ? 'register' : 'login'));
  $$('[data-auth-mode]').forEach(b => b.addEventListener('click', () => {
    const mode = b.dataset.authMode === 'login' ? 'login' : 'register';
    showPage('home');
    setAuthMode(mode);
    $('#auth-panel').scrollIntoView({behavior: 'smooth', block: 'center'});
    window.setTimeout(() => {
      if (!$('#auth-form').hidden) $('#username').focus({preventScroll: true});
    }, 280);
  }));
  $('#show-password').addEventListener('click', () => { const p = $('#password'); p.type = p.type === 'password' ? 'text' : 'password'; });
  $('#forgot').addEventListener('click', () => toast('Восстановление пароля добавим следующим этапом.'));
  $('#back-to-register').addEventListener('click', () => {
    sessionStorage.removeItem('skyrealm_pending_email');
    setAuthMode('register');
    $('#email').value = verificationEmail;
  });

  $('#auth-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const username = $('#username').value.trim();
    const email = $('#email').value.trim().toLowerCase();
    const password = $('#password').value;
    const button = $('#submit-auth');
    setMessage('#auth-message', '');
    if (username.length < 3) { setMessage('#auth-message', currentLanguage === 'en' ? 'Player name or username must contain at least 3 characters.' : 'Имя игрока или логин должен содержать минимум 3 символа.', 'error'); return; }
    if (password.length < 8) { setMessage('#auth-message', currentLanguage === 'en' ? 'Password must contain at least 8 characters.' : 'Пароль должен содержать минимум 8 символов.', 'error'); return; }
    if (authMode === 'register' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setMessage('#auth-message', currentLanguage === 'en' ? 'Enter a valid email address.' : 'Укажи корректную электронную почту.', 'error'); return; }
    setBusy(button, true, t('busyConnect'));
    try {
      if (authMode === 'register') {
        const result = await requestApi('/api/auth/register', {method:'POST', body:{username, email, password}});
        if ($('#remember').checked) localStorage.setItem('skyrealm_login', username); else localStorage.removeItem('skyrealm_login');
        $('#password').value = '';
        showVerification(result.email || email, result.message || 'Код подтверждения отправлен на почту.');
      } else {
        const result = await requestApi('/api/auth/login', {method:'POST', body:{identifier:username, password}});
        saveToken(result.access_token);
        if ($('#remember').checked) localStorage.setItem('skyrealm_login', username); else localStorage.removeItem('skyrealm_login');
        $('#password').value = '';
        showProfile(result.user);
        setMessage('#auth-message', 'Вход выполнен.', 'success');
      }
    } catch (error) {
      if ((error.code === 'EMAIL_NOT_VERIFIED' || error.code === 'EMAIL_SEND_FAILED') && error.email) {
        const explanation = error.code === 'EMAIL_NOT_VERIFIED' ? 'Этот аккаунт ещё не подтверждён. Введи код из письма или запроси новый.' : 'Аккаунт создан, но письмо пока не ушло. После настройки почтового сервера можно запросить код повторно.';
        showVerification(error.email, explanation);
        setMessage('#verification-message', error.message, 'error');
      } else {
        setMessage('#auth-message', localizeError(error.message || 'Не удалось выполнить запрос.', error.code), 'error');
      }
    } finally {
      setBusy(button, false);
    }
  });

  $('#verify-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const code = $('#verification-code').value.replace(/\D/g, '').slice(0, 10);
    $('#verification-code').value = code;
    if (!verificationEmail) { setMessage('#verification-message', 'Не найден адрес почты. Вернись к регистрации.', 'error'); return; }
    if (!/^\d{6,10}$/.test(code)) { setMessage('#verification-message', currentLanguage === 'en' ? 'Enter the complete code from your email (6–10 digits).' : 'Введи полный код из письма (от 6 до 10 цифр).', 'error'); return; }
    const button = $('#verify-form button[type="submit"]');
    setBusy(button, true, t('busyVerify'));
    try {
      const result = await requestApi('/api/auth/verify', {method:'POST', body:{email:verificationEmail, code}});
      saveToken(result.access_token);
      if (result.user?.username && $('#remember').checked) localStorage.setItem('skyrealm_login', result.user.username);
      showProfile(result.user);
      toast('Почта подтверждена. Аккаунт SkyRealm создан!');
    } catch (error) {
      setMessage('#verification-message', localizeError(error.message || 'Код не принят.', error.code), 'error');
    } finally {
      setBusy(button, false);
    }
  });

  $('#resend-code').addEventListener('click', async () => {
    if (!verificationEmail) { setMessage('#verification-message', 'Не найден адрес почты.', 'error'); return; }
    const button = $('#resend-code');
    setBusy(button, true, t('busyResend'));
    try {
      const result = await requestApi('/api/auth/resend', {method:'POST', body:{email:verificationEmail}});
      setMessage('#verification-message', result.message || 'Если аккаунт ожидает подтверждения, новый код отправлен.', 'success');
    } catch (error) {
      setMessage('#verification-message', localizeError(error.message || 'Не удалось отправить код.', error.code), 'error');
    } finally {
      setBusy(button, false);
    }
  });

  $('#logout').addEventListener('click', async () => {
    try { if (currentToken() && apiConfigured()) await requestApi('/api/auth/logout', {method:'POST'}); } catch (_) { /* clear local session even if server is offline */ }
    clearToken();
    showAuthAfterLogout();
    toast('Ты вышел из аккаунта.');
  });

  // Show real API availability instead of a hardcoded 'online' status.
  checkCloudStatus();

  // Restore a remembered login name, but never store the user's password.
  const savedLogin = localStorage.getItem('skyrealm_login');
  if (savedLogin) $('#username').value = savedLogin;

  async function restoreSession() {
    const token = currentToken();
    if (!token || !apiConfigured()) return;
    try {
      const result = await requestApi('/api/auth/me', {token});
      showProfile(result.user);
    } catch (_) {
      clearToken();
    }
  }
  restoreSession();

  const GAME_PREFERENCES_KEY = 'skyrealm_game_preferences';
  const DEFAULT_GAME_PREFERENCES = { resolution:'1280x720', windowMode:'windowed', graphicsQuality:'medium', uiScale:'100', showVitals:true, showQuest:true, showControls:true, showInventory:true, adminMode:false, moderatorMode:false };
  function normalizeGamePreferences(value = {}) {
    const p = {...DEFAULT_GAME_PREFERENCES, ...(value && typeof value === 'object' ? value : {})};
    if (!['1280x720','1600x900','1920x1080','1280x960','1440x900'].includes(p.resolution)) p.resolution = DEFAULT_GAME_PREFERENCES.resolution;
    if (!['windowed','fullscreen'].includes(p.windowMode)) p.windowMode = DEFAULT_GAME_PREFERENCES.windowMode;
    if (!['low','medium','high'].includes(p.graphicsQuality)) p.graphicsQuality = DEFAULT_GAME_PREFERENCES.graphicsQuality;
    if (!['85','100','115'].includes(String(p.uiScale))) p.uiScale = '100';
    ['showVitals','showQuest','showControls','showInventory'].forEach(k => p[k] = p[k] !== false);
    p.adminMode = p.adminMode === true;
    p.moderatorMode = p.moderatorMode === true;
    return p;
  }
  function savedGamePreferences() {
    try { return normalizeGamePreferences(JSON.parse(localStorage.getItem(GAME_PREFERENCES_KEY) || '{}')); }
    catch (_) { return {...DEFAULT_GAME_PREFERENCES}; }
  }
  function readGamePreferencesFromUI() {
    return normalizeGamePreferences({
      ...savedGamePreferences(),
      resolution: $('#screen-resolution-select')?.value || DEFAULT_GAME_PREFERENCES.resolution,
      windowMode: $('#window-mode-select')?.value || DEFAULT_GAME_PREFERENCES.windowMode,
      graphicsQuality: $('#graphics-quality-select')?.value || DEFAULT_GAME_PREFERENCES.graphicsQuality,
      adminMode: $('#admin-tools-toggle') ? $('#admin-tools-toggle').checked : savedGamePreferences().adminMode,
      moderatorMode: $('#moderator-tools-toggle') ? $('#moderator-tools-toggle').checked : savedGamePreferences().moderatorMode
    });
  }
  async function persistGamePreferences(announce = false) {
    const preferences = readGamePreferencesFromUI();
    localStorage.setItem(GAME_PREFERENCES_KEY, JSON.stringify(preferences));
    try {
      if (window.pywebview?.api?.save_launcher_settings) await window.pywebview.api.save_launcher_settings(preferences);
    } catch (_) { /* browser mode has no native API; local storage remains the source */ }
    if (announce) toast(currentLanguage === 'en' ? 'Game settings saved. They apply next time you launch.' : 'Настройки игры сохранены. Они применятся при следующем запуске.');
  }
  function loadSettings() {
    $('#effects-toggle').checked = localStorage.getItem('skyrealm_effects') !== 'false';
    $('#compact-toggle').checked = localStorage.getItem('skyrealm_compact') === 'true';
    $('#greeting-toggle').checked = localStorage.getItem('skyrealm_greeting') !== 'false';
    const p = savedGamePreferences();
    $('#admin-tools-toggle').checked = p.adminMode === true;
    $('#moderator-tools-toggle').checked = p.moderatorMode === true;
    $('#screen-resolution-select').value = p.resolution;
    $('#window-mode-select').value = p.windowMode;
    $('#graphics-quality-select').value = p.graphicsQuality;
  }
  $('#effects-toggle').addEventListener('change', e => { localStorage.setItem('skyrealm_effects', e.target.checked); document.body.classList.toggle('no-effects', !e.target.checked); toast(currentLanguage === 'en' ? 'Interface effects saved.' : 'Настройка эффектов сохранена.'); });
  $('#compact-toggle').addEventListener('change', e => { localStorage.setItem('skyrealm_compact', e.target.checked); document.body.classList.toggle('compact', e.target.checked); toast(currentLanguage === 'en' ? 'Interface setting saved.' : 'Настройка интерфейса сохранена.'); });
  $('#greeting-toggle').addEventListener('change', e => { localStorage.setItem('skyrealm_greeting', e.target.checked); $('.hero-copy').style.display = e.target.checked ? '' : 'none'; toast(currentLanguage === 'en' ? 'Welcome message setting saved.' : 'Настройка приветствия сохранена.'); });
  ['#screen-resolution-select','#window-mode-select','#graphics-quality-select'].forEach(selector => $(selector).addEventListener('change', () => persistGamePreferences(true)));
  $('#admin-tools-toggle').addEventListener('change', () => persistGamePreferences(true));
  $('#moderator-tools-toggle').addEventListener('change', () => persistGamePreferences(true));
  async function syncPreferencesFromDesktop() {
    try {
      if (!window.pywebview?.api?.get_launcher_settings) return;
      const response = await window.pywebview.api.get_launcher_settings();
      if (!response?.ok || !response.settings) return;
      const preferences = normalizeGamePreferences(response.settings);
      localStorage.setItem(GAME_PREFERENCES_KEY, JSON.stringify(preferences));
      $('#screen-resolution-select').value = preferences.resolution;
      $('#window-mode-select').value = preferences.windowMode;
      $('#graphics-quality-select').value = preferences.graphicsQuality;
      $('#admin-tools-toggle').checked = preferences.adminMode === true;
      $('#moderator-tools-toggle').checked = preferences.moderatorMode === true;
    } catch (_) { /* browser preview intentionally has no native settings API */ }
  }
  window.addEventListener('pywebviewready', syncPreferencesFromDesktop);
  loadSettings();
  document.body.classList.toggle('no-effects', localStorage.getItem('skyrealm_effects') === 'false');
  document.body.classList.toggle('compact', localStorage.getItem('skyrealm_compact') === 'true');
  if (localStorage.getItem('skyrealm_greeting') === 'false') $('.hero-copy').style.display = 'none';
  const STATIC_COPY = {
    ru: {
      '.side-version':'SKYREALM <b>v0.9.1</b> · 2D ПРОТОТИП', '.sidebar-label':'ПРОЕКТ', '.nav-item[data-page="home"] span:nth-child(2)':'Главная', '.nav-item[data-page="news"] span:nth-child(2)':'Новости', '.nav-item[data-page="shop"] span:nth-child(2)':'Магазин', '.nav-item[data-page="community"] span:nth-child(2)':'Сообщество', '.nav-item[data-page="settings"] span:nth-child(2)':'Настройки', '.nav-item[data-page="shop"] .nav-soon':'СКОРО', '.sidebar-help':'<span>?</span> Помощь и ответы', '.sidebar-status small':'Облачная авторизация',
      '#top-create-account':'<span>＋</span> Создать аккаунт', '.home-intro .eyebrow':'<span class="eyebrow-spark">✦</span> ТВОЯ ИСТОРИЯ НАЧИНАЕТСЯ ЗДЕСЬ', '.home-intro h1':'Добро пожаловать в <span>SkyRealm</span>', '.home-intro p':'Создай аккаунт, подтверди почту и подготовься к путешествию по фэнтезийному миру.', '.hero-kicker':'<span class="live-dot"></span> ФЭНТЕЗИ-ПРОЕКТ В РАЗРАБОТКЕ', '.hero-tagline':'ТВОЙ МИР. ТВОИ ПРАВИЛА.', '.hero-copy':'Исследуй загадочные земли, открывай древние тайны и однажды создай собственную историю за горизонтом.', '.feature-row':'<span>✦ Исследование</span><span>⚔ Приключения</span><span>⌁ Развитие</span>', '#play-game':'<span class="play-button-icon">▶</span> Играть <span>→</span>', '#hero-create-account':'Создать аккаунт <span>→</span>', '#hero-login':'Уже есть аккаунт? <b>Войти</b>', '#play-note':'<span class="play-lock">◈</span> Первая версия игры: лёгкая 2D-карта и герой. При первом запуске файлы установятся автоматически.',
      '.auth-panel-top .section-kicker':'АККАУНТ ИГРОКА', '.auth-tab[data-auth="login"]':'Войти', '.auth-tab[data-auth="register"]':'Создать аккаунт', '#email-field > .field-label':'Электронная почта', '.field-hint':'На эту почту придёт код подтверждения.', '.auth-options .check-wrap':'<input type="checkbox" id="remember" checked><span class="check-custom"></span>Оставаться в системе', '#forgot':'Забыли пароль?', '#show-password':'◉', '#show-password|title':'Показать или скрыть пароль', '.verification-view .section-kicker':'ПОСЛЕДНИЙ ШАГ', '.verification-view h3':'Подтверди почту', '.verification-view .field-label':'Код подтверждения', '.verify-submit':'Подтвердить почту <span>→</span>', '#resend-code':'Отправить код повторно', '#back-to-register':'← Назад к регистрации', '.profile-view .section-kicker':'ПРОФИЛЬ SKYREALM', '.verified-badge':'<span>✓</span> Почта подтверждена', '.profile-note':'Твой аккаунт готов к будущим игровым приключениям.', '#logout':'Выйти из аккаунта',
      '#steps-title':'Начни с трёх шагов', '.steps-section .section-heading .section-kicker':'ВСЁ ПРОСТО', '.heading-note':'Профиль создаётся бесплатно', '.step-card:nth-child(1) h3':'Создай аккаунт', '.step-card:nth-child(1) p':'Укажи имя игрока, электронную почту и придумай пароль.', '.step-card:nth-child(1) button':'Создать профиль <span>→</span>', '.step-card:nth-child(2) h3':'Подтверди почту', '.step-card:nth-child(2) p':'Введи одноразовый код из письма, чтобы завершить регистрацию.', '.step-card:nth-child(2) button':'К форме регистрации <span>→</span>', '.step-card:nth-child(3) h3':'Следи за развитием', '.step-card:nth-child(3) p':'Новости и новые возможности появятся по мере создания игры.', '.step-card:nth-child(3) button':'Новости проекта <span>→</span>',
      '.news-panel .section-kicker':'ИЗ МИРА SKYREALM', '.news-panel h2':'Свежие новости', '.news-panel .link-btn':'Все новости <span>↗</span>', '.news-item:nth-of-type(1) .news-meta':'ДНЕВНИК РАЗРАБОТКИ <span>•</span> 01', '.news-item:nth-of-type(1) .news-text b':'Начало большого пути', '.news-item:nth-of-type(1) .news-text>span:last-child':'Лаунчер — первая часть проекта SkyRealm.', '.news-item:nth-of-type(2) .news-meta':'МИР ИГРЫ <span>•</span> 02', '.news-item:nth-of-type(2) .news-text b':'Земли за горизонтом', '.news-item:nth-of-type(2) .news-text>span:last-child':'Леса, древние руины и новые открытия.', '.news-footer':'<span class="live-dot"></span> Новости демонстрационные — новые записи появятся позже.', '.status-panel .section-kicker':'СТАТУС ПРОЕКТА', '.status-panel h2':'Состояние SkyRealm', '.status-panel .sys-row:nth-of-type(3) span:nth-child(2)':'Версия лаунчера', '.status-panel .sys-row:nth-of-type(3) b':'0.6.0', '.status-panel .sys-row:nth-of-type(4) span:nth-child(2)':'Игровая сборка', '.status-panel .sys-row:nth-of-type(4) b':'Прототип 2D', '.outline-link':'Открыть статус сервера <span>↗</span>', '.footer-brand span':'Твоя история начинается здесь', '.footer-link':'Помощь и новости <span>↗</span>',
      '#page-news .page-heading .section-kicker':'ХРОНИКИ МИРА', '#page-news .page-heading h1':'Новости <span>SkyRealm</span>', '#page-news .page-heading p':'Истории, заметки и новости разработки.', '.story-card:nth-child(1) .news-meta':'ДНЕВНИК РАЗРАБОТКИ', '.story-card:nth-child(1) h2':'Начало большого пути', '.story-card:nth-child(1) p':'SkyRealm задуман как атмосферный 2D-мир для исследования, открытий и маленьких историй. Этот лаунчер — первая часть проекта.', '.story-card:nth-child(1) .story-tag':'ДЕМО-ЗАПИСЬ', '.story-card:nth-child(2) .news-meta':'МИР ИГРЫ', '.story-card:nth-child(2) h2':'Земли за горизонтом', '.story-card:nth-child(2) p':'Впереди — таинственные леса, забытые руины и персонажи, чьи истории ещё предстоит открыть.', '.story-card:nth-child(2) .story-tag':'В РАЗРАБОТКЕ', '.faq-section h2':'Частые вопросы', '.faq-section details:nth-of-type(1) summary':'Как создать аккаунт?', '.faq-section details:nth-of-type(1) p':'На главной странице нажми «Создать аккаунт», введи имя игрока, электронную почту и пароль. Затем введи одноразовый код из письма.', '.faq-section details:nth-of-type(2) summary':'Почему нужен код из почты?', '.faq-section details:nth-of-type(2) p':'Код подтверждает, что у тебя есть доступ к указанному адресу. Никому не сообщай этот код.', '.faq-section details:nth-of-type(3) summary':'Как работает кнопка «Играть»?', '.faq-section details:nth-of-type(3) p':'При первом запуске лаунчер подготовит локальные файлы лёгкой 2D-игры и запустит её в отдельном окне.', '.faq-section details:nth-of-type(4) summary':'Не пришло письмо с кодом', '.faq-section details:nth-of-type(4) p':'Проверь папки «Спам» и «Промоакции». Доставка зависит от настроек почтового сервиса и подтверждения отправителя.', '.faq-section .section-kicker':'ПОМОЩЬ', '#page-news .news-register':'Создать аккаунт <span>→</span>',
      '#page-shop .page-heading .section-kicker':'ПОДДЕРЖИ ПРОЕКТ', '#page-shop .page-heading h1':'Магазин <span>приключений</span>', '#page-shop .page-heading p':'В будущем здесь появятся косметические предметы и наборы для игры.', '#page-shop .coming-card .section-kicker':'СКОРО ОТКРЫТИЕ', '#page-shop .coming-card h2':'Что-то особенное уже в пути', '#page-shop .coming-card p':'Магазин пока является макетом. Покупки и платежи не поддерживаются.', '#page-shop .coming-card button':'Вернуться на главную',
      '#page-community .page-heading .section-kicker':'МЫ СОЗДАЁМ ЭТО ВМЕСТЕ', '#page-community .page-heading h1':'Сообщество <span>SkyRealm</span>', '#page-community .page-heading p':'Место для искателей приключений — сообщество откроется позднее.', '.community-card:nth-child(1) h2':'Обсуждения', '.community-card:nth-child(1) p':'Делись идеями и помогай формировать мир.', '.community-card:nth-child(2) h2':'События', '.community-card:nth-child(2) p':'Следи за новостями разработки и будущими событиями.', '.community-card:nth-child(3) h2':'Игроки', '.community-card:nth-child(3) p':'Находи друзей для совместных приключений.', '.community-card .muted-tag':'СКОРО', '#page-community .news-register':'Создать аккаунт <span>→</span>',
      '#page-settings .page-heading .section-kicker':'ПОД ТЕБЯ', '#page-settings .page-heading h1':'Настройки <span>лаунчера</span>', '#page-settings .page-heading p':'Параметры интерфейса сохраняются на этом устройстве.', '#language-title':'Язык лаунчера', '#language-subtitle':'Выбери язык интерфейса. Доступны только два языка.', '#game-display-title':'Настройки игры', '#game-display-subtitle':'Эти параметры применяются к окну игры SkyRealm.', '#resolution-label':'Разрешение экрана', '#resolution-help':'Формат и размер окна при запуске игры.', '#window-mode-label':'Режим окна', '#window-mode-help':'Выбери оконный режим или полный экран.', '#quality-label':'Качество графики', '#quality-help':'Меняет детализацию и нагрузку на компьютер.', '#launcher-interface-title':'Интерфейс лаунчера', '#launcher-interface-subtitle':'Внешний вид самого лаунчера.', '#effects-label':'Эффекты интерфейса', '#effects-help':'Анимации и свечение панелей', '#compact-label':'Компактный интерфейс', '#compact-help':'Уменьшить расстояния между элементами', '#greeting-label':'Показывать приветствие', '#greeting-help':'Сообщение на главной странице', '#admin-tools-heading':'Дополнительные возможности', '#admin-tools-subheading':'Настройка доступности инструментов администратора в игре.', '#admin-tools-label':'Режим администратора', '#admin-tools-help':'Показывать кнопку админ-панели в главном меню игры. Изменение применяется при следующем запуске.', '#moderator-tools-label':'Режим модератора', '#moderator-tools-help':'Включить инструменты модератора в игре. Локальные баны не действуют на сетевых игроков.', '#settings-note':'Настройки игры применяются при следующем запуске. В самой игре их также можно изменить через Esc → Настройки.', '#page-settings .settings-back':'Вернуться на главную <span>→</span>',
      '#install-title':'Готовим твой мир к запуску', '#install-description':'Проверяем установку и готовим файлы игры для первого запуска.', '#install-stage':'Загрузка: проверка файлов…', '#install-detail':'Подготавливаем папку игры', '#install-file-1':'✓ Проверка версии', '#install-file-2':'◌ Установка карты', '#install-file-3':'◌ Подготовка персонажа', '#install-footnote':'Первый запуск устанавливает лёгкий игровой пакет на этот компьютер. Интернет нужен только для аккаунта и будущих обновлений.', '#install-cancel':'Отмена'
    },
    en: {
      '.side-version':'SKYREALM <b>v0.9.1</b> · 2D PROTOTYPE', '.sidebar-label':'PROJECT', '.nav-item[data-page="home"] span:nth-child(2)':'Home', '.nav-item[data-page="news"] span:nth-child(2)':'News', '.nav-item[data-page="shop"] span:nth-child(2)':'Shop', '.nav-item[data-page="community"] span:nth-child(2)':'Community', '.nav-item[data-page="settings"] span:nth-child(2)':'Settings', '.nav-item[data-page="shop"] .nav-soon':'SOON', '.sidebar-help':'<span>?</span> Help & FAQ', '.sidebar-status small':'Cloud authentication',
      '#top-create-account':'<span>＋</span> Create account', '.home-intro .eyebrow':'<span class="eyebrow-spark">✦</span> YOUR STORY STARTS HERE', '.home-intro h1':'Welcome to <span>SkyRealm</span>', '.home-intro p':'Create an account, verify your email, and prepare for a journey through a fantasy world.', '.hero-kicker':'<span class="live-dot"></span> FANTASY PROJECT IN DEVELOPMENT', '.hero-tagline':'YOUR WORLD. YOUR RULES.', '.hero-copy':'Explore mysterious lands, uncover ancient secrets, and one day write your own story beyond the horizon.', '.feature-row':'<span>✦ Exploration</span><span>⚔ Adventure</span><span>⌁ Progression</span>', '#play-game':'<span class="play-button-icon">▶</span> Play <span>→</span>', '#hero-create-account':'Create account <span>→</span>', '#hero-login':'Already have an account? <b>Sign in</b>', '#play-note':'<span class="play-lock">◈</span> First playable build: a lightweight 2D map and hero. Files are installed automatically on first launch.',
      '.auth-panel-top .section-kicker':'PLAYER ACCOUNT', '.auth-tab[data-auth="login"]':'Sign in', '.auth-tab[data-auth="register"]':'Create account', '#email-field > .field-label':'Email address', '.field-hint':'A verification code will be sent to this address.', '.auth-options .check-wrap':'<input type="checkbox" id="remember" checked><span class="check-custom"></span>Keep me signed in', '#forgot':'Forgot password?', '#show-password':'◉', '#show-password|title':'Show or hide password', '.verification-view .section-kicker':'ONE LAST STEP', '.verification-view h3':'Verify your email', '.verification-view .field-label':'Verification code', '.verify-submit':'Verify email <span>→</span>', '#resend-code':'Send a new code', '#back-to-register':'← Back to registration', '.profile-view .section-kicker':'SKYREALM PROFILE', '.verified-badge':'<span>✓</span> Email verified', '.profile-note':'Your account is ready for future adventures.', '#logout':'Sign out',
      '#steps-title':'Start in three steps', '.steps-section .section-heading .section-kicker':'IT’S EASY', '.heading-note':'Profiles are free', '.step-card:nth-child(1) h3':'Create an account', '.step-card:nth-child(1) p':'Choose a player name, enter your email, and create a password.', '.step-card:nth-child(1) button':'Create profile <span>→</span>', '.step-card:nth-child(2) h3':'Verify your email', '.step-card:nth-child(2) p':'Enter the one-time code from your email to finish registration.', '.step-card:nth-child(2) button':'Open registration <span>→</span>', '.step-card:nth-child(3) h3':'Follow development', '.step-card:nth-child(3) p':'News and new features will appear as the game grows.', '.step-card:nth-child(3) button':'Project news <span>→</span>',
      '.news-panel .section-kicker':'FROM THE WORLD OF SKYREALM', '.news-panel h2':'Latest news', '.news-panel .link-btn':'All news <span>↗</span>', '.news-item:nth-of-type(1) .news-meta':'DEVELOPER DIARY <span>•</span> 01', '.news-item:nth-of-type(1) .news-text b':'The beginning of a journey', '.news-item:nth-of-type(1) .news-text>span:last-child':'The launcher is the first part of SkyRealm.', '.news-item:nth-of-type(2) .news-meta':'GAME WORLD <span>•</span> 02', '.news-item:nth-of-type(2) .news-text b':'Lands beyond the horizon', '.news-item:nth-of-type(2) .news-text>span:last-child':'Forests, ancient ruins, and new discoveries.', '.news-footer':'<span class="live-dot"></span> Demo news — more stories will arrive later.', '.status-panel .section-kicker':'PROJECT STATUS', '.status-panel h2':'SkyRealm status', '.status-panel .sys-row:nth-of-type(3) span:nth-child(2)':'Launcher version', '.status-panel .sys-row:nth-of-type(3) b':'0.6.0', '.status-panel .sys-row:nth-of-type(4) span:nth-child(2)':'Game build', '.status-panel .sys-row:nth-of-type(4) b':'2D prototype', '.outline-link':'Open server status <span>↗</span>', '.footer-brand span':'Your story starts here', '.footer-link':'Help & news <span>↗</span>',
      '#page-news .page-heading .section-kicker':'WORLD CHRONICLES', '#page-news .page-heading h1':'SkyRealm <span>News</span>', '#page-news .page-heading p':'Stories, notes, and development updates.', '.story-card:nth-child(1) .news-meta':'DEVELOPER DIARY', '.story-card:nth-child(1) h2':'The beginning of a journey', '.story-card:nth-child(1) p':'SkyRealm is planned as an atmospheric 2D world for exploration, discovery, and little stories. This launcher is the first piece of the project.', '.story-card:nth-child(1) .story-tag':'DEMO ENTRY', '.story-card:nth-child(2) .news-meta':'GAME WORLD', '.story-card:nth-child(2) h2':'Lands beyond the horizon', '.story-card:nth-child(2) p':'Mysterious forests, forgotten ruins, and characters with stories yet to be discovered await.', '.story-card:nth-child(2) .story-tag':'IN DEVELOPMENT', '.faq-section h2':'Frequently asked questions', '.faq-section details:nth-of-type(1) summary':'How do I create an account?', '.faq-section details:nth-of-type(1) p':'Click “Create account” on the home page, enter a player name, email, and password, then enter the one-time code from your email.', '.faq-section details:nth-of-type(2) summary':'Why is an email code required?', '.faq-section details:nth-of-type(2) p':'The code confirms that you can access the email address. Never share this code.', '.faq-section details:nth-of-type(3) summary':'How does Play work?', '.faq-section details:nth-of-type(3) p':'On first launch, the launcher prepares the lightweight local 2D game files and opens the game in a separate window.', '.faq-section details:nth-of-type(4) summary':'I did not receive the code', '.faq-section details:nth-of-type(4) p':'Check Spam and Promotions. Delivery depends on mail-service settings and sender verification.', '.faq-section .section-kicker':'HELP', '#page-news .news-register':'Create account <span>→</span>',
      '#page-shop .page-heading .section-kicker':'SUPPORT THE PROJECT', '#page-shop .page-heading h1':'Adventure <span>Shop</span>', '#page-shop .page-heading p':'Cosmetic items and game packs may appear here in the future.', '#page-shop .coming-card .section-kicker':'COMING SOON', '#page-shop .coming-card h2':'Something special is on the way', '#page-shop .coming-card p':'The shop is currently a mock-up. Purchases and payments are not available.', '#page-shop .coming-card button':'Back to home',
      '#page-community .page-heading .section-kicker':'WE BUILD THIS TOGETHER', '#page-community .page-heading h1':'SkyRealm <span>Community</span>', '#page-community .page-heading p':'A place for adventurers — the community will open later.', '.community-card:nth-child(1) h2':'Discussions', '.community-card:nth-child(1) p':'Share ideas and help shape the world.', '.community-card:nth-child(2) h2':'Events', '.community-card:nth-child(2) p':'Follow development notes and future events.', '.community-card:nth-child(3) h2':'Players', '.community-card:nth-child(3) p':'Find friends for future adventures.', '.community-card .muted-tag':'SOON', '#page-community .news-register':'Create account <span>→</span>',
      '#page-settings .page-heading .section-kicker':'YOUR PREFERENCES', '#page-settings .page-heading h1':'Launcher <span>Settings</span>', '#page-settings .page-heading p':'Interface preferences are saved on this device.', '#language-title':'Launcher language', '#language-subtitle':'Choose the interface language. Only two languages are available.', '#game-display-title':'Game settings', '#game-display-subtitle':'These options apply to the SkyRealm game window.', '#resolution-label':'Screen resolution', '#resolution-help':'Window size and aspect ratio when the game starts.', '#window-mode-label':'Display mode', '#window-mode-help':'Choose windowed or fullscreen mode.', '#quality-label':'Graphics quality', '#quality-help':'Changes visual detail and computer workload.', '#launcher-interface-title':'Launcher interface', '#launcher-interface-subtitle':'Appearance of the launcher itself.', '#effects-label':'Interface effects', '#effects-help':'Panel animations and glow', '#compact-label':'Compact interface', '#compact-help':'Reduce spacing between items', '#greeting-label':'Show welcome message', '#greeting-help':'Message on the home page', '#admin-tools-heading':'Additional options', '#admin-tools-subheading':'Control access to in-game administrator tools.', '#admin-tools-label':'Administrator mode', '#admin-tools-help':'Show the admin panel button in the game main menu. Applies on the next launch.', '#moderator-tools-label':'Moderator mode', '#moderator-tools-help':'Enable moderator tools in the game. Local bans do not affect online players.', '#settings-note':'Game settings apply next launch. You can also change them in-game with Esc → Settings.', '#page-settings .settings-back':'Back to home <span>→</span>',
      '#install-title':'Preparing your world to launch', '#install-description':'Checking installation and preparing game files for the first launch.', '#install-stage':'Loading: checking game files…', '#install-detail':'Preparing the game folder', '#install-file-1':'✓ Version check', '#install-file-2':'◌ Installing map', '#install-file-3':'◌ Preparing character', '#install-footnote':'The first launch installs a lightweight game package on this computer. Internet is only needed for accounts and future updates.', '#install-cancel':'Cancel'
    }
  };
  function applyLanguage(lang, announce = true) {
    const remembered = $('#remember') ? $('#remember').checked : true;
    currentLanguage = lang === 'en' ? 'en' : 'ru';
    localStorage.setItem('skyrealm_language', currentLanguage);
    document.documentElement.lang = currentLanguage;
    pageNames = getPageNames();
    Object.entries(STATIC_COPY[currentLanguage]).forEach(([selector, value]) => {
      if (selector.endsWith('|title')) {
        const el = $(selector.slice(0, -6)); if (el) el.title = value;
        return;
      }
      const el = $(selector);
      if (el) el.innerHTML = value;
    });
    const currentPage = $('.page.active')?.id?.replace('page-', '') || 'home';
    $('#crumb-label').textContent = pageNames[currentPage] || pageNames.home;
    $('#cloud-status-pill').title = currentLanguage === 'en' ? 'Open cloud server health check' : 'Открыть проверку облачного сервера';
    $('#language-select').value = currentLanguage;
    const resolutionOptions = currentLanguage === 'en'
      ? ['1280 × 720 · 16:9','1600 × 900 · 16:9','1920 × 1080 · 16:9','1280 × 960 · 4:3','1440 × 900 · 16:10']
      : ['1280 × 720 · 16:9','1600 × 900 · 16:9','1920 × 1080 · 16:9','1280 × 960 · 4:3','1440 × 900 · 16:10'];
    $('#screen-resolution-select').querySelectorAll('option').forEach((option, i) => { if (resolutionOptions[i]) option.textContent = resolutionOptions[i]; });
    const displayOptions = currentLanguage === 'en' ? ['Windowed','Fullscreen'] : ['Оконный','Полноэкранный'];
    $('#window-mode-select').querySelectorAll('option').forEach((option, i) => { if (displayOptions[i]) option.textContent = displayOptions[i]; });
    const qualityOptions = currentLanguage === 'en' ? ['Low','Medium','High'] : ['Низкое','Среднее','Высокое'];
    $('#graphics-quality-select').querySelectorAll('option').forEach((option, i) => { if (qualityOptions[i]) option.textContent = qualityOptions[i]; });
    if ($('#remember')) $('#remember').checked = remembered;
    if (!$('#profile-view').hidden) {
      $('#auth-title').textContent = t('profileTitle');
      $('#auth-foot').innerHTML = t('profileFoot');
      $('.profile-view .verified-badge').innerHTML = currentLanguage === 'en' ? '<span>✓</span> Email verified' : '<span>✓</span> Почта подтверждена';
      $('.profile-view .profile-note').textContent = currentLanguage === 'en' ? 'Your account is ready for future adventures.' : 'Твой аккаунт готов к будущим игровым приключениям.';
      $('#logout').textContent = t('logout');
    } else if (!$('#verification-view').hidden) {
      $('#auth-title').textContent = t('verificationTitle');
      $('.verification-view .section-kicker').textContent = t('verificationKicker');
      $('.verification-view h3').textContent = t('verificationTitle');
      $('.verification-view .field-label').textContent = t('verifyLabel');
      $('#verification-description').textContent = t('verificationIntro') + (verificationEmail ? (currentLanguage === 'en' ? ' Email: ' : ' Адрес: ') + verificationEmail : '');
      $('.verify-submit').innerHTML = t('verifySubmit');
      $('#resend-code').textContent = t('verifyResend');
      $('#back-to-register').textContent = t('verifyBack');
      $('#auth-foot').innerHTML = t('verifyFoot');
    } else {
      setAuthMode(authMode);
    }
    if (announce) toast(currentLanguage === 'en' ? 'Language saved.' : 'Язык сохранён.');
  }
  $('#language-select').addEventListener('change', e => applyLanguage(e.target.value));
  applyLanguage(currentLanguage, false);

  // Play flow: install the small bundled 2D prototype if missing, then start it in a separate window.
  function setGameProgress(percent, stage, detail) {
    const n = Math.max(0, Math.min(100, Number(percent) || 0));
    const ruStages = {'Проверяем установку…':'Загрузка: проверяем установку…','Подготавливаем файлы…':'Загрузка: подготовка файлов…','Устанавливаем игру…':'Загрузка: установка игры…'};
    const enStages = {'Проверяем установку…':'Loading: checking installation…','Игра уже установлена':'Game already installed','Подготавливаем файлы…':'Loading: preparing files…','Устанавливаем игру…':'Loading: installing game…','Всё готово':'All set','Запускаем SkyRealm…':'Launching SkyRealm…'};
    const enDetails = {'Проверяем версию игры на этом компьютере':'Checking the installed version','Проверяем целостность основных файлов':'Checking required game files','Создаём папку установки SkyRealm':'Creating the SkyRealm install folder','Устанавливаем карту и игровой интерфейс':'Installing map and game interface','Устанавливаем персонажа и управление':'Installing character and controls','Копируем игровые ресурсы':'Copying game resources','Открываем отдельное окно игры':'Opening a separate game window','Лаунчер закроется через мгновение':'The launcher will close shortly'};
    if (currentLanguage === 'en') { stage = enStages[stage] || stage; detail = enDetails[detail] || detail; }
    else { stage = ruStages[stage] || stage; }
    $('#install-progress-fill').style.width = n + '%';
    $('#install-percent').textContent = Math.round(n) + '%';
    if (stage) $('#install-stage').textContent = stage;
    if (detail) $('#install-detail').textContent = detail;
    $('#install-file-1').textContent = n >= 25 ? (currentLanguage === 'en' ? '✓ Version check' : '✓ Проверка версии') : (currentLanguage === 'en' ? '◌ Version check' : '◌ Проверка версии');
    $('#install-file-2').textContent = n >= 65 ? (currentLanguage === 'en' ? '✓ Installing map' : '✓ Установка карты') : (currentLanguage === 'en' ? '◌ Installing map' : '◌ Установка карты');
    $('#install-file-3').textContent = n >= 90 ? (currentLanguage === 'en' ? '✓ Preparing character' : '✓ Подготовка персонажа') : (currentLanguage === 'en' ? '◌ Preparing character' : '◌ Подготовка персонажа');
  }
  window.setGameProgress = setGameProgress;
  function showInstallDialog() {
    $('#install-overlay').hidden = false;
    setGameProgress(2, currentLanguage === 'en' ? 'Loading: checking game files…' : 'Загрузка: проверка файлов…', currentLanguage === 'en' ? 'Searching for an installed game' : 'Ищем установленную игру');
  }
  function hideInstallDialog() { $('#install-overlay').hidden = true; gameLaunchBusy = false; $('#play-game').disabled = false; }
  $('#install-cancel').addEventListener('click', () => {
    if (gameLaunchBusy) { toast(currentLanguage === 'en' ? 'The current install step cannot be interrupted safely.' : 'Текущий этап установки нельзя безопасно прервать.'); return; }
    hideInstallDialog();
  });
  async function launchGame() {
    if (gameLaunchBusy) return;
    gameLaunchBusy = true;
    $('#play-game').disabled = true;
    showInstallDialog();
    $('#install-description').textContent = currentLanguage === 'en' ? 'The launcher checks the installed files and prepares the game if needed.' : 'Лаунчер проверит игровые файлы и установит игру, если её ещё нет.';
    try {
      if (window.pywebview?.api?.launch_game) {
        const result = await window.pywebview.api.launch_game(readGamePreferencesFromUI());
        if (!result || result.ok === false) throw new Error(result?.message || (currentLanguage === 'en' ? 'Could not start the game.' : 'Не удалось запустить игру.'));
        setGameProgress(100, currentLanguage === 'en' ? 'Launching SkyRealm…' : 'Запускаем SkyRealm…', currentLanguage === 'en' ? 'The launcher will close now' : 'Сейчас лаунчер закроется');
        await new Promise(resolve => setTimeout(resolve, 450));
        await window.pywebview.api.close();
      } else {
        // Browser preview: play the same packaged HTML game in a new tab. Installation/auto-close is desktop-only.
        const gameUrlObject = new URL('game/index.html', window.location.href);
        gameUrlObject.searchParams.set('settings', JSON.stringify(readGamePreferencesFromUI()));
        const gameUrl = gameUrlObject.toString();
        setGameProgress(55, currentLanguage === 'en' ? 'Opening browser preview…' : 'Открываем игровое демо…', currentLanguage === 'en' ? 'Desktop installation runs in the EXE build' : 'Установка и закрытие лаунчера работают в EXE');
        await new Promise(resolve => setTimeout(resolve, 650));
        const opened = window.open(gameUrl, '_blank');
        if (!opened) window.location.href = gameUrl;
        setGameProgress(100, currentLanguage === 'en' ? 'Game opened' : 'Игра открыта', currentLanguage === 'en' ? 'Have fun exploring' : 'Удачного исследования');
        setTimeout(hideInstallDialog, 900);
      }
    } catch (error) {
      setGameProgress(0, currentLanguage === 'en' ? 'Could not launch the game' : 'Не удалось запустить игру', error.message || String(error));
      $('#install-description').textContent = currentLanguage === 'en' ? 'Close this window and retry. If the error repeats, send the error text to support.' : 'Закрой окно и попробуй снова. Если ошибка повторится, пришли её текст.';
      $('#install-cancel').textContent = currentLanguage === 'en' ? 'Close' : 'Закрыть';
      gameLaunchBusy = false;
      $('#play-game').disabled = false;
      $('#install-cancel').onclick = hideInstallDialog;
    }
  }
  $('#play-game').addEventListener('click', launchGame);

  // Window controls work only inside the packaged desktop app.
  $('#minimize').addEventListener('click', () => { if (window.pywebview?.api?.minimize) window.pywebview.api.minimize(); else toast('Кнопка сворачивания работает в приложении Windows.'); });
  $('#close').addEventListener('click', () => { if (window.pywebview?.api?.close) window.pywebview.api.close(); else toast('Закрой вкладку браузера, чтобы выйти из демо.'); });
})();
