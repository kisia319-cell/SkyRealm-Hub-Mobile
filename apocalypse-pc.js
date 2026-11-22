(() => {
  'use strict';
  document.body.classList.add('apocalypse-pc-edition');
  const style = document.createElement('style');
  style.textContent = `
    @media (hover:hover) and (pointer:fine) {
      #joy { display:none !important; }
      .control-hint { left:50%; transform:translateX(-50%); width:max-content; max-width:90vw;
        padding:9px 14px; border:1px solid #b9a77c55; border-radius:10px;
        background:#111a14dd; color:#e2d4b0; font-size:12px; letter-spacing:.3px; }
      .bottom { right:24px; bottom:22px; gap:11px; }
      .bottom .btn { min-height:46px; cursor:pointer; }
      .hud { left:22px; top:20px; }
    }
  `;
  document.head.appendChild(style);
  const hint = document.querySelector('.control-hint');
  if (hint) hint.textContent = 'WASD / СТРЕЛКИ — движение  ·  E — действие  ·  I — рюкзак  ·  F11 — полный экран  ·  ESC — меню';
  const save = () => { try { window.ApocalypseGame?.save?.(); } catch (_) {} };
  window.addEventListener('beforeunload', save);
  window.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || event.repeat) return;
    const menu = document.getElementById('mainMenu');
    if (menu && menu.classList.contains('menu-out')) {
      event.preventDefault();
      document.getElementById('pauseMenu')?.click();
    }
  }, true);
  const exit = document.getElementById('exit');
  if (exit) exit.addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    save();
    const close = () => {
      if (window.pywebview?.api?.close_app) window.pywebview.api.close_app();
      else window.setTimeout(close, 100);
    };
    close();
  }, true);
})();