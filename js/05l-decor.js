'use strict';
// ---------- theme details: doorways, painted walls, sand, water, wisps ----------
// each newer theme carries one or two features of its own on top of the shared maze, masonry and props.
// they are built right after the shared decor (buildDecor), before the props: doorway jambs stand in the
// passages and are stamped into the walkability map, so props, chests and the reach checks see them.
// everything else here is flat or out of reach (decals, water, drifts) and blocks nothing
function buildThemeDecor(root){W.td={water:null,ripples:[],falls:[],wisps:[]};
  if(TH.frames)buildFrames(root);
  if(TH.glyphs)buildGlyphs(root);
  if(TH.sand)buildSand(root);
  if(TH.water)buildWater(root);
  if(TH.graves)buildWisps(root)}

// is the masonry whole behind a flat thing hung on a wall face (w wide, from y0 to y1)? a dent, a pit or a knocked-out
// corner brick would leave it hanging over a hole
function faceSolid(fc,s,w,y0,y1){for(let u=-.45;u<=.45;u+=.15)for(let y=y0+.08;y<=y1-.05;y+=.18){const f=faceAt(fc,s+u*w*2,y);
  if(!W.wallSolid(f.x+f.nx*(BD-.1),y,f.z+f.nz*(BD-.1)))return false}return true}

// ---------- doorways in the passages between cells ----------
// every open passage through a wall line gets a frame on both faces of the wall: in the cistern a round arch of
// voussoirs on two pilasters, in the tomb a painted lintel on flat jambs.
// a frame spans the passage along local z; jambs are .16 m deep, so a 2 m passage keeps 1.7 m clear
const FRAME_D=.16;
function frameGeo(kind){const P=TH.brick,st=shade(P[0],1.08),dk=shade(P[0],.78),hw=CW/2,parts=[];
  if(kind==='arch'){const S=TH.H-.62,R=hw-FRAME_D/2;
    for(const s of [-1,1]){const z=s*(hw-FRAME_D/2);parts.push(bx(.4,.14,FRAME_D+.08,0,.07,z,dk),bx(.34,S-.24,FRAME_D,0,.14+(S-.24)/2,z,st),bx(.42,.1,FRAME_D+.06,0,S-.05,z,dk))}
    // voussoirs: wedge blocks round the semicircle, a key stone at the crown
    const N=11;for(let i=0;i<N;i++){const a=(i+.5)/N*Math.PI,x=Math.cos(a)*R,y=Math.sin(a)*R,k=i===(N>>1);
      parts.push(bx(.36,.2,Math.PI*R/N*(k?1.15:.94),0,S+y,x,k?shade(P[0],1.18):shade(pick(P),rr(.95,1.1)),-a+Math.PI/2,0,0))}}
  else{const T=TH.H-.42;
    for(const s of [-1,1]){const z=s*(hw-FRAME_D/2);parts.push(bx(.36,T,FRAME_D,0,T/2,z,st),bx(.38,.08,FRAME_D+.02,0,.04,z,dk));
      for(let y=.5;y<T-.2;y+=.42)parts.push(bx(.3,.06,.012,0,y,z-s*(FRAME_D/2+.004),pick(['#1e3a7a','#8a2418','#c8a040'])))}
    parts.push(bx(.4,.32,CW,0,T+.16,0,st),bx(.42,.05,CW+.04,0,T+.02,0,'#c8a040'),bx(.42,.05,CW+.04,0,T+.3,0,'#1e3a7a'));
    // a winged sun disk over the door, painted on both faces
    for(const e of [-1,1]){const x=e*.205;parts.push(cy(.08,.08,.012,12,x,T+.16,0,'#d8a838',0,0,Math.PI/2));
      for(const s of [-1,1])parts.push(bx(.012,.07,.34,x,T+.17,s*.27,'#2a4a9a'),bx(.012,.035,.26,x,T+.12,s*.24,'#8a2418'))}}
  return mergeParts(parts)}
function buildFrames(root){const n=W.n,M=W.M,K=WT,TW=W.TW,list=[],geo=frameGeo(TH.frames);W.frames=[];
  const wallT=(tx,tz)=>tx>=0&&tz>=0&&tx<TW&&tz<TW&&W.tile[tx*TW+tz]===1;
  const add=(cx,cz,alongX)=>{// alongX: the passage runs along x, the frame spans z
    for(const e of [-1,1]){const x=cx+(alongX?e*(K/2-.2):0),z=cz+(alongX?0:e*(K/2-.2));
      pushInst(list,x,0,z,0,alongX?0:Math.PI/2,0,1,1,1,new THREE.Color(1,1,1).multiplyScalar(rr(.9,1.05)),0);
      for(const s of [-1,1]){const px=x+(alongX?0:s*(CW/2-FRAME_D/2)),pz=z+(alongX?s*(CW/2-FRAME_D/2):0);
        occStamp([px-(alongX?.15:0),pz-(alongX?0:.15)],[px+(alongX?.15:0),pz+(alongX?0:.15)],FRAME_D/2+.02)}}
    W.frames.push({x:cx,z:cz})};
  for(let i=1;i<n;i++)for(let j=0;j<n;j++){if(M.V[i][j])continue;const x0=i*CS,z0=j*CS+K;
    if(wallT(x0,z0-1)&&wallT(x0,z0+K))add(x0+K/2,z0+K/2,true)}
  for(let i=0;i<n;i++)for(let j=1;j<n;j++){if(M.Hh[i][j])continue;const x0=i*CS+K,z0=j*CS;
    if(wallT(x0-1,z0)&&wallT(x0+K,z0))add(x0+K/2,z0+K/2,false)}
  instance(root,list,[geo],new THREE.MeshLambertMaterial({vertexColors:true,map:tex('prop',()=>mkBrickTex(77))}),true,CHUNK*2)}

// ---------- the tomb: painted panels on the walls ----------
// three panels in one atlas (a column of glyphs, another, a procession of two figures), drawn once
function mkGlyphTex(){const PW=128,PH=160,c=mkCanvas(PW*3,PH),x=c.getContext('2d'),r=mulberry(19),ink='#2a1c10',bl='#1e3a7a',rd='#8a2418',gd='#c89a38',gr='#3a6a4a';
  // a coat of plaster under the paint, so the panel reads as a painted surface on the bare sandstone
  x.fillStyle='rgba(232,214,176,.55)';x.fillRect(0,0,PW*3,PH);for(let i=1;i<3;i++)x.clearRect(PW*i-1,0,2,PH);
  const band=(ox)=>{const cols=[bl,gd,rd,gd];for(let i=0;i<8;i++){x.fillStyle=cols[i%4];x.fillRect(ox+i*PW/8,0,PW/8-1,7)}x.fillStyle=ink;x.fillRect(ox,8,PW,2);x.fillRect(ox,PH-10,PW,2);
    for(let i=0;i<8;i++){x.fillStyle=cols[(i+2)%4];x.fillRect(ox+i*PW/8,PH-7,PW/8-1,7)}};
  // glyphs, each in an 18 px cell
  const G={eye:(a,b)=>{x.strokeStyle=ink;x.lineWidth=2;x.beginPath();x.ellipse(a+9,b+8,7,3.5,0,0,7);x.stroke();x.fillStyle=bl;x.beginPath();x.arc(a+9,b+8,2.4,0,7);x.fill();
      x.beginPath();x.moveTo(a+9,b+11);x.lineTo(a+8,b+17);x.moveTo(a+13,b+11);x.quadraticCurveTo(a+16,b+16,a+12,b+17);x.stroke()},
    ankh:(a,b)=>{x.strokeStyle=gd;x.lineWidth=2.5;x.beginPath();x.ellipse(a+9,b+4,3,3.5,0,0,7);x.moveTo(a+9,b+8);x.lineTo(a+9,b+17);x.moveTo(a+4,b+9);x.lineTo(a+14,b+9);x.stroke()},
    bird:(a,b)=>{x.fillStyle=ink;x.beginPath();x.ellipse(a+9,b+10,6,3.5,-.2,0,7);x.fill();x.beginPath();x.arc(a+14,b+5,2.5,0,7);x.fill();x.fillRect(a+15,b+5,4,1.5);
      x.fillRect(a+7,b+13,1.5,4);x.fillRect(a+10,b+13,1.5,4);x.fillStyle=gr;x.beginPath();x.ellipse(a+8,b+10,3.5,2,-.2,0,7);x.fill()},
    water:(a,b)=>{x.strokeStyle=bl;x.lineWidth=2;for(const y of [5,10]){x.beginPath();for(let i=0;i<=6;i++)x.lineTo(a+2+i*2.4,b+y+(i%2?-2:2));x.stroke()}},
    reed:(a,b)=>{x.fillStyle=ink;x.fillRect(a+8,b+3,2,14);x.beginPath();x.ellipse(a+9,b+4,3,4,0,0,7);x.fill();x.fillStyle=gr;x.fillRect(a+5,b+10,2,6)},
    sun:(a,b)=>{x.fillStyle=rd;x.beginPath();x.arc(a+9,b+9,6,0,7);x.fill();x.strokeStyle=gd;x.lineWidth=1.5;x.stroke()},
    snake:(a,b)=>{x.strokeStyle=ink;x.lineWidth=2.5;x.beginPath();x.moveTo(a+2,b+14);x.bezierCurveTo(a+6,b+6,a+10,b+18,a+15,b+8);x.lineTo(a+16,b+4);x.stroke()},
    hand:(a,b)=>{x.fillStyle=rd;x.fillRect(a+2,b+7,13,5);x.fillRect(a+12,b+4,3,4);x.fillStyle=ink;x.fillRect(a+2,b+12,13,1)},
    loaf:(a,b)=>{x.fillStyle=gd;x.beginPath();x.arc(a+9,b+13,6,Math.PI,0);x.fill();x.fillStyle=ink;x.fillRect(a+3,b+13,12,1.5)},
    owl:(a,b)=>{x.fillStyle=ink;x.beginPath();x.ellipse(a+9,b+10,5,6.5,0,0,7);x.fill();x.fillStyle=gd;x.beginPath();x.arc(a+7,b+7,1.5,0,7);x.arc(a+11,b+7,1.5,0,7);x.fill()}};
  const keys=Object.keys(G);
  const columns=(ox,seed)=>{band(ox);for(let col=0;col<5;col++){const cx=ox+6+col*24;x.fillStyle=ink;x.fillRect(cx+21,14,1,PH-28);
      for(let row=0;row<7;row++)G[keys[Math.floor((r()+seed)*keys.length)%keys.length]](cx+1,16+row*19)}};
  // a figure in profile: wig, collar, kilt, one arm raised in offering
  const figure=(cx,skin,kilt,head)=>{x.fillStyle=skin;x.fillRect(cx-5,40,10,34);x.fillRect(cx-4,74,3,40);x.fillRect(cx+2,74,3,40);x.fillRect(cx-7,114,8,3);x.fillRect(cx+1,114,8,3);
    x.fillStyle=kilt;x.beginPath();x.moveTo(cx-7,72);x.lineTo(cx+8,72);x.lineTo(cx+11,96);x.lineTo(cx-7,96);x.fill();
    x.fillStyle=bl;x.fillRect(cx-7,40,15,5);x.fillStyle=gd;x.fillRect(cx-7,45,15,2);
    x.fillStyle=skin;x.fillRect(cx+4,44,16,3);x.fillRect(cx+18,32,3,14);x.fillRect(cx-8,46,3,22);
    if(head==='jackal'){x.fillStyle='#141418';x.fillRect(cx-5,22,10,15);x.beginPath();x.moveTo(cx+4,26);x.lineTo(cx+14,30);x.lineTo(cx+4,33);x.fill();
      x.beginPath();x.moveTo(cx-3,23);x.lineTo(cx-1,12);x.lineTo(cx+2,23);x.fill();x.fillStyle=gd;x.fillRect(cx+2,26,2,2)}
    else{x.fillStyle=skin;x.beginPath();x.ellipse(cx+2,30,6,7,0,0,7);x.fill();x.fillStyle='#141418';x.fillRect(cx-6,21,10,16);x.fillStyle='#fff';x.fillRect(cx+4,28,3,2);x.fillStyle=ink;x.fillRect(cx+5,28,1.5,2)}
    x.fillStyle=gd;x.fillRect(cx+17,26,5,6)};
  columns(0,.1);columns(PW,.55);
  band(PW*2);figure(PW*2+38,'#a85a34','#e8dcc0','jackal');figure(PW*2+84,'#b8683e','#e8dcc0','man');
  for(let i=0;i<4;i++){const a=PW*2+10+i*28;G[keys[(i*3)%keys.length]](a,124)}
  // age: rubbed off in patches, so the stone shows through
  x.globalCompositeOperation='destination-out';for(let i=0;i<60;i++){x.fillStyle=`rgba(0,0,0,${.2+r()*.5})`;x.beginPath();x.ellipse(r()*PW*3,r()*PH,2+r()*12,1+r()*6,r()*3,0,7);x.fill()}
  const t=new THREE.CanvasTexture(c);t.magFilter=THREE.NearestFilter;return t}
function buildGlyphs(root){const list=[],white=new THREE.Color(1,1,1);
  for(const fc of W.faces){if(fc.outer)continue;const L=fc.sg.len;
    for(let u=0;u<Math.max(1,Math.round(L/CS));u++){if(rnd()>.6||L<WT+1.4)continue;const s=rr(BD+.75,L-BD-.75);
      if(fc.spots.some(sp=>Math.abs(sp.s-s)<sp.ru+.75&&sp.y+sp.rv>.55&&sp.y-sp.rv<2.15))continue;
      if(!faceSolid(fc,s,1.12,.65,2.05))continue;const f=faceAt(fc,s,0);pushInst(list,f.x+f.nx*(BD+.008),1.35,f.z+f.nz*(BD+.008),0,Math.atan2(f.nx,f.nz),0,1.12,1.4,1,white.clone().multiplyScalar(rr(.8,1)),ri(0,2))}}
  const geos=[0,1,2].map(k=>{const g=new THREE.PlaneGeometry(1,1),uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setX(i,(k+uv.getX(i))/3);return g});
  instance(root,list,geos,new THREE.MeshLambertMaterial({map:tex('glyphs',mkGlyphTex),transparent:true,alphaTest:.2,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}),true,CHUNK*2)}

// ---------- sand: drifts along the walls; in the tomb it also trickles down from cracks in the vault ----------
function buildSand(root){const list=[],piles=[],out=!TH.indoor,cols=(out?TH.ground:['#b89460','#c8a46c','#a88654']).map(c=>new THREE.Color(c));
  for(const fc of W.faces){if(fc.outer)continue;const L=fc.sg.len;
    for(let u=0;u<Math.max(1,Math.round(L/CS))*(out?2:1);u++){if(rnd()>(out?.8:.5))continue;const s=rr(.4,L-.4),f=faceAt(fc,s,0),len=rr(.8,out?2.6:1.8),h=out?rr(.18,.42):rr(.08,.2),d=out?rr(.5,1):rr(.35,.7);
      pushInst(list,f.x+f.nx*(BD-.05),out?floorH(f.x+f.nx*BD,f.z+f.nz*BD)-.03:-.01,f.z+f.nz*(BD-.05),0,Math.atan2(f.nx,f.nz),0,len,h,d,pick(cols).clone().multiplyScalar(rr(.9,1.06)),0)}}
  const g=new THREE.SphereGeometry(.5,12,5,0,Math.PI*2,0,Math.PI/2);g.scale(1,2,2);
  instance(root,list,[g],new THREE.MeshLambertMaterial({map:tex('sand',()=>mkGroundTex(['#d8d8d8','#e8e8e8','#f4f4f4','#ffffff'],83)),vertexColors:false}),true,CHUNK*2);
  if(out)return;
  // falling sand: a thin stream of grains from the vault to a little cone on the floor
  const dot=tex('dot',()=>mkGlowTex([[0,'rgba(255,255,255,1)'],[.5,'rgba(255,255,255,.6)'],[1,'rgba(255,255,255,0)']],16,16));
  for(let k=0;k<Math.max(3,Math.round(W.n*W.n/14));k++){const i=ri(0,W.n-1),j=ri(0,W.n-1),c=warp(i+.5+rr(-.25,.25),j+.5+rr(-.25,.25)),x=c[0],z=c[1];
    if(blocked(x,z)||wallDist(x,z)<.5||Math.hypot(x-W.start.x,z-W.start.z)<3||W.td.falls.some(f=>Math.hypot(f.x-x,f.z-z)<CS*1.5))continue;
    const H=ceilH(x,z),N=40,pos=new Float32Array(N*3),sp=[];for(let q=0;q<N;q++){pos[q*3]=rr(-.03,.03);pos[q*3+1]=rr(0,H);pos[q*3+2]=rr(-.03,.03);sp.push(rr(2.2,3.2))}
    const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(pos,3));
    const pts=new THREE.Points(pg,new THREE.PointsMaterial({color:0xd8b880,size:.035,map:dot,transparent:true,depthWrite:false,opacity:.85}));pts.position.set(x,0,z);root.add(pts);
    pushInst(piles,x,0,z,0,rr(0,6),0,rr(.28,.4),rr(.12,.2),rr(.28,.4),new THREE.Color('#c8a46c').multiplyScalar(rr(.9,1.05)),0);
    W.td.falls.push({x,z,H,pts,sp})}
  if(piles.length)instance(root,piles,[new THREE.ConeGeometry(1,1,9).translate(0,.5,0)],new THREE.MeshLambertMaterial({vertexColors:true}),true,CHUNK*2)}

// ---------- the cistern: black water over the whole floor ----------
// a normal map drawn from noise scrolls across it: torch glints break up and wobble. ripples run out from where the
// player steps and where drips land (updateDrips)
function mkWaterNormals(){const s=128,r=mulberry(29),n=fbmTile(s,s,r,[32,16,8],[.5,.3,.2]);
  return toTex(pixels(s,s,(x,y)=>{const h=i=>n[((y+s)%s)*s+((i+s)%s)],hy=(j)=>n[((j+s)%s)*s+x],dx=(h(x+1)-h(x-1))*5,dy=(hy(y+1)-hy(y-1))*5;
    const l=Math.hypot(dx,dy,1);return [(-dx/l*.5+.5)*255,(-dy/l*.5+.5)*255,(1/l*.5+.5)*255]}),false)}
function buildWater(root){const R=BEYOND_RING*CS,ring=W.wins.length,x0=ring?-R:0,z0=ring?-R:0,x1=W.TW+(ring?R:0),z1=W.TW+(ring?R:0);
  const nm=tex('waternormals',mkWaterNormals);nm.repeat.set((x1-x0)/3,(z1-z0)/3);
  const m=new THREE.Mesh(new THREE.PlaneGeometry(x1-x0,z1-z0),new THREE.MeshPhongMaterial({color:0x0e1a1c,specular:0x7a9898,shininess:70,normalMap:nm,normalScale:new THREE.Vector2(.5,.5),
    transparent:true,opacity:.84,depthWrite:false}));
  m.rotation.x=-Math.PI/2;m.position.set((x0+x1)/2,TH.water,(z0+z1)/2);m.renderOrder=1;root.add(m);W.td.water=m;
  const ringG=new THREE.RingGeometry(.86,1,28);ringG.rotateX(-Math.PI/2);
  for(let k=0;k<6;k++){const q=new THREE.Mesh(ringG,new THREE.MeshBasicMaterial({color:0x9ab8c0,transparent:true,opacity:0,depthWrite:false}));q.visible=false;root.add(q);W.td.ripples.push({m:q,t:9})}}
// a ripple ring on the water from a step (or anything else that touches it)
function waterRipple(x,z,k=1){const T=W.td;if(!T||!T.water)return;const r=T.ripples.reduce((a,b)=>b.t>a.t?b:a);r.t=0;r.k=k;r.m.position.set(x,TH.water+.004,z);r.m.visible=true}

// ---------- the graveyard: will-o'-wisps drifting over the graves ----------
function buildWisps(root){const m=new THREE.SpriteMaterial({map:tex('wisp',()=>mkGlowTex([[0,'rgba(220,255,240,1)'],[.25,'rgba(140,230,255,.55)'],[1,'rgba(80,160,255,0)']])),
    blending:THREE.AdditiveBlending,depthWrite:false,transparent:true});
  for(let k=0;k<Math.max(4,Math.round(W.n*W.n/12));k++){const c=warp(ri(0,W.n-1)+.5,ri(0,W.n-1)+.5),s=new THREE.Sprite(m.clone());s.scale.set(.32,.32,1);root.add(s);
    W.td.wisps.push({s,x:c[0],z:c[1],ph:rr(0,100),vx:0,vz:0})}}

// ---------- every frame ----------
function updateThemeDecor(t,dt){const T=W.td;if(!T)return;
  if(T.water){const o=T.water.material.normalMap.offset;o.x=t*.012;o.y=t*.007}
  for(const r of T.ripples){if(r.t>=9)continue;r.t+=dt;const k=r.t/1.2;if(k>=1){r.m.visible=false;r.t=9;continue}const s=.08+k*.75*r.k;r.m.scale.set(s,1,s);r.m.material.opacity=.45*(1-k)}
  for(const f of T.falls){const a=f.pts.geometry.attributes.position.array;f.pts.visible=Math.hypot(f.x-pl.x,f.z-pl.z)<22;if(!f.pts.visible)continue;
    for(let q=0;q<f.sp.length;q++){a[q*3+1]-=f.sp[q]*dt;if(a[q*3+1]<0)a[q*3+1]+=f.H}f.pts.geometry.attributes.position.needsUpdate=true}
  // wisps wander slowly along the corridors, bob, and fade in and out; they shy away from the player
  for(const w of T.wisps){const d=Math.hypot(w.x-pl.x,w.z-pl.z),a=Noise.n2(w.ph+t*.05,3)*6.28;
    w.vx+=(Math.cos(a)*.35-w.vx)*dt;w.vz+=(Math.sin(a)*.35-w.vz)*dt;if(d<3){w.vx+=(w.x-pl.x)/d*dt*.8;w.vz+=(w.z-pl.z)/d*dt*.8}
    const nx=w.x+w.vx*dt,nz=w.z+w.vz*dt;if(wallDist(nx,nz)>.35){w.x=nx;w.z=nz}else{w.vx=-w.vx;w.vz=-w.vz}
    w.s.position.set(w.x,1+Math.sin(t*.8+w.ph)*.25+floorH(w.x,w.z),w.z);w.s.material.opacity=.55+.45*Math.sin(t*.6+w.ph);w.s.visible=d<45}}
