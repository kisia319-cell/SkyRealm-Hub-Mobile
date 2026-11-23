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
assert.ok(game.includes('move((sprintActive?dt*(1.5+state.runUpgrade*.12):dt)*(energyBoostUntil>now?1.22:1))'), 'Sprint and energy boost speed must be applied outside the protected movement function');
assert.ok(game.includes('if(state.stamina<=0)sprintLocked=true') && game.includes('sprintLocked&&!sprintHeld&&state.stamina>=25'), 'Sprint exhaustion must require recovery before sprint can be enabled again');
assert.ok(game.includes('const roads=[-8000,-4500,-1000,600,4100,7600,10000,13500,17000,20500]') && game.includes('for(const b of buildings)'), 'Player map must show roads and nearby buildings');
assert.ok(game.includes('function purchaseUpgrade(kind){') && game.includes('function openUpgradeBench(){') && game.includes('function openTrader(){'), 'Survivor camp must offer upgrade and trade panels');
assert.ok(game.includes('function tradeSupplies(kind){') && game.includes("bandage:{cost:{scrap:4,bolts:1}") && game.includes("ammo:{cost:{scrap:5,bolts:1}"), 'Trader exchanges must charge resources before granting supplies');
assert.ok(game.includes('function drawPlayerMap(){') && game.includes("m.fillStyle='#39a7ff'") && game.includes("m.fillStyle='#f4f5f2'") && game.includes('getPlayers?.()'), 'Map must show the local player blue and co-op players white');
assert.ok(game.includes("sprintButton.addEventListener('pointerdown'") && game.includes("e.code==='ShiftLeft'||e.code==='ShiftRight'"), 'Sprint must support hold controls on mobile and Shift on desktop');
assert.ok(html.includes('id="playerMapOverlay"') && html.includes('id="staminaFill"') && html.includes('id="sprintButton"') && html.includes('id="mapButton"'), 'New HUD controls and map overlay must exist');
assert.ok(html.includes('id="apocChat"') && html.includes('id="apocMobileChat"') && html.includes('id="apocChatInput"'), 'Desktop and mobile chat elements must exist');
assert.ok(html.includes('id="markerEditor"') && html.includes('id="markerNameInput"') && html.includes('id="markerSave"') && html.includes('id="markerDelete"'), 'Touch-friendly marker editor must exist');
assert.ok(game.includes('saved.mapMarkers') && game.includes('mapMarkers,activeWaypoint,bonusLives,bonusLivesActive'), 'Custom map markers and bonus lives must persist');
assert.ok(game.includes("if(p.kind==='world'&&p.user_id===coop.room?.owner_id)") && game.includes("if(Number.isFinite(p.worldClock))worldClock=p.worldClock"), 'Co-op day/night phase must only be accepted from the room owner');
assert.ok(game.includes("kind==='admin-command'") && game.includes("kind:'chat-message'"), 'Owner commands and chat messages must synchronize');
assert.ok(game.includes("if(k==='y')") && game.includes("apocChatInput") , 'Y must focus the desktop chat input');


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
assert.ok(game.includes("id:'power_plant'") && game.includes("id:'military_bunker'") && game.includes("id:'train_station'") && game.includes("id:'greenhouse_ruins'"), 'Four new explorable world locations must exist');
assert.ok(game.includes("let generatorRepaired=saved.generatorRepaired===true") && game.includes("generatorRepaired,generatorOnline") && game.includes("kind==='generator-state'"), 'Generator repair and online state must persist and synchronize');
assert.ok(game.includes("function drawGeneratorField()") && game.includes("function drawAcidProjectiles()"), 'Generator power field and acid projectiles must render');
assert.ok(game.includes("armored:[190,32,17]") && game.includes("spitter:[54,48,7]") && game.includes("screecher:[72,50,6]"), 'Three special infected types must have independent combat stats');
assert.ok(game.includes("z.kind==='spitter'&&d>=150&&d<=360") && game.includes("z.kind==='screecher'&&d<350") && game.includes("target.kind==='armored'?.62"), 'Special infected must use ranged attacks, summons and armor resistance');
assert.ok(game.includes("wood:tile(") && game.includes("glass:tile(") && game.includes("rust:tile(") && game.includes("roof:tile(") && game.includes("gravel:tile("), 'Additional high-detail material textures must be generated');
assert.ok(game.includes("id:'quarantine_prison'") && game.includes("id:'port_terminal'") && game.includes("id:'deep_research_lab'") && game.includes("id:'stone_quarry'"), 'Four additional explorable locations must exist');
assert.ok(game.includes("crawler:[62,76,10]") && game.includes("bloater:[145,24,14]") && game.includes("lurker:[44,104,8]"), 'Three additional infected variants must have distinct combat stats');
assert.ok(game.includes("'convoy','quarantine','survivors','signal'") && game.includes("event.type==='survivors'") && game.includes("event.type==='signal'"), 'New world events must spawn and provide interactive rewards');
assert.ok(game.includes("const grassDetailPattern=") && game.includes("ctx.fillStyle=grassDetailPattern;") && !game.includes("for(let gy=top;gy<state.y+h/2+700;gy+=46)"), 'Ground micro-detail must be cached rather than redrawn as thousands of per-frame line calls');
assert.ok(game.includes("if(now-lastExpansionUpdate>=250)") && game.includes("let lastExpansionUpdate=0"), 'Expensive exploration and ambient-event scans must be throttled independently of movement');
assert.ok(game.includes("site.type==='signal'?'АВАРИЙНЫЙ МАЯК'") && game.includes("site.type==='quarantine'?'КАРАНТИН'"), 'New event markers must have distinct labels');


assert.ok(game.includes("Math.random()<.5") && game.includes("state.firearm") && game.includes("storeLoot"), 'Store firearm chance, pickup and persistence must be implemented');
assert.ok(game.includes("drawBuildingInterior") && game.includes("visitedStores"), 'Buildings must have explorable interiors and saved visits');
assert.ok(game.includes('function ground(){') && game.includes('const grassDetailPattern=') && game.includes('ctx.fillRect(-w/2-700,-h/2-700,w+1400,h+1400)'), 'Cached textured ground details must remain positioned relative to the camera');
assert.ok(game.includes('function findSafeSpawn(') && game.includes('findSafeSpawn(state.x+150,state.y+110)'), 'Respawn must find a collision-free position');
assert.ok(!/Math\.min\(9900,state\.[xy]\+/.test(game), 'Old 9,900 map clamp must not remain');
assert.ok(game.includes('function enterSolo(){gameActive=false'), 'Intro dialogue must pause simulation');
assert.ok(game.includes('function openMobileQuickMenu(){const menu=document.getElementById(\'mobileQuickMenu\');if(!menu)return;mobileQuickMenuResume=gameActive;gameActive=false;'), 'Mobile quick actions must pause gameplay');
assert.ok(game.includes('function closeMobileQuickMenu(resume=true){'), 'Closing quick menu must restore its previous running state');
assert.ok(game.includes('function openSettings(resumeGame=gameActive){') && game.includes('function closeSettings(){'), 'Settings overlay must preserve and restore previous game state');
assert.ok(game.includes('if(!gameActive){') && game.includes("if(k==='Escape'){") && game.includes('closeMobileQuickMenu();') && game.includes('closeSettings();'), 'Escape must close paused overlays without accepting background movement');
assert.ok(game.includes("effects:['low','balanced','high'].includes(raw.effects)"), 'Settings quality must match the available select options');
assert.ok(game.includes('function leaveToMenu(){save();gameActive=false;deathHandled=false;'), 'Returning to menu must allow the saved death screen to reopen');
assert.ok(game.includes('name:playerName,'), 'Frame loop must not parse untrusted username JSON every tick');
assert.ok(game.includes('function save(){try{localStorage.setItem('), 'Save failures must not crash gameplay');
assert.ok(game.includes('if(now-lastAutoSave>=prefs.autosaveSeconds*1000)') && game.includes('worldClock,generatorRepaired,generatorOnline,flashlight:!!saved.flashlight') && game.includes('spikeTraps'), 'Position and day/night state must autosave');
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

assert.ok(game.includes("id:'water_treatment'") && game.includes("id:'school_ruins'") && game.includes("id:'city_bank'") && game.includes("id:'garage_complex'") && game.includes("id:'research_center'") && game.includes("id:'old_mill'"), 'All six new enterable buildings must be present');
assert.ok(game.includes("role:'loot',texture:'metal'") && game.includes("role:'loot',texture:'brick'") && game.includes("role:'loot',texture:'concrete'") && game.includes("role:'loot',texture:'asphalt'") && game.includes("role:'loot',texture:'plaster'") && game.includes("role:'loot',texture:'dirt'"), 'Each new building must use a distinct facade texture');
assert.ok(game.includes("const lootCycle=['medInjector','energyDrink','armorPlate','ammoCrate','weaponParts','electronicsPack','cleanWater']") && game.includes("function useNewLootItem(key,refreshInventory=true)") && game.includes("buildingFloors") && game.includes("buildingLoot"), 'Six functional loot items and persistent floor loot must exist');
assert.ok(game.includes('function useQuickSlot(slot){') && game.includes("useNewLootItem('medInjector',false)") && game.includes("if(k>='1'&&k<='6')"), 'Quick-use slots must consume real inventory items on click and keys 1–6');
assert.ok(game.includes('function restAtCamp(){') && game.includes('state.food--;') && game.includes('state.stamina=maxStamina();') && game.includes('worldClock=(worldClock+10/1440)%1'), 'Camp rest must cost food, restore health/stamina and advance game time');
assert.ok(game.includes('function nearbyActionLabel(){') && game.includes('function updateConvenienceHud(){') && game.includes('activeWaypoint,bonusLives'), 'Context actions, objective/threat tracking and active waypoint persistence must exist');
assert.ok(game.includes("if(e.code==='F5'||e.key==='F5')") && game.includes('function manualSave(){'), 'F5 must save the current world manually');
assert.ok(game.includes("let starterKnife=") && game.includes("state.meleeWeapon='knife'") && game.includes("state.meleeWeapon==='knife'?10"), 'The starter knife must be collectible and deal exactly 10 damage');
assert.ok(game.includes("function updateAmbientEvents(now)") && ['checkpoint','patrol','gunfire','scream'].every(kind=>game.includes("'"+kind+"'")) && game.includes("function playAmbientSound(kind)"), 'Random world events must include props, infected patrols, gunfire and survivor cries');
assert.ok(game.includes("for(const b of buildings){if(!b.role){b.role='loot';b.kind='residential';}}") && game.includes('weaponDrop') && game.includes("function drawHeldWeapon()"), 'All buildings must be searchable and weapons must be visible and equippable');
assert.ok(game.includes("const phase=(Math.floor(time/52000)%6),storm=phase===2,rain=phase===3,drizzle=phase===5,dust=phase===4"), 'Weather must cycle through additional dynamic conditions');
assert.ok(html.includes('id="quickbarHud"') && html.includes('id="quickSlot6"') && html.includes('id="objectiveHud"') && html.includes('id="waypointHud"') && html.includes('id="threatHud"'), 'Gameplay quickbar and guidance HUD must exist');
assert.ok(html.includes('id="markerNavigate"') && html.includes('id="waypointClear"') && html.includes('id="mobileMoreSave"'), 'Waypoint selection and mobile quick save controls must exist');
assert.ok(game.includes("Array.from({length:b.floors}") && game.includes("buildingFloors[lootBuilding.id]=floor>=lootBuilding.floors?1:floor+1") && game.includes("crateEntry.picked=true"), 'Each floor must have a searchable persistent crate and stair traversal');
assert.ok(game.includes("energyBoostUntil>now?1.22:1") && game.includes("Math.max(.4,.68-(state.armorLevel-1)*.07)") && game.includes("46+(state.weaponLevel-2)*6"), 'New item effects must affect gameplay stats');

assert.ok(game.includes("hydration:bounded(saved.hydration,100,0,100)") && game.includes("function updateHydration(dt,now)") && game.includes("state.hydration=Math.min(100,state.hydration+45)"), 'Thirst must drain over time and clean water must restore hydration');
assert.ok(game.includes("function updateWaterFilter(now)") && game.includes("state.cleanWater=Math.min(12,state.cleanWater+state.waterFilterLevel)"), 'Rainwater filter must collect and cap purified water');
assert.ok(game.includes("function updateSpikeTraps(now)") && game.includes("z.hp-=46") && game.includes("function drawSpikeTraps()") && game.includes("barricades,spikeTraps"), 'Placed spike traps must render, damage infected and persist');
assert.ok(game.includes("function purchaseSafehouse()") && game.includes("state.safehouseLevel++") && game.includes("if(safeBonus){state.scrap+=safeBonus*2"), 'Safehouse upgrades must cost resources and generate daily supplies');
assert.ok(game.includes("function ensureDailyContract()") && game.includes("function progressContract(kind") && game.includes("function claimDailyContract()") && game.includes("contractType=['wood','kills','salvage']"), 'Daily contracts must track actions, rotate by day and pay rewards');
assert.ok(game.includes("type==='horde'") && game.includes("eventId:id") && game.includes("event.type==='signal'"), 'Horde events must spawn a bounded group and support a clear-and-claim objective');
assert.ok(game.includes("state.scannerLevel>0") && game.includes("const radioTower=buildings.find(b=>b.id==='radio_tower')") && game.includes("Сканер обнаружил"), 'Crafted radio scanner must find caches at the radio tower');
assert.ok(game.includes("function moveZombiePathStep(") && game.includes("moveZombiePathStep(z,dx*direction,dy*direction,z.speed*dt)"), 'Infected must attempt alternate paths around obstacles');
assert.ok(game.includes("function updateSpikeTraps(now){const coop=window.ApocalypseCoop;if(coop?.room&&!coop.isOwner())return;") && game.includes("kind:'spike-trap-built'") && coop.includes("apocalypse-protocol-1.2.9"), 'Co-op trap damage must be owner-authoritative and use the new protocol');
assert.ok(game.includes("prefs.infectedCap") && game.includes("/prefs.eventFrequency") && game.includes("prefs.autosaveSeconds*1000") && game.includes("prefs.autoSprint"), 'New settings must affect infected, event frequency, autosave and sprint behavior');
assert.ok(html.includes('id="settingWeather"') && html.includes('id="settingInfectedCap"') && html.includes('id="settingEventFrequency"') && html.includes('id="settingAutosave"') && html.includes('id="settingAutoSprint"') && html.includes('id="settingsDefaults"') && html.includes('id="settingSurvivalDifficulty"') && html.includes('id="settingRenderDistance"') && html.includes('id="settingEnemyHealth"') && html.includes('id="settingSurvivalHud"') && html.includes('id="infectionHud"') && html.includes('id="temperatureHud"'), 'Expanded survival and performance settings/HUD controls must exist');
assert.ok(game.includes('function updateTemperature(dt,now)') && game.includes('state.infection>=65') && game.includes('function travelToWaypoint()') && game.includes('state.workbenchLevel++') && game.includes('state.vehicleRepaired=true') && game.includes("source:'safehouse-raid'") && game.includes('prefs.renderDistance') && game.includes('prefs.showEnemyHealth'), 'New infection, temperature, squad, crafting, transport, raid and rendering systems must be implemented');
assert.ok(coop.includes('apocalypse-protocol-1.3.0') && game.includes('crewCount:state.crewCount') && game.includes('vehicleRepaired:state.vehicleRepaired'), 'Co-op must synchronize expanded shared settlement systems');
assert.ok(pc.includes("def save_apocalypse_settings(self, payload)") && pc.includes("PRIMEHUB_APOCALYPSE_SETTINGS") && pc.includes("APOCALYPSE_SETTINGS_PATH") && pc.includes('"survivalDifficulty"') && pc.includes('"renderDistance"') && pc.includes('"showEnemyHealth"') && pc.includes('"showSurvivalHud"'), 'Windows bridge must persist and normalize the expanded PrimeHub settings profile');

const quickbarHarness = makeHarness({
  skyrealm_apocalypse_mobile_v1: JSON.stringify({
    x: 440, y: 390, hp: 30, bandage: 2, food: 1, medInjector: 1,
    energyDrink: 1, ammoCrate: 1, armorPlate: 1, worldClock: .3, infection: 22, bodyTemp: 46, crewCount: 2, crewRole: 'medic', workbenchLevel: 2, weaponDurability: 63, antibiotics: 1, vehicleRepaired: true, fuel: 2,
    activeWaypoint: { name: 'Больница', x: 1200, y: 1600 },
    mapMarkers: [{ name: 'Больница', x: 1200, y: 1600 }]
  })
});
vm.runInNewContext(game, quickbarHarness.sandbox, { filename: 'apocalypse.js' });
quickbarHarness.runFrame(1000);
quickbarHarness.elements.get('menuPlay').click();
quickbarHarness.elements.get('start').click();
quickbarHarness.elements.get('journalOk').click();
quickbarHarness.runFrame(1016);
const expandedStats = quickbarHarness.sandbox.window.ApocalypseGame.getConvenienceStats();
assert.equal(expandedStats.infection, 22, 'The infection state must load from existing save data');
assert.equal(expandedStats.crewCount, 2, 'The recruited squad must survive reloads');
assert.equal(expandedStats.workbenchLevel, 2, 'Workbench progression must survive reloads');
assert.equal(expandedStats.weaponDurability, 63, 'Weapon durability must survive reloads');
assert.equal(expandedStats.vehicleRepaired, true, 'Vehicle restoration must survive reloads');
quickbarHarness.elements.get('quickSlot1').click();
assert.equal(quickbarHarness.sandbox.window.ApocalypseGame.getConvenienceStats().hp, 75, 'Clicking quick slot 1 should heal 45 HP');
assert.equal(quickbarHarness.sandbox.window.ApocalypseGame.getConvenienceStats().bandage, 1, 'Clicking quick slot 1 should consume one bandage');
quickbarHarness.dispatchWindow('keydown', { code: 'Digit2', key: '2' });
assert.equal(quickbarHarness.sandbox.window.ApocalypseGame.getConvenienceStats().hp, 90, 'Quick slot 2 should heal 15 HP from a food ration');
assert.equal(quickbarHarness.sandbox.window.ApocalypseGame.getConvenienceStats().food, 0, 'Quick slot 2 should consume one ration');
quickbarHarness.dispatchWindow('keydown', { code: 'Digit3', key: '3' });
assert.equal(quickbarHarness.sandbox.window.ApocalypseGame.getConvenienceStats().hp, 100, 'Quick slot 3 should restore up to 60 HP');
assert.equal(quickbarHarness.sandbox.window.ApocalypseGame.getConvenienceStats().medInjector, 0, 'Quick slot 3 should consume one medical injector');
quickbarHarness.dispatchWindow('keydown', { code: 'F5', key: 'F5' });
const quickbarSave = JSON.parse(quickbarHarness.store.get('skyrealm_apocalypse_mobile_v1'));
assert.equal(quickbarSave.hp, 100, 'F5 must persist the latest health value');
assert.equal(quickbarSave.activeWaypoint.name, 'Больница', 'The selected map waypoint must persist in the world save');
assert.equal(quickbarSave.infection, 22, 'Infection progress must persist in the world save');
assert.equal(quickbarSave.crewCount, 2, 'Squad size must persist in the world save');
assert.equal(quickbarSave.vehicleRepaired, true, 'Vehicle repair state must persist in the world save');
assert.equal(quickbarHarness.sandbox.window.ApocalypseGame.getConvenienceStats().activeWaypoint.name, 'Больница', 'The active waypoint must survive game startup');

console.log('Apocalypse deep-audit tests passed: runtime boot/frame, corrupt saves, storage failure, survival systems, settings/HUD, co-op settlement sync, HTML assets, safe respawn, PC port, and unchanged movement.');
