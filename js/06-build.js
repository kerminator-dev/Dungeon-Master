function solvePath(g,s,e,ok){
  const q=[s],prev=new Map([[s.join(),null]]);
  while(q.length){const c=q.shift();if(c[0]===e[0]&&c[1]===e[1])break;
    for(const [dx,dy] of dirs){const nx=c[0]+dx,ny=c[1]+dy;if(g[nx]&&g[nx][ny]===0&&(!ok||ok(nx,ny))&&!prev.has(nx+','+ny)){prev.set(nx+','+ny,c);q.push([nx,ny])}}}
  const path=[];let c=e;while(c){path.push(c);c=prev.get(c.join())}return path.reverse()}
function build(){
  if(world){scene.remove(world);world.traverse(o=>{if(o.geometry)o.geometry.dispose()})}
  world=new THREE.Group();scene.add(world);torches=[];flames=[];parts=null;
  const th=THEMES[game.theme];curTh=th;
  const winter=!!th.snowy, outdoor=!!th.outdoor, H=th.H;curH=H;
  rnd=mulberry((Math.random()*1e9)|0);
  maze=genMaze(N,th);const {g,W,hmap,hmapU,cmap,cmapU,wmap,stairs}=maze, size=W*B;
  const fH=(x,y)=>hmap[x*W+y], cH=(x,y)=>cmap[x*W+y]||H, wH=(x,y)=>wmap[x*W+y]||H;
  scene.background=new THREE.Color(th.bg);
  scene.fog=new THREE.Fog(th.bg, th.fog[0], th.fog[1]);
  camera.far=outdoor?1400:60;camera.updateProjectionMatrix();
  amb.color.set(th.amb[0]);amb.intensity=th.amb[1];
  if(th.sun){moon.color.set(th.sun[0]);moon.intensity=th.sun[1];moon.position.set(...th.sun[2])}else moon.intensity=0;
  hand.color.set(th.hand[0]);
  if(outdoor)setSky(th.sky);
  if(skyMesh)skyMesh.visible=outdoor;if(moonSprite)moonSprite.visible=outdoor;
  $('loc').textContent=th.name+' · уровень '+(level+1)+' · '+N+'×'+N;
  const isW=(x,y)=>g[x]&&g[x][y]===1;
  const start=[1,1], exit=[W-2,W-2];

  const walls=[],floors=[],pillars=[],openB=[];
  for(let x=0;x<W;x++)for(let y=0;y<W;y++){const v=g[x][y];if(v===1)walls.push([x,y]);else{openB.push([x,y]);if(v===2)pillars.push([x,y]);else if(v===0)floors.push([x,y])}}
  const skipSet=new Set();floors.forEach(([x,y])=>{if(hmap[x*W+y]>0.01||stairs.has(x*W+y))skipSet.add(x+','+y)});
  const shellRing=new Set(),kindAt=new Map(),plazaSet=new Set();
  maze.structs.forEach(st=>{for(let i=0;i<st.w;i++)for(let j=0;j<st.w;j++)kindAt.set((st.x0+i)+','+(st.y0+j),st.kind);
    if(outdoor)for(let i=-1;i<=st.w;i++)for(const j of [-1,st.w]){shellRing.add((st.x0+i)+','+(st.y0+j));shellRing.add((st.x0+j)+','+(st.y0+i))}});
  maze.plazas.forEach(p=>{for(let i=0;i<p.w;i++)for(let j=0;j<p.w;j++)plazaSet.add((p.x0+i)+','+(p.y0+j))});
  // --- видовые точки: тупик у края лабиринта с низким парапетом и видом на озеро/остров/город/лес ---
  const vistas=[];
  if(th.vista){const nv=N>=8?1+(N>=14?1:0)+(N>=22?1:0):0;
    for(let v=0;v<nv;v++)for(let t=0;t<80;t++){
      const side=rnd()*4|0,c=rnd()*N|0,cb=2*c+1;let cx_,cy_,wx,wy,ox,oz;
      if(side===0){cx_=1;cy_=cb;wx=0;wy=cb;ox=-1;oz=0}else if(side===1){cx_=W-2;cy_=cb;wx=W-1;wy=cb;ox=1;oz=0}
      else if(side===2){cx_=cb;cy_=1;wx=cb;wy=0;ox=0;oz=-1}else{cx_=cb;cy_=W-2;wx=cb;wy=W-1;ox=0;oz=1}
      if(g[cx_][cy_]!==0||cmap[cx_*W+cy_]>0||g[wx][wy]!==1||plazaSet.has(cx_+','+cy_))continue;
      if((cx_===1&&cy_===1)||(cx_===W-2&&cy_===W-2))continue;
      if(vistas.some(q=>Math.hypot(q.wx-wx,q.wy-wy)<8))continue;
      if(maze.structs.some(s=>cx_>=s.x0-2&&cx_<=s.x0+s.w+1&&cy_>=s.y0-2&&cy_<=s.y0+s.w+1))continue;
      const tp=th.vistaTypes||['lake','city','forest'];
      vistas.push({wx,wy,cx:cx_,cy:cy_,ox,oz,type:tp[rnd()*tp.length|0]});break}
    vistas.forEach(v=>{for(const l of [-1,0,1]){const bx=v.wx+(v.ox!==0?0:l),by=v.wy+(v.ox!==0?l:0);if(g[bx]&&g[bx][by]===1)wmap[bx*W+by]=.7}});
  }
  maze.vistas=vistas;
  // --- реки и канавы: мелкая вода вдоль прямых участков ---
  const waterSet=new Set();
  if(th.water){const runs=Math.max(1,Math.round(N*th.water));
    for(let r=0;r<runs;r++)for(let t=0;t<30;t++){
      const [x,y]=floors[rnd()*floors.length|0],ax=rnd()<.5;
      const ok=(a,b)=>g[a]&&g[a][b]===0&&cmap[a*W+b]===0&&!plazaSet.has(a+','+b)&&!(a===1&&b===1)&&!(a===W-2&&b===W-2)&&!vistas.some(v=>v.cx===a&&v.cy===b);
      if(!ok(x,y))continue;let cells=[[x,y]];
      for(const sg of [1,-1]){let a=x,b=y;for(let k=0;k<4&&cells.length<8;k++){a+=ax?sg:0;b+=ax?0:sg;if(!ok(a,b))break;cells.push([a,b])}}
      if(cells.length<3)continue;cells.forEach(([a,b])=>waterSet.add(a+','+b));break}
  }
  maze.water=waterSet;waterSet.forEach(k=>skipSet.add(k));

  // пространственная разрядка декора
  const fpts=[];
  const fOK=(cx,cz,dx,dy)=>!fpts.some(([a,b,ex,ey])=>{const d2=(a-cx)**2+(b-cz)**2;return (ex===dx&&ey===dy)?d2<15:d2<4.4});
  const fMark=(cx,cz,dx,dy)=>fpts.push([cx,cz,dx,dy]);
  const placed=[];const tooClose=(x,z,r)=>placed.some(p=>(p[0]-x)**2+(p[1]-z)**2<r*r);

  // --- стены: ниши/окна/дыры + 3 вида кладки, часть без кирпичей ---
  const feat=new Map(), fp=th.feat||{}, fpp=Object.assign({dent:.09,crack:.06},fp);
  walls.forEach(([x,y])=>{
    if(shellRing.has(x+','+y)||(wmap[x*W+y]>0&&wmap[x*W+y]<1.5))return;
    const od=dirs.filter(([dx,dy])=>g[x+dx]&&g[x+dx][y+dy]===0);
    if(!od.length)return;
    const [dx,dy]=od[rnd()*od.length|0],cx=wc(x+dx),cz=wc(y+dy);
    const r=rnd();let kind=null,a=0;
    for(const k of ['window','mummy','hole','dent','crack']){a+=fpp[k]||0;if(r<a){kind=k;break}}
    if(!kind||!fOK(cx,cz,-dx,-dy))return;
    feat.set(x+','+y,{kind,dx,dy});fMark(cx,cz,-dx,-dy);
  });
  maze.feat=feat;
  const mats=th.walls, bareIdx=mats.length-1, wgeos=new Map();
  const wgeoFor=h=>{let gg=wgeos.get(h);if(!gg){gg=new THREE.BoxGeometry(B,h,B);if(h!==H){const uv=gg.attributes.uv;for(const f of [0,1,4,5])for(let i=0;i<4;i++){const k=f*4+i;uv.setY(k,uv.getY(k)*h/H)}}wgeos.set(h,gg)}return gg};
  const plain=[],gateSet=new Set(maze.gates.map(([x,y])=>x+','+y)),bridgeSet=new Set();
  maze.bridges.forEach(b=>{for(let x=b.x1;x<=b.x2;x++)bridgeSet.add(x+','+b.y)});
  walls.forEach(w=>{
    const f=feat.get(w[0]+','+w[1]),h=wH(w[0],w[1]);
    if(shellRing.has(w[0]+','+w[1]))return;
    if(gateSet.has(w[0]+','+w[1])){gateBlock(w[0],w[1],mats[0],h);return}
    if(f){nicheBlock(w[0],w[1],f,mats[0],h,th);return}
    plain.push(w);
  });
  buildSkinWalls(plain,g,wH,th,mats,bareIdx);
  if(winter)instanced(new THREE.BoxGeometry(B+.15,.35,B+.15),M.snowTop,walls,(d,[x,y])=>d.position.set(wc(x),wH(x,y)+.1,wc(y)));
  // перемычки над входами в большие сооружения
  maze.lintels.forEach(([x,y,SH])=>{const hh=SH-H;world.add(tbox(B,hh,B,mats[0],wc(x),H+hh/2,wc(y)))});
  if(th.arches)maze.structs.forEach(st=>st.doors.forEach(d=>archWall(wc(d.rx),wc(d.ry),d.ax,H,mats[0],false)));

  // --- пол / потолок / ступени ---
  const fsz=size+200;
  const fm=L({map:th.floor.tex.clone()});fm.map.needsUpdate=true;
  const rep=fsz/th.floor.tile;fm.map.repeat.set(rep,rep);
  const fl=new THREE.Mesh(new THREE.PlaneGeometry(fsz,fsz),fm);
  fl.rotation.x=-Math.PI/2;fl.position.set(size/2,0,size/2);world.add(fl);
  const slabs=[],slabsK=[],slabsU=[],steps=[],fmat=outdoor?M.stone:M.stoneBase;
  openB.forEach(([x,y])=>{const k=x*W+y,st=stairs.get(k),hm=hmap[k];
    if(st){for(let q=0;q<4;q++){const top=st.h0+(q+1)*(st.h1-st.h0)/4,al=(q+.5)/4*B-B/2;
      steps.push([wc(x)+st.dx*al,wc(y)+st.dy*al,st.dx?B/4:B,st.dy?B/4:B,top])}}
    else if(hm>.01)slabs.push([x,y,hm]);
    else if(outdoor&&cmap[k]>0)(kindAt.get(x+','+y)==='keep'?slabsK:slabs).push([x,y,.12]);
    if(hmapU[k]>0&&!bridgeSet.has(x+','+y))slabsU.push([x,y,hmapU[k]])});
  instanced(unitBox,fmat,steps,(d,[cx,cz,sx,sz,top])=>{d.position.set(cx,top/2,cz);d.scale.set(sx,top,sz)});
  instanced(unitBox,fmat,slabs,(d,[x,y,h])=>{d.position.set(wc(x),h/2,wc(y));d.scale.set(B,h,B)});
  instanced(unitBox,M.plankFloor,slabsK,(d,[x,y,h])=>{d.position.set(wc(x),h/2,wc(y));d.scale.set(B,h,B)});
  instanced(unitBox,outdoor||th.id==='dungeon'?M.plankFloor:fmat,slabsU,(d,[x,y,h])=>{d.position.set(wc(x),h-.03,wc(y));d.scale.set(B,.06,B)});
  // потолки: у каждого блока своя высота
  const cl=[],clK=[];openB.forEach(([x,y])=>{const k=x*W+y;if(!outdoor||cmap[k]>0){const up=hmapU[k]>0,ch=cH(x,y),tg=kindAt.get(x+','+y)==='keep'?clK:cl;
    tg.push([x,y,ch,up?.44:.5]);if(up&&cmapU[k]>0)tg.push([x,y,cmapU[k],.5])}});
  instanced(unitBox,outdoor?M.ceilStone:L({map:th.ceil}),cl,(d,[x,y,h,t])=>{d.position.set(wc(x),h+t/2,wc(y));d.scale.set(B,t,B)});
  instanced(unitBox,M.plankCeil,clK,(d,[x,y,h,t])=>{d.position.set(wc(x),h+t/2,wc(y));d.scale.set(B,t,B)});
  const roomBlk=(x,y)=>cmap[x*W+y]>0;
  if(waterSet.size){const wm=new THREE.MeshLambertMaterial({map:T.water,color:th.waterCol||0x4a90c0,transparent:true,opacity:th.waterOp||.8,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
    instanced(unitBox,wm,[...waterSet].map(k=>k.split(',').map(Number)),(d,[x,y])=>{d.position.set(wc(x),.1,wc(y));d.scale.set(B,.05,B)});
    instanced(unitBox,M.rock,[...waterSet].flatMap(k=>{const [x,y]=k.split(',').map(Number);return dirs.filter(([dx,dy])=>g[x+dx]&&g[x+dx][y+dy]===0&&!waterSet.has((x+dx)+','+(y+dy))).map(([dx,dy])=>[wc(x)+dx*(B/2-.1),wc(y)+dy*(B/2-.1),dx?.2:B,dy?.2:B])}),(d,[x,z,sx,sz])=>{d.position.set(x,.07,z);d.scale.set(sx,.14,sz)})}
  if(outdoor){
    instanced(new THREE.BoxGeometry(B*.94,.08,B*.94),th.pathMat||(winter?M.stone:M.dirtPath),floors.filter(([x,y])=>!roomBlk(x,y)&&!plazaSet.has(x+','+y)),(d,[x,y])=>d.position.set(wc(x),.04,wc(y)));
  }else{
    const vset=new Set(),apts=[];maze.archPts=apts;
    if(th.arches)floors.forEach(([x,y])=>{if(!roomBlk(x,y)&&rnd()<.16){let al=-1;
      if(isW(x-1,y)&&isW(x+1,y)&&g[x][y-1]===0&&g[x][y+1]===0)al=0;else if(isW(x,y-1)&&isW(x,y+1)&&g[x-1][y]===0&&g[x+1][y]===0)al=1;
      if(al>=0&&!apts.some(p=>(p[0]-x)**2+(p[1]-y)**2<16)){apts.push([x,y]);vset.add(x+','+y);archWall(wc(x),wc(y),al===1,H,mats[0],false)}}});
    if(th.id==='dungeon'||th.id==='catacombs'||th.id==='nordic'||th.id==='castle'){
      const beams=[];
      floors.forEach(([x,y])=>{if(!roomBlk(x,y)&&!vset.has(x+','+y)&&rnd()<.5){
        if(isW(x-1,y)&&isW(x+1,y))beams.push([x,y,0]);else if(isW(x,y-1)&&isW(x,y+1))beams.push([x,y,1])}});
      instanced(new THREE.BoxGeometry(B,.28,.32),M.wood,beams,(d,[x,y,r])=>{d.position.set(wc(x),H-.16,wc(y));d.rotation.y=r?0:Math.PI/2});
    }
    if(th.id==='icecave'||th.id==='cave'){
      const hang=[];floors.forEach(([x,y])=>{if(rnd()<.28)hang.push([wc(x)+R(-.7,.7),wc(y)+R(-.7,.7),R(.5,1.3)*(cH(x,y)/H),cH(x,y)])});
      instanced(new THREE.ConeGeometry(.2,1,5),th.id==='icecave'?M.iceRock:M.caveRock,hang,(d,[x,z,h,ch],i)=>{d.position.set(x,ch-h/2,z);d.scale.set(R(.7,1.4),h,R(.7,1.4));d.rotation.x=Math.PI});
    }
  }
  // балки под потолком больших залов
  {const bm=[];maze.structs.forEach(s=>{if(s.kind==='tower')return;for(let j=0;j<s.w;j+=2)bm.push([wc(s.x0+(s.w-1)/2),wc(s.y0+j),s.w*B,s.H]);});
   instanced(unitBox,M.wood,bm,(d,[x,z,len,SH])=>{d.position.set(x,SH-.3,z);d.scale.set(len,.35,.5)});}
  // колонны / валуны
  pillars.forEach(([x,y])=>{
    const px_=wc(x),pz=wc(y),H=cH(x,y);
    if(outdoor){const r=new THREE.Mesh(new THREE.DodecahedronGeometry(1.15,0),winter?M.snowRock:M.rock);r.position.set(px_,.7,pz);r.scale.set(1,1.1,1);r.rotation.y=rnd()*6;world.add(r);
      if(winter){const cap=new THREE.Mesh(new THREE.DodecahedronGeometry(.85,0),M.snow);cap.position.set(px_,1.45,pz);cap.scale.set(1,.45,1);world.add(cap)}}
    else if(th.id==='cave'||th.id==='icecave'){
      const m=th.id==='cave'?M.caveRock:M.iceRock;
      for(let i=0;i<4;i++){const r=new THREE.Mesh(new THREE.DodecahedronGeometry(.95-i*.08,0),m);r.position.set(px_,.6+i*(H-1.2)/3,pz);r.rotation.y=rnd()*6;r.scale.set(1,1.6,1);world.add(r)}
    }else{const cg=new THREE.CylinderGeometry(.82,.9,H,8),uv=cg.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*3,uv.getY(i)*H/3.2);
      const c=new THREE.Mesh(cg,mats[0]);c.position.set(px_,H/2,pz);world.add(c);
      world.add(tbox(1.9,.34,1.9,M.archStone,px_,H-.17,pz));world.add(tbox(1.7,.3,1.7,M.archStone,px_,H-.5,pz));world.add(tbox(1.9,.34,1.9,M.archStone,px_,.17,pz))}
  });

  exitPos.set(wc(exit[0]),0,wc(exit[1]));
  buildExit(th,H);

  // --- помощники декора ---
  const roomAt=new Map();maze.rooms.concat(maze.structs).forEach(r=>{for(let i=0;i<r.w;i++)for(let j=0;j<r.w;j++)roomAt.set((r.x0+i)+','+(r.y0+j),r)});
  const place=(p,sp)=>{if(!p||!sp)return false;let x=sp.x,z=sp.z;
    if(sp.nx!==undefined){const h=p.userData.half||.35;x=sp.wx-sp.nx*(h+.03);z=sp.wz-sp.nz*(h+.03)}
    if(tooClose(x,z,2.4))return false;placed.push([x,z]);
    p.position.set(x,floorAt(x,z,sp.ref||0),z);p.rotation.y=sp.yaw;world.add(p);registerLight(p);return true};
  const pick=(r,list)=>{let a=0;for(const [p,fn] of list){a+=p;if(r<a){fn();return true}}return false};
  const bumps=[],drifts=[],stones=[],chunks=[],trims=[];
  maze.rooms.forEach(r=>decorRoom(r,th,place,H));
  maze.structs.forEach(st=>decorStruct(st,th,place));
  if(outdoor){vistas.forEach(v=>{vistaDeck(v,th);buildVista(v,th,size)});bridgeVisuals();maze.structs.forEach(st=>buildShell(st,th));maze.plazas.forEach(p=>decorPlaza(p,th,place))}

  floors.forEach(([x,y])=>{
    if(x===start[0]&&y===start[1]||x===exit[0]&&y===exit[1]||skipSet.has(x+','+y))return;
    const H=cH(x,y),sf=Math.min(2.2,H/3.2);
    const cx=wc(x),cz=wc(y), room=roomAt.get(x+','+y);
    for(const [dx,dy] of dirs){
      if(!isW(x+dx,y+dy)||feat.has((x+dx)+','+(y+dy)))continue;
      const okF=fOK(cx,cz,dx,dy);
      if(th.trim){const sx=dx?.12:B,sz=dy?.12:B,px_=cx+dx*(B/2-.05),pz_=cz+dy*(B/2-.05);trims.push([px_,pz_,sx,sz,.12,.24]);trims.push([px_,pz_,sx,sz,H-.1,.2])}
      const tb=room?.05:0;
      const torch=()=>addTorch(cx+dx*(B/2-.15),cz+dy*(B/2-.15),dx,dy,th.torch);
      const dec=(m,w,h,yy,off=R(-.4,.4),fl=rnd()<.5)=>decal(m,w,h,cx,cz,dx,dy,yy,off,fl);
      const pil=()=>pilaster(cx,cz,dx,dy,mats[0],H,R(-.5,.5));
      const bump=()=>{for(let i=0;i<2;i++)bumps.push([cx+dx*(B/2-.12)+(-dy)*R(-.7,.7),R(.3,H-.4),cz+dy*(B/2-.12)+dx*R(-.7,.7),R(.35,.7)])};
      const BN=()=>(th.id==='castle'||th.id==='nordic')?M.bannerList[rnd()*3|0]:M.banner, SHD=()=>th.id==='castle'?M.shield2:M.shield;
      const r=rnd();let L_=null;
      switch(th.id){
        case 'dungeon':L_=[[.07+tb,torch],[.05,()=>dec(BN(),.8*sf,1.6*sf,H-1.15*sf)],[.05,()=>dec(SHD(),.7,.7,1.9)],[.03,()=>dec(M.door,1.5,2.5,1.25,0)],[.07,()=>dec(M.decal,1.4,2.1,1.4)],[.04,()=>dec(M.cobweb,.9,.9,H-.5,rnd()<.5?.45:-.45)],[.025,()=>dec(M.skull,.34,.34,.35)],[.04,pil]];break;
        case 'winter':L_=[[.06+tb,torch],[.05,()=>dec(BN(),.8*sf,1.6*sf,H-1.1*sf)],[.04,()=>dec(SHD(),.7,.7,1.7)],[.07,()=>dec(M.decal,1.4,2.1,1.2)]];break;
        case 'catacombs':L_=[[.05+tb,torch],[.09,()=>dec(M.skull,.5,.5,R(.4,1.6))],[.07,()=>dec(M.cobweb,.9,.9,H-.5,rnd()<.5?.45:-.45)],[.08,()=>dec(M.decal,1.4,2.1,1.4)],[.03,()=>dec(M.door,1.5,2.5,1.25,0)],[.03,()=>dec(BN(),.8*sf,1.6*sf,H-1.1*sf)],[.04,pil]];break;
        case 'cave':L_=[[.08,()=>dec(M.decal,1.4,2.1,1.4)],[.14,bump],[.04,()=>dec(M.cobweb,.9,.9,H-.5,rnd()<.5?.45:-.45)]];break;
        case 'castle':L_=[[.07+tb,torch],[.1,()=>dec(BN(),1.0*sf,2.2*sf,H-1.6*sf)],[.04,()=>dec(SHD(),.8,.8,2.3)],[.03,()=>dec(M.door,1.5,2.5,1.25,0)],[.03,()=>dec(M.decal,1.4,2.1,1.6)],[.02,()=>dec(M.cobweb,.9,.9,H-.5,rnd()<.5?.45:-.45)],[.08,pil]];break;
        case 'forest':L_=[[.04,torch],[.04,()=>dec(BN(),.8,1.6,H-1.1)],[.12,()=>dec(M.decal,1.4,2.1,1.2)],[.02,()=>dec(SHD(),.7,.7,1.7)]];break;
        case 'desert':L_=[[.04,torch],[.05,()=>dec(BN(),.8,1.6,H-1.1)],[.1,()=>dec(M.decalC,1.4,2.1,1.2)],[.03,()=>dec(M.skull,.34,.34,.35)],[.04,()=>dec(M.rune,.8,.8,R(1.2,2))]];break;
        case 'swamp':L_=[[.04,torch],[.2,()=>dec(M.decal,1.4,2.1,1.2)],[.03,()=>dec(M.skull,.34,.34,.5)],[.05,()=>dec(M.cobweb,.9,.9,H-.5,rnd()<.5?.45:-.45)]];break;
      }
      if(okF&&pick(r,L_))fMark(cx,cz,dx,dy);
      // камни у основания стен и выступающие обломки — ломают ровные плоскости
      if(rnd()<(th.id==='cave'||th.id==='icecave'?.5:.28))stones.push([cx+dx*(B/2-.25)+(-dy)*R(-.75,.75),cz+dy*(B/2-.25)+dx*R(-.75,.75),R(.12,th.id==='cave'?.5:.32),R(.5,1)]);
      if(rnd()<.2)chunks.push([cx+dx*(B/2-.05)+(-dy)*R(-.7,.7),R(.3,H-.5),cz+dy*(B/2-.05)+dx*R(-.7,.7),dx?R(.12,.3):R(.25,.6),R(.2,.5),dy?R(.12,.3):R(.25,.6),R(0,3)]);
      if(winter){
        if(rnd()<.5)dec(M.icicle,B*.95,.4,H-.3,0);
        if(rnd()<.35)drifts.push([cx+dx*(B/2-.35)+(-dy)*R(-.4,.4),cz+dy*(B/2-.35)+dx*R(-.4,.4),R(.6,1.1),R(.2,.45)]);
      }
      if(th.id==='icecave'&&rnd()<.3)dec(M.icicle,B*.95,.4,H-.3,0);
    }
    if(th.id==='dungeon'&&!tooClose(cx,cz,3.5)&&rnd()<.03){hangingCage(cx+R(-.4,.4),cz+R(-.4,.4),H);placed.push([cx,cz])}
    if(th.id==='castle'&&!room&&!tooClose(cx,cz,4)&&rnd()<.05){const ch=chandelier(H);ch.position.set(cx,0,cz);world.add(ch);registerLight(ch);placed.push([cx,cz])}
    if(outdoor&&!room&&!tooClose(cx,cz,4)&&rnd()<.05){
      if(isW(x-1,y)&&isW(x+1,y)){archWall(cx,cz,false,H,mats[0],true);placed.push([cx,cz])}
      else if(isW(x,y-1)&&isW(x,y+1)){archWall(cx,cz,true,H,mats[0],true);placed.push([cx,cz])}}
    // реквизит: крупное — у стен/в углах, мелкое — вразброс
    if(rnd()<(room?.2:.1)){
      const fr={x:cx+R(-.5,.5),z:cz+R(-.5,.5),yaw:rnd()*6};
      const P=[]; // [вес, фабрика, 'w'|'f']
      switch(th.id){
        case 'dungeon':P.push([.15,()=>chest(rnd()<.4),'w'],[.13,barrel,'w'],[.1,()=>crate(false),'w'],[.12,()=>skeleton(rnd()<.5),'w'],[.08,candles,'w'],[.06,weaponRack,'w'],[.08,slimePit,'f'],[.08,puddle,'f'],[.08,rubble,'f'],[.05,planks,'w']);break;
        case 'winter':P.push([.1,()=>chest(false),'w'],[.12,()=>crate(true),'w'],[.1,barrel,'w'],[.08,woodpile,'w'],[.08,fence,'w'],[.06,wheel,'w'],[.06,pickaxe,'f'],[.08,lampPost,'w'],[.06,signpost,'w'],[.06,()=>skeleton(rnd()<.5),'w'],[.1,sacks,'w'],[.08,icePatch,'f']);break;
        case 'catacombs':P.push([.16,()=>skeleton(rnd()<.5),'w'],[.12,bonePile,'f'],[.12,coffin,'w'],[.1,candles,'w'],[.1,urn,'w'],[.08,rubble,'f'],[.06,barrel,'w'],[.06,puddle,'f'],[.08,skullPyramid,'w'],[.04,()=>chest(false),'w']);break;
        case 'cave':P.push([.2,mushrooms,'w'],[.18,stalagmite,'w'],[.1,()=>crystal(M.crystalP),'w'],[.1,bonePile,'f'],[.1,puddle,'f'],[.1,rubble,'f'],[.05,()=>skeleton(false),'w']);break;
        case 'castle':P.push([.14,armor,'w'],[.1,bookshelf,'w'],[.08,()=>chest(rnd()<.3),'w'],[.06,barrel,'w'],[.12,candelabra,'w'],[.1,statue,'w'],[.08,weaponRack,'w'],[.08,urn,'w'],[.04,()=>crate(false),'w']);break;
        case 'forest':P.push([.06,()=>chest(false),'w'],[.06,()=>crate(false),'w'],[.06,barrel,'w'],[.1,fence,'w'],[.06,woodpile,'w'],[.06,lampPost,'w'],[.08,signpost,'w'],[.05,()=>skeleton(rnd()<.5),'w'],[.1,rubble,'f'],[.12,log,'w'],[.15,bush,'w'],[.06,statue,'w']);break;
        case 'desert':P.push([.06,()=>chest(false),'w'],[.08,()=>crate(false),'w'],[.06,barrel,'w'],[.12,urn,'w'],[.16,cactus,'w'],[.05,()=>skeleton(rnd()<.5),'w'],[.08,sacks,'w'],[.05,statue,'w'],[.12,rubble,'f'],[.05,lampPost,'w'],[.05,signpost,'w']);break;
        case 'swamp':P.push([.1,log,'w'],[.2,reeds,'w'],[.06,skullPole,'w'],[.05,barrel,'w'],[.05,()=>crate(false),'w'],[.08,()=>skeleton(rnd()<.5),'w'],[.08,bonePile,'f'],[.1,mushrooms,'w'],[.06,lampPost,'w'],[.1,rubble,'f'],[.1,puddle,'f']);break;
      }
      const tot=P.reduce((a,b)=>a+b[0],0);let q=rnd()*tot;
      for(const [w,fn,mode] of P){if((q-=w)<0){const p=fn();place(p,mode==='w'?flushSpot(g,x,y,cx,cz):fr);break}}
    }
  });
  instanced(new THREE.DodecahedronGeometry(1,0),th.id==='icecave'?M.iceRock:M.caveRock,bumps,(d,[x,y,z,s],i)=>{d.position.set(x,y,z);d.scale.set(s,s*1.1,s);d.rotation.set(i,i*2,0)});
  instanced(unitBox,M.trimStone,trims,(d,[x,z,sx,sz,y,h])=>{d.position.set(x,y,z);d.scale.set(sx,h,sz)});
  if(winter)instanced(new THREE.DodecahedronGeometry(1,0),M.snow,drifts,(d,[x,z,s,h])=>{d.position.set(x,0,z);d.scale.set(s,h,s*.8);d.rotation.y=x});
  const stoneMat=th.id==='icecave'?M.iceRock:th.id==='cave'?M.caveRock:winter?M.snowRock:M.rock;
  instanced(new THREE.DodecahedronGeometry(1,0),stoneMat,stones,(d,[x,z,s,sy],i)=>{d.position.set(x,s*.3,z);d.scale.set(s,s*sy,s);d.rotation.set(i,i*3,0)});
  instanced(new THREE.BoxGeometry(1,1,1),M.rock,chunks,(d,[x,y,z,w,h,dd,ry],i)=>{d.position.set(x,y,z);d.scale.set(w,h,dd);d.rotation.set(R(-.2,.2),ry,R(-.2,.2))});
  if(th.carpet){ // красная дорожка по кратчайшему пути к выходу
    const path=solvePath(g,start,exit,(x,y)=>!skipSet.has(x+','+y)),cp=[];
    path.forEach((c,i)=>{const p=path[Math.max(0,i-1)],n=path[Math.min(path.length-1,i+1)];cp.push([c[0],c[1],(n[0]-p[0])!==0?0:1])});
    instanced(new THREE.BoxGeometry(B,.03,1.3),M.carpetM,cp,(d,[x,y,r])=>{d.position.set(wc(x),.02,wc(y));d.rotation.y=r?Math.PI/2:0});
  }
  if(outdoor)buildOutdoor(size,th);
  mergeStatic();
  {
    const f=th.fx,pos=new Float32Array(f.n*3);
    for(let i=0;i<f.n;i++){pos[i*3]=R(-f.rg,f.rg);pos[i*3+1]=R(0,f.H);pos[i*3+2]=R(-f.rg,f.rg)}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
    parts=new THREE.Points(geo,new THREE.PointsMaterial({color:f.color,size:f.size,fog:false,transparent:f.alpha<1,opacity:f.alpha}));
    parts.userData=f;parts.frustumCulled=false;world.add(parts);
  }
  player.x=wc(start[0]);player.z=wc(start[1]);player.floor=0;player.eyeY=0;player.cool=0;
  player.yaw=g[2][1]===0?-Math.PI/2:Math.PI;player.pitch=0;
  updateMap();
}

const unitBox=new THREE.BoxGeometry(1,1,1);
function registerLight(p){
  if(!p.userData.light)return;p.updateMatrixWorld(true);const v=p.userData.light.clone();p.localToWorld(v);v.col=p.userData.col||0xffa860;torches.push(v)}
