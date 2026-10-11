'use strict';
// ---------- стены ----------
// Целая кладка — сплошной блок: каждый кирпич это плоская грань (2 треугольника) с текстурой кирпича.
// Соседние грани делят вершины, поэтому кирпичи стыкуются без щелей и не поворачиваются.
// Объём появляется только там, где кирпича нет: боковины соседей, дно и глубина ниши, сквозной тоннель.
const BH=.215,BL=.5,BD=.31;   // высота ряда, шаг кирпича, половина толщины стены
const BASE=-.1;               // все стены кладутся от одной отметки
const CT=.1;                  // глубина «внутреннего слоя» (дно выбоины) от оси стены
const _v=new THREE.Vector3(),_q=new THREE.Quaternion(),_e=new THREE.Euler(),_s=new THREE.Vector3();

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

// изгиб стены в плане (по высоте стена строго отвесная)
const wob=(x,z)=>.075*Noise.n2(x*.7+1.7,z*.7-3.3)+.03*Noise.n2(x*1.9,z*1.9+9);
function wallTop(x,z){if(TH.indoor)return TH.H+1.0;
  let h=TH.wallH+.4*Noise.n2(x*.33+9,z*.33)+.2*Noise.n2(x*1.3,z*1.3+4);
  const b=Noise.n2(x*.11+50,z*.11-20);if(b>.12)h-=(b-.12)*3.5;   // большие проломы сверху
  return Math.max(h,2.1)}

// буфер граней кирпичной кладки (по чанкам)
function brickMesher(){const bufs=new Map();
  const get=(x,z)=>{const k=Math.floor(x/CHUNK)+'|'+Math.floor(z/CHUNK);let b=bufs.get(k);if(!b)bufs.set(k,b={p:[],uv:[],c:[]});return b};
  // quad a-b-c-d (против часовой при взгляде снаружи), uv-прямоугольник u0..u1 × v0..v1
  const quad=(b,a,bb,c,d,col,u0=0,u1=1,v0=0,v1=1)=>{b.p.push(...a,...bb,...c,...a,...c,...d);
    b.uv.push(u0,v0,u1,v0,u1,v1,u0,v0,u1,v1,u0,v1);for(let i=0;i<6;i++)b.c.push(col.r,col.g,col.b)};
  const meshes=(root,mat)=>{for(const b of bufs.values()){if(!b.p.length)continue;const g=new THREE.BufferGeometry();
      g.setAttribute('position',new THREE.Float32BufferAttribute(b.p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(b.uv,2));
      g.setAttribute('color',new THREE.Float32BufferAttribute(b.c,3));g.computeVertexNormals();g.computeBoundingSphere();
      const m=new THREE.Mesh(g,mat);root.add(m);m.userData.c=g.boundingSphere.center;m.userData.r=g.boundingSphere.radius;W.cull.push(m);W.wallTris+=b.p.length/9}};
  return {get,quad,meshes}}

function buildWalls(root,mats){
  const P=TH.brick.map(c=>new THREE.Color(c)),odd=new THREE.Color(TH.odd),moss=TH.mossCol?new THREE.Color(TH.mossCol):null;
  const color=(y,top)=>{const c=pick(P).clone().lerp(pick(P),rnd()*.5).multiplyScalar(1+rr(-TH.brickVar,TH.brickVar));
    if(rnd()<.05)c.lerp(odd,rr(.3,.7));
    if(moss){if(y<1.1)c.lerp(moss,rnd()*TH.moss*(1-y/1.1)*.75);if(top&&rnd()<.5)c.lerp(moss,rnd()*.45*TH.moss)}
    if(TH.snow&&top)c.lerp(new THREE.Color('#c8d0dc'),rnd()*.35);
    if(TH.indoor)c.multiplyScalar(lerp(.85,1,Math.min(1,y/2)));return c};
  const loose=[];W.tops=[];W.niches=[];W.faces=[];W.wallTris=0;
  const M=brickMesher(),dark=k=>c=>c.clone().multiplyScalar(k);
  // упавший кирпич + крошка: на полу всё лежит как попало
  const fallen=(x,z,c)=>{const t=rnd(),ry=rr(0,6.28);let rx=0,rz=0,sx=BL*rr(.82,.98),sy=BH,sz=BD*.85,yh;
    if(rnd()<.35)sx*=rr(.4,.65);
    if(t<.55){rx=rr(-.1,.1);rz=rr(-.1,.1);yh=sy/2}else if(t<.8){rx=Math.PI/2+rr(-.12,.12);yh=sz/2}else{rx=rr(.25,.6);rz=rr(-.2,.2);yh=sy/2+Math.sin(rx)*sz*.5}
    pushInst(loose,x,floorH(x,z)+yh-.03,z,rx,ry,rz,sx,sy,sz,c.clone().multiplyScalar(rr(.7,.92)),ri(0,1));
    for(let i=ri(0,3);i>0;i--){const s=rr(.05,.13),cx=x+rr(-.4,.4),cz=z+rr(-.4,.4);
      pushInst(loose,cx,floorH(cx,cz)+s*.25,cz,rr(0,6),rr(0,6),rr(0,6),s*rr(1,1.8),s*.8,s,c.clone().multiplyScalar(rr(.55,.85)),ri(0,1))}};
  const fallNear=(p,side,spread,c)=>{const nx=-p.tz,nz=p.tx,d=side*rr(.4,.4+spread),a=rr(-.5,.5);fallen(p.x+nx*d+p.tx*a,p.z+nz*d+p.tz*a,c)};

  for(const sg of W.segs){const L=sg.len,jr=.3,a0=jr,a1=L-jr;if(a1-a0<.15)continue;
    const cnt=Math.max(1,Math.round((a1-a0)/BL)),pl=(a1-a0)/cnt,crA=W.crumAt(sg.a),crB=W.crumAt(sg.b);
    const mid=sg.at(L/2),buf=M.get(mid.x,mid.z);
    let outSide=0;if(sg.outer){const g=toGrid(mid.x-mid.tz,mid.z+mid.tx);outSide=(g[0]<0||g[1]<0||g[0]>W.n||g[1]>W.n)?1:-1}
    // выбоины: на одной стороне или насквозь
    const spots=[[],[]];
    for(let f=0;f<2;f++){const side=f?1:-1;if(side===outSide)continue;
      let k=0;for(let u=0;u<Math.max(1,Math.round(L/CS));u++){if(rnd()<TH.dmg)k++;if(rnd()<TH.dmg*.4)k++}
      for(let i=0;i<k;i++)spots[f].push({s:rr(a0+.25,a1-.25),y:rnd()<.3?rr(.05,.5):rr(.4,2),ru:rr(.3,.9),rv:rr(.22,.55)})}
    if(!sg.outer)for(const sp of spots[0])if(rnd()<.22){sp.thru=1;spots[1].push(sp)}
    // сетка ячеек: ряд k, кирпич m (одна перевязка на обе стороны стены)
    const rows=[],maxTop=TH.indoor?TH.H+1.1:TH.wallH+1;
    for(let k=0;BASE+k*BH<maxTop;k++){const yb=k*BH,off=(k&1)?.5:0,row=[];
      for(let m=-1;m<=cnt;m++){let t0=a0+(m+off)*pl,t1=t0+pl;t0=Math.max(t0,a0);t1=Math.min(t1,a1);if(t1-t0<.05)continue;
        const sc=(t0+t1)/2,p=sg.at(sc);let top=wallTop(p.x,p.z);if(crA)top-=crA*Math.max(0,1-sc/1.4);if(crB)top-=crB*Math.max(0,1-(L-sc)/1.4);
        let ex=yb<top;const frac=(top-yb)/BH;
        if(ex&&!TH.indoor&&frac<1&&rnd()>frac)ex=false;
        if(ex&&!TH.indoor&&frac<2&&rnd()<.16)ex=false;
        const cell={t0,t1,sc,p,ex,f:[ex,ex],th:false,c:color(yb,frac<2&&!TH.indoor)};
        if(!ex&&yb<top+BH&&!TH.indoor&&rnd()<.3)fallNear(p,rnd()<.5?-1:1,.8,cell.c);
        if(ex)for(let f=0;f<2;f++)for(const sp of spots[f]){const du=(sc-sp.s)/sp.ru,dv=(yb+BH/2-sp.y)/sp.rv;
          if(du*du+dv*dv<1-.45*rnd()){cell.f[f]=false;if(sp.thru)cell.th=true;break}}
        if(cell.th)cell.f=[false,false];
        for(let f=0;f<2;f++)if(ex&&!cell.f[f]&&rnd()<.6)fallNear(p,f?1:-1,.9,cell.c);
        row.push(cell)}
      rows.push(row)}
    // вершина на высоте y и «глубине» d от оси (d>0 — в сторону нормали)
    const V=(s,y,d)=>{const p=sg.at(s),w=wob(p.x,p.z)+d;return [p.x-p.tz*w,y,p.z+p.tx*w]};
    // отрезки ряда, где на стороне f нет кирпича (для крышек сверху/снизу)
    const gaps=(row,f)=>row?row.filter(c=>!c.f[f]).map(c=>[c.t0,c.t1,c]):[];
    // грань в плоскости кирпича между глубинами d0..d1 на высоте y (горизонтальная)
    const hcap=(t0,t1,y,d0,d1,col,up)=>{const a=V(t0,y,d0),b=V(t1,y,d0),c=V(t1,y,d1),d=V(t0,y,d1);up?M.quad(buf,a,d,c,b,col,0,1,0,.3):M.quad(buf,a,b,c,d,col,0,1,0,.3)};
    const vcap=(t,y0,y1,d0,d1,col)=>M.quad(buf,V(t,y0,d0),V(t,y0,d1),V(t,y1,d1),V(t,y1,d0),col,0,.3,0,1);
    for(let k=0;k<rows.length;k++){const y0=BASE+k*BH,y1=y0+BH,row=rows[k];
      for(let i=0;i<row.length;i++){const c=row[i];if(!c.ex)continue;
        for(let f=0;f<2;f++){const side=f?1:-1,D=side*BD,u1=(c.t1-c.t0)/pl;
          if(c.f[f]){// лицевая грань кирпича
            const a=V(c.t0,y0,D),b=V(c.t1,y0,D),cc=V(c.t1,y1,D),d=V(c.t0,y1,D);
            side>0?M.quad(buf,a,b,cc,d,c.c,0,u1):M.quad(buf,b,a,d,cc,c.c,0,u1);
            // соседи слева/справа: если их нет — видна боковина кирпича
            for(const [j,t] of [[i-1,c.t0],[i+1,c.t1]]){const nb=row[j];if(!nb)continue;
              if(!nb.ex)vcap(t,y0,y1,D,0,dark(.8)(c.c));else if(!nb.f[f])vcap(t,y0,y1,D,nb.th?0:side*CT,dark(.75)(c.c))}
            // сверху/снизу: дырки в соседних рядах
            for(const [g0,g1,nb] of gaps(rows[k+1],f)){if(!nb.ex)continue;const t0=Math.max(g0,c.t0),t1=Math.min(g1,c.t1);if(t1-t0<.01)continue;
              hcap(t0,t1,y1,D,nb.th?0:side*CT,dark(.9)(c.c),side>0)}
            if(k>0)for(const [g0,g1,nb] of gaps(rows[k-1],f)){if(!nb.ex)continue;const t0=Math.max(g0,c.t0),t1=Math.min(g1,c.t1);if(t1-t0<.01)continue;
              hcap(t0,t1,y0,D,nb.th?0:side*CT,dark(.55)(c.c),side<0)}}
          else if(!c.th){// дно выбоины: внутренний слой кладки
            const d0=side*CT,a=V(c.t0,y0,d0),b=V(c.t1,y0,d0),cc=V(c.t1,y1,d0),d=V(c.t0,y1,d0),col=dark(.45)(c.c);
            side>0?M.quad(buf,a,b,cc,d,col,0,u1):M.quad(buf,b,a,d,cc,col,0,u1);
            for(const [j,t] of [[i-1,c.t0],[i+1,c.t1]]){const nb=row[j];if(nb&&!nb.ex)vcap(t,y0,y1,d0,0,dark(.6)(c.c))}}}
        // верх стены
        const up=rows[k+1]&&rows[k+1].filter(n=>n.ex&&n.t1>c.t0&&n.t0<c.t1);
        const d0=c.f[0]?-BD:c.th?0:-CT,d1=c.f[1]?BD:c.th?0:CT;
        if(!TH.indoor&&up&&d0<d1){let t=c.t0;const segs=[];for(const n of up.sort((a,b)=>a.t0-b.t0)){if(n.t0>t)segs.push([t,n.t0]);t=Math.max(t,n.t1)}if(t<c.t1)segs.push([t,c.t1]);
          for(const [t0,t1] of segs){hcap(t0,t1,y1,d0,d1,dark(1.05)(c.c),true);const p=sg.at((t0+t1)/2),w=wob(p.x,p.z);
            W.tops.push({x:p.x-p.tz*w,y:y1,z:p.z+p.tx*w,ry:Math.atan2(-p.tz,p.tx),sx:t1-t0,sz:2*BD})}}}}
    // торцы стены у колонн (обычно спрятаны внутри колонны)
    for(let k=0;k<rows.length;k++){const y0=BASE+k*BH,row=rows[k];
      for(const c of [row[0],row[row.length-1]]){if(!c||!c.ex)continue;const t=c===row[0]?c.t0:c.t1;vcap(t,y0,y0+BH,-BD,BD,dark(.7)(c.c))}}
    for(let f=0;f<2;f++){const side=f?1:-1;W.faces.push({sg,side,outer:side===outSide,spots:spots[f]});
      for(const sp of spots[f]){if(sp.thru)continue;let k=Math.floor(sp.y/BH);
        while(k>0&&Math.pow((k*BH-BH/2-sp.y)/sp.rv,2)<.5)k--;
        const p=sg.at(sp.s),w=wob(p.x,p.z);
        if(k*BH+.3<wallTop(p.x,p.z)-.3)W.niches.push({x:p.x-p.tz*(w+side*.21),y:BASE+k*BH,z:p.z+p.tx*(w+side*.21),nx:-p.tz*side,nz:p.tx*side,r:Math.min(sp.ru,sp.rv),bottom:k})}}}

  // колонны на стыках: ровный кирпичный столб, повёрнут по одной из примыкающих стен
  for(const c of W.cols){let ang=rr(0,6.28),cx=c.x,cz=c.z;
    // сдвигаем колонну так же, как изогнуты примыкающие стены, чтобы их торцы прятались внутри
    const at=W.segs.filter(s=>(s.a[0]===c.v[0]&&s.a[1]===c.v[1])||(s.b[0]===c.v[0]&&s.b[1]===c.v[1]))
      .map(s=>s.at(s.a[0]===c.v[0]&&s.a[1]===c.v[1]?.02:s.len-.02));
    if(at.length){const t1=at[0],w=wob(c.x,c.z);ang=Math.atan2(t1.tz,t1.tx);cx+=-t1.tz*w;cz+=t1.tx*w;
      const t2=at.find(t=>Math.abs(t.tx*t1.tx+t.tz*t1.tz)<.7);if(t2){cx+=-t2.tz*w;cz+=t2.tx*w}}
    const top=TH.indoor?TH.H+1.1:(c.pillar?rr(1.2,2.8):wallTop(c.x,c.z)-c.crum),h=c.pillar?.36:BD+.002,buf=M.get(cx,cz);
    const ca=Math.cos(ang),sa=Math.sin(ang),pt=(u,v,y)=>[cx+ca*u-sa*v,y,cz+sa*u+ca*v];
    const n=Math.max(1,Math.round((top-BASE)/BH-(TH.indoor?0:rr(0,1))));
    for(let k=0;k<n;k++){const y0=BASE+k*BH,y1=y0+BH,cl=color(k*BH,!TH.indoor&&k>=n-2);
      const cs=[[-h,-h],[h,-h],[h,h],[-h,h]];
      for(let i=0;i<4;i++){const [u0,v0]=cs[i],[u1,v1]=cs[(i+1)%4],q=(k+i)&1;
        M.quad(buf,pt(u0,v0,y0),pt(u1,v1,y0),pt(u1,v1,y1),pt(u0,v0,y1),cl,q?.5:0,q?1.8:1.3)}
      if(k===n-1&&!TH.indoor){M.quad(buf,pt(-h,-h,y1),pt(-h,h,y1),pt(h,h,y1),pt(h,-h,y1),cl,0,1,0,1);W.tops.push({x:cx,y:y1,z:cz,ry:-ang,sx:2*h,sz:2*h})}}
    if(c.crum&&!TH.indoor)for(let i=ri(1,4);i>0;i--){const a=rr(0,6.28),d=rr(.5,1.3);fallen(c.x+Math.cos(a)*d,c.z+Math.sin(a)*d,color(.5,1))}}

  // редкий мусор вдоль стен
  for(const fc of W.faces){if(fc.outer)continue;const L=fc.sg.len;
    for(let i=0;i<2*Math.max(1,Math.round(L/CS));i++)if(rnd()<.25){const p=fc.sg.at(rr(.5,L-.5));fallNear(p,fc.side,1.2,color(.3,0))}}

  M.meshes(root,mats.wall);
  const looseGeos=[0,1].map(i=>roughBox(2,2,2,.06,.11,i+7));
  instance(root,loose,looseGeos,mats.brick);
  W.looseCount=loose.length}
