(() => {
  'use strict';
  const API_BASE = String(window.SKYREALM_CONFIG?.apiBaseUrl || '').replace(/\/+$/, '');
  const API_KEY = String(window.SKYREALM_CONFIG?.supabaseAnonKey || '');
  const $ = id => document.getElementById(id);
  const state = {
    mode: 'login', email: '', user: null,
    accessToken: localStorage.getItem('skyrealm_hub_access') || '',
    refreshToken: localStorage.getItem('skyrealm_hub_refresh') || '',
    expiresAt: Number(localStorage.getItem('skyrealm_hub_expires') || 0)
  };
  function message(id, value, success) {
    const el = $(id); if (!el) return;
    el.textContent = value || ''; el.classList.toggle('success', !!success);
  }
  function busy(button, value, label) {
    if (value) { button.dataset.oldText = button.textContent; button.textContent = label; button.disabled = true; }
    else { button.textContent = button.dataset.oldText || button.textContent; button.disabled = false; }
  }
  function updateGuest() {
    $('account-name').textContent = state.user?.username || 'Гость';
    $('account-status').textContent = state.user ? 'Аккаунт подтверждён · ' + (state.user.email || '') : 'Нажми, чтобы войти или создать аккаунт';
  }
  function open() {
    $('account-overlay').classList.add('open');
    $('account-overlay').setAttribute('aria-hidden', 'false');
    if (state.user) showProfile(state.user); else setMode(state.mode);
  }
  function close() { $('account-overlay').classList.remove('open'); $('account-overlay').setAttribute('aria-hidden', 'true'); }
  function setMode(mode) {
    state.mode = mode;
    $('account-title').textContent = mode === 'register' ? 'Создать аккаунт' : 'Войти в аккаунт';
    $('account-copy').textContent = mode === 'register' ? 'Придумай имя игрока, укажи почту и задай пароль. После этого подтверди адрес кодом из письма.' : 'Войди по имени игрока или электронной почте.';
    $('account-tab-login').classList.toggle('active', mode === 'login');
    $('account-tab-register').classList.toggle('active', mode === 'register');
    $('account-email-wrap').hidden = mode !== 'register';
    $('account-email').required = mode === 'register';
    $('account-identifier').placeholder = mode === 'register' ? 'Имя (3–20 символов)' : 'Имя игрока или почта';
    $('account-identifier').maxLength = mode === 'register' ? 20 : 254;
    $('account-password').autocomplete = mode === 'register' ? 'new-password' : 'current-password';
    $('account-submit').textContent = mode === 'register' ? 'Создать аккаунт' : 'Войти';
    $('account-auth-view').hidden = false; $('account-verify-view').hidden = true; $('account-profile-view').hidden = true;
    message('account-message', '');
  }
  async function request(route, options = {}) {
    if (!API_BASE || !API_KEY) throw new Error('Сервис аккаунтов не настроен.');
    const url = new URL(API_BASE); url.searchParams.set('route', route);
    const body = options.body || null;
    let response;
    try {
      response = await fetch(url.toString(), {
        method: options.method || 'GET',
        headers: {apikey: API_KEY, Authorization: 'Bearer ' + (options.token || state.accessToken || API_KEY), ...(body ? {'Content-Type': 'application/json'} : {})},
        body: body ? JSON.stringify(body) : undefined, cache: 'no-store'
      });
    } catch (_) { throw new Error('Не удалось подключиться к серверу. Проверь интернет.'); }
    let data = {}; try { data = await response.json(); } catch (_) {}
    if (!response.ok) {
      const detail = data.detail;
      throw new Error((detail && typeof detail === 'object' && detail.message) || data.message || 'Ошибка сервера (' + response.status + ').');
    }
    return data;
  }
  function saveSession(data) {
    state.accessToken = data.access_token || ''; state.refreshToken = data.refresh_token || '';
    state.expiresAt = Date.now() + Math.max(60, Number(data.expires_in) || 3600) * 1000;
    state.user = data.user || null;
    localStorage.setItem('skyrealm_hub_access', state.accessToken);
    localStorage.setItem('skyrealm_hub_refresh', state.refreshToken);
    localStorage.setItem('skyrealm_hub_expires', String(state.expiresAt));
    if (state.user) localStorage.setItem('skyrealm_hub_user', JSON.stringify(state.user));
    updateGuest();
  }
  function clearSession() {
    state.accessToken = ''; state.refreshToken = ''; state.expiresAt = 0; state.user = null;
    ['skyrealm_hub_access','skyrealm_hub_refresh','skyrealm_hub_expires','skyrealm_hub_user'].forEach(k => localStorage.removeItem(k));
    updateGuest();
  }
  function showProfile(user) {
    state.user = user || state.user;
    $('account-auth-view').hidden = true; $('account-verify-view').hidden = true; $('account-profile-view').hidden = false;
    $('account-title').textContent = 'Твой профиль'; $('account-copy').textContent = 'Ты вошёл в аккаунт SkyRealm.';
    $('account-profile-name').textContent = state.user?.username || 'Игрок';
    $('account-profile-email').textContent = state.user?.email || ''; updateGuest();
  }
  function showVerify(email, text) {
    state.email = (email || '').trim().toLowerCase();
    $('account-auth-view').hidden = true; $('account-profile-view').hidden = true; $('account-verify-view').hidden = false;
    $('account-title').textContent = 'Подтверди почту';
    $('account-copy').textContent = text || ('Код отправлен на ' + state.email + '. Проверь входящие и папку «Спам».');
    $('account-code').value = ''; message('account-verify-message', '');
  }
  async function submit(event) {
    event.preventDefault();
    const identifier = $('account-identifier').value.trim();
    const email = $('account-email').value.trim().toLowerCase();
    const password = $('account-password').value; const button = $('account-submit');
    message('account-message', '');
    if (state.mode === 'register' && !/^[A-Za-zА-Яа-яЁё0-9_]{3,20}$/.test(identifier)) { message('account-message', 'Имя игрока: 3–20 букв, цифр или знаков подчёркивания.'); return; }
    if (state.mode === 'register' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { message('account-message', 'Укажи корректную электронную почту.'); return; }
    if (password.length < 8 || password.length > 128) { message('account-message', 'Пароль должен содержать от 8 до 128 символов.'); return; }
    busy(button, true, 'Подключение…');
    try {
      if (state.mode === 'register') {
        const result = await request('/api/auth/register', {method: 'POST', body: {username: identifier, email, password}});
        showVerify(result.email || email, result.message || 'Код подтверждения отправлен на почту.');
      } else {
        const result = await request('/api/auth/login', {method: 'POST', body: {identifier, password}});
        saveSession(result); showProfile(result.user); message('account-profile-message', 'Вход выполнен.', true);
      }
    } catch (error) { message('account-message', error.message || 'Не удалось выполнить запрос.'); }
    finally { busy(button, false); }
  }
  async function verify() {
    const code = $('account-code').value.replace(/\D/g, ''); const button = $('account-verify');
    if (!/^\d{6,10}$/.test(code)) { message('account-verify-message', 'Введи полный код из письма (6–10 цифр).'); return; }
    busy(button, true, 'Проверка…');
    try {
      const result = await request('/api/auth/verify', {method: 'POST', body: {email: state.email, code}});
      saveSession(result); showProfile(result.user); message('account-profile-message', 'Почта подтверждена. Аккаунт создан!', true);
    } catch (error) { message('account-verify-message', error.message || 'Код не принят.'); }
    finally { busy(button, false); }
  }
  async function resend() {
    const button = $('account-resend'); busy(button, true, 'Отправка…');
    try {
      const result = await request('/api/auth/resend', {method: 'POST', body: {email: state.email}});
      message('account-verify-message', result.message || 'Если аккаунт ожидает подтверждения, код отправлен.', true);
    } catch (error) { message('account-verify-message', error.message || 'Не удалось отправить код.'); }
    finally { busy(button, false); }
  }
  async function logout() {
    try { if (state.accessToken) await request('/api/auth/logout', {method: 'POST'}); } catch (_) {}
    clearSession(); setMode('login'); message('account-message', 'Ты вышел из аккаунта.', true);
  }
  async function restore() {
    let saved = null; try { saved = JSON.parse(localStorage.getItem('skyrealm_hub_user') || 'null'); } catch (_) {}
    if (saved) { state.user = saved; updateGuest(); }
    if (!state.refreshToken && !state.accessToken) return;
    try {
      if (state.refreshToken && state.expiresAt < Date.now() + 30000) {
        const result = await request('/api/auth/refresh', {method: 'POST', body: {refresh_token: state.refreshToken}, token: API_KEY});
        saveSession(result);
      } else {
        const result = await request('/api/auth/me'); state.user = result.user;
        localStorage.setItem('skyrealm_hub_user', JSON.stringify(result.user)); updateGuest();
      }
    } catch (_) { clearSession(); }
  }
  $('account-open').addEventListener('click', open);
  $('account-nav').addEventListener('click', open);
  $('account-close').addEventListener('click', close);
  $('account-overlay').addEventListener('click', event => { if (event.target === $('account-overlay')) close(); });
  $('account-tab-login').addEventListener('click', () => setMode('login'));
  $('account-tab-register').addEventListener('click', () => setMode('register'));
  $('account-form').addEventListener('submit', submit);
  $('account-verify').addEventListener('click', verify);
  $('account-resend').addEventListener('click', resend);
  $('account-back').addEventListener('click', () => setMode('register'));
  $('account-logout').addEventListener('click', logout);
  restore();
})();