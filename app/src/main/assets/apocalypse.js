(()=>{'use strict';
const WORLD_MIN=-12000,WORLD_MAX=24000;
const canvas=document.getElementById('world'),ctx=canvas.getContext('2d'),STORE='skyrealm_apocalypse_mobile_v1';
const read=k=>{try{const value=JSON.parse(localStorage.getItem(k)||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{}}catch(_){return {}}};
const bounded=(value,fallback,min,max)=>{if(value===null||value===undefined||value==='')return fallback;const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback};
const whole=(value,fallback,min,max)=>Math.round(bounded(value,fallback,min,max));
const saved=read(STORE),avatar=read('skyrealm_character_v1');
const colors={skin:avatar.skin||'#e8b88c',hair:avatar.hair||'#352d3d',shirt:avatar.armor||'#526fba',trim:avatar.accent||'#9cb9ff',eyes:avatar.eye||'#26334c'};
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
 ammo:whole(saved.ammo,0,0,999999)
};
const savedWrecks=Array.isArray(saved.wrecks)?saved.wrecks:[];
const savedWorldClock=bounded(saved.worldClock,1/3,0,.999999);
const playerName=(()=>{try{const direct=localStorage.getItem('skyrealm_username');if(typeof direct==='string'&&direct.trim())return direct.trim().slice(0,24);const user=read('skyrealm_hub_user');const name=String(user.username||'Выживший').trim();return name.slice(0,24)||'Выживший'}catch(_){return 'Выживший'}})();
const mark={x:610,y:400};
const wrecks=[{x:300,y:260,done:false},{x:800,y:280,done:false},{x:930,y:650,done:false},{x:330,y:720,done:false},{x:650,y:900,done:false},{x:1200,y:420,done:false},{x:1450,y:800,done:false},{x:1850,y:350,done:false},{x:2200,y:780,done:false},{x:2750,y:520,done:false},{x:3100,y:1250,done:false},{x:1900,y:1950,done:false},{x:-9300,y:-9300,done:false},{x:-6100,y:-4200,done:false},{x:-2200,y:-10100,done:false},{x:4100,y:-8500,done:false},{x:9100,y:-9000,done:false},{x:15100,y:-9200,done:false},{x:20700,y:-5200,done:false},{x:22400,y:1800,done:false},{x:19400,y:7600,done:false},{x:22600,y:14600,done:false},{x:17200,y:21200,done:false},{x:11200,y:22600,done:false},{x:4200,y:21900,done:false},{x:-3200,y:21500,done:false},{x:-9600,y:17700,done:false},{x:-10500,y:10500,done:false},{x:-8200,y:2500,done:false},{x:13500,y:12800,done:false},{x:7200,y:15300,done:false},{x:1800,y:11200,done:false}];
wrecks.forEach((v,i)=>v.done=savedWrecks[i]===true);
// Keep a saved player spawn clear of parked/wrecked vehicles.
for(const v of wrecks){if(Math.hypot(state.x-v.x,state.y-v.y)<62){state.x=v.x+92;state.y=v.y+72;break;}}
let w=0,h=0,dpr=1,time=0,toastTimer=0,dialogMode='intro',moveX=0,moveY=0,joyPointer=null,wind=0,windName='тихий';
const zombies=[];const barricades=Array.isArray(saved.barricades)?saved.barricades.filter(v=>v&&typeof v==='object'&&Number.isFinite(v.x)&&Number.isFinite(v.y)&&v.x>=WORLD_MIN+40&&v.x<=WORLD_MAX-40&&v.y>=WORLD_MIN+40&&v.y<=WORLD_MAX-40).slice(0,24).map(v=>({x:v.x,y:v.y,angle:bounded(v.angle,0,-Math.PI*2,Math.PI*2)})):[];const infectionZones=[{x:3250,y:3280,r:185},{x:6500,y:6450,r:220},{x:10100,y:8500,r:175},{x:8350,y:2100,r:155}];let lastZombieSpawn=0,worldClock=savedWorldClock,zombieId=0,lastAttackAt=0,lastInfectionDamageAt=0,lastHudUpdate=0;const ZOMBIE_INTERVAL=38000;
const keys=new Set();
let buildMode=false,buildAngle=0;
function buildCandidate(){return{x:Math.max(WORLD_MIN+40,Math.min(WORLD_MAX-40,state.x+Math.cos(buildAngle)*76)),y:Math.max(WORLD_MIN+40,Math.min(WORLD_MAX-40,state.y+Math.sin(buildAngle)*76)),angle:buildAngle};}
function canPlaceBarricade(p){const halfW=32,halfH=21,c=Math.cos(p.angle),s=Math.sin(p.angle);if(Math.hypot(p.x-state.x,p.y-state.y)<48)return false;for(const [lx,ly] of [[-halfW,-halfH],[halfW,-halfH],[-halfW,halfH],[halfW,halfH],[0,0]]){const x=p.x+lx*c-ly*s,y=p.y+lx*s+ly*c;if(blocked(x,y)||insideBuilding(x,y))return false;}if(zombies.some(z=>Math.hypot(z.x-p.x,z.y-p.y)<42))return false;return true;}
function setBuildMode(on){buildMode=!!on;document.getElementById('buildControls').classList.toggle('hidden',!buildMode);if(buildMode){document.getElementById('panel').classList.add('hidden');toast('Выбери место · R / ПОВОРОТ · Enter / ПОСТАВИТЬ');}else{document.getElementById('buildStatus').textContent='';}}
function rotateBuild(){if(!buildMode)return;buildAngle=(buildAngle+Math.PI/4)%(Math.PI*2);}
function placeBarricade(){if(!buildMode)return;const p=buildCandidate();if(!canPlaceBarricade(p)){toast('Здесь нельзя строить: место занято');return;}if(state.scrap<2||state.wood<3){toast('Не хватает ресурсов: нужно 2 металла и 3 дерева');setBuildMode(false);return;}if(barricades.length>=24){toast('Лимит укреплений достигнут');setBuildMode(false);return;}state.scrap-=2;state.wood-=3;const placed={x:p.x,y:p.y,angle:p.angle};barricades.push(placed);const coop=window.ApocalypseCoop;if(coop?.room?.status==='running')coop.send({kind:'barricade-built',barricade:placed});save();setBuildMode(false);toast('Баррикада установлена');}
let gameActive=false,lastNet=0,deathHandled=false,respawnUntil=0,mobileQuickMenuResume=false,settingsResumeGame=false,sprintHeld=false,sprintActive=false,sprintLocked=false,mapResumeGame=false;
let radioSignal=null,radioSignalNextAt=performance.now()+30000;
const prefs=(()=>{const raw=read('skyrealm_apocalypse_settings_v1');return{effects:['low','high'].includes(raw.effects)?raw.effects:'high',joy:bounded(raw.joy,100,60,140),motion:raw.motion!==false,hints:raw.hints!==false}})();
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
 {id:'west_motel',x:-9900,y:13200,w:390,h:310,floors:3,accent:'#756d59'},{id:'west_shelter',x:-10800,y:5000,w:420,h:330,floors:1,accent:'#58645a',role:'shelter'},{id:'west_supermarket',x:-6500,y:20500,w:430,h:330,floors:2,accent:'#77715f',role:'store',kind:'market'}
];
const visitedStores=new Set(Array.isArray(saved.visitedStores)?saved.visitedStores:[]);
const storeLoot=saved.storeLoot&&typeof saved.storeLoot==='object'?saved.storeLoot:{};
const lootedShelters=new Set(Array.isArray(saved.lootedShelters)?saved.lootedShelters:[]);
buildForest();
const TREE_GRID_SIZE=320,treeGrid=new Map();
function treeGridKey(x,y){return Math.floor(x/TREE_GRID_SIZE)+','+Math.floor(y/TREE_GRID_SIZE)}
for(const t of trees){const key=treeGridKey(t.x,t.y);if(!treeGrid.has(key))treeGrid.set(key,[]);treeGrid.get(key).push(t);}
function nearbyTrees(x,y,range=100){const out=[],minX=Math.floor((x-range)/TREE_GRID_SIZE),maxX=Math.floor((x+range)/TREE_GRID_SIZE),minY=Math.floor((y-range)/TREE_GRID_SIZE),maxY=Math.floor((y+range)/TREE_GRID_SIZE);for(let gy=minY;gy<=maxY;gy++)for(let gx=minX;gx<=maxX;gx++){const cell=treeGrid.get(gx+','+gy);if(cell)for(const t of cell)if(Math.abs(t.x-x)<=range&&Math.abs(t.y-y)<=range)out.push(t);}return out;}
const harvestedTrees=new Set(Array.isArray(saved.harvestedTrees)?saved.harvestedTrees:[]);trees.forEach((t,i)=>t.harvested=harvestedTrees.has(i));
function save(){try{localStorage.setItem(STORE,JSON.stringify({...state,worldClock,flashlight:!!saved.flashlight,wrecks:wrecks.map(v=>v.done),harvestedTrees:[...harvestedTrees],barricades,foundCaches:[...foundCaches],discoveredLandmarks:[...discoveredLandmarks],visitedStores:[...visitedStores],storeLoot,lootedShelters:[...lootedShelters],supplyDrop}));return true;}catch(_){return false;}}
function resize(){dpr=Math.min(devicePixelRatio||1,1.7);w=innerWidth;h=innerHeight;canvas.width=Math.floor(w*dpr);canvas.height=Math.floor(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)}
function rect(x,y,a,b,c){ctx.fillStyle=c;ctx.fillRect(x,y,a,b)}

const surfaceTextures=(()=>{
 let seed=0x7a11ce;
 const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 function tile(base,colors,count,strokes=false){
  const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
  g.fillStyle=base;g.fillRect(0,0,128,128);
  for(let i=0;i<count;i++){
   const x=rand()*128,y=rand()*128,r=.5+rand()*3.5;
   g.globalAlpha=.12+rand()*.24;g.fillStyle=colors[Math.floor(rand()*colors.length)];
   if(strokes){g.lineWidth=.6+rand()*1.4;g.beginPath();g.moveTo(x,y);g.lineTo(x+(rand()-.5)*18,y+(rand()-.5)*8);g.strokeStyle=g.fillStyle;g.stroke();}
   else{g.beginPath();g.ellipse(x,y,r,r*(.4+rand()),rand()*3,0,Math.PI*2);g.fill();}
  }
  // Fine grain, tiny chips and hairline wear make repeated surfaces less flat.
  for(let i=0;i<count;i++){
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
  dirt:tile('#655c45',['#b39b68','#2f382c','#8b7954'],260,false)
 };
})();

function toast(t){let e=document.getElementById('toast');e.textContent=t;e.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove('show'),1800)}
function dayWind(){const cycle=(state.day*37)%100;wind=cycle<30?.12:cycle<65?.42:.78;windName=wind<.25?'тихий':wind<.6?'умеренный':'сильный';document.getElementById('weather').textContent='Ветер · '+windName;}
function ground(){
 rect(-w/2-700,-h/2-700,w+1400,h+1400,'#657452');
 ctx.save();ctx.globalAlpha=.68;ctx.fillStyle=surfaceTextures.grass;ctx.fillRect(-w/2-700,-h/2-700,w+1400,h+1400);ctx.restore();
 const left=Math.floor((state.x-w/2-700)/46)*46,top=Math.floor((state.y-h/2-700)/46)*46;
 for(let gy=top;gy<state.y+h/2+700;gy+=46)for(let gx=left;gx<state.x+w/2+700;gx+=46){
  const n=Math.abs(Math.sin(gx*12.989+gy*78.233)*43758.5453)%1;
  ctx.strokeStyle=n>.5?'#a2a47a88':'#293e2e88';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(gx+n*25,gy+12);ctx.lineTo(gx+n*25+2,gy+5+n*5);ctx.stroke();
 }
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
function tree(t){let sway=Math.sin(time*.0011* (1+wind)+t.phase)*wind*.13;ctx.save();ctx.translate(t.x,t.y);ctx.scale(t.size,t.size);ctx.fillStyle='#282c25';ctx.beginPath();ctx.ellipse(0,10,13,5,0,0,7);ctx.fill();rect(-5,-37,10,48,'#574936');ctx.translate(0,-30);ctx.rotate(sway);for(let j=0;j<3;j++){ctx.fillStyle=['#344b36','#405a3b','#536b43'][j];ctx.beginPath();ctx.moveTo(0,-42+j*8);ctx.lineTo(-27+j*5,7+j*7);ctx.quadraticCurveTo(0,15+j*4,27-j*5,7+j*7);ctx.closePath();ctx.fill();ctx.strokeStyle='#75845b66';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,-32+j*8);ctx.lineTo(0,8+j*7);ctx.stroke()}ctx.restore()}
function pole(x,y){rect(x-4,y-58,8,66,'#51483a');rect(x-24,y-57,48,5,'#655a48');ctx.strokeStyle='#252c28';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-24,y-55);ctx.quadraticCurveTo(x,y-24,x+24,y-55);ctx.stroke();ctx.fillStyle='#d1b989';ctx.fillRect(x-3,y-60,6,5)}
function car(x,y,scale=1,angle=0){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(scale,scale);ctx.fillStyle='#171c1b88';ctx.fillRect(-49,18,104,14);ctx.fillStyle='#171d1b';ctx.fillRect(-42,12,19,12);ctx.fillRect(24,12,19,12);ctx.fillStyle='#535b54';ctx.fillRect(-47,-7,94,27);ctx.save();ctx.globalAlpha=.3;ctx.fillStyle=surfaceTextures.metal;ctx.fillRect(-46,-6,92,25);ctx.restore();ctx.fillStyle='#343b38';ctx.fillRect(-27,-25,55,22);ctx.fillStyle='#7b8076';ctx.fillRect(-24,-22,19,16);ctx.fillStyle='#303833';ctx.fillRect(1,-22,20,16);ctx.fillStyle='#202522';ctx.fillRect(-34,13,18,11);ctx.fillRect(24,13,18,11);ctx.fillStyle='#98714f';ctx.fillRect(-51,-12,23,8);ctx.strokeStyle='#222a26';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-44,-7);ctx.lineTo(-23,-25);ctx.lineTo(-8,-7);ctx.stroke();ctx.fillStyle='#b5c1b5aa';ctx.fillRect(-11,-29,28,5);ctx.fillStyle='#a7a18a';ctx.fillRect(31,-8,14,4);ctx.fillStyle='#7b4937';ctx.globalAlpha=.8;ctx.fillRect(-39,5,13,3);ctx.fillRect(23,-3,16,2);ctx.globalAlpha=1;ctx.strokeStyle='#c1b18a66';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-18,-5);ctx.lineTo(-7,2);ctx.lineTo(8,-3);ctx.stroke();ctx.fillStyle='#c6b991';ctx.fillRect(-46,-4,6,4);ctx.fillRect(40,-4,6,4);ctx.fillStyle='#252a26';ctx.fillRect(-18,0,31,4);ctx.strokeStyle='#b5a47b88';ctx.lineWidth=1;ctx.strokeRect(-47,-7,94,27);ctx.strokeStyle='#252d2a';ctx.beginPath();ctx.moveTo(-20,-21);ctx.lineTo(-8,-10);ctx.lineTo(-2,-17);ctx.stroke();ctx.fillStyle='#594b37';ctx.fillRect(17,8,18,3);ctx.restore()}
function building(b){
 const wall=b.accent||'#706c5a',floorH=34,top=b.y-b.floors*floorH;
 ctx.fillStyle='#1c211c99';ctx.fillRect(b.x-18,b.y+b.h-8,b.w+36,22);
 // Deep side wall and front facade create visible height.
 rect(b.x+b.w-18,top+8,18,b.h+b.floors*floorH-8,'#343a34');
 rect(b.x,top,b.w,b.h+b.floors*floorH,wall);
 rect(b.x+8,top+8,b.w-16,b.h+b.floors*floorH-16,wall);ctx.save();ctx.globalAlpha=.42;ctx.fillStyle=surfaceTextures.plaster;ctx.fillRect(b.x+8,top+8,b.w-16,b.h+b.floors*floorH-16);ctx.globalAlpha=(b.id==='factory'||b.id==='warehouse')?.34:.16;ctx.fillStyle=(b.id==='factory'||b.id==='warehouse')?surfaceTextures.brick:surfaceTextures.concrete;ctx.fillRect(b.x+8,top+8,b.w-16,b.h+b.floors*floorH-16);ctx.restore();
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
 rect(b.x+b.w*.22,top-30,7,30,'#393f39');rect(b.x+b.w*.22-12,top-30,31,5,'#303934');
 ctx.strokeStyle='#b2a17a88';ctx.lineWidth=2;ctx.beginPath();
 ctx.moveTo(b.x,top);ctx.lineTo(b.x+b.w,top);ctx.lineTo(b.x+b.w,bottom);ctx.moveTo(b.x,bottom);ctx.lineTo(cx-47,bottom);ctx.moveTo(cx+47,bottom);ctx.lineTo(b.x+b.w,bottom);ctx.lineTo(b.x,top);ctx.stroke();
}
function drawBuildingInterior(b){
 const top=b.y-b.floors*34,cx=b.x+b.w/2,roomY=b.y+b.h-250;
 if(!b.role)return;
 ctx.save();
 ctx.fillStyle='#171b17';ctx.globalAlpha=.78;ctx.fillRect(b.x+18,roomY,b.w-36,150);ctx.globalAlpha=1;
 ctx.strokeStyle='#9a8d69';ctx.lineWidth=2;ctx.strokeRect(b.x+18,roomY,b.w-36,150);
 // Broken floor tiles, stains and scattered debris make the interior read as a physical room.
 for(let i=0;i<14;i++){const px=b.x+28+(i*47)%(b.w-58),py=roomY+12+(i*31)%122;ctx.fillStyle=i%3?'#77735d55':'#252b25aa';ctx.fillRect(px,py,18,3);if(i%4===0){ctx.strokeStyle='#292f29';ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+9,py+11);ctx.stroke();}}
 if(b.role==='store'){
  ctx.fillStyle='#393e34';for(let row=0;row<2;row++){const sy=roomY+24+row*58;ctx.fillRect(b.x+42,sy,b.w-84,15);ctx.fillStyle='#8a8062';for(let x=b.x+48;x<b.x+b.w-50;x+=32){ctx.fillRect(x,sy-7,18,7);ctx.fillStyle='#5c6750';ctx.fillRect(x,sy+2,18,9);ctx.fillStyle='#8a8062';}}
  ctx.fillStyle='#665d4b';ctx.fillRect(b.x+34,roomY+118,64,23);ctx.fillStyle='#a18a60';ctx.fillRect(b.x+38,roomY+121,56,5);
  // Abandoned shoppers and staff, lying among overturned stock and broken fixtures.
  for(const corpse of [[b.x+b.w*.27,roomY+91,-.3],[b.x+b.w*.72,roomY+108,.7]]){
   ctx.save();ctx.translate(corpse[0],corpse[1]);ctx.rotate(corpse[2]);ctx.fillStyle='#20201d';ctx.beginPath();ctx.ellipse(0,0,19,8,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#77715f';ctx.fillRect(-15,-5,23,10);ctx.fillStyle='#b49a79';ctx.beginPath();ctx.arc(12,0,6,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  ctx.fillStyle='#d8c18a';ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillText(b.kind==='weapons'?'ОРУЖИЕ':b.kind==='pharmacy'?'АПТЕКА':b.kind==='hardware'?'ХОЗТОВАРЫ':'МАРКЕТ',cx,roomY-8);
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
 if(p.type==='tent'){
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
 ctx.restore();
}
function streetLamp(x,y){ctx.fillStyle='#202821';ctx.fillRect(x-3,y-4,6,48);ctx.fillRect(x-3,y-4,22,4);ctx.fillStyle='#b9b69a';ctx.fillRect(x+15,y-7,10,7);if(worldClock>.62||worldClock<.08){const g=ctx.createRadialGradient(x+20,y-4,2,x+20,y-4,92);g.addColorStop(0,'#e5d59a30');g.addColorStop(1,'#e5d59a00');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x+20,y-4,92,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e9dba8';ctx.fillRect(x+17,y-6,6,4);}}
function drawDistrictDetails(){for(const y of [-8000,-4500,-1000,600,4100,7600,10000,13500,17000,20500])for(let x=WORLD_MIN+420;x<WORLD_MAX;x+=900){if(Math.abs(x-state.x)<w&&Math.abs(y-state.y)<h)streetLamp(x,y-92);}for(const x of [-8000,-4500,-1000,2700,6200,9700,10000,13500,17000,20500])for(let y=WORLD_MIN+420;y<WORLD_MAX;y+=900){if(Math.abs(x-state.x)<w&&Math.abs(y-state.y)<h)streetLamp(x+78,y);}}
function wreck(v){car(v.x,v.y,1.05,.06);if(!v.done){ctx.strokeStyle='#e6c783';ctx.lineWidth=2;ctx.beginPath();ctx.arc(v.x,v.y,21+Math.sin(time*.004)*3,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#e6c783';ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.fillText('ДЕТАЛИ',v.x,v.y-31)}}
function smoke(x,y){if(prefs.effects==='low')return;for(let i=0;i<5;i++){let yy=(time*.00015+i*.21)%1;ctx.globalAlpha=(1-yy)*.2;ctx.fillStyle='#c5c5b8';ctx.beginPath();ctx.arc(x+Math.sin(time*.0006+i)*11,y-yy*52,5+yy*11,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1}
function updateRadioSignal(now){
 if(!gameActive)return;
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
 if(s.kind==='cache'){ctx.fillStyle='#252d27';ctx.fillRect(s.x-23,s.y-16,46,32);ctx.fillStyle='#8b7954';ctx.fillRect(s.x-20,s.y-13,40,26);ctx.fillStyle='#c0a56d';ctx.fillRect(s.x-23,s.y-5,46,7);ctx.fillStyle='#303a31';ctx.fillRect(s.x-4,s.y-7,8,11);ctx.strokeStyle='#d6c18c';ctx.strokeRect(s.x-23,s.y-16,46,32);}
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
function drawSurvivor(x,y,palette,phase=0,moving=false,remote=false,name='',action=null){
 const skin=palette?.skin||'#e8b88c',hair=palette?.hair||'#352d3d',shirt=palette?.shirt||'#526fba',trim=palette?.trim||'#9cb9ff',eyes=palette?.eyes||'#26334c';
 const now=performance.now(),walk=moving?Math.sin(time*.014+phase):0;
 const progress=action?Math.max(0,Math.min(1,(now-action.started)/(action.until-action.started))):1;
 const pulse=action?Math.sin(progress*Math.PI):0;
 const attack=action?.type==='attack'?pulse:0,interact=action?.type==='interact'?pulse:0,heal=action?.type==='heal'?pulse:0,hurt=action?.type==='hurt'?pulse:0;
 const bob=moving?Math.abs(walk)*1.15:0,lean=attack*.16-interact*.08-hurt*.12;
 ctx.save();ctx.translate(x,y+bob);ctx.rotate(lean);ctx.scale(1.1,1.1);ctx.lineJoin='round';ctx.lineCap='round';
 ctx.fillStyle='#101810aa';ctx.beginPath();ctx.ellipse(0,19,14+attack*2,5,0,0,Math.PI*2);ctx.fill();
 const ls=moving?walk*4:0,rs=moving?-walk*4:0;
 ctx.strokeStyle='#303a3b';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-4,5);ctx.lineTo(-5+ls,16);ctx.moveTo(4,5);ctx.lineTo(5+rs,16);ctx.stroke();
 ctx.fillStyle='#20292b';ctx.fillRect(-10+ls,15,9,5);ctx.fillRect(1+rs,15,9,5);
 ctx.fillStyle='#4b4b35';ctx.fillRect(7,-12,8,18);ctx.fillStyle='#81794e';ctx.fillRect(9,-9,5,10);ctx.fillStyle='#262d25';ctx.fillRect(7,-13,8,2);
 ctx.save();ctx.translate(0,-attack*1.4+heal*1.2);
 ctx.fillStyle=shirt;ctx.beginPath();ctx.moveTo(-8,-11);ctx.lineTo(8,-11);ctx.lineTo(9,8);ctx.lineTo(-9,8);ctx.closePath();ctx.fill();
 ctx.fillStyle=trim;ctx.fillRect(-8,-11,16,4);ctx.fillRect(-2,-7,4,14);ctx.fillStyle='#29332d';ctx.fillRect(-8,6,16,3);ctx.fillStyle='#c4b17e';ctx.fillRect(-6,8,12,2);
 const la=-walk*.48+interact*.9+heal*1.1+hurt*.45,ra=walk*.48-attack*1.35+interact*.65+heal*.35-hurt*.45;
 for(const side of [-1,1]){const angle=side<0?la:ra;ctx.save();ctx.translate(side*8,-7);ctx.rotate(angle*side);
  ctx.strokeStyle=shirt;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(side*4,7);ctx.lineTo(side*(5+attack*5+interact*3),13);ctx.stroke();
  ctx.strokeStyle=skin;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(side*(5+attack*5+interact*3),12);ctx.lineTo(side*(6+attack*7+interact*4),18);ctx.stroke();
  ctx.fillStyle=skin;ctx.beginPath();ctx.arc(side*(6+attack*7+interact*4),18,2.2,0,Math.PI*2);ctx.fill();ctx.restore();}
 ctx.restore();
 ctx.save();ctx.translate(0,hurt*2);ctx.fillStyle=skin;ctx.fillRect(-3,-15,6,6);ctx.beginPath();ctx.arc(0,-23,9,0,Math.PI*2);ctx.fill();
 ctx.beginPath();ctx.arc(-9,-23,2.1,0,Math.PI*2);ctx.arc(9,-23,2.1,0,Math.PI*2);ctx.fill();
 ctx.fillStyle=hair;ctx.beginPath();ctx.moveTo(-9,-23);ctx.lineTo(-8,-31);ctx.lineTo(-3,-35);ctx.lineTo(5,-34);ctx.lineTo(10,-28);ctx.lineTo(9,-19);ctx.lineTo(6,-20);ctx.lineTo(6,-28);ctx.lineTo(-5,-28);ctx.lineTo(-6,-19);ctx.closePath();ctx.fill();
 ctx.fillStyle=eyes;ctx.fillRect(-5,-24,2.5,3);ctx.fillRect(2.5,-24,2.5,3);ctx.fillStyle=hair;ctx.fillRect(-6,-27,4,1.4);ctx.fillRect(2,-27,4,1.4);
 ctx.fillStyle='#9d705d';ctx.fillRect(-1,-20,2,2);ctx.fillStyle='#754b48';ctx.fillRect(-2,-17,4,1);ctx.strokeStyle='#18231d';ctx.lineWidth=1;ctx.strokeRect(-8,-11,16,19);ctx.restore();
 if(heal>0){ctx.save();ctx.globalAlpha=heal*.8;ctx.strokeStyle='#8ee6a1';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-39);ctx.lineTo(0,-48);ctx.moveTo(-4,-43);ctx.lineTo(4,-43);ctx.stroke();ctx.restore();}
 if(remote){ctx.fillStyle='#e7e9d8';ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.shadowColor='#10170f';ctx.shadowBlur=4;ctx.fillText(String(name||'Игрок').slice(0,16),0,-40);ctx.shadowBlur=0;ctx.strokeStyle='#e7d6a0aa';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,-23,12,0,Math.PI*2);ctx.stroke();}
 ctx.restore();
}
function drawRemotePlayers(){const coop=window.ApocalypseCoop;if(!coop)return;for(const p of coop.getPlayers()){if(!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;drawSurvivor(p.x,p.y,p.avatar,p.phase||0,!!p.moving,true,p.name);}}
function drawPlayer(){const moving=Math.hypot(moveX,moveY)>.08||['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].some(k=>keys.has(k));const action=playerAction.until>performance.now()?playerAction:null;drawSurvivor(w/2,h/2,colors,0,moving,false,'',action);}
function drawFlashlight(){
 if(!saved.flashlight||!(worldClock>.62||worldClock<.08)||prefs.effects==='low')return;
 ctx.save();ctx.globalCompositeOperation='screen';
 const x=w/2,y=h/2,r=Math.min(230,Math.max(145,w*.23));
 const glow=ctx.createRadialGradient(x,y,12,x,y,r);
 glow.addColorStop(0,'#ffe6ad38');glow.addColorStop(.38,'#f6d9951b');glow.addColorStop(1,'#f6d99500');
 ctx.fillStyle=glow;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.restore();
}
function advanceGameDay(){state.day=Math.max(1,Number(state.day)||1)+1;state.quest=0;state.dayReward=0;wrecks.forEach(v=>v.done=false);save();const coop=window.ApocalypseCoop;if(coop?.room?.status==='running'&&coop.isOwner())coop.send({kind:'world',...window.ApocalypseGame?.getWorldState?.()});toast('Наступил новый день · День '+state.day);}
function spawnZombie(x,y,kind='night'){if(zombies.length>=18)return;const stats={brute:[105,42,12],runner:[28,112,5],stalker:[48,88,8],night:[40,64,6],day:[40,64,6]};const v=stats[kind]||stats.night;zombies.push({id:++zombieId,x,y,kind,hp:v[0],speed:v[1],damage:v[2],attackAt:0,phase:Math.random()*6.28,born:performance.now(),emerge:1750});}
function updateZombies(dt,now){
 if(!gameActive)return;
 const coop=window.ApocalypseCoop;
 if(!coop?.room||coop.isOwner()){const previousClock=worldClock;worldClock=(worldClock+dt/480)%1;if(worldClock<previousClock)advanceGameDay();}
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
    const roll=Math.random();const kind=roll<.12?'brute':roll<.30?'runner':roll<.43&&night?'stalker':(night?'night':'day');
    spawnZombie(x,y,kind);
    if(coop?.room?.status==='running')coop.send({kind:'zombie-spawn',x,y,ztype:kind});
   }
  }
 }
 for(let i=zombies.length-1;i>=0;i--){
  const z=zombies[i],d=Math.hypot(state.x-z.x,state.y-z.y),active=z.kind==='day'||z.kind==='horde'||z.kind==='runner'||z.kind==='brute'||night;
  if(active&&d<620&&now-z.born>z.emerge){
   const dx=(state.x-z.x)/(d||1),dy=(state.y-z.y)/(d||1),nx=z.x+dx*z.speed*dt,ny=z.y+dy*z.speed*dt;
   if(!blocked(nx,z.y))z.x=nx;
   if(!blocked(z.x,ny))z.y=ny;
   if(d<26&&now>z.attackAt&&now>respawnUntil){z.attackAt=now+950;z.attackAnim=1;triggerPlayerAction('hurt',360);state.hp=Math.max(0,state.hp-Math.max(1,Math.round(z.damage*(state.armorLevel?0.68:1))));if(state.hp<=0)showDeath();}
  }
  if(d>900)zombies.splice(i,1);
 }
}
function drawZombies(){
 const now=performance.now();
 for(const z of zombies){
  const age=now-z.born,p=Math.max(0,Math.min(1,age/z.emerge)),rise=1-Math.pow(1-p,2),buried=1-rise;
  const active=z.kind==='day'||z.kind==='horde'||worldClock>.62||worldClock<.08;
  const moving=age>z.emerge,walk=moving?Math.sin(time*.0085+z.phase):Math.sin(age*.012+z.phase)*.25;
  const attack=Math.max(0,(z.attackAnim||0)-(now-(z.attackAnimAt||now))/230);
  if(z.attackAnim){z.attackAnimAt=now;z.attackAnim=Math.max(0,z.attackAnim-.075);}
  const brute=z.kind==='brute',runner=z.kind==='runner',stalker=z.kind==='stalker';
  const alpha=(active?1:.72)*Math.min(1,p*2.5);
  ctx.save();ctx.translate(z.x,z.y);
  // Strong contact shadow and a subtle ground rim keep the silhouette readable on grass, roads and debris.
  ctx.fillStyle='#090d0bdc';ctx.beginPath();ctx.ellipse(0,13,brute?19:14,5,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#c5b98a55';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(0,13,brute?20:15,5.8,0,0,Math.PI*2);ctx.stroke();
  if(p<1){
   for(let i=0;i<12;i++){const a=i*2.399+z.phase,dist=(1-p)*13+(i%4)*3,px=Math.cos(a)*dist,py=8+Math.sin(a)*dist*.5-(1-p)*15;
    ctx.fillStyle=i%2?'#554a32':'#a08a5c';ctx.globalAlpha=alpha*.8;ctx.beginPath();ctx.arc(px,py,1.4+(i%3)*.55,0,Math.PI*2);ctx.fill();}
  }
  ctx.globalAlpha=alpha;
  const bodyScale=brute?1.24:runner?.92:1;
  ctx.translate(0,-buried*18+Math.sin(time*.006+z.phase)*.8);
  ctx.scale(bodyScale,bodyScale);
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
  const shirt=brute?'#765044':runner?'#718653':stalker?'#655779':'#71805c';
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
  ctx.fillStyle=brute?'#a18a68':stalker?'#b2a887':'#aaa17d';ctx.beginPath();ctx.ellipse(0,-22,8.5,9.5,-.08,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#77745c';ctx.beginPath();ctx.ellipse(-6,-22,2.6,4,-.4,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#30271e';ctx.fillRect(-5,-24,4,4);ctx.fillRect(2,-24,4,4);
  const eye=stalker?'#d4a4ff':brute?'#ff765c':runner?'#f2e47a':active?'#f2c56b':'#b2a47a';
  ctx.shadowColor=eye;ctx.shadowBlur=active?9:3;ctx.fillStyle=eye;ctx.fillRect(-4,-23,2.8,2.8);ctx.fillRect(3,-23,2.8,2.8);ctx.shadowBlur=0;
  ctx.fillStyle='#29251e';ctx.fillRect(-2,-16,5,2);ctx.strokeStyle='#554333';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-3,-15);ctx.lineTo(1,-12);ctx.lineTo(5,-15);ctx.moveTo(4,-27);ctx.lineTo(7,-24);ctx.stroke();
  // Permanent light rim and animated infected veins make the body separate from the terrain.
  ctx.globalAlpha=alpha*.8;ctx.strokeStyle=stalker?'#c5a1e8':'#c2b38a';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-8,-9);ctx.lineTo(-10,-2);ctx.moveTo(8,-8);ctx.lineTo(10,0);ctx.stroke();
  for(let i=0;i<8;i++){const tx=Math.sin(i*17+z.id)*6,ty=-8+Math.cos(i*11+z.phase)*14;ctx.fillStyle=i%2?'#252d24':'#d0b78c';ctx.globalAlpha=alpha*.75;ctx.fillRect(tx,ty,1.5,1.5);}
  ctx.restore();ctx.restore();
 }
}

function showDeath(){if(deathHandled)return;deathHandled=true;gameActive=false;sprintHeld=false;keys.clear();moveX=moveY=0;save();document.getElementById('deathDay').textContent='Ты продержался до '+state.day+' дня';document.getElementById('deathOverlay').classList.remove('hidden');}
function respawn(){sprintHeld=false;state.hp=100;const safe=findSafeSpawn(state.x+150,state.y+110);state.x=safe.x;state.y=safe.y;deathHandled=false;respawnUntil=performance.now()+4000;document.getElementById('deathOverlay').classList.add('hidden');gameActive=true;save();toast('Ты вернулся. 4 секунды защиты.');}
let lastActionUiUpdate=-Infinity;
function updateActionButton(){if(time-lastActionUiUpdate<120)return;lastActionUiUpdate=time;const button=document.getElementById('action');if(!button)return;const touch=window.matchMedia('(max-width: 700px), (pointer: coarse)').matches;if(!touch){if(button.dataset.actionLabel!=='desktop'){button.classList.remove('context-hidden');button.innerHTML='<span class="ico">⚒</span>Действие';button.dataset.actionLabel='desktop';}return;}let label='';if(Math.hypot(state.x-survivorCamp.bench.x,state.y-survivorCamp.bench.y)<105)label='Улучшения';else if(Math.hypot(state.x-survivorCamp.trader.x,state.y-survivorCamp.trader.y)<105)label='Торговец';else if(radioSignal&&Math.hypot(state.x-radioSignal.x,state.y-radioSignal.y)<98)label='Радиосигнал';else if(Math.hypot(state.x-mark.x,state.y-mark.y)<75)label='Поговорить';else if(wrecks.some(v=>!v.done&&Math.hypot(state.x-v.x,state.y-v.y)<65))label='Обыскать';else if(nearbyTrees(state.x,state.y,55).some(t=>!t.harvested&&Math.hypot(state.x-t.x,state.y-t.y)<48))label='Собрать';if(button.dataset.actionLabel!==label){button.classList.toggle('context-hidden',!label);if(label)button.innerHTML='<span class="ico">⚒</span>'+label;button.dataset.actionLabel=label;}}
function updateHud(){const now=performance.now();if(now-lastHudUpdate<125)return;lastHudUpdate=now;document.getElementById('health').textContent='♥ '+state.hp+' / 100';const staminaFill=document.getElementById('staminaFill'),staminaLabel=document.getElementById('staminaLabel');if(staminaFill)staminaFill.style.width=(state.stamina/maxStamina()*100)+'%';if(staminaLabel)staminaLabel.textContent=Math.ceil(state.stamina)+' / '+maxStamina();const sprintButton=document.getElementById('sprintButton');if(sprintButton){sprintButton.classList.toggle('sprinting',sprintActive);sprintButton.disabled=state.stamina<1||sprintLocked;}document.getElementById('day').textContent='День '+state.day+' · '+(worldClock>.62||worldClock<.08?'Ночь':'День');const minutes=Math.floor(worldClock*1440),clock=document.getElementById('worldTime');if(clock)clock.textContent=String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');updateActionButton();}

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
 for(let i=0;i<22;i++){
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
 if(prefs.effects==='low')return;
 const phase=(Math.floor(time/52000)%4),storm=phase===2;
 if(storm){
  ctx.save();ctx.fillStyle='#17253518';ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='#b8c8d088';ctx.lineWidth=1;
  for(let i=0;i<38;i++){const x=(i*83+time*.42)%(w+40)-20,y=(i*47+time*.78)%(h+40)-20;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-5,y+13);ctx.stroke();}
  if(time<lightningUntil&&lightningUntil>0){ctx.fillStyle='#d9e4e755';ctx.fillRect(0,0,w,h);}
  ctx.restore();
 }else if(phase===1){
  ctx.save();const fog=ctx.createLinearGradient(0,0,0,h);fog.addColorStop(0,'#c5c9b00c');fog.addColorStop(.55,'#d4d2b51c');fog.addColorStop(1,'#c5c9b008');ctx.fillStyle=fog;ctx.fillRect(0,0,w,h);ctx.restore();
 }
}
function interactExpansion(){
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
function updateExpansion(now){
 if(!gameActive)return;
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
 ctx.save();ctx.translate(n.x,n.y);ctx.fillStyle='#121813aa';ctx.beginPath();ctx.ellipse(0,18,19,7,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#303b35';ctx.fillRect(-11,-2,22,26);ctx.fillStyle='#7d5941';ctx.fillRect(-10,20,8,12);ctx.fillRect(2,20,8,12);ctx.fillStyle='#9d6e4d';ctx.beginPath();ctx.arc(0,-12,10,0,Math.PI*2);ctx.fill();ctx.fillStyle='#392d27';ctx.beginPath();ctx.arc(0,-17,10,Math.PI,Math.PI*2);ctx.fill();ctx.fillStyle='#e8d9b4';ctx.fillRect(-3,-12,2,2);ctx.fillRect(3,-12,2,2);ctx.fillStyle='#a18a63';ctx.fillRect(11,2,8,15);ctx.fillStyle='#d9c18e';ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillText('ТОРГОВЕЦ ИЛЬЯ',0,-34);ctx.restore();ctx.restore();
}
function draw(){ctx.clearRect(0,0,w,h);ctx.save();ctx.translate(w/2-state.x,h/2-state.y);ground();drawDistrictDetails();drawInfectionZones();nearbyTrees(state.x,state.y,Math.max(w,h)+160).forEach(t=>{if(!t.harvested)tree(t)});buildings.forEach(b=>{if(Math.abs(b.x+b.w/2-state.x)<w+b.w&&Math.abs(b.y+b.h/2-state.y)<h+b.h)building(b)});buildings.forEach(b=>{if(Math.abs(b.x+b.w/2-state.x)<w+b.w&&Math.abs(b.y+b.h/2-state.y)<h+b.h)drawBuildingInterior(b)});worldProps.forEach(p=>{if(Math.abs(p.x-state.x)<w+180&&Math.abs(p.y-state.y)<h+180)drawWorldProp(p)});if(Math.abs(600-state.y)<h+100){const poleStart=Math.max(WORLD_MIN,Math.floor((state.x-w-100)/330)*330),poleEnd=Math.min(WORLD_MAX,state.x+w+100);for(let x=poleStart+180;x<poleEnd;x+=330)pole(x,600);}wrecks.forEach(v=>{if(Math.abs(v.x-state.x)<w+100&&Math.abs(v.y-state.y)<h+100)wreck(v)});smoke(800,255);smoke(300,235);drawZombies();buildings.forEach(b=>{if(b.x>state.x-w&&b.x<state.x+w&&b.y>state.y-h&&b.y<state.y+h){ctx.fillStyle='#242b27';ctx.fillRect(b.x-22,b.y+b.h+8,10,18);ctx.fillRect(b.x+b.w+12,b.y+b.h+8,10,18);}});drawBarricades();drawBuildPreview();drawExplorationSites();drawSupplyDrop();drawMark();drawRadioSignal();drawSurvivorHub();drawRemotePlayers();if(worldClock>.62||worldClock<.08){ctx.fillStyle='#07101c55';ctx.fillRect(-w,-h,w*3,h*3)}else{ctx.fillStyle='#d6cfa022';ctx.fillRect(-w,-h,w*3,h*3)}ctx.restore();drawPlayer();drawFlashlight();updateHud();drawPlayerMap();drawWind();drawWeatherEffects();drawWorldAnimation()}
function drawWind(){if(prefs.effects==='low'||wind<.3)return;ctx.save();ctx.globalAlpha=.13+wind*.12;ctx.strokeStyle='#e1e6ca';ctx.lineWidth=1;for(let i=0;i<8;i++){let x=(i*137+time*.07*(1+wind))%(w+80)-40,y=(i*83+Math.sin(time*.001+i)*25)%h;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+18,y-4,x+34+wind*20,y-1);ctx.stroke()}ctx.restore()}
function applyInfectionDamage(now){if(infectionZones.some(z=>Math.hypot(state.x-z.x,state.y-z.y)<z.r*.72)&&now-lastInfectionDamageAt>2200){lastInfectionDamageAt=now;state.hp=Math.max(0,state.hp-2);toast('Заражённый воздух: -2 здоровья');if(state.hp<=0)showDeath();save();}}
function maxStamina(){return 100+state.runUpgrade*15;}
function ammoCapacity(){return 120+state.ammoUpgrade*30;}
function payResources(cost){if(state.scrap<(cost.scrap||0)||state.wood<(cost.wood||0)||state.bolts<(cost.bolts||0)){toast('Не хватает ресурсов для обмена');return false;}state.scrap-=cost.scrap||0;state.wood-=cost.wood||0;state.bolts-=cost.bolts||0;return true;}
function purchaseUpgrade(kind){
 const field=kind==='run'?'runUpgrade':'ammoUpgrade',level=state[field];
 if(level>=3){toast('Улучшение уже максимального уровня');return false;}
 const costs=kind==='run'?[{scrap:8,wood:4,bolts:3},{scrap:14,wood:7,bolts:6},{scrap:22,wood:10,bolts:9}]:[{scrap:6,wood:0,bolts:2},{scrap:12,wood:0,bolts:5},{scrap:20,wood:0,bolts:8}];
 if(!payResources(costs[level]))return false;
 state[field]++;if(kind==='run')state.stamina=Math.min(state.stamina,maxStamina());else state.ammo=Math.min(state.ammo,ammoCapacity());
 save();toast(kind==='run'?'Усилитель бега улучшен до уровня '+state.runUpgrade:'Запас патронов увеличен до уровня '+state.ammoUpgrade);openUpgradeBench();return true;
}
function openUpgradeBench(){
 const runCosts=['8 металла · 4 дерева · 3 крепежа','14 металла · 7 дерева · 6 крепежа','22 металла · 10 дерева · 9 крепежа'];
 const ammoCosts=['6 металла · 2 крепежа','12 металла · 5 крепежа','20 металла · 8 крепежа'];
 showPanel('Лавка улучшений','Только два постоянных улучшения. Усилитель бега повышает скорость и запас выносливости. Вместимость патронов: '+ammoCapacity()+'. Ресурсы: '+state.scrap+' металла, '+state.wood+' дерева, '+state.bolts+' крепежа.',[
  {icon:'🏃',name:'Усилитель бега · '+(state.runUpgrade>=3?'МАКСИМУМ':'следующий уровень: '+(state.runUpgrade+1)+' · '+runCosts[state.runUpgrade]),count:'Ур. '+state.runUpgrade+'/3',use:()=>purchaseUpgrade('run')},
  {icon:'▣',name:'Запас патронов · '+(state.ammoUpgrade>=3?'МАКСИМУМ':'следующий уровень: '+(state.ammoUpgrade+1)+' · '+ammoCosts[state.ammoUpgrade]),count:state.ammo+'/'+ammoCapacity()+' патронов · ур. '+state.ammoUpgrade+'/3',use:()=>purchaseUpgrade('ammo')}
 ]);
}
function tradeSupplies(kind){
 const offers={
  bandage:{cost:{scrap:4,bolts:1},give:()=>state.bandage++,label:'Аптечка'},
  food:{cost:{scrap:3},give:()=>state.food+=2,label:'2 пайка'},
  ammo:{cost:{scrap:5,bolts:1},give:()=>{state.ammo+=Math.min(8,Math.max(0,ammoCapacity()-state.ammo));},label:'Патроны'},
  wood:{cost:{scrap:2},give:()=>state.wood+=3,label:'3 дерева'},
  bolts:{cost:{scrap:2},give:()=>state.bolts+=2,label:'2 крепежа'}
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
  {icon:'🔩',name:'2 крепежа · 2 металла',count:state.bolts+' шт.',use:()=>tradeSupplies('bolts')}
 ]);
}
function interact(){
 if(!gameActive)return;triggerPlayerAction('interact',460);
 if(Math.hypot(state.x-survivorCamp.bench.x,state.y-survivorCamp.bench.y)<105){openUpgradeBench();return;}
 if(Math.hypot(state.x-survivorCamp.trader.x,state.y-survivorCamp.trader.y)<105){openTrader();return;}
 const indoor=buildings.find(b=>b.role&&state.x>b.x+18&&state.x<b.x+b.w-18&&state.y>b.y-b.floors*34+18&&state.y<b.y+b.h-18);
 if(indoor?.role==='store'){
  const loot=storeLoot[indoor.id];
  if(loot?.weapon&&!loot.picked&&Math.hypot(state.x-(indoor.x+indoor.w/2-72),state.y-(indoor.y+indoor.h-185+76))<72){
   state.firearm=loot.weapon;state.ammo=Math.min(ammoCapacity(),state.ammo+loot.ammo);loot.picked=true;save();toast('Найдено оружие: '+(loot.weapon==='shotgun'?'дробовик':loot.weapon==='rifle'?'винтовка':'пистолет')+' · патроны +'+loot.ammo);inventory();return;
  }
 }
 const shelter=buildings.find(b=>b.role==='shelter'&&state.x>b.x+18&&state.x<b.x+b.w-18&&state.y>b.y-b.floors*34+18&&state.y<b.y+b.h-18);
 if(shelter&&!lootedShelters.has(shelter.id)&&Math.hypot(state.x-(shelter.x+shelter.w/2+72),state.y-(shelter.y+shelter.h-168))<82){
  lootedShelters.add(shelter.id);state.food+=3;state.bandage+=1;state.wood+=2;state.survivorTrust+=1;save();toast('Запасы убежища: +3 еды, аптечка, +2 дерева');return;
 }
 if(interactExpansion())return;if(radioSignal&&Math.hypot(state.x-radioSignal.x,state.y-radioSignal.y)<98){completeRadioSignal();return}if(Math.hypot(state.x-mark.x,state.y-mark.y)<75){openMark();return}let index=wrecks.findIndex(v=>!v.done&&Math.hypot(state.x-v.x,state.y-v.y)<65);if(index>=0){const coop=window.ApocalypseCoop;wrecks[index].done=true;state.quest++;state.scrap++;state.bolts++;toast('Детали найдены · '+state.quest+'/3');save();if(coop?.room?.status==='running')coop.send({kind:'wreck-claimed',index,quest:state.quest,by:coop.userId});return}const treeIndex=trees.findIndex((t,i)=>!t.harvested&&Math.hypot(state.x-t.x,state.y-t.y)<48);if(treeIndex>=0){trees[treeIndex].harvested=true;harvestedTrees.add(treeIndex);state.wood+=2;toast('Собрано древесины: +2');save();const coop=window.ApocalypseCoop;if(coop?.room?.status==='running')coop.send({kind:'tree-harvested',index:treeIndex});return}toast(indoor?'Осмотри помещение: E у полок и ящиков':'Подойди ближе к дереву, машине, зданию или радиомаяку')}
function drawOneBarricade(b,ghost=false,valid=true){ctx.save();ctx.translate(b.x,b.y);ctx.rotate(Number(b.angle)||0);ctx.globalAlpha=ghost?.58:1;ctx.fillStyle=ghost?(valid?'#4de18a55':'#ff554e66'):'#171d18aa';ctx.fillRect(-34,13,68,9);for(let i=0;i<4;i++){ctx.fillStyle=ghost?(valid?'#7fffb0':'#ff8980'):(i%2?'#806c4d':'#9a8056');ctx.fillRect(-32,-13+i*7,64,5);ctx.strokeStyle=ghost?(valid?'#c8ffe0':'#ffd0c9'):'#3a3327';ctx.lineWidth=1;ctx.strokeRect(-32,-13+i*7,64,5);}ctx.fillStyle=ghost?(valid?'#45d986':'#d94e49'):'#4c4939';ctx.fillRect(-27,-21,6,42);ctx.fillRect(21,-21,6,42);if(ghost){ctx.globalAlpha=.22;ctx.fillStyle=valid?'#3cff91':'#ff4038';ctx.beginPath();ctx.arc(0,0,48,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.strokeStyle=valid?'#72ffad':'#ff716a';ctx.lineWidth=3;ctx.strokeRect(-36,-25,72,50);}ctx.restore();}
function drawBarricades(){for(const b of barricades)drawOneBarricade(b,false,true);}
function drawBuildPreview(){if(!buildMode)return;const p=buildCandidate(),valid=canPlaceBarricade(p);drawOneBarricade(p,true,valid);const status=document.getElementById('buildStatus');if(status)status.textContent=valid?'МЕСТО СВОБОДНО':'МЕСТО ЗАНЯТО';}
function drawInfectionZones(){for(const z of infectionZones){const pulse=1+Math.sin(time*.0017+z.x)*.035;ctx.save();ctx.globalAlpha=.17;const g=ctx.createRadialGradient(z.x,z.y,8,z.x,z.y,z.r*pulse);g.addColorStop(0,'#7da34a88');g.addColorStop(.65,'#587c3b44');g.addColorStop(1,'#334b3000');ctx.fillStyle=g;ctx.beginPath();ctx.arc(z.x,z.y,z.r*pulse,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.55;ctx.strokeStyle='#a3c16a';ctx.setLineDash([7,10]);ctx.beginPath();ctx.arc(z.x,z.y,z.r*.72,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.restore();}}
function attack(){const now=performance.now();if(!gameActive||now-lastAttackAt<650)return;lastAttackAt=now;let target=null,best=state.firearm&&state.ammo>0?330:78;for(const z of zombies){const d=Math.hypot(state.x-z.x,state.y-z.y);if(d<best){best=d;target=z;}}if(!target){toast('Рядом нет заражённых');return;}const ranged=!!state.firearm&&state.ammo>0;const range=ranged?330:78;if(best>range){toast(ranged?'Цель слишком далеко':'Рядом нет заражённых');return;}const damage=ranged?(state.firearm==='shotgun'?78:state.firearm==='rifle'?68:48):(state.weaponLevel>=2?46:state.weaponLevel?34:13);triggerPlayerAction('attack',ranged?320:430);if(ranged)state.ammo--;target.hp-=damage;if(target.hp<=0){const i=zombies.indexOf(target);if(i>=0)zombies.splice(i,1);state.scrap+=target.kind==='brute'?3:target.kind==='stalker'?2:1;if(Math.random()<.45)state.food++;if(Math.random()<.25)state.bandage++;const coop=window.ApocalypseCoop;if(coop?.room?.status==='running')coop.send({kind:'zombie-killed',x:target.x,y:target.y});toast('Заражённый уничтожен · добыча собрана');}else{const coop=window.ApocalypseCoop;if(coop?.room?.status==='running')coop.send({kind:'zombie-hit',x:target.x,y:target.y,damage});toast('Попадание · '+damage+' урона');}save();}
function craft(cost,action){if(state.scrap<cost.scrap||state.wood<cost.wood||state.bolts<cost.bolts){toast('Не хватает ресурсов для изготовления');return false;}state.scrap-=cost.scrap;state.wood-=cost.wood;state.bolts-=cost.bolts;action();save();return true;}
function openWorkshop(){showPanel('Мастерская','Собирай древесину с деревьев и детали с машин. Здесь можно изготовить снаряжение и укрепить позицию.',[
 {icon:'🩹',name:'Аптечка · 2 металла + 1 дерево',count:state.bandage,use:()=>{if(craft({scrap:2,wood:1,bolts:0},()=>state.bandage++)){toast('Аптечка изготовлена');openWorkshop();}}},
 {icon:'🗡️',name:'Самодельное копьё · 5 металла + 3 дерева + 2 крепежа',count:state.weaponLevel?'ур. '+state.weaponLevel:'создать',use:()=>{if(state.weaponLevel){toast('Копьё уже изготовлено');return;}if(craft({scrap:5,wood:3,bolts:2},()=>state.weaponLevel=1)){toast('Копьё готово: атака стала сильнее');openWorkshop();}}},
 {icon:'🛡️',name:'Усиленная броня · 6 металла + 4 дерева + 4 крепежа',count:state.armorLevel?'надета':'создать',use:()=>{if(state.armorLevel){toast('Броня уже изготовлена');return;}if(craft({scrap:6,wood:4,bolts:4},()=>state.armorLevel=1)){toast('Броня готова: входящий урон снижен на 32%');openWorkshop();}}},
 {icon:'⚔️',name:'Усилить копьё · 8 металла + 5 дерева + 4 крепежа',count:state.weaponLevel>=2?'максимум':state.weaponLevel?'улучшить':'сначала копьё',use:()=>{if(state.weaponLevel!==1){toast('Сначала изготовь копьё');return;}if(craft({scrap:8,wood:5,bolts:4},()=>state.weaponLevel=2)){toast('Копьё усилено: урон 46');openWorkshop();}}},
 {icon:'🔦',name:'Фонарик · 2 металла + 1 крепёж',count:saved.flashlight?'готово':'создать',use:()=>{if(saved.flashlight){toast('Фонарик уже есть');return;}if(craft({scrap:2,wood:0,bolts:1},()=>saved.flashlight=true)){toast('Фонарик изготовлен');openWorkshop();}}},
 {icon:'🪵',name:'Баррикада · 2 металла + 3 дерева',count:barricades.length+'/24 · выбрать место',use:()=>{if(barricades.length>=24){toast('Лимит укреплений достигнут');return;}if(state.scrap<2||state.wood<3){toast('Нужно 2 металла и 3 дерева');return;}buildAngle=0;setBuildMode(true);}},
 {icon:'🥫',name:'Пайок · 1 металл + 1 дерево',count:state.food,use:()=>{if(craft({scrap:1,wood:1,bolts:0},()=>state.food++)){toast('Пайок изготовлен');openWorkshop();}}}
]);}
function showPanel(title,body,items){document.getElementById('panelTitle').textContent=String(title||'Хранилище').toUpperCase();document.getElementById('panelText').textContent=body;let box=document.getElementById('items');box.innerHTML='';items.forEach(item=>{let slot=document.createElement('div');slot.className='slot filled';let art=document.createElement('div');art.className='art';art.textContent=item.icon;let name=document.createElement('b');name.textContent=item.name;let count=document.createElement('small');count.textContent=typeof item.count==='string'?item.count:'×'+item.count;slot.append(art,name,count);if(item.use){slot.addEventListener('click',item.use)}box.append(slot)});document.getElementById('invHealth').textContent=state.hp;document.getElementById('invDay').textContent=state.day;document.getElementById('invSpeed').textContent=(wind>=.65?'82%':wind>=.3?'94%':'100%');document.getElementById('weight').textContent=(state.scrap*1.2+state.bandage*.2+state.food*.4).toFixed(1)+' / 40 кг';document.getElementById('panel').classList.remove('hidden')}
function openMark(){if(state.quest>=3&&state.dayReward!==state.day){state.scrap=Math.max(0,state.scrap-3);state.bandage+=2;state.food++;state.dayReward=state.day;state.quest=0;wrecks.forEach(v=>{if(Math.random()<.6)v.done=false});save();showPanel('Марк · награда','Ты выполнил поручение. Забирай припасы — они пригодятся в дороге.',inventoryItems());return}let msg=state.dayReward===state.day?'Сегодня ты уже помог поселению. Отдохни, завтра будет новое поручение.':'Я Марк. Собери 3 детали с разбитых машин и возвращайся ко мне. За работу дам аптечки и еду. Сейчас собрано: '+state.quest+'/3.';showPanel('Марк · выживший',msg,[{icon:'⚙️',name:'Детали для задания',count:state.quest+'/3'},{icon:'🩹',name:'Награда: аптечки',count:'×2'},{icon:'🥫',name:'Награда: консервы',count:'×1'}])}
function inventoryItems(){return [{icon:'⚙️',name:'Металлолом',count:state.scrap},{icon:'🔫',name:'Огнестрельное оружие',count:state.firearm||'нет'},{icon:'▣',name:'Патроны',count:state.ammo},{icon:'🪵',name:'Древесина',count:state.wood},{icon:'🔩',name:'Крепёж',count:state.bolts},{icon:'🗡️',name:'Самодельное копьё',count:state.weaponLevel?'ур. '+state.weaponLevel:0},{icon:'🛡️',name:'Усиленная броня',count:state.armorLevel?'надета':'нет'}, {icon:'🩹',name:'Аптечка',count:state.bandage,use:()=>{if(state.bandage<1){toast('Нет аптечек');return}if(state.hp>=100){toast('Здоровье уже полное');return}state.bandage--;state.hp=Math.min(100,state.hp+45);triggerPlayerAction('heal',760);save();updateHud();inventory()}},{icon:'🥫',name:'Консервы',count:state.food,use:()=>{if(state.food<1){toast('Нет еды');return}state.food--;state.hp=Math.min(100,state.hp+15);triggerPlayerAction('heal',620);save();updateHud();inventory()}},{icon:'🔦',name:'Фонарик',count:saved.flashlight?1:0},{icon:'📡',name:'Найдено сигналов',count:state.radioFinds},{icon:'🤝',name:'Доверие выживших',count:state.survivorTrust}]}
function inventory(){showPanel('Рюкзак','Снаряжение и найденные припасы. Задание Марка также отображается здесь.',inventoryItems())}
function nearSegment(px,py,x1,y1,x2,y2,limit){
 const dx=x2-x1,dy=y2-y1,len=dx*dx+dy*dy;
 const t=len?Math.max(0,Math.min(1,((px-x1)*dx+(py-y1)*dy)/len)):0;
 const ox=px-(x1+t*dx),oy=py-(y1+t*dy);
 return ox*ox+oy*oy<limit*limit;
}
function blocked(x,y){
 const r=12,wall=r+7;
 if(x<WORLD_MIN+25+r||y<WORLD_MIN+25+r||x>WORLD_MAX-25-r||y>WORLD_MAX-25-r)return true;
 for(const b of buildings){
  const left=b.x,right=b.x+b.w,top=b.y-b.floors*34,bottom=b.y+b.h,cx=(left+right)/2,doorHalf=47;
  // The shell is solid, except for the centered entrance.
  if(nearSegment(x,y,left,top,right,top,wall)||nearSegment(x,y,left,top,left,bottom,wall)||nearSegment(x,y,right,top,right,bottom,wall))return true;
  if(nearSegment(x,y,left,bottom,cx-doorHalf,bottom,wall)||nearSegment(x,y,cx+doorHalf,bottom,right,bottom,wall))return true;
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
function insideBuilding(x,y){return buildings.some(b=>x>b.x-20&&x<b.x+b.w+20&&y>b.y-b.floors*34-20&&y<b.y+b.h+20);}
function spawnUnsafe(x,y){return insideBuilding(x,y)||blocked(x,y);}
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
let prev=performance.now(),lastAutoSave=0;function loop(now){updateExpansion(now);let dt=Math.min(.04,(now-prev)/1000);prev=now;time=now;if(gameActive){const moving=Math.hypot(moveX,moveY)>.08||['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].some(k=>keys.has(k));if(state.stamina<=0)sprintLocked=true;if(sprintLocked&&!sprintHeld&&state.stamina>=25)sprintLocked=false;sprintActive=!!(sprintHeld&&moving&&state.stamina>0&&!sprintLocked);if(sprintActive)state.stamina=Math.max(0,state.stamina-34*dt);else state.stamina=Math.min(maxStamina(),state.stamina+(moving?17:27)*dt);move(sprintActive?dt*(1.5+state.runUpgrade*.12):dt);updateZombies(dt,now);updateRadioSignal(now);if(now-lastAutoSave>=5000){lastAutoSave=now;save();}}const coop=window.ApocalypseCoop;if(gameActive&&coop?.room?.status==='running'&&now-lastNet>250){lastNet=now;coop.sendPosition?.({kind:'position',x:state.x,y:state.y,hp:state.hp,day:state.day,name:playerName,worldClock,avatar:{skin:colors.skin,hair:colors.hair,shirt:colors.shirt,trim:colors.trim,eyes:colors.eyes},moving:Math.hypot(moveX,moveY)>.08||['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].some(k=>keys.has(k)),phase:state.x*.013+state.y*.009});}draw();requestAnimationFrame(loop)}
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
function enterSolo(){gameActive=false;keys.clear();moveX=moveY=0;document.body.classList.remove('menu-open');document.getElementById('mainMenu').classList.add('menu-out');document.getElementById('dialogue').classList.remove('hidden');focusGame();}
function applySettings(){document.getElementById('joy').style.transform='scale('+(Number(prefs.joy||100)/100)+')';document.body.classList.toggle('reduced-motion',!prefs.motion);document.body.classList.toggle('hide-hints',!prefs.hints);document.getElementById('settingEffects').value=prefs.effects;document.getElementById('settingJoy').value=prefs.joy;document.getElementById('settingMotion').checked=!!prefs.motion;document.getElementById('settingHints').checked=!!prefs.hints;}
function drawPlayerMap(){
 const overlay=document.getElementById('playerMapOverlay');if(!overlay||overlay.classList.contains('hidden'))return;
 const map=document.getElementById('playerMap'),m=map?.getContext('2d');if(!m)return;
 const mw=map.width||720,mh=map.height||720,range=2600,scale=Math.min(mw,mh)/(range*2);
 m.clearRect(0,0,mw,mh);m.fillStyle='#111a16';m.fillRect(0,0,mw,mh);m.strokeStyle='#82917a33';m.lineWidth=1;
 for(let x=0;x<=mw;x+=mw/8){m.beginPath();m.moveTo(x,0);m.lineTo(x,mh);m.stroke();}
 for(let y=0;y<=mh;y+=mh/8){m.beginPath();m.moveTo(0,y);m.lineTo(mw,y);m.stroke();}
 const px=x=>mw/2+(x-state.x)*scale,py=y=>mh/2+(y-state.y)*scale,camp=survivorCamp;
 const roads=[-8000,-4500,-1000,600,4100,7600,10000,13500,17000,20500];
 m.fillStyle='#35443a';
 for(const y of roads){const yy=py(y);if(yy>-12&&yy<mh+12)m.fillRect(0,yy-4,mw,8);}
 for(const x of roads){const xx=px(x);if(xx>-12&&xx<mw+12)m.fillRect(xx-4,0,8,mh);}
 m.fillStyle='#566456';m.strokeStyle='#91a08777';m.lineWidth=1;
 for(const b of buildings){const bx=px(b.x),by=py(b.y-b.floors*34),bw=b.w*scale,bh=(b.floors*34+b.h)*scale;if(bx+bw<0||by+bh<0||bx>mw||by>mh)continue;m.fillRect(bx,by,bw,bh);m.strokeRect(bx,by,bw,bh);}

 for(const item of [{x:camp.bench.x,y:camp.bench.y,label:'Лавка'},{x:camp.trader.x,y:camp.trader.y,label:'Торговец'}]){const x=px(item.x),y=py(item.y);if(x<0||x>mw||y<0||y>mh)continue;m.fillStyle='#e5bd70';m.beginPath();m.arc(x,y,8,0,Math.PI*2);m.fill();m.fillStyle='#f1dfb6';m.font='12px system-ui';m.textAlign='center';m.fillText(item.label,x,y-13);}
 const others=window.ApocalypseCoop?.getPlayers?.()||[];
 for(const p of others){if(!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;const x=px(p.x),y=py(p.y);if(x<0||x>mw||y<0||y>mh)continue;m.fillStyle='#f4f5f2';m.strokeStyle='#17211b';m.lineWidth=3;m.beginPath();m.arc(x,y,8,0,Math.PI*2);m.fill();m.stroke();m.fillStyle='#ffffff';m.font='12px system-ui';m.fillText(String(p.name||'Игрок').slice(0,14),x,y-13);}
 m.fillStyle='#39a7ff';m.strokeStyle='#d9f0ff';m.lineWidth=4;m.beginPath();m.arc(mw/2,mh/2,11,0,Math.PI*2);m.fill();m.stroke();m.fillStyle='#d9f0ff';m.font='bold 13px system-ui';m.fillText('ТЫ',mw/2,mh/2+30);
}
function openPlayerMap(){mapResumeGame=gameActive;gameActive=false;keys.clear();sprintHeld=false;moveX=moveY=0;joyPointer=null;const stick=document.getElementById('stick');if(stick)stick.style.transform='translate(0,0)';document.getElementById('playerMapOverlay').classList.remove('hidden');drawPlayerMap();}
function closePlayerMap(){document.getElementById('playerMapOverlay').classList.add('hidden');const resume=mapResumeGame;mapResumeGame=false;if(resume){gameActive=true;focusGame();}}
function openSettings(resumeGame=gameActive){settingsResumeGame=!!resumeGame;gameActive=false;applySettings();document.getElementById('settingsOverlay').classList.remove('hidden');}
function closeSettings(){document.getElementById('settingsOverlay').classList.add('hidden');const resume=settingsResumeGame;settingsResumeGame=false;if(resume){gameActive=true;focusGame();}}
document.getElementById('menuPlay').onclick=enterSolo;
document.getElementById('menuJournal').onclick=()=>openUpdateJournal(false);
document.getElementById('journalX').onclick=closeUpdateJournal;
document.getElementById('journalOk').onclick=closeUpdateJournal;
document.getElementById('menuSettings').onclick=()=>openSettings(false);
document.getElementById('menuExit').onclick=exitGame;
document.getElementById('deathRespawn').onclick=respawn;
document.getElementById('deathMenu').onclick=leaveToMenu;
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.close==='settingsOverlay'){closeSettings();return;}const target=document.getElementById(b.dataset.close);if(target)target.classList.add('hidden')}));
document.getElementById('settingsSave').onclick=()=>{prefs.effects=document.getElementById('settingEffects').value;prefs.joy=Number(document.getElementById('settingJoy').value);prefs.motion=document.getElementById('settingMotion').checked;prefs.hints=document.getElementById('settingHints').checked;let persisted=true;try{localStorage.setItem('skyrealm_apocalypse_settings_v1',JSON.stringify(prefs))}catch(_){persisted=false}closeSettings();toast(persisted?'Настройки сохранены':'Настройки применены, но браузер не смог их сохранить')};
document.getElementById('settingsReset').onclick=()=>{if(confirm('Удалить сохранение Apocalypse на этом устройстве? Это нельзя отменить.')){try{localStorage.removeItem(STORE);location.reload()}catch(_){toast('Не удалось удалить сохранение: хранилище недоступно')}}};
document.getElementById('mapButton').onclick=openPlayerMap;
document.getElementById('mapClose').onclick=closePlayerMap;
document.getElementById('pauseMenu').onclick=()=>{if(window.matchMedia('(max-width: 700px), (pointer: coarse)').matches)openMobileQuickMenu();else leaveToMenu();};
document.getElementById('mobileMoreClose').onclick=closeMobileQuickMenu;
document.getElementById('mobileMoreBackdrop').onclick=closeMobileQuickMenu;
document.getElementById('mobileMoreInventory').onclick=()=>{closeMobileQuickMenu();inventory()};
document.getElementById('mobileMoreWorkshop').onclick=()=>{closeMobileQuickMenu();openWorkshop()};
document.getElementById('mobileMoreSettings').onclick=()=>{const resume=mobileQuickMenuResume;closeMobileQuickMenu(false);openSettings(resume)};
document.getElementById('mobileMoreMenu').onclick=()=>{closeMobileQuickMenu(false);leaveToMenu()};
document.getElementById('start').onclick=()=>{document.getElementById('dialogue').classList.add('hidden');ensureSafeSpawn(true);gameActive=true;focusGame();showJournalOnWorldEntry(true);};
window.addEventListener('apocalypse-coop-enter',()=>{ensureSafeSpawn(true);gameActive=true;document.body.classList.remove('menu-open');document.getElementById('mainMenu').classList.add('menu-out');document.getElementById('dialogue').classList.add('hidden');document.getElementById('coopOverlay').classList.add('hidden');focusGame();showJournalOnWorldEntry(true);});
window.addEventListener('apocalypse-coop-version-mismatch',()=>{if(gameActive){leaveToMenu();toast('Кооператив остановлен: версии игры различаются.');}});
window.addEventListener('apocalypse-coop-event',e=>{const p=e.detail,coop=window.ApocalypseCoop;if(!p||!coop||!coop.room)return;if(p.kind==='zombie-spawn'&&!coop.isOwner()&&Number.isFinite(p.x)&&Number.isFinite(p.y))spawnZombie(p.x,p.y,p.ztype||'night');if(p.kind==='zombie-hit'){const z=zombies.reduce((best,v)=>Math.hypot(v.x-p.x,v.y-p.y)<(best?Math.hypot(best.x-p.x,best.y-p.y):110)?v:best,null);if(z)z.hp-=Math.max(0,Number(p.damage)||0);}if(p.kind==='zombie-killed'){const i=zombies.findIndex(v=>Math.hypot(v.x-p.x,v.y-p.y)<110);if(i>=0)zombies.splice(i,1);}if(p.kind==='tree-harvested'){const i=Number(p.index);if(Number.isInteger(i)&&trees[i]){trees[i].harvested=true;harvestedTrees.add(i);save();}}if(p.kind==='barricade-built'&&p.barricade&&Number.isFinite(p.barricade.x)&&Number.isFinite(p.barricade.y)){if(!barricades.some(b=>Math.hypot(b.x-p.barricade.x,b.y-p.barricade.y)<8)){barricades.push({x:p.barricade.x,y:p.barricade.y,angle:Number.isFinite(p.barricade.angle)?p.barricade.angle:0});save();}}if(Number.isFinite(p.worldClock))worldClock=p.worldClock;if(Number.isFinite(p.day))state.day=Math.max(1,p.day);if(p.kind==='world'&&!coop.isOwner()&&Array.isArray(p.wrecks)){p.wrecks.forEach((done,i)=>{if(wrecks[i])wrecks[i].done=!!done});state.quest=Math.max(0,Number(p.quest)||0);state.day=Math.max(1,Number(p.day)||1);if(Array.isArray(p.barricades)){barricades.splice(0,barricades.length,...p.barricades.filter(v=>Number.isFinite(v.x)&&Number.isFinite(v.y)).slice(0,24));}if(Array.isArray(p.harvestedTrees)){harvestedTrees.clear();p.harvestedTrees.forEach(i=>{if(Number.isInteger(i)&&trees[i]){trees[i].harvested=true;harvestedTrees.add(i);}});}save();}if(p.kind==='wreck-request'&&coop.isOwner()){const remote=coop.getPlayers().find(v=>v.user_id===p.user_id),v=wrecks[Number(p.index)];if(remote&&v&&!v.done&&Math.hypot(remote.x-v.x,remote.y-v.y)<100){v.done=true;state.quest++;save();coop.send({kind:'wreck-claimed',index:Number(p.index),quest:state.quest,by:p.user_id});}}if(p.kind==='wreck-claimed'){const i=Number(p.index);if(wrecks[i])wrecks[i].done=true;state.quest=Math.max(0,Number(p.quest)||0);if(p.by===coop.userId)state.scrap++;save();toast('Общие детали: '+state.quest+'/3');}if(p.kind==='world-request'&&coop.isOwner())coop.send({kind:'world',...window.ApocalypseGame.getWorldState()});});
applySettings();
document.getElementById('action').onclick=interact;document.getElementById('rotateBuild').onclick=rotateBuild;document.getElementById('placeBuild').onclick=placeBarricade;document.getElementById('cancelBuild').onclick=()=>setBuildMode(false);document.getElementById('inventory').onclick=inventory;document.getElementById('craft').onclick=openWorkshop;document.getElementById('attackTouch').onclick=attack;document.getElementById('panelClose').onclick=()=>document.getElementById('panel').classList.add('hidden');
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
 if(e.code==='F11'||e.key==='F11'){e.preventDefault();e.stopPropagation();toggleApocalypseFullscreen();return;}
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
 if(buildMode){if(k==='r'){e.preventDefault();rotateBuild();return;}if(k==='Enter'){e.preventDefault();placeBarricade();return;}if(k==='Escape'){e.preventDefault();setBuildMode(false);return;}}
 if(k==='m')openPlayerMap();
 if(k==='e')interact();
 if(k==='i')inventory();
 if(k==='f'||k===' ')attack();
 if(k==='Escape'&&gameActive){if(!document.getElementById('playerMapOverlay').classList.contains('hidden'))closePlayerMap();else if(!document.getElementById('mobileQuickMenu').classList.contains('hidden'))closeMobileQuickMenu();else if(!document.getElementById('panel').classList.contains('hidden'))document.getElementById('panel').classList.add('hidden');else leaveToMenu();}
},true);
window.addEventListener('keyup',e=>{if(e.code==='ShiftLeft'||e.code==='ShiftRight')sprintHeld=false;keys.delete(keyFromEvent(e));},true);
window.addEventListener('blur',()=>{keys.clear();sprintHeld=false;});
window.addEventListener('focus',()=>{if(gameActive)focusGame();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&gameActive)focusGame();});
canvas.tabIndex=0;canvas.addEventListener('pointerdown',focusGame);
window.addEventListener('contextmenu',e=>e.preventDefault());window.addEventListener('selectstart',e=>e.preventDefault());window.addEventListener('resize',resize);
const sprintButton=document.getElementById('sprintButton');sprintButton.addEventListener('pointerdown',e=>{if(!gameActive||state.stamina<=0||sprintLocked)return;e.preventDefault();sprintHeld=true;try{sprintButton.setPointerCapture(e.pointerId)}catch(_){}});['pointerup','pointercancel','lostpointercapture'].forEach(type=>sprintButton.addEventListener(type,()=>{sprintHeld=false;}));sprintButton.addEventListener('contextmenu',e=>e.preventDefault());
window.ApocalypseGame=Object.freeze({getWrecks:()=>wrecks.map(v=>v.done),getQuest:()=>state.quest,getDay:()=>state.day,getDayReward:()=>state.dayReward,getClock:()=>worldClock,getMovementStats:()=>({stamina:state.stamina,maxStamina:maxStamina(),runUpgrade:state.runUpgrade,sprinting:sprintActive}),getUpgradeStats:()=>({run:state.runUpgrade,ammo:state.ammoUpgrade,ammoCapacity:ammoCapacity(),ammo:state.ammo}),getWorldState:()=>({wrecks:wrecks.map(v=>v.done),quest:state.quest,day:state.day,worldClock,barricades:barricades.map(b=>({...b})),harvestedTrees:[...harvestedTrees]}),save});setupJoystick();daily();resize();ensureSafeSpawn();save();requestAnimationFrame(loop);
})();