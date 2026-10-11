'use strict';
// ---------- продолжение за решётками (подземелья) ----------
// Вокруг настоящего лабиринта — кольцо ненастоящих коридоров, построенных тем же кодом стен: та же кладка,
// своды и факелы, и всё уходит в темноту. Попасть туда нельзя: проёмы в наружной стене закрыты решёткой.
// Стиль на каждом уровне свой: кирпичные коридоры, узкие пещерные лазы, катакомбы со свечами в нишах,
// канализация с водой по полу, шахта с крепью. Ходы всегда шириной в коридор — без огромных залов.
// Рисуется, только когда рядом есть решётка.
const BEYOND_RING=3;   // ширина кольца, клеток
const CAVE_ROCK=['#6a645c','#5c5852','#78726a','#4e4a44','#625a50','#6e665a'];
function buildBeyond(root,m){W.beyond=null;if(!TH.indoor||!W.wins.length)return;
  const RW=W,TH0=TH,rnd0=rnd,mR=BEYOND_RING,n=RW.n,N=n+2*mR,off=-mR*CS,ov=new THREE.Vector3(off,0,off);
  rnd=mulberry(game.seed*97+game.level*13+n);                   // свой поток: раскладка лабиринта не сдвигается
  const style=pick(['corridor','cave','catacomb','sewer','mine']),cave=style==='cave'||style==='mine',g=new THREE.Group(),flames=[];g.position.copy(ov);root.add(g);
  try{const M=genGrid(N);
    // напротив каждой решётки ход уходит прямо вдаль — видна глубина
    for(const w of RW.wins){if(w.d[0]){const J=(w.z0-WT)/CS+mR;if(w.d[0]<0)for(let k=0;k<mR;k++)M.V[k][J]=0;else for(let k=mR+n+1;k<=N;k++)M.V[k][J]=0}
      else{const I=(w.x0-WT)/CS+mR;if(w.d[1]<0)for(let k=0;k<mR;k++)M.Hh[I][k]=0;else for(let k=mR+n+1;k<=N;k++)M.Hh[I][k]=0}}
    W={cull:[],lights:[],tall:[],arches:[],wins:[],exitCell:{i:-99,j:-99},exitArch:{top:0}};gridWalls(M,N);
    const TW=W.TW,lo=mR*CS,hi=lo+RW.TW;W.b={x0:0,z0:0,x1:TW,z1:TW};
    for(let x=lo;x<hi;x++)for(let z=lo;z<hi;z++)W.tile[x*TW+z]=5;                      // здесь настоящий лабиринт
    buildOcc();
    W.segs=W.segs.filter(s=>{const a=warp(...s.a),b=warp(...s.b),mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2;return !(mx>lo-1&&mx<hi+1&&mz>lo-1&&mz<hi+1)});
    let mm=m;const rockMat=(e,k)=>{const rt=tex('caverock',()=>mkStoneTex({cols:['#ffffff','#e6e6e6','#d0d0d0'],gap:'#9a9a9a',cells:3,seed:77,size:128,gapW:2}));
      return Object.assign({},m,{wall:new THREE.MeshPhongMaterial({map:rt,vertexColors:true,shininess:4,specular:0x0a0a0a,emissive:e}),slab:new THREE.MeshPhongMaterial({map:rt,vertexColors:true,shininess:6,specular:0x0c0c0c,emissive:k})})};
    if(cave){TH=Object.assign({},TH0,{brick:CAVE_ROCK,brickVar:.2,odd:'#3a3834',slabK:.8,dmg:style==='mine'?.4:.6});   // без «эрозии»: ход той же ширины и высоты, что коридор
      mm=style==='mine'?rockMat(0x120c08,0x0e0a06):rockMat(0x0e1a1c,0x0c1618)}
    else if(style==='catacomb')TH=Object.assign({},TH0,{brick:THEMES.catacombs.brick,brickVar:.12,odd:'#6e6a5c',slabK:.55,dmg:.9});
    else if(style==='sewer')TH=Object.assign({},TH0,{brick:['#4e4c3e','#58553f','#424436','#5c5a4a','#4a4a3c'],brickVar:.14,odd:'#2e3228',slabK:.7,mossCol:'#34482a',moss:1});
    buildWalls(g,mm);buildFloorCeil(g,mm);
    // свет: факелы, свечи в нишах, фонари на крепи или светящиеся грибы у подножия стен пещеры
    const hold=[],shrooms=[],spr=[],used=[],cand=[],skulls=[],beams=[],inside=(x,z)=>x>lo-.6&&x<hi+.6&&z>lo-.6&&z<hi+.6;
    if(style==='catacomb')for(const q of W.niches){if(inside(q.x,q.z))continue;
      if(rnd()<.3&&!used.some(p=>Math.hypot(p[0]-q.x,p[1]-q.z)<3.5)){used.push([q.x,q.z]);pushInst(cand,q.x,q.y,q.z,0,0,0,1,1,1,new THREE.Color(1,1,1),0);
        flames.push({x:q.x+off,y:q.y+.22,z:q.z+off,nx:q.nx,nz:q.nz,base:q.y,kind:'candle'})}
      else if(rnd()<.45&&q.r>.3)pushInst(skulls,q.x,q.y,q.z,0,Math.atan2(q.nx,q.nz)+rr(-.5,.5),0,1,1,1,new THREE.Color(1,1,1),0)}
    for(const fc of W.faces){if(fc.outer||style==='catacomb')continue;const L=fc.sg.len;
      const pr={corridor:.22,cave:.4,sewer:.2,mine:.3}[style];
      for(let u=0;u<Math.max(1,Math.round(L/CS));u++){if(rnd()>pr||L<1.8)continue;const s=rr(.8,L-.8),f=faceAt(fc,s,0),x=f.x,z=f.z;
        if(inside(x,z)||used.some(p=>Math.hypot(p[0]-x,p[1]-z)<(cave?3:4.5)))continue;used.push([x,z]);   // не внутри настоящего лабиринта
        if(style==='cave'){for(let k=ri(3,6);k>0;k--){const d=BD+rr(.05,.5),a=rr(-.5,.5),px=x+f.nx*d+f.nz*a,pz=z+f.nz*d-f.nx*a,s2=rr(.6,1.4);
            pushInst(shrooms,px,0,pz,rr(-.2,.2),rr(0,6),rr(-.2,.2),s2,s2*rr(.8,1.4),s2,new THREE.Color(pick(['#5af0d0','#6ad8ff','#a0ff70','#c08aff'])).multiplyScalar(rr(.7,1)),0)}
          spr.push([x+f.nx*(BD+.3),.35,z+f.nz*(BD+.3)])}
        else if(style==='mine'){// крепь: две стойки у стен и верхняк поперёк хода, на стойке — фонарь
          const ox=x+f.nx*(BD+CW),oz=z+f.nz*(BD+CW),yaw=Math.atan2(f.nx,f.nz);if(!blocked(ox+f.nx*.15,oz+f.nz*.15))continue;
          for(const k of [.12,CW-.12])pushInst(beams,x+f.nx*(BD+k),1.15,z+f.nz*(BD+k),rr(-.03,.03),yaw,rr(-.03,.03),.16,2.3,.16,new THREE.Color(1,1,1).multiplyScalar(rr(.75,1)),0);
          pushInst(beams,x+f.nx*(BD+CW/2),2.32,z+f.nz*(BD+CW/2),0,yaw,rr(-.03,.03),.18,.18,CW+.1,new THREE.Color(1,1,1).multiplyScalar(rr(.75,1)),0);
          if(rnd()<.6){pushInst(hold,x+f.nx*(BD+.2),1.85,z+f.nz*(BD+.2),0,yaw,0,1,1,1,new THREE.Color(1,1,1),0);
            flames.push({x:x+f.nx*(BD+.4)+off,y:2.15,z:z+f.nz*(BD+.4)+off,bx:x+off,bz:z+off,nx:f.nx,nz:f.nz,base:1.85,kind:'torch',dim:.8})}}
        else{pushInst(hold,x+f.nx*BD,1.85,z+f.nz*BD,0,Math.atan2(f.nx,f.nz),0,1,1,1,new THREE.Color(1,1,1),0);
          flames.push({x:x+f.nx*(BD+.2)+off,y:2.15,z:z+f.nz*(BD+.2)+off,bx:x+off,bz:z+off,nx:f.nx,nz:f.nz,base:1.85,kind:'torch'})}}}
    if(hold.length)instance(g,hold,[mergeParts([bx(.16,.26,.04,0,0,.02,'#2a2420'),cy(.035,.025,.42,6,0,.1,.13,'#4a3020',.45,0,0)])],new THREE.MeshLambertMaterial({vertexColors:true}),true,CHUNK*2);
    if(cand.length)instance(g,cand,[mergeParts([cy(.03,.035,.16,7,-.05,.08,0,'#e8dcc0'),cy(.025,.03,.1,7,.06,.05,.03,'#d8ccb0')])],new THREE.MeshLambertMaterial({vertexColors:true}),true,CHUNK*2);
    if(skulls.length)instance(g,skulls,[mergeParts(xform(skullParts(),_m4(0,.1,0)))],new THREE.MeshLambertMaterial({vertexColors:true}),true,CHUNK*2);
    if(beams.length)instance(g,beams,[roughBox(1,3,1,.03,.05,12)],new THREE.MeshLambertMaterial({color:0x5a4030}),true,CHUNK*2);
    if(style==='sewer'){// вода по всему полу: тёмная, с бликами от факелов
      const wmat=new THREE.MeshPhongMaterial({color:0x1c2a22,specular:0x667766,shininess:90,transparent:true,opacity:.88,depthWrite:false});
      for(const [x0,z0,x1,z1] of [[0,0,TW,lo],[0,hi,TW,TW],[0,lo,lo,hi],[hi,lo,TW,hi]]){   // кроме места настоящего лабиринта
        const wm=new THREE.Mesh(new THREE.PlaneGeometry(x1-x0,z1-z0),wmat);wm.rotation.x=-Math.PI/2;wm.position.set((x0+x1)/2,.07,(z0+z1)/2);g.add(wm)}}
    if(shrooms.length){instance(g,shrooms,[mergeParts([cy(.012,.018,.09,5,0,.045,0,'#e8f0e0'),[new THREE.SphereGeometry(.045,7,4,0,Math.PI*2,0,Math.PI/2),'#ffffff',_m4(0,.085,0,0,0,0,1,.7,1)]])],
        new THREE.MeshBasicMaterial({vertexColors:true}),true,CHUNK*2);
      const gm=new THREE.SpriteMaterial({map:tex('shroomglow',()=>mkGlowTex([[0,'rgba(120,255,220,.5)'],[.45,'rgba(80,200,255,.16)'],[1,'rgba(60,160,255,0)']])),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true});
      for(const p of spr){const s=new THREE.Sprite(gm);s.position.set(...p);s.scale.set(2.6,2.6,1);g.add(s)}}
    // отсечение по дальности — общее с лабиринтом (центры в мировых координатах)
    for(const o of W.cull){o.userData.c=o.userData.c.clone().add(ov);RW.cull.push(o)}
  }finally{W=RW;TH=TH0;rnd=rnd0}
  for(const l of flames){W.lights.push(l);makeFlame(root,l)}
  // решётки в проёмах: прутья от пола до свода арки
  const bars=[];for(const w of W.wins){const ax=Math.abs(w.d[0])>.5,top=w.hs+w.w/2+.2;
    for(const u of [-.6,-.3,0,.3,.6])pushInst(bars,w.cx+(ax?0:u),top/2,w.cz+(ax?u:0),0,0,0,.05,top,.05,new THREE.Color(1,1,1),0);
    for(const y of [.9,1.9])pushInst(bars,w.cx,y,w.cz,0,ax?0:Math.PI/2,0,.05,.05,1.6,new THREE.Color(1,1,1),0)}
  instance(root,bars,[new THREE.BoxGeometry(1,1,1)],new THREE.MeshLambertMaterial({color:0x2a2622}),true,CHUNK*2);
  W.beyond={g,cave,style}}
// продолжение рисуем, только когда рядом решётка (иначе его всё равно не видно)
function updateBeyond(){const B=W.beyond;if(!B)return;let d=99;for(const w of W.wins)d=Math.min(d,Math.hypot(w.cx-pl.x,w.cz-pl.z));W.winNear=d;B.g.visible=d<32}
