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
  TH=THEMES[game.theme];setGeom(S.cw);setSeed(game.seed*977+game.size*13+Object.keys(THEMES).indexOf(game.theme));
  W={A:.85,cull:[],lights:[],tall:[]};root=new THREE.Group();scene.add(root);
  buildLayout(Math.min(30,game.size+(game.level-1)*2));   // каждый уровень чуть больше
  const m=themeMats();
  buildWalls(root,m);buildFloorCeil(root,m);buildEnv(root,m);buildDecor(root,m);buildProps(root);buildLights(root);buildExit(root);buildFx(root);buildGameplay(root);sndTheme();
  W.pool=[];for(let i=0;i<3;i++){const l=new THREE.PointLight(TH.lightCol||0xffa050,0,TH.torch==='candle'?6:9,2);root.add(l);W.pool.push(l)}
  if(TH.hand){hand.color.set(TH.hand[0]);hand.intensity=TH.hand[1];hand.distance=TH.hand[2]}else hand.intensity=0;
  bigMap=false;
  pl.x=W.start.x;pl.z=W.start.z;pl.yaw=W.start.yaw;pl.pitch=0;pl.vis=new Set();pl.y=floorH(pl.x,pl.z)+1.6;
  applyDraw();
  document.getElementById('loc').textContent=TH.name+' · уровень '+game.level;
  drawMap(true)}

// дальность прорисовки: туман + отсечение кладки за ним
function applyDraw(){if(!TH||!scene.fog)return;
  const far=TH.indoor?Math.min(S.draw,TH.fog[1]*1.6):S.draw,near=TH.indoor?Math.min(TH.fog[0],far*.3):far*.22;
  scene.fog.near=near;scene.fog.far=far;W.cullFar=far+4;
  if(W.sky)W.sky.material.uniforms.fogK.value=1-sstep(60,520,S.draw)}

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
  const A=W.exitArch,al=(pl.x-A.cx)*A.d[0]+(pl.z-A.cz)*A.d[1],ac=Math.abs((pl.x-A.cx)*A.d[1]-(pl.z-A.cz)*A.d[0]);
  // шагнул в портал выходной арки
  if(al>-.5&&ac<A.w/2&&(!G.gate||G.gate.open)){const s=Math.floor((performance.now()-G.t0)/1000),
      sum=`Уровень ${game.level} пройден за ${Math.floor(s/60)}:${String(s%60).padStart(2,'0')} · золото ${G.gold} · самоцветы ${G.gems.length} · сундуки ${G.chests.filter(c=>c.kind==='chest'&&c.opened).length}/${G.chests.filter(c=>c.kind==='chest').length}`+(G.deaths?` · поимок ${G.deaths}`:'');
    game.level++;game.seed++;build();sndLevel();toast(sum,4500)}}

let lastPool=0;
function animate(t,dt){
  if(W.sky)W.sky.position.copy(camera.position);
  // дальние чанки кладки не рисуем: в помещениях их всё равно скрывает туман
  const far=W.cullFar,cp=camera.position;
  for(const m of W.cull){const c=m.userData.c;m.visible=Math.hypot(c.x-cp.x,c.z-cp.z)-m.userData.r<far}
  // ближайшие огни получают настоящие источники
  if(t-lastPool>.15){lastPool=t;const L=W.lights.slice().sort((a,b)=>Math.hypot(a.x-pl.x,a.z-pl.z)-Math.hypot(b.x-pl.x,b.z-pl.z));
    W.pool.forEach((p,i)=>{p.userData.l=L[i]||null;if(L[i])p.position.set(L[i].x,L[i].y,L[i].z)})}
  for(const l of W.lights){const vis=Math.hypot(l.x-cp.x,l.z-cp.z)<far;l.spr.visible=l.glow.visible=vis;if(!vis)continue;
    const fl=.85+.1*Math.sin(t*13+l.ph)+.06*Math.sin(t*31+l.ph*2);l.spr.scale.set(.22*l.k*(2-fl),.4*l.k*fl,1);l.fl=fl;l.glow.scale.set(1.6*l.k*fl,1.6*l.k*fl,1)}
  W.pool.forEach(p=>{const l=p.userData.l;p.intensity=l?(TH.torch==='candle'?1:1.7)*(l.fl||1):0});
  if(W.portals)for(const p of W.portals)p.material.uniforms.t.value=t;
  if(!W.fx){sndUpdate(dt);return}
  const fx=W.fx,p=fx.pts.geometry.attributes.position,a=p.array,R=fx.R,top=TH.indoor?TH.H+.5:12;
  for(let i=0;i<a.length;i+=3){
    if(fx.type==='snow'){a[i+1]-=dt*1.3;a[i]+=Math.sin(t+i)*dt*.3}
    else if(fx.type==='pollen'){a[i+1]+=Math.sin(t*.7+i)*dt*.15;a[i]+=dt*.25;a[i+2]+=Math.cos(t*.5+i)*dt*.1}
    else{a[i+1]-=dt*.03;a[i]+=Math.sin(t*.3+i)*dt*.05}
    if(a[i+1]<0)a[i+1]+=top;if(a[i+1]>top)a[i+1]-=top;
    const dx=a[i]-pl.x,dz=a[i+2]-pl.z;if(dx>R)a[i]-=2*R;if(dx<-R)a[i]+=2*R;if(dz>R)a[i+2]-=2*R;if(dz<-R)a[i+2]+=2*R}
  p.needsUpdate=true;sndUpdate(dt)}

// ---------- карта-пергамент ----------
// Найденная карта показывает весь лабиринт, но без отметки «вы здесь»; она старая — местами прожжена.
const mapC=document.getElementById('map'),mctx=mapC.getContext('2d');
function mapSheet(){if(G.mapImg)return G.mapImg;
  const S2=900,c=document.createElement('canvas');c.width=c.height=S2;const x=c.getContext('2d'),r=mulberry(game.seed*31+game.level*7+5),n=W.n,M=W.M;
  const pad=70,k=(S2-2*pad)/n,P=(i,j)=>[pad+i*k,pad+j*k];
  // лист с рваным краем
  x.beginPath();for(let a=0;a<64;a++){const t=a/64,side=Math.floor(t*4),u=(t*4)%1,j=(r()-.5)*14;
    const p=side===0?[18+u*(S2-36),18+j]:side===1?[S2-18+j,18+u*(S2-36)]:side===2?[S2-18-u*(S2-36),S2-18+j]:[18+j,S2-18-u*(S2-36)];a?x.lineTo(...p):x.moveTo(...p)}
  x.closePath();x.fillStyle='#d9c79c';x.fill();x.save();x.clip();
  for(let i=0;i<70;i++){const px=r()*S2,py=r()*S2,rad=20+r()*120,g=x.createRadialGradient(px,py,0,px,py,rad);
    g.addColorStop(0,`rgba(${120+r()*40|0},${90+r()*30|0},${50|0},${.05+r()*.08})`);g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(px-rad,py-rad,rad*2,rad*2)}
  const v=x.createRadialGradient(S2/2,S2/2,S2*.3,S2/2,S2/2,S2*.75);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(70,40,15,.45)');x.fillStyle=v;x.fillRect(0,0,S2,S2);
  // стены чернилами, рука чуть дрожит
  x.strokeStyle='#3a2614';x.lineCap='round';
  const ink=(a,b)=>{x.lineWidth=Math.max(2,k*.12)*(.8+r()*.4);x.beginPath();x.moveTo(a[0]+(r()-.5)*2,a[1]+(r()-.5)*2);
    x.quadraticCurveTo((a[0]+b[0])/2+(r()-.5)*3,(a[1]+b[1])/2+(r()-.5)*3,b[0]+(r()-.5)*2,b[1]+(r()-.5)*2);x.stroke()};
  for(let i=0;i<=n;i++)for(let j=0;j<n;j++)if(M.V[i][j])ink(P(i,j),P(i,j+1));
  for(let i=0;i<n;i++)for(let j=0;j<=n;j++)if(M.Hh[i][j])ink(P(i,j),P(i+1,j));
  // подписи: вход и выход
  x.font=`italic ${Math.max(14,k*.38)|0}px Georgia`;x.textAlign='center';x.fillStyle='#5a2a14';
  const lab=(A,txt,col)=>{const g=toGrid(A.cx,A.cz),p=P(g[0],g[1]),q=[p[0]-A.d[0]*k*.95,p[1]-A.d[1]*k*.95+k*.1];
    x.strokeStyle=col;x.lineWidth=3;x.beginPath();x.arc(p[0],p[1],k*.22,0,7);x.stroke();x.fillStyle=col;x.fillText(txt,q[0],q[1])};
  lab(W.exitArch,'Выход','#8a1e10');lab(W.arches[1],'Вход','#3a2614');
  x.font='italic 34px Georgia';x.fillStyle='rgba(60,30,10,.75)';x.fillText(TH.name,S2/2,52);
  x.restore();
  // прожжённые дыры: обугленный край, внутри пусто
  for(let h=0;h<ri(2,4);h++){const cx=pad+r()*(S2-2*pad),cy=pad+r()*(S2-2*pad),R=S2*(.08+r()*.08),pts=[];
    for(let a=0;a<18;a++){const t=a/18*6.283,rr2=R*(.7+r()*.45);pts.push([cx+Math.cos(t)*rr2,cy+Math.sin(t)*rr2])}
    const poly=sc=>{x.beginPath();pts.forEach(([px,py],i)=>{const qx=cx+(px-cx)*sc,qy=cy+(py-cy)*sc;i?x.lineTo(qx,qy):x.moveTo(qx,qy)});x.closePath()};
    const g=x.createRadialGradient(cx,cy,R*.6,cx,cy,R*1.35);g.addColorStop(0,'rgba(20,10,4,.95)');g.addColorStop(.6,'rgba(90,45,15,.6)');g.addColorStop(1,'rgba(90,45,15,0)');
    x.save();poly(1.35);x.clip();x.fillStyle=g;x.fillRect(cx-R*1.5,cy-R*1.5,R*3,R*3);x.restore();
    x.save();x.globalCompositeOperation='destination-out';poly(1);x.fill();x.restore()}
  return G.mapImg=c}
function drawMap(){if(!W||!W.M)return;mapC.style.display=bigMap&&G.hasMap?'block':'none';if(!bigMap||!G.hasMap)return;
  const sz=Math.min(innerWidth,innerHeight)*.86;mapC.width=mapC.height=sz;mapC.className='big';
  mctx.clearRect(0,0,sz,sz);mctx.drawImage(mapSheet(),0,0,sz,sz)}

// ---------- интерфейс ----------
const $=id=>document.getElementById(id);
let toastT=0;function toast(s,ms=2400){const t=$('toast');t.textContent=s;t.style.opacity=1;clearTimeout(toastT);toastT=setTimeout(()=>t.style.opacity=0,ms)}
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
  bind('size','size',v=>v+'×'+v);bind('draw','draw',v=>v+' м');$('draw').addEventListener('input',applyDraw);
  $('cw').value=S.cw;$('cw').onchange=()=>{S.cw=+$('cw').value;saveSet();if(game.started)build()};bind('vol','vol',v=>Math.round(v*100)+'%');$('vol').addEventListener('input',sndVol);bind('sens','sens',v=>(+v).toFixed(2));bind('fov','fov',v=>v+'°');bind('pix','pix',v=>v+'px');
  $('cap').value=S.cap;$('cap').onchange=()=>{S.cap=+$('cap').value;saveSet()};
  for(const k of ['showfps','bob','invert']){$(k).checked=S[k];$(k).onchange=()=>{S[k]=$(k).checked;saveSet();$('fps').style.display=S.showfps?'block':'none'}}
  $('fps').style.display=S.showfps?'block':'none';
  $('btnPlay').onclick=()=>showMenu('play');$('btnSet').onclick=()=>showMenu('set');
  document.querySelectorAll('[data-back]').forEach(b=>b.onclick=()=>showMenu('main'));
  $('btnResume').onclick=()=>{audioInit();hideMenu()};
  document.querySelectorAll('#ui button').forEach(b=>b.addEventListener('click',()=>{audioInit();sndClick()}));
  $('btnStart').onclick=()=>{S.theme=game.theme;game.size=S.size;saveSet();game.level=1;game.picks=5;game.seed=(Math.random()*1e6)|0;audioInit();build();game.started=true;hideMenu();toast(TH.name)};
  addEventListener('keydown',e=>{keys[e.code]=true;if(!game.started||$('ui').style.display!=='none')return;
    if(e.code==='KeyM'){if(!G.hasMap){toast('Карты нет — найди свиток в одном из тупиков');return}bigMap=!bigMap;drawMap()}
    if(e.code==='KeyE'){if(LP.active)LP.hold=true;else useAction()}
    if((e.code==='KeyQ'||e.code==='Tab')&&LP.active){e.preventDefault();stopLockpick()}
    if(e.code==='KeyR'){game.seed++;build();toast('Новый лабиринт')}});
  addEventListener('keyup',e=>{keys[e.code]=false;if(e.code==='KeyE')LP.hold=false});
  addEventListener('mousedown',()=>{if(LP.active)LP.hold=true});addEventListener('mouseup',()=>{LP.hold=false});
  addEventListener('blur',()=>{for(const k in keys)keys[k]=false});
  document.addEventListener('mousemove',e=>{if(!locked)return;if(LP.active){lockpickMouse(e.movementX);return}const k=.0022*S.sens;pl.yaw-=e.movementX*k;pl.pitch=clamp(pl.pitch-e.movementY*k*(S.invert?-1:1),-1.45,1.45)});
  document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===canvas;if(!locked&&game.started){if(LP.active)stopLockpick();showMenu('main')}});
  canvas.addEventListener('click',()=>{if(game.started&&!locked&&$('ui').style.display==='none')canvas.requestPointerLock()})}

// ---------- цикл ----------
let last=performance.now(),acc=0,fpsN=0,fpsT=0;
function loop(now){requestAnimationFrame(loop);
  if(S.cap>0&&now-last<1000/S.cap-1)return;
  const dt=Math.min(.05,(now-last)/1000);last=now;
  if(game.started&&W){if($('ui').style.display==='none'){if(LP.active)updateLockpick(dt);else{step(dt);if(W.fx!==undefined)updateGameplay(dt,now/1000)}}else camera.position.set(pl.x,pl.y,pl.z);animate(now/1000,dt);renderer.render(scene,camera)}
  fpsN++;if(now-fpsT>500){$('fps').textContent=Math.round(fpsN*1000/(now-fpsT))+' FPS';fpsN=0;fpsT=now}}

initRenderer();initUI();showMenu('main');requestAnimationFrame(loop);
