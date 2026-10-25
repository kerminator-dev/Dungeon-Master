'use strict';
// ---------- render, player, menu ----------
let scene,camera,renderer,root=null,hand;
const canvas=document.getElementById('c');
const pl={x:0,z:0,y:1.6,yaw:0,pitch:0,bob:0};
const keys={};let locked=false,bigMap=0;   // map: 0 put away, 1 held low and tilted (walk and read), 2 held up flat

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
    if(c.isSkinnedMesh&&c.skeleton&&!done.has(c.skeleton)){done.add(c.skeleton);if(c.skeleton.dispose)c.skeleton.dispose()}   // its bone texture
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
  buildWalls(root,m);W.niches=W.niches.filter(q=>!W.wins.some(w=>Math.hypot(w.cx-q.x,w.cz-q.z)<1.8));buildFloorCeil(root,m);buildEnv(root,m);buildDecor(root,m);buildProps(root);buildLights(root);buildBeyond(root,m);buildAmbience(root);buildExit(root);buildFx(root);buildGameplay(root);buildGlow(root);flushStatic();sndTheme();
  // no more pool lights than fires (each light costs every lit surface): outdoors there may be none
  W.pool=[];for(let i=Math.min(LIGHT_POOL,W.lights.filter(l=>!l.nolight).length);i>0;i--){const l=new THREE.PointLight(TH.lightCol||0xffa050,0,TH.torch==='candle'?6:9,2);root.add(l);W.pool.push(l)}
  // the player's light: the torch or Candlelight, once bought (updateTorch, updateOrb). together it stays in the scene the whole
  // level, dark while not needed: a caught player watching a teammate who carries one would otherwise switch it on, and a light
  // coming or going rebuilds every lit shader (most of a second, the game standing still)
  hand.intensity=0;hand.visible=!!NET.on;
  bigMap=0;
  pl.x=W.start.x;pl.z=W.start.z;pl.yaw=W.start.yaw;pl.pitch=0;pl.y=floorH(pl.x,pl.z)+1.6;
  applyDraw();
  // play (sounds, patrols, flying loot) draws from a stream of its own: it never shifts the level's stream
  rnd=mulberry(game.seed*7919+game.level*31+1);
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
// is a circle of radius r free? the centre and 8 points at r and r/2 round it (directions worked out once)
const RC=Float64Array.from({length:8},(_,i)=>Math.cos(i*Math.PI/4)),RS=Float64Array.from({length:8},(_,i)=>Math.sin(i*Math.PI/4));
function freeR(x,z,r){if(blocked(x,z))return false;
  for(let i=0;i<8;i++)if(blocked(x+RC[i]*r,z+RS[i]*r)||blocked(x+RC[i]*r*.5,z+RS[i]*r*.5))return false;return true}
const free=(x,z)=>freeR(x,z,RAD);
// x and z are tried one after the other, which slides the player along a wall. a step that gets almost nowhere that way
// (a barrel, a brazier or a wall's corner right ahead) is tried turned a little to either side, as the mobs do (mobStep):
// the player glides round it instead of stopping dead
function slide(mx,mz){const x0=pl.x,z0=pl.z;
  if(mx&&free(pl.x+mx,pl.z))pl.x+=mx;if(mz&&free(pl.x,pl.z+mz))pl.z+=mz;
  if(Math.hypot(pl.x-x0,pl.z-z0)>Math.hypot(mx,mz)*.3)return;
  for(const a of [.6,-.6,1.2,-1.2]){const c=Math.cos(a),s=Math.sin(a),x=x0+mx*c+mz*s,z=z0-mx*s+mz*c;if(free(x,z)){pl.x=x;pl.z=z;return}}}
function step(dt){
  const f=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0),s=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0);
  const run=keys.ShiftLeft||keys.ShiftRight,sp=(run?5.2:3)*(G.bless&&G.bless.swift?1.2:1)*dt;let mx=0,mz=0;
  if(f||s){const l=Math.hypot(f,s);mx=(-Math.sin(pl.yaw)*f+Math.cos(pl.yaw)*s)/l*sp;mz=(-Math.cos(pl.yaw)*f-Math.sin(pl.yaw)*s)/l*sp}
  if(mx||mz)slide(mx,mz);
  const moving=!!(f||s),ph=Math.floor(pl.bob/Math.PI);pl.bob+=moving?dt*(run?11:7.5):0;pl.mv=moving?run?2:1:0;
  if(moving&&Math.floor(pl.bob/Math.PI)!==ph){sndStep(run);if(TH.water)waterRipple(pl.x-Math.sin(pl.yaw)*.3,pl.z-Math.cos(pl.yaw)*.3,run?1.3:1)}
  const ty=floorH(pl.x,pl.z)+1.6;pl.y+=(ty-pl.y)*Math.min(1,dt*10);
  const bob=S.bob&&moving?Math.sin(pl.bob)*.045:0;
  camera.position.set(pl.x,pl.y+bob,pl.z);camera.rotation.set(pl.pitch,pl.yaw,0,'YXZ');if(moving)tiltMap();
  const A=W.exitArch,al=(pl.x-A.cx)*A.d[0]+(pl.z-A.cz)*A.d[1],ac=Math.abs((pl.x-A.cx)*A.d[1]-(pl.z-A.cz)*A.d[0]);
  // stepped into the exit arch portal (from in front: an arch in a corridor wall has a corridor behind it)
  if(Math.abs(al)<.5&&ac<A.w/2&&(!G.gate||G.gate.open)){const s=Math.floor(G.time),
      sum=`Level ${game.level} cleared in ${Math.floor(s/60)}:${String(s%60).padStart(2,'0')} · gold ${G.gold} · gems ${G.gems.length} · chests ${G.chests.filter(c=>c.kind==='chest'&&c.opened).length}/${G.chests.filter(c=>c.kind==='chest').length}`+(game.caught?` · caught ${game.caught}`:'');
    if(NET.on)netExit(sum);else openTrader(sum)}}

// ---------- occlusion culling behind maze walls ----------
// rays fan out from the camera over the tile grid (0.5 m step) within the fov; each ray passes through one wall (through
// a breach what is behind it may show) and stops at the next; outdoors through two (over the ragged tops). level chunks
// whose 6×6 m cells get no ray are hidden. cells around the camera are always visible.
const OC=6;
// the 6×6 m cells over a rectangle
function cellsIn(x0,z0,x1,z1){const L=[];for(let x=Math.floor(x0/OC);x<=Math.floor(x1/OC);x++)for(let z=Math.floor(z0/OC);z<=Math.floor(z1/OC);z++)L.push(x*4096+z);return L}
// the cells a camera sees (each view of a split screen would cast its own rays)
function visCells(cam,far){const T=W.tile,TW=W.TW,cp=cam.position,vis=W.vis||(W.vis=new Set());vis.clear();
  const wall=(x,z)=>{const tx=Math.floor(x),tz=Math.floor(z);if(tx<0||tz<0||tx>=TW||tz>=TW)return 2;const t=T[tx*TW+tz];return t>0&&t!==3&&t!==5?1:0};
  const mark=(x,z)=>vis.add(Math.floor(x/OC)*4096+Math.floor(z/OC));
  for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)mark(cp.x+a*OC,cp.z+b*OC);
  const half=Math.atan(Math.tan(cam.fov*Math.PI/360)*cam.aspect)+.3,yaw=cam.rotation.y;
  for(let r=-half;r<=half;r+=.02){const dx=-Math.sin(yaw+r)*.5,dz=-Math.cos(yaw+r)*.5;let x=cp.x,z=cp.z,walls=0,inWall=false;
    for(let d=0;d<far;d+=.5){x+=dx;z+=dz;const w=wall(x,z);if(w===2)break;mark(x,z);
      if(w&&!inWall){inWall=true;if(++walls>(TH.indoor?1:2))break}else if(!w)inWall=false}}
  return vis}
const cellsOf=o=>{const u=o.userData;return u.cells||(u.cells=cellsIn(u.c.x-u.r,u.c.z-u.r,u.c.x+u.r,u.c.z+u.r))};

let lastPool=0;
// real point lights for the nearest fires: enough that torches down the corridor already light it, not only the next one
const LIGHT_POOL=6;
// hand the pool's lights to the fires nearest to p (the camera)
function poolLights(p){const L=[],sel=[];for(const l of W.lights)if(!l.nolight)L.push([Math.hypot(l.x-p.x,l.z-p.z),l]);L.sort((a,b)=>a[0]-b[0]);
  // two real lights close together overexpose: keep them at least 2.5 m apart
  for(const [,l] of L){if(sel.length>=W.pool.length)break;if(sel.every(q=>Math.hypot(q.x-l.x,q.z-l.z)>2.5))sel.push(l)}
  // a fire still among the nearest keeps its light; one newly in range takes a free light and fades in, no popping
  const keep=new Set(sel);for(const q of W.pool)if(q.userData.l&&!keep.has(q.userData.l))q.userData.l=null;
  const lit=new Set(W.pool.map(q=>q.userData.l));
  for(const l of sel)if(!lit.has(l)){const q=W.pool.find(q=>!q.userData.l);if(!q)break;q.userData.l=l;q.userData.f=0;q.position.set(l.x,l.y,l.z)}}
function animate(t,dt){const cam=camera,cp=cam.position;
  if(W.sky)W.sky.position.copy(cp);
  // skip far masonry chunks: indoors fog hides them anyway
  const far=W.cullFar,det=W.detFar||far,vis=W.tile?visCells(cam,far):null;
  for(const m of W.cull){const c=m.userData.c,u=m.userData;m.visible=Math.hypot(c.x-cp.x,c.z-cp.z)-u.r<(u.det?det:far)&&(!vis||cellsOf(m).some(k=>vis.has(k)))}
  // mobs too: none drawn beyond the fog or behind the walls the culling rays did not get past
  const seen=(x,z)=>{for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)if(vis.has(Math.floor((x+a*1.2)/OC)*4096+Math.floor((z+b*1.2)/OC)))return true;return false};
  if(G.monsters)for(const mo of G.monsters)mo.m.visible=Math.hypot(mo.x-cp.x,mo.z-cp.z)<far+2&&(!vis||seen(mo.x,mo.z));
  if(NET.on)for(const p of NET.peers.values())if(p.av)p.av.m.visible=!!p.show&&Math.hypot(p.x-cp.x,p.z-cp.z)<far+2&&(!vis||seen(p.x,p.z));
  // nearest fires get real lights
  if(t-lastPool>.15){lastPool=t;poolLights(cp)}
  // flames and halos: two batches per level; far fires collapse to zero
  const fb=W.fb&&W.fb.n===W.lights.length?W.fb:(W.fb&&[W.fb.glow,W.fb.flame].forEach(m=>{root.remove(m);m.geometry.dispose();m.material.dispose()}),flameBatch(root));
  const fs=fb.flame.geometry.attributes.sz,gs=fb.glow.geometry.attributes.sz,fa=fs.array,ga=gs.array;
  W.lights.forEach((l,i)=>{if(Math.hypot(l.x-cp.x,l.z-cp.z)>=far){fa[i*2]=fa[i*2+1]=ga[i*2]=ga[i*2+1]=0;return}
    const fl=.85+.1*Math.sin(t*13+l.ph)+.06*Math.sin(t*31+l.ph*2),g=1.6*l.k*fl*(l.dim||1);l.fl=fl;
    fa[i*2]=.22*l.k*(2-fl);fa[i*2+1]=.4*l.k*fl;ga[i*2]=ga[i*2+1]=g});
  fs.needsUpdate=gs.needsUpdate=true;
  if(scene.fog){const u=fb.glow.material.uniforms;u.fogNear.value=scene.fog.near;u.fogFar.value=scene.fog.far;
    if(W.trees){const v=W.trees.material.uniforms;v.fogNear.value=scene.fog.near;v.fogFar.value=scene.fog.far}}
  W.pool.forEach(p=>{const l=p.userData.l,u=p.userData;if(l)u.f=Math.min(1,(u.f||0)+dt*2.5);p.intensity=l?(TH.torch==='candle'?1:1.7)*(l.fl||1)*(l.dim||1)*u.f:0});
  if(W.portals)for(const p of W.portals)p.material.color.setScalar(p.userData.k*(.88+.12*Math.sin(t*2.2)));
  if(W.sky)W.sky.material.uniforms.t.value=t;updateAmbience(t,dt,cp);updateThemeDecor(t,dt);updateWaterLights(dt);updateWeather(t,dt);updateBeyond(cp,vis);
  if(!W.fx){sndUpdate(dt);return}
  const fx=W.fx,p=fx.pts.geometry.attributes.position,a=p.array,R=fx.R,top=TH.indoor?TH.H+.5:12;
  for(let i=0;i<a.length;i+=3){
    if(fx.type==='snow'){a[i+1]-=dt*1.3;a[i]+=Math.sin(t+i)*dt*.3}
    else if(fx.type==='rain'){a[i+1]-=dt*15;a[i]+=dt*1.5}
    else if(fx.type==='blizzard'){a[i+1]-=dt*(2+Math.sin(i)*.8);a[i]+=dt*(7+Math.sin(t*1.3+i)*2.5);a[i+2]+=Math.sin(t*2+i*.7)*dt*1.5}
    else if(fx.type==='dustwind'){a[i]+=dt*(2.6+Math.sin(t+i)*.8);a[i+1]+=Math.sin(t*1.7+i)*dt*.4;a[i+2]+=Math.cos(t*.9+i)*dt*.6}
    else{a[i+1]-=dt*.03;a[i]+=Math.sin(t*.3+i)*dt*.05}
    if(a[i+1]<0)a[i+1]+=top;if(a[i+1]>top)a[i+1]-=top;
    // kept in a box round the camera; after a jump (a new level, a rebuild) they wrap straight in, not a box a frame
    a[i]-=2*R*Math.floor((a[i]-cp.x+R)/(2*R));a[i+2]-=2*R*Math.floor((a[i+2]-cp.z+R)/(2*R))}
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
  const sz=Math.round(bigMap===2?Math.min(innerWidth,innerHeight)*.86:Math.min(innerWidth*.62,innerHeight*1.05));
  mapC.className=bigMap===2?'big':'tilt';mapC.style.transform='';if(mapC.width!==sz){mapC.width=mapC.height=sz;mctx.drawImage(mapSheet(),0,0,sz,sz)}
  else{mctx.clearRect(0,0,sz,sz);mctx.drawImage(mapSheet(),0,0,sz,sz)}tiltMap()}
// the tilted map is held low in front, like a sheet in both hands: the view above it stays clear. it sways a little
// with the steps; only its css transform changes (the composer moves it, the sheet is not drawn again)
function tiltMap(){if(bigMap!==1)return;const b=S.bob?pl.bob:0;
  mapC.style.transform=`translateX(-50%) translateY(${(Math.abs(Math.sin(b))*6).toFixed(1)}px) perspective(1100px) rotateX(50deg) rotateZ(${(Math.cos(b)*.6).toFixed(2)}deg)`}

// ---------- ui ----------
const WORLDS={outdoor:['ruins','winter','graveyard'],underground:['dungeon','catacombs','cistern'],desert:['desert','tomb']};
// a plain coin flip gives long runs of the same theme (5-8 levels in a row), which feels broken:
// switch to the other theme 70% of the time and never allow three of the same in a row
// the pool a level's theme is drawn from: the one map picked in the menu, or every map of the chosen world
// ('any': all of them)
const themePool=()=>game.pick&&THEMES[game.pick]?[game.pick]:game.world==='any'?Object.keys(THEMES):WORLDS[game.world];
function rollTheme(first){const g=themePool();if(!g)return;if(g.length===1){game.theme=g[0];game.streak=1;return}
  const cur=g.includes(game.theme)?game.theme:null,other=g.filter(t=>t!==cur);
  const next=first||!cur?g[Math.floor(Math.random()*g.length)]:(game.streak>=2||Math.random()<.7)?other[Math.floor(Math.random()*other.length)]:cur;
  game.streak=next===cur&&!first?(game.streak||1)+1:1;game.theme=next}
const $=id=>document.getElementById(id);
let toastT=0;function toast(s,ms=2400){const t=$('toast');t.textContent=s;t.style.opacity=1;clearTimeout(toastT);toastT=setTimeout(()=>t.style.opacity=0,ms)}
// together: no new game or new maze in the menu (the run is the team's), but leaving it, and for the leader ending it
function showMenu(id){$('ui').style.display='flex';['main','play','set','trader','net'].forEach(s=>$('scr-'+s).classList.toggle('hidden',s!==id));
  const on=NET.on,run=on&&NET.play;$('btnResume').classList.toggle('hidden',!game.started||on&&!run);$('btnMaze').classList.toggle('hidden',!game.started||on);
  for(const b of ['btnPlay','btnNet'])$(b).classList.toggle('hidden',on);$('btnLeave').classList.toggle('hidden',!on);$('btnLobby').classList.toggle('hidden',!run||!netLeader());
  $('btnLobby').textContent='End the run';$('netNote').classList.toggle('hidden',!run);if(id==='play')netLobbyDraw()}
// a refused lock leaves the game paused, with a note that a click on the view goes on (see loop)
function hideMenu(){$('ui').style.display='none';const p=canvas.requestPointerLock&&canvas.requestPointerLock();if(p&&p.catch)p.catch(()=>{})}

// ---------- loading a level ----------
// a level takes from a fraction of a second to a few on a big maze to build, and the page cannot draw meanwhile. a screen
// with the map's name goes up first and stays two frames, so it is surely on screen; then the level is built and drawn
// once under it (that first frame compiles the shaders, up to half a second more), and the screen fades out.
// o: head (the line over the name), sub (the line under it), cls ('caught': tinted red), done (once the level is up).
// tests set game.instant: the level is built at once, with no screen. so is it for a page out of view, which draws no frames to
// wait for (playing together, a teammate away still has the level built: the others need not wait for it)
// the shaders of all there is on the level, the hidden too (a shadow far off, a teammate not yet in view, the light a teammate
// carries as a caught player sees it): built when the level is, not the first time each is seen (a tenth of a second or more,
// the game standing still). together, the held torch and Candlelight are ready as well
function precompile(){try{renderer.compile(scene,camera);
  // (the held torch has a light of its own in its scene: built shown, as it is drawn)
  for(const Q of [TORCH,ORB])if(Q){const o=Q.T||Q.g,v=o.visible;o.visible=true;try{renderer.compile(Q.sc,Q.cam)}finally{o.visible=v}}}
  // a failure (the drawing context lost, say) must not hold the level up: they are built as they are first drawn then
  catch(e){}}
function loadLevel(o={}){const T=withWeather(THEMES[game.theme]),el=$('load');game.loading=true;
  $('loadHead').textContent=o.head||'Level '+game.level;$('loadName').textContent=T.name;
  $('loadSub').textContent=o.sub||(T.wname?T.wname[0].toUpperCase()+T.wname.slice(1):T.desc);el.className='on'+(o.cls?' '+o.cls:'');
  const go=()=>{build();game.started=true;
    // the first frame, under the screen: from the start, with the player's light as it will be. every shader the level may need
    // is built now too (precompile): one first needed in play would stop the game for a moment
    if(NET.on){if(!TORCH)TORCH=makeTorch();if(!ORB)ORB=makeOrb()}
    camera.position.set(pl.x,pl.y,pl.z);camera.rotation.set(pl.pitch,pl.yaw,0,'YXZ');updateTorch(0,0);updateOrb(0,0);precompile();updateHud();animate(performance.now()/1000,0);renderFrame();
    game.loading=false;el.classList.remove('on');fpsN=0;fpsT=performance.now();aqReset();if(o.done)o.done()};
  if(game.instant||document.hidden)go();else requestAnimationFrame(()=>requestAnimationFrame(go))}
function initUI(){
  // three worlds: outdoors (summer, winter, graveyard), underground (dungeon, catacombs, cistern) and the desert
  // (ruins above, a tomb below); the weather is random per level.
  // one pick, one card lit: a world (its maps take turns, a new one each level), one map by name (the same map the whole
  // run) or any map of any world. each world's row gets its maps, each with a picture (img/maps, made by tests/thumbs.js).
  // the pick is only a choice until Start: looking through the menu in the middle of a run leaves the run as it is
  let choice={};const box=$('maps'),worldOf=k=>Object.keys(WORLDS).find(w=>WORLDS[w].includes(k)),and=a=>a.slice(0,-1).join(', ')+' and '+a[a.length-1];
  for(const w in WORLDS){const b=box.querySelector(`.world[data-w="${w}"]`);b.querySelector('small').textContent=(WORLDS[w].length>2?'All three':'Both')+' maps in turn';
    b.insertAdjacentHTML('afterend',WORLDS[w].map(k=>`<button class="mapc" data-t="${k}"><img src="img/maps/${k}.jpg" alt=""><b>${THEMES[k].name}</b></button>`).join(''))}
  const sel=(w,k)=>{choice={w,k:k||null};if(netLeader())netSetupOut();box.querySelectorAll('.world,.mapc').forEach(b=>b.classList.toggle('sel',k?b.dataset.t===k:b.dataset.w===w));
    const T=THEMES[k];$('pickSum').innerHTML=T?`<b>${T.name}</b> · ${T.desc.toLowerCase()}. The same map every level${T.weather?', only the weather changes':''}`:
      w==='any'?'<b>Any map</b> · every map of every world, a new one each level':`<b>${box.querySelector(`.world[data-w="${w}"] b`).textContent}</b> · ${and(WORLDS[w].map(q=>THEMES[q].name))} take turns, a new one each level`};
  box.querySelectorAll('.world').forEach(b=>b.onclick=()=>sel(b.dataset.w));box.querySelectorAll('.mapc').forEach(b=>b.onclick=()=>sel(worldOf(b.dataset.t),b.dataset.t));
  const mine=()=>{const pk=THEMES[S.pick]?S.pick:null;sel(pk?worldOf(pk):S.world==='any'||S.world in WORLDS?S.world:worldOf(game.theme)||'underground',pk)};
  mine();game.world=choice.w;game.pick=choice.k;
  const sizes=[...document.querySelectorAll('#sizes button')],near=n=>sizes.reduce((a,q)=>Math.abs(q.dataset.n-n)<Math.abs(a.dataset.n-n)?q:a),
    litSize=n=>{const b=near(n);sizes.forEach(q=>q.classList.toggle('sel',q===b));lit=+b.dataset.n},selSize=n=>{S.size=+near(n).dataset.n;litSize(n);if(netLeader())netSetupOut()};
  let lit=S.size;
  sizes.forEach(b=>b.onclick=()=>{selSize(+b.dataset.n);saveSet()});selSize(S.size);
  // the lobby: the leader's pick (PICK.get, PICK.size: the size lit) is shown to the others as it comes (PICK.show: on screen,
  // not kept as their own: S keeps theirs, PICK.mine puts it back when they leave)
  PICK.get=()=>choice;PICK.size=()=>lit;PICK.show=(w,k,n)=>{if(!(w in WORLDS)&&w!=='any')return;sel(w,THEMES[k]?k:null);litSize(n)};PICK.mine=()=>{mine();litSize(S.size)};
  const bind=(id,key,fmt,num=true)=>{const el=$(id),v=$(id+'V');el.value=S[key];if(v)v.textContent=fmt(S[key]);
    el.oninput=()=>{S[key]=num?+el.value:el.value;if(v)v.textContent=fmt(S[key]);saveSet();onResize()}};
  bind('music','music',v=>Math.round(v*100)+'%');bind('draw','draw',v=>v+' m');$('draw').addEventListener('input',applyDraw);
  bind('vol','vol',v=>Math.round(v*100)+'%');$('vol').addEventListener('input',sndVol);bind('sens','sens',v=>(+v).toFixed(2));bind('fov','fov',v=>v+'°');bind('pix','pix',v=>v+'px');
  $('cap').value=S.cap;$('cap').onchange=()=>{S.cap=+$('cap').value;saveSet()};
  for(const k of ['autoq','post','showfps','bob','invert']){$(k).checked=S[k];$(k).onchange=()=>{S[k]=$(k).checked;saveSet();$('fps').style.display=S.showfps?'block':'none'}}
  $('fps').style.display=S.showfps?'block':'none';
  $('btnPlay').onclick=()=>showMenu('play');$('btnSet').onclick=()=>showMenu('set');
  // back: to the main menu; from the lobby it leaves the game; from the settings in the middle of a game, to the game's menu
  document.querySelectorAll('[data-back]').forEach(b=>b.onclick=()=>{if(NET.on&&!NET.play&&b.closest('#scr-play'))netQuit();else showMenu(NET.on&&!NET.play?'play':'main')});
  $('btnResume').onclick=()=>{audioInit();hideMenu()};
  document.querySelectorAll('#ui button').forEach(b=>b.addEventListener('click',()=>{audioInit();sndClick()}));
  // the mouse is captured right on the click (it needs one), the level is built behind the loading screen
  $('btnStart').onclick=()=>{if(NET.on)return netStart();game.world=S.world=choice.w;game.pick=S.pick=choice.k;rollTheme(true);S.theme=game.theme;game.size=S.size;saveSet();game.level=1;game.picks=5;game.gold=0;game.gems=[];game.mapNext=false;game.torch=false;game.orb=false;game.darkHint=0;game.trading=false;game.seed=(Math.random()*1e6)|0;saveEntry();audioInit();
    hideMenu();loadLevel({done:()=>toast(TH.name+(TH.wname?' · '+TH.wname:''))})};
  // a new maze for this level, from the menu (a key for it sat right by E and F): the purse goes back to what it held on
  // entering the level, so loot cannot be farmed
  $('btnMaze').onclick=()=>{restoreEntry();game.seed++;rollTheme();hideMenu();loadLevel({head:'New maze · level '+game.level,done:()=>toast('New maze · '+TH.name+(TH.wname?' · '+TH.wname:''))})};
  addEventListener('keydown',e=>{keys[e.code]=true;if(!game.started||game.loading||$('ui').style.display!=='none')return;
    // caught, together: watching a teammate; Space (or E) the next one, the arrows back and forth
    if(netGhost()&&!e.repeat&&['Space','KeyE','ArrowRight','ArrowLeft','KeyD','KeyA'].includes(e.code)){e.preventDefault();netWatchNext(e.code==='ArrowLeft'||e.code==='KeyA'?-1:1)}
    if(e.code==='KeyM'){if(!G.hasMap){toast('No map yet: look for a scroll in a dead end');return}bigMap=(bigMap+1)%3;drawMap();
      if(bigMap===1&&!game.mapHint){game.mapHint=1;toast('M again: hold the map up flat')}}
    // paused with the mouse free (a refused lock): nothing to use or throw, and Esc opens the menu as it does in play
    if(!locked){if(e.code==='Escape')showMenu('main');return}
    // (with the connection lost nothing is used or thrown: it could not be told)
    if(e.code==='KeyE'&&!LP.active&&!netCut())useAction();
    if(e.code==='KeyF'&&!e.repeat&&!netCut())throwCoin();
    if(LP.active&&e.code==='Space')e.preventDefault();
    if((e.code==='KeyQ'||e.code==='Tab')&&LP.active){e.preventDefault();stopLockpick()}});
  addEventListener('keyup',e=>{keys[e.code]=false});
  addEventListener('mousedown',e=>{if(LP.active)LP.mouse=true;else if(netGhost()&&locked)netWatchNext(1);else if(locked&&e.button===0)netPoint()});addEventListener('mouseup',()=>{LP.mouse=false});
  addEventListener('blur',()=>{for(const k in keys)keys[k]=false});
  document.addEventListener('mousemove',e=>{if(!locked)return;if(LP.active){lockpickMouse(e.movementX);return}const k=.0022*S.sens;pl.yaw-=e.movementX*k;pl.pitch=clamp(pl.pitch-e.movementY*k*(S.invert?-1:1),-1.45,1.45)});
  document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===canvas;
    if(!locked&&game.started&&!game.trading){if(LP.active)stopLockpick();showMenu('main')}
    // the leader waiting for the run to start: Esc brings the lobby back
    else if(!locked&&!game.started&&!game.loading&&NET.on&&!NET.play&&$('ui').style.display==='none')showMenu('play')});
  canvas.addEventListener('click',()=>{if(game.started&&!locked&&$('ui').style.display==='none')canvas.requestPointerLock()});
  netInitUI()}
const PICK={};   // the map picker's choice, for the lobby (initUI)

// ---------- loop ----------
let last=performance.now(),acc=0,fpsN=0,fpsT=0;
let needResize=false;   // resize at frame start, before drawing: otherwise the browser shows a cleared (black) canvas
let running=false;      // the world moves: a level is up, no menu, the mouse captured
function loop(now){requestAnimationFrame(loop);
  if(S.cap>0&&now-last<1000/S.cap-1)return;
  if(needResize){needResize=false;onResize()}
  const dt=Math.min(.05,(now-last)/1000);last=now;
  // a menu, a level being loaded or the mouse not captured (the browser may refuse the lock) all pause the game; with
  // the mouse free a note says a click on the view goes on
  // together nothing waits: the world goes on behind a menu, the trader and a free mouse (the player stands still), and
  // a caught player watches a teammate (netTick puts the camera there)
  const up=game.started&&W&&!game.loading,menu=$('ui').style.display!=='none';running=up&&!menu&&locked;
  domSet($('pause'),'display',up&&!menu&&!locked&&!netGhost()?'flex':'none');
  // (together, with the connection lost the player stands: the shadows can't be seen moving meanwhile)
  if(up){if(running&&!netGhost()&&!netCut()){
      // picking a lock does not stop the world: the player stands still, the shadows keep walking
      if(LP.active)updateLockpick(dt);if(!LP.active)step(dt);else camera.position.set(pl.x,pl.y,pl.z)}else{camera.position.set(pl.x,pl.y,pl.z);camera.rotation.set(pl.pitch,pl.yaw,0,'YXZ')}
    if((running||NET.on)&&W.fx!==undefined)updateGameplay(dt,now/1000);
    netTick(dt,now);animate(now/1000,dt);renderFrame()}
  fpsN++;aqN++;if(now-fpsT>500){const fps=fpsN*1000/(now-fpsT);$('fps').textContent=Math.round(fps)+' FPS'+(DRS<1?' · '+Math.round(DRS*100)+'%':'');fpsN=0;fpsT=now;autoQuality(fps,now)}}
// auto-quality: below target fps lower internal resolution, with headroom raise it back.
// target 55 fps (or the fps cap from settings); step up cautiously to avoid jitter.
// a step down is a try: if it has brought no more frames, they are held back by something else (the browser itself may
// keep the page at 30 fps, as Safari does in Low Power Mode, or the processor is the limit) and the step is taken back;
// no more steps down then until the frame rate moves
let aqT=0,aqLow=0,aqHigh=0,aqTry=null,aqHold=0,aqN=0;const aqHist=[];   // aqN: frames drawn, aqHist: [time, aqN] at each count
// a new level: its first frames are slow (shaders, textures), so the counting starts afresh and the first step waits
// a couple of seconds; a step on trial is taken back
function aqReset(){if(aqTry){DRS=aqTry.drs;needResize=true;aqTry=null}aqHist.length=0;aqLow=aqHigh=0;aqT=performance.now()+1000}
function autoQuality(fps,now){aqHist.push([now,aqN]);if(aqHist.length>16)aqHist.shift();
  if(!S.autoq||!running){if(DRS!==1&&!S.autoq){DRS=1;needResize=true}return}
  const target=Math.min(55,S.cap>0?S.cap-3:55);
  // the frame rate over the last second, and over 12 frames at least (a half-second count is rough when frames are few),
  // counted from no earlier than t0; 0 while there is not that much yet
  const rate=t0=>{for(let i=aqHist.length-2;i>=0;i--){const [t,n]=aqHist[i];if(t<t0)break;if(now-t>=1000&&aqN-n>=12)return (aqN-n)*1000/(now-t)}return 0};
  // a step down on trial: the rate after it (the count with the resize itself left out) against the rate before
  if(aqTry){if(now-aqTry.t<700)return;if(!aqTry.t1)aqTry.t1=aqHist[aqHist.length-1][0];const r=rate(aqTry.t1);if(!r)return;
    if(r<aqTry.before*1.08){DRS=aqTry.drs;needResize=true;aqHold=aqTry.before}aqTry=null;aqLow=aqHigh=0;return}
  if(aqHold){const r=rate(0);if(r&&Math.abs(r-aqHold)>aqHold*.2)aqHold=0}
  if(fps<target){aqLow++;aqHigh=0}else if(fps>=target+2){aqHigh++;aqLow=0}else{aqLow=aqHigh=0}
  const before=aqLow>=2&&DRS>.5&&now-aqT>1500&&!aqHold&&rate(0);
  if(before){aqTry={t:now,drs:DRS,before};DRS=Math.max(.5,+(DRS-.1).toFixed(2));aqT=now;aqLow=0;needResize=true}
  else if(aqHigh>=8&&DRS<1&&now-aqT>5000){DRS=Math.min(1,+(DRS+.1).toFixed(2));aqT=now;aqHigh=0;needResize=true}}

initRenderer();initUI();showMenu('main');requestAnimationFrame(loop);
