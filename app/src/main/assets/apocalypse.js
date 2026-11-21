(()=>{'use strict';
const canvas=document.getElementById('world'),ctx=canvas.getContext('2d'),STORE='skyrealm_apocalypse_mobile_v1';
const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'{}')}catch(_){return {}}};
const saved=read(STORE),avatar=read('skyrealm_character_v1');
const colors={skin:avatar.skin||'#e8b88c',hair:avatar.hair||'#352d3d',shirt:avatar.armor||'#526fba',trim:avatar.accent||'#9cb9ff',eyes:avatar.eye||'#26334c'};
const state={x:saved.x??440,y:saved.y??390,hp:saved.hp??100,scrap:saved.scrap||0,bandage:saved.bandage||0,food:saved.food||0,day:saved.day||1,quest:saved.quest||0,lastDay:saved.lastDay||new Date().toDateString(),dayReward:saved.dayReward||0};
const mark={x:610,y:400};
const wrecks=[{x:300,y:260,done:false},{x:800,y:280,done:false},{x:930,y:650,done:false},{x:330,y:720,done:false},{x:650,y:900,done:false},{x:1200,y:420,done:false},{x:1450,y:800,done:false},{x:1850,y:350,done:false},{x:2200,y:780,done:false},{x:2750,y:520,done:false},{x:3100,y:1250,done:false},{x:1900,y:1950,done:false}];
wrecks.forEach((v,i)=>v.done=!!saved.wrecks?.[i]);
let w=0,h=0,dpr=1,time=0,toastTimer=0,dialogMode='intro',moveX=0,moveY=0,joyPointer=null,wind=0,windName='тихий';
const keys=new Set();
let gameActive=false,lastNet=0;
const prefs=(()=>{try{return {...{effects:'high',joy:100,motion:true,hints:true},...JSON.parse(localStorage.getItem('skyrealm_apocalypse_settings_v1')||'{}')}}catch(_){return {effects:'high',joy:100,motion:true,hints:true}}})();
// Deterministic, irregular forest placement. One tree per roughly 8 game blocks (256 world units).
const trees=[];
function buildForest(){
 let seed=0x51a7e;
 const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 const minGap=256,minGap2=minGap*minGap,limit=78;
 const blockedZones=buildings.map(b=>({x:b.x+b.w/2,y:b.y+b.h/2,r:Math.max(b.w,b.h)*.72+70}))
   .concat([{x:mark.x,y:mark.y,r:135},{x:440,y:390,r:175}],wrecks.map(v=>({x:v.x,y:v.y,r:100})));
 for(let attempt=0;attempt<3200&&trees.length<limit;attempt++){
  const x=65+rand()*3520,y=65+rand()*2620;
  // Keep roads, buildings, important locations and spawn areas clear.
  if(y>475&&y<660)continue;
  if(x>1045&&x<1225)continue;
  if(blockedZones.some(z=>(x-z.x)**2+(y-z.y)**2<z.r*z.r))continue;
  if(trees.some(t=>(x-t.x)**2+(y-t.y)**2<minGap2))continue;
  trees.push({x,y,size:.78+rand()*.62,phase:rand()*Math.PI*2});
 }
}
const buildings=[{x:90,y:460,w:155,h:120},{x:1040,y:170,w:170,h:125},{x:1270,y:1060,w:200,h:135},{x:400,y:1120,w:150,h:105},{x:1750,y:180,w:185,h:135},{x:2180,y:1120,w:210,h:145},{x:2850,y:780,w:190,h:130},{x:3050,y:2050,w:220,h:150},{x:1200,y:2150,w:170,h:125}];
buildForest();
function save(){localStorage.setItem(STORE,JSON.stringify({...state,wrecks:wrecks.map(v=>v.done)}))}
function resize(){dpr=Math.min(devicePixelRatio||1,1.7);w=innerWidth;h=innerHeight;canvas.width=Math.floor(w*dpr);canvas.height=Math.floor(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)}
function rect(x,y,a,b,c){ctx.fillStyle=c;ctx.fillRect(x,y,a,b)}
function toast(t){let e=document.getElementById('toast');e.textContent=t;e.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove('show'),1800)}
function dayWind(){const cycle=(state.day*37)%100;wind=cycle<30?.12:cycle<65?.42:.78;windName=wind<.25?'тихий':wind<.6?'умеренный':'сильный';document.getElementById('weather').textContent='Ветер · '+windName;}
function ground(){rect(-w/2-700,-h/2-700,w+1400,h+1400,'#657452');
 // patches of dry grass, dirt and rubble generated in world coordinates
 for(let gy=Math.floor((state.y-h/2-600)/90)*90;gy<state.y+h/2+700;gy+=90)for(let gx=Math.floor((state.x-w/2-700)/90)*90;gx<state.x+w/2+700;gx+=90){let n=Math.abs(Math.sin(gx*12.989+gy*78.233)*43758.5453)%1;rect(gx+n*55,gy+((n*71)%60),12+n*35,5+n*10,n>.65?'#77785a55':n>.35?'#b1a37a26':'#34463235');}
 // main cracked asphalt route crossing the settlement
 rect(-500,515,5100,104,'#424741');rect(-500,519,5100,3,'#96917a66');rect(-500,613,5100,3,'#242b27');for(let x=-450;x<4100;x+=120){rect(x,564,55,4,'#b6a87b88')}
 // side road
 rect(1090,-300,88,2400,'#484b43');for(let y=-250;y<3000;y+=115)rect(1132,y,4,48,'#c0b18a66');
 // debris and cracks
 for(let i=0;i<160;i++){let x=((i*173)%2500)-250,y=((i*97)%1800)-180;rect(x,y,3+i%5,2+i%3,i%4?'#303a31':'#c0ad8355')}
}
function tree(t){let sway=Math.sin(time*.0011* (1+wind)+t.phase)*wind*.13;ctx.save();ctx.translate(t.x,t.y);ctx.scale(t.size,t.size);ctx.fillStyle='#282c25';ctx.beginPath();ctx.ellipse(0,10,13,5,0,0,7);ctx.fill();rect(-5,-37,10,48,'#574936');ctx.translate(0,-30);ctx.rotate(sway);for(let j=0;j<3;j++){ctx.fillStyle=['#344b36','#405a3b','#536b43'][j];ctx.beginPath();ctx.moveTo(0,-42+j*8);ctx.lineTo(-27+j*5,7+j*7);ctx.quadraticCurveTo(0,15+j*4,27-j*5,7+j*7);ctx.closePath();ctx.fill();ctx.strokeStyle='#75845b66';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,-32+j*8);ctx.lineTo(0,8+j*7);ctx.stroke()}ctx.restore()}
function pole(x,y){rect(x-4,y-58,8,66,'#51483a');rect(x-24,y-57,48,5,'#655a48');ctx.strokeStyle='#252c28';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-24,y-55);ctx.quadraticCurveTo(x,y-24,x+24,y-55);ctx.stroke();ctx.fillStyle='#d1b989';ctx.fillRect(x-3,y-60,6,5)}
function car(x,y,scale=1,angle=0){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(scale,scale);ctx.fillStyle='#171c1b88';ctx.fillRect(-47,17,100,13);ctx.fillStyle='#535b54';ctx.fillRect(-47,-7,94,27);ctx.fillStyle='#343b38';ctx.fillRect(-27,-23,55,20);ctx.fillStyle='#7b8076';ctx.fillRect(-24,-20,19,15);ctx.fillStyle='#303833';ctx.fillRect(1,-20,20,15);ctx.fillStyle='#202522';ctx.fillRect(-34,13,18,11);ctx.fillRect(24,13,18,11);ctx.fillStyle='#98714f';ctx.fillRect(-51,-12,23,8);ctx.strokeStyle='#222a26';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-44,-7);ctx.lineTo(-23,-23);ctx.lineTo(-8,-7);ctx.stroke();ctx.fillStyle='#b5c1b5aa';ctx.fillRect(-11,-28,28,5);ctx.fillStyle='#a7a18a';ctx.fillRect(31,-8,14,4);ctx.restore()}
function building(b){ctx.fillStyle='#1c211c88';ctx.fillRect(b.x-5,b.y+b.h-3,b.w+15,16);rect(b.x,b.y,b.w,b.h,'#625e4e');rect(b.x+7,b.y+7,b.w-14,b.h-14,'#77715b');rect(b.x+18,b.y-17,b.w-36,22,'#3c4439');rect(b.x+20,b.y+27,36,42,'#27342f');rect(b.x+b.w-57,b.y+27,36,42,'#29332e');rect(b.x+b.w/2-12,b.y+b.h-42,25,42,'#34382f');ctx.strokeStyle='#b2a17a66';ctx.strokeRect(b.x+7,b.y+7,b.w-14,b.h-14)}
function wreck(v){car(v.x,v.y,1.05,.06);if(!v.done){ctx.strokeStyle='#e6c783';ctx.lineWidth=2;ctx.beginPath();ctx.arc(v.x,v.y,21+Math.sin(time*.004)*3,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#e6c783';ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.fillText('ДЕТАЛИ',v.x,v.y-31)}}
function smoke(x,y){if(prefs.effects==='low')return;for(let i=0;i<5;i++){let yy=(time*.00015+i*.21)%1;ctx.globalAlpha=(1-yy)*.2;ctx.fillStyle='#c5c5b8';ctx.beginPath();ctx.arc(x+Math.sin(time*.0006+i)*11,y-yy*52,5+yy*11,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1}
function drawMark(){ctx.fillStyle='#151d18';ctx.beginPath();ctx.ellipse(mark.x,mark.y+16,14,5,0,0,7);ctx.fill();rect(mark.x-9,mark.y-1,18,20,'#6d7950');rect(mark.x-7,mark.y+17,6,12,'#363e31');rect(mark.x+2,mark.y+17,6,12,'#363e31');rect(mark.x-12,mark.y+1,5,15,'#cba17b');rect(mark.x+7,mark.y+1,5,15,'#cba17b');ctx.fillStyle='#d4a77d';ctx.beginPath();ctx.arc(mark.x,mark.y-13,9,0,7);ctx.fill();rect(mark.x-10,mark.y-21,20,7,'#45463a');rect(mark.x-4,mark.y-13,2,2,'#222');rect(mark.x+3,mark.y-13,2,2,'#222');ctx.fillStyle='#f0d7a5';ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillText('МАРК',mark.x,mark.y-34)}
function drawSurvivor(x,y,palette,phase=0,moving=false,remote=false,name=''){
 const skin=palette?.skin||'#e8b88c',hair=palette?.hair||'#352d3d',shirt=palette?.shirt||'#526fba',trim=palette?.trim||'#9cb9ff',eyes=palette?.eyes||'#26334c';
 const swing=moving?Math.sin(time*.012+phase)*3.2:0;
 ctx.save();ctx.translate(x,y);ctx.scale(.65,.65);ctx.lineJoin='round';ctx.lineCap='round';
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
function updateHud(){document.getElementById('health').textContent='♥ '+state.hp+' / 100';document.getElementById('day').textContent='День '+state.day+' · '+(state.day%3===0?'Вечер':'Утро')}
function draw(){ctx.clearRect(0,0,w,h);ctx.save();ctx.translate(w/2-state.x,h/2-state.y);ground();trees.forEach(t=>{if(t.x>state.x-w&&t.x<state.x+w&&t.y>state.y-h&&t.y<state.y+h)tree(t)});buildings.forEach(building);for(let x=150;x<1700;x+=330)pole(x,500);wrecks.forEach(wreck);smoke(800,255);smoke(300,235);drawMark();drawRemotePlayers();ctx.restore();drawPlayer();updateHud();drawWind()}
function drawWind(){if(prefs.effects==='low'||wind<.3)return;ctx.save();ctx.globalAlpha=.13+wind*.12;ctx.strokeStyle='#e1e6ca';ctx.lineWidth=1;for(let i=0;i<8;i++){let x=(i*137+time*.07*(1+wind))%(w+80)-40,y=(i*83+Math.sin(time*.001+i)*25)%h;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+18,y-4,x+34+wind*20,y-1);ctx.stroke()}ctx.restore()}
function interact(){if(Math.hypot(state.x-mark.x,state.y-mark.y)<75){openMark();return}let index=wrecks.findIndex(v=>!v.done&&Math.hypot(state.x-v.x,state.y-v.y)<65);if(index>=0){const coop=window.ApocalypseCoop;if(coop?.room?.status==='running'&&!coop.isOwner()){coop.send({kind:'wreck-request',index});toast('Запрос на сбор отправлен владельцу');return;}wrecks[index].done=true;state.quest++;state.scrap++;toast('Деталь найдена · '+state.quest+'/3');save();if(coop?.room?.status==='running')coop.send({kind:'wreck-claimed',index,quest:state.quest,by:coop.userId});return}toast('Подойди ближе к объекту')}
function showPanel(title,body,items){document.getElementById('panelText').textContent=body;let box=document.getElementById('items');box.innerHTML='';items.forEach(item=>{let slot=document.createElement('div');slot.className='slot filled';let art=document.createElement('div');art.className='art';art.textContent=item.icon;let name=document.createElement('b');name.textContent=item.name;let count=document.createElement('small');count.textContent='×'+item.count;slot.append(art,name,count);if(item.use){slot.addEventListener('click',item.use)}box.append(slot)});for(let i=items.length;i<24;i++){let empty=document.createElement('div');empty.className='slot';box.append(empty)}document.getElementById('invHealth').textContent=state.hp;document.getElementById('invDay').textContent=state.day;document.getElementById('invSpeed').textContent=(wind>=.65?'82%':wind>=.3?'94%':'100%');document.getElementById('weight').textContent=(state.scrap*1.2+state.bandage*.2+state.food*.4).toFixed(1)+' / 40 кг';document.getElementById('panel').classList.remove('hidden')}
function openMark(){if(state.quest>=3&&state.dayReward!==state.day){state.scrap=Math.max(0,state.scrap-3);state.bandage+=2;state.food++;state.dayReward=state.day;state.quest=0;wrecks.forEach(v=>{if(Math.random()<.6)v.done=false});save();showPanel('Марк · награда','Ты выполнил поручение. Забирай припасы — они пригодятся в дороге.',inventoryItems());return}let msg=state.dayReward===state.day?'Сегодня ты уже помог поселению. Отдохни, завтра будет новое поручение.':'Я Марк. Собери 3 детали с разбитых машин и возвращайся ко мне. За работу дам аптечки и еду. Сейчас собрано: '+state.quest+'/3.';showPanel('Марк · выживший',msg,[{icon:'⚙️',name:'Детали для задания',count:state.quest+'/3'},{icon:'🩹',name:'Награда: аптечки',count:'×2'},{icon:'🥫',name:'Награда: консервы',count:'×1'}])}
function inventoryItems(){return [{icon:'⚙️',name:'Металлолом',count:state.scrap},{icon:'🩹',name:'Аптечка',count:state.bandage,use:()=>{if(state.bandage<1){toast('Нет аптечек');return}if(state.hp>=100){toast('Здоровье уже полное');return}state.bandage--;state.hp=Math.min(100,state.hp+45);save();updateHud();inventory()}},{icon:'🥫',name:'Консервы',count:state.food,use:()=>{if(state.food<1){toast('Нет еды');return}state.food--;state.hp=Math.min(100,state.hp+15);save();updateHud();inventory()}},{icon:'🪵',name:'Доски',count:saved.wood||0},{icon:'🔩',name:'Крепёж',count:saved.bolts||0},{icon:'🔦',name:'Фонарик',count:saved.flashlight?1:0}]}
function inventory(){showPanel('Рюкзак','Снаряжение и найденные припасы. Задание Марка также отображается здесь.',inventoryItems())}
function blocked(x,y){
  const r=12;
  if(x<25+r||y<25+r||x>3650-r||y>2750-r)return true;
  for(const b of buildings){const nx=Math.max(b.x,Math.min(x,b.x+b.w)),ny=Math.max(b.y,Math.min(y,b.y+b.h));if((x-nx)**2+(y-ny)**2<r*r)return true;}
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
let prev=performance.now();function loop(now){let dt=Math.min(.04,(now-prev)/1000);prev=now;time=now;if(gameActive)move(dt);const coop=window.ApocalypseCoop;if(gameActive&&coop?.room?.status==='running'&&now-lastNet>250){lastNet=now;coop.sendPosition?.({kind:'position',x:state.x,y:state.y,hp:state.hp,day:state.day,name:localStorage.getItem('skyrealm_username')||JSON.parse(localStorage.getItem('skyrealm_hub_user')||'{}').username||'Выживший',avatar:{skin:colors.skin,hair:colors.hair,shirt:colors.shirt,trim:colors.trim,eyes:colors.eyes},moving:Math.hypot(moveX,moveY)>.08||['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].some(k=>keys.has(k)),phase:state.x*.013+state.y*.009});}draw();requestAnimationFrame(loop)}
function daily(){let today=new Date().toDateString();if(state.lastDay!==today){state.day++;state.quest=0;state.dayReward=0;state.lastDay=today;wrecks.forEach(v=>v.done=false);save()}dayWind()}
function enterSolo(){gameActive=true;document.body.classList.remove('menu-open');document.getElementById('mainMenu').classList.add('menu-out');document.getElementById('dialogue').classList.remove('hidden');}
function applySettings(){document.getElementById('joy').style.transform='scale('+(Number(prefs.joy||100)/100)+')';document.body.classList.toggle('reduced-motion',!prefs.motion);document.body.classList.toggle('hide-hints',!prefs.hints);document.getElementById('settingEffects').value=prefs.effects;document.getElementById('settingJoy').value=prefs.joy;document.getElementById('settingMotion').checked=!!prefs.motion;document.getElementById('settingHints').checked=!!prefs.hints;}
document.getElementById('menuPlay').onclick=enterSolo;
document.getElementById('menuSettings').onclick=()=>{applySettings();document.getElementById('settingsOverlay').classList.remove('hidden')};
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>document.getElementById(b.dataset.close).classList.add('hidden')));
document.getElementById('settingsSave').onclick=()=>{prefs.effects=document.getElementById('settingEffects').value;prefs.joy=Number(document.getElementById('settingJoy').value);prefs.motion=document.getElementById('settingMotion').checked;prefs.hints=document.getElementById('settingHints').checked;localStorage.setItem('skyrealm_apocalypse_settings_v1',JSON.stringify(prefs));applySettings();document.getElementById('settingsOverlay').classList.add('hidden');toast('Настройки сохранены')};
document.getElementById('settingsReset').onclick=()=>{if(confirm('Удалить сохранение Apocalypse на этом устройстве? Это нельзя отменить.')){localStorage.removeItem(STORE);location.reload()}};
document.getElementById('pauseMenu').onclick=()=>{save();gameActive=false;document.body.classList.add('menu-open');document.getElementById('mainMenu').classList.remove('menu-out')};
document.getElementById('start').onclick=()=>{document.getElementById('dialogue').classList.add('hidden');gameActive=true;};
window.addEventListener('apocalypse-coop-enter',()=>{gameActive=true;document.body.classList.remove('menu-open');document.getElementById('mainMenu').classList.add('menu-out');document.getElementById('dialogue').classList.add('hidden');document.getElementById('coopOverlay').classList.add('hidden');});
window.addEventListener('apocalypse-coop-event',e=>{const p=e.detail,coop=window.ApocalypseCoop;if(!p||!coop||!coop.room)return;if(p.kind==='world'&&!coop.isOwner()&&Array.isArray(p.wrecks)){p.wrecks.forEach((done,i)=>{if(wrecks[i])wrecks[i].done=!!done});state.quest=Math.max(0,Number(p.quest)||0);state.day=Math.max(1,Number(p.day)||1);save();}if(p.kind==='wreck-request'&&coop.isOwner()){const remote=coop.getPlayers().find(v=>v.user_id===p.user_id),v=wrecks[Number(p.index)];if(remote&&v&&!v.done&&Math.hypot(remote.x-v.x,remote.y-v.y)<100){v.done=true;state.quest++;save();coop.send({kind:'wreck-claimed',index:Number(p.index),quest:state.quest,by:p.user_id});}}if(p.kind==='wreck-claimed'){const i=Number(p.index);if(wrecks[i])wrecks[i].done=true;state.quest=Math.max(0,Number(p.quest)||0);if(p.by===coop.userId)state.scrap++;save();toast('Общие детали: '+state.quest+'/3');}if(p.kind==='world-request'&&coop.isOwner())coop.send({kind:'world',wrecks:wrecks.map(v=>v.done),quest:state.quest,day:state.day});});
applySettings();
document.getElementById('action').onclick=interact;document.getElementById('inventory').onclick=inventory;document.getElementById('panelClose').onclick=()=>document.getElementById('panel').classList.add('hidden');
document.getElementById('exit').onclick=()=>{save();if(history.length>1)history.back();else location.href='hub.html'};
window.addEventListener('keydown',e=>{const k=e.key.length===1?e.key.toLowerCase():e.key;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(k))e.preventDefault();keys.add(k);if(k.toLowerCase()==='e')interact();if(k.toLowerCase()==='i')inventory()});window.addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));window.addEventListener('blur',()=>keys.clear());
window.addEventListener('contextmenu',e=>e.preventDefault());window.addEventListener('selectstart',e=>e.preventDefault());window.addEventListener('resize',resize);
window.ApocalypseGame=Object.freeze({getWrecks:()=>wrecks.map(v=>v.done),getQuest:()=>state.quest,getDay:()=>state.day});setupJoystick();daily();resize();save();requestAnimationFrame(loop);
})();