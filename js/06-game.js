'use strict';
// ---------- render, player, menu ----------
let scene,camera,renderer,root=null,hand;
const canvas=document.getElementById('c');
const pl={x:0,z:0,y:1.6,yaw:0,pitch:0,bob:0,vis:new Set()};
const keys={};let locked=false,bigMap=false;

function initRenderer(){
  renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(S.fov,innerWidth/innerHeight,.05,3200);scene.add(camera);
  hand=new THREE.PointLight(0xffc890,0,8,2);hand.position.set(.25,-.2,-.3);camera.add(hand);
  onResize();addEventListener('resize',onResize)}
let DRS=1;   // internal resolution scale, driven by auto-quality
function onResize(){renderer.setPixelRatio(DRS/S.pix);renderer.setSize(innerWidth,innerHeight,false);
  camera.aspect=innerWidth/innerHeight;camera.fov=S.fov;camera.updateProjectionMatrix()}

function disposeTree(o){const keep=new Set(Object.values(TEXC)),done=new Set();
  o.traverse(c=>{if(c.geometry&&!done.has(c.geometry)){done.add(c.geometry);c.geometry.dispose()}
    if(c.material)[].concat(c.material).forEach(m=>{if(done.has(m))return;done.add(m);
      for(const k of ['map','alphaMap','emissiveMap'])if(m[k]&&!keep.has(m[k])&&!done.has(m[k])){done.add(m[k]);m[k].dispose()}
      if(m.uniforms)for(const u of Object.values(m.uniforms))if(u&&u.value&&u.value.isTexture&&!keep.has(u.value))u.value.dispose();
      m.dispose()})})}

function build(){
  if(root){scene.remove(root);disposeTree(root)}
  TH=withWeather(THEMES[game.theme]);setGeom(2);   // passages and walls always 2 m
  setSeed(game.seed*977+game.size*13+Object.keys(THEMES).indexOf(game.theme));
  W={A:.85,cull:[],lights:[],tall:[]};root=new THREE.Group();scene.add(root);
  buildLayout(Math.min(30,game.size+(game.level-1)*2));   // each level a bit bigger
  const m=themeMats();
  buildWalls(root,m);W.niches=W.niches.filter(q=>!W.wins.some(w=>Math.hypot(w.cx-q.x,w.cz-q.z)<1.8));buildFloorCeil(root,m);buildEnv(root,m);buildDecor(root,m);buildProps(root);buildLights(root);buildBeyond(root,m);buildAmbience(root);buildExit(root);buildFx(root);buildGameplay(root);buildGlow(root);sndTheme();
  W.pool=[];for(let i=0;i<3;i++){const l=new THREE.PointLight(TH.lightCol||0xffa050,0,TH.torch==='candle'?6:9,2);root.add(l);W.pool.push(l)}
  if(TH.hand){hand.color.set(TH.hand[0]);hand.intensity=TH.hand[1];hand.distance=TH.hand[2]}else hand.intensity=0;
  bigMap=false;
  pl.x=W.start.x;pl.z=W.start.z;pl.yaw=W.start.yaw;pl.pitch=0;pl.vis=new Set();pl.y=floorH(pl.x,pl.z)+1.6;
  applyDraw();
  document.getElementById('loc').textContent=TH.name+(TH.wname?' · '+TH.wname:'')+' · level '+game.level;
  drawMap(true)}

// draw distance: fog + culling masonry beyond it
// level weather: own rng so maze layout is not shifted; theme copy with overridden fields
function withWeather(T){if(!T.weather)return T;const r=mulberry(game.seed*131+game.level*7+game.size),E=Object.entries(T.weather);
  let q=r()*E.reduce((s,e)=>s+e[1].w,0),k=E[0];for(const e of E){q-=e[1].w;if(q<=0){k=e;break}}
  return Object.assign({},T,k[1],{name:T.name,sky:Object.assign({},T.sky,k[1].sky),wname:k[1].name,wkey:k[0]})}
function applyDraw(){if(!TH||!scene.fog)return;
  const far=TH.indoor?Math.min(S.draw,TH.fog[1]*1.6):Math.min(S.draw,TH.fogMax||1e9),near=TH.indoor?Math.min(TH.fog[0],far*.3):far*(TH.fogK===undefined?.22:TH.fogK);
  scene.fog.near=near;scene.fog.far=far;W.cullFar=far+4;W.detFar=Math.min(W.cullFar,TH.indoor?99:70);
  if(W.sky)W.sky.material.uniforms.fogK.value=1-sstep(60,520,far)}

// ---------- movement and collisions ----------
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
  // stepped into the exit arch portal
  if(al>-.5&&ac<A.w/2&&(!G.gate||G.gate.open)){const s=Math.floor((performance.now()-G.t0)/1000),
      sum=`Level ${game.level} cleared in ${Math.floor(s/60)}:${String(s%60).padStart(2,'0')} · gold ${G.gold} · gems ${G.gems.length} · chests ${G.chests.filter(c=>c.kind==='chest'&&c.opened).length}/${G.chests.filter(c=>c.kind==='chest').length}`+(G.deaths?` · caught ${G.deaths}`:'');
    game.level++;game.seed++;rollTheme();build();sndLevel();toast(sum,4500)}}

// ---------- occlusion culling behind maze walls ----------
// rays fan out from the camera over the tile grid (0.5 m step) within the fov; each ray passes through
// one wall (a breach, or outdoors the top of the masonry, may show what is behind) and stops at the next. level chunks whose
// 6×6 m cells get no ray are hidden. cells around the camera are always visible.
const OC=6;
function visCells(cp,far){const T=W.tile,TW=W.TW,vis=W.vis||(W.vis=new Set());vis.clear();
  const wall=(x,z)=>{const tx=Math.floor(x),tz=Math.floor(z);if(tx<0||tz<0||tx>=TW||tz>=TW)return 2;const t=T[tx*TW+tz];return t>0&&t!==3&&t!==5?1:0};
  const mark=(x,z)=>vis.add(Math.floor(x/OC)*4096+Math.floor(z/OC));
  for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)mark(cp.x+a*OC,cp.z+b*OC);
  const half=Math.atan(Math.tan(camera.fov*Math.PI/360)*camera.aspect)+.3,yaw=pl.yaw;
  for(let r=-half;r<=half;r+=.02){const dx=-Math.sin(yaw+r)*.5,dz=-Math.cos(yaw+r)*.5;let x=cp.x,z=cp.z,walls=0,inWall=false;
    for(let d=0;d<far;d+=.5){x+=dx;z+=dz;const w=wall(x,z);if(w===2)break;mark(x,z);
      if(w&&!inWall){inWall=true;if(++walls>(TH.indoor?2:3))break}else if(!w)inWall=false}}
  return vis}
function cellsOf(o){const u=o.userData;if(u.cells)return u.cells;const c=u.c,r=u.r,L=[];
  for(let x=Math.floor((c.x-r)/OC);x<=Math.floor((c.x+r)/OC);x++)for(let z=Math.floor((c.z-r)/OC);z<=Math.floor((c.z+r)/OC);z++)L.push(x*4096+z);
  return u.cells=L}

let lastPool=0;
function animate(t,dt){
  if(W.sky)W.sky.position.copy(camera.position);
  // skip far masonry chunks: indoors fog hides them anyway
  const far=W.cullFar,cp=camera.position;
  const det=W.detFar||far,vis=W.tile?visCells(cp,far):null;
  for(const m of W.cull){const c=m.userData.c,u=m.userData;m.visible=Math.hypot(c.x-cp.x,c.z-cp.z)-u.r<(u.det?det:far)&&(!vis||u.open||cellsOf(m).some(k=>vis.has(k)))}
  // nearest fires get real lights
  if(t-lastPool>.15){lastPool=t;const L=W.lights.filter(l=>!l.nolight).sort((a,b)=>Math.hypot(a.x-pl.x,a.z-pl.z)-Math.hypot(b.x-pl.x,b.z-pl.z)),sel=[];
    // two real lights close together overexpose: keep them at least 2.5 m apart
    for(const l of L){if(sel.length>=W.pool.length)break;if(sel.every(q=>Math.hypot(q.x-l.x,q.z-l.z)>2.5))sel.push(l)}
    W.pool.forEach((p,i)=>{p.userData.l=sel[i]||null;if(sel[i])p.position.set(sel[i].x,sel[i].y,sel[i].z)})}
  // flames and halos: two batches per level; far fires collapse to zero
  const fb=W.fb&&W.fb.n===W.lights.length?W.fb:(W.fb&&[W.fb.glow,W.fb.flame].forEach(m=>{root.remove(m);m.geometry.dispose();m.material.dispose()}),flameBatch(root));
  const fs=fb.flame.geometry.attributes.sz,gs=fb.glow.geometry.attributes.sz,fa=fs.array,ga=gs.array;
  W.lights.forEach((l,i)=>{if(Math.hypot(l.x-cp.x,l.z-cp.z)>=far){fa[i*2]=fa[i*2+1]=ga[i*2]=ga[i*2+1]=0;return}
    const fl=.85+.1*Math.sin(t*13+l.ph)+.06*Math.sin(t*31+l.ph*2),g=1.6*l.k*fl*(l.dim||1);l.fl=fl;
    fa[i*2]=.22*l.k*(2-fl);fa[i*2+1]=.4*l.k*fl;ga[i*2]=ga[i*2+1]=g});
  fs.needsUpdate=gs.needsUpdate=true;
  if(scene.fog){const u=fb.glow.material.uniforms;u.fogNear.value=scene.fog.near;u.fogFar.value=scene.fog.far}
  W.pool.forEach(p=>{const l=p.userData.l;p.intensity=l?(TH.torch==='candle'?1:1.7)*(l.fl||1)*(l.dim||1):0});
  if(W.portals)for(const p of W.portals)p.material.color.setScalar(p.userData.k*(.88+.12*Math.sin(t*2.2)));
  if(W.sky)W.sky.material.uniforms.t.value=t;updateAmbience(t);updateWeather(t,dt);updateBeyond();
  if(!W.fx){sndUpdate(dt);return}
  const fx=W.fx,p=fx.pts.geometry.attributes.position,a=p.array,R=fx.R,top=TH.indoor?TH.H+.5:12;
  for(let i=0;i<a.length;i+=3){
    if(fx.type==='snow'){a[i+1]-=dt*1.3;a[i]+=Math.sin(t+i)*dt*.3}
    else if(fx.type==='rain'){a[i+1]-=dt*15;a[i]+=dt*1.5}
    else if(fx.type==='blizzard'){a[i+1]-=dt*(2+Math.sin(i)*.8);a[i]+=dt*(7+Math.sin(t*1.3+i)*2.5);a[i+2]+=Math.sin(t*2+i*.7)*dt*1.5}
    else if(fx.type==='dustwind'){a[i]+=dt*(2.6+Math.sin(t+i)*.8);a[i+1]+=Math.sin(t*1.7+i)*dt*.4;a[i+2]+=Math.cos(t*.9+i)*dt*.6}
    else if(fx.type==='pollen'){a[i+1]+=Math.sin(t*.7+i)*dt*.15;a[i]+=dt*.25;a[i+2]+=Math.cos(t*.5+i)*dt*.1}
    else{a[i+1]-=dt*.03;a[i]+=Math.sin(t*.3+i)*dt*.05}
    if(a[i+1]<0)a[i+1]+=top;if(a[i+1]>top)a[i+1]-=top;
    const dx=a[i]-pl.x,dz=a[i+2]-pl.z;if(dx>R)a[i]-=2*R;if(dx<-R)a[i]+=2*R;if(dz>R)a[i+2]-=2*R;if(dz<-R)a[i+2]+=2*R}
  p.needsUpdate=true;sndUpdate(dt)}

// ---------- parchment map ----------
// a found map shows the whole maze but no "you are here"; it is old and burnt in places.
const mapC=document.getElementById('map'),mctx=mapC.getContext('2d');
function mapSheet(){if(G.mapImg)return G.mapImg;
  const S2=900,c=document.createElement('canvas');c.width=c.height=S2;const x=c.getContext('2d'),r=mulberry(game.seed*31+game.level*7+5),n=W.n,M=W.M;
  const pad=70,k=(S2-2*pad)/n,P=(i,j)=>[pad+i*k,pad+j*k];
  // sheet with a torn edge
  x.beginPath();for(let a=0;a<64;a++){const t=a/64,side=Math.floor(t*4),u=(t*4)%1,j=(r()-.5)*14;
    const p=side===0?[18+u*(S2-36),18+j]:side===1?[S2-18+j,18+u*(S2-36)]:side===2?[S2-18-u*(S2-36),S2-18+j]:[18+j,S2-18-u*(S2-36)];a?x.lineTo(...p):x.moveTo(...p)}
  x.closePath();x.fillStyle='#d9c79c';x.fill();x.save();x.clip();
  for(let i=0;i<70;i++){const px=r()*S2,py=r()*S2,rad=20+r()*120,g=x.createRadialGradient(px,py,0,px,py,rad);
    g.addColorStop(0,`rgba(${120+r()*40|0},${90+r()*30|0},${50|0},${.05+r()*.08})`);g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(px-rad,py-rad,rad*2,rad*2)}
  const v=x.createRadialGradient(S2/2,S2/2,S2*.3,S2/2,S2/2,S2*.75);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(70,40,15,.45)');x.fillStyle=v;x.fillRect(0,0,S2,S2);
  // walls in ink, slightly shaky hand
  x.strokeStyle='#3a2614';x.lineCap='round';
  const ink=(a,b)=>{x.lineWidth=Math.max(2,k*.12)*(.8+r()*.4);x.beginPath();x.moveTo(a[0]+(r()-.5)*2,a[1]+(r()-.5)*2);
    x.quadraticCurveTo((a[0]+b[0])/2+(r()-.5)*3,(a[1]+b[1])/2+(r()-.5)*3,b[0]+(r()-.5)*2,b[1]+(r()-.5)*2);x.stroke()};
  for(let i=0;i<=n;i++)for(let j=0;j<n;j++)if(M.V[i][j])ink(P(i,j),P(i,j+1));
  for(let i=0;i<n;i++)for(let j=0;j<=n;j++)if(M.Hh[i][j])ink(P(i,j),P(i+1,j));
  // labels: entrance and exit
  x.font=`italic ${Math.max(14,k*.38)|0}px Georgia`;x.textAlign='center';x.fillStyle='#5a2a14';
  const lab=(A,txt,col)=>{const g=toGrid(A.cx,A.cz),p=P(g[0],g[1]),q=[p[0]-A.d[0]*k*.95,p[1]-A.d[1]*k*.95+k*.1];
    x.strokeStyle=col;x.lineWidth=3;x.beginPath();x.arc(p[0],p[1],k*.22,0,7);x.stroke();x.fillStyle=col;x.fillText(txt,q[0],q[1])};
  lab(W.exitArch,'Exit','#8a1e10');lab(W.arches[1],'Entrance','#3a2614');
  x.font='italic 34px Georgia';x.fillStyle='rgba(60,30,10,.75)';x.fillText(TH.name,S2/2,52);
  x.restore();
  // burnt holes: charred edge, empty inside
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

// ---------- ui ----------
const WORLDS={outdoor:['ruins','winter'],underground:['dungeon','catacombs']};
// a plain coin flip gives long runs of the same theme (5-8 levels in a row), which feels broken:
// switch to the other theme 70% of the time and never allow three of the same in a row
function rollTheme(first){const g=WORLDS[game.world];if(!g)return;
  const cur=g.includes(game.theme)?game.theme:null,other=g.filter(t=>t!==cur);
  const next=first||!cur?g[Math.floor(Math.random()*g.length)]:(game.streak>=2||Math.random()<.7)?other[Math.floor(Math.random()*other.length)]:cur;
  game.streak=next===cur&&!first?(game.streak||1)+1:1;game.theme=next}
const $=id=>document.getElementById(id);
let toastT=0;function toast(s,ms=2400){const t=$('toast');t.textContent=s;t.style.opacity=1;clearTimeout(toastT);toastT=setTimeout(()=>t.style.opacity=0,ms)}
function showMenu(id){$('ui').style.display='flex';['main','play','set'].forEach(s=>$('scr-'+s).classList.toggle('hidden',s!==id));
  $('btnResume').classList.toggle('hidden',!game.started)}
function hideMenu(){$('ui').style.display='none';canvas.requestPointerLock&&canvas.requestPointerLock()}
function initUI(){
  // two worlds: outdoors (summer or winter) and dungeons (dungeon or catacombs); theme and weather random per level
  const cards=document.querySelectorAll('.map'),sel=w=>{game.world=w;cards.forEach(b=>b.classList.toggle('sel',b.dataset.w===w))};
  cards.forEach(b=>b.onclick=()=>sel(b.dataset.w));sel(S.world in WORLDS?S.world:THEMES[game.theme].outdoor?'outdoor':'underground');
  const sizes=[...document.querySelectorAll('#sizes button')],selSize=n=>{const b=sizes.reduce((a,q)=>Math.abs(q.dataset.n-n)<Math.abs(a.dataset.n-n)?q:a);
    S.size=+b.dataset.n;sizes.forEach(q=>q.classList.toggle('sel',q===b))};
  sizes.forEach(b=>b.onclick=()=>{selSize(+b.dataset.n);saveSet()});selSize(S.size);
  const bind=(id,key,fmt,num=true)=>{const el=$(id),v=$(id+'V');el.value=S[key];if(v)v.textContent=fmt(S[key]);
    el.oninput=()=>{S[key]=num?+el.value:el.value;if(v)v.textContent=fmt(S[key]);saveSet();onResize()}};
  bind('music','music',v=>Math.round(v*100)+'%');bind('draw','draw',v=>v+' m');$('draw').addEventListener('input',applyDraw);
  bind('vol','vol',v=>Math.round(v*100)+'%');$('vol').addEventListener('input',sndVol);bind('sens','sens',v=>(+v).toFixed(2));bind('fov','fov',v=>v+'°');bind('pix','pix',v=>v+'px');
  $('cap').value=S.cap;$('cap').onchange=()=>{S.cap=+$('cap').value;saveSet()};
  for(const k of ['autoq','post','showfps','bob','invert']){$(k).checked=S[k];$(k).onchange=()=>{S[k]=$(k).checked;saveSet();$('fps').style.display=S.showfps?'block':'none'}}
  $('fps').style.display=S.showfps?'block':'none';
  $('btnPlay').onclick=()=>showMenu('play');$('btnSet').onclick=()=>showMenu('set');
  document.querySelectorAll('[data-back]').forEach(b=>b.onclick=()=>showMenu('main'));
  $('btnResume').onclick=()=>{audioInit();hideMenu()};
  document.querySelectorAll('#ui button').forEach(b=>b.addEventListener('click',()=>{audioInit();sndClick()}));
  $('btnStart').onclick=()=>{S.world=game.world;rollTheme(true);S.theme=game.theme;game.size=S.size;saveSet();game.level=1;game.picks=5;game.seed=(Math.random()*1e6)|0;audioInit();build();game.started=true;hideMenu();toast(TH.name+(TH.wname?' · '+TH.wname:''))};
  addEventListener('keydown',e=>{keys[e.code]=true;if(!game.started||$('ui').style.display!=='none')return;
    if(e.code==='KeyM'){if(!G.hasMap){toast('No map yet: look for a scroll in a dead end');return}bigMap=!bigMap;drawMap()}
    if(e.code==='KeyE'&&!LP.active)useAction();
    if(LP.active&&e.code==='Space')e.preventDefault();
    if((e.code==='KeyQ'||e.code==='Tab')&&LP.active){e.preventDefault();stopLockpick()}
    if(e.code==='KeyR'){game.seed++;rollTheme();build();toast('New maze · '+TH.name+(TH.wname?' · '+TH.wname:''))}});
  addEventListener('keyup',e=>{keys[e.code]=false});
  addEventListener('mousedown',()=>{if(LP.active)LP.mouse=true});addEventListener('mouseup',()=>{LP.mouse=false});
  addEventListener('blur',()=>{for(const k in keys)keys[k]=false});
  document.addEventListener('mousemove',e=>{if(!locked)return;if(LP.active){lockpickMouse(e.movementX);return}const k=.0022*S.sens;pl.yaw-=e.movementX*k;pl.pitch=clamp(pl.pitch-e.movementY*k*(S.invert?-1:1),-1.45,1.45)});
  document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===canvas;if(!locked&&game.started){if(LP.active)stopLockpick();showMenu('main')}});
  canvas.addEventListener('click',()=>{if(game.started&&!locked&&$('ui').style.display==='none')canvas.requestPointerLock()})}

// ---------- loop ----------
let last=performance.now(),acc=0,fpsN=0,fpsT=0;
let needResize=false;   // resize at frame start, before drawing: otherwise the browser shows a cleared (black) canvas
function loop(now){requestAnimationFrame(loop);
  if(S.cap>0&&now-last<1000/S.cap-1)return;
  if(needResize){needResize=false;onResize()}
  const dt=Math.min(.05,(now-last)/1000);last=now;
  if(game.started&&W){if($('ui').style.display==='none'){if(LP.active)updateLockpick(dt);else{step(dt);if(W.fx!==undefined)updateGameplay(dt,now/1000)}}else camera.position.set(pl.x,pl.y,pl.z);animate(now/1000,dt);renderFrame()}
  fpsN++;if(now-fpsT>500){const fps=fpsN*1000/(now-fpsT);$('fps').textContent=Math.round(fps)+' FPS'+(DRS<1?' · '+Math.round(DRS*100)+'%':'');fpsN=0;fpsT=now;autoQuality(fps,now)}}
// auto-quality: below target fps lower internal resolution, with headroom raise it back.
// target 55 fps (or the fps cap from settings); step up cautiously to avoid jitter
let aqT=0,aqLow=0,aqHigh=0;
function autoQuality(fps,now){if(!S.autoq||!game.started||$('ui').style.display!=='none'){if(DRS!==1&&!S.autoq){DRS=1;needResize=true}return}
  const target=Math.min(55,S.cap>0?S.cap-3:55);
  if(fps<target){aqLow++;aqHigh=0}else if(fps>=target+2){aqHigh++;aqLow=0}else{aqLow=aqHigh=0}
  if(aqLow>=2&&DRS>.5&&now-aqT>1500){DRS=Math.max(.5,+(DRS-.1).toFixed(2));aqT=now;aqLow=0;needResize=true}
  else if(aqHigh>=8&&DRS<1&&now-aqT>5000){DRS=Math.min(1,+(DRS+.1).toFixed(2));aqT=now;aqHigh=0;needResize=true}}

initRenderer();initUI();showMenu('main');requestAnimationFrame(loop);
