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
  G={hasKey:false,hasMap:false,gold:0,goldTotal:0,gems:[],gemTotal:0,t0:performance.now(),fuel:1,items:[],monsters:[],deaths:0,hint:{},grace:4,
    fuelT:Math.max(60,120-(lvl-1)*8)};
  const gold='#e8b84a',mat=new THREE.MeshPhongMaterial({vertexColors:true,shininess:60,specular:0x886622,emissive:0x221100});
  const addItem=(type,geo,x,y,z,glow)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);root.add(m);
    const g=glowSprite(glow,type==='gem'?1:type==='gold'?.8:1.2);g.position.set(x,y,z);root.add(g);const it={type,m,g,x,y,z,taken:false,y0:y};G.items.push(it);return it};
  // ключ — в самом дальнем тупике, карта — в другом
  const de=deadEnds(),dist=cellDist(W.M,W.n,0,0);de.sort((a,b)=>dist[b.i*W.n+b.j]-dist[a.i*W.n+a.j]);
  const keyGeo=mergeParts([[new THREE.TorusGeometry(.07,.018,6,12),gold,_m4(0,.12,0)],bx(.025,.22,.025,0,-.04,0,gold),
    bx(.06,.025,.02,.035,-.12,0,gold),bx(.045,.025,.02,.03,-.07,0,gold)]);
  const scrollGeo=mergeParts([cy(.05,.05,.32,8,0,0,0,'#e8dcb8',0,0,Math.PI/2),cy(.02,.02,.4,6,0,0,0,'#6a4020',0,0,Math.PI/2),
    bx(.06,.02,.12,0,-.05,.04,'#d8c8a0')]);
  // ключ — в самой дальней достижимой точке тупика (предметы могли занять сам тупик)
  const R=reachMap(W.start.x,W.start.z,.28),spot=c=>{for(const o of [1,.7,1.3,.4]){const p=deadEndSpot(c,o*CW/2);if(R.has(p.x,p.z))return p}return null};
  let ks=null;for(const c of de)if(ks=spot(c))break;if(!ks){const p=warp(W.n-.5,W.n-.5);ks={x:p[0],z:p[1]}}
  addItem('key',keyGeo,ks.x,.9,ks.z,'rgba(255,210,90,.8)');
  const md=de.length>2?de[ri(1,Math.min(de.length-1,Math.max(2,de.length>>1)))]:null;
  const ms=md&&spot(md);if(ms&&Math.hypot(ms.x-ks.x,ms.z-ks.z)>1)addItem('map',scrollGeo,ms.x,.8,ms.z,'rgba(255,240,200,.6)');else G.hasMap=true;
  // золото в нишах
  const goldGeo=mergeParts([cy(.05,.05,.015,10,0,.008,0,gold),cy(.05,.05,.015,10,.03,.024,.02,gold),cy(.05,.05,.015,10,-.02,.04,-.01,gold),
    cy(.05,.05,.015,10,.01,.056,.01,gold),cy(.05,.05,.015,10,-.04,.008,.04,gold)]);
  // ниши делят золото и самоцветы
  // только свободные ниши: без черепа и свечи, и чтобы перед нишей не стоял предмет
  const ns=W.niches.filter(n=>n.y>0&&n.y<1.8&&!n.used&&!(W.placed||[]).some(p=>Math.hypot(p.x-n.x,p.z-n.z)<p.r+.7)&&R.has(n.x+n.nx*.6,n.z+n.nz*.6)).sort(()=>rnd()-.5),nGold=Math.min(2+(lvl>>1),5),nGem=Math.min(2+(lvl>>1),6);
  for(const n of ns.slice(0,nGold+nGem))n.used=1;
  for(const n of ns.slice(0,nGold))addItem('gold',goldGeo,n.x,n.y+.02,n.z,'rgba(255,200,90,.55)');
  G.goldTotal=Math.min(nGold,ns.length);
  for(const n of ns.slice(nGold,nGold+nGem)){const gm=rollGem();addItem('gem',gemGeo(gm),n.x,n.y+.03,n.z,gm.glow).gem=gm}
  G.gemTotal=Math.max(0,Math.min(nGem,ns.length-nGold));
  buildGate(root);
  buildMonsters(root);
  buildPuddles(root);
  W.gateBlk=(x,z)=>{const g=G.gate;return g&&!g.open&&x>g.x0&&x<g.x1&&z>g.z0&&z<g.z1}}

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
  if(G.hasKey){G.hasKey=false;const k=G.items.find(i=>i.type==='key');k.taken=false;k.m.visible=k.g.visible=true}
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
  // предметы: вращаются, подбираются рядом
  for(const it of G.items){if(it.taken)continue;it.m.rotation.y=t*1.5;it.m.position.y=it.y0+Math.sin(t*2+it.x)*.04;
    if(Math.hypot(it.x-pl.x,it.z-pl.z)<.95){it.taken=true;it.m.visible=it.g.visible=false;sndPickup(it.type);
      if(it.type==='key'){G.hasKey=true;toast('Ключ найден! Теперь к выходу')}
      else if(it.type==='map'){G.hasMap=true;toast('Карта найдена — нажми M')}
      else if(it.type==='gem'){G.gems.push(it.gem.name);toast('Найден самоцвет: '+it.gem.name)}
      else{G.gold++;toast('Золото '+G.gold+' / '+G.goldTotal)}}}
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
  document.getElementById('stat').textContent=`${String(Math.floor(s/60))}:${String(s%60).padStart(2,'0')}  ·  ключ ${G.hasKey?'✔':'—'}  ·  золото ${G.gold}/${G.goldTotal}  ·  самоцветы ${G.gems.length}/${G.gemTotal}  ·  карта ${G.hasMap?'✔':'—'}`;
  const fb=document.getElementById('fuel');fb.style.display=TH.indoor?'block':'none';fb.firstChild.style.width=Math.round(G.fuel*100)+'%'}
