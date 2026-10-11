'use strict';
// ---------- игровая логика: ключ и решётка, факел, тени, сокровища, лужи ----------
let G={};

// тупики (одна открытая сторона), кроме старта и выхода
function deadEnds(){const n=W.n,M=W.M,e=W.exitCell,out=[];
  for(let i=0;i<n;i++)for(let j=0;j<n;j++){if(i+j===0||i===e.i&&j===e.j)continue;
    const op=[[1,0],[-1,0],[0,1],[0,-1]].filter(([a,b])=>i+a>=0&&j+b>=0&&i+a<n&&j+b<n&&M.open(i,j,a,b));
    if(op.length===1)out.push({i,j,dir:op[0]})}
  return out}
// точка в тупике: у глухой стены, отступив внутрь клетки
function deadEndSpot(c,off){const [a,b]=c.dir,wp=warp(c.i+.5-a*.5,c.j+.5-b*.5),cc=warp(c.i+.5,c.j+.5);
  let nx=cc[0]-wp[0],nz=cc[1]-wp[1];const l=Math.hypot(nx,nz);nx/=l;nz/=l;return {x:wp[0]+nx*(BD+off),z:wp[1]+nz*(BD+off),nx,nz}}

function glowSprite(col,size){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex('glow_'+col,()=>mkGlowTex([[0,col],[1,'rgba(0,0,0,0)']])),
  blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));s.scale.set(size,size,1);return s}

function buildGameplay(root){
  const lvl=game.level;
  G={hasKey:false,hasMap:false,gold:0,gems:[],t0:performance.now(),fuel:1,items:[],monsters:[],deaths:0,hint:{},grace:4,
    fuelT:Math.max(60,120-(lvl-1)*8)};
  // сундуки в тупиках: в самом дальнем — ключ, в другом — карта, в остальных золото и самоцветы
  const de=deadEnds(),dist=cellDist(W.M,W.n,0,0),R=reachMap(W.start.x,W.start.z,.28);
  de.sort((a,b)=>dist[b.i*W.n+b.j]-dist[a.i*W.n+a.j]);
  const spots=[];
  for(const c of de){const p=deadEndSpot(c,.04+.3),front={x:p.x+p.nx*.7,z:p.z+p.nz*.7};
    if((W.placed||[]).some(q=>Math.hypot(q.x-p.x,q.z-p.z)<q.r+.6)||!R.has(front.x,front.z))continue;spots.push(p)}
  G.chests=[];G.fly=[];G.chestLight=new THREE.PointLight(0xffc860,0,4,2);root.add(G.chestLight);
  const coins=()=>Math.round(rr(8,30)*(1+.3*(lvl-1)));
  const gems=()=>{const r=rnd(),k=r<.15?0:r<.75?1:2,o=[];for(let i=0;i<k;i++)o.push({t:'gem',gem:rollGem()});return o};
  spots.forEach((p,k)=>{let loot;
    if(k===0)loot=[{t:'key'},{t:'gold',n:ri(5,15)}];
    else if(k===1&&spots.length>2&&k<spots.length)loot=[{t:'map'},{t:'gold',n:ri(5,15)}];
    else if(k<2+Math.min(2+(lvl>>1)+(W.n>=12?1:0),8))loot=[{t:'gold',n:coins()},...gems()];
    else return;
    addChest(root,p,loot,k===0)});
  if(!G.chests.length){const c=warp(W.n-.5,W.n-.5);addChest(root,{x:c[0],z:c[1],nx:-1,nz:0},[{t:'key'}],true)}
  if(!G.chests.some(c=>c.loot.some(l=>l.t==='map')))G.hasMap=true;
  buildGate(root);
  buildMonsters(root);
  buildPuddles(root);
  W.gateBlk=(x,z)=>{const g=G.gate;return g&&!g.open&&x>g.x0&&x<g.x1&&z>g.z0&&z<g.z1}}

// ---------- сундуки ----------
const LOOT_GOLD='#e8b84a';
let _lootGeo=null;
function lootGeo(l){if(!_lootGeo){const g=LOOT_GOLD;_lootGeo={
    key:mergeParts([[new THREE.TorusGeometry(.07,.018,6,12),g,_m4(0,.12,0)],bx(.025,.22,.025,0,-.04,0,g),bx(.06,.025,.02,.035,-.12,0,g),bx(.045,.025,.02,.03,-.07,0,g)]),
    map:mergeParts([cy(.05,.05,.32,8,0,0,0,'#e8dcb8',0,0,Math.PI/2),cy(.02,.02,.4,6,0,0,0,'#6a4020',0,0,Math.PI/2)]),
    gold:mergeParts([cy(.05,.05,.015,10,0,.008,0,g),cy(.05,.05,.015,10,.03,.024,.02,g),cy(.05,.05,.015,10,-.02,.04,-.01,g),cy(.05,.05,.015,10,.01,.056,.01,g)])}}
  return l.t==='gem'?gemGeo(l.gem):_lootGeo[l.t]}
function chestGeos(){const wd='#6a4024',ir='#34302c',gold='#c8a040',half=(r,l)=>new THREE.CylinderGeometry(r,r,l,12,1,false,0,Math.PI);
  const base=[bx(.86,.42,.52,0,.21,0,wd),bx(.88,.04,.54,0,.03,0,ir),bx(.12,.1,.04,0,.36,.27,gold)];
  for(const x of [-.33,.33])base.push(bx(.06,.43,.54,x,.215,0,ir));
  // крышка: ось вращения — задняя верхняя кромка (0,.42,-.26)
  const lid=[[half(.26,.86),wd,_m4(0,0,.26,0,0,Math.PI/2,.62,1,1)],bx(.12,.06,.04,0,.02,.53,gold)];
  for(const x of [-.33,.33])lid.push([half(.27,.06),ir,_m4(x,0,.26,0,0,Math.PI/2,.64,1,1)]);
  if(TH.snow)lid.push(bx(.78,.04,.3,0,.15,.26,'#eef3fa'));
  return {base:mergeParts(base),lid:mergeParts(lid)}}
function addChest(root,p,loot,isKey){if(!G.chestGeo)G.chestGeo=chestGeos();
  const mat=new THREE.MeshPhongMaterial({vertexColors:true,map:tex('prop',()=>mkBrickTex(77)),shininess:20,specular:0x221a10});
  const g=new THREE.Group(),yaw=Math.atan2(p.nx,p.nz);g.position.set(p.x,0,p.z);g.rotation.y=yaw;root.add(g);
  g.add(new THREE.Mesh(G.chestGeo.base,mat));const piv=new THREE.Object3D();piv.position.set(0,.42,-.26);g.add(piv);piv.add(new THREE.Mesh(G.chestGeo.lid,mat));
  const glow=glowSprite('rgba(255,210,120,.9)',.01);glow.position.set(0,.45,0);g.add(glow);
  const c=Math.cos(yaw),s=Math.sin(yaw);occStamp([p.x-c*.38,p.z+s*.38],[p.x+c*.38,p.z-s*.38],.3);
  G.chests.push({x:p.x,z:p.z,nx:p.nx,nz:p.nz,g,piv,glow,loot,isKey,opened:false,t:-1})}
// открыть ближайший сундук перед игроком
function chestInReach(){let best=null,bd=9;const fx=-Math.sin(pl.yaw),fz=-Math.cos(pl.yaw);
  for(const c of G.chests){if(c.opened)continue;const dx=c.x-pl.x,dz=c.z-pl.z,d=Math.hypot(dx,dz);
    if(d<1.7&&(d<.9||(dx*fx+dz*fz)/d>.35)&&d<bd){best=c;bd=d}}return best}
function useAction(){const c=chestInReach();if(!c)return;c.opened=true;c.t=0;sndChestOpen();
  G.chestLight.position.set(c.x,.8,c.z);G.chestLightT=1.6}
function giveLoot(l){const add=s=>lootLine(s);
  if(l.t==='key'){G.hasKey=true;add('Ключ от решётки');sndPickup('key');toast('Ключ найден! Теперь к выходу')}
  else if(l.t==='map'){G.hasMap=true;add('Карта лабиринта — клавиша M');sndPickup('map')}
  else if(l.t==='gold'){G.gold+=l.n;add('Золото: '+l.n);sndCoins()}
  else{G.gems.push(l.gem.name);add(l.gem.name);sndPickup('gem')}}
function lootLine(text){const box=document.getElementById('loot'),d=document.createElement('div');d.textContent=text+' — добавлено';box.appendChild(d);
  setTimeout(()=>d.classList.add('out'),3200);setTimeout(()=>d.remove(),4200)}
const LMAT=()=>G.lootMat||(G.lootMat=new THREE.MeshPhongMaterial({vertexColors:true,shininess:80,specular:0xaa8844,emissive:0x221100}));
function updateChests(dt,t){
  for(const c of G.chests){if(c.t<0)continue;c.t+=dt;const k=Math.min(1,c.t/.7),e=1-Math.pow(1-k,3);
    c.piv.rotation.x=-1.85*e;const gs=Math.sin(Math.min(1,c.t/1.2)*Math.PI)*1.6;c.glow.scale.set(gs,gs,1);
    if(c.t>.45&&c.loot.length){c.loot.forEach((l,i)=>{const m=new THREE.Mesh(lootGeo(l),LMAT());m.position.set(c.x,.45,c.z);root.add(m);
      G.fly.push({m,l,t:-i*.28,x:c.x,z:c.z})});c.loot=[]}
    if(c.t>2)c.t=-1}
  if(G.chestLightT>0){G.chestLightT-=dt;G.chestLight.intensity=Math.max(0,G.chestLightT)*1.2}
  // добыча: поднимается из сундука, кружится и улетает к игроку
  for(let i=G.fly.length-1;i>=0;i--){const f=G.fly[i];f.t+=dt;if(f.t<0){f.m.visible=false;continue}f.m.visible=true;f.m.rotation.y=t*4;
    if(f.t<.8){f.m.position.y=.45+Math.sin(f.t/.8*Math.PI/2)*.7}
    else{const k=Math.min(1,(f.t-.8)/.45),cp=camera.position;f.m.position.set(lerp(f.x,cp.x,k),lerp(1.15,cp.y-.25,k),lerp(f.z,cp.z,k));f.m.scale.setScalar(1-k*.8)}
    if(f.t>1.25){root.remove(f.m);G.fly.splice(i,1);giveLoot(f.l)}}
  const pr=document.getElementById('prompt'),c=chestInReach();pr.style.display=c?'block':'none'}

// ---------- самоцветы, как в Skyrim: повреждённые, обычные и безупречные ----------
const GEMS=[
  {key:'amethyst',name:'аметист',col:'#9a50d8',w:5},{key:'garnet',name:'гранат',col:'#a8182c',w:5},
  {key:'ruby',name:'рубин',col:'#e8102a',w:3},{key:'sapphire',name:'сапфир',col:'#1e4ee8',w:3},
  {key:'emerald',name:'изумруд',col:'#14b45a',w:2},{key:'diamond',name:'алмаз',col:'#e4f2ff',w:1}];
const GEM_Q=[{q:'flawed',pre:'Повреждённый ',w:5},{q:'normal',pre:'',w:3.5},{q:'flawless',pre:'Безупречный ',w:1.5}];
function rollGem(){const wpick=a=>{let s=0;for(const x of a)s+=x.w;let r=rnd()*s;for(const x of a){r-=x.w;if(r<=0)return x}return a[0]};
  const g=wpick(GEMS),q=wpick(GEM_Q),name=q.pre+g.name;const c=new THREE.Color(g.col);
  const glow=`rgba(${c.r*255|0},${c.g*255|0},${c.b*255|0},${q.q==='flawless'?.75:q.q==='normal'?.55:.3})`;
  return {key:g.key,q:q.q,name:name[0].toUpperCase()+name.slice(1),col:g.col,glow}}
const _gemGeo={};
function gemGeo(gm){const k=gm.key+gm.q;if(_gemGeo[k])return _gemGeo[k];const c=new THREE.Color(gm.col);let parts;
  if(gm.q==='flawed'){// повреждённый: мутный неогранённый кусок
    const g=new THREE.IcosahedronGeometry(.06,0),p=g.attributes.position;for(let i=0;i<p.count;i++)p.setXYZ(i,p.getX(i)*(1+.3*Math.sin(i*1.7)),p.getY(i)*.8,p.getZ(i)*(1+.3*Math.cos(i*2.3)));
    parts=[[g,'#'+c.clone().multiplyScalar(.7).lerp(new THREE.Color('#808080'),.25).getHexString(),_m4(0,.05,0)]]}
  else{// огранённый: корона + павильон, у безупречного крупнее и ярче
    const s=gm.q==='flawless'?1.9:1.5,col='#'+c.clone().multiplyScalar(gm.q==='flawless'?1.15:1).getHexString();
    parts=[[new THREE.CylinderGeometry(.024*s,.045*s,.022*s,8),col,_m4(0,.066*s,0)],[new THREE.ConeGeometry(.045*s,.055*s,8),col,_m4(0,.0275*s,0,Math.PI)]]}
  const geo=mergeParts(parts);geo.computeVertexNormals();return _gemGeo[k]=geo}

// ---------- решётка на выходе ----------
function buildGate(root){const e=W.exitCell,n=W.n,K=WT,H=TH.indoor?TH.H:3.2;
  const x0=e.di?n*CS:e.i*CS+K,z0=e.di?e.j*CS+K:n*CS;
  const parts=[],ir='#3a3634';
  for(let s=.1;s<K;s+=.2)parts.push(cy(.025,.025,H,6,s-K/2,H/2,0,ir));
  for(const y of [.35,H/2,H-.3])parts.push(bx(K,.06,.05,0,y,0,ir));
  for(let s=.1;s<K;s+=.2)parts.push([new THREE.ConeGeometry(.04,.12,6),ir,_m4(s-K/2,-.04,0,Math.PI)]);
  const m=new THREE.Mesh(mergeParts(parts),new THREE.MeshPhongMaterial({vertexColors:true,shininess:40,specular:0x444444}));
  m.position.set(x0+K/2,0,z0+K/2);if(e.di)m.rotation.y=Math.PI/2;root.add(m);
  G.gate={x0,z0,x1:x0+K,z1:z0+K,cx:x0+K/2,cz:z0+K/2,open:false,opening:false,m,H}}

// ---------- тени ----------
function buildMonsters(root){if(game.peaceful)return;const n=W.n,lvl=game.level,cnt=Math.min(4,1+Math.floor((lvl-1)/2)+(n>=16?1:0));
  const geo=mergeParts([[new THREE.ConeGeometry(.38,1.55,9,1,true),'#141018',_m4(0,.78,0)],[new THREE.SphereGeometry(.2,8,6),'#0e0b10',_m4(0,1.6,0,0,0,0,1,1.1,1)],
    bx(.12,.55,.12,-.3,1.05,.1,'#141018',.5,0,.3),bx(.12,.55,.12,.3,1.05,.1,'#141018',.5,0,-.3)]);
  const mat=new THREE.MeshLambertMaterial({vertexColors:true,transparent:true,opacity:.92});
  const eyeT=tex('eye',()=>mkGlowTex([[0,'rgba(255,240,200,1)'],[.3,'rgba(255,60,30,.9)'],[1,'rgba(255,0,0,0)']]));
  for(let k=0;k<cnt;k++){const m=new THREE.Mesh(geo,mat),eyes=[];root.add(m);
    for(const s of [-1,1]){const e=new THREE.Sprite(new THREE.SpriteMaterial({map:eyeT,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}));
      e.scale.set(.09,.09,1);e.position.set(s*.07,1.62,.17);m.add(e);eyes.push(e)}
    const mo={m,eyes,mode:'patrol',stepT:0,lost:0,speed:1.2,chase:Math.min(3,2.3+.1*lvl)};placeMonster(mo,k);G.monsters.push(mo)}}
function placeMonster(mo,k){const n=W.n,dist=cellDist(W.M,n,0,0),max=Math.max(...dist),c=[];
  for(let i=0;i<n;i++)for(let j=0;j<n;j++)if(dist[i*n+j]>=max*.55&&!(i===W.exitCell.i&&j===W.exitCell.j))c.push([i,j]);
  const [i,j]=c.length?c[(ri(0,c.length-1)+k*7)%c.length]:[n-1,n-1],p=warp(i+.5,j+.5);
  Object.assign(mo,{x:p[0],z:p[1],cell:[i,j],prev:null,target:[i,j],mode:'patrol'})}
function los(ax,az,bx,bz){const d=Math.hypot(bx-ax,bz-az),k=Math.ceil(d/.3);
  for(let i=1;i<k;i++){const t=i/k;if(blocked(ax+(bx-ax)*t,az+(bz-az)*t)&&!W.gateBlk(ax+(bx-ax)*t,az+(bz-az)*t))return false}return true}
function updateMonsters(dt,t){if(G.grace>0){G.grace-=dt;return}
  const n=W.n,M=W.M,g=toGrid(pl.x,pl.z),pc=[Math.floor(g[0]),Math.floor(g[1])],inMaze=pc[0]>=0&&pc[1]>=0&&pc[0]<n&&pc[1]<n;
  let pd=null;
  for(const mo of G.monsters){const d=Math.hypot(pl.x-mo.x,pl.z-mo.z),sees=inMaze&&d<Math.min(11,(scene.fog?scene.fog.far:11)+2)&&los(mo.x,mo.z,pl.x,pl.z);
    if(sees||(mo.mode==='chase'&&d<3)){if(mo.mode!=='chase')sndGrowl(mo.x,mo.z);mo.mode='chase';mo.lost=0}
    else if(mo.mode==='chase'&&(mo.lost+=dt)>4)mo.mode='patrol';
    const tp=warp(mo.target[0]+.5,mo.target[1]+.5),sp=(mo.mode==='chase'?mo.chase:mo.speed)*dt,dx=tp[0]-mo.x,dz=tp[1]-mo.z,l=Math.hypot(dx,dz);
    if(l>sp){mo.x+=dx/l*sp;mo.z+=dz/l*sp;mo.m.rotation.y=Math.atan2(dx,dz)}
    else{mo.x=tp[0];mo.z=tp[1];const [i,j]=mo.target,nb=[[1,0],[-1,0],[0,1],[0,-1]].filter(([a,b])=>i+a>=0&&j+b>=0&&i+a<n&&j+b<n&&M.open(i,j,a,b)).map(([a,b])=>[i+a,j+b]);
      let nx;
      if(mo.mode==='chase'&&inMaze){if(!pd)pd=cellDist(M,n,pc[0],pc[1]);nx=nb.reduce((a,b)=>pd[b[0]*n+b[1]]<pd[a[0]*n+a[1]]?b:a,nb[0])}
      else{const f=nb.filter(c=>!mo.prev||c[0]!==mo.prev[0]||c[1]!==mo.prev[1]);nx=pick(f.length?f:nb)}
      mo.prev=mo.target;mo.target=nx||mo.target}
    mo.m.position.set(mo.x,.03+Math.sin(t*2.6+mo.x)*.05,mo.z);mo.m.rotation.z=Math.sin(t*1.7)*.04;
    if((mo.stepT-=dt)<=0){mo.stepT=mo.mode==='chase'?.36:.62;sndMonsterStep(mo.x,mo.z)}
    if(d<.7&&!game.peaceful)return caught()}}
function caught(){G.deaths++;sndCaught();const f=document.getElementById('flash');f.style.transition='none';f.style.opacity=.8;
  requestAnimationFrame(()=>{f.style.transition='opacity 1.2s';f.style.opacity=0});
  pl.x=W.start.x;pl.z=W.start.z;pl.yaw=W.start.yaw;pl.pitch=0;G.fuel=1;G.grace=3;
  if(G.hasKey){G.hasKey=false;const k=G.chests.find(c=>c.isKey);k.opened=false;k.t=-1;k.piv.rotation.x=0;k.loot=[{t:'key'}];lootLine('Ключ потерян — он снова в своём сундуке')}
  G.monsters.forEach((m,i)=>placeMonster(m,i+G.deaths));toast('Тень настигла тебя… Попробуй снова')}


// ---------- лужи и капли (подземелья) ----------
function buildPuddles(root){G.drips=[];G.dripPool=[];if(!TH.indoor)return;
  const geos=[0,1,2].map(k=>{const g=new THREE.CircleGeometry(1,18),p=g.attributes.position;
    for(let i=1;i<p.count;i++){const a=Math.atan2(p.getY(i),p.getX(i)),r=1+.25*Math.sin(a*3+k)+.15*Math.sin(a*5+k*2);p.setXY(i,p.getX(i)*r,p.getY(i)*r)}
    g.rotateX(-Math.PI/2);return g});
  const list=[],n=W.n;
  for(let k=0;k<Math.round(n*n/7);k++){const i=ri(0,n-1),j=ri(0,n-1),c=warp(i+.5+rr(-.3,.3),j+.5+rr(-.3,.3)),x=c[0],z=c[1];
    if((W.placed||[]).some(p=>Math.hypot(p.x-x,p.z-z)<p.r+.9)||wallDist(x,z)<.4)continue;
    const r=rr(.3,Math.min(.75,wallDist(x,z)));pushInst(list,x,.006,z,0,rr(0,6.3),0,r*rr(.8,1.2),1,r,new THREE.Color(1,1,1),ri(0,2));
    G.drips.push({x,z,top:ceilH(x,z),per:rr(2.2,5.5),off:rr(0,5)})}
  instance(root,list,geos,new THREE.MeshPhongMaterial({color:0x181c24,shininess:120,specular:0x8899aa,transparent:true,opacity:.78,depthWrite:false}),true,CHUNK*2);
  const dropT=tex('dot',()=>mkGlowTex([[0,'rgba(255,255,255,1)'],[.5,'rgba(255,255,255,.6)'],[1,'rgba(255,255,255,0)']],16,16));
  const ringG=new THREE.RingGeometry(.85,1,24);ringG.rotateX(-Math.PI/2);
  for(let k=0;k<5;k++){const d=new THREE.Sprite(new THREE.SpriteMaterial({map:dropT,color:0xbfd8ff,transparent:true,depthWrite:false}));d.scale.set(.04,.07,1);
    const r=new THREE.Mesh(ringG,new THREE.MeshBasicMaterial({color:0xbfd8ff,transparent:true,opacity:0,depthWrite:false}));root.add(d);root.add(r);G.dripPool.push({d,r,cur:null,last:0})}}
function updateDrips(t){if(!G.drips||!G.drips.length)return;
  const near=G.drips.filter(p=>Math.hypot(p.x-pl.x,p.z-pl.z)<10).sort((a,b)=>Math.hypot(a.x-pl.x,a.z-pl.z)-Math.hypot(b.x-pl.x,b.z-pl.z)).slice(0,G.dripPool.length);
  G.dripPool.forEach((s,k)=>{const p=near[k];s.d.visible=s.r.visible=!!p;if(!p)return;
    const h=p.top-.05,fall=Math.sqrt(2*h/9.8),ph=(t+p.off)%p.per;
    if(ph<fall){s.d.position.set(p.x,h-4.9*ph*ph,p.z);s.d.visible=true}else s.d.visible=false;
    const rp=ph-fall;if(rp>=0&&rp<.9){const k2=.05+rp*.5;s.r.scale.set(k2,1,k2);s.r.position.set(p.x,.012,p.z);s.r.material.opacity=.5*(1-rp/.9)}else s.r.material.opacity=0;
    const hit=Math.floor((t+p.off-fall)/p.per);if(s.cur===p&&hit!==s.last&&rp>=0&&rp<.2)sndDrip(p.x,p.z);s.cur=p;s.last=hit})}

// ---------- каждый кадр ----------
function updateGameplay(dt,t){
  updateChests(dt,t);
  // решётка
  const g=G.gate,dg=Math.hypot(g.cx-pl.x,g.cz-pl.z);
  if(!g.open&&!g.opening&&dg<2.4){if(G.hasKey){g.opening=true;sndGate();toast('Решётка поднимается…')}else if(!G.hint.gate){G.hint.gate=1;sndLocked();toast('Решётка заперта. Нужен ключ')}}
  if(dg>4)G.hint.gate=0;
  if(g.opening&&!g.open){g.m.position.y=Math.min(g.H-.25,g.m.position.y+dt*1.1);if(g.m.position.y>=1.9)g.open=true}
  // факел (только в подземельях)
  if(TH.indoor){G.fuel=Math.max(0,G.fuel-dt/G.fuelT);
    if(G.fuel<.95&&W.lights.some(l=>Math.hypot(l.x-pl.x,l.z-pl.z)<1.5)){if(G.fuel<.6)toast('Факел снова горит ярко');G.fuel=1;sndIgnite()}
    if(G.fuel<.2&&!G.hint.fuel){G.hint.fuel=1;toast('Факел догорает… Найди огонь')}if(G.fuel>.5)G.hint.fuel=0;
    const k=G.fuel;hand.intensity=TH.hand[1]*(.08+.92*k)*(.94+.06*Math.sin(t*17));hand.distance=TH.hand[2]*(.35+.65*k)}
  updateMonsters(dt,t);updateDrips(t);
  // HUD
  const s=Math.floor((performance.now()-G.t0)/1000);
  document.getElementById('stat').textContent=`${String(Math.floor(s/60))}:${String(s%60).padStart(2,'0')}  ·  ключ ${G.hasKey?'✔':'—'}  ·  золото ${G.gold}  ·  самоцветы ${G.gems.length}  ·  сундуки ${G.chests.filter(c=>c.opened).length}/${G.chests.length}  ·  карта ${G.hasMap?'✔':'—'}`;
  const fb=document.getElementById('fuel');fb.style.display=TH.indoor?'block':'none';fb.firstChild.style.width=Math.round(G.fuel*100)+'%'}
