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
const cinematic3d = fs.readFileSync(path.join(root, 'app/src/main/assets/apocalypse-cinematic-3d.js'), 'utf8');
const character3d = fs.readFileSync(path.join(root, 'app/src/main/assets/apocalypse-character-3d.js'), 'utf8');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/build-apocalypse-pc.yml'), 'utf8');
new vm.Script(cinematic3d, { filename: 'apocalypse-cinematic-3d.js' });
new vm.Script(character3d, { filename: 'apocalypse-character-3d.js' });

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
assert.ok(game.includes("const isAndroidDevice=/Android/i.test(typeof navigator!=='undefined'?(navigator.userAgent||''):'')") && game.includes('isAndroidDevice?1.2:1.7') && game.includes('now-lastMobileDrawAt>=1000/prefs.maxFps'), 'Android-only render resolution and frame-rate limits must not change PC settings');
assert.ok(game.includes('requestedViewScale') && game.includes('Math.min(requestedViewScale,.9):requestedViewScale'), 'Only Android must use the shorter object render distance');
assert.ok(game.includes('function drawRivers()') && game.includes('Array.from({length:60}') && game.includes('foundShelterCaches'), 'Rivers and 60 persistent searchable shelters must be present');
assert.ok(game.includes('function updateRain(dt,now)') && game.includes('state.hydration>=10'), 'Acid rain damage and thirst sprint lock must be active');
assert.ok(html.includes('id="panelSearch"') && html.includes('id="panelSearchCount"') && html.includes('id="panelSearchEmpty"'), 'All game panels must expose a searchable, accessible item filter and empty state');
assert.ok(game.includes("slot.dataset.search=") && game.includes("search.oninput") && game.includes("e.key==='Escape'"), 'Panel search must filter live, count matches and clear on Escape');
assert.ok(html.includes('id="settingMaxFps"') && html.includes('radar-button') && html.includes('dialogue-open'), 'FPS settings, radar and intro HUD hiding must exist');
assert.ok(html.includes('id="cine3D"') && html.includes('apocalypse-cinematic-3d.js') && html.includes('cineProgress 16s'), '16-second WebGL cinematic canvas and progress timeline must be wired');
assert.ok(html.includes('id="characterCreator"') && html.includes('id="charBodyType"') && html.includes('id="charOutfit"') && html.includes('id="charSkin"') && html.includes('id="charBoots"'), 'Expanded character creator controls must exist');
assert.ok(game.includes("sessionStorage.setItem('apoc_open_character_creator','new')") && game.includes('function confirmCharacterCreator()') && game.includes('character:{...colors}') && game.includes('function openCharacterCreator('), 'New worlds must enter character creator before cinematic');
assert.ok(game.includes("edit.textContent='Персонаж'") && game.includes('avatar:{...colors}') && game.includes("case 'mohawk'") && game.includes("outfit==='tactical'"), 'Characters must be editable per world and synced in co-op');
assert.ok(html.includes('id="charGarmentSize"') && html.includes('id="charCloak"') && html.includes('id="charOuterwear"') && html.includes('id="charBackpack"') && html.includes('id="charGloves"'), 'Expanded wardrobe sizing, cloaks and gear controls must exist');
assert.ok(html.includes('id="charPantsStyle"') && html.includes('id="charBelt"') && html.includes('id="charFabric"') && html.includes('id="charCondition"') && html.includes('id="charPatch"'), 'Clothing types, utility gear, fabric and wear controls must exist');
assert.ok(game.includes("cloak!=='none'") && game.includes("outerwear==='parka'") && game.includes("backpack==='large'") && game.includes("garmentSize==='XL'") && game.includes("fabric!=='solid'"), 'Selected wardrobe items must render on the actual in-game survivor');
assert.ok(game.includes("cloak:val('charCloak')") && game.includes("backpack:val('charBackpack')") && game.includes("cloakColor:val('charCloakColor')"), 'New outfit selections must save to the per-world avatar and co-op profile');
const selectOptionCount=id=>{const match=html.match(new RegExp('<select id="'+id+'"[^>]*>([\\s\\S]*?)</select>'));return (match?.[1].match(/<option\b/g)||[]).length;};
assert.ok(selectOptionCount('charHairStyle')>40 && selectOptionCount('charOutfit')>35 && selectOptionCount('charCloak')>40, 'Character workshop must expose more than 40 hairstyles and cloaks and more than 35 costumes');
assert.ok(game.includes('const HAIR_STYLE_CATALOG=[') && game.includes('const OUTFIT_STYLE_CATALOG=[') && game.includes('const CLOAK_STYLE_CATALOG=['), 'The gameplay renderer must contain all expanded appearance catalogs');
assert.ok(game.includes('function drawSurvivorHair(style,baseColor,accentColor,phase=0)') && game.includes('const faceKind=palette?.faceShape||\'normal\'') && game.includes('const eyeKind=palette?.eyeStyle||\'normal\''), 'Actual player model must render hairstyle and selected face/eye shapes');
assert.ok(html.includes('id="charHairAccent"') && html.includes('id="charBrowColor"') && html.includes('id="charBeardColor"') && html.includes('id="charEyeWhite"') && html.includes('id="charMetalColor"') && html.includes('id="charPatternColor"'), 'Separate colors for hair, facial details, eyes, metal and fabric must be configurable');
assert.ok(html.includes('id="charMarkings"') && html.includes('id="charFootwear"') && html.includes('id="charFaceShape"') && html.includes('id="charEyeStyle"') && html.includes('id="charHeight"'), 'Additional body, face, eye, markings and footwear customization must exist');
assert.ok(game.includes('hairAccent:val(\'charHairAccent\')') && game.includes('eyeWhiteColor:val(\'charEyeWhite\')') && game.includes('metalColor:val(\'charMetalColor\')') && game.includes('markings:val(\'charMarkings\')'), 'Expanded appearance palette and details must be saved');
assert.ok(game.includes('const suitCut=outfitIndex%5') && game.includes('const cw=11+(cloakIndex%5)') && game.includes("case 'mohawk'") && game.includes("case 'afro'") && game.includes('drawSurvivorHair('), 'Hair, costume and cloak variants must affect in-game character rendering');
assert.ok(game.includes('const CHARACTER_TABS=') && game.includes('function buildCharacterTabs()') && game.includes('function activateCharacterTab(id)'), 'Character editor must use separate Terraria-style icon tabs');
assert.ok(game.includes("label:'Волосы'") && game.includes("label:'Кожа и глаза'") && game.includes("label:'Одежда'") && game.includes("label:'Снаряжение'") && game.includes("label:'Цвета'"), 'Character editor tabs must separate appearance categories');
assert.ok(html.includes('.character-tab-nav') && html.includes('.character-tab-pane[hidden]') && html.includes('.character-preview-wrap{min-height:390px}'), 'Character editor must show focused tab panels with a persistent enlarged preview');
assert.ok(game.includes('function characterArtworkSvg(v={},seed=0)') && game.includes('ellipse cx="83" cy="85"') && game.includes('const facialHair='), 'Every option thumbnail must show a detailed full character with distinct eyes and facial hair');
assert.ok(game.includes('window.ApocalypseCharacter3D.update(artwork)') && !game.includes('return terrariaPortraitSvg(v);'), 'Character editor must use live 3D preview and detailed SVG thumbnails');
assert.ok(html.includes('characterPreview3d') && html.includes('character3dReset') && html.includes('apocalypse-character-3d.js'), '3D editor canvas, orbit controls and renderer script must be wired');
assert.ok(character3d.includes('function model(t)') && character3d.includes('noise(wp*38.)') && character3d.includes('pointermove') && character3d.includes('charHairStyle'), '3D model must use procedural materials, drag rotation and existing appearance controls');
assert.ok(game.includes("querySelectorAll('#characterCreator .character-field')") && game.includes("groups[tab].appendChild(field)"), 'All appearance fields, including fields originally outside the main field container, must be moved into tabs');
assert.ok(html.includes('avatar-eyes') && html.includes('avatar-nose') && html.includes('avatar-mouth') && html.includes('.avatar-beard'), 'Live character preview must render eyes, nose, mouth and beard details');
assert.ok(game.includes('function characterOptionSvg') && game.includes('function renderCharacterOptionGalleries') && game.includes('function syncCharacterOptionGalleries'), 'Every character select must have an illustrated option gallery');
assert.ok(game.includes("img.src=characterOptionSvg(select.id,option.value,index)") && game.includes("select.insertAdjacentElement('afterend',gallery)"), 'Each option must display its own thumbnail image beside its label');
assert.ok(game.includes("select.dispatchEvent(new Event('input',{bubbles:true}))") && game.includes("card.classList.toggle('selected',active)"), 'Selecting an image card must update the actual choice and live preview');
assert.ok(html.includes('character-option-card img') && html.includes('overflow-x:auto'), 'Option image galleries must be touch-scrollable and styled for mobile');
assert.ok(game.includes('viewBox="0 0 180 252"') && game.includes('character-portrait-svg') && game.includes('class="portrait-eyes"') && game.includes('hairStrands') && game.includes('hairClip') && !game.includes('linearGradient id="bg"') && !game.includes('fill="url(#bg)"'), 'Character option artwork must use a detailed transparent portrait canvas without a decorative background');
assert.ok(html.includes('background:transparent') && html.includes('object-fit:contain') && html.includes('width:88px;height:104px'), 'Character option thumbnails must be larger, transparent and uncropped');
assert.ok(cinematic3d.includes('function renderCrash(t)') && cinematic3d.includes('playCrash'), 'A separate 3D airplane-crash cinematic must be available');
assert.ok(cinematic3d.includes('noise3(worldPos*67.0)') && cinematic3d.includes('function drawHelicopterDetails(') && cinematic3d.includes('function drawCrashWreckDetails(') && cinematic3d.includes('function drawCinematicDebris('), 'Cinematics must use layered high-detail procedural materials, aircraft markings and detailed crash-site dressing');
assert.ok(cinematic3d.includes('shot=cameraForCrash(t)') && cinematic3d.includes('function drawCrashAtmosphere(t)') && cinematic3d.includes('drawCrashAtmosphere(t)') && cinematic3d.includes('const shake=') && cinematic3d.includes('mobile()?22:36') && cinematic3d.includes('mobile()?1.25:2'), 'Crash camera cuts, impact shake, scorched terrain and platform-scaled cinematic detail must be enabled');
assert.ok(cinematic3d.includes('function drawZombie(') && cinematic3d.includes('function drawHelicopter(') && cinematic3d.includes('cameraForIntro') && cinematic3d.includes('cameraForCrash') && cinematic3d.includes('const bodyW=') && cinematic3d.includes('variant===3'), 'Cinematics must use four visibly distinct infected body archetypes');
assert.ok(game.includes('const shapeX=crawler?1.34:runner?.82') && game.includes('if(brute){') && game.includes('if(runner){') && game.includes('if(armored){') && game.includes('if(spitter){') && game.includes('if(bloater){') && game.includes('if(crawler){') && game.includes('if(stalker||lurker){') && game.includes('if(screecher){'), 'Every gameplay infected class must have its own silhouette and anatomical details');
assert.ok(cinematic3d.includes('radioDialogue(') && cinematic3d.includes('AndroidBridge.speakRussian') && cinematic3d.includes('AndroidBridge.installRussianVoice') && cinematic3d.includes('speechSynthesis') && cinematic3d.includes('ru-RU') && cinematic3d.includes('говорит оперативный центр') && cinematic3d.includes('отказ правого двигателя') && cinematic3d.includes('publishedSfx') && cinematic3d.includes('01_zombey.mp3') && cinematic3d.includes('helicopter-10.mp3') && cinematic3d.includes('footsteps-gravel-39.mp3'), 'Cinematics must use original editable Russian role dialogue plus published CC0 zombie, helicopter and footsteps effects');
assert.ok(cinematic3d.includes('const torsoTwist=') && cinematic3d.includes('const headTilt=') && cinematic3d.includes('const jawOpen=') && cinematic3d.includes('const stumble='), 'Zombies must have layered stagger, head, jaw and independent body animation');
assert.ok(cinematic3d.includes('function drawPilot(t)') && cinematic3d.includes('const crowdTargets=') && cinematic3d.includes('const slotX='), 'Crash cinematic must animate the pilot escape and keep infected characters separated');
assert.ok(cinematic3d.includes('function organicLimb()') && cinematic3d.includes("draw('organic'") && cinematic3d.includes('jumpProgress') && cinematic3d.includes('reach=approach'), 'Zombies must use opaque tapered anatomy and animate a leap, landing and reaching attack on the aircraft');
assert.ok(game.includes('function startCrashSiteCinematic()') && game.includes('startCrashSiteCinematic();return;') && game.includes('activateBlackBox();'), 'Pressing E at the active crash site must play the second cinematic before the black-box encounter');
assert.ok(game.includes('setTimeout(finish,16000)') && game.includes('ApocalypseCinematic3D?.play()') && game.includes('ApocalypseCinematic3D?.stop()'), 'Opening cinematic must play, stop on skip, and finish after sixteen seconds');
assert.ok(pc.includes('apocalypse-cinematic-3d.js') && workflow.includes('apocalypse-cinematic-3d.js;apocalypse'), 'Windows EXE must bundle the WebGL cinematic module');
assert.ok(workflow.includes('apocalypse-character-3d.js;apocalypse') && workflow.includes('node --check app/src/main/assets/apocalypse-character-3d.js'), 'Windows EXE must validate and bundle the live 3D character editor module');
assert.ok(game.includes('Math.hypot(nx-state.x,ny-state.y)>=3200') && game.includes('d=3500+(i%7)*115'), 'New crash mission coordinates must be at least 100 32px blocks from the player spawn');
assert.ok(game.includes('starterKnifeSpawnVersion') && game.includes('x:state.x+96,y:state.y-24'), 'Starter knife position must migrate once without resetting picked knives');
assert.ok(html.includes('body.apoc-chat-open .apoc-chat{top:32px!important}') && html.includes('#inventory{transform:translateY(8px)}'), 'Mobile chat and inventory must use the requested vertical positions');
assert.ok(html.includes('.convenience-hud{left:auto!important;right:8px!important;top:50%!important') && html.includes('.sprint-button{left:auto!important;right:82px!important'), 'Radio/objective HUD and sprint must stay on the right on narrow phones');
assert.ok(html.includes('.menu-panel{max-height:88dvh!important') && html.includes('.storage{width:96vw!important;height:88dvh!important'), 'Mobile menu and inventory panels must be compact');
assert.ok(game.includes("ctx.globalAlpha=.38;ctx.fillStyle='#657452'"), 'Ground must receive a consistent base tint across the map');
assert.ok(game.includes('mapRange=2600') && game.includes("playerMapCanvas.addEventListener('pointerdown'") && game.includes("playerMapCanvas.addEventListener('wheel'"), 'Full map must support drag panning and zooming');
assert.ok(game.includes("b.id==='water_treatment'&&state.waterFilterLevel<1") && game.includes('state.hydration<10'), 'Water filters must be lootable in buildings and low thirst must disable sprint');
assert.ok(game.includes('function drawResidentialInteriorDetails(') && game.includes('drawResidentialInteriorDetails(id,variant,floor)'), 'Residential interiors must receive the added home furnishing pass');
assert.ok(game.includes('function renderPlayerList()') && game.includes("e.code==='Tab'||e.key==='Tab'") && game.includes('playerListOverlay'), 'Tab must open the online player list on PC');
assert.ok(html.includes('id="playerListOverlay"') && html.includes('id="playerListContent"') && html.includes('id="playerListClose"'), 'Player list dialog markup must exist');
assert.ok(game.includes('runUpgrade:whole(saved.runUpgrade,0,0,3)') && game.includes('ammoUpgrade:whole(saved.ammoUpgrade,0,0,3)'), 'Both permanent upgrades must be capped at level 3');
assert.ok(game.includes('function maxStamina(){return 100+state.runUpgrade*15;}') && game.includes('state.stamina-34*dt') && game.includes('state.stamina+(moving?17:27)*(state.bodyTemp<20?.55:1)*dt'), 'Sprint must drain stamina and recover it during normal movement/rest');
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
assert.ok(game.includes("z.kind==='spitter'&&d>=150&&d<=360") && game.includes("z.kind==='screecher'&&d<350") && game.includes("z.kind==='armored'?.62"), 'Special infected must use ranged attacks, summons and armor resistance');
assert.ok(game.includes("wood:tile(") && game.includes("glass:tile(") && game.includes("rust:tile(") && game.includes("roof:tile(") && game.includes("gravel:tile("), 'Additional high-detail material textures must be generated');
assert.ok(game.includes("id:'quarantine_prison'") && game.includes("id:'port_terminal'") && game.includes("id:'deep_research_lab'") && game.includes("id:'stone_quarry'"), 'Four additional explorable locations must exist');
assert.ok(game.includes("crawler:[62,76,10]") && game.includes("bloater:[145,24,14]") && game.includes("lurker:[44,104,8]"), 'Three additional infected variants must have distinct combat stats');
assert.ok(game.includes("'convoy','quarantine','survivors','signal'") && game.includes("event.type==='survivors'") && game.includes("event.type==='signal'"), 'New world events must spawn and provide interactive rewards');
assert.ok(game.includes("const grassDetailPattern=") && game.includes("ctx.fillStyle=grassDetailPattern;") && !game.includes("for(let gy=top;gy<state.y+h/2+700;gy+=46)"), 'Ground micro-detail must be cached rather than redrawn as thousands of per-frame line calls');
assert.ok(game.includes("if(now-lastExpansionUpdate>=250)") && game.includes("let lastExpansionUpdate=0"), 'Expensive exploration and ambient-event scans must be throttled independently of movement');
assert.ok(game.includes("site.type==='signal'?'АВАРИЙНЫЙ МАЯК'") && game.includes("site.type==='quarantine'?'КАРАНТИН'"), 'New event markers must have distinct labels');


assert.ok(game.includes("Math.random()<.5") && game.includes("state.firearm") && game.includes("storeLoot"), 'Store firearm chance, pickup and persistence must be implemented');
assert.ok(game.includes("drawBuildingInterior") && game.includes("visitedStores"), 'Buildings must have explorable interiors and saved visits');
assert.ok(game.includes('function enterBuilding(b)') && game.includes('function exitBuilding()') && game.includes('function drawInteriorMap()') && game.includes('function interactInterior()') && game.includes('function interiorBlocked(x,y)'), 'Every building must have a separate enterable, bounded interior map with an exit');
assert.ok(game.includes("p.kind==='building-loot-claimed'") && game.includes("kind:'building-loot-claimed'"), 'Building loot must synchronize in co-op');
assert.ok(game.includes('interiorId:activeInterior?.buildingId||null') && game.includes('interiorFloor:activeInterior?.floor||0'), 'Co-op positions must carry building and floor identity');
assert.ok(game.includes('drawBuildingEntryPrompts()') && game.includes("'E · ВОЙТИ'"), 'Every exterior building entrance must advertise E interaction');
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
    createLinearGradient() { return gradient; },
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
const homeStats = harness.sandbox.window.ApocalypseGame.getHomeSystemStats();
assert.ok(homeStats.homes >= 8 && homeStats.slotsPerFloor === 3 && homeStats.roomCount === 4, 'Expanded home layouts and furniture coverage must be initialized');
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
assert.ok(game.includes("let starterKnife=") && game.includes("state.meleeWeapon='knife'") && game.includes("hasKnife=state.meleeWeapon==='knife'") && game.includes("damageBase=hasKnife?(kick?17:heavy?34:25)"), 'The starter knife must be collectible and power the upgraded melee combo');
assert.ok(game.includes("function updateAmbientEvents(now)") && ['checkpoint','patrol','gunfire','scream'].every(kind=>game.includes("'"+kind+"'")) && game.includes("function playAmbientSound(kind)"), 'Random world events must include props, infected patrols, gunfire and survivor cries');
assert.ok(game.includes("for(const b of buildings){if(!b.role){b.role='loot';b.kind='residential';}}") && game.includes('weaponDrop') && game.includes("function drawHeldWeapon()"), 'All buildings must be searchable and weapons must be visible and equippable');
assert.ok(game.includes("const phase=(Math.floor(time/52000)%6),storm=phase===2,rain=phase===3,drizzle=phase===5,dust=phase===4"), 'Weather must cycle through additional dynamic conditions');
assert.ok(html.includes('id="quickbarHud"') && html.includes('id="quickSlot6"') && html.includes('id="objectiveHud"') && html.includes('id="waypointHud"') && html.includes('id="threatHud"'), 'Gameplay quickbar and guidance HUD must exist');
assert.ok(html.includes('id="markerNavigate"') && html.includes('id="waypointClear"') && html.includes('id="mobileMoreSave"'), 'Waypoint selection and mobile quick save controls must exist');
assert.ok(game.includes("Array.from({length:b.floors}") && game.includes("buildingFloors[lootBuilding.id]=floor>=lootBuilding.floors?1:floor+1") && game.includes("crateEntry.picked=crateEntry.contents.every(v=>v.picked)"), 'Each floor must have a multi-item searchable persistent crate and stair traversal');
assert.ok(game.includes("energyBoostUntil>now?1.22:1") && game.includes("Math.max(.4,.68-(state.armorLevel-1)*.07)") && game.includes("damageBase=hasKnife?(kick?17:heavy?34:25)"), 'New item effects must affect gameplay stats');

assert.ok(game.includes("hydration:bounded(saved.hydration,100,0,100)") && game.includes("function updateHydration(dt,now)") && game.includes("state.hydration=Math.min(100,state.hydration+45)"), 'Thirst must drain over time and clean water must restore hydration');
assert.ok(game.includes("function updateWaterFilter(now)") && game.includes("state.cleanWater=Math.min(12,state.cleanWater+state.waterFilterLevel)"), 'Rainwater filter must collect and cap purified water');
assert.ok(game.includes("function updateSpikeTraps(now)") && game.includes("z.hp-=46") && game.includes("function drawSpikeTraps()") && game.includes("barricades,spikeTraps"), 'Placed spike traps must render, damage infected and persist');
assert.ok(game.includes("function purchaseSafehouse()") && game.includes("state.safehouseLevel++") && game.includes("if(safeBonus){state.scrap+=safeBonus*2"), 'Safehouse upgrades must cost resources and generate daily supplies');
assert.ok(game.includes("function ensureDailyContract()") && game.includes("function progressContract(kind") && game.includes("function claimDailyContract()") && game.includes("contractType=['wood','kills','salvage']"), 'Daily contracts must track actions, rotate by day and pay rewards');
assert.ok(game.includes("type==='horde'") && game.includes("eventId:id") && game.includes("event.type==='signal'"), 'Horde events must spawn a bounded group and support a clear-and-claim objective');
assert.ok(game.includes("state.scannerLevel>0") && game.includes("const radioTower=buildings.find(b=>b.id==='radio_tower')") && game.includes("Сканер обнаружил"), 'Crafted radio scanner must find caches at the radio tower');
assert.ok(game.includes("function moveZombiePathStep(") && game.includes("moveZombiePathStep(z,dx*direction,dy*direction,z.speed*dt*(z.crawling?.72:1))"), 'Infected must attempt alternate paths around obstacles');
assert.ok(game.includes("function updateSpikeTraps(now){const coop=window.ApocalypseCoop;if(coop?.room&&!coop.isOwner())return;") && game.includes("kind:'spike-trap-built'") && coop.includes("apocalypse-protocol-1.3.1"), 'Co-op trap damage must be owner-authoritative and use the new protocol');
assert.ok(game.includes("prefs.infectedCap") && game.includes("/prefs.eventFrequency") && game.includes("prefs.autosaveSeconds*1000") && game.includes("prefs.autoSprint"), 'New settings must affect infected, event frequency, autosave and sprint behavior');
assert.ok(html.includes('id="settingWeather"') && html.includes('id="settingInfectedCap"') && html.includes('id="settingEventFrequency"') && html.includes('id="settingAutosave"') && html.includes('id="settingAutoSprint"') && html.includes('id="settingsDefaults"') && html.includes('id="settingSurvivalDifficulty"') && html.includes('id="settingRenderDistance"') && html.includes('id="settingEnemyHealth"') && html.includes('id="settingSurvivalHud"') && html.includes('id="infectionHud"') && html.includes('id="temperatureHud"'), 'Expanded survival and performance settings/HUD controls must exist');
assert.ok(game.includes('function updateTemperature(dt,now)') && game.includes('state.infection>=65') && game.includes('function travelToWaypoint()') && game.includes('state.workbenchLevel++') && game.includes('state.vehicleRepaired=true') && game.includes("source:'safehouse-raid'") && game.includes('prefs.renderDistance') && game.includes('prefs.showEnemyHealth'), 'New infection, temperature, squad, crafting, transport, raid and rendering systems must be implemented');
assert.ok(coop.includes('apocalypse-protocol-1.3.1') && game.includes('crewCount:state.crewCount') && game.includes('vehicleRepaired:state.vehicleRepaired'), 'Co-op must synchronize expanded shared settlement systems');
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


assert.ok(game.includes("const spawnCampfire={x:440,y:390}") && game.includes("const spawnCampfireRadius=()=>((30+(spawnCampfireLevel-1)*10)*32)"), 'A level-one protective campfire must be anchored at spawn with a 30-block radius and +10 blocks per level');
assert.ok(game.includes("spawnCampfireUntil=Math.max(Date.now(),spawnCampfireUntil)+180000") && game.includes("spawnCampfireUpgradeCost=()=>spawnCampfireLevel*5"), 'One wood must add three real-time minutes and upgrade wood costs must increase by level');
assert.ok(game.includes("fireDistance<spawnCampfireRadius()") && game.includes("spawnCampfireRadius()+18"), 'Infected must be expelled beyond the active campfire protection radius');
assert.ok(html.includes('id="spawnFirePanel"') && html.includes('id="spawnFireFeed"') && html.includes('id="spawnFireUpgrade"') && html.includes('id="spawnFireFill"'), 'The campfire fuel slider and feed/upgrade controls must be present');


const campfireHarness = makeHarness({
  skyrealm_apocalypse_mobile_v1: JSON.stringify({
    x: 440, y: 390, wood: 6, spawnCampfireLevel: 1,
    spawnCampfireUntil: Date.now() + 180000
  })
});
vm.runInNewContext(game, campfireHarness.sandbox, { filename: 'apocalypse.js' });
campfireHarness.elements.get('menuPlay').click();
campfireHarness.elements.get('start').click();
campfireHarness.elements.get('journalOk').click();
campfireHarness.runFrame(1016);
const campfireStats = campfireHarness.sandbox.window.ApocalypseGame.getSpawnCampfireStats();
assert.equal(campfireStats.near, true, 'Campfire must be placed at the actual safe spawn: ' + JSON.stringify(campfireStats));
assert.equal(campfireStats.gameActive, true, 'Campfire test must be running in gameplay: ' + JSON.stringify(campfireStats));
assert.equal(campfireHarness.elements.get('spawnFirePanel').classList.contains('hidden'), false, 'Campfire controls must appear when the player is at spawn');
campfireHarness.elements.get('spawnFireFeed').click();
let campfireSave = JSON.parse(campfireHarness.store.get('skyrealm_apocalypse_mobile_v1'));
assert.equal(campfireSave.wood, 5, 'Feeding the campfire must consume one wood');
assert.ok(campfireSave.spawnCampfireUntil > Date.now() + 170000, 'Feeding the campfire must add three minutes of real time');
campfireHarness.elements.get('spawnFireUpgrade').click();
campfireSave = JSON.parse(campfireHarness.store.get('skyrealm_apocalypse_mobile_v1'));
assert.equal(campfireSave.spawnCampfireLevel, 2, 'Campfire upgrade must persist the next level');
assert.equal(campfireSave.wood, 0, 'The first campfire upgrade must consume five wood');


assert.ok(game.includes("function drawHomeRoomPartitions(id)") && game.includes("'ГОСТИНАЯ'") && game.includes("'КУХНЯ'") && game.includes("'СПАЛЬНЯ'") && game.includes("'КЛАДОВАЯ'"), 'Enterable homes must render four connected, named rooms');
assert.ok(game.includes("const homeFurnitureSlots=") && game.includes("homeFurnitureLoot") && game.includes("slot.picked=true"), 'Home furniture must provide searchable, persistent loot');
assert.ok(game.includes("homeRestedDay[b.id]===state.day") && game.includes("state.hp=Math.min(100,state.hp+25)"), 'Beds must restore health once per in-game day and persist rest usage');
assert.ok(game.includes("homeWorkbenchDay[b.id]===state.day") && game.includes("state.weaponDurability+35"), 'Home workbenches must repair weapon durability with resources and a daily limit');
assert.ok(game.includes("homeRadioDay[b.id]===state.day") && game.includes("activeWaypoint={name:'Радиосигнал · припасы'"), 'Home radios must reveal a nearby unsearched supply cache and save its waypoint');
assert.ok(game.includes("homeFurnitureLoot,homeRestedDay,homeWorkbenchDay,homeRadioDay"), 'Home furniture, rest, repair and radio progress must persist in existing saves');

assert.ok(game.includes('const baseStructures=') && game.includes('function openBaseConstruction()') && game.includes('function drawBaseStructures()'), 'Modular base construction must persist and expose buildable structures');
assert.ok(game.includes("type==='wall'") && game.includes("type==='floor'") && game.includes("type==='door'") && game.includes("type==='storage'") && game.includes("type==='generator'"), 'Base construction must include walls, floors, doors, storage and generators');
assert.ok(game.includes('function drawUniqueInteriorLayout(b,floor)') && game.includes('function interactUniqueInterior(b,floor,d)'), 'Specialized interiors must have distinct layouts and persistent exploration rewards');
assert.ok(game.includes('function progressStoryArc(kind,amount=1)') && game.includes('function openStoryBoard()') && game.includes("progressStoryArc('explore',1)"), 'Three-stage persistent survivor story arc must track kills, salvage and interior exploration');
assert.ok(game.includes('function interactBaseStructure()') && game.includes("b.type==='storage'") && game.includes("b.type==='generator'") && game.includes("b.open=!b.open"), 'Base doors, storage and generators must be interactive');
assert.ok(game.includes('function updateBaseStructureRaid(now)') && game.includes('base-structure-damaged') && game.includes('МОДУЛЬ БАЗЫ'), 'Zombie raids must damage and destroy modular base structures and synchronize in co-op');
assert.ok(game.includes('Ремонт требует 2 дерева и 1 металл') && game.includes('base-structure-built'), 'Base modules must be repairable and their placement must synchronize');
assert.ok(game.includes("'reinforcedWall','gate','farm','waterCollector','watchtower'") && game.includes('function drawBaseStructure(b,ghost=false,valid=true)'), 'Expanded base modules must be saved and have detailed in-game renderers');
assert.ok(game.includes('function drawUniqueInteriorLayout(b,floor)') && game.includes('SPECIMEN ') && game.includes('ДОКАЗАТЕЛЬСТВА'), 'Specialist interiors must render detailed props, signage and room dressing');
assert.ok(game.includes('baseFacilityTick') && game.includes('Грядка дала урожай') && game.includes('Сборщик наполнил резервуар') && game.includes('Сторожевая вышка уничтожила заражённого'), 'Powered base facilities must produce food, water and automated defense');
assert.ok(game.includes('Двойные ворота') && game.includes('Бронированная стена') && game.includes('Сторожевая вышка'), 'Expanded base construction options must be visible in the construction menu');
console.log('Apocalypse deep-audit tests passed: runtime boot/frame, corrupt saves, storage failure, survival systems, settings/HUD, co-op settlement sync, HTML assets, safe respawn, PC port, and unchanged movement.');

// Release guard: ensure the CC0 radio bulletin and recorded zombie vocal variants are wired into cinematic playback.

assert.ok(fs.readFileSync(path.join(root, 'app/src/main/java/com/skyrealm/hub/MainActivity.java'), 'utf8').includes('TextToSpeech') && fs.readFileSync(path.join(root, 'tools/Install-Russian-Voice-Windows.ps1'), 'utf8').includes('Language.TextToSpeech~~~ru-RU'), 'Android native TTS bridge and Windows Russian Text-to-Speech installer must be present');


assert.ok(game.includes("skillXP:whole(saved.skillXP") && game.includes("skillLevels:{combat:") && game.includes("function openSkillTree()"), 'Three persistent skill specializations must be available');
assert.ok(game.includes("function openWeaponBench()") && game.includes("function upgradeWeaponMod(kind)") && game.includes("optic") && game.includes("barrel") && game.includes("grip"), 'Weapon optics, barrel and grip upgrades must be implemented');
assert.ok(game.includes("function openFieldCrafting()") && game.includes("function craftAdvancedItem(kind)") && game.includes("injector:{cost:") && game.includes("plate:{cost:"), 'Advanced equipment crafting recipes must be available');
assert.ok(game.includes("function openDefenseConsole()") && game.includes("function updateBaseDefense(now)") && game.includes("function drawBaseDefense()"), 'Base alarm and automatic turret must be implemented');
assert.ok(game.includes("alpha:[520,46,21]") && game.includes("type==='alpha-hunt'") && game.includes("z.kind==='alpha'") && game.includes("Удар Альфы!") && game.includes("source==='alpha-hunt'"), 'Rare Alpha hunt event must spawn a persistent boss with an area attack and unique reward');
assert.ok(game.includes("baseDefenseLevel:state.baseDefenseLevel") && game.includes("defenseAmmo:state.defenseAmmo"), 'Co-op world snapshots must synchronize base defense state');
assert.ok(game.includes("site.source==='alpha-hunt'?'ОХОТА: АЛЬФА'") && game.includes("state.weaponParts+=2;state.medInjector++"), 'Alpha hunt must have a distinct world marker and reward');
assert.ok(game.includes("function installApocalypseVisualRemaster()") && game.includes("const oldTree=tree") && game.includes("const oldZombies=drawZombies") && game.includes("const oldBuilding=building"), 'Visual remaster must cover world geometry, trees, buildings and infected');

assert.ok(game.includes("function updateCampaign(now)") && game.includes("function interactCampaign()"), 'Long multi-stage survivor operation must update and interact');
assert.ok(game.includes("campaign.wave<7") && game.includes("Date.now()+150000") && game.includes("campaign-extract") && game.includes("campaign-rescue"), 'Long operation must contain timed defense waves, a rescue branch and an extraction finale');
assert.ok(game.includes("function chooseCampaignPath(choice)") && game.includes("campaign.choice=choice") && game.includes("campaign.rescued=true") && game.includes("campaign.ending='hardline'"), 'Story decisions must branch into distinct rescue and hardline endings');
assert.ok(html.includes('id="campaignChoiceModal"') && html.includes('id="campaignRescueChoice"') && html.includes('id="campaignAbandonChoice"'), 'Story branch must provide in-game choice controls');
assert.ok(game.includes("campaign-cache") && game.includes("campaign-relay") && game.includes("campaign-convoy"), 'Long operation must include scavenging, relay repair and convoy objectives');
assert.ok(game.includes("longCampaign:campaign") && game.includes("campaignObjectiveText()"), 'Long operation progress must persist and appear in the objective HUD');
assert.ok(game.includes("function campaignBeginInvestigation()") && game.includes("campaign-intel") && game.includes("campaign-frequency") && game.includes("campaign-archive"), 'Rescue branch must expand into a non-combat investigation, radio restoration and archive finale');
assert.ok(game.includes("intel:whole(c.intel,0,0,3)") && game.includes("tunedNodes:whole(c.tunedNodes,0,0,3)"), 'Investigation and radio progress must persist across saves');
assert.ok(game.includes("function chooseCampaignFrequency(freq)") && game.includes("[87.4,103.2,91.6]"), 'Radio restoration must be a clue-based frequency puzzle with three distinct correct channels');
assert.ok(html.includes('id="campaignFrequencyModal"') && html.includes('id="campaignFrequency874"') && html.includes('id="campaignFrequency916"') && html.includes('id="campaignFrequency1032"'), 'Radio tuning must expose three selectable in-game frequencies');
assert.ok(html.includes('id="campaignArchiveModal"') && html.includes('id="campaignBroadcastChoice"') && html.includes('id="campaignEncryptChoice"'), 'Archive investigation must offer two in-game story decisions');
assert.ok(game.includes("const detailCount=Math.round(count*1.32)") && game.includes("gy+=36"), 'World material textures must receive additional procedural detail');
assert.ok(game.includes('for(let i=0;i<(balanced?18:32);i++)') && game.includes('const moving=Math.hypot(moveX,moveY)>.08') && game.includes('Layer 2: directional wind streaks'), 'World ambience must include quality-scaled particles, wind streaks and animated footfalls');
assert.ok(game.includes('third micro-detail pass adds chipped paint') && html.includes('Visual polish: clearer surfaces') && html.includes('min-width:44px') && html.includes('focus-visible'), 'Material microdetail and accessible responsive control feedback must be present');

assert.ok(game.includes("function campaignSpawnBeaconParts()") && game.includes("campaign-beacon-part"), "Beacon must spawn three distinct repair nodes");
assert.ok(game.includes("ПОДКЛЮЧИТЬ КАБЕЛЬ") && game.includes("ЗАМЕНИТЬ ПРЕДОХРАНИТЕЛЬ") && game.includes("ВЫРОВНЯТЬ АНТЕННУ"), "Beacon repair must require cable, fuse and antenna tasks");
assert.ok(game.includes("campaign.beaconParts") && game.includes("campaign-beacon-active") && game.includes("campaign.beaconActivated"), "Beacon repair progress and activated landmark must persist");
assert.ok(game.includes("campaignSpawnBeaconParts();save();") && game.includes("campaign.beaconParts<3"), "Older active campaign saves must recover missing beacon repair points");
assert.ok(game.includes("ctx.shadowColor='#7be8ff'") && game.includes("ctx.lineTo(-150,-250)"), "Beacon must render a detailed antenna and activation beam");
assert.ok(game.includes("function drawSupplyCrate("), 'Supply crates must use a dedicated dimensional renderer');
assert.ok(game.includes("drawSupplyCrate(lootX,lootY,1.22") && game.includes("drawSupplyCrate(281,294,1.18"), 'Building loot containers must use the enlarged detailed crate model');
assert.ok(game.includes("drawSupplyCrate(s.x,s.y,1.24,'field',false)"), 'Radio supply cache must use the same detailed crate model');
assert.ok(game.includes("if(opened)") && game.includes("variant==='medical'?'MED':variant==='military'?'MIL':'SUPPLY'") && game.includes("ctx.arc(xx,yy,1.4"), 'Crates must show an open searched state, type-specific markings and visible metal fasteners');

assert.ok(game.includes("function openLootTransfer(") && game.includes("pointerdown") && game.includes("pointermove") && game.includes("pointerup") && game.includes("elementFromPoint"), 'Container loot must use real pointer drag-and-drop for mouse and touch');
assert.ok(game.includes("function buildingContainerItems(") && game.includes("entry.contents=entry.picked?[]") && game.includes("?'rare':'uncommon'"), 'Building crates must contain multiple persistent items with rarity tiers');
assert.ok(game.includes("supplyShelterContents") && game.includes("shelterLoot") && game.includes("Тайник выживших"), 'Supply caches and survivor shelters must keep individually transferable loot');
assert.ok(game.includes("slot:'loot-item'") && game.includes("p.itemIndex") && game.includes("drop-ready"), 'Partial crate looting must sync per item in co-op and highlight the backpack drop zone');

assert.ok(game.includes("explorationCacheContents") && game.includes("Частично обысканный тайник") && game.includes("supplyShelterContents"), 'Exploration and survivor caches must preserve partial manual looting');
assert.ok(game.includes("drop.loot") && game.includes("Аварийная поставка") && game.includes("site.loot") && game.includes("Операция · "), 'Airdrops and story-operation containers must use manual item transfer');
assert.ok(game.includes("entry.contents.every(v=>v.picked)") && game.includes("itemIndex:loot.index"), 'Multi-item crates must persist partial progress and sync each taken item');

assert.ok(game.includes("const combatVisualEffects=[]") && game.includes("function drawCombatVisualEffects()"), 'Combat visual feedback must be available');
assert.ok(game.includes("type:'shot'") && game.includes("type==='impact'") && game.includes("type:hitPart==='head'") && game.includes("mode==='kick'?'kick'") && game.includes("type==='melee'||e.type==='kick'"), 'Ranged shots, impacts and melee swings must have distinct effects');
assert.ok(game.includes("function installCombatVisualPolish()") && game.includes("ctx.shadowBlur=13"), 'Held firearms must receive detailed procedural weapon polish and muzzle flash');

assert.ok(game.includes("function fireProjectile()") && game.includes("const combatProjectiles=[]") && game.includes("function updateCombatProjectiles(dt,now)"), 'Projectile firearms must use real moving bullets');
assert.ok(game.includes("function reloadWeapon()") && game.includes("magAmmo:whole(saved.magAmmo") && game.includes("weaponMagazineSize"), 'Weapon magazines, reserve ammunition and reload state must persist');
assert.ok(game.includes("function combatTarget()") && game.includes("combatAimHeld") && game.includes("function drawCombatReticle()"), 'Mouse and mobile aiming controls must be wired');
assert.ok(game.includes("z.hitReactUntil=now+(hitPart==='head'?520:360)") && game.includes("z.knockX") && game.includes("function drawCombatProjectiles()"), 'Projectile hits must animate impact, stagger and knockback');
assert.ok(game.includes('function drawCombatCasings()') && game.includes('combatCameraKick') && game.includes("function playCombatSound(kind,suppressed=false)"), 'Weapon shots must eject casings, shake the camera and play responsive sounds');
assert.ok(game.includes("hitPart==='head'?2.15") && game.includes("z.legInjuryUntil") && game.includes("suppressor:whole(saved.weaponMods?.suppressor,0,0,1)"), 'Headshots, limb injuries and craftable suppressors must be implemented');
assert.ok(game.includes("r.weapon==='shotgun'") && game.includes("r.nextShellAt=now+390") && game.includes("weaponMods.suppressor"), 'Shotgun must reload shell-by-shell and suppressor must affect shots');
assert.ok(game.includes('const deadZombies=[]') && game.includes('function drawDeadZombieAnimations()') && game.includes('z.deathAngle'), 'Killed infected must have animated falls, temporary corpses and fade-out');
assert.ok(game.includes('z.crawling=true') && game.includes('z.armInjuryUntil') && game.includes('z.headSnapUntil') && game.includes('function drawZombies()'), 'Leg injuries must trigger crawling and arm/head injuries must animate separately');
assert.ok(game.includes('z.attackPowerScale||1') && game.includes('injuredArm&&side===1') && game.includes('injuredLeg?5:0'), 'Injured infected must show impaired movement and weaker attacks');
assert.ok(html.includes('id="reloadTouch"') && html.includes('id="aimTouch"') && html.includes('id="combatAmmoHud"'), 'Mobile combat controls and magazine HUD must exist');

assert.ok(game.includes("function attack(){") && game.includes("meleeComboIndex") && game.includes("['slash','stab','kick']"), 'Knife melee must support a three-step combo');
assert.ok(game.includes("const canFinish=hasKnife") && game.includes("target.kind!=='alpha'") && game.includes("function playCombatSound(kind,suppressed=false)") && game.includes("takedown:[68,24,.42"), 'Close-range finishers must be gated and have their own sound profile');
assert.ok(game.includes("type==='kick'") && game.includes("act==='takedown'") && game.includes("z.stunnedUntil>now"), 'Kicks and finishers must have animation effects and temporarily interrupt infected attacks');


assert.ok(game.includes("const missionGivers=[") && game.includes("function drawMissionGivers()") && game.includes("drawMissionGivers();"), 'Mission-giver NPCs must be rendered in the world');
assert.ok(game.includes("function openMissionGiver(g)") && game.includes("function interactMissionGiver()") && game.includes("if(interactMissionGiver())return;"), 'Mission-giver NPCs must open their mission interactions');
assert.ok(game.includes("function campaignMissionTarget()") && game.includes("function acceptCampaignMission()") && game.includes("campaignMissionTarget()"), 'The long operation must be startable and resumable from its engineer NPC');
assert.ok(game.includes("m.fillText(g.letter,x,y+.5)") && game.includes("for(const g of missionGivers)"), 'Mission contacts must have persistent GTA-style map icons');
assert.ok(game.includes("mission==='story'") && game.includes("mission==='signal'") && game.includes("mission==='salvage'") && game.includes("mission==='cache'"), 'Existing story, crash, salvage and exploration missions must be discoverable from NPCs');
assert.ok(game.includes("function openCommanderBoard(contactName='Соколов')") && game.includes("g.mission==='command'"), 'The military NPC must offer the existing daily contract with its own dialogue');
assert.ok(game.includes("id:'northCommander'") && game.includes("id:'northMedic'") && game.includes("id:'southMedic'") && game.includes("id:'southCommander'"), 'Mission contacts must cover northern and southern map regions');
assert.ok(game.includes("const contact=missionGivers.map") && game.includes("Маршрут к контакту"), 'Clicking a mission letter on the map must set a route to that NPC');
assert.ok(game.includes("showPanel(g.name+' · механик-разборщик'") && game.includes("showPanel(g.name+' · следопыт'") && game.includes("openCommanderBoard(g.name)"), 'Each mission contact must keep its own name in dialogue, including northern and southern counterparts');
