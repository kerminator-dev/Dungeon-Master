function floorAt(x,z,ref=0){
  const m=maze;if(!m)return 0;
  const bx=Math.floor(x/B),bz=Math.floor(z/B);if(bx<0||bz<0||bx>=m.W||bz>=m.W)return 0;
  const k=bx*m.W+bz,st=m.stairs.get(k);let gH;
  if(st){let t;if(st.dx>0)t=(x-bx*B)/B;else if(st.dx<0)t=1-(x-bx*B)/B;else if(st.dy>0)t=(z-bz*B)/B;else t=1-(z-bz*B)/B;
    const idx=Math.min(3,Math.max(0,Math.floor(t*4)));gH=st.h0+(idx+1)*(st.h1-st.h0)/4}
  else gH=m.hmap[k];
  const up=m.hmapU[k];if(up>0&&Math.abs(up-ref)<Math.abs(gH-ref))return up;return gH;
}
function chandelier(H,drop=1.1,rad=.55){const g=new THREE.Group();
  if(rad<.8){
    g.add(box(.05,drop,.05,M.metal,0,H-drop/2,0));
    const ring=new THREE.Mesh(new THREE.TorusGeometry(rad,.045,4,12),M.metal);ring.rotation.x=Math.PI/2;ring.position.y=H-drop;g.add(ring);
    for(let i=0;i<6;i++){const a=i/6*6.28,x=Math.cos(a)*rad,z=Math.sin(a)*rad;
      g.add(box(.06,.16,.06,M.candle,x,H-drop+.1,z));const f=new THREE.Sprite(M.flame);f.scale.set(.12,.18,1);f.position.set(x,H-drop+.28,z);g.add(f);flames.push(f)}
  }else{
    const r=rad;
    for(const [sx,sz] of [[-1,-1],[1,-1],[-1,1],[1,1]]){g.add(box(.05,drop,.05,M.metal,sx*r,H-drop/2,sz*r));g.add(box(.12,.2,.12,M.coal,sx*r,H-drop,sz*r))}
    g.add(box(2*r,.1,.1,M.coal,0,H-drop,-r));g.add(box(2*r,.1,.1,M.coal,0,H-drop,r));g.add(box(.1,.1,2*r,M.coal,-r,H-drop,0));g.add(box(.1,.1,2*r,M.coal,r,H-drop,0));
    g.add(box(2*r,.05,2*r,M.coal,0,H-drop-.04,0));
    for(const [x,z] of [[-r*.8,-r*.8],[r*.8,-r*.8],[-r*.8,r*.8],[r*.8,r*.8],[0,0],[0,r*.8],[0,-r*.8],[r*.8,0],[-r*.8,0]]){
      g.add(box(.07,.2,.07,M.candle,x,H-drop+.1,z));const f=new THREE.Sprite(M.flame);f.scale.set(.14,.22,1);f.position.set(x,H-drop+.32,z);g.add(f);flames.push(f)}
  }
  g.userData.light=new THREE.Vector3(0,H-drop-.2,0);g.userData.col=0xffc070;return g}
// ---- мебель для спален и кухонь ----
function bed(){const g=new THREE.Group();
  g.add(box(1.1,.3,2.0,M.wood2,0,.3,0));g.add(box(1.0,.2,1.9,M.wrap,0,.5,0));g.add(box(1.0,.14,1.0,M.carpetM,0,.62,.4));
  g.add(box(.8,.14,.4,M.bone,0,.66,-.7));g.add(box(1.1,.9,.1,M.wood2,0,.85,-1.0));g.add(box(1.1,.5,.1,M.wood2,0,.55,1.0));g.userData.half=1.05;return g}
function wardrobe(){const g=new THREE.Group();
  g.add(box(1.2,2.0,.5,M.wood2,0,1.0,0));g.add(box(.02,1.8,.02,M.coal,0,1.0,.26));g.add(box(.1,.1,.03,M.trim,-.12,1.0,.27));g.add(box(.1,.1,.03,M.trim,.12,1.0,.27));
  g.add(box(1.3,.08,.56,M.wood,0,2.04,0));g.userData.half=.27;return g}
function fireplace(){const g=new THREE.Group();
  g.add(tbox(1.9,2.4,.7,M.stoneBase,0,1.2,-.05));g.add(box(1.0,1.0,.5,M.coal,0,.6,.15));g.add(box(2.1,.15,.9,M.archStone,0,2.4,0));
  g.add(box(.9,.1,.4,M.wood,0,.18,.15));const f=new THREE.Sprite(M.flame);f.scale.set(.8,1.1,1);f.position.set(0,.8,.25);g.add(f);flames.push(f);
  const gl=new THREE.Sprite(M.glowS);gl.scale.set(2.2,2.2,1);gl.position.set(0,.8,.3);g.add(gl);
  g.userData.light=new THREE.Vector3(0,1,.8);g.userData.col=0xff9040;g.userData.half=.4;return g}
function bench(){const g=new THREE.Group();g.add(box(1.4,.08,.4,M.wood,0,.45,0));for(const x of [-.6,.6])g.add(box(.08,.45,.34,M.wood2,x,.22,0));g.userData.half=.22;return g}
function decorStruct(s,th,place){
  const SH=s.H,w=s.w,x0=s.x0,y0=s.y0,out=th.outdoor,mid=(w-1)/2,cx=wc(x0+mid),cz=wc(y0+mid),g=maze.g;
  const at=(x,z,yaw=0,ref=0)=>({x,z,yaw,ref});
  const isRing=(i,j)=>i===0||j===0||i===w-1||j===w-1;
  const normsOf=(i,j)=>{const n=[];if(i===0)n.push([-1,0]);if(i===w-1)n.push([1,0]);if(j===0)n.push([0,-1]);if(j===w-1)n.push([0,1]);return n};
  const gpos=([i,j])=>[wc(x0+i),wc(y0+j)];
  const doorAdj=new Set(s.doors.map(d=>d.i+','+d.j));
  const tall=s.kind==='keep'||s.kind==='tower';
  const winMat=()=>th.id==='castle'?[M.winA,M.winB,M.winC][rnd()*3|0]:(out?M.winG:M.winW);
  // --- парапеты вдоль внутреннего края галереи ---
  const bal=(px,pz,alongX,len)=>world.add(alongX?box(len,.95,.14,M.parapet,px,HF+.475,pz):box(.14,.95,len,M.parapet,px,HF+.475,pz));
  const bridgeRing=new Set();
  if(s.bridge){bridgeRing.add('0,2');bridgeRing.add((w-1)+',2')}
  for(let i=0;i<w;i++)for(let j=0;j<w;j++){if(!isRing(i,j))continue;
    for(const [di,dj] of dirs){const ni=i+di,nj=j+dj;if(ni<0||nj<0||ni>=w||nj>=w||isRing(ni,nj))continue;
      if(i+','+j===s.topRing&&ni+','+nj===s.topIn)continue;
      bal(wc(x0+i)+di*(B/2-.07),wc(y0+j)+dj*(B/2-.07),dj!==0,B)}}
  // --- окна, знамёна, факелы на стенах (оба этажа) ---
  for(let i=0;i<w;i++)for(let j=0;j<w;j++){if(!isRing(i,j))continue;
    for(const [nx,nz] of normsOf(i,j)){
      if(g[x0+i+nx]&&g[x0+i+nx][y0+j+nz]!==1)continue;
      const bx=wc(x0+i),bz=wc(y0+j),lat=nx?j:i;
      if(lat%2===0&&!bridgeRing.has(i+','+j)){
        decal(winMat(),1.15,2.3,bx,bz,nx,nz,HF+1.9,0);                       // верхний этаж
        world.add(box(1.3,.1,.26,M.archStone,bx+nx*(B/2-.12),HF+.68,bz+nz*(B/2-.12)));
        if(!doorAdj.has(i+','+j)){decal(winMat(),1.15,2.3,bx,bz,nx,nz,2.2,0);world.add(box(1.3,.1,.26,M.archStone,bx+nx*(B/2-.12),1.0,bz+nz*(B/2-.12)))}
      }else if(lat%2===1&&rnd()<.5){decal(th.id==='castle'||th.id==='nordic'?M.bannerList[rnd()*3|0]:M.banner,.9,1.8,bx,bz,nx,nz,HF+1.7,0)}
    }
  }
  // --- ряд предметов вдоль стен: нижний и верхний этаж ---
  const rimG=[],rimU=[];
  for(const [i,j] of s.ground){
    if(doorAdj.has(i+','+j))continue;
    const [bx,bz]=gpos([i,j]);const ns=normsOf(i,j);if(!ns.length)continue;const [nx,nz]=ns[rnd()*ns.length|0];
    rimG.push({...wspot(bx,bz,nx,nz,[-.45,0,.45][rnd()*3|0]),ref:0});
  }
  for(let i=0;i<w;i++)for(let j=0;j<w;j++){if(!isRing(i,j))continue;const key=i+','+j;if(key===s.topRing||bridgeRing.has(key))continue;
    const ns=normsOf(i,j);const [nx,nz]=ns[rnd()*ns.length|0];if(g[x0+i+nx]&&g[x0+i+nx][y0+j+nz]!==1)continue;
    rimU.push({...wspot(wc(x0+i),wc(y0+j),nx,nz,[-.45,0,.45][rnd()*3|0]),ref:HF})}
  rimG.sort(()=>rnd()-.5);rimU.sort(()=>rnd()-.5);
  const lists={
    castle:{g:[armor,statue,candelabra,bookshelf,urn,chest],u:[bookshelf,()=>chest(true),armor,candelabra,bed,wardrobe]},
    dungeon:{g:[barrel,()=>skeleton(true),weaponRack,()=>chest(false),candles],u:[()=>chest(false),bookshelf,bed,weaponRack,barrel]},
    catacombs:{g:[()=>skeleton(true),skullPyramid,urn,coffin,candles],u:[urn,coffin,candles,bookshelf,()=>skeleton(true)]},
    cave:{g:[mushrooms,stalagmite,()=>crystal(M.crystalP),bonePile],u:[mushrooms,()=>crystal(M.crystalP),stalagmite]},
    winter:{g:[bookshelf,()=>chest(false),barrel,sacks,bench,weaponRack],u:[bed,wardrobe,bookshelf,()=>chest(true),desk]},
    forest:{g:[bookshelf,()=>chest(false),barrel,sacks,bench,weaponRack],u:[bed,wardrobe,bookshelf,()=>chest(true),desk]}};
  const L2=lists[th.id]||(th.outdoor?lists.forest:lists.dungeon);
  const gl=s.kind==='tower'?[weaponRack,barrel,()=>crate(false),armor,bench]:L2.g;
  const ul=s.kind==='tower'?[bed,bookshelf,wardrobe,desk,()=>chest(true)]:L2.u;
  let a=0,b=0;
  for(const sp of rimG)if(rnd()<.6)place(gl[a++%gl.length](),sp);
  for(const sp of rimU)if(rnd()<.6)place(ul[b++%ul.length](),sp);
  // --- факелы наверху ---
  for(let i=0;i<w;i++)for(let j=0;j<w;j++){if(!isRing(i,j)||(rnd()>.35))continue;const ns=normsOf(i,j);const [nx,nz]=ns[0];
    if(g[x0+i+nx]&&g[x0+i+nx][y0+j+nz]!==1)continue;if(bridgeRing.has(i+','+j))continue;
    if(th.torch&&(nx?j:i)%2===1)addTorch(wc(x0+i)+nx*(B/2-.15),wc(y0+j)+nz*(B/2-.15),nx,nz,th.torch,HF+.2)}
  // --- центр нижнего этажа ---
  const cells=s.ground.filter(([i,j])=>i%2===0&&j%2===0&&i>0&&j>0&&i<w-1&&j<w-1);
  const chand=(n,drop,rad)=>{cells.sort(()=>rnd()-.5).slice(0,n).forEach(c=>{const [px,pz]=gpos(c);const ch=chandelier(SH,drop,rad);ch.position.set(px,0,pz);world.add(ch);registerLight(ch)})};
  const dropH=Math.max(1.2,SH-HF-1.3);
  if(s.kind==='tower'){chand(1,SH-(HF+1.4),.9);
    const t=tableSet();place(t,at(cx,cz,rnd()<.5?0:Math.PI/2));return}
  if(th.id==='icecave'){for(let k=0;k<3;k++){const c=crystal(rnd()<.5?M.crystalI:M.crystalP);c.scale.set(2.6,2.6,2.6);place(c,at(cx+R(-1.5,1.5),cz+R(-1.5,1.5)))}return}
  if(th.id==='cave'){for(let k=0;k<3;k++){const c=mushrooms();c.scale.set(2.6,2.6,2.6);place(c,at(cx+R(-1.6,1.6),cz+R(-1.6,1.6)))}return}
  chand(w>7?4:2,dropH,.95);
  switch(s.kind==='keep'?'keep':th.id){
    case 'castle':place(tableSet(),at(cx,cz,rnd()<.5?0:Math.PI/2));{const [fx,fz]=gpos(s.ground.find(([i,j])=>j===w-1&&!doorAdj.has(i+','+j)&&i>1&&i<w-2)||s.ground[0]);place(throne(),at(fx,fz-1.1,0))}break;
    case 'dungeon':place(sarcophagus(),at(cx,cz,rnd()*3));place(chest(true),at(cx+1.7,cz+.6,rnd()*6));place(skeleton(false),at(cx-1.6,cz-.8,rnd()*6));break;
    case 'catacombs':place(skullPyramid(),at(cx,cz,0));place(coffin(),at(cx+1.8,cz,1.57));place(coffin(),at(cx-1.8,cz,1.57));break;
    case 'nordic':place(sarcophagus(),at(cx,cz,rnd()<.5?0:Math.PI/2));place(brazier(),at(cx+1.6,cz+1.6));place(brazier(),at(cx-1.6,cz-1.6));place(draugr(false),at(cx-1.5,cz+1.8,rnd()*6));break;
    case 'keep':{place(tableSet(),at(cx,cz,rnd()<.5?0:Math.PI/2));
      const wallSp=rimG.find(sp=>true);if(wallSp)place(fireplace(),wallSp);
      for(const sp of rimG.slice(1,6))if(rnd()<.35)place(bench(),sp);break}
  }
}
function bridgeVisuals(){
  const mats=curTh.walls;
  for(const br of maze.bridges){const y=br.y,cz=wc(y);
    for(let x=br.x1;x<=br.x2;x++){const cx=wc(x);
      world.add(box(B,.35,B,M.plankFloor,cx,HF-.175,cz));world.add(box(B,.18,.5,M.wood2,cx,HF-.45,cz));
      world.add(box(B,.95,.14,M.parapet,cx,HF+.475,cz-(B/2-.07)));world.add(box(B,.95,.14,M.parapet,cx,HF+.475,cz+(B/2-.07)));
      if((x-br.x1)%2===1){for(const sg of [-1,1])world.add(tbox(.34,HF-.1,.34,M.archStone,cx,(HF-.1)/2,cz+sg*(B/2-.2)))}
      if((x-br.x1)%2===0){world.add(box(.2,.7,.2,M.wood2,cx,HF+1.3,cz-(B/2-.1)));world.add(box(.2,.7,.2,M.wood2,cx,HF+1.3,cz+(B/2-.1)))}
    }
  }
}
function gateBlock(x,y,mat,SH){
  const g=new THREE.Group();g.position.set(wc(x),0,wc(y));
  g.add(tbox(B,HF,B,mat,0,HF/2,0));g.add(tbox(B,SH-HF-2.7,B,mat,0,HF+2.7+(SH-HF-2.7)/2,0));world.add(g)}
// объёмный фасад снаружи домов и башен

function telescope(){const g=new THREE.Group();
  for(const a of [0,2.1,4.2]){const l=box(.05,1.1,.05,M.wood2,Math.cos(a)*.18,.5,Math.sin(a)*.18);l.rotation.set(Math.sin(a)*.25,0,-Math.cos(a)*.25);g.add(l)}
  const t=new THREE.Mesh(new THREE.CylinderGeometry(.07,.1,.7,6),M.metal);t.rotation.set(Math.PI/2.4,0,0);t.position.set(0,1.1,.12);g.add(t);
  g.add(box(.16,.16,.16,M.trim,0,1.04,0));g.userData.half=.3;return g}
function vistaDeck(v,th){
  const [ox,oz]=[v.ox,v.oz],alongX=oz!==0,wcx=wc(v.wx),wcz=wc(v.wy);
  const L=6,cx=wcx+ox*(B*1.3),cz=wcz+oz*(B*1.3),dep=B*2.6;
  world.add(box(alongX?L:dep,.14,alongX?dep:L,M.plankFloor,cx,.05,cz));
  const post=(x,z)=>world.add(box(.14,1.1,.14,M.wood2,x,.55,z));
  const rail=(x,z,len,ax)=>{world.add(box(ax?len:.08,.07,ax?.08:len,M.wood2,x,1.05,z));world.add(box(ax?len:.06,.05,ax?.06:len,M.wood2,x,.6,z))};
  // перила по трём сторонам площадки, спереди — открытый вид
  const e1=cx+ox*(dep/2-.07),e2=cz+oz*(dep/2-.07);
  for(let i=-3;i<=3;i++){const t=i*(L/6);post(alongX?cx+t:e1,alongX?e2:cz+t)}
  rail(e1,e2,L,alongX);
  for(const sg of [-1,1]){const sx=cx+(alongX?sg*(L/2-.07):0),sz=cz+(alongX?0:sg*(L/2-.07));
    for(let k=0;k<=3;k++){const d=-dep/2+k*dep/3;post(sx+(alongX?0:ox*d),sz+(alongX?oz*d:0))}
    rail(sx,sz,dep,!alongX)}
  for(const sg of [-1,1]){const lp=lampPost();lp.position.set(wcx+ox*B*.6+(alongX?sg*2.2:0),0,wcz+oz*B*.6+(alongX?0:sg*2.2));lp.rotation.y=Math.atan2(-ox,-oz);world.add(lp);registerLight(lp)}
  const bn=bench();bn.position.set(wc(v.cx)-ox*.2,0,wc(v.cy)-oz*.2);bn.rotation.y=Math.atan2(ox,oz);world.add(bn);
  const ts=telescope();ts.position.set(wcx+ox*B*.2+(alongX?.7:0),0,wcz+oz*B*.2+(alongX?0:.7));world.add(ts);
}
function buildVista(v,th,size){
  const cx=size/2,ox=v.ox,oz=v.oz,wcx=wc(v.wx),wcz=wc(v.wy),type=v.type;
  const lat=(x,z,a)=>[x-oz*a,z+ox*a];
  const lakeMat=new THREE.MeshLambertMaterial({map:T.water.clone(),color:th.lakeCol||0x3a76a8,transparent:true,opacity:.9});
  lakeMat.map.needsUpdate=true;lakeMat.map.repeat.set(30,30);
  if(type==='lake'||type==='city'){
    const wp=new THREE.Mesh(new THREE.PlaneGeometry(220,220),lakeMat);wp.rotation.x=-Math.PI/2;
    wp.position.set(wcx+ox*(B*2+30+110),.18,wcz+oz*(B*2+30+110));wp.userData.keep=false;world.add(wp);
    // берег-полоска и мостки
    const pier=box(alongPier(ox,oz)?14:2.4,.2,alongPier(ox,oz)?2.4:14,M.plankFloor,wcx+ox*(B*2+8),.1,wcz+oz*(B*2+8));world.add(pier);
  }
  if(type==='lake'){ // остров с руинами и деревьями
    const d=70+rnd()*20,[ix,iz]=lat(wcx+ox*d,wcz+oz*d,R(-14,14));
    const isl=new THREE.Mesh(new THREE.DodecahedronGeometry(14,0),M.grass);isl.scale.set(1.6,.35,1.3);isl.position.set(ix,0,iz);world.add(isl);
    const rk=new THREE.Mesh(new THREE.DodecahedronGeometry(6,0),th.snowy?M.snowRock:M.rock);rk.scale.set(1.6,.9,1.2);rk.position.set(ix+10,1.5,iz-6);world.add(rk);
    const tw=towerModel(!!th.snowy,th.snowy?M.wallW[0]:M.wallF[0]);tw.position.set(ix-3,1.8,iz+1);world.add(tw);
    for(let i=0;i<14;i++){const a=rnd()*6.28,r=R(4,17),[tx,tz]=[ix+Math.cos(a)*r*1.4,iz+Math.sin(a)*r];
      for(const [y,rr,h] of [[0,1.6,2],[1.2,1.2,1.8],[2.3,.8,1.4]]){const c=new THREE.Mesh(new THREE.ConeGeometry(rr,h,6),th.snowy?M.pine:M.pineG);c.position.set(tx,y+h/2+.8,tz);world.add(c)}}
    for(let b=0;b<3;b++){const [bx,bz]=lat(wcx+ox*R(25,45),wcz+oz*R(25,45),R(-25,25));const bt=box(3,.5,1.2,M.wood,bx,.3,bz);bt.rotation.y=R(0,3);world.add(bt);world.add(box(.1,2.4,.1,M.wood2,bx,1.5,bz));world.add(box(1.4,1.6,.04,M.bannerFlag,bx,2.0,bz+.02))}
  }else if(type==='city'){ // город на том берегу
    const d=78;
    for(let i=0;i<14;i++){const [hx,hz]=lat(wcx+ox*(d+R(-6,16)),wcz+oz*(d+R(-6,16)),R(-34,34));const h=houseModel(!!th.snowy);h.position.set(hx,0,hz);h.rotation.y=Math.atan2(-ox,-oz)+R(-.4,.4);world.add(h)}
    for(let i=0;i<3;i++){const [tx,tz]=lat(wcx+ox*(d+R(0,12)),wcz+oz*(d+R(0,12)),R(-30,30));const t=towerModel(!!th.snowy,th.snowy?M.wallW[0]:M.wallF[0]);t.position.set(tx,0,tz);world.add(t)}
    const [kx,kz]=lat(wcx+ox*(d+32),wcz+oz*(d+32),R(-10,10));const c=castleModel(th.snowy?M.wallW[0]:M.wallF[0],!!th.snowy);c.position.set(kx,0,kz);c.rotation.y=Math.atan2(ox,oz)-Math.PI/2;c.scale.set(1.4,1.4,1.4);world.add(c);
  }else{ // лесная долина с дымкой костров
    const dense=[];for(let i=0;i<260;i++){const dd=R(12,90),[tx,tz]=lat(wcx+ox*dd,wcz+oz*dd,R(-dd*.7,dd*.7));dense.push([tx,tz,R(.9,2)])}
    const tm=th.snowy?M.pine:M.pineG;
    [[0,2.3,2.4],[1.3,1.9,2.1],[2.6,1.5,1.8],[3.8,1,1.5]].forEach(([y,r,h])=>instanced(new THREE.ConeGeometry(r,h,7),tm,dense,(d,[x,z,s],i)=>{d.position.set(x,(y+h/2+1)*s,z);d.scale.set(s,s,s);d.rotation.y=i}));
    instanced(new THREE.BoxGeometry(.4,1.6,.4),M.trunk,dense,(d,[x,z,s])=>{d.position.set(x,.8*s,z);d.scale.set(s,s,s)});
  }
}
const alongPier=(ox,oz)=>ox!==0;
