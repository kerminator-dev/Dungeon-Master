'use strict';
// ---------- walls: 25 cm voxels on a shared metre grid ----------
// A 1×1 m wall tile = 4×4 voxel columns. The brick pattern (0.5 × 0.25 m, bond offset
// by a quarter metre every other row) comes from world coords, so masonry is seamless at all
// joints and corners. Only voxel-to-air faces are drawn; dents, niches, through-holes
// and ragged tops are just removed voxels, always whole bricks.
const VX=.25,BH=.25,BL=.5;
const BASE=-.25;              // bottom row slightly below the floor
let BD=1;                     // wall axis to face (= WT/2, set in setGeom)
const _v=new THREE.Vector3(),_q=new THREE.Quaternion(),_e=new THREE.Euler(),_s=new THREE.Vector3();
const WALL_MIN=2.3;            // no wall goes lower, or it looks climbable

// brick with chipped corners, only for floor rubble
function roughBox(sx,sy,sz,amp,chamf,seed){const g=new THREE.BoxGeometry(1,1,1,sx,sy,sz),p=g.attributes.position;
  const h=(x,y,z,k)=>{const s=Math.sin(x*127.1+y*311.7+z*74.7+seed*13.37+k*91.3)*43758.5453;return (s-Math.floor(s))*2-1};
  for(let i=0;i<p.count;i++){let x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    const ex=Math.abs(x)>.49,ey=Math.abs(y)>.49,ez=Math.abs(z)>.49,e=ex+ey+ez;
    const c=e===3?chamf*(1+.35*h(x,y,z,4)):e===2?chamf*.4*(1+.5*h(x,y,z,5)):0;
    x+=h(x,y,z,1)*amp-(ex?Math.sign(x)*c:0);y+=h(x,y,z,2)*amp*.7-(ey?Math.sign(y)*c:0);z+=h(x,y,z,3)*amp-(ez?Math.sign(z)*c:0);
    p.setXYZ(i,x,y,z)}
  g.computeVertexNormals();return g}

// static instances (bricks, props, decor) in chunks so culling works. instance() only notes them down, flushStatic() makes
// the meshes once the level (or the ring beyond the grates) is built: per parent, material and chunk, the variants with
// only a few instances there are baked together into one plain mesh, the rest stay instanced. a chunk then costs a draw
// call or two per material instead of one per variant of every prop
let CHUNK=12;
const BAKE_MAX=3;   // a variant with this many instances in a chunk, or fewer, is baked
function instance(parent,list,geos,mat,cullFar=true,chunk=CHUNK){if(!list.length)return;
  (W.statics||(W.statics=[])).push({parent,list,geos,mat,cullFar,ch:cullFar?(TH.indoor?Math.min(chunk,12):chunk):1e9})}
function flushStatic(){const groups=new Map(),welded=new Map(),weldOf=g=>{let w=welded.get(g);if(!w)welded.set(g,w=weld(g));return w};
  for(const s of W.statics||[])for(const b of s.list){const k=s.parent.uuid+s.mat.uuid+'|'+s.ch+'|'+Math.floor(b.x/s.ch)+'|'+Math.floor(b.z/s.ch),geo=weldOf(s.geos[b.v]);
    let g=groups.get(k);if(!g)groups.set(k,g={s,vars:new Map()});let a=g.vars.get(geo);if(!a)g.vars.set(geo,a=[]);a.push(b)}
  W.statics=[];
  // det = small stuff: shorter draw distance outdoors
  const add=(s,m,c,r)=>{s.parent.add(m);if(s.cullFar){m.userData.c=c;m.userData.r=r;m.userData.det=1;W.cull.push(m)}};
  for(const {s,vars} of groups.values()){const few=[];
    for(const [src,a] of vars){if(a.length<=BAKE_MAX){for(const b of a)few.push([src,b]);continue}
      const g=new THREE.BufferGeometry();for(const nm in src.attributes)g.setAttribute(nm,src.attributes[nm]);g.setIndex(src.index);
      const im=new THREE.InstancedMesh(g,s.mat,a.length),box=new THREE.Box3();
      a.forEach((b,i)=>{im.setMatrixAt(i,b.m);im.setColorAt(i,b.c);box.expandByPoint(_v.set(b.x,b.y,b.z))});
      box.expandByScalar(1);g.boundingBox=box;g.boundingSphere=box.getBoundingSphere(new THREE.Sphere());
      im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;add(s,im,g.boundingSphere.center,g.boundingSphere.radius)}
    if(!few.length)continue;
    // baked colours need vertex colours on: a material without them gets a twin that has them
    const mat=s.mat.vertexColors?s.mat:s.mat.userData.vc||(s.mat.userData.vc=Object.assign(s.mat.clone(),{vertexColors:true})),geo=bakeInstances(few,s.mat);
    add(s,new THREE.Mesh(geo,mat),geo.boundingSphere.center,geo.boundingSphere.radius)}}
// merged parts come as loose triangles, a flat quad repeating two of its corners: list each distinct corner once, indexed
// (the same triangles, a third fewer corners for the gpu to light). 16-bit indices only up to 65534, here and below:
// webgl2 reads 65535 as a primitive restart
function weld(src){if(src.index)return src;const A=src.attributes,names=Object.keys(A),n=A.position.count,seen=new Map(),keep=[],idx=new (n>65535?Uint32Array:Uint16Array)(n);
  for(let i=0;i<n;i++){let k='';for(const nm of names){const a=A[nm];for(let c=0;c<a.itemSize;c++)k+=a.array[i*a.itemSize+c]+','}
    let j=seen.get(k);if(j===undefined){seen.set(k,j=keep.length);keep.push(i)}idx[i]=j}
  const g=new THREE.BufferGeometry();
  for(const nm of names){const a=A[nm],s=a.itemSize,out=new a.array.constructor(keep.length*s);keep.forEach((i,j)=>{for(let c=0;c<s;c++)out[j*s+c]=a.array[i*s+c]});g.setAttribute(nm,new THREE.BufferAttribute(out,s,a.normalized))}
  g.setIndex(new THREE.BufferAttribute(idx,1));return g}
// one plain geometry from instances [geometry, {m matrix, c colour}]: corners and normals moved into place, the instance colour
// times the geometry's own (where the material uses those), uv and glow (emit) kept. stored compact like the masonry:
// byte normals and colours, half-float uv
function bakeInstances(items,mat){let nv=0,ni=0;
  for(const [g] of items){nv+=g.attributes.position.count;ni+=g.index.count}
  const vc=mat.vertexColors,P=new Float32Array(nv*3),N=new Int8Array(nv*4),C=new Uint8Array(nv*4),U=mat.map?new Float32Array(nv*2):null,
    E=items.some(([g])=>g.attributes.emit)?new Float32Array(nv):null,I=nv>65535?new Uint32Array(ni):new Uint16Array(ni),v=new THREE.Vector3(),nm=new THREE.Matrix3();
  let o=0,q=0;
  for(const [g,b] of items){const A=g.attributes,p=A.position,n=A.normal,c=vc&&A.color,uv=A.uv,e=A.emit,k=p.count;nm.getNormalMatrix(b.m);
    for(let i=0;i<k;i++){const j=o+i;v.fromBufferAttribute(p,i).applyMatrix4(b.m);P[j*3]=v.x;P[j*3+1]=v.y;P[j*3+2]=v.z;
      v.fromBufferAttribute(n,i).applyMatrix3(nm).normalize();N[j*4]=Math.round(v.x*127);N[j*4+1]=Math.round(v.y*127);N[j*4+2]=Math.round(v.z*127);
      C[j*4]=clamp(Math.round((c?c.getX(i):1)*b.c.r*255),0,255);C[j*4+1]=clamp(Math.round((c?c.getY(i):1)*b.c.g*255),0,255);C[j*4+2]=clamp(Math.round((c?c.getZ(i):1)*b.c.b*255),0,255);C[j*4+3]=255;
      if(U&&uv){U[j*2]=uv.getX(i);U[j*2+1]=uv.getY(i)}if(E&&e)E[j]=e.getX(i)}
    for(let i=0;i<g.index.count;i++)I[q++]=o+g.index.getX(i);
    o+=k}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(P,3));geo.setAttribute('normal',new THREE.BufferAttribute(N,4,true));
  geo.setAttribute('color',new THREE.BufferAttribute(C,4,true));if(E)geo.setAttribute('emit',new THREE.BufferAttribute(E,1));
  if(U)geo.setAttribute('uv',renderer.capabilities.isWebGL2?new THREE.Float16BufferAttribute(Uint16Array.from(U,THREE.DataUtils.toHalfFloat),2):new THREE.BufferAttribute(U,2));
  geo.setIndex(new THREE.BufferAttribute(I,1));geo.computeBoundingSphere();return geo}
function pushInst(arr,x,y,z,rx,ry,rz,sx,sy,sz,c,v){const m=new THREE.Matrix4();
  m.compose(_v.set(x,y,z),_q.setFromEuler(_e.set(rx,ry,rz,'YXZ')),_s.set(sx,sy,sz));arr.push({m,c,v,x,y,z})}

function wallTop(x,z){if(TH.indoor)return TH.H+1.0;
  let h=TH.wallH+.4*Noise.n2(x*.33+9,z*.33)+.2*Noise.n2(x*1.3,z*1.3+4);
  const b=Noise.n2(x*.11+50,z*.11-20);if(b>.12)h-=(b-.12)*3.5;   // large breaches from the top
  return Math.max(h,WALL_MIN+.3)}

const hash=(a,b,c,d)=>{const s=Math.sin(a*127.1+b*311.7+c*74.7+d*269.5)*43758.5453;return s-Math.floor(s)};

// ---------- compact quad meshes: masonry and flagstones ----------
// a face is one quad: 4 corners and 6 indices, a third fewer corners than two loose triangles. a corner keeps a float
// position, a byte normal and a byte colour (4 bytes each, the stride the gpu wants) and a half-float uv: 24 bytes, not 44
const QV=new Float64Array(12),QC=new Float64Array(12),QU=new Float64Array(8);   // the quad being made: corners, colours, uv
function quadCorner(j,x,y,z,r,g,b,u,v){QV[j*3]=x;QV[j*3+1]=y;QV[j*3+2]=z;QC[j*3]=r;QC[j*3+1]=g;QC[j*3+2]=b;QU[j*2]=u;QU[j*2+1]=v}
const quadBuf=()=>({n:0,ni:0,cap:0});
function quadGrow(b){const cap=Math.max(1024,b.cap*2),up=(A,k,o)=>{const a=new A(cap*k);if(o)a.set(o);return a};
  b.p=up(Float32Array,3,b.p);b.nm=up(Int8Array,4,b.nm);b.c=up(Uint8Array,4,b.c);b.uv=up(Uint16Array,2,b.uv);b.ix=up(Uint32Array,1.5,b.ix);b.cap=cap}
// uv on these faces is 0, .5 or 1, exact as a half float
const half=v=>v===0?0:v===.5?0x3800:v===1?0x3C00:THREE.DataUtils.toHalfFloat(v);
const unhalf=h=>{const e=h>>10&31,m=h&1023;return (h>>15?-1:1)*(e?Math.pow(2,e-15)*(1+m/1024):m/16777216)};
// add the quad in QV/QC/QU, normal (nx,ny,nz), wound to face the normal. grow: widened a hair in its plane, which closes
// the hairline gaps at T-joints of the masonry
function quadEmit(b,nx,ny,nz,grow){if(b.n+4>b.cap)quadGrow(b);
  if(grow)for(let i=0;i<3;i++){if(i===0?nx:i===1?ny:nz)continue;const c=(QV[i]+QV[6+i])/2;for(let j=0;j<4;j++)QV[j*3+i]+=Math.sign(QV[j*3+i]-c)*.003}
  const e1x=QV[3]-QV[0],e1y=QV[4]-QV[1],e1z=QV[5]-QV[2],e2x=QV[9]-QV[0],e2y=QV[10]-QV[1],e2z=QV[11]-QV[2],
    cr=(e1y*e2z-e1z*e2y)*nx+(e1z*e2x-e1x*e2z)*ny+(e1x*e2y-e1y*e2x)*nz,k=b.n,ix=b.ix,m=b.ni;
  for(let j=0;j<4;j++){const i=k+j;b.p[i*3]=QV[j*3];b.p[i*3+1]=QV[j*3+1];b.p[i*3+2]=QV[j*3+2];b.nm[i*4]=nx*127;b.nm[i*4+1]=ny*127;b.nm[i*4+2]=nz*127;
    b.c[i*4]=clamp(Math.round(QC[j*3]*255),0,255);b.c[i*4+1]=clamp(Math.round(QC[j*3+1]*255),0,255);b.c[i*4+2]=clamp(Math.round(QC[j*3+2]*255),0,255);b.c[i*4+3]=255;
    b.uv[i*2]=half(QU[j*2]);b.uv[i*2+1]=half(QU[j*2+1])}
  if(cr>=0){ix[m]=k;ix[m+1]=k+1;ix[m+2]=k+2;ix[m+3]=k;ix[m+4]=k+2;ix[m+5]=k+3}else{ix[m]=k;ix[m+1]=k+2;ix[m+2]=k+1;ix[m+3]=k;ix[m+4]=k+3;ix[m+5]=k+2}
  b.n+=4;b.ni+=6}
function quadGeo(b){const n=b.n,g=new THREE.BufferGeometry(),uv=b.uv.subarray(0,n*2);
  g.setAttribute('position',new THREE.BufferAttribute(b.p.slice(0,n*3),3));
  g.setAttribute('normal',new THREE.BufferAttribute(b.nm.slice(0,n*4),4,true));
  g.setAttribute('color',new THREE.BufferAttribute(b.c.slice(0,n*4),4,true));
  g.setAttribute('uv',renderer.capabilities.isWebGL2?new THREE.Float16BufferAttribute(uv,2):new THREE.BufferAttribute(Float32Array.from(uv,unhalf),2));
  g.setIndex(new THREE.BufferAttribute(n>65535?b.ix.slice(0,b.ni):Uint16Array.from(b.ix.subarray(0,b.ni)),1));
  g.computeBoundingSphere();return g}

function buildWalls(root,mats){
  const P=TH.brick.map(c=>new THREE.Color(c)),odd=new THREE.Color(TH.odd),moss=TH.mossCol?new THREE.Color(TH.mossCol):null,snow=new THREE.Color('#eef3fa');
  const TW=W.TW,NX=TW*4,NZ=TW*4,topMax=TH.indoor?TH.H+CW/2+.6:TH.wallH+1.4,NY=Math.ceil((topMax-BASE)/VX)+1;
  const vox=new Uint8Array(NX*NZ*NY),I=(x,y,z)=>(x*NZ+z)*NY+y;
  const solid=(x,y,z)=>x>=0&&z>=0&&y>=0&&x<NX&&z<NZ&&y<NY&&vox[I(x,y,z)]===1;
  const vy=y=>Math.floor((y-BASE)/VX),isT=(tx,tz)=>tx>=0&&tz>=0&&tx<TW&&tz<TW&&W.tile[tx*TW+tz]>0;
  const loose=[];W.tops=[];W.niches=[];W.faces=[];W.minWallH=99;

  // brick colour from its index, same for both halves; made in BC, the colour of the face being built
  const BC=new THREE.Color();
  const brickCol=(k1,k2,k3,k4,y,top)=>{const h=hash(k1,k2,k3,k4),c=BC.copy(P[Math.floor(h*P.length)]).lerp(P[Math.floor(hash(k4,k1,k3,k2)*P.length)],.4);
    c.multiplyScalar(1+(hash(k2,k4,k1,k3)*2-1)*TH.brickVar);if(hash(k3,k2,k4,k1)<.05)c.lerp(odd,.5);
    if(moss){if(y<1.1)c.lerp(moss,hash(k1,k3,k2,k4)*TH.moss*(1-y/1.1)*.75);if(top)c.lerp(moss,hash(k2,k1,k4,k3)*.4*TH.moss)}
    if(TH.indoor)c.multiplyScalar(lerp(.85,1,clamp(y/2,0,1)));return c};
  const randCol=()=>pick(P).clone().multiplyScalar(rr(.85,1.1));

  // fallen brick + crumbs: scattered randomly on the floor
  const fallen=(x,z,c)=>{const t=rnd(),ry=rr(0,6.28);let rx=0,rz=0,sx=BL*rr(.82,.98),sy=BH,sz=BL*.5*rr(.9,1),yh;
    if(rnd()<.35)sx*=rr(.4,.65);
    if(t<.55){rx=rr(-.1,.1);rz=rr(-.1,.1);yh=sy/2}else if(t<.8){rx=Math.PI/2+rr(-.12,.12);yh=sz/2}else{rx=rr(.25,.6);rz=rr(-.2,.2);yh=sy/2+Math.sin(rx)*sz*.5}
    if(blocked(x,z))return;
    pushInst(loose,x,floorH(x,z)+yh-.03,z,rx,ry,rz,sx,sy,sz,c.clone().multiplyScalar(rr(.7,.92)),ri(0,1));
    for(let i=ri(0,3);i>0;i--){const s=rr(.05,.13),cx=x+rr(-.4,.4),cz=z+rr(-.4,.4);if(blocked(cx,cz))continue;
      pushInst(loose,cx,floorH(cx,cz)+s*.25,cz,rr(0,6),rr(0,6),rr(0,6),s*rr(1,1.8),s*.8,s,c.clone().multiplyScalar(rr(.55,.85)),ri(0,1))}};

  // 1) fill wall tiles
  for(let tx=0;tx<TW;tx++)for(let tz=0;tz<TW;tz++){const t=W.tile[tx*TW+tz];if(!t||t===5)continue;   // 5 = the real maze area inside the "continuation"
    const cx=tx+.5,cz=tz+.5;let top=TH.indoor?topMax:t===3?Math.max(wallTop(cx,cz),W.exitArch.top+.7):wallTop(cx,cz);
    if(!TH.indoor){// wall ends crumble
      if(tx%CS<WT&&tz%CS<WT)top-=W.crumAt([Math.floor(tx/CS),Math.floor(tz/CS)]);
      top=Math.max(top,WALL_MIN+.25)}
    const alongZ=isT(tx,tz+1)||isT(tx,tz-1),tv=Math.max(4,vy(top));
    for(let a=0;a<4;a++)for(let b=0;b<4;b++){const x=tx*4+(alongZ?b:a),z=tz*4+(alongZ?a:b);
      let h=tv;
      if(!TH.indoor){// ragged top: brick by brick along the wall, sometimes one side only
        const br=(a+((tv&1)?1:0))>>1,dr=hash(tx,tz,br,7);h-=dr<.45?0:dr<.75?1:dr<.92?2:3;
        if(hash(tx,tz,br,b<2?3:4)<.22)h--;
        h=Math.max(h,vy(WALL_MIN)+1)}
      W.minWallH=Math.min(W.minWallH,BASE+Math.min(h,NY)*VX);
      for(let y=0;y<Math.min(h,NY);y++)vox[I(x,y,z)]=1}}
  // arches: round-topped opening through the whole wall (nothing visible past the portal)
  for(const A of W.wins||[]){const ax=Math.abs(A.d[0])>.5;                      // windows: from sill to round top
    for(let x=A.x0*4;x<A.x1*4;x++)for(let z=A.z0*4;z<A.z1*4;z++){const c=ax?(z+.5)*VX-A.cz:(x+.5)*VX-A.cx,
        al=((x+.5)*VX-A.cx)*A.d[0]+((z+.5)*VX-A.cz)*A.d[1]+WT/2,sp=Math.max(0,al-.5)*.3,w=A.w+2*sp;   // flared outward for a wider view
      if(Math.abs(c)>=w/2)continue;const yt=A.hs+sp+Math.sqrt(Math.max(0,w*w/4-c*c));
      for(let y=0;y<NY;y++){const yy=BASE+(y+.5)*VX;if(yy>A.sill&&yy<yt)vox[I(x,y,z)]=0}}}
  for(const A of W.arches){const ax=Math.abs(A.d[0])>.5;
    for(let x=A.x0*4;x<A.x1*4;x++)for(let z=A.z0*4;z<A.z1*4;z++){const c=ax?(z+.5)*VX-A.cz:(x+.5)*VX-A.cx;if(Math.abs(c)>=A.w/2)continue;
      const yt=A.hs+Math.sqrt(Math.max(0,A.w*A.w/4-c*c));for(let y=0;y<NY&&BASE+(y+.5)*VX<yt;y++)vox[I(x,y,z)]=0}}
  const any=(x,y,z)=>y<0||x>=0&&z>=0&&x<NX&&z<NZ&&y<NY&&vox[I(x,y,z)]>0;

  // 1b) dungeons get a stepped brick vault: each higher row overhangs 25 cm into the corridor
  if(TH.indoor){const D=new Uint16Array(NX*NZ),INF=999;
    for(let x=0;x<NX;x++)for(let z=0;z<NZ;z++)D[x*NZ+z]=isT(x>>2,z>>2)?0:INF;
    for(let x=0;x<NX;x++)for(let z=0;z<NZ;z++){let d=D[x*NZ+z];if(!d)continue;
      for(const [a,b] of [[-1,0],[0,-1],[-1,-1],[1,-1]]){const u=x+a,v=z+b;if(u>=0&&v>=0&&u<NX)d=Math.min(d,D[u*NZ+v]+1)}D[x*NZ+z]=d}
    for(let x=NX-1;x>=0;x--)for(let z=NZ-1;z>=0;z--){let d=D[x*NZ+z];if(!d)continue;
      for(const [a,b] of [[1,0],[0,1],[1,1],[-1,1]]){const u=x+a,v=z+b;if(u>=0&&v<NZ&&u<NX)d=Math.min(d,D[u*NZ+v]+1)}D[x*NZ+z]=d}
    const y0=vy(TH.H);W.vaultD=(x,z)=>{const a=Math.floor(x/VX),b=Math.floor(z/VX);return a<0||b<0||a>=NX||b>=NZ?INF:D[a*NZ+b]};
    for(let x=0;x<NX;x++)for(let z=0;z<NZ;z++){const d=D[x*NZ+z];if(!d||d>=INF)continue;
      for(let y=y0+d-1;y<NY;y++)vox[I(x,y,z)]=1;
      // occasional missing brick in the vault
      if(hash(x>>1,z,d,13)<.02){vox[I(x,y0+d-1,z)]=0;if(y0+d<NY)vox[I(x,y0+d,z)]=0}}
    // light wells: a hole in the vault over the corridor centre lets in a shaft of light
    W.shafts=[];const n=W.n;
    for(let k=0;k<Math.max(3,Math.round(n*n/11));k++){const i=ri(0,n-1),j=ri(0,n-1);if(i+j<2||i===W.exitCell.i&&j===W.exitCell.j)continue;
      const c=warp(i+.5+rr(-.15,.15),j+.5+rr(-.15,.15));if(W.shafts.some(s=>Math.hypot(s.x-c[0],s.z-c[1])<CS*2))continue;
      const cx=Math.floor(c[0]/VX),cz=Math.floor(c[1]/VX),r=Math.max(1,Math.round(CW/2/VX*.35));
      for(let x=cx-r;x<=cx+r;x++)for(let z=cz-r;z<=cz+r;z++){if(x<0||z<0||x>=NX||z>=NZ||isT(x>>2,z>>2))continue;
        const edge=Math.abs(x-cx)===r||Math.abs(z-cz)===r;if(edge&&hash(x,z,k,41)<.4)continue;for(let y=y0;y<NY;y++)vox[I(x,y,z)]=0}
      W.shafts.push({x:(cx+.5)*VX,z:(cz+.5)*VX,r:(r+.5)*VX,top:topMax})}}

  // 2 × 0.75 m recess (top corners trimmed), 0.75 m deep; edges on whole bricks
  W.crypts=[];
  const carveCrypt=(sg,sp,nx,nz)=>{const p=sg.at(sp.s),t=sg.at(0),ax=Math.abs(t.tx)>.5,cb=vy(.5),n=Math.round(2*sp.ru/VX);
    const u0=Math.round(((ax?p.x:p.z)-sp.ru)/BL)*2;
    for(let q=0;q<n;q++)for(let c=cb;c<cb+4;c++){if(c===cb+3&&(q<2||q>=n-2))continue;
      for(let k=0;k<3;k++){const w=Math.floor(((ax?p.z:p.x)+(ax?nz:nx)*(BD-VX/2-k*VX))/VX),x=ax?u0+q:w,z=ax?w:u0+q;if(solid(x,c,z))vox[I(x,c,z)]=0}}
    const cu=(u0+n/2)*VX,d=BD-.4;
    W.crypts.push({x:(ax?cu:p.x)+nx*d,z:(ax?p.z:cu)+nz*d,y:BASE+cb*VX,nx,nz,tx:t.tx,tz:t.tz,fx:(ax?cu:p.x)+nx*BD,fz:(ax?p.z:cu)+nz*BD})};
  // 2) dents in wall faces (by brick), niches, through-holes
  for(const sg of W.segs){const L=sg.len,mid=sg.at(L/2);
    let outSide=0;if(sg.outer){const g=toGrid(mid.x-mid.tz*2,mid.z+mid.tx*2);outSide=(g[0]<0||g[1]<0||g[0]>W.n||g[1]>W.n)?1:-1}
    const spots=[[],[]];
    for(let f=0;f<2;f++){const side=f?1:-1;if(side===outSide||L<WT+1.2)continue;
      for(let u=0;u<Math.max(1,Math.round(L/CS));u++){
        if(rnd()<TH.dmg)spots[f].push({s:0,y:rnd()<.3?rr(.05,.5):rr(.4,2),ru:rr(.3,.85),rv:rr(.25,.6)});
        if(rnd()<TH.dmg*.4)spots[f].push({s:0,y:rr(.2,2),ru:rr(.25,.6),rv:rr(.2,.45)})}
      for(const sp of spots[f])sp.s=rr(BD+sp.ru,Math.max(BD+sp.ru+.01,L-BD-sp.ru));
      spots[f]=spots[f].filter(sp=>{const p=sg.at(sp.s);return !W.arches.some(A=>p.x>A.x0-sp.ru-.6&&p.x<A.x1+sp.ru+.6&&p.z>A.z0-sp.ru-.6&&p.z<A.z1+sp.ru+.6)})}
    if(!sg.outer)for(const sp of spots[0])if(rnd()<.2&&sp.ru<.7){sp.thru=1;spots[1].push(sp)}
    // burial niches (Skyrim-style): long recess in the wall holding a mummy or skeleton
    if(TH.crypts)for(let f=0;f<2;f++){const side=f?1:-1,len=2;if(side===outSide||L<WT+len+.8)continue;
      for(let u=0;u<Math.max(1,Math.round(L/CS));u++){if(rnd()>TH.crypts)continue;const s=rr(BD+len/2+.3,L-BD-len/2-.3),p=sg.at(s);
        const near=sp=>Math.abs(sp.s-s)<sp.ru+len/2+.25;     // regular dents yield to a niche, through-holes do not
        if(spots[f].some(sp=>near(sp)&&(sp.thru||sp.crypt))||[...W.arches,...(W.wins||[])].some(A=>p.x>A.x0-len/2-.8&&p.x<A.x1+len/2+.8&&p.z>A.z0-len/2-.8&&p.z<A.z1+len/2+.8))continue;
        spots[f]=spots[f].filter(sp=>!near(sp));spots[f].push({s,y:.9,ru:len/2,rv:.5,crypt:1})}}
    for(let f=0;f<2;f++){const side=f?1:-1,nx=-sg.at(0).tz*side,nz=sg.at(0).tx*side;
      W.faces.push({sg,side,outer:side===outSide,spots:spots[f]});
      for(const sp of spots[f]){if(sp.crypt){carveCrypt(sg,sp,nx,nz);continue}const removed=new Set();let lowC=99;
        for(let s=sp.s-sp.ru-.3;s<=sp.s+sp.ru+.3;s+=VX/2)for(let c=Math.max(0,vy(sp.y-sp.rv-.3));c<=vy(sp.y+sp.rv+.3);c++){
          const du=(s-sp.s)/sp.ru,dv=(BASE+(c+.5)*VX-sp.y)/sp.rv,d=du*du+dv*dv,p=sg.at(s);
          const depth=sp.thru?(d<.7?Math.round(WT/VX):d<1?1:0):d<.3&&hash(c,s*4|0,3,9)<.6?2:1;
          for(let k=0;k<depth;k++){const wx=p.x+nx*(BD-VX/2-k*VX),wz=p.z+nz*(BD-VX/2-k*VX),x=Math.floor(wx/VX),z=Math.floor(wz/VX);
            if(!solid(x,c,z))continue;
            const u=Math.abs(nx)>.5?z:x,first=((u+(c&1))&1)===0,thr=1-.45*hash(x>>1,z>>1,c,5);
            if(d>=thr&&!(sp.thru&&d<.7))continue;
            vox[I(x,c,z)]=0;const pu=first?u+1:u-1,px=Math.abs(nx)>.5?x:pu,pz=Math.abs(nx)>.5?pu:z;if(solid(px,c,pz))vox[I(px,c,pz)]=0;
            const key=Math.min(u,pu)+'|'+c+'|'+k;if(!removed.has(key)){removed.add(key);if(k===0&&rnd()<.6){const q=sg.at(s);fallen(q.x+nx*(BD+rr(.25,1)),q.z+nz*(BD+rr(.25,1)),randCol())}}
            if(Math.abs(s-sp.s)<.2&&c<lowC)lowC=c}}
        if(!sp.thru&&lowC<99){const p=sg.at(sp.s),y=BASE+lowC*VX;if(y<wallTop(p.x,p.z)-.6)
          W.niches.push({x:p.x+nx*(BD-.15),y,z:p.z+nz*(BD-.15),nx,nz,r:Math.min(sp.ru,sp.rv),bottom:lowC})}}}}

  // 2b) bricks knocked out at some wall corners (the weakest spot of masonry)
  const yMax=TH.indoor?vy(TH.H)-1:NY;
  for(let tx=0;tx<TW;tx++)for(let tz=0;tz<TW;tz++){if(W.tile[tx*TW+tz]!==1)continue;
    for(let x=tx*4;x<tx*4+4;x++)for(let z=tz*4;z<tz*4+4;z++)for(const [sx,sz] of [[1,1],[1,-1],[-1,1],[-1,-1]]){
      if(any(x+sx,1,z)||any(x,1,z+sz))continue;                     // not an outer corner
      for(let y=1;y<yMax;y++){if(!solid(x,y,z)||!solid(x,y+1,z)||hash(x,z,y,21)>.2)continue;
        const alongX=hash(x,z,y,22)<.5,u=alongX?x:z,first=((u+(y&1))&1)===0,pu=first?u+1:u-1;
        vox[I(x,y,z)]=0;const px=alongX?pu:x,pz=alongX?z:pu;if(solid(px,y,pz))vox[I(px,y,pz)]=0;
        if(hash(x,z,y,23)<.35&&solid(x-sx*(alongX?0:1),y,z-sz*(alongX?1:0)))vox[I(x-sx*(alongX?0:1),y,z-sz*(alongX?1:0))]=0;
        if(rnd()<.5)fallen(x*VX+sx*rr(.4,1),z*VX+sz*rr(.4,1),randCol())}}}

  // 2c) settle the wall pits now that every dent and hole is cut: a later dent, or a through-hole from the other face,
  // may have knocked out the bricks a pit was standing on, leaving its skull or candle in the air. each pit drops to the
  // brick under its centre (or climbs onto a brick left in its place); one with no brick under it down to the floor is no pit any more
  W.niches=W.niches.filter(n=>{const x=Math.floor(n.x/VX),z=Math.floor(n.z/VX);let c=vy(n.y+.05);for(let k=0;k<2&&solid(x,c,z);k++)c++;if(solid(x,c,z))return false;
    while(c>1&&!solid(x,c-1,z))c--;if(c<=1)return false;n.y=BASE+c*VX;n.bottom=c;return true});
  // two dents that overlap leave two pits on one ledge, a hand's width apart: only the wider one is kept, so a ledge
  // never holds a skull and a candle (or coins) side by side, one sunk into the other
  const N0=W.niches,wider=(m,n)=>m.r>n.r||(m.r===n.r&&N0.indexOf(m)<N0.indexOf(n));
  W.niches=N0.filter(n=>!N0.some(m=>m!==n&&wider(m,n)&&Math.abs(m.y-n.y)<.2&&Math.hypot(m.x-n.x,m.z-n.z)<.55));
  W.wallSolid=(x,y,z)=>solid(Math.floor(x/VX),vy(y),Math.floor(z/VX));   // for tests


  // 3) face mesh: a quad per brick face, each corner darkened by the voxels next to it (AO)
  const WCH=TH.indoor?6:8,bufs=new Map(),buf=(x,z)=>{const k=Math.floor(x/WCH)*4096+Math.floor(z/WCH);let b=bufs.get(k);if(!b)bufs.set(k,b=quadBuf());return b};
  const AO=[.4,.6,.8,1];
  // corner AO: the voxels of the layer in front of the face (x,y,z) along both tangents (a and b) and diagonally
  const ao=(x,y,z,ax,ay,az,bx,by,bz)=>{const a=any(x+ax,y+ay,z+az),b=any(x+bx,y+by,z+bz);return AO[a&&b?0:3-a-b-any(x+ax+bx,y+ay+by,z+az+bz)]};
  const corner=(j,x,y,z,k,u,v)=>quadCorner(j,x,y,z,BC.r*k,BC.g*k,BC.b*k,u,v);
  const dirs=[[1,0,0],[-1,0,0],[0,0,1],[0,0,-1],[0,1,0],[0,-1,0]];
  // masonry voxel faces
  const emitTile=(tx,tz)=>{
    for(let x=tx*4;x<tx*4+4;x++)for(let z=tz*4;z<tz*4+4;z++)for(let y=0;y<NY;y++){if(vox[I(x,y,z)]!==1)continue;
      const X0=x*VX,X1=X0+VX,Y0=BASE+y*VX,Y1=Y0+VX,Z0=z*VX,Z1=Z0+VX,b=buf(X0,Z0);
      for(let k=0;k<6;k++){const dx=dirs[k][0],dy=dirs[k][1],dz=dirs[k][2];if(solid(x+dx,y+dy,z+dz))continue;
        if(dy<0&&y===0||dy>0&&TH.indoor&&y===NY-1)continue;
        if(dy===0){// side face: a brick spans two voxels
          const ax=dx!==0,u=ax?z:x,c=y,first=((u+(c&1))&1)===0,pu=first?u+1:u-1;
          const px=ax?x:pu,pz=ax?pu:z,pExp=solid(px,y,pz)&&!solid(px+dx,y,pz+dz);
          if(pExp&&!first)continue;
          const u0=first?u:u-1,uu0=pExp?u0:u,uu1=pExp?u0+2:u+1;   // in voxels along the face
          const plane=ax?(dx>0?X1:X0):(dz>0?Z1:Z0),edge=Math.abs(plane-Math.round(plane))<1e-6;
          brickCol(ax?1:2,Math.round(plane*4),c,(u0+(c&1))>>1,Y0,false);if(!edge)BC.multiplyScalar(.7);
          const ua=(uu0-u0)*.5,ub=ua+(uu1-uu0)*.5,s0=uu0*VX,s1=uu1*VX;
          // its two ends (the first and the last voxel along it) seen from the layer in front; t: the tangent along the face
          const tx=ax?0:1,tz=ax?1:0,lx=(ax?x:uu0)+dx,lz=(ax?uu0:z)+dz,rx=(ax?x:uu1-1)+dx,rz=(ax?uu1-1:z)+dz;
          corner(0,ax?plane:s0,Y0,ax?s0:plane,ao(lx,y,lz,-tx,0,-tz,0,-1,0),ua,0);corner(1,ax?plane:s1,Y0,ax?s1:plane,ao(rx,y,rz,tx,0,tz,0,-1,0),ub,0);
          corner(2,ax?plane:s1,Y1,ax?s1:plane,ao(rx,y,rz,tx,0,tz,0,1,0),ub,1);corner(3,ax?plane:s0,Y1,ax?s0:plane,ao(lx,y,lz,-tx,0,-tz,0,1,0),ua,1);
          quadEmit(b,dx,0,dz,true)}
        else{const yy=dy>0?Y1:Y0,fy=y+dy;brickCol(3,x>>1,z>>1,y,Y0,dy>0);
          if(dy<0)BC.multiplyScalar(.7);
          else if(!TH.indoor){if(TH.snow)BC.lerp(snow,.85);if(hash(x,z,y,11)<.06)W.tops.push({x:X0+VX/2,y:yy,z:Z0+VX/2})}
          const ua=(x&1)*.5,va=(z&1)*.5;
          corner(0,X0,yy,Z0,ao(x,fy,z,-1,0,0,0,0,-1),ua,va);corner(1,X1,yy,Z0,ao(x,fy,z,1,0,0,0,0,-1),ua+.5,va);
          corner(2,X1,yy,Z1,ao(x,fy,z,1,0,0,0,0,1),ua+.5,va+.5);corner(3,X0,yy,Z1,ao(x,fy,z,-1,0,0,0,0,1),ua,va+.5);
          quadEmit(b,0,dy,0,true)}}}};
  for(let tx=0;tx<TW;tx++)for(let tz=0;tz<TW;tz++)if(W.tile[tx*TW+tz]||TH.indoor)emitTile(tx,tz);
  W.wallTris=0;
  for(const b of bufs.values())if(b.n){const g=quadGeo(b),m=new THREE.Mesh(g,mats.wall);root.add(m);m.userData.c=g.boundingSphere.center;m.userData.r=g.boundingSphere.radius;
    W.wallTris+=b.n/2;W.cull.push(m)}

  // sparse debris along walls and at crumbled ends
  for(const fc of W.faces){if(fc.outer)continue;const L=fc.sg.len,a=fc.sg.at(0),nx=-a.tz*fc.side,nz=a.tx*fc.side;
    for(let i=0;i<2*Math.max(1,Math.round(L/CS));i++)if(rnd()<.25){const p=fc.sg.at(rr(.5,L-.5)),d=BD+rr(.2,1.2);fallen(p.x+nx*d,p.z+nz*d,randCol())}}
  if(!TH.indoor)for(let i=0;i<=W.n;i++)for(let j=0;j<=W.n;j++){const c=W.crumAt([i,j]);if(!c)continue;const p=warp(i,j);
    for(let k=ri(1,4);k>0;k--){const a=rr(0,6.28),d=rr(.8,1.6);fallen(p[0]+Math.cos(a)*d,p[1]+Math.sin(a)*d,randCol())}}

  const looseGeos=[0,1].map(i=>roughBox(1,1,1,.05,.1,i+7));
  instance(root,loose,looseGeos,mats.brick,true,CHUNK*2);
  W.looseCount=loose.length}
