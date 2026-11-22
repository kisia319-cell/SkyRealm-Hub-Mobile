'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = process.cwd();
const html = fs.readFileSync(path.join(root, 'app/src/main/assets/apocalypse.html'), 'utf8');
const game = fs.readFileSync(path.join(root, 'app/src/main/assets/apocalypse.js'), 'utf8');
const coop = fs.readFileSync(path.join(root, 'app/src/main/assets/apocalypse-coop.js'), 'utf8');
const pc = fs.readFileSync(path.join(root, 'apocalypse_pc.py'), 'utf8');

new vm.Script(game, { filename: 'apocalypse.js' });
new vm.Script(coop, { filename: 'apocalypse-coop.js' });

const expectedMove = [
"function move(dt){",
"  let dx=moveX,dy=moveY;",
"  if(keys.has('ArrowUp')||keys.has('w'))dy-=1;",
"  if(keys.has('ArrowDown')||keys.has('s'))dy+=1;",
"  if(keys.has('ArrowLeft')||keys.has('a'))dx-=1;",
"  if(keys.has('ArrowRight')||keys.has('d'))dx+=1;",
"  let len=Math.hypot(dx,dy);",
"  if(len>.08){dx/=Math.max(1,len);dy/=Math.max(1,len);const speed=160*(wind>=.65?.82:wind>=.3?.94:1);const nx=state.x+dx*speed*dt,ny=state.y+dy*speed*dt;if(!blocked(nx,state.y))state.x=nx;if(!blocked(state.x,ny))state.y=ny;}",
"}"
].join('\n');
assert.equal(game.match(/function move\(dt\)\{[\s\S]*?\n\}/)?.[0], expectedMove, 'Player movement code must remain unchanged');
assert.ok(game.includes('runUpgrade:whole(saved.runUpgrade,0,0,3)') && game.includes('ammoUpgrade:whole(saved.ammoUpgrade,0,0,3)'), 'Both permanent upgrades must be capped at level 3');
assert.ok(game.includes('function maxStamina(){return 100+state.runUpgrade*15;}') && game.includes('state.stamina-34*dt') && game.includes('state.stamina+(moving?17:27)*dt'), 'Sprint must drain stamina and recover it during normal movement/rest');
assert.ok(game.includes('move(sprintActive?dt*(1.5+state.runUpgrade*.12):dt)'), 'Sprint speed must be applied outside the protected movement function');
assert.ok(game.includes('if(state.stamina<=0)sprintLocked=true') && game.includes('sprintLocked&&!sprintHeld&&state.stamina>=25'), 'Sprint exhaustion must require recovery before sprint can be enabled again');
assert.ok(game.includes('const roads=[-8000,-4500,-1000,600,4100,7600,10000,13500,17000,20500]') && game.includes('for(const b of buildings)'), 'Player map must show roads and nearby buildings');
assert.ok(game.includes('function purchaseUpgrade(kind){') && game.includes('function openUpgradeBench(){') && game.includes('function openTrader(){'), 'Survivor camp must offer upgrade and trade panels');
assert.ok(game.includes('function tradeSupplies(kind){') && game.includes("bandage:{cost:{scrap:4,bolts:1}") && game.includes("ammo:{cost:{scrap:5,bolts:1}"), 'Trader exchanges must charge resources before granting supplies');
assert.ok(game.includes('function drawPlayerMap(){') && game.includes("m.fillStyle='#39a7ff'") && game.includes("m.fillStyle='#f4f5f2'") && game.includes('getPlayers?.()'), 'Map must show the local player blue and co-op players white');
assert.ok(game.includes("sprintButton.addEventListener('pointerdown'") && game.includes("e.code==='ShiftLeft'||e.code==='ShiftRight'"), 'Sprint must support hold controls on mobile and Shift on desktop');
assert.ok(html.includes('id="playerMapOverlay"') && html.includes('id="staminaFill"') && html.includes('id="sprintButton"') && html.includes('id="mapButton"'), 'New HUD controls and map overlay must exist');


const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
for (const [label, source] of [['game', game], ['coop', coop]]) {
  const refs = [...source.matchAll(/(?:document\.getElementById|\$)\(['"]([^'"]+)['"]\)/g)].map(m => m[1]);
  const missing = [...new Set(refs.filter(id => !ids.has(id) && id !== 'copyInvite'))];
  assert.deepEqual(missing, [], label + ' references missing HTML ids');
}
for (const asset of ['apocalypse-changelog.js', 'apocalypse-coop.js', 'apocalypse.js']) {
  assert.ok(fs.existsSync(path.join(root, 'app/src/main/assets', asset)), 'Missing asset: ' + asset);
}

assert.ok(game.includes("role:'store'") && game.includes("role:'shelter'"), 'New store and shelter districts must be present');
assert.ok(game.includes("Math.random()<.5") && game.includes("state.firearm") && game.includes("storeLoot"), 'Store firearm chance, pickup and persistence must be implemented');
assert.ok(game.includes("drawBuildingInterior") && game.includes("visitedStores"), 'Buildings must have explorable interiors and saved visits');
assert.ok(game.includes('function ground(){') && game.includes('const left=Math.floor((state.x-w/2-700)/46)*46,top=Math.floor((state.y-h/2-700)/46)*46;'), 'Textured ground tiles must be positioned relative to the camera');
assert.ok(game.includes('function findSafeSpawn(') && game.includes('findSafeSpawn(state.x+150,state.y+110)'), 'Respawn must find a collision-free position');
assert.ok(!/Math\.min\(9900,state\.[xy]\+/.test(game), 'Old 9,900 map clamp must not remain');
assert.ok(game.includes('function enterSolo(){gameActive=false'), 'Intro dialogue must pause simulation');
assert.ok(game.includes('function openMobileQuickMenu(){const menu=document.getElementById(\'mobileQuickMenu\');if(!menu)return;mobileQuickMenuResume=gameActive;gameActive=false;'), 'Mobile quick actions must pause gameplay');
assert.ok(game.includes('function closeMobileQuickMenu(resume=true){'), 'Closing quick menu must restore its previous running state');
assert.ok(game.includes('function openSettings(resumeGame=gameActive){') && game.includes('function closeSettings(){'), 'Settings overlay must preserve and restore previous game state');
assert.ok(game.includes('if(!gameActive){') && game.includes("if(k==='Escape'){") && game.includes('closeMobileQuickMenu();') && game.includes('closeSettings();'), 'Escape must close paused overlays without accepting background movement');
assert.ok(game.includes("effects:['low','high'].includes(raw.effects)"), 'Settings quality must match the available select options');
assert.ok(game.includes('function leaveToMenu(){save();gameActive=false;deathHandled=false;'), 'Returning to menu must allow the saved death screen to reopen');
assert.ok(game.includes('name:playerName,'), 'Frame loop must not parse untrusted username JSON every tick');
assert.ok(game.includes('function save(){try{localStorage.setItem('), 'Save failures must not crash gameplay');
assert.ok(game.includes('if(now-lastAutoSave>=5000)') && game.includes('worldClock,flashlight:!!saved.flashlight'), 'Position and day/night state must autosave');
assert.ok(game.includes('worldClock=savedWorldClock'), 'Day/night phase must survive reloads');
assert.ok(game.includes('if(worldClock<previousClock)advanceGameDay()') && game.includes('function daily(){dayWind()}'), 'Displayed day and daily quests must follow the actual game clock');
assert.ok(game.includes('const savedWrecks=Array.isArray(saved.wrecks)?saved.wrecks:[]'), 'Malformed wreck save data must be ignored');
assert.ok(game.includes('nearbyBuildings='), 'Zombie spawns must use nearby buildings only');
assert.ok(game.includes('radioSignal&&Math.abs'), 'Radio-event props must have collision bounds');
assert.equal((game.match(/\{x:-?\d+,y:-?\d+,done:false\}/g)||[]).length, 32, 'Expanded map should contain 32 scavenging sites');
assert.ok(coop.includes('grant_type=refresh_token') && coop.includes('skyrealm_apocalypse_refresh'), 'Co-op must refresh expired sessions');
assert.ok(game.includes('if(!coop?.room||coop.isOwner())') && game.includes('getClock:()=>worldClock'), 'Co-op day/night clock must be owner-authoritative');
assert.equal((coop.match(/getClock/g)||[]).length, 2, 'Initial co-op world sync and world requests must include the clock');
assert.ok(coop.includes('Сервер кооператива не ответил за 12 секунд.'), 'Co-op API calls must have a timeout');
assert.ok(pc.includes('ThreadingHTTPServer(("127.0.0.1", 0), handler)') && pc.includes('{port}/apocalypse.html'), 'Windows launcher must use a free loopback port');

function fakeClassList() {
  const set = new Set();
  return {
    add: (...items) => items.forEach(x => set.add(x)),
    remove: (...items) => items.forEach(x => set.delete(x)),
    contains: x => set.has(x),
    toggle: (x, force) => {
      const add = force === undefined ? !set.has(x) : !!force;
      if (add) set.add(x); else set.delete(x);
      return add;
    }
  };
}
function makeHarness(seed = {}, failWrites = false) {
  const store = new Map(Object.entries(seed));
  const elements = new Map();
  const listeners = new Map();
  let nextFrame = null;
  let writesFail = failWrites;
  const gradient = { addColorStop() {} };
  const ctx2d = new Proxy({
    createPattern() { return {}; },
    createRadialGradient() { return gradient; },
    setTransform() {}
  }, {
    get(target, key) {
      if (key in target) return target[key];
      return () => {};
    },
    set(target, key, value) { target[key] = value; return true; }
  });
  function element(id = '') {
    const handlers = {};
    return {
      id, style: {}, dataset: {}, classList: fakeClassList(), hidden: false,
      value: id === 'settingEffects' ? 'high' : id === 'settingJoy' ? '100' : '',
      checked: true, textContent: '', innerHTML: '', className: '', disabled: false,
      addEventListener(type, fn) { (handlers[type] ||= []).push(fn); },
      removeEventListener() {},
      dispatch(type, event = {}) { for (const fn of handlers[type] || []) fn({ preventDefault() {}, ...event, target: this, pointerId: 1 }); },
      click() { if (typeof this.onclick === 'function') this.onclick(); this.dispatch('click'); },
      append() {}, appendChild() {}, replaceChildren() {}, focus() {},
      setPointerCapture() {}, getAttribute() { return null; }, querySelectorAll() { return []; },
      getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; },
      getContext() { return ctx2d; }
    };
  }
  const document = {
    body: element('body'), documentElement: element('html'),
    getElementById(id) { if (!elements.has(id)) elements.set(id, element(id)); return elements.get(id); },
    createElement(tag) { return element(tag); },
    addEventListener(type, fn) { const key = 'document:' + type; if (!listeners.has(key)) listeners.set(key, []); listeners.get(key).push(fn); },
    querySelectorAll() { return []; }
  };
  const canvas = document.getElementById('world');
  canvas.getContext = () => ctx2d;
  const localStorage = {
    getItem(key) { return store.has(key) ? store.get(key) : null; },
    setItem(key, value) { if (writesFail) throw new Error('quota'); store.set(key, String(value)); },
    removeItem(key) { store.delete(key); }
  };
  const window = {
    addEventListener(type, fn) { const key = 'window:' + type; if (!listeners.has(key)) listeners.set(key, []); listeners.get(key).push(fn); },
    dispatchEvent() { return true; },
    devicePixelRatio: 1,
    matchMedia() { return { matches: true, addEventListener() {}, removeEventListener() {} }; }
  };
  const sandbox = {
    window, document, localStorage, console, Math, Date, JSON, Number, String, Object, Array, Set, Map,
    performance: { now: () => 1000 },
    requestAnimationFrame(fn) { nextFrame = fn; return 1; },
    setTimeout() { return 1; }, clearTimeout() {}, setInterval() { return 1; }, clearInterval() {},
    devicePixelRatio: 1, innerWidth: 1280, innerHeight: 720,
    history: { length: 1, back() {} }, location: { href: '' },
    confirm: () => false, Event: class Event { constructor(type) { this.type = type; } },
    CustomEvent: class CustomEvent { constructor(type, init) { this.type = type; this.detail = init?.detail; } }
  };
  window.window = window;
  return {
    sandbox, store, elements, localStorage,
    runFrame(now = 1016) { assert.equal(typeof nextFrame, 'function', 'animation frame should be scheduled'); const fn = nextFrame; nextFrame = null; fn(now); },
    setWritesFail(value) { writesFail = value; },
    dispatchWindow(type, event = {}) { for (const fn of listeners.get('window:' + type) || []) fn({ preventDefault() {}, stopPropagation() {}, code: event.code || '', key: event.key || '', repeat: !!event.repeat, target: event.target || canvas }); }
  };
}

const harness = makeHarness({
  skyrealm_apocalypse_mobile_v1: JSON.stringify({ x: 999999, y: -500, hp: null, scrap: -5, day: 0, quest: 99, wrecks: ['yes'], worldClock: 99 }),
  skyrealm_character_v1: 'null',
  skyrealm_hub_user: '{broken-json'
});
vm.runInNewContext(game, harness.sandbox, { filename: 'apocalypse.js' });
const saved = JSON.parse(harness.store.get('skyrealm_apocalypse_mobile_v1'));
assert.ok(saved.x >= -11963 && saved.x <= 23963 && saved.y >= -11963 && saved.y <= 23963, 'invalid saved coordinates must be clamped to the expanded map');
assert.equal(saved.hp, 100, 'invalid saved health must be normalized');
assert.equal(saved.scrap, 0, 'negative inventory values must be normalized');
assert.equal(saved.day, 1, 'invalid day counter must be normalized');
assert.equal(saved.quest, 3, 'quest progress must be bounded');
assert.equal(saved.wrecks[0], false, 'malformed wreck flags must not mark scavenging complete');
assert.ok(saved.worldClock >= 0 && saved.worldClock < 1, 'saved day/night phase must be normalized');
harness.runFrame();
harness.elements.get('menuPlay').click();
harness.elements.get('start').click();
harness.elements.get('journalOk').click();
harness.runFrame(1032);
const sprintBefore = harness.sandbox.window.ApocalypseGame.getMovementStats();
harness.dispatchWindow('keydown',{code:'ShiftLeft',key:'Shift'});
harness.dispatchWindow('keydown',{code:'KeyW',key:'w'});
harness.runFrame(1048);
const sprintDuring = harness.sandbox.window.ApocalypseGame.getMovementStats();
assert.ok(sprintDuring.stamina < sprintBefore.stamina && sprintDuring.sprinting, 'Holding Shift while moving must consume stamina and activate sprint');
harness.dispatchWindow('keyup',{code:'ShiftLeft',key:'Shift'});
harness.dispatchWindow('keyup',{code:'KeyW',key:'w'});
harness.runFrame(1064);
assert.ok(harness.sandbox.window.ApocalypseGame.getMovementStats().stamina >= sprintDuring.stamina, 'Stamina must recover after sprint ends');
harness.elements.get('sprintButton').dispatch('pointerdown');
harness.dispatchWindow('keydown',{code:'KeyW',key:'w'});
harness.runFrame(1080);
const mobileSprint = harness.sandbox.window.ApocalypseGame.getMovementStats();
assert.ok(mobileSprint.sprinting && mobileSprint.stamina < sprintDuring.stamina+1, 'Holding the mobile sprint button while moving must consume stamina');
harness.elements.get('sprintButton').dispatch('pointerup');
harness.dispatchWindow('keyup',{code:'KeyW',key:'w'});
harness.runFrame(1096);
assert.ok(!harness.sandbox.window.ApocalypseGame.getMovementStats().sprinting, 'Releasing the mobile sprint button must stop sprinting');
harness.runFrame(7000);
assert.equal(typeof JSON.parse(harness.store.get('skyrealm_apocalypse_mobile_v1')).worldClock, 'number', 'autosave must persist day/night phase');
const beforeQuickMenu = harness.sandbox.window.ApocalypseGame.getClock();
harness.elements.get('pauseMenu').click();
harness.runFrame(7016);
assert.equal(harness.sandbox.window.ApocalypseGame.getClock(), beforeQuickMenu, 'opening mobile quick menu must pause the world clock');
harness.elements.get('mobileMoreClose').click();
harness.runFrame(7032);
assert.notEqual(harness.sandbox.window.ApocalypseGame.getClock(), beforeQuickMenu, 'closing mobile quick menu must resume the world clock');
const beforeSettings = harness.sandbox.window.ApocalypseGame.getClock();
harness.elements.get('pauseMenu').click();
harness.elements.get('mobileMoreSettings').click();
harness.runFrame(7048);
assert.equal(harness.sandbox.window.ApocalypseGame.getClock(), beforeSettings, 'opening settings from the mobile menu must keep the world paused');
harness.setWritesFail(true);
assert.equal(harness.sandbox.window.ApocalypseGame.save(), false, 'storage quota failure should be reported without throwing');
assert.doesNotThrow(() => harness.elements.get('settingsSave').click(), 'settings storage failure must not crash the UI');
harness.runFrame(7064);
assert.notEqual(harness.sandbox.window.ApocalypseGame.getClock(), beforeSettings, 'closing settings must resume the previously running game');
const beforeMap = harness.sandbox.window.ApocalypseGame.getClock();
harness.elements.get('mapButton').click();
harness.runFrame(7080);
assert.equal(harness.sandbox.window.ApocalypseGame.getClock(), beforeMap, 'opening the player map must pause gameplay');
harness.elements.get('mapClose').click();
harness.runFrame(7096);
assert.notEqual(harness.sandbox.window.ApocalypseGame.getClock(), beforeMap, 'closing the player map must resume gameplay');

const storageFailure = makeHarness({}, true);
assert.doesNotThrow(() => vm.runInNewContext(game, storageFailure.sandbox, { filename: 'apocalypse.js' }), 'game must still boot if local storage is unavailable');
storageFailure.runFrame();

console.log('Apocalypse deep-audit tests passed: JS runtime boot/frame, corrupt saves, storage failure, HTML IDs/assets, map ground, safe respawn, co-op token refresh, PC port, and unchanged movement.');
