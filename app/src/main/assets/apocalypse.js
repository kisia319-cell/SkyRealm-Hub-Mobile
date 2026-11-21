(()=>{
'use strict';
const canvas=document.getElementById('world'),ctx=canvas.getContext('2d');
const STORE='skyrealm_apocalypse_mobile_v1';
const saved=(()=>{try{return JSON.parse(localStorage.getItem(STORE)||'{}')}catch(_){return {}}})();
const appearance=(()=>{try{return JSON.parse(localStorage.getItem('skyrealm_character_v1')||'{}')}catch(_){return {}}})();
const colors={skin:appearance.skin||'#e8b88c',hair:appearance.hair||'#352d3d',armor:appearance.armor||'#526fba',accent:appearance.accent||'#9cb9ff',eye:appearance.eye||'#26334c'};
const state={x:saved.x||440,y:saved.y||380,hp:saved.hp??100,scrap:saved.scrap||0,bandage:saved.bandage||0,food:saved.food||0,day:saved.day||1,quest:saved.quest||0,lastDay:saved.lastDay||new Date().toDateString(),talked:false};
const keys=new Set();let w=0,h=0,dpr=1,time=0,toastTimer=0,dialogMode='intro';
const mark={x:590,y:390,phase:0};
const wrecks=[{x:290,y:260,done:false},{x:760,y:250,done:false},{x:850,y:560,done:false},{x:300,y:600,done:false},{x:620,y:650,done:false}];
wrecks.forEach((v,i)=>{if(saved.wrecks?.[i])v.done=true});
function save(){localStorage.setItem(STORE,JSON.stringify({...state,wrecks:wrecks.map(v=>v.done)}));}
function resize(){dpr=Math.min(devicePixelRatio||1,1.5);w=innerWidth;h=innerHeight;canvas.width=Math.floor(w*dpr);canvas.height=Math.floor(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)}
function toast(t){const e=document.getElementById('toast');e.textContent=t;e.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove('show'),1900)}
function rect(x,y,a,b,c){ctx.fillStyle=c;ctx.fillRect(x,y,a,b)}
function ground(){rect(0,0,w,h,'#526448');for(let y=0;y<h;y+=32)for(let x=0;x<w;x+=32){const n=((x*17+y*31)%23);rect(x+n%19,y+(n*3)%23,2,2,'#82906a66')}
 // broken asphalt road
 rect(0,h*.43,w,72,'#454944');rect(0,h*.43+4,w,2,'#77796b');for(let x=0;x<w;x+=85){rect(x,h*.43+34,34,3,'#b8aa7c88')}
 // gravel patches and ash
 for(let i=0;i<90;i++){const x=(i*137)%w,y=(i*83)%h;rect(x,y,2+(i%4),1+(i%2),i%3?'#393d35':'#aaa28a55')}
}
function pole(x,y){rect(x-3,y-55,6,65,'#51483a');rect(x-19,y-53,38,4,'#655a48');ctx.strokeStyle='#252c28';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-19,y-53);ctx.quadraticCurveTo(x,y-28,x+22,y-53);ctx.stroke();ctx.fillStyle='#d1b989';ctx.fillRect(x-3,y-57,6,5)}
function car(x,y,scale=1,angle=0){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(scale,scale);ctx.fillStyle='#171c1b88';ctx.fillRect(-42,16,92,12);ctx.fillStyle='#555b55';ctx.fillRect(-44,-7,88,27);ctx.fillStyle='#343b38';ctx.fillRect(-25,-21,48,18);ctx.fillStyle='#7b8076';ctx.fillRect(-22,-19,18,14);ctx.fillStyle='#272e2b';ctx.fillRect(1,-19,17,14);ctx.fillStyle='#202522';ctx.fillRect(-32,13,16,10);ctx.fillRect(22,13,16,10);ctx.fillStyle='#9c7651';ctx.fillRect(-48,-12,22,7);ctx.fillStyle='#aeb7ad';ctx.fillRect(-12,-27,26,5);ctx.strokeStyle='#242a27';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-42,-7);ctx.lineTo(-22,-20);ctx.lineTo(-8,-7);ctx.stroke();ctx.fillStyle='#c2d2c8aa';ctx.beginPath();ctx.moveTo(-22,-18);ctx.lineTo(-8,-8);ctx.lineTo(-19,-8);ctx.closePath();ctx.fill();ctx.restore()}
function smoke(x,y){for(let i=0;i<4;i++){const yy=(time*.018+i*.24)%1;ctx.globalAlpha=(1-yy)*.22;ctx.fillStyle='#c5c5b8';ctx.beginPath();ctx.arc(x+Math.sin(time*.0007+i)*9,y-yy*42,5+yy*10,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1}
function tree(x,y){rect(x-5,y-27,10,34,'#554331');ctx.fillStyle='#354c38';ctx.beginPath();ctx.arc(x,y-31,19,0,7);ctx.fill();ctx.fillStyle='#526746';ctx.beginPath();ctx.arc(x-8,y-38,11,0,7);ctx.fill()}
function player(){const bob=Math.sin(time*.012)*2,walk=(Math.abs(state.x-state.px||0)+Math.abs(state.y-state.py||0))>.1;ctx.save();ctx.translate(w/2,h/2+bob); // same palette values as saved SkyRealm avatar
ctx.fillStyle='#18251d66';ctx.beginPath();ctx.ellipse(0,15,12,5,0,0,7);ctx.fill();
rect(-8,-3,16,18,colors.armor);rect(-7,13,6,12,'#344253');rect(2,13,6,12,'#344253');
const swing=walk?Math.sin(time*.018)*4:Math.sin(time*.003)*1.5;ctx.save();ctx.translate(-8,1);ctx.rotate(swing*.04);rect(-3,0,5,14,colors.skin);ctx.restore();ctx.save();ctx.translate(8,1);ctx.rotate(-swing*.04);rect(-2,0,5,14,colors.skin);ctx.restore();
ctx.fillStyle=colors.skin;ctx.beginPath();ctx.arc(0,-12,9,0,7);ctx.fill();rect(-9,-18,18,7,colors.hair);rect(-9,-13,4,7,colors.hair);rect(5,-13,4,7,colors.hair);rect(-5,-12,2,2,colors.eye);rect(3,-12,2,2,colors.eye);rect(-6,-2,12,3,colors.accent);ctx.restore()}
function draw(){ctx.clearRect(0,0,w,h);ctx.save();ctx.translate(w/2-state.x,h/2-state.y);ground();for(let i=0;i<11;i++){const x=i*125+40,y=85+(i%3)*75;tree(x,y)}pole(150,360);pole(430,360);pole(720,360);pole(990,360);car(290,260,1.2,-.08);car(760,250,.92,.04);car(850,560,1.15,.12);car(300,600,.8,-.15);car(620,650,1,.02);wrecks.forEach(v=>{if(!v.done){ctx.strokeStyle='#c8a46c';ctx.lineWidth=2;ctx.beginPath();ctx.arc(v.x,v.y,16+Math.sin(time*.004)*2,0,7);ctx.stroke()} });smoke(760,238);smoke(296,244);
 // Mark survivor with olive jacket and cap
ctx.fillStyle='#161e19';ctx.beginPath();ctx.ellipse(mark.x,mark.y+15,13,5,0,0,7);ctx.fill();rect(mark.x-8,mark.y-1,16,19,'#69714c');rect(mark.x-7,mark.y+16,5,11,'#343b31');rect(mark.x+2,mark.y+16,5,11,'#343b31');ctx.fillStyle='#d4a77d';ctx.beginPath();ctx.arc(mark.x,mark.y-12,8,0,7);ctx.fill();rect(mark.x-9,mark.y-19,18,6,'#45463a');rect(mark.x-4,mark.y-12,2,2,'#222');rect(mark.x+3,mark.y-12,2,2,'#222');ctx.fillStyle='#e9d0a0';ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillText('Марк',mark.x,mark.y-31);
wrecks.forEach(v=>{if(!v.done){ctx.fillStyle='#e2c78b';ctx.font='10px system-ui';ctx.textAlign='center';ctx.fillText('E · детали',v.x,v.y-23)}});ctx.restore();player();updateHud()}
function updateHud(){document.getElementById('health').textContent='❤ '+state.hp+' / 100';document.getElementById('day').textContent='День '+state.day+' · Поселение';document.getElementById('questProgress').textContent='Детали: '+state.quest+' / 3'}
function interact(){let wx=state.x,wy=state.y;if(Math.hypot(wx-mark.x,wy-mark.y)<62){openMark();return}let near=wrecks.find(v=>!v.done&&Math.hypot(wx-v.x,wy-v.y)<58);if(near){near.done=true;state.quest++;state.scrap++;toast('Найдены детали: '+state.quest+'/3');save();return}toast('Рядом нечего использовать.')}
function openPanel(title,body,items=[]){document.getElementById('panelTitle').textContent=title;document.getElementById('panelText').textContent=body;const box=document.getElementById('items');box.innerHTML='';items.forEach(s=>{const e=document.createElement('span');e.className='item';e.textContent=s;box.appendChild(e)});document.getElementById('panel').classList.remove('hidden')}
function openMark(){if(state.quest>=3){if(state.dayReward!==state.day){state.scrap=Math.max(0,state.scrap-3);state.bandage+=2;state.food+=1;state.dayReward=state.day;state.quest=0;wrecks.forEach(v=>{if(Math.random()<.65)v.done=false});save();openPanel('Марк', 'Отличная работа. Забирай припасы: две аптечки и консервы. Завтра будет новое поручение.', ['Аптечка ×2','Консервы ×1']);}else openPanel('Марк','На сегодня поручение выполнено. Отдохни, завтра будут новые задачи.',[]);return}
openPanel('Марк',state.talked?'Нужно собрать три детали с разбитых машин. Ищи жёлтые метки возле обломков.':'Ты живой? Хорошо. Я Марк. Мы держимся здесь, но припасы заканчиваются. Собери 3 детали с машин — я обменяю их на аптечки и еду.', ['Задание: детали '+state.quest+'/3','Награда: аптечки ×2 + еда']);state.talked=true;save()}
function inventory(){openPanel('Рюкзак','Предметы сохраняются отдельно от обычного SkyRealm.', ['Металлолом ×'+state.scrap,'Аптечки ×'+state.bandage,'Консервы ×'+state.food])}
function move(dt){const speed=145;let dx=0,dy=0;if(keys.has('ArrowUp')||keys.has('w'))dy--;if(keys.has('ArrowDown')||keys.has('s'))dy++;if(keys.has('ArrowLeft')||keys.has('a'))dx--;if(keys.has('ArrowRight')||keys.has('d'))dx++;if(dx||dy){const l=Math.hypot(dx,dy);state.x+=dx/l*speed*dt;state.y+=dy/l*speed*dt;state.x=Math.max(35,Math.min(1100,state.x));state.y=Math.max(55,Math.min(760,state.y));}}
let prev=performance.now();function loop(now){const dt=Math.min(.04,(now-prev)/1000);prev=now;time=now;move(dt);draw();requestAnimationFrame(loop)}
function daily(){const today=new Date().toDateString();if(state.lastDay!==today){state.day++;state.quest=0;state.dayReward=null;state.lastDay=today;wrecks.forEach(v=>v.done=false);save()}}
document.getElementById('start').onclick=()=>{document.getElementById('dialogue').classList.add('hidden');paused=false;canvas.focus()};
document.getElementById('action').onclick=interact;document.getElementById('inventory').onclick=inventory;document.getElementById('panelClose').onclick=()=>document.getElementById('panel').classList.add('hidden');document.getElementById('exit').onclick=()=>{save();if(history.length>1)history.back();else location.href='hub.html'};
window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();keys.add(e.key);if(e.key.toLowerCase()==='e')interact();if(e.key.toLowerCase()==='i')inventory()});window.addEventListener('keyup',e=>keys.delete(e.key));document.querySelectorAll('[data-key]').forEach(b=>{const k=b.dataset.key;b.addEventListener('pointerdown',e=>{e.preventDefault();keys.add(k)});['pointerup','pointercancel','pointerleave'].forEach(t=>b.addEventListener(t,()=>keys.delete(k)))});
window.addEventListener('resize',resize);daily();resize();save();requestAnimationFrame(loop);
})();