'use strict';
// ---------- gameplay: key and gate, torch, shadows, treasure, puddles ----------
let G={};

// dead ends (one open side), except start and exit
function deadEnds(){const n=W.n,M=W.M,e=W.exitCell,out=[];
  for(let i=0;i<n;i++)for(let j=0;j<n;j++){if(i+j===0||i===e.i&&j===e.j)continue;
    const op=[[1,0],[-1,0],[0,1],[0,-1]].filter(([a,b])=>i+a>=0&&j+b>=0&&i+a<n&&j+b<n&&M.open(i,j,a,b));
    if(op.length===1)out.push({i,j,dir:op[0]})}
  return out}
// spot in a dead end: by the blind wall, inset into the cell
function deadEndSpot(c,off){const [a,b]=c.dir,wp=warp(c.i+.5-a*.5,c.j+.5-b*.5),cc=warp(c.i+.5,c.j+.5);
  let nx=cc[0]-wp[0],nz=cc[1]-wp[1];const l=Math.hypot(nx,nz);nx/=l;nz/=l;return {x:wp[0]+nx*(BD+off),z:wp[1]+nz*(BD+off),nx,nz}}

function glowSprite(col,size){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex('glow_'+col,()=>mkGlowTex([[0,col],[1,'rgba(0,0,0,0)']])),
  blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));s.scale.set(size,size,1);return s}

function buildGameplay(root){
  const lvl=game.level;
  // G.gold and G.gems count what was found on this level; the purse (game.gold, game.gems) carries over between levels
  G={hasKey:false,hasMap:false,gold:0,gems:[],time:0,fuel:1,items:[],monsters:[],hint:{},grace:4,bless:{},coins:[],coinT:0,
    fuelT:Math.max(60,120-(lvl-1)*8)};
  // chests in dead ends: the farthest holds the key, another the map, the rest gold and gems
  const de=deadEnds(),dist=cellDist(W.M,W.n,0,0),R=reachMap(W.start.x,W.start.z,.28);
  de.sort((a,b)=>dist[b.i*W.n+b.j]-dist[a.i*W.n+a.j]);
  const spots=[];
  for(const c of de){const p=deadEndSpot(c,.2+.3),   // wall offset: room for the lid to open
    front={x:p.x+p.nx*.7,z:p.z+p.nz*.7};
    if((W.placed||[]).some(q=>Math.hypot(q.x-p.x,q.z-p.z)<q.r+.6)||!R.has(front.x,front.z))continue;spots.push(p)}
  G.chests=[];G.fly=[];G.chestLight={position:new THREE.Vector3(),intensity:0};   // no separate light: the glow is enough
  // the shrine takes one of the far dead ends
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
  // map bought from the trader: the map chest holds coins instead
  if(game.mapNext){game.mapNext=false;G.hasMap=true;for(const c of G.chests)c.loot=c.loot.map(l=>l.t==='map'?{t:'gold',n:ri(10,20)}:l)}
  if(shSpot)buildShrine(root,shSpot);
  // burial urns along walls and handfuls of coins left in wall pits
  const used=G.chests.map(c=>({x:c.x,z:c.z}));
  const okAt=(x,z,r)=>!blocked(x,z)&&wallDist(x,z)>.05&&Math.hypot(x-W.start.x,z-W.start.z)>2&&used.every(u=>Math.hypot(u.x-x,u.z-z)>r)&&
    !(W.placed||[]).some(p=>Math.hypot(p.x-x,p.z-z)<p.r+.4)&&!W.lights.some(l=>Math.hypot(l.x-x,l.z-z)<.8);
  const faces=W.faces.filter(f=>!f.outer);let nu=Math.min(3+lvl,10),np=Math.min(2+(lvl>>1),6);
  for(let tries=0;tries<200&&nu>0;tries++){const fc=pick(faces),L=fc.sg.len;if(L<WT+1)continue;const s=rr(BD+.4,L-BD-.4),p=faceAt(fc,s,.3),x=p.x+p.nx*(BD+.24),z=p.z+p.nz*(BD+.24);
    if(!okAt(x,z,1.4)||!R.near(x,z,.4))continue;used.push({x,z});nu--;            // urn must be reachable (not behind barrels)
    addUrn(root,x,z,[{t:'gold',n:ri(3,12)},...(rnd()<.3?[{t:'picks',n:1}]:[]),...(rnd()<.15?[{t:'gem',gem:rollGem()}]:[])])}
  // a pit takes coins if it is free (no skull, candle or crystal), wide enough, between knee and shoulder height and
  // reached from the corridor in front of it
  const pits=W.niches.filter(n=>{if(n.used||n.r<.3)return false;const x=n.x+n.nx*.6,z=n.z+n.nz*.6,h=n.y-floorH(x,z);
    return h>.45&&h<1.4&&okAt(x,z,1.5)&&R.has(x,z)});
  while(np>0&&pits.length){const n=pits.splice(ri(0,pits.length-1),1)[0];if(used.some(u=>Math.hypot(u.x-n.x,u.z-n.z)<1.5))continue;
    n.used=1;used.push({x:n.x,z:n.z});np--;addCoins(root,n,[{t:'gold',n:ri(10,25)}])}
  buildGate(root);
  buildMonsters(root);
  buildPuddles(root);
  W.gateBlk=(x,z)=>{const g=G.gate;return g&&!g.open&&x>g.x0&&x<g.x1&&z>g.z0&&z<g.z1}}

// ---------- chests ----------
const LOOT_GOLD='#e8b84a';
let _lootGeo=null;
function lootGeo(l){if(!_lootGeo){const g=LOOT_GOLD;_lootGeo={
    key:mergeParts([[new THREE.TorusGeometry(.07,.018,6,12),g,_m4(0,.12,0)],bx(.025,.22,.025,0,-.04,0,g),bx(.06,.025,.02,.035,-.12,0,g),bx(.045,.025,.02,.03,-.07,0,g)]),
    map:mergeParts([cy(.05,.05,.32,8,0,0,0,'#e8dcb8',0,0,Math.PI/2),cy(.02,.02,.4,6,0,0,0,'#6a4020',0,0,Math.PI/2)]),
    gold:mergeParts([cy(.05,.05,.015,10,0,.008,0,g),cy(.05,.05,.015,10,.03,.024,.02,g),cy(.05,.05,.015,10,-.02,.04,-.01,g),cy(.05,.05,.015,10,.01,.056,.01,g)])}}
  return l.t==='gem'?gemGeo(l.gem):_lootGeo[l.t]}
function chestGeos(){const wd='#6a4024',inn='#2e1a10',ir='#34302c',gold='#c8a040',half=(r,l)=>new THREE.CylinderGeometry(r,r,l,12,1,false,0,Math.PI);
  // hollow box: floor and four 4 cm walls, dark wood inside
  const T=.04,base=[bx(.86,.42,T,0,.21,.26-T/2,wd),bx(.86,.42,T,0,.21,-.26+T/2,wd),bx(T,.42,.52-2*T,.43-T/2,.21,0,wd),bx(T,.42,.52-2*T,-.43+T/2,.21,0,wd),
    bx(.86-2*T,.05,.52-2*T,0,.065,0,inn),bx(.88,.04,.54,0,.03,0,ir),bx(.12,.1,.02,0,.36,.27,gold)];
  // iron bands outside only (front, back and bottom)
  for(const x of [-.33,.33])base.push(bx(.06,.43,.012,x,.215,.266,ir),bx(.06,.43,.012,x,.215,-.266,ir));
  // lid: pivot at the top back edge (0,.42,-.26); underside boarded so it doesn't show through
  const lid=[[half(.26,.86),wd,_m4(0,0,.26,0,0,Math.PI/2,.62,1,1)],bx(.84,.02,.5,0,.01,.26,inn),bx(.12,.06,.04,0,.02,.53,gold)];
  for(const x of [-.33,.33])lid.push([half(.27,.06),ir,_m4(x,0,.26,0,0,Math.PI/2,.64,1,1)]);
  if(TH.snow)lid.push(bx(.78,.04,.3,0,.15,.26,'#eef3fa'));
  return {base:mergeParts(base),lid:mergeParts(lid)}}
// locks, Skyrim-style: higher level = narrower sweet spot for the pick
const LOCKS=[{name:'Novice',w:.55},{name:'Apprentice',w:.38},{name:'Adept',w:.25},{name:'Expert',w:.15},{name:'Master',w:.08}];
function rollLock(){const r=rnd()+game.level*.06;return r<.45?0:r<.75?1:r<.95?2:r<1.12?3:4}
// the exit gate: two tumblers in a row, each about as hard as an Adept lock; a set tumbler stays set
const GATE_LOCK={name:'Gate',w:.26,tumblers:2,wear:1.6};
const PROMPT={chest:'Open chest',urn:'Search urn',coins:'Take coins',altar:'Pray at the altar'};

// chest stand: flat boulder or two stone slabs; top at height h
function plinthGeo(kind,h){const st=TH.snow?'#8a8e96':pick(['#6e6860','#7a7266','#625c54']),P=[];
  if(kind==='rock'){const g=new THREE.CylinderGeometry(.6,.7,h,9,2),p=g.attributes.position;
    for(let i=0;i<p.count;i++){const y=p.getY(i),k=1+(y<h/2-.01?rr(-.09,.09):rr(-.04,.02));p.setX(i,p.getX(i)*k);p.setZ(i,p.getZ(i)*k);if(y<-h/2+.01)p.setY(i,y-.03)}
    P.push([g,st,_m4(0,h/2,0,0,rr(0,6),0,1,1,.72)]);
    for(let i=ri(2,4);i>0;i--){const a=rr(0,6.28),r=rr(.06,.13);P.push([new THREE.IcosahedronGeometry(r,0),shade(st,rr(.8,1)),_m4(Math.cos(a)*.66,r*.5,Math.sin(a)*.5,rr(0,6),rr(0,6),0,1,.7,1)])}}
  else{P.push(bx(1.1,h*.5,.72,0,h*.25,0,shade(st,.9),0,rr(-.06,.06),0),bx(.98,h*.5,.64,0,h*.75,0,st,0,rr(-.05,.05),0));
    P.push(bx(.16,.1,.12,rr(-.4,.4),.05,.42,shade(st,.8),rr(0,1),rr(0,1),0))}
  if(TH.snow)P.push(bx(1.0,.03,.12,0,h+.005,.3,'#eef3fa'));
  return mergeParts(P)}
function addChest(root,p,loot,isKey,lock){if(!G.chestGeo)G.chestGeo=chestGeos();
  const mat=G.propMat||(G.propMat=new THREE.MeshLambertMaterial({vertexColors:true,map:tex('prop',()=>mkBrickTex(77))}));
  // sometimes the chest sits raised on a rock or stone slab
  let h=0;if(rnd()<.35){const kind=rnd()<.55?'rock':'slab';h=kind==='rock'?rr(.28,.42):rr(.3,.4);
    const pm=new THREE.Mesh(plinthGeo(kind,h),mat);pm.position.set(p.x,-.02,p.z);pm.rotation.y=Math.atan2(p.nx,p.nz);root.add(pm);h-=.02}
  const g=new THREE.Group(),yaw=Math.atan2(p.nx,p.nz);g.position.set(p.x,h,p.z);g.rotation.y=yaw;root.add(g);
  g.add(new THREE.Mesh(G.chestGeo.base,mat));const piv=new THREE.Object3D();piv.position.set(0,.42,-.26);g.add(piv);piv.add(new THREE.Mesh(G.chestGeo.lid,mat));
  const glow=glowSprite('rgba(255,210,120,.9)',.01);glow.position.set(0,.45,0);g.add(glow);
  const c=Math.cos(yaw),s=Math.sin(yaw),e=h?.42:.38;occStamp([p.x-c*e,p.z+s*e],[p.x+c*e,p.z-s*e],h?.36:.3);
  G.chests.push({kind:'chest',x:p.x,z:p.z,nx:p.nx,nz:p.nz,g,piv,glow,loot,isKey,lock:lock===undefined?-1:lock,opened:false,t:-1,y0:.45+h})}
// burial urn: stone, lidded; searched with E
function urnGeos(){const st='#7a7468',dk='#5a564e',pr=[[0,0],[.12,0],[.17,.06],[.21,.2],[.2,.34],[.14,.44],[.12,.47],[.1,.47],[.1,.3],[0,.3]];
  const body=[[new THREE.LatheGeometry(pr.map(p=>new THREE.Vector2(p[0],p[1])),10),st,_m4()],cy(.215,.215,.04,10,0,.2,0,dk,0,0,0,true),cy(.205,.205,.03,10,0,.3,0,dk,0,0,0,true)];
  const lid=[cy(.13,.14,.04,10,0,.02,0,dk),cy(.03,.05,.06,8,0,.07,0,st)];
  if(TH.snow)lid.push(cy(.12,.13,.02,10,0,.05,0,'#eef3fa'));
  return {body:mergeParts(body),lid:mergeParts(lid)}}
function addUrn(root,x,z,loot){if(!G.urnGeo)G.urnGeo=urnGeos();
  const mat=G.propMat||(G.propMat=new THREE.MeshLambertMaterial({vertexColors:true,map:tex('prop',()=>mkBrickTex(77))}));
  const um=G.urnMat||(G.urnMat=new THREE.MeshLambertMaterial({vertexColors:true,map:tex('prop',()=>mkBrickTex(77)),side:THREE.DoubleSide}));
  const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rr(0,6.28);root.add(g);g.add(new THREE.Mesh(G.urnGeo.body,um));
  const piv=new THREE.Object3D();piv.position.set(0,.46,0);g.add(piv);piv.add(new THREE.Mesh(G.urnGeo.lid,mat));
  G.chests.push({kind:'urn',x,z,nx:0,nz:0,g,piv,loot,lock:-1,opened:false,t:-1,y0:.5})}
// a handful of coins on the bottom brick of a wall pit: a short stack, coins scattered flat around it and a couple
// leaning on the stack. a few heaps per level, each pit gets one of them turned its way. a heap keeps the list of its
// coins (place and colour), so the very coins that lie in the pit are the ones that fly to the player (takeCoins)
const COIN_R=.034,COIN_H=.009,COIN_COLS=[LOOT_GOLD,'#d4a43c','#f0c860'];
const coinGeo=col=>(G.coinGeo||(G.coinGeo={}))[col]||(G.coinGeo[col]=mergeParts([[new THREE.CylinderGeometry(COIN_R,COIN_R,COIN_H,9),col,_m4()]]));
function coinHeap(){const list=[],R=COIN_R,H=COIN_H,coin=(x,y,z,rx,ry,rz)=>list.push({col:COIN_COLS[rnd()<.5?0:ri(1,2)],m:_m4(x,y,z,rx,ry,rz)});
  // x along the wall, z out of it: the pit floor is about .25 deep, the heap keeps to the middle of it
  const stack=(x,z,n)=>{for(let i=0;i<n;i++)coin(x+rr(-.006,.006),H/2+i*H,z+rr(-.006,.006),0,0,0)};
  const sx=rr(-.05,.05),sz=rr(-.02,.02);stack(sx,sz,ri(3,6));if(rnd()<.6)stack(sx+(rnd()<.5?-1:1)*rr(.09,.12),rr(-.03,.03),ri(2,3));
  for(let i=ri(7,11);i>0;i--){const a=rr(0,6.28),r=rr(.05,.17);coin(sx+Math.cos(a)*r,H/2+(rnd()<.3?H:0),sz+Math.sin(a)*r*.45,rr(-.05,.05),0,rr(-.05,.05))}
  // leaning on the stack: the low edge on the brick, the high edge on the stack (the axis tips away from it)
  for(let i=ri(1,3);i>0;i--){const a=rr(0,6.28),t=rr(.35,.7);coin(sx+Math.cos(a)*.055,R*Math.sin(t)+H/2,sz+Math.sin(a)*.055,0,Math.PI-a,t)}
  return {list,geo:mergeParts(list.map(c=>[new THREE.CylinderGeometry(R,R,H,9),c.col,c.m]))}}
function addCoins(root,n,loot){if(!G.coinHeaps)G.coinHeaps=[0,1,2].map(coinHeap);const h=pick(G.coinHeaps);
  const m=new THREE.Mesh(h.geo,LMAT());m.position.set(n.x,n.y,n.z);m.rotation.y=Math.atan2(n.nx,n.nz)+(rnd()<.5?Math.PI:0);m.userData.heap=h;root.add(m);
  G.chests.push({kind:'coins',x:n.x,z:n.z,nx:n.nx,nz:n.nz,g:m,loot,lock:-1,opened:false,t:-1,y0:n.y+.05})}
// loot flies to the player the same way from everywhere (a wall pit, a chest, an urn): one piece after another, each on
// a smooth curve (out of the container first, then on to the player), tumbling, and a little smaller as it arrives.
// gold comes as single coins, a burst of them; the other things fly one by one, slower, turning so they can be seen.
// what a piece carries is counted when it arrives
const COIN_FLY=.6,ITEM_FLY=.8;
// fly: {m, p0 start, out (p0+out is the curve's middle point), t (negative: still waiting), spin, dur, loot, hide, grow}
function launch(m,p0,out,delay,o){root.add(m);m.position.copy(p0);
  G.fly.push(Object.assign({m,p0:p0.clone(),out,t:-delay,spin:new THREE.Vector3(rr(6,12),rr(-4,4),rr(-3,3)),dur:COIN_FLY,loot:null},o))}
function takeCoins(c){const h=c.g.userData.heap,loot=c.loot,M=new THREE.Matrix4();c.loot=[];c.g.updateMatrixWorld();c.g.visible=false;
  const out=new THREE.Vector3(c.nx,0,c.nz),side=new THREE.Vector3(-c.nz,0,c.nx),n=h.list.length;
  h.list.forEach((q,i)=>{const m=new THREE.Mesh(coinGeo(q.col),LMAT());M.multiplyMatrices(c.g.matrixWorld,q.m);M.decompose(m.position,m.quaternion,m.scale);
    launch(m,m.position,out.clone().multiplyScalar(rr(.35,.5)).addScaledVector(side,rr(-.12,.12)).add(new THREE.Vector3(0,rr(.08,.18),0)),i*.03,{loot:i===n-1?loot:null})})}
// a chest's or an urn's loot, once the lid is open: up out of it and towards the player
function launchLoot(c){const fx=pl.x-c.x,fz=pl.z-c.z,fl=Math.hypot(fx,fz)||1,dir=new THREE.Vector3(fx/fl,0,fz/fl),side=new THREE.Vector3(-dir.z,0,dir.x),
    urn=c.kind==='urn',wide=urn?.04:.14,p=new THREE.Vector3();let at=0;
  const out=k=>dir.clone().multiplyScalar(rr(.2,.35)).addScaledVector(side,rr(-.12,.12)).add(new THREE.Vector3(0,rr(.35,.5)*k,0));
  for(const l of c.loot){
    if(l.t==='gold'){const n=clamp(Math.round(l.n/2),5,14);
      for(let i=0;i<n;i++){const m=new THREE.Mesh(coinGeo(pick(COIN_COLS)),LMAT());m.rotation.set(rr(-.4,.4),rr(0,6.3),rr(-.4,.4));
        p.set(c.x+rr(-wide,wide),c.y0+rr(-.03,.02),c.z+rr(-wide,wide));launch(m,p,out(1),at,{loot:i===n-1?[l]:null,hide:true,grow:urn});at+=.035}
      at+=.12}
    else{const m=new THREE.Mesh(lootGeo(l),LMAT());p.set(c.x,c.y0,c.z);
      launch(m,p,out(1.2),at,{loot:[l],hide:true,grow:urn,dur:ITEM_FLY,spin:new THREE.Vector3(rr(-.8,.8),rr(3,5)*(rnd()<.5?1:-1),rr(-.6,.6))});at+=.22}}
  c.loot=[]}
function updateFly(dt){const cp=camera.position,to=new THREE.Vector3(),c1=new THREE.Vector3();
  for(let i=G.fly.length-1;i>=0;i--){const f=G.fly[i];f.t+=dt;if(f.t<0){if(f.hide)f.m.visible=false;continue}f.m.visible=true;
    const k=Math.min(1,f.t/f.dur),e=k*k*(3-2*k);
    // a quadratic curve: from where it lay, through a point just out of the container, to a spot a little below the eyes
    to.set(cp.x,cp.y-.22,cp.z);c1.copy(f.p0).add(f.out);
    f.m.position.set(0,0,0).addScaledVector(f.p0,(1-e)*(1-e)).addScaledVector(c1,2*e*(1-e)).addScaledVector(to,e*e);
    f.m.rotation.x+=f.spin.x*dt;f.m.rotation.y+=f.spin.y*dt;f.m.rotation.z+=f.spin.z*dt;
    // out of an urn it grows out of the narrow mouth instead of popping up whole
    f.m.scale.setScalar((f.grow?Math.min(1,.15+k/.25*.85):1)*(1-.55*e*e));
    if(k>=1){root.remove(f.m);G.fly.splice(i,1);if(f.loot)f.loot.forEach(giveLoot)}}}
// container in front of the player
function chestInReach(){let best=null,bd=9;const fx=-Math.sin(pl.yaw),fz=-Math.cos(pl.yaw);
  for(const c of G.chests){if(c.opened)continue;const dx=c.x-pl.x,dz=c.z-pl.z,d=Math.hypot(dx,dz),r=c.kind==='chest'?1.7:1.4;
    if(d<r&&(d<.8||(dx*fx+dz*fz)/d>.35)&&d<bd){best=c;bd=d}}return best}
// the locked exit gate, while the key is not found
function gateInReach(){const g=G.gate;if(!g||g.open||g.opening||G.hasKey)return null;return Math.hypot(g.cx-pl.x,g.cz-pl.z)<2.4?g:null}
function useAction(){if(LP.active)return;const c=chestInReach();
  if(!c){const g=gateInReach();if(g){if(game.picks<=0){toast('No lockpicks');sndLocked();return}startLockpick(g)}return}
  if(c.kind==='altar'){pray(c);return}
  if(c.lock>=0){if(game.picks<=0){toast('No lockpicks');sndLocked();return}startLockpick(c);return}
  openContainer(c)}
function openContainer(c){c.opened=true;c.t=0;
  if(c.kind==='chest'){sndChestOpen(c.x,c.z);chestNoise(c.x,c.z);G.chestLight.position.set(c.x,.8,c.z);G.chestLightT=1.6}
  else if(c.kind==='urn')sndUrn();
  else{sndCoins();takeCoins(c)}}
function giveLoot(l){const add=(s,ic)=>lootLine(s,ic);
  if(l.t==='key'){G.hasKey=true;add('Gate key','key');sndPickup('key');toast('Key found! Head for the exit')}
  else if(l.t==='map'){G.hasMap=true;add('Maze map (press M)','map');sndPickup('map')}
  else if(l.t==='gold'){G.gold+=l.n;game.gold+=l.n;add(l.n+' gold','coin');sndCoins();if(!game.coinHint){game.coinHint=1;add('F: throw a coin to distract the shadows')}}
  else if(l.t==='picks'){game.picks+=l.n;add('Lockpick'+(l.n>1?' ×'+l.n:''),'pick');sndPickup('map')}
  else{G.gems.push(l.gem);game.gems.push(l.gem);add(l.gem.name,'gem:'+l.gem.key);sndPickup('gem')}}
function lootLine(text,ic){const box=document.getElementById('loot'),d=document.createElement('div');if(ic){const im=document.createElement('img');im.src=hudIcon(ic);d.appendChild(im)}
  d.appendChild(document.createTextNode(text));box.appendChild(d);
  setTimeout(()=>d.classList.add('out'),3200);setTimeout(()=>d.remove(),4200)}
const LMAT=()=>G.lootMat||(G.lootMat=new THREE.MeshPhongMaterial({vertexColors:true,shininess:80,specular:0xaa8844,emissive:0x221100}));
const URN_OUT=.75;   // s: the urn lid's move takes .7 s
function updateChests(dt,t){
  for(const c of G.chests){if(c.t<0)continue;c.t+=dt;const k=Math.min(1,c.t/.7),e=1-Math.pow(1-k,3);
    if(c.kind==='chest'){c.piv.rotation.x=-1.05*e;   // 60°, not all the way — otherwise the lid clips into the wall
      const gs=Math.sin(Math.min(1,c.t/1.2)*Math.PI)*1.6;c.glow.scale.set(gs,gs,1)}
    // urn: the lid lifts, slides over and tips on the rim; the loot waits until it has (URN_OUT)
    else if(c.kind==='urn'){c.piv.position.y=.46+Math.sin(Math.min(1,c.t/.35)*Math.PI)*.12;c.piv.position.x=.12*e;c.piv.rotation.z=-.5*e}
    if(c.t>(c.kind==='chest'?.45:URN_OUT)&&c.loot.length)launchLoot(c);
    if(c.t>2)c.t=-1}
  if(G.chestLightT>0){G.chestLightT-=dt;G.chestLight.intensity=Math.max(0,G.chestLightT)*1.2}
  updateFly(dt);
  const pr=document.getElementById('prompt'),c=chestInReach(),g=!c&&gateInReach();pr.style.display=(c||g)&&!LP.active?'block':'none';
  if(c)pr.textContent=c.lock>=0?`[E] Pick lock (${LOCKS[c.lock].name}) · picks: ${game.picks}`:`[E] ${PROMPT[c.kind]}`;
  else if(g)pr.textContent=`[E] Pick the gate lock (${GATE_LOCK.tumblers} tumblers) · picks: ${game.picks}`}

// ---------- lockpicking ----------
// mouse moves the pick (angle 0..π), holding E / mouse button turns the lock;
// in the wrong spot the lock turns partway, the pick bends and may break
const LP={active:false};
// a lock keeps its sweet spots (one per tumbler) and the tumblers already set in c.pins: walking away from it
// (Q, the menu, a lost mouse lock, no picks left) and coming back finds the very same lock, not a new one
function startLockpick(c){const L=c.kind==='gate'?GATE_LOCK:LOCKS[c.lock],n=L.tumblers||1;
  const P=c.pins||(c.pins={sweet:Array.from({length:n},()=>rr(.25,Math.PI-.25)),stage:0});
  Object.assign(LP,{active:true,c,name:L.name,ang:Math.PI/2,sweet:P.sweet[P.stage],w:L.w,wear:(L.wear||1.4+c.lock*.25)*(G.bless.thief?.5:1),
    tumblers:n,stage:P.stage,turn:0,hp:1,hold:false,mouse:false,ready:false,jit:0,scrapeT:0});
  document.getElementById('lockpick').style.display='flex';
  for(const k in keys)keys[k]=false;sndLockStart();drawLock()}
function stopLockpick(msg){LP.active=false;document.getElementById('lockpick').style.display='none';if(msg)toast(msg)}
function lockpickMouse(dx){if(!LP.active)return;const a=LP.ang;LP.ang=clamp(LP.ang+dx*.006,0,Math.PI);
  if(Math.abs(LP.ang-a)>.01&&(LP.scrapeT-=Math.abs(dx))<0){LP.scrapeT=40;sndPickScrape()}}
// turn the lock: any of WASD / E / space / arrows or a mouse button.
// keys only work once all are released after the lock opens (E may still be held)
const LP_KEYS=['KeyW','KeyA','KeyS','KeyD','KeyE','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
function updateLockpick(dt){if(!LP.active)return;
  const k=LP_KEYS.some(c=>keys[c]);if(!k)LP.ready=true;const hold=LP.hold||LP.mouse||(LP.ready&&k);
  const d=Math.abs(LP.ang-LP.sweet),max=d<LP.w/2?1:Math.max(0,1-(d-LP.w/2)/.7);
  if(hold){LP.turn=Math.min(max,LP.turn+dt*1.6);
    if(LP.turn>=1){
      // a tumbler set: the next one has its own sweet spot; release before turning again
      if(LP.stage+1<LP.tumblers){LP.stage++;LP.c.pins.stage=LP.stage;LP.turn=0;LP.sweet=LP.c.pins.sweet[LP.stage];LP.hold=LP.mouse=LP.ready=false;sndLockStart();toast('Tumbler '+LP.stage+'/'+LP.tumblers+' set');drawLock();return}
      sndUnlock();const c=LP.c;if(c.kind==='gate'){stopLockpick('The gate lock gives way');openGate();return}
      c.lock=-1;stopLockpick('Unlocked');openContainer(c);return}
    if(LP.turn>=max-.01){LP.hp-=dt*LP.wear;LP.jit=Math.sin(performance.now()*.08)*.04;
      // a broken pick: the next one does not turn until the key or the mouse button is let go and pressed again
      if(LP.hp<=0){game.picks--;pickNoise(LP.c);LP.hp=1;LP.turn=0;LP.hold=LP.mouse=LP.ready=false;
        if(game.picks<=0){stopLockpick('Out of lockpicks');return}toast('Lockpick broke. The snap echoes down the corridors')}}}
  else{LP.turn=Math.max(0,LP.turn-dt*3);LP.jit=0}
  drawLock()}
function drawLock(){const cv=document.getElementById('lpCanvas'),x=cv.getContext('2d'),W2=cv.width,cx=W2/2,cy=W2/2,R=W2*.38;
  x.clearRect(0,0,W2,W2);
  const g=x.createRadialGradient(cx,cy,R*.2,cx,cy,R*1.15);g.addColorStop(0,'#6e665a');g.addColorStop(1,'#2a2622');
  x.fillStyle=g;x.beginPath();x.arc(cx,cy,R*1.12,0,7);x.fill();
  // nordic ornament around the ring
  x.strokeStyle='#8a806e';x.lineWidth=3;x.beginPath();x.arc(cx,cy,R*1.02,0,7);x.stroke();
  for(let i=0;i<24;i++){const a=i/24*6.283;x.fillStyle=i%2?'#5a5248':'#9a8e78';x.fillRect(cx+Math.cos(a)*R*.94-3,cy+Math.sin(a)*R*.94-3,6,6)}
  x.fillStyle='#3a342e';x.beginPath();x.arc(cx,cy,R*.62,0,7);x.fill();
  // lock cylinder with slot, turns 90°
  x.save();x.translate(cx,cy);x.rotate(LP.turn*Math.PI/2+LP.jit);
  x.fillStyle='#b8ac94';x.beginPath();x.arc(0,0,R*.5,0,7);x.fill();x.fillStyle='#8a806e';x.beginPath();x.arc(0,0,R*.42,0,7);x.fill();
  x.fillStyle='#120e0c';x.beginPath();x.arc(0,-R*.12,R*.11,0,7);x.fill();x.fillRect(-R*.05,-R*.12,R*.1,R*.36);x.restore();
  // pick: enters the keyhole, angle runs over the top from left to right
  const a=Math.PI+LP.ang,len=R*1.3,hx=cx+Math.cos(a)*len,hy=cy+Math.sin(a)*len;
  x.save();x.translate(cx,cy);x.rotate(LP.jit*3);x.translate(-cx,-cy);
  x.strokeStyle='#c8c4bc';x.lineWidth=5;x.lineCap='round';x.beginPath();x.moveTo(cx,cy-R*.05);x.lineTo(hx,hy);x.stroke();
  x.strokeStyle='#6a665e';x.lineWidth=2;x.beginPath();x.moveTo(cx,cy-R*.05);x.lineTo(hx,hy);x.stroke();x.restore();
  // tension wrench below
  x.save();x.translate(cx,cy);x.rotate(LP.turn*Math.PI/2);x.fillStyle='#4a4640';x.fillRect(-R*.04,R*.1,R*.08,R*1.0);x.restore();
  // pick durability
  x.fillStyle='#2a2622';x.fillRect(cx-R*.6,W2-28,R*1.2,10);x.fillStyle=LP.hp>.4?'#c8b48a':'#d05030';x.fillRect(cx-R*.6,W2-28,R*1.2*LP.hp,10);
  document.getElementById('lpLevel').textContent='Lock: '+LP.name+(LP.tumblers>1?` · tumbler ${LP.stage+1}/${LP.tumblers}`:'');
  document.getElementById('lpPicks').textContent='Lockpicks: '+game.picks}

// ---------- shrine: altar, candles, braziers; praying grants a blessing ----------
function buildShrine(root,p){const st='#7a7468',dk='#5a564e',cloth=TH.cloth||(TH.indoor&&game.theme==='catacombs'?'#24365a':'#6a1a14');
  const parts=[bx(.9,.8,.5,0,.4,0,st),bx(1.04,.09,.62,0,.845,0,dk),bx(1.04,.12,.64,0,.06,0,dk),bx(.3,.012,.66,0,.896,0,cloth),bx(.3,.5,.012,0,.64,.326,cloth),
    cy(.12,.09,.06,10,.28,.92,0,'#8a7a50'),cy(.03,.035,.2,7,-.32,.99,.1,'#e8dcc0'),cy(.03,.035,.14,7,-.4,.96,-.05,'#e8dcc0'),cy(.03,.035,.26,7,.4,1.02,-.12,'#e8dcc0'),
    bx(.34,.5,.1,0,1.13,-.2,'#6a665c'),bx(.12,.1,.17,0,1.27,-.12,'#d8ccb0'),bx(.08,.07,.1,0,1.22,-.02,'#d8ccb0')];
  // antlers above the stele: an ancient sign, tied to no particular faith
  for(const sd of [-1,1])parts.push(bx(.03,.34,.03,sd*.12,1.44,-.13,'#c8b890',0,0,-sd*.55),bx(.025,.16,.025,sd*.15,1.58,-.13,'#c8b890',0,0,sd*.25),
    bx(.025,.15,.025,sd*.25,1.56,-.13,'#c8b890',0,0,-sd*.9),bx(.022,.12,.022,sd*.29,1.66,-.13,'#c8b890',0,0,-sd*.3));
  const yaw=Math.atan2(p.nx,p.nz),g=new THREE.Mesh(mergeParts(parts),G.propMat||(G.propMat=new THREE.MeshLambertMaterial({vertexColors:true,map:tex('prop',()=>mkBrickTex(77))})));
  g.position.set(p.x,0,p.z);g.rotation.y=yaw;root.add(g);const c=Math.cos(yaw),s=Math.sin(yaw);occStamp([p.x-c*.45,p.z+s*.45],[p.x+c*.45,p.z-s*.45],.33);
  const tx=c,tz=-s;   // tangent along the wall
  for(const [dx,h] of [[-.32,.99+.1],[-.4,.96+.07],[.4,1.02+.13]]){const l={x:p.x+tx*dx,y:h+.06,z:p.z+tz*dx,base:h,kind:'candle',nx:0,nz:0,nolight:1};W.lights.push(l);makeFlame(root,l)}
  const nx=p.nx,nz=p.nz,bg=mergeParts(PROPS.brazier().parts);
  for(const sd of [-1,1]){let spot=null;
    for(const n of [0,.3,.6,.85])for(const u of [.95,.85,.75,.65]){if(spot)break;if(u<.8&&n<.6)continue;
      const x=p.x+tx*sd*u+nx*n,z=p.z+tz*sd*u+nz*n;if(wallDist(x,z)>=.4&&!blocked(x,z))spot=[x,z]}
    if(!spot)continue;const [x,z]=spot,bak=W.occ.occ.slice();occStamp([x,z],[x,z],.3);
    // a brazier plus nearby props must not block access to the altar
    if(!reachMap(W.start.x,W.start.z,.28).near(p.x+nx*.7,p.z+nz*.7,.4)){W.occ.occ.set(bak);continue}
    const m=new THREE.Mesh(bg,G.propMat);m.position.set(x,0,z);root.add(m);const l={x,y:1.15,z,base:.95,kind:'brazier',nx:0,nz:0,dim:.55};W.lights.push(l);makeFlame(root,l)}
  G.chests.push({kind:'altar',x:p.x,z:p.z,nx:p.nx,nz:p.nz,g,loot:[],lock:-1,opened:false,t:-1,y0:.9})}
// praying at the altar grants one blessing for the rest of the level. which one is fixed per maze: it is rolled
// from the maze seed, so a caught player who starts the level over finds the same blessing; a new maze rolls a new one
const BLESSINGS=[{id:'shadow',name:'Blessing of Shadows',desc:'Shadows notice you only up close'},
  {id:'thief',name:'Blessing of the Thief',desc:'Lockpicks wear out half as fast'},
  {id:'swift',name:'Blessing of Swiftness',desc:'You walk and run a fifth faster'},
  {id:'ward',name:'Blessing of the Ward',desc:'The first shadow to catch you is struck down instead'},
  {id:'plenty',name:'Blessing of Plenty',desc:'Three lockpicks appear on the altar'},
  {id:'flame',name:'Blessing of the Flame',desc:'Your torch burns bright and twice as long',indoor:1,torch:1}];
function rollBlessing(){const L=BLESSINGS.filter(b=>(!b.indoor||TH.indoor)&&(!b.torch||game.torch));return L[Math.floor(mulberry(game.seed*31+7)()*L.length)]}
function pray(c){const b=G.blessing||(G.blessing=rollBlessing());c.opened=true;G.bless[b.id]=1;
  if(b.id==='plenty')game.picks+=3;if(b.id==='flame'){G.fuel=1;G.fuelT*=2}
  sndBless();toast(b.name+': '+b.desc.toLowerCase(),3500);lootLine(b.name)}

// ---------- gems, Skyrim-style: chipped, regular and flawless ----------
// classic gems come chipped, regular or flawless; the rest as-is
const GEMS=[
  {key:'amethyst',v:20,name:'amethyst',col:'#9a50d8',w:5,graded:1,shape:'cut'},{key:'garnet',v:25,name:'garnet',col:'#a8182c',w:5,graded:1,shape:'cut'},
  {key:'ruby',v:40,name:'ruby',col:'#e8102a',w:3,graded:1,shape:'cut'},{key:'sapphire',v:45,name:'sapphire',col:'#1e4ee8',w:3,graded:1,shape:'cut'},
  {key:'emerald',v:60,name:'emerald',col:'#14b45a',w:2,graded:1,shape:'cut'},{key:'diamond',v:90,name:'diamond',col:'#e4f2ff',w:1,graded:1,shape:'cut'},
  {key:'pearl',v:25,name:'Pearl',col:'#f4eee2',w:2,shape:'pearl'},{key:'smallpearl',v:12,name:'Small pearl',col:'#e6dccc',w:2.5,shape:'pearl',size:.7},
  {key:'moonstone',v:15,name:'Moonstone',col:'#c8dcf0',w:2,shape:'rough'},{key:'malachite',v:15,name:'Malachite',col:'#1f9a5a',w:2,shape:'rough'},
  {key:'corundum',v:12,name:'Corundum',col:'#d0743a',w:1.5,shape:'rough'},
  {key:'soul1',v:10,name:'Petty soul gem',col:'#c08ae0',w:2.5,shape:'soul',size:.7},{key:'soul2',v:20,name:'Lesser soul gem',col:'#b07ad8',w:2,shape:'soul',size:.85},
  {key:'soul3',v:35,name:'Common soul gem',col:'#9a62d0',w:1.5,shape:'soul',size:1},{key:'soul4',v:60,name:'Greater soul gem',col:'#8a4ec8',w:1,shape:'soul',size:1.15},
  {key:'soul5',v:90,name:'Grand soul gem',col:'#7a3ec0',w:.6,shape:'soul',size:1.3},{key:'soulb',v:120,name:'Black soul gem',col:'#3a2a50',w:.3,shape:'soul',size:1.2}];
const GEM_Q=[{q:'flawed',pre:'Flawed ',w:5,v:.4},{q:'normal',pre:'',w:3.5,v:1},{q:'flawless',pre:'Flawless ',w:1.5,v:2}];
// what the trader pays: base value (v) times quality
const gemPrice=gm=>Math.round(GEMS.find(g=>g.key===gm.key).v*((GEM_Q.find(q=>q.q===gm.q)||{v:1}).v))
function rollGem(){const wpick=a=>{let s=0;for(const x of a)s+=x.w;let r=rnd()*s;for(const x of a){r-=x.w;if(r<=0)return x}return a[0]};
  const g=wpick(GEMS),q=g.graded?wpick(GEM_Q):{q:'single',pre:''},name=q.pre+g.name,c=new THREE.Color(g.col);
  const glow=`rgba(${c.r*255|0},${c.g*255|0},${c.b*255|0},${q.q==='flawless'||g.shape==='soul'?.75:q.q==='flawed'?.3:.55})`;
  return {key:g.key,q:q.q,shape:q.q==='flawed'?'rough':g.shape,size:g.size||1,name:name[0].toUpperCase()+name.slice(1),col:g.col,glow}}
const _gemGeo={};
function gemGeo(gm){const k=gm.key+gm.q;if(_gemGeo[k])return _gemGeo[k];const c=new THREE.Color(gm.col),sz=gm.size||1;let parts;
  if(gm.shape==='rough'){// uncut chunk: chipped gems, moonstone, malachite, corundum
    const g=new THREE.IcosahedronGeometry(.06*sz,0),p=g.attributes.position;for(let i=0;i<p.count;i++)p.setXYZ(i,p.getX(i)*(1+.3*Math.sin(i*1.7)),p.getY(i)*.8,p.getZ(i)*(1+.3*Math.cos(i*2.3)));
    const dull=gm.q==='flawed'?c.clone().multiplyScalar(.7).lerp(new THREE.Color('#808080'),.25):c;parts=[[g,'#'+dull.getHexString(),_m4(0,.05*sz,0)]]}
  else if(gm.shape==='pearl')parts=[[new THREE.SphereGeometry(.045*sz,10,8),gm.col,_m4(0,.045*sz,0)]];
  else if(gm.shape==='soul'){// soul gem: elongated faceted crystal
    parts=[[new THREE.OctahedronGeometry(.05*sz,0),gm.col,_m4(0,.09*sz,0,0,.4,0,1,1.9,1)],[new THREE.OctahedronGeometry(.03*sz,0),'#ffffff',_m4(0,.09*sz,0,0,0,0,1,1.6,1)]]}
  else{// cut: crown + pavilion, flawless is bigger and brighter
    const s=gm.q==='flawless'?1.9:1.5,col='#'+c.clone().multiplyScalar(gm.q==='flawless'?1.15:1).getHexString();
    parts=[[new THREE.CylinderGeometry(.024*s,.045*s,.022*s,8),col,_m4(0,.066*s,0)],[new THREE.ConeGeometry(.045*s,.055*s,8),col,_m4(0,.0275*s,0,Math.PI)]]}
  const geo=mergeParts(parts);geo.computeVertexNormals();return _gemGeo[k]=geo}

// ---------- exit gate ----------
function buildGate(root){const A=W.exitArch,K=WT,hw=A.w/2,ir='#3a3634',parts=[];
  // arch-shaped gate: bars trimmed to the vault's semicircle
  for(let x=-hw+.08;x<hw;x+=.18){const h=A.hs+Math.sqrt(Math.max(0,hw*hw-x*x))-.02;parts.push(cy(.025,.025,h,6,x,h/2,0,ir),[new THREE.ConeGeometry(.04,.12,6),ir,_m4(x,-.04,0,Math.PI)])}
  for(const y of [.35,A.hs*.55,A.hs])parts.push(bx(A.w-.04,.06,.05,0,y,0,ir));
  const m=new THREE.Mesh(mergeParts(parts),new THREE.MeshPhongMaterial({vertexColors:true,shininess:40,specular:0x444444}));
  m.position.set(A.cx-A.d[0]*(K/2-.12),0,A.cz-A.d[1]*(K/2-.12));m.rotation.y=Math.atan2(-A.d[0],-A.d[1]);root.add(m);
  G.gate={kind:'gate',x0:A.x0,z0:A.z0,x1:A.x1,z1:A.z1,cx:A.cx,cz:A.cz,open:false,opening:false,m,H:A.top+.3}}
function openGate(){G.gate.opening=true;sndGate();toast('The gate rises…')}

// ---------- shadows ----------
// maze dwellers (low-poly rigs, see 05k-mobs.js): lantern wraiths everywhere; underground about half of them
// are cave spiders instead. the newer themes list their own (TH.mobs: kind and weight): watchers too.
// a watcher never catches anyone, so it comes on top of the others, never more than one a level
// kinds forces the list, for tests
const MOB_MAKE={spider:makeSpider,wraith:makeWraith,eye:makeWatcher};
function buildMonsters(root,kinds){if(game.peaceful)return;const n=W.n,lvl=game.level,cnt=Math.min(4,1+Math.floor((lvl-1)/2)+(n>=16?1:0));
  const roll=()=>{let s=0;for(const [k,w] of TH.mobs)if(k!=='eye')s+=w;let r=rnd()*s;for(const [k,w] of TH.mobs){if(k==='eye')continue;if((r-=w)<=0)return k}return TH.mobs[0][0]};
  const list=kinds||[...Array(cnt)].map(()=>TH.mobs?roll():TH.indoor&&rnd()<.5?'spider':'wraith');
  if(!kinds&&TH.mobs){const e=TH.mobs.find(q=>q[0]==='eye');if(e&&rnd()<Math.min(.85,e[1]*.3+(lvl-1)*.08))list.push('eye')}
  list.forEach((kind,k)=>{const mo=Object.assign(MOB_MAKE[kind](root),{walk:0,mode:'patrol',stepT:0,lost:0});placeMonster(mo,k);G.monsters.push(mo)})}
function placeMonster(mo,k){const n=W.n,dist=cellDist(W.M,n,0,0),max=Math.max(...dist),c=[];
  for(let i=0;i<n;i++)for(let j=0;j<n;j++)if(dist[i*n+j]>=max*.55&&!(i===W.exitCell.i&&j===W.exitCell.j))c.push([i,j]);
  // a cell whose centre is clear of props (a drum or a chest may reach into it)
  const free=c.filter(([i,j])=>{const q=warp(i+.5,j+.5);return freeR(q[0],q[1],.3)}),C=free.length?free:c;
  const [i,j]=C.length?C[(ri(0,C.length-1)+k*7)%C.length]:[n-1,n-1],p=warp(i+.5,j+.5);
  Object.assign(mo,{x:p[0],z:p[1],cell:[i,j],prev:null,target:[i,j],mode:'patrol',wait:0});mo.m.position.set(p[0],0,p[1])}
// where a mob aims in a cell: its centre, or the nearest clear spot when a pillar or a prop stands on the centre.
// found once per cell and level
function mobWp(i,j){const n=W.n,C=W.mobWp||(W.mobWp=[]),k=i*n+j;if(C[k])return C[k];const c=warp(i+.5,j+.5);let p=c;
  if(!freeR(c[0],c[1],.3))search:for(let r=.15;r<=1.2;r+=.15)for(let a=0;a<12;a++){const x=c[0]+Math.cos(a*Math.PI/6)*r,z=c[1]+Math.sin(a*Math.PI/6)*r;
    if(freeR(x,z,.3)){p=[x,z];break search}}
  return C[k]=p}
// one step; a prop in the way (a barrel by the corridor's middle) is skirted by turning the step a little.
// one check per frame normally, a few only while brushing past something. already pressed against it, it first
// steps back off it; truly boxed in (or backing off for too long), it steps through as before
function mobStep(mo,vx,vz){
  for(const a of [0,.6,-.6,1.2,-1.2]){const c=Math.cos(a),s=Math.sin(a),x=mo.x+vx*c+vz*s,z=mo.z-vx*s+vz*c;if(freeR(x,z,.2)){mo.x=x;mo.z=z;mo.push=0;return}}
  let px=0,pz=0;for(let i=0;i<8;i++){const a=i*Math.PI/4;if(blocked(mo.x+Math.cos(a)*.25,mo.z+Math.sin(a)*.25)){px-=Math.cos(a);pz-=Math.sin(a)}}
  const l=Math.hypot(px,pz),sp=Math.hypot(vx,vz);
  if(l>0&&(mo.push=(mo.push||0)+1)<20){const x=mo.x+px/l*sp,z=mo.z+pz/l*sp;if(!blocked(x,z)&&freeR(x,z,.12)){mo.x=x;mo.z=z;return}}
  mo.x+=vx;mo.z+=vz}
function los(ax,az,bx,bz){const d=Math.hypot(bx-ax,bz-az),k=Math.ceil(d/.3);
  for(let i=1;i<k;i++){const t=i/k;if(blocked(ax+(bx-ax)*t,az+(bz-az)*t)&&!W.gateBlk(ax+(bx-ax)*t,az+(bz-az)*t))return false}return true}
function updateMonsters(dt,t){if(G.grace>0){G.grace-=dt;return}
  const n=W.n,M=W.M,g=toGrid(pl.x,pl.z),pc=[Math.floor(g[0]),Math.floor(g[1])],inMaze=pc[0]>=0&&pc[1]>=0&&pc[0]<n&&pc[1]<n;
  let pd=null;
  for(const mo of G.monsters){const d=Math.hypot(pl.x-mo.x,pl.z-mo.z),sees=inMaze&&d<Math.min(mo.sight,(scene.fog?scene.fog.far:11)+2)*(G.bless.shadow?.4:1)&&los(mo.x,mo.z,pl.x,pl.z);
    if(mo.stun>0){mo.stun-=dt;mo.m.position.set(mo.x+Math.sin(t*40)*.03,0,mo.z);continue}
    if(mo.watcher)watcherThink(mo,dt,d,inMaze);
    else if(sees||(mo.mode==='chase'&&d<(G.bless.shadow?1.5:3))){if(mo.mode!=='chase')mo.growl(mo.x,mo.z);mo.mode='chase';mo.lost=0;mo.wait=0}
    else if(mo.mode==='chase'&&(mo.lost+=dt)>mo.lose)mo.mode='patrol';
    // at the coin: stands and looks around, then patrols again
    if(mo.wait>0&&mo.mode!=='chase'){mo.wait-=dt;if(mo.wait<=0)mo.mode='patrol'}
    const sp=(mo.wait>0&&mo.mode!=='chase'?0:mo.mode==='chase'?mo.chase:mo.mode==='lure'?mo.speed*1.4:mo.speed)*dt,x0=mo.x,z0=mo.z;
    // cell to cell along the corridor centres; the next cell is chosen on reaching the centre of this one
    if(sp>0){let tp=mobWp(mo.target[0],mo.target[1]);
      // the player is in the cell it is heading for: straight at the player, so standing against a wall is no hiding place
      if(mo.mode==='chase'&&mo.target[0]===pc[0]&&mo.target[1]===pc[1]){const l=Math.max(d,1e-6),k=Math.min(1,sp/l),nx=mo.x+(pl.x-mo.x)*k,nz=mo.z+(pl.z-mo.z)*k;
        if(freeR(nx,nz,.2)){mo.x=nx;mo.z=nz;tp=null}}
      if(tp){const dx=tp[0]-mo.x,dz=tp[1]-mo.z,l=Math.hypot(dx,dz);
        if(l>sp){mobStep(mo,dx/l*sp,dz/l*sp)}
        else{mo.x=tp[0];mo.z=tp[1];const [i,j]=mo.target,nb=[[1,0],[-1,0],[0,1],[0,-1]].filter(([a,b])=>i+a>=0&&j+b>=0&&i+a<n&&j+b<n&&M.open(i,j,a,b)).map(([a,b])=>[i+a,j+b]);
          let nx=null;
          if(mo.mode==='chase'&&inMaze){if(!pd)pd=cellDist(M,n,pc[0],pc[1]);if(pd[i*n+j]!==0)nx=nb.reduce((a,b)=>pd[b[0]*n+b[1]]<pd[a[0]*n+a[1]]?b:a,nb[0])}
          // at the noise: stands and searches there
          else if(mo.mode==='lure'){const L=mo.lure;if(i===L.c[0]&&j===L.c[1]){mo.mode='search';mo.wait=rr(2.5,4)}else nx=nb.reduce((a,b)=>L.d[b[0]*n+b[1]]<L.d[a[0]*n+a[1]]?b:a,nb[0])}
          else{const f=nb.filter(c=>!mo.prev||c[0]!==mo.prev[0]||c[1]!==mo.prev[1]);nx=pick(f.length?f:nb)}
          if(nx){mo.prev=mo.target;mo.target=nx}}}
      mo.walk+=Math.hypot(mo.x-x0,mo.z-z0)}
    mo.m.position.set(mo.x,0,mo.z);mo.anim(mo,dt,t,sp,mo.x-x0,mo.z-z0);
    if(sp>0&&(mo.stepT-=dt)<=0){mo.stepT=mo.stepK[mo.mode==='chase'?0:1];mo.stepSnd(mo.x,mo.z)}
    if(d<.7&&!game.peaceful&&!mo.watcher){
      // the ward takes the blow once: the shadow is struck down and loses track of the player
      if(G.bless.ward){G.bless.ward=0;mo.stun=6;mo.mode='patrol';mo.lost=0;sndBless();G.shake=.4;toast('The ward breaks: the shadow is struck down');continue}
      return caught()}}}
// ---------- thrown coins ----------
// F throws one gold coin along the view; it bounces off walls and rings where it lands.
// shadows that hear it (up to 7 cells by path) and are not chasing walk to the spot and search there
let _coinGeo=null;
function throwCoin(){if(LP.active||G.coinT>0)return;if(game.gold<=0){toast('No gold to throw');sndLocked();return}
  game.gold--;G.coinT=.45;if(!_coinGeo)_coinGeo=mergeParts([cy(.03,.03,.008,10,0,0,0,LOOT_GOLD)]);
  const cp=Math.cos(pl.pitch),fx=-Math.sin(pl.yaw)*cp,fz=-Math.cos(pl.yaw)*cp,fy=Math.sin(pl.pitch),v=7,m=new THREE.Mesh(_coinGeo,LMAT());root.add(m);
  G.coins.push({m,x:pl.x+fx*.2,y:pl.y-.2,z:pl.z+fz*.2,vx:fx*v,vy:fy*v+2,vz:fz*v,rest:0,heard:false});m.position.set(pl.x,pl.y-.2,pl.z);sndPickScrape()}
function updateCoins(dt){if(G.coinT>0)G.coinT-=dt;
  for(let i=G.coins.length-1;i>=0;i--){const c=G.coins[i];
    if(c.rest>0){if((c.rest+=dt)>8){root.remove(c.m);G.coins.splice(i,1)}continue}
    for(let k=0;k<4&&!c.rest;k++){const h=dt/4;c.vy-=9.8*h;
      const nx=c.x+c.vx*h,nz=c.z+c.vz*h;
      if(blocked(nx,c.z))c.vx*=-.35;else c.x=nx;if(blocked(c.x,nz))c.vz*=-.35;else c.z=nz;
      c.y+=c.vy*h;if(TH.indoor){const top=ceilH(c.x,c.z)-.05;if(c.y>top){c.y=top;c.vy=-Math.abs(c.vy)*.3}}
      const fl=floorH(c.x,c.z)+.005;
      if(c.y<=fl){c.y=fl;if(!c.heard){c.heard=true;coinNoise(c.x,c.z)}else sndCoinClink(c.x,c.z,.4);
        if(Math.abs(c.vy)<1.5){c.rest=.001;c.m.rotation.set(0,rr(0,6),0)}else{c.vy=-c.vy*.35;c.vx*=.5;c.vz*=.5}}}
    c.m.position.set(c.x,c.y,c.z);if(!c.rest){c.m.rotation.x+=dt*18;c.m.rotation.z+=dt*7}}}
function coinNoise(x,z){sndCoinClink(x,z);noiseAt(x,z,7)}
// a chest's creak carries further than a coin: shadows up to 11 cells away by path come to see
function chestNoise(x,z){noiseAt(x,z,11)}
// a lockpick snapping in a lock (a chest or the exit gate): a sharp crack that carries as far as a coin's clink
const PICK_NOISE=8;
function pickNoise(c){const x=c.cx!==undefined?c.cx:c.x,z=c.cz!==undefined?c.cz:c.z;sndPickBreak(x,z);noiseAt(x,z,PICK_NOISE)}
// shadows that hear a noise (within range cells by path) and are not chasing walk to the spot and search there
// (src: the mob that raised it, a watcher's scream does not lure the watcher itself)
function noiseAt(x,z,range,src){const n=W.n,g=toGrid(x,z),ci=clamp(Math.floor(g[0]),0,n-1),cj=clamp(Math.floor(g[1]),0,n-1),ld=cellDist(W.M,n,ci,cj);
  for(const mo of G.monsters){if(mo.mode==='chase'||mo.stun>0||mo===src)continue;const d=ld[mo.target[0]*n+mo.target[1]];
    if(d>=0&&d<=range){mo.mode='lure';mo.wait=0;mo.lure={c:[ci,cj],d:ld}}}}
// caught: the level starts over from scratch. the same maze is rebuilt from its seed (chests closed again, key and map back
// in place) and the purse goes back to what it held on entering the level
function caught(){if(LP.active)stopLockpick();game.caught++;sndCaught();const f=document.getElementById('flash');f.style.transition='none';f.style.opacity=.8;
  requestAnimationFrame(()=>{f.style.transition='opacity 1.2s';f.style.opacity=0});
  restoreEntry();build();toast('The shadow caught you… The level starts over')}
// the purse as it was on entering the level: a catch or a new maze (R) rolls back to it, so loot can't be farmed
function saveEntry(){game.caught=0;game.entry={gold:game.gold,gems:game.gems.slice(),picks:game.picks,mapNext:game.mapNext}}
function restoreEntry(){const e=game.entry;if(!e)return;Object.assign(game,{gold:e.gold,gems:e.gems.slice(),picks:e.picks,mapNext:e.mapNext})}


// ---------- puddles and drips (dungeons) ----------
function buildPuddles(root){G.drips=[];G.dripPool=[];if(!TH.indoor||TH.dry)return;
  const geos=[0,1,2].map(k=>{const g=new THREE.CircleGeometry(1,18),p=g.attributes.position;
    for(let i=1;i<p.count;i++){const a=Math.atan2(p.getY(i),p.getX(i)),r=1+.25*Math.sin(a*3+k)+.15*Math.sin(a*5+k*2);p.setXY(i,p.getX(i)*r,p.getY(i)*r)}
    g.rotateX(-Math.PI/2);return g});
  const list=[],n=W.n;
  for(let k=0;k<Math.round(n*n/7);k++){const i=ri(0,n-1),j=ri(0,n-1),c=warp(i+.5+rr(-.3,.3),j+.5+rr(-.3,.3)),x=c[0],z=c[1];
    if((W.placed||[]).some(p=>Math.hypot(p.x-x,p.z-z)<p.r+.9)||wallDist(x,z)<.4)continue;
    const r=rr(.3,Math.min(.75,wallDist(x,z)));if(!TH.water)pushInst(list,x,.006,z,0,rr(0,6.3),0,r*rr(.8,1.2),1,r,new THREE.Color(1,1,1),ri(0,2));   // the cistern's floor is all water already
    G.drips.push({x,z,top:ceilH(x,z),per:rr(2.2,5.5),off:rr(0,5)})}
  instance(root,list,geos,new THREE.MeshPhongMaterial({color:0x181c24,shininess:120,specular:0x8899aa,transparent:true,opacity:.78,depthWrite:false}),true,CHUNK*2);
  const dropT=tex('dot',()=>mkGlowTex([[0,'rgba(255,255,255,1)'],[.5,'rgba(255,255,255,.6)'],[1,'rgba(255,255,255,0)']],16,16));
  const ringG=new THREE.RingGeometry(.85,1,24);ringG.rotateX(-Math.PI/2);
  for(let k=0;k<5;k++){const d=new THREE.Sprite(new THREE.SpriteMaterial({map:dropT,color:0xbfd8ff,transparent:true,depthWrite:false}));d.scale.set(.04,.07,1);
    const r=new THREE.Mesh(ringG,new THREE.MeshBasicMaterial({color:0xbfd8ff,transparent:true,opacity:0,depthWrite:false}));root.add(d);root.add(r);G.dripPool.push({d,r,cur:null,last:0})}}
function updateDrips(t){if(!G.drips||!G.drips.length)return;
  const near=G.drips.filter(p=>Math.hypot(p.x-pl.x,p.z-pl.z)<10).sort((a,b)=>Math.hypot(a.x-pl.x,a.z-pl.z)-Math.hypot(b.x-pl.x,b.z-pl.z)).slice(0,G.dripPool.length);
  G.dripPool.forEach((s,k)=>{const p=near[k];s.d.visible=s.r.visible=!!p;if(!p)return;
    const h=p.top-.05-(TH.water||0),fall=Math.sqrt(2*h/9.8),ph=(t+p.off)%p.per;
    if(ph<fall){s.d.position.set(p.x,(TH.water||0)+h-4.9*ph*ph,p.z);s.d.visible=true}else s.d.visible=false;
    const rp=ph-fall;if(rp>=0&&rp<.9){const k2=.05+rp*.5;s.r.scale.set(k2,1,k2);s.r.position.set(p.x,(TH.water||0)+.012,p.z);s.r.material.opacity=.5*(1-rp/.9)}else s.r.material.opacity=0;
    const hit=Math.floor((t+p.off-fall)/p.per);if(s.cur===p&&hit!==s.last&&rp>=0&&rp<.2)sndDrip(p.x,p.z);s.cur=p;s.last=hit})}

// ---------- the player's torch ----------
// the player comes down without one: underground only the fires on the walls light the way. the trader sells a torch
// (game.torch) for a good part of a level's loot. it is held low on the right of the view, with no hand: a tapered
// wooden shaft, an iron collar and a pitch-soaked wrap with a live flame. it burns down (G.fuel), the flame shrinking
// with it, and flares up again at any fire on a wall. its light is the camera's point light (hand), set at the flame
const TORCH_PRICE=200;
const TORCH_LIGHT=[2.2,1.4];   // its light against the theme's base light (TH.hand): intensity and reach
let TORCH=null;                // made once and kept from level to level
// the torch lives in a little scene of its own, drawn over the finished frame after the depth is cleared (renderTorch):
// solid, with its own depth, and still never sinking into a wall the player stands against. it is lit by a light at
// its own flame and the theme's ambient light; the world gets the camera's light (hand), set at the flame too
function makeTorch(){const wood='#8a5a34',dk='#5e3a20',iron='#55524c',wrap='#6e5638',pitch='#2a1e16',T=new THREE.Group(),sc=new THREE.Scene(),cam=new THREE.PerspectiveCamera();
  const part=(m,o)=>{m.fog=false;const x=new THREE.Mesh(o,m);T.add(x);return x};
  const shaft=paintFaces(mergeParts([limb(V3(0,-.46,0),V3(0,0,0),.016,.023,wood,6),cy(.029,.026,.03,6,0,0,0,iron),cy(.028,.028,.012,6,0,-.05,0,iron)]),
    (c,n)=>c.y<-.07&&((Math.floor(Math.atan2(c.x,c.z)*2+c.y*14)%3)+3)%3===0?dk:null);   // darker streaks of grain
  const head=mergeParts([cy(.035,.031,.045,7,0,.035,0,wrap,0,.3,0),cy(.039,.036,.035,7,.002,.068,0,pitch,.06,0,0),cy(.033,.038,.03,7,0,.097,0,wrap,-.05,.5,0),
    [new THREE.IcosahedronGeometry(.031,0),pitch,_m4(0,.116,0,0,0,0,1,.6,1)]]);
  part(new THREE.MeshLambertMaterial({vertexColors:true}),shaft);
  const ember=part(new THREE.MeshLambertMaterial({vertexColors:true,emissive:0xff4a10,emissiveIntensity:0}),head);
  // the flame looks like the fires on the walls (same texture): a big tongue and a brighter one inside it, each
  // flickering on its own. sprites face the camera, so the flame always stands upright
  const fl=new THREE.Group();fl.position.y=.13;T.add(fl);
  const flameT=tex('flame',()=>mkGlowTex([[0,'rgba(255,255,230,1)'],[.25,'rgba(255,210,110,.95)'],[.6,'rgba(255,120,30,.45)'],[1,'rgba(255,60,0,0)']],32,64,2));
  const tongue=(op,col)=>{const x=new THREE.Sprite(new THREE.SpriteMaterial({map:flameT,color:col,transparent:true,opacity:op,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}));
    x.center.set(.5,.12);x.renderOrder=10+fl.children.length;fl.add(x);return x};
  const outer=tongue(.95,0xffffff),core=tongue(.8,0xfff0c0);
  const lit=new THREE.PointLight(0xffc890,0,1.3,1.5),amb=new THREE.AmbientLight(0xffffff,0);lit.position.set(0,.2,0);T.add(lit);sc.add(amb,T);
  return {T,sc,cam,fl,outer,core,ember,lit,amb,sx:0,sy:0,yaw:pl.yaw,pitch:pl.pitch,flame:new THREE.Vector3(),out:false}}
function renderTorch(){const Q=TORCH;if(!Q||!Q.T.visible)return;Q.cam.projectionMatrix.copy(camera.projectionMatrix);
  const ac=renderer.autoClear;renderer.autoClear=false;renderer.clearDepth();renderer.render(Q.sc,Q.cam);renderer.autoClear=ac}
function updateTorch(dt,t){const on=TH.indoor&&game.torch;
  if(!on){if(TORCH)TORCH.T.visible=false;hand.intensity=0;return}
  const Q=TORCH||(TORCH=makeTorch()),h=Math.min(Math.max(dt,1e-4),.05),k=G.fuel;Q.T.visible=true;G.flare=Math.max(0,(G.flare||0)-h*1.6);
  // it lags behind a turn of the view and sways with the steps. it is held near the right edge of the view, whatever
  // the field of view and the screen's shape (x is a share of the half width at its distance)
  let dy=pl.yaw-Q.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));Q.yaw=pl.yaw;const dp=pl.pitch-Q.pitch;Q.pitch=pl.pitch;
  Q.sx+=(clamp(-dy/h*.03,-.12,.12)-Q.sx)*Math.min(1,h*8);Q.sy+=(clamp(dp/h*.02,-.08,.08)-Q.sy)*Math.min(1,h*8);
  const D=.74,half=Math.tan(camera.fov*Math.PI/360)*D,x0=half*camera.aspect*.68,b=S.bob?pl.bob:0;
  Q.T.position.set(x0+Q.sx+Math.cos(b)*.008,-half*.74+Q.sy+Math.abs(Math.sin(b))*.012,-D);Q.T.rotation.set(-.42+Q.sy*.6,0,.24-Q.sx*1.5);
  // the flame: smaller as the torch burns down and gone when it is spent (only a dark stump of pitch is left), a flare
  // when it is lit again, always flickering, leaning back from a turn
  const live=clamp(k/.06,0,1),fk=(.25+.75*k)*live*(1+.5*G.flare),f1=1+.14*Math.sin(t*23)+.09*Math.sin(t*37+1.3),f2=1+.12*Math.sin(t*29+2)+.1*Math.sin(t*17);
  Q.fl.visible=fk>.01;Q.outer.scale.set(.1*fk*(1+.06*Math.sin(t*31)),.22*fk*f1,1);Q.core.scale.set(.055*fk,.13*fk*f2,1);
  Q.outer.material.rotation=Q.sx*2.5+Math.sin(t*5.3)*.07;Q.core.material.rotation=Q.sx*2+Math.sin(t*6.1+1)*.06;
  Q.ember.material.emissiveIntensity=(.04+.16*k+.04*Math.sin(t*9))*live;
  const out=k<=0;if(out&&!Q.out)toast('Your torch has gone out. Find a fire');Q.out=out;
  // light: on the torch itself from its flame, plus the level's ambient light so a spent torch is still seen
  const glow=live*(.08+.92*k)*(1+.35*G.flare)*(.93+.07*f1);Q.lit.intensity=1.6*glow;
  const A=TH.amb||[0x6a5450,.26];Q.amb.color.set(A[0]);Q.amb.intensity=A[1]*1.8;
  // ...and on the world from the flame's place in front of the eyes
  Q.T.updateMatrix();Q.flame.set(0,.26,0).applyMatrix4(Q.T.matrix);hand.position.copy(Q.flame);
  const base=TH.hand||[0xffc890,.4,6];hand.color.set(base[0]);
  hand.intensity=base[1]*TORCH_LIGHT[0]*glow;hand.distance=base[2]*TORCH_LIGHT[1]*(.35+.65*k)}

// ---------- every frame ----------
function updateGameplay(dt,t){G.time+=dt;
  updateChests(dt,t);
  // gate
  const g=G.gate,dg=Math.hypot(g.cx-pl.x,g.cz-pl.z);
  if(!g.open&&!g.opening&&dg<2.4){if(G.hasKey)openGate();else if(!G.hint.gate){G.hint.gate=1;sndLocked();toast('The gate is locked. Find the key or pick the lock')}}
  if(dg>4)G.hint.gate=0;
  if(g.opening&&!g.open){g.m.position.y=Math.min(g.H-.25,g.m.position.y+dt*1.1);if(g.m.position.y>=Math.min(1.9,g.H-.4))g.open=true}
  // torch: only once bought, and only underground
  if(TH.indoor&&game.torch){G.fuel=Math.max(0,G.fuel-dt/G.fuelT);
    if(G.fuel<.95&&W.lights.some(l=>Math.hypot(l.x-pl.x,l.z-pl.z)<1.5)){if(G.fuel<.6)toast('Your torch is burning bright again');G.fuel=1;G.flare=1;sndIgnite()}
    if(G.fuel<.2&&G.fuel>0&&!G.hint.fuel){G.hint.fuel=1;toast('Your torch is dying… Find a fire')}if(G.fuel>.5)G.hint.fuel=0}
  else if(TH.indoor&&!game.darkHint&&G.time>3){game.darkHint=1;toast('It is dark down here. The trader sells torches',3500)}
  updateTorch(dt,t);
  updateCoins(dt);updateMonsters(dt,t);updateDrips(t);
  if(G.shake>0){G.shake-=dt;camera.position.x+=(Math.random()-.5)*.08*G.shake;camera.position.y+=(Math.random()-.5)*.08*G.shake}
  // HUD
  updateHud();
  const fb=document.getElementById('fuel');fb.style.display=TH.indoor&&game.torch?'block':'none';fb.firstChild.style.width=Math.round(G.fuel*100)+'%'}
