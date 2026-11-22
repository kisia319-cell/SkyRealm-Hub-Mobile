(()=>{'use strict';
const canvas=document.getElementById('world'),ctx=canvas.getContext('2d'),STORE='skyrealm_apocalypse_mobile_v1';
const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'{}')}catch(_){return {}}};
const saved=read(STORE),avatar=read('skyrealm_character_v1');
const colors={skin:avatar.skin||'#e8b88c',hair:avatar.hair||'#352d3d',shirt:avatar.armor||'#526fba',trim:avatar.accent||'#9cb9ff',eyes:avatar.eye||'#26334c'};
const state={x:saved.x??440,y:saved.y??390,hp:saved.hp??100,scrap:saved.scrap||0,bandage:saved.bandage||0,food:saved.food||0,day:saved.day||1,quest:saved.quest||0,lastDay:saved.lastDay||new Date().toDateString(),dayReward:saved.dayReward||0,radioFinds:saved.radioFinds||0,survivorTrust:saved.survivorTrust||0};
const mark={x:610,y:400};
const wrecks=[{x:300,y:260,done:false},{x:800,y:280,done:false},{x:930,y:650,done:false},{x:330,y:720,done:false},{x:650,y:900,done:false},{x:1200,y:420,done:false},{x:1450,y:800,done:false},{x:1850,y:350,done:false},{x:2200,y:780,done:false},{x:2750,y:520,done:false},{x:3100,y:1250,done:false},{x:1900,y:1950,done:false}];
wrecks.forEach((v,i)=>v.done=!!saved.wrecks?.[i]);
// Keep a saved player spawn clear of parked/wrecked vehicles.
for(const v of wrecks){if(Math.hypot(state.x-v.x,state.y-v.y)<62){state.x=v.x+92;state.y=v.y+72;break;}}
let w=0,h=0,dpr=1,time=0,toastTimer=0,dialogMode='intro',moveX=0,moveY=0,joyPointer=null,wind=0,windName='тихий';
const zombies=[];let lastZombieSpawn=0,worldClock=0,zombieId=0;const ZOMBIE_INTERVAL=29000;
const keys=new Set();
let gameActive=false,lastNet=0,deathHandled=false,respawnUntil=0;
let radioSignal=null,radioSignalNextAt=performance.now()+30000;
const prefs=(()=>{try{return {...{effects:'high',joy:100,motion:true,hints:true},...JSON.parse(localStorage.getItem('skyrealm_apocalypse_settings_v1')||'{}')}}catch(_){return {effects:'high',joy:100,motion:true,hints:true}}})();
// Deterministic, irregular forest placement. One tree per roughly 8 game blocks (256 world units).
const trees=[];
function buildForest(){
 let seed=0x51a7e;
 const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 const minGap=256,minGap2=minGap*minGap,limit=260;
 const blockedZones=buildings.map(b=>({x:b.x+b.w/2,y:b.y-b.floors*17+b.h/2,r:Math.max(b.w,b.h+b.floors*34)*.72+70}))
   .concat([{x:mark.x,y:mark.y,r:135},{x:440,y:390,r:175}],wrecks.map(v=>({x:v.x,y:v.y,r:100})));
 for(let attempt=0;attempt<18000&&trees.length<260;attempt++){
  const x=65+rand()*9870,y=65+rand()*9870;
  // Keep roads, buildings, important locations and spawn areas clear.
  if([600,4100,7600].some(road=>Math.abs(y-road)<95))continue;
  if([2700,6200,9700].some(road=>Math.abs(x-road)<95))continue;
  if(blockedZones.some(z=>(x-z.x)**2+(y-z.y)**2<z.r*z.r))continue;
  if(trees.some(t=>(x-t.x)**2+(y-t.y)**2<minGap2))continue;
  trees.push({x,y,size:.78+rand()*.62,phase:rand()*Math.PI*2});
 }
}
const buildings=[
 {id:'residential',x:720,y:1120,w:360,h:290,floors:5,accent:'#68715c'},
 {id:'hospital',x:4220,y:1120,w:390,h:310,floors:6,accent:'#8b8877'},
 {id:'police',x:7720,y:1120,w:350,h:280,floors:4,accent:'#626e70'},
 {id:'mall',x:720,y:4620,w:420,h:340,floors:4,accent:'#77705e'},
 {id:'office',x:4220,y:4620,w:360,h:310,floors:7,accent:'#626d6c'},
 {id:'apartment',x:7720,y:4620,w:390,h:330,floors:6,accent:'#82745f'},
 {id:'warehouse',x:4220,y:8120,w:440,h:350,floors:3,accent:'#6d705e'}
];
buildForest();
function save(){localStorage.setItem(STORE,JSON.stringify({...state,wrecks:wrecks.map(v=>v.done)}))}
function resize(){dpr=Math.min(devicePixelRatio||1,1.7);w=innerWidth;h=innerHeight;canvas.width=Math.floor(w*dpr);canvas.height=Math.floor(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)}
function rect(x,y,a,b,c){ctx.fillStyle=c;ctx.fillRect(x,y,a,b)}
function toast(t){let e=document.getElementById('toast');e.textContent=t;e.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove('show'),1800)}
function dayWind(){const cycle=(state.day*37)%100;wind=cycle<30?.12:cycle<65?.42:.78;windName=wind<.25?'тихий':wind<.6?'умеренный':'сильный';document.getElementById('weather').textContent='Ветер · '+windName;}
function ground(){// A consistent grass palette across the whole expanded map; subtle blades add texture without changing the ground colour.
 rect(-w/2-700,-h/2-700,w+1400,h+1400,'#657452');
 const left=Math.floor((state.x-w/2-700)/46)*46,top=Math.floor((state.y-h/2-700)/46)*46;
 for(let gy=top;gy<state.y+h/2+700;gy+=46)for(let gx=left;gx<state.x+w/2+700;gx+=46){
  const n=Math.abs(Math.sin(gx*12.989+gy*78.233)*43758.5453)%1;
  ctx.strokeStyle=n>.5?'#81906466':'#43583b66';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(gx+n*25,gy+12);ctx.lineTo(gx+n*25+2,gy+5+n*5);ctx.stroke();
 }
 // Connected district roads with sidewalks, worn lane markings and intersections.
 for(const y of [600,4100,7600]){
  rect(0,y-62,10000,124,'#424741');rect(0,y-66,10000,4,'#99927b66');rect(0,y+62,10000,4,'#242b27');
  for(let x=30;x<10000;x+=150)rect(x,y-2,66,4,'#b6a87b88');
 }
 for(const x of [2700,6200,9700]){
  rect(x-58,0,116,10000,'#484b43');rect(x-62,0,4,10000,'#99927b55');rect(x+58,0,4,10000,'#242b27');
  for(let y=30;y<10000;y+=150)rect(x-2,y,4,66,'#c0b18a66');
 }
 // Small road-edge rubble repeats consistently in every district.
 for(let i=0;i<240;i++){const x=(i*397)%9950,y=(i*613)%9950;if(i%3===0)rect(x,y,3+i%5,2+i%3,'#303a3155');}
}
function tree(t){let sway=Math.sin(time*.0011* (1+wind)+t.phase)*wind*.13;ctx.save();ctx.translate(t.x,t.y);ctx.scale(t.size,t.size);ctx.fillStyle='#282c25';ctx.beginPath();ctx.ellipse(0,10,13,5,0,0,7);ctx.fill();rect(-5,-37,10,48,'#574936');ctx.translate(0,-30);ctx.rotate(sway);for(let j=0;j<3;j++){ctx.fillStyle=['#344b36','#405a3b','#536b43'][j];ctx.beginPath();ctx.moveTo(0,-42+j*8);ctx.lineTo(-27+j*5,7+j*7);ctx.quadraticCurveTo(0,15+j*4,27-j*5,7+j*7);ctx.closePath();ctx.fill();ctx.strokeStyle='#75845b66';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,-32+j*8);ctx.lineTo(0,8+j*7);ctx.stroke()}ctx.restore()}
function pole(x,y){rect(x-4,y-58,8,66,'#51483a');rect(x-24,y-57,48,5,'#655a48');ctx.strokeStyle='#252c28';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-24,y-55);ctx.quadraticCurveTo(x,y-24,x+24,y-55);ctx.stroke();ctx.fillStyle='#d1b989';ctx.fillRect(x-3,y-60,6,5)}
function car(x,y,scale=1,angle=0){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(scale,scale);ctx.fillStyle='#171c1b88';ctx.fillRect(-49,18,104,14);ctx.fillStyle='#171d1b';ctx.fillRect(-42,12,19,12);ctx.fillRect(24,12,19,12);ctx.fillStyle='#535b54';ctx.fillRect(-47,-7,94,27);ctx.fillStyle='#343b38';ctx.fillRect(-27,-25,55,22);ctx.fillStyle='#7b8076';ctx.fillRect(-24,-22,19,16);ctx.fillStyle='#303833';ctx.fillRect(1,-22,20,16);ctx.fillStyle='#202522';ctx.fillRect(-34,13,18,11);ctx.fillRect(24,13,18,11);ctx.fillStyle='#98714f';ctx.fillRect(-51,-12,23,8);ctx.strokeStyle='#222a26';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-44,-7);ctx.lineTo(-23,-25);ctx.lineTo(-8,-7);ctx.stroke();ctx.fillStyle='#b5c1b5aa';ctx.fillRect(-11,-29,28,5);ctx.fillStyle='#a7a18a';ctx.fillRect(31,-8,14,4);ctx.fillStyle='#c6b991';ctx.fillRect(-46,-4,6,4);ctx.fillRect(40,-4,6,4);ctx.fillStyle='#252a26';ctx.fillRect(-18,0,31,4);ctx.strokeStyle='#b5a47b88';ctx.lineWidth=1;ctx.strokeRect(-47,-7,94,27);ctx.strokeStyle='#252d2a';ctx.beginPath();ctx.moveTo(-20,-21);ctx.lineTo(-8,-10);ctx.lineTo(-2,-17);ctx.stroke();ctx.fillStyle='#594b37';ctx.fillRect(17,8,18,3);ctx.restore()}
function building(b){
 const wall=b.accent||'#706c5a',floorH=34,top=b.y-b.floors*floorH;
 ctx.fillStyle='#1c211c99';ctx.fillRect(b.x-18,b.y+b.h-8,b.w+36,22);
 // Deep side wall and front facade create visible height.
 rect(b.x+b.w-18,top+8,18,b.h+b.floors*floorH-8,'#343a34');
 rect(b.x,top,b.w,b.h+b.floors*floorH,wall);
 rect(b.x+8,top+8,b.w-16,b.h+b.floors*floorH-16,'#77715f');
 for(let floor=0;floor<b.floors;floor++){
  const fy=top+16+floor*floorH;
  rect(b.x+8,fy+floorH-4,b.w-16,3,'#393f37');
  const cols=Math.max(3,Math.floor((b.w-44)/54));
  for(let c=0;c<cols;c++){
   const wx=b.x+22+c*((b.w-44)/cols),lit=((floor*7+c*3+b.x)%5===0);
   rect(wx,fy,25,22,lit?'#b1a17b':'#263a3a');
   rect(wx+3,fy+3,19,15,lit?'#8c8568':'#182a2b');
   rect(wx+12,fy,2,22,'#555a50');
   if(floor%2===0){rect(wx-3,fy+23,31,3,'#3a4038');rect(wx-3,fy+26,31,3,'#a39a7c');}
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
function streetLamp(x,y){ctx.fillStyle='#202821';ctx.fillRect(x-3,y-4,6,48);ctx.fillRect(x-3,y-4,22,4);ctx.fillStyle='#b9b69a';ctx.fillRect(x+15,y-7,10,7);if(worldClock>.62||worldClock<.08){const g=ctx.createRadialGradient(x+20,y-4,2,x+20,y-4,92);g.addColorStop(0,'#e5d59a30');g.addColorStop(1,'#e5d59a00');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x+20,y-4,92,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e9dba8';ctx.fillRect(x+17,y-6,6,4);}}
function drawDistrictDetails(){for(const y of [600,4100,7600])for(let x=420;x<10000;x+=900){if(Math.abs(x-state.x)<w&&Math.abs(y-state.y)<h)streetLamp(x,y-92);}for(const x of [2700,6200,9700])for(let y=420;y<10000;y+=900){if(Math.abs(x-state.x)<w&&Math.abs(y-state.y)<h)streetLamp(x+78,y);}}
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
  const nx=Math.max(90,Math.min(9910,state.x+Math.cos(angle)*distance));
  const ny=Math.max(90,Math.min(9910,state.y+Math.sin(angle)*distance));
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
  toast('Медпункт найден: аптечки +'+kits', еда +1, здоровье восстановлено');
 }else{
  state.survivorTrust++;state.food+=2;state.scrap++;
  toast('Выжившие спасены: доверие +1, еда +2, металлолом +1');
 }
 radioSignalNextAt=performance.now()+55000+Math.random()*45000;
 save();updateHud();
}
function drawMark(){ctx.fillStyle='#151d18';ctx.beginPath();ctx.ellipse(mark.x,mark.y+16,14,5,0,0,7);ctx.fill();rect(mark.x-9,mark.y-1,18,20,'#6d7950');rect(mark.x-7,mark.y+17,6,12,'#363e31');rect(mark.x+2,mark.y+17,6,12,'#363e31');rect(mark.x-12,mark.y+1,5,15,'#cba17b');rect(mark.x+7,mark.y+1,5,15,'#cba17b');ctx.fillStyle='#d4a77d';ctx.beginPath();ctx.arc(mark.x,mark.y-13,9,0,7);ctx.fill();rect(mark.x-10,mark.y-21,20,7,'#45463a');rect(mark.x-4,mark.y-13,2,2,'#222');rect(mark.x+3,mark.y-13,2,2,'#222');ctx.fillStyle='#f0d7a5';ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillText('МАРК',mark.x,mark.y-34)}
function drawSurvivor(x,y,palette,phase=0,moving=false,remote=false,name=''){
 const skin=palette?.skin||'#e8b88c',hair=palette?.hair||'#352d3d',shirt=palette?.shirt||'#526fba',trim=palette?.trim||'#9cb9ff',eyes=palette?.eyes||'#26334c';
 const swing=moving?Math.sin(time*.012+phase)*3.2:0;
 ctx.save();ctx.translate(x,y);ctx.scale(1.1,1.1);ctx.lineJoin='round';ctx.lineCap='round';
 // ground shadow and feet
 ctx.fillStyle='#101810aa';ctx.beginPath();ctx.ellipse(0,19,14,5,0,0,Math.PI*2);ctx.fill();
 // legs, knees and boots
 ctx.strokeStyle='#303a3b';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-4,5);ctx.lineTo(-5+swing,16);ctx.moveTo(4,5);ctx.lineTo(5-swing,16);ctx.stroke();
 ctx.fillStyle='#20292b';ctx.fillRect(-10+swing,15,9,5);ctx.fillRect(1-swing,15,9,5);
 // backpack and straps
 ctx.fillStyle='#4b4b35';ctx.fillRect(7,-12,8,18);ctx.fillStyle='#81794e';ctx.fillRect(9,-9,5,10);ctx.fillStyle='#262d25';ctx.fillRect(7,-13,8,2);
 // torso with jacket, collar, seams, belt and zipper
 ctx.fillStyle=shirt;ctx.beginPath();ctx.moveTo(-8,-11);ctx.lineTo(8,-11);ctx.lineTo(9,8);ctx.lineTo(-9,8);ctx.closePath();ctx.fill();
 ctx.fillStyle=trim;ctx.fillRect(-8,-11,16,4);ctx.fillRect(-2,-7,4,14);ctx.fillStyle='#29332d';ctx.fillRect(-8,6,16,3);ctx.fillStyle='#c4b17e';ctx.fillRect(-6,8,12,2);
 // articulated arms, sleeves and hands
 ctx.strokeStyle=shirt;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-8,-7);ctx.lineTo(-12,-1+swing*.45);ctx.lineTo(-12,5+swing*.65);ctx.moveTo(8,-7);ctx.lineTo(12,-1-swing*.45);ctx.lineTo(12,5-swing*.65);ctx.stroke();
 ctx.strokeStyle=skin;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-12,4+swing*.65);ctx.lineTo(-12,10+swing*.65);ctx.moveTo(12,4-swing*.65);ctx.lineTo(12,10-swing*.65);ctx.stroke();
 // neck and head
 ctx.fillStyle=skin;ctx.fillRect(-3,-15,6,6);ctx.beginPath();ctx.arc(0,-23,9,0,Math.PI*2);ctx.fill();
 // ears
 ctx.beginPath();ctx.arc(-9,-23,2.1,0,Math.PI*2);ctx.arc(9,-23,2.1,0,Math.PI*2);ctx.fill();
 // hair cap and side locks
 ctx.fillStyle=hair;ctx.beginPath();ctx.moveTo(-9,-23);ctx.lineTo(-8,-31);ctx.lineTo(-3,-35);ctx.lineTo(5,-34);ctx.lineTo(10,-28);ctx.lineTo(9,-19);ctx.lineTo(6,-20);ctx.lineTo(6,-28);ctx.lineTo(-5,-28);ctx.lineTo(-6,-19);ctx.closePath();ctx.fill();
 // visible eyes, eyebrows, nose and mouth
 ctx.fillStyle=eyes;ctx.fillRect(-5,-24,2.5,3);ctx.fillRect(2.5,-24,2.5,3);
 ctx.fillStyle=hair;ctx.fillRect(-6,-27,4,1.4);ctx.fillRect(2,-27,4,1.4);
 ctx.fillStyle='#9d705d';ctx.fillRect(-1,-20,2,2);ctx.fillStyle='#754b48';ctx.fillRect(-2,-17,4,1);
 // small shoulder details and outline
 ctx.strokeStyle='#18231d';ctx.lineWidth=1;ctx.strokeRect(-8,-11,16,19);
 if(remote){
  ctx.fillStyle='#e7e9d8';ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.shadowColor='#10170f';ctx.shadowBlur=4;ctx.fillText(String(name||'Игрок').slice(0,16),0,-40);
  ctx.shadowBlur=0;ctx.strokeStyle='#e7d6a0aa';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,-23,12,0,Math.PI*2);ctx.stroke();
 }
 ctx.restore();
}
function drawRemotePlayers(){const coop=window.ApocalypseCoop;if(!coop)return;for(const p of coop.getPlayers()){if(!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;drawSurvivor(p.x,p.y,p.avatar,p.phase||0,!!p.moving,true,p.name);}}
function drawPlayer(){drawSurvivor(w/2,h/2+Math.sin(time*.008)*2,colors,0,Math.hypot(moveX,moveY)>.08,false);}
function spawnZombie(x,y,kind='night'){if(zombies.length>=28)return;zombies.push({id:++zombieId,x,y,kind,hp:40,attackAt:0,phase:Math.random()*6.28,born:performance.now(),emerge:1750});}
function updateZombies(dt,now){
 if(!gameActive)return;
 worldClock=(worldClock+dt/480)%1;
 const night=worldClock>.62||worldClock<.08,coop=window.ApocalypseCoop;
 const canSpawn=!coop?.room||coop.isOwner();
 if(canSpawn&&now-lastZombieSpawn>=ZOMBIE_INTERVAL){
  lastZombieSpawn=now;
  if(Math.random()<.5){
   const b=buildings[Math.floor(Math.random()*buildings.length)],byBuilding=Math.random()<.42;
   let cx=state.x+(Math.random()-.5)*300,cy=state.y+(Math.random()-.5)*260;
   const count=byBuilding?2+Math.floor(Math.random()*3):1;
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
    const kind=byBuilding?'horde':(night?'night':'day');
    spawnZombie(x,y,kind);
    if(coop?.room?.status==='running')coop.send({kind:'zombie-spawn',x,y,ztype:kind});
   }
  }
 }
 for(let i=zombies.length-1;i>=0;i--){
  const z=zombies[i],d=Math.hypot(state.x-z.x,state.y-z.y),active=z.kind==='day'||z.kind==='horde'||night;
  if(active&&d<620&&now-z.born>z.emerge){
   const dx=(state.x-z.x)/(d||1),dy=(state.y-z.y)/(d||1),nx=z.x+dx*68*dt,ny=z.y+dy*68*dt;
   if(!blocked(nx,z.y))z.x=nx;
   if(!blocked(z.x,ny))z.y=ny;
   if(d<26&&now>z.attackAt&&now>respawnUntil){z.attackAt=now+950;state.hp=Math.max(0,state.hp-6);if(state.hp<=0)showDeath();}
  }
  if(d>900)zombies.splice(i,1);
 }
}
function drawZombies(){
 const now=performance.now();
 for(const z of zombies){
  const age=now-z.born,p=Math.max(0,Math.min(1,age/z.emerge)),rise=1-Math.pow(1-p,2),buried=1-rise;
  const active=z.kind==='day'||z.kind==='horde'||worldClock>.62||worldClock<.08;
  const walk=age>z.emerge?Math.sin(time*.009+z.phase):Math.sin(age*.012+z.phase)*.35;
  ctx.save();ctx.translate(z.x,z.y+buried*25);ctx.globalAlpha=(active?1:.35)*Math.min(1,p*2.5);
  // Ground shadow and flying soil while the zombie climbs out.
  ctx.fillStyle='#11160f99';ctx.beginPath();ctx.ellipse(0,15,13+buried*7,4+buried*2,0,0,Math.PI*2);ctx.fill();
  if(p<1){
   for(let i=0;i<9;i++){const a=i*2.399+z.phase,dist=(1-p)*9+(i%3)*3,px=Math.cos(a)*dist,py=8+Math.sin(a)*dist*.45-(1-p)*12;
    ctx.fillStyle=i%2?'#554a32':'#796744';ctx.beginPath();ctx.arc(px,py,1.3+(i%3)*.5,0,Math.PI*2);ctx.fill();}
  }
  ctx.translate(0,buried*22);ctx.scale(1,Math.max(.08,rise));
  // Legs with separate torn trouser panels and animated gait.
  ctx.strokeStyle='#30372e';ctx.lineWidth=5;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(-3,5);ctx.lineTo(-5+walk*4,15);ctx.moveTo(3,5);ctx.lineTo(5-walk*4,15);ctx.stroke();
  ctx.strokeStyle='#4b4a3b';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-5+walk*4,14);ctx.lineTo(-8+walk*5,17);ctx.moveTo(5-walk*4,14);ctx.lineTo(8-walk*5,17);ctx.stroke();
  // Torso, layered ragged clothing and fabric wear.
  ctx.fillStyle=z.kind==='horde'?'#485943':'#53604c';ctx.beginPath();ctx.moveTo(-7,-10);ctx.lineTo(6,-10);ctx.lineTo(8,5);ctx.lineTo(4,9);ctx.lineTo(-7,7);ctx.closePath();ctx.fill();
  ctx.fillStyle='#303b31';ctx.fillRect(-6,-7,12,3);ctx.fillStyle='#83765a';ctx.fillRect(-5,-2,3,7);ctx.fillStyle='#a18d6d';ctx.fillRect(2,-6,2,3);
  ctx.strokeStyle='#9a9273';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-5,1);ctx.lineTo(-2,4);ctx.moveTo(4,-5);ctx.lineTo(6,-1);ctx.stroke();
  // Animated dangling arms with exposed forearms.
  for(const side of [-1,1]){ctx.save();ctx.translate(side*6,-7);ctx.rotate(side*(.24+walk*.28));ctx.strokeStyle='#555c48';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(side*4,8);ctx.stroke();ctx.strokeStyle='#9a8b70';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(side*4,8);ctx.lineTo(side*3+walk*2,13);ctx.stroke();ctx.fillStyle='#b1a080';ctx.beginPath();ctx.arc(side*3+walk*2,14,2.2,0,Math.PI*2);ctx.fill();ctx.restore();}
  // Neck, decayed face, scars, eye sockets and glowing eyes.
  ctx.fillStyle='#8b8a6b';ctx.fillRect(-3,-13,6,5);ctx.fillStyle='#a09a78';ctx.beginPath();ctx.ellipse(0,-18,7.5,8.5,-.08,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#696b55';ctx.beginPath();ctx.ellipse(-5,-19,2.4,4,-.4,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#2a2119';ctx.fillRect(-4,-20,3,3);ctx.fillRect(2,-20,3,3);
  ctx.fillStyle=active?'#d7a75b':'#756b4d';ctx.fillRect(-3,-20,2,2);ctx.fillRect(3,-20,2,2);
  ctx.strokeStyle='#514334';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-2,-13);ctx.lineTo(3,-12);ctx.moveTo(4,-23);ctx.lineTo(6,-21);ctx.stroke();
  // Texture: pores, dried dirt and scratches.
  for(let i=0;i<7;i++){const tx=Math.sin(i*17+z.id)*5,ty=-8+Math.cos(i*11+z.phase)*13;ctx.fillStyle=i%2?'#242d24':'#b0a17a';ctx.globalAlpha=(active?1:.35)*Math.min(1,p*2.5)*.55;ctx.fillRect(tx,ty,1.2,1.2);}
  ctx.restore();
 }
}
function showDeath(){if(deathHandled)return;deathHandled=true;gameActive=false;keys.clear();moveX=moveY=0;save();document.getElementById('deathDay').textContent='Ты продержался до '+state.day+' дня';document.getElementById('deathOverlay').classList.remove('hidden');}
function respawn(){state.hp=100;state.x=Math.max(100,Math.min(9900,state.x+150));state.y=Math.max(100,Math.min(9900,state.y+110));deathHandled=false;respawnUntil=performance.now()+4000;document.getElementById('deathOverlay').classList.add('hidden');gameActive=true;save();toast('Ты вернулся. 4 секунды защиты.');}
function updateHud(){document.getElementById('health').textContent='♥ '+state.hp+' / 100';document.getElementById('day').textContent='День '+state.day+' · '+(worldClock>.62||worldClock<.08?'Ночь':'День')}
function draw(){ctx.clearRect(0,0,w,h);ctx.save();ctx.translate(w/2-state.x,h/2-state.y);ground();drawDistrictDetails();trees.forEach(t=>{if(t.x>state.x-w&&t.x<state.x+w&&t.y>state.y-h&&t.y<state.y+h)tree(t)});buildings.forEach(building);for(let x=180;x<2500;x+=330)pole(x,600);wrecks.forEach(wreck);smoke(800,255);smoke(300,235);drawZombies();buildings.forEach(b=>{if(b.x>state.x-w&&b.x<state.x+w&&b.y>state.y-h&&b.y<state.y+h){ctx.fillStyle='#242b27';ctx.fillRect(b.x-22,b.y+b.h+8,10,18);ctx.fillRect(b.x+b.w+12,b.y+b.h+8,10,18);}});drawMark();drawRadioSignal();drawRemotePlayers();if(worldClock>.62||worldClock<.08){ctx.fillStyle='#07101c55';ctx.fillRect(-w,-h,w*3,h*3)}else{ctx.fillStyle='#d6cfa022';ctx.fillRect(-w,-h,w*3,h*3)}ctx.restore();drawPlayer();updateHud();drawWind()}
function drawWind(){if(prefs.effects==='low'||wind<.3)return;ctx.save();ctx.globalAlpha=.13+wind*.12;ctx.strokeStyle='#e1e6ca';ctx.lineWidth=1;for(let i=0;i<8;i++){let x=(i*137+time*.07*(1+wind))%(w+80)-40,y=(i*83+Math.sin(time*.001+i)*25)%h;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+18,y-4,x+34+wind*20,y-1);ctx.stroke()}ctx.restore()}
function interact(){if(radioSignal&&Math.hypot(state.x-radioSignal.x,state.y-radioSignal.y)<78){completeRadioSignal();return}if(Math.hypot(state.x-mark.x,state.y-mark.y)<75){openMark();return}let index=wrecks.findIndex(v=>!v.done&&Math.hypot(state.x-v.x,state.y-v.y)<65);if(index>=0){const coop=window.ApocalypseCoop;wrecks[index].done=true;state.quest++;state.scrap++;toast('Деталь найдена · '+state.quest+'/3');save();if(coop?.room?.status==='running')coop.send({kind:'wreck-claimed',index,quest:state.quest,by:coop.userId});return}toast('Подойди ближе к объекту')}
function showPanel(title,body,items){document.getElementById('panelText').textContent=body;let box=document.getElementById('items');box.innerHTML='';items.forEach(item=>{let slot=document.createElement('div');slot.className='slot filled';let art=document.createElement('div');art.className='art';art.textContent=item.icon;let name=document.createElement('b');name.textContent=item.name;let count=document.createElement('small');count.textContent='×'+item.count;slot.append(art,name,count);if(item.use){slot.addEventListener('click',item.use)}box.append(slot)});for(let i=items.length;i<24;i++){let empty=document.createElement('div');empty.className='slot';box.append(empty)}document.getElementById('invHealth').textContent=state.hp;document.getElementById('invDay').textContent=state.day;document.getElementById('invSpeed').textContent=(wind>=.65?'82%':wind>=.3?'94%':'100%');document.getElementById('weight').textContent=(state.scrap*1.2+state.bandage*.2+state.food*.4).toFixed(1)+' / 40 кг';document.getElementById('panel').classList.remove('hidden')}
function openMark(){if(state.quest>=3&&state.dayReward!==state.day){state.scrap=Math.max(0,state.scrap-3);state.bandage+=2;state.food++;state.dayReward=state.day;state.quest=0;wrecks.forEach(v=>{if(Math.random()<.6)v.done=false});save();showPanel('Марк · награда','Ты выполнил поручение. Забирай припасы — они пригодятся в дороге.',inventoryItems());return}let msg=state.dayReward===state.day?'Сегодня ты уже помог поселению. Отдохни, завтра будет новое поручение.':'Я Марк. Собери 3 детали с разбитых машин и возвращайся ко мне. За работу дам аптечки и еду. Сейчас собрано: '+state.quest+'/3.';showPanel('Марк · выживший',msg,[{icon:'⚙️',name:'Детали для задания',count:state.quest+'/3'},{icon:'🩹',name:'Награда: аптечки',count:'×2'},{icon:'🥫',name:'Награда: консервы',count:'×1'}])}
function inventoryItems(){return [{icon:'⚙️',name:'Металлолом',count:state.scrap},{icon:'🩹',name:'Аптечка',count:state.bandage,use:()=>{if(state.bandage<1){toast('Нет аптечек');return}if(state.hp>=100){toast('Здоровье уже полное');return}state.bandage--;state.hp=Math.min(100,state.hp+45);save();updateHud();inventory()}},{icon:'🥫',name:'Консервы',count:state.food,use:()=>{if(state.food<1){toast('Нет еды');return}state.food--;state.hp=Math.min(100,state.hp+15);save();updateHud();inventory()}},{icon:'🪵',name:'Доски',count:saved.wood||0},{icon:'🔩',name:'Крепёж',count:saved.bolts||0},{icon:'🔦',name:'Фонарик',count:saved.flashlight?1:0},{icon:'📡',name:'Найдено сигналов',count:state.radioFinds},{icon:'🤝',name:'Доверие выживших',count:state.survivorTrust}]}
function inventory(){showPanel('Рюкзак','Снаряжение и найденные припасы. Задание Марка также отображается здесь.',inventoryItems())}
function nearSegment(px,py,x1,y1,x2,y2,limit){
 const dx=x2-x1,dy=y2-y1,len=dx*dx+dy*dy;
 const t=len?Math.max(0,Math.min(1,((px-x1)*dx+(py-y1)*dy)/len)):0;
 const ox=px-(x1+t*dx),oy=py-(y1+t*dy);
 return ox*ox+oy*oy<limit*limit;
}
function blocked(x,y){
 const r=12,wall=r+7;
 if(x<25+r||y<25+r||x>9975-r||y>9975-r)return true;
 for(const b of buildings){
  const left=b.x,right=b.x+b.w,top=b.y-b.floors*34,bottom=b.y+b.h,cx=(left+right)/2,doorHalf=47;
  // The shell is solid, except for the centered entrance.
  if(nearSegment(x,y,left,top,right,top,wall)||nearSegment(x,y,left,top,left,bottom,wall)||nearSegment(x,y,right,top,right,bottom,wall))return true;
  if(nearSegment(x,y,left,bottom,cx-doorHalf,bottom,wall)||nearSegment(x,y,cx+doorHalf,bottom,right,bottom,wall))return true;
  // Short lobby side walls and back wall make the interior a real, bounded walkable space.
  const lobbyTop=bottom-126,lobbyHalf=62;
  if(nearSegment(x,y,cx-lobbyHalf,lobbyTop,cx-lobbyHalf,bottom-12,wall)||nearSegment(x,y,cx+lobbyHalf,lobbyTop,cx+lobbyHalf,bottom-12,wall)||nearSegment(x,y,cx-lobbyHalf,lobbyTop,cx+lobbyHalf,lobbyTop,wall))return true;
 }
 for(const t of trees){const rr=10+t.size*8,dx=x-t.x,dy=y-(t.y+7);if(dx*dx+dy*dy<(r+rr)**2)return true;}
 for(const v of wrecks){const dx=x-v.x,dy=y-v.y;if(dx*dx+dy*dy<58*58)return true;}
 return false;
}
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
let prev=performance.now();function loop(now){let dt=Math.min(.04,(now-prev)/1000);prev=now;time=now;if(gameActive){move(dt);updateZombies(dt,now);updateRadioSignal(now);}const coop=window.ApocalypseCoop;if(gameActive&&coop?.room?.status==='running'&&now-lastNet>250){lastNet=now;coop.sendPosition?.({kind:'position',x:state.x,y:state.y,hp:state.hp,day:state.day,name:localStorage.getItem('skyrealm_username')||JSON.parse(localStorage.getItem('skyrealm_hub_user')||'{}').username||'Выживший',worldClock,avatar:{skin:colors.skin,hair:colors.hair,shirt:colors.shirt,trim:colors.trim,eyes:colors.eyes},moving:Math.hypot(moveX,moveY)>.08||['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].some(k=>keys.has(k)),phase:state.x*.013+state.y*.009});}draw();requestAnimationFrame(loop)}
function daily(){let today=new Date().toDateString();if(state.lastDay!==today){state.day++;state.quest=0;state.dayReward=0;state.lastDay=today;wrecks.forEach(v=>v.done=false);save()}dayWind()}
function focusGame(){try{canvas.focus({preventScroll:true});}catch(_){canvas.focus();}}
function leaveToMenu(){save();gameActive=false;keys.clear();moveX=moveY=0;document.getElementById('deathOverlay').classList.add('hidden');document.body.classList.add('menu-open');document.getElementById('mainMenu').classList.remove('menu-out');}
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
function enterSolo(){gameActive=true;document.body.classList.remove('menu-open');document.getElementById('mainMenu').classList.add('menu-out');document.getElementById('dialogue').classList.remove('hidden');focusGame();}
function applySettings(){document.getElementById('joy').style.transform='scale('+(Number(prefs.joy||100)/100)+')';document.body.classList.toggle('reduced-motion',!prefs.motion);document.body.classList.toggle('hide-hints',!prefs.hints);document.getElementById('settingEffects').value=prefs.effects;document.getElementById('settingJoy').value=prefs.joy;document.getElementById('settingMotion').checked=!!prefs.motion;document.getElementById('settingHints').checked=!!prefs.hints;}
document.getElementById('menuPlay').onclick=enterSolo;
document.getElementById('menuJournal').onclick=()=>openUpdateJournal(false);
document.getElementById('journalX').onclick=closeUpdateJournal;
document.getElementById('journalOk').onclick=closeUpdateJournal;
document.getElementById('menuSettings').onclick=()=>{applySettings();document.getElementById('settingsOverlay').classList.remove('hidden')};
document.getElementById('menuExit').onclick=exitGame;
document.getElementById('deathRespawn').onclick=respawn;
document.getElementById('deathMenu').onclick=leaveToMenu;
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>document.getElementById(b.dataset.close).classList.add('hidden')));
document.getElementById('settingsSave').onclick=()=>{prefs.effects=document.getElementById('settingEffects').value;prefs.joy=Number(document.getElementById('settingJoy').value);prefs.motion=document.getElementById('settingMotion').checked;prefs.hints=document.getElementById('settingHints').checked;localStorage.setItem('skyrealm_apocalypse_settings_v1',JSON.stringify(prefs));applySettings();document.getElementById('settingsOverlay').classList.add('hidden');toast('Настройки сохранены')};
document.getElementById('settingsReset').onclick=()=>{if(confirm('Удалить сохранение Apocalypse на этом устройстве? Это нельзя отменить.')){localStorage.removeItem(STORE);location.reload()}};
document.getElementById('pauseMenu').onclick=()=>leaveToMenu();
document.getElementById('start').onclick=()=>{document.getElementById('dialogue').classList.add('hidden');gameActive=true;focusGame();showJournalOnWorldEntry(true);};
window.addEventListener('apocalypse-coop-enter',()=>{gameActive=true;document.body.classList.remove('menu-open');document.getElementById('mainMenu').classList.add('menu-out');document.getElementById('dialogue').classList.add('hidden');document.getElementById('coopOverlay').classList.add('hidden');focusGame();showJournalOnWorldEntry(true);});
window.addEventListener('apocalypse-coop-event',e=>{const p=e.detail,coop=window.ApocalypseCoop;if(!p||!coop||!coop.room)return;if(p.kind==='zombie-spawn'&&!coop.isOwner()&&Number.isFinite(p.x)&&Number.isFinite(p.y))spawnZombie(p.x,p.y,p.ztype||'night');if(Number.isFinite(p.worldClock))worldClock=p.worldClock;if(p.kind==='world'&&!coop.isOwner()&&Array.isArray(p.wrecks)){p.wrecks.forEach((done,i)=>{if(wrecks[i])wrecks[i].done=!!done});state.quest=Math.max(0,Number(p.quest)||0);state.day=Math.max(1,Number(p.day)||1);save();}if(p.kind==='wreck-request'&&coop.isOwner()){const remote=coop.getPlayers().find(v=>v.user_id===p.user_id),v=wrecks[Number(p.index)];if(remote&&v&&!v.done&&Math.hypot(remote.x-v.x,remote.y-v.y)<100){v.done=true;state.quest++;save();coop.send({kind:'wreck-claimed',index:Number(p.index),quest:state.quest,by:p.user_id});}}if(p.kind==='wreck-claimed'){const i=Number(p.index);if(wrecks[i])wrecks[i].done=true;state.quest=Math.max(0,Number(p.quest)||0);if(p.by===coop.userId)state.scrap++;save();toast('Общие детали: '+state.quest+'/3');}if(p.kind==='world-request'&&coop.isOwner())coop.send({kind:'world',wrecks:wrecks.map(v=>v.done),quest:state.quest,day:state.day});});
applySettings();
document.getElementById('action').onclick=interact;document.getElementById('inventory').onclick=inventory;document.getElementById('panelClose').onclick=()=>document.getElementById('panel').classList.add('hidden');
document.getElementById('exit').onclick=exitGame;
const keyFromEvent=e=>({KeyW:'w',KeyA:'a',KeyS:'s',KeyD:'d',KeyE:'e',KeyI:'i',ArrowUp:'ArrowUp',ArrowDown:'ArrowDown',ArrowLeft:'ArrowLeft',ArrowRight:'ArrowRight'}[e.code]||(e.key.length===1?e.key.toLowerCase():e.key));
document.addEventListener('keydown',e=>{const k=keyFromEvent(e);if(k==='F11'){e.preventDefault();e.stopPropagation();const api=window.pywebview?.api;if(api?.toggle_fullscreen){api.toggle_fullscreen();}else if(!document.fullscreenElement){document.documentElement.requestFullscreen?.().catch(()=>{});}else{document.exitFullscreen?.().catch(()=>{});}return;}if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d',' '].includes(k))e.preventDefault();if(['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(k)){keys.add(k);focusGame();return;}if(e.repeat)return;if(k==='e')interact();if(k==='i')inventory();if(k==='Escape'&&gameActive)leaveToMenu();},true);
document.addEventListener('keyup',e=>{const k=keyFromEvent(e);keys.delete(k);},true);
window.addEventListener('blur',()=>keys.clear());
canvas.tabIndex=0;canvas.addEventListener('pointerdown',focusGame);
window.addEventListener('contextmenu',e=>e.preventDefault());window.addEventListener('selectstart',e=>e.preventDefault());window.addEventListener('resize',resize);
window.ApocalypseGame=Object.freeze({getWrecks:()=>wrecks.map(v=>v.done),getQuest:()=>state.quest,getDay:()=>state.day,save});setupJoystick();daily();resize();save();requestAnimationFrame(loop);
})();