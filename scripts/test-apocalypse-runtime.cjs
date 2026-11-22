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

const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
for (const [label, source] of [['game', game], ['coop', coop]]) {
  const refs = [...source.matchAll(/(?:document\.getElementById|\$)\(['"]([^'"]+)['"]\)/g)].map(m => m[1]);
  const missing = [...new Set(refs.filter(id => !ids.has(id) && id !== 'copyInvite'))];
  assert.deepEqual(missing, [], label + ' references missing HTML ids');
}
for (const asset of ['apocalypse-changelog.js', 'apocalypse-coop.js', 'apocalypse.js']) {
  assert.ok(fs.existsSync(path.join(root, 'app/src/main/assets', asset)), 'Missing asset: ' + asset);
}

assert.ok(game.includes('const groundX=state.x-w/2-80,groundY=state.y-h/2-80'), 'Ground texture must follow the camera across the expanded map');
assert.ok(game.includes('function findSafeSpawn(') && game.includes('findSafeSpawn(state.x+150,state.y+110)'), 'Respawn must find a collision-free position');
assert.ok(!/Math\.min\(9900,state\.[xy]\+/.test(game), 'Old 9,900 map clamp must not remain');
assert.ok(game.includes('function enterSolo(){gameActive=false'), 'Intro dialogue must pause simulation');
assert.ok(game.includes('name:playerName,'), 'Frame loop must not parse untrusted username JSON every tick');
assert.ok(game.includes('function save(){try{localStorage.setItem('), 'Save failures must not crash gameplay');
assert.ok(game.includes('if(now-lastAutoSave>=5000)') && game.includes('worldClock}'), 'Position and day/night state must autosave');
assert.ok(game.includes('worldClock=savedWorldClock'), 'Day/night phase must survive reloads');
assert.ok(game.includes('const savedWrecks=Array.isArray(saved.wrecks)?saved.wrecks:[]'), 'Malformed wreck save data must be ignored');
assert.ok(game.includes('nearbyBuildings='), 'Zombie spawns must use nearby buildings only');
assert.ok(game.includes('radioSignal&&Math.abs'), 'Radio-event props must have collision bounds');
assert.equal((game.match(/\{x:\d+,y:\d+,done:false\}/g)||[]).length, 31, 'Expanded map should contain 31 scavenging sites');
assert.ok(coop.includes('grant_type=refresh_token') && coop.includes('skyrealm_apocalypse_refresh'), 'Co-op must refresh expired sessions');
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
    devicePixelRatio: 1
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
    setWritesFail(value) { writesFail = value; }
  };
}

const harness = makeHarness({
  skyrealm_apocalypse_mobile_v1: JSON.stringify({ x: 999999, y: -500, hp: 'bad', scrap: -5, day: 0, quest: 99, wrecks: [] }),
  skyrealm_character_v1: 'null',
  skyrealm_hub_user: '{broken-json'
});
vm.runInNewContext(game, harness.sandbox, { filename: 'apocalypse.js' });
const saved = JSON.parse(harness.store.get('skyrealm_apocalypse_mobile_v1'));
assert.ok(saved.x >= 37 && saved.x <= 11963 && saved.y >= 37 && saved.y <= 11963, 'invalid saved coordinates must be clamped');
assert.equal(saved.hp, 100, 'invalid saved health must be normalized');
assert.equal(saved.scrap, 0, 'negative inventory values must be normalized');
assert.equal(saved.day, 1, 'invalid day counter must be normalized');
assert.equal(saved.quest, 3, 'quest progress must be bounded');
harness.runFrame();
harness.elements.get('menuPlay').click();
harness.elements.get('start').click();
harness.runFrame(1032);
harness.runFrame(7000);
assert.equal(typeof JSON.parse(harness.store.get('skyrealm_apocalypse_mobile_v1')).worldClock, 'number', 'autosave must persist day/night phase');
harness.setWritesFail(true);
assert.equal(harness.sandbox.window.ApocalypseGame.save(), false, 'storage quota failure should be reported without throwing');
assert.doesNotThrow(() => harness.elements.get('settingsSave').click(), 'settings storage failure must not crash the UI');

const storageFailure = makeHarness({}, true);
assert.doesNotThrow(() => vm.runInNewContext(game, storageFailure.sandbox, { filename: 'apocalypse.js' }), 'game must still boot if local storage is unavailable');
storageFailure.runFrame();

console.log('Apocalypse deep-audit tests passed: JS runtime boot/frame, corrupt saves, storage failure, HTML IDs/assets, map ground, safe respawn, co-op token refresh, PC port, and unchanged movement.');
