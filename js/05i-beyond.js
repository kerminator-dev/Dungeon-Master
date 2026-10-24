'use strict';
// ---------- beyond the grates (dungeons) ----------
// around the real maze is a ring of fake corridors built by the same wall code: same masonry,
// vaults and torches, fading into darkness. unreachable: outer wall openings are grated.
// style varies per level, in what furnishes the corridors: torches, glowing mushrooms (cave), niche candles (catacombs),
// floor water (sewer), timbering (mine). the walls and floor are always the maze's own; passages always corridor-wide.
// drawn only while a grate near the player is in view.
const BEYOND_RING=2;   // ring width, cells
function buildBeyond(root,m){W.beyond=null;if(!TH.indoor||!W.wins.length)return;
  const RW=W,TH0=TH,rnd0=rnd,mR=BEYOND_RING,n=RW.n,N=n+2*mR,off=-mR*CS,ov=new THREE.Vector3(off,0,off);
  rnd=mulberry(game.seed*97+game.level*13+n);                   // own stream: maze layout is not shifted
  const style=pick(TH.beyond||['corridor','cave','catacomb','sewer','mine']),cave=style==='cave'||style==='mine',g=new THREE.Group(),flames=[];g.position.copy(ov);root.add(g);
  try{const M=genGrid(N);
    // from each grate a passage runs off to show depth; it bends at random and ends inside the ring,
    // never reaching the outer wall, so no straight line leads out into emptiness
    const opened=new Set(),wallAt=(i,j,di,dj,open)=>{const v=open?0:1,[t,x,y]=di===1?['V',i+1,j]:di===-1?['V',i,j]:dj===1?['H',i,j+1]:['H',i,j];
      if(t==='V')M.V[x][y]=v;else M.Hh[x][y]=v;if(open)opened.add(t+x+','+y)};
    for(const w of RW.wins){let i,j,di,dj;
      if(w.d[0]){j=(w.z0-WT)/CS+mR;i=w.d[0]<0?mR-1:mR+n;di=w.d[0];dj=0}
      else{i=(w.x0-WT)/CS+mR;j=w.d[1]<0?mR-1:mR+n;di=0;dj=w.d[1]}
      const i0=i,j0=j;
      // the first step goes sideways, so through the grate you see a wall, not a corridor running off
      if(di){di=0;dj=rnd()<.5?1:-1}else{dj=0;di=rnd()<.5?1:-1}
      for(let len=ri(4,6),first=true;len>0;len--,first=false){
        if(i+di<0||j+dj<0||i+di>=N||j+dj>=N)break;
        wallAt(i,j,di,dj,true);i+=di;j+=dj;
        if(first||rnd()<.8){if(di)[di,dj]=[0,rnd()<.5?1:-1];else[di,dj]=[rnd()<.5?1:-1,0]}}
      // seal the wall straight in front of the grate's cell: the line of sight ends at a wall right behind the grate
      wallAt(i0,j0,w.d[0],w.d[1],false)}
    // a node left with no wall on any side would leave no pillar either: four cells would merge into one hall 6 m
    // across under a stepped vault. every such node gets one of its walls back, one no grate passage was cut through
    const has=(a,b)=>(b>0&&M.V[a][b-1])||(b<N&&M.V[a][b])||(a>0&&M.Hh[a-1][b])||(a<N&&M.Hh[a][b]);
    for(let a=1;a<N;a++)for(let b=1;b<N;b++){if(has(a,b))continue;
      const opts=[[0,b-1,'V',a],[0,b,'V',a],[1,a-1,'H',b],[1,a,'H',b]].map(([h,k,t,q])=>t==='V'?['V',q,k]:['H',k,q]).filter(([t,x,y])=>!opened.has(t+x+','+y));
      const [t,x,y]=opts.length?pick(opts):['V',a,b];if(t==='V')M.V[x][y]=1;else M.Hh[x][y]=1}
    W={cull:[],lights:[],tall:[],arches:[],wins:[],exitCell:{i:-99,j:-99},exitArch:{top:0}};gridWalls(M,N);
    const TW=W.TW,lo=mR*CS,hi=lo+RW.TW;W.b={x0:0,z0:0,x1:TW,z1:TW};
    for(let x=lo;x<hi;x++)for(let z=lo;z<hi;z++)W.tile[x*TW+z]=5;                      // real maze here
    buildOcc();
    W.segs=W.segs.filter(s=>{const a=warp(...s.a),b=warp(...s.b),mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2;return !(mx>lo-1&&mx<hi+1&&mz>lo-1&&mz<hi+1)});
    // the masonry and floor are the maze's own, whatever the style: through a grate the maze goes on, the same walls
    buildWalls(g,m);buildFloorCeil(g,m);
    // lights: torches, niche candles, lanterns on timbers or glowing mushrooms at cave wall bases
    const hold=[],shrooms=[],soil=[],spr=[],used=[],cand=[],skulls=[],beams=[],inside=(x,z)=>x>lo-.6&&x<hi+.6&&z>lo-.6&&z<hi+.6;
    // a pit already holding a skull from the decor pass keeps it; the rest get a candle or a skull, never both
    if(style==='catacomb')for(const q of W.niches){if(inside(q.x,q.z)||q.used)continue;
      if(rnd()<.3&&!used.some(p=>Math.hypot(p[0]-q.x,p[1]-q.z)<3.5)){used.push([q.x,q.z]);q.used='candle';pushInst(cand,q.x,q.y,q.z,0,0,0,1,1,1,new THREE.Color(1,1,1),0);
        flames.push({x:q.x+off,y:q.y+.22,z:q.z+off,nx:q.nx,nz:q.nz,base:q.y,kind:'candle'})}
      else if(rnd()<.45&&q.r>.3&&(q.used='skull'))pushInst(skulls,q.x,q.y,q.z,0,Math.atan2(q.nx,q.nz)+rr(-.5,.5),0,1,1,1,new THREE.Color(1,1,1),0)}
    for(const fc of W.faces){if(fc.outer||style==='catacomb')continue;const L=fc.sg.len;
      const pr={corridor:.22,cave:.4,sewer:.2,mine:.3}[style];
      for(let u=0;u<Math.max(1,Math.round(L/CS));u++){if(rnd()>pr||L<1.8)continue;const s=rr(.8,L-.8),f=faceAt(fc,s),x=f.x,z=f.z;
        if(inside(x,z)||used.some(p=>Math.hypot(p[0]-x,p[1]-z)<(cave?3:4.5)))continue;used.push([x,z]);   // not inside the real maze
        if(style==='cave'){const px=x+f.nx*(BD+.35),pz=z+f.nz*(BD+.35),v=ri(0,2),yaw=rr(0,6),s2=rr(.9,1.3);   // mushrooms on a dirt mound
          pushInst(shrooms,px,0,pz,0,yaw,0,s2,s2,s2,new THREE.Color(pick(['#5af0d0','#6ad8ff','#a0ff70','#c08aff'])).multiplyScalar(rr(.7,1)),v);
          pushInst(soil,px,0,pz,0,yaw,0,s2,s2,s2,new THREE.Color(1,1,1),v);spr.push([px,.35,pz])}
        else if(style==='mine'){// timbering: two posts by the walls and a cap beam across, lantern on a post
          const ox=x+f.nx*(BD+CW),oz=z+f.nz*(BD+CW),yaw=Math.atan2(f.nx,f.nz);if(!blocked(ox+f.nx*.15,oz+f.nz*.15))continue;
          for(const k of [.12,CW-.12])pushInst(beams,x+f.nx*(BD+k),1.15,z+f.nz*(BD+k),rr(-.03,.03),yaw,rr(-.03,.03),.16,2.3,.16,new THREE.Color(1,1,1).multiplyScalar(rr(.75,1)),0);
          pushInst(beams,x+f.nx*(BD+CW/2),2.32,z+f.nz*(BD+CW/2),0,yaw,rr(-.03,.03),.18,.18,CW+.1,new THREE.Color(1,1,1).multiplyScalar(rr(.75,1)),0);
          if(rnd()<.6){pushInst(hold,x+f.nx*(BD+.2),1.85,z+f.nz*(BD+.2),0,yaw,0,1,1,1,new THREE.Color(1,1,1),0);
            flames.push({x:x+f.nx*(BD+.4)+off,y:2.15,z:z+f.nz*(BD+.4)+off,bx:x+off,bz:z+off,nx:f.nx,nz:f.nz,base:1.85,kind:'torch',dim:.8})}}
        else{pushInst(hold,x+f.nx*BD,1.85,z+f.nz*BD,0,Math.atan2(f.nx,f.nz),0,1,1,1,new THREE.Color(1,1,1),0);
          flames.push({x:x+f.nx*(BD+.2)+off,y:2.15,z:z+f.nz*(BD+.2)+off,bx:x+off,bz:z+off,nx:f.nx,nz:f.nz,base:1.85,kind:'torch'})}}}
    if(hold.length)instance(g,hold,[torchHolderGeo()],plainMat(),true,CHUNK*2);
    if(cand.length)instance(g,cand,[mergeParts([cy(.03,.035,.16,7,-.05,.08,0,'#e8dcc0'),cy(.025,.03,.1,7,.06,.05,.03,'#d8ccb0')])],plainMat(),true,CHUNK*2);
    if(skulls.length)instance(g,skulls,[mergeParts(xform(skullParts(),_m4(0,.1,0)))],plainMat(),true,CHUNK*2);
    if(beams.length)instance(g,beams,[roughBox(1,3,1,.03,.05,12)],new THREE.MeshLambertMaterial({color:0x5a4030}),true,CHUNK*2);
    if(style==='sewer'){// water over the whole floor: dark, with torch glints
      const wmat=new THREE.MeshPhongMaterial({color:0x1c2a22,specular:0x0c120e,shininess:20,transparent:true,opacity:.88,depthWrite:false});
      for(const [x0,z0,x1,z1] of [[0,0,TW,lo],[0,hi,TW,TW],[0,lo,lo,hi],[hi,lo,TW,hi]]){   // except where the real maze is
        const wm=new THREE.Mesh(new THREE.PlaneGeometry(x1-x0,z1-z0),wmat);wm.rotation.x=-Math.PI/2;wm.position.set((x0+x1)/2,.07,(z0+z1)/2);g.add(wm);(RW.waters||(RW.waters=[])).push(waterSeesLights(wm))}}   // (the maze's W: this one is the ring's)
    if(shrooms.length){const sets=[0,1,2].map(shroomSet);instance(g,shrooms,sets.map(q=>q.grow),glowMat(),true,CHUNK*2);
      instance(g,soil,sets.map(q=>q.base),plainMat(),true,CHUNK*2);
      const gm=new THREE.SpriteMaterial({map:tex('shroomglow',()=>mkGlowTex([[0,'rgba(120,255,220,.5)'],[.45,'rgba(80,200,255,.16)'],[1,'rgba(60,160,255,0)']])),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true});
      for(const p of spr){const s=new THREE.Sprite(gm);s.position.set(...p);s.scale.set(2.6,2.6,1);g.add(s)}}
    flushStatic();
    // the ring's chunks join the maze's culling (world-space centres): one within 16 m of a grate is drawn while that grate
    // is in view (it takes the grates' cells), the rest are never seen
    for(const w of RW.wins)w.cells=cellsIn(w.x0,w.z0,w.x1-.01,w.z1-.01);
    for(const o of W.cull){const u=o.userData,near=RW.wins.filter(w=>Math.hypot(w.cx-u.c.x-off,w.cz-u.c.z-off)-u.r<16);u.c=u.c.clone().add(ov);
      if(near.length){u.cells=[...new Set(near.flatMap(w=>w.cells))];RW.cull.push(o)}else o.visible=false}
  }finally{W=RW;TH=TH0;rnd=rnd0}
  for(const l of flames){W.lights.push(l);makeFlame(root,l)}
  // grates in openings: bars from floor to arch
  const bars=[];for(const w of W.wins){const ax=Math.abs(w.d[0])>.5,top=w.hs+w.w/2+.2;
    for(const u of [-.6,-.3,0,.3,.6])pushInst(bars,w.cx+(ax?0:u),top/2,w.cz+(ax?u:0),0,0,0,.05,top,.05,new THREE.Color(1,1,1),0);
    for(const y of [.9,1.9])pushInst(bars,w.cx,y,w.cz,0,ax?0:Math.PI/2,0,.05,.05,1.6,new THREE.Color(1,1,1),0)}
  instance(root,bars,[new THREE.BoxGeometry(1,1,1)],new THREE.MeshLambertMaterial({color:0x2a2622}),true,CHUNK*2);
  W.beyond={g,cave,style}}
// the ring is drawn only near a grate, and only while one is in view (vis: the culling's visible cells)
function updateBeyond(cp,vis){const B=W.beyond;if(!B)return;let d=99;for(const w of W.wins)d=Math.min(d,Math.hypot(w.cx-cp.x,w.cz-cp.z));
  B.g.visible=d<32&&(!vis||W.wins.some(w=>w.cells.some(k=>vis.has(k))))}
