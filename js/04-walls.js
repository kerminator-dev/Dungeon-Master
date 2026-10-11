'use strict';
// ---------- стены: воксели 25 см на общей метровой сетке ----------
// Плитка стены 1×1 м = 4×4 столбика вокселей. Рисунок кирпичей (0.5 × 0.25 м, перевязка со сдвигом
// на четверть метра через ряд) считается от мировых координат, поэтому кладка непрерывна на любых
// стыках и углах. Рисуются только грани между вокселем и пустотой; выбоины, ниши, сквозные дыры
// и рваный верх — это просто убранные воксели, всегда целыми кирпичами.
const VX=.25,BH=.25,BL=.5;
const BASE=-.25;              // нижний ряд чуть ниже пола
const BD=WT/2;                // от оси стены до её лица
const _v=new THREE.Vector3(),_q=new THREE.Quaternion(),_e=new THREE.Euler(),_s=new THREE.Vector3();
const wob=()=>0;              // стены прямые (оставлено для кода декора)

// кирпич со сколотыми углами — только для обломков на полу
function roughBox(sx,sy,sz,amp,chamf,seed){const g=new THREE.BoxGeometry(1,1,1,sx,sy,sz),p=g.attributes.position;
  const h=(x,y,z,k)=>{const s=Math.sin(x*127.1+y*311.7+z*74.7+seed*13.37+k*91.3)*43758.5453;return (s-Math.floor(s))*2-1};
  for(let i=0;i<p.count;i++){let x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    const ex=Math.abs(x)>.49,ey=Math.abs(y)>.49,ez=Math.abs(z)>.49,e=ex+ey+ez;
    const c=e===3?chamf*(1+.35*h(x,y,z,4)):e===2?chamf*.4*(1+.5*h(x,y,z,5)):0;
    x+=h(x,y,z,1)*amp-(ex?Math.sign(x)*c:0);y+=h(x,y,z,2)*amp*.7-(ey?Math.sign(y)*c:0);z+=h(x,y,z,3)*amp-(ez?Math.sign(z)*c:0);
    p.setXYZ(i,x,y,z)}
  g.computeVertexNormals();return g}

// раскладка инстансов по чанкам, чтобы работало отсечение
const CHUNK=6*CS;
function instance(parent,list,geos,mat,cullFar=true){const buckets=new Map(),ch=cullFar?CHUNK:1e9;
  for(const b of list){const k=Math.floor(b.x/ch)+'|'+Math.floor(b.z/ch)+'|'+b.v;let a=buckets.get(k);if(!a)buckets.set(k,a=[]);a.push(b)}
  for(const a of buckets.values()){const src=geos[a[0].v],g=new THREE.BufferGeometry();
    for(const nm in src.attributes)g.setAttribute(nm,src.attributes[nm]);g.setIndex(src.index);
    const im=new THREE.InstancedMesh(g,mat,a.length),box=new THREE.Box3();
    a.forEach((b,i)=>{im.setMatrixAt(i,b.m);im.setColorAt(i,b.c);box.expandByPoint(_v.set(b.x,b.y,b.z))});
    box.expandByScalar(1);g.boundingBox=box;g.boundingSphere=box.getBoundingSphere(new THREE.Sphere());
    im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;parent.add(im);
    if(!cullFar)continue;im.userData.c=g.boundingSphere.center;im.userData.r=g.boundingSphere.radius;W.cull.push(im)}}
function pushInst(arr,x,y,z,rx,ry,rz,sx,sy,sz,c,v){const m=new THREE.Matrix4();
  m.compose(_v.set(x,y,z),_q.setFromEuler(_e.set(rx,ry,rz,'YXZ')),_s.set(sx,sy,sz));arr.push({m,c,v,x,y,z})}

function wallTop(x,z){if(TH.indoor)return TH.H+1.0;
  let h=TH.wallH+.4*Noise.n2(x*.33+9,z*.33)+.2*Noise.n2(x*1.3,z*1.3+4);
  const b=Noise.n2(x*.11+50,z*.11-20);if(b>.12)h-=(b-.12)*3.5;   // большие проломы сверху
  return Math.max(h,2.1)}

const hash=(a,b,c,d)=>{const s=Math.sin(a*127.1+b*311.7+c*74.7+d*269.5)*43758.5453;return s-Math.floor(s)};

function buildWalls(root,mats){
  const P=TH.brick.map(c=>new THREE.Color(c)),odd=new THREE.Color(TH.odd),moss=TH.mossCol?new THREE.Color(TH.mossCol):null,snow=new THREE.Color('#eef3fa');
  const TW=W.TW,NX=TW*4,NZ=TW*4,topMax=TH.indoor?TH.H+1.1:TH.wallH+1.4,NY=Math.ceil((topMax-BASE)/VX)+1;
  const vox=new Uint8Array(NX*NZ*NY),I=(x,y,z)=>(x*NZ+z)*NY+y;
  const solid=(x,y,z)=>x>=0&&z>=0&&y>=0&&x<NX&&z<NZ&&y<NY&&vox[I(x,y,z)]===1;
  const vy=y=>Math.floor((y-BASE)/VX),isT=(tx,tz)=>tx>=0&&tz>=0&&tx<TW&&tz<TW&&W.tile[tx*TW+tz]>0;
  const loose=[];W.tops=[];W.niches=[];W.faces=[];

  // цвет кирпича по его «номеру» — одинаковый для обеих половинок кирпича
  const brickCol=(k1,k2,k3,k4,y,top)=>{const h=hash(k1,k2,k3,k4),c=P[Math.floor(h*P.length)].clone().lerp(P[Math.floor(hash(k4,k1,k3,k2)*P.length)],.4);
    c.multiplyScalar(1+(hash(k2,k4,k1,k3)*2-1)*TH.brickVar);if(hash(k3,k2,k4,k1)<.05)c.lerp(odd,.5);
    if(moss){if(y<1.1)c.lerp(moss,hash(k1,k3,k2,k4)*TH.moss*(1-y/1.1)*.75);if(top)c.lerp(moss,hash(k2,k1,k4,k3)*.4*TH.moss)}
    if(TH.indoor)c.multiplyScalar(lerp(.85,1,clamp(y/2,0,1)));return c};
  const randCol=()=>pick(P).clone().multiplyScalar(rr(.85,1.1));

  // упавший кирпич + крошка: на полу всё лежит как попало
  const fallen=(x,z,c)=>{const t=rnd(),ry=rr(0,6.28);let rx=0,rz=0,sx=BL*rr(.82,.98),sy=BH,sz=BL*.5*rr(.9,1),yh;
    if(rnd()<.35)sx*=rr(.4,.65);
    if(t<.55){rx=rr(-.1,.1);rz=rr(-.1,.1);yh=sy/2}else if(t<.8){rx=Math.PI/2+rr(-.12,.12);yh=sz/2}else{rx=rr(.25,.6);rz=rr(-.2,.2);yh=sy/2+Math.sin(rx)*sz*.5}
    if(blocked(x,z))return;
    pushInst(loose,x,floorH(x,z)+yh-.03,z,rx,ry,rz,sx,sy,sz,c.clone().multiplyScalar(rr(.7,.92)),ri(0,1));
    for(let i=ri(0,3);i>0;i--){const s=rr(.05,.13),cx=x+rr(-.4,.4),cz=z+rr(-.4,.4);if(blocked(cx,cz))continue;
      pushInst(loose,cx,floorH(cx,cz)+s*.25,cz,rr(0,6),rr(0,6),rr(0,6),s*rr(1,1.8),s*.8,s,c.clone().multiplyScalar(rr(.55,.85)),ri(0,1))}};

  // 1) заполняем плитки стен
  for(let tx=0;tx<TW;tx++)for(let tz=0;tz<TW;tz++){const t=W.tile[tx*TW+tz];if(!t)continue;
    const cx=tx+.5,cz=tz+.5;let top=TH.indoor?TH.H+1.1:t===2?rr(1.2,2.8):wallTop(cx,cz);
    if(!TH.indoor){// торцы стен осыпаются
      if(tx%CS===0&&tz%CS===0)top-=W.crumAt([tx/CS,tz/CS]);
      else for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const ax=tx+dx,az=tz+dz;if(ax%CS===0&&az%CS===0&&ax>=0&&az>=0&&ax<TW&&az<TW)top-=W.crumAt([ax/CS,az/CS])*.5}}
    const alongZ=isT(tx,tz+1)||isT(tx,tz-1),tv=Math.max(4,vy(top));
    for(let a=0;a<4;a++)for(let b=0;b<4;b++){const x=tx*4+(alongZ?b:a),z=tz*4+(alongZ?a:b);
      let h=tv;
      if(!TH.indoor){// рваный верх: по кирпичам вдоль стены, иногда только с одной стороны
        const br=(a+((tv&1)?1:0))>>1,dr=hash(tx,tz,br,7);h-=dr<.45?0:dr<.75?1:dr<.92?2:3;
        if(hash(tx,tz,br,b<2?3:4)<.22)h--}
      for(let y=0;y<Math.min(h,NY);y++)vox[I(x,y,z)]=1}}

  // 2) выбоины по лицам стен (кирпичами), ниши, сквозные дыры
  for(const sg of W.segs){const L=sg.len,mid=sg.at(L/2);
    let outSide=0;if(sg.outer){const g=toGrid(mid.x-mid.tz*2,mid.z+mid.tx*2);outSide=(g[0]<0||g[1]<0||g[0]>W.n||g[1]>W.n)?1:-1}
    const spots=[[],[]];
    for(let f=0;f<2;f++){const side=f?1:-1;if(side===outSide||L<2.2)continue;
      for(let u=0;u<Math.max(1,Math.round(L/CS));u++){
        if(rnd()<TH.dmg)spots[f].push({s:0,y:rnd()<.3?rr(.05,.5):rr(.4,2),ru:rr(.3,.85),rv:rr(.25,.6)});
        if(rnd()<TH.dmg*.4)spots[f].push({s:0,y:rr(.2,2),ru:rr(.25,.6),rv:rr(.2,.45)})}
      for(const sp of spots[f])sp.s=rr(.5+sp.ru,Math.max(.5+sp.ru+.01,L-.5-sp.ru))}
    if(!sg.outer)for(const sp of spots[0])if(rnd()<.2&&sp.ru<.7){sp.thru=1;spots[1].push(sp)}
    for(let f=0;f<2;f++){const side=f?1:-1,nx=-sg.at(0).tz*side,nz=sg.at(0).tx*side;
      W.faces.push({sg,side,outer:side===outSide,spots:spots[f]});
      for(const sp of spots[f]){const removed=new Set();let lowC=99;
        for(let s=sp.s-sp.ru-.3;s<=sp.s+sp.ru+.3;s+=VX/2)for(let c=Math.max(0,vy(sp.y-sp.rv-.3));c<=vy(sp.y+sp.rv+.3);c++){
          const du=(s-sp.s)/sp.ru,dv=(BASE+(c+.5)*VX-sp.y)/sp.rv,d=du*du+dv*dv,p=sg.at(s);
          const depth=sp.thru?(d<.7?4:d<1?1:0):d<.3&&hash(c,s*4|0,3,9)<.6?2:1;
          for(let k=0;k<depth;k++){const wx=p.x+nx*(BD-VX/2-k*VX),wz=p.z+nz*(BD-VX/2-k*VX),x=Math.floor(wx/VX),z=Math.floor(wz/VX);
            if(!solid(x,c,z))continue;
            const u=Math.abs(nx)>.5?z:x,first=((u+(c&1))&1)===0,thr=1-.45*hash(x>>1,z>>1,c,5);
            if(d>=thr&&!(sp.thru&&d<.7))continue;
            vox[I(x,c,z)]=0;const pu=first?u+1:u-1,px=Math.abs(nx)>.5?x:pu,pz=Math.abs(nx)>.5?pu:z;if(solid(px,c,pz))vox[I(px,c,pz)]=0;
            const key=Math.min(u,pu)+'|'+c+'|'+k;if(!removed.has(key)){removed.add(key);if(k===0&&rnd()<.6){const q=sg.at(s);fallen(q.x+nx*(BD+rr(.25,1)),q.z+nz*(BD+rr(.25,1)),randCol())}}
            if(Math.abs(s-sp.s)<.2&&c<lowC)lowC=c}}
        if(!sp.thru&&lowC<99){const p=sg.at(sp.s),y=BASE+lowC*VX;if(y<wallTop(p.x,p.z)-.6)
          W.niches.push({x:p.x+nx*(BD-.15),y,z:p.z+nz*(BD-.15),nx,nz,r:Math.min(sp.ru,sp.rv),bottom:lowC})}}}}

  // 3) сетка граней
  const bufs=new Map(),buf=(x,z)=>{const k=Math.floor(x/CHUNK)+'|'+Math.floor(z/CHUNK);let b=bufs.get(k);if(!b)bufs.set(k,b={p:[],n:[],uv:[],c:[]});return b};
  const quad=(b,v,n,uv,col)=>{// v: 4 угла по кругу; порядок подбираем под нормаль
    const e1=[v[1][0]-v[0][0],v[1][1]-v[0][1],v[1][2]-v[0][2]],e2=[v[3][0]-v[0][0],v[3][1]-v[0][1],v[3][2]-v[0][2]];
    const cr=(e1[1]*e2[2]-e1[2]*e2[1])*n[0]+(e1[2]*e2[0]-e1[0]*e2[2])*n[1]+(e1[0]*e2[1]-e1[1]*e2[0])*n[2];
    const o=cr>=0?[0,1,2,0,2,3]:[0,2,1,0,3,2];
    for(const i of o){b.p.push(...v[i]);b.n.push(...n);b.uv.push(...uv[i]);b.c.push(col.r,col.g,col.b)}};
  const dirs=[[1,0,0],[-1,0,0],[0,0,1],[0,0,-1],[0,1,0],[0,-1,0]];
  for(let tx=0;tx<TW;tx++)for(let tz=0;tz<TW;tz++){if(!W.tile[tx*TW+tz])continue;
    for(let x=tx*4;x<tx*4+4;x++)for(let z=tz*4;z<tz*4+4;z++)for(let y=0;y<NY;y++){if(!vox[I(x,y,z)])continue;
      const X0=x*VX,X1=X0+VX,Y0=BASE+y*VX,Y1=Y0+VX,Z0=z*VX,Z1=Z0+VX,b=buf(X0,Z0);
      for(const d of dirs){if(solid(x+d[0],y+d[1],z+d[2]))continue;if(d[1]<0&&y===0)continue;
        if(d[1]===0){// боковая грань: кирпич из двух вокселей
          const ax=d[0]!==0,u=ax?z:x,c=y,first=((u+(c&1))&1)===0,pu=first?u+1:u-1;
          const px=ax?x:pu,pz=ax?pu:z,pExp=solid(px,y,pz)&&!solid(px+d[0],y,pz+d[2]);
          if(pExp&&!first)continue;
          const u0=first?u:u-1,uu0=pExp?u0:u,uu1=pExp?u0+2:u+1;   // в вокселях вдоль лица
          const plane=ax?(d[0]>0?X1:X0):(d[2]>0?Z1:Z0),edge=Math.abs(plane-Math.round(plane))<1e-6;
          const bi=(u0+(c&1))>>1,col=brickCol(ax?1:2,Math.round(plane*4),c,bi,Y0,false);
          if(!edge)col.multiplyScalar(.55);
          const ua=(uu0-u0)*.5,ub=ua+(uu1-uu0)*.5,s0=uu0*VX,s1=uu1*VX;
          const v=ax?[[plane,Y0,s0],[plane,Y0,s1],[plane,Y1,s1],[plane,Y1,s0]]:[[s0,Y0,plane],[s1,Y0,plane],[s1,Y1,plane],[s0,Y1,plane]];
          quad(b,v,d,[[ua,0],[ub,0],[ub,1],[ua,1]],col)}
        else{const yy=d[1]>0?Y1:Y0,col=brickCol(3,x>>1,z>>1,y,Y0,d[1]>0);
          if(d[1]<0)col.multiplyScalar(.5);
          else if(!TH.indoor){if(TH.snow)col.lerp(snow,.85);if(hash(x,z,y,11)<.06)W.tops.push({x:X0+VX/2,y:yy,z:Z0+VX/2})}
          const ua=(x&1)*.5,va=(z&1)*.5;
          quad(b,[[X0,yy,Z0],[X1,yy,Z0],[X1,yy,Z1],[X0,yy,Z1]],d,[[ua,va],[ua+.5,va],[ua+.5,va+.5],[ua,va+.5]],col)}}}}
  W.wallTris=0;
  for(const b of bufs.values()){if(!b.p.length)continue;const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(b.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(b.n,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(b.uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(b.c,3));g.computeBoundingSphere();
    const m=new THREE.Mesh(g,mats.wall);root.add(m);m.userData.c=g.boundingSphere.center;m.userData.r=g.boundingSphere.radius;W.cull.push(m);W.wallTris+=b.p.length/9}

  // редкий мусор вдоль стен и у осыпавшихся торцов
  for(const fc of W.faces){if(fc.outer)continue;const L=fc.sg.len,a=fc.sg.at(0),nx=-a.tz*fc.side,nz=a.tx*fc.side;
    for(let i=0;i<2*Math.max(1,Math.round(L/CS));i++)if(rnd()<.25){const p=fc.sg.at(rr(.5,L-.5)),d=BD+rr(.2,1.2);fallen(p.x+nx*d,p.z+nz*d,randCol())}}
  if(!TH.indoor)for(let i=0;i<=W.n;i++)for(let j=0;j<=W.n;j++){const c=W.crumAt([i,j]);if(!c)continue;const p=warp(i,j);
    for(let k=ri(1,4);k>0;k--){const a=rr(0,6.28),d=rr(.8,1.6);fallen(p[0]+Math.cos(a)*d,p[1]+Math.sin(a)*d,randCol())}}

  const looseGeos=[0,1].map(i=>roughBox(2,2,2,.06,.11,i+7));
  instance(root,loose,looseGeos,mats.brick);
  W.looseCount=loose.length}
