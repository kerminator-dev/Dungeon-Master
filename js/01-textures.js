'use strict';
// ---------- procedural textures (canvas) ----------
function mkCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
function toTex(c,near=true){const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;
  if(near)t.magFilter=THREE.NearestFilter;t.anisotropy=4;return t}
const rgb=c=>{const v=new THREE.Color(c);return [v.r*255,v.g*255,v.b*255]};

// seamless value noise
function vnoiseTile(w,h,cell,r){
  const gw=Math.max(1,Math.round(w/cell)),gh=Math.max(1,Math.round(h/cell)),G=new Float32Array(gw*gh);
  for(let i=0;i<G.length;i++)G[i]=r();
  const out=new Float32Array(w*h);
  for(let y=0;y<h;y++){const fy=y/h*gh,y0=Math.floor(fy),ty=fy-y0,sy=ty*ty*(3-2*ty),r0=(y0%gh)*gw,r1=((y0+1)%gh)*gw;
    for(let x=0;x<w;x++){const fx=x/w*gw,x0=Math.floor(fx),tx=fx-x0,sx=tx*tx*(3-2*tx),c0=x0%gw,c1=(x0+1)%gw;
      out[y*w+x]=lerp(lerp(G[r0+c0],G[r0+c1],sx),lerp(G[r1+c0],G[r1+c1],sx),sy)}}
  return out}
function fbmTile(w,h,r,cells,amps){const o=new Float32Array(w*h);let t=0;
  cells.forEach((c,i)=>{const n=vnoiseTile(w,h,c,r);for(let k=0;k<o.length;k++)o[k]+=n[k]*amps[i];t+=amps[i]});
  for(let k=0;k<o.length;k++)o[k]/=t;return o}
function pixels(w,h,fn){const c=mkCanvas(w,h),x=c.getContext('2d'),id=x.createImageData(w,h),d=id.data;
  for(let y=0;y<h;y++)for(let i=0;i<w;i++){const o=(y*w+i)*4,p=fn(i,y);d[o]=p[0];d[o+1]=p[1];d[o+2]=p[2];d[o+3]=p[3]===undefined?255:p[3]}
  x.putImageData(id,0,0);return c}

// single brick surface: light, colour comes from the instance
function mkBrickTex(seed=11){const w=64,h=32,r=mulberry(seed),n=fbmTile(w,h,r,[16,8,4,2],[.35,.3,.2,.15]),
  sp=new Float32Array(w*h).map(()=>r());
  return toTex(pixels(w,h,(x,y)=>{const k=y*w+x;let v=.66+n[k]*.55;v*=1-.06*Math.sin(y*.8+n[k]*7);
    const e=Math.min(x,w-1-x,y,h-1-y);if(e<2)v*=.9+e*.04;
    if(sp[k]<.02)v*=.8;else if(sp[k]>.985)v*=1.1;v=clamp(v,0,1.1)*230;return [v,v,v]}))}

// masonry brick face: brick + thin mortar joint at the edge (shared with neighbour)
function mkBrickFaceTex(seed=12){const w=64,h=32,r=mulberry(seed),n=fbmTile(w,h,r,[16,8,4,2],[.35,.3,.2,.15]),sp=new Float32Array(w*h).map(()=>r());
  return toTex(pixels(w,h,(x,y)=>{const k=y*w+x;
    if(x===0||y===0){const m=150+n[k]*40;return [m,m*.97,m*.93]}           // joint: left and bottom edge
    let v=.72+n[k]*.45;v*=1-.05*Math.sin(y*.8+n[k]*7);
    if(y===1)v*=1.12;else if(y===h-1)v*=.82;if(x===1)v*=1.06;else if(x===w-1)v*=.88;   // slight bevel
    if(sp[k]<.02)v*=.82;else if(sp[k]>.985)v*=1.1;v=clamp(v,0,1.1)*230;return [v,v,v]}))}

// ashlar for distant buildings: 4 bonded rows of 2 blocks, each block its own tone
function mkAshlarTex(seed=71){const s=128,r=mulberry(seed),n=fbmTile(s,s,r,[32,16,8,4],[.3,.3,.25,.15]),B=[];for(let i=0;i<8;i++)B.push(.78+r()*.32);
  return toTex(pixels(s,s,(x,y)=>{const row=y>>5,xo=(x+(row&1)*32)&127,bx=xo&63,by=y&31,k=y*s+x;
    if(bx<2||by<2){const m=118+n[k]*40;return [m,m*.97,m*.93]}
    let v=B[row*2+(xo>>6)]*(.74+n[k]*.42);if(by===2)v*=1.1;else if(by===31)v*=.84;if(bx===2)v*=1.05;else if(bx===63)v*=.88;
    v=clamp(v,0,1.1)*230;return [v,v,v]}))}

// stones/tiles (Voronoi): floor, vaults, paving
function mkStoneTex(o){const size=o.size||256,cells=o.cells||6,r=mulberry(o.seed||5),P=[],C=[],cs=size/cells;
  for(let j=0;j<cells;j++)for(let i=0;i<cells;i++){
    P.push([(i+.12+r()*.76)*cs,(j+.12+r()*.76)*cs]);
    const alt=!!o.alt&&r()<o.altP;
    C.push({alt,col:rgb(alt?o.alt:o.cols[Math.floor(r()*o.cols.length)]),b:.82+r()*.32})}
  const n=fbmTile(size,size,r,[32,16,8,4],[.3,.3,.25,.15]),n2=fbmTile(size,size,r,[48,20],[.6,.4]),gap=rgb(o.gap),gw=o.gapW||3;
  const cr=fbmTile(size,size,r,[24],[1]);
  return toTex(pixels(size,size,(x,y)=>{
    const ci=Math.floor(x/cs),cj=Math.floor(y/cs);let d1=1e9,d2=1e9,id=0;
    for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){
      const ii=(ci+di+cells)%cells,jj=(cj+dj+cells)%cells,p=P[jj*cells+ii];
      const px=p[0]+(ci+di-ii)*cs,py=p[1]+(cj+dj-jj)*cs,dx=x-px,dy=y-py,dd=dx*dx+dy*dy;
      if(dd<d1){d2=d1;d1=dd;id=jj*cells+ii}else if(dd<d2)d2=dd}
    const k=y*size+x,nv=n[k],ee=Math.sqrt(d2)-Math.sqrt(d1)+(n2[k]-.5)*7;
    if(ee<gw){const v=.65+nv*.7;return [gap[0]*v,gap[1]*v,gap[2]*v]}
    const c=C[id];let v=c.b*(.72+nv*.56);
    if(!c.alt){if(ee<gw+2.5)v*=.72;else if(ee<gw+4.5)v*=1.08;if(Math.abs(cr[k]-.5)<.006)v*=.6}
    return [c.col[0]*v,c.col[1]*v,c.col[2]*v]}))}

// grass / snow / dirt
function mkGroundTex(cols,seed,blades){const s=128,r=mulberry(seed),n=fbmTile(s,s,r,[32,16,8,4],[.35,.3,.2,.15]),sp=new Float32Array(s*s).map(()=>r());
  const C=cols.map(rgb);
  const c=pixels(s,s,(x,y)=>{const k=y*s+x,t=clamp(n[k]*1.6-.3,0,.999)*(C.length-1),i=Math.floor(t),f=t-i;
    let col=[0,1,2].map(q=>lerp(C[i][q],C[Math.min(i+1,C.length-1)][q],f));const v=.85+sp[k]*.3;return col.map(q=>q*v)});
  if(blades){const x=c.getContext('2d');for(let i=0;i<500;i++){const bx=r()*s,by=r()*s,h=2+r()*4;x.strokeStyle=blades[Math.floor(r()*blades.length)];
    x.globalAlpha=.6;x.beginPath();x.moveTo(bx,by);x.lineTo(bx+(r()-.5)*2,by-h);x.stroke()}}
  return toTex(c)}

// grass tuft (alpha)
function mkTuftTex(cols,seed=9){const c=mkCanvas(64,64),x=c.getContext('2d'),r=mulberry(seed);x.lineCap='round';
  for(let i=0;i<40;i++){const bx=6+r()*52,h=18+r()*44,lean=(r()-.5)*26;x.strokeStyle=cols[Math.floor(r()*cols.length)];
    x.lineWidth=1.5+r()*2.2;x.beginPath();x.moveTo(bx,64);x.quadraticCurveTo(bx+lean*.2,64-h*.6,bx+lean,64-h);x.stroke()}
  const t=toTex(c);t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;return t}

// ivy (alpha)
function mkIvyTex(cols,seed=4){const c=mkCanvas(64,64),x=c.getContext('2d'),r=mulberry(seed);
  x.strokeStyle='#2c3a1c';x.lineWidth=1.2;for(let i=0;i<5;i++){x.beginPath();x.moveTo(r()*64,0);x.bezierCurveTo(r()*64,20,r()*64,44,r()*64,64);x.stroke()}
  for(let i=0;i<42;i++){const px=4+r()*56,py=4+r()*56,s=3+r()*4.5,a=r()*6.3;x.save();x.translate(px,py);x.rotate(a);
    x.fillStyle=cols[Math.floor(r()*cols.length)];for(let l=-1;l<=1;l++){x.beginPath();x.ellipse(l*s*.45,-Math.abs(l)*s*.15,s*.5,s*.8,l*.6,0,6.3);x.fill()}x.restore()}
  const t=toTex(c);t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;return t}

function mkGlowTex(stops,w=64,h=64,sy=1){const c=mkCanvas(w,h),x=c.getContext('2d');x.translate(w/2,h*(sy>1?.62:.5));x.scale(1,sy);
  const g=x.createRadialGradient(0,0,0,0,0,w/2);stops.forEach(s=>g.addColorStop(s[0],s[1]));x.fillStyle=g;x.fillRect(-w/2,-h,w,h*2);
  const t=new THREE.CanvasTexture(c);return t}

// 64×64 random values (red), blended linearly and repeating: sampled at a smoothstepped spot it gives value noise in a shader
function mkNoiseTex(){const s=64,r=mulberry(57),d=new Uint8Array(s*s*4);for(let i=0;i<s*s;i++)d[i*4]=r()*256|0;
  const t=new THREE.DataTexture(d,s,s,THREE.RGBAFormat);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=t.minFilter=THREE.LinearFilter;t.needsUpdate=true;return t}
const TEXC={};
function tex(key,fn){return TEXC[key]||(TEXC[key]=fn())}
