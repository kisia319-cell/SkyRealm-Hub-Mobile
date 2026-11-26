(()=>{'use strict';
const WORLD_MIN=-12000,WORLD_MAX=24000;
const isAndroidDevice=/Android/i.test(typeof navigator!=='undefined'?(navigator.userAgent||''):'');
const WORLD_CATALOG_KEY='skyrealm_apocalypse_world_catalog_v1',CURRENT_WORLD_KEY='skyrealm_apocalypse_current_world_v1',WORLD_SAVE_PREFIX='skyrealm_apocalypse_world_';
const read=k=>{try{const value=JSON.parse(localStorage.getItem(k)||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{}}catch(_){return {}}};
const bounded=(value,fallback,min,max)=>{if(value===null||value===undefined||value==='')return fallback;const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback};
const whole=(value,fallback,min,max)=>Math.round(bounded(value,fallback,min,max));
let worldCatalog=(()=>{try{const raw=JSON.parse(localStorage.getItem(WORLD_CATALOG_KEY)||'null');if(Array.isArray(raw))return raw.filter(w=>w&&typeof w.id==='string'&&typeof w.name==='string').slice(0,30);}catch(_){}return[{id:'main',name:'Мой первый мир',createdAt:Date.now()}];})();
if(!localStorage.getItem(WORLD_CATALOG_KEY)){try{localStorage.setItem(WORLD_CATALOG_KEY,JSON.stringify(worldCatalog));}catch(_){}}
let currentWorldId='';try{currentWorldId=localStorage.getItem(CURRENT_WORLD_KEY)||'';}catch(_){}
if(!worldCatalog.some(w=>w.id===currentWorldId))currentWorldId=worldCatalog[0]?.id||'';
const STORE=currentWorldId==='main'?'skyrealm_apocalypse_mobile_v1':WORLD_SAVE_PREFIX+currentWorldId;
const canvas=document.getElementById('world'),ctx=canvas.getContext('2d');
const saved=read(STORE),avatar=(saved.character&&typeof saved.character==='object'?saved.character:read('skyrealm_character_v1'));
const colors={skin:avatar.skin||'#e8b88c',hair:avatar.hair||'#352d3d',shirt:avatar.shirt||avatar.armor||'#526fba',trim:avatar.trim||avatar.accent||'#9cb9ff',eyes:avatar.eyes||avatar.eye||'#26334c',pants:avatar.pants||'#343b3a',boots:avatar.boots||'#242a27',bodyType:avatar.bodyType||'average',hairStyle:avatar.hairStyle||'short',beard:avatar.beard||'none',outfit:avatar.outfit||'survivor',headgear:avatar.headgear||'none',faceAccessory:avatar.faceAccessory||'none',scar:avatar.scar===true,garmentSize:avatar.garmentSize||'M',cloak:avatar.cloak||'none',outerwear:avatar.outerwear||'none',backpack:avatar.backpack||'none',gloves:avatar.gloves||'none',pantsStyle:avatar.pantsStyle||'cargo',belt:avatar.belt||'utility',fabric:avatar.fabric||'solid',condition:avatar.condition||'worn',patch:avatar.patch||'none',cloakColor:avatar.cloakColor||'#59634b',packColor:avatar.packColor||'#3e5144',hairAccent:avatar.hairAccent||'#a78b69',browColor:avatar.browColor||avatar.hair||'#352d3d',beardColor:avatar.beardColor||avatar.hair||'#352d3d',lipColor:avatar.lipColor||'#8b5b55',eyeWhiteColor:avatar.eyeWhiteColor||'#e7e3d7',gloveColor:avatar.gloveColor||'#454a42',beltColor:avatar.beltColor||'#786744',metalColor:avatar.metalColor||'#a6a99c',undershirtColor:avatar.undershirtColor||'#343c38',skinDetailColor:avatar.skinDetailColor||'#8c4c45',patternColor:avatar.patternColor||'#293d2c',markings:avatar.markings||'none',footwear:avatar.footwear||'combat',faceShape:avatar.faceShape||'normal',eyeStyle:avatar.eyeStyle||'normal',height:avatar.height||'average'};
const state={
 x:bounded(saved.x,440,WORLD_MIN+37,WORLD_MAX-37),
 y:bounded(saved.y,390,WORLD_MIN+37,WORLD_MAX-37),
 hp:bounded(saved.hp,100,0,100),
 scrap:whole(saved.scrap,0,0,999999),bandage:whole(saved.bandage,0,0,999999),
 food:whole(saved.food,0,0,999999),wood:whole(saved.wood,0,0,999999),
 bolts:whole(saved.bolts,0,0,999999),weaponLevel:whole(saved.weaponLevel,0,0,5),
 day:whole(saved.day,1,1,999999),quest:whole(saved.quest,0,0,3),
 lastDay:typeof saved.lastDay==='string'&&saved.lastDay.length<40?saved.lastDay:new Date().toDateString(),
 dayReward:whole(saved.dayReward,0,0,999999),radioFinds:whole(saved.radioFinds,0,0,999999),
 survivorTrust:whole(saved.survivorTrust,0,0,999999),armorLevel:whole(saved.armorLevel,0,0,5),
 runUpgrade:whole(saved.runUpgrade,0,0,3),ammoUpgrade:whole(saved.ammoUpgrade,0,0,3),stamina:bounded(saved.stamina,100,0,145),
 firearm:['','pistol','shotgun','rifle'].includes(saved.firearm)?saved.firearm:'',
 meleeWeapon:['','knife'].includes(saved.meleeWeapon)?saved.meleeWeapon:'',
 ammo:whole(saved.ammo,0,0,999999),
 medInjector:whole(saved.medInjector,0,0,999999),energyDrink:whole(saved.energyDrink,0,0,999999),armorPlate:whole(saved.armorPlate,0,0,999999),ammoCrate:whole(saved.ammoCrate,0,0,999999),weaponParts:whole(saved.weaponParts,0,0,999999),electronicsPack:whole(saved.electronicsPack,0,0,999999),
 cleanWater:whole(saved.cleanWater,2,0,999999),
 hydration:bounded(saved.hydration,100,0,100),
 safehouseLevel:whole(saved.safehouseLevel,0,0,3),
 waterFilterLevel:whole(saved.waterFilterLevel,0,0,2),
 scannerLevel:whole(saved.scannerLevel,0,0,1),
 contractDay:whole(saved.contractDay,0,0,999999),
 contractType:['wood','kills','salvage'].includes(saved.contractType)?saved.contractType:'wood',
 contractProgress:whole(saved.contractProgress,0,0,99),
 contractClaimed:saved.contractClaimed===true,
 infection:bounded(saved.infection,0,0,100),bodyTemp:bounded(saved.bodyTemp,72,0,100),crewCount:whole(saved.crewCount,0,0,3),crewRole:['scavenger','medic','guard'].includes(saved.crewRole)?saved.crewRole:'scavenger',workbenchLevel:whole(saved.workbenchLevel,1,1,3),weaponDurability:bounded(saved.weaponDurability,100,0,100),antibiotics:whole(saved.antibiotics,0,0,999999),campfireBuilt:saved.campfireBuilt===true,campfireFuel:whole(saved.campfireFuel,0,0,999999),vehicleRepaired:saved.vehicleRepaired===true,fuel:whole(saved.fuel,0,0,999999),raidDay:whole(saved.raidDay,0,0,999999),
 skillXP:whole(saved.skillXP,0,0,999999),skillPoints:whole(saved.skillPoints,0,0,9999),
 skillLevels:{combat:whole(saved.skillLevels?.combat,0,0,5),scavenger:whole(saved.skillLevels?.scavenger,0,0,5),medic:whole(saved.skillLevels?.medic,0,0,5)},
 weaponMods:{optic:whole(saved.weaponMods?.optic,0,0,3),barrel:whole(saved.weaponMods?.barrel,0,0,3),grip:whole(saved.weaponMods?.grip,0,0,3)},
 baseDefenseLevel:whole(saved.baseDefenseLevel,0,0,3),defenseAmmo:whole(saved.defenseAmmo,0,0,9999)
};
const savedWrecks=Array.isArray(saved.wrecks)?saved.wrecks:[];
let starterKnife=saved.starterKnife&&Number.isFinite(saved.starterKnife.x)&&Number.isFinite(saved.starterKnife.y)?{x:saved.starterKnife.x,y:saved.starterKnife.y,picked:saved.starterKnife.picked===true} :{x:state.x+96,y:state.y-24,picked:false};
let starterKnifeSpawnVersion=whole(saved.starterKnifeSpawnVersion,0,0,2);if(starterKnifeSpawnVersion<2){if(!starterKnife.picked)starterKnife={x:state.x+96,y:state.y-24,picked:false};starterKnifeSpawnVersion=2;}
const mapMarkers=Array.isArray(saved.mapMarkers)?saved.mapMarkers.filter(v=>v&&typeof v.name==='string'&&Number.isFinite(v.x)&&Number.isFinite(v.y)).slice(0,100).map(v=>({name:v.name.slice(0,36),x:bounded(v.x,0,WORLD_MIN,WORLD_MAX),y:bounded(v.y,0,WORLD_MIN,WORLD_MAX)})):[];
let activeWaypoint=saved.activeWaypoint&&typeof saved.activeWaypoint.name==='string'&&Number.isFinite(saved.activeWaypoint.x)&&Number.isFinite(saved.activeWaypoint.y)?{name:saved.activeWaypoint.name.slice(0,36),x:bounded(saved.activeWaypoint.x,0,WORLD_MIN,WORLD_MAX),y:bounded(saved.activeWaypoint.y,0,WORLD_MIN,WORLD_MAX)}:null;
let bonusLives=whole(saved.bonusLives,0,0,3),bonusLivesActive=saved.bonusLivesActive===true;
const savedWorldClock=bounded(saved.worldClock,1/3,0,.999999);
const playerName=(()=>{try{const direct=localStorage.getItem('skyrealm_username');if(typeof direct==='string'&&direct.trim())return direct.trim().slice(0,24);const user=read('skyrealm_hub_user');const name=String(user.username||'Выживший').trim();return name.slice(0,24)||'Выживший'}catch(_){return 'Выживший'}})();
const mark={x:610,y:400};
// Spawn protection fire: one wood fuels three real-world minutes; each upgrade expands its safe radius.
// Its position is initialized from the same deterministic safe-spawn search used by the player.
const spawnCampfire={x:440,y:390};
let spawnCampfireLevel=whole(saved.spawnCampfireLevel,1,1,10);
let spawnCampfireUntil=Number.isFinite(saved.spawnCampfireUntil)?Math.max(0,saved.spawnCampfireUntil):Date.now()+180000;
const spawnCampfireRadius=()=>((30+(spawnCampfireLevel-1)*10)*32);
const spawnCampfireUpgradeCost=()=>spawnCampfireLevel*5;
const spawnCampfireRemaining=()=>Math.max(0,spawnCampfireUntil-Date.now());
const spawnCampfireActive=()=>spawnCampfireRemaining()>0;
const nearSpawnCampfire=()=>Math.hypot(state.x-spawnCampfire.x,state.y-spawnCampfire.y)<190;
const wrecks=[{x:300,y:260,done:false},{x:800,y:280,done:false},{x:930,y:650,done:false},{x:330,y:720,done:false},{x:650,y:900,done:false},{x:1200,y:420,done:false},{x:1450,y:800,done:false},{x:1850,y:350,done:false},{x:2200,y:780,done:false},{x:2750,y:520,done:false},{x:3100,y:1250,done:false},{x:1900,y:1950,done:false},{x:-9300,y:-9300,done:false},{x:-6100,y:-4200,done:false},{x:-2200,y:-10100,done:false},{x:4100,y:-8500,done:false},{x:9100,y:-9000,done:false},{x:15100,y:-9200,done:false},{x:20700,y:-5200,done:false},{x:22400,y:1800,done:false},{x:19400,y:7600,done:false},{x:22600,y:14600,done:false},{x:17200,y:21200,done:false},{x:11200,y:22600,done:false},{x:4200,y:21900,done:false},{x:-3200,y:21500,done:false},{x:-9600,y:17700,done:false},{x:-10500,y:10500,done:false},{x:-8200,y:2500,done:false},{x:13500,y:12800,done:false},{x:7200,y:15300,done:false},{x:1800,y:11200,done:false}];
wrecks.forEach((v,i)=>v.done=savedWrecks[i]===true);
// Keep a saved player spawn clear of parked/wrecked vehicles.
for(const v of wrecks){if(Math.hypot(state.x-v.x,state.y-v.y)<62){state.x=v.x+92;state.y=v.y+72;break;}}
let w=0,h=0,dpr=1,time=0,toastTimer=0,dialogMode='intro',moveX=0,moveY=0,joyPointer=null,wind=0,windName='тихий';
const zombies=[];const spikeTraps=Array.isArray(saved.spikeTraps)?saved.spikeTraps.filter(v=>v&&Number.isFinite(v.x)&&Number.isFinite(v.y)).slice(0,36).map(v=>({x:v.x,y:v.y,angle:bounded(v.angle,0,-Math.PI*2,Math.PI*2),charges:whole(v.charges,2,0,3)})):[];const barricades=Array.isArray(saved.barricades)?saved.barricades.filter(v=>v&&typeof v==='object'&&Number.isFinite(v.x)&&Number.isFinite(v.y)&&v.x>=WORLD_MIN+40&&v.x<=WORLD_MAX-40&&v.y>=WORLD_MIN+40&&v.y<=WORLD_MAX-40).slice(0,24).map(v=>({x:v.x,y:v.y,angle:bounded(v.angle,0,-Math.PI*2,Math.PI*2)})):[];const infectionZones=[{x:3250,y:3280,r:185},{x:6500,y:6450,r:220},{x:10100,y:8500,r:175},{x:8350,y:2100,r:155}];let lastZombieSpawn=0,worldClock=savedWorldClock,zombieId=0,lastAttackAt=0,lastInfectionDamageAt=0,lastHudUpdate=0;const ZOMBIE_INTERVAL=38000;let lastExpansionUpdate=0;
const keys=new Set();
let buildMode=false,buildAngle=0,buildType='barricade';
function buildCandidate(){return{x:Math.max(WORLD_MIN+40,Math.min(WORLD_MAX-40,state.x+Math.cos(buildAngle)*76)),y:Math.max(WORLD_MIN+40,Math.min(WORLD_MAX-40,state.y+Math.sin(buildAngle)*76)),angle:buildAngle};}
function canPlaceBarricade(p){const halfW=buildType==='spikes'?26:32,halfH=buildType==='spikes'?19:21,c=Math.cos(p.angle),s=Math.sin(p.angle);if(Math.hypot(p.x-state.x,p.y-state.y)<48)return false;if(buildType==='spikes'&&spikeTraps.some(t=>Math.hypot(t.x-p.x,t.y-p.y)<48))return false;for(const [lx,ly] of [[-halfW,-halfH],[halfW,-halfH],[-halfW,halfH],[halfW,halfH],[0,0]]){const x=p.x+lx*c-ly*s,y=p.y+lx*s+ly*c;if(blocked(x,y)||insideBuilding(x,y))return false;}if(zombies.some(z=>Math.hypot(z.x-p.x,z.y-p.y)<42))return false;return true;}
function setBuildMode(on,type='barricade'){buildMode=!!on;buildType=type;document.getElementById('buildControls').classList.toggle('hidden',!buildMode);if(buildMode){document.getElementById('panel').classList.add('hidden');toast(type==='spikes'?'Выбери место для шипованной ловушки · R / ПОВОРОТ · Enter':'Выбери место для баррикады · R / ПОВОРОТ · Enter');}else{document.getElementById('buildStatus').textContent='';}}
function rotateBuild(){if(!buildMode)return;buildAngle=(buildAngle+Math.PI/4)%(Math.PI*2);}
function placeBarricade(){if(!buildMode)return;const p=buildCandidate();if(!canPlaceBarricade(p)){toast('Здесь нельзя строить: место занято');return;}if(buildType==='spikes'){if(state.scrap<2||state.wood<4||state.bolts<1){toast('Ловушка требует 2 металла, 4 дерева и 1 крепёж');setBuildMode(false);return;}if(spikeTraps.length>=36){toast('Лимит ловушек достигнут');setBuildMode(false);return;}state.scrap-=2;state.wood-=4;state.bolts--;const trap={x:p.x,y:p.y,angle:p.angle,charges:3};spikeTraps.push(trap);const coop=window.ApocalypseCoop;if(coop?.room?.status==='running')coop.send({kind:'spike-trap-built',trap});save();setBuildMode(false);toast('Шипованная ловушка установлена · 3 срабатывания');return;}if(state.scrap<2||state.wood<3){toast('Не хватает ресурсов: нужно 2 металла и 3 дерева');setBuildMode(false);return;}if(barricades.length>=24){toast('Лимит укреплений достигнут');setBuildMode(false);return;}state.scrap-=2;state.wood-=3;const placed={x:p.x,y:p.y,angle:p.angle};barricades.push(placed);const coop=window.ApocalypseCoop;if(coop?.room?.status==='running')coop.send({kind:'barricade-built',barricade:placed});save();setBuildMode(false);toast('Баррикада установлена');}
let gameActive=false,lastNet=0,deathHandled=false,respawnUntil=0,mobileQuickMenuResume=false,settingsResumeGame=false,sprintHeld=false,sprintActive=false,sprintLocked=false,mapResumeGame=false;
let radioSignal=null,radioSignalNextAt=performance.now()+30000;
let ambientEventNextAt=performance.now()+45000+Math.random()*35000;
const randomEventSites=Array.isArray(saved.randomEventSites)?saved.randomEventSites.filter(v=>v&&['car','checkpoint','camp','gunfire','scream','convoy','quarantine','survivors','signal','horde','campaign','campaign-beacon-part','campaign-cache','campaign-relay','campaign-wave','campaign-convoy','campaign-extract'].includes(v.type)&&Number.isFinite(v.x)&&Number.isFinite(v.y)).slice(-40):[];
const campaign=(()=>{const c=saved.longCampaign&&typeof saved.longCampaign==='object'?saved.longCampaign:{};return{status:['locked','active','complete'].includes(c.status)?c.status:'locked',stage:whole(c.stage,0,0,5),runId:whole(c.runId,Date.now(),1,Number.MAX_SAFE_INTEGER),unlockAt:Number.isFinite(c.unlockAt)?c.unlockAt:Date.now()+240000,x:bounded(c.x,0,WORLD_MIN,WORLD_MAX),y:bounded(c.y,0,WORLD_MIN,WORLD_MAX),caches:whole(c.caches,0,0,3),beaconParts:whole(c.beaconParts,0,0,3),beaconActivated:c.beaconActivated===true,wave:whole(c.wave,0,0,7),waveWanted:whole(c.waveWanted,0,0,12),waveSpawned:whole(c.waveSpawned,0,0,12),nextWaveAt:whole(c.nextWaveAt,0,0,Number.MAX_SAFE_INTEGER),siteId:typeof c.siteId==='string'?c.siteId:'',completedAt:whole(c.completedAt,0,0,Number.MAX_SAFE_INTEGER)}})();
const primePrefs=window.PRIMEHUB_APOCALYPSE_SETTINGS&&typeof window.PRIMEHUB_APOCALYPSE_SETTINGS==='object'?window.PRIMEHUB_APOCALYPSE_SETTINGS:{};
const prefs=(()=>{const raw={...read('skyrealm_apocalypse_settings_v1'),...primePrefs};return{effects:['low','balanced','high'].includes(raw.effects)?raw.effects:'high',joy:bounded(raw.joy,100,60,140),motion:raw.motion!==false,hints:raw.hints!==false,weather:raw.weather!==false,ambientAudio:raw.ambientAudio!==false,infectedCap:whole(raw.infectedCap,18,8,24),eventFrequency:bounded(raw.eventFrequency,1,.5,1.8),autosaveSeconds:whole(raw.autosaveSeconds,5,5,30),autoSprint:raw.autoSprint===true,showHydration:raw.showHydration!==false,survivalDifficulty:['easy','standard','hard'].includes(raw.survivalDifficulty)?raw.survivalDifficulty:'standard',renderDistance:['near','normal','far'].includes(raw.renderDistance)?raw.renderDistance:'normal',maxFps:[30,45,60].includes(Number(raw.maxFps))?Number(raw.maxFps):60,showEnemyHealth:raw.showEnemyHealth!==false,showSurvivalHud:raw.showSurvivalHud!==false}})();
// Deterministic, irregular forest placement. One tree per roughly 8 game blocks (256 world units).
const trees=[];
const worldProps=[
 {id:'camp_tent_1',type:'tent',x:1510,y:1710,w:78,h:58},{id:'fuel_pumps_1',type:'pump',x:3250,y:1690,w:92,h:48},
 {id:'rubble_1',type:'rubble',x:5520,y:2380,w:92,h:58},{id:'dumpster_1',type:'dumpster',x:8520,y:2510,w:74,h:48},
 {id:'barrier_1',type:'barrier',x:1570,y:5480,w:112,h:28},{id:'market_1',type:'stall',x:5650,y:5480,w:108,h:68},
 {id:'camp_tent_2',type:'tent',x:8550,y:6880,w:82,h:62},{id:'rubble_2',type:'rubble',x:2920,y:8720,w:98,h:60},
 {id:'fuel_pumps_2',type:'pump',x:6700,y:8900,w:92,h:48},{id:'dumpster_2',type:'dumpster',x:1900,y:8650,w:74,h:48},
 {id:'barrier_2',type:'barrier',x:9300,y:5420,w:120,h:30},{id:'stall_2',type:'stall',x:9250,y:8750,w:112,h:68},
 {id:'north_camp_1',type:'tent',x:-8400,y:-7200,w:88,h:64},{id:'north_rubble_1',type:'rubble',x:-5100,y:-8500,w:112,h:66},{id:'north_pump_1',type:'pump',x:-1600,y:-7800,w:96,h:52},
 {id:'east_dumpster_1',type:'dumpster',x:14300,y:-6400,w:78,h:50},{id:'east_barrier_1',type:'barrier',x:18100,y:-2800,w:126,h:32},{id:'east_tent_1',type:'tent',x:21300,y:2400,w:92,h:68},
 {id:'south_rubble_1',type:'rubble',x:17800,y:8200,w:112,h:68},{id:'south_pump_1',type:'pump',x:13600,y:14500,w:96,h:52},{id:'south_dumpster_1',type:'dumpster',x:8200,y:19600,w:82,h:52},
 {id:'south_tent_1',type:'tent',x:2200,y:20800,w:90,h:66},{id:'west_rubble_1',type:'rubble',x:-8200,y:16200,w:110,h:64},{id:'west_barrier_1',type:'barrier',x:-10800,y:9800,w:124,h:30},
 {id:'north_market_1',type:'stall',x:4500,y:-9800,w:116,h:70},{id:'north_dumpster_1',type:'dumpster',x:8900,y:-10800,w:82,h:52},{id:'east_camp_1',type:'tent',x:22600,y:10800,w:92,h:66},
 {id:'south_market_1',type:'stall',x:15100,y:22100,w:118,h:70},{id:'west_pump_1',type:'pump',x:-10900,y:4200,w:94,h:50},{id:'west_tent_1',type:'tent',x:-6400,y:22000,w:90,h:66}
];
let lastSignalMission=saved.lastSignalMission&&typeof saved.lastSignalMission==='object'&&Number.isFinite(saved.lastSignalMission.x)&&Number.isFinite(saved.lastSignalMission.y)?{status:['briefing','active','completed'].includes(saved.lastSignalMission.status)?saved.lastSignalMission.status:'briefing',stage:Math.max(0,Math.min(2,Number(saved.lastSignalMission.stage)||0)),x:bounded(saved.lastSignalMission.x,0,WORLD_MIN+100,WORLD_MAX-100),y:bounded(saved.lastSignalMission.y,0,WORLD_MIN+100,WORLD_MAX-100)}:null;
if(lastSignalMission&&lastSignalMission.status==='briefing'&&Math.hypot(lastSignalMission.x-state.x,lastSignalMission.y-state.y)<3200){const dx=state.x<WORLD_MAX-3800?3600:-3600,dy=state.y>WORLD_MIN+900?-650:650;lastSignalMission.x=state.x+dx;lastSignalMission.y=state.y+dy;}
if(lastSignalMission)worldProps.push({id:'last_signal_crash',type:'crash_site',x:lastSignalMission.x,y:lastSignalMission.y,w:190,h:132});

for(const site of randomEventSites){if(['car','checkpoint','camp','convoy','quarantine','survivors'].includes(site.type)){const type=site.type==='car'||site.type==='convoy'?'wrecked_car':site.type==='checkpoint'||site.type==='quarantine'?'barrier':'tent';worldProps.push({id:site.id||'saved_'+randomEventSites.indexOf(site),type,x:site.x,y:site.y,w:type==='wrecked_car'?112:type==='barrier'?138:96,h:type==='wrecked_car'?58:type==='barrier'?36:70});}}
const survivorCamp={bench:{x:1850,y:650},trader:{x:2010,y:650}};
function buildForest(){
 let seed=0x51a7e;
 const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 const legacyZones=buildings.slice(0,21).map(b=>({x:b.x+b.w/2,y:b.y-b.floors*17+b.h/2,r:Math.max(b.w,b.h+b.floors*34)*.72+70}))
   .concat(worldProps.slice(0,12).map(p=>({x:p.x,y:p.y,r:Math.max(p.w,p.h)*.85+35})),[{x:mark.x,y:mark.y,r:135},{x:440,y:390,r:175}],wrecks.slice(0,12).map(v=>({x:v.x,y:v.y,r:100})));
 for(let attempt=0;attempt<26000&&trees.length<360;attempt++){
  const x=65+rand()*11870,y=65+rand()*11870;
  if([600,4100,7600,10000].some(road=>Math.abs(y-road)<95))continue;
  if([2700,6200,9700,10000].some(road=>Math.abs(x-road)<95))continue;
  if(legacyZones.some(z=>(x-z.x)**2+(y-z.y)**2<z.r*z.r))continue;
  if(trees.some(t=>(x-t.x)**2+(y-t.y)**2<256*256))continue;
  trees.push({x,y,size:.78+rand()*.62,phase:rand()*Math.PI*2});
 }
 const blockedZones=buildings.map(b=>({x:b.x+b.w/2,y:b.y-b.floors*17+b.h/2,r:Math.max(b.w,b.h+b.floors*34)*.72+90}))
   .concat(worldProps.map(p=>({x:p.x,y:p.y,r:Math.max(p.w,p.h)*.85+45})),[{x:mark.x,y:mark.y,r:170},{x:440,y:390,r:210}],wrecks.map(v=>({x:v.x,y:v.y,r:115})));
 const roads=[-8000,-4500,-1000,600,4100,7600,10000,13500,17000,20500],cell=280,occupied=new Map();
 for(const t of trees){const cx=Math.floor(t.x/150),cy=Math.floor(t.y/150),key=cx+','+cy;if(!occupied.has(key))occupied.set(key,[]);occupied.get(key).push(t);}
 for(let gy=WORLD_MIN+120;gy<WORLD_MAX-120;gy+=cell)for(let gx=WORLD_MIN+120;gx<WORLD_MAX-120;gx+=cell){
  if(rand()>.46)continue;
  const x=gx+65+rand()*150,y=gy+65+rand()*150;
  if(roads.some(v=>Math.abs(y-v)<105)||roads.some(v=>Math.abs(x-v)<105))continue;
  if(blockedZones.some(z=>(x-z.x)**2+(y-z.y)**2<z.r*z.r))continue;
  const cx=Math.floor(x/150),cy=Math.floor(y/150);let close=false;
  for(let yy=cy-1;yy<=cy+1&&!close;yy++)for(let xx=cx-1;xx<=cx+1;xx++){const arr=occupied.get(xx+','+yy)||[];if(arr.some(t=>(x-t.x)**2+(y-t.y)**2<125*125)){close=true;break;}}
  if(close)continue;
  const t={x,y,size:.72+rand()*.7,phase:rand()*Math.PI*2};trees.push(t);
  const key=cx+','+cy;if(!occupied.has(key))occupied.set(key,[]);occupied.get(key).push(t);
 }
}
const buildings=[
 {id:'residential',x:720,y:1120,w:360,h:290,floors:5,accent:'#68715c'},
 {id:'hospital',x:4220,y:1120,w:390,h:310,floors:6,accent:'#8b8877'},
 {id:'police',x:7720,y:1120,w:350,h:280,floors:4,accent:'#626e70'},
 {id:'mall',x:720,y:4620,w:420,h:340,floors:4,accent:'#77705e'},
 {id:'office',x:4220,y:4620,w:360,h:310,floors:7,accent:'#626d6c'},
 {id:'apartment',x:7720,y:4620,w:390,h:330,floors:6,accent:'#82745f'},
 {id:'warehouse',x:4220,y:8120,w:440,h:350,floors:3,accent:'#6d705e'},
 {id:'fire_station',x:10300,y:1120,w:390,h:300,floors:3,accent:'#765e52'},
 {id:'supermarket',x:10300,y:4620,w:430,h:330,floors:2,accent:'#77715f'},
 {id:'motel',x:1800,y:10620,w:380,h:300,floors:4,accent:'#756d59'},
 {id:'factory',x:6500,y:10620,w:470,h:360,floors:3,accent:'#626a64'},
 {id:'clinic_outpost',x:1820,y:2820,w:310,h:250,floors:2,accent:'#85806d'},
 {id:'bus_depot',x:7600,y:2820,w:420,h:270,floors:2,accent:'#646d67'},
 {id:'radio_tower',x:8500,y:9360,w:300,h:260,floors:3,accent:'#59665e'},
 {id:'farmhouse',x:1800,y:9360,w:340,h:270,floors:2,accent:'#776b52'},
 {id:'hardware_store',x:2920,y:1120,w:390,h:290,floors:2,accent:'#77705b',role:'store',kind:'hardware'},
 {id:'weapon_shop',x:5650,y:4620,w:410,h:310,floors:2,accent:'#6b6e61',role:'store',kind:'weapons'},
 {id:'pharmacy_ruins',x:9250,y:2820,w:340,h:260,floors:2,accent:'#7b806d',role:'store',kind:'pharmacy'},
 {id:'underground_shelter',x:3000,y:8120,w:420,h:330,floors:1,accent:'#58645a',role:'shelter'},
 {id:'survivor_safehouse',x:9000,y:8120,w:390,h:300,floors:2,accent:'#746c55',role:'shelter'},
 {id:'rural_market',x:5650,y:9000,w:430,h:310,floors:2,accent:'#7a7059',role:'store',kind:'market'},
 {id:'north_residential',x:-9300,y:-6500,w:420,h:330,floors:4,accent:'#68715c'},{id:'north_warehouse',x:-4800,y:-10100,w:470,h:360,floors:3,accent:'#6d705e'},{id:'north_hospital',x:2600,y:-9100,w:410,h:320,floors:5,accent:'#8b8877'},
 {id:'east_factory',x:14400,y:-6200,w:480,h:360,floors:3,accent:'#626a64'},{id:'east_market',x:19800,y:1200,w:430,h:330,floors:2,accent:'#77715f',role:'store',kind:'market'},{id:'east_safehouse',x:21600,y:6800,w:410,h:320,floors:2,accent:'#746c55',role:'shelter'},
 {id:'south_fire_station',x:15100,y:14500,w:400,h:310,floors:3,accent:'#765e52'},{id:'south_clinic',x:8700,y:19600,w:340,h:270,floors:2,accent:'#85806d'},{id:'south_weapons',x:1000,y:20500,w:410,h:310,floors:2,accent:'#6b6e61',role:'store',kind:'weapons'},
 {id:'west_motel',x:-9900,y:13200,w:390,h:310,floors:3,accent:'#756d59'},{id:'west_shelter',x:-10800,y:5000,w:420,h:330,floors:1,accent:'#58645a',role:'shelter'},{id:'west_supermarket',x:-6500,y:20500,w:430,h:330,floors:2,accent:'#77715f',role:'store',kind:'market'},
 {id:'water_treatment',x:-6500,y:1200,w:430,h:320,floors:3,accent:'#647b7c',role:'loot',texture:'metal',kind:'water'},
 {id:'school_ruins',x:-2500,y:7600,w:460,h:340,floors:4,accent:'#82745d',role:'loot',texture:'brick',kind:'school'},
 {id:'city_bank',x:12500,y:4100,w:420,h:330,floors:5,accent:'#74766e',role:'loot',texture:'concrete',kind:'bank'},
 {id:'garage_complex',x:16500,y:10000,w:480,h:350,floors:2,accent:'#626c60',role:'loot',texture:'asphalt',kind:'garage'},
 {id:'research_center',x:6000,y:17000,w:450,h:340,floors:4,accent:'#777f78',role:'loot',texture:'plaster',kind:'lab'},
 {id:'old_mill',x:-2000,y:18000,w:440,h:330,floors:3,accent:'#786b51',role:'loot',texture:'dirt',kind:'mill'},
 {id:'power_plant',x:17800,y:-10000,w:500,h:370,floors:2,accent:'#59645c',role:'generator',texture:'metal',kind:'power'},
 {id:'military_bunker',x:-10300,y:-10400,w:460,h:340,floors:2,accent:'#62695d',role:'loot',texture:'concrete',kind:'bunker'},
 {id:'train_station',x:20500,y:17700,w:500,h:360,floors:3,accent:'#756a59',role:'loot',texture:'rust',kind:'station'},
 {id:'greenhouse_ruins',x:-10200,y:21500,w:460,h:330,floors:2,accent:'#68795f',role:'loot',texture:'glass',kind:'greenhouse'},
 {id:'quarantine_prison',x:-7200,y:-2500,w:500,h:370,floors:3,accent:'#62695d',role:'loot',texture:'metal',kind:'prison'},
 {id:'port_terminal',x:13900,y:21400,w:520,h:380,floors:2,accent:'#69736e',role:'loot',texture:'rust',kind:'port'},
 {id:'deep_research_lab',x:21200,y:-9400,w:490,h:360,floors:4,accent:'#64716e',role:'loot',texture:'glass',kind:'lab'},
 {id:'stone_quarry',x:-10800,y:-2200,w:480,h:350,floors:2,accent:'#77715f',role:'loot',texture:'gravel',kind:'quarry'}
];
for(const b of buildings){if(!b.role){b.role='loot';b.kind='residential';}}
const visitedStores=new Set(Array.isArray(saved.visitedStores)?saved.visitedStores:[]);
const storeLoot=saved.storeLoot&&typeof saved.storeLoot==='object'?saved.storeLoot:{};
const lootedShelters=new Set(Array.isArray(saved.lootedShelters)?saved.lootedShelters:[]);
 const shelterLoot=saved.shelterLoot&&typeof saved.shelterLoot==='object'?saved.shelterLoot:{};
const interiorEvidence=saved.interiorEvidence&&typeof saved.interiorEvidence==='object'?saved.interiorEvidence:{};
const buildingLoot=saved.buildingLoot&&typeof saved.buildingLoot==='object'?saved.buildingLoot:{};
const buildingFloors=saved.buildingFloors&&typeof saved.buildingFloors==='object'?saved.buildingFloors:{};
let activeInterior=saved.activeInterior&&typeof saved.activeInterior.buildingId==='string'&&buildings.some(b=>b.id===saved.activeInterior.buildingId)?{buildingId:saved.activeInterior.buildingId,floor:whole(saved.activeInterior.floor,1,1,12)}:null;
let interiorReturn=saved.interiorReturn&&Number.isFinite(saved.interiorReturn.x)&&Number.isFinite(saved.interiorReturn.y)?{x:bounded(saved.interiorReturn.x,440,WORLD_MIN+37,WORLD_MAX-37),y:bounded(saved.interiorReturn.y,390,WORLD_MIN+37,WORLD_MAX-37)}:null;
const lootCycle=['medInjector','energyDrink','armorPlate','ammoCrate','weaponParts','electronicsPack','cleanWater'];
for(const b of buildings){buildingFloors[b.id]=Math.max(1,Math.min(b.floors,whole(buildingFloors[b.id],1,1,b.floors)));}
for(const b of buildings){const seed=Math.abs(Math.floor(b.x/100)+Math.floor(b.y/100));if(!Array.isArray(buildingLoot[b.id]))buildingLoot[b.id]=Array.from({length:b.floors},(_,i)=>({item:lootCycle[(seed+i*3)%lootCycle.length],picked:false}));else{buildingLoot[b.id]=Array.from({length:b.floors},(_,i)=>{const v=buildingLoot[b.id][i];return v&&lootCycle.includes(v.item)?{item:lootCycle[(seed+i*3)%lootCycle.length],picked:v.picked===true,weaponDrop:v.weaponDrop||'',weaponAmmo:whole(v.weaponAmmo,0,0,60),weaponPicked:v.weaponPicked===true}:{item:lootCycle[(seed+i*3)%lootCycle.length],picked:false};});}buildingFloors[b.id]=Math.max(1,Math.min(b.floors,whole(buildingFloors[b.id],1,1,b.floors)));}
for(const b of buildings){const seed=Math.abs(Math.floor(b.x/100)+Math.floor(b.y/100));for(let i=0;i<b.floors;i++){const entry=buildingLoot[b.id][i];if(!Array.isArray(entry.contents)){entry.contents=entry.picked?[]:[{item:entry.item,picked:false,tier:'common'},{item:lootCycle[(seed+i*3+2)%lootCycle.length],picked:false,tier:(seed+i)%5===0?'rare':'uncommon'},{item:lootCycle[(seed+i*3+4)%lootCycle.length],picked:false,tier:'common'}];}else entry.contents=entry.contents.filter(v=>v&&lootCycle.includes(v.item)).map(v=>({item:v.item,picked:v.picked===true,tier:['common','uncommon','rare'].includes(v.tier)?v.tier:'common'}));entry.picked=entry.contents.length===0||entry.contents.every(v=>v.picked);}}
for(const b of buildings){const seed=Math.abs(Math.floor(b.x/100)+Math.floor(b.y/100));for(let i=0;i<b.floors;i++){const entry=buildingLoot[b.id][i],roll=Math.abs(Math.sin(seed*17.13+(i+1)*91.7)*10000)%100;if(!entry.weaponDrop&&roll<24){entry.weaponDrop=roll<8?'pistol':roll<16?'shotgun':'rifle';entry.weaponAmmo=entry.weaponDrop==='shotgun'?8:entry.weaponDrop==='rifle'?16:12;}entry.weaponPicked=entry.weaponPicked===true;}}

const isHomeBuilding=b=>!!b&&/residential|apartment|farmhouse|motel|safehouse/.test(b.id);
const homeFurnitureSlots=[
 {id:'kitchen',x:235,y:545,label:'КУХОННЫЙ ШКАФ'},
 {id:'wardrobe',x:650,y:260,label:'ГАРДЕРОБ'},
 {id:'nightstand',x:925,y:515,label:'ПРИКРОВАТНАЯ ТУМБОЧКА'}
];
const homeLootCycle=['food','cleanWater','bandage','wood','scrap','bolts','medInjector','weaponParts','electronicsPack'];
const homeFurnitureLoot=saved.homeFurnitureLoot&&typeof saved.homeFurnitureLoot==='object'?saved.homeFurnitureLoot:{};
const homeRestedDay=saved.homeRestedDay&&typeof saved.homeRestedDay==='object'?saved.homeRestedDay:{};
const homeWorkbenchDay=saved.homeWorkbenchDay&&typeof saved.homeWorkbenchDay==='object'?saved.homeWorkbenchDay:{};
const homeRadioDay=saved.homeRadioDay&&typeof saved.homeRadioDay==='object'?saved.homeRadioDay:{};
for(const b of buildings){if(!isHomeBuilding(b))continue;const seed=[...b.id].reduce((n,ch)=>n+ch.charCodeAt(0),0);const old=Array.isArray(homeFurnitureLoot[b.id])?homeFurnitureLoot[b.id]:[];homeFurnitureLoot[b.id]=Array.from({length:b.floors},(_,floor)=>homeFurnitureSlots.map((slot,index)=>{const prior=old[floor]?.[index],item=prior&&homeLootCycle.includes(prior.item)?prior.item:homeLootCycle[(seed+floor*3+index*5)%homeLootCycle.length];return{item,count:prior?whole(prior.count,1,1,3):1+(seed+floor+index)%3,picked:prior?.picked===true};}));}
const generatorBuilding=buildings.find(b=>b.id==='power_plant');
const generatorConsole={x:generatorBuilding.x+generatorBuilding.w/2-72,y:generatorBuilding.y+generatorBuilding.h-172};
let generatorRepaired=saved.generatorRepaired===true,generatorOnline=generatorRepaired&&saved.generatorOnline!==false,generatorLastPulse=0;
const acidProjectiles=[];
let energyBoostUntil=0;
buildForest();
const TREE_GRID_SIZE=320,treeGrid=new Map();
function treeGridKey(x,y){return Math.floor(x/TREE_GRID_SIZE)+','+Math.floor(y/TREE_GRID_SIZE)}
for(const t of trees){const key=treeGridKey(t.x,t.y);if(!treeGrid.has(key))treeGrid.set(key,[]);treeGrid.get(key).push(t);}
function nearbyTrees(x,y,range=100){const out=[],minX=Math.floor((x-range)/TREE_GRID_SIZE),maxX=Math.floor((x+range)/TREE_GRID_SIZE),minY=Math.floor((y-range)/TREE_GRID_SIZE),maxY=Math.floor((y+range)/TREE_GRID_SIZE);for(let gy=minY;gy<=maxY;gy++)for(let gx=minX;gx<=maxX;gx++){const cell=treeGrid.get(gx+','+gy);if(cell)for(const t of cell)if(Math.abs(t.x-x)<=range&&Math.abs(t.y-y)<=range)out.push(t);}return out;}
const harvestedTrees=new Set(Array.isArray(saved.harvestedTrees)?saved.harvestedTrees:[]);trees.forEach((t,i)=>t.harvested=harvestedTrees.has(i));
const treeHitCounts=new Map();
const rivers=[[-9300,-8500,3200,2240,-.55],[-5200,-4200,3200,2240,.48],[-1200,-9200,3200,2240,-.62],[2600,-5200,3200,2240,.55],[6500,-9800,3200,2240,-.5],[10800,-5200,3200,2240,.58],[15100,-9300,3200,2240,-.48],[19400,-4200,3200,2240,.5],[-10200,1800,3200,2240,.52],[-6100,6200,3200,2240,-.56],[-1800,10800,3200,2240,.48],[2500,15100,3200,2240,-.5],[6800,19500,3200,2240,.55],[11100,14800,3200,2240,-.52],[15400,20500,3200,2240,.5],[19700,12000,3200,2240,-.54]].map((v,i)=>({id:i,x:v[0],y:v[1],w:v[2],h:v[3],angle:v[4]}));
const foundShelterCaches=new Set(Array.isArray(saved.foundShelterCaches)?saved.foundShelterCaches:[]);
const supplyShelters=Array.from({length:60},(_,i)=>{const col=i%10,row=Math.floor(i/10);return{id:i,x:-5200+col*1180+(row%2)*90,y:-2800+row*1120,w:112,h:88,loot:[{icon:'🥫',name:'Консервы',count:1+(i%3)},{icon:'🩹',name:'Аптечка',count:i%4===0?1:0},{icon:'🔩',name:'Крепёж',count:1+(i%2)},{icon:'💧',name:'Чистая вода',count:i%3===0?1:0}]};});
 const supplyShelterContents=saved.supplyShelterContents&&typeof saved.supplyShelterContents==='object'?saved.supplyShelterContents:{};
 for(const s of supplyShelters){if(!Array.isArray(supplyShelterContents[s.id]))supplyShelterContents[s.id]=foundShelterCaches.has(s.id)?[]:s.loot.filter(v=>v.count>0).map(v=>({icon:v.icon,name:v.name,key:v.name==='Консервы'?'food':v.name==='Аптечка'?'bandage':v.name==='Крепёж'?'bolts':'cleanWater',count:v.count}));if(s.id%7===0&&!foundShelterCaches.has(s.id)&&!supplyShelterContents[s.id].some(v=>v.key==='waterFilter'))supplyShelterContents[s.id].push({icon:'🧰',name:'Фильтр воды',key:'waterFilter',count:1});}
function save(){try{localStorage.setItem(STORE,JSON.stringify({...state,longCampaign:campaign,character:{...colors},lastSignalMission,starterKnifeSpawnVersion,spawnCampfireX:spawnCampfire.x,spawnCampfireY:spawnCampfire.y,spawnCampfireLevel,spawnCampfireUntil,activeInterior,interiorReturn,worldClock,generatorRepaired,generatorOnline,flashlight:!!saved.flashlight,starterKnife,wrecks:wrecks.map(v=>v.done),harvestedTrees:[...harvestedTrees],barricades,spikeTraps,foundCaches:[...foundCaches],discoveredLandmarks:[...discoveredLandmarks],visitedStores:[...visitedStores],storeLoot,lootedShelters:[...lootedShelters],shelterLoot,foundShelterCaches:[...foundShelterCaches],supplyShelterContents,buildingLoot,buildingFloors,interiorEvidence,homeFurnitureLoot,homeRestedDay,homeWorkbenchDay,homeRadioDay,supplyDrop,mapMarkers,activeWaypoint,bonusLives,bonusLivesActive,randomEventSites}));return true;}catch(_){return false;}}
function feedSpawnCampfire(){if(!nearSpawnCampfire())return false;if(state.wood<1){toast('Для костра нужно 1 дерево');return false;}state.wood--;spawnCampfireUntil=Math.max(Date.now(),spawnCampfireUntil)+180000;save();updateHud();toast('Костёр поддержан · +3 минуты защиты');return true;}
function upgradeSpawnCampfire(){if(!nearSpawnCampfire())return false;if(spawnCampfireLevel>=10){toast('Костёр достиг максимального уровня');return false;}const cost=spawnCampfireUpgradeCost();if(state.wood<cost){toast('Для улучшения нужно '+cost+' дерева');return false;}state.wood-=cost;spawnCampfireLevel++;save();updateHud();toast('Костёр улучшен · радиус защиты '+(30+(spawnCampfireLevel-1)*10)+' блоков');return true;}
function drawSpawnCampfire(){const x=spawnCampfire.x,y=spawnCampfire.y,active=spawnCampfireActive(),radius=spawnCampfireRadius(),left=spawnCampfireRemaining();ctx.save();if(active){const pulse=.96+Math.sin(time*.0025)*.025;ctx.fillStyle='#e68a3320';ctx.beginPath();ctx.arc(x,y,radius*pulse,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#f2b66b66';ctx.lineWidth=2;ctx.setLineDash([13,12]);ctx.beginPath();ctx.arc(x,y,radius*pulse,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}ctx.translate(x,y);ctx.fillStyle='#10140f9c';ctx.beginPath();ctx.ellipse(0,17,45,13,0,0,Math.PI*2);ctx.fill();for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.fillStyle=['#5d6254','#77705e','#454c42'][i%3];ctx.beginPath();ctx.ellipse(Math.cos(a)*25,Math.sin(a)*8+5,9,6,a,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#282f28';ctx.lineWidth=1.5;ctx.stroke();}ctx.lineCap='round';ctx.strokeStyle='#4a3020';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(-19,8);ctx.lineTo(18,-1);ctx.moveTo(-15,-2);ctx.lineTo(17,10);ctx.stroke();ctx.strokeStyle='#9a7044';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-19,7);ctx.lineTo(18,-2);ctx.moveTo(-15,-3);ctx.lineTo(17,9);ctx.stroke();if(active){const flicker=Math.sin(time*.018)*3;ctx.shadowColor='#ff7b28';ctx.shadowBlur=24;ctx.fillStyle='#f05b24';ctx.beginPath();ctx.moveTo(-13,8);ctx.quadraticCurveTo(-20,-13,-5,-27-flicker);ctx.quadraticCurveTo(-3,-15,1,-34-flicker);ctx.quadraticCurveTo(20,-12,12,8);ctx.closePath();ctx.fill();ctx.fillStyle='#ffb34f';ctx.beginPath();ctx.moveTo(-6,8);ctx.quadraticCurveTo(-8,-8,1,-20-flicker);ctx.quadraticCurveTo(13,-4,7,8);ctx.closePath();ctx.fill();ctx.fillStyle='#fff0ad';ctx.beginPath();ctx.ellipse(1,5,4,7,0,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}else{ctx.fillStyle='#282c27';ctx.beginPath();ctx.ellipse(0,3,12,5,0,0,Math.PI*2);ctx.fill();}ctx.restore();ctx.save();ctx.translate(x,y-64);ctx.fillStyle='#3b2b1d';ctx.fillRect(-54,-22,108,30);ctx.strokeStyle='#b18a55';ctx.lineWidth=2;ctx.strokeRect(-54,-22,108,30);ctx.fillStyle='#f0d5a0';ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.fillText('КОСТЁР · УР. '+spawnCampfireLevel,0,-10);ctx.fillStyle='#201b15';ctx.fillRect(-43,-3,86,6);const progress=active?Math.min(1,left/180000):0;ctx.fillStyle=active?'#f2a34c':'#6a5140';ctx.fillRect(-42,-2,84*progress,4);ctx.fillStyle='#f5dfb1';ctx.font='9px system-ui';ctx.fillText(active?Math.floor(left/60000)+':'+String(Math.floor(left/1000)%60).padStart(2,'0')+' · '+Math.round(30+(spawnCampfireLevel-1)*10)+' БЛОКОВ':'ПОТУХ · E — ДРОВА',0,20);ctx.restore();}
function resize(){dpr=Math.min(devicePixelRatio||1,isAndroidDevice?1.2:1.7);w=innerWidth;h=innerHeight;canvas.width=Math.floor(w*dpr);canvas.height=Math.floor(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)}
function rect(x,y,a,b,c){ctx.fillStyle=c;ctx.fillRect(x,y,a,b)}

const surfaceTextures=(()=>{
 let seed=0x7a11ce;
 const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 function tile(base,colors,count,strokes=false){
  const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
  g.fillStyle=base;g.fillRect(0,0,128,128);
  const detailCount=Math.round(count*1.32);
  for(let i=0;i<detailCount;i++){
   const x=rand()*128,y=rand()*128,r=.5+rand()*3.5;
   g.globalAlpha=.12+rand()*.24;g.fillStyle=colors[Math.floor(rand()*colors.length)];
   if(strokes){g.lineWidth=.6+rand()*1.4;g.beginPath();g.moveTo(x,y);g.lineTo(x+(rand()-.5)*18,y+(rand()-.5)*8);g.strokeStyle=g.fillStyle;g.stroke();}
   else{g.beginPath();g.ellipse(x,y,r,r*(.4+rand()),rand()*3,0,Math.PI*2);g.fill();}
  }
  // Fine grain, tiny chips and hairline wear make repeated surfaces less flat.
  for(let i=0;i<detailCount;i++){
   const x=rand()*128,y=rand()*128;
   g.globalAlpha=.08+rand()*.16;g.fillStyle=colors[Math.floor(rand()*colors.length)];
   g.fillRect(x,y,.6+rand()*1.4,.6+rand()*1.4);
   if(i%5===0){g.globalAlpha=.1;g.strokeStyle=colors[Math.floor(rand()*colors.length)];g.lineWidth=.45;g.beginPath();g.moveTo(x,y);g.lineTo(x+2+rand()*8,y+(rand()-.5)*2);g.stroke();}
  }
  g.globalAlpha=1;return ctx.createPattern(c,'repeat');
 }
 return {
  grass:tile('#657452',['#9aa477','#263e2d','#c0b78a','#465d39'],260,true),
  asphalt:tile('#424741',['#a3a18b','#1c2421','#6f7469','#b8a982'],300,true),
  concrete:tile('#77776a',['#d0c8aa','#333b35','#a3a18c'],220,false),
  plaster:tile('#77715f',['#b5a98a','#3b4138','#ddd0a9','#5d6755'],170,true),
  brick:tile('#665f51',['#b09b77','#282e29','#8a7761'],310,true),
  metal:tile('#4a514c',['#b2ad91','#222a27','#7f887a'],290,true),
  dirt:tile('#655c45',['#b39b68','#2f382c','#8b7954'],260,false),
  wood:tile('#5b4935',['#c0a477','#30271e','#8b6844','#d1b58a'],300,true),
  glass:tile('#53615d',['#d5e2d4','#172d32','#9bb7ae','#718e88'],230,true),
  rust:tile('#59463a',['#bd754b','#352c27','#8f5139','#d19a65'],320,true),
  roof:tile('#444941',['#85816c','#242c28','#a29a7a'],260,true),
  gravel:tile('#625f54',['#b7aa8a','#343a34','#8a8978','#4b5149'],300,false)
 };
})();
const grassDetailPattern=(()=>{const tile=document.createElement('canvas');tile.width=tile.height=736;const g=tile.getContext('2d');for(let gy=0;gy<736;gy+=36)for(let gx=0;gx<736;gx+=36){const n=Math.abs(Math.sin(gx*12.989+gy*78.233)*43758.5453)%1;g.strokeStyle=n>.5?'#a2a47a99':'#293e2e99';g.lineWidth=.9;g.beginPath();g.moveTo(gx+n*25,gy+14);g.lineTo(gx+n*25+2,gy+5+n*7);g.stroke();if(n>.72){g.fillStyle='#b5a77b66';g.fillRect(gx+n*21,gy+n*17,2,1);}}return ctx.createPattern(tile,'repeat');})();

function toast(t){let e=document.getElementById('toast');e.textContent=t;e.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove('show'),1800)}
function dayWind(){const cycle=(state.day*37)%100;wind=cycle<30?.12:cycle<65?.42:.78;windName=wind<.25?'тихий':wind<.6?'умеренный':'сильный';document.getElementById('weather').textContent='Ветер · '+windName;}
function ground(){
 rect(-w/2-700,-h/2-700,w+1400,h+1400,'#657452');
 ctx.save();ctx.globalAlpha=.68;ctx.fillStyle=surfaceTextures.grass;ctx.fillRect(-w/2-700,-h/2-700,w+1400,h+1400);ctx.restore();
 ctx.save();ctx.globalAlpha=.72;ctx.fillStyle=grassDetailPattern;ctx.fillRect(-w/2-700,-h/2-700,w+1400,h+1400);ctx.restore();
 // A subtle uniform base tint prevents distant ground from looking darker than the spawn area.
 ctx.save();ctx.globalAlpha=.38;ctx.fillStyle='#657452';ctx.fillRect(-w/2-700,-h/2-700,w+1400,h+1400);ctx.restore();
 const roads=[-8000,-4500,-1000,600,4100,7600,10000,13500,17000,20500];
 for(const y of roads){
  rect(WORLD_MIN,y-70,WORLD_MAX-WORLD_MIN,140,'#77776a');ctx.save();ctx.globalAlpha=.28;ctx.fillStyle=surfaceTextures.concrete;ctx.fillRect(WORLD_MIN,y-70,WORLD_MAX-WORLD_MIN,140);ctx.restore();
  rect(WORLD_MIN,y-62,WORLD_MAX-WORLD_MIN,124,'#424741');ctx.save();ctx.globalAlpha=.72;ctx.fillStyle=surfaceTextures.asphalt;ctx.fillRect(WORLD_MIN,y-62,WORLD_MAX-WORLD_MIN,124);ctx.restore();
  rect(WORLD_MIN,y-66,WORLD_MAX-WORLD_MIN,4,'#b5ae91');rect(WORLD_MIN,y+62,WORLD_MAX-WORLD_MIN,4,'#242b27');
  const roadStart=Math.max(WORLD_MIN,Math.floor((state.x-w-180)/150)*150),roadEnd=Math.min(WORLD_MAX,state.x+w+180);
  for(let x=roadStart+30;x<roadEnd;x+=150)rect(x,y-2,66,4,'#b6a87b88');
  for(let x=roadStart+90;x<roadEnd;x+=300){rect(x,y-70,2,8,'#d5d0b4');rect(x+145,y+62,2,8,'#d5d0b455');}
 }
 for(const x of [-8000,-4500,-1000,2700,6200,9700,10000,13500,17000,20500]){
  rect(x-66,WORLD_MIN,132,WORLD_MAX-WORLD_MIN,'#77776a');ctx.save();ctx.globalAlpha=.28;ctx.fillStyle=surfaceTextures.concrete;ctx.fillRect(x-66,WORLD_MIN,132,WORLD_MAX-WORLD_MIN);ctx.restore();
  rect(x-58,WORLD_MIN,116,WORLD_MAX-WORLD_MIN,'#484b43');ctx.save();ctx.globalAlpha=.72;ctx.fillStyle=surfaceTextures.asphalt;ctx.fillRect(x-58,WORLD_MIN,116,WORLD_MAX-WORLD_MIN);ctx.restore();
  rect(x-62,WORLD_MIN,4,WORLD_MAX-WORLD_MIN,'#b5ae91');rect(x+58,WORLD_MIN,4,WORLD_MAX-WORLD_MIN,'#242b27');
  const roadStart=Math.max(WORLD_MIN,Math.floor((state.y-h-180)/150)*150),roadEnd=Math.min(WORLD_MAX,state.y+h+180);for(let y=roadStart+30;y<roadEnd;y+=150)rect(x-2,y,4,66,'#c0b18a66');
 }
 for(let i=0;i<420;i++){const x=(i*397)%11950,y=(i*613)%11950;if(i%3===0){ctx.save();ctx.globalAlpha=.35;ctx.fillStyle=surfaceTextures.dirt;ctx.fillRect(x,y,14+i%11,8+i%7);ctx.restore();rect(x+3,y+2,3+i%5,2+i%3,'#303a3188');}}
}
function tree(t){
 const sway=Math.sin(time*.0011*(1+wind)+t.phase)*wind*.13,scale=t.size;
 ctx.save();ctx.translate(t.x,t.y);ctx.scale(scale,scale);
 ctx.fillStyle='#171d18a8';ctx.beginPath();ctx.ellipse(1,12,19,7,0,0,Math.PI*2);ctx.fill();
 const trunk=ctx.createLinearGradient(-7,0,8,0);trunk.addColorStop(0,'#332b20');trunk.addColorStop(.32,'#70583b');trunk.addColorStop(.68,'#59452f');trunk.addColorStop(1,'#2e3025');
 ctx.fillStyle=trunk;ctx.beginPath();ctx.moveTo(-6,13);ctx.lineTo(-5,-37);ctx.quadraticCurveTo(0,-43,5,-37);ctx.lineTo(7,13);ctx.closePath();ctx.fill();
 ctx.strokeStyle='#a18458';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(-2,7);ctx.lineTo(-1,-30);ctx.moveTo(3,3);ctx.lineTo(2,-20);ctx.stroke();
 for(let b=0;b<3;b++){ctx.strokeStyle='#382f22';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo((b-1)*3,-9);ctx.lineTo((b-1)*2,-18);ctx.stroke();}
 ctx.translate(0,-30);ctx.rotate(sway);
 const layers=[{y:-38,w:25,h:38,c:'#263c2d',hi:'#66814a'},{y:-22,w:31,h:39,c:'#304b33',hi:'#789252'},{y:-5,w:36,h:34,c:'#3b5838',hi:'#91a45e'}];
 for(let j=0;j<layers.length;j++){
  const L=layers[j],g=ctx.createLinearGradient(-L.w,L.y,L.w,L.y+L.h);g.addColorStop(0,L.c);g.addColorStop(.52,j===2?'#536f40':'#45643b');g.addColorStop(1,'#1e3528');
  ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(0,L.y-L.h*.28);ctx.bezierCurveTo(-L.w*.75,L.y-L.h*.08,-L.w*.95,L.y+L.h*.5,0,L.y+L.h);ctx.bezierCurveTo(L.w*.95,L.y+L.h*.5,L.w*.75,L.y-L.h*.08,0,L.y-L.h*.28);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#17291f';ctx.lineWidth=1.5;ctx.stroke();
  ctx.strokeStyle='#a2b47777';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,L.y-17);ctx.quadraticCurveTo(-L.w*.18,L.y+4,-L.w*.12,L.y+L.h*.55);ctx.moveTo(2,L.y-9);ctx.quadraticCurveTo(L.w*.22,L.y+6,L.w*.18,L.y+L.h*.48);ctx.stroke();
  for(let n=0;n<5;n++){const px=Math.sin(t.phase*3+n*8+j*2)*L.w*.58,py=L.y+6+(n*11)%Math.max(12,L.h-5);ctx.fillStyle=n%2?L.hi:'#b2bd7188';ctx.globalAlpha=.42+(n%3)*.12;ctx.beginPath();ctx.ellipse(px,py,3.8,2.1,n*.35,0,Math.PI*2);ctx.fill();}
  ctx.globalAlpha=1;
 }
 ctx.restore();
}
function pole(x,y){rect(x-4,y-58,8,66,'#51483a');rect(x-24,y-57,48,5,'#655a48');ctx.strokeStyle='#252c28';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-24,y-55);ctx.quadraticCurveTo(x,y-24,x+24,y-55);ctx.stroke();ctx.fillStyle='#d1b989';ctx.fillRect(x-3,y-60,6,5)}
function car(x,y,scale=1,angle=0){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(scale,scale);ctx.fillStyle='#171c1b88';ctx.fillRect(-49,18,104,14);ctx.fillStyle='#171d1b';ctx.fillRect(-42,12,19,12);ctx.fillRect(24,12,19,12);ctx.fillStyle='#535b54';ctx.fillRect(-47,-7,94,27);ctx.save();ctx.globalAlpha=.3;ctx.fillStyle=surfaceTextures.metal;ctx.fillRect(-46,-6,92,25);ctx.restore();ctx.fillStyle='#343b38';ctx.fillRect(-27,-25,55,22);ctx.fillStyle='#7b8076';ctx.fillRect(-24,-22,19,16);ctx.fillStyle='#303833';ctx.fillRect(1,-22,20,16);ctx.fillStyle='#202522';ctx.fillRect(-34,13,18,11);ctx.fillRect(24,13,18,11);ctx.fillStyle='#98714f';ctx.fillRect(-51,-12,23,8);ctx.strokeStyle='#222a26';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-44,-7);ctx.lineTo(-23,-25);ctx.lineTo(-8,-7);ctx.stroke();ctx.fillStyle='#b5c1b5aa';ctx.fillRect(-11,-29,28,5);ctx.fillStyle='#a7a18a';ctx.fillRect(31,-8,14,4);ctx.fillStyle='#7b4937';ctx.globalAlpha=.8;ctx.fillRect(-39,5,13,3);ctx.fillRect(23,-3,16,2);ctx.globalAlpha=1;ctx.strokeStyle='#c1b18a66';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-18,-5);ctx.lineTo(-7,2);ctx.lineTo(8,-3);ctx.stroke();ctx.fillStyle='#c6b991';ctx.fillRect(-46,-4,6,4);ctx.fillRect(40,-4,6,4);ctx.fillStyle='#252a26';ctx.fillRect(-18,0,31,4);ctx.strokeStyle='#b5a47b88';ctx.lineWidth=1;ctx.strokeRect(-47,-7,94,27);ctx.strokeStyle='#252d2a';ctx.beginPath();ctx.moveTo(-20,-21);ctx.lineTo(-8,-10);ctx.lineTo(-2,-17);ctx.stroke();ctx.fillStyle='#594b37';ctx.fillRect(17,8,18,3);
 ctx.save();ctx.globalAlpha=.5;ctx.strokeStyle='#c2ad7d';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-39,-3);ctx.lineTo(-30,1);ctx.moveTo(8,-4);ctx.lineTo(19,1);ctx.moveTo(-6,12);ctx.lineTo(11,14);ctx.stroke();ctx.globalAlpha=.35;ctx.fillStyle='#8c563a';ctx.fillRect(-43,7,13,3);ctx.fillRect(25,-2,12,3);ctx.globalAlpha=.45;ctx.fillStyle='#d9e0d1';ctx.fillRect(-21,-20,5,12);ctx.fillRect(5,-20,4,11);ctx.restore();ctx.restore()}
function building(b){
 const wall=b.accent||'#706c5a',floorH=34,top=b.y-b.floors*floorH,facadeTexture=surfaceTextures[b.texture]||surfaceTextures.plaster;
 ctx.fillStyle='#1c211c99';ctx.fillRect(b.x-18,b.y+b.h-8,b.w+36,22);
 // Deep side wall and front facade create visible height.
 rect(b.x+b.w-18,top+8,18,b.h+b.floors*floorH-8,'#343a34');
 rect(b.x,top,b.w,b.h+b.floors*floorH,wall);
 rect(b.x+8,top+8,b.w-16,b.h+b.floors*floorH-16,wall);ctx.save();ctx.globalAlpha=.42;ctx.fillStyle=facadeTexture;ctx.fillRect(b.x+8,top+8,b.w-16,b.h+b.floors*floorH-16);ctx.globalAlpha=(b.id==='factory'||b.id==='warehouse'||b.texture==='brick')?.34:.16;ctx.fillStyle=(b.id==='factory'||b.id==='warehouse'||b.texture==='brick')?surfaceTextures.brick:surfaceTextures.concrete;ctx.fillRect(b.x+8,top+8,b.w-16,b.h+b.floors*floorH-16);ctx.restore();
 // Deterministic chips, damp streaks and exposed masonry across the facade.
 ctx.save();for(let i=0;i<Math.floor(b.w/34);i++){const fx=b.x+18+(i*47%(b.w-36)),fy=top+18+(i*71%(b.h+b.floors*floorH-36));ctx.globalAlpha=.18+(i%3)*.06;ctx.fillStyle=i%2?'#252c27':'#c0a77b';ctx.fillRect(fx,fy,3+i%5,2+i%3);if(i%4===0){ctx.strokeStyle='#272d28';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(fx,fy);ctx.lineTo(fx+4,fy+9);ctx.lineTo(fx+1,fy+15);ctx.stroke();}if(i%5===0){ctx.fillStyle='#76513b';ctx.globalAlpha=.28;ctx.fillRect(fx+8,fy+2,2,14);}}ctx.restore();
 // Concrete corner columns, grime streaks and weathered facade seams.
 for(let sx=0;sx<2;sx++){rect(b.x+10+sx*(b.w-24),top+8,7,b.h+b.floors*floorH-16,'#4b5148aa');}
 for(let grime=0;grime<Math.floor(b.w/65);grime++){const gx=b.x+24+grime*61;ctx.globalAlpha=.18;rect(gx,top+12,3,Math.min(90,b.h+b.floors*floorH-24),'#242a25');}ctx.globalAlpha=1;
 for(let floor=0;floor<b.floors;floor++){
  const fy=top+16+floor*floorH;
  rect(b.x+8,fy+floorH-4,b.w-16,3,'#393f37');
  const cols=Math.max(3,Math.floor((b.w-44)/54));
  for(let c=0;c<cols;c++){
   const wx=b.x+22+c*((b.w-44)/cols),lit=((floor*7+c*3+b.x)%5===0);
   rect(wx,fy,25,22,lit?'#b1a17b':'#263a3a');
   rect(wx+3,fy+3,19,15,lit?'#8c8568':'#182a2b');
   rect(wx+4,fy+4,7,13,lit?'#d0c39a55':'#83a3a055');rect(wx+12,fy,2,22,'#555a50');
   rect(wx-2,fy-2,29,3,'#a49a7d');rect(wx-2,fy+22,29,3,'#343a33');
   if(floor%2===0){rect(wx-3,fy+23,31,3,'#3a4038');rect(wx-3,fy+26,31,3,'#a39a7c');}
   if((floor+c+Math.floor(b.x/100))%9===0){ctx.strokeStyle='#1b2827';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(wx+5,fy+5);ctx.lineTo(wx+11,fy+10);ctx.lineTo(wx+8,fy+16);ctx.stroke();}
   if((floor*3+c+Math.floor(b.y/100))%7===0){ctx.fillStyle='#272f2a88';ctx.fillRect(wx+18,fy+5,2,12);}
   const wear=(floor*11+c*7+Math.floor(b.x/90)+Math.floor(b.y/70))%13;
   if(wear===0){ctx.strokeStyle='#182321';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(wx+4,fy+4);ctx.lineTo(wx+10,fy+10);ctx.lineTo(wx+7,fy+18);ctx.stroke();ctx.fillStyle='#192522';ctx.fillRect(wx+12,fy+3,8,17);}
   else if(wear===3){ctx.fillStyle='#4b4939';ctx.fillRect(wx-2,fy+7,29,5);ctx.fillStyle='#947c58';ctx.fillRect(wx-1,fy+9,27,2);}
   if(wear===6){ctx.fillStyle='#4a3b30';ctx.fillRect(wx+2,fy+23,5,10);ctx.fillRect(wx+17,fy+23,5,10);}
  }
  if(b.id==='hospital'&&floor===Math.floor(b.floors/2)){rect(b.x+b.w/2-20,fy+2,40,18,'#b9b8a2');rect(b.x+b.w/2-3,fy+4,6,14,'#a84b43');rect(b.x+b.w/2-12,fy+8,24,5,'#a84b43');}
 }
 // Clearly visible, walkable ground-floor entrance and a small lobby.
 const cx=b.x+b.w/2,bottom=b.y+b.h,lobbyW=62,lobbyTop=bottom-126;
 rect(cx-lobbyW,lobbyTop,lobbyW*2,112,'#555746');
 for(let yy=lobbyTop+8;yy<bottom-20;yy+=22)for(let xx=cx-lobbyW+8;xx<cx+lobbyW-8;xx+=22)rect(xx,yy,18,18,'#696b55');
 rect(cx-42,bottom-58,84,58,'#111915');
 rect(cx-48,bottom-64,8,64,'#343b33');rect(cx+40,bottom-64,8,64,'#343b33');
 rect(cx-37,bottom-52,74,46,'#202a24');rect(cx-3,bottom-50,6,43,'#8c7954');
 rect(cx-24,lobbyTop+18,48,24,'#353d34');rect(cx-20,lobbyTop+22,40,16,'#817d62');
 rect(cx-7,lobbyTop+25,14,10,'#a59a78');
 // Entrance canopy, rooftop equipment and water tank.
 rect(cx-52,bottom-72,104,8,'#42483e');rect(b.x+18,top-10,b.w-36,12,'#42483e');
 rect(b.x+b.w*.68,top-38,34,28,'#555a4d');
 ctx.save();ctx.globalAlpha=.32;ctx.fillStyle=surfaceTextures.roof;ctx.fillRect(b.x+12,top-8,b.w-24,Math.max(5,b.h*.16));ctx.restore();
 for(let unit=0;unit<Math.max(1,Math.floor(b.w/190));unit++){const ux=b.x+34+unit*150;rect(ux,top-22,38,13,'#353d37');rect(ux+4,top-27,30,6,'#7c806e');rect(ux+7,top-20,24,3,'#202823');}
 rect(b.x+b.w*.22,top-30,7,30,'#393f39');rect(b.x+b.w*.22-12,top-30,31,5,'#303934');
 ctx.strokeStyle='#b2a17a88';ctx.lineWidth=2;ctx.beginPath();
 ctx.moveTo(b.x,top);ctx.lineTo(b.x+b.w,top);ctx.lineTo(b.x+b.w,bottom);ctx.moveTo(b.x,bottom);ctx.lineTo(cx-47,bottom);ctx.moveTo(cx+47,bottom);ctx.lineTo(b.x+b.w,bottom);ctx.lineTo(b.x,top);ctx.stroke();
}
function drawSupplyCrate(x,y,scale=1,variant='field',opened=false){
 const palettes={field:['#3d4938','#7d7959','#b7a06b','#242d27','#d1bd8d'],medical:['#4b554b','#c7c5ad','#e0d8b8','#303b35','#a94d43'],military:['#303b3b','#68736a','#a99a72','#1d2828','#d0bd91']};
 const p=palettes[variant]||palettes.field,pulse=.5+.5*Math.sin(time*.004+x*.013);
 ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
 ctx.fillStyle='#080d0b88';ctx.beginPath();ctx.ellipse(0,22,39,10,0,0,Math.PI*2);ctx.fill();
 const side=ctx.createLinearGradient(-31,-12,34,24);side.addColorStop(0,p[0]);side.addColorStop(.55,p[1]);side.addColorStop(1,p[3]);
 ctx.fillStyle=side;ctx.beginPath();ctx.moveTo(-34,-13);ctx.lineTo(28,-13);ctx.lineTo(35,-5);ctx.lineTo(35,20);ctx.lineTo(-29,20);ctx.lineTo(-35,13);ctx.closePath();ctx.fill();
 ctx.fillStyle=p[1];ctx.fillRect(-30,-9,60,26);
 for(let i=0;i<4;i++){const yy=-7+i*6;ctx.fillStyle=i%2?'#252e27':'#d1bd8d22';ctx.fillRect(-28,yy,56,2);}
 ctx.fillStyle=p[3];ctx.fillRect(-35,12,70,8);ctx.fillStyle=p[2];ctx.fillRect(-33,12,66,2);
 ctx.fillStyle='#202925';ctx.fillRect(-34,-13,7,33);ctx.fillRect(27,-13,7,33);ctx.fillStyle=p[2];ctx.fillRect(-33,-12,3,29);ctx.fillRect(30,-12,3,29);
 for(const xx of [-29,29])for(const yy of [-7,4,15]){ctx.fillStyle='#e0d1a3';ctx.beginPath();ctx.arc(xx,yy,1.4,0,Math.PI*2);ctx.fill();}
 ctx.fillStyle='#252d29';ctx.fillRect(-6,-12,12,34);ctx.fillStyle=p[2];ctx.fillRect(-2,-10,4,28);
 if(opened){
  ctx.fillStyle='#111915';ctx.fillRect(-27,-17,54,7);ctx.save();ctx.translate(0,-16);ctx.rotate(-.2);ctx.fillStyle=p[0];ctx.fillRect(-34,-13,68,12);ctx.fillStyle=p[2];ctx.fillRect(-32,-12,64,3);ctx.fillStyle='#202a25';ctx.fillRect(-29,-3,58,3);ctx.restore();
  ctx.fillStyle='#c7a66b';ctx.globalAlpha=.2+.13*pulse;ctx.fillRect(-22,-9,44,18);ctx.globalAlpha=1;
 }else{
  const lid=ctx.createLinearGradient(0,-27,0,-8);lid.addColorStop(0,p[2]);lid.addColorStop(.35,p[1]);lid.addColorStop(1,p[0]);ctx.fillStyle=lid;
  ctx.beginPath();ctx.moveTo(-36,-17);ctx.lineTo(-27,-27);ctx.lineTo(28,-27);ctx.lineTo(36,-17);ctx.lineTo(30,-9);ctx.lineTo(-31,-9);ctx.closePath();ctx.fill();ctx.strokeStyle='#202923';ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle=p[2];ctx.fillRect(-30,-24,60,3);ctx.fillStyle='#242d27';ctx.fillRect(-7,-19,14,8);
 }
 ctx.fillStyle=p[4];ctx.font='bold 7px system-ui';ctx.textAlign='center';ctx.fillText(variant==='medical'?'MED':variant==='military'?'MIL':'SUPPLY',0,8);
 ctx.fillStyle=variant==='medical'?'#b84e43':'#d1b56e';ctx.fillRect(-10,18,20,3);ctx.strokeStyle='#171f1a';ctx.lineWidth=1.5;ctx.strokeRect(-35,-13,70,33);
 ctx.restore();
}
function drawBuildingInterior(b){
 const top=b.y-b.floors*34,cx=b.x+b.w/2,roomY=b.y+b.h-250;
 if(!b.role)return;
 ctx.save();
 ctx.fillStyle='#171b17';ctx.globalAlpha=.78;ctx.fillRect(b.x+18,roomY,b.w-36,150);ctx.globalAlpha=1;
 ctx.strokeStyle='#9a8d69';ctx.lineWidth=2;ctx.strokeRect(b.x+18,roomY,b.w-36,150);
 // Broken floor tiles, stains and scattered debris make the interior read as a physical room.
 for(let i=0;i<14;i++){const px=b.x+28+(i*47)%(b.w-58),py=roomY+12+(i*31)%122;ctx.fillStyle=i%3?'#77735d55':'#252b25aa';ctx.fillRect(px,py,18,3);if(i%4===0){ctx.strokeStyle='#292f29';ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+9,py+11);ctx.stroke();}}
 if(b.role==='generator'){
  const gx=generatorConsole.x,gy=generatorConsole.y;
  ctx.fillStyle='#252d28';ctx.fillRect(gx-48,gy-31,96,61);ctx.fillStyle='#59645a';ctx.fillRect(gx-43,gy-27,86,52);ctx.fillStyle='#252d29';ctx.fillRect(gx-34,gy-21,42,27);ctx.fillStyle=generatorOnline?'#9be58b':'#a34e40';ctx.shadowColor=generatorOnline?'#8be69a':'#a34e40';ctx.shadowBlur=generatorOnline?16:3;ctx.fillRect(gx-27,gy-15,8,8);ctx.shadowBlur=0;ctx.fillStyle='#b6a77d';ctx.fillRect(gx-12,gy-17,14,3);ctx.fillRect(gx-12,gy-10,14,3);ctx.fillStyle='#303a34';ctx.fillRect(gx+14,gy-21,24,43);ctx.strokeStyle='#b69a69';ctx.lineWidth=2;ctx.beginPath();ctx.arc(gx+26,gy,13,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#1d2521';ctx.fillRect(gx+22,gy-5,8,10);
  for(let i=0;i<4;i++){ctx.strokeStyle=i%2?'#8c7650':'#536d62';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(b.x+48+i*22,roomY+30);ctx.lineTo(b.x+48+i*22,roomY+8);ctx.lineTo(gx-44,gy-12+i*8);ctx.stroke();}
  ctx.fillStyle='#3a423a';ctx.fillRect(b.x+42,roomY+112,b.w-84,15);ctx.fillStyle='#a18b60';ctx.fillRect(b.x+48,roomY+108,54,5);ctx.fillStyle='#d8c18a';ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillText(generatorRepaired?(generatorOnline?'ЭНЕРГОСЕТЬ · ВКЛЮЧЕНА':'ЭНЕРГОСЕТЬ · ОТКЛЮЧЕНА'):'E · РЕМОНТ ГЕНЕРАТОРА',cx,roomY-8);
 }else if(b.role==='store'){
  ctx.fillStyle='#393e34';for(let row=0;row<2;row++){const sy=roomY+24+row*58;ctx.fillRect(b.x+42,sy,b.w-84,15);ctx.fillStyle='#8a8062';for(let x=b.x+48;x<b.x+b.w-50;x+=32){ctx.fillRect(x,sy-7,18,7);ctx.fillStyle='#5c6750';ctx.fillRect(x,sy+2,18,9);ctx.fillStyle='#8a8062';}}
  ctx.fillStyle='#665d4b';ctx.fillRect(b.x+34,roomY+118,64,23);ctx.fillStyle='#a18a60';ctx.fillRect(b.x+38,roomY+121,56,5);
  // Abandoned shoppers and staff, lying among overturned stock and broken fixtures.
  for(const corpse of [[b.x+b.w*.27,roomY+91,-.3],[b.x+b.w*.72,roomY+108,.7]]){
   ctx.save();ctx.translate(corpse[0],corpse[1]);ctx.rotate(corpse[2]);ctx.fillStyle='#20201d';ctx.beginPath();ctx.ellipse(0,0,19,8,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#77715f';ctx.fillRect(-15,-5,23,10);ctx.fillStyle='#b49a79';ctx.beginPath();ctx.arc(12,0,6,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  ctx.fillStyle='#d8c18a';ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillText(b.kind==='weapons'?'ОРУЖИЕ':b.kind==='pharmacy'?'АПТЕКА':b.kind==='hardware'?'ХОЗТОВАРЫ':'МАРКЕТ',cx,roomY-8);
 }else if(b.role==='loot'){
  const floor=buildingFloors[b.id]||1,entry=buildingLoot[b.id]?.[floor-1],lootX=cx-b.w*.22,lootY=roomY+78,stairX=cx+b.w*.29,stairY=roomY+78;
  ctx.fillStyle=b.kind==='water'?'#354d4d':b.kind==='school'?'#554a3b':b.kind==='bank'?'#4c504d':b.kind==='garage'?'#414b43':b.kind==='lab'?'#495552':'#514633';ctx.fillRect(b.x+30,roomY+18,b.w-60,112);
  for(let row=0;row<2;row++){ctx.fillStyle=row?'#77745f':'#393f38';ctx.fillRect(b.x+45,roomY+30+row*48,b.w-90,12);for(let x=b.x+54;x<b.x+b.w-55;x+=38){ctx.fillStyle=['#8a8062','#586b5d','#a18d68'][Math.abs(Math.floor((x+b.x+row)%3))];ctx.fillRect(x,roomY+22+row*48,22,8);}}
  drawSupplyCrate(lootX,lootY,1.22,b.kind==='lab'||b.kind==='bunker'?'military':b.kind==='pharmacy'?'medical':'field',!!entry?.picked);
  if(entry?.weaponDrop&&!entry.weaponPicked){ctx.save();ctx.translate(lootX+70,lootY+12);ctx.rotate(-.22);ctx.fillStyle='#1d2420';ctx.fillRect(-18,-3,34,6);ctx.fillStyle=entry.weaponDrop==='rifle'?'#303a33':'#697568';ctx.fillRect(-8,-6,15,3);ctx.fillStyle='#171c19';ctx.fillRect(-12,2,7,9);ctx.fillStyle='#c2bda7';ctx.fillRect(13,-2,4,2);ctx.restore();ctx.fillStyle='#f0d49a';ctx.font='bold 9px system-ui';ctx.textAlign='center';ctx.fillText(entry.weaponDrop==='pistol'?'ПИСТОЛЕТ':entry.weaponDrop==='shotgun'?'ДРОБОВИК':'ВИНТОВКА',lootX+70,lootY-7);}
  ctx.fillStyle=entry&&!entry.picked?'#f0d49a':'#9b9b87';ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.fillText(entry&&!entry.picked?'E · ОБЫСКАТЬ':'ЯЩИК ПУСТ',lootX,lootY-26);
  ctx.fillStyle='#4c493d';ctx.fillRect(stairX-18,stairY-28,36,56);for(let i=0;i<5;i++){ctx.fillStyle=i%2?'#a08a60':'#6f654c';ctx.fillRect(stairX-17+i*7,stairY-25+i*10,34-i*4,5);}ctx.fillStyle='#e4d19b';ctx.font='bold 10px system-ui';ctx.fillText('ЛЕСТНИЦА · '+floor+'/'+b.floors,stairX,stairY+42);
  ctx.fillStyle='#d8c18a';ctx.font='bold 12px system-ui';ctx.fillText((b.kind==='water'?'ВОДООЧИСТКА':b.kind==='school'?'ШКОЛА':b.kind==='bank'?'БАНК':b.kind==='garage'?'АВТОМАСТЕРСКАЯ':b.kind==='lab'?'ИССЛЕДОВАТЕЛЬСКИЙ ЦЕНТР':b.kind==='bunker'?'ВОЕННЫЙ БУНКЕР':b.kind==='station'?'ЖЕЛЕЗНОДОРОЖНАЯ СТАНЦИЯ':b.kind==='greenhouse'?'РАЗРУШЕННАЯ ТЕПЛИЦА':b.kind==='prison'?'КАРАНТИННАЯ ТЮРЬМА':b.kind==='port'?'ПОРТОВЫЙ ТЕРМИНАЛ':b.kind==='quarry'?'КАМЕНОЛОМ':'ИССЛЕДОВАТЕЛЬСКИЙ ЦЕНТР')+' · ЭТАЖ '+floor,cx,roomY-8);
 }else{
  // Shelter bunks, sandbags, a radio desk and sleeping survivors.
  for(let i=0;i<3;i++){const bx=b.x+42+i*92;ctx.fillStyle='#4a5145';ctx.fillRect(bx,roomY+30,72,26);ctx.fillStyle='#9b9275';ctx.fillRect(bx+5,roomY+34,28,17);ctx.fillStyle='#353c34';ctx.fillRect(bx,roomY+55,72,5);}
  for(let i=0;i<5;i++){ctx.fillStyle=i%2?'#756b50':'#8b8060';ctx.fillRect(b.x+32+i*25,roomY+119,24,15);ctx.strokeStyle='#353b32';ctx.strokeRect(b.x+32+i*25,roomY+119,24,15);}
  ctx.fillStyle='#a7b08a';ctx.fillRect(cx+55,roomY+82,38,22);ctx.fillStyle='#2d3830';ctx.fillRect(cx+62,roomY+87,24,12);
  ctx.fillStyle='#d8c18a';ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillText('УБЕЖИЩЕ ВЫЖИВШИХ',cx,roomY-8);ctx.fillStyle='#e2c78e';ctx.font='bold 10px system-ui';ctx.fillText(lootedShelters.has(b.id)?'ЗАПАСЫ ПУСТЫ':'E · ПРИПАСЫ',cx+72,roomY+72);
  for(const corpse of [[b.x+b.w*.24,roomY+96],[b.x+b.w*.78,roomY+92]]){ctx.fillStyle='#262722';ctx.beginPath();ctx.ellipse(corpse[0],corpse[1],18,7,.2,0,Math.PI*2);ctx.fill();ctx.fillStyle='#9a8a70';ctx.beginPath();ctx.arc(corpse[0]+13,corpse[1],5,0,Math.PI*2);ctx.fill();}
 }
 const loot=storeLoot[b.id];
 if(b.role==='store'&&loot?.weapon&&!loot.picked){const lx=cx-72,ly=roomY+76;ctx.save();ctx.translate(lx,ly);ctx.rotate(-.18);ctx.fillStyle='#171a17';ctx.fillRect(-18,-4,35,8);ctx.fillStyle='#9c8b65';ctx.fillRect(-5,-8,12,4);ctx.fillStyle='#c9b17b';ctx.fillRect(-15,4,7,3);ctx.restore();ctx.fillStyle='#e4d19b';ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.fillText('E · ОРУЖИЕ',lx,ly-17);}
 ctx.restore();
}
function drawWorldProp(p){
 const x=p.x,y=p.y;ctx.save();ctx.translate(x,y);
 ctx.fillStyle='#151a16a8';ctx.beginPath();ctx.ellipse(0,p.h*.35,p.w*.58,9,0,0,Math.PI*2);ctx.fill();
 if(p.type==='crash_site'){
  const pulse=.5+.5*Math.sin(time*.009);
  const shadow=ctx.createRadialGradient(0,34,8,0,34,118);shadow.addColorStop(0,'#080d0bcc');shadow.addColorStop(1,'#080d0b00');ctx.fillStyle=shadow;ctx.beginPath();ctx.ellipse(0,34,118,55,0,0,Math.PI*2);ctx.fill();
  // Torn fuselage, exposed frame and broken tail boom.
  ctx.save();ctx.rotate(-.16);
  ctx.fillStyle='#252f2b';ctx.beginPath();ctx.moveTo(-72,-15);ctx.quadraticCurveTo(-54,-42,8,-35);ctx.lineTo(56,-18);ctx.lineTo(72,2);ctx.lineTo(45,25);ctx.lineTo(-48,23);ctx.lineTo(-78,7);ctx.closePath();ctx.fill();
  const metal=ctx.createLinearGradient(-55,-30,50,28);metal.addColorStop(0,'#a2a18a');metal.addColorStop(.35,'#59665a');metal.addColorStop(.72,'#303b35');metal.addColorStop(1,'#151d1a');ctx.fillStyle=metal;ctx.beginPath();ctx.moveTo(-58,-22);ctx.quadraticCurveTo(-30,-43,17,-30);ctx.lineTo(52,-14);ctx.lineTo(61,7);ctx.lineTo(38,21);ctx.lineTo(-50,17);ctx.lineTo(-68,3);ctx.closePath();ctx.fill();
  ctx.fillStyle='#172b30';ctx.beginPath();ctx.moveTo(-36,-25);ctx.lineTo(-8,-31);ctx.lineTo(8,-10);ctx.lineTo(-27,-8);ctx.closePath();ctx.fill();ctx.fillStyle='#263b40';ctx.beginPath();ctx.moveTo(1,-29);ctx.lineTo(26,-22);ctx.lineTo(39,-5);ctx.lineTo(11,-8);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#d0b77b';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-62,-11);ctx.lineTo(-44,-4);ctx.lineTo(-53,12);ctx.moveTo(39,-17);ctx.lineTo(53,-2);ctx.stroke();
  ctx.fillStyle='#9b4d35';ctx.beginPath();ctx.moveTo(-58,6);ctx.lineTo(-73,18);ctx.lineTo(-42,18);ctx.fill();ctx.fillStyle='#c2b18b';ctx.fillRect(-19,18,36,4);
  // Broken tail and rotor assembly.
  ctx.fillStyle='#404a40';ctx.beginPath();ctx.moveTo(50,-6);ctx.lineTo(91,-32);ctx.lineTo(101,-27);ctx.lineTo(69,5);ctx.closePath();ctx.fill();ctx.strokeStyle='#a3a18a';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(91,-30);ctx.lineTo(110,-48);ctx.moveTo(91,-30);ctx.lineTo(117,-20);ctx.stroke();
  ctx.fillStyle='#1a211d';ctx.beginPath();ctx.arc(-2,-37,6,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#8b927c';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-4,-39);ctx.lineTo(-80,-58);ctx.moveTo(-4,-39);ctx.lineTo(77,-69);ctx.stroke();ctx.restore();
  // Burning fuel beneath the wreck.
  for(let i=0;i<4;i++){const fx=-38+i*23,fh=17+Math.sin(time*.012+i*2)*8;const flame=ctx.createLinearGradient(fx,18,fx,18-fh);flame.addColorStop(0,'#b43c20');flame.addColorStop(.55,'#ef8a32');flame.addColorStop(1,'#ffe3a0');ctx.fillStyle=flame;ctx.beginPath();ctx.moveTo(fx-7,22);ctx.quadraticCurveTo(fx-11,7-fh*.4,fx,18-fh);ctx.quadraticCurveTo(fx+12,8-fh*.4,fx+7,22);ctx.fill();}
  // Animated smoke plumes.
  for(let i=0;i<7;i++){const drift=Math.sin(time*.0007+i)*13,yy=-48-i*17-(time*.018+i*19)%22;ctx.globalAlpha=.2+(1-i/9)*.22;ctx.fillStyle=i%2?'#333d38':'#697064';ctx.beginPath();ctx.arc(-3+drift+Math.sin(i*3)*9,yy,9+i*2.7,0,Math.PI*2);ctx.fill();}
  ctx.globalAlpha=1;ctx.fillStyle='#f3d78b';ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.fillText('ЧЁРНЫЙ ЯЩИК',0,56);
  ctx.fillStyle='#a94a3b';ctx.globalAlpha=.65+.35*pulse;ctx.beginPath();ctx.arc(60,-17,4,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  if(lastSignalMission&&lastSignalMission.status!=='completed'){const glow=ctx.createRadialGradient(0,0,20,0,0,145);glow.addColorStop(0,'#d7b46b22');glow.addColorStop(1,'#d7b46b00');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(0,0,145,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#e6c783';ctx.globalAlpha=.4+.25*pulse;ctx.setLineDash([8,12]);ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,92+Math.sin(time*.004)*5,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;}
 }else if(p.type==='tent'){
  ctx.fillStyle='#343c32';ctx.beginPath();ctx.moveTo(-p.w/2,p.h/2);ctx.lineTo(-p.w*.38,-p.h*.28);ctx.lineTo(0,-p.h*.58);ctx.lineTo(p.w*.42,-p.h*.28);ctx.lineTo(p.w/2,p.h/2);ctx.closePath();ctx.fill();
  ctx.fillStyle='#697052';ctx.beginPath();ctx.moveTo(-p.w*.38,-p.h*.28);ctx.lineTo(0,-p.h*.58);ctx.lineTo(p.w*.42,-p.h*.28);ctx.lineTo(p.w*.5,p.h/2);ctx.lineTo(-p.w*.5,p.h/2);ctx.closePath();ctx.fill();
  ctx.fillStyle='#202921';ctx.beginPath();ctx.moveTo(-12,p.h/2);ctx.lineTo(0,-5);ctx.lineTo(12,p.h/2);ctx.fill();
  ctx.strokeStyle='#b0a17b';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-p.w/2,p.h/2);ctx.lineTo(0,-p.h*.58);ctx.lineTo(p.w/2,p.h/2);ctx.stroke();
 }else if(p.type==='pump'){
  for(let i=-1;i<=1;i+=2){ctx.fillStyle='#252d29';ctx.fillRect(i*25-12,-13,24,34);ctx.fillStyle='#a9a58b';ctx.fillRect(i*25-9,-10,18,10);ctx.fillStyle='#8c493e';ctx.fillRect(i*25-8,4,16,5);ctx.fillStyle='#d6cba8';ctx.fillRect(i*25-5,-8,10,5);ctx.strokeStyle='#242b27';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(i*25+9,-5);ctx.quadraticCurveTo(i*25+22,0,i*25+17,18);ctx.stroke();}
  ctx.fillStyle='#656b5e';ctx.fillRect(-p.w/2,19,p.w,5);
 }else if(p.type==='rubble'){
  for(let i=0;i<12;i++){const rx=Math.sin(i*9.7)*p.w*.42,ry=Math.cos(i*5.3)*p.h*.35,s=5+(i%4)*3;ctx.fillStyle=['#55574d','#77715f','#393f39','#8b8068'][i%4];ctx.beginPath();ctx.moveTo(rx-s,ry+s*.3);ctx.lineTo(rx-s*.4,ry-s);ctx.lineTo(rx+s,ry-s*.3);ctx.lineTo(rx+s*.7,ry+s);ctx.closePath();ctx.fill();ctx.strokeStyle='#292f29';ctx.lineWidth=1;ctx.stroke();}
 }else if(p.type==='dumpster'){
  ctx.fillStyle='#394b40';ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);ctx.fillStyle='#64745d';ctx.fillRect(-p.w/2-3,-p.h/2-5,p.w+6,8);ctx.fillStyle='#26342e';ctx.fillRect(-p.w/2+7,-p.h/2+8,p.w-14,p.h-14);ctx.strokeStyle='#8d9275';ctx.lineWidth=2;ctx.strokeRect(-p.w/2,-p.h/2,p.w,p.h);
 }else if(p.type==='barrier'){
  ctx.fillStyle='#77715f';ctx.beginPath();ctx.moveTo(-p.w/2,-p.h/2);ctx.lineTo(p.w/2,-p.h/2);ctx.lineTo(p.w/2-8,p.h/2);ctx.lineTo(-p.w/2+8,p.h/2);ctx.closePath();ctx.fill();ctx.fillStyle='#b6a16d';for(let x=-p.w/2+10;x<p.w/2-4;x+=28){ctx.save();ctx.translate(x,0);ctx.rotate(-.55);ctx.fillRect(-4,-p.h/2,8,p.h);ctx.restore();}ctx.strokeStyle='#343b34';ctx.lineWidth=2;ctx.strokeRect(-p.w/2,-p.h/2,p.w,p.h);
 }else{
  ctx.fillStyle='#4c493d';ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);ctx.fillStyle='#77745d';ctx.fillRect(-p.w/2+5,-p.h/2+5,p.w-10,p.h-10);ctx.fillStyle='#b4a078';ctx.fillRect(-p.w/2+8,-p.h/2+8,p.w-16,8);ctx.fillStyle='#343c32';ctx.fillRect(-8,-p.h/2+16,16,p.h/2);
 }
 // Fine scratches, chipped paint and fasteners make every prop read as a solid object.
 ctx.save();ctx.globalAlpha=.48;ctx.strokeStyle='#c2b28a';ctx.lineWidth=1;
 for(let i=0;i<5;i++){const px=-p.w*.36+((i*37+Math.abs(Math.floor(p.x)))%(p.w*.72));const py=-p.h*.32+((i*19+Math.abs(Math.floor(p.y)))%(p.h*.62));ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+5+(i%3)*3,py-2+(i%2)*3);ctx.stroke();}
 ctx.globalAlpha=.65;ctx.fillStyle='#171e19';for(let i=0;i<4;i++){const px=-p.w*.38+i*p.w*.25;ctx.beginPath();ctx.arc(px,-p.h*.36,1.6,0,Math.PI*2);ctx.fill();}
 ctx.restore();
 ctx.restore();
}
function streetLamp(x,y){ctx.fillStyle='#202821';ctx.fillRect(x-3,y-4,6,48);ctx.fillRect(x-3,y-4,22,4);ctx.fillStyle='#b9b69a';ctx.fillRect(x+15,y-7,10,7);if(worldClock>.62||worldClock<.08){const g=ctx.createRadialGradient(x+20,y-4,2,x+20,y-4,92);g.addColorStop(0,'#e5d59a30');g.addColorStop(1,'#e5d59a00');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x+20,y-4,92,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e9dba8';ctx.fillRect(x+17,y-6,6,4);}}
function drawDistrictDetails(){for(const y of [-8000,-4500,-1000,600,4100,7600,10000,13500,17000,20500])for(let x=WORLD_MIN+420;x<WORLD_MAX;x+=900){if(Math.abs(x-state.x)<w&&Math.abs(y-state.y)<h)streetLamp(x,y-92);}for(const x of [-8000,-4500,-1000,2700,6200,9700,10000,13500,17000,20500])for(let y=WORLD_MIN+420;y<WORLD_MAX;y+=900){if(Math.abs(x-state.x)<w&&Math.abs(y-state.y)<h)streetLamp(x+78,y);}}
function wreck(v){car(v.x,v.y,1.05,.06);if(!v.done){ctx.strokeStyle='#e6c783';ctx.lineWidth=2;ctx.beginPath();ctx.arc(v.x,v.y,21+Math.sin(time*.004)*3,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#e6c783';ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.fillText('ДЕТАЛИ',v.x,v.y-31)}}
function smoke(x,y){if(prefs.effects==='low')return;for(let i=0;i<5;i++){let yy=(time*.00015+i*.21)%1;ctx.globalAlpha=(1-yy)*.2;ctx.fillStyle='#c5c5b8';ctx.beginPath();ctx.arc(x+Math.sin(time*.0006+i)*11,y-yy*52,5+yy*11,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1}
function updateRadioSignal(now){
 if(!gameActive||activeInterior)return;
 if(radioSignal){
  if(now>=radioSignal.expiresAt){radioSignal=null;radioSignalNextAt=now+25000;toast('Радиосигнал потерян. Скоро появится новый.');}
  return;
 }
 if(now<radioSignalNextAt)return;
 let x=state.x,y=state.y,found=false;
 for(let attempt=0;attempt<24;attempt++){
  const angle=Math.random()*Math.PI*2,distance=520+Math.random()*330;
  const nx=Math.max(WORLD_MIN+90,Math.min(WORLD_MAX-90,state.x+Math.cos(angle)*distance));
  const ny=Math.max(WORLD_MIN+90,Math.min(WORLD_MAX-90,state.y+Math.sin(angle)*distance));
  if(!blocked(nx,ny)){x=nx;y=ny;found=true;break;}
 }
 if(!found){radioSignalNextAt=now+18000;return;}
 const roll=Math.random();
 const kind=roll<.45?'cache':roll<.75?'medical':'survivors';
 radioSignal={x,y,kind,expiresAt:now+150000};
 const label=kind==='cache'?'контейнер снабжения':kind==='medical'?'медицинский пункт':'выжившие просят помощи';
 toast('Новый радиосигнал: '+label+'. Найди маяк на карте.');
}
function drawRadioSignal(){
 if(!radioSignal)return;
 const s=radioSignal,pulse=1+Math.sin(time*.006)*.18;
 const color=s.kind==='medical'?'#8fd3b0':s.kind==='survivors'?'#9dc5ef':'#e6c783';
 ctx.save();
 // A physical event site, not only a floating marker.
 if(s.kind==='cache'){drawSupplyCrate(s.x,s.y,1.24,'field',false);}
 else if(s.kind==='medical'){ctx.fillStyle='#3e5145';ctx.fillRect(s.x-26,s.y-15,52,30);ctx.fillStyle='#d3d1b8';ctx.fillRect(s.x-19,s.y-10,38,20);ctx.fillStyle='#a94d43';ctx.fillRect(s.x-4,s.y-8,8,16);ctx.fillRect(s.x-10,s.y-2,20,4);ctx.strokeStyle='#252e29';ctx.strokeRect(s.x-26,s.y-15,52,30);}
 else{ctx.fillStyle='#353f36';ctx.fillRect(s.x-25,s.y-16,50,32);ctx.fillStyle='#7c8065';ctx.fillRect(s.x-20,s.y-11,40,22);ctx.fillStyle='#b9a16c';ctx.fillRect(s.x-3,s.y-8,6,16);ctx.fillRect(s.x-9,s.y-3,18,6);ctx.strokeStyle='#242d28';ctx.strokeRect(s.x-25,s.y-16,50,32);}
 const glow=ctx.createRadialGradient(s.x,s.y,2,s.x,s.y,92);
 glow.addColorStop(0,color+'55');glow.addColorStop(1,color+'00');
 ctx.fillStyle=glow;ctx.beginPath();ctx.arc(s.x,s.y,92,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle=color;ctx.lineWidth=2;ctx.globalAlpha=.85;
 ctx.beginPath();ctx.arc(s.x,s.y,18*pulse,0,Math.PI*2);ctx.stroke();
 ctx.globalAlpha=.55;ctx.beginPath();ctx.arc(s.x,s.y,31/pulse,0,Math.PI*2);ctx.stroke();
 ctx.globalAlpha=1;ctx.fillStyle='#172019';ctx.beginPath();ctx.arc(s.x,s.y,11,0,Math.PI*2);ctx.fill();
 ctx.fillStyle=color;ctx.font='bold 16px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('!',s.x,s.y);
 ctx.font='bold 10px system-ui';ctx.textBaseline='alphabetic';ctx.fillText('РАДИОСИГНАЛ',s.x,s.y-27);
 ctx.restore();
}
function completeRadioSignal(){
 if(!radioSignal)return;
 const kind=radioSignal.kind;radioSignal=null;state.radioFinds++;
 if(kind==='cache'){
  const metal=2+Math.floor(Math.random()*3),food=1+Math.floor(Math.random()*2);
  state.scrap+=metal;state.food+=food;
  if(Math.random()<.35)state.bandage++;
  toast('Контейнер найден: металлолом +'+metal+', еда +'+food+(state.bandage?' · аптечки '+state.bandage:''));
 }else if(kind==='medical'){
  const kits=1+Math.floor(Math.random()*2);
  state.bandage+=kits;state.food++;state.hp=Math.min(100,state.hp+20);
  toast('Медпункт найден: аптечки +'+kits+', еда +1, здоровье восстановлено');
 }else{
  state.survivorTrust++;state.food+=2;state.scrap++;
  toast('Выжившие спасены: доверие +1, еда +2, металлолом +1');
 }
 radioSignalNextAt=performance.now()+55000+Math.random()*45000;
 save();updateHud();
}
function drawMark(){ctx.fillStyle='#151d18';ctx.beginPath();ctx.ellipse(mark.x,mark.y+16,14,5,0,0,7);ctx.fill();rect(mark.x-9,mark.y-1,18,20,'#6d7950');rect(mark.x-7,mark.y+17,6,12,'#363e31');rect(mark.x+2,mark.y+17,6,12,'#363e31');rect(mark.x-12,mark.y+1,5,15,'#cba17b');rect(mark.x+7,mark.y+1,5,15,'#cba17b');ctx.fillStyle='#d4a77d';ctx.beginPath();ctx.arc(mark.x,mark.y-13,9,0,7);ctx.fill();rect(mark.x-10,mark.y-21,20,7,'#45463a');rect(mark.x-4,mark.y-13,2,2,'#222');rect(mark.x+3,mark.y-13,2,2,'#222');ctx.fillStyle='#f0d7a5';ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillText('МАРК',mark.x,mark.y-34)}
let playerAction={type:'',until:0,started:0};
function triggerPlayerAction(type,duration=420){const now=performance.now();playerAction={type,started:now,until:now+duration};}
const HAIR_STYLE_CATALOG=["short","long","shaved","mohawk","bun","fade","crew","undercut","sidepart","slickback","curly","wavy","afro","dreadlocks","braids","ponytail","twintails","bob","pixie","shag","wolfcut","mullet","spiky","messy","fringe","sidefringe","balding","topknot","braidlong","braidside","cornrows","locs","shoulder","layered","curtain","pompadour","quiff","bowl","buzz","military","messybun","doublebun","frenchbraid","fishtail","ribbon","spikehawk","longcurl","halfup"];
const OUTFIT_STYLE_CATALOG=["survivor","tactical","medic","scout","military","police","firefighter","paramedic","ranger","hunter","engineer","mechanic","scientist","hazmat","pilot","aviator","security","swat","sniper","commando","winter","arctic","desert","urban","woodland","urban_camo","rain","wasteland","raider","nomad","trapper","surgeon","lab","prisoner","civilian","worker","delivery","journalist","explorer","bodyguard","heavy","stealth","rebel","colonist","salvager"];
const CLOAK_STYLE_CATALOG=["short","long","poncho","raincoat","scarf","hooded","trench","dust","tattered","fur","winter","military","camouflage","leather","oilskin","capelet","mantle","duster","hooded_long","split","ragged","asym","shoulder","wrap","shawl","poncho_hood","rain_short","rain_long","cape_army","cape_scout","cape_medic","cape_raider","cape_nomad","cape_snow","cape_desert","cape_urban","cape_wood","cape_ash","cape_red","cape_dark","cape_light","cape_torn","cape_patch","cape_long_split","cape_short_hood","cape_collar","cape_sleeved","cape_traveler"];
function drawSurvivorHair(style,baseColor,accentColor,phase=0){
 ctx.save();ctx.fillStyle=baseColor;ctx.strokeStyle='#171e19';ctx.lineWidth=.9;
 const cap=()=>{ctx.beginPath();ctx.moveTo(-9,-23);ctx.lineTo(-9,-30);ctx.quadraticCurveTo(-8,-40,0,-40);ctx.quadraticCurveTo(9,-40,9,-29);ctx.lineTo(8,-22);ctx.quadraticCurveTo(0,-30,-8,-22);ctx.closePath();ctx.fill();ctx.stroke();};
 const longSides=()=>{ctx.beginPath();ctx.moveTo(-9,-24);ctx.lineTo(-9,-29);ctx.quadraticCurveTo(-10,-39,0,-40);ctx.quadraticCurveTo(11,-40,9,-28);ctx.lineTo(11,-12);ctx.lineTo(7,-11);ctx.lineTo(5,-28);ctx.lineTo(-5,-28);ctx.lineTo(-7,-11);ctx.lineTo(-11,-13);ctx.closePath();ctx.fill();ctx.stroke();};
 switch(style){
  case 'shaved':case 'buzz':case 'military':case 'balding':
   ctx.beginPath();ctx.ellipse(0,-29,8.7,3.8,0,Math.PI,Math.PI*2);ctx.fill();ctx.stroke();if(style==='balding'){ctx.fillStyle=accentColor;ctx.globalAlpha=.55;ctx.fillRect(-2,-33,4,1);}break;
  case 'mohawk':case 'spikehawk':
   ctx.beginPath();ctx.moveTo(-4,-22);ctx.lineTo(-3,-34);ctx.lineTo(-2,-40);ctx.lineTo(1,-43);ctx.lineTo(3,-34);ctx.lineTo(4,-22);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillRect(-2,-34,4,12);break;
  case 'afro':
   ctx.beginPath();ctx.arc(0,-31,11,Math.PI,Math.PI*2);ctx.lineTo(10,-22);ctx.lineTo(-10,-22);ctx.closePath();ctx.fill();ctx.stroke();for(let k=0;k<9;k++){ctx.beginPath();ctx.arc(-8+(k%5)*4,-35+Math.floor(k/5)*3,2,0,Math.PI*2);ctx.strokeStyle=accentColor;ctx.globalAlpha=.55;ctx.stroke();}break;
  case 'curly':case 'longcurl':case 'wavy':
   ctx.beginPath();ctx.moveTo(-10,-22);ctx.quadraticCurveTo(-13,-34,-7,-38);ctx.quadraticCurveTo(-3,-44,2,-40);ctx.quadraticCurveTo(8,-44,11,-35);ctx.quadraticCurveTo(14,-29,9,-21);ctx.quadraticCurveTo(0,-30,-9,-21);ctx.closePath();ctx.fill();ctx.stroke();for(let k=0;k<5;k++){ctx.beginPath();ctx.arc(-7+k*3.5,-35+(k%2)*2,2.3,Math.PI,Math.PI*2);ctx.strokeStyle=accentColor;ctx.globalAlpha=.55;ctx.stroke();}if(style==='longcurl')longSides();break;
  case 'long':case 'shoulder':case 'layered':case 'mullet':case 'shag':case 'wolfcut':case 'bob':
   longSides();if(style==='mullet'||style==='wolfcut'){ctx.beginPath();ctx.moveTo(-8,-22);ctx.lineTo(-10,-8);ctx.lineTo(-5,-13);ctx.lineTo(0,-7);ctx.lineTo(5,-13);ctx.lineTo(10,-8);ctx.lineTo(8,-22);ctx.closePath();ctx.fill();}break;
  case 'ponytail':case 'twintails':case 'braids':case 'braidlong':case 'braidside':case 'cornrows':case 'dreadlocks':case 'locs':case 'frenchbraid':case 'fishtail':case 'ribbon':
   cap();if(style==='twintails'){for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(side*7,-28);ctx.quadraticCurveTo(side*14,-25,side*12,-13);ctx.lineTo(side*9,-11);ctx.quadraticCurveTo(side*10,-23,side*6,-25);ctx.closePath();ctx.fill();ctx.stroke();}}else{ctx.beginPath();ctx.moveTo(7,-28);ctx.quadraticCurveTo(13,-22,10+Math.sin(time*.004+phase),-12);ctx.lineTo(7,-11);ctx.quadraticCurveTo(10,-23,5,-25);ctx.closePath();ctx.fill();ctx.stroke();}if(['braids','braidlong','braidside','cornrows','dreadlocks','locs','frenchbraid','fishtail'].includes(style)){ctx.strokeStyle=accentColor;ctx.lineWidth=1;for(let k=0;k<4;k++){ctx.beginPath();ctx.moveTo(-6+k*4,-30);ctx.lineTo(-4+k*3,-24);ctx.lineTo(-6+k*4,-19);ctx.stroke();}}break;
  case 'bun':case 'messybun':case 'topknot':case 'doublebun':
   cap();ctx.fillStyle=baseColor;ctx.beginPath();if(style==='doublebun'){ctx.arc(-7,-39,3.5,0,Math.PI*2);ctx.arc(7,-39,3.5,0,Math.PI*2);}else ctx.arc(0,-41,4.5,0,Math.PI*2);ctx.fill();ctx.stroke();break;
  case 'mohawk':break;
  case 'spiky':case 'messy':
   ctx.beginPath();ctx.moveTo(-9,-22);ctx.lineTo(-10,-31);ctx.lineTo(-7,-29);ctx.lineTo(-6,-39);ctx.lineTo(-1,-32);ctx.lineTo(2,-42);ctx.lineTo(5,-32);ctx.lineTo(10,-38);ctx.lineTo(9,-29);ctx.lineTo(11,-24);ctx.closePath();ctx.fill();ctx.stroke();break;
  case 'pompadour':case 'quiff':
   ctx.beginPath();ctx.moveTo(-9,-22);ctx.quadraticCurveTo(-12,-34,-5,-39);ctx.quadraticCurveTo(5,-47,10,-34);ctx.quadraticCurveTo(6,-31,3,-29);ctx.lineTo(9,-23);ctx.closePath();ctx.fill();ctx.stroke();break;
  case 'slickback':
   cap();ctx.strokeStyle=accentColor;ctx.lineWidth=.8;for(let k=-5;k<=5;k+=3){ctx.beginPath();ctx.moveTo(k,-37);ctx.quadraticCurveTo(k+2,-32,k+5,-28);ctx.stroke();}break;
  case 'sidepart':case 'curtain':case 'sidefringe':case 'fringe':
   cap();ctx.beginPath();if(style==='sidefringe'){ctx.moveTo(-7,-30);ctx.quadraticCurveTo(1,-31,8,-23);ctx.lineTo(-1,-22);ctx.closePath();}else if(style==='curtain'){ctx.moveTo(-6,-31);ctx.lineTo(-1,-23);ctx.lineTo(0,-31);ctx.lineTo(2,-23);ctx.lineTo(8,-30);}else{ctx.moveTo(-8,-29);ctx.lineTo(0,-23);ctx.lineTo(8,-29);}ctx.fill();break;
  case 'undercut':case 'fade':case 'crew':case 'pixie':case 'bowl':
   cap();if(style==='undercut'||style==='fade'){ctx.fillStyle=accentColor;ctx.globalAlpha=.4;ctx.fillRect(-8,-25,3,4);ctx.fillRect(5,-25,3,4);}break;
  default:cap();break;
 }
 ctx.restore();
}
function drawSurvivor(x,y,palette,phase=0,moving=false,remote=false,name='',action=null){
 const skin=palette?.skin||'#e8b88c',hair=palette?.hair||'#352d3d',shirt=palette?.shirt||'#526fba',trim=palette?.trim||'#9cb9ff',eyes=palette?.eyes||'#26334c',pants=palette?.pants||'#343b3a',boots=palette?.boots||'#242a27',bodyType=palette?.bodyType||'average',hairStyle=palette?.hairStyle||'short',beard=palette?.beard||'none',outfit=palette?.outfit||'survivor',headgear=palette?.headgear||'none',faceAccessory=palette?.faceAccessory||'none',scar=palette?.scar===true,garmentSize=palette?.garmentSize||'M',cloak=palette?.cloak||'none',outerwear=palette?.outerwear||'none',backpack=palette?.backpack||'none',gloves=palette?.gloves||'none',pantsStyle=palette?.pantsStyle||'cargo',belt=palette?.belt||'utility',fabric=palette?.fabric||'solid',condition=palette?.condition||'worn',patch=palette?.patch||'none',cloakColor=palette?.cloakColor||'#59634b',packColor=palette?.packColor||'#3e5144',hairAccent=palette?.hairAccent||'#a78b69',browColor=palette?.browColor||hair,beardColor=palette?.beardColor||hair,lipColor=palette?.lipColor||'#8b5b55',eyeWhiteColor=palette?.eyeWhiteColor||'#e7e3d7',gloveColor=palette?.gloveColor||'#454a42',beltColor=palette?.beltColor||'#786744',metalColor=palette?.metalColor||'#a6a99c',undershirtColor=palette?.undershirtColor||'#343c38',skinDetailColor=palette?.skinDetailColor||'#8c4c45',patternColor=palette?.patternColor||'#293d2c';
 const hairIndex=Math.max(0,HAIR_STYLE_CATALOG.indexOf(hairStyle)),outfitIndex=Math.max(0,OUTFIT_STYLE_CATALOG.indexOf(outfit)),cloakIndex=Math.max(0,CLOAK_STYLE_CATALOG.indexOf(cloak));
 const now=performance.now(),walk=moving?Math.sin(time*.014+phase):0;
 const progress=action?Math.max(0,Math.min(1,(now-action.started)/(action.until-action.started))):1;
 const pulse=action?Math.sin(progress*Math.PI):0;
 const attack=action?.type==='attack'?pulse:0,interact=action?.type==='interact'?pulse:0,heal=action?.type==='heal'?pulse:0,hurt=action?.type==='hurt'?pulse:0;
 const bob=moving?Math.abs(walk)*1.15:0,lean=attack*.16-interact*.08-hurt*.12;
 ctx.save();ctx.translate(x,y+bob);ctx.rotate(lean);const bodyScale=bodyType==='slim'?.88:bodyType==='strong'?1.16:bodyType==='stocky'?1.22:bodyType==='bulky'?1.3:bodyType==='athletic'?1.1:bodyType==='lanky'?.92:1;const heightScale=palette?.height==='short'?.92:palette?.height==='tall'?1.1:1;ctx.scale(1.1*bodyScale,1.1*heightScale);ctx.lineJoin='round';ctx.lineCap='round';
 ctx.fillStyle='#101810aa';ctx.beginPath();ctx.ellipse(0,19,14+attack*2,5,0,0,Math.PI*2);ctx.fill();
 const garmentScale=garmentSize==='XS'?.82:garmentSize==='S'?.91:garmentSize==='L'?1.09:garmentSize==='XL'?1.19:1;
 const capeSway=Math.sin(time*.004+phase)*2.2;
 if(backpack!=='none'){ctx.save();ctx.translate(0,-7);ctx.fillStyle=packColor;ctx.fillRect(-11,-5,22,19);ctx.fillStyle='#202a25';ctx.fillRect(-10,-2,20,3);ctx.fillRect(-9,7,18,2);if(backpack==='large'){ctx.fillRect(-10,-12,20,10);ctx.fillRect(-13,0,4,12);ctx.fillRect(9,0,4,12);}else if(backpack==='medic'){ctx.fillStyle='#e8e5d4';ctx.fillRect(-2,0,4,11);ctx.fillRect(-5,3,10,4);}else if(backpack==='tactical'){ctx.fillStyle=trim;ctx.fillRect(-8,1,4,5);ctx.fillRect(4,1,4,5);}ctx.restore();}
 if(cloak!=='none'){ctx.save();ctx.translate(0,-5);ctx.fillStyle=cloakColor;ctx.beginPath();const cw=11+(cloakIndex%5)*1.5,cl=14+(cloakIndex%7)*3,edge=(cloakIndex%4)-1.5;ctx.moveTo(-8,-10);ctx.lineTo(-cw,2+capeSway);if(cloakIndex%6===0){ctx.lineTo(-cw-3,cl+capeSway);ctx.lineTo(-cw/2,cl-3+capeSway);ctx.lineTo(0,cl+5+capeSway);ctx.lineTo(cw/2,cl-3+capeSway);ctx.lineTo(cw+3,cl+capeSway);}else if(cloakIndex%6===1){ctx.lineTo(-cw-2,cl+capeSway);ctx.lineTo(cw+2,cl+capeSway);}else if(cloakIndex%6===2){ctx.lineTo(-cw,cl*.65+capeSway);ctx.lineTo(-cw*.35,cl+capeSway);ctx.lineTo(cw*.25,cl*.78+capeSway);ctx.lineTo(cw,cl+capeSway);}else if(cloakIndex%6===3){ctx.lineTo(-cw-3,cl*.8+capeSway);ctx.lineTo(-cw/2,cl+capeSway);ctx.lineTo(cw+3,cl*.7+capeSway);}else if(cloakIndex%6===4){ctx.lineTo(-cw,cl+capeSway);ctx.lineTo(cw,cl+capeSway);}else{ctx.lineTo(-cw+edge,cl*.5+capeSway);ctx.lineTo(-cw*.6,cl+capeSway);ctx.lineTo(cw*.7,cl*.8+capeSway);ctx.lineTo(cw,cl+capeSway);}ctx.lineTo(cw,2+capeSway);ctx.lineTo(8,-10);ctx.closePath();ctx.fill();ctx.strokeStyle='#111a15aa';ctx.lineWidth=1.2;ctx.stroke();ctx.restore();}
 const ls=moving?walk*4:0,rs=moving?-walk*4:0;
 ctx.strokeStyle=pants;ctx.lineWidth=5.5;ctx.beginPath();ctx.moveTo(-4,5);ctx.lineTo(-5+ls,16);ctx.moveTo(4,5);ctx.lineTo(5+rs,16);ctx.stroke();
 ctx.fillStyle=pantsStyle==='shorts'?'#4b5143':pants;ctx.fillRect(-9+ls,8,8,9);ctx.fillRect(1+rs,8,8,9);if(pantsStyle==='tactical'){ctx.fillStyle=trim;ctx.fillRect(-9+ls,11,3,4);ctx.fillRect(6+rs,11,3,4);}else if(pantsStyle==='jeans'){ctx.strokeStyle='#82909a66';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-5+ls,9);ctx.lineTo(-5+ls,16);ctx.moveTo(5+rs,9);ctx.lineTo(5+rs,16);ctx.stroke();}else if(pantsStyle==='reinforced'){ctx.fillStyle='#252d27';ctx.fillRect(-9+ls,11,8,4);ctx.fillRect(1+rs,11,8,4);}
 ctx.fillStyle=boots;ctx.fillRect(-10+ls,15,9,5);ctx.fillRect(1+rs,15,9,5);if(palette?.footwear==='sneakers'){ctx.fillStyle=metalColor;ctx.fillRect(-10+ls,18,9,2);ctx.fillRect(1+rs,18,9,2);}else if(palette?.footwear==='waders'){ctx.fillStyle=boots;ctx.fillRect(-9+ls,11,7,8);ctx.fillRect(2+rs,11,7,8);}else if(palette?.footwear==='sandals'){ctx.strokeStyle=metalColor;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-9+ls,17);ctx.lineTo(-2+ls,17);ctx.moveTo(2+rs,17);ctx.lineTo(9+rs,17);ctx.stroke();}
 ctx.fillStyle=backpack==='none'?'#4b4b35':metalColor;ctx.fillRect(7,-12,8,18);ctx.fillStyle=metalColor;ctx.fillRect(9,-9,5,10);ctx.fillStyle=undershirtColor;ctx.fillRect(7,-13,8,2);
 ctx.save();ctx.translate(0,-attack*1.4+heal*1.2);ctx.scale(garmentScale,1);
 ctx.fillStyle=shirt;ctx.beginPath();ctx.moveTo(-8,-11);ctx.lineTo(8,-11);ctx.lineTo(9,8);ctx.lineTo(-9,8);ctx.closePath();ctx.fill();
 if(outfit==='tactical'||outfit==='swat'||outfit==='commando'||outfit==='security'){ctx.fillStyle=undershirtColor;ctx.fillRect(-8,-9,16,12);ctx.fillStyle=trim;ctx.fillRect(-7,-7,5,5);ctx.fillRect(2,-7,5,5);}else if(outfit==='medic'||outfit==='paramedic'||outfit==='surgeon'){ctx.fillStyle='#e8e5d4';ctx.fillRect(-2,-8,4,10);ctx.fillRect(-5,-5,10,4);}else if(outfit==='scout'||outfit==='ranger'||outfit==='hunter'){ctx.fillStyle=trim;ctx.fillRect(-8,-9,16,3);ctx.fillRect(-8,-3,5,8);ctx.fillRect(3,-3,5,8);}else{ctx.fillStyle=trim;ctx.fillRect(-8,-11,16,4);ctx.fillRect(-2,-7,4,14);}
 const suitTone=outfitIndex%8;ctx.fillStyle=suitTone===0?undershirtColor:suitTone===1?metalColor:suitTone===2?patternColor:suitTone===3?trim:suitTone===4?skinDetailColor:suitTone===5?beltColor:suitTone===6?cloakColor:undershirtColor;if(suitTone%2===0){ctx.fillRect(-8,-5,4,5);ctx.fillRect(4,-5,4,5);}else{ctx.fillRect(-9,-9,3,7);ctx.fillRect(6,-9,3,7);}if(outfitIndex%3===0){ctx.fillStyle=metalColor;ctx.fillRect(-2,-9,4,3);ctx.fillRect(-2,1,4,3);}else if(outfitIndex%3===1){ctx.strokeStyle=trim;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-6,-8);ctx.lineTo(6,5);ctx.stroke();}else{ctx.fillStyle=trim;ctx.fillRect(-7,-10,3,2);ctx.fillRect(4,-10,3,2);}const suitCut=outfitIndex%5;ctx.strokeStyle=suitCut===0?metalColor:suitCut===1?patternColor:suitCut===2?trim:suitCut===3?beltColor:undershirtColor;ctx.lineWidth=.8;ctx.beginPath();if(suitCut===0){ctx.moveTo(-8,-2);ctx.lineTo(8,-2);ctx.moveTo(0,-10);ctx.lineTo(0,7);}else if(suitCut===1){ctx.moveTo(-7,-9);ctx.lineTo(-2,-4);ctx.lineTo(-7,2);ctx.moveTo(7,-9);ctx.lineTo(2,-4);ctx.lineTo(7,2);}else if(suitCut===2){ctx.moveTo(-8,-8);ctx.lineTo(-4,4);ctx.moveTo(8,-8);ctx.lineTo(4,4);}else if(suitCut===3){ctx.moveTo(-6,-10);ctx.lineTo(0,-6);ctx.lineTo(6,-10);}else{ctx.moveTo(-7,3);ctx.lineTo(7,3);ctx.moveTo(-5,-9);ctx.lineTo(5,-9);}ctx.stroke();if(outerwear==='parka'||outerwear==='longcoat'){ctx.fillStyle=shirt;ctx.fillRect(-10,-12,20,23);ctx.fillStyle=trim;ctx.fillRect(-1,-10,2,18);ctx.fillStyle='#27312b';ctx.fillRect(-9,3,18,2);}else if(outerwear==='leather'){ctx.fillStyle='#3b3028';ctx.fillRect(-9,-10,18,18);ctx.strokeStyle=trim;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-7,-9);ctx.lineTo(0,-2);ctx.lineTo(7,-9);ctx.stroke();}else if(outerwear==='vest'){ctx.fillStyle='#303b34';ctx.fillRect(-9,-10,18,16);ctx.fillStyle=trim;ctx.fillRect(-8,-8,5,7);ctx.fillRect(3,-8,5,7);}else if(outerwear==='hazmat'){ctx.fillStyle='#b9a94a';ctx.fillRect(-9,-10,18,18);ctx.fillStyle='#252b24';ctx.fillRect(-2,-10,4,18);}
 if(fabric!=='solid'){ctx.save();ctx.globalAlpha=.42;ctx.strokeStyle=patternColor;ctx.lineWidth=2;for(let k=-8;k<=8;k+=5){ctx.beginPath();ctx.moveTo(k,-9);ctx.lineTo(k+4,7);ctx.stroke();}ctx.restore();}
 if(belt!=='none'){ctx.fillStyle=beltColor;ctx.fillRect(-9,5,18,3);ctx.fillStyle=metalColor;ctx.fillRect(-2,5,4,3);if(belt==='ammo'){ctx.fillStyle='#d0b56d';for(let k=-7;k<=7;k+=4)ctx.fillRect(k,5,2,3);}}
 if(patch!=='none'){ctx.fillStyle=patch==='medic'?'#e8e5d4':patch==='hazard'?'#d7c33b':patch==='ranger'?'#a5b28a':'#a9b6a1';ctx.fillRect(4,-8,4,4);if(patch==='medic'){ctx.fillStyle='#b34d43';ctx.fillRect(5,-7,2,2);}}
 if(condition!=='clean'){ctx.fillStyle=condition==='dirty'?'#30291d88':'#392f2788';ctx.fillRect(-7,0,3,4);ctx.fillRect(3,3,4,3);if(condition==='torn'){ctx.beginPath();ctx.moveTo(-7,-5);ctx.lineTo(-3,-1);ctx.lineTo(-6,3);ctx.fill();ctx.beginPath();ctx.moveTo(5,-2);ctx.lineTo(8,2);ctx.lineTo(5,4);ctx.fill();}}
 if(outerwear==='longcoat'){ctx.fillStyle=shirt;ctx.fillRect(-10,5,5,17);ctx.fillRect(5,5,5,17);}
 ctx.fillStyle=beltColor;ctx.fillRect(-8,6,16,3);ctx.fillStyle=metalColor;ctx.fillRect(-6,8,12,2);if(palette?.markings&&palette.markings!=='none'){ctx.save();ctx.strokeStyle=palette.markings==='warpaint'?skinDetailColor:palette.markings==='tribal'?hairAccent:palette.markings==='biohazard'?'#c5b83e':skinDetailColor;ctx.lineWidth=1.1;if(palette.markings==='freckles'){for(let n=0;n<5;n++){ctx.beginPath();ctx.arc(-5+n*2.5,-21+(n%2),.55,0,Math.PI*2);ctx.stroke();}}else{ctx.beginPath();ctx.moveTo(-6,-7);ctx.lineTo(-3,-4);ctx.lineTo(-6,-1);ctx.moveTo(6,-7);ctx.lineTo(3,-4);ctx.lineTo(6,-1);ctx.stroke();}ctx.restore();}
 const la=-walk*.48+interact*.9+heal*1.1+hurt*.45,ra=walk*.48-attack*1.35+interact*.65+heal*.35-hurt*.45;
 for(const side of [-1,1]){const angle=side<0?la:ra;ctx.save();ctx.translate(side*8,-7);ctx.rotate(angle*side);
  ctx.strokeStyle=shirt;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(side*4,7);ctx.lineTo(side*(5+attack*5+interact*3),13);ctx.stroke();
  ctx.strokeStyle=skin;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(side*(5+attack*5+interact*3),12);ctx.lineTo(side*(6+attack*7+interact*4),18);ctx.stroke();
  ctx.fillStyle=skin;ctx.beginPath();ctx.arc(side*(6+attack*7+interact*4),18,2.2,0,Math.PI*2);ctx.fill();if(gloves!=='none'){ctx.fillStyle=gloveColor;ctx.beginPath();ctx.arc(side*(6+attack*7+interact*4),18,2.7,0,Math.PI*2);ctx.fill();}ctx.restore();}
 ctx.restore();
 ctx.save();ctx.translate(0,hurt*2);ctx.fillStyle=skin;ctx.fillRect(-3,-15,6,6);ctx.beginPath();
 const faceKind=palette?.faceShape||'normal',faceW=bodyType==='strong'?9.6:bodyType==='slim'?8:9,faceH=faceKind==='long'?10.2:faceKind==='round'?9.2:9;
 if(faceKind==='angular'){ctx.moveTo(-faceW,-27);ctx.quadraticCurveTo(-faceW,-32,0,-32);ctx.quadraticCurveTo(faceW,-32,faceW,-27);ctx.lineTo(faceW-1,-20);ctx.lineTo(2,-14);ctx.lineTo(0,-13);ctx.lineTo(-2,-14);ctx.lineTo(-faceW+1,-20);ctx.closePath();}
 else if(faceKind==='square'){ctx.moveTo(-faceW+1,-31);ctx.lineTo(faceW-1,-31);ctx.quadraticCurveTo(faceW,-31,faceW,-27);ctx.lineTo(faceW,-19);ctx.lineTo(4,-14);ctx.lineTo(-4,-14);ctx.lineTo(-faceW,-19);ctx.lineTo(-faceW,-27);ctx.closePath();}
 else if(faceKind==='heart'){ctx.moveTo(-faceW,-25);ctx.quadraticCurveTo(-faceW,-33,0,-31);ctx.quadraticCurveTo(faceW,-33,faceW,-25);ctx.quadraticCurveTo(faceW-1,-18,0,-13);ctx.quadraticCurveTo(-faceW+1,-18,-faceW,-25);ctx.closePath();}
 else if(faceKind==='long'){ctx.ellipse(0,-23,faceW*.88,faceH,0,0,Math.PI*2);}
 else{ctx.ellipse(0,-23,faceW,faceH,0,0,Math.PI*2);}
 ctx.fill();ctx.strokeStyle=skinDetailColor;ctx.globalAlpha=.25;ctx.lineWidth=.7;ctx.stroke();ctx.globalAlpha=1;
 ctx.beginPath();ctx.arc(-9,-23,2.1,0,Math.PI*2);ctx.arc(9,-23,2.1,0,Math.PI*2);ctx.fill();
 drawSurvivorHair(hairStyle,hair,hairAccent,phase);const eyeKind=palette?.eyeStyle||'normal',eyeW=eyeKind==='wide'?1.9:eyeKind==='round'?1.8:eyeKind==='narrow'||eyeKind==='sleepy'?1.9:1.5,eyeH=eyeKind==='wide'?1.9:eyeKind==='round'?2.2:eyeKind==='narrow'?0.8:eyeKind==='hooded'||eyeKind==='tired'||eyeKind==='sleepy'?.75:1.25;
 for(const side of [-1,1]){const ex=side*3.8,ey=-22.6;ctx.save();ctx.translate(ex,ey);ctx.fillStyle=skinDetailColor;ctx.beginPath();ctx.ellipse(0,0,eyeW+1.0,eyeH+1.0,side*.04,0,Math.PI*2);ctx.fill();ctx.fillStyle=eyeWhiteColor;ctx.beginPath();ctx.ellipse(0,0,eyeW,eyeH,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=eyes;ctx.beginPath();ctx.ellipse(.15,0,.78,Math.max(.65,eyeH*.72),0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#101714';ctx.beginPath();ctx.arc(.2,0,.46,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(.48,-.48,.38,0,Math.PI*2);ctx.fill();ctx.strokeStyle=browColor;ctx.lineWidth=eyeKind==='sharp'?1.8:1.35;ctx.beginPath();if(eyeKind==='tired'||eyeKind==='sleepy'){ctx.moveTo(-2.4,-2.5);ctx.quadraticCurveTo(0,-1.5,2.4,-2.1);}else if(eyeKind==='sharp'){ctx.moveTo(-2.4,-2.1);ctx.lineTo(0,-2.9);ctx.lineTo(2.4,-1.8);}else{ctx.moveTo(-2.3,-2.2);ctx.quadraticCurveTo(0,-3.1,2.3,-2.2);}ctx.stroke();if(eyeKind==='hooded'){ctx.strokeStyle=skinDetailColor;ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(-2,-.6);ctx.quadraticCurveTo(0,-2,2,.0);ctx.stroke();}ctx.restore();}
 ctx.fillStyle=skinDetailColor;ctx.beginPath();ctx.moveTo(-.7,-20.2);ctx.lineTo(.7,-20.2);ctx.lineTo(1.1,-18.4);ctx.lineTo(0,-18);ctx.closePath();ctx.fill();ctx.strokeStyle=skinDetailColor;ctx.lineWidth=.55;ctx.beginPath();ctx.moveTo(-1,-18);ctx.lineTo(0,-17.7);ctx.lineTo(1,-18);ctx.stroke();ctx.fillStyle=lipColor;ctx.beginPath();ctx.moveTo(-2.4,-16.9);ctx.quadraticCurveTo(0,-17.7,2.4,-16.9);ctx.quadraticCurveTo(0,-15.2,-2.4,-16.9);ctx.fill();if(palette?.faceShape==='angular'){ctx.strokeStyle=skinDetailColor;ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(-7,-20);ctx.lineTo(-5,-16);ctx.moveTo(7,-20);ctx.lineTo(5,-16);ctx.stroke();}else if(palette?.faceShape==='round'){ctx.beginPath();ctx.arc(-6,-19,1.4,0,Math.PI*2);ctx.arc(6,-19,1.4,0,Math.PI*2);ctx.fill();}if(beard==='stubble'){ctx.fillStyle='#51443e88';ctx.fillRect(-5,-18,10,3);}else if(beard==='beard'){ctx.fillStyle=beardColor;ctx.beginPath();ctx.moveTo(-6,-18);ctx.lineTo(-5,-13);ctx.lineTo(0,-10);ctx.lineTo(5,-13);ctx.lineTo(6,-18);ctx.closePath();ctx.fill();}else if(beard==='mustache'){ctx.fillStyle=beardColor;ctx.fillRect(-5,-19,4,2);ctx.fillRect(1,-19,4,2);}if(scar){ctx.strokeStyle=skinDetailColor;ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(3,-29);ctx.lineTo(6,-24);ctx.stroke();}if(faceAccessory==='mask'||faceAccessory==='bandana'){ctx.fillStyle=faceAccessory==='mask'?'#343f3e':'#8d4540';ctx.fillRect(-6,-21,12,5);}else if(faceAccessory==='goggles'||faceAccessory==='ski_goggles'){ctx.strokeStyle=metalColor;ctx.lineWidth=2;ctx.strokeRect(-7,-26,5,4);ctx.strokeRect(2,-26,5,4);}else if(faceAccessory!=='none'){ctx.fillStyle=undershirtColor;ctx.fillRect(-6,-21,12,5);ctx.fillStyle=metalColor;if(faceAccessory==='gas_mask'||faceAccessory==='respirator'||faceAccessory==='filter'){ctx.beginPath();ctx.arc(-4,-18,2.3,0,Math.PI*2);ctx.arc(4,-18,2.3,0,Math.PI*2);ctx.fill();}else if(faceAccessory==='visor'){ctx.fillRect(-8,-26,16,3);}else if(faceAccessory==='radio_mic'){ctx.fillRect(5,-20,2,6);ctx.fillRect(5,-14,3,2);}else if(faceAccessory==='monocle'){ctx.beginPath();ctx.arc(4,-23,3,0,Math.PI*2);ctx.stroke();}}if(headgear!=='none'){ctx.fillStyle=headgear==='helmet'||headgear==='riot'||headgear==='night_vision'||headgear==='hardhat'?'#66705f':headgear==='hood'||headgear==='gas_hood'||headgear==='balaclava'?'#303a35':headgear==='beanie'||headgear==='ushanka'?'#655d4c':trim;ctx.beginPath();if(headgear==='wide_hat'||headgear==='boonie'||headgear==='cowboy'){ctx.ellipse(0,-29,14,3,0,Math.PI,Math.PI*2);ctx.fillRect(-7,-35,14,6);}else if(headgear==='beret'){ctx.ellipse(-1,-32,10,4,-.2,Math.PI,Math.PI*2);}else if(headgear==='hardhat'||headgear==='helmet'||headgear==='riot'||headgear==='night_vision'||headgear==='pilot'){ctx.arc(0,-29,10,Math.PI,Math.PI*2);ctx.lineTo(10,-26);ctx.lineTo(-10,-26);}else if(headgear==='ushanka'){ctx.arc(0,-29,9,Math.PI,Math.PI*2);ctx.lineTo(11,-20);ctx.lineTo(7,-20);ctx.lineTo(-7,-20);ctx.lineTo(-11,-20);}else{ctx.arc(0,-29,10,Math.PI,Math.PI*2);ctx.lineTo(10,-27);ctx.lineTo(-10,-27);}ctx.closePath();ctx.fill();if(headgear==='night_vision'){ctx.fillStyle=metalColor;ctx.fillRect(-5,-27,3,5);ctx.fillRect(2,-27,3,5);}else if(headgear==='pilot'){ctx.strokeStyle=metalColor;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-8,-26);ctx.lineTo(8,-26);ctx.stroke();}else if(headgear==='beanie'||headgear==='ushanka'){ctx.fillStyle=metalColor;ctx.fillRect(-7,-27,14,1.5);}else if(headgear==='cap'){ctx.fillStyle=undershirtColor;ctx.fillRect(0,-28,12,2);}}ctx.strokeStyle='#18231d';ctx.lineWidth=1;ctx.strokeRect(-8,-11,16,19);ctx.restore();
 if(heal>0){ctx.save();ctx.globalAlpha=heal*.8;ctx.strokeStyle='#8ee6a1';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-39);ctx.lineTo(0,-48);ctx.moveTo(-4,-43);ctx.lineTo(4,-43);ctx.stroke();ctx.restore();}
 if(remote){ctx.fillStyle='#e7e9d8';ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.shadowColor='#10170f';ctx.shadowBlur=4;ctx.fillText(String(name||'Игрок').slice(0,16),0,-40);ctx.shadowBlur=0;ctx.strokeStyle='#e7d6a0aa';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,-23,12,0,Math.PI*2);ctx.stroke();}
 ctx.restore();
}
function drawRemotePlayers(){const coop=window.ApocalypseCoop;if(!coop)return;for(const p of coop.getPlayers()){if(!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;if(activeInterior){if(p.interiorId!==activeInterior.buildingId||Number(p.interiorFloor)!==activeInterior.floor)continue;}else if(p.interiorId)continue;drawSurvivor(p.x,p.y,p.avatar,p.phase||0,!!p.moving,true,p.name);}}
function buildingTitle(b){const labels={residential:'ЖИЛОЙ ДОМ',hospital:'БОЛЬНИЦА',police:'ПОЛИЦЕЙСКИЙ УЧАСТОК',mall:'ТОРГОВЫЙ ЦЕНТР',office:'ОФИСНОЕ ЗДАНИЕ',apartment:'ЖИЛОЙ КОМПЛЕКС',warehouse:'СКЛАД',fire_station:'ПОЖАРНАЯ ЧАСТЬ',supermarket:'СУПЕРМАРКЕТ',motel:'МОТЕЛЬ',factory:'ЗАВОД',clinic_outpost:'МЕДПУНКТ',bus_depot:'АВТОБАЗА',radio_tower:'РАДИОВЫШКА',farmhouse:'ФЕРМА',hardware_store:'ХОЗМАГАЗИН',weapon_shop:'ОРУЖЕЙНЫЙ МАГАЗИН',pharmacy_ruins:'АПТЕКА',underground_shelter:'ПОДЗЕМНОЕ УБЕЖИЩЕ',survivor_safehouse:'УБЕЖИЩЕ ВЫЖИВШИХ',rural_market:'РЫНОК',power_plant:'ЭЛЕКТРОСТАНЦИЯ',research_center:'НАУЧНЫЙ ЦЕНТР',garage_complex:'АВТОМАСТЕРСКАЯ',old_mill:'СТАРАЯ МЕЛЬНИЦА'};return labels[b.id]||b.id.replace(/_/g,' ').toUpperCase();}
function enterBuilding(b){if(!b||activeInterior)return;interiorReturn={x:state.x,y:state.y};const floor=Math.max(1,Math.min(b.floors,whole(buildingFloors[b.id],1,1,b.floors)));activeInterior={buildingId:b.id,floor};buildingFloors[b.id]=floor;state.x=550;state.y=590;moveX=moveY=0;keys.clear();save();toast('Вход: '+buildingTitle(b)+' · этаж '+floor+'/'+b.floors);const coop=window.ApocalypseCoop;if(coop?.room?.status==='running')coop.send({kind:'building-entered',buildingId:b.id,floor});}
function exitBuilding(){if(!activeInterior)return;const b=buildings.find(v=>v.id===activeInterior.buildingId);activeInterior=null;state.x=interiorReturn?.x??(b?b.x+b.w/2:440);state.y=interiorReturn?.y??(b?b.y+b.h+38:390);interiorReturn=null;moveX=moveY=0;keys.clear();save();toast('Ты вышел из здания');}
function drawBuildingEntryPrompts(){for(const b of buildings){const x=b.x+b.w/2,y=b.y+b.h+38,d=Math.hypot(state.x-x,state.y-y);if(d>210)continue;ctx.save();ctx.fillStyle='#101710d9';ctx.fillRect(x-66,y-43,132,25);ctx.strokeStyle='#d8c18a';ctx.lineWidth=1.5;ctx.strokeRect(x-66,y-43,132,25);ctx.fillStyle='#f1d9a4';ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillText('E · ВОЙТИ',x,y-26);ctx.restore();}}
function interiorRemains(b,floor){const id=b.id.toLowerCase(),seed=[...id].reduce((n,ch)=>n+ch.charCodeAt(0),floor*19),spots=[[370,275],[650,485],[390,590],[905,435],[625,610],[175,430],[475,185],[775,365]];const count=/hospital|clinic|prison|school|motel/.test(id)?3:2,out=[];for(let i=0;i<count;i++){const p=spots[(seed+i*3)%spots.length];out.push({x:p[0],y:p[1],angle:((seed+i*37)%90-45)*Math.PI/180});}return out;}
function drawInteriorCorpse(x,y,angle,index){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha=.34;ctx.fillStyle='#170f0d';ctx.beginPath();ctx.ellipse(0,8,34,15,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.strokeStyle='#27231f';ctx.lineWidth=7;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-13,-1);ctx.lineTo(-30,-15);ctx.moveTo(13,1);ctx.lineTo(29,16);ctx.moveTo(-8,7);ctx.lineTo(-24,22);ctx.moveTo(9,7);ctx.lineTo(27,22);ctx.stroke();ctx.fillStyle=index%2?'#343b35':'#494039';ctx.beginPath();ctx.moveTo(-17,-8);ctx.lineTo(13,-12);ctx.lineTo(20,9);ctx.lineTo(-10,16);ctx.closePath();ctx.fill();ctx.fillStyle='#aaa18b';ctx.beginPath();ctx.arc(-23,-12,8,0,Math.PI*2);ctx.fill();ctx.fillStyle='#5b5041';ctx.fillRect(-28,-15,10,4);ctx.globalAlpha=.48;ctx.fillStyle='#4b1d19';ctx.beginPath();ctx.ellipse(4,16,22,7,-.2,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.9;ctx.fillStyle='#b7ad92';ctx.font='9px system-ui';ctx.textAlign='center';ctx.fillText('E · ОСМОТРЕТЬ',0,-27);ctx.restore();}
function drawAbandonedDetails(b,floor){const id=b.id.toLowerCase(),remains=interiorRemains(b,floor);ctx.save();ctx.globalAlpha=.72;for(let i=0;i<7;i++){const x=155+((i*137+floor*53+b.id.length*17)%780),y=145+((i*83+floor*41+b.id.length*29)%485);ctx.fillStyle=i%2?'#252923':'#81765f';ctx.save();ctx.translate(x,y);ctx.rotate((i*19+floor)*.11);ctx.fillRect(-9,-4,18,8);ctx.fillRect(-3,-11,7,14);ctx.restore();}ctx.globalAlpha=.48;ctx.strokeStyle='#171b17';ctx.lineWidth=3;for(let i=0;i<4;i++){const x=170+i*205,y=110+(i%2)*510;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+22,y+17);ctx.lineTo(x+8,y+34);ctx.stroke();}ctx.restore();remains.forEach((p,i)=>drawInteriorCorpse(p.x,p.y,p.angle,i));if(/hospital|clinic|pharmacy/.test(id)){ctx.save();ctx.globalAlpha=.35;ctx.fillStyle='#762b25';ctx.fillRect(170,515,110,5);ctx.fillRect(690,515,90,4);ctx.restore();}if(floor>1){ctx.save();ctx.fillStyle='#1b211d';ctx.globalAlpha=.5;ctx.fillRect(140,105,820,10);ctx.fillStyle='#a28a5d';ctx.globalAlpha=.28;ctx.fillRect(140,112,820,2);ctx.restore();}}
function drawResidentialInteriorDetails(id,variant,floor){if(!/residential|apartment|farmhouse|motel|survivor_safehouse|east_safehouse/.test(id))return;ctx.save();
  // Lived-in home layout: rug, sofa, coffee table, kitchen, sleeping area and warm practical lighting.
  ctx.globalAlpha=.9;ctx.fillStyle=variant===1?'#665343':'#655b49';ctx.fillRect(365,188,205,112);ctx.fillStyle='#b69a70';ctx.fillRect(373,196,189,96);ctx.fillStyle='#473e34';ctx.fillRect(388,207,158,62);ctx.fillStyle='#81715a';ctx.fillRect(397,213,140,47);ctx.fillStyle='#b7a17b';ctx.fillRect(402,218,58,35);ctx.fillStyle='#a18b68';ctx.fillRect(467,218,62,35);ctx.fillStyle='#3a332b';ctx.fillRect(390,266,154,9);ctx.fillStyle='#292e28';ctx.fillRect(438,315,88,47);ctx.fillStyle='#8e7958';ctx.fillRect(444,321,76,35);ctx.fillStyle='#b6a17a';ctx.fillRect(449,326,66,25);ctx.fillStyle='#5b4938';ctx.fillRect(162,382,210,24);ctx.fillStyle='#8e8062';ctx.fillRect(170,388,194,12);ctx.fillStyle='#303a34';ctx.fillRect(178,413,46,66);ctx.fillStyle='#9a8b6a';ctx.fillRect(182,418,38,12);ctx.fillStyle='#252c27';ctx.fillRect(245,413,50,58);ctx.fillStyle='#77745f';ctx.fillRect(250,418,40,9);ctx.fillStyle='#454b40';ctx.fillRect(312,413,48,58);ctx.fillStyle='#b7a17b';ctx.fillRect(317,418,38,9);
  // Bed, folded blanket, bedside cabinet and lamp.
  ctx.fillStyle='#343a34';ctx.fillRect(720,455,190,105);ctx.fillStyle='#a79a7b';ctx.fillRect(728,463,174,88);ctx.fillStyle='#d0c3a2';ctx.fillRect(738,470,56,30);ctx.fillStyle=floor%2?'#56675b':'#665d73';ctx.fillRect(798,470,94,75);ctx.fillStyle='#8e7958';ctx.fillRect(805,477,80,8);ctx.fillStyle='#4b4538';ctx.fillRect(675,477,34,46);ctx.fillStyle='#9b8a67';ctx.fillRect(680,482,24,8);ctx.fillStyle='#e0bd79';ctx.beginPath();ctx.arc(692,474,7,0,Math.PI*2);ctx.fill();
  // Wall shelves, framed photographs and a cracked wall clock.
  ctx.fillStyle='#403a30';ctx.fillRect(610,195,145,12);for(let i=0;i<4;i++){ctx.fillStyle=['#8d7654','#64715b','#a18d68','#596a69'][i];ctx.fillRect(618+i*32,177,23,18);}ctx.fillStyle='#262c27';ctx.fillRect(820,188,58,55);ctx.fillStyle='#9a8d70';ctx.fillRect(824,192,50,47);ctx.fillStyle='#3b4a40';ctx.fillRect(830,198,18,30);ctx.fillStyle='#78624b';ctx.fillRect(852,198,16,30);ctx.strokeStyle='#d0bd91';ctx.lineWidth=2;ctx.beginPath();ctx.arc(920,218,16,0,Math.PI*2);ctx.moveTo(920,218);ctx.lineTo(920,207);ctx.moveTo(920,218);ctx.lineTo(928,222);ctx.stroke();
  // Household clutter and scattered papers add scale without blocking movement.
  ctx.globalAlpha=.55;for(let i=0;i<9;i++){const x=170+(i*83+variant*29)%760,y=590+(i*19+floor*13)%48;ctx.fillStyle=i%2?'#b3a17c':'#343a32';ctx.save();ctx.translate(x,y);ctx.rotate((i%3-1)*.18);ctx.fillRect(-8,-4,16,8);ctx.restore();}ctx.globalAlpha=1;
  const light=ctx.createRadialGradient(690,475,5,690,475,175);light.addColorStop(0,'#e6c58a22');light.addColorStop(1,'#e6c58a00');ctx.fillStyle=light;ctx.fillRect(520,320,360,300);ctx.restore();}

function drawHomeRoomPartitions(id){
 if(!/residential|apartment|farmhouse|motel|safehouse/.test(id))return;
 ctx.save();
 // Four connected rooms: lounge, storage, kitchen and bedroom.
 ctx.fillStyle='#292f28';ctx.fillRect(594,160,13,76);ctx.fillRect(594,292,13,48);ctx.fillRect(594,355,13,102);ctx.fillRect(594,514,13,146);
 ctx.fillStyle='#9a8663';ctx.fillRect(591,232,19,4);ctx.fillRect(591,510,19,4);
 ctx.fillStyle='#4d493c';ctx.fillRect(150,494,225,10);ctx.fillRect(150,494,10,70);
 ctx.fillStyle='#b6a17a';ctx.globalAlpha=.55;ctx.font='bold 10px system-ui';ctx.textAlign='center';
 ctx.fillText('ГОСТИНАЯ',280,175);ctx.fillText('КЛАДОВАЯ',780,175);ctx.fillText('КУХНЯ',270,650);ctx.fillText('СПАЛЬНЯ',790,650);
 ctx.globalAlpha=1;
 // Rugs, worn floorboards and door thresholds distinguish the rooms.
 ctx.fillStyle='#8c745322';ctx.fillRect(175,190,165,105);ctx.strokeStyle='#a58d6544';ctx.strokeRect(175,190,165,105);
 ctx.fillStyle='#52614b22';ctx.fillRect(650,385,265,190);ctx.strokeStyle='#a58d6544';ctx.strokeRect(650,385,265,190);
 ctx.restore();
}
function drawHomeInteractables(b,floor){
 if(!isHomeBuilding(b))return;
 const loot=homeFurnitureLoot[b.id]?.[floor-1]||[];
 ctx.save();
 for(let i=0;i<homeFurnitureSlots.length;i++){
  const p=homeFurnitureSlots[i],v=loot[i],x=p.x,y=p.y,empty=v?.picked===true;
  ctx.fillStyle='#171d18aa';ctx.fillRect(x-39,y-29,78,54);
  ctx.fillStyle=i===0?'#62513b':i===1?'#594b3b':'#5b5141';ctx.fillRect(x-34,y-25,68,45);
  ctx.fillStyle='#9b8159';ctx.fillRect(x-34,y-25,68,7);
  ctx.strokeStyle='#292d26';ctx.lineWidth=2;ctx.strokeRect(x-34,y-25,68,45);
  ctx.fillStyle='#c0a477';ctx.fillRect(x-3,y-7,6,10);
  if(empty){ctx.fillStyle='#272d27';ctx.fillRect(x-31,y-15,62,32);ctx.fillStyle='#8b8062';ctx.fillRect(x-29,y-13,58,4);}
  ctx.fillStyle=empty?'#8f927f':'#f0d49a';ctx.font='bold 9px system-ui';ctx.textAlign='center';ctx.fillText(empty?'ПУСТО':'E · ПОИСК',x,y-34);
 }
 // Handheld radio, a bed and a repair bench are usable home fixtures.
 ctx.fillStyle='#303a34';ctx.fillRect(485,208,70,38);ctx.fillStyle='#8e7958';ctx.fillRect(490,213,60,8);ctx.fillStyle='#a9b08a';ctx.fillRect(500,225,19,13);ctx.fillStyle='#b49a70';ctx.fillRect(527,224,18,3);ctx.fillRect(527,231,18,3);ctx.strokeStyle='#b6a17a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(540,208);ctx.lineTo(550,190);ctx.stroke();
 ctx.fillStyle='#f0d49a';ctx.font='bold 9px system-ui';ctx.fillText('E · РАДИО',520,199);
 ctx.fillStyle='#f0d49a';ctx.fillText('E · ОТДОХНУТЬ',810,575);
 ctx.fillText('E · РЕМОНТ ОРУЖИЯ',520,445);
 ctx.restore();
}
function drawInteriorStairwell(floor,maxFloor){ctx.save();ctx.fillStyle='#292f2a';ctx.fillRect(818,548,74,88);ctx.fillRect(900,548,54,88);ctx.strokeStyle='#161d18';ctx.lineWidth=5;ctx.strokeRect(818,548,74,88);ctx.strokeRect(900,548,54,88);for(let i=0;i<7;i++){ctx.fillStyle=i%2?'#8b7959':'#6d644f';ctx.fillRect(824+i*2,555+i*10,61-i*5,7);ctx.fillStyle='#b29a6b';ctx.fillRect(824+i*2,555+i*10,61-i*5,2);}for(let i=0;i<6;i++){ctx.fillStyle=i%2?'#817458':'#5d5949';ctx.fillRect(906+i*2,558+i*10,42-i*4,7);}ctx.strokeStyle='#a28e68';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(821,550);ctx.lineTo(880,615);ctx.moveTo(903,550);ctx.lineTo(946,615);ctx.stroke();ctx.fillStyle='#f0d8a0';ctx.font='bold 10px system-ui';ctx.textAlign='center';if(floor<maxFloor)ctx.fillText('E · ВВЕРХ',855,644);if(floor>1)ctx.fillText('E · ВНИЗ',926,644);ctx.restore();}
function drawInteriorMap(){const b=buildings.find(v=>v.id===activeInterior.buildingId);if(!b){exitBuilding();return;}const floor=activeInterior.floor,entry=buildingLoot[b.id]?.[floor-1],id=b.id.toLowerCase(),variant=[...id].reduce((n,ch)=>n+ch.charCodeAt(0),floor*7)%3;ctx.clearRect(0,0,w,h);ctx.save();ctx.translate(w/2-state.x,h/2-state.y);
 // A fully separate, bounded interior map with tiled flooring, walls and connected rooms.
 ctx.fillStyle='#111813';ctx.fillRect(100,70,900,650);ctx.fillStyle=/hospital|clinic|pharmacy/.test(id)?'#77786a':/factory|warehouse|plant|mill|garage|depot/.test(id)?'#494d43':/police|prison|bunker/.test(id)?'#555e59':/market|shop|mall/.test(id)?'#655b48':'#625d4d';ctx.fillRect(132,100,836,570);
 for(let y=108;y<665;y+=42)for(let x=138;x<960;x+=42){const n=(Math.floor(x/42)*7+Math.floor(y/42)*11+floor*3+b.id.length)%9;ctx.fillStyle=n===0?'#b1a17b20':n===3?'#171d1930':'#d0c5a01a';ctx.fillRect(x,y,39,39);ctx.strokeStyle='#282e28';ctx.lineWidth=1;ctx.strokeRect(x,y,39,39);if(n===5){ctx.fillStyle='#252a24';ctx.fillRect(x+8,y+13,12,2);}}
 // Exterior walls and inner partitions leave visible doorways between rooms.
 ctx.fillStyle='#30372f';ctx.fillRect(112,72,876,28);ctx.fillRect(112,72,24,630);ctx.fillRect(964,72,24,630);ctx.fillRect(112,700,376,24);ctx.fillRect(612,700,376,24);ctx.fillRect(112,72,24,630);
 ctx.fillRect(132,340,265,16);ctx.fillRect(500,340,205,16);ctx.fillRect(810,340,158,16);ctx.fillRect(397,340,103,16);ctx.fillRect(705,340,105,16);
 ctx.fillStyle='#9b8b68';ctx.fillRect(490,696,120,9);ctx.fillStyle='#17211a';ctx.fillRect(488,670,124,34);ctx.fillStyle='#d9c38f';ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillText('ВЫХОД · E',550,658);
 // Windows, broken glass and emergency lighting.
 for(let x=180;x<930;x+=190){ctx.fillStyle='#1a3030';ctx.fillRect(x,83,76,10);ctx.fillStyle='#8eaa9c';ctx.globalAlpha=.55;ctx.fillRect(x+4,85,30,5);ctx.fillRect(x+40,85,30,5);ctx.globalAlpha=1;}
 ctx.fillStyle='#4c493d';ctx.fillRect(210,205,150,42);ctx.fillRect(710,205,150,42);ctx.fillRect(440,382,160,52);ctx.fillRect(210,465,105,72);ctx.fillRect(785,455,105,72);ctx.fillRect(610,545,90,38);
 ctx.fillStyle='#8b7958';ctx.fillRect(220,210,130,8);ctx.fillRect(720,210,130,8);ctx.fillStyle='#242b25';for(let i=0;i<5;i++){ctx.fillRect(230+i*24,220,14,20);ctx.fillRect(730+i*24,220,14,20);}ctx.fillStyle='#77745f';ctx.fillRect(450,390,140,10);ctx.fillStyle='#292f29';ctx.fillRect(458,405,124,22);
 // Storage crate and weapon locker are independent, persistent search points on each floor.
 drawSupplyCrate(281,294,1.18,/lab|bunker|prison/.test(id)?'military':/hospital|clinic|pharmacy/.test(id)?'medical':'field',!!entry?.picked);ctx.fillStyle=entry&&!entry.picked?'#f1d49a':'#a3a08b';ctx.font='bold 11px system-ui';ctx.fillText(entry&&!entry.picked?'E · ОБЫСКАТЬ':'ЯЩИК ПУСТ',281,258);
 ctx.fillStyle='#303832';ctx.fillRect(750,270,62,48);ctx.fillStyle='#70776b';ctx.fillRect(755,275,52,38);ctx.fillStyle='#b6a17a';ctx.fillRect(755,288,52,6);ctx.strokeStyle='#252b26';ctx.strokeRect(750,270,62,48);if(entry?.weaponDrop&&!entry.weaponPicked){ctx.fillStyle='#e9d29a';ctx.fillText('E · ОРУЖИЕ',781,258);ctx.save();ctx.translate(781,291);ctx.rotate(-.15);ctx.fillStyle='#202923';ctx.fillRect(-22,-3,44,6);ctx.fillStyle='#aeb4a7';ctx.fillRect(12,-5,10,3);ctx.restore();}else{ctx.fillStyle='#aaa58f';ctx.fillText('ШКАФ',781,258);}
 ctx.fillStyle='#6a624e';ctx.fillRect(490,455,60,34);ctx.fillStyle='#9d865c';ctx.fillRect(494,459,52,26);ctx.fillStyle='#d8c18a';ctx.fillText('РАБОЧИЙ СТОЛ',520,448);
 // Building-specific fixtures make each generated interior read like its real-world location.
 if(/hospital|clinic|pharmacy/.test(id)){for(let i=0;i<3;i++){const bx=170+i*245;ctx.fillStyle='#4b514b';ctx.fillRect(bx,535,150,48);ctx.fillStyle='#c4bda3';ctx.fillRect(bx+8,540,134,31);ctx.fillStyle='#87968c';ctx.fillRect(bx+18,543,42,24);ctx.fillStyle='#303a35';ctx.fillRect(bx+4,582,142,6);}ctx.fillStyle='#a34e40';ctx.fillRect(920,430,18,58);ctx.fillRect(900,450,58,18);}
 else if(/police|prison|bunker/.test(id)){ctx.fillStyle='#28332f';for(let x=720;x<930;x+=18){ctx.fillRect(x,380,5,140);ctx.fillRect(x,380,5,140);}ctx.fillStyle='#8b7958';ctx.fillRect(160,550,180,18);ctx.fillStyle='#303b35';ctx.fillRect(170,570,160,42);ctx.fillStyle='#b4a27c';ctx.fillRect(185,560,26,8);ctx.fillRect(225,560,26,8);}
 else if(/factory|warehouse|plant|mill|garage|depot/.test(id)){ctx.fillStyle='#343d37';for(let i=0;i<4;i++){const x=175+i*210;ctx.fillRect(x,145,36,115);ctx.fillStyle='#8a8062';ctx.fillRect(x-5,145,46,8);ctx.fillStyle='#343d37';ctx.fillRect(x+12,260,12,75);ctx.fillStyle='#77745f';ctx.fillRect(x-10,326,56,14);}ctx.strokeStyle='#8a8062';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(160,165);ctx.lineTo(940,165);ctx.stroke();}
 else if(/market|shop|mall/.test(id)){for(let row=0;row<3;row++){const y=390+row*72;ctx.fillStyle='#393f37';ctx.fillRect(170,y,760,12);for(let x=190;x<920;x+=44){ctx.fillStyle=['#8b8060','#5e7160','#94714f'][((x+y+variant)%3)];ctx.fillRect(x,y-18,27,16);}}}
 else{ctx.fillStyle=variant===0?'#554b3c':'#4b5145';ctx.fillRect(170,380,170,96);ctx.fillStyle='#a48f68';ctx.fillRect(185,392,140,10);ctx.fillStyle='#353c34';ctx.fillRect(760,380,160,80);ctx.fillStyle='#77745f';ctx.fillRect(775,392,130,12);ctx.fillStyle='#8b8060';ctx.fillRect(810,520,80,42);}
 drawHomeRoomPartitions(id);drawResidentialInteriorDetails(id,variant,floor);drawHomeInteractables(b,floor);
 if(variant===1){ctx.fillStyle='#272e29';ctx.fillRect(385,120,10,185);ctx.fillRect(690,365,10,185);ctx.fillStyle='#a28e66';ctx.fillRect(370,300,40,7);ctx.fillRect(675,545,40,7);}
 else if(variant===2){ctx.fillStyle='#49453b';ctx.fillRect(145,600,230,28);ctx.fillRect(730,600,230,28);ctx.fillStyle='#8a7958';ctx.fillRect(155,606,210,5);ctx.fillRect(740,606,210,5);}
 if(b.floors>1){drawInteriorStairwell(floor,b.floors);}
 if(b.id==='power_plant'){ctx.fillStyle='#303b35';ctx.fillRect(745,550,92,48);ctx.fillStyle=generatorOnline?'#9be58b':'#a34e40';ctx.fillRect(758,562,12,12);ctx.fillStyle='#c2ae7e';ctx.fillRect(780,562,42,6);ctx.fillStyle='#ead39b';ctx.fillText(generatorRepaired?'E · ЭЛЕКТРОСЕТЬ':'E · РЕМОНТ ГЕНЕРАТОРА',791,540);}
 if(b.role==='shelter'){ctx.fillStyle='#555d4b';ctx.fillRect(180,555,210,34);ctx.fillStyle='#a89a78';ctx.fillRect(190,560,52,22);ctx.fillRect(260,560,52,22);ctx.fillStyle='#ead39b';ctx.fillText(lootedShelters.has(b.id)?'ЗАПАСЫ ПУСТЫ':'E · ЗАПАСЫ УБЕЖИЩА',285,548);}
 drawAbandonedDetails(b,floor);
 ctx.fillStyle='#d7c28e';ctx.font='bold 17px system-ui';ctx.fillText(buildingTitle(b),550,132);ctx.font='12px system-ui';ctx.fillStyle='#d6d0b6';ctx.fillText('ОТДЕЛЬНАЯ ЛОКАЦИЯ · ЭТАЖ '+floor+'/'+b.floors,550,153);
 // Dust motes and a subtle overhead light pool give the interior its own atmosphere.
 const glow=ctx.createRadialGradient(550,350,40,550,350,390);glow.addColorStop(0,'#f2dca018');glow.addColorStop(1,'#f2dca000');ctx.fillStyle=glow;ctx.fillRect(132,100,836,570);
 if(isHomeBuilding(b)&&(worldClock>.62||worldClock<.08)&&!generatorOnline){ctx.fillStyle='#080d0bd0';ctx.fillRect(132,100,836,570);if(saved.flashlight){const beam=ctx.createRadialGradient(state.x,state.y,10,state.x,state.y,220);beam.addColorStop(0,'#f1dca044');beam.addColorStop(.55,'#f1dca01b');beam.addColorStop(1,'#f1dca000');ctx.fillStyle=beam;ctx.fillRect(132,100,836,570);}}drawRemotePlayers();ctx.restore();drawPlayer();updateHud();ctx.save();ctx.fillStyle='#111710c9';ctx.fillRect(12,12,220,42);ctx.strokeStyle='#bda779';ctx.strokeRect(12,12,220,42);ctx.fillStyle='#f0d8a0';ctx.font='bold 12px system-ui';ctx.textAlign='left';ctx.fillText('E · ОБЫСКАТЬ / ЛЕСТНИЦА    ESC · ВЫХОД',22,38);ctx.restore();drawWind();}
function interactInterior(){const b=buildings.find(v=>v.id===activeInterior?.buildingId);if(!b)return;const floor=activeInterior.floor,entry=buildingLoot[b.id]?.[floor-1],d=(x,y)=>Math.hypot(state.x-x,state.y-y),coop=window.ApocalypseCoop;if(d(550,680)<78){exitBuilding();return;}if(b.floors>1&&floor<b.floors&&d(850,590)<72){const next=floor+1;activeInterior.floor=next;buildingFloors[b.id]=next;state.x=550;state.y=590;save();toast('Поднялся по лестнице · этаж '+next+'/'+b.floors);if(coop?.room?.status==='running')coop.send({kind:'building-floor',buildingId:b.id,floor:next});return;}if(b.floors>1&&floor>1&&d(920,590)<72){const next=floor-1;activeInterior.floor=next;buildingFloors[b.id]=next;state.x=550;state.y=590;save();toast('Спустился по лестнице · этаж '+next+'/'+b.floors);if(coop?.room?.status==='running')coop.send({kind:'building-floor',buildingId:b.id,floor:next});return;}
 if(isHomeBuilding(b)){
  const furniture=homeFurnitureSlots.map((p,index)=>({p,index,d:d(p.x,p.y)})).sort((a,b)=>a.d-b.d)[0];
  if(furniture&&furniture.d<76){const slot=homeFurnitureLoot[b.id]?.[floor-1]?.[furniture.index];if(!slot||slot.picked){toast('В этом шкафу больше ничего нет');return;}const icons={food:'🥫',cleanWater:'💧',bandage:'🩹',wood:'🪵',scrap:'⚙️',bolts:'🔩',medInjector:'💉',weaponParts:'🔧',electronicsPack:'🔌'};openLootTransfer('Тайник в мебели','Предметы не попадают в рюкзак автоматически. Перетащи находку в правую область.',[{icon:icons[slot.item]||'📦',name:slot.item,count:slot.count}],(item,count)=>{slot.picked=true;state[slot.item]=Math.min(999999,(state[slot.item]||0)+count);return true;});return;}
  if(d(810,505)<88){if(homeRestedDay[b.id]===state.day){toast('Сегодня ты уже отдыхал в этом доме');return;}if(state.food<1){toast('Для отдыха нужна 1 порция еды');return;}state.food--;state.hp=Math.min(100,state.hp+25);state.stamina=maxStamina();state.hydration=Math.max(0,state.hydration-3);homeRestedDay[b.id]=state.day;save();updateHud();toast('Ты отдохнул в кровати: +25 здоровья и восстановлена выносливость');return;}
  if(d(520,455)<82){if(homeWorkbenchDay[b.id]===state.day){toast('Верстак уже использовался сегодня');return;}if(state.weaponDurability>=100){toast('Оружие уже полностью исправно');return;}if(state.scrap<2||state.weaponParts<1){toast('Ремонт требует 2 металла и 1 деталь оружия');return;}state.scrap-=2;state.weaponParts--;state.weaponDurability=Math.min(100,state.weaponDurability+35);homeWorkbenchDay[b.id]=state.day;save();updateHud();toast('Оружие отремонтировано: +35 прочности');return;}
  if(d(520,225)<78){if(homeRadioDay[b.id]===state.day){toast('Радио уже передавало сигнал сегодня');return;}const next=explorationCaches.map((p,i)=>({p,i,d:Math.hypot(state.x-p.x,state.y-p.y)})).filter(v=>!foundCaches.has(v.i)&&v.d<6500).sort((a,b)=>a.d-b.d)[0];if(!next){toast('Радио шипит: поблизости нет новых сигналов');return;}if(state.electronicsPack<1){toast('Для радио нужен 1 комплект электроники');return;}state.electronicsPack--;state.survivorTrust=Math.min(100,state.survivorTrust+2);homeRadioDay[b.id]=state.day;activeWaypoint={name:'Радиосигнал · припасы',x:next.p.x,y:next.p.y};save();updateHud();toast('Сигнал пойман: на карте отмечено место с припасами');return;}
 }
 const remains=interiorRemains(b,floor).sort((a,b)=>d(a.x,a.y)-d(b.x,b.y))[0];if(remains&&d(remains.x,remains.y)<62){const key=b.id+':'+floor;if(!interiorEvidence[key]){const medical=/hospital|clinic|pharmacy/.test(b.id);openLootTransfer('Обыск останков','Аккуратно забери найденное снаряжение. Перетащи его в рюкзак.',[{icon:medical?'🩹':'⚙️',name:medical?'Аптечка':'Металлолом',count:1}],()=>{interiorEvidence[key]=true;if(medical)state.bandage++;else state.scrap++;return true;});}else toast('Здесь уже нечего искать');return;}if(b.id==='power_plant'&&d(791,574)<92){if(generatorRepaired){generatorOnline=!generatorOnline;toast(generatorOnline?'Электросеть включена':'Электросеть отключена');}else if(state.scrap>=8&&state.electronicsPack>=2&&state.bolts>=4){state.scrap-=8;state.electronicsPack-=2;state.bolts-=4;generatorRepaired=true;generatorOnline=true;toast('Генератор восстановлен · электросеть запущена');if(coop?.room?.status==='running')coop.send({kind:'generator-state',repaired:true,online:true});}else{toast('Нужно: 8 металла, 2 электроники и 4 крепежа');}save();return;}if(b.role==='shelter'&&!lootedShelters.has(b.id)&&d(285,570)<110){if(!Array.isArray(shelterLoot[b.id]))shelterLoot[b.id]=[{icon:'🥫',name:'Консервы',key:'food',count:3},{icon:'🩹',name:'Аптечка',key:'bandage',count:1},{icon:'🪵',name:'Дерево',key:'wood',count:2}];openLootTransfer('Запасы убежища','Здесь есть еда, аптечка и древесина. Перетащи нужное в рюкзак.',shelterLoot[b.id],(item,count)=>{state[item.key]=Math.min(999999,(state[item.key]||0)+count);const found=shelterLoot[b.id].find(v=>v.key===item.key);if(found)found.count=0;shelterLoot[b.id]=shelterLoot[b.id].filter(v=>v.count>0);if(!shelterLoot[b.id].length){lootedShelters.add(b.id);state.survivorTrust++;}return true;});return;}if(entry&&!entry.picked&&d(281,293)<82){const item=entry.item,icons={medInjector:'💉',energyDrink:'⚡',armorPlate:'🛡️',ammoCrate:'📦',weaponParts:'🔧',electronicsPack:'🔌',cleanWater:'💧'};openLootTransfer('Ящик снабжения','Открой ящик и перетащи содержимое в свой рюкзак.',[{icon:icons[item]||'📦',name:({medInjector:'Медицинский инъектор',energyDrink:'Энергетик',armorPlate:'Бронепластина',ammoCrate:'Ящик патронов',weaponParts:'Детали оружия',electronicsPack:'Комплект электроники',cleanWater:'Чистая вода'})[item]||item,key:item,count:1}],(loot,count)=>{entry.picked=true;state[item]=Math.min(999999,(state[item]||0)+count);if(b.id==='water_treatment'&&state.waterFilterLevel<1)state.waterFilterLevel=1;else if(state.waterFilterLevel<2&&Math.random()<.08)state.waterFilterLevel++;if(coop?.room?.status==='running')coop.send({kind:'building-loot-claimed',buildingId:b.id,floor,slot:'loot'});return true;});return;}if(entry?.weaponDrop&&!entry.weaponPicked&&d(781,293)<82){openLootTransfer('Оружейный шкаф','Забери оружие и патроны вручную: перетащи находку в рюкзак.',[{icon:'🔫',name:entry.weaponDrop==='pistol'?'Пистолет':entry.weaponDrop==='shotgun'?'Дробовик':'Винтовка',count:1}],()=>{entry.weaponPicked=true;state.firearm=entry.weaponDrop;state.ammo=Math.min(ammoCapacity(),state.ammo+entry.weaponAmmo);if(coop?.room?.status==='running')coop.send({kind:'building-loot-claimed',buildingId:b.id,floor,slot:'weapon'});return true;});return;}toast('Осмотри останки, ящик, оружейный шкаф или лестницу');}
function drawPlayer(){const moving=Math.hypot(moveX,moveY)>.08||['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].some(k=>keys.has(k));const action=playerAction.until>performance.now()?playerAction:null;drawSurvivor(w/2,h/2,colors,0,moving,false,'',action);}
function drawFlashlight(){
 if(!saved.flashlight||!(worldClock>.62||worldClock<.08)||prefs.effects==='low')return;
 ctx.save();ctx.globalCompositeOperation='screen';
 const x=w/2,y=h/2,r=Math.min(230,Math.max(145,w*.23));
 const glow=ctx.createRadialGradient(x,y,12,x,y,r);
 glow.addColorStop(0,'#ffe6ad38');glow.addColorStop(.38,'#f6d9951b');glow.addColorStop(1,'#f6d99500');
 ctx.fillStyle=glow;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.restore();
}
function advanceGameDay(){state.day=Math.max(1,Number(state.day)||1)+1;state.quest=0;state.dayReward=0;state.contractDay=state.day;state.contractType=['wood','kills','salvage'][state.day%3];state.contractProgress=0;state.contractClaimed=false;wrecks.forEach(v=>v.done=false);const safeBonus=state.safehouseLevel;if(safeBonus){state.scrap+=safeBonus*2;if(safeBonus>=2)state.cleanWater++;toast('Убежище принесло припасы: +'+(safeBonus*2)+' металла'+(safeBonus>=2?' и чистая вода':''));}if(state.crewCount>0){if(state.crewRole==='scavenger')state.scrap+=state.crewCount*2;else if(state.crewRole==='medic')state.bandage+=state.crewCount;else state.armorPlate+=state.crewCount;}if(state.campfireBuilt)state.campfireFuel=Math.min(99,state.campfireFuel+2);if(state.safehouseLevel>0&&state.day%3===0&&state.raidDay!==state.day&&!randomEventSites.some(v=>v.type==='horde'&&v.source==='safehouse-raid')){const raidStrength=Math.max(1,3+state.safehouseLevel*2-(state.crewRole==='guard'?state.crewCount:0)),count=Math.min(raidStrength,Math.max(0,prefs.infectedCap-zombies.length));if(count>0){const id='safehouse-raid-'+state.day,site={id,type:'horde',source:'safehouse-raid',x:survivorCamp.bench.x+150,y:survivorCamp.bench.y+90,remaining:count,spawned:count};randomEventSites.push(site);for(let i=0;i<count;i++){const a=i*2.399,r=95+(i%3)*25;spawnZombie(site.x+Math.cos(a)*r,site.y+Math.sin(a)*r,['runner','crawler','brute','night','night'][i%5],id);}state.raidDay=state.day;toast('ТРЕВОГА: убежище атакует орда!');}}save();const coop=window.ApocalypseCoop;if(coop?.room?.status==='running'&&coop.isOwner())coop.send({kind:'world',...window.ApocalypseGame?.getWorldState?.()});toast('Наступил новый день · День '+state.day);}
function moveZombiePathStep(z,dx,dy,distance){const nx=z.x+dx*distance,ny=z.y+dy*distance;if(!blocked(nx,z.y)){z.x=nx;if(!blocked(z.x,ny)){z.y=ny;return true;}}const sides=[{x:-dy,y:dx},{x:dy,y:-dx}].sort((a,b)=>Math.hypot(z.x+a.x*distance-state.x,z.y+a.y*distance-state.y)-Math.hypot(z.x+b.x*distance-state.x,z.y+b.y*distance-state.y));for(const side of sides){const sx=z.x+side.x*distance,sy=z.y+side.y*distance;if(!blocked(sx,z.y)){z.x=sx;if(!blocked(z.x,sy))z.y=sy;return true;}if(!blocked(z.x,sy)){z.y=sy;return true;}}return false;}
function spawnZombie(x,y,kind='night',eventId=''){if(zombies.length>=prefs.infectedCap)return;const stats={alpha:[520,46,21],brute:[105,42,12],runner:[28,112,5],stalker:[48,88,8],patrol:[40,58,6],night:[40,64,6],day:[40,64,6],armored:[190,32,17],spitter:[54,48,7],screecher:[72,50,6],crawler:[62,76,10],bloater:[145,24,14],lurker:[44,104,8]};const v=stats[kind]||stats.night;zombies.push({id:++zombieId,x,y,kind,hp:v[0],maxHp:v[0],speed:v[1],damage:v[2],attackAt:0,rangedAt:0,screamAt:0,phase:Math.random()*6.28,born:performance.now(),emerge:1750,patrolX:x,patrolY:y,eventId:String(eventId||'')});}
for(const site of randomEventSites.filter(v=>v.type==='horde'&&Number(v.remaining)>0)){const count=Math.min(Number(site.remaining)||0,prefs.infectedCap-zombies.length);for(let i=0;i<count;i++){const angle=i*2.399,dist=90+(i%3)*24,kind=site.source==='alpha-hunt'?(i===0?'alpha':i===1?'runner':'crawler'):['brute','crawler','runner','night','night'][i%5];spawnZombie(site.x+Math.cos(angle)*dist,site.y+Math.sin(angle)*dist,kind,site.id);}}
for(const site of randomEventSites.filter(v=>['campaign-wave','campaign-convoy','campaign-extract'].includes(v.type)&&Number(v.remaining)>0)){const count=Math.min(Number(site.remaining)||0,prefs.infectedCap-zombies.length);for(let i=0;i<count;i++){const angle=i*2.399,dist=95+(i%4)*26,kind=['runner','crawler','night','brute','armored','stalker'][i%6];spawnZombie(site.x+Math.cos(angle)*dist,site.y+Math.sin(angle)*dist,kind,site.id);}}
function updateZombies(dt,now){
 if(!gameActive||activeInterior)return;
 const coop=window.ApocalypseCoop;
 if(!coop?.room||coop.isOwner()){const clockDt=Math.max(0,Math.min(.05,Number(dt)||0));const previousClock=worldClock;worldClock=(worldClock+clockDt/480)%1;if(worldClock<previousClock)advanceGameDay();}
 applyInfectionDamage(now);
 const night=worldClock>.62||worldClock<.08;
 const canSpawn=!coop?.room||coop.isOwner();
 if(canSpawn&&now-lastZombieSpawn>=ZOMBIE_INTERVAL){
  lastZombieSpawn=now;
  if(Math.random()<.42){
   const nearbyBuildings=buildings.filter(b=>Math.hypot(b.x+b.w/2-state.x,b.y-b.floors*17+b.h/2-state.y)<1100);const byBuilding=nearbyBuildings.length>0&&Math.random()<.42,b=byBuilding?nearbyBuildings[Math.floor(Math.random()*nearbyBuildings.length)]:null;
   let cx=state.x+(Math.random()-.5)*300,cy=state.y+(Math.random()-.5)*260;
   const count=byBuilding?1+Math.floor(Math.random()*2):1;
   if(byBuilding){
    const top=b.y-b.floors*34,side=Math.floor(Math.random()*4);
    if(side===0){cx=b.x-82;cy=top+Math.random()*(b.floors*34+b.h);}
    else if(side===1){cx=b.x+b.w+82;cy=top+Math.random()*(b.floors*34+b.h);}
    else if(side===2){cx=b.x+Math.random()*b.w;cy=top-82;}
    else{cx=b.x+Math.random()*b.w;cy=b.y+b.h+82;}
   }
   for(let i=0;i<count;i++){
    let x=cx+(Math.random()-.5)*(byBuilding?56:50),y=cy+(Math.random()-.5)*(byBuilding?56:50),tries=0;
    while(blocked(x,y)&&tries++<8){x=cx+(Math.random()-.5)*150;y=cy+(Math.random()-.5)*150;}
    if(blocked(x,y))continue;
    const roll=Math.random();const kind=roll<.035?'bloater':roll<.075?'crawler':roll<.105?'lurker':roll<.145?'armored':roll<.20?'spitter':roll<.24?'screecher':roll<.34?'brute':roll<.48?'runner':roll<.59&&night?'stalker':(night?'night':'day');
    spawnZombie(x,y,kind);
    if(coop?.room?.status==='running')coop.send({kind:'zombie-spawn',x,y,ztype:kind});
   }
  }
 }
 for(let i=zombies.length-1;i>=0;i--){
  const z=zombies[i];const fireDistance=Math.hypot(z.x-spawnCampfire.x,z.y-spawnCampfire.y);if(spawnCampfireActive()&&fireDistance<spawnCampfireRadius()){const a=Math.atan2(z.y-spawnCampfire.y||0.001,z.x-spawnCampfire.x||0.001);z.x=spawnCampfire.x+Math.cos(a)*(spawnCampfireRadius()+18);z.y=spawnCampfire.y+Math.sin(a)*(spawnCampfireRadius()+18);z.attackAt=now+900;z.fleeUntil=now+1100;continue;}const d=Math.hypot(state.x-z.x,state.y-z.y),active=z.kind==='day'||z.kind==='horde'||z.kind==='runner'||z.kind==='brute'||z.kind==='patrol'||z.kind==='armored'||z.kind==='spitter'||z.kind==='screecher'||z.kind==='crawler'||z.kind==='bloater'||z.kind==='lurker'||!!z.eventId||night;
  if(z.kind==='patrol'&&d>=620&&now-z.born>z.emerge){const a=time*.00045+z.phase,nx=z.patrolX+Math.cos(a)*72,ny=z.patrolY+Math.sin(a)*72;if(!blocked(nx,z.y))z.x+=(nx-z.x)*Math.min(1,dt*.35);if(!blocked(z.x,ny))z.y+=(ny-z.y)*Math.min(1,dt*.35);}
  if(active&&d<620&&now-z.born>z.emerge){
   if(z.kind==='spitter'&&d>=150&&d<=360){if(now>z.rangedAt){z.rangedAt=now+3000;const angle=Math.atan2(state.y-z.y,state.x-z.x);if(acidProjectiles.length<8)acidProjectiles.push({x:z.x,y:z.y-9,vx:Math.cos(angle)*245,vy:Math.sin(angle)*245,life:1900});z.attackAnim=1;}}
   else{const dx=(state.x-z.x)/(d||1),dy=(state.y-z.y)/(d||1),direction=z.kind==='spitter'&&d<150?-1:1;moveZombiePathStep(z,dx*direction,dy*direction,z.speed*dt);}
   if(z.kind==='screecher'&&d<350&&now>z.screamAt&&(!coop?.room||coop.isOwner())){z.screamAt=now+15000;z.screamUntil=now+850;if(zombies.length<prefs.infectedCap){const angle=Math.random()*Math.PI*2,sx=z.x+Math.cos(angle)*105,sy=z.y+Math.sin(angle)*105;if(!blocked(sx,sy)){spawnZombie(sx,sy,'night');if(coop?.room?.status==='running')coop.send({kind:'zombie-spawn',x:sx,y:sy,ztype:'night'});}}playAmbientSound('scream');}
   if(alphaBoss&&d<155&&now>(z.bossPulseAt||0)&&now>respawnUntil){z.bossPulseAt=now+7600;z.bossPulseVisualUntil=now+720;state.hp=Math.max(0,state.hp-12);state.stamina=Math.max(0,state.stamina-22);triggerPlayerAction('hurt',520);toast('Удар Альфы! Волна отбросила тебя · -12 здоровья, -22 выносливости');if(state.hp<=0)showDeath();}if(d<26&&now>z.attackAt&&now>respawnUntil){z.attackAt=now+950;z.attackAnim=1;triggerPlayerAction('hurt',360);state.hp=Math.max(0,state.hp-Math.max(1,Math.round(z.damage*(state.armorLevel?Math.max(.4,.68-(state.armorLevel-1)*.07):1))));if(Math.random()<(prefs.survivalDifficulty==='hard'?.34:prefs.survivalDifficulty==='easy'?.08:.18)){state.infection=Math.min(100,state.infection+(z.kind==='bloater'?16:8));toast('Рана заражена · инфекция '+Math.round(state.infection)+'%');}if(state.hp<=0)showDeath();}
  }
  if(d>900&&!z.eventId)zombies.splice(i,1);
 }
 for(let i=acidProjectiles.length-1;i>=0;i--){const p=acidProjectiles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt*1000;if(Math.hypot(state.x-p.x,state.y-p.y)<21){acidProjectiles.splice(i,1);if(now>respawnUntil){state.hp=Math.max(0,state.hp-9);state.stamina=Math.max(0,state.stamina-10);triggerPlayerAction('hurt',420);toast('Кислота плевуна: -9 здоровья');if(state.hp<=0)showDeath();save();}continue;}if(p.life<=0||blocked(p.x,p.y))acidProjectiles.splice(i,1);}
 updateSpikeTraps(now);
 if(generatorOnline&&(!coop?.room||coop.isOwner())&&now-generatorLastPulse>2300){generatorLastPulse=now;for(let i=zombies.length-1;i>=0;i--){const z=zombies[i];if(Math.hypot(z.x-generatorConsole.x,z.y-generatorConsole.y)<320){z.hp-=12;z.shockedUntil=now+420;if(z.hp<=0){zombies.splice(i,1);progressContract('kills',1);if(z.eventId){const horde=randomEventSites.find(v=>v.id===z.eventId);if(horde){horde.remaining=Math.max(0,(Number(horde.remaining)||0)-1);if(coop?.room?.status==='running')coop.send({kind:'horde-progress',eventId:horde.id,remaining:horde.remaining});}}state.scrap++;if(coop?.room?.status==='running')coop.send({kind:'zombie-killed',x:z.x,y:z.y});}}}}
}
function drawZombies(){
 const now=performance.now();
 for(const z of zombies){
  const age=now-z.born,p=Math.max(0,Math.min(1,age/z.emerge)),rise=1-Math.pow(1-p,2),buried=1-rise;
  const alphaBoss=z.kind==='alpha',brute=z.kind==='brute'||alphaBoss,runner=z.kind==='runner',stalker=z.kind==='stalker',spitter=z.kind==='spitter',armored=z.kind==='armored',screecher=z.kind==='screecher',crawler=z.kind==='crawler',bloater=z.kind==='bloater',lurker=z.kind==='lurker';
  const active=z.kind==='day'||z.kind==='horde'||z.kind==='patrol'||spitter||armored||screecher||crawler||bloater||lurker||!!z.eventId||worldClock>.62||worldClock<.08;
  const moving=age>z.emerge,walk=moving?Math.sin(time*.0085+z.phase):Math.sin(age*.012+z.phase)*.25;
  const attack=Math.max(0,(z.attackAnim||0)-(now-(z.attackAnimAt||now))/230);
  if(z.attackAnim){z.attackAnimAt=now;z.attackAnim=Math.max(0,z.attackAnim-.075);}
  
  const alpha=(active?1:.72)*Math.min(1,p*2.5);
  ctx.save();ctx.translate(z.x,z.y);if(alphaBoss){const aura=.5+.5*Math.sin(time*.006+z.phase);ctx.globalAlpha=.18+aura*.12;ctx.strokeStyle='#e64b35';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,37+aura*7,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;ctx.fillStyle='#ff4b32';ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.fillText('АЛЬФА',0,-53);}
  // Strong contact shadow and a subtle ground rim keep the silhouette readable on grass, roads and debris.
  ctx.fillStyle='#090d0bdc';ctx.beginPath();ctx.ellipse(0,13,alphaBoss?28:brute?19:14,5,0,0,Math.PI*2);ctx.fill();if(alphaBoss&&z.bossPulseVisualUntil>now){ctx.globalAlpha=Math.max(0,(z.bossPulseVisualUntil-now)/720)*.75;ctx.strokeStyle='#f36b45';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,8,30+(1-(z.bossPulseVisualUntil-now)/720)*115,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=alpha;}
  ctx.strokeStyle='#c5b98a55';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(0,13,brute?20:15,5.8,0,0,Math.PI*2);ctx.stroke();
  if(p<1){
   for(let i=0;i<12;i++){const a=i*2.399+z.phase,dist=(1-p)*13+(i%4)*3,px=Math.cos(a)*dist,py=8+Math.sin(a)*dist*.5-(1-p)*15;
    ctx.fillStyle=i%2?'#554a32':'#a08a5c';ctx.globalAlpha=alpha*.8;ctx.beginPath();ctx.arc(px,py,1.4+(i%3)*.55,0,Math.PI*2);ctx.fill();}
  }
  ctx.globalAlpha=alpha;
  const bodyScale=alphaBoss?1.68:bloater?1.38:brute||armored?1.28:crawler?.76:runner?.92:spitter?.96:stalker?.9:screecher?.94:lurker?.9:1;
  const shapeX=crawler?1.34:runner?.82:brute?1.16:bloater?1.08:armored?1.12:spitter?1.04:1;
  const shapeY=crawler?.72:runner?1.12:brute?1.04:bloater?1.12:armored?1.08:screecher?1.13:stalker?1.1:1;
  ctx.translate(0,-buried*18+Math.sin(time*.006+z.phase)*.8);
  if(crawler)ctx.rotate(.48+walk*.045);else if(runner)ctx.rotate(-.11+walk*.025);else if(lurker)ctx.rotate(.16+Math.sin(time*.004+z.phase)*.035);
  ctx.scale(bodyScale*shapeX,bodyScale*shapeY);
  // Silhouette outline is deliberately brighter than the ground palette.
  ctx.save();ctx.translate(0,buried*16);ctx.scale(1,Math.max(.12,rise));
  ctx.strokeStyle='#171d18';ctx.lineWidth=8;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(-3,4);ctx.lineTo(-5+walk*5,15);ctx.moveTo(3,4);ctx.lineTo(5-walk*5,15);ctx.stroke();
  ctx.strokeStyle=brute?'#776b59':'#8a8065';ctx.lineWidth=4.5;
  ctx.beginPath();ctx.moveTo(-3,4);ctx.lineTo(-5+walk*5,15);ctx.moveTo(3,4);ctx.lineTo(5-walk*5,15);ctx.stroke();
  // Torn trousers and moving feet.
  ctx.fillStyle='#353c31';ctx.beginPath();ctx.moveTo(-7,1);ctx.lineTo(-1,1);ctx.lineTo(-3+walk*3,13);ctx.lineTo(-10+walk*4,15);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(1,1);ctx.lineTo(7,1);ctx.lineTo(10-walk*4,15);ctx.lineTo(4-walk*3,13);ctx.closePath();ctx.fill();
  // Chest and ragged clothing, with high-contrast seams and torn edges.
  const shirt=armored?'#59645d':spitter?'#657b4b':screecher?'#77705d':brute?'#765044':runner?'#718653':stalker?'#655779':'#71805c';
  ctx.fillStyle='#171d18';ctx.beginPath();ctx.moveTo(-10,-12);ctx.lineTo(9,-12);ctx.lineTo(11,7);ctx.lineTo(5,12);ctx.lineTo(-9,9);ctx.closePath();ctx.fill();
  ctx.fillStyle=shirt;ctx.beginPath();ctx.moveTo(-8,-12);ctx.lineTo(7,-12);ctx.lineTo(9,5);ctx.lineTo(4,9);ctx.lineTo(-7,7);ctx.closePath();ctx.fill();
  ctx.fillStyle='#30392e';ctx.fillRect(-7,-7,14,3);ctx.fillStyle='#b29b70';ctx.fillRect(-6,-1,3,7);ctx.fillStyle='#c1a77a';ctx.fillRect(3,-8,2,5);
  ctx.strokeStyle='#d0bd91';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(-7,2);ctx.lineTo(-3,6);ctx.moveTo(4,-5);ctx.lineTo(7,0);ctx.stroke();
  // Shoulder joints, swinging forearms and visible clawed hands.
  for(const side of [-1,1]){
   ctx.save();ctx.translate(side*8,-8);ctx.rotate(side*(.22+walk*.32+(attack>.25?-.65*attack:0)));
   ctx.strokeStyle='#202820';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(side*5,9);ctx.stroke();
   ctx.strokeStyle=brute?'#8e6a57':'#8c9270';ctx.lineWidth=4.5;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(side*5,9);ctx.lineTo(side*4+walk*2,15);ctx.stroke();
   ctx.fillStyle='#c0a17b';ctx.beginPath();ctx.arc(side*4+walk*2,16,2.8,0,Math.PI*2);ctx.fill();
   ctx.strokeStyle='#e0c69a';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(side*4,17);ctx.lineTo(side*6,20);ctx.stroke();ctx.restore();
  }
  // Neck, face planes, jaw and scars.
  ctx.fillStyle='#b1a17b';ctx.fillRect(-3,-16,6,7);
  ctx.fillStyle=brute?'#a18a68':stalker?'#b2a887':bloater?'#9a8a68':crawler?'#8c9672':'#aaa17d';ctx.beginPath();ctx.ellipse(0,-22,bloater?10.5:brute?9.8:stalker?7.6:crawler?7.2:8.5,screecher?11.5:runner?8:bloater?10.8:9.5,stalker?-.24:-.08,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#77745c';ctx.beginPath();ctx.ellipse(-6,-22,2.6,4,-.4,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#30271e';ctx.fillRect(-5,-24,4,4);ctx.fillRect(2,-24,4,4);
  const eye=alphaBoss?'#ff2e25':spitter?'#c6ed75':screecher?'#f1d28a':armored?'#f2a56f':stalker?'#d4a4ff':brute?'#ff765c':runner?'#f2e47a':active?'#f2c56b':'#b2a47a';
  ctx.shadowColor=eye;ctx.shadowBlur=active?9:3;ctx.fillStyle=eye;ctx.fillRect(-4,-23,2.8,2.8);ctx.fillRect(3,-23,2.8,2.8);ctx.shadowBlur=0;if(alphaBoss){ctx.fillStyle='#27221c';ctx.beginPath();ctx.moveTo(-8,-27);ctx.lineTo(-15,-40);ctx.lineTo(-3,-33);ctx.lineTo(0,-39);ctx.lineTo(4,-32);ctx.lineTo(15,-41);ctx.lineTo(9,-26);ctx.closePath();ctx.fill();ctx.strokeStyle='#a8a08a';ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle='#9d3e32';ctx.fillRect(-7,-19,14,3);ctx.fillStyle='#d2a47c';ctx.fillRect(-9,-11,18,3);}
  ctx.fillStyle='#29251e';ctx.fillRect(-2,-16,5,2);ctx.strokeStyle='#554333';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-3,-15);ctx.lineTo(1,-12);ctx.lineTo(5,-15);ctx.moveTo(4,-27);ctx.lineTo(7,-24);ctx.stroke();
  if(armored){ctx.fillStyle='#3f4b48';ctx.beginPath();ctx.moveTo(-10,-12);ctx.lineTo(0,-17);ctx.lineTo(11,-11);ctx.lineTo(12,7);ctx.lineTo(4,12);ctx.lineTo(-11,7);ctx.closePath();ctx.fill();ctx.strokeStyle='#a9ad91';ctx.lineWidth=1.4;ctx.stroke();ctx.fillStyle='#8d927b';ctx.fillRect(-7,-8,14,3);ctx.fillRect(-8,1,16,3);ctx.fillStyle='#c1b68e';ctx.fillRect(-11,-9,5,7);ctx.fillRect(7,-9,5,7);}
  if(spitter){ctx.fillStyle='#81984e';ctx.beginPath();ctx.ellipse(-8,-7,5,7,-.5,0,Math.PI*2);ctx.ellipse(8,-7,5,7,.5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#c3dc78';ctx.beginPath();ctx.arc(0,-15,3,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#a6cb62';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-3,-13);ctx.lineTo(-7,-7);ctx.moveTo(3,-13);ctx.lineTo(7,-7);ctx.stroke();}
  if(screecher){ctx.strokeStyle='#d4c28c';ctx.lineWidth=2;for(let ring=0;ring<3;ring++){ctx.beginPath();ctx.arc(0,-21,11+ring*4,Math.PI*1.12,Math.PI*1.88);ctx.stroke();}if(z.screamUntil>now){ctx.strokeStyle='#e7d49b';ctx.globalAlpha=.8;ctx.beginPath();ctx.arc(0,-21,17+(now-(z.screamUntil-850))*.08,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=alpha;}}
  // Per-class silhouettes and anatomy. Every special infected gets a distinct outline.
  if(brute){
   ctx.fillStyle='#4c3930';ctx.beginPath();ctx.moveTo(-13,-12);ctx.lineTo(-17,-5);ctx.lineTo(-13,9);ctx.lineTo(13,9);ctx.lineTo(17,-5);ctx.lineTo(12,-13);ctx.closePath();ctx.fill();
   ctx.fillStyle='#94735c';ctx.fillRect(-13,-10,26,5);ctx.fillStyle='#3a3029';ctx.fillRect(-12,0,24,4);
   for(const side of [-1,1]){ctx.fillStyle='#a17a61';ctx.beginPath();ctx.arc(side*13,-8,4.5,0,Math.PI*2);ctx.fill();}
  }
  if(runner){
   ctx.strokeStyle='#9da878';ctx.lineWidth=2.2;ctx.beginPath();ctx.moveTo(-5,-8);ctx.lineTo(-9,1);ctx.lineTo(-7,9);ctx.moveTo(5,-8);ctx.lineTo(9,0);ctx.lineTo(8,8);ctx.stroke();
   ctx.fillStyle='#c2b27a';ctx.beginPath();ctx.moveTo(-5,-29);ctx.lineTo(0,-34);ctx.lineTo(6,-28);ctx.lineTo(4,-24);ctx.closePath();ctx.fill();
  }
  if(armored){
   ctx.fillStyle='#303c39';ctx.beginPath();ctx.moveTo(-12,-12);ctx.lineTo(-16,-4);ctx.lineTo(-13,10);ctx.lineTo(13,10);ctx.lineTo(16,-4);ctx.lineTo(12,-12);ctx.closePath();ctx.fill();
   ctx.strokeStyle='#a7ad96';ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle='#929b86';ctx.fillRect(-13,-8,26,3);ctx.fillRect(-14,1,28,3);
   ctx.fillStyle='#c0b99a';for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(side*8,-12);ctx.lineTo(side*13,-17);ctx.lineTo(side*16,-8);ctx.lineTo(side*9,-6);ctx.closePath();ctx.fill();}
  }
  if(spitter){
   ctx.fillStyle='#617d3e';ctx.beginPath();ctx.ellipse(-10,-5,5.5,8,-.35,0,Math.PI*2);ctx.ellipse(10,-5,5.5,8,.35,0,Math.PI*2);ctx.fill();
   ctx.strokeStyle='#b5d66c';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-10,-11);ctx.lineTo(-14,-2);ctx.moveTo(10,-11);ctx.lineTo(14,-2);ctx.stroke();
   ctx.fillStyle='#c9e77a';ctx.beginPath();ctx.arc(0,-15,3,0,Math.PI*2);ctx.fill();
  }
  if(bloater){
   ctx.fillStyle='#596044';ctx.beginPath();ctx.ellipse(0,1,13,11,0,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#a0a36a';for(let k=0;k<5;k++){ctx.beginPath();ctx.arc(-8+k*4,Math.sin(k*2)*4,2.2,0,Math.PI*2);ctx.fill();}
   ctx.strokeStyle='#c0a36f';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(-9,-5);ctx.quadraticCurveTo(0,7,9,-5);ctx.stroke();
  }
  if(crawler){
   ctx.fillStyle='#777f61';ctx.beginPath();ctx.ellipse(0,-5,11,5,.12,0,Math.PI*2);ctx.fill();
   ctx.strokeStyle='#a6a17c';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-8,-1);ctx.lineTo(-15,5);ctx.lineTo(-20,9);ctx.moveTo(8,-1);ctx.lineTo(15,5);ctx.lineTo(20,9);ctx.stroke();
   ctx.fillStyle='#b2a17a';ctx.beginPath();ctx.arc(0,-17,6.5,0,Math.PI*2);ctx.fill();
  }
  if(stalker||lurker){
   ctx.fillStyle=stalker?'#5e4e70':'#4e5a48';ctx.beginPath();ctx.moveTo(-8,-12);ctx.lineTo(-12,3);ctx.lineTo(-5,8);ctx.lineTo(7,5);ctx.lineTo(11,-10);ctx.lineTo(4,-16);ctx.closePath();ctx.fill();
   ctx.strokeStyle=stalker?'#c3a0e0':'#a5b18a';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-5,-5);ctx.lineTo(0,1);ctx.lineTo(6,-7);ctx.stroke();
  }
  if(screecher){
   ctx.fillStyle='#a69a77';ctx.beginPath();ctx.moveTo(-7,-28);ctx.lineTo(-10,-39);ctx.lineTo(-2,-32);ctx.lineTo(2,-41);ctx.lineTo(7,-28);ctx.closePath();ctx.fill();
   ctx.strokeStyle='#e6d4a1';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(-8,-30);ctx.lineTo(-2,-34);ctx.lineTo(2,-33);ctx.lineTo(8,-30);ctx.stroke();
  }
  if(z.shockedUntil>now){ctx.strokeStyle='#a6f0c5';ctx.lineWidth=1.6;ctx.shadowColor='#8cebb5';ctx.shadowBlur=10;ctx.beginPath();ctx.moveTo(-12,-7);ctx.lineTo(-5,-15);ctx.lineTo(0,-5);ctx.lineTo(7,-16);ctx.lineTo(12,-4);ctx.stroke();ctx.shadowBlur=0;}
  // Permanent light rim and animated infected veins make the body separate from the terrain.
  ctx.globalAlpha=alpha*.8;ctx.strokeStyle=stalker?'#c5a1e8':'#c2b38a';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-8,-9);ctx.lineTo(-10,-2);ctx.moveTo(8,-8);ctx.lineTo(10,0);ctx.stroke();
  for(let i=0;i<8;i++){const tx=Math.sin(i*17+z.id)*6,ty=-8+Math.cos(i*11+z.phase)*14;ctx.fillStyle=i%2?'#252d24':'#d0b78c';ctx.globalAlpha=alpha*.75;ctx.fillRect(tx,ty,1.5,1.5);}
  ctx.restore();ctx.restore();if(prefs.showEnemyHealth&&Math.hypot(state.x-z.x,state.y-z.y)<420){const ratio=Math.max(0,Math.min(1,z.hp/(z.maxHp||z.hp||1)));ctx.fillStyle='#121814cc';ctx.fillRect(z.x-17,z.y-37,34,4);ctx.fillStyle=ratio>.55?'#8dbb71':ratio>.25?'#d5a45f':'#c96a63';ctx.fillRect(z.x-17,z.y-37,34*ratio,4);}
 }
}

function showDeath(){if(deathHandled)return;deathHandled=true;gameActive=false;sprintHeld=false;keys.clear();moveX=moveY=0;save();document.getElementById('deathDay').textContent='Ты продержался до '+state.day+' дня';document.getElementById('deathOverlay').classList.remove('hidden');}
function respawn(){if(bonusLivesActive&&bonusLives<=0){toast('Три дополнительных возрождения уже использованы');return;}if(bonusLivesActive)bonusLives--;sprintHeld=false;state.hp=100;if(activeInterior){activeInterior=null;state.x=interiorReturn?.x??440;state.y=interiorReturn?.y??390;interiorReturn=null;}const safe=findSafeSpawn(state.x+150,state.y+110);state.x=safe.x;state.y=safe.y;deathHandled=false;respawnUntil=performance.now()+4000;document.getElementById('deathOverlay').classList.add('hidden');gameActive=true;save();toast('Ты вернулся. 4 секунды защиты.');}
let lastActionUiUpdate=-Infinity;
function nearbyActionLabel(){
 if(lastSignalMission&&lastSignalMission.status==='active'&&Math.hypot(state.x-lastSignalMission.x,state.y-lastSignalMission.y)<145){
  if(lastSignalMission.stage===0)return 'Проверить чёрный ящик';
  if(lastSignalMission.stage===1)return zombies.some(z=>z.eventId==='last_signal_guard')?'Зачистить место крушения':'Открыть чёрный ящик';
 }
 if(nearSpawnCampfire())return 'Подкинуть дерево в костёр';
 if(!starterKnife.picked&&Math.hypot(state.x-starterKnife.x,state.y-starterKnife.y)<74)return 'Подобрать стартовый нож';
 if(Math.hypot(state.x-survivorCamp.bench.x,state.y-survivorCamp.bench.y)<105)return 'Лавка улучшений';
 if(Math.hypot(state.x-survivorCamp.trader.x,state.y-survivorCamp.trader.y)<105)return 'Торговец';
 const lootBuilding=buildings.find(b=>b.role==='loot'&&state.x>b.x+18&&state.x<b.x+b.w-18&&state.y>b.y-b.floors*34+18&&state.y<b.y+b.h-18);
 if(lootBuilding){
  const floor=buildingFloors[lootBuilding.id]||1,roomY=lootBuilding.y+lootBuilding.h-250,cx=lootBuilding.x+lootBuilding.w/2,stairX=cx+lootBuilding.w*.29,lootX=cx-lootBuilding.w*.22,lootY=roomY+78,entry=buildingLoot[lootBuilding.id]?.[floor-1];
  if(entry?.weaponDrop&&!entry.weaponPicked&&Math.hypot(state.x-(lootX+70),state.y-(lootY+12))<72)return 'Подобрать оружие';
  if(entry&&!entry.picked&&Math.hypot(state.x-lootX,state.y-lootY)<72)return 'Забрать предмет';
  if(Math.hypot(state.x-stairX,state.y-lootY)<68)return 'Следующий этаж';
  return 'Обыскать этаж';
 }
 const indoor=buildings.find(b=>b.role&&state.x>b.x+18&&state.x<b.x+b.w-18&&state.y>b.y-b.floors*34+18&&state.y<b.y+b.h-18);
 if(indoor?.role==='generator'){
  if(Math.hypot(state.x-generatorConsole.x,state.y-generatorConsole.y)>105){toast('Подойди к пульту генератора');return;}
  const coop=window.ApocalypseCoop;
  if(!generatorRepaired){if(state.scrap<8||state.bolts<5||state.electronicsPack<1){toast('Для ремонта нужно: 8 металла, 5 крепежа и 1 комплект электроники');return;}state.scrap-=8;state.bolts-=5;state.electronicsPack--;generatorRepaired=true;generatorOnline=true;toast('Генератор восстановлен · электрополе защищает территорию');}
  else{generatorOnline=!generatorOnline;toast(generatorOnline?'Генератор включён · защита активна':'Генератор отключён');}
  save();if(coop?.room?.status==='running')coop.send({kind:'generator-state',repaired:generatorRepaired,online:generatorOnline});return;
 }
 if(indoor?.role==='generator')return Math.hypot(state.x-generatorConsole.x,state.y-generatorConsole.y)<105?(generatorRepaired?(generatorOnline?'Отключить генератор':'Включить генератор'):'Починить генератор'):'Осмотреть генератор';
 if(indoor?.role==='store'){
  const loot=storeLoot[indoor.id];
  if(loot?.weapon&&!loot.picked&&Math.hypot(state.x-(indoor.x+indoor.w/2-72),state.y-(indoor.y+indoor.h-185+76))<72)return 'Подобрать оружие';
 }
 const shelter=buildings.find(b=>b.role==='shelter'&&state.x>b.x+18&&state.x<b.x+b.w-18&&state.y>b.y-b.floors*34+18&&state.y<b.y+b.h-18);
 if(shelter&&!lootedShelters.has(shelter.id)&&Math.hypot(state.x-(shelter.x+shelter.w/2+72),state.y-(shelter.y+shelter.h-168))<82)return 'Забрать запасы';
 const cacheIndex=explorationCaches.findIndex((p,i)=>!foundCaches.has(i)&&Math.hypot(state.x-p.x,state.y-p.y)<62);
 if(cacheIndex>=0)return 'Обыскать тайник';
 if(supplyDrop&&Math.hypot(state.x-supplyDrop.x,state.y-supplyDrop.y)<72)return 'Забрать поставку';
 if(radioSignal&&Math.hypot(state.x-radioSignal.x,state.y-radioSignal.y)<98)return 'Радиосигнал';
 if(Math.hypot(state.x-mark.x,state.y-mark.y)<75)return 'Поговорить с Марком';
 if(wrecks.some(v=>!v.done&&Math.hypot(state.x-v.x,state.y-v.y)<65))return 'Обыскать машину';
 if(nearbyTrees(state.x,state.y,55).some(t=>!t.harvested&&Math.hypot(state.x-t.x,state.y-t.y)<48))return 'Собрать древесину';
 return '';
}
function updateActionButton(){
 if(time-lastActionUiUpdate<120)return;
 lastActionUiUpdate=time;
 const button=document.getElementById('action');if(!button)return;
 const touch=window.matchMedia('(max-width: 700px), (pointer: coarse)').matches;
 const label=nearbyActionLabel();
 const text=label?'<span class="ico">⚒</span>'+label+(touch?'':' · E'):'<span class="ico">⚒</span>Действие'+(touch?'':' · E');
 button.classList.remove('context-hidden');
 if(button.dataset.actionLabel!==text){button.innerHTML=text;button.dataset.actionLabel=text;}
}
function compassDirection(dx,dy){
 const angle=(Math.atan2(dx,-dy)*180/Math.PI+360)%360;
 return ['С','СВ','В','ЮВ','Ю','ЮЗ','З','СЗ'][Math.round(angle/45)%8];
}
function updateQuickbar(){
 const slots=[
  {icon:'🩹',name:'Аптечка',count:state.bandage},
  {icon:'🥫',name:'Еда',count:state.food},
  {icon:'💉',name:'Инъектор',count:state.medInjector},
  {icon:'⚡',name:'Энергетик',count:state.energyDrink},
  {icon:'📦',name:'Патроны',count:state.ammoCrate},
  {icon:state.armorPlate>0?'🛡️':'🔧',name:state.armorPlate>0?'Броня':'Детали',count:state.armorPlate>0?state.armorPlate:state.weaponParts}
 ];
 for(let i=0;i<slots.length;i++){
  const n=i+1,item=slots[i],button=document.getElementById('quickSlot'+n),icon=document.getElementById('quickSlot'+n+'Icon'),count=document.getElementById('quickSlot'+n+'Count'),name=document.getElementById('quickSlot'+n+'Name');
  if(icon)icon.textContent=item.icon;if(count)count.textContent=String(item.count);if(name)name.textContent=item.name;
  if(button){button.disabled=item.count<1;button.classList.toggle('empty',item.count<1);}
 }
}
function updateConvenienceHud(){
 const objective=document.getElementById('objectiveHud'),waypoint=document.getElementById('waypointHud'),threat=document.getElementById('threatHud');
 if(objective){
  if(campaign.status==='active'){objective.textContent=campaignObjectiveText();}
  else if(lastSignalMission&&lastSignalMission.status==='active'){
   const d=Math.hypot(lastSignalMission.x-state.x,lastSignalMission.y-state.y);
   if(lastSignalMission.stage===0)objective.textContent='ГЛАВНОЕ СОБЫТИЕ: проверь место крушения · '+Math.round(d)+' м';
   else if(lastSignalMission.stage===1){const left=zombies.filter(z=>z.eventId==='last_signal_guard').length;objective.textContent=left?'ОТРАЗИ АТАКУ: заражённые у вертолёта · '+left:'ОБЫЩИ ЧЁРНЫЙ ЯЩИК · место зачищено';}
  }else if(radioSignal){
   const d=Math.hypot(radioSignal.x-state.x,radioSignal.y-state.y);
   objective.textContent='СОБЫТИЕ: радиосигнал · '+Math.round(d)+' м · '+compassDirection(radioSignal.x-state.x,radioSignal.y-state.y);
  }else if(state.quest>=3&&state.dayReward!==state.day){
   const d=Math.hypot(mark.x-state.x,mark.y-state.y);
   objective.textContent='ЗАДАНИЕ: вернись к Марку за наградой · '+Math.round(d)+' м';
  }else if(state.dayReward===state.day){
   objective.textContent='ЗАДАНИЕ: помоги поселению завтра';
  }else{
   const nearest=wrecks.filter(v=>!v.done).reduce((best,v)=>{const d=Math.hypot(v.x-state.x,v.y-state.y);return !best||d<best.d?{d}:best;},null);
   objective.textContent='ЗАДАНИЕ: детали для Марка · '+Math.min(3,state.quest)+'/3'+(nearest?' · машина '+Math.round(nearest.d)+' м':'');
  }
 }
 if(waypoint){
  if(activeWaypoint){
   const dx=activeWaypoint.x-state.x,dy=activeWaypoint.y-state.y,d=Math.hypot(dx,dy);
   waypoint.textContent=d<35?'ЦЕЛЬ: '+activeWaypoint.name+' · РЯДОМ':'ЦЕЛЬ: '+activeWaypoint.name+' · '+Math.round(d)+' м · '+compassDirection(dx,dy);
  }else waypoint.textContent='ЦЕЛЬ: выбери метку на карте';
 }
 if(threat){
  const close=zombies.map(z=>({z,d:Math.hypot(z.x-state.x,z.y-state.y)})).filter(v=>v.d<620);
  if(close.length||state.hp<=30){
   const nearest=close.reduce((a,b)=>!a||b.d<a.d?b:a,null);
   threat.textContent=(state.hp<=30?'ЗДОРОВЬЕ НИЗКОЕ · '+state.hp+' HP':'УГРОЗА · '+close.length+' рядом')+(nearest?' · '+Math.round(nearest.d)+' м · '+compassDirection(nearest.z.x-state.x,nearest.z.y-state.y):'');
   threat.classList.add('danger');
  }else{threat.textContent='';threat.classList.remove('danger');}
 }
}
function updateHud(){
 const now=performance.now();if(now-lastHudUpdate<125)return;lastHudUpdate=now;
 document.getElementById('health').textContent='♥ '+state.hp+' / 100';
 const staminaFill=document.getElementById('staminaFill'),staminaLabel=document.getElementById('staminaLabel');
 if(staminaFill)staminaFill.style.width=(state.stamina/maxStamina()*100)+'%';
 if(staminaLabel)staminaLabel.textContent=Math.ceil(state.stamina)+' / '+maxStamina();
 const hydrationFill=document.getElementById('hydrationFill'),hydrationLabel=document.getElementById('hydrationLabel');if(hydrationFill)hydrationFill.style.width=state.hydration+'%';if(hydrationLabel)hydrationLabel.textContent=Math.ceil(state.hydration)+' / 100';const hydrationHud=document.getElementById('hydrationHud');if(hydrationHud)hydrationHud.style.display=prefs.showHydration?'block':'none';const infectionHud=document.getElementById('infectionHud'),infectionFill=document.getElementById('infectionFill'),infectionLabel=document.getElementById('infectionLabel'),temperatureHud=document.getElementById('temperatureHud'),temperatureFill=document.getElementById('temperatureFill'),temperatureLabel=document.getElementById('temperatureLabel');if(infectionHud){infectionHud.style.display=prefs.showSurvivalHud?'block':'none';infectionFill.style.width=state.infection+'%';infectionLabel.textContent=Math.round(state.infection)+'%';}if(temperatureHud){temperatureHud.style.display=prefs.showSurvivalHud?'block':'none';temperatureFill.style.width=state.bodyTemp+'%';temperatureLabel.textContent=Math.round(state.bodyTemp)+'%';}
 const sprintButton=document.getElementById('sprintButton');
 if(sprintButton){sprintButton.classList.toggle('sprinting',sprintActive);sprintButton.disabled=state.stamina<1||sprintLocked||state.hydration<10;}
 document.getElementById('day').textContent='День '+state.day+' · '+(worldClock>.62||worldClock<.08?'Ночь':'День');
 const minutes=Math.floor(worldClock*1440),clock=document.getElementById('worldTime');
 if(clock)clock.textContent=String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');
 updateQuickbar();updateConvenienceHud();updateActionButton();const firePanel=document.getElementById('spawnFirePanel');if(firePanel){const show=gameActive&&!activeInterior&&nearSpawnCampfire();firePanel.classList.toggle('hidden',!show);if(show){const left=spawnCampfireRemaining(),mins=Math.floor(left/60000),secs=Math.floor(left/1000)%60,fill=document.getElementById('spawnFireFill'),timer=document.getElementById('spawnFireTimer'),level=document.getElementById('spawnFireLevel'),upgrade=document.getElementById('spawnFireUpgrade'),feed=document.getElementById('spawnFireFeed');if(timer)timer.textContent=left>0?mins+':'+String(secs).padStart(2,'0'):'ПОТУХ';if(fill)fill.style.width=(left>0?Math.min(100,left/180000*100):0)+'%';if(level)level.textContent='Уровень '+spawnCampfireLevel+' · радиус '+(30+(spawnCampfireLevel-1)*10)+' блоков';if(upgrade){upgrade.textContent=spawnCampfireLevel>=10?'МАКСИМУМ':'УЛУЧШИТЬ · '+spawnCampfireUpgradeCost()+' ДЕРЕВА';upgrade.disabled=spawnCampfireLevel>=10||state.wood<spawnCampfireUpgradeCost();}if(feed)feed.disabled=state.wood<1;}}
}

/* Apocalypse expansion 1.2.0 — exploration, supply drops and weather.
   This extension deliberately leaves move(), setupJoystick() and key handling untouched. */
const foundCaches=new Set(Array.isArray(saved.foundCaches)?saved.foundCaches:[]);
const discoveredLandmarks=new Set(Array.isArray(saved.discoveredLandmarks)?saved.discoveredLandmarks:[]);
const explorationCaches=[
 {x:1280,y:1860,type:'medical',name:'Полевой медпункт'},
 {x:3560,y:2460,type:'military',name:'Военный тайник'},
 {x:5100,y:3860,type:'food',name:'Продовольственный склад'},
 {x:7040,y:2860,type:'medical',name:'Заброшенная амбулатория'},
 {x:8950,y:3860,type:'military',name:'Пост охраны'},
 {x:10800,y:6920,type:'food',name:'Склад супермаркета'},
 {x:3480,y:9680,type:'military',name:'Дорожный блокпост'},
 {x:8120,y:10120,type:'medical',name:'Лагерь спасателей'},
 {x:1820,y:2820,type:'medical',name:'Клиника на окраине'},
 {x:7600,y:2820,type:'military',name:'Автобусное депо'},
 {x:8500,y:9360,type:'military',name:'Радиостанция'},
 {x:1800,y:9360,type:'food',name:'Заброшенная ферма'},
 {x:5400,y:6500,type:'food',name:'Сельский магазин'},
 {x:10800,y:9500,type:'medical',name:'Пункт спасателей'},
 {x:3200,y:7200,type:'military',name:'Склад дорожной службы'},
 {x:9200,y:1800,type:'food',name:'Кафе у шоссе'}
];
let supplyDrop=saved.supplyDrop&&Number.isFinite(saved.supplyDrop.x)&&Number.isFinite(saved.supplyDrop.y)?{...saved.supplyDrop}:null;
let nextSupplyDropAt=performance.now()+90000;
let lastLandmarkToast=0,lastLightningAt=0,lightningUntil=0;
function drawExplorationSites(){
 for(let i=0;i<explorationCaches.length;i++){
  if(foundCaches.has(i))continue;
  const p=explorationCaches[i];if(Math.abs(p.x-state.x)>w+100||Math.abs(p.y-state.y)>h+100)continue;
  const pulse=.65+Math.sin(time*.004+i)*.18;
  ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle='#111710aa';ctx.beginPath();ctx.ellipse(0,13,29,9,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=p.type==='medical'?'#777e68':p.type==='military'?'#59634e':'#806b4d';ctx.fillRect(-22,-8,44,25);
  ctx.fillStyle='#a99a75';ctx.fillRect(-24,-12,48,7);ctx.strokeStyle='#292f27';ctx.lineWidth=2;ctx.strokeRect(-22,-8,44,25);
  ctx.fillStyle=p.type==='medical'?'#d9ddd0':p.type==='military'?'#a8b18b':'#d2b77e';
  if(p.type==='medical'){ctx.fillRect(-3,-5,6,17);ctx.fillRect(-9,1,18,5);}
  else if(p.type==='military'){ctx.fillRect(-13,-3,26,3);ctx.fillRect(-13,4,26,3);}
  else{ctx.fillRect(-14,-3,28,3);ctx.fillRect(-14,4,28,3);}
  ctx.globalAlpha=pulse;ctx.strokeStyle='#e4d19b';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-20,8+Math.sin(time*.004)*2,0,Math.PI*2);ctx.stroke();ctx.restore();
 }
}
function drawSupplyDrop(){
 if(!supplyDrop)return;
 const p=supplyDrop,pulse=.65+Math.sin(time*.006)*.25;
 ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle='#111710bb';ctx.beginPath();ctx.ellipse(0,17,34,11,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#7a5940';ctx.fillRect(-25,-5,50,28);ctx.fillStyle='#b89a68';ctx.fillRect(-28,-11,56,9);ctx.fillStyle='#c8b17e';ctx.fillRect(-4,-10,8,35);ctx.fillRect(-25,4,50,5);
 ctx.strokeStyle='#e5d39c';ctx.lineWidth=2;ctx.globalAlpha=pulse;ctx.beginPath();ctx.arc(0,-25,13+Math.sin(time*.006)*3,0,Math.PI*2);ctx.stroke();
 ctx.restore();
}
function drawWorldAnimation(){
 if(prefs.effects==='low')return;
 // Moving motes, spores and distant ash give the whole scene subtle life without heavy particle systems.
 const night=worldClock>.62||worldClock<.08;
 ctx.save();
 for(let i=0;i<(prefs.effects==='balanced'?12:22);i++){
  const seed=i*97.31,drift=(time*(night?.009:.018)+seed*13)%(w+80)-40;
  const x=drift,y=(seed*7+Math.sin(time*.0015+i*2)*24)%(h+30)-15;
  const glow=.25+.25*Math.sin(time*.003+i);
  ctx.globalAlpha=night?glow*.65:glow*.3;
  ctx.fillStyle=night?(i%3===0?'#b7d18a':'#d2c7a1'):'#d7d0a8';
  ctx.beginPath();ctx.arc(x,y,i%5===0?1.8:1,0,Math.PI*2);ctx.fill();
 }
 if(night){
  const vignette=ctx.createRadialGradient(w/2,h/2,Math.min(w,h)*.18,w/2,h/2,Math.max(w,h)*.72);
  vignette.addColorStop(0,'#07100b00');vignette.addColorStop(1,'#02080555');
  ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);
 }
 ctx.restore();
}
function drawWeatherEffects(){
 if(!prefs.weather||prefs.effects==='low')return;
 const phase=(Math.floor(time/52000)%6),storm=phase===2,rain=phase===3,drizzle=phase===5,dust=phase===4;
 if(storm){
  ctx.save();ctx.fillStyle='#17253518';ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='#b8c8d088';ctx.lineWidth=1;
  for(let i=0;i<38;i++){const x=(i*83+time*.42)%(w+40)-20,y=(i*47+time*.78)%(h+40)-20;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-5,y+13);ctx.stroke();}
  if(time<lightningUntil&&lightningUntil>0){ctx.fillStyle='#d9e4e755';ctx.fillRect(0,0,w,h);}
  ctx.restore();
 }else if(phase===1){
  ctx.save();const fog=ctx.createLinearGradient(0,0,0,h);fog.addColorStop(0,'#c5c9b00c');fog.addColorStop(.55,'#d4d2b51c');fog.addColorStop(1,'#c5c9b008');ctx.fillStyle=fog;ctx.fillRect(0,0,w,h);ctx.restore();
 }else if(rain||drizzle){ctx.save();ctx.strokeStyle=rain?'#b8c8d088':'#cbd5ce55';ctx.lineWidth=rain?1.25:1;const count=rain?(prefs.effects==='balanced'?42:68):(prefs.effects==='balanced'?18:30);for(let i=0;i<count;i++){const x=(i*83+time*(rain?.52:.27))%(w+40)-20,y=(i*47+time*(rain?.86:.55))%(h+40)-20;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-(rain?7:3),y+(rain?18:9));ctx.stroke();}ctx.fillStyle=rain?'#17253520':'#1725350c';ctx.fillRect(0,0,w,h);ctx.restore();}else if(dust){ctx.save();ctx.fillStyle='#b9a47718';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#d3bd8c33';ctx.lineWidth=1;for(let i=0;i<24;i++){const x=(i*97+time*.13)%(w+50)-25,y=(i*53+Math.sin(time*.001+i)*18)%h;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+18,y-2);ctx.stroke();}ctx.restore();}
 }
function drawStarterKnife(){if(starterKnife.picked)return;const x=starterKnife.x,y=starterKnife.y;ctx.save();ctx.translate(x,y);ctx.rotate(-.72);ctx.fillStyle='#11171399';ctx.beginPath();ctx.ellipse(0,8,15,4,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#70533a';ctx.fillRect(-3,-3,7,18);ctx.fillStyle='#b9c3bd';ctx.beginPath();ctx.moveTo(-2,-4);ctx.lineTo(2,-27);ctx.lineTo(7,-23);ctx.lineTo(3,-3);ctx.closePath();ctx.fill();ctx.strokeStyle='#e0e4dc';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='#d9c18e';ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.fillText('НОЖ · E',0,24);ctx.restore();}
function drawRandomEventSites(){const scale=prefs.renderDistance==='near'?.82:prefs.renderDistance==='far'?1.22:1;for(const site of randomEventSites){if(Math.abs(site.x-state.x)>w*scale+220||Math.abs(site.y-state.y)>h*scale+220)continue;const pulse=1+Math.sin(time*.006+site.x)*.12;ctx.save();ctx.translate(site.x,site.y);if(site.source==='long-campaign'){const color=site.type==='campaign-extract'?'#9ee7d1':site.type==='campaign-wave'?'#ef6b55':site.type==='campaign-convoy'?'#e7b86b':site.type==='campaign-relay'?'#8fd4d0':site.type==='campaign-cache'?'#d5c18c':'#9ad5e8';ctx.strokeStyle=color;ctx.lineWidth=3;ctx.globalAlpha=.7+.25*Math.sin(time*.01);ctx.beginPath();ctx.arc(0,0,(site.type==='campaign-wave'?34:25)*pulse,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;ctx.fillStyle=color;ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.fillText(site.label||'ОПЕРАЦИЯ',0,-38);if(site.type==='campaign'||site.type==='campaign-beacon-active'){ctx.save();ctx.shadowColor='#7be8ff';ctx.shadowBlur=20;ctx.strokeStyle='#8feaff';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(-2,12);ctx.lineTo(0,-47);ctx.lineTo(2,12);ctx.moveTo(-16,12);ctx.lineTo(0,-47);ctx.lineTo(16,12);ctx.moveTo(-12,-2);ctx.lineTo(12,-2);ctx.moveTo(-9,-18);ctx.lineTo(9,-18);ctx.stroke();ctx.shadowBlur=0;ctx.strokeStyle='#b6c8c4';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-18,12);ctx.lineTo(18,12);ctx.moveTo(-16,12);ctx.lineTo(-26,25);ctx.moveTo(16,12);ctx.lineTo(26,25);ctx.stroke();ctx.fillStyle=campaign.beaconActivated?'#9df8b5':'#ff675c';ctx.beginPath();ctx.arc(0,-47,4+Math.sin(time*.02)*1.5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#33433e';ctx.fillRect(-13,12,26,14);ctx.fillStyle='#7faaa2';ctx.fillRect(-9,15,18,3);ctx.strokeStyle='#b2d8d1';ctx.beginPath();ctx.moveTo(-26,25);ctx.lineTo(26,25);ctx.stroke();if(campaign.beaconActivated){ctx.globalAlpha=.12+.08*Math.sin(time*.01);ctx.fillStyle='#8feaff';ctx.beginPath();ctx.moveTo(-5,-47);ctx.lineTo(-150,-250);ctx.lineTo(150,-250);ctx.closePath();ctx.fill();ctx.globalAlpha=1;}ctx.restore();}else if(site.type==='campaign-beacon-part'){ctx.fillStyle='#263c3b';ctx.fillRect(-13,-10,26,20);ctx.strokeStyle='#9fe4e5';ctx.lineWidth=2;ctx.strokeRect(-13,-10,26,20);ctx.fillStyle='#f2c46d';ctx.fillRect(-8,-5,16,10);ctx.fillStyle='#d8f5e9';ctx.font='bold 9px system-ui';ctx.textAlign='center';ctx.fillText('УЗЕЛ',0,23);}else ctx.fillStyle='#18231e';ctx.fillRect(-15,-12,30,24);ctx.strokeStyle=color;ctx.lineWidth=2;ctx.strokeRect(-15,-12,30,24);ctx.fillStyle=color;if(site.type==='campaign-cache'){ctx.fillRect(-10,-6,20,12);ctx.strokeRect(-10,-6,20,12);}else if(site.type==='campaign-relay'){ctx.fillRect(-2,-22,4,20);ctx.beginPath();ctx.arc(0,-22,8,Math.PI,Math.PI*2);ctx.stroke();}else if(site.type==='campaign-extract'){ctx.fillRect(-2,-23,4,22);ctx.beginPath();ctx.moveTo(2,-22);ctx.lineTo(18,-17);ctx.lineTo(2,-12);ctx.fill();}else{ctx.beginPath();ctx.arc(0,0,6,0,Math.PI*2);ctx.fill();}if(site.remaining>0){ctx.font='bold 9px system-ui';ctx.fillText('ОСТАЛОСЬ '+site.remaining,0,35);}}else if(site.type==='car'){ctx.fillStyle='#141b17aa';ctx.beginPath();ctx.ellipse(0,15,56,12,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#414944';ctx.fillRect(-49,-15,98,32);ctx.fillStyle='#252e2b';ctx.fillRect(-24,-25,48,18);ctx.fillStyle='#6c786f';ctx.fillRect(-19,-22,38,12);ctx.fillStyle='#171b19';for(const x of [-31,31]){ctx.beginPath();ctx.arc(x,17,9,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#8a8b7d';ctx.stroke();}ctx.fillStyle='#7d4c3d';ctx.fillRect(-45,-12,9,6);ctx.fillRect(36,-12,9,6);}else if(site.type==='checkpoint'){ctx.fillStyle='#353b32';ctx.fillRect(-62,-7,124,14);ctx.fillStyle='#a28b61';ctx.fillRect(-62,-7,124,4);ctx.fillStyle='#4c5749';ctx.fillRect(-48,-35,12,28);ctx.fillRect(36,-35,12,28);ctx.strokeStyle='#b9a77c';ctx.lineWidth=2;ctx.strokeRect(-62,-7,124,14);ctx.fillStyle='#e4c98c';ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.fillText('БЛОКПОСТ',0,-43);}else if(site.type==='camp'){ctx.fillStyle='#394333';ctx.beginPath();ctx.moveTo(-42,22);ctx.lineTo(-30,-18);ctx.lineTo(0,-39);ctx.lineTo(30,-18);ctx.lineTo(42,22);ctx.closePath();ctx.fill();ctx.fillStyle='#1d2821';ctx.beginPath();ctx.moveTo(-12,22);ctx.lineTo(0,-3);ctx.lineTo(12,22);ctx.fill();ctx.fillStyle='#d7a35d';ctx.globalAlpha=.75;ctx.beginPath();ctx.arc(51,8,7*pulse,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.fillStyle='#e4c98c';ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.fillText('ЛАГЕРЬ',0,-46);}else{const color=site.source==='alpha-hunt'?'#f06a4e':site.type==='gunfire'?'#e3b45e':site.type==='signal'?'#8fd8e8':site.type==='quarantine'?'#b6d56c':site.type==='survivors'?'#a8d6aa':'#c6c2a1';ctx.strokeStyle=color;ctx.lineWidth=3;ctx.globalAlpha=.55+.35*Math.sin(time*.01);ctx.beginPath();ctx.arc(0,0,24*pulse,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;ctx.fillStyle=color;ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.fillText(site.type==='gunfire'?'ПЕРЕСТРЕЛКА':site.type==='signal'?'АВАРИЙНЫЙ МАЯК':site.type==='quarantine'?'КАРАНТИН':site.type==='survivors'?'ВЫЖИВШИЕ':site.type==='convoy'?'КОЛОННА':site.type==='horde'?(site.source==='alpha-hunt'?'ОХОТА: АЛЬФА':'ОРДА'):'КРИКИ ВЫЖИВШИХ',0,-35);}ctx.restore();}}
function drawHeldWeapon(){if(!state.firearm&&state.meleeWeapon!=='knife')return;ctx.save();ctx.translate(w/2+14,h/2+10);ctx.rotate(-.18-(playerAction.until>performance.now()&&playerAction.type==='attack'?Math.sin((performance.now()-playerAction.started)/420*Math.PI)*.85:0));if(state.firearm){ctx.fillStyle='#202723';ctx.fillRect(-3,-2,23,6);ctx.fillStyle='#59645a';ctx.fillRect(4,-5,9,3);ctx.fillStyle='#171d19';ctx.fillRect(2,3,6,8);ctx.fillStyle='#b4a27b';ctx.fillRect(18,-1,3,2);}else{ctx.fillStyle='#65452f';ctx.fillRect(-2,1,6,12);ctx.fillStyle='#bfc8c2';ctx.beginPath();ctx.moveTo(-1,0);ctx.lineTo(2,-18);ctx.lineTo(7,-15);ctx.lineTo(4,1);ctx.closePath();ctx.fill();ctx.strokeStyle='#edf0e8';ctx.lineWidth=1;ctx.stroke();}ctx.restore();}
function drawRandomEventSites(){for(const site of randomEventSites){const pulse=1+Math.sin(time*.006+site.x)*.12;ctx.save();ctx.translate(site.x,site.y);if(site.type==='car'){ctx.fillStyle='#141b17aa';ctx.beginPath();ctx.ellipse(0,15,56,12,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#414944';ctx.fillRect(-49,-15,98,32);ctx.fillStyle='#252e2b';ctx.fillRect(-24,-25,48,18);ctx.fillStyle='#6c786f';ctx.fillRect(-19,-22,38,12);ctx.fillStyle='#171b19';for(const x of [-31,31]){ctx.beginPath();ctx.arc(x,17,9,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#8a8b7d';ctx.stroke();}ctx.fillStyle='#7d4c3d';ctx.fillRect(-45,-12,9,6);ctx.fillRect(36,-12,9,6);}else if(site.type==='checkpoint'){ctx.fillStyle='#353b32';ctx.fillRect(-62,-7,124,14);ctx.fillStyle='#a28b61';ctx.fillRect(-62,-7,124,4);ctx.fillStyle='#4c5749';ctx.fillRect(-48,-35,12,28);ctx.fillRect(36,-35,12,28);ctx.strokeStyle='#b9a77c';ctx.lineWidth=2;ctx.strokeRect(-62,-7,124,14);ctx.fillStyle='#e4c98c';ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.fillText('БЛОКПОСТ',0,-43);}else if(site.type==='camp'){ctx.fillStyle='#394333';ctx.beginPath();ctx.moveTo(-42,22);ctx.lineTo(-30,-18);ctx.lineTo(0,-39);ctx.lineTo(30,-18);ctx.lineTo(42,22);ctx.closePath();ctx.fill();ctx.fillStyle='#1d2821';ctx.beginPath();ctx.moveTo(-12,22);ctx.lineTo(0,-3);ctx.lineTo(12,22);ctx.fill();ctx.fillStyle='#d7a35d';ctx.globalAlpha=.75;ctx.beginPath();ctx.arc(51,8,7*pulse,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.fillStyle='#e4c98c';ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.fillText('ЛАГЕРЬ',0,-46);}else{const color=site.type==='gunfire'?'#e3b45e':site.type==='signal'?'#8fd8e8':site.type==='quarantine'?'#b6d56c':site.type==='survivors'?'#a8d6aa':'#c6c2a1';ctx.strokeStyle=color;ctx.lineWidth=3;ctx.globalAlpha=.55+.35*Math.sin(time*.01);ctx.beginPath();ctx.arc(0,0,24*pulse,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;ctx.fillStyle=color;ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.fillText(site.type==='gunfire'?'ПЕРЕСТРЕЛКА':site.type==='signal'?'АВАРИЙНЫЙ МАЯК':site.type==='quarantine'?'КАРАНТИН':site.type==='survivors'?'ВЫЖИВШИЕ':site.type==='convoy'?'КОЛОННА':site.type==='horde'?'ОРДА · E ПОСЛЕ ЗАЧИСТКИ':'КРИКИ ВЫЖИВШИХ',0,-35);}ctx.restore();}}
function playAmbientSound(kind){if(!prefs.ambientAudio)return;try{if(kind==='scream'&&window.speechSynthesis&&window.SpeechSynthesisUtterance){const voice=new SpeechSynthesisUtterance('Помогите! Здесь кто-нибудь есть?');voice.lang='ru-RU';voice.rate=.82;voice.volume=.55;window.speechSynthesis.speak(voice);return;}const AudioCtor=window.AudioContext||window.webkitAudioContext;if(!AudioCtor)return;const audio=new AudioCtor(),length=Math.floor(audio.sampleRate*(kind==='gunfire'?.16:.09)),buffer=audio.createBuffer(1,length,audio.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<length;i++){const fade=1-i/length;data[i]=(Math.random()*2-1)*fade*(kind==='gunfire'?1:.45);}const source=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();source.buffer=buffer;filter.type='lowpass';filter.frequency.value=kind==='gunfire'?1800:900;gain.gain.value=.12;source.connect(filter);filter.connect(gain);gain.connect(audio.destination);source.start();source.onended=()=>audio.close();}catch(_){}}
function updateAmbientEvents(now){
 if(!gameActive||activeInterior||now<ambientEventNextAt)return;
 const coop=window.ApocalypseCoop;if(coop?.room&&!coop.isOwner())return;
 ambientEventNextAt=now+(85000+Math.random()*95000)/prefs.eventFrequency;
 let x=state.x+(Math.random()<.5?-1:1)*(420+Math.random()*480),y=state.y+(Math.random()-.5)*850;
 for(let tries=0;tries<18&&(blocked(x,y)||insideBuilding(x,y));tries++){x=state.x+(Math.random()-.5)*1050;y=state.y+(Math.random()-.5)*1050;}
 if(blocked(x,y)||insideBuilding(x,y))return;
 const types=['car','checkpoint','camp','patrol','gunfire','scream','convoy','quarantine','survivors','signal','horde','alpha-hunt'];if(randomEventSites.some(v=>v.type==='horde')){types.splice(types.indexOf('horde'),1);types.splice(types.indexOf('alpha-hunt'),1);}const type=types[Math.floor(Math.random()*types.length)],id='event_'+Math.floor(now)+'_'+randomEventSites.length;
 if(['car','checkpoint','camp'].includes(type)){randomEventSites.push({id,type,x,y,createdAt:now});worldProps.push({id,type:type==='car'?'wrecked_car':type==='checkpoint'?'barrier':'tent',x,y,w:type==='car'?104:type==='checkpoint'?132:88,h:type==='car'?54:type==='checkpoint'?34:68});toast(type==='car'?'Обнаружен заброшенный автомобиль':type==='checkpoint'?'Обнаружен заблокированный блокпост':'Обнаружен лагерь');}
 else if(type==='patrol'){for(let i=0;i<3;i++)spawnZombie(x+(Math.random()-.5)*110,y+(Math.random()-.5)*110,'patrol');toast('Впереди патруль заражённых. Не шуми и обходи стороной');}
 else if(type==='gunfire'){randomEventSites.push({id,type,x,y,createdAt:now});for(let i=0;i<2;i++)spawnZombie(x+(Math.random()-.5)*90,y+(Math.random()-.5)*90,'runner');playAmbientSound('gunfire');toast('Вдалеке слышна перестрелка. Заражённые идут на звук');}
 else if(type==='convoy'){randomEventSites.push({id,type,x,y,createdAt:now});worldProps.push({id,type:'wrecked_car',x,y,w:126,h:66});for(let i=0;i<3;i++)spawnZombie(x+(Math.random()-.5)*130,y+(Math.random()-.5)*110,i===0?'armored':'runner');toast('Обнаружена разбитая колонна снабжения');}
 else if(type==='quarantine'){randomEventSites.push({id,type,x,y,createdAt:now});worldProps.push({id,type:'barrier',x,y,w:148,h:38});toast('Найден заражённый карантинный кордон');}
 else if(type==='survivors'){randomEventSites.push({id,type,x,y,createdAt:now});worldProps.push({id,type:'tent',x,y,w:104,h:76});toast('Поступил сигнал выживших — возможно, им нужна помощь');}
 else if(type==='signal'){randomEventSites.push({id,type,x,y,createdAt:now});toast('Обнаружен аварийный маяк с припасами');}
 else if(type==='horde'||type==='alpha-hunt'){const alphaHunt=type==='alpha-hunt',horde={id,type:'horde',source:alphaHunt?'alpha-hunt':'ambient-horde',x,y,createdAt:now,remaining:0};randomEventSites.push(horde);let spawned=0;const total=alphaHunt?3:5;for(let i=0;i<total&&zombies.length<prefs.infectedCap;i++){const a=Math.random()*Math.PI*2,r=(alphaHunt?125:100)+Math.random()*(alphaHunt?55:90),sx=x+Math.cos(a)*r,sy=y+Math.sin(a)*r;if(!blocked(sx,sy)){const kind=alphaHunt?(i===0?'alpha':i===1?'runner':'crawler'):i===0?'brute':i===1?'crawler':i===2?'runner':'night';spawnZombie(sx,sy,kind,id);if(coop?.room?.status==='running')coop.send({kind:'zombie-spawn',x:sx,y:sy,ztype:kind,eventId:id});spawned++;}}horde.spawned=spawned;horde.remaining=spawned;if(spawned>0)toast(alphaHunt?'ОПАСНОСТЬ: обнаружен Альфа-мутант! Уничтожь его и охрану.':'ТРЕВОГА: замечена группа заражённых. Зачисти территорию');else{const hi=randomEventSites.indexOf(horde);if(hi>=0)randomEventSites.splice(hi,1);toast('Слишком много активных заражённых для новой орды. Событие отменено.');}}
 else{randomEventSites.push({id,type,x,y,createdAt:now});for(let i=0;i<2;i++)spawnZombie(x+(Math.random()-.5)*80,y+(Math.random()-.5)*80,'night');playAmbientSound('scream');toast('Ты услышал крики выживших. Возможно, кто-то ещё жив');}
 while(randomEventSites.length>30){const removed=randomEventSites.shift();if(removed?.id){const index=worldProps.findIndex(p=>p.id===removed.id);if(index>=0)worldProps.splice(index,1);}}
 const latest=randomEventSites[randomEventSites.length-1];if(latest&&latest.createdAt===now&&coop?.room?.status==='running'&&coop.isOwner())coop.send({kind:'world-event-created',site:latest});
 save();
}
function interactExpansion(){
 if(interactCampaign())return true;
 const hordeIndex=randomEventSites.findIndex(p=>p.type==='horde'&&Math.hypot(state.x-p.x,state.y-p.y)<92);
 if(hordeIndex>=0){const horde=randomEventSites[hordeIndex];if(Number(horde.remaining||0)>0||zombies.some(z=>z.eventId===horde.id)){toast('Сначала уничтожь всех заражённых в этой зоне · осталось '+Math.max(Number(horde.remaining)||0,zombies.filter(z=>z.eventId===horde.id).length));return false;}const coop=window.ApocalypseCoop;if(coop?.room&&!coop.isOwner()){toast('Награду за общую зачистку выдаёт владелец мира');return false;}if(horde.source==='alpha-hunt'){state.scrap+=18;state.bolts+=8;state.ammo+=24;state.weaponParts+=2;state.medInjector++;state.armorPlate++;state.survivorTrust+=3;grantSkillXP(45);}else{state.scrap+=horde.source==='safehouse-raid'?10:5;state.bolts+=horde.source==='safehouse-raid'?6:3;state.food+=2;state.survivorTrust+=1;if(horde.source==='safehouse-raid'){state.wood+=5;state.armorPlate++;}}randomEventSites.splice(hordeIndex,1);if(coop?.room?.status==='running')coop.send({kind:'horde-reward-claimed',eventId:horde.id});save();toast(horde.source==='alpha-hunt'?'Альфа уничтожен! Награда: +18 металла, +8 крепежа, +24 патрона, детали и инъектор':'Группа уничтожена: +5 металла, +3 крепежа, +2 пайка');return true;}
 const eventIndex=randomEventSites.findIndex(p=>['convoy','quarantine','survivors','signal'].includes(p.type)&&Math.hypot(state.x-p.x,state.y-p.y)<72);
 if(eventIndex>=0){const event=randomEventSites[eventIndex];
  if(event.type==='convoy'){state.scrap+=6;state.bolts+=4;state.ammo+=12;toast('Колонна: +6 металла, +4 крепежа, +12 патронов');}
  else if(event.type==='quarantine'){state.electronicsPack+=1;state.medInjector+=1;toast('Кордон: найден электронный модуль и инъектор');}
  else if(event.type==='survivors'){state.food+=5;state.bandage+=2;state.survivorTrust+=2;if(state.crewCount<3){state.crewCount++;toast('Выживший присоединился к отряду · '+state.crewCount+'/3');}else toast('Выжившие благодарят тебя: +5 еды, +2 аптечки');}
  else if(event.type==='signal'){state.scrap+=3;state.food+=2;state.electronicsPack+=1;toast('Аварийный маяк: +3 металла, +2 еды, электроника');}
  randomEventSites.splice(eventIndex,1);const wi=worldProps.findIndex(p=>p.id===event.id);if(wi>=0)worldProps.splice(wi,1);save();return true;
 }
 const cacheIndex=explorationCaches.findIndex((p,i)=>!foundCaches.has(i)&&Math.hypot(state.x-p.x,state.y-p.y)<62);
 if(cacheIndex>=0){
  const p=explorationCaches[cacheIndex];foundCaches.add(cacheIndex);
  if(p.type==='medical'){state.bandage+=2;state.hp=Math.min(100,state.hp+18);toast('Полевой медпункт: +2 аптечки, +18 здоровья');}
  else if(p.type==='military'){state.scrap+=4;state.bolts+=3;toast('Военный тайник: +4 металла, +3 крепежа');}
  else{state.food+=4;state.wood+=2;toast('Продовольственный склад: +4 еды, +2 дерева');}
  save();return true;
 }
 if(supplyDrop&&Math.hypot(state.x-supplyDrop.x,state.y-supplyDrop.y)<72){
  state.scrap+=3;state.food+=3;state.bandage+=1;state.bolts+=2;supplyDrop=null;save();toast('Поставка получена: еда, аптечка и детали');return true;
 }
 return false;
}

function campaignSafeCoords(x,y){let sx=Math.max(WORLD_MIN+90,Math.min(WORLD_MAX-90,x)),sy=Math.max(WORLD_MIN+90,Math.min(WORLD_MAX-90,y));for(let tries=0;tries<24&&(blocked(sx,sy)||insideBuilding(sx,sy));tries++){const a=Math.random()*Math.PI*2,r=70+tries*18;sx=Math.max(WORLD_MIN+90,Math.min(WORLD_MAX-90,x+Math.cos(a)*r));sy=Math.max(WORLD_MIN+90,Math.min(WORLD_MAX-90,y+Math.sin(a)*r));}return{x:sx,y:sy};}
function campaignRemoveSites(){for(let i=randomEventSites.length-1;i>=0;i--)if(randomEventSites[i].source==='long-campaign'&&randomEventSites[i].type!=='campaign-beacon-active')randomEventSites.splice(i,1);}
function campaignPlaceSite(type,x,y,label,remaining=0){campaignRemoveSites();const id='campaign_'+campaign.runId+'_'+campaign.stage+'_'+campaign.wave+'_'+Math.floor(Date.now()/1000);const safe=campaignSafeCoords(x,y);const site={id,type,source:'long-campaign',x:safe.x,y:safe.y,label,createdAt:Date.now(),remaining};randomEventSites.push(site);campaign.siteId=id;const coop=window.ApocalypseCoop;if(coop?.room?.status==='running'&&coop.isOwner())coop.send({kind:'world-event-created',site});return site;}
function campaignSpawnWave(type,count,now){const site=campaignPlaceSite(type,campaign.x,campaign.y,type==='campaign-wave'?'УДЕРЖИВАЙ РАДИОУЗЕЛ':type==='campaign-convoy'?'ЗАСАДА У КОЛОННЫ':'ПОСЛЕДНИЙ РУБЕЖ',0);campaign.waveWanted=count;campaign.waveSpawned=0;for(let i=0;i<count&&zombies.length<prefs.infectedCap;i++){const a=i*2.399,r=105+(i%3)*31,x=site.x+Math.cos(a)*r,y=site.y+Math.sin(a)*r;if(blocked(x,y))continue;const kind=['runner','crawler','night','brute','armored','stalker','spitter'][i%7],before=zombies.length;spawnZombie(x,y,kind,site.id);if(zombies.length>before){campaign.waveSpawned++;const coop=window.ApocalypseCoop;if(coop?.room?.status==='running'&&coop.isOwner())coop.send({kind:'zombie-spawn',x,y,ztype:kind,eventId:site.id});}}site.remaining=campaign.waveSpawned;campaign.waveStartedAt=Date.now();save();}
function campaignBeginDefense(now){campaign.stage=3;campaign.wave=1;campaign.nextWaveAt=0;campaignSpawnWave('campaign-wave',4,now);toast('ОПЕРАЦИЯ «ПОСЛЕДНИЙ СИГНАЛ»: удерживай радиорелейный узел. Впереди пять волн.');}
function campaignSetStage2(){campaign.stage=2;const site=campaignPlaceSite('campaign-relay',campaign.x+520,campaign.y+360,'РЕМОНТ РАДИОРЕЛЕ');campaign.x=site.x;campaign.y=site.y;toast('Все тайники найдены. Доберись до ретранслятора и восстанови связь.');save();}
function campaignSpawnBeaconParts(){for(const p of [[-150,-100,'ПОДКЛЮЧИТЬ КАБЕЛЬ'],[165,105,'ЗАМЕНИТЬ ПРЕДОХРАНИТЕЛЬ'],[-45,190,'ВЫРОВНЯТЬ АНТЕННУ']]){const q=campaignSafeCoords(campaign.x+p[0],campaign.y+p[1]);randomEventSites.push({id:'campaign_'+campaign.runId+'_beacon_'+randomEventSites.length,type:'campaign-beacon-part',source:'long-campaign',x:q.x,y:q.y,label:p[2],part:p[2],createdAt:Date.now(),remaining:0});}}
function campaignStartCaches(){campaign.stage=1;campaign.caches=0;campaign.beaconActivated=true;const beacon=randomEventSites.find(v=>v.source==='long-campaign'&&v.type==='campaign');if(beacon)beacon.type='campaign-beacon-active';campaignRemoveSites();const offsets=[[-260,-180],[310,170],[-80,430]];for(let i=0;i<offsets.length;i++){const point=campaignSafeCoords(campaign.x+offsets[i][0],campaign.y+offsets[i][1]);const site={id:'campaign_'+campaign.runId+'_cache_'+i,type:'campaign-cache',source:'long-campaign',x:point.x,y:point.y,label:'ТАЙНИК '+(i+1),createdAt:Date.now(),remaining:0};randomEventSites.push(site);}toast('Маяк ожил и отправил координаты. Сигнальная ракета осветила сектор, а на карте появились три контейнера. Собери их для ремонта ретранслятора.');save();}
function campaignObjectiveText(){if(campaign.status!=='active')return '';const names=['Восстанови маяк · '+campaign.beaconParts+'/3 узла','Обыщи три контейнера · '+campaign.caches+'/3','Почини ретранслятор · нужны 3 электроники и 2 крепежа','Удерживай ретранслятор · волна '+campaign.wave+'/7','Зачисти колонну и забери документы','Доберись до точки эвакуации'];const site=campaign.stage===1?randomEventSites.filter(v=>v.source==='long-campaign'&&v.type==='campaign-cache').sort((a,b)=>Math.hypot(state.x-a.x,state.y-a.y)-Math.hypot(state.x-b.x,state.y-b.y))[0]:(randomEventSites.find(v=>v.source==='long-campaign'&&v.id===campaign.siteId)||randomEventSites.find(v=>v.source==='long-campaign'&&v.type!=='campaign-beacon-active'));const d=site?Math.round(Math.hypot(state.x-site.x,state.y-site.y))+' м · '+compassDirection(site.x-state.x,site.y-state.y):'';return 'ОПЕРАЦИЯ «ПОСЛЕДНИЙ СИГНАЛ» · '+(names[campaign.stage]||'Выполни задачу')+(d?' · '+d:'');}
function updateCampaign(now){if(!gameActive||activeInterior)return;const coop=window.ApocalypseCoop;if(coop?.room&&!coop.isOwner())return;if(campaign.status==='locked'&&Date.now()>=campaign.unlockAt){campaign.status='active';campaign.stage=0;const a=Math.random()*Math.PI*2,r=760+Math.random()*340;campaign.x=Math.max(WORLD_MIN+500,Math.min(WORLD_MAX-500,state.x+Math.cos(a)*r));campaign.y=Math.max(WORLD_MIN+500,Math.min(WORLD_MAX-500,state.y+Math.sin(a)*r));campaignPlaceSite('campaign',campaign.x,campaign.y,'АВАРИЙНЫЙ МАЯК');toast('ПЕРЕХВАЧЕН ДЛИННЫЙ РАДИОСИГНАЛ. Началась операция «Последний сигнал» — цепочка заданий на 20–30 минут.');save();}if(campaign.status!=='active')return;if(campaign.stage===0&&campaign.beaconParts<3&&!randomEventSites.some(v=>v.source==='long-campaign'&&v.type==='campaign-beacon-part')){campaignSpawnBeaconParts();save();}if(campaign.stage===3){const site=randomEventSites.find(v=>v.id===campaign.siteId);if(site&&site.remaining<=0&&!zombies.some(z=>z.eventId===site.id)){if(campaign.waveSpawned<campaign.waveWanted){campaignSpawnWave('campaign-wave',campaign.waveWanted-campaign.waveSpawned,now);return;}if(campaign.wave<7){if(!campaign.nextWaveAt){campaign.nextWaveAt=Date.now()+150000;toast('Волна отбита. Переведи дух, пополни боезапас — следующая атака примерно через 150 секунд.');save();}else if(Date.now()>=campaign.nextWaveAt){campaign.wave++;campaign.nextWaveAt=0;campaignSpawnWave('campaign-wave',[0,4,5,6,7,8,9,10][campaign.wave],now);toast('ВНИМАНИЕ: приближается волна '+campaign.wave+' из 5!');}}else{campaign.stage=4;campaign.wave=0;campaign.x+=820;campaign.y+=260;const convoy=campaignPlaceSite('campaign-convoy',campaign.x,campaign.y,'ЗАСАДА У КОЛОННЫ',0);campaign.waveWanted=6;campaign.waveSpawned=0;for(let i=0;i<6&&zombies.length<prefs.infectedCap;i++){const a=i*2.399,x=convoy.x+Math.cos(a)*125,y=convoy.y+Math.sin(a)*125,kind=i===0?'armored':i%2?'runner':'crawler',before=zombies.length;spawnZombie(x,y,kind,convoy.id);if(zombies.length>before){campaign.waveSpawned++;const c=window.ApocalypseCoop;if(c?.room?.status==='running'&&c.isOwner())c.send({kind:'zombie-spawn',x,y,ztype:kind,eventId:convoy.id});}}convoy.remaining=campaign.waveSpawned;toast('Ретранслятор удержан! Разведка засекла колонну снабжения. Доберись до неё и зачисти охрану.');save();}}}}
function interactCampaign(){if(campaign.status!=='active')return false;const idx=randomEventSites.findIndex(v=>v.source==='long-campaign'&&v.type!=='campaign-beacon-active'&&Math.hypot(state.x-v.x,state.y-v.y)<88);if(idx<0)return false;const site=randomEventSites[idx],coop=window.ApocalypseCoop;if(coop?.room&&!coop.isOwner()){toast('Продолжить операцию может владелец мира');return true;}if(site.type==='campaign-beacon-part'){randomEventSites.splice(idx,1);campaign.beaconParts=Math.min(3,campaign.beaconParts+1);toast((site.part||site.label)+' · узел восстановлен '+campaign.beaconParts+'/3');if(campaign.beaconParts>=3)toast('Все узлы подключены. Вернись к маяку и активируй аварийный передатчик.');save();return true;}if(site.type==='campaign'){if(campaign.beaconParts<3){toast('Маяк обесточен. Восстанови три узла: кабель, предохранитель и антенну · '+campaign.beaconParts+'/3');return true;}campaignStartCaches();return true;}if(site.type==='campaign-cache'){randomEventSites.splice(idx,1);campaign.caches++;state.electronicsPack++;state.bolts++;state.scrap+=2;toast('Контейнер разобран: электроника +1, крепёж +1, металл +2 · '+campaign.caches+'/3');if(campaign.caches>=3)campaignSetStage2();save();return true;}if(site.type==='campaign-relay'){if(state.electronicsPack<3||state.bolts<2){toast('Для ремонта нужно: электроника 3 и крепёж 2 · у тебя '+state.electronicsPack+' / '+state.bolts);return true;}state.electronicsPack-=3;state.bolts-=2;campaignBeginDefense(performance.now());save();return true;}if(site.type==='campaign-convoy'){if(site.remaining>0||zombies.some(z=>z.eventId===site.id)){toast('Колонна ещё под охраной · осталось заражённых: '+Math.max(site.remaining||0,zombies.filter(z=>z.eventId===site.id).length));return true;}state.scrap+=12;state.bolts+=6;state.ammo+=28;state.weaponParts+=2;state.food+=4;campaign.stage=5;campaign.x+=680;campaign.y-=560;const evac=campaignPlaceSite('campaign-extract',campaign.x,campaign.y,'ТОЧКА ЭВАКУАЦИИ');campaign.waveWanted=8;campaign.waveSpawned=0;for(let i=0;i<8&&zombies.length<prefs.infectedCap;i++){const a=i*2.399,x=evac.x+Math.cos(a)*130,y=evac.y+Math.sin(a)*130,kind=['runner','crawler','brute','night'][i%4],before=zombies.length;spawnZombie(x,y,kind,evac.id);if(zombies.length>before){campaign.waveSpawned++;const c=window.ApocalypseCoop;if(c?.room?.status==='running'&&c.isOwner())c.send({kind:'zombie-spawn',x,y,ztype:kind,eventId:evac.id});}}evac.remaining=campaign.waveSpawned;toast('Колонна зачищена: +12 металла, +6 крепежа, +28 патронов. Последний этап — эвакуация!');save();return true;}if(site.type==='campaign-extract'){if(site.remaining>0||zombies.some(z=>z.eventId===site.id)){toast('Точка эвакуации не безопасна · осталось заражённых: '+Math.max(site.remaining||0,zombies.filter(z=>z.eventId===site.id).length));return true;}state.scrap+=24;state.bolts+=12;state.ammo+=45;state.medInjector+=2;state.armorPlate+=2;state.survivorTrust+=8;grantSkillXP(120);campaign.status='complete';campaign.completedAt=Date.now();campaignRemoveSites();save();updateHud();toast('ОПЕРАЦИЯ ЗАВЕРШЕНА! Эвакуация успешна. Получены редкие припасы и 120 опыта.');return true;}return false;}

function updateExpansion(now){
 updateCampaign(now);
 if(!gameActive||activeInterior)return;
 for(const b of buildings){
  if(b.role==='store'&&!visitedStores.has(b.id)&&state.x>b.x+18&&state.x<b.x+b.w-18&&state.y>b.y-b.floors*34+18&&state.y<b.y+b.h-18){
   visitedStores.add(b.id);
   if(Math.random()<.5){const weapon=b.kind==='weapons'?(Math.random()<.55?'shotgun':'rifle'):b.kind==='pharmacy'?'pistol':Math.random()<.55?'pistol':'shotgun';const ammo=weapon==='shotgun'?8:weapon==='rifle'?18:12;storeLoot[b.id]={weapon,ammo,picked:false};toast('В магазине найден тайник с оружием! Осмотри полки');}
   else{storeLoot[b.id]={weapon:'',ammo:0,picked:true};toast('Магазин разграблен. Оружия не осталось');}
   save();
  }
 }
 for(let i=0;i<explorationCaches.length;i++){const p=explorationCaches[i];if(!discoveredLandmarks.has(i)&&Math.hypot(state.x-p.x,state.y-p.y)<175){discoveredLandmarks.add(i);save();if(now-lastLandmarkToast>3500){lastLandmarkToast=now;toast('Обнаружено место: '+p.name);}}}
 if(!supplyDrop&&now>nextSupplyDropAt){
  let x=state.x+(Math.random()-.5)*620,y=state.y+(Math.random()-.5)*620,tries=0;
  while((blocked(x,y)||insideBuilding(x,y)||Math.hypot(x-state.x,y-state.y)<230)&&tries++<24){x=state.x+(Math.random()-.5)*760;y=state.y+(Math.random()-.5)*760;}
  if(!blocked(x,y)&&!insideBuilding(x,y)){supplyDrop={x:Math.max(WORLD_MIN+80,Math.min(WORLD_MAX-80,x)),y:Math.max(WORLD_MIN+80,Math.min(WORLD_MAX-80,y))};save();toast('Замечен сброс припасов. Ищи маяк на местности');}
  nextSupplyDropAt=now+240000;
 }
 if(Math.floor(now/52000)%4===2&&now-lastLightningAt>15000&&Math.random()<.002){lastLightningAt=now;lightningUntil=now+150;}
}

function drawSurvivorHub(){
 const b=survivorCamp.bench,n=survivorCamp.trader;
 ctx.save();ctx.fillStyle='#101710a8';ctx.beginPath();ctx.ellipse(b.x,b.y+17,66,17,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#3d3024';ctx.fillRect(b.x-43,b.y-8,86,12);ctx.fillRect(b.x-37,b.y+4,7,25);ctx.fillRect(b.x+30,b.y+4,7,25);ctx.fillStyle='#94734a';ctx.fillRect(b.x-43,b.y-12,86,8);ctx.strokeStyle='#d1b47b';ctx.lineWidth=2;ctx.strokeRect(b.x-43,b.y-12,86,20);
 ctx.fillStyle='#586d4a';ctx.fillRect(b.x-27,b.y-26,18,14);ctx.fillStyle='#d6bf82';ctx.fillRect(b.x-23,b.y-22,10,6);ctx.fillStyle='#647a83';ctx.fillRect(b.x+4,b.y-29,17,17);ctx.fillStyle='#b7d3d8';ctx.fillRect(b.x+8,b.y-25,9,9);
 ctx.fillStyle='#f0d49a';ctx.font='bold 13px system-ui';ctx.textAlign='center';ctx.fillText('ЛАВКА УЛУЧШЕНИЙ',b.x,b.y-44);
 ctx.save();ctx.translate(n.x,n.y);ctx.fillStyle='#121813aa';ctx.beginPath();ctx.ellipse(0,18,19,7,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#303b35';ctx.fillRect(-11,-2,22,26);ctx.fillStyle='#7d5941';ctx.fillRect(-10,20,8,12);ctx.fillRect(2,20,8,12);ctx.fillStyle='#9d6e4d';ctx.beginPath();ctx.arc(0,-12,10,0,Math.PI*2);ctx.fill();ctx.fillStyle='#392d27';ctx.beginPath();ctx.arc(0,-17,10,Math.PI,Math.PI*2);ctx.fill();ctx.fillStyle='#e8d9b4';ctx.fillRect(-3,-12,2,2);ctx.fillRect(3,-12,2,2);ctx.fillStyle='#a18a63';ctx.fillRect(11,2,8,15);ctx.fillStyle='#d9c18e';ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillText('ТОРГОВЕЦ ИЛЬЯ',0,-34);ctx.restore();if(state.campfireBuilt){ctx.save();ctx.translate(b.x+92,b.y+15);ctx.fillStyle='#17130f';ctx.beginPath();ctx.ellipse(0,12,24,8,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#6f5a42';ctx.lineWidth=4;for(let k=0;k<3;k++){ctx.beginPath();ctx.moveTo(-16+k*14,10);ctx.lineTo(14-k*12,-1);ctx.stroke();}if(state.campfireFuel>0){const pulse=.8+Math.sin(time*.012)*.12;ctx.shadowColor='#ff8a38';ctx.shadowBlur=18;ctx.fillStyle='#ff9a43';ctx.beginPath();ctx.moveTo(-8,8);ctx.quadraticCurveTo(-13,-7,-2,-20);ctx.quadraticCurveTo(0,-10,4,-18);ctx.quadraticCurveTo(17,-2,8,9);ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#ffe39b';ctx.beginPath();ctx.ellipse(0,2,4,8*pulse,0,0,Math.PI*2);ctx.fill();}ctx.restore();}ctx.restore();
}
function drawGeneratorField(){if(!generatorOnline||Math.hypot(generatorConsole.x-state.x,generatorConsole.y-state.y)>Math.max(w,h)+700)return;const radius=410,pulse=.94+Math.sin(time*.003)*.04;ctx.save();ctx.globalCompositeOperation='screen';const glow=ctx.createRadialGradient(generatorConsole.x,generatorConsole.y,18,generatorConsole.x,generatorConsole.y,radius);glow.addColorStop(0,'#b4e6a82b');glow.addColorStop(.55,'#8ecf9b14');glow.addColorStop(1,'#8ecf9b00');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(generatorConsole.x,generatorConsole.y,radius,0,Math.PI*2);ctx.fill();ctx.globalCompositeOperation='source-over';ctx.strokeStyle='#9be2a677';ctx.lineWidth=2;ctx.setLineDash([8,13]);ctx.beginPath();ctx.arc(generatorConsole.x,generatorConsole.y,320*pulse,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);for(let i=0;i<8;i++){const a=time*.0007+i*Math.PI/4,x=generatorConsole.x+Math.cos(a)*320,y=generatorConsole.y+Math.sin(a)*320;ctx.fillStyle='#b9f0ad';ctx.shadowColor='#a2eaa1';ctx.shadowBlur=13;ctx.beginPath();ctx.arc(x,y,3+Math.sin(time*.008+i)*1.2,0,Math.PI*2);ctx.fill();}ctx.shadowBlur=0;ctx.restore();}
function drawAcidProjectiles(){for(const p of acidProjectiles){ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle='#17201999';ctx.beginPath();ctx.ellipse(0,7,9,4,0,0,Math.PI*2);ctx.fill();const g=ctx.createRadialGradient(-3,-4,1,0,0,11);g.addColorStop(0,'#e2f3a6');g.addColorStop(.45,'#a8c95a');g.addColorStop(1,'#557a37');ctx.fillStyle=g;ctx.shadowColor='#a6d75c';ctx.shadowBlur=12;ctx.beginPath();ctx.arc(0,0,8,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#d9ee9a';ctx.beginPath();ctx.arc(-2,-3,2,0,Math.PI*2);ctx.fill();ctx.restore();}}
let cameraZoom=isAndroidDevice?.78:1;
function drawRivers(){for(const r of rivers){if(Math.abs(r.x-state.x)>r.w/2+w+200||Math.abs(r.y-state.y)>r.h/2+h+200)continue;ctx.save();ctx.translate(r.x,r.y);ctx.rotate(r.angle);const grad=ctx.createLinearGradient(0,-90,0,90);grad.addColorStop(0,'#294f5a');grad.addColorStop(.5,'#397b83');grad.addColorStop(1,'#244b55');ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowColor='#0b1e25';ctx.shadowBlur=18;ctx.strokeStyle=grad;ctx.lineWidth=118;ctx.beginPath();ctx.moveTo(-r.w*.52,-r.h*.22);ctx.bezierCurveTo(-r.w*.2,-r.h*.55,r.w*.12,r.h*.48,r.w*.52,r.h*.18);ctx.stroke();ctx.shadowBlur=0;ctx.strokeStyle='#a6d3c455';ctx.lineWidth=2;for(let j=0;j<7;j++){const yy=-r.h*.3+j*r.h*.1+Math.sin(time*.001+j+r.id)*10;ctx.beginPath();ctx.moveTo(-r.w*.42,yy);ctx.quadraticCurveTo(0,yy+Math.sin(time*.0015+j)*20,r.w*.42,yy-12);ctx.stroke();}ctx.restore();}}
function drawSupplyShelters(){for(const s of supplyShelters){if(Math.abs(s.x-state.x)>w+160||Math.abs(s.y-state.y)>h+160)continue;ctx.save();ctx.translate(s.x,s.y);ctx.fillStyle='#11171399';ctx.beginPath();ctx.ellipse(0,28,75,23,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#59634c';ctx.beginPath();ctx.moveTo(-62,8);ctx.lineTo(-38,-39);ctx.lineTo(40,-39);ctx.lineTo(64,8);ctx.closePath();ctx.fill();ctx.strokeStyle='#a2a47b';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#6b4930';ctx.fillRect(-18,7,36,22);ctx.fillStyle='#c4a66b';ctx.fillRect(20,9,26,19);ctx.strokeStyle='#e0c58d';ctx.strokeRect(20,9,26,19);ctx.fillStyle='#f1d69a';ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillText(foundShelterCaches.has(s.id)?'✓':'E · ЯЩИК',0,54);ctx.restore();}}
function draw(){if(activeInterior){drawInteriorMap();return;}const requestedViewScale=prefs.renderDistance==='near'?.82:prefs.renderDistance==='far'?1.22:1,viewScale=(isAndroidDevice?Math.min(requestedViewScale,.9):requestedViewScale)*cameraZoom,viewW=w*viewScale,viewH=h*viewScale;ctx.clearRect(0,0,w,h);ctx.save();ctx.translate(w/2,h/2);ctx.scale(cameraZoom,cameraZoom);ctx.translate(-w/2,-h/2);ctx.translate(w/2-state.x,h/2-state.y);ground();drawRivers();drawSupplyShelters();drawSpawnCampfire();drawDistrictDetails();drawInfectionZones();nearbyTrees(state.x,state.y,Math.max(viewW,viewH)+160).forEach(t=>{if(!t.harvested)tree(t)});buildings.forEach(b=>{if(Math.abs(b.x+b.w/2-state.x)<viewW+b.w&&Math.abs(b.y+b.h/2-state.y)<viewH+b.h)building(b)});drawBuildingEntryPrompts();drawGeneratorField();worldProps.forEach(p=>{if(Math.abs(p.x-state.x)<viewW+180&&Math.abs(p.y-state.y)<viewH+180)drawWorldProp(p)});drawStarterKnife();drawRandomEventSites();if(Math.abs(600-state.y)<h+100){const poleStart=Math.max(WORLD_MIN,Math.floor((state.x-w-100)/330)*330),poleEnd=Math.min(WORLD_MAX,state.x+w+100);for(let x=poleStart+180;x<poleEnd;x+=330)pole(x,600);}wrecks.forEach(v=>{if(Math.abs(v.x-state.x)<viewW+100&&Math.abs(v.y-state.y)<viewH+100)wreck(v)});smoke(800,255);smoke(300,235);drawZombies();drawAcidProjectiles();buildings.forEach(b=>{if(b.x>state.x-w&&b.x<state.x+w&&b.y>state.y-h&&b.y<state.y+h){ctx.fillStyle='#242b27';ctx.fillRect(b.x-22,b.y+b.h+8,10,18);ctx.fillRect(b.x+b.w+12,b.y+b.h+8,10,18);}});drawBarricades();drawSpikeTraps();drawBuildPreview();drawExplorationSites();drawSupplyDrop();drawMark();drawRadioSignal();drawSurvivorHub();drawBaseDefense();drawRemotePlayers();if(worldClock>.62||worldClock<.08){ctx.fillStyle='#07101c55';ctx.fillRect(-w,-h,w*3,h*3)}else{ctx.fillStyle='#d6cfa022';ctx.fillRect(-w,-h,w*3,h*3)}ctx.restore();drawPlayer();drawHeldWeapon();drawFlashlight();updateHud();drawPlayerMap();drawWind();drawWeatherEffects();drawAcidRain();drawWorldAnimation()}
function drawWind(){if(!prefs.weather||prefs.effects==='low'||wind<.3)return;ctx.save();ctx.globalAlpha=.13+wind*.12;ctx.strokeStyle='#e1e6ca';ctx.lineWidth=1;for(let i=0;i<8;i++){let x=(i*137+time*.07*(1+wind))%(w+80)-40,y=(i*83+Math.sin(time*.001+i)*25)%h;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+18,y-4,x+34+wind*20,y-1);ctx.stroke()}ctx.restore()}
let lastThirstDamageAt=0,lastWaterCollectionAt=0;
function updateHydration(dt,now){state.hydration=Math.max(0,state.hydration-.17*dt);if(state.hydration<=15&&now-lastThirstDamageAt>9000){lastThirstDamageAt=now;state.hp=Math.max(0,state.hp-2);toast('Обезвоживание: выпей чистую воду');if(state.hp<=0)showDeath();}}
let rainActive=false,rainRemaining=0,rainStartIn=42+Math.random()*75,lastRainDamageAt=0;
function updateRain(dt,now){if(!prefs.weather){rainActive=false;return;}if(!rainActive){rainStartIn-=dt;if(rainStartIn<=0){rainActive=true;rainRemaining=20+Math.random()*100;toast('Начался кислотный дождь · ищи укрытие');}}else{rainRemaining-=dt;if(!insideBuilding(state.x,state.y)&&now-lastRainDamageAt>5000){lastRainDamageAt=now;state.hp=Math.max(0,state.hp-1);if(state.hp<=0)showDeath();}if(rainRemaining<=0){rainActive=false;rainStartIn=45+Math.random()*125;toast('Дождь закончился');save();}}}
function drawAcidRain(){if(!rainActive)return;ctx.save();ctx.fillStyle='#6d8b4b18';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#b8d28c88';ctx.lineWidth=1;for(let i=0;i<55;i++){const x=(i*83+time*.38)%(w+30)-15,y=(i*47+time*.82)%(h+30)-15;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-5,y+17);ctx.stroke();}ctx.restore();}
function insideRiver(r){const dx=state.x-r.x,dy=state.y-r.y,c=Math.cos(-r.angle),s=Math.sin(-r.angle),x=dx*c-dy*s,y=dx*s+dy*c;return Math.abs(x)<r.w*.51&&Math.abs(y)<r.h*.51&&Math.abs(y-(Math.sin(x/r.w*Math.PI*2)*r.h*.18))<115;}
let lastColdDamageAt=0,lastCampfireFuelAt=0;function updateTemperature(dt,now){const sheltered=insideBuilding(state.x,state.y),spawnFireWarmth=spawnCampfireActive()&&Math.hypot(state.x-spawnCampfire.x,state.y-spawnCampfire.y)<155,legacyFireWarmth=state.campfireBuilt&&state.campfireFuel>0&&Math.hypot(state.x-survivorCamp.bench.x,state.y-survivorCamp.bench.y)<155,nearFire=spawnFireWarmth||legacyFireWarmth,night=worldClock>.62||worldClock<.08,rain=prefs.weather&&wind>.55;let change=nearFire?.45:sheltered?.12:-(night?.11:.04)-(rain?.05:0)-(wind>.7?.02:0);const mode=prefs.survivalDifficulty;state.bodyTemp=Math.max(0,Math.min(100,state.bodyTemp+change*dt*(mode==='hard'?1.35:mode==='easy'?.65:1)));if(legacyFireWarmth&&now-lastCampfireFuelAt>60000){lastCampfireFuelAt=now;state.campfireFuel=Math.max(0,state.campfireFuel-1);}if(state.bodyTemp<12&&now-lastColdDamageAt>10000){lastColdDamageAt=now;state.hp=Math.max(0,state.hp-(mode==='hard'?4:mode==='easy'?1:2));toast('Переохлаждение · укройся или разожги костёр');if(state.hp<=0)showDeath();}}
function applyInfectionDamage(now){if(infectionZones.some(z=>Math.hypot(state.x-z.x,state.y-z.y)<z.r*.72)&&now-lastInfectionDamageAt>2200){lastInfectionDamageAt=now;state.hp=Math.max(0,state.hp-2);state.infection=Math.min(100,state.infection+1);toast('Заражённый воздух: -2 здоровья');if(state.hp<=0)showDeath();save();}if(state.infection>=65&&now-lastInfectionDamageAt>8500){lastInfectionDamageAt=now;const severity=prefs.survivalDifficulty==='hard'?4:prefs.survivalDifficulty==='easy'?1:2;state.hp=Math.max(0,state.hp-severity);state.stamina=Math.max(0,state.stamina-3);toast('Инфекция прогрессирует · используй антибиотики');if(state.hp<=0)showDeath();save();}}
function updateWaterFilter(now){if(!state.waterFilterLevel||!prefs.weather)return;const phase=Math.floor(time/52000)%6;if((phase===3||phase===5)&&now-lastWaterCollectionAt>45000/state.waterFilterLevel&&state.cleanWater<12){lastWaterCollectionAt=now;state.cleanWater=Math.min(12,state.cleanWater+state.waterFilterLevel);toast('Фильтр собрал чистую воду: +'+state.waterFilterLevel);save();}}
function progressContract(kind,amount=1){if(state.contractDay!==state.day){state.contractDay=state.day;state.contractProgress=0;state.contractClaimed=false;}if(state.contractType===kind&&!state.contractClaimed)state.contractProgress=Math.min(99,state.contractProgress+Math.max(0,amount));}
function ensureDailyContract(){if(state.contractDay===state.day)return;state.contractDay=state.day;state.contractType=['wood','kills','salvage'][state.day%3];state.contractProgress=0;state.contractClaimed=false;}
function claimDailyContract(){ensureDailyContract();const requirements={wood:6,kills:4,salvage:3},target=requirements[state.contractType]||4;if(state.contractClaimed){toast('Сегодняшний контракт уже выполнен');return false;}if(state.contractProgress<target){toast('Контракт ещё не выполнен: '+state.contractProgress+'/'+target);return false;}state.contractClaimed=true;state.scrap+=6;state.bolts+=3;state.cleanWater+=2;state.survivorTrust+=2;grantSkillXP(18);save();toast('Контракт выполнен: +6 металла, +3 крепежа, +2 воды');openMark();return true;}
function maxStamina(){return 100+state.runUpgrade*15;}
function ammoCapacity(){return 120+state.ammoUpgrade*30;}
function payResources(cost){if(state.scrap<(cost.scrap||0)||state.wood<(cost.wood||0)||state.bolts<(cost.bolts||0)){toast('Не хватает ресурсов для обмена');return false;}state.scrap-=cost.scrap||0;state.wood-=cost.wood||0;state.bolts-=cost.bolts||0;return true;}
function purchaseSafehouse(){if(state.safehouseLevel>=3){toast('Убежище полностью укреплено');return false;}const costs=[{scrap:8,wood:8,bolts:4},{scrap:14,wood:12,bolts:8},{scrap:22,wood:18,bolts:12}];if(!payResources(costs[state.safehouseLevel]))return false;state.safehouseLevel++;state.hp=Math.min(100,state.hp+10);save();const coop=window.ApocalypseCoop;if(coop?.room?.status==='running')coop.send({kind:'safehouse-upgrade',level:state.safehouseLevel});toast('Убежище укреплено · уровень '+state.safehouseLevel+'/3');openUpgradeBench();return true;}
function purchaseUpgrade(kind){
 const field=kind==='run'?'runUpgrade':'ammoUpgrade',level=state[field];
 if(level>=3){toast('Улучшение уже максимального уровня');return false;}
 const costs=kind==='run'?[{scrap:8,wood:4,bolts:3},{scrap:14,wood:7,bolts:6},{scrap:22,wood:10,bolts:9}]:[{scrap:6,wood:0,bolts:2},{scrap:12,wood:0,bolts:5},{scrap:20,wood:0,bolts:8}];
 if(!payResources(costs[level]))return false;
 state[field]++;if(kind==='run')state.stamina=Math.min(state.stamina,maxStamina());else state.ammo=Math.min(state.ammo,ammoCapacity());
 save();toast(kind==='run'?'Усилитель бега улучшен до уровня '+state.runUpgrade:'Запас патронов увеличен до уровня '+state.ammoUpgrade);openUpgradeBench();return true;
}
function restAtCamp(){
 if(Math.hypot(state.x-survivorCamp.bench.x,state.y-survivorCamp.bench.y)>=105){toast('Передышка доступна только у лагеря');return false;}
 if(state.food<1){toast('Для отдыха нужен хотя бы один паёк');return false;}
 if(state.hp>=100&&state.stamina>=maxStamina()){toast('Ты уже полностью восстановился');return false;}
 state.food--;const restored=Math.min(35,100-state.hp);state.hp=Math.min(100,state.hp+35);state.stamina=maxStamina();
 const previousClock=worldClock;worldClock=(worldClock+10/1440)%1;if(worldClock<previousClock)advanceGameDay();
 save();toast('Передышка завершена · +'+restored+' здоровья · выносливость восстановлена');openUpgradeBench();return true;
}
function openUpgradeBench(){
 const runCosts=['8 металла · 4 дерева · 3 крепежа','14 металла · 7 дерева · 6 крепежа','22 металла · 10 дерева · 9 крепежа'];
 const ammoCosts=['6 металла · 2 крепежа','12 металла · 5 крепежа','20 металла · 8 крепежа'];
 showPanel('Лавка улучшений','Только два постоянных улучшения. Усилитель бега повышает скорость и запас выносливости. Вместимость патронов: '+ammoCapacity()+'. Ресурсы: '+state.scrap+' металла, '+state.wood+' дерева, '+state.bolts+' крепежа.',[
  {icon:'🏃',name:'Усилитель бега · '+(state.runUpgrade>=3?'МАКСИМУМ':'следующий уровень: '+(state.runUpgrade+1)+' · '+runCosts[state.runUpgrade]),count:'Ур. '+state.runUpgrade+'/3',use:()=>purchaseUpgrade('run')},
  {icon:'▣',name:'Запас патронов · '+(state.ammoUpgrade>=3?'МАКСИМУМ':'следующий уровень: '+(state.ammoUpgrade+1)+' · '+ammoCosts[state.ammoUpgrade]),count:state.ammo+'/'+ammoCapacity()+' патронов · ур. '+state.ammoUpgrade+'/3',use:()=>purchaseUpgrade('ammo')},
  {icon:'⛺',name:'Передышка · 1 паёк · +35 здоровья и вся выносливость',count:state.food+' пайков',use:restAtCamp},
  {icon:'🏚️',name:'Укрепить убежище · '+(state.safehouseLevel>=3?'МАКСИМУМ':'уровень '+(state.safehouseLevel+1)+' · '+[{scrap:8,wood:8,bolts:4},{scrap:14,wood:12,bolts:8},{scrap:22,wood:18,bolts:12}][state.safehouseLevel].scrap+' металла и стройматериалы'),count:'Уровень '+state.safehouseLevel+'/3 · припасы каждый день',use:purchaseSafehouse}
 ]);
}
function tradeSupplies(kind){
 const offers={
  bandage:{cost:{scrap:4,bolts:1},give:()=>state.bandage++,label:'Аптечка'},
  food:{cost:{scrap:3},give:()=>state.food+=2,label:'2 пайка'},
  ammo:{cost:{scrap:5,bolts:1},give:()=>{state.ammo+=Math.min(8,Math.max(0,ammoCapacity()-state.ammo));},label:'Патроны'},
  wood:{cost:{scrap:2},give:()=>state.wood+=3,label:'3 дерева'},
  bolts:{cost:{scrap:2},give:()=>state.bolts+=2,label:'2 крепежа'},
  water:{cost:{scrap:2},give:()=>state.cleanWater++,label:'чистая вода'}
 };
 const offer=offers[kind];if(!offer)return false;
 if(kind==='ammo'&&state.ammo>=ammoCapacity()){toast('Запас патронов уже заполнен');return false;}
 if(!payResources(offer.cost))return false;
 offer.give();save();toast('Обмен завершён: '+offer.label);openTrader();return true;
}
function openTrader(){
 showPanel('Торговец Илья','Обменивай металлолом и крепёж на полезные припасы. Патроны нельзя купить сверх вместимости '+ammoCapacity()+'. У тебя: '+state.scrap+' металла · '+state.bolts+' крепежа.',[
  {icon:'🩹',name:'Аптечка · 4 металла + 1 крепёж',count:state.bandage+' шт.',use:()=>tradeSupplies('bandage')},
  {icon:'🥫',name:'2 пайка · 3 металла',count:state.food+' шт.',use:()=>tradeSupplies('food')},
  {icon:'▣',name:'8 патронов · 5 металла + 1 крепёж',count:state.ammo+'/'+ammoCapacity(),use:()=>tradeSupplies('ammo')},
  {icon:'🪵',name:'3 дерева · 2 металла',count:state.wood+' шт.',use:()=>tradeSupplies('wood')},
  {icon:'🔩',name:'2 крепежа · 2 металла',count:state.bolts+' шт.',use:()=>tradeSupplies('bolts')},
  {icon:'💧',name:'Чистая вода · 2 металла',count:state.cleanWater+' бутылок',use:()=>tradeSupplies('water')}
 ]);
}
function interact(){
 if(!gameActive)return;triggerPlayerAction('interact',460);if(activeInterior){interactInterior();return;}if(nearSpawnCampfire()){feedSpawnCampfire();return;}
 if(lastSignalMission&&lastSignalMission.status==='active'&&Math.hypot(state.x-lastSignalMission.x,state.y-lastSignalMission.y)<145){
  if(lastSignalMission.stage===0){startCrashSiteCinematic();return;}
  if(lastSignalMission.stage===1){
   const remaining=zombies.filter(z=>z.eventId==='last_signal_guard').length;
   if(remaining){toast('Сначала зачисти место крушения · осталось заражённых: '+remaining);return;}
   lastSignalMission.stage=2;lastSignalMission.status='completed';
   state.scrap+=12;state.bolts+=6;state.electronicsPack+=2;state.weaponParts+=2;state.medInjector++;state.food+=3;state.survivorTrust+=3;state.radioFinds++;
   if(activeWaypoint?.name==='Маяк бедствия')activeWaypoint=null;
   save();updateHud();showPanel('Последний сигнал · находка','Ты восстановил чёрный ящик и получил координаты тайного убежища. Внутри записи — голос пилота: «Если кто-то слышит… база ещё держится». Награда уже добавлена в рюкзак.',[{icon:'🔩',name:'Металлолом',count:'+12'},{icon:'⚙️',name:'Крепёж',count:'+6'},{icon:'📡',name:'Электроника',count:'+2'},{icon:'🧩',name:'Детали оружия',count:'+2'},{icon:'💉',name:'Медицинский инъектор',count:'+1'},{icon:'🥫',name:'Пайки',count:'+3'},{icon:'📍',name:'Новые координаты убежища',count:'запись найдена'}]);return;
  }
 }
 const river=rivers.find(r=>insideRiver(r));if(river){if(state.waterFilterLevel>0){state.hydration=Math.min(100,state.hydration+35);toast('Выпита отфильтрованная речная вода · +35 жажды');}else{state.hydration=Math.min(100,state.hydration+35);state.infection=Math.min(100,state.infection+12);toast('Заражённая речная вода · +12 инфекции');}save();updateHud();return;}
 const supplyShelter=supplyShelters.find(s=>!foundShelterCaches.has(s.id)&&Math.hypot(state.x-s.x,state.y-s.y)<105);if(supplyShelter){const contents=supplyShelterContents[supplyShelter.id]||[];openLootTransfer('Тайник выживших','Тайник найден. Перетащи каждый предмет в рюкзак; можно забрать содержимое не сразу.',contents,(item,count)=>{if(item.key==='waterFilter')state.waterFilterLevel=Math.min(2,state.waterFilterLevel+1);else state[item.key]=Math.min(999999,(state[item.key]||0)+count);const stored=supplyShelterContents[supplyShelter.id]||[];const found=stored.find(v=>v.name===item.name&&v.key===item.key);if(found)found.count=0;supplyShelterContents[supplyShelter.id]=stored.filter(v=>v.count>0);if(!supplyShelterContents[supplyShelter.id].length)foundShelterCaches.add(supplyShelter.id);return true;});return;}
 const doorTarget=buildings.map(b=>({b,x:b.x+b.w/2,y:b.y+b.h+38,d:Math.hypot(state.x-b.x-b.w/2,state.y-b.y-b.h-38)})).filter(v=>v.d<92).sort((a,b)=>a.d-b.d)[0];if(doorTarget){enterBuilding(doorTarget.b);return;}
 const radioTower=buildings.find(b=>b.id==='radio_tower');if(radioTower&&Math.hypot(state.x-(radioTower.x+radioTower.w/2),state.y-(radioTower.y+radioTower.h/2))<125&&state.scannerLevel>0){if(state.electronicsPack<1){toast('Для сканирования нужна 1 электроника');return;}state.electronicsPack--;const next=explorationCaches.map((p,i)=>({p,i,d:Math.hypot(state.x-p.x,state.y-p.y)})).filter(v=>!foundCaches.has(v.i)).sort((a,b)=>a.d-b.d)[0];if(next){activeWaypoint={name:'Сигнал: '+next.p.name,x:next.p.x,y:next.p.y};toast('Сканер обнаружил: '+next.p.name);}else if(!supplyDrop){supplyDrop={x:Math.max(WORLD_MIN+80,Math.min(WORLD_MAX-80,state.x+420)),y:Math.max(WORLD_MIN+80,Math.min(WORLD_MAX-80,state.y-280))};toast('Сканер засёк аварийный тайник. Проверь точку на карте.');}else{toast('Новых сигналов поблизости нет');}save();updateHud();return;}
 if(!starterKnife.picked&&Math.hypot(state.x-starterKnife.x,state.y-starterKnife.y)<74){starterKnife.picked=true;state.meleeWeapon='knife';save();updateHud();toast('Подобран нож · урон 10');return;}
 if(Math.hypot(state.x-survivorCamp.bench.x,state.y-survivorCamp.bench.y)<105){openUpgradeBench();return;}
 if(Math.hypot(state.x-survivorCamp.trader.x,state.y-survivorCamp.trader.y)<105){openTrader();return;}
 const lootBuilding=buildings.find(b=>b.role==='loot'&&state.x>b.x+18&&state.x<b.x+b.w-18&&state.y>b.y-b.floors*34+18&&state.y<b.y+b.h-18);
 if(lootBuilding){const floor=buildingFloors[lootBuilding.id]||1,roomY=lootBuilding.y+lootBuilding.h-250,cx=lootBuilding.x+lootBuilding.w/2,stairX=cx+lootBuilding.w*.29,lootX=cx-lootBuilding.w*.22,lootY=roomY+78,entry=buildingLoot[lootBuilding.id]?.[floor-1];if(entry?.weaponDrop&&!entry.weaponPicked&&Math.hypot(state.x-(lootX+70),state.y-(lootY+12))<72){openLootTransfer('Оружейный шкаф','Перетащи оружие в рюкзак, чтобы забрать его и патроны.',[{icon:'🔫',name:entry.weaponDrop==='pistol'?'Пистолет':entry.weaponDrop==='shotgun'?'Дробовик':'Винтовка',count:1}],()=>{state.firearm=entry.weaponDrop;state.ammo=Math.min(ammoCapacity(),state.ammo+entry.weaponAmmo);entry.weaponPicked=true;return true;});return;}if(Math.hypot(state.x-stairX,state.y-lootY)<68){buildingFloors[lootBuilding.id]=floor>=lootBuilding.floors?1:floor+1;save();toast('Поднялся на этаж '+buildingFloors[lootBuilding.id]+'/'+lootBuilding.floors);return;}const crateEntry=buildingLoot[lootBuilding.id]?.[floor-1];if(crateEntry&&!crateEntry.picked&&Math.hypot(state.x-lootX,state.y-lootY)<72){const item=crateEntry.item,icons={medInjector:'💉',energyDrink:'⚡',armorPlate:'🛡️',ammoCrate:'📦',weaponParts:'🔧',electronicsPack:'🔌',cleanWater:'💧'};openLootTransfer('Ящик снабжения','Перетащи содержимое ящика в рюкзак.',[{icon:icons[item]||'📦',name:({medInjector:'Медицинский инъектор',energyDrink:'Энергетик',armorPlate:'Бронепластина',ammoCrate:'Ящик патронов',weaponParts:'Детали оружия',electronicsPack:'Комплект электроники',cleanWater:'Чистая вода'})[item]||item,key:item,count:1}],()=>{crateEntry.picked=true;state[item]=Math.min(999999,(state[item]||0)+1);return true;});return;}if(crateEntry?.picked){toast('На этом этаже больше ничего нет');return;}toast('Подойди к лестнице или ящику');return;}
 const indoor=buildings.find(b=>b.role&&state.x>b.x+18&&state.x<b.x+b.w-18&&state.y>b.y-b.floors*34+18&&state.y<b.y+b.h-18);
 if(indoor?.role==='store'){
  const loot=storeLoot[indoor.id];
  if(loot?.weapon&&!loot.picked&&Math.hypot(state.x-(indoor.x+indoor.w/2-72),state.y-(indoor.y+indoor.h-185+76))<72){
   openLootTransfer('Оружие магазина','Перетащи оружие в рюкзак, чтобы забрать его и патроны.',[{icon:'🔫',name:loot.weapon==='shotgun'?'Дробовик':loot.weapon==='rifle'?'Винтовка':'Пистолет',count:1}],()=>{state.firearm=loot.weapon;state.ammo=Math.min(ammoCapacity(),state.ammo+loot.ammo);loot.picked=true;return true;});return;
  }
 }
 const shelter=buildings.find(b=>b.role==='shelter'&&state.x>b.x+18&&state.x<b.x+b.w-18&&state.y>b.y-b.floors*34+18&&state.y<b.y+b.h-18);
 if(shelter&&!lootedShelters.has(shelter.id)&&Math.hypot(state.x-(shelter.x+shelter.w/2+72),state.y-(shelter.y+shelter.h-168))<82){
  if(!Array.isArray(shelterLoot[shelter.id]))shelterLoot[shelter.id]=[{icon:'🥫',name:'Консервы',key:'food',count:3},{icon:'🩹',name:'Аптечка',key:'bandage',count:1},{icon:'🪵',name:'Дерево',key:'wood',count:2}];openLootTransfer('Запасы убежища','Перетащи каждый припас в рюкзак. Можно забрать только нужное.',shelterLoot[shelter.id],(item,count)=>{state[item.key]=Math.min(999999,(state[item.key]||0)+count);const found=shelterLoot[shelter.id].find(v=>v.key===item.key);if(found)found.count=0;shelterLoot[shelter.id]=shelterLoot[shelter.id].filter(v=>v.count>0);if(!shelterLoot[shelter.id].length){lootedShelters.add(shelter.id);state.survivorTrust++;}return true;});return;
 }
 if(interactExpansion())return;if(radioSignal&&Math.hypot(state.x-radioSignal.x,state.y-radioSignal.y)<98){completeRadioSignal();return}if(Math.hypot(state.x-mark.x,state.y-mark.y)<75){openMark();return}let index=wrecks.findIndex(v=>!v.done&&Math.hypot(state.x-v.x,state.y-v.y)<65);if(index>=0){const coop=window.ApocalypseCoop;wrecks[index].done=true;state.quest++;state.scrap++;state.bolts++;progressContract('salvage',1);toast('Детали найдены · '+state.quest+'/3');save();if(coop?.room?.status==='running')coop.send({kind:'wreck-claimed',index,quest:state.quest,by:coop.userId});return}const treeIndex=trees.findIndex((t,i)=>!t.harvested&&Math.hypot(state.x-t.x,state.y-t.y)<48);if(treeIndex>=0){trees[treeIndex].harvested=true;harvestedTrees.add(treeIndex);state.wood+=2;progressContract('wood',2);toast('Собрано древесины: +2');save();const coop=window.ApocalypseCoop;if(coop?.room?.status==='running')coop.send({kind:'tree-harvested',index:treeIndex});return}toast(indoor?'Осмотри помещение: E у полок и ящиков':'Подойди ближе к дереву, машине, зданию или радиомаяку')}
function drawOneBarricade(b,ghost=false,valid=true){ctx.save();ctx.translate(b.x,b.y);ctx.rotate(Number(b.angle)||0);ctx.globalAlpha=ghost?.58:1;ctx.fillStyle=ghost?(valid?'#4de18a55':'#ff554e66'):'#171d18aa';ctx.fillRect(-34,13,68,9);for(let i=0;i<4;i++){ctx.fillStyle=ghost?(valid?'#7fffb0':'#ff8980'):(i%2?'#806c4d':'#9a8056');ctx.fillRect(-32,-13+i*7,64,5);ctx.strokeStyle=ghost?(valid?'#c8ffe0':'#ffd0c9'):'#3a3327';ctx.lineWidth=1;ctx.strokeRect(-32,-13+i*7,64,5);}ctx.fillStyle=ghost?(valid?'#45d986':'#d94e49'):'#4c4939';ctx.fillRect(-27,-21,6,42);ctx.fillRect(21,-21,6,42);if(ghost){ctx.globalAlpha=.22;ctx.fillStyle=valid?'#3cff91':'#ff4038';ctx.beginPath();ctx.arc(0,0,48,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.strokeStyle=valid?'#72ffad':'#ff716a';ctx.lineWidth=3;ctx.strokeRect(-36,-25,72,50);}ctx.restore();}
function drawBarricades(){for(const b of barricades)drawOneBarricade(b,false,true);}
function drawSpikeTrap(t,ghost=false){ctx.save();ctx.translate(t.x,t.y);ctx.rotate(Number(t.angle)||0);ctx.globalAlpha=ghost?.65:1;ctx.fillStyle='#202722';ctx.fillRect(-25,-10,50,20);for(let i=0;i<5;i++){ctx.fillStyle=ghost?'#b7e0c3':'#9ca69a';ctx.beginPath();ctx.moveTo(-21+i*10,-8);ctx.lineTo(-16+i*10,-24);ctx.lineTo(-11+i*10,-8);ctx.closePath();ctx.fill();ctx.strokeStyle='#d2d8ce';ctx.stroke();}ctx.fillStyle='#d4b77a';ctx.font='bold 9px system-ui';ctx.textAlign='center';ctx.fillText('×'+(t.charges??3),0,6);ctx.restore();}
function drawSpikeTraps(){for(const t of spikeTraps)drawSpikeTrap(t);}
function updateSpikeTraps(now){const coop=window.ApocalypseCoop;if(coop?.room&&!coop.isOwner())return;for(let ti=spikeTraps.length-1;ti>=0;ti--){const trap=spikeTraps[ti];if(now<(trap.nextAt||0))continue;const z=zombies.find(v=>Math.hypot(v.x-trap.x,v.y-trap.y)<30);if(!z)continue;trap.charges=Math.max(0,trap.charges-1);trap.nextAt=now+1300;z.hp-=46;z.shockedUntil=now+250;if(z.hp<=0){const zi=zombies.indexOf(z);if(zi>=0)zombies.splice(zi,1);if(z.eventId){const h=randomEventSites.find(v=>v.id===z.eventId);if(h){h.remaining=Math.max(0,(Number(h.remaining)||0)-1);if(coop?.room?.status==='running')coop.send({kind:'horde-progress',eventId:h.id,remaining:h.remaining});}}state.scrap++;progressContract('kills',1);if(coop?.room?.status==='running')coop.send({kind:'zombie-killed',x:z.x,y:z.y});toast('Ловушка уничтожила заражённого · +1 металл');}else if(coop?.room?.status==='running')coop.send({kind:'zombie-hit',x:z.x,y:z.y,damage:46});if(trap.charges<=0){spikeTraps.splice(ti,1);toast('Шипованная ловушка сломалась');}save();}}
function drawBuildPreview(){if(!buildMode)return;const p=buildCandidate(),valid=canPlaceBarricade(p);if(buildType==='spikes')drawSpikeTrap({...p,charges:3},true);else drawOneBarricade(p,true,valid);const status=document.getElementById('buildStatus');if(status)status.textContent=valid?'МЕСТО СВОБОДНО':'МЕСТО ЗАНЯТО';}
function drawInfectionZones(){for(const z of infectionZones){const pulse=1+Math.sin(time*.0017+z.x)*.035;ctx.save();ctx.globalAlpha=.17;const g=ctx.createRadialGradient(z.x,z.y,8,z.x,z.y,z.r*pulse);g.addColorStop(0,'#7da34a88');g.addColorStop(.65,'#587c3b44');g.addColorStop(1,'#334b3000');ctx.fillStyle=g;ctx.beginPath();ctx.arc(z.x,z.y,z.r*pulse,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.55;ctx.strokeStyle='#a3c16a';ctx.setLineDash([7,10]);ctx.beginPath();ctx.arc(z.x,z.y,z.r*.72,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.restore();}}
function attack(){const now=performance.now(),attackDelay=Math.max(360,650-(state.weaponMods.grip||0)*55);if(!gameActive||now-lastAttackAt<attackDelay)return;lastAttackAt=now;let target=null,best=state.firearm&&state.ammo>0?330+(state.weaponMods.optic||0)*35:78;for(const z of zombies){const d=Math.hypot(state.x-z.x,state.y-z.y);if(d<best){best=d;target=z;}}if(!target){triggerPlayerAction('attack',430);const tree=nearbyTrees(state.x,state.y,96).filter(t=>!t.harvested).sort((a,b)=>Math.hypot(state.x-a.x,state.y-a.y)-Math.hypot(state.x-b.x,state.y-b.y))[0];if(tree){const index=trees.indexOf(tree),hits=(treeHitCounts.get(index)||0)+1;treeHitCounts.set(index,hits);if(hits>=5){tree.harvested=true;harvestedTrees.add(index);treeHitCounts.delete(index);state.wood+=4;grantSkillXP(5);save();toast('Дерево срублено · +4 древесины · +5 опыта');}else toast('Удар по дереву · '+hits+'/5');}else toast('Удар выполнен');return;}const ranged=!!state.firearm&&state.ammo>0;const range=ranged?330+(state.weaponMods.optic||0)*35:78;if(best>range){toast(ranged?'Цель слишком далеко':'Рядом нет заражённых');return;}const meleeDamage=state.weaponDurability>0?(state.weaponLevel>=2?46+(state.weaponLevel-2)*6:state.weaponLevel?34:state.meleeWeapon==='knife'?10:4):4,damage=(ranged?(state.firearm==='shotgun'?78:state.firearm==='rifle'?68:48):meleeDamage)+(state.weaponMods.barrel||0)*7+(state.skillLevels.combat||0)*3,appliedDamage=Math.max(1,Math.round(damage*(target.kind==='armored'?.62:1)));if(!ranged&&(state.weaponLevel>0||state.meleeWeapon==='knife')){state.weaponDurability=Math.max(0,state.weaponDurability-1);if(state.weaponDurability===0)toast('Оружие сломалось · отремонтируй его в мастерской');}triggerPlayerAction('attack',ranged?320:430);if(ranged)state.ammo--;target.hp-=appliedDamage;if(target.hp<=0){const i=zombies.indexOf(target);if(i>=0)zombies.splice(i,1);if(target.eventId){const h=randomEventSites.find(v=>v.id===target.eventId);if(h){h.remaining=Math.max(0,(Number(h.remaining)||0)-1);const coop=window.ApocalypseCoop;if(coop?.room?.status==='running')coop.send({kind:'horde-progress',eventId:h.id,remaining:h.remaining});}}progressContract('kills',1);grantSkillXP(12);state.scrap+=(target.kind==='alpha'?12:target.kind==='armored'?4:target.kind==='screecher'?3:target.kind==='spitter'?2:target.kind==='brute'?3:target.kind==='stalker'?2:1)+Math.floor((state.skillLevels.scavenger||0)/2);if(Math.random()<.45+(state.skillLevels.scavenger||0)*.035)state.food++;if(Math.random()<.25)state.bandage++;const coop=window.ApocalypseCoop;if(coop?.room?.status==='running')coop.send({kind:'zombie-killed',x:target.x,y:target.y});toast('Заражённый уничтожен · добыча собрана');}else{const coop=window.ApocalypseCoop;if(coop?.room?.status==='running')coop.send({kind:'zombie-hit',x:target.x,y:target.y,damage:appliedDamage});toast('Попадание · '+appliedDamage+' урона');}save();}
function craft(cost,action){if(state.scrap<cost.scrap||state.wood<cost.wood||state.bolts<cost.bolts){toast('Не хватает ресурсов для изготовления');return false;}state.scrap-=cost.scrap;state.wood-=cost.wood;state.bolts-=cost.bolts;action();save();return true;}
function openWorkshop(){showPanel('Мастерская','Верстак '+state.workbenchLevel+'/3. Развивай производство, лечи заражение, ремонтируй оружие и готовь убежище к рейдам.',[
 {icon:'🛠️',name:'Улучшить верстак · '+(state.workbenchLevel>=3?'максимум':state.workbenchLevel===1?'10 металла + 8 дерева + 5 крепежа':'18 металла + 14 дерева + 10 крепежа'),count:'Уровень '+state.workbenchLevel+'/3',use:()=>{if(state.workbenchLevel>=3){toast('Верстак уже максимального уровня');return;}const cost=state.workbenchLevel===1?{scrap:10,wood:8,bolts:5}:{scrap:18,wood:14,bolts:10};if(craft(cost,()=>state.workbenchLevel++)){toast('Верстак улучшен до уровня '+state.workbenchLevel);openWorkshop();}}},
 {icon:'💊',name:'Антибиотики · 3 металла + 1 дерево + 1 крепёж',count:'В запасе: '+state.antibiotics,use:()=>{if(state.workbenchLevel<2){toast('Нужен верстак 2 уровня');return;}if(craft({scrap:3,wood:1,bolts:1},()=>state.antibiotics++)){toast('Антибиотики изготовлены');openWorkshop();}}},
 {icon:'🔧',name:'Ремонт оружия · 1 деталь или 5 металла + 2 крепежа',count:Math.round(state.weaponDurability)+'%',use:()=>{if(state.weaponDurability>=100){toast('Оружие не нуждается в ремонте');return;}if(state.workbenchLevel<2){toast('Нужен верстак 2 уровня');return;}if(state.weaponParts>0){state.weaponParts--;state.weaponDurability=100;save();toast('Оружие полностью отремонтировано');openWorkshop();}else if(craft({scrap:5,wood:0,bolts:2},()=>state.weaponDurability=100)){toast('Оружие отремонтировано');openWorkshop();}}},
 {icon:'🔥',name:'Костёр у убежища · 8 дерева + 2 металла',count:state.campfireBuilt?'топливо: '+state.campfireFuel:'не установлен',use:()=>{if(!state.campfireBuilt){if(craft({scrap:2,wood:8,bolts:0},()=>{state.campfireBuilt=true;state.campfireFuel=4;})){toast('Костёр построен у лагеря');openWorkshop();}}else{if(state.wood<3){toast('Нужно 3 дерева для топлива');return;}state.wood-=3;state.campfireFuel=Math.min(99,state.campfireFuel+5);save();toast('Костёр пополнен топливом');openWorkshop();}}},
 {icon:'🚙',name:'Починить внедорожник · 18 металла + 5 дерева + 8 крепежа + 1 электроника',count:state.vehicleRepaired?'готов · топливо '+state.fuel:'разобран',use:()=>{if(state.vehicleRepaired){if(state.scrap<4){toast('Нужно 4 металла для канистры');return;}state.scrap-=4;state.fuel+=2;save();toast('Топливо добавлено · '+state.fuel);openWorkshop();return;}if(state.electronicsPack<1){toast('Нужен комплект электроники');return;}if(craft({scrap:18,wood:5,bolts:8},()=>{state.electronicsPack--;state.vehicleRepaired=true;state.fuel=2;})){toast('Внедорожник восстановлен. Установи метку на карте для поездки');openWorkshop();}}},
 {icon:'👥',name:'Сменить роль отряда · '+(state.crewRole==='scavenger'?'сбор ресурсов':state.crewRole==='medic'?'медик':'охранник'),count:state.crewCount+'/3 выживших',use:()=>{state.crewRole=state.crewRole==='scavenger'?'medic':state.crewRole==='medic'?'guard':'scavenger';save();toast('Роль отряда изменена');openWorkshop();}},
 {icon:'🩹',name:'Аптечка · 2 металла + 1 дерево',count:state.bandage,use:()=>{if(craft({scrap:2,wood:1,bolts:0},()=>state.bandage++)){toast('Аптечка изготовлена');openWorkshop();}}},
 {icon:'🗡️',name:'Самодельное копьё · 5 металла + 3 дерева + 2 крепежа',count:state.weaponLevel?'ур. '+state.weaponLevel:'создать',use:()=>{if(state.weaponLevel){toast('Копьё уже изготовлено');return;}if(craft({scrap:5,wood:3,bolts:2},()=>state.weaponLevel=1)){toast('Копьё готово: атака стала сильнее');openWorkshop();}}},
 {icon:'🛡️',name:'Усиленная броня · 6 металла + 4 дерева + 4 крепежа',count:state.armorLevel?'надета':'создать',use:()=>{if(state.armorLevel){toast('Броня уже изготовлена');return;}if(craft({scrap:6,wood:4,bolts:4},()=>state.armorLevel=1)){toast('Броня готова: входящий урон снижен на 32%');openWorkshop();}}},
 {icon:'⚔️',name:'Усилить копьё · 8 металла + 5 дерева + 4 крепежа',count:state.weaponLevel>=2?'максимум':state.weaponLevel?'улучшить':'сначала копьё',use:()=>{if(state.weaponLevel!==1){toast('Сначала изготовь копьё');return;}if(craft({scrap:8,wood:5,bolts:4},()=>state.weaponLevel=2)){toast('Копьё усилено: урон 46');openWorkshop();}}},
 {icon:'🔦',name:'Фонарик · 2 металла + 1 крепёж',count:saved.flashlight?'готово':'создать',use:()=>{if(saved.flashlight){toast('Фонарик уже есть');return;}if(craft({scrap:2,wood:0,bolts:1},()=>saved.flashlight=true)){toast('Фонарик изготовлен');openWorkshop();}}},
 {icon:'🪵',name:'Баррикада · 2 металла + 3 дерева',count:barricades.length+'/24 · выбрать место',use:()=>{if(barricades.length>=24){toast('Лимит укреплений достигнут');return;}if(state.scrap<2||state.wood<3){toast('Нужно 2 металла и 3 дерева');return;}buildAngle=0;setBuildMode(true);}},
 {icon:'🥫',name:'Пайок · 1 металл + 1 дерево',count:state.food,use:()=>{if(craft({scrap:1,wood:1,bolts:0},()=>state.food++)){toast('Пайок изготовлен');openWorkshop();}}},
 {icon:'🪤',name:'Шипованная ловушка · 2 металла + 4 дерева + 1 крепёж',count:spikeTraps.length+'/36 · 3 заряда',use:()=>{if(state.scrap<2||state.wood<4||state.bolts<1){toast('Не хватает ресурсов на ловушку');return;}setBuildMode(true,'spikes');}},
 {icon:'💧',name:'Фильтр дождевой воды · 7 металла + 4 дерева + 1 электроника',count:state.waterFilterLevel+'/2',use:()=>{if(state.waterFilterLevel>=2){toast('Фильтр улучшен до максимума');return;}if(state.electronicsPack<1){toast('Нужен комплект электроники');return;}if(craft({scrap:7,wood:4,bolts:0},()=>{state.electronicsPack--;state.waterFilterLevel++;})){toast('Фильтр воды установлен · уровень '+state.waterFilterLevel);openWorkshop();}}},
 {icon:'📡',name:'Сканер радиовышки · 8 металла + 3 крепежа + 1 электроника',count:state.scannerLevel?'установлен':'создать',use:()=>{if(state.scannerLevel){toast('Сканер уже установлен');return;}if(state.electronicsPack<1){toast('Нужен комплект электроники');return;}if(craft({scrap:8,wood:0,bolts:3},()=>{state.electronicsPack--;state.scannerLevel=1;})){toast('Сканер готов. Ищи радиовышку и нажимай E');openWorkshop();}}}
]);}
function showPanel(title,body,items){document.getElementById('panelTitle').textContent=String(title||'Хранилище').toUpperCase();document.getElementById('panelText').textContent=body;let box=document.getElementById('items');box.innerHTML='';items.forEach(item=>{let slot=document.createElement('div');slot.className='slot filled';slot.tabIndex=item.use?0:-1;slot.dataset.search=(String(item.name||'')+' '+String(item.count??'')+' '+String(item.icon||'')).toLocaleLowerCase('ru');let art=document.createElement('div');art.className='art';art.textContent=item.icon;let name=document.createElement('b');name.textContent=item.name;let count=document.createElement('small');count.textContent=typeof item.count==='string'?item.count:'×'+item.count;slot.append(art,name,count);if(item.use){slot.setAttribute('role','button');slot.setAttribute('aria-label',String(item.name||'Использовать'));slot.addEventListener('click',item.use);slot.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();item.use();}})}box.append(slot)});const search=document.getElementById('panelSearch');if(search){search.value='';search.oninput=()=>{const query=search.value.trim().toLocaleLowerCase('ru');let visible=0;box.querySelectorAll('.slot').forEach(slot=>{const match=!query||slot.dataset.search.includes(query);slot.hidden=!match;if(match)visible++;});const total=box.children.length;const count=document.getElementById('panelSearchCount');if(count)count.textContent=query?visible+'/'+total:'';const empty=document.getElementById('panelSearchEmpty');if(empty)empty.classList.toggle('hidden',visible!==0);};search.oninput();}document.getElementById('invHealth').textContent=state.hp;document.getElementById('invDay').textContent=state.day;document.getElementById('invSpeed').textContent=(wind>=.65?'82%':wind>=.3?'94%':'100%');document.getElementById('weight').textContent=(state.scrap*1.2+state.bandage*.2+state.food*.4).toFixed(1)+' / 40 кг';document.getElementById('panel').classList.remove('hidden');if(search)search.focus({preventScroll:true});}


function buildingContainerItems(entry){const icons={medInjector:'💉',energyDrink:'⚡',armorPlate:'🛡️',ammoCrate:'📦',weaponParts:'🔧',electronicsPack:'🔌',cleanWater:'💧'},names={medInjector:'Медицинский инъектор',energyDrink:'Энергетик',armorPlate:'Бронепластина',ammoCrate:'Ящик патронов',weaponParts:'Детали оружия',electronicsPack:'Комплект электроники',cleanWater:'Чистая вода'};return(entry?.contents||[]).map((v,index)=>({...v,index,key:v.item,icon:icons[v.item]||'📦',name:names[v.item]||v.item,count:1})).filter(v=>!v.picked).map(v=>({...v,tier:v.tier||'common'}));}
function openLootTransfer(title,body,loot,onTake){
 showPanel(title,body,[]);const host=document.getElementById('items');host.className='loot-transfer-layout';host.innerHTML='';
 const source=document.createElement('section');source.className='loot-source';const sourceHead=document.createElement('header');const sourceTitle=document.createElement('b');sourceTitle.textContent='НАЙДЕНО В КОНТЕЙНЕРЕ';const sourceHint=document.createElement('small');sourceHint.textContent='Перетащи предмет вправо';sourceHead.append(sourceTitle,sourceHint);const sourceGrid=document.createElement('div');sourceGrid.className='loot-source-grid';source.append(sourceHead,sourceGrid);
 const bag=document.createElement('section');bag.className='loot-backpack-drop';const bagHead=document.createElement('header');const bagTitle=document.createElement('b');bagTitle.textContent='ТВОЙ РЮКЗАК';const bagHint=document.createElement('small');bagHint.textContent='Отпусти здесь, чтобы забрать';bagHead.append(bagTitle,bagHint);const bagGrid=document.createElement('div');bagGrid.className='loot-bag-grid';bag.append(bagHead,bagGrid);host.append(source,bag);
 const entries=loot.filter(v=>v&&v.count>0).map(v=>({...v}));let dragging=null,ghost=null;
 function render(){
  sourceGrid.innerHTML='';bagGrid.innerHTML='';
  entries.forEach((item,index)=>{if(item.count<=0)return;const card=document.createElement('div');card.className='loot-drag-card';card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label','Перетащить '+item.name+' в рюкзак');
   const art=document.createElement('span');art.className='loot-drag-icon';art.textContent=item.icon||'📦';const name=document.createElement('b');name.textContent=item.name;const count=document.createElement('small');count.textContent='×'+item.count;card.append(art,name,count);
   card.addEventListener('pointerdown',e=>{if(e.button!==undefined&&e.button!==0)return;e.preventDefault();dragging={index,pointerId:e.pointerId};card.classList.add('dragging');ghost=document.createElement('div');ghost.className='loot-drag-ghost';ghost.textContent=(item.icon||'📦')+' '+item.name+' ×'+item.count;document.body.append(ghost);ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';try{card.setPointerCapture(e.pointerId)}catch(_){}});
   card.addEventListener('pointermove',e=>{if(!dragging||dragging.pointerId!==e.pointerId||!ghost)return;ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';bag.classList.add('drop-ready');});
   const finish=e=>{if(!dragging||dragging.pointerId!==e.pointerId)return;const target=document.elementFromPoint(e.clientX,e.clientY),drop=!!target?.closest('.loot-backpack-drop');card.classList.remove('dragging');bag.classList.remove('drop-ready');ghost?.remove();ghost=null;const chosen=entries[dragging.index];dragging=null;if(drop&&chosen&&chosen.count>0){const accepted=onTake({...chosen},chosen.count);if(accepted!==false){chosen.count=0;save();updateHud();render();toast('В рюкзак добавлено: '+chosen.name);}}else if(chosen)toast('Перетащи предмет в область «Твой рюкзак»');};
   card.addEventListener('pointerup',finish);card.addEventListener('pointercancel',e=>{if(dragging?.pointerId===e.pointerId){dragging=null;ghost?.remove();ghost=null;bag.classList.remove('drop-ready');card.classList.remove('dragging')}});
   card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();const accepted=onTake({...item},item.count);if(accepted!==false){item.count=0;save();updateHud();render();}}});sourceGrid.append(card);
  });
  if(!entries.some(v=>v.count>0)){const empty=document.createElement('div');empty.className='loot-empty';empty.textContent='Контейнер пуст. Все припасы забраны.';sourceGrid.append(empty);}
  const owned=inventoryItems().filter(v=>typeof v.count==='number'&&v.count>0).slice(0,18);owned.forEach(item=>{const card=document.createElement('div');card.className='loot-bag-card';const art=document.createElement('span');art.textContent=item.icon;const name=document.createElement('b');name.textContent=item.name;const count=document.createElement('small');count.textContent='×'+item.count;card.append(art,name,count);bagGrid.append(card);});
  if(!owned.length){const empty=document.createElement('div');empty.className='loot-empty';empty.textContent='Рюкзак пока пуст';bagGrid.append(empty);}
  const left=entries.reduce((n,v)=>n+Math.max(0,v.count),0);sourceHint.textContent=left?'Осталось предметов: '+left:'Все припасы забраны';
 }
 render();document.getElementById('panelSearch')?.classList.add('hidden');
}
function openMark(){ensureDailyContract();const contractTargets={wood:6,kills:4,salvage:3},contractTarget=contractTargets[state.contractType]||4,contractNames={wood:'Собрать 6 древесины',kills:'Уничтожить 4 заражённых',salvage:'Разобрать 3 машины'};if(!state.contractClaimed&&state.contractProgress>=contractTarget){showPanel('Доска контрактов','Заказ выполнен: '+contractNames[state.contractType]+'. Забери награду у Марка.',[{icon:'📜',name:contractNames[state.contractType],count:state.contractProgress+'/'+contractTarget},{icon:'🎁',name:'Забрать награду · 6 металла + 3 крепежа + 2 чистой воды',count:'готово',use:claimDailyContract}]);return;}if(state.quest>=3&&state.dayReward!==state.day){state.scrap=Math.max(0,state.scrap-3);state.bandage+=2;state.food++;state.dayReward=state.day;state.quest=0;wrecks.forEach(v=>{if(Math.random()<.6)v.done=false});save();showPanel('Марк · награда','Ты выполнил поручение. Забирай припасы — они пригодятся в дороге.',inventoryItems());return}let msg=state.dayReward===state.day?'Сегодня ты уже помог поселению. Отдохни, завтра будет новое поручение.':'Я Марк. Собери 3 детали с разбитых машин и возвращайся ко мне. За работу дам аптечки и еду. Сейчас собрано: '+state.quest+'/3.';showPanel('Марк · выживший',msg,[{icon:'⚙️',name:'Детали для задания',count:state.quest+'/3'},{icon:'🩹',name:'Награда: аптечки',count:'×2'},{icon:'🥫',name:'Награда: консервы',count:'×1'},{icon:'📜',name:'Контракт дня: '+contractNames[state.contractType],count:state.contractProgress+'/'+contractTarget+(state.contractClaimed?' · выполнен':'')}])}
function useNewLootItem(key,refreshInventory=true){if((state[key]||0)<1){toast('Предмет отсутствует');return;}if(key==='antibiotics'){state.antibiotics--;state.infection=Math.max(0,state.infection-70);toast('Антибиотики подавили инфекцию');}else if(key==='cleanWater'){state.cleanWater--;state.hydration=Math.min(100,state.hydration+45);toast('Чистая вода выпита · жажда утолена');}else if(key==='medInjector'){if(state.hp>=100){toast('Здоровье уже полное');return;}state.medInjector--;state.hp=Math.min(100,state.hp+60+(state.skillLevels.medic||0)*4);toast('Инъектор восстановил здоровье');}else if(key==='energyDrink'){state.energyDrink--;state.stamina=maxStamina();energyBoostUntil=performance.now()+15000;toast('Энергетик: выносливость восстановлена, ускорение на 15 секунд');}else if(key==='armorPlate'){if(state.armorLevel>=5){toast('Броня уже максимального уровня');return;}state.armorPlate--;state.armorLevel=Math.min(5,state.armorLevel+1);toast('Броня усилена до уровня '+state.armorLevel);}else if(key==='ammoCrate'){if(state.ammo>=ammoCapacity()){toast('Боезапас уже заполнен');return;}state.ammoCrate--;const gained=Math.min(30,ammoCapacity()-state.ammo);state.ammo+=gained;toast('Получено патронов: '+gained);}else if(key==='weaponParts'){if(state.weaponLevel>=5){toast('Оружие уже максимального уровня');return;}state.weaponParts--;state.weaponLevel=Math.min(5,state.weaponLevel+1);toast('Уровень оружия повышен: '+state.weaponLevel);}else if(key==='electronicsPack'){state.electronicsPack--;state.scrap+=3;state.bolts+=4;state.radioFinds++;toast('Электроника разобрана: +3 металла, +4 крепежа');}save();updateHud();if(refreshInventory)inventory();}
function useQuickSlot(slot){
 if(!gameActive)return false;
 if(slot===1){
  if(state.bandage<1){toast('Нет аптечек в быстром доступе');return false;}
  if(state.hp>=100){toast('Здоровье уже полное');return false;}
  state.bandage--;state.hp=Math.min(100,state.hp+45+(state.skillLevels.medic||0)*3);triggerPlayerAction('heal',760);toast('Аптечка использована · +45 здоровья');
 }else if(slot===2){
  if(state.food<1){toast('Нет еды в быстром доступе');return false;}
  if(state.hp>=100){toast('Здоровье уже полное');return false;}
  state.food--;state.hp=Math.min(100,state.hp+15);triggerPlayerAction('heal',620);toast('Пайок использован · +15 здоровья');
 }else if(slot===3)return useNewLootItem('medInjector',false);
 else if(slot===4)return useNewLootItem('energyDrink',false);
 else if(slot===5)return useNewLootItem('ammoCrate',false);
 else if(slot===6){
  if(state.armorPlate>0)return useNewLootItem('armorPlate',false);
  if(state.weaponParts>0)return useNewLootItem('weaponParts',false);
  toast('Нет бронепластин или деталей оружия');return false;
 }else return false;
 save();updateHud();return true;
}
function manualSave(){
 const ok=save();
 toast(ok?'Мир сохранён':'Не удалось сохранить мир. Проверь свободное место на устройстве.');
 return ok;
}
function travelToWaypoint(){if(activeInterior){toast('Сначала выйди из здания');return false;}if(!state.vehicleRepaired){toast('Сначала восстанови внедорожник в мастерской');return false;}if(state.fuel<1){toast('Нет топлива · купи канистру в мастерской');return false;}if(!activeWaypoint||!Number.isFinite(activeWaypoint.x)||!Number.isFinite(activeWaypoint.y)){toast('Сначала выбери цель на карте');return false;}const target=findSafeSpawn(activeWaypoint.x,activeWaypoint.y);if(Math.hypot(target.x-state.x,target.y-state.y)<450){toast('Цель слишком близко для поездки');return false;}state.fuel--;state.x=target.x;state.y=target.y;save();updateHud();toast('Поездка завершена: '+activeWaypoint.name+' · топлива '+state.fuel);return true;}
function inventoryItems(){return [{icon:'🚙',name:'Внедорожник · поездка к метке',count:state.vehicleRepaired?'топливо '+state.fuel:'не восстановлен',use:travelToWaypoint},{icon:'☣️',name:'Уровень инфекции',count:Math.round(state.infection)+'%'},{icon:'🌡️',name:'Температура тела',count:Math.round(state.bodyTemp)+'%'},{icon:'👥',name:'Отряд выживших',count:state.crewCount+'/3 · '+state.crewRole},{icon:'🛠️',name:'Уровень верстака',count:state.workbenchLevel+'/3'},{icon:'🔧',name:'Прочность оружия',count:Math.round(state.weaponDurability)+'%'},{icon:'💊',name:'Антибиотики',count:state.antibiotics,use:()=>useNewLootItem('antibiotics')},{icon:'⚙️',name:'Металлолом',count:state.scrap},{icon:'🔫',name:'Огнестрельное оружие',count:state.firearm||'нет'},{icon:'🗡️',name:'Нож',count:state.meleeWeapon==='knife'?'экипирован':starterKnife.picked?'в рюкзаке':'лежит рядом'},{icon:'▣',name:'Патроны',count:state.ammo},{icon:'🪵',name:'Древесина',count:state.wood},{icon:'🔩',name:'Крепёж',count:state.bolts},{icon:'🗡️',name:'Самодельное копьё',count:state.weaponLevel?'ур. '+state.weaponLevel:0},{icon:'🛡️',name:'Усиленная броня',count:state.armorLevel?'надета':'нет'}, {icon:'🩹',name:'Аптечка',count:state.bandage,use:()=>{if(state.bandage<1){toast('Нет аптечек');return}if(state.hp>=100){toast('Здоровье уже полное');return}state.bandage--;state.hp=Math.min(100,state.hp+45);triggerPlayerAction('heal',760);save();updateHud();inventory()}},{icon:'🥫',name:'Консервы',count:state.food,use:()=>{if(state.food<1){toast('Нет еды');return}state.food--;state.hp=Math.min(100,state.hp+15);triggerPlayerAction('heal',620);save();updateHud();inventory()}},{icon:'🔦',name:'Фонарик',count:saved.flashlight?1:0},{icon:'💉',name:'Медицинский инъектор',count:state.medInjector,use:()=>useNewLootItem('medInjector')},{icon:'⚡',name:'Энергетик',count:state.energyDrink,use:()=>useNewLootItem('energyDrink')},{icon:'🛡️',name:'Бронепластина',count:state.armorPlate,use:()=>useNewLootItem('armorPlate')},{icon:'📦',name:'Ящик патронов',count:state.ammoCrate,use:()=>useNewLootItem('ammoCrate')},{icon:'🔧',name:'Детали оружия',count:state.weaponParts,use:()=>useNewLootItem('weaponParts')},{icon:'🔌',name:'Комплект электроники',count:state.electronicsPack,use:()=>useNewLootItem('electronicsPack')},{icon:'💧',name:'Чистая вода',count:state.cleanWater,use:()=>useNewLootItem('cleanWater')},{icon:'💦',name:'Жажда',count:Math.round(state.hydration)+' / 100'},{icon:'📡',name:'Найдено сигналов',count:state.radioFinds},{icon:'🤝',name:'Доверие выживших',count:state.survivorTrust}]}
function inventory(){const all=inventoryItems();if(state.waterFilterLevel>0)all.push({icon:'🧰',name:'Фильтр воды',count:state.waterFilterLevel+' ур.'});const owned=all.filter(item=>typeof item.count==='number'?item.count>0:!['нет','не восстановлен','0'].includes(String(item.count)));showPanel('Рюкзак','Снаряжение и найденные припасы. Задание Марка также отображается здесь.',owned)}
function nearSegment(px,py,x1,y1,x2,y2,limit){
 const dx=x2-x1,dy=y2-y1,len=dx*dx+dy*dy;
 const t=len?Math.max(0,Math.min(1,((px-x1)*dx+(py-y1)*dy)/len)):0;
 const ox=px-(x1+t*dx),oy=py-(y1+t*dy);
 return ox*ox+oy*oy<limit*limit;
}
function interiorBlocked(x,y){
 const r=12;if(x<132+r||x>968-r||y<92+r||y>698-r)return true;
 if(y>676&&!(x>488&&x<612))return true;
 const furniture=[[210,205,150,42],[710,205,150,42],[440,382,160,52],[210,465,105,72],[785,455,105,72],[610,545,90,38]];
 return furniture.some(([fx,fy,fw,fh])=>x>fx-r&&x<fx+fw+r&&y>fy-r&&y<fy+fh+r);
}
function blocked(x,y){
 if(activeInterior)return interiorBlocked(x,y);
 const r=12,wall=r+7;
 if(x<WORLD_MIN+25+r||y<WORLD_MIN+25+r||x>WORLD_MAX-25-r||y>WORLD_MAX-25-r)return true;
 for(const b of buildings){
  const left=b.x,right=b.x+b.w,top=b.y-b.floors*34,bottom=b.y+b.h,cx=(left+right)/2,doorHalf=47;
  // The shell is solid, except for the centered entrance.
  if(nearSegment(x,y,left,top,right,top,wall)||nearSegment(x,y,left,top,left,bottom,wall)||nearSegment(x,y,right,top,right,bottom,wall))return true;
  if(nearSegment(x,y,left,bottom,cx-doorHalf,bottom,wall)||nearSegment(x,y,cx+doorHalf,bottom,right,bottom,wall))return true;
  if(x>left+wall&&x<right-wall&&y>top+wall&&y<bottom-wall)return true;
  if(Math.abs(x-cx)<34&&y>bottom-18&&y<bottom+30)return true;
  // Short lobby side walls and back wall make the interior a real, bounded walkable space.
  const lobbyTop=bottom-126,lobbyHalf=62;
  // New shops and shelters have open, walkable ground floors; older landmarks keep their lobby walls.
  if(!b.role&&(nearSegment(x,y,cx-lobbyHalf,lobbyTop,cx-lobbyHalf,bottom-12,wall)||nearSegment(x,y,cx+lobbyHalf,lobbyTop,cx+lobbyHalf,bottom-12,wall)||nearSegment(x,y,cx-lobbyHalf,lobbyTop,cx+lobbyHalf,lobbyTop,wall)))return true;
 }
 for(const t of nearbyTrees(x,y,70)){if(t.harvested)continue;const rr=10+t.size*8,dx=x-t.x,dy=y-(t.y+7);if(dx*dx+dy*dy<(r+rr)**2)return true;}
 for(const p of worldProps){if(Math.abs(x-p.x)<p.w/2+r+5&&Math.abs(y-p.y)<p.h/2+r+5)return true;}if(Math.hypot(x-survivorCamp.bench.x,y-survivorCamp.bench.y)<53||Math.hypot(x-survivorCamp.trader.x,y-survivorCamp.trader.y)<29)return true;
 for(const v of wrecks){const dx=x-v.x,dy=y-v.y;if(dx*dx+dy*dy<58*58)return true;}
 for(const b of barricades){const dx=x-b.x,dy=y-b.y,a=-(Number(b.angle)||0),lx=dx*Math.cos(a)-dy*Math.sin(a),ly=dx*Math.sin(a)+dy*Math.cos(a);if(Math.abs(lx)<35&&Math.abs(ly)<23)return true;}
 if(radioSignal&&Math.abs(x-radioSignal.x)<31&&Math.abs(y-radioSignal.y)<25)return true;
 return false;
}
function insideBuilding(x,y){return !!activeInterior||buildings.some(b=>x>b.x-20&&x<b.x+b.w+20&&y>b.y-b.floors*34-20&&y<b.y+b.h+20);}
function spawnUnsafe(x,y){return activeInterior?blocked(x,y):insideBuilding(x,y)||blocked(x,y);}
function findSafeSpawn(x,y){for(let radius=36;radius<=1100;radius+=30){const steps=Math.max(12,Math.ceil(radius/22));for(let i=0;i<steps;i++){const a=i*Math.PI*2/steps,cx=x+Math.cos(a)*radius,cy=y+Math.sin(a)*radius;if(cx>WORLD_MIN+40&&cy>WORLD_MIN+40&&cx<WORLD_MAX-40&&cy<WORLD_MAX-40&&!spawnUnsafe(cx,cy))return{x:cx,y:cy};}}for(let radius=90;radius<=1300;radius+=40){for(let i=0;i<24;i++){const a=i*Math.PI/12,cx=440+Math.cos(a)*radius,cy=390+Math.sin(a)*radius;if(!spawnUnsafe(cx,cy))return{x:cx,y:cy};}}return{x:450,y:520};}
function ensureSafeSpawn(showMessage=false){if(!spawnUnsafe(state.x,state.y))return false;const p=findSafeSpawn(state.x,state.y);state.x=p.x;state.y=p.y;save();if(showMessage)toast('Ты появился внутри объекта — перемещён на свободное место');return true;}
function move(dt){
  let dx=moveX,dy=moveY;
  if(keys.has('ArrowUp')||keys.has('w'))dy-=1;
  if(keys.has('ArrowDown')||keys.has('s'))dy+=1;
  if(keys.has('ArrowLeft')||keys.has('a'))dx-=1;
  if(keys.has('ArrowRight')||keys.has('d'))dx+=1;
  let len=Math.hypot(dx,dy);
  if(len>.08){dx/=Math.max(1,len);dy/=Math.max(1,len);const speed=160*(wind>=.65?.82:wind>=.3?.94:1);const nx=state.x+dx*speed*dt,ny=state.y+dy*speed*dt;if(!blocked(nx,state.y))state.x=nx;if(!blocked(state.x,ny))state.y=ny;}
}
function setupJoystick(){const joy=document.getElementById('joy'),stick=document.getElementById('stick');function set(e){let r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,max=r.width*.32,len=Math.hypot(dx,dy);if(len>max){dx=dx/len*max;dy=dy/len*max}moveX=dx/max;moveY=dy/max;stick.style.transform='translate('+dx+'px,'+dy+'px)'}function end(){joyPointer=null;moveX=moveY=0;stick.style.transform='translate(0,0)'}joy.addEventListener('pointerdown',e=>{e.preventDefault();joyPointer=e.pointerId;joy.setPointerCapture(e.pointerId);set(e)});joy.addEventListener('pointermove',e=>{if(e.pointerId===joyPointer){e.preventDefault();set(e)}});['pointerup','pointercancel','lostpointercapture'].forEach(t=>joy.addEventListener(t,end))}
let prev=performance.now(),lastAutoSave=0,lastMobileDrawAt=0;function loop(now){if(now-lastExpansionUpdate>=250){lastExpansionUpdate=now;updateExpansion(now);updateAmbientEvents(now);}let dt=Math.min(.04,(now-prev)/1000);prev=now;time=now;if(gameActive){ensureDailyContract();updateHydration(dt,now);updateRain(dt,now);updateTemperature(dt,now);updateWaterFilter(now);const moving=Math.hypot(moveX,moveY)>.08||['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].some(k=>keys.has(k));if(state.stamina<=0)sprintLocked=true;if(sprintLocked&&!sprintHeld&&state.stamina>=25)sprintLocked=false;sprintActive=!!((sprintHeld||prefs.autoSprint)&&moving&&state.stamina>0&&!sprintLocked&&state.hydration>=10);if(sprintActive)state.stamina=Math.max(0,state.stamina-34*dt);else state.stamina=Math.min(maxStamina(),state.stamina+(moving?17:27)*(state.bodyTemp<20?.55:1)*dt);move((sprintActive?dt*(1.5+state.runUpgrade*.12):dt)*(energyBoostUntil>now?1.22:1));updateZombies(dt,now);updateBaseDefense(now);updateRadioSignal(now);if(now-lastAutoSave>=prefs.autosaveSeconds*1000){lastAutoSave=now;save();}}const coop=window.ApocalypseCoop;if(gameActive&&coop?.room?.status==='running'&&now-lastNet>250){lastNet=now;coop.sendPosition?.({kind:'position',x:state.x,y:state.y,hp:state.hp,day:state.day,name:playerName,worldClock,interiorId:activeInterior?.buildingId||null,interiorFloor:activeInterior?.floor||0,avatar:{...colors},moving:Math.hypot(moveX,moveY)>.08||['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].some(k=>keys.has(k)),phase:state.x*.013+state.y*.009});}if(!isAndroidDevice||now-lastMobileDrawAt>=1000/prefs.maxFps){lastMobileDrawAt=now;draw()}requestAnimationFrame(loop)}
function daily(){dayWind()}
function focusGame(){try{canvas.focus({preventScroll:true});}catch(_){canvas.focus();}}
function closeMobileQuickMenu(resume=true){const shouldResume=mobileQuickMenuResume;mobileQuickMenuResume=false;const menu=document.getElementById('mobileQuickMenu');if(menu)menu.classList.add('hidden');document.body.classList.remove('quick-menu-open');if(resume&&shouldResume){gameActive=true;focusGame();}}
function openMobileQuickMenu(){const menu=document.getElementById('mobileQuickMenu');if(!menu)return;mobileQuickMenuResume=gameActive;gameActive=false;sprintHeld=false;keys.clear();moveX=moveY=0;joyPointer=null;const stick=document.getElementById('stick');if(stick)stick.style.transform='translate(0,0)';menu.classList.remove('hidden');document.body.classList.add('quick-menu-open');}
function leaveToMenu(){save();gameActive=false;deathHandled=false;sprintHeld=false;closeMobileQuickMenu(false);keys.clear();moveX=moveY=0;document.getElementById('deathOverlay').classList.add('hidden');document.body.classList.add('menu-open');document.getElementById('mainMenu').classList.remove('menu-out');}
function exitGame(){save();const api=window.pywebview?.api;if(api?.close_app){api.close_app();return;}if(window.Android?.exitGame){window.Android.exitGame();return;}if(history.length>1){history.back();return;}location.href='hub.html';}
const JOURNAL_DATA=window.APOCALYPSE_CHANGELOG||null;
const JOURNAL_VERSION=JOURNAL_DATA?.version||'unknown';
const JOURNAL_SEEN_KEY='skyrealm_apocalypse_journal_seen_'+JOURNAL_VERSION;
function renderUpdateJournal(){
 const version=document.getElementById('journalVersion');
 const intro=document.getElementById('journalIntro');
 const host=document.getElementById('journalEntries');
 if(!host)return;
 host.replaceChildren();
 if(!JOURNAL_DATA||!Array.isArray(JOURNAL_DATA.sections)){
  if(intro)intro.textContent='Не удалось загрузить журнал обновлений. Попробуй открыть его позже.';
  if(version)version.textContent='ДАННЫЕ НЕДОСТУПНЫ';
  return;
 }
 if(version)version.textContent='v'+JOURNAL_DATA.version+' / PC '+(JOURNAL_DATA.pcVersion||'—')+(JOURNAL_DATA.date?' · '+JOURNAL_DATA.date:'');
 if(intro)intro.textContent=JOURNAL_DATA.intro||'Изменения последнего обновления.';
 for(const section of JOURNAL_DATA.sections){
  const heading=document.createElement('div');
  heading.className='journal-section-title';
  heading.textContent=(section.icon?section.icon+'　':'')+String(section.title||'Изменения');
  host.appendChild(heading);
  for(const feature of (Array.isArray(section.features)?section.features:[])){
   const item=document.createElement('div');
   item.className='journal-item';
   const icon=document.createElement('div');
   icon.className='journal-icon';
   icon.textContent=section.icon||'•';
   const copy=document.createElement('div');
   const title=document.createElement('b');
   title.textContent=String(feature.title||'Изменение');
   const description=document.createElement('p');
   description.textContent=String(feature.description||'');
   copy.append(title,description);
   item.append(icon,copy);
   host.appendChild(item);
  }
 }
}

let journalResumeGame=false;
function openUpdateJournal(resumeGame=false){
 const panel=document.getElementById('updateJournal');
 if(!panel)return;
 renderUpdateJournal();
 journalResumeGame=!!resumeGame&&gameActive;
 if(journalResumeGame)gameActive=false;
 keys.clear();moveX=moveY=0;
 panel.classList.remove('hidden');
}
function closeUpdateJournal(){
 const panel=document.getElementById('updateJournal');
 if(panel)panel.classList.add('hidden');
 try{localStorage.setItem(JOURNAL_SEEN_KEY,'1')}catch(_){}
 if(journalResumeGame){gameActive=true;focusGame();}
 journalResumeGame=false;
}
function showJournalOnWorldEntry(resumeGame=true){
 let seen=false;try{seen=localStorage.getItem(JOURNAL_SEEN_KEY)==='1'}catch(_){}
 if(!seen)openUpdateJournal(resumeGame);
}
function beginLastSignalEvent(){
 if(!lastSignalMission){
  let x=state.x+760,y=state.y-520,found=false;
  for(let i=0;i<28;i++){const a=i*.91,d=3500+(i%7)*115,nx=Math.max(WORLD_MIN+180,Math.min(WORLD_MAX-180,state.x+Math.cos(a)*d)),ny=Math.max(WORLD_MIN+180,Math.min(WORLD_MAX-180,state.y+Math.sin(a)*d));if(Math.hypot(nx-state.x,ny-state.y)>=3200&&!blocked(nx,ny)&&!insideBuilding(nx,ny)&&worldProps.every(p=>Math.hypot(nx-p.x,ny-p.y)>260)&&buildings.every(b=>Math.hypot(nx-(b.x+b.w/2),ny-(b.y+b.h/2))>Math.max(b.w,b.h)+190)){x=nx;y=ny;found=true;break;}}
  if(!found){const dir=state.x<WORLD_MAX-3900?1:-1;x=Math.max(WORLD_MIN+200,Math.min(WORLD_MAX-200,state.x+dir*3600));y=Math.max(WORLD_MIN+200,Math.min(WORLD_MAX-200,state.y-700));}
  lastSignalMission={status:'briefing',stage:0,x,y};worldProps.push({id:'last_signal_crash',type:'crash_site',x,y,w:190,h:132});save();
 }
 if(lastSignalMission.status==='completed')return;
 if(lastSignalMission.status==='briefing'){
  const journalOpen=!document.getElementById('updateJournal')?.classList.contains('hidden');if(!journalOpen)gameActive=false;keys.clear();moveX=moveY=0;document.getElementById('lastSignalIntro')?.classList.remove('hidden');
 }else if(lastSignalMission.status==='active'){
  activeWaypoint={name:'Маяк бедствия',x:lastSignalMission.x,y:lastSignalMission.y};save();
 }
}
function acceptLastSignal(){
 if(!lastSignalMission)return;
 lastSignalMission.status='active';activeWaypoint={name:'Маяк бедствия',x:lastSignalMission.x,y:lastSignalMission.y};
 document.getElementById('lastSignalIntro')?.classList.add('hidden');const journalOpen=!document.getElementById('updateJournal')?.classList.contains('hidden');gameActive=!journalOpen;if(gameActive)focusGame();save();toast('Координаты приняты · смотри на радар и компас');
}
function worldSaveKey(id){return id==='main'?'skyrealm_apocalypse_mobile_v1':WORLD_SAVE_PREFIX+id;}
function persistWorldCatalog(){try{localStorage.setItem(WORLD_CATALOG_KEY,JSON.stringify(worldCatalog));}catch(_){toast('Не удалось сохранить список миров');}}
function showWorldManager(){gameActive=false;keys.clear();moveX=moveY=0;document.getElementById('mainMenu').classList.add('menu-out');document.getElementById('worldManager').classList.remove('hidden');renderWorldManager();}
function hideWorldManager(){document.getElementById('worldManager').classList.add('hidden');document.getElementById('mainMenu').classList.remove('menu-out');}
function renderWorldManager(){
 const host=document.getElementById('worldList');if(!host)return;host.replaceChildren();
 const count=document.getElementById('worldCount');if(count)count.textContent=worldCatalog.length+' / 30 миров';
 if(!worldCatalog.length){const empty=document.createElement('div');empty.className='world-empty';empty.textContent='Пока нет миров. Создай новый, чтобы начать выживание.';host.appendChild(empty);return;}
 worldCatalog.forEach(world=>{
  const card=document.createElement('article');card.className='world-card'+(world.id===currentWorldId?' selected':'');
  const info=document.createElement('div');info.className='world-card-info';
  const name=document.createElement('b');name.textContent=world.name;
  const meta=document.createElement('small');meta.textContent=(world.id===currentWorldId?'ТЕКУЩИЙ МИР · ':'СОХРАНЕНИЕ · ')+new Date(world.createdAt||Date.now()).toLocaleDateString();
  info.append(name,meta);
  const actions=document.createElement('div');actions.className='world-card-actions';
  const play=document.createElement('button');play.className='world-play';play.textContent='▶ Играть';play.onclick=()=>{try{localStorage.setItem(CURRENT_WORLD_KEY,world.id);sessionStorage.setItem('apoc_play_cinematic','1');location.reload();}catch(_){toast('Не удалось открыть мир');}};
  const edit=document.createElement('button');edit.className='world-small';edit.textContent='Персонаж';edit.title='Настроить внешность персонажа этого мира';edit.onclick=()=>{try{localStorage.setItem(CURRENT_WORLD_KEY,world.id);sessionStorage.setItem('apoc_open_character_creator','edit');location.reload();}catch(_){toast('Не удалось открыть редактор');}};
  const rename=document.createElement('button');rename.className='world-small';rename.textContent='✎';rename.title='Переименовать мир';rename.onclick=()=>{const next=prompt('Новое название мира',world.name);if(next&&next.trim()){world.name=next.trim().slice(0,32);persistWorldCatalog();renderWorldManager();}};
  const del=document.createElement('button');del.className='world-small danger';del.textContent='Удалить';del.onclick=()=>{if(!confirm('Удалить мир «'+world.name+'» вместе со всем его сохранением? Это действие нельзя отменить.'))return;try{localStorage.removeItem(worldSaveKey(world.id));}catch(_){}worldCatalog=worldCatalog.filter(w=>w.id!==world.id);const deletedCurrent=currentWorldId===world.id;if(deletedCurrent){currentWorldId=worldCatalog[0]?.id||'';try{localStorage.setItem(CURRENT_WORLD_KEY,currentWorldId);sessionStorage.setItem('apoc_open_world_manager','1');}catch(_){}}persistWorldCatalog();if(deletedCurrent){location.reload();return;}renderWorldManager();};
  actions.append(play,edit,rename,del);card.append(info,actions);host.appendChild(card);
 });
}
function createApocalypseWorld(){
 const field=document.getElementById('newWorldName'),name=(field?.value||'').trim().slice(0,32);
 if(!name){field?.focus();toast('Введи название нового мира');return;}
 if(worldCatalog.length>=30){toast('Можно создать не больше 30 миров');return;}
 const id='w'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
 worldCatalog.push({id,name,createdAt:Date.now()});persistWorldCatalog();
 try{localStorage.setItem(CURRENT_WORLD_KEY,id);sessionStorage.setItem('apoc_open_character_creator','new');location.reload();}catch(_){toast('Не удалось создать мир');}
}
let characterCreatorThenIntro=false;
function characterArtworkSvg(v={},seed=0){
 const pick=(id,fallback)=>String(v[id]??fallback);
 const color=(id,fallback)=>/^#[0-9a-f]{6}$/i.test(pick(id,fallback))?pick(id,fallback):fallback;
 const skin=color('charSkin','#d9a77e'),hair=color('charHair','#3b302d'),shirt=color('charShirt','#526b4c'),trim=color('charTrim','#b2aa83'),pants=color('charPants','#343b3a'),boots=color('charBoots','#252b28'),eyes=color('charEyes','#354c61'),white=color('charEyeWhite','#f2e9d8'),brow=color('charBrowColor',hair),lips=color('charLipColor','#915b55'),hairHi=color('charHairAccent','#a78b69'),metal=color('charMetalColor','#b5ad8d'),skinShade=color('charSkinDetail','#875743'),pattern=color('charPatternColor','#3c503b'),beltColor=color('charBeltColor','#786744'),glove=color('charGloveColor','#454a42'),packColor=color('charPackColor','#3e5144'),cloakColor=color('charCloakColor','#59634b'),beardColor=color('charBeardColor',hair),undershirt=color('charUndershirtColor','#343c38');
 const style=pick('charHairStyle','short'),beard=pick('charBeard','none'),head=pick('charHeadgear','none'),face=pick('charFaceAccessory','none'),faceShape=pick('charFaceShape','normal'),eyeStyle=pick('charEyeStyle','normal'),outfit=pick('charOutfit','survivor'),outer=pick('charOuterwear','none'),fabric=pick('charFabric','solid'),condition=pick('charCondition','worn'),cloak=pick('charCloak','none'),pack=pick('charBackpack','none'),belt=pick('charBelt','utility'),gloves=pick('charGloves','none'),pantsStyle=pick('charPantsStyle','cargo'),footwear=pick('charFootwear','combat'),markings=pick('charMarkings','none'),scar=pick('charScar','no')==='yes',patch=pick('charPatch','none'),body=pick('charBodyType','average'),size=pick('charGarmentSize','M');
 const hairPaths={
 short:'M64 73 Q61 49 79 40 Q96 31 112 45 Q120 53 115 75 L106 64 Q91 53 76 65Z',
 long:'M63 75 Q58 43 80 37 Q104 29 117 53 L119 147 Q111 151 107 137 L106 69 Q87 54 73 69 L72 145 Q63 151 59 140Z',
 shaved:'M66 66 Q67 45 88 41 Q107 40 115 62 L111 69 Q91 57 69 70Z',
 mohawk:'M82 71 L80 57 L83 40 L88 22 L94 40 L100 24 L102 54 L99 72Z',
 bun:'M64 71 Q61 47 82 39 Q105 32 116 57 L111 76 Q94 57 73 70Z M86 39 Q80 23 94 18 Q109 20 105 39Z',
 fade:'M65 68 Q66 45 86 41 Q105 37 115 56 L111 71 Q91 57 72 72Z',
 crew:'M65 70 Q64 47 84 41 Q105 37 115 57 L109 66 Q89 57 72 68Z',
 undercut:'M62 73 Q62 44 83 39 Q108 33 117 55 L112 69 Q93 54 74 68 L72 81Z',
 sidepart:'M63 71 Q65 43 89 39 Q110 38 117 58 Q104 54 93 59 Q80 65 66 75Z',
 slickback:'M62 70 Q65 41 88 39 Q111 38 118 61 Q102 51 85 52 Q72 54 63 72Z',
 curly:'M65 72 Q55 61 62 50 Q58 39 73 39 Q77 26 91 34 Q104 26 111 42 Q126 46 117 62 L111 76 Q96 57 73 72Z',
 wavy:'M63 72 Q56 54 68 47 Q69 34 83 38 Q91 29 101 39 Q116 35 119 53 L113 74 Q99 57 74 71Z',
 afro:'M63 75 Q54 62 59 51 Q57 37 72 35 Q77 23 91 29 Q105 22 112 37 Q127 43 120 60 L114 78 Q92 58 68 77Z',
 dreadlocks:'M63 69 Q61 43 83 37 Q105 32 117 55 L113 91 L106 92 L103 68 Q91 55 75 69 L72 92 L65 91Z',
 braids:'M64 70 Q61 45 84 38 Q108 33 117 58 L110 73 Q91 55 72 71Z',
 ponytail:'M64 72 Q60 44 83 38 Q109 32 117 57 L111 75 Q95 55 72 72Z',
 twintails:'M64 70 Q61 44 83 38 Q108 33 117 58 L111 74 Q91 55 72 72Z',
 bob:'M64 71 Q60 42 85 38 Q108 35 117 57 L115 115 Q107 123 103 106 L103 69 Q88 58 74 70 L73 116 Q65 123 61 112Z',
 pixie:'M65 71 Q62 45 85 39 Q107 37 115 55 L106 67 Q93 58 75 71Z',
 shag:'M63 74 Q56 45 82 38 Q108 31 118 56 L121 109 L110 100 L105 75 Q91 56 74 72 L67 106 L59 103Z',
 wolfcut:'M62 72 Q57 43 82 36 Q108 31 119 57 L123 121 L111 109 L104 72 Q89 54 73 70 L66 117 L58 106Z',
 mullet:'M64 72 Q60 43 83 38 Q108 32 117 57 L116 133 L108 130 L104 72 Q88 56 73 72Z',
 spiky:'M64 72 L61 55 L70 58 L71 40 L83 53 L91 31 L99 51 L112 39 L109 57 L119 53 L114 75Z',
 messy:'M63 73 Q58 48 74 45 L70 34 L85 41 L91 28 L100 43 L116 36 L111 53 L120 59 L111 76 Q91 57 72 72Z',
 fringe:'M64 71 Q60 43 84 38 Q109 34 117 58 L108 71 L101 60 L94 72 L87 59 L78 72Z',
 sidefringe:'M63 70 Q63 43 86 39 Q109 36 117 57 L110 70 Q96 59 78 76 L71 70Z',
 balding:'M66 67 Q68 46 87 42 Q104 40 114 57 L108 62 Q90 55 72 68Z',
 topknot:'M64 71 Q61 45 84 38 Q109 31 117 57 L111 73 Q92 55 73 72Z M85 40 Q81 23 95 17 Q108 19 105 39Z',
 braidlong:'M64 70 Q61 44 84 38 Q108 32 117 58 L110 73 Q91 55 72 71Z',
 braidside:'M64 71 Q61 44 84 38 Q108 33 117 58 L110 74 Q92 54 72 72Z',
 cornrows:'M65 71 Q61 43 85 38 Q109 34 117 58 L111 68 Q91 54 72 70Z',
 locs:'M64 71 Q60 44 83 37 Q107 31 117 56 L113 95 L106 100 L103 69 Q90 54 73 70 L70 98 L63 98Z',
 shoulder:'M63 72 Q60 43 84 37 Q109 32 118 57 L118 129 L110 136 L106 71 Q89 55 73 72 L71 136 L62 129Z',
 layered:'M63 72 Q60 44 84 37 Q109 33 118 57 L119 118 L108 108 L104 70 Q89 56 73 71 L68 112 L60 103Z',
 curtain:'M63 72 Q61 42 85 38 Q110 35 117 57 L109 73 Q103 60 93 56 L92 78 L84 57 Q75 61 71 76Z',
 pompadour:'M62 69 Q63 39 86 31 Q109 28 117 55 Q99 48 88 50 Q74 51 63 72Z',
 quiff:'M63 70 Q62 40 84 35 Q107 32 116 56 L109 70 Q96 55 80 59Z',
 bowl:'M62 73 Q59 42 88 38 Q116 39 119 68 L112 75 L107 63 Q90 57 73 64 L68 76Z',
 buzz:'M66 66 Q68 47 88 43 Q106 41 114 61 L109 67 Q89 59 71 69Z',
 military:'M66 68 Q67 45 87 42 Q106 40 114 60 L109 67 Q90 59 71 69Z',
 messybun:'M63 72 Q61 45 83 38 Q107 33 117 57 L111 73 Q92 55 73 72Z M84 42 Q79 23 97 18 Q111 22 104 42Z',
 doublebun:'M64 72 Q60 45 84 38 Q109 34 117 59 L111 72 Q92 56 72 72Z M72 42 Q67 26 81 24 Q93 27 86 42Z M98 41 Q94 24 108 23 Q119 28 111 43Z',
 frenchbraid:'M63 71 Q61 43 84 38 Q108 32 117 58 L111 74 Q92 55 72 72Z',
 fishtail:'M64 71 Q61 44 84 38 Q108 32 117 58 L110 72 Q91 56 73 72Z',
 ribbon:'M64 72 Q61 44 84 38 Q108 32 117 58 L110 74 Q91 55 72 72Z',
 spikehawk:'M67 72 L65 55 L77 53 L83 35 L92 49 L103 34 L106 54 L118 56 L111 74Z',
 longcurl:'M63 72 Q58 42 83 36 Q108 29 118 57 L119 136 Q111 148 106 128 L105 71 Q89 54 73 71 L70 135 Q61 147 59 130Z',
 halfup:'M63 72 Q61 42 84 37 Q108 32 117 57 L112 75 Q92 55 72 72Z M86 38 Q84 23 97 20 Q107 22 102 40Z'
 };
 const hairPath=hairPaths[style]||hairPaths.short;
 const headPath=faceShape==='angular'?'M69 57 Q70 42 90 40 Q110 42 111 57 L106 91 L90 111 L74 91Z':faceShape==='round'?'M68 60 Q68 39 90 39 Q112 39 112 60 Q113 100 90 111 Q67 100 68 60Z':faceShape==='square'?'M68 55 Q70 39 90 39 Q110 39 112 55 L111 91 L101 109 L79 109 L69 91Z':faceShape==='heart'?'M68 55 Q67 38 90 39 Q113 38 112 55 Q109 83 90 111 Q71 83 68 55Z':faceShape==='long'?'M73 54 Q74 38 90 38 Q106 38 107 54 L105 96 Q101 112 90 116 Q79 112 75 96Z':'M69 57 Q70 40 90 40 Q110 40 111 57 L106 94 Q101 111 90 112 Q79 111 74 94Z';
 const hairExtra=['ponytail','twintails','braids','braidlong','braidside','frenchbraid','fishtail','dreadlocks','locs','cornrows','ribbon','longcurl'].includes(style)?'<path d="M111 65 Q128 83 122 120" fill="none" stroke="'+hair+'" stroke-width="7" stroke-linecap="round"/><path d="M111 66 Q127 84 122 120" fill="none" stroke="'+hairHi+'" stroke-opacity=".72" stroke-width="1.2" stroke-linecap="round"/>':'';
 const curlTexture=['curly','longcurl','afro','wavy'].includes(style)?Array.from({length:13},(_,i)=>'<circle cx="'+(67+(i%5)*11)+'" cy="'+(46+Math.floor(i/5)*5)+'" r="3.4" fill="'+hairHi+'" opacity=".55"/>').join(''):'';
 const braidTexture=['braids','braidlong','braidside','frenchbraid','fishtail','dreadlocks','locs','cornrows'].includes(style)?'<path d="M72 60 Q79 67 73 77 Q82 82 76 92 M82 52 Q89 60 83 70 Q92 76 86 86 M100 52 Q94 60 101 70 Q93 76 99 86" fill="none" stroke="'+hairHi+'" stroke-width="1.4" stroke-linecap="round"/>':'';
 const hairStrands=Array.from({length:style==='afro'?22:style==='dreadlocks'||style==='locs'?14:11},(_,i)=>{const x=66+(i%6)*8.2,y=47+Math.floor(i/6)*7.2,dx=((i%3)-1)*3;return '<path d="M'+x+' '+y+' Q'+(x+dx)+' '+(y-7)+' '+(x+4+dx)+' '+(y-10)+'" fill="none" stroke="'+(i%3===0?hairHi:'#151b18')+'" stroke-opacity="'+(i%3===0?'.58':'.22')+'" stroke-width="'+(i%4===0?'1.8':'.8')+'" stroke-linecap="round"/>';}).join('');
 const eyeSize=eyeStyle==='wide'?[8,6]:eyeStyle==='round'?[5.2,5.8]:eyeStyle==='narrow'?[8.2,2.8]:eyeStyle==='hooded'?[7.8,3.3]:eyeStyle==='tired'?[8,3.2]:eyeStyle==='sharp'?[8.5,3.2]:eyeStyle==='sleepy'?[8,2.6]:eyeStyle==='soft'?[7.2,4.1]:[8,4.4];
 const eyeShape=eyeStyle==='sharp'?' M0 0 Q8 -4 16 0 Q9 6 0 0Z':eyeStyle==='hooded'?' M0 0 Q8 -4 16 0 Q8 4 0 0Z':'';
 const pupilSize=eyeStyle==='wide'||eyeStyle==='round'?2.5:2.15;
 const eyeWhiteId=white;
 const garmentWidth=body==='slim'||body==='lanky'?55:body==='strong'||body==='athletic'?76:body==='stocky'||body==='bulky'?80:68;
 const garmentScale=size==='XS'?.86:size==='S'?.93:size==='L'?1.06:size==='XL'?1.13:1;
 const patternFill=fabric==='solid'?shirt:'url(#fabric)';
 const coatStyle=['tactical','military','police','firefighter','paramedic','ranger','hunter','engineer','mechanic','scientist','hazmat','pilot','aviator','security','swat','sniper','commando','winter','arctic','desert','urban','woodland','urban_camo','rain','wasteland','raider','nomad','trapper','surgeon','lab','prisoner','civilian','worker','delivery','journalist','explorer','bodyguard','heavy','stealth','rebel','colonist','salvager'].includes(outfit);
 const faceEyes='<g class="portrait-eyes"><path d="M74 84 Q82 74 91 82 Q83 91 74 84Z M90 82 Q99 74 108 84 Q99 91 90 82Z" fill="'+skinShade+'" opacity=".18"/><path d="M75 81 Q83 74 91 81 M91 81 Q99 74 107 81" fill="none" stroke="'+brow+'" stroke-width="3.2" stroke-linecap="round"/><path d="M75 85 Q83 '+(85-eyeSize[1])+' 91 85 Q83 '+(85+eyeSize[1]+1)+' 75 85Z M91 85 Q99 '+(85-eyeSize[1])+' 107 85 Q99 '+(85+eyeSize[1]+1)+' 91 85Z" fill="'+eyeWhiteId+'" stroke="'+skinShade+'" stroke-width="1.1"/><ellipse cx="83" cy="85" rx="'+pupilSize+'" ry="'+Math.max(2,pupilSize*1.18)+'" fill="'+eyes+'"/><ellipse cx="99" cy="85" rx="'+pupilSize+'" ry="'+Math.max(2,pupilSize*1.18)+'" fill="'+eyes+'"/><circle cx="83" cy="85" r="1.15" fill="#101714"/><circle cx="99" cy="85" r="1.15" fill="#101714"/><circle cx="81.8" cy="83.7" r="1.35" fill="#fff" opacity=".96"/><circle cx="97.8" cy="83.7" r="1.35" fill="#fff" opacity=".96"/><circle cx="84.6" cy="86.4" r=".55" fill="#fff" opacity=".72"/><circle cx="100.6" cy="86.4" r=".55" fill="#fff" opacity=".72"/><path d="M75 85 Q83 '+(85-eyeSize[1]-1.4)+' 91 85 M91 85 Q99 '+(85-eyeSize[1]-1.4)+' 107 85" fill="none" stroke="'+skinShade+'" stroke-width="1.2" stroke-linecap="round"/><path d="M76 89 Q83 93 90 89 M92 89 Q99 93 106 89" fill="none" stroke="'+skinShade+'" stroke-opacity=".5" stroke-width=".9"/><path d="M76 82 l-2 -2 M80 80 l-1 -2 M100 80 l1 -2 M106 82 l2 -2" stroke="'+brow+'" stroke-width=".8" stroke-linecap="round"/></g>';
 const facialHair=beard==='none'?'':beard==='stubble'?'<path d="M75 98 Q90 112 105 98 L103 108 Q90 118 77 108Z" fill="'+beardColor+'" opacity=".3"/>':beard==='mustache'?'<path d="M81 99 Q85 96 90 100 Q95 96 100 99 Q97 105 90 102 Q83 105 81 99Z" fill="'+beardColor+'"/>':'<path d="M75 96 Q79 103 82 105 L87 113 L90 116 L93 113 L98 105 L105 96 L103 108 Q98 119 90 121 Q82 119 77 108Z" fill="'+beardColor+'" stroke="#30251f" stroke-width="1"/>';
 const scarMark=scar||markings==='scars'?' <path d="M102 64 L95 79" fill="none" stroke="'+skinShade+'" stroke-width="2" stroke-linecap="round"/><path d="M101 65 L96 77" fill="none" stroke="#e8b99c" stroke-width=".8"/>':'';
 const freckles=markings==='freckles'?Array.from({length:9},(_,i)=>'<circle cx="'+(78+(i%5)*5)+'" cy="'+(93+Math.floor(i/5)*3)+'" r=".9" fill="'+skinShade+'"/>').join(''):'';
 const facePaint=markings==='warpaint'||markings==='tribal'?'<path d="M73 91 L84 95 M107 91 L96 95" stroke="'+skinShade+'" stroke-width="3" stroke-linecap="round"/>':markings==='biohazard'?'<path d="M90 93 l4 4 -4 4 -4-4Z" fill="#d2bf44"/>':'';
 const headGear=head==='none'?'':head==='helmet'||head==='riot'||head==='hardhat'||head==='night_vision'?'<path d="M63 66 Q65 34 90 31 Q115 34 117 66 L110 69 L70 69Z" fill="#65705f" stroke="#202a24" stroke-width="3"/><path d="M66 64 Q90 70 114 64" stroke="'+metal+'" stroke-width="3"/>':head==='hood'||head==='gas_hood'||head==='balaclava'?'<path d="M60 72 Q58 29 90 27 Q122 29 120 72 L111 100 L69 100Z" fill="#303a35" stroke="#151b17" stroke-width="3"/>':head==='cap'?' <path d="M65 63 Q66 39 90 39 Q111 39 116 60 L122 66 L62 66Z" fill="'+trim+'" stroke="#242c25" stroke-width="2"/>':head==='beanie'||head==='ushanka'?'<path d="M64 64 Q62 36 90 34 Q118 36 116 64Z" fill="#665d4d" stroke="#242c25" stroke-width="2"/><path d="M65 60 H115 V68 H65Z" fill="'+metal+'"/>':head==='beret'?'<path d="M62 58 Q70 35 93 36 Q112 35 117 51 Q102 59 62 58Z" fill="#58694d" stroke="#242c25" stroke-width="2"/>':'<path d="M61 61 Q90 52 119 61 L120 68 H60Z" fill="'+trim+'" stroke="#242c25" stroke-width="2"/>';
 const faceGear=face==='none'?'':face==='goggles'||face==='ski_goggles'?' <rect x="73" y="80" width="16" height="11" rx="4" fill="#263b40" stroke="'+metal+'" stroke-width="2"/><rect x="93" y="80" width="16" height="11" rx="4" fill="#263b40" stroke="'+metal+'" stroke-width="2"/><path d="M89 85 H93" stroke="'+metal+'" stroke-width="2"/>':face==='glasses'?' <rect x="74" y="80" width="16" height="10" rx="3" fill="#a9d5e055" stroke="'+metal+'" stroke-width="1.5"/><rect x="91" y="80" width="16" height="10" rx="3" fill="#a9d5e055" stroke="'+metal+'" stroke-width="1.5"/>':face==='gas_mask'||face==='respirator'||face==='filter'?'<path d="M74 91 Q90 84 106 91 L103 107 Q90 115 77 107Z" fill="#3b4942" stroke="'+metal+'" stroke-width="2"/><circle cx="80" cy="99" r="5" fill="#788578" stroke="#202a24" stroke-width="2"/><circle cx="100" cy="99" r="5" fill="#788578" stroke="#202a24" stroke-width="2"/>':face==='visor'?' <path d="M68 78 Q90 72 112 78 L108 94 Q90 98 72 94Z" fill="#8bc0bb66" stroke="'+metal+'" stroke-width="2"/>':face==='mask'||face==='bandana'||face==='face_wrap'?' <path d="M74 91 Q90 85 106 91 L103 105 Q90 111 77 105Z" fill="'+(face==='bandana'?'#8d4540':'#3b4942')+'" stroke="#202a24" stroke-width="1.5"/>':face==='scarf'?' <path d="M75 91 Q90 85 105 91 L106 107 Q90 114 74 107Z" fill="'+trim+'" stroke="#242c25" stroke-width="2"/>':'';
 const hatExtras=head==='night_vision'?'<path d="M78 52 L82 68 M102 52 L98 68" stroke="#182522" stroke-width="4"/><circle cx="80" cy="68" r="4" fill="#8bb58a"/><circle cx="100" cy="68" r="4" fill="#8bb58a"/>':head==='pilot'?'<path d="M70 53 L110 53 L106 63 L74 63Z" fill="#514335" stroke="#242c25" stroke-width="2"/>':'';
 const cloakArt=cloak==='none'?'':'<path d="M69 116 L111 116 L131 212 L90 194 L49 212Z" fill="'+cloakColor+'" stroke="#202a24" stroke-width="2"/><path d="M70 125 L90 145 L110 125" fill="none" stroke="'+metal+'" stroke-width="2"/>';
 const backpackArt=pack==='none'?'':'<path d="M51 124 Q45 125 45 139 L46 185 Q48 193 64 192 L67 137Z" fill="'+packColor+'" stroke="#202a24" stroke-width="3"/><path d="M51 145 H64 M50 168 H64" stroke="'+metal+'" stroke-width="2"/><rect x="51" y="151" width="11" height="17" rx="3" fill="#25312a"/>';
 const jacketExtra=outer==='parka'||outer==='longcoat'?'<path d="M62 118 L118 118 L125 190 L55 190Z" fill="none" stroke="'+trim+'" stroke-width="5"/><path d="M90 119 V190" stroke="'+trim+'" stroke-width="3"/>':outer==='leather'?'<path d="M62 120 L90 139 L118 120 M62 125 L70 186 M118 125 L110 186" fill="none" stroke="#3b3028" stroke-width="4"/>':outer==='vest'||outfit==='tactical'||outfit==='swat'||outfit==='commando'?'<path d="M65 122 L82 127 L79 172 L62 170Z M115 122 L98 127 L101 172 L118 170Z" fill="#303b34" stroke="'+metal+'" stroke-width="2"/><rect x="66" y="139" width="12" height="16" rx="2" fill="'+beltColor+'"/><rect x="102" y="139" width="12" height="16" rx="2" fill="'+beltColor+'"/>':outer==='hazmat'||outfit==='hazmat'?'<path d="M62 117 H118 L125 191 H55Z" fill="#b9a94a" opacity=".28" stroke="#d4c357" stroke-width="3"/><path d="M90 119 V190" stroke="#252b24" stroke-width="5"/>':'';
 const fabricDots=fabric==='woodland'?'<path d="M67 136 q8-10 14 0 t14 0 t14 0 M62 158 q8-8 14 0 t14 0 t14 0" fill="none" stroke="'+pattern+'" stroke-width="6" opacity=".7"/>':fabric==='urban'?'<path d="M62 139 l15 -8 9 8 -12 10 13 8 -16 8 M97 137 l12 -8 9 10 -13 11 12 10" fill="none" stroke="'+pattern+'" stroke-width="5"/>':fabric==='desert'?'<path d="M63 141 q9-9 18 0 t18 0 t18 0 M64 165 q8-8 16 0 t16 0 t16 0" fill="none" stroke="#b49b6b" stroke-width="5"/>':fabric==='snow'?'<path d="M62 138 l15 -8 10 10 13 -9 17 10 M63 164 l14 -7 14 9 13 -8" fill="none" stroke="#e0e3dc" stroke-width="5"/>':'';
 const bodyWear=condition==='clean'?'':condition==='torn'?'<path d="M66 160 l9 6 -5 7 12 6 M112 149 l-7 7 8 7" fill="none" stroke="#252d25" stroke-width="3"/>':condition==='dirty'?'<path d="M64 172 q15-10 23 0 t28 0 M70 140 l8 8 -7 5" fill="none" stroke="#30291d" stroke-width="5" opacity=".65"/>':'<path d="M66 177 l6 4 M108 145 l5 6 M76 133 l4 3" stroke="#30291d" stroke-width="2" opacity=".65"/>';
 const gearArt=(belt==='none'?'':'<path d="M59 180 H121 V190 H59Z" fill="'+beltColor+'" stroke="#202a24" stroke-width="2"/><rect x="85" y="180" width="10" height="10" rx="2" fill="'+metal+'"/>')+(gloves==='none'?'':'<path d="M53 167 L42 183 Q40 191 51 193 L64 181 M127 167 L138 183 Q140 191 129 193 L116 181" fill="'+glove+'" stroke="#202a24" stroke-width="2"/>')+(patch==='none'?'':'<rect x="103" y="131" width="13" height="12" rx="2" fill="'+(patch==='medic'?'#e8e5d4':patch==='hazard'?'#d7c33b':trim)+'" stroke="#202a24" stroke-width="1.5"/>');
 const pantsArt='<path d="M67 184 L90 187 L87 230 L67 232Z M93 187 L115 184 L113 232 L93 230Z" fill="'+pants+'" stroke="#202a24" stroke-width="3"/><path d="M90 190 V229 M71 207 H86 M96 207 H110" stroke="#899080" stroke-opacity=".45" stroke-width="1.5"/>'+(pantsStyle==='reinforced'?'<path d="M67 207 H87 V222 H67Z M93 207 H113 V222 H93Z" fill="#29332e" stroke="'+metal+'" stroke-width="2"/>':pantsStyle==='shorts'?'<path d="M67 184 L90 187 L88 211 H67Z M93 187 L115 184 L113 211 H93Z" fill="'+pants+'" stroke="#202a24" stroke-width="3"/>':'');
 const shoesArt='<path d="M67 225 L87 225 L91 240 L61 240 Q58 233 67 225Z M94 225 L113 225 L121 240 L91 240Z" fill="'+boots+'" stroke="#161d19" stroke-width="3"/><path d="M63 236 H88 M94 236 H119" stroke="'+metal+'" stroke-width="2"/>'+(footwear==='waders'?'<path d="M68 204 H86 L87 231 H66Z M95 204 H114 L114 231 H94Z" fill="'+boots+'"/>':'');
 const shirtArt='<path d="M69 116 L79 110 L90 116 L101 110 L112 116 L129 139 L117 149 L111 140 L114 187 L66 187 L69 140 L62 149 L51 139Z" fill="'+shirt+'" stroke="#202a24" stroke-width="3" transform="translate(0 0) scale('+garmentScale+' 1) translate('+(90-90*garmentScale)+' 0)"/><path d="M90 117 V184 M75 124 L85 139 M105 124 L95 139" fill="none" stroke="'+trim+'" stroke-width="2.3" opacity=".85"/><path d="M73 151 H83 V167 H73Z M97 151 H107 V167 H97Z" fill="'+undershirt+'" stroke="#202a24" stroke-width="1.5"/><circle cx="90" cy="131" r="2.2" fill="'+metal+'"/><circle cx="90" cy="147" r="2.2" fill="'+metal+'"/>';
 const armsArt='<path d="M64 125 L52 140 L44 169 L55 176 L71 148 M116 125 L128 140 L136 169 L125 176 L109 148" fill="none" stroke="'+shirt+'" stroke-width="13" stroke-linecap="round"/><path d="M50 167 L45 181 M130 167 L135 181" stroke="'+skin+'" stroke-width="9" stroke-linecap="round"/>';
 const bodyTypeAccent=body==='strong'||body==='stocky'||body==='bulky'?'1.13':body==='slim'||body==='lanky'?'.9':'1';
 return '<svg xmlns="http://www.w3.org/2000/svg" class="character-portrait-svg" viewBox="0 0 180 252" role="img" aria-label="Предпросмотр персонажа"><defs><linearGradient id="skinGrad" x2="0" y2="1"><stop stop-color="'+skin+'"/><stop offset=".72" stop-color="'+skin+'"/><stop offset="1" stop-color="'+skinShade+'"/></linearGradient><linearGradient id="hairGrad" x2="0" y2="1"><stop stop-color="'+hairHi+'"/><stop offset=".35" stop-color="'+hair+'"/><stop offset="1" stop-color="'+hair+'"/></linearGradient><linearGradient id="shirtGrad" x2="0" y2="1"><stop stop-color="'+trim+'"/><stop offset=".22" stop-color="'+shirt+'"/><stop offset="1" stop-color="'+undershirt+'"/></linearGradient><clipPath id="hairClip"><path d="'+hairPath+'"/></clipPath><pattern id="fabric" width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill="'+shirt+'"/><path d="M0 0 L18 18 M-4 8 L8 20 M10 -2 L20 8" stroke="'+pattern+'" stroke-width="4" opacity=".72"/></pattern><filter id="shadow"><feGaussianBlur stdDeviation="5"/></filter></defs><ellipse cx="90" cy="244" rx="42" ry="6" fill="#000" opacity=".42" filter="url(#shadow)"/>'+cloakArt+backpackArt+'<g transform="translate(90 0) scale('+bodyTypeAccent+' 1) translate(-90 0)">'+pantsArt+shoesArt+armsArt+'<path d="M90 102 V121" stroke="url(#skinGrad)" stroke-width="18" stroke-linecap="round"/>'+shirtArt+jacketExtra+fabricDots+bodyWear+gearArt+'<path d="M68 62 Q65 49 77 44 Q90 37 103 44 Q115 49 112 65 L109 99 Q105 114 90 116 Q75 114 71 99Z" fill="url(#skinGrad)" stroke="#513b30" stroke-width="2"/><ellipse cx="68" cy="82" rx="5" ry="9" fill="'+skin+'"/><ellipse cx="112" cy="82" rx="5" ry="9" fill="'+skin+'"/>'+faceEyes+'<path d="M90 87 L87 98 Q90 101 94 98" fill="none" stroke="'+skinShade+'" stroke-width="1.7" stroke-linecap="round"/><path d="M84 105 Q90 109 96 105" fill="none" stroke="'+lips+'" stroke-width="2.4" stroke-linecap="round"/>'+facialHair+scarMark+freckles+facePaint+'<path d="'+hairPath+'" fill="url(#hairGrad)" stroke="#191f1a" stroke-width="2"/><path d="M69 61 Q84 46 108 58 M73 67 Q82 58 89 58" fill="none" stroke="'+hairHi+'" stroke-width="2" opacity=".8"/>'+'<g clip-path="url(#hairClip)">'+hairStrands+'</g>'+hairExtra+curlTexture+braidTexture+headGear+hatExtras+faceGear+'</g></svg>';
}
function characterOptionSvg(id,value,index){
 const values={};document.querySelectorAll('#characterCreator [data-character]').forEach(control=>{values[control.id]=control.value;});
 values[id]=value;
 const svg=characterArtworkSvg(values,index);
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
const CHARACTER_TABS=[
 {id:'basic',label:'Основное',icon:'☻',fields:['charBodyType','charHeight']},
 {id:'hair',label:'Волосы',icon:'✂',fields:['charHairStyle','charBeard']},
 {id:'face',label:'Лицо',icon:'◉',fields:['charHeadgear','charFaceAccessory','charScar']},
 {id:'skin',label:'Кожа и глаза',icon:'◌',fields:['charSkin','charEyes','charEyeWhite','charMarkings','charSkinDetail','charFaceShape','charEyeStyle']},
 {id:'clothes',label:'Одежда',icon:'▣',fields:['charOutfit','charGarmentSize','charOuterwear','charCloak','charPantsStyle','charFootwear','charFabric','charCondition','charPatch']},
 {id:'gear',label:'Снаряжение',icon:'▤',fields:['charBackpack','charGloves','charBelt']},
 {id:'colors',label:'Цвета',icon:'◐',fields:[]}
];
function buildCharacterTabs(){
 const host=document.querySelector('#characterCreator .character-fields');if(!host)return;
 if(host.dataset.tabsBuilt==='1')return;
 const allFields=Array.from(document.querySelectorAll('#characterCreator .character-field')).filter(field=>field.querySelector('[data-character]'));
 const nav=document.createElement('div');nav.className='character-tab-nav';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Разделы внешности');
 const panes=document.createElement('div');panes.className='character-tab-panes';
 const groups={};
 CHARACTER_TABS.forEach((tab,index)=>{const button=document.createElement('button');button.type='button';button.className='character-tab-button'+(index===0?' active':'');button.dataset.tab=tab.id;button.id='characterTab-'+tab.id;button.setAttribute('role','tab');button.setAttribute('aria-selected',String(index===0));button.setAttribute('aria-controls','characterPane-'+tab.id);button.innerHTML='<span class="character-tab-icon" aria-hidden="true">'+tab.icon+'</span><span>'+tab.label+'</span>';button.addEventListener('click',()=>activateCharacterTab(tab.id));nav.appendChild(button);const pane=document.createElement('div');pane.className='character-tab-pane'+(index===0?' active':'');pane.id='characterPane-'+tab.id;pane.dataset.pane=tab.id;pane.setAttribute('role','tabpanel');pane.setAttribute('aria-labelledby',button.id);pane.hidden=index!==0;panes.appendChild(pane);groups[tab.id]=pane;});
 const fieldTab=new Map();CHARACTER_TABS.forEach(tab=>tab.fields.forEach(id=>fieldTab.set(id,tab.id)));
 allFields.forEach(field=>{const control=field.querySelector('[data-character]');if(!control)return;const id=control.id;const tab=control.type==='color'?'colors':(fieldTab.get(id)||'clothes');groups[tab].appendChild(field);});
 host.replaceChildren(nav,panes);host.dataset.tabsBuilt='1';
}
function activateCharacterTab(id){
 const host=document.querySelector('#characterCreator .character-fields');if(!host)return;
 host.querySelectorAll('.character-tab-button').forEach(button=>{const active=button.dataset.tab===id;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));});
 host.querySelectorAll('.character-tab-pane').forEach(pane=>{const active=pane.dataset.pane===id;pane.classList.toggle('active',active);pane.hidden=!active;});
}
function renderCharacterOptionGalleries(){
 buildCharacterTabs();
 document.querySelectorAll('#characterCreator select[data-character]').forEach(select=>{let gallery=select.parentElement.querySelector('.character-option-gallery');if(!gallery){gallery=document.createElement('div');gallery.className='character-option-gallery';gallery.setAttribute('aria-label','Иллюстрированные варианты');select.insertAdjacentElement('afterend',gallery);}gallery.innerHTML='';Array.from(select.options).forEach((option,index)=>{const card=document.createElement('button');card.type='button';card.className='character-option-card';card.dataset.optionValue=option.value;card.setAttribute('aria-label',option.textContent);card.setAttribute('aria-pressed',String(option.value===select.value));const img=document.createElement('img');img.alt='';img.loading='lazy';img.src=characterOptionSvg(select.id,option.value,index);const caption=document.createElement('span');caption.textContent=option.textContent;card.append(img,caption);card.addEventListener('click',()=>{select.value=option.value;select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}));});gallery.appendChild(card);});});
}
function syncCharacterOptionGalleries(){
 document.querySelectorAll('#characterCreator select[data-character]').forEach(select=>{const gallery=select.parentElement.querySelector('.character-option-gallery');if(!gallery)return;gallery.querySelectorAll('.character-option-card').forEach(card=>{const active=card.dataset.optionValue===select.value;card.classList.toggle('selected',active);card.setAttribute('aria-pressed',String(active));});});
}
function updateCharacterPreview(){const root=document.getElementById('characterPreview');if(!root)return;const val=id=>document.getElementById(id)?.value||'';for(const [css,id] of [['--avatar-skin','charSkin'],['--avatar-hair','charHair'],['--avatar-shirt','charShirt'],['--avatar-trim','charTrim'],['--avatar-pants','charPants'],['--avatar-boots','charBoots'],['--avatar-cloak','charCloakColor'],['--avatar-pack','charPackColor'],['--avatar-hair-accent','charHairAccent'],['--avatar-brow','charBrowColor'],['--avatar-metal','charMetalColor'],['--avatar-pattern','charPatternColor'],['--avatar-eyes','charEyes'],['--avatar-gloves','charGloveColor'],['--avatar-belt','charBeltColor'],['--avatar-beard','charBeardColor'],['--avatar-lips','charLipColor'],['--avatar-undershirt','charUndershirtColor']])root.style.setProperty(css,val(id));for(const [key,id] of Object.entries({hair:'charHairStyle',head:'charHeadgear',face:'charFaceAccessory',beard:'charBeard',scar:'charScar',eyeStyle:'charEyeStyle',body:'charBodyType',outfit:'charOutfit',cloak:'charCloak',outer:'charOuterwear',pack:'charBackpack',belt:'charBelt',size:'charGarmentSize',fabric:'charFabric'}))root.dataset[key]=val(id);document.getElementById('characterPreviewLabel').textContent=val('charBodyType')+' · '+val('charGarmentSize')+' · '+val('charOutfit')+' · '+val('charCloak');const artwork={};document.querySelectorAll('#characterCreator [data-character]').forEach(control=>{artwork[control.id]=control.value;});root.innerHTML=characterArtworkSvg(artwork);root.classList.add('has-detailed-art');syncCharacterOptionGalleries();}
function openCharacterCreator(thenIntro=false){characterCreatorThenIntro=!!thenIntro;const panel=document.getElementById('characterCreator');if(!panel)return;const values={charSkin:colors.skin,charHair:colors.hair,charShirt:colors.shirt,charTrim:colors.trim,charEyes:colors.eyes,charPants:colors.pants,charBoots:colors.boots,charBodyType:colors.bodyType,charHairStyle:colors.hairStyle,charBeard:colors.beard,charOutfit:colors.outfit,charHeadgear:colors.headgear,charFaceAccessory:colors.faceAccessory,charScar:colors.scar?'yes':'no',charGarmentSize:colors.garmentSize,charCloak:colors.cloak,charOuterwear:colors.outerwear,charBackpack:colors.backpack,charGloves:colors.gloves,charPantsStyle:colors.pantsStyle,charBelt:colors.belt,charFabric:colors.fabric,charCondition:colors.condition,charPatch:colors.patch,charCloakColor:colors.cloakColor,charPackColor:colors.packColor,charHairAccent:colors.hairAccent,charBrowColor:colors.browColor,charBeardColor:colors.beardColor,charLipColor:colors.lipColor,charEyeWhite:colors.eyeWhiteColor,charGloveColor:colors.gloveColor,charBeltColor:colors.beltColor,charMetalColor:colors.metalColor,charUndershirtColor:colors.undershirtColor,charSkinDetail:colors.skinDetailColor,charPatternColor:colors.patternColor,charMarkings:colors.markings,charFootwear:colors.footwear,charFaceShape:colors.faceShape,charEyeStyle:colors.eyeStyle,charHeight:colors.height};for(const [id,value] of Object.entries(values)){const el=document.getElementById(id);if(el)el.value=value;}renderCharacterOptionGalleries();panel.classList.remove('hidden');document.getElementById('worldManager')?.classList.add('hidden');document.getElementById('mainMenu')?.classList.add('menu-out');updateCharacterPreview();gameActive=false;keys.clear();moveX=moveY=0;}
function confirmCharacterCreator(){const val=id=>document.getElementById(id)?.value||'';Object.assign(colors,{skin:val('charSkin'),hair:val('charHair'),shirt:val('charShirt'),trim:val('charTrim'),eyes:val('charEyes'),pants:val('charPants'),boots:val('charBoots'),bodyType:val('charBodyType'),hairStyle:val('charHairStyle'),beard:val('charBeard'),outfit:val('charOutfit'),headgear:val('charHeadgear'),faceAccessory:val('charFaceAccessory'),scar:val('charScar')==='yes',garmentSize:val('charGarmentSize'),cloak:val('charCloak'),outerwear:val('charOuterwear'),backpack:val('charBackpack'),gloves:val('charGloves'),pantsStyle:val('charPantsStyle'),belt:val('charBelt'),fabric:val('charFabric'),condition:val('charCondition'),patch:val('charPatch'),cloakColor:val('charCloakColor'),packColor:val('charPackColor'),hairAccent:val('charHairAccent'),browColor:val('charBrowColor'),beardColor:val('charBeardColor'),lipColor:val('charLipColor'),eyeWhiteColor:val('charEyeWhite'),gloveColor:val('charGloveColor'),beltColor:val('charBeltColor'),metalColor:val('charMetalColor'),undershirtColor:val('charUndershirtColor'),skinDetailColor:val('charSkinDetail'),patternColor:val('charPatternColor'),markings:val('charMarkings'),footwear:val('charFootwear'),faceShape:val('charFaceShape'),eyeStyle:val('charEyeStyle'),height:val('charHeight')});save();document.getElementById('characterCreator').classList.add('hidden');try{localStorage.setItem('skyrealm_character_v1',JSON.stringify(colors));}catch(_){}if(characterCreatorThenIntro){characterCreatorThenIntro=false;startIntroCinematic();}else showWorldManager();}
function enterSolo(){gameActive=false;keys.clear();moveX=moveY=0;document.body.classList.remove('menu-open');document.body.classList.add('dialogue-open');document.getElementById('mainMenu').classList.add('menu-out');document.getElementById('worldManager')?.classList.add('hidden');document.getElementById('dialogue').classList.remove('hidden');focusGame();}
function startIntroCinematic(){
 const scene=document.getElementById('introCinematic');if(!scene)return;
 gameActive=false;keys.clear();moveX=moveY=0;document.body.classList.remove('menu-open');
 document.getElementById('mainMenu')?.classList.add('menu-out');document.getElementById('worldManager')?.classList.add('hidden');
 scene.classList.remove('hidden');scene.classList.remove('cinematic-play');void scene.offsetWidth;scene.classList.add('cinematic-play');
 let ended=false;const finish=()=>{if(ended)return;ended=true;clearTimeout(timer);window.ApocalypseCinematic3D?.stop();scene.classList.add('hidden');scene.classList.remove('cinematic-play');enterSolo();};
 const timer=setTimeout(finish,16000);window.ApocalypseCinematic3D?.play();const skip=document.getElementById('cinematicSkip');if(skip)skip.onclick=()=>{clearTimeout(timer);finish();};
}
let crashCinematicRunning=false;
function startCrashSiteCinematic(){
 if(crashCinematicRunning||!lastSignalMission||lastSignalMission.status!=='active'||lastSignalMission.stage!==0)return;
 const scene=document.getElementById('introCinematic');if(!scene){activateBlackBox();return;}
 crashCinematicRunning=true;gameActive=false;keys.clear();moveX=moveY=0;
 const captions=[...scene.querySelectorAll('.cine-copy')],original=captions.map(node=>node.innerHTML);
 const lines=[
  ['00:00:01 · МЕСТО ПАДЕНИЯ','САМОЛЁТ НЕ ДОЛЕТЕЛ','Камера приближается к искорёженным обломкам среди дыма и искр.'],
  ['00:00:04 · ЧЁРНЫЙ ЯЩИК','СИГНАЛ ЕЩЁ ИДЁТ','Под обшивкой мигает аварийный маяк. Внутри осталась последняя запись пилота.'],
  ['00:00:09 · ДВИЖЕНИЕ В ТУМАНЕ','ОНИ УСЛЫШАЛИ','Из темноты выходят заражённые. Шум передатчика привёл их прямо к месту падения.'],
  ['00:00:13 · ПЕРЕХОД К БОЮ','ЗАЩИТИ ОБЛОМКИ','Открой чёрный ящик, переживи атаку и узнай, кто отправил сигнал.']
 ];
 captions.forEach((node,i)=>{const v=lines[i]||lines[0];node.innerHTML='<small>'+v[0]+'</small><h2>'+v[1]+'</h2><p>'+v[2]+'</p>';});
 document.body.classList.remove('menu-open');scene.classList.remove('hidden');scene.classList.remove('cinematic-play');void scene.offsetWidth;scene.classList.add('cinematic-play');
 let ended=false;const finish=()=>{if(ended)return;ended=true;clearTimeout(timer);window.ApocalypseCinematic3D?.stop();scene.classList.add('hidden');scene.classList.remove('cinematic-play');captions.forEach((node,i)=>node.innerHTML=original[i]);crashCinematicRunning=false;activateBlackBox();};
 const timer=setTimeout(finish,16000);if(window.ApocalypseCinematic3D?.playCrash)window.ApocalypseCinematic3D.playCrash();else window.ApocalypseCinematic3D?.play();
 const skip=document.getElementById('cinematicSkip');if(skip)skip.onclick=()=>{clearTimeout(timer);finish();};
}
function activateBlackBox(){
 if(!lastSignalMission||lastSignalMission.status!=='active'||lastSignalMission.stage!==0)return;
 lastSignalMission.stage=1;const offsets=[[-105,-35],[105,-20],[-25,105],[62,92]],kinds=['brute','runner','runner','stalker'];
 for(let i=0;i<offsets.length;i++)spawnZombie(lastSignalMission.x+offsets[i][0],lastSignalMission.y+offsets[i][1],kinds[i],'last_signal_guard');
 gameActive=true;focusGame();save();toast('Чёрный ящик активирован! Заражённые услышали сигнал — держи оборону!');
}

function applySettings(){document.getElementById('joy').style.transform='scale('+(Number(prefs.joy||100)/100)+')';document.getElementById('settingMaxFps').value=String(prefs.maxFps);document.body.classList.toggle('reduced-motion',!prefs.motion);document.body.classList.toggle('hide-hints',!prefs.hints);document.getElementById('settingEffects').value=prefs.effects;document.getElementById('settingJoy').value=prefs.joy;document.getElementById('settingMotion').checked=!!prefs.motion;document.getElementById('settingHints').checked=!!prefs.hints;document.getElementById('settingWeather').checked=!!prefs.weather;document.getElementById('settingAmbientAudio').checked=!!prefs.ambientAudio;document.getElementById('settingInfectedCap').value=String(prefs.infectedCap);document.getElementById('settingEventFrequency').value=String(prefs.eventFrequency);document.getElementById('settingAutosave').value=String(prefs.autosaveSeconds);document.getElementById('settingAutoSprint').checked=!!prefs.autoSprint;document.getElementById('settingHydration').checked=!!prefs.showHydration;document.getElementById('settingSurvivalDifficulty').value=prefs.survivalDifficulty;document.getElementById('settingRenderDistance').value=prefs.renderDistance;document.getElementById('settingEnemyHealth').checked=!!prefs.showEnemyHealth;document.getElementById('settingSurvivalHud').checked=!!prefs.showSurvivalHud;}
function drawPlayerMap(){
 const overlay=document.getElementById('playerMapOverlay');if(!overlay||overlay.classList.contains('hidden'))return;
 const map=document.getElementById('playerMap'),m=map?.getContext('2d');if(!m)return;
 const mw=map.width||720,mh=map.height||720,range=mapRange,scale=Math.min(mw,mh)/(range*2);
 m.clearRect(0,0,mw,mh);m.fillStyle='#111a16';m.fillRect(0,0,mw,mh);m.strokeStyle='#82917a33';m.lineWidth=1;
 for(let x=0;x<=mw;x+=mw/8){m.beginPath();m.moveTo(x,0);m.lineTo(x,mh);m.stroke();}
 for(let y=0;y<=mh;y+=mh/8){m.beginPath();m.moveTo(0,y);m.lineTo(mw,y);m.stroke();}
 const px=x=>mw/2+(x-state.x-mapPanX)*scale,py=y=>mh/2+(y-state.y-mapPanY)*scale,camp=survivorCamp;
 const roads=[-8000,-4500,-1000,600,4100,7600,10000,13500,17000,20500];
 m.fillStyle='#35443a';
 for(const y of roads){const yy=py(y);if(yy>-12&&yy<mh+12)m.fillRect(0,yy-4,mw,8);}
 for(const x of roads){const xx=px(x);if(xx>-12&&xx<mw+12)m.fillRect(xx-4,0,8,mh);}
 m.fillStyle='#566456';m.strokeStyle='#91a08777';m.lineWidth=1;
 for(const b of buildings){const bx=px(b.x),by=py(b.y-b.floors*34),bw=b.w*scale,bh=(b.floors*34+b.h)*scale;if(bx+bw<0||by+bh<0||bx>mw||by>mh)continue;m.fillRect(bx,by,bw,bh);m.strokeRect(bx,by,bw,bh);}

 for(const item of [{x:camp.bench.x,y:camp.bench.y,label:'Лавка'},{x:camp.trader.x,y:camp.trader.y,label:'Торговец'}]){const x=px(item.x),y=py(item.y);if(x<0||x>mw||y<0||y>mh)continue;m.fillStyle='#e5bd70';m.beginPath();m.arc(x,y,8,0,Math.PI*2);m.fill();m.fillStyle='#f1dfb6';m.font='12px system-ui';m.textAlign='center';m.fillText(item.label,x,y-13);}
 const others=window.ApocalypseCoop?.getPlayers?.()||[];
 for(const p of others){if(!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;const x=px(p.x),y=py(p.y);if(x<0||x>mw||y<0||y>mh)continue;m.fillStyle='#f4f5f2';m.strokeStyle='#17211b';m.lineWidth=3;m.beginPath();m.arc(x,y,8,0,Math.PI*2);m.fill();m.stroke();m.fillStyle='#ffffff';m.font='12px system-ui';m.fillText(String(p.name||'Игрок').slice(0,14),x,y-13);}
 for(const marker of mapMarkers){const x=px(marker.x),y=py(marker.y);if(x<-20||x>mw+20||y<-20||y>mh+20)continue;m.fillStyle='#f0c96f';m.strokeStyle='#332819';m.lineWidth=2;m.beginPath();m.arc(x,y,7,0,Math.PI*2);m.fill();m.stroke();m.fillStyle='#f7e8c3';m.font='bold 11px system-ui';m.textAlign='center';m.fillText(marker.name.slice(0,20),x,y-12);}
 m.fillStyle='#39a7ff';m.strokeStyle='#d9f0ff';m.lineWidth=4;m.beginPath();m.arc(px(state.x),py(state.y),11,0,Math.PI*2);m.fill();m.stroke();m.fillStyle='#d9f0ff';m.font='bold 13px system-ui';m.fillText('ТЫ',px(state.x),py(state.y)+30);
}
let mapRange=2600,mapPanX=0,mapPanY=0,mapDragState=null,mapWasDragged=false;
let markerDraft=null;
function openMarkerEditor(x,y,index=-1){markerDraft={x,y,index};const input=document.getElementById('markerNameInput'),remove=document.getElementById('markerDelete'),navigate=document.getElementById('markerNavigate');input.value=index>=0?mapMarkers[index].name:'Метка '+(mapMarkers.length+1);remove.classList.toggle('hidden',index<0);navigate.classList.toggle('hidden',index<0);document.getElementById('markerEditor').classList.remove('hidden');input.focus();input.select();}
function closeMarkerEditor(){document.getElementById('markerEditor').classList.add('hidden');markerDraft=null;}
function persistMapMarkers(){save();const coop=window.ApocalypseCoop;if(coop?.room?.status==='running')coop.send({kind:'map-markers',mapMarkers:mapMarkers.map(v=>({...v}))});}
document.getElementById('markerSave').addEventListener('click',()=>{
 if(!markerDraft)return;
 const name=document.getElementById('markerNameInput').value.trim();if(!name){toast('Введи название метки');return;}
 if(markerDraft.index>=0&&mapMarkers[markerDraft.index])mapMarkers[markerDraft.index].name=name.slice(0,36);
 else{if(mapMarkers.length>=100){toast('Достигнут лимит 100 меток');return;}mapMarkers.push({name:name.slice(0,36),x:markerDraft.x,y:markerDraft.y});}
 const selected=markerDraft.index>=0?mapMarkers[markerDraft.index]:mapMarkers[mapMarkers.length-1];
 activeWaypoint={name:selected.name,x:selected.x,y:selected.y};
 persistMapMarkers();closeMarkerEditor();drawPlayerMap();updateHud();toast('Метка «'+activeWaypoint.name+'» установлена как цель');
});
document.getElementById('markerNavigate').addEventListener('click',()=>{
 if(!markerDraft||markerDraft.index<0||!mapMarkers[markerDraft.index])return;
 const selected=mapMarkers[markerDraft.index];activeWaypoint={name:selected.name,x:selected.x,y:selected.y};
 save();closeMarkerEditor();drawPlayerMap();updateHud();toast('Маршрут проложен: '+activeWaypoint.name);
});
document.getElementById('markerDelete').addEventListener('click',()=>{if(!markerDraft||markerDraft.index<0)return;const removed=mapMarkers[markerDraft.index];if(activeWaypoint&&removed&&Math.hypot(activeWaypoint.x-removed.x,activeWaypoint.y-removed.y)<1)activeWaypoint=null;mapMarkers.splice(markerDraft.index,1);persistMapMarkers();closeMarkerEditor();drawPlayerMap();updateHud();});
document.getElementById('markerCancel').addEventListener('click',closeMarkerEditor);
document.getElementById('waypointClear').addEventListener('click',()=>{activeWaypoint=null;save();drawPlayerMap();updateHud();toast('Активная цель снята');});
document.getElementById('playerMap').addEventListener('click',e=>{if(mapWasDragged){mapWasDragged=false;return;}if(!document.getElementById('markerEditor').classList.contains('hidden'))return;const canvas=e.currentTarget,rect=canvas.getBoundingClientRect(),mw=canvas.width,mh=canvas.height,scale=Math.min(mw,mh)/(mapRange*2),x=Math.max(WORLD_MIN,Math.min(WORLD_MAX,state.x+mapPanX+(e.clientX-rect.left-rect.width/2)*(mw/rect.width)/scale)),y=Math.max(WORLD_MIN,Math.min(WORLD_MAX,state.y+mapPanY+(e.clientY-rect.top-rect.height/2)*(mh/rect.height)/scale));const existing=mapMarkers.findIndex(v=>Math.hypot(v.x-x,v.y-y)<Math.max(70,1/scale*18));openMarkerEditor(x,y,existing);});
const playerMapCanvas=document.getElementById('playerMap');playerMapCanvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;mapDragState={id:e.pointerId,x:e.clientX,y:e.clientY,panX:mapPanX,panY:mapPanY,moved:false};playerMapCanvas.setPointerCapture?.(e.pointerId);});playerMapCanvas.addEventListener('pointermove',e=>{if(!mapDragState||mapDragState.id!==e.pointerId)return;const dx=e.clientX-mapDragState.x,dy=e.clientY-mapDragState.y;if(Math.hypot(dx,dy)>5)mapDragState.moved=true;if(mapDragState.moved){const rect=playerMapCanvas.getBoundingClientRect(),scale=Math.min(playerMapCanvas.width,playerMapCanvas.height)/(mapRange*2);mapPanX=mapDragState.panX-dx*(playerMapCanvas.width/rect.width)/scale;mapPanY=mapDragState.panY-dy*(playerMapCanvas.height/rect.height)/scale;drawPlayerMap();}});['pointerup','pointercancel','lostpointercapture'].forEach(type=>playerMapCanvas.addEventListener(type,e=>{if(mapDragState&&mapDragState.id===e.pointerId){mapWasDragged=mapDragState.moved;mapDragState=null;}}));playerMapCanvas.addEventListener('wheel',e=>{e.preventDefault();mapRange=Math.max(900,Math.min(12000,mapRange*(e.deltaY>0?1.15:.87)));drawPlayerMap();},{passive:false});
function openPlayerMap(){mapRange=2600;mapPanX=mapPanY=0;mapResumeGame=gameActive;gameActive=false;keys.clear();sprintHeld=false;moveX=moveY=0;joyPointer=null;const stick=document.getElementById('stick');if(stick)stick.style.transform='translate(0,0)';document.getElementById('playerMapOverlay').classList.remove('hidden');drawPlayerMap();}
function closePlayerMap(){document.getElementById('playerMapOverlay').classList.add('hidden');const resume=mapResumeGame;mapResumeGame=false;if(resume){gameActive=true;focusGame();}}
function openSettings(resumeGame=gameActive){settingsResumeGame=!!resumeGame;gameActive=false;applySettings();document.getElementById('settingsOverlay').classList.remove('hidden');}
function closeSettings(){document.getElementById('settingsOverlay').classList.add('hidden');const resume=settingsResumeGame;settingsResumeGame=false;if(resume){gameActive=true;focusGame();}}
document.getElementById('menuPlay').onclick=showWorldManager;
document.getElementById('worldManagerBack').onclick=hideWorldManager;
document.getElementById('characterConfirm').onclick=confirmCharacterCreator;
document.getElementById('characterCancel').onclick=()=>{document.getElementById('characterCreator').classList.add('hidden');showWorldManager();};
document.querySelectorAll('[data-character]').forEach(control=>control.addEventListener('input',updateCharacterPreview));
document.getElementById('createWorldButton').onclick=createApocalypseWorld;
document.getElementById('newWorldName').addEventListener('keydown',e=>{if(e.key==='Enter')createApocalypseWorld();});
document.getElementById('menuJournal').onclick=()=>openUpdateJournal(false);
document.getElementById('journalX').onclick=closeUpdateJournal;
document.getElementById('journalOk').onclick=closeUpdateJournal;
document.getElementById('menuSettings').onclick=()=>openSettings(false);
document.getElementById('menuExit').onclick=exitGame;
document.getElementById('deathRespawn').onclick=respawn;
document.getElementById('deathMenu').onclick=leaveToMenu;
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.close==='settingsOverlay'){closeSettings();return;}const target=document.getElementById(b.dataset.close);if(target)target.classList.add('hidden')}));
document.getElementById('settingsSave').onclick=()=>{prefs.effects=document.getElementById('settingEffects').value;prefs.joy=Number(document.getElementById('settingJoy').value);prefs.motion=document.getElementById('settingMotion').checked;prefs.hints=document.getElementById('settingHints').checked;prefs.weather=document.getElementById('settingWeather').checked;prefs.ambientAudio=document.getElementById('settingAmbientAudio').checked;prefs.infectedCap=whole(document.getElementById('settingInfectedCap').value,18,8,24);prefs.eventFrequency=bounded(document.getElementById('settingEventFrequency').value,1,.5,1.8);prefs.autosaveSeconds=whole(document.getElementById('settingAutosave').value,5,5,30);prefs.autoSprint=document.getElementById('settingAutoSprint').checked;prefs.showHydration=document.getElementById('settingHydration').checked;prefs.survivalDifficulty=document.getElementById('settingSurvivalDifficulty').value;prefs.renderDistance=document.getElementById('settingRenderDistance').value;prefs.showEnemyHealth=document.getElementById('settingEnemyHealth').checked;prefs.showSurvivalHud=document.getElementById('settingSurvivalHud').checked;prefs.maxFps=Number(document.getElementById('settingMaxFps').value);let persisted=true;try{localStorage.setItem('skyrealm_apocalypse_settings_v1',JSON.stringify(prefs));if(window.pywebview?.api?.save_apocalypse_settings)window.pywebview.api.save_apocalypse_settings(prefs);}catch(_){persisted=false}applySettings();closeSettings();toast(persisted?'Настройки сохранены и применены':'Настройки применены, но браузер не смог их сохранить')};
document.getElementById('settingsDefaults').onclick=()=>{Object.assign(prefs,{effects:'high',joy:100,motion:true,hints:true,weather:true,ambientAudio:true,infectedCap:18,eventFrequency:1,autosaveSeconds:5,autoSprint:false,showHydration:true,survivalDifficulty:'standard',renderDistance:'normal',maxFps:60,showEnemyHealth:true,showSurvivalHud:true});try{localStorage.setItem('skyrealm_apocalypse_settings_v1',JSON.stringify(prefs));if(window.pywebview?.api?.save_apocalypse_settings)window.pywebview.api.save_apocalypse_settings(prefs);}catch(_){}applySettings();toast('Стандартные настройки восстановлены');};
document.getElementById('settingsReset').onclick=()=>{if(confirm('Удалить сохранение Apocalypse на этом устройстве? Это нельзя отменить.')){try{localStorage.removeItem(STORE);location.reload()}catch(_){toast('Не удалось удалить сохранение: хранилище недоступно')}}};
document.getElementById('mapButton').onclick=openPlayerMap;
let pinchStartDistance=0,pinchStartZoom=cameraZoom;canvas.addEventListener('touchstart',e=>{if(e.touches.length===2){pinchStartDistance=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);pinchStartZoom=cameraZoom;}},{passive:true});canvas.addEventListener('touchmove',e=>{if(e.touches.length===2&&pinchStartDistance>0){e.preventDefault();const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);cameraZoom=Math.max(.55,Math.min(1.2,pinchStartZoom*d/pinchStartDistance));}},{passive:false});['touchend','touchcancel'].forEach(t=>canvas.addEventListener(t,()=>{pinchStartDistance=0;}));
document.getElementById('mapClose').onclick=closePlayerMap;
document.getElementById('pauseMenu').onclick=()=>{if(window.matchMedia('(max-width: 700px), (pointer: coarse)').matches)openMobileQuickMenu();else leaveToMenu();};
document.getElementById('mobileMoreClose').onclick=closeMobileQuickMenu;
document.getElementById('mobileMoreBackdrop').onclick=closeMobileQuickMenu;
document.getElementById('mobileMoreInventory').onclick=()=>{closeMobileQuickMenu();inventory()};
document.getElementById('mobileMoreWorkshop').onclick=()=>{closeMobileQuickMenu();openWorkshop()};
document.getElementById('mobileMoreSettings').onclick=()=>{const resume=mobileQuickMenuResume;closeMobileQuickMenu(false);openSettings(resume)};
document.getElementById('mobileMoreMenu').onclick=()=>{closeMobileQuickMenu(false);leaveToMenu()};
document.getElementById('mobileMoreSave').onclick=()=>{manualSave();closeMobileQuickMenu();};
document.getElementById('start').onclick=()=>{document.getElementById('dialogue').classList.add('hidden');document.body.classList.remove('dialogue-open');ensureSafeSpawn(true);gameActive=true;focusGame();showJournalOnWorldEntry(true);beginLastSignalEvent();};
document.getElementById('lastSignalAccept')?.addEventListener('click',acceptLastSignal);
window.addEventListener('apocalypse-coop-enter',()=>{ensureSafeSpawn(true);gameActive=true;document.body.classList.remove('menu-open');document.getElementById('mainMenu').classList.add('menu-out');document.getElementById('dialogue').classList.add('hidden');document.body.classList.remove('dialogue-open');document.getElementById('coopOverlay').classList.add('hidden');focusGame();showJournalOnWorldEntry(true);});
window.addEventListener('apocalypse-coop-version-mismatch',()=>{if(gameActive){leaveToMenu();toast('Кооператив остановлен: версии игры различаются.');}});
applySettings();
document.getElementById('action').onclick=interact;document.getElementById('spawnFireFeed').onclick=feedSpawnCampfire;document.getElementById('spawnFireUpgrade').onclick=upgradeSpawnCampfire;document.getElementById('rotateBuild').onclick=rotateBuild;document.getElementById('placeBuild').onclick=placeBarricade;document.getElementById('cancelBuild').onclick=()=>setBuildMode(false);document.getElementById('inventory').onclick=inventory;document.getElementById('craft').onclick=openWorkshop;document.getElementById('attackTouch').onclick=attack;document.getElementById('panelClose').onclick=()=>document.getElementById('panel').classList.add('hidden');document.getElementById('panelSearch')?.addEventListener('keydown',e=>{if(e.key==='Escape'){e.currentTarget.value='';e.currentTarget.oninput?.();e.currentTarget.blur();}});
for(let i=1;i<=6;i++)document.getElementById('quickSlot'+i).onclick=()=>useQuickSlot(i);
document.getElementById('exit').onclick=exitGame;
const KEY_BY_CODE={KeyW:'w',KeyA:'a',KeyS:'s',KeyD:'d',KeyE:'e',KeyI:'i',ArrowUp:'ArrowUp',ArrowDown:'ArrowDown',ArrowLeft:'ArrowLeft',ArrowRight:'ArrowRight'};
const KEY_BY_LAYOUT={'ц':'w','ф':'a','ы':'s','в':'d','е':'e','ш':'i'};
const keyFromEvent=e=>KEY_BY_CODE[e.code]||KEY_BY_LAYOUT[String(e.key||'').toLowerCase()]||(String(e.key||'').length===1?String(e.key).toLowerCase():e.key);
async function toggleApocalypseFullscreen(){
 const api=window.pywebview?.api;
 if(api?.toggle_fullscreen){
  try{const result=await api.toggle_fullscreen();if(result!==false&&result?.ok!==false)return;}catch(_){}
 }
 try{
  if(document.fullscreenElement)await document.exitFullscreen();
  else await document.documentElement.requestFullscreen();
 }catch(_){toast('Не удалось включить полный экран. Попробуй кнопку разворота окна.');}
}
window.addEventListener('keydown',e=>{
 if(document.activeElement===document.getElementById('apocChatInput')){if(e.key==='Escape'){e.preventDefault();document.getElementById('apocChatInput').blur();document.body.classList.remove('apoc-chat-open');}return;}
 if(e.code==='F11'||e.key==='F11'){e.preventDefault();e.stopPropagation();toggleApocalypseFullscreen();return;}
 if(e.code==='F5'||e.key==='F5'){e.preventDefault();manualSave();return;}
 if((e.code==='Tab'||e.key==='Tab')&&!isAndroidDevice&&gameActive){e.preventDefault();const panel=document.getElementById('playerListOverlay');if(panel&&!panel.classList.contains('hidden'))closePlayerList();else openPlayerList();return;}
 if(e.code==='ShiftLeft'||e.code==='ShiftRight'){if(gameActive){sprintHeld=true;e.preventDefault();}return;}
 const k=keyFromEvent(e);
 if(!gameActive){
  if(k==='Escape'){
   if(!document.getElementById('playerMapOverlay').classList.contains('hidden'))closePlayerMap();
   else if(!document.getElementById('mobileQuickMenu').classList.contains('hidden'))closeMobileQuickMenu();
   else if(!document.getElementById('settingsOverlay').classList.contains('hidden'))closeSettings();
   else if(!document.getElementById('updateJournal').classList.contains('hidden'))closeUpdateJournal();
  }
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d',' ','f'].includes(k))e.preventDefault();
  return;
 }
 if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d',' ','f'].includes(k))e.preventDefault();
 if(['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(k)){keys.add(k);focusGame();return;}
 if(e.repeat)return;
 if(k>='1'&&k<='6'){e.preventDefault();useQuickSlot(Number(k));return;}
 if(k==='y'){e.preventDefault();document.body.classList.add('apoc-chat-open');document.getElementById('apocChatInput')?.focus();return;}
 if(buildMode){if(k==='r'){e.preventDefault();rotateBuild();return;}if(k==='Enter'){e.preventDefault();placeBarricade();return;}if(k==='Escape'){e.preventDefault();setBuildMode(false);return;}}
 if(k==='m')openPlayerMap();
 if(k==='e')interact();
 if(k==='i')inventory();
 if(k==='f'||k===' ')attack();
 if(k==='Escape'&&gameActive){if(!document.getElementById('playerListOverlay').classList.contains('hidden'))closePlayerList();else if(!document.getElementById('playerMapOverlay').classList.contains('hidden'))closePlayerMap();else if(!document.getElementById('mobileQuickMenu').classList.contains('hidden'))closeMobileQuickMenu();else if(!document.getElementById('panel').classList.contains('hidden'))document.getElementById('panel').classList.add('hidden');else if(activeInterior)exitBuilding();else leaveToMenu();}
},true);
window.addEventListener('keyup',e=>{if(e.code==='ShiftLeft'||e.code==='ShiftRight')sprintHeld=false;keys.delete(keyFromEvent(e));},true);
window.addEventListener('blur',()=>{keys.clear();sprintHeld=false;});
window.addEventListener('focus',()=>{if(gameActive)focusGame();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&gameActive)focusGame();});
canvas.tabIndex=0;canvas.addEventListener('pointerdown',focusGame);
window.addEventListener('contextmenu',e=>e.preventDefault());window.addEventListener('selectstart',e=>e.preventDefault());window.addEventListener('resize',resize);
const sprintButton=document.getElementById('sprintButton');sprintButton.addEventListener('pointerdown',e=>{if(!gameActive||state.stamina<=0||sprintLocked)return;e.preventDefault();sprintHeld=true;try{sprintButton.setPointerCapture(e.pointerId)}catch(_){}});['pointerup','pointercancel','lostpointercapture'].forEach(type=>sprintButton.addEventListener(type,()=>{sprintHeld=false;}));sprintButton.addEventListener('contextmenu',e=>e.preventDefault());

const chatMessages=[];
function renderPlayerList(){const host=document.getElementById('playerListContent'),count=document.getElementById('playerListCount'),status=document.getElementById('playerListStatus');if(!host)return;const coop=window.ApocalypseCoop,others=coop?.getPlayers?.()||[];host.replaceChildren();const self=document.createElement('div');self.className='player-list-row self';const selfName=document.createElement('strong');selfName.textContent=(playerName||'Ты')+' · ты';const selfMeta=document.createElement('small');selfMeta.textContent='Текущий игрок';self.append(selfName,selfMeta);host.appendChild(self);for(const p of others){const row=document.createElement('div');row.className='player-list-row';const name=document.createElement('strong');name.textContent=String(p.name||'Игрок').slice(0,28);const meta=document.createElement('small');meta.textContent='В сети · '+Math.round(Math.hypot((p.x||0)-state.x,(p.y||0)-state.y))+' м от тебя';row.append(name,meta);host.appendChild(row);}if(count)count.textContent=String(others.length+1)+' / 8';if(status)status.textContent=coop?.room?.status==='running'?'Совместный мир активен':'Ты сейчас не в совместной комнате';if(!others.length){const empty=document.createElement('p');empty.className='player-list-empty';empty.textContent='Пока рядом нет других игроков. Создай комнату или пригласи друга через CO-OP.';host.appendChild(empty);}}
function openPlayerList(){const panel=document.getElementById('playerListOverlay');if(!panel)return;renderPlayerList();panel.classList.remove('hidden');}
function closePlayerList(){document.getElementById('playerListOverlay')?.classList.add('hidden');}
document.getElementById('playerListClose')?.addEventListener('click',closePlayerList);
document.getElementById('playerListOverlay')?.addEventListener('click',e=>{if(e.target===e.currentTarget)closePlayerList();});
window.addEventListener('apocalypse-coop-event',()=>{const panel=document.getElementById('playerListOverlay');if(panel&&!panel.classList.contains('hidden'))renderPlayerList();});
window.addEventListener('apocalypse-coop-ready',renderPlayerList);
function appendChat(name,message,admin=false){const host=document.getElementById('apocChatMessages');if(!host)return;const line=document.createElement('div');line.className='apoc-chat-line'+(admin?' admin':'');line.textContent=(name?name+': ':'')+message;host.appendChild(line);while(host.children.length>35)host.removeChild(host.firstChild);host.scrollTop=host.scrollHeight;const mobile=document.getElementById('apocMobileChat');if(mobile)mobile.textContent=line.textContent;}
function findPlayer(name){const q=String(name||'').trim().toLocaleLowerCase();if(!q)return null;if(['я','me','self'].includes(q)||q===playerName.toLocaleLowerCase())return{self:true,name:playerName,x:state.x,y:state.y,user_id:window.ApocalypseCoop?.userId};const list=window.ApocalypseCoop?.getPlayers?.()||[];return list.find(p=>String(p.name||'').toLocaleLowerCase()===q||String(p.name||'').toLocaleLowerCase().startsWith(q))||null;}
function adminAllowed(){const coop=window.ApocalypseCoop;return !coop?.room||coop.isOwner();}
function executeAdminCommand(command,args,remote=false){
 const coop=window.ApocalypseCoop;
 if(command==='kill'){const target=findPlayer(args[0]);if(!target){appendChat('Система','Игрок не найден.',true);return;}if(target.self){state.hp=0;showDeath();save();}else if(target.user_id&&coop?.room?.status==='running'){coop.send({kind:'admin-command',action:'kill',target_user_id:target.user_id});}return;}
 if(command==='tp'){if(args.length===1){const target=findPlayer(args[0]);if(!target){appendChat('Система','Игрок не найден.',true);return;}state.x=target.x;state.y=target.y;save();toast('Телепортация выполнена');return;}if(args.length===2){const from=findPlayer(args[0]),to=findPlayer(args[1]);if(!from||!to){appendChat('Система','Не удалось найти одного из игроков.',true);return;}if(from.self){state.x=to.x;state.y=to.y;save();toast('Игрок телепортирован');}else if(from.user_id&&coop?.room?.status==='running'){coop.send({kind:'admin-command',action:'tp',target_user_id:from.user_id,x:to.x,y:to.y});}return;}appendChat('Система','Использование: /tp игрок или /tp игрок1 игрок2',true);return;}
 if(command==='heal'){state.hp=100;save();toast('Здоровье восстановлено');return;}
 if(command==='healB'){const target=findPlayer(args[0]);if(!target){appendChat('Система','Игрок не найден.',true);return;}if(target.self){bonusLives=3;bonusLivesActive=true;save();toast('Выдано 3 дополнительных возрождения');}else if(target.user_id&&coop?.room?.status==='running'){coop.send({kind:'admin-command',action:'healB',target_user_id:target.user_id});}return;}
 if(command==='help'){appendChat('Система','Команды владельца: /kill ник — убить игрока; /tp игрок — телепортировать себя к игроку; /tp игрок1 игрок2 — переместить первого к второму; /heal — восстановить своё здоровье; /healB ник — выдать 3 возрождения; /help — список команд.',true);return;}
}
function submitChatMessage(raw){
 const value=String(raw||'').trim();if(!value)return;
 if(value.startsWith('/')){
  const parts=value.slice(1).split(/\s+/),command=(parts.shift()||'').toLowerCase();
  if(!['kill','tp','heal','healb','help'].includes(command)){appendChat('Система','Неизвестная команда. Напиши /help.',true);return;}
  if(!adminAllowed()){appendChat('Система','Команды доступны только владельцу мира.',true);return;}
  const cmd=command==='healb'?'healB':command;
  executeAdminCommand(cmd,parts);
  
  return;
 }
 appendChat(playerName,value);
 const coop=window.ApocalypseCoop;if(coop?.room?.status==='running')coop.send({kind:'chat-message',name:playerName,message:value.slice(0,220)});
}
const chatInput=document.getElementById('apocChatInput'),mobileChat=document.getElementById('apocMobileChat');
if(chatInput){chatInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();submitChatMessage(chatInput.value);chatInput.value='';}});chatInput.addEventListener('blur',()=>document.body.classList.remove('apoc-chat-open'));}
if(mobileChat)mobileChat.addEventListener('click',()=>{document.body.classList.add('apoc-chat-open');chatInput?.focus();});
window.addEventListener('apocalypse-coop-event',e=>{const p=e.detail,coop=window.ApocalypseCoop;if(!p||!coop)return;if(p.kind==='building-loot-claimed'&&p.user_id!==coop.userId&&typeof p.buildingId==='string'&&Number.isInteger(p.floor)&&['loot','weapon'].includes(p.slot)){const entry=buildingLoot[p.buildingId]?.[p.floor-1];if(entry){if(p.slot==='loot')entry.picked=true;else entry.weaponPicked=true;save();}}if(p.kind==='generator-state'&&p.user_id!==coop.userId){generatorRepaired=p.repaired===true;generatorOnline=generatorRepaired&&p.online===true;save();}if(p.kind==='map-markers'&&Array.isArray(p.mapMarkers)&&p.user_id!==coop.userId){const clean=p.mapMarkers.filter(v=>v&&typeof v.name==='string'&&Number.isFinite(v.x)&&Number.isFinite(v.y)).slice(0,100).map(v=>({name:v.name.slice(0,36),x:Math.max(WORLD_MIN,Math.min(WORLD_MAX,v.x)),y:Math.max(WORLD_MIN,Math.min(WORLD_MAX,v.y))}));if(coop.isOwner()){mapMarkers.splice(0,mapMarkers.length,...clean);save();coop.send({kind:'map-markers',mapMarkers:clean});}else if(p.user_id===coop.room?.owner_id){mapMarkers.splice(0,mapMarkers.length,...clean);save();}}if(p.kind==='barricade-built'&&p.user_id!==coop.userId&&p.barricade&&Number.isFinite(p.barricade.x)&&Number.isFinite(p.barricade.y)){barricades.push({x:p.barricade.x,y:p.barricade.y,angle:bounded(p.barricade.angle,0,-Math.PI*2,Math.PI*2)});save();}if(p.kind==='spike-trap-built'&&p.user_id!==coop.userId&&p.trap&&Number.isFinite(p.trap.x)&&Number.isFinite(p.trap.y)){spikeTraps.push({x:p.trap.x,y:p.trap.y,angle:bounded(p.trap.angle,0,-Math.PI*2,Math.PI*2),charges:Math.max(0,Math.min(3,Number(p.trap.charges)||3))});save();}if(p.kind==='safehouse-upgrade'&&p.user_id!==coop.userId){state.safehouseLevel=Math.max(state.safehouseLevel,Math.min(3,Number(p.level)||0));save();}if(p.kind==='zombie-spawn'&&p.user_id!==coop.userId&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&!zombies.some(z=>Math.hypot(z.x-p.x,z.y-p.y)<24))spawnZombie(p.x,p.y,p.ztype||'night',p.eventId||'');if(p.kind==='zombie-hit'&&p.user_id!==coop.userId){const target=zombies.reduce((best,z)=>{const d=Math.hypot(z.x-p.x,z.y-p.y);return d<60&&(!best||d<best.d)?{z,d}:best;},null);if(target)target.z.hp=Math.max(1,target.z.hp-Math.max(1,Number(p.damage)||1));}if(p.kind==='zombie-killed'&&p.user_id!==coop.userId){let target=null,best=75;for(const z of zombies){const d=Math.hypot(z.x-p.x,z.y-p.y);if(d<best){target=z;best=d;}}if(target){if(target.eventId){const horde=randomEventSites.find(v=>v.id===target.eventId);if(horde){horde.remaining=Math.max(0,(Number(horde.remaining)||0)-1);coop.send({kind:'horde-progress',eventId:horde.id,remaining:horde.remaining});}}const zi=zombies.indexOf(target);if(zi>=0)zombies.splice(zi,1);}}if(p.kind==='tree-harvested'&&p.user_id!==coop.userId&&Number.isInteger(p.index)&&trees[p.index]){trees[p.index].harvested=true;harvestedTrees.add(p.index);save();}if(p.kind==='wreck-claimed'&&p.user_id!==coop.userId&&Number.isInteger(p.index)&&wrecks[p.index]){wrecks[p.index].done=true;state.quest=Math.max(state.quest,Number(p.quest)||0);save();toast('Общие детали: '+state.quest+'/3');}if(p.kind==='horde-progress'&&p.user_id!==coop.userId){const event=randomEventSites.find(v=>v.id===p.eventId);if(event)event.remaining=Math.max(0,Math.min(8,Number(p.remaining)||0));save();}if(p.kind==='horde-reward-claimed'&&p.user_id!==coop.userId){const hi=randomEventSites.findIndex(v=>v.id===p.eventId);if(hi>=0)randomEventSites.splice(hi,1);state.scrap+=5;state.bolts+=3;state.food+=2;state.survivorTrust+=1;save();toast('Команда зачистила орду · получены общие припасы');}if(p.kind==='world-event-created'&&p.user_id!==coop.userId&&p.site&&Number.isFinite(p.site.x)&&Number.isFinite(p.site.y)&&!randomEventSites.some(v=>v.id===p.site.id)){randomEventSites.push(p.site);if(['car','checkpoint','camp','convoy','quarantine','survivors'].includes(p.site.type)){const type=p.site.type==='car'||p.site.type==='convoy'?'wrecked_car':p.site.type==='checkpoint'||p.site.type==='quarantine'?'barrier':'tent';worldProps.push({id:p.site.id,type,x:p.site.x,y:p.site.y,w:type==='wrecked_car'?112:type==='barrier'?138:96,h:type==='wrecked_car'?58:type==='barrier'?36:70});}save();}if(p.kind==='world'&&p.user_id===coop.room?.owner_id){if(Number.isFinite(p.worldClock))worldClock=p.worldClock;if(Number.isFinite(p.day))state.day=Math.max(1,Number(p.day));if(Array.isArray(p.mapMarkers))mapMarkers.splice(0,mapMarkers.length,...p.mapMarkers.filter(v=>v&&typeof v.name==='string'&&Number.isFinite(v.x)&&Number.isFinite(v.y)).slice(0,100).map(v=>({name:v.name.slice(0,36),x:bounded(v.x,0,WORLD_MIN,WORLD_MAX),y:bounded(v.y,0,WORLD_MIN,WORLD_MAX)})));if(Array.isArray(p.spikeTraps)){spikeTraps.splice(0,spikeTraps.length,...p.spikeTraps.filter(t=>t&&Number.isFinite(t.x)&&Number.isFinite(t.y)).map(t=>({x:t.x,y:t.y,angle:bounded(t.angle,0,-Math.PI*2,Math.PI*2),charges:whole(t.charges,0,0,3)})));}if(Number.isFinite(p.safehouseLevel))state.safehouseLevel=whole(p.safehouseLevel,state.safehouseLevel,0,3);if(Number.isFinite(p.baseDefenseLevel))state.baseDefenseLevel=whole(p.baseDefenseLevel,state.baseDefenseLevel,0,3);if(Number.isFinite(p.defenseAmmo))state.defenseAmmo=whole(p.defenseAmmo,state.defenseAmmo,0,9999);if(Number.isFinite(p.crewCount))state.crewCount=whole(p.crewCount,state.crewCount,0,3);if(['scavenger','medic','guard'].includes(p.crewRole))state.crewRole=p.crewRole;if(Number.isFinite(p.workbenchLevel))state.workbenchLevel=whole(p.workbenchLevel,state.workbenchLevel,1,3);if(typeof p.campfireBuilt==='boolean')state.campfireBuilt=p.campfireBuilt;if(Number.isFinite(p.campfireFuel))state.campfireFuel=whole(p.campfireFuel,state.campfireFuel,0,999999);if(typeof p.vehicleRepaired==='boolean')state.vehicleRepaired=p.vehicleRepaired;if(Number.isFinite(p.fuel))state.fuel=whole(p.fuel,state.fuel,0,999999);if(Number.isFinite(p.raidDay))state.raidDay=whole(p.raidDay,state.raidDay,0,999999);if(Number.isFinite(p.cleanWater))state.cleanWater=whole(p.cleanWater,state.cleanWater,0,999999);if(Number.isFinite(p.hydration))state.hydration=bounded(p.hydration,state.hydration,0,100);if(Number.isFinite(p.contractDay)){state.contractDay=whole(p.contractDay,state.contractDay,0,999999);state.contractType=['wood','kills','salvage'].includes(p.contractType)?p.contractType:state.contractType;state.contractProgress=whole(p.contractProgress,state.contractProgress,0,99);state.contractClaimed=p.contractClaimed===true;}if(Array.isArray(p.worldEvents)){for(const oldSite of randomEventSites){const wi=worldProps.findIndex(v=>v.id===oldSite.id);if(wi>=0)worldProps.splice(wi,1);}randomEventSites.splice(0,randomEventSites.length,...p.worldEvents.filter(v=>v&&['car','checkpoint','camp','gunfire','scream','convoy','quarantine','survivors','signal','horde'].includes(v.type)&&Number.isFinite(v.x)&&Number.isFinite(v.y)).slice(-30).map(v=>({...v})));for(const site of randomEventSites){if(['car','checkpoint','camp','convoy','quarantine','survivors'].includes(site.type)){const type=site.type==='car'||site.type==='convoy'?'wrecked_car':site.type==='checkpoint'||site.type==='quarantine'?'barrier':'tent';worldProps.push({id:site.id,type,x:site.x,y:site.y,w:type==='wrecked_car'?112:type==='barrier'?138:96,h:type==='wrecked_car'?58:type==='barrier'?36:70});}}for(let zi=zombies.length-1;zi>=0;zi--)if(zombies[zi].eventId)zombies.splice(zi,1);if(Array.isArray(p.hordeDefenders))for(const defender of p.hordeDefenders.slice(0,prefs.infectedCap)){if(!defender||!Number.isFinite(defender.x)||!Number.isFinite(defender.y))continue;spawnZombie(defender.x,defender.y,defender.kind||'night',String(defender.eventId||''));const created=zombies[zombies.length-1];if(created&&created.eventId===String(defender.eventId||''))created.hp=bounded(defender.hp,created.hp,1,500);}}if(Array.isArray(p.barricades))barricades.splice(0,barricades.length,...p.barricades.filter(v=>v&&Number.isFinite(v.x)&&Number.isFinite(v.y)).slice(0,24));if(Array.isArray(p.harvestedTrees)){harvestedTrees.clear();for(const index of p.harvestedTrees)if(Number.isInteger(index)&&trees[index]){harvestedTrees.add(index);trees[index].harvested=true;}}if(Array.isArray(p.wrecks))p.wrecks.forEach((done,i)=>{if(i<wrecks.length)wrecks[i].done=done===true;});if(typeof p.generatorRepaired==='boolean')generatorRepaired=p.generatorRepaired;if(typeof p.generatorOnline==='boolean')generatorOnline=p.generatorOnline;save();}if(p.kind==='chat-message'&&p.user_id!==coop.userId)appendChat(p.name||'Игрок',String(p.message||'').slice(0,220));if(p.kind==='admin-command'&&p.user_id===coop.room?.owner_id&&p.target_user_id===coop.userId){if(p.action==='kill'){state.hp=0;showDeath();}else if(p.action==='healB'){bonusLives=3;bonusLivesActive=true;save();toast('Владелец выдал 3 дополнительных возрождения');}else if(p.action==='tp'&&Number.isFinite(p.x)&&Number.isFinite(p.y)){state.x=Math.max(WORLD_MIN,Math.min(WORLD_MAX,p.x));state.y=Math.max(WORLD_MIN,Math.min(WORLD_MAX,p.y));save();toast('Владелец телепортировал тебя');}}});


function grantSkillXP(amount){
 const gained=Math.max(0,Math.round(Number(amount)||0));if(!gained)return;
 state.skillXP+=gained;let points=0;
 while(state.skillXP>=100){state.skillXP-=100;state.skillPoints++;points++;}
 if(points)toast('Новый уровень навыков · +'+points+' очко развития');
}
function purchaseSkill(branch){
 if(!['combat','scavenger','medic'].includes(branch))return false;
 if(state.skillPoints<1){toast('Нужно очко развития · получай опыт за задания и вылазки');return false;}
 if(state.skillLevels[branch]>=5){toast('Эта специализация уже максимального уровня');return false;}
 state.skillPoints--;state.skillLevels[branch]++;save();openSkillTree();return true;
}
function openSkillTree(){
 const names={combat:'Боец',scavenger:'Следопыт',medic:'Полевой медик'};
 const descriptions={combat:'Каждый уровень добавляет +3 урона оружию. Получай опыт за уничтожение заражённых.',scavenger:'Каждые два уровня дают +1 металл с заражённых; шанс найти еду повышается на 3,5% за уровень.',medic:'Каждый уровень добавляет +3 к аптечкам и +4 к инъекторам.'};
 showPanel('Развитие персонажа','Опыт: '+state.skillXP+'/100 · свободные очки: '+state.skillPoints+'. Максимум каждой специализации — 5 уровней. '+Object.keys(names).map(k=>names[k]+': '+state.skillLevels[k]+'/5').join(' · '),[
  {icon:'⚔️',name:names.combat+' · '+descriptions.combat,count:'Ур. '+state.skillLevels.combat+'/5',use:()=>purchaseSkill('combat')},
  {icon:'🧭',name:names.scavenger+' · '+descriptions.scavenger,count:'Ур. '+state.skillLevels.scavenger+'/5',use:()=>purchaseSkill('scavenger')},
  {icon:'🩺',name:names.medic+' · '+descriptions.medic,count:'Ур. '+state.skillLevels.medic+'/5',use:()=>purchaseSkill('medic')}
 ]);
}
function upgradeWeaponMod(kind){
 if(!['optic','barrel','grip'].includes(kind))return false;
 const level=state.weaponMods[kind];if(level>=3){toast('Модификация уже максимального уровня');return false;}
 const costs={
  optic:{parts:1+level,electronics:1,scrap:6+level*5,bolts:0},
  barrel:{parts:1+level,electronics:0,scrap:7+level*5,bolts:2+level},
  grip:{parts:1+level,electronics:0,scrap:5+level*4,bolts:1+level}
 }[kind];
 if(state.weaponParts<costs.parts||state.electronicsPack<costs.electronics||state.scrap<costs.scrap||state.bolts<costs.bolts){toast('Не хватает деталей: '+costs.parts+' деталей оружия, '+costs.electronics+' электроники, '+costs.scrap+' металла, '+costs.bolts+' крепежа');return false;}
 state.weaponParts-=costs.parts;state.electronicsPack-=costs.electronics;state.scrap-=costs.scrap;state.bolts-=costs.bolts;state.weaponMods[kind]++;
 save();openWeaponBench();return true;
}
function openWeaponBench(){
 const m=state.weaponMods;
 showPanel('Оружейная мастерская','Три независимые модификации, каждая до 3 уровней. Оптика увеличивает дальность стрельбы, ствол повышает урон, рукоять ускоряет атаку. Детали: '+state.weaponParts+' · электроника: '+state.electronicsPack+'.',
 [
  {icon:'🔭',name:'Оптика · +35 к дальности за уровень',count:'Ур. '+m.optic+'/3',use:()=>upgradeWeaponMod('optic')},
  {icon:'🧱',name:'Усиленный ствол · +7 урона за уровень',count:'Ур. '+m.barrel+'/3',use:()=>upgradeWeaponMod('barrel')},
  {icon:'✋',name:'Тактическая рукоять · быстрее атака',count:'Ур. '+m.grip+'/3',use:()=>upgradeWeaponMod('grip')}
 ]);
}
function craftAdvancedItem(kind){
 const recipes={
  injector:{cost:{scrap:5,bolts:1,parts:0,electronics:1},give:()=>state.medInjector++,label:'Медицинский инъектор'},
  energy:{cost:{scrap:3,bolts:0,parts:0,electronics:1},give:()=>state.energyDrink++,label:'Энергетик'},
  plate:{cost:{scrap:5,bolts:2,parts:1,electronics:0},give:()=>state.armorPlate++,label:'Бронепластина'},
  ammo:{cost:{scrap:4,bolts:2,parts:0,electronics:1},give:()=>state.ammoCrate++,label:'Ящик патронов'}
 };
 const recipe=recipes[kind];if(!recipe)return false;const c=recipe.cost;
 if(state.scrap<c.scrap||state.bolts<c.bolts||state.weaponParts<c.parts||state.electronicsPack<c.electronics){toast('Не хватает компонентов для '+recipe.label);return false;}
 state.scrap-=c.scrap;state.bolts-=c.bolts;state.weaponParts-=c.parts;state.electronicsPack-=c.electronics;recipe.give();save();openFieldCrafting();toast('Изготовлено: '+recipe.label);return true;
}
function openFieldCrafting(){
 showPanel('Производство экипировки','Расширенная сборка расходников. Все изготовленные предметы сохраняются в текущем мире.',
 [
  {icon:'💉',name:'Медицинский инъектор · 5 металла + 1 крепёж + 1 электроника',count:'В запасе: '+state.medInjector,use:()=>craftAdvancedItem('injector')},
  {icon:'⚡',name:'Энергетик · 3 металла + 1 электроника',count:'В запасе: '+state.energyDrink,use:()=>craftAdvancedItem('energy')},
  {icon:'🛡️',name:'Бронепластина · 5 металла + 2 крепежа + 1 деталь оружия',count:'В запасе: '+state.armorPlate,use:()=>craftAdvancedItem('plate')},
  {icon:'📦',name:'Ящик патронов · 4 металла + 2 крепежа + 1 электроника',count:'В запасе: '+state.ammoCrate,use:()=>craftAdvancedItem('ammo')}
 ]);
}
function purchaseBaseDefense(){
 if(state.baseDefenseLevel>=3){toast('Оборона базы достигла максимального уровня');return false;}
 const coop=window.ApocalypseCoop;if(coop?.room?.status==='running'&&!coop.isOwner()){toast('Улучшать общую оборону может владелец комнаты');return false;}
 const costs=[{scrap:12,wood:8,bolts:6,electronics:1},{scrap:18,wood:12,bolts:10,electronics:1},{scrap:25,wood:18,bolts:14,electronics:2}][state.baseDefenseLevel];
 if(state.scrap<costs.scrap||state.wood<costs.wood||state.bolts<costs.bolts||state.electronicsPack<costs.electronics){toast('Не хватает материалов для турели и сигнализации');return false;}
 state.scrap-=costs.scrap;state.wood-=costs.wood;state.bolts-=costs.bolts;state.electronicsPack-=costs.electronics;state.baseDefenseLevel++;state.defenseAmmo=Math.min(60,state.defenseAmmo+12);save();
 if(coop?.room?.status==='running')coop.send({kind:'base-defense-state',level:state.baseDefenseLevel,ammo:state.defenseAmmo});
 openDefenseConsole();toast('Оборона базы улучшена · уровень '+state.baseDefenseLevel+'/3');return true;
}
function refillBaseDefense(){
 if(state.baseDefenseLevel<1){toast('Сначала установи систему обороны');return false;}
 if(state.ammo<12){toast('Нужно 12 обычных патронов для пополнения турели');return false;}
 if(state.defenseAmmo>=60){toast('Боезапас турели уже полон');return false;}
 state.ammo-=12;state.defenseAmmo=Math.min(60,state.defenseAmmo+12);save();
 const coop=window.ApocalypseCoop;if(coop?.room?.status==='running'&&coop.isOwner())coop.send({kind:'base-defense-state',level:state.baseDefenseLevel,ammo:state.defenseAmmo});
 openDefenseConsole();return true;
}
function openDefenseConsole(){
 showPanel('Оборона убежища','Автоматическая турель охраняет лагерь выживших в радиусе 340 блоков. Она стреляет только когда рядом есть заражённые и расходует отдельный боезапас.',
 [
  {icon:'🚨',name:'Сигнализация и турель · '+(state.baseDefenseLevel>=3?'максимум':'улучшить до '+(state.baseDefenseLevel+1)+' уровня'),count:'Уровень '+state.baseDefenseLevel+'/3 · патроны '+state.defenseAmmo+'/60',use:purchaseBaseDefense},
  {icon:'▣',name:'Пополнить турель · 12 патронов из рюкзака',count:'Обычные патроны: '+state.ammo,use:refillBaseDefense}
 ]);
}
let baseDefenseNextShotAt=0,baseAlarmLastAt=0;
function updateBaseDefense(now){
 if(!gameActive||state.baseDefenseLevel<1||state.defenseAmmo<1)return;
 const coop=window.ApocalypseCoop;if(coop?.room?.status==='running'&&!coop.isOwner())return;
 const origin=survivorCamp.bench;let target=null,best=340;
 for(const z of zombies){const d=Math.hypot(z.x-origin.x,z.y-origin.y);if(d<best&&now>z.born+z.emerge){best=d;target=z;}}
 if(!target)return;
 if(now-baseAlarmLastAt>12000){baseAlarmLastAt=now;toast('СИГНАЛИЗАЦИЯ БАЗЫ · обнаружены заражённые');}
 if(now<baseDefenseNextShotAt)return;baseDefenseNextShotAt=now-(state.baseDefenseLevel*90)+1650;state.defenseAmmo--;
 target.hp-=16+state.baseDefenseLevel*12;
 if(target.hp<=0){const idx=zombies.indexOf(target);if(idx>=0)zombies.splice(idx,1);state.scrap+=1+Math.floor(state.skillLevels.scavenger/2);grantSkillXP(8);progressContract('kills',1);const coop=window.ApocalypseCoop;if(coop?.room?.status==='running')coop.send({kind:'zombie-killed',x:target.x,y:target.y});}
 if(state.defenseAmmo===0)toast('Турель разрядилась · пополни боезапас в мастерской');
 save();
}
function drawBaseDefense(){
 if(state.baseDefenseLevel<1)return;
 const x=survivorCamp.bench.x+64,y=survivorCamp.bench.y+14,level=state.baseDefenseLevel;
 ctx.save();ctx.translate(x,y);
 ctx.fillStyle='#10171399';ctx.beginPath();ctx.ellipse(0,13,30,9,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#343e39';ctx.beginPath();ctx.moveTo(-20,8);ctx.lineTo(-13,-7);ctx.lineTo(13,-7);ctx.lineTo(21,8);ctx.closePath();ctx.fill();
 ctx.fillStyle='#68766d';ctx.fillRect(-14,-17,28,13);ctx.fillStyle='#222b27';ctx.fillRect(-6,-22,29,8);
 ctx.fillStyle='#9aa69a';ctx.fillRect(13,-21,25,4);ctx.fillStyle='#1a211d';ctx.fillRect(33,-22,7,6);
 ctx.strokeStyle='#aab59b';ctx.lineWidth=1.5;ctx.strokeRect(-12,-15,24,9);
 ctx.fillStyle=state.defenseAmmo>0?'#a9e18a':'#c45c48';ctx.shadowColor=state.defenseAmmo>0?'#9be58b':'#e45b46';ctx.shadowBlur=8;ctx.beginPath();ctx.arc(-5,-11,2.5,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
 ctx.fillStyle='#e3d6ae';ctx.font='bold 8px system-ui';ctx.textAlign='center';ctx.fillText('ОБОРОНА '+level+' · '+state.defenseAmmo,0,28);ctx.restore();
}
function appendPanelAction(icon,name,count,action){
 const host=document.getElementById('items');if(!host)return;
 const slot=document.createElement('div');slot.className='slot filled';
 const art=document.createElement('div');art.className='art';art.textContent=icon;
 const title=document.createElement('b');title.textContent=name;
 const amount=document.createElement('small');amount.textContent=String(count);
 slot.append(art,title,amount);slot.addEventListener('click',action);host.appendChild(slot);
}
const _openWorkshopExpanded=openWorkshop;
openWorkshop=function(){_openWorkshopExpanded();appendPanelAction('🧠','Развитие навыков','Опыт '+state.skillXP+'/100 · очки '+state.skillPoints,openSkillTree);appendPanelAction('🔫','Оружейная мастерская','Оптика · ствол · рукоять',openWeaponBench);appendPanelAction('🧰','Производство экипировки','4 расширенных рецепта',openFieldCrafting);appendPanelAction('🚨','Оборона убежища','Уровень '+state.baseDefenseLevel+'/3',openDefenseConsole);};
const _inventoryExpanded=inventory;
inventory=function(){_inventoryExpanded();appendPanelAction('🧠','Развитие навыков','Очки '+state.skillPoints,openSkillTree);appendPanelAction('🔫','Модификации оружия','Ур. '+state.weaponMods.optic+'/'+state.weaponMods.barrel+'/'+state.weaponMods.grip,openWeaponBench);appendPanelAction('🧰','Изготовление экипировки','Создать расходники',openFieldCrafting);};
window.addEventListener('apocalypse-coop-event',e=>{const p=e.detail;if(!p||p.kind!=='base-defense-state')return;state.baseDefenseLevel=whole(p.level,state.baseDefenseLevel,0,3);state.defenseAmmo=whole(p.ammo,state.defenseAmmo,0,60);save();});
function installApocalypseVisualRemaster(){
 const mobileLimit=isAndroidDevice&&prefs.effects==='low';
 const oldGround=ground;ground=function(){oldGround();if(mobileLimit)return;ctx.save();const count=isAndroidDevice?8:22;for(let i=0;i<count;i++){const x=state.x-w/2+((i*173+Math.floor(state.x/97)*31)%(w+80)),y=state.y-h/2+((i*113+Math.floor(state.y/83)*19)%(h+80));ctx.globalAlpha=.07+(i%4)*.025;ctx.fillStyle=i%3?'#29342a':'#b09a70';ctx.beginPath();ctx.ellipse(x,y,4+i%5,2+i%3,(i%5)*.3,0,Math.PI*2);ctx.fill();}ctx.restore();};
 const oldTree=tree;tree=function(t){oldTree(t);if(mobileLimit)return;ctx.save();ctx.translate(t.x,t.y-42*t.size);ctx.scale(t.size,t.size);for(let i=0;i<7;i++){const x=Math.sin(t.phase+i*2.4)*18,y=-15+(i%4)*9;ctx.fillStyle=i%2?'#a5bd70aa':'#d1cf8b77';ctx.beginPath();ctx.ellipse(x,y,3.5,1.7,i*.5,0,Math.PI*2);ctx.fill();}ctx.restore();};
 const oldBuilding=building;building=function(b){oldBuilding(b);if(mobileLimit)return;ctx.save();const top=b.y-b.floors*34;for(let i=0;i<Math.min(9,Math.floor(b.w/30));i++){const x=b.x+18+(i*43%(b.w-36)),y=top+24+(i*61%(b.h+b.floors*34-42));ctx.globalAlpha=.24;ctx.strokeStyle=i%2?'#c6b28a':'#242b25';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+3,y+9);ctx.lineTo(x-1,y+17);ctx.stroke();if(i%3===0){ctx.fillStyle='#8a5a3e';ctx.fillRect(x+5,y+4,2,12);}}ctx.restore();};
 const oldInterior=drawBuildingInterior;drawBuildingInterior=function(b){oldInterior(b);if(mobileLimit)return;ctx.save();const top=b.y-b.floors*34,roomY=b.y+b.h-250;ctx.globalAlpha=.12;ctx.strokeStyle='#d6c9a4';ctx.lineWidth=1;for(let x=b.x+28;x<b.x+b.w-28;x+=42){ctx.beginPath();ctx.moveTo(x,roomY+12);ctx.lineTo(x+9,roomY+145);ctx.stroke();}ctx.restore();};
 const oldSurvivor=drawSurvivor;drawSurvivor=function(x,y,palette,phase,moving,remote,name,action){oldSurvivor(x,y,palette,phase,moving,remote,name,action);if(mobileLimit)return;ctx.save();ctx.translate(x,y);ctx.strokeStyle='#d7c8a066';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-6,-5);ctx.lineTo(5,-4);ctx.moveTo(-5,1);ctx.lineTo(5,2);ctx.moveTo(-4,7);ctx.lineTo(4,7);ctx.stroke();ctx.fillStyle='#c6b78d';ctx.fillRect(-7,-2,2,2);ctx.fillRect(5,3,2,2);ctx.restore();};
 const oldZombies=drawZombies;drawZombies=function(){oldZombies();if(mobileLimit)return;ctx.save();for(const z of zombies){ctx.globalAlpha=.75;ctx.fillStyle=z.kind==='screecher'?'#e5c77a':z.kind==='spitter'?'#b4d76b':'#d3a17d';ctx.beginPath();ctx.arc(z.x-3,z.y-15,1.6,0,Math.PI*2);ctx.arc(z.x+3,z.y-15,1.6,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#301e1a99';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(z.x-5,z.y-5);ctx.lineTo(z.x-1,z.y-2);ctx.lineTo(z.x+4,z.y-6);ctx.stroke();}ctx.restore();};
 const oldProp=drawWorldProp;drawWorldProp=function(p){oldProp(p);if(mobileLimit)return;ctx.save();ctx.translate(p.x,p.y);ctx.strokeStyle='#c2ad7b66';ctx.lineWidth=1;for(let i=0;i<4;i++){const x=-p.w*.35+i*p.w*.19;ctx.beginPath();ctx.moveTo(x,-p.h*.2);ctx.lineTo(x+7,-p.h*.2+4);ctx.lineTo(x+3,-p.h*.2+11);ctx.stroke();}ctx.restore();};
 const oldWeapon=drawHeldWeapon;drawHeldWeapon=function(){oldWeapon();if(mobileLimit)return;ctx.save();ctx.translate(w/2+14,h/2+10);ctx.strokeStyle='#e1e4d888';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-1,-3);ctx.lineTo(17,-3);ctx.moveTo(3,5);ctx.lineTo(7,9);ctx.stroke();ctx.fillStyle='#bca779';ctx.fillRect(10,-6,2,2);ctx.restore();};
 const oldWeather=drawWeatherEffects;drawWeatherEffects=function(){oldWeather();if(mobileLimit)return;ctx.save();ctx.globalAlpha=.12;ctx.fillStyle='#d4d9c8';for(let i=0;i<(isAndroidDevice?5:13);i++){const x=(i*149+time*.035)%(w+20),y=(i*97+Math.sin(time*.0008+i)*20)%h;ctx.beginPath();ctx.arc(x,y,1.2+(i%3)*.4,0,Math.PI*2);ctx.fill();}ctx.restore();};
}
installApocalypseVisualRemaster();

window.ApocalypseGame=Object.freeze({getNewSystemsStats:()=>({skillXP:state.skillXP,skillPoints:state.skillPoints,skillLevels:{...state.skillLevels},weaponMods:{...state.weaponMods},baseDefenseLevel:state.baseDefenseLevel,defenseAmmo:state.defenseAmmo}),getWrecks:()=>wrecks.map(v=>v.done),getQuest:()=>state.quest,getDay:()=>state.day,getDayReward:()=>state.dayReward,getClock:()=>worldClock,getMovementStats:()=>({stamina:state.stamina,maxStamina:maxStamina(),runUpgrade:state.runUpgrade,sprinting:sprintActive}),getSpawnCampfireStats:()=>({x:spawnCampfire.x,y:spawnCampfire.y,playerX:state.x,playerY:state.y,near:nearSpawnCampfire(),active:spawnCampfireActive(),level:spawnCampfireLevel,remaining:spawnCampfireRemaining(),gameActive,inside:!!activeInterior}),getHomeSystemStats:()=>({homes:Object.keys(homeFurnitureLoot).length,slotsPerFloor:homeFurnitureSlots.length,roomCount:4}),getLastSignalStats:()=>lastSignalMission?{...lastSignalMission,guards:zombies.filter(z=>z.eventId==='last_signal_guard').length}:null,getUpgradeStats:()=>({run:state.runUpgrade,ammo:state.ammoUpgrade,ammoCapacity:ammoCapacity(),ammo:state.ammo}),getConvenienceStats:()=>({hp:state.hp,stamina:state.stamina,bandage:state.bandage,food:state.food,cleanWater:state.cleanWater,hydration:state.hydration,infection:state.infection,bodyTemp:state.bodyTemp,crewCount:state.crewCount,crewRole:state.crewRole,workbenchLevel:state.workbenchLevel,weaponDurability:state.weaponDurability,antibiotics:state.antibiotics,campfireBuilt:state.campfireBuilt,campfireFuel:state.campfireFuel,vehicleRepaired:state.vehicleRepaired,fuel:state.fuel,safehouseLevel:state.safehouseLevel,contractType:state.contractType,contractProgress:state.contractProgress,medInjector:state.medInjector,energyDrink:state.energyDrink,ammoCrate:state.ammoCrate,armorPlate:state.armorPlate,weaponParts:state.weaponParts,activeWaypoint:activeWaypoint?{...activeWaypoint}:null}),getWorldState:()=>({wrecks:wrecks.map(v=>v.done),quest:state.quest,day:state.day,worldClock,generatorRepaired,generatorOnline,safehouseLevel:state.safehouseLevel,baseDefenseLevel:state.baseDefenseLevel,defenseAmmo:state.defenseAmmo,crewCount:state.crewCount,crewRole:state.crewRole,workbenchLevel:state.workbenchLevel,campfireBuilt:state.campfireBuilt,campfireFuel:state.campfireFuel,vehicleRepaired:state.vehicleRepaired,fuel:state.fuel,raidDay:state.raidDay,cleanWater:state.cleanWater,hydration:state.hydration,contractDay:state.contractDay,contractType:state.contractType,contractProgress:state.contractProgress,contractClaimed:state.contractClaimed,hordeDefenders:zombies.filter(z=>z.eventId).map(z=>({x:z.x,y:z.y,kind:z.kind,eventId:z.eventId,hp:z.hp})),spikeTraps:spikeTraps.map(t=>({x:t.x,y:t.y,angle:t.angle,charges:t.charges})),worldEvents:randomEventSites.map(v=>({...v})),mapMarkers:mapMarkers.map(v=>({...v})),activeWaypoint:activeWaypoint?{...activeWaypoint}:null,barricades:barricades.map(b=>({...b})),harvestedTrees:[...harvestedTrees]}),save});setupJoystick();daily();resize();ensureSafeSpawn();try{const creatorMode=sessionStorage.getItem('apoc_open_character_creator');if(creatorMode){sessionStorage.removeItem('apoc_open_character_creator');setTimeout(()=>openCharacterCreator(creatorMode==='new'),180);}else if(sessionStorage.getItem('apoc_open_world_manager')==='1'){sessionStorage.removeItem('apoc_open_world_manager');setTimeout(showWorldManager,180);}else if(sessionStorage.getItem('apoc_play_cinematic')==='1'){sessionStorage.removeItem('apoc_play_cinematic');setTimeout(startIntroCinematic,180);}}catch(_){}if(!Number.isFinite(saved.spawnCampfireX)||!Number.isFinite(saved.spawnCampfireY)){const actualSpawn=findSafeSpawn(440,390);spawnCampfire.x=actualSpawn.x;spawnCampfire.y=actualSpawn.y;}save();requestAnimationFrame(loop);
})();