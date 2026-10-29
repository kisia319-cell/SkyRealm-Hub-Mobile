(() => {
  const canvas = document.getElementById('world');
  const ctx = canvas.getContext('2d', { alpha: false });
  const TILE = 32; let COLS = 90, ROWS = 70;
  let width = 0, height = 0, dpr = 1, last = performance.now(), paused = true;
  let inMainMenu = true;
  let settingsOpenedFromMainMenu = false;
  const keys = new Set();
  const DEFAULT_GAME_SETTINGS = { resolution:'1280x720', windowMode:'windowed', graphicsQuality:'medium', uiScale:'100', showVitals:true, showQuest:true, showControls:true, showInventory:true, showMinimap:true, earlyMonsterSpawn:false, hudLayout:'default', adminMode:false, moderatorMode:false };
  let gameSettings = readInitialSettings();
  const world = { trees: [], rocks: [], flowers: [], fireflies: [], signs: [], fences: [] };
  const player = { x: 21 * TILE, y: 26 * TILE, vx: 0, vy: 0, face: 'down', frame: 0, hp: 100, stamina: 84 };
  const DEFAULT_PLAYER_APPEARANCE = {skin:'#e8b88c',hair:'#352d3d',armor:'#526fba',accent:'#9cb9ff',eye:'#26334c',face:'normal',hairStyle:'short'};
  let playerAppearance = {...DEFAULT_PLAYER_APPEARANCE};
  function applyAppearanceData(source,target=playerAppearance){if(!source||typeof source!=='object')return;for(const k of ['skin','hair','armor','accent','eye'])if(/^#[0-9a-f]{6}$/i.test(source[k]||''))target[k]=source[k];if(['normal','smile','stern','visor','mask'].includes(source.face))target.face=source.face;if(['short','long','mohawk','curly','hood'].includes(source.hairStyle))target.hairStyle=source.hairStyle;}
  try { applyAppearanceData(JSON.parse(localStorage.getItem('skyrealm_character_v1')||'{}')); } catch(_) {}
  const DIFFICULTIES = {
    easy:{id:'easy',name:'Легко',rank:1,cols:90,rows:70,bossHp:500,bossDamage:30,bossInterval:1.5,bossSpeed:18,monsterHp:.72,monsterDamage:.62,monsterSpawn:1.15,shop:{buy:{Камень:300,Уголь:900,Железо:2400},sell:{wood:125,leaves:50,meat:90}},chests:{crystal:.25,potion:.28}},
    medium:{id:'medium',name:'Средняя',rank:2,cols:110,rows:82,bossHp:1000,bossDamage:45,bossInterval:1.25,bossSpeed:22,monsterHp:1,monsterDamage:1,monsterSpawn:1,shop:{buy:{Камень:450,Уголь:1200,Железо:3600},sell:{wood:175,leaves:75,meat:125}},chests:{crystal:.35,potion:.25}},
    hard:{id:'hard',name:'Сложно',rank:3,cols:130,rows:96,bossHp:2000,bossDamage:65,bossInterval:1.05,bossSpeed:28,monsterHp:1.4,monsterDamage:1.45,monsterSpawn:.82,shop:{buy:{Камень:700,Уголь:1800,Железо:5200},sell:{wood:225,leaves:100,meat:175}},chests:{crystal:.45,potion:.22}},
    hell:{id:'hell',name:'Жар',rank:4,cols:150,rows:110,bossHp:4000,bossDamage:90,bossInterval:.85,bossSpeed:34,monsterHp:1.9,monsterDamage:2,monsterSpawn:.68,shop:{buy:{Камень:1000,Уголь:2600,Железо:8000},sell:{wood:275,leaves:125,meat:225}},chests:{crystal:.55,potion:.2}}
  };
  let currentDifficulty='medium',pendingWorldId=null,difficultyMigrationPending=false;
  let bedSpawn={x:36*TILE+40,y:15*TILE+154};
  function difficultyConfig(){return DIFFICULTIES[currentDifficulty]||DIFFICULTIES.medium;}
  function bossMaxHp(){return difficultyConfig().bossHp;}
  function setWorldDifficulty(id){currentDifficulty=DIFFICULTIES[id]?id:'medium';const cfg=difficultyConfig();COLS=cfg.cols;ROWS=cfg.rows;}
  function configureTreasureChests(){treasureChests.length=0;treasureChests.push({id:'forest',x:18*TILE+16,y:28*TILE+16,opened:false},{id:'lake',x:46*TILE+16,y:48*TILE+16,opened:false},{id:'ridge',x:82*TILE+16,y:27*TILE+16,opened:false});const extra={easy:0,medium:1,hard:2,hell:4}[currentDifficulty]||0;for(let i=0;i<extra;i++){const tx=COLS-9-(i%2)*11,ty=ROWS-9-Math.floor(i/2)*11;treasureChests.push({id:'frontier-'+i,x:tx*TILE+16,y:ty*TILE+16,opened:false});}}
  const WORLD_LIST_KEY = 'skyrealm_worlds_v1';
  const LEGACY_SAVE_KEY = 'skyrealm_game_save_v1';
  let saveKey = LEGACY_SAVE_KEY;
  let currentWorldId = null;
  let currentWorldName = '';
  let renameWorldId = null;
  let discovered = false;
  let fullMapOpen = false;
  let panelReturnToPause = false;
  let immortal = false;
  const resourceItems = [
    {name:'Дерево',icon:'🪵',count:0,description:'Материал для будущего строительства.'},
    {name:'Камень',icon:'🪨',count:0,description:'Прочный материал из лесной долины.'},
    {name:'Кристалл',icon:'💎',count:0,description:'Редкий сияющий ресурс.'},
    {name:'Зелье',icon:'🧪',count:0,description:'Зелье, выданное администратором.'},
    {name:'Монеты',icon:'🪙',count:0,description:'Монеты для будущей экономики.'},
    {name:'Уголь',icon:'⚫',count:0,description:'Руда из шахты.'},
    {name:'Железо',icon:'⛓️',count:0,description:'Руда из шахты.'}
  ];
  let exploredCells = new Set();
  // Hash only hides the prototype password from casual reading; client-side checks are not secure admin auth.
  const ADMIN_PASSWORD_SHA256 = '98afe2c58807589c4c816138a1efd5f4e3fdb06a5dc3e0f4a4f7a0371212198c';
  let hintTimer = 0;
  let saveTimer = 0;
  let signDialogOpen = false;
  let inventoryDialogOpen = false;
  let inventoryTab = 'items';
  let questPanelVisible = false;
  let selectedSlot = 1;
  // Game clock: one real second advances one in-game minute; pause stops the clock.
  const GAME_MINUTES_PER_DAY = 24 * 60;
  const DAWN_MINUTE = 6 * 60;
  const NIGHT_MINUTE = 20 * 60;
  let gameMinuteTotal = 8 * 60;
  let survivedNights = 0;
  let lastDawnMarker = Math.floor((gameMinuteTotal - DAWN_MINUTE) / GAME_MINUTES_PER_DAY);
  let lastClockMinute = -1;
  let wasNight = false;
  let monsterSpawnTimer = 0;
  let damageToastTimer = 0;
  let minimapTimer = 0;
  let hunger = 100;
  let hungerElapsedMinutes = 0;
  let skipDayRealSeconds = 300;
  let sheepSpawned = false;
  let sheepSpawnTimer = 0;
  let playerAttackCooldown = 0;
  let attackAnimTimer=0, weatherMode='clear', weatherTimer=75, weatherFlash=0, ambientTime=0;
  const visualParticles=[];
  let sprintExhaustionToast=0;
  let inHouse = false;
  let workbenchDialogOpen = false;
  let sleeping = false;
  let sleepSeconds = 0;
  let questStage = 0;
  let workbenchUsed = false;
  let mineMode=false, mineLevel=1, mineRocks=[], mineSeed=0, mineTileX=62, mineTileY=43, worldEarlyMonsters=false, mineHoverIndex=-1, minePlayerX=86, minePlayerY=0;
  let caveMode=false, caveReturn={x:player.x,y:player.y}, caveChestOpened=false;
  let caveBossDefeated=false,caveBossHp=260,caveBossX=0,caveBossY=0,caveBossAttackTimer=2.5,caveBossFlash=0;
  let equipment={weapon:'Деревянный меч',armor:'',helmet:'',boots:'',amulet:''};
  let weaponUpgrades={}, armorUpgrade=0, anvilCrafted=false;
  let skillPoints=0,skills={warrior:0,miner:0,scout:0};
  let adventureQuestProgress={hunt:0,mining:0,harvest:0};
  let activeStorageStructure=null, storageDialogOpen=false, avatarEntryMode=false;
  let playerLevel=1, playerXP=0, dodgeTimer=0, dodgeCooldown=0, dodgeVX=0, dodgeVY=0, dodgeFacing='down';
  const treasureChests=[];
  let tradeWorldMode=false, tradeEntranceX=17, tradeEntranceY=47, footstepTimer=0, walletCents=0, shopDialogOpen=false, activeShop='sell';
  const SELL_SHOP={x:25,y:47}, BUY_SHOP={x:31,y:47};
  const ORE_PRICES={Камень:15,Уголь:50,Железо:180};
  let audioContext=null;
  function playSound(kind='tap'){try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;if(!audioContext)audioContext=new AC();if(audioContext.state==='suspended')audioContext.resume();const now=audioContext.currentTime,osc=audioContext.createOscillator(),gain=audioContext.createGain();const presets={wood:[150,85,'triangle',.12],stone:[280,115,'square',.09],iron:[620,240,'triangle',.14],coal:[190,130,'square',.1],step:[105,70,'sine',.045],hit:[230,95,'sawtooth',.07],sheep:[500,380,'sine',.1],craft:[390,780,'triangle',.18],coin:[900,1250,'sine',.12],portal:[180,660,'sine',.32],tap:[350,240,'sine',.06]};const q=presets[kind]||presets.tap;osc.type=q[2];osc.frequency.setValueAtTime(q[0],now);osc.frequency.exponentialRampToValueAtTime(Math.max(40,q[1]),now+q[3]);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.07,now+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+q[3]);osc.connect(gain);gain.connect(audioContext.destination);osc.start(now);osc.stop(now+q[3]+.02);}catch(_){}}
  let furnaceCrafted=false;
  let houseLevel=1;
  let placedStructures=[];
  let farmCrops=[];
  const lootDrops=[];
  let mineUpgradeToastTimer=0;
  let enteredPlacedHouse=null;
  let tutorialStep = 0;
  const tutorialSteps = [
    {title:'Шаг 1 из 5 · Движение',key:'W A S D',text:'Зажми W, A, S или D, чтобы пройтись по долине.',done:()=>tutorialMoveSeen},
    {title:'Шаг 2 из 5 · Действие',key:'E',text:'Подойди к дорожному знаку и нажми E.',done:()=>discovered},
    {title:'Шаг 3 из 5 · Инвентарь',key:'I',text:'Открой инвентарь и посмотри предметы.',done:()=>tutorialInventorySeen},
    {title:'Шаг 4 из 5 · Задания',key:'I → Задания',text:'В инвентаре открой вкладку «Задания».',done:()=>tutorialQuestSeen},
    {title:'Шаг 5 из 5 · Исследование',key:'Space / L',text:'Пробел — атака, H — лечебное зелье, L — карта. Исследуй мир!',done:()=>tutorialCombatSeen}
  ];
  let tutorialMoveSeen=false, tutorialInventorySeen=false, tutorialQuestSeen=false, tutorialCombatSeen=false;
  const sheep = [];
  const monsters = [];
  const minimapCanvas = document.getElementById('minimap');
  const minimapCtx = minimapCanvas ? minimapCanvas.getContext('2d') : null;
  // Only items the character currently owns are shown. Resources with count 0 stay hidden.
  const inventoryItems = [
    { name: 'Деревянный меч', icon: '🗡️', count: 1, description: 'Простое оружие. Наносит 20 урона.' },
    { name: 'Железный меч', icon: '⚔️', count: 0, description: 'Улучшенное оружие. Наносит 35 урона монстрам.' },
    { name: 'Огненный меч', icon: '🔥', count: 0, description: 'Редкое оружие кузницы. Наносит 50 базового урона и оставляет огненные искры.' },
    { name: 'Стальной меч', icon: '⚔️', count: 0, description: 'Крепкий меч. Наносит 62 базового урона.' },
    { name: 'Ледяной посох', icon: '🪄', count: 0, description: 'Магическое оружие: атакует монстров на расстоянии до 230 пикселей.' },
    { name: 'Молниеносное копьё', icon: '🔱', count: 0, description: 'Редкое оружие с дальностью 125 и высоким уроном.' },
    { name: 'Кирка мастера', icon: '⛏️', count: 0, description: 'Продвинутая кирка. Разрушает залежи одним ударом.' },
    { name: 'Кожаная броня', icon: '🦺', count: 0, description: 'Снижает урон от монстров на 40%, пока надета.' },
    { name: 'Броня стража', icon: '🛡️', count: 0, description: 'Тяжёлая броня: снижает получаемый урон на 52%.' },
    { name: 'Мантия мага', icon: '🥋', count: 0, description: 'Мантия: снижает урон на 25% и усиливает посох.' },
    { name: 'Наковальня', icon: '⚒️', count: 0, description: 'Создай наковальню, чтобы разблокировать улучшение оружия и брони.' },
    { name: 'Топор', icon: '🪓', count: 1, description: 'Ударь дерево 5 раз, чтобы получить древесину, листья и палку.' },
    { name: 'Кирка', icon: '⛏️', count: 1, description: 'Выбери кирку, войди в шахту и нажми по залежи левой кнопкой мыши 2 раза.' },
    { name: 'Древесина', icon: '🪵', count: 0, description: '7 штук выпадает при рубке дерева.' },
    { name: 'Листья', icon: '🍃', count: 0, description: '3 листка выпадает при рубке дерева.' },
    { name: 'Палка', icon: '🪵', count: 0, description: 'Одна палка выпадает при рубке дерева.' },
    { name: 'Малое зелье', icon: '🧪', count: 2, description: 'Небольшой запас целебного зелья.' },
    { name: 'Лечебная трава', icon: '🌿', count: 1, description: 'Ароматная трава, которую можно будет использовать позже.' },
    { name: 'Старая записка', icon: '📜', count: 1, description: 'Записка, найденная перед началом путешествия.' },
    { name: 'Кость', icon: '🦴', count: 0, description: 'Выпадает со скелетов и тяжёлых монстров.' },
    { name: 'Череп', icon: '💀', count: 0, description: 'Редкая добыча со скелетов.' },
    { name: 'Теневая эссенция', icon: '🌑', count: 0, description: 'Сгусток энергии теневого монстра.' },
    { name: 'Ядро духа', icon: '🔷', count: 0, description: 'Светящееся ядро болотного духа.' },
    { name: 'Осколок бомбы', icon: '💣', count: 0, description: 'Нестабильный фрагмент взрывного монстра.' },
    { name: 'Мясо', icon: '🍖', count: 0, description: 'Мясо овцы. Восстанавливает 10 голода.' },
    { name: 'Печь', icon: '🔥', count: 0, description: 'Выбери печь в нижнем инвентаре и щёлкни по свободному месту, чтобы поставить её.' },
    { name: 'Комплект дома', icon: '🏠', count: 0, description: 'Выбери комплект дома и щёлкни по свободному месту, чтобы построить дополнительный дом.' },
    { name: 'Факел', icon: '🕯️', count: 0, description: 'Декоративный факел для размещения на земле.' },
    { name: 'Бинт', icon: '🩹', count: 0, description: 'Используй бинт клавишей B, чтобы восстановить 20 здоровья.' },
    { name: 'Улучшенная кирка', icon: '⛏️', count: 0, description: 'Добывает руду за один удар. Создаётся из железа и древесины.' },
    { name: 'Угольный блок', icon: '🪨', count: 0, description: 'Декоративный блок для размещения на земле.' },
    { name: 'Шлем лесника', icon: '🪖', count: 0, description: 'Снижает получаемый урон на 15%, если надет.' },
    { name: 'Сапоги странника', icon: '🥾', count: 0, description: 'Повышают скорость бега, если надеты.' },
    { name: 'Амулет стража', icon: '📿', count: 0, description: 'Уменьшает получаемый урон ещё на 10%, если надет.' },
    { name: 'Сундук-хранилище', icon: '📦', count: 0, description: 'Можно разместить на земле и складывать в него вещи.' },
    { name: 'Грядка с семенами', icon: '🌱', count: 0, description: 'Размести на земле. Через некоторое время вырастет урожай.' },
    { name: 'Урожай', icon: '🌾', count: 0, description: 'Собранный урожай для продажи или будущих рецептов.' },
    { name: 'Пустынный хитин', icon: '🦂', count: 0, description: 'Плотный панцирь пустынного скорпиона.' },
    ...resourceItems];
  const starterItemCounts = inventoryItems.map(item => ({name:item.name,count:item.count}));

  function normalizeGameSettings(value = {}) {
    const s = {...DEFAULT_GAME_SETTINGS, ...(value && typeof value === 'object' ? value : {})};
    if (!['1280x720','1600x900','1920x1080','1280x960','1440x900'].includes(s.resolution)) s.resolution = DEFAULT_GAME_SETTINGS.resolution;
    if (!['windowed','fullscreen'].includes(s.windowMode)) s.windowMode = DEFAULT_GAME_SETTINGS.windowMode;
    if (!['low','medium','high'].includes(s.graphicsQuality)) s.graphicsQuality = DEFAULT_GAME_SETTINGS.graphicsQuality;
    if (!['85','100','115'].includes(String(s.uiScale))) s.uiScale = '100'; else s.uiScale = String(s.uiScale);
    ['showVitals','showQuest','showControls','showInventory','showMinimap'].forEach(k => s[k] = s[k] !== false);
    s.adminMode = s.adminMode === true;
    s.moderatorMode = s.moderatorMode === true;
    return s;
  }
  function readInitialSettings() {
    try {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get('settings');
      if (fromUrl) return normalizeGameSettings(JSON.parse(fromUrl));
      return normalizeGameSettings(JSON.parse(localStorage.getItem('skyrealm_game_preferences') || '{}'));
    } catch (_) { return {...DEFAULT_GAME_SETTINGS}; }
  }
  function hash(x, y) { let n = x * 374761393 + y * 668265263 + 1442695041; n = (n ^ (n >>> 13)) * 1274126177; return ((n ^ (n >>> 16)) >>> 0) / 4294967295; }
  function setupWorld() {
    // Rebuild deterministic local geometry for the selected world size.
    world.trees.length=0;world.rocks.length=0;world.flowers.length=0;world.fireflies.length=0;world.signs.length=0;world.fences.length=0;
    for (let y = 2; y < ROWS - 2; y++) for (let x = 2; x < COLS - 2; x++) {
      const h = hash(x, y);
      if (h > 0.957 && !nearPath(x, y) && !nearVillage(x, y)) world.trees.push({ x: x * TILE + 16, y: y * TILE + 17, size: 0.85 + hash(y, x) * .42, tint: Math.floor(hash(x + 44, y) * 3) });
      if (h < .013 && !nearPath(x, y)) world.rocks.push({ x: x * TILE + 16, y: y * TILE + 21, s: 0.7 + hash(y, x + 4) * .65 });
      if (h > .53 && h < .552) world.flowers.push({x:x*TILE+hash(x,y+10)*25+3,y:y*TILE+hash(x+3,y)*26+3,c:Math.floor(hash(y+7,x)*4)});
      if (h > .79 && h < .792) world.fireflies.push({x:x*TILE+hash(x+19,y)*TILE,y:y*TILE+hash(x,y+19)*TILE,phase:hash(x+1,y+3)*6.28});
    }
    world.signs.push({ x: 34*TILE+16, y: 22*TILE+12 });
    // A tiny village fence around a cabin.
    for (let x=34;x<=39;x++) { world.fences.push({x:x*TILE+16,y:17*TILE+16}); world.fences.push({x:x*TILE+16,y:21*TILE+16}); }
    for (let y=18;y<=20;y++) { if(y!==20) world.fences.push({x:34*TILE+16,y:y*TILE+16}); world.fences.push({x:39*TILE+16,y:y*TILE+16}); }
  }
  function nearPath(x,y){return (y>24&&y<28&&x>3&&x<38)||(Math.abs((x+y)-48)<2&&x>27&&x<38&&y>13&&y<25)||(x>34&&x<41&&y>15&&y<22);}
  function nearVillage(x,y){return x>31&&x<42&&y>13&&y<24;}
  function resize(){const r=canvas.getBoundingClientRect();const deviceDpr=window.devicePixelRatio||1;const quality=gameSettings.graphicsQuality;dpr=quality==='low'?Math.max(.65,Math.min(deviceDpr,1)*.72):quality==='high'?Math.min(2,deviceDpr*1.45):Math.min(deviceDpr,1.15);width=r.width;height=r.height;canvas.width=Math.max(1,Math.floor(width*dpr));canvas.height=Math.max(1,Math.floor(height*dpr));ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=quality!=='low';}
  function roundedRect(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}}
  function waterAt(x,y){const cx=52,cy=36,dx=(x-cx)/6.5,dy=(y-cy)/4.3;return dx*dx+dy*dy<1;}
  function pathAt(x,y){if(y>=25&&y<=26&&x>=3&&x<=36)return true;let t=x+y; if(x>=27&&x<=37&&y>=14&&y<=24&&Math.abs(t-49)<=1.2)return true;return x>=35&&x<=40&&y>=17&&y<=21;}
  function biomeAt(x,y){if(x>65&&y<17)return 'snow';if(x<17&&y>49)return 'desert';if(x>68&&y>45)return 'blight';return 'forest';}
  function biomeNameAt(x,y){return ({forest:'Лесная долина',snow:'Снежный рубеж',desert:'Песчаная пустошь',blight:'Заражённые земли'})[biomeAt(x,y)]||'Лесная долина';}
  function drawGrass(x,y,sx,sy){const h=hash(x,y),biome=biomeAt(x,y);const palettes={forest:['#285b43','#2a6047','#285840','#397451','#306849','#4d8254'],snow:['#b9cbd0','#a7bdc7','#c3d4d8','#d9e7e9','#afc8d1','#f0f6f6'],desert:['#b99a58','#c4a767','#ad8d4d','#d3b875','#b89a5d','#e2c981'],blight:['#3d493c','#354438','#46503a','#52603f','#43523b','#7f8a48']};const p=palettes[biome];ctx.fillStyle=h>.5?p[0]:h>.2?p[1]:p[2];ctx.fillRect(sx,sy,TILE,TILE);if(gameSettings.graphicsQuality!=='low'){ctx.fillStyle=p[3];ctx.fillRect(sx+3+(h*9|0),sy+5,TILE*.22,TILE*.12);if(h>.68){ctx.fillStyle=p[5];ctx.fillRect(sx+21,sy+19,2,5);}if(biome==='snow'&&h>.35){ctx.fillStyle='#f5fbff99';ctx.fillRect(sx+5+(h*16|0),sy+7+(h*11|0),3,2);}else if(biome==='desert'&&h>.55){ctx.fillStyle='#e9d49a';ctx.fillRect(sx+6,sy+23,7,2);}else if(biome==='blight'&&h>.72){ctx.fillStyle='#a3bf55';ctx.fillRect(sx+19,sy+8,3,3);}} }
  function drawGround(camX,camY){const x0=Math.max(0,Math.floor(camX/TILE)-1),x1=Math.min(COLS,Math.ceil((camX+width)/TILE)+1),y0=Math.max(0,Math.floor(camY/TILE)-1),y1=Math.min(ROWS,Math.ceil((camY+height)/TILE)+1);
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const sx=Math.floor(x*TILE-camX),sy=Math.floor(y*TILE-camY);drawGrass(x,y,sx,sy);if(pathAt(x,y)){ctx.fillStyle='#967c54';ctx.fillRect(sx,sy,TILE,TILE);ctx.fillStyle='#b0996d';const h=hash(x,y);ctx.fillRect(sx+4,sy+4,4,2);if(h>.3)ctx.fillRect(sx+20,sy+22,5,2);ctx.fillStyle='#806845';ctx.fillRect(sx+14,sy+12,2,2);}if(waterAt(x+.5,y+.5)){ctx.fillStyle='#246786';ctx.fillRect(sx,sy,TILE,TILE);ctx.fillStyle='#398ca0';let w=hash(x,y);if(w>.25)ctx.fillRect(sx+3,sy+7+Math.floor(w*11),10+Math.floor(w*9),2);if(w>.7)ctx.fillRect(sx+17,sy+23,8,2);}}}
  function drawPond(camX,camY){const px=52*TILE-camX,py=36*TILE-camY;const grad=ctx.createRadialGradient(px,py,30,px,py,260);grad.addColorStop(0,'#246b85');grad.addColorStop(.75,'#1a4f70');grad.addColorStop(1,'#153c5b');ctx.fillStyle=grad;ctx.beginPath();ctx.ellipse(px,py,210,138,-.18,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#71bac0';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(px-8,py-5,209,135,-.18,0,Math.PI*2);ctx.stroke();ctx.lineWidth=1;if(gameSettings.graphicsQuality!=='low')for(let i=0;i<(gameSettings.graphicsQuality==='high'?30:18);i++){const x=px-140+hash(i,2)*280,y=py-95+hash(4,i)*190;if((x-px)**2/39000+(y-py)**2/19000<.72){ctx.strokeStyle='#69b6c5aa';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+12+hash(i,1)*18,y);ctx.stroke();}}}
  function drawTree(t,camX,camY){const x=t.x-camX,y=t.y-camY,s=t.size;ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.fillStyle='#142e2a66';ctx.beginPath();ctx.ellipse(2,16,24,10,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#61462f';ctx.fillRect(-5,-3,10,24);ctx.fillStyle='#7b5937';ctx.fillRect(-2,1,3,15);const colors=[['#174536','#20583f','#2c704c'],['#23503b','#2b6645','#438050'],['#1d493b','#28664d','#367e5a']][t.tint];ctx.fillStyle=colors[0];ctx.beginPath();ctx.moveTo(0,-39);ctx.lineTo(-23,-2);ctx.lineTo(-15,2);ctx.lineTo(-28,12);ctx.lineTo(27,12);ctx.lineTo(15,-1);ctx.lineTo(23,-6);ctx.closePath();ctx.fill();ctx.fillStyle=colors[1];ctx.beginPath();ctx.moveTo(0,-35);ctx.lineTo(-17,-4);ctx.lineTo(-7,-4);ctx.lineTo(-17,6);ctx.lineTo(17,6);ctx.lineTo(7,-7);ctx.closePath();ctx.fill();ctx.fillStyle=colors[2];ctx.beginPath();ctx.moveTo(0,-29);ctx.lineTo(-7,-6);ctx.lineTo(3,-8);ctx.lineTo(12,0);ctx.lineTo(5,-16);ctx.closePath();ctx.fill();ctx.restore();}
  function drawRock(r,camX,camY){const x=r.x-camX,y=r.y-camY,s=r.s;ctx.fillStyle='#132e3766';ctx.beginPath();ctx.ellipse(x,y+8,14*s,7*s,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#657777';ctx.beginPath();ctx.moveTo(x-12*s,y+5*s);ctx.lineTo(x-10*s,y-5*s);ctx.lineTo(x-2*s,y-13*s);ctx.lineTo(x+8*s,y-10*s);ctx.lineTo(x+14*s,y+3*s);ctx.closePath();ctx.fill();ctx.fillStyle='#98aaa0';ctx.beginPath();ctx.moveTo(x-9*s,y-4*s);ctx.lineTo(x-1*s,y-11*s);ctx.lineTo(x+4*s,y-6*s);ctx.lineTo(x-1*s,y+1*s);ctx.closePath();ctx.fill();}
  function drawFlowers(camX,camY,t){for(const f of world.flowers){const x=f.x-camX,y=f.y-camY;if(x<-20||x>width+20||y<-20||y>height+20)continue;ctx.fillStyle='#22523a';ctx.fillRect(x,y,2,6);ctx.fillStyle=['#f4d77a','#d9b9ff','#f7d4d6','#a8e1ff'][f.c];ctx.fillRect(x-2,y-2,4,4);ctx.fillStyle='#fff5d5';ctx.fillRect(x,y-1,1,1);}}
  function drawCabin(camX,camY){
    const x=36*TILE-120-camX,y=15*TILE-120-camY;
    ctx.fillStyle='#102d2b88';ctx.beginPath();ctx.ellipse(x+160,y+300,168,28,0,0,Math.PI*2);ctx.fill();
    // Foundation and walls
    ctx.fillStyle=houseLevel>=3?'#746553':'#846044';ctx.fillRect(x,y+35,320,270);
    ctx.fillStyle=houseLevel>=2?'#bb8957':'#a57a51';ctx.fillRect(x+12,y+48,296,244);
    // Roof gets reinforcement at each house tier
    ctx.fillStyle=houseLevel>=3?'#563b48':'#5f3a34';ctx.beginPath();ctx.moveTo(x-14,y+42);ctx.lineTo(x+160,y-35);ctx.lineTo(x+334,y+42);ctx.closePath();ctx.fill();
    ctx.fillStyle=houseLevel>=2?'#a76150':'#92534a';ctx.beginPath();ctx.moveTo(x+3,y+36);ctx.lineTo(x+160,y-25);ctx.lineTo(x+317,y+36);ctx.lineTo(x+305,y+48);ctx.lineTo(x+160,y-10);ctx.lineTo(x+15,y+48);ctx.closePath();ctx.fill();
    ctx.fillStyle='#382e32';ctx.fillRect(x+137,y+244,46,61);ctx.fillStyle='#d2ab67';ctx.fillRect(x+171,y+274,5,5);
    // Bright framed windows
    ctx.fillStyle='#d5e6d8';ctx.fillRect(x+35,y+95,48,42);ctx.fillRect(x+237,y+95,48,42);
    ctx.fillStyle=houseLevel>=2?'#f5d58b':'#426a67';ctx.fillRect(x+41,y+101,36,30);ctx.fillRect(x+243,y+101,36,30);
    ctx.fillStyle='#654331';ctx.fillRect(x+31,y+90,56,6);ctx.fillRect(x+233,y+90,56,6);
    if(houseLevel>=2){
      // Porch, railings and a chimney mark the reinforced house.
      ctx.fillStyle='#63452d';ctx.fillRect(x+105,y+300,110,8);ctx.fillRect(x+112,y+308,7,12);ctx.fillRect(x+201,y+308,7,12);
      ctx.fillStyle='#c9a06a';ctx.fillRect(x+104,y+298,112,4);ctx.fillRect(x+112,y+302,4,14);ctx.fillRect(x+204,y+302,4,14);
      ctx.fillStyle='#705049';ctx.fillRect(x+258,y-7,24,50);ctx.fillStyle='#95665a';ctx.fillRect(x+254,y-15,32,9);
      ctx.fillStyle='#f7d18c';ctx.fillRect(x+53,y+111,12,3);ctx.fillRect(x+255,y+111,12,3);
    }
    if(houseLevel>=3){
      // A dormer and stone trim are added at the highest tier.
      ctx.fillStyle='#7b4b42';ctx.fillRect(x+130,y+9,60,38);ctx.fillStyle='#57363a';ctx.beginPath();ctx.moveTo(x+122,y+11);ctx.lineTo(x+160,y-10);ctx.lineTo(x+198,y+11);ctx.closePath();ctx.fill();
      ctx.fillStyle='#d7e6d8';ctx.fillRect(x+148,y+17,24,22);ctx.fillStyle='#4e7b83';ctx.fillRect(x+152,y+21,16,14);
      ctx.fillStyle='#cdb17e';ctx.fillRect(x+7,y+287,306,5);ctx.fillRect(x+7,y+294,306,4);
    }
    ctx.fillStyle='#d5b982';ctx.font='bold 12px Segoe UI';ctx.textAlign='center';ctx.fillText('ДОМ · УРОВЕНЬ '+houseLevel,x+160,y+190);ctx.textAlign='left';
  }
  function drawFences(camX,camY){for(const f of world.fences){const x=f.x-camX,y=f.y-camY;ctx.fillStyle='#5c4935';ctx.fillRect(x-13,y-3,26,6);ctx.fillStyle='#c5a06d';ctx.fillRect(x-12,y-5,3,10);ctx.fillRect(x+9,y-5,3,10);}}
  function drawSign(s,camX,camY){const x=s.x-camX,y=s.y-camY;ctx.fillStyle='#533c2b';ctx.fillRect(x-3,y-4,6,25);ctx.fillStyle='#9d7547';ctx.fillRect(x-15,y-13,30,15);ctx.fillStyle='#dec08b';ctx.fillRect(x-12,y-10,24,9);ctx.fillStyle='#806447';ctx.fillRect(x-7,y-7,13,2);ctx.fillRect(x-4,y-3,8,2);}
  function xpForNextLevel(level=playerLevel){return 100+Math.max(0,level-1)*75;}
  function awardXP(amount,reason=''){
    const gained=Math.max(0,Math.floor(amount));if(!gained)return;playerXP+=gained;let leveled=false;
    while(playerXP>=xpForNextLevel()){playerXP-=xpForNextLevel();playerLevel++;skillPoints++;leveled=true;player.hp=Math.min(100,player.hp+8);player.stamina=Math.min(100,player.stamina+12);}
    updateProgressHud();if(leveled){updateVitals();spawnVisualBurst(player.x,player.y,24,'spark','#8be9ff');playSound('craft');toast('НОВЫЙ УРОВЕНЬ '+playerLevel+'! +8 здоровья и +12 выносливости.');}else if(reason)toast('+'+gained+' опыта · '+reason);saveGame();
  }
  function updateProgressHud(){const el=document.getElementById('progress-hud');if(el)el.textContent='УРОВЕНЬ '+playerLevel+' · XP '+playerXP+'/'+xpForNextLevel()+' · ✦ '+skillPoints;}
  function openTreasureChest(chest){if(!chest||chest.opened)return;chest.opened=true;const cfg=difficultyConfig(),gold=5+Math.floor(Math.random()*11);const rewards=[{name:'Золото',count:gold},{name:'Кристалл',count:1},{name:'Малое зелье',count:1}];const chosen=rewards.filter((r,i)=>i===0||(i===1?Math.random()<cfg.chests.crystal:Math.random()<cfg.chests.potion));for(const r of chosen){if(r.name==='Золото')walletCents+=r.count*100;else changeItem(r.name,r.count);}spawnVisualBurst(chest.x,chest.y,22,'spark','#ffd86b');playSound('coin');renderInventory();saveGame();drawMinimap();awardXP(45,'найден сундук');toast('Сундук открыт! Золото: '+gold+'; '+chosen.filter(r=>r.name!=='Золото').map(r=>r.name+' ×'+r.count).join(', '));}
  function startDodge(){if(paused||inMainMenu||workbenchDialogOpen||inventoryDialogOpen||signDialogOpen||dodgeCooldown>0||player.stamina<18||mineMode)return;let dx=0,dy=0;const f=player.face;if(f==='left')dx=-1;else if(f==='right')dx=1;else if(f==='up')dy=-1;else dy=1;dodgeVX=dx;dodgeVY=dy;dodgeFacing=f;dodgeTimer=.24;dodgeCooldown=1.15;player.stamina=Math.max(0,player.stamina-18);spawnVisualBurst(player.x,player.y,10,'dust','#a8d9ff');toast('Перекат!');}
  function spawnVisualBurst(x,y,count=8,kind='spark',color='#ffe29a'){
    for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,sp=kind==='dust'?18+Math.random()*30:35+Math.random()*115;visualParticles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-12,life:.35+Math.random()*.55,maxLife:.9,size:kind==='spark'?2+Math.random()*3:2+Math.random()*4,kind,color,rot:Math.random()*6.28});}
    if(visualParticles.length>180)visualParticles.splice(0,visualParticles.length-180);
  }
  function updateVisualEffects(dt){
    attackAnimTimer=Math.max(0,attackAnimTimer-dt);weatherFlash=Math.max(0,weatherFlash-dt);
    for(let i=visualParticles.length-1;i>=0;i--){const p=visualParticles[i];p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=p.kind==='dust'?12:42;p.vx*=Math.max(0,1-dt*1.4);if(p.life<=0)visualParticles.splice(i,1);}
    if(!paused&&!inMainMenu&&!inHouse&&!mineMode){weatherTimer-=dt;if(weatherTimer<=0){weatherMode=weatherMode==='clear'?(Math.random()<.42?'rain':'clear'):'clear';weatherTimer=weatherMode==='rain'?35+Math.random()*35:65+Math.random()*100;if(weatherMode==='rain')toast('Погода изменилась: начинается дождь.');else if(Math.random()<.5)toast('Дождь закончился. Воздух снова чистый.');}}
  }
  function drawVisualEffects(camX,camY,time){
    for(const p of visualParticles){const x=p.x-camX,y=p.y-camY;if(x<-20||x>width+20||y<-20||y>height+20)continue;ctx.save();ctx.globalAlpha=Math.max(0,Math.min(1,p.life/Math.min(.35,p.maxLife)));ctx.translate(x,y);if(p.kind==='leaf'){ctx.rotate(p.rot+time/250);ctx.fillStyle=p.color;ctx.beginPath();ctx.ellipse(0,0,p.size*1.6,p.size*.7,.4,0,Math.PI*2);ctx.fill();}else if(p.kind==='dust'){ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(0,0,p.size*(.5+p.life),0,Math.PI*2);ctx.fill();}else{ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=7;ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size);}ctx.restore();}
    if(attackAnimTimer>0){const x=player.x-camX,y=player.y-camY;const progress=1-attackAnimTimer/.24;ctx.save();ctx.translate(x,y-2);ctx.rotate((player.face==='left'?Math.PI:player.face==='up'?-Math.PI/2:player.face==='down'?Math.PI/2:0)+(progress-.5)*1.2);ctx.globalAlpha=Math.min(1,attackAnimTimer/.12);ctx.strokeStyle='#d9f2ff';ctx.lineWidth=4;ctx.shadowColor='#9acbff';ctx.shadowBlur=12;ctx.beginPath();ctx.arc(18,0,30,-1.1+progress*.4,1.1+progress*.4);ctx.stroke();ctx.strokeStyle='#fff3c4';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(18,0,25,-1+progress*.4,.8+progress*.4);ctx.stroke();ctx.restore();}
    if(weatherMode==='rain'&&gameSettings.graphicsQuality!=='low'){ctx.save();ctx.strokeStyle='rgba(155,202,239,.34)';ctx.lineWidth=1;for(let i=0;i<Math.min(90,Math.floor(width/10));i++){const x=(hash(i,Math.floor(time/95))*width+time*.12)%width,y=(hash(i+17,Math.floor(time/80))*height+time*.42)%height;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-4,y+12);ctx.stroke();}ctx.restore();}
    // Occasional shooting star at night: a small ambient world event, not a gameplay requirement.
    if(isNightTime()){const cycle=(time%19000)/19000;if(cycle<.035){const x=width*(.22+cycle*13),y=30+cycle*900;ctx.save();ctx.globalAlpha=1-cycle/.035;ctx.strokeStyle='#dceeff';ctx.lineWidth=2;ctx.shadowColor='#b5d8ff';ctx.shadowBlur=9;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-38,y-18);ctx.stroke();ctx.restore();}}
  }
  function drawPlayer(camX,camY,dt){
    const x=player.x-camX,y=player.y-camY;player.frame += dt*(Math.abs(player.vx)+Math.abs(player.vy)>.01?11:3);const step=Math.sin(player.frame)*2.2;
    ctx.save();ctx.translate(Math.round(x),Math.round(y));
    ctx.fillStyle='#102a2a66';ctx.beginPath();ctx.ellipse(0,13,13,7,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=equipment.armor?'#7a899b':(playerAppearance.armor||'#526fba');ctx.fillRect(-9,-3,18,15);ctx.fillStyle=playerAppearance.accent||'#9cb9ff';ctx.fillRect(-7,-2,14,13);
    ctx.fillStyle='#394b89';ctx.beginPath();ctx.moveTo(-9,-3);ctx.lineTo(0,7);ctx.lineTo(9,-3);ctx.lineTo(7,10);ctx.lineTo(0,15);ctx.lineTo(-7,10);ctx.closePath();ctx.fill();
    ctx.fillStyle='#c5d6ef';ctx.fillRect(-2,-1,4,12);ctx.fillStyle='#3b2837';ctx.fillRect(-7,7+step,5,8);ctx.fillRect(2,7-step,5,8);ctx.fillStyle=equipment.boots?'#8d6c45':'#d5b887';ctx.fillRect(-8,13+step,7,4);ctx.fillRect(1,13-step,7,4);
    const look=playerAppearance,faceStyle=look.face||'normal',hairStyle=look.hairStyle||'short';if(hairStyle==='hood'){ctx.fillStyle=look.accent||'#9cb9ff';ctx.fillRect(-9,-20,18,18);ctx.fillStyle=look.skin||'#e8b88c';ctx.fillRect(-6,-16,12,12);}else{ctx.fillStyle=look.skin||'#e8b88c';ctx.fillRect(-6,-17,12,13);}ctx.fillStyle=look.hair||'#352d3d';if(hairStyle==='mohawk'){ctx.fillRect(-2,-21,4,11);ctx.fillRect(-5,-13,10,3);}else if(hairStyle==='curly'){for(const [hx,hy] of [[-6,-19],[0,-21],[6,-19],[-8,-15],[8,-15]]){ctx.beginPath();ctx.arc(hx,hy,3,0,Math.PI*2);ctx.fill();}}else if(hairStyle!=='hood'){ctx.fillRect(-7,-20,14,5);ctx.fillRect(-9,-16,4,hairStyle==='long'?12:7);ctx.fillRect(5,-16,4,hairStyle==='long'?12:7);if(hairStyle==='long')ctx.fillRect(-7,-12,14,7);}if(faceStyle==='visor'){ctx.fillStyle=look.accent||'#9cb9ff';ctx.fillRect(-7,-13,14,5);ctx.fillStyle=look.eye||'#26334c';ctx.fillRect(-4,-12,3,2);ctx.fillRect(2,-12,3,2);}else{ctx.fillStyle=look.eye||'#26334c';ctx.fillRect(-4,-12,2,2);ctx.fillRect(3,-12,2,2);if(faceStyle==='stern'){ctx.fillRect(-5,-14,4,1);ctx.fillRect(2,-14,4,1);}if(faceStyle==='smile'){ctx.fillStyle='#7c4135';ctx.fillRect(-2,-7,5,1);ctx.fillRect(2,-8,1,1);}else if(faceStyle==='mask'){ctx.fillStyle='#d5dce6';ctx.fillRect(-5,-9,10,5);ctx.fillStyle='#7e8ba0';ctx.fillRect(-3,-7,2,1);ctx.fillRect(1,-7,2,1);}}
    if(player.face==='left'||player.face==='right'){ctx.fillStyle=playerAppearance.skin||'#e8b88c';ctx.fillRect(player.face==='left'?-9:6,-8,3,6);}
    ctx.fillStyle=equipment.helmet?'#d7dfe8':playerAppearance.accent||'#9cb9ff';if(equipment.helmet){ctx.fillRect(-9,-20,18,5);ctx.fillRect(-11,-16,22,3);}
    if(equipment.amulet){ctx.fillStyle='#ffe27c';ctx.beginPath();ctx.arc(0,2,3,0,Math.PI*2);ctx.fill();}
    if(['Огненный меч','Железный меч','Стальной меч','Молниеносное копьё'].includes(equipment.weapon)){ctx.strokeStyle=equipment.weapon==='Огненный меч'?'#ff9a42':equipment.weapon==='Молниеносное копьё'?'#cba4ff':'#dbe8f5';ctx.lineWidth=equipment.weapon==='Молниеносное копьё'?4:3;ctx.beginPath();ctx.moveTo(9,-5);ctx.lineTo(14,-18);ctx.stroke();}else if(equipment.weapon==='Ледяной посох'){ctx.strokeStyle='#8be9ff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(10,-2);ctx.lineTo(14,-22);ctx.stroke();ctx.fillStyle='#b8f4ff';ctx.beginPath();ctx.arc(14,-23,4,0,Math.PI*2);ctx.fill();}
    ctx.restore();
  }
  function drawFireflies(camX,camY,time){for(const f of world.fireflies){const x=f.x-camX,y=f.y-camY;if(x<-15||x>width+15||y<-15||y>height+15)continue;const a=.25+.65*(.5+.5*Math.sin(time/500+f.phase));ctx.fillStyle='rgba(255,231,136,'+a+')';ctx.beginPath();ctx.arc(x,y,1.5+a,0,Math.PI*2);ctx.fill();}}
  function drawEmergencyWorld(){
    // Recovery renderer: if a decorative drawing routine fails, keep the playable world visible.
    ctx.save();
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.fillStyle='#285b43';ctx.fillRect(0,0,width,height);
    const camX=Math.max(0,Math.min(COLS*TILE-width,player.x-width/2));
    const camY=Math.max(0,Math.min(ROWS*TILE-height,player.y-height/2));
    const x0=Math.max(0,Math.floor(camX/TILE)),x1=Math.min(COLS,Math.ceil((camX+width)/TILE));
    const y0=Math.max(0,Math.floor(camY/TILE)),y1=Math.min(ROWS,Math.ceil((camY+height)/TILE));
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
      const sx=Math.floor(x*TILE-camX),sy=Math.floor(y*TILE-camY),h=hash(x,y);
      ctx.fillStyle=h>.5?'#285b43':h>.2?'#2a6047':'#285840';ctx.fillRect(sx,sy,TILE,TILE);
      if(pathAt(x,y)){ctx.fillStyle='#967c54';ctx.fillRect(sx,sy,TILE,TILE);}
      if(waterAt(x+.5,y+.5)){ctx.fillStyle='#246786';ctx.fillRect(sx,sy,TILE,TILE);}
    }
    const px=player.x-camX,py=player.y-camY;
    ctx.fillStyle='#e8b88c';ctx.fillRect(px-6,py-17,12,13);
    ctx.fillStyle='#526fba';ctx.fillRect(px-9,py-4,18,18);
    ctx.fillStyle='#2c3447';ctx.fillRect(px-7,py+14,5,8);ctx.fillRect(px+2,py+14,5,8);
    ctx.restore();
  }
  function drawTreasureChests(camX,camY,time){for(const chest of treasureChests){const x=chest.x-camX,y=chest.y-camY;if(x<-40||x>width+40||y<-40||y>height+40)continue;ctx.save();ctx.translate(x,y);ctx.fillStyle='#102a2a77';ctx.beginPath();ctx.ellipse(0,10,18,7,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=chest.opened?'#5c5142':'#80502c';ctx.fillRect(-15,-5,30,17);ctx.fillStyle=chest.opened?'#887967':'#b77a3c';ctx.fillRect(-15,-10,30,10);ctx.fillStyle='#e7c56b';ctx.fillRect(-3,-5,6,12);if(!chest.opened){ctx.shadowColor='#ffd86b';ctx.shadowBlur=9+Math.sin(time/180)*4;ctx.fillStyle='#ffdf7c';ctx.fillRect(-2,-7,4,5);}ctx.restore();}}
  function drawCaveBoss(){if(caveBossDefeated)return;const maxHp=bossMaxHp(),x=caveBossX,y=caveBossY;ctx.save();ctx.translate(x,y);ctx.fillStyle='#090d16aa';ctx.beginPath();ctx.ellipse(0,22,36,13,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=caveBossFlash>0?'#ffffff':'#626f7d';ctx.fillRect(-25,-20,50,39);ctx.fillStyle='#8798a6';ctx.fillRect(-20,-30,40,19);ctx.fillStyle='#3c4656';ctx.beginPath();ctx.moveTo(-22,-24);ctx.lineTo(-31,-41);ctx.lineTo(-12,-33);ctx.lineTo(0,-40);ctx.lineTo(14,-32);ctx.lineTo(30,-43);ctx.lineTo(22,-22);ctx.closePath();ctx.fill();ctx.fillStyle='#e85c69';ctx.shadowColor='#ff495b';ctx.shadowBlur=10;ctx.fillRect(-14,-23,8,5);ctx.fillRect(6,-23,8,5);ctx.shadowBlur=0;ctx.fillStyle='#404a56';ctx.fillRect(-35,-8,12,29);ctx.fillRect(23,-8,12,29);ctx.fillStyle='#a9b8c4';ctx.fillRect(-18,18,12,13);ctx.fillRect(6,18,12,13);ctx.restore();ctx.fillStyle='#211b28';ctx.fillRect(x-48,y-53,96,7);ctx.fillStyle='#ff6578';ctx.fillRect(x-48,y-53,96*Math.max(0,caveBossHp/maxHp),7);ctx.fillStyle='#f4f1e7';ctx.font='bold 11px Segoe UI';ctx.textAlign='center';ctx.fillText('КАМЕННЫЙ СТРАЖ · '+Math.ceil(caveBossHp)+'/'+maxHp+' HP · '+difficultyConfig().name,x,y-60);ctx.textAlign='left';}
  function updateCaveBoss(dt){if(!caveMode||caveBossDefeated)return;const cfg=difficultyConfig();caveBossFlash=Math.max(0,caveBossFlash-dt);const dx=player.x-caveBossX,dy=player.y-caveBossY,dist=Math.hypot(dx,dy)||1;if(dist>62){caveBossX+=dx/dist*cfg.bossSpeed*dt;caveBossY+=dy/dist*cfg.bossSpeed*dt;}caveBossAttackTimer-=dt;if(caveBossAttackTimer<=0){caveBossAttackTimer=cfg.bossInterval;if(dist<102&&dodgeTimer<=0&&!immortal){const reduction=armorReduction();const hit=Math.max(1,Math.round(cfg.bossDamage*(1-reduction)));player.hp=Math.max(0,player.hp-hit);updateVitals();spawnVisualBurst(player.x,player.y,12,'spark','#fb6876');toast('Каменный страж ударил: −'+hit+' HP!');if(player.hp<=0)respawnPlayerAfterDefeat();}} }
  function drawCaveInterior(dt,time){ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#101522';ctx.fillRect(0,0,width,height);const g=ctx.createRadialGradient(width*.5,height*.48,30,width*.5,height*.48,Math.max(width,height)*.7);g.addColorStop(0,'#39404b');g.addColorStop(1,'#090d16');ctx.fillStyle=g;ctx.fillRect(0,0,width,height);for(let i=0;i<90;i++){const x=hash(i,4)*width,y=hash(9,i)*height;ctx.fillStyle=i%3?'#4a515b':'#6f9ca7';ctx.fillRect(x,y,2+(i%3),2+(i%3));}ctx.fillStyle='#1b2430';ctx.beginPath();ctx.ellipse(width*.5,height*.48,width*.42,height*.34,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#65727f';ctx.lineWidth=12;ctx.stroke();for(let i=0;i<8;i++){const x=width*(.18+i*.09),y=height*(.25+(i%3)*.14);ctx.fillStyle=i%2?'#257e9b':'#4da6bc';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=14;ctx.beginPath();ctx.moveTo(x-8,y+17);ctx.lineTo(x,y-12-(i%3)*4);ctx.lineTo(x+8,y+17);ctx.closePath();ctx.fill();}ctx.shadowBlur=0;drawCaveBoss();const cx=width*.73,cy=height*.48;ctx.fillStyle=caveChestOpened?'#5c5142':'#8c562e';ctx.fillRect(cx-20,cy-5,40,25);ctx.fillStyle=caveChestOpened?'#827463':'#c18a45';ctx.fillRect(cx-20,cy-14,40,12);ctx.fillStyle='#f7d56e';ctx.fillRect(cx-3,cy-6,6,15);if(!caveChestOpened){ctx.shadowColor='#ffcf62';ctx.shadowBlur=20;ctx.fillStyle='#ffdf81';ctx.beginPath();ctx.arc(cx,cy-14,3,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}const px=player.x,py=player.y;ctx.fillStyle='#102a2a99';ctx.beginPath();ctx.ellipse(px,py+13,16,7,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#3b2837';ctx.fillRect(px-7,py+6,5,9);ctx.fillRect(px+2,py+6,5,9);ctx.fillStyle=playerAppearance.armor||'#526fba';ctx.fillRect(px-9,py-4,18,15);const caveLook=playerAppearance,caveHair=caveLook.hairStyle||'short',caveFace=caveLook.face||'normal';if(caveHair==='hood'){ctx.fillStyle=caveLook.accent||'#9cb9ff';ctx.fillRect(px-9,py-22,18,19);}ctx.fillStyle=caveLook.skin||'#e8b88c';ctx.fillRect(px-6,py-18,12,13);ctx.fillStyle=caveLook.hair||'#352d3d';if(caveHair==='mohawk'){ctx.fillRect(px-2,py-23,4,10);}else if(caveHair==='curly'){for(const [hx,hy] of [[-6,-20],[0,-22],[6,-20]]){ctx.beginPath();ctx.arc(px+hx,py+hy,3,0,Math.PI*2);ctx.fill();}}else if(caveHair!=='hood'){ctx.fillRect(px-7,py-21,14,5);if(caveHair==='long')ctx.fillRect(px-8,py-17,3,12);}if(caveFace==='visor'){ctx.fillStyle=caveLook.accent||'#9cb9ff';ctx.fillRect(px-7,py-14,14,5);ctx.fillStyle=caveLook.eye||'#26334c';ctx.fillRect(px-4,py-13,3,2);ctx.fillRect(px+2,py-13,3,2);}else{ctx.fillStyle=caveLook.eye||'#26334c';ctx.fillRect(px-4,py-13,2,2);ctx.fillRect(px+3,py-13,2,2);if(caveFace==='stern'){ctx.fillRect(px-5,py-15,4,1);ctx.fillRect(px+2,py-15,4,1);}if(caveFace==='smile'){ctx.fillStyle='#7c4135';ctx.fillRect(px-2,py-8,5,1);}else if(caveFace==='mask'){ctx.fillStyle='#d5dce6';ctx.fillRect(px-5,py-10,10,5);ctx.fillStyle='#7e8ba0';ctx.fillRect(px-3,py-8,2,1);ctx.fillRect(px+1,py-8,2,1);}}if(equipment.helmet){ctx.fillStyle='#d7dfe8';ctx.fillRect(px-9,py-22,18,5);}ctx.fillStyle='#182b38';ctx.beginPath();ctx.ellipse(width*.16,height*.8,36,24,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#7bd7e7';ctx.lineWidth=4;ctx.stroke();ctx.fillStyle='#f0d28b';ctx.font='bold 15px Segoe UI';ctx.textAlign='center';ctx.fillText('ТАЙНАЯ ПЕЩЕРА · E — взаимодействие',width/2,35);ctx.fillStyle='#a6bddb';ctx.font='12px Segoe UI';ctx.fillText(caveChestOpened?'Сундук уже открыт · E у входа — выйти':'Подойди к сияющему сундуку и нажми E',width/2,58);if(dodgeTimer>0){ctx.strokeStyle='#a8d9ff';ctx.lineWidth=4;ctx.globalAlpha=dodgeTimer/.24;ctx.beginPath();ctx.arc(px,py,30,0,Math.PI*1.6);ctx.stroke();ctx.globalAlpha=1;}}
  function draw(dt,time){
    if(caveMode){drawCaveInterior(dt,time);updateObjective();return;}
    if(mineMode){drawMineInterior();return;}
    if(inHouse){drawHouseInterior(dt,time);updateObjective();return;}
    const camX=Math.max(0,Math.min(COLS*TILE-width,player.x-width/2));
    const camY=Math.max(0,Math.min(ROWS*TILE-height,player.y-height/2));
    drawGround(camX,camY); drawPond(camX,camY); if(!tradeWorldMode)drawPlacedStructures(camX,camY);
    if(tradeWorldMode){
      drawTradeEntrance(camX,camY);
      drawTradeShop(SELL_SHOP,camX,camY,'ЛАВКА ЛЕСНИКА','E · ПРОДАТЬ РЕСУРСЫ','#d7a52c');
      drawTradeShop(BUY_SHOP,camX,camY,'ЛАВКА РУДОКОПА','E · КУПИТЬ РУДУ','#70818d');
    }else{
      if(gameSettings.graphicsQuality!=='low') drawFlowers(camX,camY,time);
      drawCabin(camX,camY); drawFences(camX,camY); drawMineEntrance(camX,camY); drawTradeEntrance(camX,camY);
      for(const rock of world.rocks){const x=rock.x-camX,y=rock.y-camY;if(x>-30&&x<width+30&&y>-30&&y<height+30)drawRock(rock,camX,camY);}
      for(const tree of world.trees){const x=tree.x-camX,y=tree.y-camY;if(x>-60&&x<width+60&&y>-70&&y<height+40)drawTree(tree,camX,camY);}
      world.signs.forEach(s=>drawSign(s,camX,camY));drawSheep(camX,camY,time);drawTreasureChests(camX,camY,time);drawLootDrops(camX,camY,time);drawMonsters(camX,camY,time);const cx=74*TILE+16-camX,cy=18*TILE+16-camY;ctx.save();ctx.fillStyle='#151a23';ctx.beginPath();ctx.ellipse(cx,cy,34,24,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#6c7d8c';ctx.lineWidth=4;ctx.stroke();ctx.fillStyle='#6fe1f4';ctx.shadowColor='#55d7f2';ctx.shadowBlur=12;ctx.font='bold 10px Segoe UI';ctx.textAlign='center';ctx.fillText('ПЕЩЕРА',cx,cy-30);ctx.restore();
    }
    if(gameSettings.graphicsQuality==='high'){
      const px=player.x-camX,py=player.y-camY;
      const aura=ctx.createRadialGradient(px,py,4,px,py,36);
      aura.addColorStop(0,'rgba(151,188,255,.12)'); aura.addColorStop(1,'rgba(151,188,255,0)');
      ctx.fillStyle=aura;ctx.beginPath();ctx.arc(px,py,36,0,Math.PI*2);ctx.fill();
    }
    drawPlayer(camX,camY,dt);
    drawVisualEffects(camX,camY,time);
    if(gameSettings.graphicsQuality!=='low') drawFireflies(camX,camY,time);
    drawDayNightOverlay(camX,camY);
    updateObjective();
  }
  function mineRockScreenPosition(r){return {x:65+(r.x/330)*(width-130),y:85+(r.y/255)*(height-150)};}
  function drawMineEntrance(camX,camY){
    const mx=mineTileX*TILE+16-camX,my=mineTileY*TILE+16-camY;
    if(mx<-100||mx>width+100||my<-100||my>height+100)return;
    // Brightly outlined cave mouth, wooden supports, stones and lamps make it easy to spot.
    ctx.save();ctx.translate(mx,my);
    ctx.fillStyle='rgba(5,13,16,.4)';ctx.beginPath();ctx.ellipse(0,15,41,21,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#66716d';ctx.beginPath();ctx.moveTo(-36,11);ctx.lineTo(-31,-13);ctx.lineTo(-17,-29);ctx.lineTo(0,-34);ctx.lineTo(20,-26);ctx.lineTo(35,-7);ctx.lineTo(38,13);ctx.closePath();ctx.fill();
    ctx.fillStyle='#35413f';ctx.beginPath();ctx.moveTo(-25,14);ctx.lineTo(-22,-9);ctx.lineTo(-12,-21);ctx.lineTo(3,-25);ctx.lineTo(19,-18);ctx.lineTo(27,-3);ctx.lineTo(29,14);ctx.closePath();ctx.fill();
    ctx.fillStyle='#101923';ctx.beginPath();ctx.moveTo(-18,14);ctx.lineTo(-15,-5);ctx.lineTo(-7,-16);ctx.lineTo(7,-18);ctx.lineTo(17,-7);ctx.lineTo(20,14);ctx.closePath();ctx.fill();
    ctx.fillStyle='#a17a4d';ctx.fillRect(-24,-16,5,31);ctx.fillRect(20,-16,5,31);ctx.fillRect(-25,-20,51,5);
    ctx.fillStyle='#f7d28a';ctx.shadowColor='#ffc86a';ctx.shadowBlur=14;ctx.beginPath();ctx.arc(-31,-4,4,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(32,-4,4,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    ctx.fillStyle='#fff0bd';ctx.font='900 13px Segoe UI';ctx.textAlign='center';ctx.fillText('ШАХТА',0,34);
    ctx.fillStyle='#d7e6c0';ctx.font='bold 10px Segoe UI';ctx.fillText('E · ВОЙТИ',0,47);ctx.textAlign='left';ctx.restore();
  }
  function drawTradeEntrance(camX,camY){const x=tradeEntranceX*TILE+16-camX,y=tradeEntranceY*TILE+16-camY;if(x<-100||x>width+100||y<-100||y>height+100)return;ctx.save();ctx.translate(x,y);ctx.fillStyle='#142b36aa';ctx.beginPath();ctx.ellipse(0,15,39,18,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#7d9b87';ctx.fillRect(-28,-16,56,32);ctx.fillStyle='#3d6b62';ctx.fillRect(-21,-10,42,25);ctx.fillStyle='#101c2c';ctx.fillRect(-13,-5,26,20);ctx.fillStyle='#f4d58b';ctx.font='900 12px Segoe UI';ctx.textAlign='center';ctx.fillText('МИР ТОРГОВЛИ',0,-25);ctx.font='bold 10px Segoe UI';ctx.fillText('E · ВОЙТИ',0,42);ctx.textAlign='left';ctx.restore();
  }
  function drawPlacedStructures(camX,camY){
    for(const s of placedStructures){const x=s.x-camX,y=s.y-camY;if(x<-100||x>width+100||y<-100||y>height+100)continue;ctx.save();ctx.translate(x,y);
      if(s.type==='furnace'){ctx.fillStyle='#172a2b88';ctx.beginPath();ctx.ellipse(0,13,21,9,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#626d73';ctx.fillRect(-17,-17,34,30);ctx.fillStyle='#89979b';ctx.fillRect(-12,-13,24,20);ctx.fillStyle='#273238';ctx.fillRect(-8,-8,16,13);ctx.fillStyle='#ff9a42';ctx.beginPath();ctx.moveTo(-5,4);ctx.quadraticCurveTo(-10,-5,0,-9);ctx.quadraticCurveTo(1,-2,7,-6);ctx.quadraticCurveTo(12,5,0,6);ctx.fill();ctx.fillStyle='#fff0bd';ctx.font='bold 10px Segoe UI';ctx.textAlign='center';ctx.fillText('ПЕЧЬ',0,26);}
      else if(s.type==='house'){ctx.fillStyle='#102d2b88';ctx.beginPath();ctx.ellipse(0,31,45,12,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#9a7049';ctx.fillRect(-38,-5,76,37);ctx.fillStyle='#704536';ctx.beginPath();ctx.moveTo(-45,-5);ctx.lineTo(0,-36);ctx.lineTo(45,-5);ctx.closePath();ctx.fill();ctx.fillStyle='#c18a52';ctx.fillRect(-30,0,60,26);ctx.fillStyle='#3b2924';ctx.fillRect(-7,8,14,24);ctx.fillStyle='#e9cf8b';ctx.fillRect(5,18,2,3);ctx.fillStyle='#d5e6d8';ctx.fillRect(-27,3,11,10);ctx.fillRect(16,3,11,10);ctx.fillStyle='#fff0bd';ctx.font='bold 10px Segoe UI';ctx.textAlign='center';ctx.fillText('ДОМ',0,-41);}
      else if(s.type==='torch'){ctx.fillStyle='#67452c';ctx.fillRect(-3,-2,6,18);ctx.fillStyle=`rgba(255,${150+Math.floor(Math.sin(performance.now()/75)*25)},66,.96)`;ctx.beginPath();ctx.moveTo(0,-20+Math.sin(performance.now()/90)*2);ctx.quadraticCurveTo(-11,-8,-2,-4);ctx.quadraticCurveTo(1,-12,4,-5);ctx.quadraticCurveTo(13,-14,0,-20);ctx.fill();ctx.fillStyle='#ffe9a1';ctx.fillRect(-1,-13,2,7);}
      else if(s.type==='coal'){ctx.fillStyle='#252b30';ctx.fillRect(-12,-10,24,22);ctx.fillStyle='#555f65';ctx.fillRect(-8,-7,8,7);ctx.fillRect(2,1,7,7);}
      else if(s.type==='storage'){ctx.fillStyle='#102a2a88';ctx.beginPath();ctx.ellipse(0,12,23,8,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#80532f';ctx.fillRect(-18,-7,36,23);ctx.fillStyle='#b77b3d';ctx.fillRect(-18,-12,36,9);ctx.fillStyle='#e6c46b';ctx.fillRect(-3,-7,6,17);ctx.fillStyle='#fff2b0';ctx.font='bold 9px Segoe UI';ctx.textAlign='center';ctx.fillText('СУНДУК',0,28);}
      else if(s.type==='farmplot'){ctx.fillStyle='#6e4a2e';ctx.fillRect(-20,-13,40,26);ctx.fillStyle='#a57a49';ctx.fillRect(-17,-10,34,20);for(let i=0;i<3;i++){ctx.fillStyle='#5b3c25';ctx.fillRect(-14+i*13,-9,3,18);}const stage=Math.max(0,Math.min(3,s.stage||0));if(stage>0){for(let i=0;i<3;i++){const gx=-10+i*10,gh=stage*4;ctx.fillStyle=stage===3?'#e5c65d':'#5ebd65';ctx.fillRect(gx-2,-8-gh,4,gh+7);ctx.beginPath();ctx.ellipse(gx-4,-7-gh/2,5,2,-.45,0,Math.PI*2);ctx.ellipse(gx+4,-5-gh/2,5,2,.45,0,Math.PI*2);ctx.fill();if(stage===3){ctx.fillStyle='#f2d86a';ctx.fillRect(gx-3,-12,6,5);}}}ctx.fillStyle='#f6e2a1';ctx.font='bold 9px Segoe UI';ctx.textAlign='center';ctx.fillText(stage>=3?'E · СОБРАТЬ':'РОСТ '+stage+'/3',0,28);}
      ctx.restore();
    }
  }
  function canPlaceAt(x,y){const tx=Math.floor(x/TILE),ty=Math.floor(y/TILE);if(tx<2||ty<2||tx>=COLS-2||ty>=ROWS-2||waterAt(tx+.5,ty+.5))return false;if(tradeWorldMode)return false;const hx=36*TILE-120,hy=15*TILE-120;if(x>hx-45&&x<hx+365&&y>hy-45&&y<hy+330)return false;if(world.trees.some(t=>Math.hypot(t.x-x,t.y-y)<48)||world.rocks.some(r=>Math.hypot(r.x-x,r.y-y)<35))return false;if(placedStructures.some(s=>Math.hypot(s.x-x,s.y-y)<(s.type==='house'||s.type==='furnace'?60:30)))return false;return Math.hypot(player.x-x,player.y-y)>65;}
  function placeSelectedStructure(ev){if(inMainMenu||paused||inHouse||mineMode||tradeWorldMode||inventoryDialogOpen||shopDialogOpen||workbenchDialogOpen)return false;const item=inventoryItems.filter(i=>i.count>0)[selectedSlot-1];const types={'Печь':'furnace','Комплект дома':'house','Факел':'torch','Угольный блок':'coal','Сундук-хранилище':'storage','Грядка с семенами':'farmplot'};if(!item||!types[item.name])return false;const rect=canvas.getBoundingClientRect(),sx=ev.clientX-rect.left,sy=ev.clientY-rect.top;const camX=Math.max(0,Math.min(COLS*TILE-width,player.x-width/2)),camY=Math.max(0,Math.min(ROWS*TILE-height,player.y-height/2));const x=Math.round((sx+camX)/TILE)*TILE+16,y=Math.round((sy+camY)/TILE)*TILE+16;if(!canPlaceAt(x,y)){toast('Здесь нельзя строить. Выбери свободное место подальше от воды, деревьев и дома.');return true;}placedStructures.push({type:types[item.name],x,y,stage:0,growSeconds:0,contents:{}});item.count--;playSound('craft');renderInventory();saveGame();drawMinimap();toast(item.name+' установлен!');return true;}
  function drawTradeShop(shop,camX,camY,title,subtitle,accent){const x=shop.x*TILE+16-camX,y=shop.y*TILE+16-camY;if(x<-150||x>width+150||y<-150||y>height+150)return;ctx.save();ctx.translate(x,y);ctx.fillStyle='rgba(4,13,18,.35)';ctx.beginPath();ctx.ellipse(0,22,49,17,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#6f4a2d';ctx.fillRect(-42,-16,84,43);ctx.fillStyle='#c18b4d';ctx.fillRect(-37,-11,74,31);ctx.fillStyle=accent;ctx.beginPath();ctx.moveTo(-49,-17);ctx.lineTo(-35,-42);ctx.lineTo(35,-42);ctx.lineTo(49,-17);ctx.closePath();ctx.fill();ctx.fillStyle='#4b3024';ctx.fillRect(-13,-6,26,33);ctx.fillStyle='#ffedb0';ctx.fillRect(-31,-5,12,11);ctx.fillRect(19,-5,12,11);ctx.fillStyle='#fff0b8';ctx.font='900 12px Segoe UI';ctx.textAlign='center';ctx.shadowColor='#000';ctx.shadowBlur=4;ctx.fillText(title,0,-50);ctx.shadowBlur=0;ctx.font='bold 10px Segoe UI';ctx.fillStyle='#fff8df';ctx.fillText(subtitle,0,42);ctx.textAlign='left';ctx.restore();
  }
  function updateWalletHud(){const el=document.getElementById('wallet-value');if(el)el.textContent=formatMoney(walletCents);const wrap=document.getElementById('wallet-hud');if(wrap)wrap.hidden=!currentWorldId;}
  function drawMineInterior(){
    const grad=ctx.createLinearGradient(0,0,0,height);grad.addColorStop(0,'#121c2b');grad.addColorStop(1,'#2a302e');ctx.fillStyle=grad;ctx.fillRect(0,0,width,height);
    ctx.fillStyle='#313a43';ctx.fillRect(20,20,width-40,height-40);ctx.fillStyle='#252e38';ctx.fillRect(28,28,width-56,height-56);
    ctx.fillStyle='#5b4938';for(let x=42;x<width-35;x+=95){ctx.fillRect(x,28,8,height-56);ctx.fillRect(x-9,28,26,7);}
    ctx.fillStyle='#e8d4a4';ctx.font='bold 18px Segoe UI';ctx.fillText('ШАХТА · УРОВЕНЬ '+mineLevel+' · E — выйти',38,52);
    ctx.fillStyle='#a8bbd4';ctx.font='12px Segoe UI';ctx.fillText('Кирка: выбери её в быстром инвентаре. Нажми левой кнопкой по залежи 2 раза.',38,73);
    mineRocks.forEach((r,i)=>{if(r.hp<=0)return;const pos=mineRockScreenPosition(r),x=pos.x,y=pos.y;
      ctx.fillStyle=i===mineHoverIndex?'#465a73':(r.ore==='Кристалл'?'#276c91':r.ore==='Железо'?'#777c8a':r.ore==='Уголь'?'#252a32':'#877967');
      ctx.beginPath();ctx.moveTo(x-21,y+9);ctx.lineTo(x-17,y-9);ctx.lineTo(x-6,y-18);ctx.lineTo(x+10,y-16);ctx.lineTo(x+20,y-4);ctx.lineTo(x+17,y+12);ctx.lineTo(x-2,y+18);ctx.closePath();ctx.fill();
      ctx.fillStyle=r.ore==='Кристалл'?'#8ae6ff':r.ore==='Железо'?'#d4a29b':r.ore==='Уголь'?'#858b96':'#cbb59a';ctx.fillRect(x-8,y-5,6,5);ctx.fillRect(x+3,y+2,7,5);ctx.fillRect(x+2,y-10,4,4);
      if(i===mineHoverIndex){ctx.strokeStyle='#ffe09a';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,25,0,Math.PI*2);ctx.stroke();}
      ctx.fillStyle='#f0e6d0';ctx.font='bold 11px Segoe UI';ctx.textAlign='center';ctx.fillText(r.ore+' · '+r.hp+'/2',x,y+34);ctx.textAlign='left';
    });
    // Keep the same player visible while inside the mine, so this is a location change, not a character swap.
    const px=minePlayerX,py=minePlayerY||height-108;ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(px,py+24,17,6,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f2c18f';ctx.fillRect(px-6,py-20,12,13);ctx.fillStyle='#526fba';ctx.fillRect(px-8,py-7,16,20);ctx.fillStyle='#2c3447';ctx.fillRect(px-7,py+12,5,10);ctx.fillRect(px+2,py+12,5,10);
    ctx.fillStyle='#dce7ff';ctx.font='12px Segoe UI';ctx.fillText('Добыча: камень, уголь, железо; с 3-го уровня — редкие кристаллы.',38,height-28);
  }
  function drawHouseInterior(dt,time){
    ctx.fillStyle='#1b2632';ctx.fillRect(0,0,width,height);
    const scale=Math.min(width/420,height/340),ox=(width-420*scale)/2,oy=(height-340*scale)/2;
    ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);
    // Warm timber walls, wooden floor and stone foundation
    ctx.fillStyle='#544034';ctx.fillRect(0,0,420,340);ctx.fillStyle='#b78b5b';ctx.fillRect(10,10,400,320);
    ctx.fillStyle='#7b5336';for(let y=18;y<330;y+=27){ctx.fillRect(12,y,396,4);}
    ctx.fillStyle='#c99c67';for(let y=24;y<326;y+=34){for(let x=22+(y%2)*14;x<400;x+=58){ctx.fillRect(x,y,2,20);}}
    // Rug in the middle
    ctx.fillStyle='#8d3f3d';ctx.fillRect(143,135,137,100);ctx.fillStyle='#d3a15b';ctx.fillRect(149,141,125,88);ctx.strokeStyle='#f0d49b';ctx.lineWidth=2;ctx.strokeRect(156,148,111,74);ctx.fillStyle='#a34b43';ctx.fillRect(194,169,35,30);
    // Bed, pillow, blanket and headboard
    ctx.fillStyle='#4a2d20';ctx.fillRect(42,35,105,145);ctx.fillStyle='#d5b17b';ctx.fillRect(48,41,93,132);ctx.fillStyle='#eee5d0';ctx.fillRect(54,47,81,120);ctx.fillStyle='#5c81b5';ctx.fillRect(54,94,81,73);ctx.fillStyle='#799ac7';ctx.fillRect(59,99,71,63);ctx.fillStyle='#f7f0dc';ctx.fillRect(58,49,74,34);ctx.fillStyle='#b8c6d7';ctx.fillRect(65,55,27,22);ctx.fillStyle='#d6e0e9';ctx.fillRect(96,55,28,22);
    // Shelf with books and a lantern
    ctx.fillStyle='#593b27';ctx.fillRect(166,30,98,10);ctx.fillRect(171,40,5,24);ctx.fillRect(254,40,5,24);ctx.fillStyle='#b84e42';ctx.fillRect(180,18,12,12);ctx.fillStyle='#d5c06f';ctx.fillRect(195,15,11,15);ctx.fillStyle='#416d66';ctx.fillRect(209,20,13,10);ctx.fillStyle='#dfb85e';ctx.fillRect(237,13,14,22);ctx.fillStyle='#f7d98b';ctx.fillRect(241,17,6,13);
    // Window and night/day light
    ctx.fillStyle='#573824';ctx.fillRect(302,20,78,69);ctx.fillStyle=isNightTime()?'#273b62':'#91c6d1';ctx.fillRect(309,27,64,55);ctx.fillStyle='#68452d';ctx.fillRect(337,27,5,55);ctx.fillRect(309,52,64,5);ctx.fillStyle='#e8c47b';ctx.fillRect(367,30,3,3);
    // Workbench with tools and crafting items
    ctx.fillStyle='#503321';ctx.fillRect(280,111,101,59);ctx.fillStyle='#a87845';ctx.fillRect(273,105,115,17);ctx.fillStyle='#68462d';ctx.fillRect(286,122,8,45);ctx.fillRect(365,122,8,45);ctx.fillStyle='#d0a96d';ctx.fillRect(300,126,23,19);ctx.fillStyle='#6f8792';ctx.fillRect(331,125,8,22);ctx.fillStyle='#c6c9cb';ctx.fillRect(329,122,12,5);ctx.fillStyle='#b58a4e';ctx.fillRect(347,130,12,12);ctx.strokeStyle='#493021';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(308,132);ctx.lineTo(315,140);ctx.moveTo(354,127);ctx.lineTo(359,121);ctx.stroke();
    // Fireplace and logs
    ctx.fillStyle='#4b3026';ctx.fillRect(296,201,81,70);ctx.fillStyle='#6e5546';ctx.fillRect(304,209,65,55);ctx.fillStyle='#251f24';ctx.fillRect(312,219,49,38);ctx.fillStyle='#f28d48';ctx.beginPath();ctx.moveTo(325,254);ctx.quadraticCurveTo(309,233,333,223);ctx.quadraticCurveTo(333,240,346,230);ctx.quadraticCurveTo(363,249,345,257);ctx.fill();ctx.fillStyle='#eacb87';ctx.fillRect(322,259,30,4);
    // Potted plant
    ctx.fillStyle='#8e523c';ctx.fillRect(163,270,25,24);ctx.fillStyle='#4f8a5e';ctx.fillRect(173,249,5,24);ctx.fillRect(160,255,16,7);ctx.fillRect(176,246,17,8);ctx.fillStyle='#6eae73';ctx.fillRect(164,250,10,6);ctx.fillRect(180,241,10,6);
    // Door at bottom center
    ctx.fillStyle='#4b3026';ctx.fillRect(184,276,52,52);ctx.fillStyle='#bd905e';ctx.fillRect(190,282,40,46);ctx.fillStyle='#e5c47b';ctx.fillRect(220,303,4,4);
    ctx.fillStyle='#f3e6c7';ctx.font='12px Segoe UI';ctx.fillText('Кровать · E',43,198);ctx.fillText('Верстак · E',278,188);ctx.fillText('Выход · E',178,268);
    // wall-mounted framed landscape and small lamp
    ctx.fillStyle='#5d3b28';ctx.fillRect(205,78,53,39);ctx.fillStyle='#d8bd85';ctx.fillRect(209,82,45,31);ctx.fillStyle='#82b5a2';ctx.beginPath();ctx.moveTo(211,109);ctx.lineTo(225,91);ctx.lineTo(236,103);ctx.lineTo(245,89);ctx.lineTo(252,109);ctx.fill();ctx.fillStyle='#f1d68d';ctx.beginPath();ctx.arc(242,89,4,0,Math.PI*2);ctx.fill();
    if(houseLevel>=2){ctx.fillStyle='#563b29';ctx.fillRect(155,251,55,34);ctx.fillStyle='#9d7046';ctx.fillRect(158,254,49,27);ctx.fillStyle='#c39b62';ctx.fillRect(155,251,55,6);ctx.fillStyle='#e5c47a';ctx.fillRect(179,258,6,4);ctx.fillStyle='#4e382b';ctx.fillRect(162,269,41,3);}
    if(houseLevel>=3){ctx.fillStyle='#57432e';ctx.fillRect(266,37,22,42);ctx.fillStyle='#dbb06a';ctx.fillRect(270,42,14,30);ctx.fillStyle='#ffe79b';ctx.shadowColor='#ffc86a';ctx.shadowBlur=12;ctx.beginPath();ctx.arc(277,51,5,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#715035';ctx.fillRect(263,75,29,5);}
    const px=player.x,py=player.y;ctx.fillStyle='#f2c18f';ctx.fillRect(px-7,py-15,14,14);ctx.fillStyle='#526fba';ctx.fillRect(px-9,py,18,18);ctx.restore();
    if(sleeping){ctx.fillStyle='rgba(5,9,20,.78)';ctx.fillRect(0,0,width,height);ctx.fillStyle='#f2e8ff';ctx.font='bold 22px Segoe UI';ctx.textAlign='center';ctx.fillText('Ты спишь… '+Math.max(0,Math.ceil(5-sleepSeconds))+' сек.',width/2,height/2);ctx.textAlign='left';}
  }
  function minuteOfDay(){return ((Math.floor(gameMinuteTotal)%GAME_MINUTES_PER_DAY)+GAME_MINUTES_PER_DAY)%GAME_MINUTES_PER_DAY;}
  function isNightTime(){const m=minuteOfDay();return m>=NIGHT_MINUTE||m<DAWN_MINUTE;}
  function smoothstep(t){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);}
  function updateClockDisplay(force=false){
    const wholeMinute=Math.floor(gameMinuteTotal);
    if(!force&&wholeMinute===lastClockMinute)return;
    lastClockMinute=wholeMinute;
    const m=minuteOfDay(),h=Math.floor(m/60),mins=m%60;
    const timeText=String(h).padStart(2,'0')+':'+String(mins).padStart(2,'0');
    const clock=document.getElementById('world-clock');
    document.getElementById('game-time').textContent=timeText;
    let period='ДЕНЬ',icon='☀',skin='day';
    if(m>=18*60&&m<NIGHT_MINUTE){period='СУМЕРКИ';icon='🌇';skin='twilight';}
    else if(m>=NIGHT_MINUTE||m<4*60){period='НОЧЬ';icon='☾';skin='night';}
    else if(m>=4*60&&m<DAWN_MINUTE){period='РАССВЕТ';icon='🌅';skin='twilight';}
    document.getElementById('period-label').textContent=period;
    document.getElementById('clock-icon').textContent=icon;
    clock.classList.remove('day','twilight','night');clock.classList.add(skin);
    document.getElementById('minimap-period').textContent=period;
    const counter=document.getElementById('night-counter');
    counter.textContent='🌙 ПРОЖИТО НОЧЕЙ: '+survivedNights; counter.title='Счётчик увеличивается только после настоящего прохождения ночи или сна вечером';
    const hungerNode=document.getElementById('hunger-value');if(hungerNode)hungerNode.textContent=String(Math.max(0,Math.floor(hunger)));
    const hb=document.getElementById('hunger-bar');if(hb)hb.style.width=Math.max(0,Math.min(100,hunger))+'%';
    updateSkipDayHud();
  }
  function updateWorldClock(dt){
    const wasNightBefore=isNightTime();
    const previousMinute=gameMinuteTotal;
    gameMinuteTotal+=dt;
    const elapsedGameMinutes=gameMinuteTotal-previousMinute;
    hungerElapsedMinutes+=elapsedGameMinutes;
    while(hungerElapsedMinutes>=10){hungerElapsedMinutes-=10;hunger=Math.max(0,hunger-1);}
    if(hunger<=10&&!immortal){player.hp=Math.max(0,player.hp-dt*(hunger<=0?2.2:0.7));updateVitals();if(player.hp<=0)respawnPlayerAfterDefeat();}
    if(!inHouse){sheepSpawnTimer+=elapsedGameMinutes;if(sheepSpawnTimer>=10){sheepSpawnTimer-=10;spawnOneSheep();}}
    const oldMinuteOfDay=((previousMinute%GAME_MINUTES_PER_DAY)+GAME_MINUTES_PER_DAY)%GAME_MINUTES_PER_DAY;
    const newMinuteOfDay=((gameMinuteTotal%GAME_MINUTES_PER_DAY)+GAME_MINUTES_PER_DAY)%GAME_MINUTES_PER_DAY;
    // Count only an actual clock crossing through dawn. Manual admin time jumps never pass through this path.
    const crossedDawn=(oldMinuteOfDay<DAWN_MINUTE && newMinuteOfDay>=DAWN_MINUTE && gameMinuteTotal-previousMinute<60) || (oldMinuteOfDay>newMinuteOfDay && newMinuteOfDay>=DAWN_MINUTE && newMinuteOfDay<DAWN_MINUTE+2);
    if(crossedDawn){survivedNights++;refreshMineDailyStock();toast('Рассвет! Ты пережил ночь. Всего ночей: '+survivedNights+'.');saveGame();}
    lastDawnMarker=Math.floor((gameMinuteTotal-DAWN_MINUTE)/GAME_MINUTES_PER_DAY);
    const nightNow=isNightTime();
    if(nightNow&&!wasNightBefore){
      if(survivedNights>=3)toast('Четвёртая ночь… Тени выходят из леса!');
      else toast('Наступила ночь '+(survivedNights+1)+'. До появления монстров: '+(3-survivedNights)+'.');
    }
    if(!nightNow&&wasNightBefore){
      for(let j=monsters.length-1;j>=0;j--) if(!monsters[j].adminSpawned) monsters.splice(j,1);
      monsterSpawnTimer=0;
    }
    wasNight=nightNow;
    updateClockDisplay();
  }
  function drawDayNightOverlay(camX,camY){
    const m=minuteOfDay();
    let darkness=0;
    if(m>=NIGHT_MINUTE||m<4*60)darkness=.49;
    else if(m>=18*60&&m<NIGHT_MINUTE)darkness=.49*smoothstep((m-18*60)/(2*60));
    else if(m>=4*60&&m<DAWN_MINUTE)darkness=.49*(1-smoothstep((m-4*60)/(2*60)));
    if(darkness>0.005){
      ctx.fillStyle='rgba(7,12,39,'+darkness+')';ctx.fillRect(0,0,width,height);
      if(darkness>.12){
        // Stable, low-cost stars and a crescent moon; no image assets required.
        for(let i=0;i<38;i++){
          const sx=hash(i+91,701)*width,sy=hash(i+23,907)*Math.min(height*.48,250);
          const alpha=Math.min(.95,(darkness-.08)*2.3)*(.35+hash(i,443)*.65);
          ctx.fillStyle='rgba(222,235,255,'+alpha+')';ctx.fillRect(sx,sy,hash(i,2)>.8?2:1,hash(i+8,2)>.6?2:1);
        }
        const mx=width-110,my=75;
        ctx.save();ctx.shadowColor='#c6d8ff';ctx.shadowBlur=darkness*25;
        ctx.fillStyle='rgba(220,231,255,'+Math.min(.9,darkness*1.8)+')';ctx.beginPath();ctx.arc(mx,my,17,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='rgba(20,31,70,'+Math.min(.98,darkness*2)+')';ctx.beginPath();ctx.arc(mx+7,my-5,15,0,Math.PI*2);ctx.fill();ctx.restore();
        const px=player.x-camX,py=player.y-camY;
        const glow=ctx.createRadialGradient(px,py,3,px,py,105);
        glow.addColorStop(0,'rgba(255,202,115,.17)');glow.addColorStop(1,'rgba(255,202,115,0)');
        ctx.fillStyle=glow;ctx.fillRect(px-105,py-105,210,210);
      }
    } else if(m>=6*60&&m<8*60){
      const dawnTint=(1-smoothstep((m-6*60)/(2*60)))*.035;
      if(dawnTint>.002){ctx.fillStyle='rgba(255,195,123,'+dawnTint+')';ctx.fillRect(0,0,width,height);}
    }
  }
  function mapPoint(x,y,mw,mh){return {x:5+(x/(COLS*TILE))*(mw-10),y:5+(y/(ROWS*TILE))*(mh-10)};}
  function tileKey(x,y){return Math.floor(x)+','+Math.floor(y);}
  function exploredWorldPoint(x,y){
    const tx=Math.floor(x/TILE),ty=Math.floor(y/TILE);
    return exploredCells.has(tileKey(tx,ty));
  }
  function markExploredAroundPlayer(){
    if(!currentWorldId)return;
    const px=Math.floor(player.x/TILE),py=Math.floor(player.y/TILE),radius=3;
    for(let y=py-radius;y<=py+radius;y++)for(let x=px-radius;x<=px+radius;x++){
      if(x<0||y<0||x>=COLS||y>=ROWS)continue;
      const dx=x-px,dy=y-py;
      if(dx*dx+dy*dy<=radius*radius+1)exploredCells.add(tileKey(x,y));
    }
  }
  function drawMinimap(){
    if(!minimapCtx||!minimapCanvas)return;
    const c=minimapCtx,mw=minimapCanvas.width,mh=minimapCanvas.height;
    c.clearRect(0,0,mw,mh);c.fillStyle='#091522';c.fillRect(0,0,mw,mh);
    const ox=5,oy=5,usableW=mw-10,usableH=mh-10,cw=usableW/COLS,ch=usableH/ROWS;
    // Unknown cells stay dark. Only cells revealed by the player's exploration are drawn.
    c.fillStyle='#152236';
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
      if(!exploredCells.has(tileKey(x,y)))continue;
      let color;
      if(waterAt(x+.5,y+.5))color='#246681';
      else if(pathAt(x+.5,y+.5))color='#927951';
      else {const h=hash(x,y);color=h>.65?'#2d5d43':h>.3?'#254e3a':'#1f4636';}
      c.fillStyle=color;c.fillRect(ox+x*cw,oy+y*ch,Math.ceil(cw+.25),Math.ceil(ch+.25));
      if(gameSettings.graphicsQuality!=='low'&&!waterAt(x+.5,y+.5)&&hash(x,y)>.957){c.fillStyle='#102e25';c.fillRect(ox+x*cw+cw*.3,oy+y*ch+ch*.3,Math.max(1,cw*.45),Math.max(1,ch*.45));}
    }
    const mapPointLocal=(x,y)=>({x:ox+(x/(COLS*TILE))*usableW,y:oy+(y/(ROWS*TILE))*usableH});
    let p;
    // Landmarks and monsters appear only after their surrounding tile has been explored.
    p=mapPointLocal(36*TILE,15*TILE);
    if(exploredWorldPoint(36*TILE,15*TILE)){c.fillStyle='#e5b97b';c.fillRect(p.x-2.4,p.y-2,4.8,4);c.fillStyle='#814b46';c.beginPath();c.moveTo(p.x-3.5,p.y-2);c.lineTo(p.x,p.y-5.5);c.lineTo(p.x+3.5,p.y-2);c.closePath();c.fill();}
    if(exploredWorldPoint(mineTileX*TILE+16,mineTileY*TILE+16)){p=mapPointLocal(mineTileX*TILE+16,mineTileY*TILE+16);c.fillStyle='#ffcf75';c.beginPath();c.arc(p.x,p.y,3.4,0,Math.PI*2);c.fill();c.fillStyle='#101923';c.beginPath();c.arc(p.x,p.y,1.7,0,Math.PI*2);c.fill();}
    for(const t of world.trees){if(!exploredWorldPoint(t.x,t.y))continue;p=mapPointLocal(t.x,t.y);c.fillStyle='#0d2a21';c.fillRect(p.x,p.y,1.65,1.65);}
    for(const r of world.rocks){if(!exploredWorldPoint(r.x,r.y))continue;p=mapPointLocal(r.x,r.y);c.fillStyle='#8c9a9b';c.fillRect(p.x,p.y,1.7,1.7);}
    for(const s of world.signs){if(!exploredWorldPoint(s.x,s.y))continue;p=mapPointLocal(s.x,s.y);c.fillStyle='#f4d58d';c.fillRect(p.x-1.5,p.y-1.5,3,3);}
    for(const mob of monsters){if(!exploredWorldPoint(mob.x,mob.y))continue;p=mapPointLocal(mob.x,mob.y);c.fillStyle=mob.type==='bomb'?'#ff9a43':mob.type==='skeleton'?'#d7e1ed':'#ff536d';c.beginPath();c.arc(p.x,p.y,mob.type==='bomb'?3.2:2.8,0,Math.PI*2);c.fill();}
    if(currentWorldId){p=mapPointLocal(player.x,player.y);c.save();c.shadowColor='#fff1aa';c.shadowBlur=8;c.fillStyle='#fff2a9';c.beginPath();c.arc(p.x,p.y,3.2,0,Math.PI*2);c.fill();c.restore();}
    const percent=Math.min(100,Math.round(exploredCells.size/(COLS*ROWS)*100));
    const discovery=document.getElementById('minimap-discovery');if(discovery)discovery.textContent=percent+'% ОТКРЫТО';
    c.strokeStyle='rgba(202,225,255,.45)';c.lineWidth=1;c.strokeRect(.5,.5,mw-1,mh-1);
  }
  function monsterLabel(type){return ({yeti:'Йети',shadow:'Теневой монстр',brute:'Бронированный громила',wisp:'Болотный дух',skeleton:'Скелет-воин',bomb:'Взрывная бомбочка',ice:'Ледяной страж',scorpion:'Пустынный скорпион'})[type]||'Монстр';}
  function spawnMonster(typeOverride=null){
    for(let tries=0;tries<24;tries++){
      const angle=Math.random()*Math.PI*2, radius=380+Math.random()*220;
      const x=Math.max(TILE*2,Math.min(COLS*TILE-TILE*2,player.x+Math.cos(angle)*radius));
      const y=Math.max(TILE*2,Math.min(ROWS*TILE-TILE*2,player.y+Math.sin(angle)*radius));
      if(waterAt(x/TILE,y/TILE)||blocked(x,y))continue;
      let type=typeOverride;
      if(type===null){const biome=biomeAt(x/TILE,y/TILE),roll=Math.random();if(biome==='snow'&&roll<.42)type='yeti';else if(biome==='snow'&&roll<.72)type='ice';else if(biome==='desert'&&roll<.58)type='scorpion';else type=roll<.28?'skeleton':(['shadow','brute','wisp'][Math.floor(Math.random()*3)]);}
      const cfg=difficultyConfig(),baseHp=type==='yeti'?120:type==='bomb'?55:type==='skeleton'?80:type==='brute'?135:type==='ice'?115:type==='scorpion'?90:100,hp=Math.max(20,Math.round(baseHp*cfg.monsterHp));
      const speed=(type==='yeti'?45:type==='brute'?31:type==='wisp'?58:type==='skeleton'?47:type==='bomb'?49:type==='ice'?39:type==='scorpion'?62:43)*(currentDifficulty==='easy'?.88:currentDifficulty==='hell'?1.2:currentDifficulty==='hard'?1.1:1);
      monsters.push({x,y,hp,maxHp:hp,type,speed,damageScale:cfg.monsterDamage,attackCooldown:0,phase:Math.random()*6.28,flash:0,fuseStarted:false,fuseTime:1.45,exploding:false,explosionTimer:0,damageApplied:false});
      const warning=document.getElementById('night-warning');if(warning){warning.hidden=false;const text=document.getElementById('night-warning-text');if(text)text.textContent=type==='bomb'?'ОСТОРОЖНО: взрывная бомбочка! Убегай!':monsterLabel(type)+' появился в лесу';setTimeout(()=>{if(warning)warning.hidden=true;},2600);}
      drawMinimap();return true;
    }
    return false;
  }
  function monsterLootFor(type){
    const rand=(min,max)=>min+Math.floor(Math.random()*(max-min+1));
    const loot=[];
    if(type==='shadow'){
      loot.push({name:'Теневая эссенция',count:rand(1,2)});
      if(Math.random()<.34)loot.push({name:'Малое зелье',count:1});
      if(Math.random()<.18)loot.push({name:'Кристалл',count:1});
    }else if(type==='brute'){
      loot.push({name:'Кость',count:rand(1,2)},{name:'Камень',count:rand(1,3)});
      if(Math.random()<.35)loot.push({name:'Железо',count:1});
    }else if(type==='wisp'){
      loot.push({name:'Ядро духа',count:1});
      if(Math.random()<.32)loot.push({name:'Кристалл',count:1});
      if(Math.random()<.18)loot.push({name:'Малое зелье',count:1});
    }else if(type==='skeleton'){
      loot.push({name:'Кость',count:rand(2,3)});
      if(Math.random()<.28)loot.push({name:'Череп',count:1});
      if(Math.random()<.16)loot.push({name:'Железо',count:1});
    }else if(type==='bomb'){
      loot.push({name:'Осколок бомбы',count:rand(1,2)});
      if(Math.random()<.55)loot.push({name:'Уголь',count:rand(1,2)});
      if(Math.random()<.22)loot.push({name:'Кость',count:1});
    }else if(type==='ice'){
      loot.push({name:'Кристалл',count:rand(1,2)});if(Math.random()<.24)loot.push({name:'Малое зелье',count:1});
    }else if(type==='scorpion'){
      loot.push({name:'Пустынный хитин',count:rand(1,2)});if(Math.random()<.22)loot.push({name:'Кристалл',count:1});
    }
    if(skills.scout>0&&Math.random()<skills.scout*.08)loot.push({name:Math.random()<.5?'Кристалл':'Малое зелье',count:1});
    return loot;
  }
  function dropMonsterLoot(mob){
    if(!mob||mob.lootDropped)return;
    mob.lootDropped=true;
    const loot=monsterLootFor(mob.type);
    for(const item of loot){
      lootDrops.push({x:mob.x+(Math.random()-.5)*28,y:mob.y+(Math.random()-.5)*24,name:item.name,count:item.count,life:240,phase:Math.random()*6.28});
    }
    if(lootDrops.length>80)lootDrops.splice(0,lootDrops.length-80);
    saveGame();
  }
  function drawLootDrops(camX,camY,time){
    for(const drop of lootDrops){
      const x=drop.x-camX,y=drop.y-camY+Math.sin(time/230+drop.phase)*2;
      if(x<-25||x>width+25||y<-30||y>height+30)continue;
      const item=inventoryItems.find(i=>i.name===drop.name),icon=item?.icon||'✨';
      ctx.save();ctx.shadowColor='#ffd46f';ctx.shadowBlur=10;ctx.fillStyle='#102033dd';ctx.beginPath();ctx.arc(x,y,13,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
      ctx.strokeStyle='#ffd46f';ctx.lineWidth=1.5;ctx.stroke();ctx.font='15px Segoe UI Emoji';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(icon,x,y);ctx.textBaseline='alphabetic';
      if(drop.count>1){ctx.fillStyle='#fff2be';ctx.font='bold 10px Segoe UI';ctx.textAlign='center';ctx.fillText('×'+drop.count,x+12,y-10);}ctx.restore();
    }
  }
  function pickUpLoot(dt){
    if(inHouse||mineMode||caveMode||tradeWorldMode)return;
    for(let i=lootDrops.length-1;i>=0;i--){const drop=lootDrops[i];drop.life-=dt;if(drop.life<=0){lootDrops.splice(i,1);continue;}
      if(Math.hypot(player.x-drop.x,player.y-drop.y)<34){spawnVisualBurst(drop.x,drop.y,7,'spark','#ffe28b');changeItem(drop.name,drop.count);playSound('coin');toast('Подобрано: '+drop.name+' ×'+drop.count);lootDrops.splice(i,1);renderInventory();saveGame();}
    }
  }
  function respawnPlayerAfterDefeat(){
    const penalties={easy:{gold:200,hunger:10,items:0,dropChance:0},medium:{gold:500,hunger:20,items:2,dropChance:.65},hard:{gold:1500,hunger:35,items:4,dropChance:.8},hell:{gold:3000,hunger:55,items:999,dropChance:.72}};
    const cfg=penalties[currentDifficulty]||penalties.medium,deathX=player.x,deathY=player.y;let dropped=0;
    walletCents=Math.max(0,walletCents-cfg.gold);hunger=Math.max(0,hunger-cfg.hunger);
    const candidates=inventoryItems.filter(i=>i.count>0&&!['Деревянный меч','Топор','Кирка'].includes(i.name)).sort(()=>Math.random()-.5);
    let remaining=cfg.items;
    for(const item of candidates){if(remaining<=0)break;const wanted=currentDifficulty==='hell'?Math.max(1,Math.ceil(item.count*(.35+Math.random()*.4))):Math.min(item.count,1+Math.floor(Math.random()*2));const amount=Math.min(item.count,wanted,remaining);if(amount<=0)continue;item.count-=amount;remaining-=amount;if(Math.random()<cfg.dropChance&&lootDrops.length<76){lootDrops.push({x:deathX+(Math.random()-.5)*48,y:deathY+(Math.random()-.5)*42,name:item.name,count:amount,life:240,phase:Math.random()*6.28});dropped+=amount;}}
    if(caveMode){caveMode=false;player.x=caveReturn.x;player.y=caveReturn.y;}
    inHouse=false;mineMode=false;tradeWorldMode=false;player.hp=100;player.x=bedSpawn.x;player.y=bedSpawn.y;player.vx=player.vy=0;dodgeTimer=0;monsters.length=0;
    updateVitals();renderInventory();updateWalletHud();
    const message=currentDifficulty==='easy'?'Ты погиб, но вещи сохранены. Потеряно до 2 золота и 10 голода.':currentDifficulty==='medium'?'Ты погиб и возродился у кровати. Потеряно до 5 золота и 20 голода.':currentDifficulty==='hard'?'Ты погиб. Потеряно до 15 золота, часть вещей и 35 голода.':'Ты погиб на жаре. Потеряно до 30 золота, часть ресурсов и 55 голода.';
    toast(message+(dropped?' Выпавшие вещи остались на месте смерти.':''));saveGame();
  }
  function updateMonsters(dt){
    if(tradeWorldMode||inHouse||mineMode||caveMode){return;}
      const active=isNightTime()&&(worldEarlyMonsters===true||survivedNights>=3);
    if(active){monsterSpawnTimer+=dt;if(monsterSpawnTimer>=10*difficultyConfig().monsterSpawn&&monsters.length<6){if(Math.random()<.20)spawnMonster('bomb');else spawnMonster();monsterSpawnTimer=0;}}
    else {monsterSpawnTimer=0;for(let j=monsters.length-1;j>=0;j--)if(!monsters[j].adminSpawned)monsters.splice(j,1);}
    damageToastTimer=Math.max(0,damageToastTimer-dt);
    for(let i=monsters.length-1;i>=0;i--){
      const mob=monsters[i];mob.flash=Math.max(0,mob.flash-dt);
      if(mob.exploding){mob.explosionTimer-=dt;if(mob.explosionTimer<=0)monsters.splice(i,1);continue;}
      const dx=player.x-mob.x,dy=player.y-mob.y,dist=Math.hypot(dx,dy)||1;
      if(dist>25){const speed=mob.speed||43,nx=mob.x+dx/dist*speed*dt,ny=mob.y+dy/dist*speed*dt;if(!blocked(nx,mob.y))mob.x=nx;if(!blocked(mob.x,ny))mob.y=ny;}
      const currentDistance=Math.hypot(player.x-mob.x,player.y-mob.y);
      if(mob.type==='bomb'){
        if(!mob.fuseStarted&&currentDistance<145){mob.fuseStarted=true;mob.fuseTime=1.45;toast('Бомбочка зажгла фитиль! Убегай — взрыв опасен.');}
        if(mob.fuseStarted){mob.fuseTime-=dt;if(mob.fuseTime<=0){mob.exploding=true;mob.explosionTimer=.42;if(!immortal&&dodgeTimer<=0&&Math.hypot(player.x-mob.x,player.y-mob.y)<=116){const bombDamage=Math.round(30*difficultyConfig().monsterDamage);player.hp=Math.max(0,player.hp-bombDamage);updateVitals();toast('Взрыв бомбочки! −'+bombDamage+' здоровья.');if(player.hp<=0)respawnPlayerAfterDefeat();}else toast('Бомбочка взорвалась! Ты успел убежать.');dropMonsterLoot(mob);playSound('hit');}continue;}
        continue;
      }
      const reduction=armorReduction();if(mob.type==='yeti'){mob.attackCooldown=Math.max(0,(mob.attackCooldown||0)-dt);if(currentDistance<=43&&!immortal&&mob.attackCooldown<=0&&dodgeTimer<=0){const damage=Math.max(1,Math.round(10*(mob.damageScale||difficultyConfig().monsterDamage)*(1-reduction)));player.hp=Math.max(0,player.hp-damage);mob.attackCooldown=.9;updateVitals();toast('Йети ударил тебя: −'+damage+' HP!');}}else if(currentDistance<=34&&!immortal){const damage=(mob.type==='brute'?7:mob.type==='skeleton'?6:mob.type==='ice'?7:mob.type==='scorpion'?6:5)*dt*(mob.damageScale||difficultyConfig().monsterDamage)*(1-reduction)*(dodgeTimer>0?0:1);player.hp=Math.max(0,player.hp-damage);updateVitals();if(damageToastTimer<=0){toast(monsterLabel(mob.type)+' атакует!');damageToastTimer=1.6;}}
      if(player.hp<=0&&immortal){player.hp=100;updateVitals();}
      if(player.hp<=0){respawnPlayerAfterDefeat();break;}
    }
  }
  function spawnOneSheep(){
    // One sheep every 10 game minutes; keep at least 25 tiles between living sheep.
    for(let tries=0;tries<500;tries++){
      const x=(3+Math.random()*(COLS-6))*TILE,y=(3+Math.random()*(ROWS-6))*TILE;
      if(waterAt(x/TILE,y/TILE)||(!inHouse&&blocked(x,y))||Math.hypot(x-player.x,y-player.y)<120)continue;
      if(sheep.some(a=>a.alive&&Math.hypot(a.x-x,a.y-y)<25*TILE))continue;
      sheep.push({x,y,hp:60,maxHp:60,phase:Math.random()*6.28,dir:Math.random()*6.28,wander:1+Math.random()*4,alive:true});
      sheepSpawned=true;saveGame();toast('В долине появилась овца.');return true;
    }
    return false;
  }
  function drawSheep(camX,camY,time){for(const a of sheep){if(!a.alive)continue;const x=a.x-camX,y=a.y-camY;if(x<-35||x>width+35||y<-35||y>height+35)continue;const bob=Math.sin(time/280+a.phase)*1.2;ctx.save();ctx.translate(x,y+bob);ctx.fillStyle='#101c1c66';ctx.beginPath();ctx.ellipse(0,8,15,6,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e9e8df';for(const [cx,cy,r] of [[-8,-2,7],[0,-5,8],[8,-2,7],[-2,2,8],[7,3,6]]){ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#7b574b';ctx.fillRect(8,-7,8,11);ctx.fillStyle='#211d24';ctx.fillRect(13,-4,2,2);ctx.fillStyle='#5e4a40';const leg=Math.sin(time/90+a.phase)*2;ctx.fillRect(-7,5+leg,3,6);ctx.fillRect(5,5-leg,3,6);ctx.restore();}}
  function updateSheep(dt){if(inHouse)return;for(const a of sheep){if(!a.alive)continue;a.wander-=dt;if(a.wander<=0){a.dir=Math.random()*Math.PI*2;a.wander=1+Math.random()*4;}const nx=a.x+Math.cos(a.dir)*13*dt,ny=a.y+Math.sin(a.dir)*13*dt;if(!blocked(nx,a.y))a.x=nx;if(!blocked(a.x,ny))a.y=ny;}}
  function drawMonsters(camX,camY,time){
    for(const mob of monsters){
      const x=mob.x-camX,y=mob.y-camY;if(x<-45||x>width+45||y<-45||y>height+45)continue;
      if(mob.exploding){const p=1-Math.max(0,mob.explosionTimer)/.42;ctx.save();ctx.globalAlpha=Math.max(.15,1-p*.7);ctx.fillStyle='#ff7a32';ctx.beginPath();ctx.arc(x,y,24+90*p,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ffe7a0';ctx.lineWidth=5;ctx.beginPath();ctx.arc(x,y,15+72*p,0,Math.PI*2);ctx.stroke();ctx.restore();continue;}
      const bob=Math.sin(time/210+mob.phase)*2;ctx.save();ctx.translate(x,y+bob);ctx.fillStyle='#090f1e88';ctx.beginPath();ctx.ellipse(0,10,16,7,0,0,Math.PI*2);ctx.fill();
      if(mob.type==='ice'){ctx.fillStyle=mob.flash>0?'#fff':'#6fd7ee';ctx.shadowColor='#6fe6ff';ctx.shadowBlur=gameSettings.graphicsQuality==='low'?0:12;ctx.beginPath();ctx.moveTo(0,-25);ctx.lineTo(16,-7);ctx.lineTo(12,10);ctx.lineTo(0,17);ctx.lineTo(-12,10);ctx.lineTo(-16,-7);ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#e5fcff';ctx.fillRect(-7,-11,4,4);ctx.fillRect(4,-11,4,4);ctx.fillStyle='#25759b';ctx.fillRect(-7,1,14,5);}
      else if(mob.type==='scorpion'){ctx.fillStyle=mob.flash>0?'#fff':'#bd7b36';ctx.beginPath();ctx.ellipse(0,2,15,10,0,0,Math.PI*2);ctx.fill();ctx.fillRect(-13,-4,6,8);ctx.fillRect(9,-4,6,8);ctx.strokeStyle='#e1a14a';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(7,-4);ctx.quadraticCurveTo(20,-12,14,-22);ctx.stroke();ctx.fillStyle='#e84a42';ctx.beginPath();ctx.moveTo(12,-22);ctx.lineTo(18,-26);ctx.lineTo(16,-18);ctx.closePath();ctx.fill();ctx.fillStyle='#261a16';ctx.fillRect(-6,-5,3,3);ctx.fillRect(4,-5,3,3);}
      else if(mob.type==='skeleton'){
        if(gameSettings.graphicsQuality==='high'){ctx.shadowColor='#e2e8f0';ctx.shadowBlur=9;}
        ctx.fillStyle=mob.flash>0?'#fff':'#d5d0bd';ctx.fillRect(-8,-22,16,15);ctx.fillStyle='#3b3030';ctx.fillRect(-5,-17,3,4);ctx.fillRect(3,-17,3,4);ctx.fillRect(-3,-10,6,2);ctx.shadowBlur=0;
        ctx.fillStyle='#e6dfcb';ctx.fillRect(-5,-6,10,14);ctx.fillRect(-14,-4,8,4);ctx.fillRect(6,-4,8,4);ctx.fillRect(-5,8,4,11);ctx.fillRect(2,8,4,11);ctx.fillStyle='#9fa6ae';ctx.fillRect(-3,-1,6,3);ctx.fillRect(-3,4,6,3);
        ctx.fillStyle='#7b8790';ctx.fillRect(9,-11,3,21);ctx.fillStyle='#cdd5dc';ctx.beginPath();ctx.moveTo(7,-13);ctx.lineTo(14,-24);ctx.lineTo(16,-12);ctx.closePath();ctx.fill();
      }else if(mob.type==='bomb'){
        const blink=mob.fuseStarted&&Math.floor(time/100)%2===0;ctx.fillStyle=mob.flash>0?'#fff':(blink?'#ff4f40':'#242631');ctx.beginPath();ctx.arc(0,0,14,0,Math.PI*2);ctx.fill();ctx.fillStyle='#4e5362';ctx.fillRect(-7,-8,5,4);ctx.fillRect(3,2,6,4);ctx.fillStyle='#ffbd53';ctx.beginPath();ctx.moveTo(-2,-13);ctx.lineTo(3,-19);ctx.lineTo(7,-17);ctx.lineTo(4,-11);ctx.closePath();ctx.fill();ctx.strokeStyle='#ead8a2';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(3,-17);ctx.lineTo(9,-23);ctx.stroke();ctx.fillStyle=blink?'#ff352f':'#ffd75d';ctx.beginPath();ctx.arc(10,-24,3+(blink?2:0),0,Math.PI*2);ctx.fill();
        if(mob.fuseStarted){ctx.fillStyle='#fff1a7';ctx.font='bold 11px Segoe UI';ctx.textAlign='center';ctx.fillText(Math.max(0,mob.fuseTime).toFixed(1),0,-29);ctx.textAlign='left';}
      }else{
        if(gameSettings.graphicsQuality==='high'){ctx.shadowColor='#ca3f77';ctx.shadowBlur=17;}
        ctx.fillStyle=mob.flash>0?'#f8c5d6':mob.type==='brute'?'#6b2938':mob.type==='wisp'?'#327b88':'#2b203f';ctx.beginPath();ctx.moveTo(-13,2);ctx.quadraticCurveTo(-19,-14,-7,-18);ctx.lineTo(-3,-24);ctx.lineTo(2,-18);ctx.quadraticCurveTo(18,-14,13,2);ctx.quadraticCurveTo(0,13,-13,2);ctx.fill();ctx.shadowBlur=0;
        ctx.fillStyle=mob.type==='wisp'?'#8ef5ff':mob.type==='brute'?'#ffc06a':'#ff6c8b';ctx.fillRect(-7,-10,4,3);ctx.fillRect(3,-10,4,3);ctx.fillStyle='#fff0ba';ctx.fillRect(-6,-10,2,2);ctx.fillRect(4,-10,2,2);
        if(mob.type==='brute'){ctx.fillStyle='#8a765e';ctx.fillRect(-15,-9,7,14);ctx.fillRect(8,-9,7,14);}ctx.fillStyle='#0b1121';ctx.fillRect(-10,-22,5,5);ctx.fillRect(5,-22,5,5);
      }
      ctx.restore();
      if(mob.hp<mob.maxHp){ctx.fillStyle='#231c2b';ctx.fillRect(x-15,y-36,30,4);ctx.fillStyle='#fb6289';ctx.fillRect(x-15,y-36,30*Math.max(0,mob.hp/mob.maxHp),4);}
    }
  }
  function updateVitals(){const hp=document.querySelector('.hp i'),stamina=document.querySelector('.stamina i');if(hp)hp.style.width=Math.max(0,Math.min(100,player.hp))+'%';if(stamina)stamina.style.width=Math.max(0,Math.min(100,player.stamina))+'%';}
  function attackNearestMonster(){
    if(playerAttackCooldown>0)return;playerAttackCooldown=.7;attackAnimTimer=.24;playSound('hit');spawnVisualBurst(player.x+(player.face==='left'?-20:player.face==='right'?20:0),player.y+(player.face==='up'?-22:player.face==='down'?12:0),5,'spark','#d8eeff');
    if(caveMode&&!caveBossDefeated){const bossDistance=Math.hypot(player.x-caveBossX,player.y-caveBossY);if(bossDistance<Math.max(115,weaponRange()+30)){const weapon=equipment.weapon||'Деревянный меч';const base=weaponDamage(weapon);const damage=Math.round(base*(1+skills.warrior*.1)*(weapon==='Ледяной посох'&&equipment.armor==='Мантия мага'?1.15:1)*(Math.random()<.14?2:1));caveBossHp=Math.max(0,caveBossHp-damage);caveBossFlash=.18;spawnVisualBurst(caveBossX,caveBossY,12,'spark',weapon==='Огненный меч'?'#ff9a42':'#b6e7ff');toast('Страж получил '+damage+' урона ('+Math.ceil(caveBossHp)+'/'+bossMaxHp()+').');if(caveBossHp<=0){caveBossDefeated=true;walletCents+=10000;changeItem('Кристалл',5);changeItem('Железо',8);changeItem('Малое зелье',3);awardXP(240,'победа над Каменным стражем');renderInventory();spawnVisualBurst(caveBossX,caveBossY,36,'spark','#8ef5ff');toast('Каменный страж побеждён! +100 золота, 5 кристаллов, 8 железа.');saveGame();}else saveGame();return;}toast('Подойди к Каменному стражу ближе.');return;}
    if(caveMode){toast(caveBossDefeated?'Сокровищница уже доступна. Подойди к сундуку и нажми E.':'Подойди к Каменному стражу ближе.');return;}
    let target=null,best=weaponRange();for(const mob of monsters){const d=Math.hypot(mob.x-player.x,mob.y-player.y);if(d<best){best=d;target=mob;}}
    if(target){const weapon=equipment.weapon||'Деревянный меч',baseDamage=weaponDamage(weapon)*(1+skills.warrior*.1)*(weapon==='Ледяной посох'&&equipment.armor==='Мантия мага'?1.15:1),critical=Math.random()<.14,swordDamage=Math.round(critical?baseDamage*2:baseDamage);target.hp-=swordDamage;target.flash=.2;spawnVisualBurst(target.x,target.y,critical?16:8,'spark',weapon==='Огненный меч'?'#ff8738':weapon==='Ледяной посох'?'#8be9ff':weapon==='Молниеносное копьё'?'#d8a4ff':critical?'#ffe16b':'#ff9aa9');if(critical)toast('КРИТИЧЕСКИЙ УДАР! ×2 урона!');if(target.hp<=0){const i=monsters.indexOf(target);if(i>=0)monsters.splice(i,1);spawnVisualBurst(target.x,target.y,20,'spark',target.type==='skeleton'?'#e5e1d0':'#ff7b9b');dropMonsterLoot(target);trackAdventureQuest('hunt',1);awardXP(target.type==='brute'?35:target.type==='skeleton'?28:target.type==='wisp'?24:target.type==='bomb'?20:target.type==='ice'?38:target.type==='scorpion'?32:18,'победа над монстром');questStage=Math.max(questStage,4);toast(monsterLabel(target.type)+' побеждён! На земле осталась добыча.');}else toast('Удар на '+swordDamage+' урона! У монстра осталось '+target.hp+' здоровья.');drawMinimap();return;}
    const selectedItem=inventoryItems.filter(entry=>entry.count>0)[selectedSlot-1];
    if(selectedItem&&selectedItem.name==='Топор'){
      let treeTarget=null;best=86;for(const tree of world.trees){const d=Math.hypot(tree.x-player.x,tree.y-player.y);if(d<best){best=d;treeTarget=tree;}}
      if(treeTarget){treeTarget.chops=(treeTarget.chops||0)+1;treeTarget.flash=.18;spawnVisualBurst(treeTarget.x,treeTarget.y-15,7,'leaf','#78c96d');playSound('wood');if(treeTarget.chops>=5){world.trees.splice(world.trees.indexOf(treeTarget),1);const add=(name,n)=>{const it=inventoryItems.find(i=>i.name===name);if(it)it.count+=n;};add('Древесина',7);add('Листья',3);add('Палка',1);questStage=Math.max(questStage,2);renderInventory();awardXP(12,'дерево срублено');saveGame();toast('Дерево срублено: +7 древесины, +3 листка, +1 палка.');}else toast('Удар топором '+treeTarget.chops+'/5');renderInventory();return;}
    }
    let targetSheep=null;best=82;for(const a of sheep){if(!a.alive)continue;const d=Math.hypot(a.x-player.x,a.y-player.y);if(d<best){best=d;targetSheep=a;}}
    if(targetSheep){playSound('sheep');spawnVisualBurst(targetSheep.x,targetSheep.y,5,'dust','#e8e4d7');targetSheep.hp-=20;if(targetSheep.hp<=0){targetSheep.alive=false;const meat=inventoryItems.find(i=>i.name==='Мясо');if(meat)meat.count+=2;questStage=Math.max(questStage,5);renderInventory();saveGame();toast('Овца погибла. Получено 2 мяса.');}else toast('Ты ударил овцу.');return;}
    toast('Подойди ближе к монстру или овце.');
  }
  function renderWorkbenchStatus(message=''){
    const status=document.getElementById('workbench-status');if(!status)return;
    const stone=inventoryItems.find(i=>i.name==='Камень')?.count||0,wood=inventoryItems.find(i=>i.name==='Древесина')?.count||0;
    status.textContent=message||('Материалы: камень '+stone+'/8 · древесина '+wood+'/6 · дом ур. '+houseLevel+'/3 · шахта ур. '+mineLevel+'/5');
    updateUpgradeCards();
  }
  function updateFarmPlots(dt){let changed=false;for(const plot of placedStructures){if(plot.type!=='farmplot'||(plot.stage||0)>=3)continue;const old=plot.stage||0;plot.growSeconds=(plot.growSeconds||0)+dt;plot.stage=Math.min(3,Math.floor(plot.growSeconds/25));if(plot.stage!==old){changed=true;spawnVisualBurst(plot.x,plot.y,5,'leaf','#85d45e');if(plot.stage===3)toast('На грядке созрел урожай! Подойди и нажми E.');}}if(changed)saveGame();}
  function trackAdventureQuest(kind,amount=1){if(!(kind in adventureQuestProgress))return;const limits={hunt:5,mining:10,harvest:5};adventureQuestProgress[kind]=Math.min(limits[kind],(adventureQuestProgress[kind]||0)+amount);renderInventoryTab();saveGame();}
  const adventureQuestDefs=[{id:'hunt',title:'Охотник на чудовищ',desc:'Победи 5 монстров',target:5,rewardGold:35,rewardXP:90},{id:'mining',title:'Шахтёр',desc:'Добудь 10 залежей руды',target:10,rewardGold:25,rewardXP:70},{id:'harvest',title:'Первая ферма',desc:'Собери урожай с 5 грядок',target:5,rewardGold:45,rewardXP:100}];
  function claimAdventureQuest(id){const q=adventureQuestDefs.find(v=>v.id===id);if(!q)return;const progress=adventureQuestProgress[id]||0;if(progress<q.target){toast('Задание ещё не выполнено.');return;}adventureQuestProgress[id]=0;walletCents+=q.rewardGold*100;awardXP(q.rewardXP,'задание '+q.title);if(id==='hunt')changeItem('Кристалл',1);if(id==='mining')changeItem('Железо',3);if(id==='harvest')changeItem('Малое зелье',2);renderInventory();renderInventoryTab();saveGame();toast('Задание выполнено: '+q.title+'! Награда получена.');}
  let skillTreeReturnToPause=false;
  function openSkillTree(){skillTreeReturnToPause=paused&&document.getElementById('pause-shade')&&!document.getElementById('pause-shade').hidden;paused=true;keys.clear();if(inventoryDialogOpen){inventoryDialogOpen=false;setPanelOpen('inventory-shade',false);}renderSkillTree();setPanelOpen('skill-tree-shade',true);}
  function renderSkillTree(){const list=document.getElementById('skill-tree-list');if(!list)return;const defs=[{id:'warrior',title:'Ветка воина',icon:'⚔️',desc:'Урон оружия +10% за уровень',max:5},{id:'miner',title:'Ветка шахтёра',icon:'⛏️',desc:'Шанс добыть дополнительную руду +8% за уровень',max:5},{id:'scout',title:'Ветка исследователя',icon:'🧭',desc:'Скорость +2,5% и больше редкой добычи',max:5}];list.innerHTML=defs.map(q=>'<div class="workbench-recipe"><div class="workbench-recipe-icon">'+q.icon+'</div><div class="workbench-recipe-main"><b>'+q.title+' · '+skills[q.id]+'/'+q.max+'</b><small>'+q.desc+'</small><span>Очков навыков: '+skillPoints+'</span></div><button class="action" data-skill-up="'+q.id+'" '+(skillPoints<=0||skills[q.id]>=q.max?'disabled':'')+'>Улучшить</button></div>').join('');list.querySelectorAll('[data-skill-up]').forEach(b=>b.addEventListener('click',()=>upgradeSkill(b.dataset.skillUp)));const points=document.getElementById('skill-points');if(points)points.textContent='Свободные очки: '+skillPoints;}
  function upgradeSkill(id){if(!Object.prototype.hasOwnProperty.call(skills,id)||skillPoints<=0||skills[id]>=5){toast('Нет свободных очков навыков.');return;}skills[id]++;skillPoints--;renderSkillTree();updateProgressHud();saveGame();playSound('craft');toast('Навык улучшен: '+id+'.');}
  function openStorage(structure){activeStorageStructure=structure;storageDialogOpen=true;paused=true;keys.clear();renderStorage();setPanelOpen('storage-shade',true);}
  function renderStorage(){const list=document.getElementById('storage-items');if(!list||!activeStorageStructure)return;const contents=activeStorageStructure.contents||(activeStorageStructure.contents={});const candidates=inventoryItems.filter(i=>i.count>0&&i.name!=='Сундук-хранилище'&&i.name!=='Грядка с семенами');list.innerHTML='<div class="storage-summary">В сундуке: '+Object.values(contents).reduce((a,b)=>a+(Number(b)||0),0)+' предметов · В инвентаре: '+candidates.reduce((a,b)=>a+b.count,0)+' предметов</div>'+inventoryItems.filter(i=>i.name!=='Сундук-хранилище'&&i.name!=='Грядка с семенами'&&((contents[i.name]||0)>0||i.count>0)).map(i=>{const equipped=Object.values(equipment).includes(i.name);return '<div class="storage-row"><span class="storage-icon">'+i.icon+'</span><span class="storage-name">'+i.name+'<small>Инвентарь: '+i.count+' · Сундук: '+(contents[i.name]||0)+(equipped?' · Надето':'')+'</small></span><button class="action" data-storage="put" data-item="'+escapeHtml(i.name)+'" '+(i.count<1||equipped?'disabled':'')+'>Положить 1</button><button class="action secondary" data-storage="take" data-item="'+escapeHtml(i.name)+'" '+(!(contents[i.name]>0)?'disabled':'')+'>Забрать 1</button></div>';}).join('');list.querySelectorAll('[data-storage]').forEach(b=>b.addEventListener('click',()=>transferStorage(b.dataset.item,b.dataset.storage)));}
  function transferStorage(name,mode){if(!activeStorageStructure)return;const c=activeStorageStructure.contents||(activeStorageStructure.contents={});if(mode==='put'){if(Object.values(equipment).includes(name)){toast('Сначала сними предмет в инвентаре экипировки.');return;}if(itemCount(name)<1)return;changeItem(name,-1);c[name]=(c[name]||0)+1;}else{if((c[name]||0)<1)return;c[name]--;changeItem(name,1);if(c[name]<=0)delete c[name];}renderStorage();renderInventory();saveGame();}
  function closeStorage(){storageDialogOpen=false;setPanelOpen('storage-shade',false);activeStorageStructure=null;paused=false;saveGame();canvas.focus();}
  function openWorkbench(){
    workbenchDialogOpen=true;keys.clear();renderWorkbenchStatus();
    const shade=document.getElementById('workbench-shade');shade.hidden=false;shade.setAttribute('aria-hidden','false');
  }
  function closeWorkbench(){
    workbenchDialogOpen=false;const shade=document.getElementById('workbench-shade');shade.hidden=true;shade.setAttribute('aria-hidden','true');keys.clear();canvas.focus();
  }
  function craftFurnace(){
    const stone=inventoryItems.find(i=>i.name==='Камень'),wood=inventoryItems.find(i=>i.name==='Древесина'),furnace=inventoryItems.find(i=>i.name==='Печь');
    if(!stone||!wood||!furnace){toast('Рецепт печи недоступен: предметы не найдены.');return;}
    if(stone.count<8||wood.count<6){const msg='Не хватает ресурсов. Нужно 8 камня и 6 древесины.';renderWorkbenchStatus(msg);toast(msg);return;}
    stone.count-=8;wood.count-=6;furnace.count+=1;furnaceCrafted=true;playSound('craft');workbenchUsed=true;questStage=Math.max(questStage,4);renderInventory();renderWorkbenchStatus('Печь создана! Она добавлена в инвентарь.');saveGame();toast('Крафт готов: печь ×1.');
  }
  function craftEquipment(kind){
    const recipes={sword:{name:'Железный меч',cost:{'Железо':3,'Древесина':2}},armor:{name:'Кожаная броня',cost:{'Мясо':4,'Древесина':5}},house:{name:'Комплект дома',cost:{'Древесина':24,'Камень':12,'Палка':6}},torch:{name:'Факел',cost:{'Древесина':1,'Уголь':1}},bandage:{name:'Бинт',cost:{'Листья':3,'Мясо':1}},pickaxe:{name:'Улучшенная кирка',cost:{'Железо':4,'Древесина':3}},flameSword:{name:'Огненный меч',cost:{'Железо':6,'Кристалл':3,'Уголь':5}},steelSword:{name:'Стальной меч',cost:{'Железо':8,'Уголь':5,'Древесина':3}},iceStaff:{name:'Ледяной посох',cost:{'Кристалл':4,'Древесина':5,'Уголь':3}},lightningSpear:{name:'Молниеносное копьё',cost:{'Железо':6,'Кристалл':3,'Палка':4}},guardianArmor:{name:'Броня стража',cost:{'Железо':10,'Кость':6,'Кристалл':2}},mageRobe:{name:'Мантия мага',cost:{'Кристалл':3,'Листья':8,'Теневая эссенция':2}},anvil:{name:'Наковальня',cost:{'Железо':8,'Камень':12,'Древесина':6}},masterPickaxe:{name:'Кирка мастера',cost:{'Железо':8,'Кристалл':2,'Древесина':5}},coal:{name:'Угольный блок',cost:{'Уголь':4,'Камень':2}},helmet:{name:'Шлем лесника',cost:{'Кость':4,'Железо':3}},boots:{name:'Сапоги странника',cost:{'Древесина':3,'Листья':6}},amulet:{name:'Амулет стража',cost:{'Кристалл':2,'Железо':2}},storage:{name:'Сундук-хранилище',cost:{'Древесина':10,'Камень':4}},farmplot:{name:'Грядка с семенами',cost:{'Древесина':4,'Листья':3}}};
    const recipe=recipes[kind];if(!recipe)return;const missing=Object.entries(recipe.cost).filter(([name,amount])=>itemCount(name)<amount);if(missing.length){const msg='Не хватает: '+missing.map(([name,amount])=>name+' '+itemCount(name)+'/'+amount).join(', ')+'.';renderWorkbenchStatus(msg);toast(msg);return;}if(['Железный меч','Кожаная броня','Улучшенная кирка','Огненный меч','Стальной меч','Ледяной посох','Молниеносное копьё','Броня стража','Мантия мага','Наковальня','Кирка мастера','Шлем лесника','Сапоги странника','Амулет стража'].includes(recipe.name)&&itemCount(recipe.name)>0){toast('Этот предмет уже создан.');return;}Object.entries(recipe.cost).forEach(([name,amount])=>changeItem(name,-amount));const item=inventoryItems.find(i=>i.name===recipe.name);if(item)item.count+=1;if(recipe.name==='Наковальня')anvilCrafted=true;playSound('craft');renderInventory();renderWorkbenchStatus(recipe.name+' создан!');awardXP(20,'создание предмета');saveGame();toast('Создано: '+recipe.name+'.');
  }
  function upgradeAtAnvil(kind){if(!anvilCrafted&&itemCount('Наковальня')<=0){toast('Сначала создай наковальню на верстаке.');return;}if(kind==='weapon'){const name=equipment.weapon||'Деревянный меч',level=Math.max(0,Number(weaponUpgrades[name])||0);if(level>=5){toast('Это оружие уже улучшено до максимума.');return;}const cost={'Железо':3+level*2,'Кристалл':level>=2?level:0,'Золото':(level+1)*250};const missing=Object.entries(cost).filter(([n,c])=>c>0&&(n==='Золото'?walletCents<c*100:itemCount(n)<c));if(missing.length){toast('Не хватает ресурсов: '+missing.map(([n,c])=>n+' '+(n==='Золото'?(walletCents/100).toFixed(0):itemCount(n))+'/'+c).join(', '));return;}Object.entries(cost).forEach(([n,c])=>{if(c<=0)return;if(n==='Золото')walletCents-=c*100;else changeItem(n,-c);});weaponUpgrades[name]=level+1;toast(name+' улучшен до +'+(level+1)+'! Урон: '+weaponDamage(name));}else{if(armorUpgrade>=5){toast('Броня уже улучшена до максимума.');return;}const cost={'Железо':4+armorUpgrade*2,'Кристалл':armorUpgrade>=2?armorUpgrade:0,'Золото':300*(armorUpgrade+1)};const missing=Object.entries(cost).filter(([n,c])=>c>0&&(n==='Золото'?walletCents<c*100:itemCount(n)<c));if(missing.length){toast('Не хватает ресурсов для улучшения брони: '+missing.map(([n,c])=>n+' '+(n==='Золото'?(walletCents/100).toFixed(0):itemCount(n))+'/'+c).join(', '));return;}Object.entries(cost).forEach(([n,c])=>{if(c<=0)return;if(n==='Золото')walletCents-=c*100;else changeItem(n,-c);});armorUpgrade++;toast('Броня улучшена до +'+armorUpgrade+'! Защита: '+Math.round(armorReduction()*100)+'%.');}playSound('iron');renderInventory();renderEquipmentPanel();saveGame();}
  function upgradeCosts(level,kind){
    if(kind==='house')return level===1?{'Древесина':18,'Камень':14,'Железо':4}:{'Древесина':28,'Камень':20,'Железо':10};
    const costs=[null,{'Камень':14,'Древесина':10,'Железо':4},{'Камень':20,'Древесина':15,'Железо':8},{'Камень':30,'Древесина':20,'Железо':12},{'Камень':40,'Древесина':25,'Железо':16}];return costs[level]||costs[4];
  }
  function costLabel(cost){return Object.entries(cost).map(([name,count])=>count+' '+name.toLowerCase()).join(' + ');}
  function updateUpgradeCards(){
    const houseCost=document.getElementById('upgrade-house-cost'),mineCost=document.getElementById('upgrade-mine-cost'),houseButton=document.getElementById('upgrade-house'),mineButton=document.getElementById('upgrade-mine');
    if(houseCost)houseCost.textContent=houseLevel>=3?'Максимальный уровень':costLabel(upgradeCosts(houseLevel,'house'));
    if(mineCost)mineCost.textContent=mineLevel>=5?'Максимальный уровень':costLabel(upgradeCosts(mineLevel,'mine'));
    if(houseButton){houseButton.disabled=houseLevel>=3;houseButton.textContent=houseLevel>=3?'Максимум':'Улучшить';}
    if(mineButton){mineButton.disabled=mineLevel>=5;mineButton.textContent=mineLevel>=5?'Максимум':'Улучшить';}
    const hl=document.getElementById('upgrade-house-level'),ml=document.getElementById('upgrade-mine-level');if(hl)hl.textContent='Текущий уровень: '+houseLevel+'/3';if(ml)ml.textContent='Текущий уровень: '+mineLevel+'/5';
  }
  function applyUpgrade(kind){
    const level=kind==='house'?houseLevel:mineLevel,max=kind==='house'?3:5;
    if(level>=max){toast((kind==='house'?'Дом':'Шахта')+' уже улучшен до максимального уровня.');return;}
    const cost=upgradeCosts(level,kind),missing=Object.entries(cost).filter(([name,count])=>itemCount(name)<count);
    if(missing.length){const msg='Не хватает ресурсов: '+missing.map(([name,count])=>name+' '+itemCount(name)+'/'+count).join(', ')+'.';renderWorkbenchStatus(msg);toast(msg);return;}
    Object.entries(cost).forEach(([name,count])=>changeItem(name,-count));
    if(kind==='house'){houseLevel++;toast('Дом улучшен до уровня '+houseLevel+'! Восстановление здоровья стало быстрее.');}
    else{mineLevel++;generateMineStock(Math.floor(gameMinuteTotal/GAME_MINUTES_PER_DAY));toast('Шахта улучшена до уровня '+mineLevel+'! Появилось больше залежей, на уровне 3+ встречаются кристаллы.');}
    playSound('craft');renderInventory();renderWorkbenchStatus((kind==='house'?'Дом':'Шахта')+' улучшен!');saveGame();drawMinimap();
  }
  function upgradeHouse(){applyUpgrade('house');}
  function upgradeMine(){applyUpgrade('mine');}
  function useBandage(){const item=inventoryItems.find(i=>i.name==='Бинт');if(!item||item.count<1){toast('Нет бинтов. Создай их у верстака.');return;}if(player.hp>=100){toast('Здоровье уже полное.');return;}item.count--;player.hp=Math.min(100,player.hp+20);updateVitals();renderInventory();saveGame();playSound('craft');toast('Бинт использован: +20 здоровья.');}
  function useHealingPotion(){const potion=inventoryItems.find(i=>i.name==='Малое зелье');if(!potion||potion.count<1){toast('Нет лечебных зелий.');return;}if(player.hp>=100){toast('Здоровье уже полное.');return;}potion.count--;player.hp=Math.min(100,player.hp+35);playSound('craft');updateVitals();renderInventory();saveGame();toast('Зелье использовано: +35 здоровья.');}
  function eatMeat(){const meat=inventoryItems.find(i=>i.name==='Мясо');if(!meat||meat.count<=0){toast('У тебя нет мяса. Найди овцу и нажми Space рядом с ней.');return;}meat.count--;hunger=Math.min(100,hunger+10);questStage=Math.max(questStage,6);hungerElapsedMinutes=0;renderInventory();updateClockDisplay(true);saveGame();toast('Ты съел мясо. +10 голода.');}
  function updateSkipDayHud(){const t=document.getElementById('skip-day-timer'),b=document.getElementById('skip-day-button');if(!t||!b)return;const left=Math.max(0,Math.ceil(skipDayRealSeconds));t.textContent=left>0?`${Math.floor(left/60)}:${String(left%60).padStart(2,'0')}`:'Готово';b.disabled=left>0||paused||inMainMenu;b.title=left>0?'Пропустить день можно после 5 минут реального времени':'Пропустить игровой день';}
  function skipGameDay(){if(skipDayRealSeconds>0){toast('Подожди, пока таймер дойдёт до нуля.');return;}const day=Math.floor(gameMinuteTotal/GAME_MINUTES_PER_DAY);gameMinuteTotal=(day+1)*GAME_MINUTES_PER_DAY+DAWN_MINUTE;survivedNights++;lastDawnMarker=Math.floor((gameMinuteTotal-DAWN_MINUTE)/GAME_MINUTES_PER_DAY);wasNight=isNightTime();monsters.length=0;skipDayRealSeconds=300;updateClockDisplay(true);saveGame();toast('День пропущен. Он засчитан как прожитый.');}
  function blocked(x,y){if(inHouse){return x<24||x>396||y<24||y>276;}const tx=Math.floor(x/TILE),ty=Math.floor(y/TILE);if(tx<1||ty<1||tx>=COLS-1||ty>=ROWS-1)return true;if(waterAt(tx+.5,ty+.5))return true;if(placedStructures.some(s=>(['furnace','storage'].includes(s.type))&&Math.hypot(x-s.x,y-s.y)<(s.type==='storage'?20:20)))return true;if(tradeWorldMode){for(const sh of [SELL_SHOP,BUY_SHOP])if(Math.abs(x-(sh.x*TILE+16))<43&&Math.abs(y-(sh.y*TILE+16))<27)return true;return false;}const hx=36*TILE-120,hy=15*TILE-120;if(x>hx&&x<hx+320&&y>hy+30&&y<hy+305&&!(x>hx+137&&x<hx+183&&y>hy+270))return true;for(const t of world.trees){if(Math.abs(t.x-x)>31||Math.abs(t.y-y)>33)continue;const dx=t.x-x,dy=t.y-y;if(dx*dx+dy*dy<20*20)return true;}for(const r of world.rocks){const dx=r.x-x,dy=r.y-y;if(dx*dx+dy*dy<17*17)return true;}return false;}
  function updateObjective(){
    if(caveMode){document.getElementById('objective').textContent=caveChestOpened?'Вернись в долину или исследуй пещеру':'Найди сияющий сундук в тайной пещере';document.getElementById('location-name').textContent='Тайная пещера';return;}
    if(inHouse){const dBed=Math.hypot(player.x-94,player.y-112),dBench=Math.hypot(player.x-325,player.y-75),dDoor=Math.hypot(player.x-210,player.y-260);document.getElementById('objective').textContent=dBed<65?'Нажми E у кровати, чтобы поспать':dBench<65?'Нажми E у верстака':dDoor<75?'Нажми E, чтобы выйти из дома':'Осмотри дом: кровать и верстак';document.getElementById('location-name').textContent='Дом у лесной долины';return;}
    const s = world.signs[0];
    const d = Math.hypot(s.x-player.x, s.y-player.y);
    const objective = document.getElementById('objective');
    const liveSheep=sheep.filter(a=>a.alive).length;const targets=['Найди и прочитай дорожный знак','Войди в дом и осмотри кровать и верстак','Собери древесину: возьми топор и сруби дерево','Используй верстак в доме','Победи монстра','Добудь мясо овцы и съешь его','Исследуй не менее 10% карты','Посети берег озера','Переживи первую ночь'];if(exploredCells.size>=Math.ceil(COLS*ROWS*.1))questStage=Math.max(questStage,7);if(player.x/TILE<20&&waterAt(player.x/TILE,player.y/TILE))questStage=Math.max(questStage,7);if(survivedNights>0)questStage=Math.max(questStage,9);const target=targets[Math.min(questStage,targets.length-1)];objective.textContent='Задание '+Math.min(questStage+1,targets.length)+'/'+targets.length+': '+target;
    document.getElementById('location-name').textContent = tradeWorldMode ? 'Мир торговли' : (waterAt(player.x/TILE,player.y/TILE) ? 'Берег тихого озера' : (player.x/TILE>31&&player.x/TILE<42&&player.y/TILE>13&&player.y/TILE<24 ? 'Старая деревня' : biomeNameAt(player.x/TILE,player.y/TILE)));
  }
  function toast(text){const el=document.getElementById('toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2600);}let toastTimer;
  function openSignDialog(){
    signDialogOpen = true;
    keys.clear();
    discovered = true;
    questStage=Math.max(questStage,1);
    saveGame();
    document.getElementById('hint').classList.remove('show');
    document.getElementById('sign-dialog-shade').hidden = false;
    document.getElementById('sign-dialog-shade').setAttribute('aria-hidden', 'false');
    canvas.blur();
  }
  function closeSignDialog(){
    signDialogOpen = false;
    document.getElementById('sign-dialog-shade').hidden = true;
    document.getElementById('sign-dialog-shade').setAttribute('aria-hidden', 'true');
    canvas.focus();
  }
  const WEAPON_BASE_DAMAGE={'Деревянный меч':20,'Железный меч':35,'Огненный меч':50,'Стальной меч':62,'Ледяной посох':28,'Молниеносное копьё':46};
  function weaponDamage(name=equipment.weapon){return Math.round((WEAPON_BASE_DAMAGE[name]||20)+(Math.max(0,Math.min(5,Number(weaponUpgrades[name])||0))*8)*(name==='Ледяной посох'?1.15:1));}
  function weaponRange(name=equipment.weapon){return name==='Ледяной посох'?230:name==='Молниеносное копьё'?125:82;}
  function armorReduction(){let r=equipment.armor==='Кожаная броня'?.4:equipment.armor==='Броня стража'?.52:equipment.armor==='Мантия мага'?.25:0;if(equipment.armor)r+=armorUpgrade*.035;r+=(equipment.helmet==='Шлем лесника'?.15:0)+(equipment.amulet==='Амулет стража'?.1:0);return Math.min(.82,r);}
  function itemCount(name){const i=inventoryItems.find(v=>v.name===name);return i?i.count:0;}
  function changeItem(name,delta){const i=inventoryItems.find(v=>v.name===name);if(!i)return false;if(i.count+delta<0)return false;i.count+=delta;return true;}
  function formatMoney(cents){return (Math.floor(cents/100))+','+String(Math.abs(cents%100)).padStart(2,'0')+' 🟡';}
  function openShop(kind){activeShop=kind;shopDialogOpen=true;paused=true;keys.clear();const shade=document.getElementById('shop-shade');shade.hidden=false;shade.setAttribute('aria-hidden','false');renderShop();}
  function closeShop(){shopDialogOpen=false;const shade=document.getElementById('shop-shade');shade.hidden=true;shade.setAttribute('aria-hidden','true');paused=false;saveGame();}
  function renderShop(){const title=document.getElementById('shop-title'),eyebrow=document.getElementById('shop-eyebrow'),list=document.getElementById('shop-items'),balance=document.getElementById('shop-balance'),prices=difficultyConfig().shop;balance.textContent=formatMoney(walletCents);updateWalletHud();if(activeShop==='sell'){title.textContent='Лавка лесника';eyebrow.textContent='SKYREALM · ПРОДАЖА РЕСУРСОВ · '+difficultyConfig().name.toUpperCase();list.innerHTML=[{name:'Древесина',icon:'🪵',price:prices.sell.wood,unit:'5 шт. = '+formatMoney(prices.sell.wood)+' золотых'},{name:'Листья',icon:'🍃',price:prices.sell.leaves,unit:'1 шт. = '+formatMoney(prices.sell.leaves)+' золотого'},{name:'Мясо',icon:'🍖',price:prices.sell.meat,unit:'1 шт. = '+formatMoney(prices.sell.meat)+' золотого'}].map(it=>`<div class="shop-row"><div class="shop-icon">${it.icon}</div><div class="shop-row-main"><b>${it.name}</b><small>${it.unit}</small><span>В инвентаре: ${itemCount(it.name)}</span></div><button class="action shop-action" data-sell="${it.name}">Продать</button></div>`).join('');}else{title.textContent='Лавка рудокопа';eyebrow.textContent='SKYREALM · ПОКУПКА РУДЫ · '+difficultyConfig().name.toUpperCase();list.innerHTML=[{name:'Камень',icon:'🪨',price:prices.buy.Камень},{name:'Уголь',icon:'⚫',price:prices.buy.Уголь},{name:'Железо',icon:'⛓️',price:prices.buy.Железо}].map(it=>`<div class="shop-row"><div class="shop-icon">${it.icon}</div><div class="shop-row-main"><b>${it.name}</b><small>Цена за 1 шт.: ${formatMoney(it.price)}</small><span>В инвентаре: ${itemCount(it.name)}</span></div><button class="action shop-action" data-buy="${it.name}">Купить</button></div>`).join('');}list.querySelectorAll('[data-sell]').forEach(b=>b.addEventListener('click',()=>sellResource(b.dataset.sell)));list.querySelectorAll('[data-buy]').forEach(b=>b.addEventListener('click',()=>buyOre(b.dataset.buy)));}
  function sellResource(name){const prices=difficultyConfig().shop.sell;let count=0,cents=0;if(name==='Древесина'){count=Math.floor(itemCount(name)/5)*5;cents=(count/5)*prices.wood;}else if(name==='Листья'){count=itemCount(name);cents=count*prices.leaves;}else if(name==='Мясо'){count=itemCount(name);cents=count*prices.meat;}if(count<=0){toast(name==='Древесина'?'Для продажи древесины нужно минимум 5 штук.':'У тебя нет этого ресурса для продажи.');return;}changeItem(name,-count);walletCents+=cents;playSound('coin');renderInventory();updateWalletHud();renderShop();saveGame();toast(`Продано: ${count} · получено ${formatMoney(cents)}. Баланс: ${formatMoney(walletCents)}.`);}
  function buyOre(name){const price=difficultyConfig().shop.buy[name];if(!Number.isFinite(price)){toast('Этот товар недоступен.');return;}if(walletCents<price){toast('Недостаточно денег. Нужно '+formatMoney(price)+'.');return;}walletCents-=price;changeItem(name,1);playSound('coin');renderInventory();updateWalletHud();renderShop();saveGame();toast('Куплено: '+name+'. Баланс: '+formatMoney(walletCents)+'.');}
  let worldTransitioning=false;
  function transitionTradeWorld(){if(worldTransitioning)return;worldTransitioning=true;const fade=document.getElementById('world-fade');const wasPaused=paused;paused=true;keys.clear();fade.classList.add('active');playSound('portal');window.setTimeout(()=>{tradeWorldMode=!tradeWorldMode;inHouse=false;mineMode=false;player.x=tradeEntranceX*TILE+16;player.y=tradeEntranceY*TILE+16;player.vx=player.vy=0;markExploredAroundPlayer();const loc=document.getElementById('location-name');if(loc)loc.textContent=tradeWorldMode?'Мир торговли':'Лесная долина';saveGame();drawMinimap();toast(tradeWorldMode?'Добро пожаловать в Мир торговли! Здесь две лавки.':'Ты вернулся в Лесную долину.');window.setTimeout(()=>{fade.classList.remove('active');paused=wasPaused;worldTransitioning=false;},280);},280);}
  function interact(){
    if(caveMode){if(Math.hypot(player.x-width*.73,player.y-height*.48)<95){if(!caveBossDefeated){toast('Сундук запечатан Каменным стражем. Сначала победи босса!');return;}if(!caveChestOpened){caveChestOpened=true;const gold=5+Math.floor(Math.random()*11),rewards=[['Кристалл',1],['Железо',2],['Малое зелье',1]];rewards.forEach(([n,c])=>{if(n==='Кристалл'?Math.random()<difficultyConfig().chests.crystal:n==='Железо'?Math.random()<.65:Math.random()<.2)changeItem(n,c);});walletCents+=gold*100;spawnVisualBurst(player.x,player.y,28,'spark','#ffd86b');renderInventory();awardXP(120,'тайная сокровищница');toast('Сокровищница открыта: '+gold+' золота и немного редкой добычи!');saveGame();}else toast('Сундук пуст.');return;}if(Math.hypot(player.x-width*.16,player.y-height*.8)<125){caveMode=false;player.x=caveReturn.x;player.y=caveReturn.y;player.vx=player.vy=0;toast('Ты вернулся в лесную долину.');saveGame();return;}toast('Подойди к сундуку или входу в пещеру.');return;}
    if(mineMode){mineMode=false;toast('Ты вышел из шахты.');return;}
    if(inHouse){
      const dBed=Math.hypot(player.x-94,player.y-112),dBench=Math.hypot(player.x-325,player.y-75),dDoor=Math.hypot(player.x-210,player.y-260);
      if(dDoor<78){inHouse=false;if(enteredPlacedHouse){player.x=enteredPlacedHouse.x;player.y=enteredPlacedHouse.y+55;enteredPlacedHouse=null;}else{player.x=36*TILE+40;player.y=15*TILE+154;}toast('Ты вышел из дома.');if(questStage<2)questStage=2;saveGame();return;}
      if(dBed<65){bedSpawn=enteredPlacedHouse?{x:enteredPlacedHouse.x,y:enteredPlacedHouse.y+55}:{x:36*TILE+40,y:15*TILE+154};saveGame();const nowMinute=minuteOfDay();if(nowMinute<18*60||nowMinute>=NIGHT_MINUTE){toast('Ложиться спать можно только вечером, с 18:00 до 20:00. Сейчас '+String(Math.floor(nowMinute/60)).padStart(2,'0')+':'+String(nowMinute%60).padStart(2,'0')+'.');return;}const houseX=36*TILE+40,houseY=15*TILE+154;const nearby=monsters.some(m=>Math.hypot(m.x-houseX,m.y-houseY)<10*TILE);if(nearby){toast('Нельзя спать: монстр обнаружен в радиусе 10 блоков от дома.');return;}if(sleeping)return;sleeping=true;sleepSeconds=0;toast('Ты лёг спать.');return;}
      if(dBench<65){workbenchUsed=true;questStage=Math.max(questStage,3);saveGame();openWorkbench();return;}
      toast('Подойди к кровати, верстаку или двери.');return;
    }
    const nearbyStorage=placedStructures.find(v=>v.type==='storage'&&Math.hypot(player.x-v.x,player.y-v.y)<76);if(nearbyStorage){openStorage(nearbyStorage);return;}
    const nearbyFarm=placedStructures.find(v=>v.type==='farmplot'&&Math.hypot(player.x-v.x,player.y-v.y)<76);if(nearbyFarm){if((nearbyFarm.stage||0)>=3){changeItem('Урожай',3+Math.floor(Math.random()*3));nearbyFarm.stage=0;nearbyFarm.growSeconds=0;trackAdventureQuest('harvest',1);spawnVisualBurst(nearbyFarm.x,nearbyFarm.y,12,'leaf','#e5c85c');renderInventory();saveGame();playSound('coin');toast('Урожай собран! Грядка снова засеяна.');}else{nearbyFarm.growSeconds=(nearbyFarm.growSeconds||0)+12;nearbyFarm.stage=Math.min(3,Math.floor(nearbyFarm.growSeconds/25));toast('Ты полил грядку. Рост ускорен. Сейчас стадия '+(nearbyFarm.stage||0)+'/3.');saveGame();}return;}
    if(tradeWorldMode&&Math.hypot(player.x-(SELL_SHOP.x*TILE+16),player.y-(SELL_SHOP.y*TILE+16))<100){openShop('sell');return;}
    if(tradeWorldMode&&Math.hypot(player.x-(BUY_SHOP.x*TILE+16),player.y-(BUY_SHOP.y*TILE+16))<100){openShop('buy');return;}
    if(!tradeWorldMode&&Math.hypot(player.x-(74*TILE+16),player.y-(18*TILE+16))<112){caveReturn={x:player.x,y:player.y};caveMode=true;player.x=width*.35;player.y=height*.58;player.vx=player.vy=0;caveBossX=width*.72;caveBossY=height*.30;caveBossAttackTimer=difficultyConfig().bossInterval;caveBossFlash=0;toast(caveBossDefeated?'Ты вернулся в исследованную пещеру.':'В пещере Каменный страж! Победи его, чтобы открыть сокровищницу.');return;}
    if(Math.hypot(player.x-(tradeEntranceX*TILE+16),player.y-(tradeEntranceY*TILE+16))<112){transitionTradeWorld();return;}
    if(Math.hypot(player.x-(mineTileX*TILE+16),player.y-(mineTileY*TILE+16))<112){mineMode=true;mineHoverIndex=-1;minePlayerX=86;minePlayerY=height-108;keys.clear();toast('Ты вошёл в шахту. Выбери кирку и нажми по залежи левой кнопкой 2 раза.');return;}
    const placedHouse=placedStructures.find(s=>s.type==='house'&&Math.hypot(player.x-s.x,player.y-(s.y+25))<85);if(placedHouse){bedSpawn={x:placedHouse.x,y:placedHouse.y+55};enteredPlacedHouse={x:placedHouse.x,y:placedHouse.y};inHouse=true;player.x=210;player.y=225;player.vx=player.vy=0;toast('Ты вошёл в свой дом. E у кровати — спать, у верстака — использовать.');saveGame();return;}
    const hx=36*TILE-120,hy=15*TILE-120;
    if(Math.hypot(player.x-(hx+160),player.y-(hy+274))<115){bedSpawn={x:36*TILE+40,y:15*TILE+154};inHouse=true;player.x=210;player.y=225;player.vx=player.vy=0;toast('Ты вошёл в дом. E у кровати — спать, у верстака — использовать.');if(questStage<2)questStage=2;saveGame();return;}
    const chest=treasureChests.find(c=>Math.hypot(player.x-c.x,player.y-c.y)<100);if(chest){if(chest.opened)toast('Этот сундук уже открыт.');else openTreasureChest(chest);return;}
    const s=world.signs[0];if(Math.hypot(s.x-player.x,s.y-player.y)<118){openSignDialog();questStage=Math.max(questStage,1);}else toast('Подойди к дорожному знаку или двери дома.');
  }
  function renderInventory(){
    const slots = document.getElementById('inventory-slots');
    if (slots) {
      slots.innerHTML = '';
      inventoryItems.filter(item=>item.count>0).forEach((item, index) => {
        const number = index + 1;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'inventory-slot' + (number === selectedSlot ? ' selected' : '');
        button.dataset.slot = String(number);
        button.title = item.name + (item.count ? ' × ' + item.count : ' · нет в инвентаре');
        button.setAttribute('aria-label', button.title);
        button.setAttribute('aria-pressed', number === selectedSlot ? 'true' : 'false');
        button.innerHTML = '<span class="slot-number">' + number + '</span><span class="slot-icon">' + item.icon + '</span><span class="slot-count">' + (item.count > 0 ? item.count : '') + '</span>';
        button.addEventListener('click', () => selectSlot(number));
        slots.appendChild(button);
      });
    }
    const grid = document.getElementById('inventory-grid');
    if (grid) {
      grid.innerHTML = '';
      inventoryItems.filter(item=>item.count>0).forEach((item, index) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'inventory-card' + (index + 1 === selectedSlot ? ' selected' : '');
        card.innerHTML = '<span class="inventory-card-icon">' + item.icon + '</span><span class="inventory-card-name">' + item.name + '</span><span class="inventory-card-count">Количество: ' + item.count + '</span><span class="inventory-card-description">' + item.description + '</span>';
        card.addEventListener('click', () => selectSlot(index + 1, false));
        grid.appendChild(card);
      });
      const used=inventoryItems.filter(item=>item.count>0).length;for(let empty=used;empty<20;empty++){const slot=document.createElement('div');slot.className='inventory-card inventory-empty-slot';slot.innerHTML='<span class="inventory-card-icon">＋</span><span class="inventory-card-name">Пустой слот</span><span class="inventory-card-count">'+(empty+1)+'/20</span><span class="inventory-card-description">Место для будущего предмета</span>';grid.appendChild(slot);}
    }
    const selected = inventoryItems.filter(item=>item.count>0)[selectedSlot - 1];
    const status = document.getElementById('inventory-selected-note');
    if (status && selected) status.textContent = 'Выбрано: ' + selected.name + (selected.count ? ' · ' + selected.count + ' шт.' : ' · пока нет в инвентаре');
  }
  function selectSlot(number, notify = true){
    const visibleItems=inventoryItems.filter(entry=>entry.count>0);
    if (number < 1 || number > visibleItems.length) return;
    selectedSlot = number;
    renderInventory();
    if (notify) {
      const item = inventoryItems.filter(entry=>entry.count>0)[number - 1];
      if(item)toast('Выбрано: ' + item.name + (item.count > 1 ? ' × ' + item.count : ''));
    }
    saveGame();
  }
  function openTutorial(){const el=document.getElementById('tutorial-shade');if(!el)return;paused=true;keys.clear();renderTutorialStep();el.hidden=false;el.setAttribute('aria-hidden','false');}
  function renderTutorialStep(){const step=tutorialSteps[Math.min(tutorialStep,tutorialSteps.length-1)];document.getElementById('tutorial-step-title').textContent=step.title;document.getElementById('tutorial-step-key').textContent=step.key;document.getElementById('tutorial-step-text').textContent=step.text;document.getElementById('tutorial-next').textContent=tutorialStep>=tutorialSteps.length-1?'Завершить обучение':'Следующий шаг';}
  function nextTutorialStep(){if(tutorialStep<tutorialSteps.length-1){tutorialStep++;renderTutorialStep();}else closeTutorial();}
  function closeTutorial(){const el=document.getElementById('tutorial-shade');if(!el)return;el.hidden=true;el.setAttribute('aria-hidden','true');localStorage.setItem('skyrealm_tutorial_seen_v1','1');paused=false;last=performance.now();canvas.focus();}
  function openInventory(){
    tutorialInventorySeen=true;
    inventoryDialogOpen = true;
    keys.clear();
    renderInventory();
    renderInventoryTab();
    document.getElementById('inventory-shade').hidden = false;
    document.getElementById('inventory-shade').setAttribute('aria-hidden', 'false');
    canvas.blur();
  }
  function renderEquipmentPanel(){const el=document.getElementById('equipment-slots');if(!el)return;const defs=[{id:'weapon',title:'Оружие',allowed:['Деревянный меч','Железный меч','Огненный меч','Стальной меч','Ледяной посох','Молниеносное копьё']},{id:'armor',title:'Нагрудник',allowed:['Кожаная броня','Броня стража','Мантия мага']},{id:'helmet',title:'Шлем',allowed:['Шлем лесника']},{id:'boots',title:'Обувь',allowed:['Сапоги странника']},{id:'amulet',title:'Амулет',allowed:['Амулет стража']}];el.innerHTML=defs.map(d=>{const options=d.allowed.filter(n=>itemCount(n)>0).map(n=>'<option value="'+n+'" '+(equipment[d.id]===n?'selected':'')+'>'+n+(d.id==='weapon'?' · '+weaponDamage(n)+' урона':'')+'</option>').join('');return '<label class="equipment-slot"><span><b>'+d.title+'</b><small>Сейчас: '+(equipment[d.id]||'Не надето')+'</small></span><select data-equip-slot="'+d.id+'"><option value="">Не надето</option>'+options+'</select></label>';}).join('');el.querySelectorAll('[data-equip-slot]').forEach(sel=>sel.addEventListener('change',()=>{const slot=sel.dataset.equipSlot;equipment[slot]=sel.value;renderEquipmentPanel();renderInventory();saveGame();toast(sel.value?'Надето: '+sel.value:'Слот освобождён.');}));const stats=document.getElementById('equipment-stats');if(stats){stats.textContent='Урон: '+weaponDamage()+' · Улучшение оружия: '+(weaponUpgrades[equipment.weapon]||0)+'/5 · Снижение урона: '+Math.round(armorReduction()*100)+'% · Скорость: '+(equipment.boots?' +16%':'обычная')+' · Дальность атаки: '+weaponRange()+' пикс.';} }
  function renderInventoryTab(){const items=document.getElementById('inventory-content-items'),quests=document.getElementById('inventory-content-quests'),toggle=document.getElementById('inventory-quest-toggle');if(items)items.hidden=inventoryTab!=='items';const equip=document.getElementById('inventory-content-equipment');if(equip)equip.hidden=inventoryTab!=='equipment';if(quests)quests.hidden=inventoryTab!=='quests'||!questPanelVisible;if(toggle){toggle.textContent=questPanelVisible?'Скрыть задания':'Показать задания';toggle.setAttribute('aria-pressed',questPanelVisible?'true':'false');}const q=document.getElementById('inventory-quest-list');if(q){const labels=['Прочитай дорожный знак','Войди в дом и осмотри его','Сруби дерево топором: 5 ударов','Подойди к верстаку','Поспи вечером на кровати','Победи монстра','Убей овцу и получи мясо','Исследуй 10% карты','Найди берег озера','Переживи первую ночь'];const story=labels.map((label,i)=>'<div class="inventory-quest-row '+(questStage>i?'done':'')+'"><span>'+(questStage>i?'✓':'○')+'</span><span>'+label+'</span></div>').join('');const extra=adventureQuestDefs.map(v=>{const n=adventureQuestProgress[v.id]||0,ready=n>=v.target;return '<div class="adventure-quest-card '+(ready?'done':'')+'"><div><b>'+v.title+'</b><small>'+v.desc+' · '+Math.min(n,v.target)+'/'+v.target+'</small></div><button type="button" class="action" data-claim-quest="'+v.id+'" '+(!ready?'disabled':'')+'>Награда</button></div>';}).join('');q.innerHTML='<h3 class="quest-subheading">Основные задания</h3>'+story+'<h3 class="quest-subheading">Поручения приключенца</h3>'+extra;q.querySelectorAll('[data-claim-quest]').forEach(b=>b.addEventListener('click',()=>claimAdventureQuest(b.dataset.claimQuest)));}renderEquipmentPanel();}
  function closeInventory(){
    inventoryDialogOpen = false;
    document.getElementById('inventory-shade').hidden = true;
    document.getElementById('inventory-shade').setAttribute('aria-hidden', 'true');
    canvas.focus();
  }
  function gameKey(e){
    const byCode = {
      KeyW:'w', KeyA:'a', KeyS:'s', KeyD:'d', KeyE:'e', KeyI:'i', KeyL:'l',
      ArrowUp:'arrowup', ArrowDown:'arrowdown', ArrowLeft:'arrowleft', ArrowRight:'arrowright',
      Digit1:'1', Digit2:'2', Digit3:'3', Digit4:'4',
      Numpad1:'1', Numpad2:'2', Numpad3:'3', Numpad4:'4',
      Escape:'escape', Space:' '
    };
    if (byCode[e.code]) return byCode[e.code];
    const key = String(e.key || '').toLowerCase();
    const russianLayout = {'ц':'w','ф':'a','ы':'s','в':'d','у':'e','ш':'i'};
    return russianLayout[key] || key;
  }
  // Top-level frame guard: an exception in simulation/update code must not stop RAF forever.
  // The previous guard covered draw() only, so an error earlier in tick could leave the canvas black.
  function tick(now){
    try { tickFrame(now); } catch (error) {
      console.error('SkyRealm frame error:', error);
      try { drawEmergencyWorld(); } catch (renderError) { console.error('SkyRealm emergency render error:', renderError); }
      last = performance.now();
      requestAnimationFrame(tick);
    }
  }
  function tickFrame(now){
    const dt = Math.min(.04, (now-last)/1000);
    last = now;
    ambientTime=now;
    updateVisualEffects(dt);
    if (!paused && !signDialogOpen && !inventoryDialogOpen && !fullMapOpen && !workbenchDialogOpen) {
      playerAttackCooldown=Math.max(0,playerAttackCooldown-dt);dodgeCooldown=Math.max(0,dodgeCooldown-dt);dodgeTimer=Math.max(0,dodgeTimer-dt);
      if(sleeping){sleepSeconds+=dt;if(sleepSeconds>=5){sleeping=false;questStage=Math.max(questStage,4);const oldMinute=minuteOfDay(),oldDay=Math.floor(gameMinuteTotal/GAME_MINUTES_PER_DAY);gameMinuteTotal=(oldMinute<DAWN_MINUTE?oldDay:oldDay+1)*GAME_MINUTES_PER_DAY+DAWN_MINUTE;if(oldMinute>=18*60&&oldMinute<NIGHT_MINUTE)survivedNights++;refreshMineDailyStock();lastDawnMarker=Math.floor((gameMinuteTotal-DAWN_MINUTE)/GAME_MINUTES_PER_DAY);wasNight=isNightTime();monsters.length=0;player.hp=100;updateVitals();updateClockDisplay(true);toast('Ты проспал 5 секунд. Наступил рассвет!');saveGame();}}
      updateWorldClock(dt);
      if(inHouse && !sleeping && player.hp<100){player.hp=Math.min(100,player.hp+dt*(1+(houseLevel-1)*.65));updateVitals();}
      pickUpLoot(dt);
      updateFarmPlots(dt);
      updateCaveBoss(dt);
      updateMonsters(dt);
      updateSheep(dt);
      skipDayRealSeconds=Math.max(0,skipDayRealSeconds-dt);
      updateSkipDayHud();
      let mx = 0, my = 0;
      if(hudMoveMode)keys.clear();
      if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].some(k=>keys.has(k)))tutorialMoveSeen=true;
      if(keys.has(' ')||keys.has('l'))tutorialCombatSeen=true;
      if(hudMoveMode){mx=0;my=0;}
      if(sleeping){keys.clear();}else if(caveMode){if(keys.has('w')||keys.has('arrowup'))my--;if(keys.has('s')||keys.has('arrowdown'))my++;if(keys.has('a')||keys.has('arrowleft'))mx--;if(keys.has('d')||keys.has('arrowright'))mx++;}else if(mineMode){if(keys.has('w')||keys.has('arrowup'))my--;if(keys.has('s')||keys.has('arrowdown'))my++;if(keys.has('a')||keys.has('arrowleft'))mx--;if(keys.has('d')||keys.has('arrowright'))mx++;}else if (keys.has('w') || keys.has('arrowup')) my--;
      if (keys.has('s') || keys.has('arrowdown')) my++;
      if (keys.has('a') || keys.has('arrowleft')) mx--;
      if (keys.has('d') || keys.has('arrowright')) mx++;
      if(dodgeTimer>0){mx=dodgeVX;my=dodgeVY;}
      if (mx && my) { mx *= .7071; my *= .7071; }
      const sprinting=keys.has('shift')&&(mx||my)&&player.stamina>15&&!sleeping&&!mineMode;
      const speed = dodgeTimer>0?500:((sprinting?235:155)*(equipment.boots==='Сапоги странника'?1.16:1)*(1+skills.scout*.025));
      if(sprinting){player.stamina=Math.max(0,player.stamina-dt*17);if(player.stamina<16&&sprintExhaustionToast<=0){toast('Выносливость закончилась. Передышка!');sprintExhaustionToast=5;}}else{player.stamina=Math.min(100,player.stamina+dt*4);sprintExhaustionToast=Math.max(0,sprintExhaustionToast-dt);}
      player.vx = mx * speed; player.vy = my * speed;
      if(mineMode && (mx||my)){if(mx&&my){mx*=.7071;my*=.7071;}minePlayerX=Math.max(48,Math.min(width-48,minePlayerX+mx*speed*dt));minePlayerY=Math.max(100,Math.min(height-70,(minePlayerY||height-108)+my*speed*dt));}
      if(caveMode && !sleeping && (mx||my)){player.face=Math.abs(mx)>Math.abs(my)?(mx<0?'left':'right'):(my<0?'up':'down');player.x=Math.max(80,Math.min(width-80,player.x+mx*speed*dt));player.y=Math.max(100,Math.min(height-80,player.y+my*speed*dt));} else if (!mineMode && !sleeping && (mx || my)) {
        footstepTimer-=dt;if(footstepTimer<=0){playSound('step');footstepTimer=.34;}
        player.face = Math.abs(mx)>Math.abs(my) ? (mx<0?'left':'right') : (my<0?'up':'down');
        const nx = player.x + player.vx*dt, ny = player.y + player.vy*dt;
        if (!blocked(nx, player.y)) player.x = nx;
        if (!blocked(player.x, ny)) player.y = ny;
        player.stamina = Math.max(35, player.stamina-dt*2.2);
      } else {
        player.vx = player.vy = 0;
        player.stamina = Math.min(100, player.stamina+dt*(keys.has('shift')?2:4));
      }
      const d = Math.hypot(world.signs[0].x-player.x, world.signs[0].y-player.y);
      const houseD=Math.hypot(player.x-(36*TILE+40),player.y-(15*TILE+154));
      const mineD=Math.hypot(player.x-(mineTileX*TILE+16),player.y-(mineTileY*TILE+16));
      const hint = document.getElementById('hint');
      if(caveMode){hint.classList.add('show');hint.textContent='E · сундук / выйти из пещеры';}else if(mineMode){hint.classList.add('show');hint.textContent='E · выйти из шахты';}else if(tradeWorldMode&&Math.hypot(player.x-(SELL_SHOP.x*TILE+16),player.y-(SELL_SHOP.y*TILE+16))<130){hint.classList.add('show');hint.textContent='🟡 ЛАВКА ЛЕСНИКА · E — продать ресурсы';}else if(tradeWorldMode&&Math.hypot(player.x-(BUY_SHOP.x*TILE+16),player.y-(BUY_SHOP.y*TILE+16))<130){hint.classList.add('show');hint.textContent='⛏ ЛАВКА РУДОКОПА · E — купить руду';}else if(inHouse){hint.classList.add('show');hint.textContent='E · взаимодействие | кровать, верстак, дверь';}else if(placedStructures.some(s=>s.type==='house'&&Math.hypot(player.x-s.x,player.y-(s.y+25))<105)){hint.classList.add('show');hint.textContent='🏠 ТВОЙ ДОМ · Нажми E, чтобы войти';}else if(Math.hypot(player.x-(tradeEntranceX*TILE+16),player.y-(tradeEntranceY*TILE+16))<130){hint.classList.add('show');hint.textContent='🌐 МИР ТОРГОВЛИ · Нажми E, чтобы перейти';}else if(Math.hypot(player.x-(74*TILE+16),player.y-(18*TILE+16))<130){hint.classList.add('show');hint.textContent='💎 ТАЙНАЯ ПЕЩЕРА · Нажми E, чтобы войти';}else if(placedStructures.some(v=>v.type==='storage'&&Math.hypot(player.x-v.x,player.y-v.y)<100)){hint.classList.add('show');hint.textContent='📦 СУНДУК · E — открыть хранилище';}else if(placedStructures.some(v=>v.type==='farmplot'&&Math.hypot(player.x-v.x,player.y-v.y)<100)){hint.classList.add('show');hint.textContent='🌱 ГРЯДКА · E — полить / собрать урожай';}else if(treasureChests.some(c=>!c.opened&&Math.hypot(player.x-c.x,player.y-c.y)<100)){hint.classList.add('show');hint.textContent='🎁 СУНДУК · Нажми E, чтобы открыть';}else if(mineD<130){hint.classList.add('show');hint.textContent='⛏ ШАХТА · Нажми E, чтобы войти';}else if (d < 112 && !signDialogOpen) {hint.classList.add('show');hint.textContent=discovered?'Нажми E, чтобы перечитать знак.':'Нажми E, чтобы прочитать знак.';}else if(houseD<125){hint.classList.add('show');hint.textContent='Нажми E, чтобы войти в дом.';}else hint.classList.remove('show');
      if(!caveMode)markExploredAroundPlayer();
      saveTimer += dt;
      if (saveTimer > 4) { saveGame(); saveTimer = 0; }
    } else {
      player.vx = player.vy = 0;
    }
    minimapTimer += dt; if (minimapTimer >= .16) { drawMinimap(); minimapTimer = 0; }
    try { draw(dt, now); } catch (error) { console.error('SkyRealm render error:', error); drawEmergencyWorld(); }
    updateWalletHud();
    requestAnimationFrame(tick);
  }
  function resetWorldState(){
    player.x=21*TILE;player.y=26*TILE;player.vx=player.vy=0;player.face='down';player.frame=0;player.hp=100;player.stamina=84;
    discovered=false;worldEarlyMonsters=false;tradeWorldMode=false;walletCents=0;playerLevel=1;playerXP=0;skillPoints=0;skills={warrior:0,miner:0,scout:0};equipment={weapon:'Деревянный меч',armor:'',helmet:'',boots:'',amulet:''};weaponUpgrades={};armorUpgrade=0;anvilCrafted=false;adventureQuestProgress={hunt:0,mining:0,harvest:0};farmCrops=[];caveBossDefeated=false;caveBossHp=bossMaxHp();caveBossAttackTimer=2.5;caveMode=false;caveChestOpened=false;treasureChests.forEach(c=>c.opened=false);dodgeTimer=0;dodgeCooldown=0;placedStructures=[];lootDrops.length=0;enteredPlacedHouse=null;tradeEntranceX=17;tradeEntranceY=47;mineLevel=1;houseLevel=1;furnaceCrafted=false;mineMode=false;mineHoverIndex=-1;workbenchDialogOpen=false;exploredCells=new Set();selectedSlot=1;questStage=0;workbenchUsed=false;sheepSpawnTimer=0;inHouse=false;sleeping=false;sleepSeconds=0;playerAttackCooldown=0;gameMinuteTotal=8*60;survivedNights=0;immortal=false;hunger=100;hungerElapsedMinutes=0;skipDayRealSeconds=300;sheepSpawned=false;sheep.length=0;inventoryItems.forEach(item=>{const base=starterItemCounts.find(v=>v.name===item.name);item.count=base?base.count:0;});
    lastDawnMarker=Math.floor((gameMinuteTotal-DAWN_MINUTE)/GAME_MINUTES_PER_DAY);lastClockMinute=-1;wasNight=isNightTime();monsterSpawnTimer=0;damageToastTimer=0;monsters.length=0;
  }
  function saveGame(){
    if(!currentWorldId)return;
    try{
      localStorage.setItem(saveKey,JSON.stringify({difficulty:currentDifficulty,x:caveMode?caveReturn.x:player.x,y:caveMode?caveReturn.y:player.y,bedSpawn,worldEarlyMonsters,mineLevel,houseLevel,playerLevel,playerXP,skillPoints,skills,equipment,caveBossDefeated,caveBossHp,caveChestOpened,treasureChests:treasureChests.map(c=>({id:c.id,opened:c.opened})),mineTileX,mineTileY,mineRocks,tradeWorldMode,tradeEntranceX,tradeEntranceY,walletCents,furnaceCrafted,placedStructures:placedStructures.map(v=>({...v,contents:{...(v.contents||{})}})),lootDrops:lootDrops.map(d=>({...d})),adventureQuestProgress,farmCrops,playerAppearance,discovered,exploredCells:Array.from(exploredCells),selectedSlot,gameMinuteTotal,survivedNights,hp:player.hp,stamina:player.stamina,hunger,hungerElapsedMinutes,skipDayRealSeconds,sheepSpawned,sheepSpawnTimer,questStage,workbenchUsed,sheep: sheep.map(a=>({...a})),resources:inventoryItems.map(i=>({name:i.name,count:i.count})),weaponUpgrades,armorUpgrade,anvilCrafted,immortal}));
      const worlds=readWorlds();const worldRecord=worlds.find(w=>w.id===currentWorldId);
      if(worldRecord){worldRecord.updatedAt=Date.now();writeWorlds(worlds);}
    }catch(_){}
  }
  function loadGame(){
    try{
      const d=JSON.parse(localStorage.getItem(saveKey)||'null');
      if(d&&typeof d==='object'){
        if(Number.isFinite(d.x)&&Number.isFinite(d.y)){player.x=Math.max(TILE,Math.min(COLS*TILE-TILE,d.x));player.y=Math.max(TILE,Math.min(ROWS*TILE-TILE,d.y));}if(d.bedSpawn&&Number.isFinite(d.bedSpawn.x)&&Number.isFinite(d.bedSpawn.y))bedSpawn={x:Math.max(TILE,Math.min(COLS*TILE-TILE,d.bedSpawn.x)),y:Math.max(TILE,Math.min(ROWS*TILE-TILE,d.bedSpawn.y))};
        discovered=!!d.discovered;worldEarlyMonsters=!!d.worldEarlyMonsters;tradeWorldMode=!!d.tradeWorldMode;
        if(Number.isFinite(d.skillPoints))skillPoints=Math.max(0,Math.min(999,Math.floor(d.skillPoints)));if(d.skills&&typeof d.skills==='object')skills={warrior:Math.max(0,Math.min(5,Number(d.skills.warrior)||0)),miner:Math.max(0,Math.min(5,Number(d.skills.miner)||0)),scout:Math.max(0,Math.min(5,Number(d.skills.scout)||0))};
        if(d.weaponUpgrades&&typeof d.weaponUpgrades==='object')weaponUpgrades=Object.fromEntries(Object.entries(d.weaponUpgrades).filter(([k,v])=>Object.prototype.hasOwnProperty.call(WEAPON_BASE_DAMAGE,k)).map(([k,v])=>[k,Math.max(0,Math.min(5,Number(v)||0))]));armorUpgrade=Math.max(0,Math.min(5,Number(d.armorUpgrade)||0));anvilCrafted=!!d.anvilCrafted;if(d.equipment&&typeof d.equipment==='object')equipment={weapon:['Деревянный меч','Железный меч','Огненный меч','Стальной меч','Ледяной посох','Молниеносное копьё'].includes(d.equipment.weapon)?d.equipment.weapon:'Деревянный меч',armor:['','Кожаная броня','Броня стража','Мантия мага'].includes(d.equipment.armor)?d.equipment.armor:'',helmet:['','Шлем лесника'].includes(d.equipment.helmet)?d.equipment.helmet:'',boots:['','Сапоги странника'].includes(d.equipment.boots)?d.equipment.boots:'',amulet:['','Амулет стража'].includes(d.equipment.amulet)?d.equipment.amulet:''};
        caveBossDefeated=d.caveBossDefeated===true;const savedBossHp=Number(d.caveBossHp);caveBossHp=Math.max(0,Math.min(bossMaxHp(),Number.isFinite(savedBossHp)?savedBossHp:bossMaxHp()));if(caveBossDefeated)caveBossHp=0;
        if(d.adventureQuestProgress&&typeof d.adventureQuestProgress==='object')adventureQuestProgress={hunt:Math.max(0,Math.min(5,Number(d.adventureQuestProgress.hunt)||0)),mining:Math.max(0,Math.min(10,Number(d.adventureQuestProgress.mining)||0)),harvest:Math.max(0,Math.min(5,Number(d.adventureQuestProgress.harvest)||0))};
        if(Array.isArray(d.farmCrops))farmCrops=d.farmCrops.filter(v=>v&&Number.isFinite(v.x)&&Number.isFinite(v.y)).slice(0,60).map(v=>({...v,stage:Math.max(0,Math.min(3,Number(v.stage)||0)),growSeconds:Math.max(0,Number(v.growSeconds)||0)}));
        if(d.playerAppearance&&typeof d.playerAppearance==='object')applyAppearanceData(d.playerAppearance);
if(Number.isInteger(d.playerLevel))playerLevel=Math.max(1,Math.min(999,d.playerLevel));if(Number.isFinite(d.playerXP))playerXP=Math.max(0,d.playerXP);caveChestOpened=d.caveChestOpened===true;if(Array.isArray(d.treasureChests))for(const c of treasureChests){const saved=d.treasureChests.find(v=>v&&v.id===c.id);if(saved)c.opened=saved.opened===true;}if(Number.isFinite(d.walletCents))walletCents=Math.max(0,Math.floor(d.walletCents));if(Number.isInteger(d.tradeEntranceX))tradeEntranceX=d.tradeEntranceX;if(Number.isInteger(d.tradeEntranceY))tradeEntranceY=d.tradeEntranceY;mineLevel=Math.max(1,Math.min(5,Number(d.mineLevel)||1));houseLevel=Math.max(1,Math.min(3,Number(d.houseLevel)||1));if(Number.isInteger(d.mineTileX))mineTileX=Math.max(20,Math.min(31,d.mineTileX));if(Number.isInteger(d.mineTileY))mineTileY=Math.max(24,Math.min(29,d.mineTileY));if(Array.isArray(d.mineRocks)&&d.mineRocks.length){mineRocks=d.mineRocks.slice(0,60).map(r=>({x:Number(r.x)||100,y:Number(r.y)||100,ore:['Уголь','Железо','Камень','Кристалл'].includes(r.ore)?r.ore:'Камень',hp:Math.max(0,Math.min(2,Number(r.hp)||0)),maxHp:2}));}if(mineRocks.filter(r=>r.ore==='Камень'&&r.hp>0).length<8)generateMineStock(Math.floor(gameMinuteTotal/GAME_MINUTES_PER_DAY));furnaceCrafted=!!d.furnaceCrafted;if(Array.isArray(d.placedStructures))placedStructures=d.placedStructures.filter(v=>v&&['furnace','house','torch','coal','storage','farmplot'].includes(v.type)&&Number.isFinite(v.x)&&Number.isFinite(v.y)).slice(0,250).map(v=>({...v,contents:v.type==='storage'&&v.contents&&typeof v.contents==='object'?{...v.contents}:{},stage:Math.max(0,Math.min(3,Number(v.stage)||0)),growSeconds:Math.max(0,Number(v.growSeconds)||0)}));lootDrops.length=0;if(Array.isArray(d.lootDrops))d.lootDrops.slice(0,80).forEach(v=>{if(v&&Number.isFinite(v.x)&&Number.isFinite(v.y)&&inventoryItems.some(i=>i.name===v.name)&&Number.isFinite(v.count))lootDrops.push({x:v.x,y:v.y,name:v.name,count:Math.max(1,Math.min(99,Math.floor(v.count))),life:Math.max(0,Math.min(240,Number(v.life)||240)),phase:Number(v.phase)||0});});
        exploredCells=new Set(Array.isArray(d.exploredCells)?d.exploredCells.filter(v=>typeof v==='string'&&/^\d+,\d+$/.test(v)):[]);
        selectedSlot=Number.isInteger(d.selectedSlot)&&d.selectedSlot>=1&&d.selectedSlot<=inventoryItems.length?d.selectedSlot:1;
        if(Number.isFinite(d.gameMinuteTotal)&&d.gameMinuteTotal>=0)gameMinuteTotal=d.gameMinuteTotal;
        if(Number.isInteger(d.survivedNights)&&d.survivedNights>=0)survivedNights=d.survivedNights;
        if(Number.isFinite(d.hp))player.hp=Math.max(1,Math.min(100,d.hp));
        if(Number.isFinite(d.stamina))player.stamina=Math.max(0,Math.min(100,d.stamina));
        if(Number.isFinite(d.hunger))hunger=Math.max(0,Math.min(100,d.hunger));
        if(Number.isFinite(d.hungerElapsedMinutes))hungerElapsedMinutes=Math.max(0,Math.min(10,d.hungerElapsedMinutes));
        if(typeof d.sheepSpawned==='boolean')sheepSpawned=d.sheepSpawned;if(Number.isFinite(d.sheepSpawnTimer))sheepSpawnTimer=Math.max(0,d.sheepSpawnTimer%10);if(Number.isInteger(d.questStage))questStage=Math.max(0,Math.min(9,d.questStage));workbenchUsed=d.workbenchUsed===true;
        if(Array.isArray(d.sheep)){sheep.length=0;d.sheep.slice(0,120).forEach(a=>{if(a&&Number.isFinite(a.x)&&Number.isFinite(a.y))sheep.push({x:a.x,y:a.y,hp:Number(a.hp)||0,phase:Number(a.phase)||0,dir:Number(a.dir)||0,wander:Number(a.wander)||1,alive:a.alive===true});});}
        if(Number.isFinite(d.skipDayRealSeconds))skipDayRealSeconds=Math.max(0,Math.min(300,d.skipDayRealSeconds));
        if(Array.isArray(d.resources))d.resources.forEach(r=>{const item=inventoryItems.find(i=>i.name===r.name);if(item&&Number.isFinite(r.count))item.count=Math.max(0,Math.min(999999,Math.floor(r.count)));});
        immortal=d.immortal===true;
      }
    }catch(_){}
    lastDawnMarker=Math.floor((gameMinuteTotal-DAWN_MINUTE)/GAME_MINUTES_PER_DAY);
    wasNight=isNightTime();lastClockMinute=-1;updateClockDisplay(true);updateVitals();updateProgressHud();
  }
  function escapeHtml(value){return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
  function makeWorldId(){return 'world_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);}
  function worldSaveKey(id){return 'skyrealm_game_save_v2_'+id;}
  function readWorlds(){
    let worlds=[];
    try{const saved=JSON.parse(localStorage.getItem(WORLD_LIST_KEY)||'[]');if(Array.isArray(saved))worlds=saved.filter(w=>w&&typeof w.id==='string'&&typeof w.name==='string');}catch(_){}
    // Preserve a pre-world-menu save by migrating it to a first world exactly once.
    if(!worlds.length&&localStorage.getItem('skyrealm_legacy_world_migrated')!=='1'){
      try{
        const legacy=localStorage.getItem(LEGACY_SAVE_KEY);
        if(legacy){const old=JSON.parse(legacy);const id=makeWorldId();worlds=[{id,name:'Мой первый мир',createdAt:Date.now(),updatedAt:Date.now()}];localStorage.setItem(worldSaveKey(id),JSON.stringify(old));localStorage.setItem(WORLD_LIST_KEY,JSON.stringify(worlds));}
      }catch(_){}
      try{localStorage.setItem('skyrealm_legacy_world_migrated','1');}catch(_){}
    }
    return worlds;
  }
  function writeWorlds(worlds){localStorage.setItem(WORLD_LIST_KEY,JSON.stringify(worlds));}
  function formatWorldDate(value){try{return new Date(value||Date.now()).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});}catch(_){return 'SkyRealm';}}
  function renderWorldList(){
    const worlds=readWorlds(),list=document.getElementById('worlds-list'),empty=document.getElementById('worlds-empty');
    document.getElementById('world-count').textContent=worlds.length+' '+(worlds.length===1?'мир':'миров');
    list.innerHTML='';empty.hidden=worlds.length>0;
    worlds.slice().sort((a,b)=>(b.updatedAt||b.createdAt||0)-(a.updatedAt||a.createdAt||0)).forEach(w=>{
      const card=document.createElement('article');card.className='world-card';
      const level=DIFFICULTIES[w.difficulty];card.innerHTML='<div class="world-card-art"><span>✦</span></div><div class="world-card-main"><b>'+escapeHtml(w.name)+'</b><small>Сложность: '+escapeHtml(level?level.name:'не выбрана')+' · Последний вход: '+escapeHtml(formatWorldDate(w.updatedAt||w.createdAt))+'</small></div><div class="world-card-actions"><button class="world-enter-button" type="button" data-enter-world="'+escapeHtml(w.id)+'">Войти в мир <span>→</span></button><button class="world-rename-button" type="button" data-rename-world="'+escapeHtml(w.id)+'">✎ Имя</button><button class="world-delete-button" type="button" data-delete-world="'+escapeHtml(w.id)+'" aria-label="Удалить мир '+escapeHtml(w.name)+'">✕</button></div>';
      list.appendChild(card);
    });
    list.querySelectorAll('[data-enter-world]').forEach(btn=>btn.addEventListener('click',()=>enterWorld(btn.dataset.enterWorld)));
    list.querySelectorAll('[data-rename-world]').forEach(btn=>btn.addEventListener('click',()=>openRenameWorld(btn.dataset.renameWorld)));
    list.querySelectorAll('[data-delete-world]').forEach(btn=>btn.addEventListener('click',()=>deleteWorld(btn.dataset.deleteWorld)));
    document.getElementById('admin-world-count').textContent=String(worlds.length);
  }
  function deleteWorld(id){const worlds=readWorlds(),record=worlds.find(w=>w.id===id);if(!record)return;if(!window.confirm('Удалить мир «'+record.name+'» вместе с его сохранением? Это действие нельзя отменить.'))return;try{localStorage.removeItem(worldSaveKey(id));const remaining=worlds.filter(w=>w.id!==id);writeWorlds(remaining);if(currentWorldId===id){currentWorldId=null;currentWorldName='';saveKey=LEGACY_SAVE_KEY;}renderWorldList();toast('Мир удалён. Осталось миров: '+remaining.length+'.');}catch(e){toast('Не удалось удалить мир: '+String(e));}}
  function openWorldCreate(){
    const shade=document.getElementById('world-create-shade');shade.hidden=false;shade.setAttribute('aria-hidden','false');
    const input=document.getElementById('world-name-input');input.value='Мой мир';setTimeout(()=>{input.focus();input.select();},30);
  }
  function closeWorldCreate(){const shade=document.getElementById('world-create-shade');shade.hidden=true;shade.setAttribute('aria-hidden','true');}
  function createWorld(name){
    const clean=String(name||'').trim().replace(/\s+/g,' ').slice(0,32)||'Мой мир';
    const worlds=readWorlds();if(worlds.length>=50){closeWorldCreate();toast('Достигнут лимит 50 миров. Удали ненужный мир, чтобы создать новый.');return;}
    const record={id:makeWorldId(),name:clean,createdAt:Date.now(),updatedAt:Date.now(),difficulty:null};
    worlds.push(record);writeWorlds(worlds);closeWorldCreate();enterWorld(record.id);
  }
  function openRenameWorld(id){
    const record=readWorlds().find(w=>w.id===id);if(!record)return;
    renameWorldId=id;const input=document.getElementById('world-rename-input');input.value=record.name;
    const shade=document.getElementById('world-rename-shade');shade.hidden=false;shade.setAttribute('aria-hidden','false');setTimeout(()=>{input.focus();input.select();},30);
  }
  function closeRenameWorld(){renameWorldId=null;const shade=document.getElementById('world-rename-shade');shade.hidden=true;shade.setAttribute('aria-hidden','true');}
  function renameWorld(name){
    if(!renameWorldId)return;const clean=String(name||'').trim().replace(/\s+/g,' ').slice(0,32);if(!clean){toast('Название мира не может быть пустым.');return;}
    const worlds=readWorlds(),record=worlds.find(w=>w.id===renameWorldId);if(record){record.name=clean;record.updatedAt=Date.now();writeWorlds(worlds);if(record.id===currentWorldId){currentWorldName=clean;document.querySelector('.realm-sub').textContent=clean+' · ПЕРВЫЙ РАССВЕТ';}}
    closeRenameWorld();renderWorldList();
  }
  function syncAdminMenu(){document.getElementById('menu-admin').hidden=gameSettings.adminMode!==true;document.getElementById('menu-moderator').hidden=gameSettings.moderatorMode!==true;document.getElementById('pause-admin-tools').hidden=gameSettings.adminMode!==true;document.getElementById('pause-moderator-tools').hidden=gameSettings.moderatorMode!==true;}
  function generateMineStock(dayIndex=0){
    const seed=mineSeed+(dayIndex*7919)+(mineLevel*313);
    // Upgraded mines contain more nodes; deep levels can reveal crystals.
    const nodeCount=Math.min(40,24+(Math.max(1,mineLevel)-1)*4);
    mineRocks=Array.from({length:nodeCount},(_,i)=>{
      let ore;
      if(i<8)ore='Камень';
      else{const roll=hash(i+seed,19);const crystalChance=mineLevel>=3?Math.min(.07*(mineLevel-2),.21):0;ore=roll<crystalChance?'Кристалл':roll<crystalChance+.45?'Уголь':'Железо';}
      return {x:76+hash(i+seed,7)*270,y:58+hash(i+seed,13)*195,ore,hp:2,maxHp:2};
    });
    mineHoverIndex=-1;
  }
  function createMineForWorld(recordId){
    mineSeed=Array.from(String(recordId)).reduce((a,c)=>a+c.charCodeAt(0),0);
    // Place the mine farther from the home and starting point, unique for each world.
    mineTileX=66+Math.floor(hash(mineSeed,31)*9);mineTileY=48+Math.floor(hash(mineSeed,37)*9);
    generateMineStock(Math.floor(gameMinuteTotal/GAME_MINUTES_PER_DAY));
  }
  function refreshMineDailyStock(){
    generateMineStock(Math.floor(gameMinuteTotal/GAME_MINUTES_PER_DAY));
    saveGame();
    if(mineMode)toast('Запасы шахты обновились: камень, уголь и железо снова доступны'+(mineLevel>=3?', а также кристаллы.':'.'));
  }
  function openDifficultyPicker(id){pendingWorldId=id;const shade=document.getElementById('difficulty-shade');shade.hidden=false;shade.setAttribute('aria-hidden','false');}
  function closeDifficultyPicker(){const shade=document.getElementById('difficulty-shade');shade.hidden=true;shade.setAttribute('aria-hidden','true');pendingWorldId=null;}
  function confirmDifficultySelection(id){const worldId=pendingWorldId;if(!worldId)return;closeDifficultyPicker();enterWorld(worldId,id);}
  function enterWorld(id,difficultyChoice=null){
    const record=readWorlds().find(w=>w.id===id);if(!record){toast('Этот мир не найден. Обнови список миров.');renderWorldList();return;}
    if(difficultyChoice&&DIFFICULTIES[difficultyChoice]){difficultyMigrationPending=!DIFFICULTIES[record.difficulty];record.difficulty=difficultyChoice;record.updatedAt=Date.now();writeWorlds(readWorlds().map(w=>w.id===record.id?record:w));}
    if(!DIFFICULTIES[record.difficulty]){openDifficultyPicker(id);return;}
    const migrateLegacyDifficulty=difficultyMigrationPending;difficultyMigrationPending=false;setWorldDifficulty(record.difficulty);configureTreasureChests();setupWorld();
    currentWorldId=record.id;currentWorldName=record.name;saveKey=worldSaveKey(record.id);localStorage.setItem('skyrealm_active_world_id',record.id);mineMode=false;workbenchDialogOpen=false;
    resetWorldState();createMineForWorld(record.id);loadGame();if(migrateLegacyDifficulty&&caveBossHp>0&&Number.isFinite(caveBossHp)&&caveBossHp<=260&&!caveBossDefeated)caveBossHp=bossMaxHp();markExploredAroundPlayer();saveGame();renderInventory();drawMinimap();
    document.querySelector('.realm-sub').textContent=record.name+' · '+difficultyConfig().name.toUpperCase()+' · ПЕРВЫЙ РАССВЕТ';
    document.getElementById('main-menu-shade').hidden=true;document.getElementById('main-menu-shade').setAttribute('aria-hidden','true');
    document.getElementById('pause-shade').hidden=true;document.getElementById('pause-main-view').hidden=false;document.getElementById('pause-settings-view').hidden=true;
    inMainMenu=false;paused=true;settingsOpenedFromMainMenu=false;keys.clear();canvas.focus();last=performance.now();openCharacterEditor(true);renderWorldList();
  }
  function returnToMainMenu(){
    if(currentWorldId)saveGame();inMainMenu=true;paused=true;keys.clear();document.getElementById('main-menu-shade').hidden=false;document.getElementById('main-menu-shade').setAttribute('aria-hidden','false');document.getElementById('pause-shade').hidden=true;document.getElementById('pause-settings-view').hidden=true;document.getElementById('pause-main-view').hidden=false;renderWorldList();drawMinimap();
  }
  function openSettingsFromMainMenu(){
    settingsOpenedFromMainMenu=true;paused=true;keys.clear();document.getElementById('pause-shade').hidden=false;document.getElementById('pause-main-view').hidden=true;document.getElementById('pause-settings-view').hidden=false;syncSettingsControls();
  }
  function returnFromSettings(){
    if(settingsOpenedFromMainMenu){settingsOpenedFromMainMenu=false;paused=true;keys.clear();document.getElementById('pause-shade').hidden=true;document.getElementById('pause-settings-view').hidden=true;document.getElementById('main-menu-shade').hidden=false;document.getElementById('main-menu-shade').setAttribute('aria-hidden','false');renderWorldList();}
    else showPauseMain();
  }
  function openAdminGate(){
    if(gameSettings.adminMode!==true){toast('Включи режим администратора в настройках лаунчера и перезапусти игру.');return;}
    const input=document.getElementById('admin-password-input');input.value='';document.getElementById('admin-password-error').hidden=true;
    const shade=document.getElementById('admin-password-shade');shade.hidden=false;shade.setAttribute('aria-hidden','false');setTimeout(()=>input.focus(),30);
  }
  function closeAdminGate(){const shade=document.getElementById('admin-password-shade');shade.hidden=true;shade.setAttribute('aria-hidden','true');document.getElementById('admin-password-input').value='';if(panelReturnToPause){panelReturnToPause=false;setPaused(true);}}
  async function submitAdminPassword(){
    const input=document.getElementById('admin-password-input');
    try{
      const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(input.value));
      const hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
      if(hash===ADMIN_PASSWORD_SHA256){const returnPause=panelReturnToPause;panelReturnToPause=false;closeAdminGate();panelReturnToPause=returnPause;openAdminPanel();}
      else{document.getElementById('admin-password-error').hidden=false;input.select();}
    }catch(_){document.getElementById('admin-password-error').hidden=false;toast('Не удалось проверить пароль в этой среде.');}
  }
  function setPanelOpen(id,open){const el=document.getElementById(id);el.hidden=!open;el.setAttribute('aria-hidden',open?'false':'true');}
  function openAdminPanel(){renderWorldList();setPanelOpen('admin-panel-shade',true);document.getElementById('admin-world-count').textContent=String(readWorlds().length);refreshAdminStats();renderBanList('admin-ban-list');['admin-immortal','mod-immortal'].forEach(id=>{const b=document.getElementById(id);if(b){b.textContent='◇ Бессмертие: '+(immortal?'вкл.':'выкл.');b.classList.toggle('active',immortal);}});}
  function openModeratorPanel(){const pass=window.prompt('Введите пароль модератора:');if(pass!=='1234'){if(pass!==null)toast('Неверный пароль модератора.');return;}setPanelOpen('moderator-panel-shade',true);renderBanList('mod-ban-list');const b=document.getElementById('mod-immortal');if(b){b.textContent='◇ Бессмертие: '+(immortal?'вкл.':'выкл.');b.classList.toggle('active',immortal);}}
  function refreshAdminStats(){const m=minuteOfDay(),label=String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');const t=document.getElementById('admin-time-label');if(t)t.textContent=label;const c=document.getElementById('admin-monster-count');if(c)c.textContent=String(monsters.length);}
  function requireWorld(){if(!currentWorldId){toast('Сначала выбери или создай мир.');return false;}return true;}
  function setGameTime(minute){if(!requireWorld())return;const day=Math.floor(gameMinuteTotal/GAME_MINUTES_PER_DAY);gameMinuteTotal=day*GAME_MINUTES_PER_DAY+minute;lastDawnMarker=Math.floor((gameMinuteTotal-DAWN_MINUTE)/GAME_MINUTES_PER_DAY);wasNight=isNightTime();lastClockMinute=-1;monsterSpawnTimer=0;updateClockDisplay(true);saveGame();refreshAdminStats();toast('Время изменено вручную — день или ночь не засчитаны.');}
  function giveResource(){if(!requireWorld())return;const name=document.getElementById('admin-resource-select').value;const amount=Math.max(1,Math.min(999,parseInt(document.getElementById('admin-resource-amount').value,10)||1));let item=inventoryItems.find(x=>x.name===name);if(!item){item={name,icon:'🌿',count:0,description:'Ресурс, выданный администратором.'};inventoryItems.push(item);}item.count+=amount;renderInventory();saveGame();toast('Выдано: '+name+' × '+amount);}
  function healPlayer(){if(!requireWorld())return;player.hp=100;player.stamina=100;updateVitals();saveGame();toast('Здоровье и выносливость восстановлены.');}
  function toggleImmortal(buttonId){immortal=!immortal;['admin-immortal','mod-immortal'].forEach(id=>{const b=document.getElementById(id);if(b){b.textContent='◇ Бессмертие: '+(immortal?'вкл.':'выкл.');b.classList.toggle('active',immortal);}});toast(immortal?'Бессмертие включено.':'Бессмертие выключено.');}
  function spawnAdminMonster(){if(!requireWorld())return;const angle=Math.random()*Math.PI*2,baseX=inHouse?36*TILE+40:player.x,baseY=inHouse?15*TILE+154:player.y;let x=baseX+Math.cos(angle)*150,y=baseY+Math.sin(angle)*150;x=Math.max(TILE*2,Math.min(COLS*TILE-TILE*2,x));y=Math.max(TILE*2,Math.min(ROWS*TILE-TILE*2,y));if(blocked(x,y)){x=player.x+90;y=player.y+70;}const type=['shadow','brute','wisp','skeleton','bomb'][Math.floor(Math.random()*5)];const hp=type==='bomb'?55:type==='skeleton'?80:type==='brute'?135:100;monsters.push({x,y,hp,maxHp:hp,type,speed:type==='brute'?30:type==='wisp'?58:type==='skeleton'?47:type==='bomb'?49:43,attackCooldown:0,phase:Math.random()*6.28,flash:0,fuseStarted:false,fuseTime:1.45,exploding:false,explosionTimer:0,damageApplied:false,adminSpawned:true});refreshAdminStats();drawMinimap();saveGame();toast('Создан монстр: '+monsterLabel(type)+'.');}
  function clearAdminMonsters(){monsters.length=0;monsterSpawnTimer=0;refreshAdminStats();drawMinimap();saveGame();toast('Все монстры удалены.');}
  function renderBanList(id){const el=document.getElementById(id);if(!el)return;let bans=[];try{bans=JSON.parse(localStorage.getItem('skyrealm_local_blocklist')||'[]');}catch(_){}el.innerHTML='';if(!bans.length){el.innerHTML='<span>Список пуст <small>(локально)</small></span>';return;}bans.forEach(name=>{const row=document.createElement('span');row.textContent=name+' ';const b=document.createElement('button');b.type='button';b.textContent='Убрать';b.addEventListener('click',()=>{const next=bans.filter(n=>n!==name);localStorage.setItem('skyrealm_local_blocklist',JSON.stringify(next));renderBanList(id);});row.appendChild(b);el.appendChild(row);});}
  function addLocalBan(inputId,listId){const input=document.getElementById(inputId),name=String(input.value||'').trim().slice(0,32);if(!name){toast('Введи имя игрока.');return;}let bans=[];try{bans=JSON.parse(localStorage.getItem('skyrealm_local_blocklist')||'[]');}catch(_){}if(!bans.includes(name))bans.push(name);localStorage.setItem('skyrealm_local_blocklist',JSON.stringify(bans));input.value='';renderBanList(listId);toast('Имя добавлено в локальный список. Это не сетевой бан.');}
  function openFullMap(){if(!requireWorld())return;fullMapOpen=true;keys.clear();setPanelOpen('full-map-shade',true);drawFullMap();}
  function closeFullMap(){fullMapOpen=false;setPanelOpen('full-map-shade',false);keys.clear();canvas.focus();}
  function drawFullMap(){const c=document.getElementById('full-map-canvas'),g=c.getContext('2d'),mw=c.width,mh=c.height;g.clearRect(0,0,mw,mh);g.fillStyle='#091522';g.fillRect(0,0,mw,mh);const pad=12,cw=(mw-pad*2)/COLS,ch=(mh-pad*2)/ROWS;for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){if(!exploredCells.has(tileKey(x,y)))continue;const b=biomeAt(x,y),pals={forest:['#2d5d43','#254e3a','#1f4636'],snow:['#d7e5e8','#b7cbd2','#91adb9'],desert:['#d3b875','#c4a767','#ad8d4d'],blight:['#52603f','#43523b','#354438']};g.fillStyle=waterAt(x+.5,y+.5)?'#246681':pathAt(x+.5,y+.5)?'#927951':pals[b][hash(x,y)>.65?0:hash(x,y)>.3?1:2];g.fillRect(pad+x*cw,pad+y*ch,Math.ceil(cw),Math.ceil(ch));if(gameSettings.graphicsQuality!=='low'&&hash(x,y)>.957){g.fillStyle='#102e25';g.fillRect(pad+x*cw+cw*.3,pad+y*ch+ch*.3,Math.max(1,cw*.45),Math.max(1,ch*.45));}}const point=(x,y)=>({x:pad+x/(COLS*TILE)*(mw-pad*2),y:pad+y/(ROWS*TILE)*(mh-pad*2)});for(const mob of monsters){if(!exploredWorldPoint(mob.x,mob.y))continue;const p=point(mob.x,mob.y);g.fillStyle='#ff536d';g.beginPath();g.arc(p.x,p.y,5,0,Math.PI*2);g.fill();}const mp=point(mineTileX*TILE+16,mineTileY*TILE+16);g.fillStyle='#ffcf75';g.beginPath();g.arc(mp.x,mp.y,5,0,Math.PI*2);g.fill();const p=point(player.x,player.y);g.fillStyle='#fff2a9';g.beginPath();g.arc(p.x,p.y,6,0,Math.PI*2);g.fill();g.strokeStyle='rgba(202,225,255,.5)';g.strokeRect(.5,.5,mw-1,mh-1);const pct=Math.min(100,Math.round(exploredCells.size/(COLS*ROWS)*100));document.getElementById('full-map-discovery').textContent=pct+'% открыто';}
  function teleportFromMap(event){if(!fullMapOpen||!currentWorldId)return;const c=document.getElementById('full-map-canvas'),r=c.getBoundingClientRect(),mx=(event.clientX-r.left)/r.width*c.width,my=(event.clientY-r.top)/r.height*c.height,pad=12,tx=Math.floor((mx-pad)/((c.width-pad*2)/COLS)),ty=Math.floor((my-pad)/((c.height-pad*2)/ROWS));if(tx<0||ty<0||tx>=COLS||ty>=ROWS||!exploredCells.has(tileKey(tx,ty))){toast('Телепортироваться можно только в исследованные места.');return;}const x=tx*TILE+TILE/2,y=ty*TILE+TILE/2;if(blocked(x,y)){toast('В этой точке препятствие. Выбери соседнюю открытую область.');return;}player.x=x;player.y=y;player.vx=player.vy=0;saveGame();drawMinimap();drawFullMap();closeFullMap();toast('Телепортация выполнена.');}
  function settingsViewOpen(){return !document.getElementById('pause-settings-view').hidden;}
  function showPauseMain(){document.getElementById('pause-main-view').hidden=false;document.getElementById('pause-settings-view').hidden=true;}
  function setPaused(value){if(value&&hudMoveMode)finishHudMoveMode();paused=value;document.getElementById('pause-shade').hidden=!paused;if(paused){keys.clear();showPauseMain();}else{keys.clear();canvas.focus();}}
  function syncSettingsControls(){
    document.getElementById('game-quality-select').value=gameSettings.graphicsQuality;
    document.getElementById('game-resolution-select').value=gameSettings.resolution;
    document.getElementById('game-window-mode-select').value=gameSettings.windowMode;
    document.getElementById('game-ui-scale-select').value=gameSettings.uiScale;
    document.getElementById('show-vitals-toggle').checked=gameSettings.showVitals;
    document.getElementById('show-quest-toggle').checked=gameSettings.showQuest;
    document.getElementById('show-controls-toggle').checked=gameSettings.showControls;
    document.getElementById('show-inventory-toggle').checked=gameSettings.showInventory;
    document.getElementById('show-minimap-toggle').checked=gameSettings.showMinimap;
    const layout=document.getElementById('hud-layout-select');if(layout)layout.value=gameSettings.hudLayout||'default';
  }
  function applyVisualSettings(){
    const shell=document.querySelector('.game-shell');
    shell.classList.remove('ui-small','ui-large','quality-low','quality-medium','quality-high','hud-left','hud-right','hud-compact');
    if(gameSettings.uiScale==='85')shell.classList.add('ui-small');
    if(gameSettings.uiScale==='115')shell.classList.add('ui-large');
    shell.classList.add('quality-'+gameSettings.graphicsQuality);
    if(['left','right','compact'].includes(gameSettings.hudLayout))shell.classList.add('hud-'+gameSettings.hudLayout);
    document.getElementById('vitals').hidden=!gameSettings.showVitals;
    document.querySelector('.quest').hidden=!gameSettings.showQuest;
    document.querySelector('.controls-hint').hidden=!gameSettings.showControls;
    document.querySelector('.inventory-wrap').hidden=!gameSettings.showInventory;
    document.getElementById('minimap-panel').hidden=!gameSettings.showMinimap;
    syncAdminMenu();
    resize();
  }
  const HUD_LAYOUT_KEY='skyrealm_hud_positions_v1';
  const HUD_SCALE_KEY='skyrealm_hud_scales_v1';
  let hudMoveMode=false, selectedHudId='top-hud';
  const HUD_DRAG_IDS=['top-hud','world-clock','vitals','minimap-panel','survival-widget','night-warning','quest','controls-hint','inventory-wrap','toast','location-chip'];
  function hudElement(id){return document.getElementById(id)||document.querySelector('.'+id);}
  function loadHudPositions(){try{return JSON.parse(localStorage.getItem(HUD_LAYOUT_KEY)||'{}')||{};}catch(_){return {};}}
  function loadHudScales(){try{return JSON.parse(localStorage.getItem(HUD_SCALE_KEY)||'{}')||{};}catch(_){return {};}}
  function applyHudPositions(){const positions=loadHudPositions(),scales=loadHudScales();HUD_DRAG_IDS.forEach(id=>{const el=hudElement(id);if(!el)return;const pos=positions[id];if(pos&&Number.isFinite(pos.x)&&Number.isFinite(pos.y)){el.style.left=Math.max(0,pos.x)+'px';el.style.top=Math.max(0,pos.y)+'px';el.style.right='auto';el.style.bottom='auto';el.style.transform='none';}const scale=Number(scales[id]);if(Number.isFinite(scale)&&scale>=0.6&&scale<=1.6)el.style.zoom=String(scale);});}
  function saveHudPositions(){const positions=loadHudPositions(),parent=document.querySelector('.game-shell').getBoundingClientRect();HUD_DRAG_IDS.forEach(id=>{const el=hudElement(id);if(!el)return;const r=el.getBoundingClientRect();positions[id]={x:Math.round(Math.max(0,Math.min(parent.width-r.width,r.left-parent.left))),y:Math.round(Math.max(0,Math.min(parent.height-r.height,r.top-parent.top)))};});try{localStorage.setItem(HUD_LAYOUT_KEY,JSON.stringify(positions));}catch(_){} }
  function saveHudScales(){try{localStorage.setItem(HUD_SCALE_KEY,JSON.stringify(loadHudScales()));}catch(_){}}
  function selectHudElement(id){selectedHudId=id;const el=hudElement(id);const label=document.getElementById('hud-size-target');if(label)label.textContent=(el?.getAttribute('aria-label')||el?.querySelector('h3,.realm-name,.minimap-heading,.survival-title')?.textContent||id).trim().slice(0,30);const slider=document.getElementById('hud-size-slider');if(slider)slider.value=Math.round((Number(loadHudScales()[id])||1)*100);const output=document.getElementById('hud-size-value');if(output&&slider)output.textContent=slider.value+'%';}
  function finishHudMoveMode(){saveHudPositions();setHudMoveMode(false);toast('Расположение и размеры интерфейса сохранены.');}
  function setHudMoveMode(on){hudMoveMode=!!on;document.querySelector('.game-shell').classList.toggle('hud-moving',hudMoveMode);const bar=document.getElementById('hud-edit-toolbar');if(bar)bar.hidden=!hudMoveMode;const b=document.getElementById('toggle-hud-move');if(b)b.textContent=hudMoveMode?'✓ Завершить перемещение и сохранить':'↔ Перемещать элементы интерфейса';if(hudMoveMode){selectHudElement(selectedHudId);toast('Перетащи элемент. Выбери его, чтобы изменить размер. Перемещение ограничено границами экрана.');}}
  function initHudDragging(){
    applyHudPositions();
    HUD_DRAG_IDS.forEach(id=>{const el=hudElement(id);if(!el)return;el.dataset.hudDragId=id;el.addEventListener('pointerdown',ev=>{if(!hudMoveMode||ev.button!==0)return;if(ev.target.closest('button,input,select,textarea,a'))return;ev.preventDefault();ev.stopPropagation();selectHudElement(id);const parentEl=document.querySelector('.game-shell'),parent=parentEl.getBoundingClientRect(),rect=el.getBoundingClientRect();const startX=ev.clientX,startY=ev.clientY,left=rect.left-parent.left,top=rect.top-parent.top;el.setPointerCapture?.(ev.pointerId);const move=e=>{const r=el.getBoundingClientRect();const x=Math.max(0,Math.min(parent.width-r.width,left+e.clientX-startX));const y=Math.max(0,Math.min(parent.height-r.height,top+e.clientY-startY));el.style.left=x+'px';el.style.top=y+'px';el.style.right='auto';el.style.bottom='auto';el.style.transform='none';};const end=()=>{el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',end);el.removeEventListener('pointercancel',end);};el.addEventListener('pointermove',move);el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);});});
    const slider=document.getElementById('hud-size-slider');if(slider)slider.addEventListener('input',()=>{if(!hudMoveMode)return;const scale=Number(slider.value)/100,scales=loadHudScales();scales[selectedHudId]=scale;const el=hudElement(selectedHudId);if(el)el.style.zoom=String(scale);const output=document.getElementById('hud-size-value');if(output)output.textContent=slider.value+'%';try{localStorage.setItem(HUD_SCALE_KEY,JSON.stringify(scales));}catch(_){}});
    const finish=document.getElementById('hud-edit-finish');if(finish)finish.addEventListener('click',finishHudMoveMode);
  }
  async function applyAndSaveSettings(showMessage=true){
    const previousMode=gameSettings.windowMode;
    gameSettings=normalizeGameSettings({
      ...gameSettings,
      graphicsQuality:document.getElementById('game-quality-select').value,
      resolution:document.getElementById('game-resolution-select').value,
      windowMode:document.getElementById('game-window-mode-select').value,
      uiScale:document.getElementById('game-ui-scale-select').value,
      showVitals:document.getElementById('show-vitals-toggle').checked,
      showQuest:document.getElementById('show-quest-toggle').checked,
      showControls:document.getElementById('show-controls-toggle').checked,
      showInventory:document.getElementById('show-inventory-toggle').checked,
      showMinimap:document.getElementById('show-minimap-toggle').checked,
      hudLayout:document.getElementById('hud-layout-select').value
    });
    localStorage.setItem('skyrealm_game_preferences',JSON.stringify(gameSettings));
    applyVisualSettings();
    let nativeResult=null;
    const hasNativeWindow=!!window.pywebview?.api?.apply_settings;
    try { if(hasNativeWindow) nativeResult=await window.pywebview.api.apply_settings(gameSettings); }
    catch(_) { nativeResult={ok:false}; }
    if(!hasNativeWindow && previousMode!==gameSettings.windowMode){
      try {
        if(gameSettings.windowMode==='fullscreen'&&!document.fullscreenElement) await document.documentElement.requestFullscreen();
        else if(gameSettings.windowMode==='windowed'&&document.fullscreenElement) await document.exitFullscreen();
      } catch(_) { toast('Браузер не разрешил изменить режим окна.'); }
    }
    if(nativeResult && nativeResult.ok===false){toast(nativeResult.message||'Не удалось применить часть настроек окна.');}
    else if(showMessage){toast('Настройки применены и сохранены.');}
  }
  async function toggleFullscreen(){
    if(window.pywebview?.api?.toggle_fullscreen){
      try { const result=await window.pywebview.api.toggle_fullscreen(); if(result?.ok===false) throw new Error(result.message||'Fullscreen switch failed'); if(result?.windowMode)gameSettings.windowMode=result.windowMode; }
      catch(_){toast('Не удалось переключить полный экран.');return;}
    }else{
      try {
        if(document.fullscreenElement){await document.exitFullscreen();gameSettings.windowMode='windowed';}
        else {await document.documentElement.requestFullscreen();gameSettings.windowMode='fullscreen';}
      } catch(_){toast('Полный экран недоступен в этом окне браузера.');return;}
    }
    document.getElementById('game-window-mode-select').value=gameSettings.windowMode;
    localStorage.setItem('skyrealm_game_preferences',JSON.stringify(gameSettings));
    try { if(window.pywebview?.api?.apply_settings) await window.pywebview.api.apply_settings(gameSettings); } catch(_){}
    toast(gameSettings.windowMode==='fullscreen'?'Полноэкранный режим включён.':'Оконный режим включён.');
  }
  document.getElementById('shop-close')?.addEventListener('click',closeShop);
  document.addEventListener('keydown', e => {
    if(e.code==='F11'||e.key==='F11'){e.preventDefault();toggleFullscreen();return;}
    const k = gameKey(e);
    const formTarget = e.target && (e.target.matches?.('input,textarea,select') || e.target.isContentEditable);
    if (!formTarget && ['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','e','i','l','q','1','2','3','4'].includes(k)) e.preventDefault();
    if(k==='l'&&!formTarget&&!inMainMenu){if(fullMapOpen)closeFullMap();else if(!paused&&!signDialogOpen&&!inventoryDialogOpen)openFullMap();return;}
    if(fullMapOpen){if(k==='escape'||k==='l')closeFullMap();return;}
    if (k === 'escape') {
      if(shopDialogOpen){closeShop();return;}
      if(hudMoveMode){finishHudMoveMode();return;}
      if (!document.getElementById('admin-password-shade').hidden) closeAdminGate();
      else if (!document.getElementById('world-create-shade').hidden) closeWorldCreate();
      else if (!document.getElementById('world-rename-shade').hidden) closeRenameWorld();
      else if (!document.getElementById('full-map-shade').hidden) closeFullMap();
      else if (!document.getElementById('admin-panel-shade').hidden) { setPanelOpen('admin-panel-shade',false); if(panelReturnToPause){panelReturnToPause=false;setPaused(true);} }
      else if (!document.getElementById('moderator-panel-shade').hidden) { setPanelOpen('moderator-panel-shade',false); if(panelReturnToPause){panelReturnToPause=false;setPaused(true);} }
      else if (!document.getElementById('character-editor-shade').hidden) finishCharacterEditor(false);
      else if (!document.getElementById('skill-tree-shade').hidden) {setPanelOpen('skill-tree-shade',false);if(skillTreeReturnToPause){paused=true;document.getElementById('pause-shade').hidden=false;}else paused=false;skillTreeReturnToPause=false;}
      else if (!document.getElementById('storage-shade').hidden) closeStorage();
      else if (signDialogOpen) closeSignDialog();
      else if (inventoryDialogOpen) closeInventory();
      else if (workbenchDialogOpen) closeWorkbench();
      else if (inMainMenu) return;
      else if(paused && settingsViewOpen()) returnFromSettings();
      else setPaused(!paused);
      return;
    }
    if (formTarget || inMainMenu || workbenchDialogOpen || shopDialogOpen) return;
    if (e.repeat && ['e','i'].includes(k)) return;
    if (k === 'e' && !paused && !signDialogOpen && !inventoryDialogOpen) { interact(); return; }
    if (k === 'q' && !paused && !signDialogOpen && !inventoryDialogOpen) { startDodge(); return; }
    if (k === 'h' && !paused && !signDialogOpen && !inventoryDialogOpen) { useHealingPotion(); return; }
    if (k === ' ' && !paused && !signDialogOpen && !inventoryDialogOpen) { attackNearestMonster(); return; }
    if (k === 'i' && !paused && !signDialogOpen) { inventoryDialogOpen ? closeInventory() : openInventory(); return; }
    if (/^[1-4]$/.test(k) && !paused && !signDialogOpen && !inventoryDialogOpen) { selectSlot(Number(k)); return; }
    if (!paused && !signDialogOpen && !inventoryDialogOpen) keys.add(k);
  }, true);
  window.addEventListener('keyup', e => keys.delete(gameKey(e)), true);
  window.addEventListener('blur', () => keys.clear());
  window.addEventListener('resize', resize);
  window.addEventListener('fullscreenchange',()=>{gameSettings.windowMode=document.fullscreenElement?'fullscreen':'windowed';document.getElementById('game-window-mode-select').value=gameSettings.windowMode;localStorage.setItem('skyrealm_game_preferences',JSON.stringify(gameSettings));});
  canvas.addEventListener('pointermove', (ev) => {if(!mineMode)return;const rect=canvas.getBoundingClientRect(),x=ev.clientX-rect.left,y=ev.clientY-rect.top;let index=-1,bd=38;mineRocks.forEach((r,i)=>{if(r.hp<=0)return;const pos=mineRockScreenPosition(r),d=Math.hypot(pos.x-x,pos.y-y);if(d<bd){bd=d;index=i;}});mineHoverIndex=index;canvas.style.cursor=index>=0?'crosshair':'default';});
  canvas.addEventListener('pointerleave',()=>{mineHoverIndex=-1;canvas.style.cursor='default';});
  canvas.addEventListener('pointerdown', (ev) => {
    canvas.focus();if(ev.button!==0)return;if(!mineMode&&placeSelectedStructure(ev))return;if(!mineMode)return;
    const selectedItem=inventoryItems.filter(i=>i.count>0)[selectedSlot-1];
    if(!selectedItem||!['Кирка','Улучшенная кирка','Кирка мастера'].includes(selectedItem.name)){toast('Для добычи выбери кирку в инвентаре.');return;}
    const rect=canvas.getBoundingClientRect(),x=ev.clientX-rect.left,y=ev.clientY-rect.top;let target=null,bd=38;
    for(const r of mineRocks){if(r.hp<=0)continue;const pos=mineRockScreenPosition(r),d=Math.hypot(pos.x-x,pos.y-y);if(d<bd){bd=d;target=r;}}
    if(!target){toast('Наведи курсор прямо на залежь руды или камня.');return;}
    const playerMineY=minePlayerY||height-108; if(Math.hypot(mineRockScreenPosition(target).x-minePlayerX,mineRockScreenPosition(target).y-playerMineY)>4*TILE){toast('Подойди к залежи ближе: дальность кирки — 4 блока.');return;}
    target.hp=Math.max(0,target.hp-(selectedItem.name==='Кирка мастера'?2:itemCount('Улучшенная кирка')>0?2:1));
    if(target.hp>0){playSound(target.ore==='Железо'?'iron':target.ore==='Уголь'?'coal':'stone');toast('Удар киркой · осталось '+target.hp+' из 2.');saveGame();return;}
    spawnVisualBurst(target.x,target.y,12,'spark',target.ore==='Кристалл'?'#9ef5ff':target.ore==='Железо'?'#c7d6e6':'#d8c6a0');
    const resource=inventoryItems.find(i=>i.name===target.ore),stone=inventoryItems.find(i=>i.name==='Камень');
    playSound(target.ore==='Железо'?'iron':target.ore==='Уголь'?'coal':target.ore==='Кристалл'?'iron':'stone');if(target.ore==='Камень'){if(stone)stone.count++;}else{if(resource)resource.count++;if(target.ore!=='Кристалл'&&stone)stone.count++;}
    const bonusOre=skills.miner>0&&Math.random()<Math.min(.4,skills.miner*.08);if(bonusOre){const bonusItem=inventoryItems.find(i=>i.name===target.ore);if(bonusItem)bonusItem.count++;else if(target.ore==='Камень'&&stone)stone.count++;}trackAdventureQuest('mining',1);renderInventory();awardXP(target.ore==='Кристалл'?18:target.ore==='Железо'?10:6,'добыча в шахте');saveGame();toast('Добыто: '+target.ore+' ×'+(bonusOre?2:1)+(target.ore==='Камень'||target.ore==='Кристалл'?'':' и камень ×1'));
  });
  document.getElementById('pause').addEventListener('click', () => { if(hudMoveMode)finishHudMoveMode();if(!inMainMenu)setPaused(true); });
  document.getElementById('resume').addEventListener('click', () => setPaused(false));
  document.getElementById('return-to-world-menu').addEventListener('click',returnToMainMenu);
  document.getElementById('open-world-settings').addEventListener('click',()=>{document.getElementById('pause-shade').hidden=true;document.getElementById('world-early-monsters').checked=worldEarlyMonsters;document.getElementById('world-settings-shade').hidden=false;});
  document.getElementById('save-world-settings').addEventListener('click',()=>{worldEarlyMonsters=document.getElementById('world-early-monsters').checked;saveGame();document.getElementById('world-settings-shade').hidden=true;document.getElementById('pause-shade').hidden=false;showPauseMain();setPaused(true);toast('Настройки мира сохранены.');});
  document.getElementById('close-world-settings').addEventListener('click',()=>{document.getElementById('world-settings-shade').hidden=true;document.getElementById('pause-shade').hidden=false;setPaused(true);showPauseMain();});
  document.getElementById('open-game-settings').addEventListener('click',()=>{settingsOpenedFromMainMenu=false;document.getElementById('pause-main-view').hidden=true;document.getElementById('pause-settings-view').hidden=false;syncSettingsControls();});
  document.getElementById('menu-create-world').addEventListener('click',openWorldCreate);
  document.getElementById('empty-create-world').addEventListener('click',openWorldCreate);
  document.getElementById('world-create-cancel').addEventListener('click',closeWorldCreate);
  document.getElementById('world-create-form').addEventListener('submit',e=>{e.preventDefault();createWorld(document.getElementById('world-name-input').value);});
  document.getElementById('world-rename-cancel').addEventListener('click',closeRenameWorld);
  document.getElementById('world-rename-form').addEventListener('submit',e=>{e.preventDefault();renameWorld(document.getElementById('world-rename-input').value);});
  const avatarShade=document.getElementById('character-editor-shade');
  function syncAvatarPreview(){const doll=document.getElementById('avatar-doll');if(!doll)return;doll.style.setProperty('--skin',document.getElementById('avatar-skin').value);doll.style.setProperty('--hair',document.getElementById('avatar-hair').value);doll.style.setProperty('--armor',document.getElementById('avatar-armor').value);doll.style.setProperty('--accent',document.getElementById('avatar-accent').value);doll.style.setProperty('--eye',document.getElementById('avatar-eye').value);doll.dataset.face=document.getElementById('avatar-face').value;doll.dataset.hair=document.getElementById('avatar-hairStyle').value;}
  function openCharacterEditor(onEntry=false){avatarEntryMode=!!onEntry;if(avatarEntryMode){paused=true;keys.clear();}for(const k of Object.keys(DEFAULT_PLAYER_APPEARANCE)){const el=document.getElementById('avatar-'+k);if(el)el.value=playerAppearance[k]||DEFAULT_PLAYER_APPEARANCE[k];}syncAvatarPreview();const title=document.getElementById('character-editor-title'),desc=avatarShade.querySelector('p'),save=document.getElementById('avatar-save'),close=document.getElementById('avatar-close');if(avatarEntryMode){title.textContent='Настрой персонажа перед путешествием';desc.textContent='Перед входом в мир выбери скин. Образ можно будет изменить позже через меню персонажа.';save.textContent='Сохранить и войти в мир';close.textContent='Войти без изменений';}else{title.textContent='Редактор персонажа';desc.textContent='Настрой внешний вид героя. Изменения сохраняются на этом компьютере и применяются во всех мирах.';save.textContent='Сохранить образ';close.textContent='Закрыть';}avatarShade.hidden=false;avatarShade.setAttribute('aria-hidden','false');}
  function finishCharacterEditor(saveChanges){if(saveChanges){for(const k of Object.keys(DEFAULT_PLAYER_APPEARANCE))playerAppearance[k]=document.getElementById('avatar-'+k).value;localStorage.setItem('skyrealm_character_v1',JSON.stringify(playerAppearance));saveGame();draw(0,performance.now());}avatarShade.hidden=true;avatarShade.setAttribute('aria-hidden','true');const wasEntry=avatarEntryMode;avatarEntryMode=false;if(wasEntry){paused=false;last=performance.now();canvas.focus();if(!localStorage.getItem('skyrealm_tutorial_seen_v1'))setTimeout(()=>{if(!inMainMenu&&!paused)openTutorial();},220);}if(saveChanges)toast('Образ персонажа сохранён!');}
  ['skin','hair','armor','accent','eye','face','hairStyle'].forEach(k=>document.getElementById('avatar-'+k).addEventListener('change',syncAvatarPreview));
  document.getElementById('menu-character').addEventListener('click',()=>openCharacterEditor(false));
  document.getElementById('inventory-tab-equipment').addEventListener('click',()=>{inventoryTab='equipment';renderInventoryTab();});
  document.getElementById('skills-open').addEventListener('click',openSkillTree);
  document.getElementById('skills-open-equipment').addEventListener('click',openSkillTree);
  document.getElementById('skill-tree-close').addEventListener('click',()=>{setPanelOpen('skill-tree-shade',false);if(skillTreeReturnToPause){paused=true;document.getElementById('pause-shade').hidden=false;}else paused=false;skillTreeReturnToPause=false;last=performance.now();canvas.focus();});
  document.getElementById('storage-close').addEventListener('click',closeStorage);
  document.getElementById('avatar-close').addEventListener('click',()=>finishCharacterEditor(false));
  document.getElementById('avatar-save').addEventListener('click',()=>finishCharacterEditor(true));
  document.getElementById('avatar-reset').addEventListener('click',()=>{for(const k of Object.keys(DEFAULT_PLAYER_APPEARANCE))document.getElementById('avatar-'+k).value=DEFAULT_PLAYER_APPEARANCE[k];syncAvatarPreview();});
  document.getElementById('menu-settings').addEventListener('click',openSettingsFromMainMenu);
  document.getElementById('menu-exit').addEventListener('click',()=>{if(window.pywebview?.api?.close)window.pywebview.api.close();else{toast('Закрой окно браузера, чтобы выйти из игры.');}});
  document.getElementById('menu-admin').addEventListener('click',openAdminGate);
  document.getElementById('admin-password-cancel').addEventListener('click',closeAdminGate);
  document.getElementById('admin-password-form').addEventListener('submit',e=>{e.preventDefault();submitAdminPassword();});
  document.getElementById('menu-moderator').addEventListener('click',openModeratorPanel);
  document.getElementById('inventory-tab-items').addEventListener('click',()=>{inventoryTab='items';renderInventoryTab();});
  document.getElementById('inventory-tab-quests').addEventListener('click',()=>{tutorialQuestSeen=true;inventoryTab='quests';questPanelVisible=true;renderInventoryTab();});
  document.getElementById('inventory-quest-toggle').addEventListener('click',()=>{questPanelVisible=!questPanelVisible;if(!questPanelVisible)inventoryTab='items';else inventoryTab='quests';renderInventoryTab();});
  document.getElementById('tutorial-close').addEventListener('click',closeTutorial);
  document.getElementById('tutorial-next').addEventListener('click',nextTutorialStep);
  document.getElementById('pause-admin-tools').addEventListener('click',()=>{panelReturnToPause=true;document.getElementById('pause-shade').hidden=true;openAdminGate();});
  document.getElementById('pause-moderator-tools').addEventListener('click',()=>{panelReturnToPause=true;document.getElementById('pause-shade').hidden=true;openModeratorPanel();});
  document.getElementById('admin-panel-close').addEventListener('click',()=>{setPanelOpen('admin-panel-shade',false);renderWorldList();if(panelReturnToPause){panelReturnToPause=false;setPaused(true);}});
  document.getElementById('moderator-panel-close').addEventListener('click',()=>{setPanelOpen('moderator-panel-shade',false);if(panelReturnToPause){panelReturnToPause=false;setPaused(true);}});
  document.getElementById('admin-heal').addEventListener('click',healPlayer);
  document.getElementById('mod-heal').addEventListener('click',healPlayer);
  document.getElementById('admin-immortal').addEventListener('click',()=>toggleImmortal('admin-immortal'));
  document.getElementById('mod-immortal').addEventListener('click',()=>toggleImmortal('mod-immortal'));
  document.getElementById('admin-give-resource').addEventListener('click',giveResource);
  document.getElementById('admin-set-day').addEventListener('click',()=>setGameTime(12*60));
  document.getElementById('admin-set-night').addEventListener('click',()=>setGameTime(22*60));
  document.getElementById('mod-set-day').addEventListener('click',()=>setGameTime(12*60));
  document.getElementById('mod-set-night').addEventListener('click',()=>setGameTime(22*60));
  document.getElementById('admin-spawn-monster').addEventListener('click',spawnAdminMonster);
  document.getElementById('mod-spawn-monster').addEventListener('click',spawnAdminMonster);
  document.getElementById('admin-clear-monsters').addEventListener('click',clearAdminMonsters);
  document.getElementById('mod-clear-monsters').addEventListener('click',clearAdminMonsters);
  document.getElementById('admin-open-map').addEventListener('click',()=>{setPanelOpen('admin-panel-shade',false);openFullMap();});
  document.getElementById('mod-open-map').addEventListener('click',()=>{setPanelOpen('moderator-panel-shade',false);openFullMap();});
  document.getElementById('admin-ban-add').addEventListener('click',()=>addLocalBan('admin-ban-name','admin-ban-list'));
  document.getElementById('mod-ban-add').addEventListener('click',()=>addLocalBan('mod-ban-name','mod-ban-list'));
  document.getElementById('full-map-close').addEventListener('click',closeFullMap);
  document.getElementById('full-map-canvas').addEventListener('click',teleportFromMap);
  document.getElementById('admin-refresh-worlds').addEventListener('click',()=>{renderWorldList();refreshAdminStats();renderBanList('admin-ban-list');toast('Список миров обновлён.');});
  document.getElementById('back-to-pause').addEventListener('click',returnFromSettings);
  document.querySelectorAll('[data-settings-tab]').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('[data-settings-tab]').forEach(tab=>{const active=tab===btn;tab.classList.toggle('active',active);tab.setAttribute('aria-selected',active?'true':'false');});
    document.getElementById('graphics-settings-panel').hidden=btn.dataset.settingsTab!=='graphics';
    document.getElementById('interface-settings-panel').hidden=btn.dataset.settingsTab!=='interface';
  }));
  ['game-quality-select','game-resolution-select','game-window-mode-select','game-ui-scale-select','show-vitals-toggle','show-quest-toggle','show-controls-toggle','show-inventory-toggle','show-minimap-toggle','hud-layout-select'].forEach(id=>document.getElementById(id).addEventListener('change',()=>applyAndSaveSettings(false)));
  document.getElementById('apply-game-settings').addEventListener('click',()=>applyAndSaveSettings(true));
  document.getElementById('toggle-hud-move').addEventListener('click',()=>{if(!hudMoveMode){setHudMoveMode(true);document.getElementById('pause-shade').hidden=true;paused=false;keys.clear();canvas.focus();}else finishHudMoveMode();});
  document.getElementById('exit').addEventListener('click', () => { saveGame(); if (window.pywebview?.api?.close) window.pywebview.api.close(); else { toast('Закрой вкладку, чтобы выйти из игры.'); setPaused(false); } });
  document.getElementById('sign-dialog-close').addEventListener('click', closeSignDialog);
  document.getElementById('sign-dialog-ok').addEventListener('click', closeSignDialog);
  document.getElementById('skip-day-button').addEventListener('click',skipGameDay);
  document.getElementById('eat-meat-button').addEventListener('click',eatMeat);
  document.getElementById('craft-furnace').addEventListener('click',craftFurnace);
  document.getElementById('craft-furnace-workbench').addEventListener('click',craftFurnace);
  document.querySelectorAll('[data-craft]').forEach(b=>b.addEventListener('click',()=>craftEquipment(b.dataset.craft))); 
  // Optional recipe buttons may be absent in older or customized HTML builds.
  document.getElementById('craft-iron-sword')?.addEventListener('click',()=>craftEquipment('sword'));
  document.getElementById('anvil-upgrade-weapon')?.addEventListener('click',()=>upgradeAtAnvil('weapon'));
  document.getElementById('anvil-upgrade-armor')?.addEventListener('click',()=>upgradeAtAnvil('armor'));
  document.getElementById('craft-leather-armor')?.addEventListener('click',()=>craftEquipment('armor'));
  document.getElementById('upgrade-house')?.addEventListener('click',upgradeHouse);
  document.getElementById('upgrade-mine')?.addEventListener('click',upgradeMine);
  document.getElementById('close-workbench').addEventListener('click',closeWorkbench);
  document.getElementById('open-inventory').addEventListener('click', openInventory);
  document.getElementById('close-inventory').addEventListener('click', closeInventory);
  document.querySelectorAll('[data-difficulty]').forEach(btn=>btn.addEventListener('click',()=>{if(btn.disabled)return;confirmDifficultySelection(btn.dataset.difficulty);}));
  document.getElementById('difficulty-cancel').addEventListener('click',()=>{closeDifficultyPicker();renderWorldList();});
  setWorldDifficulty('medium');configureTreasureChests();setupWorld(); resetWorldState(); renderInventory(); syncSettingsControls(); applyVisualSettings(); syncAdminMenu(); renderWorldList(); updateClockDisplay(true); resize(); window.addEventListener('resize',()=>{resize();try{draw(0,performance.now());}catch(error){console.error('SkyRealm resize render error:',error);drawEmergencyWorld();}}); window.addEventListener('error',event=>{console.error('SkyRealm runtime error:',event.error||event.message);try{drawEmergencyWorld();}catch(_){}}); initHudDragging(); drawMinimap(); requestAnimationFrame(tick);
})();
