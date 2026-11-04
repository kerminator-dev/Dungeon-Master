'use strict';
// Autumn Ruins and Swamp, adapted from https://claude.ai/artifact/W6AqMxZrUMtbEhBxxiLaHo
// Scoped additions: the original themes and shared gameplay keep their own builders.
const SeasonMaps=(()=>{

// reeds: tall blades, brown cattail heads (alpha)
function mkReedTex(){const c=mkCanvas(64,128),x=c.getContext('2d'),r=mulberry(31);x.lineCap='round';
  for(let i=0;i<30;i++){const bx=6+r()*52,h=50+r()*76,lean=(r()-.5)*18;x.strokeStyle=['#6a7a3a','#7a8640','#56662e','#8a8a48'][Math.floor(r()*4)];x.lineWidth=1.4+r()*1.6;
    x.beginPath();x.moveTo(bx,128);x.quadraticCurveTo(bx+lean*.2,128-h*.6,bx+lean,128-h);x.stroke();
    if(r()<.3){x.fillStyle='#5a3a20';x.fillRect(bx+lean-2,128-h+2,4,13);x.fillStyle='#7a5430';x.fillRect(bx+lean-2,128-h+2,1.5,13)}}
  crisp(x,64,128,null);const t=toTex(c);t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;return t}
// a leaf seen from above (alpha): fallen leaves, lily pads, ferns take their colour from the instance
function mkLeafTex(kind){const c=mkCanvas(32,32),x=c.getContext('2d');x.fillStyle='#f0f0f0';
  if(kind==='pad'){x.beginPath();x.moveTo(16,16);x.arc(16,16,14,.25,Math.PI*2-.25);x.closePath();x.fill();x.strokeStyle='#b8b8b8';x.lineWidth=1;
    for(let a=.6;a<6;a+=.7){x.beginPath();x.moveTo(16,16);x.lineTo(16+Math.cos(a)*12,16+Math.sin(a)*12);x.stroke()}}
  else if(kind==='fern'){x.strokeStyle='#d0d0d0';x.lineWidth=1.5;x.beginPath();x.moveTo(16,31);x.quadraticCurveTo(15,14,18,1);x.stroke();
    for(let i=2;i<29;i+=2.6){const w=(1-Math.abs(i-14)/16)*11+1;x.beginPath();x.ellipse(16-w/2,31-i,w/2,1.6,-.3,0,7);x.fill();x.beginPath();x.ellipse(16+w/2,31-i,w/2,1.6,.3,0,7);x.fill()}}
  else{x.beginPath();x.moveTo(16,2);x.quadraticCurveTo(29,12,16,30);x.quadraticCurveTo(3,12,16,2);x.fill();x.strokeStyle='#a8a8a8';x.lineWidth=1;
    x.beginPath();x.moveTo(16,4);x.lineTo(16,29);x.stroke();for(let i=8;i<26;i+=5){x.beginPath();x.moveTo(16,i);x.lineTo(10,i-4);x.moveTo(16,i);x.lineTo(22,i-4);x.stroke()}}
  crisp(x,32,32,null);const t=toTex(c);t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;return t}

function recolorAtlas(t,P){const c=t.image,x=c.getContext('2d'),d=x.getImageData(0,0,c.width,c.height),a=d.data,PC=P.map(v=>v.map(rgb));
  for(let i=0;i<a.length;i+=4){if(!a[i+3])continue;const r=a[i],g=a[i+1],b=a[i+2];if(!(g>r*1.05&&g>b))continue;
    const v=(r+g+b)/3,k=v<46?0:v<63?1:v<83?2:v<104?3:4,px=(i/4)%c.width,q=PC[Math.floor(px/(c.width/4))%PC.length][k];a[i]=q[0];a[i+1]=q[1];a[i+2]=q[2]}
  x.putImageData(d,0,0);t.needsUpdate=true;return t}

const glowP=(p,k)=>{p[3]=k;return p};
Object.assign(PROPS,{

  // --- autumn ---
  pumpkins(){const parts=[];for(let i=0;i<ri(2,3);i++){const r=i?rr(.12,.17):rr(.2,.26),a=rr(0,6.3),d=i?rr(.25,.35):0,col=pick(['#d86a1a','#e07a20','#c85a18','#d8a030']),x=Math.cos(a)*d,z=Math.sin(a)*d;
      const g=new THREE.SphereGeometry(1,12,8),p=g.attributes.position;for(let k=0;k<p.count;k++){const ang=Math.atan2(p.getZ(k),p.getX(k)),f=1-.08*Math.abs(Math.sin(ang*4));p.setXYZ(k,p.getX(k)*f,p.getY(k),p.getZ(k)*f)}
      parts.push([g,col,_m4(x,r*.72,z,0,rr(0,6),0,r,r*.75,r)],cy(.015,.025,.07,5,x,r*1.45,z,'#4a5a24',.2,0,.1))}
    return {parts,w:.8,d:.8,h:.5,round:1,soft:1}},
  hay(){const s='#c8a858',parts=[[new THREE.CylinderGeometry(.42,.42,.9,12),s,_m4(0,.42,0,0,0,Math.PI/2)]];
    for(const x of [-.25,.25])parts.push([new THREE.TorusGeometry(.425,.012,4,16),'#8a6a30',_m4(x,.42,0,0,Math.PI/2,0)]);
    parts.push(cy(.36,.36,.02,12,.455,.42,0,shade(s,1.12),0,0,Math.PI/2),cy(.36,.36,.02,12,-.455,.42,0,shade(s,1.12),0,0,Math.PI/2));
    return {parts,w:.92,d:.86,h:.84,soft:1}},
  basket(){const w='#8a6a3a',parts=[lathe([[0,0],[.18,0],[.24,.26],[.25,.28],[0,.28]],12,w)];
    for(let y=.05;y<.27;y+=.06)parts.push([new THREE.TorusGeometry(.2+y*.2,.008,4,14),shade(w,.8),_m4(0,y,0,Math.PI/2,0,0)]);
    for(let i=0;i<7;i++){const a=rr(0,6.3),d=rr(0,.13);parts.push([new THREE.SphereGeometry(.055,7,5),pick(['#b8281a','#c83a20','#d8a030']),_m4(Math.cos(a)*d,.29,Math.sin(a)*d)])}
    parts.push([new THREE.TorusGeometry(.24,.012,4,14,Math.PI),w,_m4(0,.28,0)]);return {parts,w:.52,d:.52,h:.55,round:1,soft:1}},
  scarecrow(){const wd='#5a4028',coat=pick(['#5a4a3a','#4a3a4a','#6a4a2a']),parts=[cy(.04,.05,2,6,0,1,0,wd),cy(.03,.03,1.3,6,0,1.45,0,wd,0,0,Math.PI/2)];
    parts.push(bx(.5,.75,.24,0,1.2,0,coat),bx(.22,.5,.2,-.38,1.42,0,coat,0,0,.2),bx(.22,.5,.2,.38,1.42,0,coat,0,0,-.2),[new THREE.SphereGeometry(.17,9,7),'#c8a868',_m4(0,1.78,0)]);
    parts.push(cy(.3,.3,.02,10,0,1.9,0,'#3a2e22'),[new THREE.ConeGeometry(.15,.32,8),'#3a2e22',_m4(0,2.06,0,.08,0,.06)],bx(.04,.03,.01,-.06,1.8,.16,'#1a1410'),bx(.04,.03,.01,.06,1.8,.16,'#1a1410'));
    for(const x of [-.6,.6])parts.push(bx(.05,.14,.08,x,1.22,0,'#c8a858'));return {parts,w:.7,d:.4,h:2.2,tall:1}},
  leafpile(){const parts=[];for(let i=0;i<ri(3,5);i++){const r=rr(.18,.32),a=rr(0,6.3),d=rr(0,.3);
      parts.push([new THREE.SphereGeometry(r,8,4,0,Math.PI*2,0,Math.PI/2),pick(['#a8401c','#c86a22','#8a2a18','#d89030','#7a4a20']),_m4(Math.cos(a)*d,0,Math.sin(a)*d,0,0,0,1.3,.5,1.1)])}
    return {parts,w:.9,d:.9,h:.2,round:1,soft:1}},
  // --- swamp ---
  stump(){const b='#4a3a28',parts=[cy(.22,.28,.4,8,0,.2,0,b),cy(.2,.2,.01,8,0,.405,0,'#8a7050')];
    for(let i=0;i<4;i++){const a=i*1.57+rr(-.3,.3);parts.push(cy(.04,.08,.4,5,Math.cos(a)*.28,.08,Math.sin(a)*.28,b,Math.sin(a)*1.1,0,-Math.cos(a)*1.1))}
    parts.push([new THREE.SphereGeometry(.16,7,4,0,Math.PI*2,0,Math.PI/2),'#3e4c26',_m4(.05,.4,-.03,0,0,0,1,.3,.8)]);
    for(let i=0;i<3;i++)parts.push(glowP(cy(.002,.006,.06,4,rr(-.1,.1),.44,rr(-.1,.1),'#c8d8a0'),.3),[new THREE.SphereGeometry(.025,6,3,0,Math.PI*2,0,Math.PI/2),'#d8c8a0',_m4(rr(-.12,.12),.47,rr(-.12,.12))]);
    return {parts,w:.7,d:.7,h:.45,round:1,soft:1}},
  boat(){const wd=pick(['#4a3a28','#3e3224']),parts=[];
    for(const s of [-1,1])parts.push(bx(1.7,.28,.05,0,.18,s*.36,wd,s*.35,0,0),bx(1.6,.05,.05,0,.33,s*.42,shade(wd,.8)));
    parts.push(bx(1.6,.05,.62,0,.04,0,shade(wd,.85)),bx(.06,.3,.7,.82,.18,0,wd),bx(.06,.3,.7,-.82,.18,0,wd),bx(.24,.04,.76,.2,.3,0,wd),bx(1.4,.03,.1,0,.08,.05,shade(wd,.7),0,.4,0));
    parts.push(bx(1.2,.03,.06,0,.08,0,'#3a4a24'));return {parts,w:1.8,d:.9,h:.36,soft:1}},
  swamplamp(){const wd='#3a2e20',ir='#24221e',parts=[cy(.03,.05,1.9,5,0,.95,0,wd,0,0,.06),cy(.025,.025,.55,5,.2,1.86,0,wd,0,0,1.2)];
    parts.push(cy(.004,.004,.2,4,.42,1.72,0,ir),bx(.14,.03,.14,.42,1.6,0,ir),glowP(bx(.11,.18,.11,.42,1.5,0,'#ffb040'),.95),bx(.15,.03,.15,.42,1.4,0,ir));
    return {parts,w:.3,d:.3,h:2,tall:1,light:1,lightY:1.5}},
  reeds(){const parts=[];for(let i=0;i<14;i++){const a=rr(0,6.3),d=rr(0,.3),h=rr(.7,1.5),x=Math.cos(a)*d,z=Math.sin(a)*d,t=rr(-.15,.15);
      parts.push(bx(.02,h,.02,x,h/2,z,pick(['#6a7a3a','#7a8640','#56662e']),t,0,rr(-.15,.15)));if(rnd()<.5)parts.push(cy(.03,.03,.16,6,x+t*h*.0,h,z+t*h,'#5a3a20'))}
    return {parts,w:.6,d:.6,h:1.4,round:1,soft:1}},
});


function nmParticles(root,o){const n=o.n,R=o.R||12,pos=new Float32Array(n*3),col=new Float32Array(n*3),ph=new Float32Array(n),cp={x:W.start.x,z:W.start.z};
  for(let i=0;i<n;i++){pos[i*3]=cp.x+rr(-R,R);pos[i*3+1]=rr(o.y0,o.y1);pos[i*3+2]=cp.z+rr(-R,R);ph[i]=rr(0,100);const c=new THREE.Color(pick(o.cols));c.toArray(col,i*3)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('color',new THREE.BufferAttribute(col,3));
  const m=new THREE.PointsMaterial({size:o.size,map:o.map,vertexColors:true,transparent:true,depthWrite:false,alphaTest:o.add?0:.4,opacity:o.op||1,
    blending:o.add?THREE.AdditiveBlending:THREE.NormalBlending});
  const pts=new THREE.Points(g,m);pts.frustumCulled=false;root.add(pts);
  W.nm.pts.push({update(t,dt){const a=pos,c=camera.position;
    for(let i=0;i<n;i++){const k=i*3,f=ph[i];
      if(o.fall){a[k+1]-=dt*(.55+(f%1)*.5);a[k]+=Math.sin(t*1.4+f)*dt*.6+dt*.35;a[k+2]+=Math.cos(t*1.1+f)*dt*.45;if(a[k+1]<floorH(a[k],a[k+2]))a[k+1]+=o.y1-o.y0}
      else{a[k]+=Math.sin(t*.5+f)*dt*.35;a[k+1]+=Math.sin(t*.8+f*1.7)*dt*.18;a[k+2]+=Math.cos(t*.45+f)*dt*.35;if(a[k+1]<o.y0)a[k+1]=o.y0;if(a[k+1]>o.y1)a[k+1]=o.y1}
      a[k]-=2*R*Math.floor((a[k]-c.x+R)/(2*R));a[k+2]-=2*R*Math.floor((a[k+2]-c.z+R)/(2*R))}
    g.attributes.position.needsUpdate=true;if(o.blink)m.opacity=(o.op||1)*(.7+.3*Math.sin(t*2.3))}});return pts}
// autumn: a carpet of fallen leaves, thickest along the walls, and leaves drifting down
function buildLeaves(root){const list=[],C=TH.ivy.concat(['#c8a040','#7a4a20','#d89030']).map(c=>new THREE.Color(c));
  const leaf=(x,z)=>{const s=rr(.12,.22);pushInst(list,x,floorH(x,z)+.012+rr(0,.01),z,-Math.PI/2+rr(-.2,.2),0,rr(0,6.3),s,s,1,pick(C).clone().multiplyScalar(rr(.75,1.1)),0)};
  for(const fc of W.faces){if(fc.outer)continue;const L=fc.sg.len;for(let s=.2;s<L-.2;s+=rr(.05,.16)){const f=faceAt(fc,s),d=BD+Math.pow(rnd(),2)*.9;leaf(f.x+f.nx*d,f.z+f.nz*d)}}
  const b=W.b;for(let i=0;i<W.n*W.n*30;i++){const x=rr(b.x0,b.x1),z=rr(b.z0,b.z1);if(wallDist(x,z)>.05)leaf(x,z)}
  instance(root,list,[new THREE.PlaneGeometry(1,1)],new THREE.MeshLambertMaterial({map:tex('leafdecal',()=>mkLeafTex('leaf')),alphaTest:.5,side:THREE.DoubleSide}));
  nmParticles(root,{n:260,R:12,y0:0,y1:9,size:.2,cols:TH.ivy.concat(['#d89030','#c8a040']),map:tex('leafdecal',()=>mkLeafTex('leaf')),fall:1})}
// the swamp: lily pads on the water, reed beds along the walls, fireflies and wisps
function buildSwamp(root){const pads=[],reeds=[],W0=TH.water||0;
  const b=W.b;for(let i=0;i<W.n*W.n*9;i++){const x=rr(b.x0,b.x1),z=rr(b.z0,b.z1);if(wallDist(x,z)<.3||floorH(x,z)>W0-.01)continue;
    const n=rnd()<.4?ri(2,5):1;for(let k=0;k<n;k++){const px=x+rr(-.4,.4),pz=z+rr(-.4,.4),s=rr(.22,.42);
      pushInst(pads,px,W0+.012+k*.002,pz,-Math.PI/2,0,rr(0,6.3),s,s,1,new THREE.Color(pick(['#3a6a2a','#4a7a30','#2e5a24','#5a7a34'])).multiplyScalar(rr(.8,1.1)),0)}}
  instance(root,pads,[new THREE.PlaneGeometry(1,1)],new THREE.MeshLambertMaterial({map:tex('pad',()=>mkLeafTex('pad')),alphaTest:.5,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2}));
  for(const fc of W.faces){if(fc.outer)continue;const L=fc.sg.len;for(let s=.3;s<L-.3;s+=rr(.3,.8))if(rnd()<.45){const f=faceAt(fc,s),d=BD+rr(.05,.35),x=f.x+f.nx*d,z=f.z+f.nz*d,sz=rr(.7,1.3);
    pushInst(reeds,x,floorH(x,z)-.05,z,0,rr(0,6.3),0,sz*.6,sz,sz*.6,new THREE.Color(1,1,1).multiplyScalar(rr(.75,1)),0)}}
  const rg=crossGeo();rg.scale(1,1.6,1);
  instance(root,reeds,[rg],new THREE.MeshLambertMaterial({map:tex('reeds',mkReedTex),alphaTest:.5,side:THREE.DoubleSide}));
  buildWisps(root);
  nmParticles(root,{n:140,R:11,y0:.3,y1:2.6,size:.09,cols:['#d8ff70','#b8ff60','#f0ff90'],map:tex('dot',()=>mkGlowTex([[0,'rgba(255,255,255,1)'],[.5,'rgba(255,255,255,.6)'],[1,'rgba(255,255,255,0)']],16,16)),add:1,blink:1})}

function farPropMat(){if(W.farProp)return W.farProp;const m=new THREE.MeshLambertMaterial({vertexColors:true,map:tex('prop',()=>mkBrickTex(77))});
  m.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute float emit;varying float vEmit;').replace('#include <begin_vertex>','#include <begin_vertex>\nvEmit=emit;');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying float vEmit;').replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vColor.rgb*vEmit;')};
  return W.farProp=m}

function mkVineTex(){const c=mkCanvas(32,128),x=c.getContext('2d'),r=mulberry(37);x.lineCap='round';
  for(let v=0;v<3;v++){let px=6+v*10+r()*4;x.strokeStyle=v%2?'#4a5a28':'#3e4e22';x.lineWidth=2;x.beginPath();x.moveTo(px,0);
    for(let y=0;y<=128;y+=8){px+=(r()-.5)*4;x.lineTo(px,y)}x.stroke();
    for(let y=4;y<124;y+=r()*9+5){const s=2.5+r()*3,sd=r()<.5?-1:1;x.fillStyle=['#2e5a1c','#3e6e22','#4e7e2a','#5a8a30'][Math.floor(r()*4)];
      x.beginPath();x.ellipse(px+sd*s*.9,y,s,s*.55,sd*.6,0,7);x.fill()}}
  crisp(x,32,128,null);const t=toTex(c);t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;return t}


// and drawn instanced. none of these blocks the way: they are flat on a wall or low on the floor
function dressGeos(set){return set.map(([f])=>[0,1,2].map(()=>mergeParts(f())))}
// on the walls: o.y = [lowest, highest] centre height, o.w = width, o.light = [height of the flame, kind]
function dressWalls(root,set,dens){const G=dressGeos(set),list=[],sum=set.reduce((s,e)=>s+e[1],0),white=new THREE.Color(1,1,1);
  const pickI=()=>{let r=rnd()*sum;for(let i=0;i<set.length;i++){r-=set[i][1];if(r<=0)return i}return 0};
  for(const fc of W.faces){if(fc.outer)continue;const L=fc.sg.len;for(let u=0;u<Math.max(1,Math.round(L/CS))*4;u++){if(rnd()>dens||L<WT+1)continue;
    const i=pickI(),o=set[i][2]||{},w=o.w||.6,s=rr(BD+w/2+.2,L-BD-w/2-.2),y=rr(...(o.y||[1.2,1.8])),f=faceAt(fc,s),bx0=f.x+f.nx*BD,bz0=f.z+f.nz*BD;
    if(fc.spots.some(sp=>Math.abs(sp.s-s)<sp.ru+w/2+.1))continue;
    if(o.floor){if(!faceSolid(fc,s,w,.1,o.h||2))continue}else if(!faceSolid(fc,s,w,y-(o.hh||.35),y+(o.hh||.35)))continue;
    if(W.tall.concat(W.posts||[]).some(t=>Math.hypot(t.x-bx0,t.z-bz0)<(t.r||.6)+w/2))continue;
    if(Math.hypot(bx0-W.start.x,bz0-W.start.z)<1.2)continue;
    const yy=o.floor?floorH(bx0+f.nx*.3,bz0+f.nz*.3)-.01:y,yaw=Math.atan2(f.nx,f.nz);
    pushInst(list,f.x+f.nx*(BD+(o.off||.02)),yy,f.z+f.nz*(BD+(o.off||.02)),0,yaw,0,1,1,1,white.clone().multiplyScalar(rr(.85,1.05)),i*3+ri(0,2));W.tall.push({x:bx0,z:bz0,r:w/2+.2});
    if(o.light){const [ly,kind,lz]=o.light;W.lights.push({x:bx0+f.nx*(.02+(lz||.25)),y:yy+ly,z:bz0+f.nz*(.02+(lz||.25)),base:yy+ly-.2,kind:kind||'cluster',nx:f.nx,nz:f.nz})}}}
  instance(root,list,G.flat(),propMat(),true,CHUNK*2)}
// on the floor: small things anywhere off the walls but out of the middle of the way, n per cell
function dressFloor(root,set,n,near=[.08,.8]){const G=dressGeos(set),list=[],sum=set.reduce((s,e)=>s+e[1],0),white=new THREE.Color(1,1,1),b=W.b;
  const pickI=()=>{let r=rnd()*sum;for(let i=0;i<set.length;i++){r-=set[i][1];if(r<=0)return i}return 0};
  for(let k=0;k<W.n*W.n*n;k++){const x=rr(b.x0,b.x1),z=rr(b.z0,b.z1),d=wallDist(x,z);if(d<near[0]||d>near[1]||blocked(x,z))continue;
    if(Math.hypot(x-W.start.x,z-W.start.z)<1.2||(W.placed||[]).some(p=>Math.hypot(p.x-x,p.z-z)<p.r+.2))continue;
    const i=pickI(),o=set[i][2]||{};pushInst(list,x,(TH.water&&o.float?TH.water:floorH(x,z))-.005,z,0,rr(0,6.3),0,1,1,1,white.clone().multiplyScalar(rr(.8,1.05)),i*3+ri(0,2));
    if(o.light&&rnd()<o.light[2]){W.lights.push({x,y:floorH(x,z)+o.light[0],z,base:floorH(x,z)+o.light[0]-.15,kind:o.light[1],nx:0,nz:0})}}
  instance(root,list,G.flat(),propMat(),true,CHUNK*2)}
// the orientation of a passage at a frame: does it run along x (walls to its north and south)?

function outskirts(root,m,set,n,r0,r1){const gm=root.children.find(c=>c.material===m.ground);if(!gm)return;const gh=planeH(gm.geometry),G=dressGeos(set),list=[],sum=set.reduce((s,e)=>s+e[1],0);
  const b=W.b,cx=(b.x0+b.x1)/2,cz=(b.z0+b.z1)/2,half=(b.x1-b.x0)/2,foot=W.skyFoot||[],white=new THREE.Color(1,1,1),top=G.flat().map(g=>(g.computeBoundingBox(),g.boundingBox.max.y));
  for(let k=0;k<n;k++){let r=rnd()*sum,i=0;for(;i<set.length-1;i++){r-=set[i][1];if(r<=0)break}const o=set[i][2]||{};
    const a=rr(0,6.283),e=half/Math.max(Math.abs(Math.cos(a)),Math.abs(Math.sin(a)))+rr(r0,r1),x=cx+Math.cos(a)*e,z=cz+Math.sin(a)*e;
    if(foot.some(f=>Math.hypot(f.x-x,f.z-z)<f.r+4))continue;const s=rr(...(o.s||[.9,1.15])),v=ri(0,2),y=gh(x,z)-.05;
    if(y+s*top[i*3+v]<WALL_MIN+.3)continue;   // its top under the lowest wall top: no eye in the maze sees it over the wall
    pushInst(list,x,y,z,0,o.face?Math.atan2(cx-x,cz-z):rr(0,6.3),0,s,s,s,white.clone().multiplyScalar(rr(.85,1.05)),i*3+v)}
  const mat=propMat().clone();mat.onBeforeCompile=propMat().onBeforeCompile;instance(root,list,G.flat(),mat,false);return gh}

// ---------- autumn: a farmstead in ruins at harvest time ----------
const STRAW='#c8a858',AUT=['#a8401c','#c86a22','#8a2a18','#d89030','#7a4a20'];
const AUT_HANG=[
  // bundles of herbs and garlic drying on a peg
  [()=>{const P=[cy(.012,.012,.1,4,0,.05,.05,'#3a2a1a',Math.PI/2,0,0),bx(.3,.02,.02,0,0,.06,'#5a4028')];for(let i=0;i<4;i++){const x=-.11+i*.075;P.push(cy(.004,.004,.12,3,x,-.07,.07,'#6a5a3a'));
    if(i%2)P.push([new THREE.SphereGeometry(.045,7,5),'#e0d8c8',_m4(x,-.16,.07,0,0,0,1,1.1,1)]);else P.push([new THREE.ConeGeometry(.05,.2,6),pick(['#5a7a30','#6a7a3a','#7a6a3a']),_m4(x,-.2,.07,Math.PI,0,0)])}return P},3,{y:[1.5,1.9],w:.4}],
  [()=>{const P=[cy(.012,.012,.08,4,0,.04,.04,'#3a2a1a',Math.PI/2,0,0)];for(let i=0;i<5;i++){const a=(i-2)*.25;P.push([new THREE.CylinderGeometry(.035,.03,.22,7),pick(['#e0b030','#d8a028','#c89020']),_m4(Math.sin(a)*.12,-.14,.07,0,0,a)],
    [new THREE.ConeGeometry(.04,.14,5),'#c8b880',_m4(Math.sin(a)*.03,-.02,.06,0,0,a+3.1)])}return P},2.5,{y:[1.5,1.9],w:.35}],
  [()=>{const P=[[new THREE.TorusGeometry(.22,.05,5,14),'#6a4a2a',_m4(0,0,.05)]];for(let i=0;i<14;i++){const a=i/14*6.283;P.push([new THREE.IcosahedronGeometry(.06,0),pick(AUT),_m4(Math.cos(a)*.22,Math.sin(a)*.22,.08,rr(0,6),rr(0,6),0,1,.5,1)])}
    P.push([new THREE.SphereGeometry(.04,6,4),'#b8281a',_m4(.12,-.18,.1)],[new THREE.SphereGeometry(.04,6,4),'#b8281a',_m4(.18,-.13,.1)]);return P},2,{y:[1.5,1.9],w:.5}],
  [()=>[[new THREE.TorusGeometry(.08,.016,4,10,Math.PI*1.4),'#5a5a5e',_m4(0,0,.03,0,0,-.7*Math.PI)],cy(.01,.01,.06,4,0,.07,.0,'#2a2a2a',Math.PI/2,0,0)],1.5,{y:[1.6,1.9],w:.2}],
  [()=>[bx(.04,.04,.34,0,0,.17,'#2a2826'),bx(.12,.16,.02,0,0,.01,'#2a2826'),cy(.004,.004,.12,4,0,-.06,.32,'#2a2826'),bx(.14,.03,.14,0,-.12,.32,'#2a2826'),glowP(cy(.055,.06,.15,8,0,-.21,.32,'#ffb040'),.95),bx(.15,.03,.15,0,-.3,.32,'#2a2826')],1.6,{y:[1.8,2],w:.3,light:[-.21,'cluster',.32]}],
  // a shutter hanging by one hinge
  [()=>{const P=[];for(let i=0;i<4;i++)P.push(bx(.13,.8,.03,-.2+i*.135,0,.03,pick(['#5a6a7a','#4a5a6a','#6a5a48']),0,0,0));P.push(bx(.56,.06,.04,0,.25,.05,'#4a3a2a'),bx(.56,.06,.04,0,-.25,.05,'#4a3a2a'));return xform(P,_m4(0,0,0,0,0,.18))},1,{y:[1.3,1.6],w:.7,hh:.5}],
];
const AUT_LEAN=[
  [()=>[cy(.02,.022,1.6,5,0,.8,.25,'#7a5a38',-.16,0,0),bx(.34,.04,.04,0,1.58,.0,'#4a4a4e',-.16,0,0),...[-.14,-.05,.05,.14].map(x=>cy(.008,.006,.24,4,x,1.7,-.02,'#4a4a4e',-.16,0,0))],2,{floor:1,w:.4,h:2}],
  [()=>[cy(.02,.022,1.6,5,0,.8,.22,'#7a5a38',-.14,0,0),bx(.4,.03,.03,0,1.6,.0,'#5a3e26'),...[-.18,-.09,0,.09,.18].map(x=>cy(.006,.006,.1,4,x,1.55,.02,'#5a3e26'))],2,{floor:1,w:.45,h:2}],
  [()=>[cy(.02,.022,1.5,5,0,.75,.22,'#7a5a38',-.15,0,0),[new THREE.TorusGeometry(.42,.02,3,12,Math.PI*.55),'#8a8a90',_m4(.0,1.5,.0,0,0,1.4)]],1.5,{floor:1,w:.6,h:2}],
  [()=>[cy(.02,.02,1.3,5,0,.85,.2,'#8a6a40',-.12,0,0),[new THREE.ConeGeometry(.12,.3,8),STRAW,_m4(0,.15,.32,0,0,0,1.3,1,.6)]],2,{floor:1,w:.35,h:1.6}],
  [()=>{const P=[];for(const x of [-.2,.2])P.push(bx(.06,2.2,.06,x,1.06,.28,'#7a5a38',-.25,0,0));for(let i=0;i<6;i++){const y=.25+i*.33;P.push(bx(.42,.04,.05,0,y,.28+(1.06-y)*Math.tan(.25),'#6a4a2e'))}return P},1.2,{floor:1,w:.55,h:2.3}],
];
const AUT_FLOOR=[
  [()=>{const P=[];for(let i=0;i<ri(2,5);i++){const a=rr(0,6.3),d=rr(0,.2);P.push([new THREE.SphereGeometry(.045,7,5),pick(['#b8281a','#c83a20','#d8a030','#8a1a14']),_m4(Math.cos(a)*d,.04,Math.sin(a)*d)])}return P},3],
  [()=>{const P=[];for(let i=0;i<ri(3,6);i++){const a=rr(0,6.3),d=rr(0,.16),h=rr(.04,.1),r=rr(.03,.06);P.push(cy(r*.3,r*.35,h,5,Math.cos(a)*d,h/2,Math.sin(a)*d,'#e0d4b8'),[new THREE.SphereGeometry(r,8,4,0,Math.PI*2,0,Math.PI/2),pick(['#a8582a','#8a4a22','#c8a060']),_m4(Math.cos(a)*d,h,Math.sin(a)*d,0,0,0,1,.6,1)])}return P},2.5],
  [()=>{const P=[cy(.025,.035,1.1,5,0,.03,0,'#4a3424',0,0,Math.PI/2)];for(let i=0;i<4;i++){const x=rr(-.4,.4);P.push(cy(.01,.015,.35,4,x,.06,.12*(i%2?1:-1),'#4a3424',Math.PI/2*(i%2?1:-1)*.7,0,0),[new THREE.IcosahedronGeometry(.08,0),pick(AUT),_m4(x,.08,.28*(i%2?1:-1),0,0,0,1.3,.4,1)])}return P},2],
  [()=>{const g=new THREE.SphereGeometry(1,10,7),p=g.attributes.position;for(let k=0;k<p.count;k++){const a=Math.atan2(p.getZ(k),p.getX(k)),f=1-.08*Math.abs(Math.sin(a*4));p.setXYZ(k,p.getX(k)*f,p.getY(k),p.getZ(k)*f)}
    return [[g,pick(['#d86a1a','#e08020','#c85a18']),_m4(0,.09,0,0,0,0,.13,.1,.13)],cy(.01,.015,.05,4,0,.2,0,'#4a5a24')]},1.5],
  [()=>{const P=[];for(let i=0;i<ri(6,10);i++){const a=rr(0,6.3),d=rr(0,.2);P.push([new THREE.SphereGeometry(.018,5,4),'#8a5a2a',_m4(Math.cos(a)*d,.018,Math.sin(a)*d,0,0,0,1,1.3,1)],[new THREE.SphereGeometry(.02,5,3,0,Math.PI*2,0,Math.PI/2),'#5a3a1a',_m4(Math.cos(a)*d,.03,Math.sin(a)*d)])}return P},1.5],
];
const AUT_OUT=[
  [()=>[[new THREE.CylinderGeometry(.75,.75,1.2,14),STRAW,_m4(0,.75,0,0,0,Math.PI/2)],cy(.68,.68,.02,14,.61,.75,0,shade(STRAW,1.15),0,0,Math.PI/2),cy(.68,.68,.02,14,-.61,.75,0,shade(STRAW,1.15),0,0,Math.PI/2)],5],
  [()=>[[new THREE.ConeGeometry(1.6,3.2,10),STRAW,_m4(0,1.5,0)],[new THREE.SphereGeometry(1.6,10,4,0,Math.PI*2,0,Math.PI/2),shade(STRAW,.9),_m4(0,0,0,0,0,0,1,.3,1)],cy(.03,.03,1,4,0,3.3,0,'#4a3424')],3],
  [()=>{const P=[];for(let i=0;i<5;i++)P.push(cy(.05,.06,1.1,5,i*1.2-2.4,.55,0,'#5a4028',0,0,rr(-.1,.1)));for(const y of [.45,.85])P.push(bx(4.9,.07,.05,0,y,0,'#6a4a2e',0,0,rr(-.03,.03)));return P},5,{s:[.9,1.1]}],
  [()=>PROPS.scarecrow().parts,1.5],
  [()=>{const P=[];for(let i=0;i<ri(4,8);i++){const a=rr(0,6.3),d=rr(0,1.4),r=rr(.18,.32);P.push([new THREE.SphereGeometry(r,10,6),pick(['#d86a1a','#e07a20','#c85a18']),_m4(Math.cos(a)*d,r*.7,Math.sin(a)*d,0,0,0,1,.75,1)])}
    for(let i=0;i<6;i++)P.push([new THREE.IcosahedronGeometry(.25,0),'#4a5a28',_m4(rr(-1.3,1.3),.08,rr(-1.3,1.3),0,0,0,1.4,.3,1)]);return P},3],
  [()=>[cy(.35,.45,1.8,7,0,.9,0,'#5a4030',0,0,0),cy(.25,.35,4,6,0,.35,0,'#4a3424',0,0,Math.PI/2.1),[new THREE.IcosahedronGeometry(1.3,0),pick(AUT),_m4(0,2.2,0)]],1.2],
];
Object.assign(PROPS,{
  well(){const st=pick(['#8a8070','#7a7466']),wd='#5a4028',parts=[];for(let i=0;i<12;i++){const a=i/12*6.283;parts.push(bx(.32,.7,.2,Math.cos(a)*.55,.35,Math.sin(a)*.55,shade(st,rr(.85,1.1)),0,-a,0))}
    parts.push(glowP(cy(.45,.45,.01,12,0,.4,0,'#1a2a2a'),.05));for(const s of [-1,1])parts.push(bx(.1,1.5,.1,s*.62,1.1,0,wd));
    parts.push(cy(.08,.08,1.3,8,0,1.6,0,wd,0,0,Math.PI/2),[new THREE.ConeGeometry(1.05,.6,4),'#6a3a28',_m4(0,2.15,0,0,Math.PI/4,0,1,1,.65)],cy(.004,.004,.9,3,0,1.1,0,'#a88a5a'),lathe([[0,0],[.1,0],[.12,.18],[0,.18]],8,wd,_m4(0,.6,0)));
    return {parts,w:1.3,d:1.3,h:2.4,tall:1,round:1}},
  jacko(){const g=new THREE.SphereGeometry(1,12,8),p=g.attributes.position;for(let k=0;k<p.count;k++){const a=Math.atan2(p.getZ(k),p.getX(k)),f=1-.08*Math.abs(Math.sin(a*4));p.setXYZ(k,p.getX(k)*f,p.getY(k),p.getZ(k)*f)}
    const parts=[[g,'#d8701c',_m4(0,.2,0,0,0,0,.26,.2,.26)],cy(.02,.03,.08,5,0,.42,0,'#4a5a24')];
    parts.push(glowP(bx(.05,.05,.02,-.08,.25,.25,'#ffc040',0,0,.78),1),glowP(bx(.05,.05,.02,.08,.25,.25,'#ffc040',0,0,.78),1),glowP(bx(.16,.04,.02,0,.13,.25,'#ffc040'),1));
    return {parts,w:.55,d:.55,h:.45,round:1,soft:1,light:1,lightY:.22}},
  haycart(){const wd='#6a4a2e',parts=[bx(1.1,.1,1.8,0,.55,0,wd)];for(const s of [-1,1])parts.push(bx(.06,.4,1.8,s*.55,.8,0,wd),cy(.4,.4,.08,12,s*.6,.4,.4,'#4a3424',0,0,Math.PI/2),cy(.06,.06,.1,6,s*.6,.4,.4,'#2a2a2a',0,0,Math.PI/2));
    parts.push(bx(.06,.06,1.4,-.2,.45,-1.4,wd,.15,0,0),bx(.06,.06,1.4,.2,.45,-1.4,wd,.15,0,0),[new THREE.SphereGeometry(.7,10,6,0,Math.PI*2,0,Math.PI/2),STRAW,_m4(0,.6,0,0,0,0,.75,1,1.25)],bx(.06,.06,.4,-.4,.3,.85,wd));
    for(let i=0;i<3;i++)parts.push([new THREE.SphereGeometry(.12,8,6),'#d86a1a',_m4(rr(-.3,.3),1.1,rr(-.5,.5),0,0,0,1,.75,1)]);return {parts,w:1.3,d:2.8,h:1.4}},
  sheaf(){const parts=[[new THREE.CylinderGeometry(.18,.3,1.2,10),STRAW,_m4(0,.6,0)],[new THREE.ConeGeometry(.3,.5,10),shade(STRAW,1.1),_m4(0,1.4,0)],[new THREE.TorusGeometry(.2,.03,4,12),'#8a6a30',_m4(0,.75,0,Math.PI/2,0,0)]];
    return {parts,w:.6,d:.6,h:1.6,round:1,tall:1}},
  skep(){const parts=[cy(.32,.34,.5,10,0,.25,0,'#4a3a2a')];for(let i=0;i<5;i++)parts.push([new THREE.TorusGeometry(.24-i*.04,.045,5,14),STRAW,_m4(0,.55+i*.07,0,Math.PI/2,0,0)]);
    parts.push([new THREE.SphereGeometry(.07,6,4),STRAW,_m4(0,.88,0)],bx(.07,.04,.04,0,.57,.24,'#1a1410'));return {parts,w:.7,d:.7,h:.92,round:1,soft:1}},
  woodfence(){const parts=[];for(let i=0;i<3;i++)parts.push(cy(.04,.05,.9,5,-.6+i*.6,.45,0,'#5a4028',0,0,rr(-.12,.12)));
    parts.push(bx(1.4,.06,.04,0,.6,.03,'#6a4a2e',0,0,rr(-.05,.05)),bx(1.1,.06,.04,-.1,.3,.03,'#6a4a2e',0,0,.22));return {parts,w:1.4,d:.2,h:.9,soft:1}},
});
PROP_SETS.autumn={wall:[['pumpkins',3],['hay',2.2],['basket',2],['leafpile',2.5],['barrel',2],['crate',2],['wheel',1.2],['scarecrow',.8],['well',.9],['jacko',2.4],['haycart',.8],['sheaf',2],['skep',1.2],['woodfence',1.6],['skeleton',.3]],dead:'chest',dens:.5,noBrazier:1};
// crows on the wall tops
function buildCrows(root){const list=[],g=mergeParts([[new THREE.SphereGeometry(.07,7,5),'#141416',_m4(0,.08,0,0,0,0,1,.9,1.5)],[new THREE.SphereGeometry(.045,6,5),'#141416',_m4(0,.15,.09)],
    [new THREE.ConeGeometry(.015,.05,4),'#3a3430',_m4(0,.15,.14,Math.PI/2,0,0)],bx(.06,.01,.12,0,.08,-.13,'#101012',.4,0,0),cy(.004,.004,.06,3,-.025,.02,0,'#3a3430'),cy(.004,.004,.06,3,.025,.02,0,'#3a3430')]);
  const T=shuffle(W.tops.slice()).slice(0,Math.round(W.n*W.n/4));for(const t of T)pushInst(list,t.x,t.y,t.z,0,rr(0,6.3),0,1,1,1,new THREE.Color(1,1,1),0);
  instance(root,list,[g],propMat(),true,CHUNK*2)}
// a windmill on a rise beyond the fields, its sails turning
function windmill(root,gh){const b=W.b,cx=(b.x0+b.x1)/2,cz=(b.z0+b.z1)/2,half=(b.x1-b.x0)/2,foot=W.skyFoot||[];let x,z;
  for(let t=0;t<20;t++){const a=rr(0,6.3),d=half+rr(45,70);x=cx+Math.cos(a)*d;z=cz+Math.sin(a)*d;if(!foot.some(f=>Math.hypot(f.x-x,f.z-z)<f.r+10))break}
  const y=gh(x,z)-.3,P=[cy(2.2,3,8,8,0,4,0,'#c8b8a0'),[new THREE.ConeGeometry(2.8,3,8),'#6a3a28',_m4(0,9.5,0)],bx(1,1.8,.1,0,1,3,'#4a3424'),bx(.7,.7,.1,0,5,2.6,'#2a2420')];
  const mill=new THREE.Mesh(mergeParts(P),farPropMat());mill.position.set(x,y,z);mill.rotation.y=Math.atan2(cx-x,cz-z);root.add(mill);
  const S=[];for(let i=0;i<4;i++){const a=i*Math.PI/2;S.push(...xform([bx(.25,6,.1,0,3.2,0,'#5a4028'),bx(1.3,4.8,.04,.7,3.6,.02,'#d8ccb0')],_m4(0,0,0,0,0,a)))}
  const sails=new THREE.Mesh(mergeParts(S),farPropMat());sails.position.set(0,7.5,3.1);mill.add(sails);
  W.nm.pts.push({update(t){sails.rotation.z=t*.5}})}

function moreIvy(root,k,cols){const leaves=[],ic=cols.map(c=>new THREE.Color(c));
  for(const fc of W.faces)for(let u=0;u<Math.max(1,Math.round(fc.sg.len/CS))*2;u++){if(fc.outer||rnd()>k)continue;const L=fc.sg.len,s0=rr(.5,L-.5),fromTop=rnd()<.6,top=wallTop(fc.sg.at(s0).x,fc.sg.at(s0).z),wd=rr(.5,1.2);
    for(let i=ri(18,40);i>0;i--){const s=clamp(s0+rr(-wd,wd),.35,L-.35),y=fromTop?top-Math.pow(rnd(),1.2)*rr(.6,top-.3):Math.pow(rnd(),1.5)*rr(.5,1.8),f=faceAt(fc,s);
      if(!W.wallSolid(f.x+f.nx*(BD-.1),y,f.z+f.nz*(BD-.1)))continue;const d=BD+.04+rr(0,.05),sz=rr(.3,.55);
      pushInst(leaves,f.x+f.nx*d,floorH(f.p.x,f.p.z)+y,f.z+f.nz*d,rr(-.2,.2),Math.atan2(f.nx,f.nz),rr(-.4,.4),sz,sz,sz,pick(ic).clone().multiplyScalar(rr(.8,1.15)),0)}}
  instance(root,leaves,[new THREE.PlaneGeometry(1,1)],new THREE.MeshLambertMaterial({map:tex('ivy',()=>mkIvyTex(['#ffffff','#e6e6e6','#cfcfcf'])),alphaTest:.5,side:THREE.DoubleSide}))}
// low bushes at the foot of the walls, in the season's colours
const bushSet=cols=>[[()=>{const P=[];for(let i=0;i<ri(4,7);i++){const a=rr(0,6.3),d=rr(0,.25),r=rr(.14,.26);P.push([new THREE.IcosahedronGeometry(r,1),pick(cols),_m4(Math.cos(a)*d,r*.8,Math.sin(a)*d*.6,0,0,0,1,.85,1)])}return P},1]];

const SWAMP_HANG=[
  // a net hung to dry, weighted with stones
  [()=>{const P=[cy(.012,.012,.1,4,-.4,0,.05,'#3a2a1a',Math.PI/2,0,0),cy(.012,.012,.1,4,.4,0,.05,'#3a2a1a',Math.PI/2,0,0)];for(let i=0;i<7;i++){const x=-.4+i*.133;P.push(bx(.006,.8,.006,x,-.4+Math.abs(x)*.2,.06,'#8a7a5a'))}
    for(let j=0;j<6;j++)P.push(bx(.82-j*.04,.006,.006,0,-.05-j*.14,.06,'#8a7a5a'));for(let i=0;i<4;i++)P.push([new THREE.IcosahedronGeometry(.035,0),'#5a5a52',_m4(-.3+i*.2,-.82,.07)]);return P},2.5,{y:[1.6,2],w:.9,hh:.6}],
  [()=>{const P=[];for(let i=0;i<6;i++)P.push([new THREE.TorusGeometry(.14-i*.018,.008,3,10),'#8a6a3a',_m4(0,0,.12+i*.07,0,0,0)]);for(let i=0;i<8;i++){const a=i/8*6.283;P.push(bx(.008,.008,.42,Math.cos(a)*.1,Math.sin(a)*.1,.3,'#7a5a30',Math.sin(a)*.25,-Math.cos(a)*.25,0))}
    return xform(P,_m4(0,0,0,0,0,0,1,1,1).multiply(_m4(0,0,0,-1.2,0,0)))},2,{y:[1.2,1.6],w:.4}],
  // a stag's skull with antlers
  [()=>{const b='#d8ccb0',P=[[new THREE.SphereGeometry(.09,8,6),b,_m4(0,0,.06,0,0,0,1,.9,1.3)],bx(.07,.06,.16,0,-.05,.16,b),bx(.02,.02,.01,-.035,.0,.17,'#2a2018'),bx(.02,.02,.01,.035,.0,.17,'#2a2018')];
    for(const s of [-1,1]){P.push(cy(.012,.016,.32,5,s*.12,.14,.04,b,0,0,-s*.6),cy(.01,.012,.18,5,s*.22,.3,.04,b,0,0,-s*.1),cy(.008,.01,.14,5,s*.16,.32,.04,b,0,0,s*.4),cy(.008,.01,.12,5,s*.26,.2,.04,b,0,0,-s*1.1))}return P},1.8,{y:[1.7,2],w:.6}],
  [()=>{const P=[bx(.4,.02,.02,0,.1,.04,'#4a3a2a')];for(let i=0;i<4;i++){const x=-.14+i*.09;P.push(cy(.003,.003,.12,3,x,.03,.05,'#6a5a3a'),[new THREE.ConeGeometry(.035,.2,5),'#8a8a7a',_m4(x,-.1,.05,Math.PI,0,0,1,1,.4)],[new THREE.ConeGeometry(.03,.06,3),'#7a7a6a',_m4(x,-.23,.05,0,0,0,1,1,.3)])}return P},1.8,{y:[1.5,1.8],w:.45}],
  // a charm of twigs, feathers and a little skull, against what walks the bog
  [()=>{const P=[cy(.006,.006,.25,3,0,.1,.04,'#5a4a2a'),cy(.012,.012,.36,4,0,0,.05,'#4a3424',0,0,Math.PI/2),cy(.012,.012,.36,4,0,0,.05,'#4a3424',0,0,0)];
    P.push(...skullParts().map(p=>[p[0],p[1],_m4(0,-.02,.08,0,0,0,.5,.5,.5).multiply(p[2])]));for(let i=0;i<3;i++)P.push(cy(.003,.003,.2,3,-.12+i*.12,-.25,.05,'#6a5a3a'),bx(.04,.1,.005,-.12+i*.12,-.38,.05,pick(['#2a2a2a','#6a2a1a','#c8c0a8'])));return P},1.6,{y:[1.5,1.8],w:.4}],
  [()=>[bx(.04,.04,.34,0,0,.17,'#2a2826'),bx(.12,.16,.02,0,0,.01,'#2a2826'),cy(.004,.004,.12,4,0,-.06,.32,'#2a2826'),bx(.14,.03,.14,0,-.12,.32,'#2a2826'),glowP(cy(.055,.06,.15,8,0,-.21,.32,'#ffb040'),.95),bx(.15,.03,.15,0,-.3,.32,'#2a2826')],1.4,{y:[1.8,2],w:.3,light:[-.21,'cluster',.32]}],
];
const SWAMP_LEAN=[
  [()=>[cy(.022,.025,1.9,5,0,.95,.25,'#6a5038',-.13,0,0),bx(.16,.5,.03,0,1.75,.03,'#6a5038',-.13,0,0)],2,{floor:1,w:.3,h:2}],
  [()=>[cy(.012,.02,2.2,5,0,1.1,.3,'#7a6040',-.14,0,0),cy(.002,.002,1.2,3,0,1.4,.6,'#c8c0a0',.25,0,0)],1.5,{floor:1,w:.25,h:2.2}],
  [()=>{const P=[];for(let i=0;i<10;i++)P.push(bx(.02,rr(1.2,1.6),.02,rr(-.15,.15),.7,.2+rr(0,.08),pick(['#8a7a48','#9a8a54','#7a6a3c']),-.12,0,rr(-.06,.06)));P.push([new THREE.TorusGeometry(.12,.02,3,10),'#5a4a2a',_m4(0,.7,.24,Math.PI/2,0,0)]);return P},1.6,{floor:1,w:.4,h:1.6}],
];
const SWAMP_FLOOR=[
  [()=>[...frogParts(rr(.9,1.3)),[new THREE.CylinderGeometry(.2,.2,.01,10,1,false,0,5.6),'#3a6a2a',_m4(0,0,0)]],2.2,{float:1}],
  [()=>{const P=[];for(let i=0;i<ri(6,12);i++){const a=rr(0,6.3),d=rr(0,.35);P.push(cy(rr(.03,.06),rr(.03,.06),.005,6,Math.cos(a)*d,.006,Math.sin(a)*d,pick(['#6a9a2a','#7aaa30','#5a8a26'])))}return P},3,{float:1}],
  [()=>[cy(.09,.11,1.2,7,0,.05,0,'#4a3a28',0,0,Math.PI/2),[new THREE.SphereGeometry(.1,6,4,0,Math.PI*2,0,Math.PI/2),'#3e4c26',_m4(.2,.12,0,0,0,0,1.6,.3,1)],cy(.08,.08,.01,7,.6,.05,0,'#8a7050',0,0,Math.PI/2)],1.5,{float:1}],
  [()=>{const P=[];for(let i=0;i<ri(3,6);i++){const a=rr(0,6.3),d=rr(0,.15),h=rr(.06,.16),r=rr(.03,.06);P.push(cy(r*.25,r*.3,h,5,Math.cos(a)*d,h/2,Math.sin(a)*d,'#d8d0b8'),[new THREE.SphereGeometry(r,8,4,0,Math.PI*2,0,Math.PI/2),pick(['#8a6a3a','#a8582a','#c8b080']),_m4(Math.cos(a)*d,h,Math.sin(a)*d,0,0,0,1,.5,1)])}return P},1.5],
  [()=>{const P=[[new THREE.CylinderGeometry(.3,.36,.18,7),'#5a5a50',_m4(0,.05,0)]];if(rnd()<.6)P.push(...xform(frogParts(1.1),_m4(0,.14,0)));return P},2],
];
Object.assign(PROPS,{
  cauldron(){const ir='#1e1e20',parts=[lathe([[0,0],[.22,0],[.34,.12],[.36,.3],[.3,.42],[.32,.44],[0,.44]],12,ir,_m4(0,.12,0)),glowP(cy(.29,.29,.02,12,0,.52,0,'#6aff40'),.9)];
    for(let i=0;i<3;i++){const a=i*2.094;parts.push(cy(.025,.03,.2,5,Math.cos(a)*.22,.08,Math.sin(a)*.22,ir))}
    for(let i=0;i<6;i++){const a=i/6*6.283;parts.push([new THREE.IcosahedronGeometry(.07,0),'#5a5a52',_m4(Math.cos(a)*.42,.04,Math.sin(a)*.42,rr(0,6),0,0)])}
    parts.push(cy(.012,.012,.7,4,.25,.6,0,'#4a3424',0,0,.6),...xform(skullParts(),_m4(-.45,.06,.1,0,.8,0,.8,.8,.8)));
    return {parts,w:.9,d:.9,h:.7,round:1,light:1,lightY:.6}},
  boardwalk(){const wd=pick(['#5a4a34','#4e4230']),parts=[];for(let i=0;i<8;i++)parts.push(bx(.22,.05,1,-.84+i*.24,.32,0,shade(wd,rr(.8,1.1)),0,0,rr(-.04,.04)));
    for(const x of [-.8,.8])for(const z of [-.4,.4])parts.push(cy(.05,.06,.6,6,x,.12,z,shade(wd,.8)));parts.push(bx(1.9,.05,.08,0,.28,-.45,shade(wd,.85)),bx(1.9,.05,.08,0,.28,.45,shade(wd,.85)));
    return {parts,w:2,d:1,h:.36,soft:1}},
  totem(){const wd='#4a3a28',parts=[cy(.07,.09,2,6,0,1,0,wd)];parts.push(...xform(skullParts(),_m4(0,2.05,.02,0,0,0,1.3,1.3,1.3)));
    for(const s of [-1,1])parts.push(cy(.015,.02,.5,4,s*.2,1.85,0,wd,0,0,s*.9),bx(.04,.14,.005,s*.38,1.7,0,pick(['#2a2a2a','#6a2a1a'])));
    for(let i=0;i<5;i++)parts.push([new THREE.TorusGeometry(.085,.012,3,8),pick(['#6a2a1a','#c8c0a8','#3a4a2a']),_m4(0,.6+i*.18,0,Math.PI/2,0,0)]);return {parts,w:.4,d:.4,h:2.2,tall:1,round:1}},
  deadtrunk(){const b='#3a3024',parts=[cy(.18,.3,2.4,7,0,1.2,0,b,0,0,.06)];for(let i=0;i<4;i++){const a=rr(0,6.3),y=rr(1.4,2.2),l=rr(.5,1);parts.push(cy(.03,.07,l,5,Math.cos(a)*l*.4,y+l*.3,Math.sin(a)*l*.4,b,Math.sin(a)*.9,0,-Math.cos(a)*.9))}
    for(let i=0;i<5;i++){const y=rr(1.3,2.3),a=rr(0,6.3);parts.push(bx(.06,rr(.4,.9),.02,Math.cos(a)*.3,y-.3,Math.sin(a)*.3,pick(['#5a6a3a','#6a7448','#4a5a30'])))}
    parts.push([new THREE.SphereGeometry(.3,7,4,0,Math.PI*2,0,Math.PI/2),'#3e4c26',_m4(0,0,0,0,0,0,1.3,.4,1.3)]);return {parts,w:.7,d:.7,h:2.6,tall:1,round:1}},
});
PROP_SETS.swamp={wall:[['stump',2.5],['reeds',3.5],['boat',1],['swamplamp',2],['rocks',1.5],['logs',1.2],['cauldron',.9],['boardwalk',1.4],['totem',1.2],['deadtrunk',1.4],['skeleton',.5],['remains',.5]],dead:'chest',dens:.42,noBrazier:1};
// moss hanging in strands from the wall tops
function mossDrapes(root,k){const list=[];
  for(const fc of W.faces){if(fc.outer)continue;const L=fc.sg.len;for(let s=.4;s<L-.4;s+=rr(.25,.7)){if(rnd()>k)continue;const f=faceAt(fc,s),top=wallTop(f.p.x,f.p.z),len=rr(.4,1.5),d=BD+rr(.01,.06);
    pushInst(list,f.x+f.nx*d,top-len+.05,f.z+f.nz*d,0,Math.atan2(f.nx,f.nz),0,rr(.18,.3),len,1,new THREE.Color(pick(['#8a9a6a','#7a8a5a','#9aa47a'])).multiplyScalar(rr(.7,1)),0)}}
  const g=new THREE.PlaneGeometry(1,1);g.translate(0,.5,0);instance(root,list,[g],new THREE.MeshLambertMaterial({map:tex('vine',mkVineTex),alphaTest:.5,side:THREE.DoubleSide}),true,CHUNK*2)}
// the marsh beyond the walls: the land sinks under the water near the maze, a few hummocks above it; the trees are
// set down on the new ground, the water runs out to the fog
const SWAMP_OUT=[
  // a hut on stilts with a sagging thatch
  [()=>{const wd='#4a3a2a',P=[];for(const x of [-1.4,1.4])for(const z of [-1.1,1.1])P.push(cy(.08,.1,2.2,6,x,.6,z,shade(wd,.8)));P.push(bx(3.2,.12,2.6,0,1.5,0,wd),bx(2.8,1.8,2.2,0,2.45,0,'#5a4a36'),bx(.6,1.1,.05,0,2.1,1.11,'#2a2018'),glowP(bx(.4,.35,.05,.9,2.6,1.11,'#ffa040'),.7));
    P.push([new THREE.ConeGeometry(2.6,1.8,4),'#6a6a48',_m4(0,4.2,0,0,Math.PI/4,0,1.1,1,.95)],bx(.3,2.4,.12,1.8,.9,.4,wd,0,0,.6));return P},3,{face:1}],
  [()=>{const P=[];for(let i=0;i<20;i++)P.push(bx(.03,rr(1,2),.03,rr(-.8,.8),.7,rr(-.8,.8),pick(['#6a7a3a','#7a8640','#56662e']),rr(-.15,.15),0,rr(-.15,.15)));return P},8],
  [()=>PROPS.deadtrunk().parts,5],[()=>PROPS.boat().parts,2],[()=>PROPS.boardwalk().parts,3],[()=>PROPS.stump().parts,4],[()=>PROPS.totem().parts,1.5],
];
function swampMarsh(root,m){const gm=root.children.find(c=>c.material===m.ground);if(!gm)return;const b=W.b,cx=(b.x0+b.x1)/2,cz=(b.z0+b.z1)/2,half=(b.x1-b.x0)/2,WL=TH.water;
  const g=gm.geometry,p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),dx=Math.max(0,Math.abs(x-cx)-half),dz=Math.max(0,Math.abs(z-cz)-half),r=Math.hypot(dx,dz);
    if(r<3)continue;const hum=WL-.25+Math.max(0,Noise.fbm(x*.05+7,z*.05,3))*1.2;p.setY(i,lerp(hum,p.getY(i),sstep(120,260,r)))}
  p.needsUpdate=true;g.computeVertexNormals();const gh=planeH(g);
  if(W.trees){const o=W.trees.geometry.attributes.off;for(let i=0;i<o.count;i++)o.setY(i,gh(o.getX(i),o.getZ(i))-.3);o.needsUpdate=true}
  const nm=tex('swamp_waternormals',mkWaterNormals);nm.repeat.set(1,1);const R0=450,T0=W.TW,V=(x,z)=>new THREE.Vector2(x,-z),sh=new THREE.Shape([V(cx-R0,cz-R0),V(cx+R0,cz-R0),V(cx+R0,cz+R0),V(cx-R0,cz+R0)]);sh.holes.push(new THREE.Path([V(0,0),V(T0,0),V(T0,T0),V(0,T0)]));
  const wg=new THREE.ShapeGeometry(sh);wg.rotateX(-Math.PI/2);const uv=wg.attributes.uv,ps=wg.attributes.position;for(let i=0;i<uv.count;i++)uv.setXY(i,ps.getX(i)/3,ps.getZ(i)/3);nm.repeat.set(1,1);
  const w=new THREE.Mesh(wg,new THREE.MeshPhongMaterial({color:0x0e1a1c,specular:0x7a9898,shininess:70,normalMap:nm,normalScale:new THREE.Vector2(.5,.5),transparent:true,opacity:.84,depthWrite:false}));w.renderOrder=1;W.nm.pts.push({update(t){nm.offset.set(t*.012,t*.007)}});
  w.position.y=TH.water;root.add(w);
  outskirts(root,m,SWAMP_OUT,420,3,90)}

// mushrooms come up out of a little mound of earth and moss, never out of the paving
const shroomsOnEarth=(cols,glow)=>()=>{const P=[[new THREE.SphereGeometry(.24,9,4,0,Math.PI*2,0,Math.PI/2),pick(['#3a2e22','#46382a']),_m4(0,-.01,0,0,0,0,1,.3,.85)],
    [new THREE.SphereGeometry(.17,8,4,0,Math.PI*2,0,Math.PI/2),pick(['#3e5226','#4a5e2a']),_m4(.04,.01,.02,0,0,0,1,.28,.8)]];
  for(let i=0;i<ri(3,6);i++){const a=rr(0,6.3),d=rr(0,.15),h=rr(.06,.15),r=rr(.03,.06),x=Math.cos(a)*d,z=Math.sin(a)*d*.8,y=.05-d*.15;
    P.push(cy(r*.3,r*.35,h,5,x,y+h/2,z,'#e0d4b8'));const cap=[new THREE.SphereGeometry(r,8,4,0,Math.PI*2,0,Math.PI/2),pick(cols),_m4(x,y+h,z,0,0,0,1,.6,1)];P.push(glow?glowP(cap,glow):cap)}return P};
AUT_FLOOR[1]=[shroomsOnEarth(['#a8582a','#8a4a22','#c8a060','#b83a1a']),2.5,{earth:1}];
AUT_LEAN.splice(0,4);                                   // pitchfork, rake, scythe, broom: tools stay out
AUT_LEAN.push([()=>{const P=[];for(let i=0;i<7;i++){const y=.12+Math.floor(i/3)*.2,x=-.25+(i%3)*.25;P.push(cy(.09,.1,.6,7,x,y,.25,pick(['#6a4a30','#5a3e28','#74523a']),0,0,Math.PI/2),cy(.08,.08,.01,7,x+.3,y,.25,'#c8a878',0,0,Math.PI/2))}return P},2.5,{floor:1,w:.8,h:.7}],
  [()=>{const wd=pick(['#5a4028','#6a4a2e']),P=[];for(let i=0;i<5;i++)P.push(bx(.16,1.7,.04,-.32+i*.16,.85,.22,shade(wd,rr(.85,1.1)),-.12,0,0));P.push(bx(.8,.08,.05,0,.5,.3,shade(wd,.8),-.12,0,0),bx(.8,.08,.05,0,1.3,.2,shade(wd,.8),-.12,0,0),bx(.06,.06,.03,.26,.9,.27,'#2a2a2a',-.12,0,0));return P},1.5,{floor:1,w:.9,h:1.9}]);
// a basket heaped full: a cloth over the rim and a mound of apples (an open basket showed it was a solid)
PROPS.basket=function(){const w='#8a6a3a',parts=[lathe([[0,0],[.18,0],[.24,.26],[.25,.28],[0,.28]],12,w)];
  for(let y=.05;y<.27;y+=.06)parts.push([new THREE.TorusGeometry(.2+y*.2,.008,4,14),shade(w,.8),_m4(0,y,0,Math.PI/2,0,0)]);
  parts.push([new THREE.SphereGeometry(.245,12,5,0,Math.PI*2,0,Math.PI/2),'#5a2a1a',_m4(0,.26,0,0,0,0,1,.35,1)]);
  const fr=pick([['#b8281a','#c83a20','#8a1a14'],['#d8a030','#c89020'],['#c86a22','#d86a1a'],['#6a3a6a','#5a2a5a']]);
  for(let i=0;i<14;i++){const a=rr(0,6.3),d=Math.sqrt(rnd())*.19,y=.3+(.19-d)*.45;parts.push([new THREE.SphereGeometry(.055,7,5),pick(fr),_m4(Math.cos(a)*d,y,Math.sin(a)*d)])}
  parts.push([new THREE.TorusGeometry(.24,.012,4,14,Math.PI),w,_m4(0,.28,0,0,rr(0,3),0)]);return {parts,w:.52,d:.52,h:.6,round:1,soft:1}};
PROP_SETS.autumn.wall=PROP_SETS.autumn.wall.filter(([n])=>n!=='jacko'&&n!=='skep');
// carved pumpkins with the light inside: the face is cut into the skin (a texture that glows), not stuck on it
function mkJackTex(){const c=mkCanvas(128,64),x=c.getContext('2d');x.fillStyle='#d8701c';x.fillRect(0,0,128,64);
  for(let i=0;i<16;i++){x.fillStyle=i%2?'#c25e16':'#e07c22';x.fillRect(i*8,0,8,64)}x.fillStyle='rgba(0,0,0,.18)';x.fillRect(0,0,128,6);x.fillRect(0,58,128,6);
  const fx=32,fy=30;x.fillStyle='#ffd050';x.beginPath();x.moveTo(fx-12,fy-8);x.lineTo(fx-5,fy-8);x.lineTo(fx-8.5,fy-15);x.fill();x.beginPath();x.moveTo(fx+5,fy-8);x.lineTo(fx+12,fy-8);x.lineTo(fx+8.5,fy-15);x.fill();
  x.beginPath();x.moveTo(fx-2,fy-2);x.lineTo(fx+2,fy-2);x.lineTo(fx,fy-6);x.fill();x.beginPath();x.moveTo(fx-14,fy+2);for(let i=0;i<=7;i++)x.lineTo(fx-14+i*4,fy+2+(i%2?4:0)+Math.sin(i/7*Math.PI)*5);
  for(let i=7;i>=0;i--)x.lineTo(fx-14+i*4,fy+8+Math.sin(i/7*Math.PI)*6-(i%2?3:0));x.fill();
  const t=new THREE.CanvasTexture(c);t.magFilter=THREE.NearestFilter;return t}
function mkJackGlow(){const c=mkCanvas(128,64),x=c.getContext('2d'),s=tex('jack',mkJackTex).image,d=s.getContext('2d').getImageData(0,0,128,64),o=x.createImageData(128,64);
  for(let i=0;i<d.data.length;i+=4){const on=d.data[i+1]>180;o.data[i]=on?255:0;o.data[i+1]=on?200:0;o.data[i+2]=on?80:0;o.data[i+3]=255}x.putImageData(o,0,0);const t=new THREE.CanvasTexture(c);t.magFilter=THREE.NearestFilter;return t}
function jackos(root,k){const list=[],stem=[],g=new THREE.SphereGeometry(1,16,10),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const a=Math.atan2(p.getZ(i),p.getX(i)),f=1-.07*Math.abs(Math.sin(a*4));p.setXYZ(i,p.getX(i)*f,p.getY(i),p.getZ(i)*f)}g.computeVertexNormals();
  for(const fc of W.faces){if(fc.outer)continue;const L=fc.sg.len;for(let u=0;u<Math.max(1,Math.round(L/CS));u++){if(rnd()>k)continue;const s=rr(BD+.5,L-BD-.5),f=faceAt(fc,s),x=f.x+f.nx*(BD+.32),z=f.z+f.nz*(BD+.32);
    if(Math.hypot(x-W.start.x,z-W.start.z)<1.5)continue;const sz=rr(.2,.27),yaw=Math.atan2(f.nx,f.nz)+rr(-.3,.3),y=floorH(x,z)+sz*.72;
    pushInst(list,x,y,z,0,yaw,0,sz,sz*.78,sz,new THREE.Color(1,1,1),0);pushInst(stem,x,y+sz*.78,z,rr(-.2,.2),0,rr(-.2,.2),1,1,1,new THREE.Color('#4a5a24'),0);
    W.lights.push({x:x+f.nx*.05,y,z:z+f.nz*.05,base:y-.1,kind:'candle',k0:.05,nx:0,nz:0});W.tall.push({x:f.x+f.nx*BD,z:f.z+f.nz*BD,r:.4})}}
  instance(root,list,[g],new THREE.MeshLambertMaterial({map:tex('jack',mkJackTex),emissiveMap:tex('jackglow',mkJackGlow),emissive:0xffffff,emissiveIntensity:1}),true,CHUNK*2);
  instance(root,stem,[new THREE.CylinderGeometry(.015,.025,.07,5).translate(0,.03,0)],new THREE.MeshLambertMaterial({color:0xffffff}),true,CHUNK*2)}

const _up=new THREE.Vector3(0,1,0);
function limb(a,b,r0,r1,col,seg=6){const d=b.clone().sub(a),L=d.length(),q=new THREE.Quaternion().setFromUnitVectors(_up,d.normalize()),m=new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(.5),q,new THREE.Vector3(1,1,1));
  return [new THREE.CylinderGeometry(r1,r0,L,seg),col,m]}

function lowTree(kind,o){const bark=o.bark,lv=o.leaves,P=[],V=(x,y,z)=>new THREE.Vector3(x,y,z),tips=[];
  const trunk=(h,r,lean)=>{const a=rr(0,6.3),mid=V(Math.cos(a)*lean*.4,h*.5,Math.sin(a)*lean*.4),top=V(Math.cos(a)*lean,h,Math.sin(a)*lean);
    P.push(limb(V(0,-.1,0),mid,r,r*.72,bark),limb(mid,top,r*.72,r*.3,bark));
    for(let i=0;i<4;i++){const ra=i*1.57+rr(-.3,.3);P.push(limb(V(0,.02,0),V(Math.cos(ra)*r*1.9,-.05,Math.sin(ra)*r*1.9),r*.55,r*.2,shade(bark,.9),5))}
    return t=>t<.5?V(mid.x*t*2,h*t,mid.z*t*2):V(lerp(mid.x,top.x,(t-.5)*2),h*t,lerp(mid.z,top.z,(t-.5)*2))};
  const branch=(at,len,up,r)=>{const a=rr(0,6.3),e=up,end=V(at.x+Math.cos(a)*Math.cos(e)*len,at.y+Math.sin(e)*len,at.z+Math.sin(a)*Math.cos(e)*len);P.push(limb(at,end,r,r*.35,bark,5));tips.push(end);return end};
  if(kind==='tall'){const h=rr(5,8),f=trunk(h,rr(.16,.22),rr(.1,.4));for(let i=0;i<ri(5,8);i++){const t=rr(.35,.95),e=branch(f(t),rr(.4,1.1)*(1.1-t),rr(.1,.6),.05);if(lv&&rnd()<.6)P.push(...clump(e,rr(.35,.55),lv,.35))}
    if(lv)P.push(...clump(f(1),.5,lv,.6))}
  else if(kind==='bushy'){const h=rr(3,4.5),f=trunk(h,rr(.18,.26),rr(.1,.5));for(let i=0;i<ri(2,4);i++){const e=branch(f(rr(.55,.85)),rr(.6,1.2),rr(.4,.9),.08);P.push(...clump(e,rr(.7,1),lv||['#4a5a2a'],.7))}P.push(...clump(f(1).add(V(0,.3,0)),1.1,lv||['#4a5a2a'],.75))}
  else if(kind==='bare'){const h=rr(3.5,5.5),f=trunk(h,rr(.16,.24),rr(.2,.6));for(let i=0;i<ri(3,5);i++){const e=branch(f(rr(.45,.95)),rr(.7,1.5),rr(.5,1.1),.07);if(rnd()<.6)branch(e,rr(.3,.6),rr(.6,1.2),.03)}}
  else if(kind==='stump'){const h=rr(.4,1.1),r=rr(.18,.3);P.push(limb(V(0,-.05,0),V(0,h,0),r,r*.85,bark,7));for(let i=0;i<3;i++){const a=rr(0,6.3);P.push([new THREE.ConeGeometry(r*.4,rr(.15,.35),4),shade(bark,1.1),_m4(Math.cos(a)*r*.5,h+.08,Math.sin(a)*r*.5,rr(-.3,.3),0,rr(-.3,.3))])}
    P.push(cy(r*.82,r*.82,.02,7,0,h-.02,0,'#c8a070'));for(let i=0;i<4;i++){const a=i*1.57+rr(-.3,.3);P.push(limb(V(0,.05,0),V(Math.cos(a)*r*2,-.05,Math.sin(a)*r*2),r*.5,r*.18,shade(bark,.9),5))}
    if(rnd()<.6)branch(V(0,h*.6,0),rr(.2,.4),rr(.2,.8),.03)}
  else if(kind==='broken'){const h=rr(1.2,2),r=rr(.18,.26);P.push(limb(V(0,-.05,0),V(0,h,0),r,r*.8,bark,7),[new THREE.ConeGeometry(r*.6,.4,4),shade(bark,1.15),_m4(r*.2,h+.15,0,0,0,.3)]);
    const L=rr(3,4.5),a=rr(0,6.3);P.push(limb(V(Math.cos(a)*.2,h-.1,Math.sin(a)*.2),V(Math.cos(a)*L,.15,Math.sin(a)*L),r*.75,r*.35,bark,6));
    for(let i=0;i<3;i++){const t=rr(.3,.9);branch(V(Math.cos(a)*L*t,h-.1+(.25-h)*t,Math.sin(a)*L*t),rr(.3,.6),rr(.3,.9),.04)}}
  else{const L=rr(2,3.2),r=rr(.16,.24);P.push(limb(V(-L/2,r*.8,0),V(L/2,r*.7,0),r,r*.85,bark,7),cy(r*.85,r*.85,.02,7,L/2+.01,r*.7,0,'#c8a070',0,0,Math.PI/2));for(let i=0;i<3;i++)branch(V(rr(-L/2,L/2),r,0),rr(.2,.5),rr(.3,1),.035)}
  // moss hanging from the tips of the limbs (it hangs from wood, not from air)
  if(o.moss)for(const t of tips)if(rnd()<.75)for(let k=0;k<ri(1,3);k++){const len=rr(.4,1.3);P.push(bx(rr(.05,.1),len,.015,t.x+rr(-.08,.08),t.y-len/2,t.z+rr(-.08,.08),pick(o.moss),0,rr(0,3),0))}
  return P}
const SW_TREE={bark:'#4e3e2c',leaves:['#4a5a2a','#56602e','#3e4c26','#5a5a30'],moss:['#7a8a5a','#8a9a6a','#6a7a4a']};
const AU_TREE={bark:'#6a4a30',leaves:['#a8401c','#c86a22','#d89030','#8a2a18','#b85a20']};
Object.assign(PROPS,{
  deadtrunk(){const k=pick(['tall','bushy','bare']);return {parts:lowTree(k,SW_TREE),w:.7,d:.7,h:4,tall:1,round:1}},
  stump(){return {parts:lowTree('stump',SW_TREE),w:.7,d:.7,h:.8,round:1,soft:1}},
});
const treeSet=(o,w)=>[[()=>lowTree('tall',o),w[0]],[()=>lowTree('bushy',o),w[1]],[()=>lowTree('bare',o),w[2]],[()=>lowTree('stump',o),w[3]],[()=>lowTree('broken',o),w[4]],[()=>lowTree('log',o),w[5]]];
SWAMP_OUT.splice(2,1,...treeSet(SW_TREE,[5,4,4,4,2,2]));   // the old trunks out, the new trees in
SWAMP_OUT.splice(SWAMP_OUT.findIndex(e=>e[0].toString().includes('PROPS.stump')),1);
THEMES.swamp.trees=null;                                    // the sprite trees go: the marsh has its own now
AUT_OUT.push(...treeSet(AU_TREE,[0,2,1,2.5,1.2,2]));
SWAMP_FLOOR.push([()=>lowTree('log',SW_TREE),.6,{float:1}]);

const LP_ATLAS={swamplp:[SW_TREE,['tall','bushy','bare','tall']]};
function lpAtlas(kind){const [o,kinds]=LP_ATLAS[kind],CW2=64,CH=128,S=3,c=mkCanvas(CW2*4,CH),x=c.getContext('2d');
  const rt=new THREE.WebGLRenderTarget(CW2*S,CH*S),sc=new THREE.Scene(),buf=new Uint8Array(CW2*S*CH*S*4);
  sc.add(new THREE.HemisphereLight(0xdde4ee,0x5a5048,.85));const dl=new THREE.DirectionalLight(0xfff0e0,.9);dl.position.set(-1,1.4,1.2);sc.add(dl);
  const oc=renderer.getClearColor(new THREE.Color()),oa=renderer.getClearAlpha();renderer.setClearColor(0x000000,0);
  kinds.forEach((k,v)=>{const g=mergeParts(lowTree(k,o)),m=new THREE.Mesh(g,new THREE.MeshLambertMaterial({vertexColors:true}));sc.add(m);
    g.computeBoundingBox();const bb=g.boundingBox,h=Math.max(bb.max.y,2*Math.max(-bb.min.x,bb.max.x,-bb.min.z,bb.max.z))*1.04;
    const cam=new THREE.OrthographicCamera(-h/4,h/4,h,0,-50,50);cam.position.set(0,0,10);cam.lookAt(0,0,0);
    renderer.setRenderTarget(rt);renderer.clear();renderer.render(sc,cam);renderer.readRenderTargetPixels(rt,0,0,CW2*S,CH*S,buf);sc.remove(m);g.dispose();m.material.dispose();
    const id=x.createImageData(CW2,CH);for(let py=0;py<CH;py++)for(let px=0;px<CW2;px++){let r=0,gg=0,b=0,a=0;
      for(let sy=0;sy<S;sy++)for(let sx=0;sx<S;sx++){const i=(((CH-1-py)*S+sy)*CW2*S+px*S+sx)*4;if(buf[i+3]>0){r+=buf[i];gg+=buf[i+1];b+=buf[i+2];a++}}
      const o2=(py*CW2+px)*4;if(a>=Math.ceil(S*S/3)){id.data[o2]=r/a;id.data[o2+1]=gg/a;id.data[o2+2]=b/a;id.data[o2+3]=255}}
    x.putImageData(id,v*CW2,0)});
  renderer.setRenderTarget(null);renderer.setClearColor(oc,oa);rt.dispose();
  crisp(x,CW2*4,CH,[14,12,10]);const t=new THREE.CanvasTexture(c);t.magFilter=THREE.NearestFilter;return t}
TREE_KINDS.swamplp={w:.5,h:[5,8]};

SWAMP_OUT.forEach(e=>{const s=e[0].toString();if(s.includes("'tall'")||s.includes("'bushy'")||s.includes("'bare'"))e[1]=0});
AUT_OUT.forEach(e=>{const s=e[0].toString();if(s.includes("'tall'")||s.includes("'bushy'")||s.includes("'bare'"))e[1]=0});

SWAMP_FLOOR.splice(0,1);
SWAMP_FLOOR[1]=[()=>{const P=[];for(let i=0;i<ri(6,12);i++){const a=rr(0,6.3),d=rr(0,.35);P.push(cy(rr(.03,.06),rr(.03,.06),.004,6,Math.cos(a)*d,.022+i*.0015,Math.sin(a)*d,pick(['#6a9a2a','#7aaa30','#5a8a26'])))}return P},3,{float:1}];
SWAMP_FLOOR.forEach((e,i)=>{if(e[0].toString().includes('frogParts'))SWAMP_FLOOR[i]=[()=>[[new THREE.CylinderGeometry(.3,.36,.18,7),'#5a5a50',_m4(0,.05,0)]],2]});
// the water stands a little higher: where the ground was a hair under it the two flickered across whole corridors
THEMES.swamp.water=.13;
// foliage: the lumps keep their faces joined. an icosahedron's faces do not share corners here, so every corner is moved
// by an amount worked out from its place (the same for every face meeting there), not drawn at random per face
function clump(c,s,cols,flat=.6){const P=[];for(let i=0;i<ri(2,4);i++){const g=new THREE.IcosahedronGeometry(s*rr(.55,.85),0),p=g.attributes.position,sd=rr(0,99);
    for(let k=0;k<p.count;k++){const x=p.getX(k),y=p.getY(k),z=p.getZ(k),h=Math.sin(Math.round(x*97)*12.9898+Math.round(y*97)*78.233+Math.round(z*97)*37.719+sd)*43758.5453,f=.88+.24*(h-Math.floor(h));
      p.setXYZ(k,x*f,y*f,z*f)}
    P.push([g,pick(cols),_m4(c.x+rr(-.35,.35)*s,c.y+rr(-.1,.2)*s,c.z+rr(-.35,.35)*s,rr(0,6),rr(0,6),0,1,flat,1)])}return P}
// a lantern on a pole: the pole, a bent arm growing out of its top and the chain meet; the flame is in the lantern
PROPS.swamplamp=function(){const wd='#3a2e20',ir='#24221e',V=(x,y,z)=>new THREE.Vector3(x,y,z),lean=rr(-.04,.04),top=V(lean,1.95,0),elb=V(lean,2.02,.18),end=V(lean,1.98,.5);
  const parts=[limb(V(0,-.05,0),top,.05,.035,wd,6),limb(V(lean,1.86,0),elb,.032,.028,wd,6),limb(elb,end,.028,.022,wd,6),[new THREE.SphereGeometry(.036,6,5),wd,_m4(lean,1.96,0)]];
  parts.push(limb(V(lean,1.97,.5),V(lean,1.7,.5),.005,.005,ir,4),bx(.14,.03,.14,lean,1.69,.5,ir),glowP(bx(.11,.18,.11,lean,1.59,.5,'#ffb040'),.95),bx(.15,.03,.15,lean,1.49,.5,ir),
    ...[[-1,-1],[-1,1],[1,-1],[1,1]].map(([a,b])=>bx(.015,.2,.015,lean+a*.06,1.59,.5+b*.06,ir)));
  return {parts,w:.3,d:.3,h:2.1,tall:1,light:1,lightY:1.59,lightZ:.5}};


Object.assign(TREE_KINDS,{autumn:{w:.72,h:[4.6,6.8]}});
const autumnColors=[['#4a1a10','#7a2a14','#a84418','#d07024','#e8a040'],['#3e1210','#6a1a14','#962a1a','#c04424','#d8703a'],['#4a3410','#7a5414','#a8801e','#d0aa30','#e8cc58'],['#2e3418','#5a4a1a','#8a5a1e','#b07a2a','#d0a040']];
THEMES.swamp.trees='swamplp';THEMES.swamp.noBanners=true;
Object.assign(BANNER,{autumn:['#7a2a18','#d8a040'],swamp:['#2a3a2a','#8a8a6a']});
Object.assign(FOG_COL,{autumn:[0xe8c8a0,.2],swamp:[0x9aa888,.22]});
THEMES.autumn.weather.night={w:2,name:'night',night:1,sky:{top:0x05060e,hor:0x2a2438,bot:0x100c0c,sun:0x000000},sun:[0xa8b0d8,.5],hemi:[0x4a4a6a,0x1e140c,.6],bg:0x1a1620,fogMax:220};

return {
  environment(root,m){if(game.theme!=='autumn'&&game.theme!=='swamp')return;W.nm={pts:[]};
    if(game.theme==='autumn'){const gh=outskirts(root,m,AUT_OUT,320,3,75);if(gh)windmill(root,gh)}else swampMarsh(root,m)},
  decor(root){if(game.theme==='autumn'){buildLeaves(root);dressWalls(root,AUT_HANG,.45);dressWalls(root,AUT_LEAN,.25);dressFloor(root,AUT_FLOOR,9,[.05,.9]);buildCrows(root);
      moreIvy(root,.35,TH.ivy);dressFloor(root,bushSet(['#8a2a18','#a8401c','#c86a22','#7a5a20','#6a6a28']),3.5,[.05,.35]);jackos(root,TH.night?.4:.18)}
    else if(game.theme==='swamp'){buildSwamp(root);mossDrapes(root,.4);moreIvy(root,.25,TH.ivy);dressWalls(root,SWAMP_HANG,.4);dressWalls(root,SWAMP_LEAN,.22);dressFloor(root,SWAMP_FLOOR,8,[.1,.9])}},
  update(t,dt){if(W.nm)for(const p of W.nm.pts)p.update(t,dt)},
  treeAtlas(kind){const previous=rnd;rnd=mulberry(7093);try{return kind==='autumn'?recolorAtlas(mkTreeAtlas('leaf'),autumnColors):lpAtlas(kind)}finally{rnd=previous}}
};
})();
