(()=>{'use strict';
const $=id=>document.getElementById(id),mobile=()=>/Android|iPhone|iPad|iPod/i.test(navigator.userAgent||'');
let canvas,gl,program,meshes={},raf=0,mode='idle',activeScene='intro',started=0,last=0,audio=null,audioNodes=[],failed=false;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t,smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
const VS='attribute vec3 p;attribute vec3 n;uniform mat4 mvp;uniform mat4 model;uniform vec3 light;varying float shade;varying float depth;varying vec3 worldPos;varying vec3 localPos;void main(){vec4 q=mvp*vec4(p,1.0);gl_Position=q;vec3 nn=normalize(mat3(model)*n);shade=.24+.76*max(dot(nn,normalize(light)),0.0);depth=q.w;worldPos=(model*vec4(p,1.0)).xyz;localPos=p;}';
const FS='precision mediump float;uniform vec4 color;uniform vec3 fog;uniform float uTime;varying float shade;varying float depth;varying vec3 worldPos;varying vec3 localPos;float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(hash(i),hash(i+vec3(1.,0.,0.)),f.x),mix(hash(i+vec3(0.,1.,0.)),hash(i+vec3(1.,1.,0.)),f.x),f.y),mix(mix(hash(i+vec3(0.,0.,1.)),hash(i+vec3(1.,0.,1.)),f.x),mix(hash(i+vec3(0.,1.,1.)),hash(i+vec3(1.,1.,1.)),f.x),f.y),f.z);}void main(){float grain=noise3(worldPos*5.2)*.12+noise3(worldPos*18.0)*.055;float stain=noise3(worldPos*1.35);float f=smoothstep(58.0,155.0,depth);vec3 tex=color.rgb*(.83+grain+stain*.12);gl_FragColor=vec4(mix(tex*shade,fog,f),color.a);}';
function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}
function mesh(data){let p=gl.createBuffer(),n=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,p);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data.p),gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,n);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data.n),gl.STATIC_DRAW);return{p,n,count:data.p.length/3}}
function cube(){let p=[],n=[],f=[[[0,0,1],[[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]]],[[0,0,-1],[[.5,-.5,-.5],[-.5,-.5,-.5],[-.5,.5,-.5],[.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5]]],[[1,0,0],[[.5,-.5,.5],[.5,-.5,-.5],[.5,.5,-.5],[.5,-.5,.5],[.5,.5,-.5],[.5,.5,.5]]],[[-1,0,0],[[-.5,-.5,-.5],[-.5,-.5,.5],[-.5,.5,.5],[-.5,-.5,-.5],[-.5,.5,.5],[-.5,.5,-.5]]],[[0,1,0],[[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5],[-.5,.5,.5],[.5,.5,-.5],[-.5,.5,-.5]]],[[0,-1,0],[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,.5]]]];for(let face of f)for(let v of face[1]){p.push(...v);n.push(...face[0])}return{p,n}}
function sphere(){let p=[],n=[],lat=18,lon=24;for(let y=0;y<lat;y++)for(let x=0;x<lon;x++){let a=y*Math.PI/lat,b=(y+1)*Math.PI/lat,c=x*2*Math.PI/lon,d=(x+1)*2*Math.PI/lon,v=(u,w)=>[Math.sin(u)*Math.cos(w),Math.cos(u),Math.sin(u)*Math.sin(w)];for(let q of [v(a,c),v(b,c),v(b,d),v(a,c),v(b,d),v(a,d)]){p.push(...q);n.push(...q)}}return{p,n}}
function cylinder(){let p=[],n=[],steps=12;for(let i=0;i<steps;i++){let a=i*2*Math.PI/steps,b=(i+1)*2*Math.PI/steps,A=[Math.cos(a),-.5,Math.sin(a)],B=[Math.cos(b),-.5,Math.sin(b)],C=[Math.cos(b),.5,Math.sin(b)],D=[Math.cos(a),.5,Math.sin(a)],na=[Math.cos(a),0,Math.sin(a)],nb=[Math.cos(b),0,Math.sin(b)];for(let [v,k] of [[A,na],[B,nb],[C,nb],[A,na],[C,nb],[D,na]]){p.push(...v);n.push(...k)}}return{p,n}}
function organicLimb(){const p=[],n=[],rings=14,steps=16;for(let j=0;j<rings-1;j++){const v0=j/(rings-1),v1=(j+1)/(rings-1),r0=.018+.205*Math.pow(Math.max(0,Math.sin(Math.PI*v0)),.62),r1=.018+.205*Math.pow(Math.max(0,Math.sin(Math.PI*v1)),.62);for(let i=0;i<steps;i++){const a=i*2*Math.PI/steps,b=(i+1)*2*Math.PI/steps;for(const [v,ang,r] of [[v0,a,r0],[v1,a,r1],[v1,b,r1],[v0,a,r0],[v1,b,r1],[v0,b,r0]]){const yy=v-.5,nn=[Math.cos(ang),.18*Math.cos(Math.PI*v),Math.sin(ang)],nl=Math.hypot(...nn)||1;p.push(Math.cos(ang)*r,yy,Math.sin(ang)*r);n.push(nn[0]/nl,nn[1]/nl,nn[2]/nl)}}}return{p,n}}
function init(){if(failed)return false;canvas=$('cine3D');if(!canvas)return false;try{gl=canvas.getContext('webgl',{alpha:false,antialias:!mobile(),depth:true,powerPreference:'low-power'})||canvas.getContext('experimental-webgl');if(!gl)throw Error('WebGL недоступен');program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,VS));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,FS));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);for(let k of ['p','n'])program[k]=gl.getAttribLocation(program,k);for(let k of ['mvp','model','color','light','fog','uTime'])program[k]=gl.getUniformLocation(program,k);meshes={cube:mesh(cube()),sphere:mesh(sphere()),cylinder:mesh(cylinder()),organic:mesh(organicLimb())};gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);$('introCinematic').classList.add('webgl-active');return true}catch(e){failed=true;console.warn('3D cinematic fallback',e);return false}}
const I=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
function mul(a,b){let o=new Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o}
function tr(x,y,z){let m=I();m[12]=x;m[13]=y;m[14]=z;return m}
function sc(x,y,z){let m=I();m[0]=x;m[5]=y;m[10]=z;return m}
function rx(a){let m=I(),c=Math.cos(a),s=Math.sin(a);m[5]=c;m[6]=s;m[9]=-s;m[10]=c;return m}
function ry(a){let m=I(),c=Math.cos(a),s=Math.sin(a);m[0]=c;m[2]=-s;m[8]=s;m[10]=c;return m}
function rz(a){let m=I(),c=Math.cos(a),s=Math.sin(a);m[0]=c;m[1]=s;m[4]=-s;m[5]=c;return m}
function model(x,y,z,sx,sy,sz,ax=0,ay=0,az=0){return mul(mul(mul(mul(tr(x,y,z),ry(ay)),rx(ax)),rz(az)),sc(sx,sy,sz))}
function perspective(f,aspect,n,far){let q=1/Math.tan(f/2),nf=1/(n-far),m=new Array(16).fill(0);m[0]=q/aspect;m[5]=q;m[10]=(far+n)*nf;m[11]=-1;m[14]=2*far*n*nf;return m}
function view(e,c){let z=[e[0]-c[0],e[1]-c[1],e[2]-c[2]],l=Math.hypot(...z)||1;z=z.map(v=>v/l);let x=[z[2],0,-z[0]];l=Math.hypot(...x)||1;x=x.map(v=>v/l);let y=[z[1]*x[2]-z[2]*x[1],z[2]*x[0]-z[0]*x[2],z[0]*x[1]-z[1]*x[0]];return[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-x[0]*e[0]-x[1]*e[1]-x[2]*e[2],-y[0]*e[0]-y[1]*e[1]-y[2]*e[2],-z[0]*e[0]-z[1]*e[1]-z[2]*e[2],1]}
let VP=I(),W=1,H=1;
function resize(){if(!canvas||!gl)return;let d=Math.min(devicePixelRatio||1,mobile()?1.15:1.55),w=Math.max(1,Math.floor(canvas.clientWidth*d)),h=Math.max(1,Math.floor(canvas.clientHeight*d));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h)}W=w;H=h}
let sceneClock=0;function draw(kind,m,col,alpha=1){let q=meshes[kind];gl.bindBuffer(gl.ARRAY_BUFFER,q.p);gl.enableVertexAttribArray(program.p);gl.vertexAttribPointer(program.p,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,q.n);gl.enableVertexAttribArray(program.n);gl.vertexAttribPointer(program.n,3,gl.FLOAT,false,0,0);gl.uniformMatrix4fv(program.model,false,new Float32Array(m));gl.uniformMatrix4fv(program.mvp,false,new Float32Array(mul(VP,m)));gl.uniform4f(program.color,col[0],col[1],col[2],alpha);gl.uniform1f(program.uTime,sceneClock);gl.drawArrays(gl.TRIANGLES,0,q.count)}
const box=(x,y,z,sx,sy,sz,c,a=0)=>draw('cube',model(x,y,z,sx,sy,sz,0,0,a),c);
const ball=(x,y,z,sx,sy,sz,c,rz=0,alpha=1)=>draw('sphere',model(x,y,z,sx,sy,sz,0,0,rz),c,alpha);
const tube=(x,y,z,sx,sy,sz,c,rz=0)=>draw('cylinder',model(x,y,z,sx,sy,sz,0,0,rz),c);
let seed=177;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
const city=[];for(let i=0;i<(mobile()?24:40);i++){let side=i%2?1:-1;city.push({x:side*(9+rnd()*34),z:-18-Math.floor(i/2)*8,h:4+rnd()*17,w:3+rnd()*6,d:3+rnd()*5,light:rnd()})}
function helicopter(t,crash){let x=mix(-20,2,crash),y=mix(13,2,crash),z=mix(-5,1,crash),tilt=mix(-.1,.9,crash),rot=t*24;draw('sphere',model(x,y,z,2.2,.68,.9,tilt,.1,0),[.25,.32,.29]);ball(x+1.3,y+.02,z+.1,.85,.55,.7,[.32,.43,.4],tilt);ball(x+1.62,y+.06,z+.12,.5,.38,.53,[.09,.23,.26],tilt);box(x-2.4,y+.05,z,2.3,.18,.2,[.23,.28,.25],tilt);box(x-3.5,y+.3,z,.7,.12,.16,[.38,.4,.33],tilt);tube(x-.15,y+.83,z,.11,.48,.11,[.47,.48,.4]);box(x-.15,y+1.1,z,5,.06,.26,[.65,.63,.52],rot);box(x-.15,y+1.1,z,5,.06,.26,[.65,.63,.52],rot+Math.PI/2);tube(x-3.6,y+.45,z,.07,.35,.07,[.45,.48,.4],Math.PI/2);box(x-3.6,y+.45,z,.08,1.2,.08,[.55,.56,.47],rot*1.6);for(let d of [-1,1])tube(x+d,y-.55,z,.055,.72,.055,[.14,.17,.16],d*.22)}

function limb(x,y,z,sx,sy,sz,c,angle=0){draw('organic',model(x,y,z,sx*2.15,sy*2.0,sz*2.15,0,0,angle),c)}
function drawZombie(x,y,z,t,variant=0,scale=1,phase=0,targetX=null,targetZ=null){
 const id=Math.max(0,Math.min(3,Math.round(phase/1.7))),approach=smooth(clamp((t-(4.5+id*.55))/4.6,0,1)),jumpProgress=clamp((t-(6.2+id*.48))/1.15,0,1),jump=Math.sin(jumpProgress*Math.PI)*1.9,crouch=smooth(clamp((t-(5.35+id*.48))/.35,0,1))*(1-smooth(clamp((t-(6.02+id*.48))/.25,0,1))),land=smooth(clamp((t-(7.45+id*.48))/.55,0,1)),side=x>=0?1:-1,zside=z>=0?1:-1;
 const slotX=targetX===null?side*(1.55+(id%2)*1.15):targetX;
 const slotZ=targetZ===null?zside*(3.7+Math.floor(id/2)*1.35):targetZ;
 x=mix(x,slotX,approach);z=mix(z,slotZ,approach);y+=jump+land*.82-crouch*.22;
 const gait=Math.sin(t*5.1+phase)*(1-approach*.72),swing=Math.sin(t*5.1+phase+.8),reach=approach*.8,skin=variant===1?[.29,.35,.29]:variant===2?[.39,.34,.27]:[.31,.37,.32],cloth=variant===1?[.13,.19,.17]:variant===2?[.23,.14,.12]:[.12,.16,.15],dark=[.055,.07,.062];
 const Y=y+Math.abs(gait)*.045;
 // torn trousers, boots and independently swinging legs
 limb(x-.19*scale,Y+.48*scale,z,.17*scale,.42*scale,.19*scale,cloth,gait*.18);
 limb(x+.19*scale,Y+.48*scale,z,.17*scale,.42*scale,.19*scale,cloth,-gait*.18);
 limb(x-.2*scale,Y+.15*scale,z+.05*scale,.12*scale,.28*scale,.13*scale,skin,gait*.38);
 limb(x+.2*scale,Y+.15*scale,z-.03*scale,.12*scale,.28*scale,.13*scale,skin,-gait*.38);
 box(x-.2*scale,Y-.02*scale,z+.11*scale,.28*scale,.14*scale,.42*scale,dark,gait*.08);
 box(x+.2*scale,Y-.02*scale,z+.11*scale,.28*scale,.14*scale,.42*scale,dark,-gait*.08);
 // rib cage, torn jacket, belt and ripped fabric panels
 ball(x,Y+1.08*scale,z,.39*scale,.52*scale,.25*scale,skin);
 box(x,Y+1.08*scale,z+.025*scale,.58*scale,.58*scale,.39*scale,cloth,gait*.045);
 box(x-.1*scale,Y+.84*scale,z+.23*scale,.2*scale,.22*scale,.035*scale,[.07,.085,.07],-.18);
 box(x+.19*scale,Y+1.05*scale,z+.235*scale,.14*scale,.34*scale,.035*scale,[.26,.22,.17],.16);
 // collar, shoulder joints, forearms and clawed fingers
 ball(x-.38*scale,Y+1.35*scale,z,.19*scale,.2*scale,.2*scale,cloth);
 ball(x+.38*scale,Y+1.35*scale,z,.19*scale,.2*scale,.2*scale,cloth);
 limb(x-.48*scale,Y+1.08*scale,z,gait*.02+.14*scale,.38*scale,.15*scale,skin,-.62+swing*.24-reach);
 limb(x+.48*scale,Y+1.08*scale,z,.15*scale,.38*scale,.15*scale,skin,.62-gait*.24+reach);
 limb(x-.62*scale,Y+.79*scale,z+.03*scale,.12*scale,.24*scale,.12*scale,skin,-.3+swing*.16-reach*.45);
 limb(x+.62*scale,Y+.79*scale,z+.03*scale,.12*scale,.24*scale,.12*scale,skin,.3-gait*.16+reach*.45);
 for(let f=0;f<3;f++){ball(x-.65*scale+(f-1)*.055*scale,Y+.59*scale,z+.07*scale,.035*scale,.12*scale,.035*scale,skin,-.25);ball(x+.65*scale+(f-1)*.055*scale,Y+.59*scale,z+.07*scale,.035*scale,.12*scale,.035*scale,skin,.25)}
 // neck, skull, ears, jaw and messy hair
 tube(x,Y+1.48*scale,z,.11*scale,.22*scale,.11*scale,skin);
 ball(x,Y+1.79*scale,z,.28*scale,.34*scale,.25*scale,skin,Math.sin(t*3.2+phase)*.075+approach*.08);
 ball(x-.28*scale,Y+1.78*scale,z,.07*scale,.12*scale,.08*scale,skin);
 ball(x+.28*scale,Y+1.78*scale,z,.07*scale,.12*scale,.08*scale,skin);
 ball(x,Y+1.61*scale,z+.15*scale,.21*scale,.12*scale,.13*scale,[.19,.12,.1]);
 box(x,Y+1.67*scale,z+.245*scale,.2*scale,.045*scale,.025*scale,[.08,.055,.045]);
 for(let h=0;h<6;h++){ball(x+(h-2.5)*.075*scale,Y+2.02*scale+Math.sin(h*3)*.04*scale,z-.04*scale,.09*scale,.16*scale,.11*scale,[.07,.075,.065],(h-2)*.12)}
 // recessed sockets, glowing infected eyes and uneven teeth
 ball(x-.105*scale,Y+1.83*scale,z+.22*scale,.075*scale,.06*scale,.035*scale,[.055,.035,.03]);
 ball(x+.105*scale,Y+1.83*scale,z+.22*scale,.075*scale,.06*scale,.035*scale,[.055,.035,.03]);
 ball(x-.105*scale,Y+1.83*scale,z+.252*scale,.027*scale,.026*scale,.018*scale,[.92,.18,.055]);
 ball(x+.105*scale,Y+1.83*scale,z+.252*scale,.027*scale,.026*scale,.018*scale,[.92,.18,.055]);
 for(let k=0;k<4;k++)box(x-.09*scale+k*.06*scale,Y+1.58*scale,z+.27*scale,.035*scale,.045*scale,.025*scale,[.72,.67,.52]);
 // wounds and blood-dark stains
 ball(x-.22*scale,Y+1.25*scale,z+.21*scale,.055*scale,.11*scale,.025*scale,[.23,.055,.04]);
 ball(x+.14*scale,Y+1.02*scale,z+.23*scale,.075*scale,.045*scale,.02*scale,[.19,.045,.035]);
}
function rotorBlade(x,y,z,angle,length,width,color){box(x,y,z,length,.055,width,color,angle)}
function drawHelicopter(x,y,z,t,damage=0){
 const bank=-.12+damage*.8,rot=t*17;
 // fuselage, tail boom and tapered nose
 ball(x,y,z,2.2,.7,.88,[.19,.25,.23],bank);
 ball(x+1.45,y-.02,z+.02,.95,.52,.67,[.25,.32,.29],bank);
 ball(x+1.88,y+.02,z+.02,.55,.37,.55,[.11,.2,.21],bank);
 // cockpit glazing, side windows and door frames
 for(let side of [-1,1]){
  ball(x+1.35,y+.2,z+side*.48,.53,.31,.045,[.055,.17,.2],bank);
  ball(x+.48,y+.2,z+side*.62,.42,.3,.035,[.07,.19,.2],bank);
  box(x-.35,y+.05,z+side*.68,.75,.62,.045,[.13,.2,.18],bank);
  box(x-.37,y+.06,z+side*.71,.025,.55,.025,[.52,.54,.43],bank);
  box(x-.04,y+.06,z+side*.71,.025,.55,.025,[.52,.54,.43],bank);
  ball(x-.5,y-.18,z+side*.7,.12,.08,.04,[.72,.68,.49]);
  box(x-.65,y-.52,z+side*.75,.9,.09,.09,[.1,.13,.12],bank);
 }
 // tail boom, stabilizer, vertical fin and tail rotor
 tube(x-2.55,y+.18,z,.16,3.2,.16,[.25,.3,.27],Math.PI/2);
 box(x-3.85,y+.38,z,.9,.1,1.55,[.2,.26,.22],bank);
 box(x-4.05,y+.78,z,.3,1.05,.12,[.2,.25,.22],bank);
 tube(x-4.1,y+.55,z,.09,.32,.09,[.54,.56,.48],Math.PI/2);
 rotorBlade(x-4.1,y+.55,z,rot*1.7,1.05,.1,[.62,.62,.52]);
 rotorBlade(x-4.1,y+.55,z,rot*1.7+Math.PI/2,1.05,.1,[.62,.62,.52]);
 // main rotor mast, swash plate and two long spinning blades
 tube(x-.12,y+.83,z,.12,.55,.12,[.49,.5,.42]);
 tube(x-.12,y+1.08,z,.28,.09,.28,[.34,.36,.31]);
 rotorBlade(x-.12,y+1.18,z,rot,6.9,.23,[.65,.66,.56]);
 rotorBlade(x-.12,y+1.18,z,rot+Math.PI/2,6.9,.23,[.65,.66,.56]);
 // landing skids and struts
 for(let side of [-1,1]){tube(x-.8,y-.58,z+side*.48,.075,.85,.075,[.12,.15,.14],side*.2);tube(x+.8,y-.58,z+side*.48,.075,.85,.075,[.12,.15,.14],-side*.2);box(x,y-.98,z+side*.48,3.6,.09,.12,[.1,.13,.12],bank)}
 // beacon and damaged engine fire
 ball(x-.1,y+.63,z,.13,.09,.13,[.82,.17,.045],0,.75+.25*Math.sin(t*9));
 if(damage>.3){ball(x+.9,y+.05,z,.32,.36,.31,[1,.24,.045],0,.65+.35*Math.sin(t*13))}
}
function cameraForIntro(t){
 if(t<3){const q=smooth(t/3);return{eye:[mix(-18,-6,q)+Math.sin(t*1.2)*1.1,mix(22,13,q),mix(39,24,q)],target:[0,3,-23]};}
 if(t<6){const q=smooth((t-3)/3);return{eye:[mix(-17,-7,q),mix(9,7,q),mix(13,6,q)],target:[0,3,-20]};}
 if(t<9){const q=smooth((t-6)/3);return{eye:[mix(7,2,q),mix(5,3,q),mix(9,4,q)],target:[1,2,-2]};}
 if(t<12){const q=smooth((t-9)/3);return{eye:[mix(-9,5,q),mix(6,3.2,q),mix(14,7,q)],target:[1,1.5,0]};}
 const q=smooth((t-12)/4);return{eye:[mix(5,2,q),mix(3.2,2.4,q),mix(7,4.2,q)],target:[1,1.3,0]};
}
function cameraForCrash(t){
 if(t<3.5){const q=smooth(t/3.5);return{eye:[mix(-18,-7,q),mix(12,6,q),mix(28,16,q)],target:[0,1,0]};}
 if(t<7){const q=smooth((t-3.5)/3.5);return{eye:[mix(-7,4,q),mix(6,3,q),mix(16,8,q)],target:[1,1,0]};}
 if(t<11){const q=smooth((t-7)/4);return{eye:[mix(4,-3,q),mix(3,2.2,q),mix(8,4,q)],target:[-4,1.5,-1]};}
 const q=smooth((t-11)/5);return{eye:[mix(-3,1,q),mix(2.2,2.7,q),mix(4,6,q)],target:[0,1.5,0]};
}

function renderCrash(t){
 gl.clearColor(.025,.035,.031,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 const approach=smooth(t/10),impact=smooth((t-7.2)/2.4),cam=[mix(-18,-5,approach)+Math.sin(t*.7)*.35,mix(12,5,approach),mix(27,13,approach)];
 const target=[0,1.1,0];VP=mul(perspective(Math.PI/3.2,W/H,.1,150),view(cam,target));
 gl.uniform3f(program.light,-.45,.88,.22);gl.uniform3f(program.fog,.025,.035,.031);
 box(0,-.5,0,110,.8,110,[.105,.13,.105]);
 for(let i=0;i<26;i++){const x=(i%7-3)*11,z=(Math.floor(i/7)-1.5)*14;ball(x,-.1,z,2.5,.6,3,[.13,.16,.13]);box(x+.3,.25,z+.4,1.1,.28,.65,[.19,.21,.17]);}
 // A crashed fixed-wing aircraft, not the helicopter from the opening sequence.
 box(0,1.15,0,8.8,1.05,1.55,[.29,.34,.31],-.17);
 ball(4.15,1.3,.05,1.35,.78,.78,[.39,.45,.4],-.17);
 box(-.25,1.15,-.25,2.2,.48,1.1,[.18,.22,.2],-.25);
 box(-.2,1.05,0,3.2,.22,17,[.35,.39,.34],-.12);
 box(-3.75,1.2,0,1.35,.22,4.4,[.28,.31,.28],-.45);
 box(-4.35,2.2,0,.45,2.4,.48,[.26,.3,.27],-.4);
 box(-4.7,1.15,0,2.8,.18,.55,[.36,.39,.32],-.12);
 // Torn wing, broken tail and exposed engine.
 box(1.6,.85,-5.2,2.2,.18,5.2,[.2,.24,.21],.34);
 tube(3.25,1.2,-.2,.48,1.1,.48,[.16,.19,.17],Math.PI/2);
 ball(3.25,1.2,-.2,.52,.55,.52,[.08,.1,.09]);
 // Flickering fire, drifting smoke and sparks around the fuselage.
 gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
 for(let i=0;i<9;i++){const age=(t*.42+i*.29)%3.2,a=i*2.15+age*.65;ball(1.7+Math.cos(a)*(.45+age*.4),.8+age*1.4,Math.sin(a)*(.5+age*.3),.28+age*.25,.42+age*.35,.28+age*.25,[.17,.19,.17],0,.72-age*.13);}
 for(let i=0;i<15;i++){const a=i*2.4+t*1.2,r=.5+((t+i*.37)%2.8)*.38;ball(1.4+Math.cos(a)*r,.6+((t+i*.37)%2.8),Math.sin(a)*r,.055,.08,.055,[1,.32,.055]);}
 gl.depthMask(true);gl.disable(gl.BLEND);
 const pulse=.65+.35*Math.sin(t*8);tube(-5,1.4,-1,.07,.8,.07,[.38,.4,.31]);ball(-5,2.25,-1,.2,.2,.2,[1,.16,.045],0,pulse);
 // Pilot forces the jammed side door, stumbles out, then is surrounded.
 drawPilot(t);
 const crowdTargets=[[-4.65,3.15],[-2.8,5.15],[-.9,3.35],[.95,5.25]];
 for(let i=0;i<4;i++){
  const side=i%2?1:-1,x=side*(9+Math.max(0,t-4)*.22),z=i<2?-11:11,y=.05;
  const [tx,tz]=crowdTargets[i];
  drawZombie(x,y,z,t,i%3,.9+i*.035,i*1.7,tx,tz);
 }
 // Non-graphic attack staging: bodies close in, camera dips, then the image cuts
 // to smoke and radio static rather than showing explicit gore.
 if(t>12.7){
  const fade=smooth(clamp((t-13.4)/1.8,0,1));
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
  for(let i=0;i<7;i++){const a=i*2.4+t*.12;ball(-2.7+Math.cos(a)*(.55+fade*.35),.15+fade*.5,4.1+Math.sin(a)*(.55+fade*.35),.42,.58,.38,[.08,.11,.09],a,.72);}
  gl.depthMask(true);gl.disable(gl.BLEND);
 }
 if(t>7.4){const flash=Math.max(0,1-Math.abs(t-7.55)*2.5);if(flash>.02){gl.clearColor(.35*flash,.17*flash,.045*flash,1);gl.clear(gl.COLOR_BUFFER_BIT);}}
}
function render(t){sceneClock=t;if(activeScene==='crash'){renderCrash(t);return;}gl.clearColor(.018,.031,.034,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);let shot=cameraForIntro(t);VP=mul(perspective(Math.PI/3.2,W/H,.1,190),view(shot.eye,shot.target));gl.uniform3f(program.light,-.4,.9,.25);gl.uniform3f(program.fog,.018,.031,.034);
box(0,-.55,-35,180,.7,180,[.12,.16,.13]);box(0,-.12,0,10,.08,180,[.07,.08,.075]);for(let z=-85;z<35;z+=10)box(0,-.06,z,.13,.025,4,[.57,.48,.3]);
for(let i=0;i<city.length;i++){let b=city[i];box(b.x,b.h/2-.3,b.z,b.w,b.h,b.d,i%4===0?[.19,.22,.2]:[.105,.14,.13]);box(b.x,b.h+.1,b.z,b.w*.72,.2,b.d*.72,[.23,.25,.2]);for(let r=0;r<Math.min(mobile()?2:5,Math.floor(b.h/3));r++)for(let c=0;c<(mobile()?1:2);c++)if((r+c+i)%3){box(b.x+(c?1:-1)*b.w*.2,1+r*2.5,b.z+b.d/2+.02,.38,.6,.03,b.light>.68?[.86,.55,.25]:[.32,.4,.34])}}
for(let i=0;i<9;i++){let x=-42+i*10;draw('sphere',model(x,1.8,-88+(i%3)*4,12,9,13,0,0,0),[.055,.1,.09])}
for(let i=0;i<7;i++){let x=i%2?6:-6,z=15-i*15;tube(x,3,z,.055,6,.055,[.24,.26,.21]);box(x+.7,5.8,z,.85,.1,.18,[.6,.52,.34]);ball(x+.7,5.7,z,.3,.15,.3,[.9,.65,.32])}
for(let i=0;i<3;i++){let x=(i-1)*7,z=12-i*18;box(x,.55,z,3,.9,5,[.13,.16,.15],.08*i);box(x,1,z,2.6,.13,4,[.25,.27,.23],.08*i)}
if(t<13.2){let c=smooth((t-7.3)/4.8);const hx=mix(-20,2,c),hy=mix(14,2.5,c),hz=mix(-5,1,c);drawHelicopter(hx,hy,hz,t,c)}
// remote ridge beacon / radio tower
tube(-3,2,-7,.09,4,.09,[.32,.36,.31]);box(-3,4.1,-7,1.1,.12,.12,[.5,.48,.37]);ball(-3,4.45,-7,.22,.22,.22,[1,.17,.06]);
if(t>3&&t<9){let pulse=.6+.4*Math.sin(t*15);ball(-3,4.45,-7,.55,.55,.55,[1,.25,.06],0,pulse);box(-3,2,-7,.045,6,.045,[.9,.22,.07])}
let crash=smooth((t-9)/2.5);ball(2,.75,0,1.6,.65,2.2,[.17,.2,.17],.65);box(3.6,.5,-.8,2.4,.28,.28,[.33,.28,.19],-.5);box(.25,.5,1.5,1.6,.24,.3,[.3,.27,.2],.5);ball(2,1.2,0,1.1,.4,1.1,[.95,.24,.04]);ball(2,1.65,0,.68,.75,.68,[1,.52,.1]);box(2,1.1,0,2.7,.12,.35,[.28,.32,.27],.65);
gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
for(let i=0;i<(mobile()?7:12);i++){let age=(t*.3+i*.22)%3,a=i*2.4+age*.8,x=2+Math.cos(a)*(.3+age*.5),y=1.6+age*1.65,z=Math.sin(a)*(.3+age*.5),s=.3+age*.4;ball(x,y,z,s,s*1.25,s,[.16,.19,.18],0,.8-age*.16)}
for(let i=0;i<(mobile()?9:16);i++){let a=i*2.39+t*1.5,r=.4+((t*1.8+i*.4)%3)*.3,y=.8+((t*1.8+i*.4)%3);ball(2+Math.cos(a)*r,y,Math.sin(a)*r,.05,.09,.05,[1,.36,.07])}
if(t>4&&t<11){box(-3,5,-7,1.8,.035,.035,[.95,.72,.36],Math.sin(t*2)*.5);box(-3,5,-7,.035,1.8,.035,[.95,.72,.36],Math.sin(t*2)*.5)}
gl.depthMask(true);gl.disable(gl.BLEND);
if(t>9.5){for(let i=0;i<3;i++){const z=-5+i*4;drawZombie(-5+i*4,.05,z,t,i%3,.88+i*.06,i*2.2)}}if(t>10){let flash=Math.max(0,1-Math.abs(t-10.1)*2);if(flash>.02){gl.clearColor(.25*flash,.16*flash,.08*flash,1);gl.clear(gl.COLOR_BUFFER_BIT)}}
}

let voiceTimers=[],publishedPlayers=[],speechTimers=[];
const publishedSfx={zombieWalk:'https://sfxmint.com/dl/zombie-groan-04.mp3',zombieAttack:'https://sfxmint.com/dl/zombie-groan-01.mp3',helicopter:'https://sfxmint.com/dl/helicopter-10.mp3',footsteps:'https://sfxmint.com/dl/footsteps-gravel-39.mp3',impact:'https://sfxmint.com/dl/impact-explosion-23.mp3'};
function stopRadioDialogue(){
 voiceTimers.forEach(id=>clearTimeout(id));voiceTimers=[];
 speechTimers.forEach(id=>clearTimeout(id));speechTimers=[];
 publishedPlayers.forEach(a=>{try{a.pause();a.currentTime=0}catch(_){}});publishedPlayers=[];
 try{if(window.speechSynthesis)window.speechSynthesis.cancel()}catch(_){}
}
function speakRadio(line,rate=1,pitch=1){
 if(!('speechSynthesis' in window)||!window.SpeechSynthesisUtterance)return;
 try{
  const u=new SpeechSynthesisUtterance(line);u.lang='ru-RU';u.rate=rate;u.pitch=pitch;u.volume=.92;
  const voices=window.speechSynthesis.getVoices()||[];
  const ru=voices.find(v=>/^ru(-|_)/i.test(v.lang))||voices.find(v=>/russian|рус/i.test(v.name));
  if(ru)u.voice=ru;
  window.speechSynthesis.speak(u);
 }catch(e){console.warn('Russian cinematic voice unavailable',e)}
}
function scheduleSpeech(line,at,rate=1,pitch=1){
 const id=setTimeout(()=>speakRadio(line,rate,pitch),at*1000);speechTimers.push(id);
}
function radioDialogue(kind){
 stopRadioDialogue();
 const sequence=kind==='crash'
 ?[[.35,publishedSfx.impact,.8],[1.8,publishedSfx.zombieWalk,.42],[4.7,publishedSfx.footsteps,.55],[7.4,publishedSfx.zombieAttack,.85],[10.4,publishedSfx.zombieAttack,.72],[13.1,publishedSfx.zombieWalk,.45]]
 :[[.25,publishedSfx.helicopter,.58],[4.2,publishedSfx.helicopter,.62],[8.8,publishedSfx.impact,.85],[11.5,publishedSfx.zombieWalk,.42]];
 const schedule=(url,delay,volume)=>{const id=setTimeout(()=>{try{const a=new Audio(url);a.preload='auto';a.volume=volume;a.play().catch(e=>console.warn('published cinematic sound unavailable',e));publishedPlayers.push(a)}catch(e){console.warn('published cinematic sound unavailable',e)}},delay*1000);voiceTimers.push(id)};
 sequence.forEach(([at,url,volume])=>schedule(url,at,volume));
 const lines=kind==='crash'
 ?[[.7,'Диспетчер, ответьте! У нас отказ двигателя!'],[3.8,'Маяк вижу… высота падает!'],[7.9,'Есть кто-нибудь?! Я выбираюсь!'],[9.9,'Нет! Не подходите! А-а-а!'],[12.1,'Помогите! Они здесь!']]
 :[[.65,'База, это борт семь. Над городом нет связи.'],[4.1,'Повторяю, вижу движение на улицах…'],[7.5,'Что это было?! Нас задело!'],[10.7,'Мы падаем! Приготовиться к удару!'],[13.1,'Они идут сюда…']];
 lines.forEach(([at,line])=>scheduleSpeech(line,at,kind==='crash'&&at>9?.94:1,kind==='crash'&&at>9?1.22:0.94));
 if(kind==='crash'){
  scheduleSpeech('А-а-а! Отстаньте!',11.15,.82,1.45);
  scheduleSpeech('Гр-р-р…',13.45,.72,.55);
 }
}
function audioStart(){audioStop();try{let AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;audio=new AC();let master=audio.createGain();master.gain.value=.26;master.connect(audio.destination);audioNodes.push(master);audio.resume();
let osc=(freq,type,volume,when,duration,endFreq)=>{let o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,when);if(endFreq)o.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq),when+duration);g.gain.setValueAtTime(.0001,when);g.gain.exponentialRampToValueAtTime(volume,when+.08);g.gain.setValueAtTime(volume,when+Math.max(.1,duration-.2));g.gain.exponentialRampToValueAtTime(.0001,when+duration);o.connect(g);g.connect(master);o.start(when);o.stop(when+duration+.04);audioNodes.push(o,g)};
let now=audio.currentTime;osc(58,'sawtooth',.055,now,15.5,38);osc(92,'triangle',.035,now,15,48);osc(340,'sine',.028,now+3.1,1.4,190);osc(720,'sine',.035,now+3.8,.18,500);osc(720,'sine',.035,now+4.2,.18,500);osc(110,'sawtooth',.075,now+8.8,2.1,42);osc(44,'sine',.16,now+9.5,2.4,25);osc(880,'sine',.035,now+11.3,.25,620);osc(660,'sine',.035,now+12,.35,430);osc(330,'triangle',.04,now+13.4,1.4,220);
let buffer=audio.createBuffer(1,audio.sampleRate*2,audio.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.7;let noise=audio.createBufferSource(),filter=audio.createBiquadFilter(),ng=audio.createGain();noise.buffer=buffer;noise.loop=true;filter.type='lowpass';filter.frequency.value=600;ng.gain.setValueAtTime(.0001,now);ng.gain.linearRampToValueAtTime(.025,now+2);ng.gain.setValueAtTime(.025,now+15);ng.gain.linearRampToValueAtTime(.0001,now+16);noise.connect(filter);filter.connect(ng);ng.connect(master);noise.start(now);noise.stop(now+16.1);audioNodes.push(noise,filter,ng);
 // Radio squelch bursts, short carrier dropouts and emergency beeps under the dialogue.
 for(let k=0;k<7;k++){const at=now+.45+k*2.15;osc(1550,'sine',.018,at,.055,780);osc(940,'square',.009,at+.09,.035,520)}
 const hiss=audio.createBufferSource(),hp=audio.createBiquadFilter(),hg=audio.createGain();let hb=audio.createBuffer(1,audio.sampleRate*.8,audio.sampleRate),hd=hb.getChannelData(0);for(let i=0;i<hd.length;i++)hd[i]=(Math.random()*2-1)*.45;hiss.buffer=hb;hiss.loop=true;hp.type='highpass';hp.frequency.value=1800;hg.gain.value=.008;hiss.connect(hp);hp.connect(hg);hg.connect(master);hiss.start(now);hiss.stop(now+16);audioNodes.push(hiss,hp,hg);
}catch(e){console.warn('cinematic audio unavailable',e)}}
function audioStop(){stopRadioDialogue();if(audio){try{audioNodes.forEach(n=>{try{if(n.stop)n.stop()}catch(_){}});audio.close()}catch(_){}}audio=null;audioNodes=[]}
function tick(now){if(mode==='idle')return;if(now-last<(mobile()?40:25)){raf=requestAnimationFrame(tick);return}last=now;resize();let t=Math.min(16,(now-started)/1000);render(t);if(t>=16){stop();return}raf=requestAnimationFrame(tick)}
function play(){init();activeScene='intro';mode='intro';started=performance.now();last=0;audioStart();radioDialogue('intro');if(raf)cancelAnimationFrame(raf);if(gl)raf=requestAnimationFrame(tick);return !!gl}
function playCrash(){init();activeScene='crash';mode='crash';started=performance.now();last=0;audioStart();radioDialogue('crash');if(raf)cancelAnimationFrame(raf);if(gl)raf=requestAnimationFrame(tick);return !!gl}
function stop(){mode='idle';if(raf)cancelAnimationFrame(raf);raf=0;stopRadioDialogue();audioStop()}
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});window.addEventListener('resize',resize,{passive:true});
window.ApocalypseCinematic3D=Object.freeze({play,playCrash,stop,available:()=>!!gl});
})();