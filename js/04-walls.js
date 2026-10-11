'use strict';
// ---------- стены из отдельных кирпичей ----------
const BH=.215,BL=.5,BD=.31;   // высота ряда, шаг вдоль стены, глубина слоя (стена = 2 слоя)
const _v=new THREE.Vector3(),_q=new THREE.Quaternion(),_e=new THREE.Euler(),_s=new THREE.Vector3();

// кирпич со сколотыми углами: одинаковая позиция -> одинаковый сдвиг, поэтому без щелей
function roughBox(sx,sy,sz,amp,chamf,seed){const g=new THREE.BoxGeometry(1,1,1,sx,sy,sz),p=g.attributes.position;
  const h=(x,y,z,k)=>{const s=Math.sin(x*127.1+y*311.7+z*74.7+seed*13.37+k*91.3)*43758.5453;return (s-Math.floor(s))*2-1};
  for(let i=0;i<p.count;i++){let x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    const ex=Math.abs(x)>.49,ey=Math.abs(y)>.49,ez=Math.abs(z)>.49,e=ex+ey+ez;
    const c=e===3?chamf*(1+.35*h(x,y,z,4)):e===2?chamf*.4*(1+.5*h(x,y,z,5)):0;
    x+=h(x,y,z,1)*amp-(ex?Math.sign(x)*c:0);y+=h(x,y,z,2)*amp*.7-(ey?Math.sign(y)*c:0);z+=h(x,y,z,3)*amp-(ez?Math.sign(z)*c:0);
    p.setXYZ(i,x,y,z)}
  g.computeVertexNormals();return g}

// раскладка инстансов по чанкам, чтобы работало отсечение по камере
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

// смещение осевой линии стены: стена «гуляет» и чуть заваливается
const wob=(x,z,y,lean)=>.075*Noise.n2(x*.7+1.7,z*.7-3.3)+.035*Noise.n2(x*1.9+y*.5,z*1.9-y*.4+9)+lean*y;
function wallTop(x,z){if(TH.indoor)return TH.H+1.0;
  let h=TH.wallH+.4*Noise.n2(x*.33+9,z*.33)+.2*Noise.n2(x*1.3,z*1.3+4);
  const b=Noise.n2(x*.11+50,z*.11-20);if(b>.12)h-=(b-.12)*3.5;   // большие проломы сверху
  return Math.max(h,2.1)}

function buildWalls(root,mats){
  const P=TH.brick.map(c=>new THREE.Color(c)),odd=new THREE.Color(TH.odd),moss=TH.mossCol?new THREE.Color(TH.mossCol):null;
  const color=(y,top,dmg)=>{const c=pick(P).clone().lerp(pick(P),rnd()*.5).multiplyScalar(1+rr(-TH.brickVar,TH.brickVar));
    if(rnd()<.05)c.lerp(odd,rr(.3,.7));
    if(moss){if(y<1.1)c.lerp(moss,rnd()*TH.moss*(1-y/1.1)*.75);if(top&&rnd()<.5)c.lerp(moss,rnd()*.45*TH.moss)}
    if(TH.snow&&top)c.lerp(new THREE.Color('#c8d0dc'),rnd()*.35);
    if(dmg)c.multiplyScalar(.82);if(TH.indoor)c.multiplyScalar(lerp(.85,1,Math.min(1,y/2)));return c};
  const bricks=[],loose=[];W.tops=[];W.niches=[];W.faces=[];
  // упавший кирпич + крошка
  const fallen=(x,z,c)=>{const t=rnd(),ry=rr(0,6.28);let rx=0,rz=0,sx=BL*rr(.82,.98),sy=BH,sz=BD*.85,yh;
    if(rnd()<.35)sx*=rr(.4,.65);
    if(t<.55){rx=rr(-.1,.1);rz=rr(-.1,.1);yh=sy/2}else if(t<.8){rx=Math.PI/2+rr(-.12,.12);yh=sz/2}else{rx=rr(.25,.6);rz=rr(-.2,.2);yh=sy/2+Math.sin(rx)*sz*.5}
    pushInst(loose,x,floorH(x,z)+yh-.03,z,rx,ry,rz,sx,sy,sz,c.clone().multiplyScalar(rr(.7,.92)),ri(0,1));
    for(let i=ri(0,3);i>0;i--){const s=rr(.05,.13),cx=x+rr(-.4,.4),cz=z+rr(-.4,.4);
      pushInst(loose,cx,floorH(cx,cz)+s*.25,cz,rr(0,6),rr(0,6),rr(0,6),s*rr(1,1.8),s*.8,s,c.clone().multiplyScalar(rr(.55,.85)),ri(0,1))}};
  const fallNear=(p,side,spread,c)=>{const nx=-p.tz,nz=p.tx,d=side*rr(.38,.38+spread),a=rr(-.5,.5);fallen(p.x+nx*d+p.tx*a,p.z+nz*d+p.tz*a,c)};

  for(const sg of W.segs){const L=sg.len,jr=.3,a0=jr,a1=L-jr;if(a1-a0<.15)continue;
    const cnt=Math.max(1,Math.round((a1-a0)/BL)),pl=(a1-a0)/cnt,crA=W.crumAt(sg.a),crB=W.crumAt(sg.b);
    // внешняя сторона внешних стен: куда смотрит нормаль
    let outSide=0;if(sg.outer){const p=sg.at(L/2),g=toGrid(p.x-p.tz,p.z+p.tx);outSide=(g[0]<0||g[1]<0||g[0]>W.n||g[1]>W.n)?1:-1}
    const spots=[[],[]];
    for(let f=0;f<2;f++){const side=f?1:-1;if(side===outSide)continue;
      let k=rnd()<TH.dmg?1:0;if(rnd()<TH.dmg*.4)k++;
      for(let i=0;i<k;i++)spots[f].push({s:rr(a0+.25,a1-.25),y:rnd()<.3?rr(.05,.5):rr(.4,2),ru:rr(.3,.9),rv:rr(.22,.55)})}
    if(!sg.outer)for(const sp of spots[0])if(rnd()<.22)spots[1].push(Object.assign({},sp,{thru:1}));
    const maxTop=TH.indoor?TH.H+1.1:TH.wallH+1;
    for(let f=0;f<2;f++){const side=f?1:-1,off0=f?.25:0;
      W.faces.push({sg,side,outer:side===outSide,spots:spots[f]});
      for(let k=0;;k++){const yb=k*BH;if(yb>maxTop)break;const off=((k&1)?.5:0)+off0;
        for(let m=-1;m<=cnt;m++){let t0=a0+(m+off)*pl,t1=t0+pl;t0=Math.max(t0,a0);t1=Math.min(t1,a1);if(t1-t0<.1)continue;
          const sc=(t0+t1)/2,len=t1-t0,p=sg.at(sc);
          let top=wallTop(p.x,p.z);if(crA)top-=crA*Math.max(0,1-sc/1.4);if(crB)top-=crB*Math.max(0,1-(L-sc)/1.4);
          if(yb>=top)continue;
          const frac=(top-yb)/BH,topC=frac<2&&!TH.indoor;
          if(frac<1&&rnd()>frac){if(!TH.indoor&&rnd()<.2)fallNear(p,side,.8,color(yb,1,0));continue}
          if(topC&&rnd()<.16){if(rnd()<.5)fallNear(p,side,.8,color(yb,1,0));continue}
          let dmg=0;
          for(const sp of spots[f]){const du=(sc-sp.s)/sp.ru,dv=(yb+BH/2-sp.y)/sp.rv,d=du*du+dv*dv;
            if(d<1-.45*rnd()){dmg=2;break}if(d<1.8)dmg=1}
          if(dmg===2){if(rnd()<.6)fallNear(p,side,.9,color(yb,0,0));continue}
          const fl=floorH(p.x,p.z),y=fl-.04+yb+BH/2,w=wob(p.x,p.z,yb,sg.lean);
          const out=(dmg?rr(0,.045):0)+rr(-.012,.012)+(topC?rr(-.02,.03):0),nx=-p.tz,nz=p.tx,d=w+side*(BD/2+out+.003);
          const j=dmg||topC?2.6:.6;
          pushInst(bricks,p.x+nx*d,y,p.z+nz*d,rr(-.02,.02)*j,Math.atan2(-p.tz,p.tx)+rr(-.025,.025)*j,rr(-.02,.02)*j,
            len-.014,BH*rr(.97,1.01),BD*rr(.93,1.05),color(yb,topC,dmg),ri(0,2));
          if(frac<2&&!TH.indoor)W.tops.push({x:p.x+nx*d,y:y+BH/2,z:p.z+nz*d,ry:Math.atan2(-p.tz,p.tx),sx:len,sz:BD})}}
      // ниши (для черепов/свечей)
      for(const sp of spots[f]){if(sp.thru)continue;let k=Math.floor(sp.y/BH);
        while(k>0&&Math.pow((k*BH-BH/2-sp.y)/sp.rv,2)<.5)k--;
        const p=sg.at(sp.s),nx=-p.tz,nz=p.tx,fl=floorH(p.x,p.z),w=wob(p.x,p.z,k*BH,sg.lean);
        if(k*BH+.3<wallTop(p.x,p.z)-.3)W.niches.push({x:p.x+nx*(w+side*.12),y:fl-.04+k*BH,z:p.z+nz*(w+side*.12),nx:nx*side,nz:nz*side,r:Math.min(sp.ru,sp.rv),bottom:k})}}}

  // колонны на стыках и одиночные столбы
  for(const c of W.cols){const fl=floorH(c.x,c.z),ang=rr(0,6.28);
    const top=TH.indoor?TH.H+1.1:(c.pillar?rr(1.2,2.8):wallTop(c.x,c.z)-c.crum);
    for(let k=0;;k++){const yb=k*BH;if(yb>=top)break;const frac=(top-yb)/BH,topC=frac<2&&!TH.indoor;
      if(frac<1&&rnd()>frac)continue;
      const r=ang+((k&1)?Math.PI/2:0)+rr(-.22,.22),y=fl-.04+yb+BH/2,ox=rr(-.02,.02),oz=rr(-.02,.02);
      for(const q of [-1,1]){if(topC&&rnd()<.2)continue;if(!topC&&!c.pillar&&rnd()<.02)continue;
        const x=c.x+ox+Math.sin(r)*q*.155,z=c.z+oz+Math.cos(r)*q*.155,j=topC?2.5:1;
        pushInst(bricks,x,y,z,rr(-.02,.02)*j,r+rr(-.03,.03),rr(-.02,.02)*j,.64*rr(.97,1.03),BH*rr(.97,1.01),.3,color(yb,topC,0),ri(0,2));
        if(frac<2&&!TH.indoor)W.tops.push({x,y:y+BH/2,z,ry:r,sx:.64,sz:.3})}}
    if(c.crum&&!TH.indoor)for(let i=ri(1,4);i>0;i--){const a=rr(0,6.28),d=rr(.5,1.3);fallen(c.x+Math.cos(a)*d,c.z+Math.sin(a)*d,color(.5,1,0))}}

  // редкий мусор вдоль стен
  for(const fc of W.faces){if(fc.outer)continue;const L=fc.sg.len;
    for(let i=0;i<2;i++)if(rnd()<.25){const p=fc.sg.at(rr(.5,L-.5));fallNear(p,fc.side,1.2,color(.3,0,0))}}

  const wallGeos=[0,1,2].map(i=>roughBox(2,1,1,.018,.045,i+1));
  const looseGeos=[0,1].map(i=>roughBox(2,2,2,.06,.11,i+7));
  instance(root,bricks,wallGeos,mats.brick);
  instance(root,loose,looseGeos,mats.brick);
  W.brickCount=bricks.length;W.looseCount=loose.length;W.wallGeos=wallGeos}
