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
  for(const c of de){const p=deadEndSpot(c,.2+.3),   // отступ от стены: крышке есть куда откинуться
    front={x:p.x+p.nx*.7,z:p.z+p.nz*.7};
    if((W.placed||[]).some(q=>Math.hypot(q.x-p.x,q.z-p.z)<q.r+.6)||!R.has(front.x,front.z))continue;spots.push(p)}
  G.chests=[];G.fly=[];G.chestLight={position:new THREE.Vector3(),intensity:0};   // без отдельного источника: хватает свечения
  // святилище забирает один из дальних тупиков
  let shSpot=null;if(spots.length>=3)shSpot=spots.splice(spots.length-1,1)[0];
  const coins=()=>Math.round(rr(8,30)*(1+.3*(lvl-1)));
  const gems=()=>{const r=rnd(),k=r<.15?0:r<.75?1:2,o=[];for(let i=0;i<k;i++)o.push({t:'gem',gem:rollGem()});return o};
  spots.forEach((p,k)=>{let loot;
    if(k===0)loot=[{t:'key'},{t:'gold',n:ri(5,15)}];
    else if(k===1&&spots.length>2&&k<spots.length)loot=[{t:'map'},{t:'gold',n:ri(5,15)}];
    else if(k<2+Math.min(2+(lvl>>1)+(W.n>=12?1:0),8))loot=[{t:'gold',n:coins()},...gems(),...(rnd()<.35?[{t:'picks',n:ri(1,3)}]:[])];
    else return;
    const locked=k>=2&&rnd()<.55;if(locked)loot.push(...gems().slice(0,1),...(rnd()<.4?[{t:'picks',n:ri(1,2)}]:[]));
    addChest(root,p,loot,k===0,locked?rollLock():-1)});
  if(!G.chests.length){const c=warp(W.n-.5,W.n-.5);addChest(root,{x:c[0],z:c[1],nx:-1,nz:0},[{t:'key'}],true)}
  if(!G.chests.some(c=>c.loot.some(l=>l.t==='map')))G.hasMap=true;
  if(shSpot)buildShrine(root,shSpot);
  // погребальные урны вдоль стен и кошели на полу
  const used=G.chests.map(c=>({x:c.x,z:c.z}));
  const okAt=(x,z,r)=>!blocked(x,z)&&wallDist(x,z)>.05&&Math.hypot(x-W.start.x,z-W.start.z)>2&&used.every(u=>Math.hypot(u.x-x,u.z-z)>r)&&
    !(W.placed||[]).some(p=>Math.hypot(p.x-x,p.z-z)<p.r+.4)&&!W.lights.some(l=>Math.hypot(l.x-x,l.z-z)<.8);
  const faces=W.faces.filter(f=>!f.outer);let nu=Math.min(3+lvl,10),np=Math.min(2+(lvl>>1),6);
  for(let tries=0;tries<200&&nu>0;tries++){const fc=pick(faces),L=fc.sg.len;if(L<WT+1)continue;const s=rr(BD+.4,L-BD-.4),p=faceAt(fc,s,.3),x=p.x+p.nx*(BD+.24),z=p.z+p.nz*(BD+.24);
    if(!okAt(x,z,1.4)||!R.near(x,z,.4))continue;used.push({x,z});nu--;            // урна должна быть достижима (не за бочками)
    addUrn(root,x,z,[{t:'gold',n:ri(3,12)},...(rnd()<.3?[{t:'picks',n:1}]:[]),...(rnd()<.15?[{t:'gem',gem:rollGem()}]:[])])}
  for(let tries=0;tries<200&&np>0;tries++){const i=ri(0,W.n-1),j=ri(0,W.n-1),c=warp(i+.5+rr(-.35,.35),j+.5+rr(-.35,.35)),x=c[0],z=c[1];
    if(!okAt(x,z,1.5)||!R.has(x,z))continue;used.push({x,z});np--;addPurse(root,x,z,[{t:'gold',n:ri(10,25)}])}
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
function chestGeos(){const wd='#6a4024',inn='#2e1a10',ir='#34302c',gold='#c8a040',half=(r,l)=>new THREE.CylinderGeometry(r,r,l,12,1,false,0,Math.PI);
  // полый ящик: дно и четыре стенки толщиной 4 см, внутри тёмное дерево
  const T=.04,base=[bx(.86,.42,T,0,.21,.26-T/2,wd),bx(.86,.42,T,0,.21,-.26+T/2,wd),bx(T,.42,.52-2*T,.43-T/2,.21,0,wd),bx(T,.42,.52-2*T,-.43+T/2,.21,0,wd),
    bx(.86-2*T,.05,.52-2*T,0,.065,0,inn),bx(.88,.04,.54,0,.03,0,ir),bx(.12,.1,.02,0,.36,.27,gold)];
  // окованные полосы только снаружи (спереди, сзади и по дну)
  for(const x of [-.33,.33])base.push(bx(.06,.43,.012,x,.215,.266,ir),bx(.06,.43,.012,x,.215,-.266,ir));
  // крышка: ось вращения — задняя верхняя кромка (0,.42,-.26); снизу закрыта доской, чтобы не просвечивала изнутри
  const lid=[[half(.26,.86),wd,_m4(0,0,.26,0,0,Math.PI/2,.62,1,1)],bx(.84,.02,.5,0,.01,.26,inn),bx(.12,.06,.04,0,.02,.53,gold)];
  for(const x of [-.33,.33])lid.push([half(.27,.06),ir,_m4(x,0,.26,0,0,Math.PI/2,.64,1,1)]);
  if(TH.snow)lid.push(bx(.78,.04,.3,0,.15,.26,'#eef3fa'));
  return {base:mergeParts(base),lid:mergeParts(lid)}}
// замки, как в Skyrim: чем выше уровень, тем уже «правильная» точка для отмычки
const LOCKS=[{name:'Новичок',w:.55},{name:'Ученик',w:.38},{name:'Адепт',w:.25},{name:'Эксперт',w:.15},{name:'Мастер',w:.08}];
function rollLock(){const r=rnd()+game.level*.06;return r<.45?0:r<.75?1:r<.95?2:r<1.12?3:4}
const PROMPT={chest:'Открыть сундук',urn:'Обыскать погребальную урну',purse:'Взять кошель',altar:'Помолиться у алтаря'};

function addChest(root,p,loot,isKey,lock){if(!G.chestGeo)G.chestGeo=chestGeos();
  const mat=G.propMat||(G.propMat=new THREE.MeshPhongMaterial({vertexColors:true,map:tex('prop',()=>mkBrickTex(77)),shininess:20,specular:0x221a10}));
  const g=new THREE.Group(),yaw=Math.atan2(p.nx,p.nz);g.position.set(p.x,0,p.z);g.rotation.y=yaw;root.add(g);
  g.add(new THREE.Mesh(G.chestGeo.base,mat));const piv=new THREE.Object3D();piv.position.set(0,.42,-.26);g.add(piv);piv.add(new THREE.Mesh(G.chestGeo.lid,mat));
  const glow=glowSprite('rgba(255,210,120,.9)',.01);glow.position.set(0,.45,0);g.add(glow);
  const c=Math.cos(yaw),s=Math.sin(yaw);occStamp([p.x-c*.38,p.z+s*.38],[p.x+c*.38,p.z-s*.38],.3);
  G.chests.push({kind:'chest',x:p.x,z:p.z,nx:p.nx,nz:p.nz,g,piv,glow,loot,isKey,lock:lock===undefined?-1:lock,opened:false,t:-1,y0:.45})}
// погребальная урна: каменная, с крышкой; обыскивается по E
function urnGeos(){const st='#7a7468',dk='#5a564e',pr=[[0,0],[.12,0],[.17,.06],[.21,.2],[.2,.34],[.14,.44],[.12,.47],[.1,.47],[.1,.3],[0,.3]];
  const body=[[new THREE.LatheGeometry(pr.map(p=>new THREE.Vector2(p[0],p[1])),10),st,_m4()],cy(.215,.215,.04,10,0,.2,0,dk,0,0,0,true),cy(.205,.205,.03,10,0,.3,0,dk,0,0,0,true)];
  const lid=[cy(.13,.14,.04,10,0,.02,0,dk),cy(.03,.05,.06,8,0,.07,0,st)];
  if(TH.snow)lid.push(cy(.12,.13,.02,10,0,.05,0,'#eef3fa'));
  return {body:mergeParts(body),lid:mergeParts(lid)}}
function addUrn(root,x,z,loot){if(!G.urnGeo)G.urnGeo=urnGeos();
  const mat=G.propMat||(G.propMat=new THREE.MeshPhongMaterial({vertexColors:true,map:tex('prop',()=>mkBrickTex(77)),shininess:20,specular:0x221a10}));
  const um=G.urnMat||(G.urnMat=new THREE.MeshPhongMaterial({vertexColors:true,map:tex('prop',()=>mkBrickTex(77)),shininess:20,specular:0x221a10,side:THREE.DoubleSide}));
  const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rr(0,6.28);root.add(g);g.add(new THREE.Mesh(G.urnGeo.body,um));
  const piv=new THREE.Object3D();piv.position.set(0,.46,0);g.add(piv);piv.add(new THREE.Mesh(G.urnGeo.lid,mat));
  G.chests.push({kind:'urn',x,z,nx:0,nz:0,g,piv,loot,lock:-1,opened:false,t:-1,y0:.5})}
// кошель с монетами на полу
function addPurse(root,x,z,loot){if(!G.purseGeo){const g=new THREE.IcosahedronGeometry(1,1),p=g.attributes.position;
    for(let i=0;i<p.count;i++){const y=p.getY(i);p.setXYZ(i,p.getX(i)*(y<-.3?1.1:1),y,p.getZ(i))}
    G.purseGeo=mergeParts([[g,'#6a4a2a',_m4(0,.07,0,0,0,0,.09,.075,.08)],cy(.025,.04,.04,6,0,.15,0,'#5a3a20'),cy(.03,.03,.012,8,0,.13,0,'#c8a040')])}
  const m=new THREE.Mesh(G.purseGeo,G.propMat||(G.propMat=new THREE.MeshPhongMaterial({vertexColors:true,map:tex('prop',()=>mkBrickTex(77)),shininess:20,specular:0x221a10})));
  m.position.set(x,0,z);m.rotation.y=rr(0,6.28);root.add(m);G.chests.push({kind:'purse',x,z,nx:0,nz:0,g:m,loot,lock:-1,opened:false,t:-1,y0:.12})}
// контейнер перед игроком
function chestInReach(){let best=null,bd=9;const fx=-Math.sin(pl.yaw),fz=-Math.cos(pl.yaw);
  for(const c of G.chests){if(c.opened)continue;const dx=c.x-pl.x,dz=c.z-pl.z,d=Math.hypot(dx,dz),r=c.kind==='chest'?1.7:1.4;
    if(d<r&&(d<.8||(dx*fx+dz*fz)/d>.35)&&d<bd){best=c;bd=d}}return best}
function useAction(){if(LP.active)return;const c=chestInReach();if(!c)return;
  if(c.lock>=0){if(game.picks<=0){toast('Нет отмычек');sndLocked();return}startLockpick(c);return}
  openContainer(c)}
function openContainer(c){c.opened=true;c.t=0;if(c.kind==='altar'){c.t=-1;bless();return}
  if(c.kind==='chest'){sndChestOpen();G.chestLight.position.set(c.x,.8,c.z);G.chestLightT=1.6}else if(c.kind==='urn')sndUrn();else sndCoins()}
function giveLoot(l){const add=(s,ic)=>lootLine(s,ic);
  if(l.t==='key'){G.hasKey=true;add('Ключ от решётки','key');sndPickup('key');toast('Ключ найден! Теперь к выходу')}
  else if(l.t==='map'){G.hasMap=true;add('Карта лабиринта — клавиша M','map');sndPickup('map')}
  else if(l.t==='gold'){G.gold+=l.n;add('Золото: '+l.n,'coin');sndCoins()}
  else if(l.t==='picks'){game.picks+=l.n;add('Отмычка'+(l.n>1?' ×'+l.n:''),'pick');sndPickup('map')}
  else{G.gems.push(l.gem);add(l.gem.name,'gem:'+l.gem.key);sndPickup('gem')}}
function lootLine(text,ic){const box=document.getElementById('loot'),d=document.createElement('div');if(ic){const im=document.createElement('img');im.src=hudIcon(ic);d.appendChild(im)}
  d.appendChild(document.createTextNode(text+' — добавлено'));box.appendChild(d);
  setTimeout(()=>d.classList.add('out'),3200);setTimeout(()=>d.remove(),4200)}
const LMAT=()=>G.lootMat||(G.lootMat=new THREE.MeshPhongMaterial({vertexColors:true,shininess:80,specular:0xaa8844,emissive:0x221100}));
function updateChests(dt,t){
  for(const c of G.chests){if(c.t<0)continue;c.t+=dt;const k=Math.min(1,c.t/.7),e=1-Math.pow(1-k,3);
    if(c.kind==='chest'){c.piv.rotation.x=-1.05*e;   // на 60°, не до упора — иначе крышка уходит в стену
      const gs=Math.sin(Math.min(1,c.t/1.2)*Math.PI)*1.6;c.glow.scale.set(gs,gs,1)}
    else if(c.kind==='urn'){c.piv.position.y=.46+Math.sin(Math.min(1,c.t/.35)*Math.PI)*.12;c.piv.position.x=.12*e;c.piv.rotation.z=-.5*e}
    else c.g.scale.setScalar(Math.max(.01,1-c.t*3));
    if(c.t>(c.kind==='chest'?.45:.2)&&c.loot.length){c.loot.forEach((l,i)=>{const m=new THREE.Mesh(lootGeo(l),LMAT());m.position.set(c.x,c.y0,c.z);root.add(m);
      G.fly.push({m,l,t:-i*.28,x:c.x,z:c.z,y0:c.y0})});c.loot=[]}
    if(c.t>2){c.t=-1;if(c.kind==='purse')c.g.visible=false}}
  if(G.chestLightT>0){G.chestLightT-=dt;G.chestLight.intensity=Math.max(0,G.chestLightT)*1.2}
  // добыча: поднимается, кружится и улетает к игроку
  for(let i=G.fly.length-1;i>=0;i--){const f=G.fly[i];f.t+=dt;if(f.t<0){f.m.visible=false;continue}f.m.visible=true;f.m.rotation.y=t*4;
    if(f.t<.8){f.m.position.y=f.y0+Math.sin(f.t/.8*Math.PI/2)*.7}
    else{const k=Math.min(1,(f.t-.8)/.45),cp=camera.position;f.m.position.set(lerp(f.x,cp.x,k),lerp(f.y0+.7,cp.y-.25,k),lerp(f.z,cp.z,k));f.m.scale.setScalar(1-k*.8)}
    if(f.t>1.25){root.remove(f.m);G.fly.splice(i,1);if(f.l)giveLoot(f.l)}}
  const pr=document.getElementById('prompt'),c=chestInReach();pr.style.display=c&&!LP.active?'block':'none';
  if(c)pr.textContent=c.lock>=0?`[E] Взломать замок (${LOCKS[c.lock].name}) · отмычек: ${game.picks}`:`[E] ${PROMPT[c.kind]}`}

// ---------- взлом замка ----------
// мышь двигает отмычку (угол 0..π), удержание E / кнопки мыши поворачивает замок;
// не в той точке — замок проворачивается частично, отмычка гнётся и может сломаться
const LP={active:false};
function startLockpick(c){Object.assign(LP,{active:true,c,ang:Math.PI/2,sweet:rr(.25,Math.PI-.25),w:LOCKS[c.lock].w,turn:0,hp:1,hold:false,mouse:false,ready:false,jit:0,scrapeT:0});
  document.getElementById('lockpick').style.display='flex';document.getElementById('lpLevel').textContent='Замок: '+LOCKS[c.lock].name;
  for(const k in keys)keys[k]=false;sndLockStart();drawLock()}
function stopLockpick(msg){LP.active=false;document.getElementById('lockpick').style.display='none';if(msg)toast(msg)}
function lockpickMouse(dx){if(!LP.active)return;const a=LP.ang;LP.ang=clamp(LP.ang+dx*.006,0,Math.PI);
  if(Math.abs(LP.ang-a)>.01&&(LP.scrapeT-=Math.abs(dx))<0){LP.scrapeT=40;sndPickScrape()}}
// повернуть замок: любая из клавиш WASD / E / пробел / стрелки или кнопка мыши.
// Клавиши начинают действовать, только когда все отпущены после открытия замка (E могла остаться зажатой)
const LP_KEYS=['KeyW','KeyA','KeyS','KeyD','KeyE','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
function updateLockpick(dt){if(!LP.active)return;
  const k=LP_KEYS.some(c=>keys[c]);if(!k)LP.ready=true;const hold=LP.hold||LP.mouse||(LP.ready&&k);
  const d=Math.abs(LP.ang-LP.sweet),max=d<LP.w/2?1:Math.max(0,1-(d-LP.w/2)/.7);
  if(hold){LP.turn=Math.min(max,LP.turn+dt*1.6);
    if(LP.turn>=1){sndUnlock();const c=LP.c;c.lock=-1;stopLockpick('Замок открыт');openContainer(c);return}
    if(LP.turn>=max-.01){LP.hp-=dt*(1.4+LP.c.lock*.25);LP.jit=Math.sin(performance.now()*.08)*.04;
      if(LP.hp<=0){game.picks--;sndPickBreak();LP.hp=1;LP.turn=0;
        if(game.picks<=0){stopLockpick('Отмычки кончились');return}toast('Отмычка сломалась')}}}
  else{LP.turn=Math.max(0,LP.turn-dt*3);LP.jit=0}
  drawLock()}
function drawLock(){const cv=document.getElementById('lpCanvas'),x=cv.getContext('2d'),W2=cv.width,cx=W2/2,cy=W2/2,R=W2*.38;
  x.clearRect(0,0,W2,W2);
  const g=x.createRadialGradient(cx,cy,R*.2,cx,cy,R*1.15);g.addColorStop(0,'#6e665a');g.addColorStop(1,'#2a2622');
  x.fillStyle=g;x.beginPath();x.arc(cx,cy,R*1.12,0,7);x.fill();
  // нордский орнамент по кругу
  x.strokeStyle='#8a806e';x.lineWidth=3;x.beginPath();x.arc(cx,cy,R*1.02,0,7);x.stroke();
  for(let i=0;i<24;i++){const a=i/24*6.283;x.fillStyle=i%2?'#5a5248':'#9a8e78';x.fillRect(cx+Math.cos(a)*R*.94-3,cy+Math.sin(a)*R*.94-3,6,6)}
  x.fillStyle='#3a342e';x.beginPath();x.arc(cx,cy,R*.62,0,7);x.fill();
  // цилиндр замка с прорезью, поворачивается на 90°
  x.save();x.translate(cx,cy);x.rotate(LP.turn*Math.PI/2+LP.jit);
  x.fillStyle='#b8ac94';x.beginPath();x.arc(0,0,R*.5,0,7);x.fill();x.fillStyle='#8a806e';x.beginPath();x.arc(0,0,R*.42,0,7);x.fill();
  x.fillStyle='#120e0c';x.beginPath();x.arc(0,-R*.12,R*.11,0,7);x.fill();x.fillRect(-R*.05,-R*.12,R*.1,R*.36);x.restore();
  // отмычка: входит в замочную скважину, угол — сверху от левого края к правому
  const a=Math.PI+LP.ang,len=R*1.3,hx=cx+Math.cos(a)*len,hy=cy+Math.sin(a)*len;
  x.save();x.translate(cx,cy);x.rotate(LP.jit*3);x.translate(-cx,-cy);
  x.strokeStyle='#c8c4bc';x.lineWidth=5;x.lineCap='round';x.beginPath();x.moveTo(cx,cy-R*.05);x.lineTo(hx,hy);x.stroke();
  x.strokeStyle='#6a665e';x.lineWidth=2;x.beginPath();x.moveTo(cx,cy-R*.05);x.lineTo(hx,hy);x.stroke();x.restore();
  // натяжитель снизу
  x.save();x.translate(cx,cy);x.rotate(LP.turn*Math.PI/2);x.fillStyle='#4a4640';x.fillRect(-R*.04,R*.1,R*.08,R*1.0);x.restore();
  // прочность отмычки
  x.fillStyle='#2a2622';x.fillRect(cx-R*.6,W2-28,R*1.2,10);x.fillStyle=LP.hp>.4?'#c8b48a':'#d05030';x.fillRect(cx-R*.6,W2-28,R*1.2*LP.hp,10);
  document.getElementById('lpPicks').textContent='Отмычек: '+game.picks}

// ---------- святилище: алтарь, свечи, жаровни; молитва продлевает факел ----------
function buildShrine(root,p){const st='#7a7468',dk='#5a564e',cloth=TH.indoor&&game.theme==='catacombs'?'#24365a':'#6a1a14';
  const parts=[bx(.9,.8,.5,0,.4,0,st),bx(1.04,.09,.62,0,.845,0,dk),bx(1.04,.12,.64,0,.06,0,dk),bx(.3,.012,.66,0,.896,0,cloth),bx(.3,.5,.012,0,.64,.326,cloth),
    cy(.12,.09,.06,10,.28,.92,0,'#8a7a50'),cy(.03,.035,.2,7,-.32,.99,.1,'#e8dcc0'),cy(.03,.035,.14,7,-.4,.96,-.05,'#e8dcc0'),cy(.03,.035,.26,7,.4,1.02,-.12,'#e8dcc0'),
    bx(.34,.5,.1,0,1.13,-.2,'#6a665c'),bx(.12,.1,.17,0,1.27,-.12,'#d8ccb0'),bx(.08,.07,.1,0,1.22,-.02,'#d8ccb0')];
  // оленьи рога над стелой: древний знак, без привязки к какой-либо вере
  for(const sd of [-1,1])parts.push(bx(.03,.34,.03,sd*.12,1.44,-.13,'#c8b890',0,0,-sd*.55),bx(.025,.16,.025,sd*.15,1.58,-.13,'#c8b890',0,0,sd*.25),
    bx(.025,.15,.025,sd*.25,1.56,-.13,'#c8b890',0,0,-sd*.9),bx(.022,.12,.022,sd*.29,1.66,-.13,'#c8b890',0,0,-sd*.3));
  const yaw=Math.atan2(p.nx,p.nz),g=new THREE.Mesh(mergeParts(parts),G.propMat||(G.propMat=new THREE.MeshPhongMaterial({vertexColors:true,map:tex('prop',()=>mkBrickTex(77)),shininess:20,specular:0x221a10})));
  g.position.set(p.x,0,p.z);g.rotation.y=yaw;root.add(g);const c=Math.cos(yaw),s=Math.sin(yaw);occStamp([p.x-c*.45,p.z+s*.45],[p.x+c*.45,p.z-s*.45],.33);
  const tx=c,tz=-s;   // касательная вдоль стены
  for(const [dx,h] of [[-.32,.99+.1],[-.4,.96+.07],[.4,1.02+.13]]){const l={x:p.x+tx*dx,y:h+.06,z:p.z+tz*dx,base:h,kind:'candle',nx:0,nz:0,nolight:1};W.lights.push(l);makeFlame(root,l)}
  const nx=p.nx,nz=p.nz,bg=mergeParts(PROPS.brazier().parts);
  for(const sd of [-1,1]){let spot=null;
    for(const n of [0,.3,.6,.85])for(const u of [.95,.85,.75,.65]){if(spot)break;if(u<.8&&n<.6)continue;
      const x=p.x+tx*sd*u+nx*n,z=p.z+tz*sd*u+nz*n;if(wallDist(x,z)>=.4&&!blocked(x,z))spot=[x,z]}
    if(!spot)continue;const [x,z]=spot,m=new THREE.Mesh(bg,G.propMat);m.position.set(x,0,z);root.add(m);
    occStamp([x,z],[x,z],.3);const l={x,y:1.15,z,base:.95,kind:'brazier',nx:0,nz:0,dim:.55};W.lights.push(l);makeFlame(root,l)}
  G.chests.push({kind:'altar',x:p.x,z:p.z,nx:p.nx,nz:p.nz,g,loot:[],lock:-1,opened:false,t:-1,y0:.9})}
function bless(){G.fuel=1;G.fuelT*=1.6;sndBless();toast('Древний алтарь благословил тебя: факел горит дольше');lootLine('Благословение алтаря')}

// ---------- самоцветы, как в Skyrim: повреждённые, обычные и безупречные ----------
// классические камни бывают повреждёнными, обычными и безупречными; остальные — как есть
const GEMS=[
  {key:'amethyst',name:'аметист',col:'#9a50d8',w:5,graded:1,shape:'cut'},{key:'garnet',name:'гранат',col:'#a8182c',w:5,graded:1,shape:'cut'},
  {key:'ruby',name:'рубин',col:'#e8102a',w:3,graded:1,shape:'cut'},{key:'sapphire',name:'сапфир',col:'#1e4ee8',w:3,graded:1,shape:'cut'},
  {key:'emerald',name:'изумруд',col:'#14b45a',w:2,graded:1,shape:'cut'},{key:'diamond',name:'алмаз',col:'#e4f2ff',w:1,graded:1,shape:'cut'},
  {key:'pearl',name:'Жемчужина',col:'#f4eee2',w:2,shape:'pearl'},{key:'smallpearl',name:'Мелкая жемчужина',col:'#e6dccc',w:2.5,shape:'pearl',size:.7},
  {key:'moonstone',name:'Лунный камень',col:'#c8dcf0',w:2,shape:'rough'},{key:'malachite',name:'Малахит',col:'#1f9a5a',w:2,shape:'rough'},
  {key:'corundum',name:'Корунд',col:'#d0743a',w:1.5,shape:'rough'},
  {key:'soul1',name:'Мелкий камень душ',col:'#c08ae0',w:2.5,shape:'soul',size:.7},{key:'soul2',name:'Малый камень душ',col:'#b07ad8',w:2,shape:'soul',size:.85},
  {key:'soul3',name:'Обычный камень душ',col:'#9a62d0',w:1.5,shape:'soul',size:1},{key:'soul4',name:'Большой камень душ',col:'#8a4ec8',w:1,shape:'soul',size:1.15},
  {key:'soul5',name:'Великий камень душ',col:'#7a3ec0',w:.6,shape:'soul',size:1.3},{key:'soulb',name:'Чёрный камень душ',col:'#3a2a50',w:.3,shape:'soul',size:1.2}];
const GEM_Q=[{q:'flawed',pre:'Повреждённый ',w:5},{q:'normal',pre:'',w:3.5},{q:'flawless',pre:'Безупречный ',w:1.5}];
function rollGem(){const wpick=a=>{let s=0;for(const x of a)s+=x.w;let r=rnd()*s;for(const x of a){r-=x.w;if(r<=0)return x}return a[0]};
  const g=wpick(GEMS),q=g.graded?wpick(GEM_Q):{q:'single',pre:''},name=q.pre+g.name,c=new THREE.Color(g.col);
  const glow=`rgba(${c.r*255|0},${c.g*255|0},${c.b*255|0},${q.q==='flawless'||g.shape==='soul'?.75:q.q==='flawed'?.3:.55})`;
  return {key:g.key,q:q.q,shape:q.q==='flawed'?'rough':g.shape,size:g.size||1,name:name[0].toUpperCase()+name.slice(1),col:g.col,glow}}
const _gemGeo={};
function gemGeo(gm){const k=gm.key+gm.q;if(_gemGeo[k])return _gemGeo[k];const c=new THREE.Color(gm.col),sz=gm.size||1;let parts;
  if(gm.shape==='rough'){// неогранённый кусок: повреждённые камни, лунный камень, малахит, корунд
    const g=new THREE.IcosahedronGeometry(.06*sz,0),p=g.attributes.position;for(let i=0;i<p.count;i++)p.setXYZ(i,p.getX(i)*(1+.3*Math.sin(i*1.7)),p.getY(i)*.8,p.getZ(i)*(1+.3*Math.cos(i*2.3)));
    const dull=gm.q==='flawed'?c.clone().multiplyScalar(.7).lerp(new THREE.Color('#808080'),.25):c;parts=[[g,'#'+dull.getHexString(),_m4(0,.05*sz,0)]]}
  else if(gm.shape==='pearl')parts=[[new THREE.SphereGeometry(.045*sz,10,8),gm.col,_m4(0,.045*sz,0)]];
  else if(gm.shape==='soul'){// камень душ: вытянутый кристалл с гранями
    parts=[[new THREE.OctahedronGeometry(.05*sz,0),gm.col,_m4(0,.09*sz,0,0,.4,0,1,1.9,1)],[new THREE.OctahedronGeometry(.03*sz,0),'#ffffff',_m4(0,.09*sz,0,0,0,0,1,1.6,1)]]}
  else{// огранённый: корона + павильон, у безупречного крупнее и ярче
    const s=gm.q==='flawless'?1.9:1.5,col='#'+c.clone().multiplyScalar(gm.q==='flawless'?1.15:1).getHexString();
    parts=[[new THREE.CylinderGeometry(.024*s,.045*s,.022*s,8),col,_m4(0,.066*s,0)],[new THREE.ConeGeometry(.045*s,.055*s,8),col,_m4(0,.0275*s,0,Math.PI)]]}
  const geo=mergeParts(parts);geo.computeVertexNormals();return _gemGeo[k]=geo}

// ---------- решётка на выходе ----------
function buildGate(root){const A=W.exitArch,K=WT,hw=A.w/2,ir='#3a3634',parts=[];
  // решётка по форме арки: прутья обрезаны полукругом свода
  for(let x=-hw+.08;x<hw;x+=.18){const h=A.hs+Math.sqrt(Math.max(0,hw*hw-x*x))-.02;parts.push(cy(.025,.025,h,6,x,h/2,0,ir),[new THREE.ConeGeometry(.04,.12,6),ir,_m4(x,-.04,0,Math.PI)])}
  for(const y of [.35,A.hs*.55,A.hs])parts.push(bx(A.w-.04,.06,.05,0,y,0,ir));
  const m=new THREE.Mesh(mergeParts(parts),new THREE.MeshPhongMaterial({vertexColors:true,shininess:40,specular:0x444444}));
  m.position.set(A.cx-A.d[0]*(K/2-.12),0,A.cz-A.d[1]*(K/2-.12));m.rotation.y=Math.atan2(-A.d[0],-A.d[1]);root.add(m);
  G.gate={x0:A.x0,z0:A.z0,x1:A.x1,z1:A.z1,cx:A.cx,cz:A.cz,open:false,opening:false,m,H:A.top+.3}}

// ---------- тени ----------
// обитатель лабиринта — скелет: пиксельный спрайт (всегда лицом к камере), 4 кадра шага + светящиеся глаза
function buildMonsters(root){if(game.peaceful)return;const n=W.n,lvl=game.level,cnt=Math.min(4,1+Math.floor((lvl-1)/2)+(n>=16?1:0));
  const key='skeleton',C=CREATURES[key];if(!G.atlas)G.atlas=creatureAtlas(key);
  const mkTex=cv=>{const t=new THREE.CanvasTexture(cv);t.magFilter=t.minFilter=THREE.NearestFilter;t.generateMipmaps=false;t.repeat.set(.25,1);return t};
  const H=C.height,Wd=H*C.w/C.h;
  for(let k=0;k<cnt;k++){const m=new THREE.Group();root.add(m);
    const body=new THREE.Sprite(new THREE.SpriteMaterial({map:mkTex(G.atlas.base),alphaTest:.5,fog:true}));body.center.set(.5,0);body.scale.set(Wd,H,1);m.add(body);
    const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:mkTex(G.atlas.glow),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,fog:false}));
    glow.center.set(.5,0);glow.scale.set(Wd,H,1);glow.position.y=.002;m.add(glow);
    const mo={m,body,glow,walk:0,mode:'patrol',stepT:0,lost:0,speed:1.2,chase:Math.min(3,2.3+.1*lvl)};placeMonster(mo,k);G.monsters.push(mo)}}
// спрайт не освещается сам — яркость считаем от окружения: темнота, факел в руке, настенные огни
function lightAt(x,z){if(!TH.indoor)return .95;let L=TH.amb[1]*.55;
  const d=Math.hypot(x-pl.x,z-pl.z);if(hand.distance)L+=hand.intensity*1.6*Math.pow(Math.max(0,1-d/hand.distance),2);
  for(const l of W.lights){const e=Math.hypot(l.x-x,l.z-z);if(e<6)L+=1.1*Math.pow(1-e/6,2)}return clamp(L,.12,1)}
function placeMonster(mo,k){const n=W.n,dist=cellDist(W.M,n,0,0),max=Math.max(...dist),c=[];
  for(let i=0;i<n;i++)for(let j=0;j<n;j++)if(dist[i*n+j]>=max*.55&&!(i===W.exitCell.i&&j===W.exitCell.j))c.push([i,j]);
  const [i,j]=c.length?c[(ri(0,c.length-1)+k*7)%c.length]:[n-1,n-1],p=warp(i+.5,j+.5);
  Object.assign(mo,{x:p[0],z:p[1],cell:[i,j],prev:null,target:[i,j],mode:'patrol'});mo.m.position.set(p[0],0,p[1])}
function los(ax,az,bx,bz){const d=Math.hypot(bx-ax,bz-az),k=Math.ceil(d/.3);
  for(let i=1;i<k;i++){const t=i/k;if(blocked(ax+(bx-ax)*t,az+(bz-az)*t)&&!W.gateBlk(ax+(bx-ax)*t,az+(bz-az)*t))return false}return true}
function updateMonsters(dt,t){if(G.grace>0){G.grace-=dt;return}
  const n=W.n,M=W.M,g=toGrid(pl.x,pl.z),pc=[Math.floor(g[0]),Math.floor(g[1])],inMaze=pc[0]>=0&&pc[1]>=0&&pc[0]<n&&pc[1]<n;
  let pd=null;
  for(const mo of G.monsters){const d=Math.hypot(pl.x-mo.x,pl.z-mo.z),sees=inMaze&&d<Math.min(11,(scene.fog?scene.fog.far:11)+2)&&los(mo.x,mo.z,pl.x,pl.z);
    if(mo.stun>0){mo.stun-=dt;mo.m.position.set(mo.x+Math.sin(t*40)*.03,0,mo.z);mo.body.material.color.setScalar(lightAt(mo.x,mo.z)*.6);continue}
    if(sees||(mo.mode==='chase'&&d<3)){if(mo.mode!=='chase')sndGrowl(mo.x,mo.z);mo.mode='chase';mo.lost=0}
    else if(mo.mode==='chase'&&(mo.lost+=dt)>4)mo.mode='patrol';
    const tp=warp(mo.target[0]+.5,mo.target[1]+.5),sp=(mo.mode==='chase'?mo.chase:mo.speed)*dt,dx=tp[0]-mo.x,dz=tp[1]-mo.z,l=Math.hypot(dx,dz);
    if(l>sp){mo.x+=dx/l*sp;mo.z+=dz/l*sp;mo.walk+=sp}
    else{mo.x=tp[0];mo.z=tp[1];const [i,j]=mo.target,nb=[[1,0],[-1,0],[0,1],[0,-1]].filter(([a,b])=>i+a>=0&&j+b>=0&&i+a<n&&j+b<n&&M.open(i,j,a,b)).map(([a,b])=>[i+a,j+b]);
      let nx;
      if(mo.mode==='chase'&&inMaze){if(!pd)pd=cellDist(M,n,pc[0],pc[1]);nx=nb.reduce((a,b)=>pd[b[0]*n+b[1]]<pd[a[0]*n+a[1]]?b:a,nb[0])}
      else{const f=nb.filter(c=>!mo.prev||c[0]!==mo.prev[0]||c[1]!==mo.prev[1]);nx=pick(f.length?f:nb)}
      mo.prev=mo.target;mo.target=nx||mo.target}
    mo.m.position.set(mo.x,0,mo.z);const fr=Math.floor(mo.walk/.32)%4;mo.body.material.map.offset.x=mo.glow.material.map.offset.x=fr*.25;
    const lum=lightAt(mo.x,mo.z);mo.body.material.color.setRGB(lum,lum*.97,lum*.92);
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
  if(g.opening&&!g.open){g.m.position.y=Math.min(g.H-.25,g.m.position.y+dt*1.1);if(g.m.position.y>=Math.min(1.9,g.H-.4))g.open=true}
  // факел (только в подземельях)
  if(TH.indoor){G.fuel=Math.max(0,G.fuel-dt/G.fuelT);
    if(G.fuel<.95&&W.lights.some(l=>Math.hypot(l.x-pl.x,l.z-pl.z)<1.5)){if(G.fuel<.6)toast('Факел снова горит ярко');G.fuel=1;sndIgnite()}
    if(G.fuel<.2&&!G.hint.fuel){G.hint.fuel=1;toast('Факел догорает… Найди огонь')}if(G.fuel>.5)G.hint.fuel=0;
    const k=G.fuel;hand.intensity=TH.hand[1]*(.08+.92*k)*(.94+.06*Math.sin(t*17));hand.distance=TH.hand[2]*(.35+.65*k)}
  updateMonsters(dt,t);updateDrips(t);
  if(G.shake>0){G.shake-=dt;camera.position.x+=(Math.random()-.5)*.08*G.shake;camera.position.y+=(Math.random()-.5)*.08*G.shake}
  // HUD
  updateHud();
  const fb=document.getElementById('fuel');fb.style.display=TH.indoor?'block':'none';fb.firstChild.style.width=Math.round(G.fuel*100)+'%'}
