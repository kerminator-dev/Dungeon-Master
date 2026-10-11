'use strict';
// ---------- продолжение за решётками (подземелья) ----------
// Вокруг настоящего лабиринта — кольцо ненастоящих коридоров, построенных тем же кодом стен: та же кладка,
// своды и факелы, и всё уходит в темноту. Попасть туда нельзя: проёмы в наружной стене закрыты решёткой.
// На части уровней вместо коридоров — пещерные ходы того же размера: камень вместо кирпича, неровные
// стены и свод, светящиеся грибы. Рисуется, только когда рядом есть решётка.
const BEYOND_RING=3;   // ширина кольца, клеток
const CAVE_ROCK=['#6a645c','#5c5852','#78726a','#4e4a44','#625a50','#6e665a'];
// пещера: обгрызаем открытые поверхности стен и свода на 1–2 вокселя пятнами шума
function caveErode(vox,I,NX,NY,NZ){const solid=(x,y,z)=>x>=0&&z>=0&&y>=0&&x<NX&&z<NZ&&y<NY&&vox[I(x,y,z)]===1;
  for(let pass=0;pass<2;pass++){const rm=[];
    for(let x=0;x<NX;x++)for(let z=0;z<NZ;z++)for(let y=1;y<NY;y++){if(vox[I(x,y,z)]!==1)continue;
      if(solid(x+1,y,z)&&solid(x-1,y,z)&&solid(x,y,z+1)&&solid(x,y,z-1)&&solid(x,y-1,z)&&(y+1>=NY||solid(x,y+1,z)))continue;
      if(Noise.n2(x*.09+y*.2,z*.09-y*.17)+hash(x>>1,y,z>>1,pass)*.12>(pass?.28:.08))rm.push(I(x,y,z))}
    for(const k of rm)vox[k]=0}}

function buildBeyond(root,m){W.beyond=null;if(!TH.indoor||!W.wins.length)return;
  const RW=W,TH0=TH,rnd0=rnd,mR=BEYOND_RING,n=RW.n,N=n+2*mR,off=-mR*CS,ov=new THREE.Vector3(off,0,off);
  rnd=mulberry(game.seed*97+game.level*13+n);                   // свой поток: раскладка лабиринта не сдвигается
  const cave=rnd()<.5,g=new THREE.Group(),flames=[];g.position.copy(ov);root.add(g);
  try{const M=genGrid(N);
    if(cave)for(let i=1;i<N;i++)for(let j=0;j<N;j++){if(rnd()<.3)M.V[i][j]=0;if(rnd()<.3)M.Hh[j][i]=0}   // пещеры просторнее
    // напротив каждой решётки ход уходит прямо вдаль — видна глубина
    for(const w of RW.wins){if(w.d[0]){const J=(w.z0-WT)/CS+mR;if(w.d[0]<0)for(let k=0;k<mR;k++)M.V[k][J]=0;else for(let k=mR+n+1;k<=N;k++)M.V[k][J]=0}
      else{const I=(w.x0-WT)/CS+mR;if(w.d[1]<0)for(let k=0;k<mR;k++)M.Hh[I][k]=0;else for(let k=mR+n+1;k<=N;k++)M.Hh[I][k]=0}}
    W={cull:[],lights:[],tall:[],arches:[],wins:[],exitCell:{i:-99,j:-99},exitArch:{top:0}};gridWalls(M,N);
    const TW=W.TW,lo=mR*CS,hi=lo+RW.TW;W.b={x0:0,z0:0,x1:TW,z1:TW};
    for(let x=lo;x<hi;x++)for(let z=lo;z<hi;z++)W.tile[x*TW+z]=5;                      // здесь настоящий лабиринт
    buildOcc();
    W.segs=W.segs.filter(s=>{const a=warp(...s.a),b=warp(...s.b),mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2;return !(mx>lo-1&&mx<hi+1&&mz>lo-1&&mz<hi+1)});
    let mm=m;
    if(cave){TH=Object.assign({},TH0,{brick:CAVE_ROCK,brickVar:.2,odd:'#3a3834',slabK:.8,dmg:.9});W.erode=caveErode;
      const rt=tex('caverock',()=>mkStoneTex({cols:['#ffffff','#e6e6e6','#d0d0d0'],gap:'#9a9a9a',cells:3,seed:77,size:128,gapW:2}));
      mm=Object.assign({},m,{wall:new THREE.MeshPhongMaterial({map:rt,vertexColors:true,shininess:4,specular:0x0a0a0a,emissive:0x0e1a1c}),slab:new THREE.MeshPhongMaterial({map:rt,vertexColors:true,shininess:6,specular:0x0c0c0c,emissive:0x0c1618})})}
    buildWalls(g,mm);buildFloorCeil(g,mm);
    // свет: факелы на стенах коридоров или светящиеся грибы у подножия стен пещеры
    const hold=[],shrooms=[],spr=[],used=[];
    for(const fc of W.faces){if(fc.outer)continue;const L=fc.sg.len;
      for(let u=0;u<Math.max(1,Math.round(L/CS));u++){if(rnd()>(cave?.4:.22)||L<1.8)continue;const s=rr(.8,L-.8),f=faceAt(fc,s,0),x=f.x,z=f.z;
        if(x>lo-.6&&x<hi+.6&&z>lo-.6&&z<hi+.6||used.some(p=>Math.hypot(p[0]-x,p[1]-z)<(cave?3:4.5)))continue;used.push([x,z]);   // не внутри настоящего лабиринта
        if(cave){for(let k=ri(3,6);k>0;k--){const d=BD+rr(.05,.5),a=rr(-.5,.5),px=x+f.nx*d+f.nz*a,pz=z+f.nz*d-f.nx*a,s2=rr(.6,1.4);
            pushInst(shrooms,px,0,pz,rr(-.2,.2),rr(0,6),rr(-.2,.2),s2,s2*rr(.8,1.4),s2,new THREE.Color(pick(['#5af0d0','#6ad8ff','#a0ff70','#c08aff'])).multiplyScalar(rr(.7,1)),0)}
          spr.push([x+f.nx*(BD+.3),.35,z+f.nz*(BD+.3)])}
        else{pushInst(hold,x+f.nx*BD,1.85,z+f.nz*BD,0,Math.atan2(f.nx,f.nz),0,1,1,1,new THREE.Color(1,1,1),0);
          flames.push({x:x+f.nx*(BD+.2)+off,y:2.15,z:z+f.nz*(BD+.2)+off,bx:x+off,bz:z+off,nx:f.nx,nz:f.nz,base:1.85,kind:'torch'})}}}
    if(hold.length)instance(g,hold,[mergeParts([bx(.16,.26,.04,0,0,.02,'#2a2420'),cy(.035,.025,.42,6,0,.1,.13,'#4a3020',.45,0,0)])],new THREE.MeshLambertMaterial({vertexColors:true}),true,CHUNK*2);
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
  W.beyond={g,cave}}
// продолжение рисуем, только когда рядом решётка (иначе его всё равно не видно)
function updateBeyond(){const B=W.beyond;if(!B)return;let d=99;for(const w of W.wins)d=Math.min(d,Math.hypot(w.cx-pl.x,w.cz-pl.z));W.winNear=d;B.g.visible=d<32}
