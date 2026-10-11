'use strict';
// ---------- рендер, игрок, меню ----------
let scene,camera,renderer,root=null,hand;
const canvas=document.getElementById('c');
const pl={x:0,z:0,y:1.6,yaw:0,pitch:0,bob:0,vis:new Set()};
const keys={};let locked=false,bigMap=false;

function initRenderer(){
  renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(S.fov,innerWidth/innerHeight,.05,3200);scene.add(camera);
  hand=new THREE.PointLight(0xffc890,0,8,2);hand.position.set(.25,-.2,-.3);camera.add(hand);
  onResize();addEventListener('resize',onResize)}
function onResize(){renderer.setPixelRatio(1/S.pix);renderer.setSize(innerWidth,innerHeight,false);
  camera.aspect=innerWidth/innerHeight;camera.fov=S.fov;camera.updateProjectionMatrix()}

function disposeTree(o){o.traverse(c=>{if(c.geometry)c.geometry.dispose();if(c.material&&c.material!==W.shared)[].concat(c.material).forEach(m=>m.dispose())})}

function build(){
  if(root){scene.remove(root);disposeTree(root)}
  TH=THEMES[game.theme];setSeed(game.seed*977+game.size*13+Object.keys(THEMES).indexOf(game.theme));
  W={A:.85,cull:[],lights:[],tall:[]};root=new THREE.Group();scene.add(root);
  buildLayout(game.size);
  const m=themeMats();
  buildWalls(root,m);buildFloorCeil(root,m);buildEnv(root,m);buildDecor(root,m);buildProps(root);buildLights(root);buildExit(root);buildFx(root);sndTheme();
  W.pool=[];for(let i=0;i<6;i++){const l=new THREE.PointLight(TH.lightCol||0xffa050,0,TH.torch==='candle'?6:9,2);root.add(l);W.pool.push(l)}
  if(TH.hand){hand.color.set(TH.hand[0]);hand.intensity=TH.hand[1];hand.distance=TH.hand[2]}else hand.intensity=0;
  pl.x=W.start.x;pl.z=W.start.z;pl.yaw=W.start.yaw;pl.pitch=0;pl.vis=new Set();pl.y=floorH(pl.x,pl.z)+1.6;
  document.getElementById('loc').textContent=TH.name+' · уровень '+game.level;
  drawMap(true)}

// ---------- движение и столкновения ----------
const RAD=.28;
function freeR(x,z,r){if(blocked(x,z))return false;
  for(let i=0;i<8;i++){const a=i*Math.PI/4;if(blocked(x+Math.cos(a)*r,z+Math.sin(a)*r)||blocked(x+Math.cos(a)*r*.5,z+Math.sin(a)*r*.5))return false}return true}
const free=(x,z)=>freeR(x,z,RAD);
function step(dt){
  const f=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0),s=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0);
  const run=keys.ShiftLeft||keys.ShiftRight,sp=(run?5.2:3)*dt;let mx=0,mz=0;
  if(f||s){const l=Math.hypot(f,s);mx=(-Math.sin(pl.yaw)*f+Math.cos(pl.yaw)*s)/l*sp;mz=(-Math.cos(pl.yaw)*f-Math.sin(pl.yaw)*s)/l*sp}
  if(mx&&free(pl.x+mx,pl.z))pl.x+=mx;if(mz&&free(pl.x,pl.z+mz))pl.z+=mz;
  const moving=!!(f||s),ph=Math.floor(pl.bob/Math.PI);pl.bob+=moving?dt*(run?11:7.5):0;
  if(moving&&Math.floor(pl.bob/Math.PI)!==ph)sndStep(run);
  const ty=floorH(pl.x,pl.z)+1.6;pl.y+=(ty-pl.y)*Math.min(1,dt*10);
  const bob=S.bob&&moving?Math.sin(pl.bob)*.045:0;
  camera.position.set(pl.x,pl.y+bob,pl.z);camera.rotation.set(pl.pitch,pl.yaw,0,'YXZ');
  const g=toGrid(pl.x,pl.z),ci=Math.floor(g[0]),cj=Math.floor(g[1]),n=W.n;
  if(ci>=0&&cj>=0&&ci<n&&cj<n&&!pl.vis.has(ci*n+cj)){pl.vis.add(ci*n+cj);drawMap()}
  if(g[0]<-.4||g[1]<-.4||g[0]>n+.4||g[1]>n+.4){game.level++;game.seed++;build();sndLevel();toast('Выход найден! Уровень '+game.level)}}

let lastPool=0;
function animate(t,dt){
  if(W.sky)W.sky.position.copy(camera.position);
  // дальние чанки кладки не рисуем: в помещениях их всё равно скрывает туман
  const far=TH.indoor?TH.fog[1]+2:60,cp=camera.position;
  for(const m of W.cull){const c=m.userData.c;m.visible=Math.hypot(c.x-cp.x,c.z-cp.z)-m.userData.r<far}
  // ближайшие огни получают настоящие источники
  if(t-lastPool>.15){lastPool=t;const L=W.lights.slice().sort((a,b)=>Math.hypot(a.x-pl.x,a.z-pl.z)-Math.hypot(b.x-pl.x,b.z-pl.z));
    W.pool.forEach((p,i)=>{p.userData.l=L[i]||null;if(L[i])p.position.set(L[i].x,L[i].y,L[i].z)})}
  for(const l of W.lights){const fl=.85+.1*Math.sin(t*13+l.ph)+.06*Math.sin(t*31+l.ph*2);l.spr.scale.set(.22*l.k*(2-fl),.4*l.k*fl,1);l.fl=fl;
    l.glow.material.opacity=.7+.3*fl}
  W.pool.forEach(p=>{const l=p.userData.l;p.intensity=l?(TH.torch==='candle'?.9:1.5)*l.fl:0});
  if(W.exitSpr){const k=3.2+.3*Math.sin(t*2.2);W.exitSpr.scale.set(k,k,1);W.exitBeam.rotation.y=t*.3}
  const fx=W.fx,p=fx.pts.geometry.attributes.position,a=p.array,R=fx.R,top=TH.indoor?TH.H+.5:12;
  for(let i=0;i<a.length;i+=3){
    if(fx.type==='snow'){a[i+1]-=dt*1.3;a[i]+=Math.sin(t+i)*dt*.3}
    else if(fx.type==='pollen'){a[i+1]+=Math.sin(t*.7+i)*dt*.15;a[i]+=dt*.25;a[i+2]+=Math.cos(t*.5+i)*dt*.1}
    else{a[i+1]-=dt*.03;a[i]+=Math.sin(t*.3+i)*dt*.05}
    if(a[i+1]<0)a[i+1]+=top;if(a[i+1]>top)a[i+1]-=top;
    const dx=a[i]-pl.x,dz=a[i+2]-pl.z;if(dx>R)a[i]-=2*R;if(dx<-R)a[i]+=2*R;if(dz>R)a[i+2]-=2*R;if(dz<-R)a[i+2]+=2*R}
  p.needsUpdate=true;sndUpdate(dt)}

// ---------- миникарта ----------
const mapC=document.getElementById('map'),mctx=mapC.getContext('2d');
function drawMap(){if(!W||!W.M)return;const big=bigMap,sz=big?Math.min(innerWidth,innerHeight)*.8:170;
  mapC.width=mapC.height=sz;mapC.className=big?'big':'';const n=W.n,k=sz/(n+1),o=k/2,M=W.M;
  mctx.fillStyle='rgba(10,8,6,.72)';mctx.fillRect(0,0,sz,sz);
  mctx.fillStyle='rgba(200,180,140,.18)';for(const c of pl.vis){const i=Math.floor(c/n),j=c%n;mctx.fillRect(o+i*k,o+j*k,k,k)}
  mctx.strokeStyle='#d8c8a0';mctx.lineWidth=Math.max(1.5,k*.12);mctx.lineCap='round';mctx.beginPath();
  const vis=(i,j)=>pl.vis.has(i*n+j);
  for(let i=0;i<=n;i++)for(let j=0;j<n;j++)if(M.V[i][j]&&((i>0&&vis(i-1,j))||(i<n&&vis(i,j)))){mctx.moveTo(o+i*k,o+j*k);mctx.lineTo(o+i*k,o+(j+1)*k)}
  for(let i=0;i<n;i++)for(let j=0;j<=n;j++)if(M.Hh[i][j]&&((j>0&&vis(i,j-1))||(j<n&&vis(i,j)))){mctx.moveTo(o+i*k,o+j*k);mctx.lineTo(o+(i+1)*k,o+j*k)}
  mctx.stroke();
  const e=W.exitCell;if(vis(e.i,e.j)){mctx.fillStyle='#9fd0ff';mctx.beginPath();mctx.arc(o+(e.i+.5+e.di*.6)*k,o+(e.j+.5+e.dj*.6)*k,k*.25,0,7);mctx.fill()}
  const g=toGrid(pl.x,pl.z);mctx.save();mctx.translate(o+g[0]*k,o+g[1]*k);mctx.rotate(-pl.yaw);mctx.fillStyle='#ffcc66';
  mctx.beginPath();mctx.moveTo(0,-k*.35);mctx.lineTo(k*.22,k*.25);mctx.lineTo(-k*.22,k*.25);mctx.fill();mctx.restore()}

// ---------- интерфейс ----------
const $=id=>document.getElementById(id);
let toastT=0;function toast(s){const t=$('toast');t.textContent=s;t.style.opacity=1;clearTimeout(toastT);toastT=setTimeout(()=>t.style.opacity=0,2200)}
function showMenu(id){$('ui').style.display='flex';['main','play','set'].forEach(s=>$('scr-'+s).classList.toggle('hidden',s!==id));
  $('btnResume').classList.toggle('hidden',!game.started)}
function hideMenu(){$('ui').style.display='none';canvas.requestPointerLock&&canvas.requestPointerLock()}
function initUI(){
  const maps=$('maps');
  for(const [k,t] of Object.entries(THEMES)){const b=document.createElement('button');b.className='map'+(k===game.theme?' sel':'');b.dataset.k=k;
    b.innerHTML=`<i style="background:linear-gradient(135deg,${t.sw[0]},${t.sw[1]})"></i><b>${t.name}</b><span>${t.desc}</span>`;
    b.onclick=()=>{game.theme=k;maps.querySelectorAll('.map').forEach(x=>x.classList.toggle('sel',x===b))};maps.appendChild(b)}
  const bind=(id,key,fmt,num=true)=>{const el=$(id),v=$(id+'V');el.value=S[key];if(v)v.textContent=fmt(S[key]);
    el.oninput=()=>{S[key]=num?+el.value:el.value;if(v)v.textContent=fmt(S[key]);saveSet();onResize()}};
  bind('size','size',v=>v+'×'+v);bind('vol','vol',v=>Math.round(v*100)+'%');$('vol').addEventListener('input',sndVol);bind('sens','sens',v=>(+v).toFixed(2));bind('fov','fov',v=>v+'°');bind('pix','pix',v=>v+'px');
  $('cap').value=S.cap;$('cap').onchange=()=>{S.cap=+$('cap').value;saveSet()};
  for(const k of ['showfps','bob','invert']){$(k).checked=S[k];$(k).onchange=()=>{S[k]=$(k).checked;saveSet();$('fps').style.display=S.showfps?'block':'none'}}
  $('fps').style.display=S.showfps?'block':'none';
  $('btnPlay').onclick=()=>showMenu('play');$('btnSet').onclick=()=>showMenu('set');
  document.querySelectorAll('[data-back]').forEach(b=>b.onclick=()=>showMenu('main'));
  $('btnResume').onclick=()=>{audioInit();hideMenu()};
  document.querySelectorAll('#ui button').forEach(b=>b.addEventListener('click',()=>{audioInit();sndClick()}));
  $('btnStart').onclick=()=>{S.theme=game.theme;game.size=S.size;saveSet();game.level=1;game.seed=(Math.random()*1e6)|0;audioInit();build();game.started=true;hideMenu();toast(TH.name)};
  addEventListener('keydown',e=>{keys[e.code]=true;if(!game.started||$('ui').style.display!=='none')return;
    if(e.code==='KeyM'){bigMap=!bigMap;drawMap()}
    if(e.code==='KeyR'){game.seed++;build();toast('Новый лабиринт')}});
  addEventListener('keyup',e=>keys[e.code]=false);
  addEventListener('blur',()=>{for(const k in keys)keys[k]=false});
  document.addEventListener('mousemove',e=>{if(!locked)return;const k=.0022*S.sens;pl.yaw-=e.movementX*k;pl.pitch=clamp(pl.pitch-e.movementY*k*(S.invert?-1:1),-1.45,1.45)});
  document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===canvas;if(!locked&&game.started)showMenu('main')});
  canvas.addEventListener('click',()=>{if(game.started&&!locked&&$('ui').style.display==='none')canvas.requestPointerLock()})}

// ---------- цикл ----------
let last=performance.now(),acc=0,fpsN=0,fpsT=0;
function loop(now){requestAnimationFrame(loop);
  if(S.cap>0&&now-last<1000/S.cap-1)return;
  const dt=Math.min(.05,(now-last)/1000);last=now;
  if(game.started&&W){if($('ui').style.display==='none')step(dt);else camera.position.set(pl.x,pl.y,pl.z);animate(now/1000,dt);renderer.render(scene,camera)}
  fpsN++;if(now-fpsT>500){$('fps').textContent=Math.round(fpsN*1000/(now-fpsT))+' FPS';fpsN=0;fpsT=now}}

initRenderer();initUI();showMenu('main');requestAnimationFrame(loop);
