'use strict';
// ---------- даль: башни, замки, акведуки, храмы и деревни вокруг уличных лабиринтов ----------
// Постройки стоят кольцом за стенами лабиринта, на холмах, и видны поверх кладки. Всё склеено в три
// меша: тёсаный камень (кладка по мировым координатам, блок 1.2×0.6 м), гладкие крыши/дерево/флаги
// и светящиеся окна. Сигнальные костры на башнях — обычные огни без источника света, только крупные.
const SKY_G={};   // единичные фигуры, низ на нуле
function skyGeo(k){if(SKY_G[k])return SKY_G[k];const [t,a,b,c,d]=k.split(':').map((v,i)=>i?+v:v);let g;
  if(t==='box')g=new THREE.BoxGeometry(1,1,1).translate(0,.5,0);
  else if(t==='cyl')g=new THREE.CylinderGeometry(b||1,1,1,a).translate(0,.5,0);          // b — радиус верха к низу
  else if(t==='cone')g=new THREE.ConeGeometry(1,1,a).translate(0,.5,0);
  else if(t==='ball')g=new THREE.IcosahedronGeometry(1,1);
  else if(t==='gable'){const s=new THREE.Shape();s.moveTo(-.5,0);s.lineTo(.5,0);s.lineTo(0,1);s.lineTo(-.5,0);
    g=new THREE.ExtrudeGeometry(s,{depth:1,bevelEnabled:false}).translate(0,0,-.5)}
  else if(t==='arch'){// стенка a×b (м) с полукруглым проёмом шириной c, пята на высоте d; толщина 1
    const w=c/2,s=new THREE.Shape();s.moveTo(-a/2,0);s.lineTo(-w,0);s.lineTo(-w,d);s.absarc(0,d,w,Math.PI,0,true);
    s.lineTo(w,0);s.lineTo(a/2,0);s.lineTo(a/2,b);s.lineTo(-a/2,b);s.lineTo(-a/2,0);
    g=new THREE.ExtrudeGeometry(s,{depth:1,bevelEnabled:false,curveSegments:8}).translate(0,0,-.5)}
  return SKY_G[k]=g}

// склейка с плоскими нормалями; uv из мировых координат: стены — вдоль грани и по высоте, верх — сверху
function skyMerge(parts,uvs){const P=[],N=[],U=[],C=[],c=new THREE.Color(),a=new THREE.Vector3(),b=new THREE.Vector3(),n=new THREE.Vector3();
  for(const [g0,col,m] of parts){const g=g0.index?g0.toNonIndexed():g0.clone();g.applyMatrix4(m);const p=g.attributes.position.array;c.set(col);
    for(let i=0;i<p.length;i+=9){a.set(p[i+3]-p[i],p[i+4]-p[i+1],p[i+5]-p[i+2]);b.set(p[i+6]-p[i],p[i+7]-p[i+1],p[i+8]-p[i+2]);n.crossVectors(a,b).normalize();
      const tl=Math.hypot(n.x,n.z)||1,tx=-n.z/tl,tz=n.x/tl,up=Math.abs(n.y)>.7;
      for(let j=i;j<i+9;j+=3){P.push(p[j],p[j+1],p[j+2]);N.push(n.x,n.y,n.z);C.push(c.r,c.g,c.b);
        U.push(up?p[j]/uvs:(p[j]*tx+p[j+2]*tz)/uvs,up?p[j+2]/uvs:p[j+1]/uvs)}}
    g.dispose()}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));g.setAttribute('color',new THREE.Float32BufferAttribute(C,3));g.computeBoundingSphere();return g}

// th — высота рельефа, (cx,cz,half) — квадрат лабиринта; возвращает круги, занятые постройками (там не растут деревья)
function buildSkyline(root,th,cx,cz,half){const SK=TH.skyline,foot=[];if(!SK)return foot;
  const stone=[],flat=[],glow=[],snow=!!TH.snow,snowC=new THREE.Color('#eef3fa'),dark='#17120e';
  let F=new THREE.Matrix4(),Y0=0;
  const put=(L,k,col,x,y,z,sx,sy,sz,ry=0,rx=0,rz=0)=>L.push([skyGeo(k),col,F.clone().multiply(_m4(x,y,z,rx,ry,rz,sx,sy,sz))]);
  const sub=(x,y,z,a,fn)=>{const F0=F;F=F0.clone().multiply(_m4(x,y,z,0,a,0));fn();F=F0};
  const world=(x,y,z)=>new THREE.Vector3(x,y,z).applyMatrix4(F);
  const ground=(x,z)=>{const p=world(x,0,z);return th(p.x,p.z)-Y0};      // рельеф в локальных координатах площадки
  const tone=(k=1)=>new THREE.Color(pick(SK.stone)).multiplyScalar(rr(.9,1.08)*k);
  const roofC=()=>{const c=new THREE.Color(pick(SK.roof)).multiplyScalar(rr(.9,1.1));return snow?c.lerp(snowC,.6):c};
  const lit=p=>rnd()<SK.lit*p;
  const win=(x,y,z,a,w,h,on)=>put(on?glow:flat,'box',on?new THREE.Color(pick(SK.glow)).multiplyScalar(rr(.75,1.1)):dark,x,y,z,w,h,.14,a);
  const cap=(x,y,z,w,d,a=0)=>{if(snow)put(flat,'box',snowC,x,y,z,w+.12,.2,d+.12,a)};
  const flag=(x,y,z)=>{put(flat,'cyl:5',dark,x,y,z,.07,3.2,.07);const a=rr(0,6.3);
    put(flat,'box',pick(SK.flag),x+Math.sin(a)*.8,y+2.3,z+Math.cos(a)*.8,.05,.8,1.6,a)};
  const beacon=(x,y,z)=>{put(flat,'cyl:8:1.4','#2a2420',x,y,z,.55,.6,.55);const p=world(x,y,z);
    const l={x:p.x,y:p.y+1.5,z:p.z,base:p.y,kind:'beacon',k0:5,nx:0,nz:0,nolight:1};W.lights.push(l);makeFlame(root,l)};
  // зубцы вдоль отрезка; у руин часть выбита
  const merlons=(x0,z0,x1,z1,y,c,gap=0)=>{const L=Math.hypot(x1-x0,z1-z0),k=Math.max(1,Math.round(L/1.6)),a=Math.atan2(x1-x0,z1-z0);
    for(let i=0;i<k;i++){if(rnd()<gap)continue;const t=(i+.5)/k,x=lerp(x0,x1,t),z=lerp(z0,z1,t);put(stone,'box',c,x,y,z,.55,1.05,.8,a);cap(x,y+1.05,z,.55,.8,a)}};

  // ---- башня: круглая или гранёная, с поясками, бойницами по спирали, машикулями и шатром ----
  const tower=(x,y,z,o)=>{const r=o.r,h=o.h,n=o.n||12,c=o.col||tone(),dk=c.clone().multiplyScalar(.8),rAt=s=>r*(1-.07*(s-y)/h),rt=rAt(y+h);
    put(stone,'cyl:'+n+':.86',c,x,y-7,z,r*1.24,8.6,r*1.24);                                   // откос, уходит в склон
    put(stone,'cyl:'+n+':.93',c,x,y+1.6,z,r,h-1.6,r);
    for(let s=y+rr(5,7);s<y+h-3;s+=rr(5,7.5)){const q=rAt(s)*1.05;put(stone,'cyl:'+n,dk,x,s,z,q,.38,q)}
    for(let s=y+4,a=rr(0,6.3);s<y+h-2.5;s+=rr(2.6,3.4),a+=rr(1.7,2.5)){const q=rAt(s)+.02;win(x+Math.sin(a)*q,s,z+Math.cos(a)*q,a,.34,1.15,lit(.5))}
    const top=y+h;
    if(o.top==='broken'){// обломанный верх: блоки по кругу разной высоты, пролом с одной стороны
      const k=Math.round(n*1.6),a0=rr(0,6.3);
      for(let i=0;i<k;i++){const a=(i+.5)/k*6.283,f=.5+.5*Math.cos(a-a0),hh=f*rr(1.6,5.5)-rr(0,1.4);if(hh<.35)continue;
        put(stone,'box',c,x+Math.sin(a)*rt*.86,top,z+Math.cos(a)*rt*.86,2*Math.PI*rt/k*1.04,hh,rt*.3,a)}
      return top}
    const R=rt*1.17;
    for(let i=0;i<n*2;i++){const a=(i+.5)/(n*2)*6.283;put(stone,'box',dk,x+Math.sin(a)*rt*1.07,top-1.15,z+Math.cos(a)*rt*1.07,.34,1.15,.5,a)}  // консоли
    put(stone,'cyl:'+n,c,x,top,z,R,1.4,R);
    for(let i=0;i<n;i++){const a=(i+.5)/n*6.283;win(x+Math.sin(a)*(R+.02),top+.75,z+Math.cos(a)*(R+.02),a,.3,.55,lit(.35))}
    if(o.roof){const rh=R*o.roof;put(flat,'cone:'+n,roofC(),x,top+1.4,z,R*1.12,rh,R*1.12);
      put(flat,'cyl:6',dark,x,top+1.4+rh-.2,z,.08,1.2,.08);put(flat,'ball',pick(SK.flag),x,top+1.4+rh+.95,z,.22,.22,.22);
      if(o.flag)flag(x,top+1.4+rh+.9,z);return top+1.4+rh}
    const k=Math.max(6,Math.round(2*Math.PI*R/1.6));
    for(let i=0;i<k;i++){if(rnd()<o.gap)continue;const a=(i+.5)/k*6.283,px=x+Math.sin(a)*(R-.3),pz=z+Math.cos(a)*(R-.3);
      put(stone,'box',c,px,top+1.4,pz,.6,1.05,2*Math.PI*R/k*.5,a+Math.PI/2);cap(px,top+2.45,pz,.6,2*Math.PI*R/k*.5,a+Math.PI/2)}
    cap(x,top+1.4,z,R*1.3,R*1.3);
    if(o.beacon)beacon(x,top+1.4,z);else if(o.flag)flag(x,top+1.4,z);
    return top+1.4};

  // ---- донжон: квадратный, с поясками, рядами окон, угловыми башенками и шатром ----
  const keep=(x,y,z,o)=>{const w=o.w,h=o.h,c=tone(),dk=c.clone().multiplyScalar(.82),ruin=o.ruin;
    put(stone,'box',c,x,y-7,z,w*1.12,8,w*1.12);put(stone,'box',c,x,y+1,z,w,h-1,w);
    for(let s=y+rr(6,7);s<y+h-2;s+=rr(5,6.5))put(stone,'box',dk,x,s,z,w+.3,.38,w+.3);
    for(let f=0;f<4;f++){const a=f*Math.PI/2,sx=Math.sin(a),sz=Math.cos(a);
      for(let s=y+4;s<y+h-3;s+=3.4)for(const u of [-.3,0,.3])if(u===0||rnd()<.7)win(x+sx*(w/2+.03)+sz*u*w,s,z+sz*(w/2+.03)-sx*u*w,a,.6,1.4,lit(1))}
    const top=y+h,W2=w+.7;put(stone,'box',dk,x,top-.6,z,W2,.6,W2);put(stone,'box',c,x,top,z,W2,1.3,W2);
    for(let f=0;f<4;f++){const a=f*Math.PI/2,sx=Math.sin(a),sz=Math.cos(a),e=W2/2-.3;
      merlons(x+sx*e-sz*e,z+sz*e+sx*e,x+sx*e+sz*e,z+sz*e-sx*e,top+1.3,c,ruin?.35:0)}
    if(!ruin){put(flat,'cone:4',roofC(),x,top+1.3,z,w*.6,w*.8,w*.6,Math.PI/4);flag(x,top+1.3+w*.8-.3,z)}
    for(const [sx,sz] of [[-1,-1],[-1,1],[1,-1],[1,1]]){const px=x+sx*W2/2,pz=z+sz*W2/2;   // угловые башенки на консолях
      if(ruin&&rnd()<.5)continue;put(stone,'cone:10',dk,px,top-2.2,pz,1.35,2.2,1.35,0,Math.PI);
      put(stone,'cyl:10',c,px,top-2.2,pz,1.35,4.2,1.35);win(px+sx*.68,top,pz+sz*.68,Math.atan2(sx,sz),.3,.8,lit(.6));
      if(!ruin)put(flat,'cone:10',roofC(),px,top+2,pz,1.6,4.4,1.6);else cap(px,top+2,pz,2,2)}
    return top};

  // ---- куртина между двумя точками; у руин — пролом посередине ----
  const curtain=(x0,z0,x1,z1,h,c,ruin)=>{const L=Math.hypot(x1-x0,z1-z0),a=Math.atan2(x1-x0,z1-z0),k=Math.max(1,Math.round(L/3)),g=rr(.3,.7);
    for(let i=0;i<k;i++){const t0=i/k,t1=(i+1)/k,t=(t0+t1)/2,x=lerp(x0,x1,t),z=lerp(z0,z1,t),gb=ground(x,z),
        hh=Math.max(gb+.8,ruin?h*(1-.85*Math.exp(-Math.pow((t-g)/.16,2)))+rr(-.6,.4):h);
      put(stone,'box',c,x,gb-5,z,2.4,hh+5-gb,L/k+.02,a);
      if(hh>h*.85){put(stone,'box',c.clone().multiplyScalar(.84),x,hh-.45,z,3,.45,L/k+.02,a);
        for(const sd of [-1.2,1.2]){const ox=Math.cos(a)*sd,oz=-Math.sin(a)*sd;merlons(lerp(x0,x1,t0)+ox,lerp(z0,z1,t0)+oz,lerp(x0,x1,t1)+ox,lerp(z0,z1,t1)+oz,hh,c,ruin?.3:0)}}
      else cap(x,hh,z,2.4,L/k,a)}};

  // ---- замок: кольцо башен с куртинами, надвратная башня с решёткой, донжон и палаты ----
  const castle=()=>{const n=ri(5,6),R=rr(17,21),hw=ri(16,20)/2,c=tone(),ruin=SK.ruin,P=[];
    for(let i=0;i<n;i++){const a=(i+.5)/n*6.283,q=R*rr(.88,1.08);P.push([Math.sin(a)*q,Math.cos(a)*q])}
    for(let i=0;i<n;i++){const A=P[i],B=P[(i+1)%n];
      if(i<n-1){curtain(A[0],A[1],B[0],B[1],hw,c,ruin&&rnd()<.6);continue}
      // ворота смотрят на лабиринт (+z): куртина с разрывом, по бокам две башни, между ними арка
      const mx=(A[0]+B[0])/2,mz=(A[1]+B[1])/2,L=Math.hypot(B[0]-A[0],B[1]-A[1]),dx=(B[0]-A[0])/L,dz=(B[1]-A[1])/L,a=Math.atan2(dx,dz);
      curtain(A[0],A[1],mx-dx*4.5,mz-dz*4.5,hw,c,false);curtain(mx+dx*4.5,mz+dz*4.5,B[0],B[1],hw,c,false);
      sub(mx,0,mz,a-Math.PI/2,()=>{put(stone,'arch:7:'+(hw+3)+':3.4:3.2',c,0,0,0,1,1,4);put(stone,'box',c,0,-5,0,7,5,4);
        put(SK.lit>.4?glow:flat,'box',SK.lit>.4?new THREE.Color(SK.glow[0]).multiplyScalar(.7):dark,0,0,-1.85,3.4,4.9,.1);
        for(let i=-2;i<=2;i++)put(flat,'box','#2a2622',i*.62,0,1.7,.12,4.8,.12);for(let j=1;j<5;j++)put(flat,'box','#2a2622',0,j*.95,1.7,3.4,.12,.12);
        put(stone,'box',c.clone().multiplyScalar(.84),0,hw+3,0,7.4,.5,4.4);merlons(-3.4,1.9,3.4,1.9,hw+3.5,c);merlons(-3.4,-1.9,3.4,-1.9,hw+3.5,c);
        for(const s of [-1,1])tower(s*4.6,0,0,{r:2.3,h:hw+5,n:10,roof:ruin?0:2.4,top:ruin&&rnd()<.5?'broken':'',gap:ruin?.3:0,col:c})})}
    for(const p of P)tower(p[0],ground(p[0],p[1]),p[1],{r:rr(2.7,3.4),h:hw+rr(4,8),roof:ruin?0:rr(2,2.8),top:ruin&&rnd()<.6?'broken':'',gap:ruin?.35:0,beacon:!ruin&&rnd()<.4,col:c,flag:!ruin});
    const kw=rr(10,13),kh=rr(22,28),kz=-R*.25;keep(0,ground(0,kz),kz,{w:kw,h:kh,ruin});
    tower(kw/2,ground(kw/2,kz+kw/2),kz+kw/2,{r:2.4,h:kh+rr(6,10),n:10,roof:ruin?0:3,top:ruin?'broken':'',beacon:ruin,flag:!ruin});
    // палаты во дворе
    for(const s of [-1,1]){const hx=s*R*.42,hz=R*.15,hl=rr(9,13),hh=rr(6,8);if(ruin&&rnd()<.5)continue;
      sub(hx,ground(hx,hz),hz,s*.25,()=>{put(stone,'box',tone(),0,-4,0,6,hh+4,hl);if(!ruin)put(flat,'gable',roofC(),0,hh,0,6.8,3.6,hl+.6);else cap(0,hh,0,6,hl);
        for(let q=-hl/2+2;q<hl/2-1;q+=2.6)for(const e of [-1,1])win(e*3.02,hh*.55,q,e*Math.PI/2,.5,1.4,lit(1))})}
    return R+8};

  // ---- акведук в два яруса; у руин — обрушенные пролёты ----
  const aqueduct=()=>{const Bw=ri(12,15)/2,N=ri(9,13),L=N*Bw,c=tone(),H1=ri(11,13),H2=ri(11,14)/2;let yb=1e9;
    for(let x=-L/2;x<=L/2;x+=2)yb=Math.min(yb,ground(x,0));yb-=1;
    const b0=ri(2,N-4),bl=ri(1,2),cut2=ri(0,N-3),lost=i=>SK.ruin&&i>=b0&&i<b0+bl;
    for(let i=0;i<N;i++){const x=-L/2+(i+.5)*Bw,col=c.clone().multiplyScalar(rr(.93,1.06));
      if(lost(i)){put(stone,'box',col,x-Bw*.3,yb,0,Bw*.38,rr(3,6),3);continue}                 // обломок опоры
      put(stone,'box',col,x,yb-6,0,Bw,6.02,3);put(stone,'arch:'+Bw+':'+H1+':'+(Bw*.62).toFixed(2)+':'+(H1-Bw*.31-1.4).toFixed(2),col,x,yb,0,1,1,3);
      put(stone,'box',col.clone().multiplyScalar(.82),x,yb+H1,0,Bw+.02,.55,3.5);
      if(lost(i-1)||lost(i+1)||SK.ruin&&i>=cut2&&i<cut2+2){cap(x,yb+H1+.55,0,Bw,3.5);continue}
      for(const s of [-.25,.25])put(stone,'arch:'+(Bw/2)+':'+H2+':'+(Bw*.3).toFixed(2)+':'+(H2-Bw*.15-1).toFixed(2),col,x+s*Bw,yb+H1+.55,0,1,1,2.6);
      put(stone,'box',col.clone().multiplyScalar(.85),x,yb+H1+.55+H2,0,Bw+.02,.5,3);put(stone,'box',col,x,yb+H1+1.05+H2,0,Bw+.02,1.3,2.2);
      cap(x,yb+H1+2.35+H2,0,Bw,2.2)}
    for(let x=-L/2;x<=L/2;x+=8){const p=world(x,0,0);foot.push({x:p.x,z:p.z,r:5})}
    return 0};

  // ---- храм: ступенчатое основание, колоннада, антаблемент, фронтон; руины — с упавшими барабанами ----
  const temple=()=>{const cw=rr(13,16),cl=cw*rr(1.5,1.8),c=new THREE.Color(SK.marble).multiplyScalar(rr(.95,1.05)),hc=rr(8,9.5),y0=1.5,ruin=SK.ruin,sp=3.1;
    put(stone,'box',c.clone().multiplyScalar(.9),0,-5,0,cw+3.4,5.5,cl+3.4);put(stone,'box',c,0,.5,0,cw+1.8,.5,cl+1.8);put(stone,'box',c,0,1,0,cw+.8,.5,cl+.8);
    const nx=Math.round(cw/sp),nz=Math.round(cl/sp),cols=[];
    for(let i=0;i<=nx;i++)for(let j=0;j<=nz;j++)if(i===0||j===0||i===nx||j===nz)cols.push({x:-cw/2+.6+i*(cw-1.2)/nx,z:-cl/2+.6+j*(cl-1.2)/nz,i,j});
    const fallen=[];
    for(const q of cols){q.h=ruin&&rnd()<.4?(rnd()<.3?0:hc*rr(.15,.7)):hc;
      if(q.h<hc)fallen.push(q);if(!q.h)continue;
      put(stone,'box',c,q.x,y0,q.z,1.5,.35,1.5);put(stone,'cyl:12:.86',c,q.x,y0+.35,q.z,.6,q.h-.35,.6);
      if(q.h===hc){put(stone,'cyl:12:1.4',c,q.x,y0+hc-.5,q.z,.55,.4,.55);put(stone,'box',c,q.x,y0+hc-.12,q.z,1.6,.4,1.6)}
      else cap(q.x,y0+q.h,q.z,1.1,1.1)}
    const at=(i,j)=>cols.find(q=>q.i===i&&q.j===j);
    // архитрав над каждой парой целых соседних колонн
    const beam=(a,b)=>{if(!a||!b||a.h<hc||b.h<hc)return;const mx=(a.x+b.x)/2,mz=(a.z+b.z)/2,L=Math.hypot(b.x-a.x,b.z-a.z)+1.6,an=Math.atan2(b.x-a.x,b.z-a.z);
      put(stone,'box',c,mx,y0+hc+.28,mz,1.5,1,L,an);put(stone,'box',c.clone().multiplyScalar(.86),mx,y0+hc+1.28,mz,1.9,.45,L+.3,an);cap(mx,y0+hc+1.73,mz,1.9,L+.3,an)};
    for(let i=0;i<nx;i++){beam(at(i,0),at(i+1,0));beam(at(i,nz),at(i+1,nz))}
    for(let j=0;j<nz;j++){beam(at(0,j),at(0,j+1));beam(at(nx,j),at(nx,j+1))}
    for(const j of [0,nz]){let ok=true;for(let i=0;i<=nx;i++)if(at(i,j).h<hc)ok=false;
      if(ok)put(stone,'gable',c,0,y0+hc+1.73,cols.find(q=>q.j===j).z,cw+.2,3.3,1.6)}
    put(stone,'box',tone(),0,y0,-cl*.05,cw-5,ruin?rr(2,4.5):hc,cl-6);                      // стены целлы
    for(const q of fallen.slice(0,8))for(let k=ri(1,3);k>0;k--){const a=rr(0,6.3),d=rr(2,6),x=q.x+Math.sin(a)*d,z=q.z+Math.cos(a)*d;
      put(stone,'cyl:12',c.clone().multiplyScalar(rr(.85,1)),x,ground(x,z)+.55,z,.6,rr(1.2,2.2),.6,rr(0,6.3),0,Math.PI/2)}
    return Math.max(cw,cl)/2+6};

  // ---- деревня: домики с двускатными крышами, трубами и тёплыми окнами, часовня ----
  const house=(x,z,a)=>{const w=rr(4.2,5.6),l=rr(6,8.5),h=rr(3.2,4.4),c=new THREE.Color(pick(SK.house)).multiplyScalar(rr(.9,1.08)),y=ground(x,z);
    sub(x,y,z,a,()=>{put(stone,'box',c,0,-4,0,w,h+4,l);put(flat,'gable',roofC(),0,h,0,w+1.1,rr(2.6,3.4),l+.9);
      for(const [sx,sz] of [[-1,-1],[-1,1],[1,-1],[1,1]])put(flat,'box',SK.wood,sx*(w/2-.08),0,sz*(l/2-.08),.3,h,.3);
      put(flat,'box',SK.wood,0,h-.2,0,w+.1,.25,l+.1);
      put(stone,'box',c.clone().multiplyScalar(.7),w*.22,h,l*.22,.8,3,.8);cap(w*.22,h+3,l*.22,.8,.8);
      put(flat,'box',SK.wood,0,0,l/2+.03,1.1,2,.12);win(0,h*.62+.6,l/2+.04,0,.7,.8,lit(1));
      for(const e of [-1,1])for(let q=-l/2+1.6;q<l/2-1;q+=2.4)win(e*(w/2+.03),h*.42,q,e*Math.PI/2,.7,.9,lit(1))})
    return Math.max(w,l)/2};
  const village=()=>{const hs=[],n=ri(6,9);
    for(let t=0;t<60&&hs.length<n;t++){const a=rr(0,6.3),d=Math.sqrt(rnd())*16,x=Math.sin(a)*d,z=Math.cos(a)*d;
      if(hs.some(h=>Math.hypot(h[0]-x,h[1]-z)<8.5))continue;hs.push([x,z]);house(x,z,rr(-.5,.5)+(rnd()<.5?0:Math.PI/2))}
    let tx=0,tz=-20;for(let i=0;i<10&&hs.some(h=>Math.hypot(h[0]-tx,h[1]-tz)<7);i++)tz-=3;   // часовня позади деревни
    tower(tx,ground(tx,tz),tz,{r:2,h:rr(13,16),n:8,roof:3.4,flag:true});return 24};

  // ---- собор: неф с контрфорсами и стрельчатыми окнами, две башни со шпилями, роза над порталом ----
  const church=()=>{const w=rr(10,12),l=rr(24,30),h=rr(12,14),c=tone(1.05),dk=c.clone().multiplyScalar(.82);
    put(stone,'box',c,0,-6,0,w,h+6,l);put(flat,'gable',roofC(),0,h,0,w+1.2,w*.7,l+.6);
    for(let q=-l/2+4;q<l/2-5;q+=4.2)for(const e of [-1,1]){put(stone,'box',dk,e*(w/2+.5),-2,q,1.2,h,1.6);
      win(e*(w/2+.03),h*.42,q+2.1,e*Math.PI/2,1,4.4,lit(1.2))}
    put(stone,'cyl:10',c,0,-6,-l/2,w*.45,h+4,w*.45);put(flat,'cone:10',roofC(),0,h-2,-l/2,w*.5,w*.42,w*.5);     // апсида
    const tw=4.4,thh=h+rr(9,12),fz=l/2-tw/2+.6;
    for(const s of [-1,1]){const tx=s*(w/2-.4);put(stone,'box',c,tx,-6,fz,tw,thh+6,tw);
      for(let y=4;y<thh-2;y+=4.5)put(stone,'box',dk,tx,y,fz,tw+.3,.35,tw+.3);
      for(let y=h+1.5;y<thh-1;y+=3.6)for(let f=0;f<4;f++){const a=f*Math.PI/2;win(tx+Math.sin(a)*(tw/2+.03),y,fz+Math.cos(a)*(tw/2+.03),a,.5,1.8,lit(.8))}
      put(stone,'box',dk,tx,thh,fz,tw+.5,.6,tw+.5);
      for(const [sx,sz] of [[-1,-1],[-1,1],[1,-1],[1,1]])put(flat,'cone:6',roofC(),tx+sx*(tw/2-.2),thh+.6,fz+sz*(tw/2-.2),.35,2.4,.35);
      const sh=rr(10,13);put(flat,'cone:8',roofC(),tx,thh+.6,fz,tw*.5,sh,tw*.5);put(flat,'ball',SK.flag[0],tx,thh+.6+sh+.15,fz,.25,.25,.25)}
    put(glow,'cyl:16',new THREE.Color(pick(SK.glow)).multiplyScalar(.9),0,h*.66,l/2+.02,2.1,.15,2.1,0,Math.PI/2);
    put(stone,'cyl:16',dk,0,h*.66,l/2,2.5,.12,2.5,0,Math.PI/2);
    put(stone,'arch:4.2:6.5:2.4:3.4',dk,0,0,l/2+.35,1,1,.7);put(lit(1.5)?glow:flat,'box',lit(1.5)?new THREE.Color(SK.glow[0]).multiplyScalar(.6):dark,0,0,l/2+.04,2.4,4.6,.1);
    return l/2+8};

  // ---- расстановка кольцом: каждая постройка лицом к лабиринту ----
  const B={castle,aqueduct,temple,village,church,
    tower:()=>{const ruin=SK.ruin&&rnd()<.75;tower(0,0,0,{r:rr(2.8,4),h:rr(20,34),n:pick([8,10,12,14]),roof:ruin||rnd()<.35?0:rr(2,3),
      top:ruin?'broken':'',gap:SK.ruin?.3:0,beacon:!ruin&&rnd()<.6,flag:!ruin});return 6}};
  const D={castle:[36,48],aqueduct:[24,32],temple:[20,34],tower:[12,45],village:[22,36],church:[26,40]};
  const plan=SK.plan.slice();for(let i=plan.length-1;i>0;i--){const j=ri(0,i),t=plan[i];plan[i]=plan[j];plan[j]=t}
  const a0=rr(0,6.3),NP=plan.length,first=['aqueduct','castle','church','village','temple','tower'];
  // угол у каждой постройки свой, а ставим крупные первыми, чтобы мелкие подвинулись, а не они
  plan.map((kind,i)=>[kind,i]).sort((p,q)=>first.indexOf(p[0])-first.indexOf(q[0])).forEach(([kind,i])=>{for(let t=0;t<6;t++){const a=a0+(i+rr(-.3,.3))/NP*6.283,e=half/Math.max(Math.abs(Math.cos(a)),Math.abs(Math.sin(a))),
      d=rr(...D[kind])+t*7,x=cx+Math.cos(a)*(e+d),z=cz+Math.sin(a)*(e+d),r0=kind==='castle'?28:kind==='aqueduct'?30:kind==='tower'?6:22;
    if(foot.some(f=>Math.hypot(f.x-x,f.z-z)<f.r+r0))continue;
    Y0=th(x,z);F=_m4(x,Y0,z,0,Math.atan2(cx-x,cz-z)+(kind==='aqueduct'?0:rr(-.25,.25)),0);
    const r=B[kind]();if(r)foot.push({x,z,r});break}});

  // туман на постройках реже, чем на земле: силуэты читаются и при малой дальности прорисовки
  const thin=m=>{m.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <fog_fragment>',THREE.ShaderChunk.fog_fragment.replace(/fogDepth \)/g,'fogDepth*.62 )'))};return m};
  root.add(new THREE.Mesh(skyMerge(stone,2.4),thin(new THREE.MeshLambertMaterial({map:tex('ashlar',()=>mkAshlarTex()),vertexColors:true}))));
  root.add(new THREE.Mesh(skyMerge(flat,1),thin(new THREE.MeshLambertMaterial({vertexColors:true}))));
  if(glow.length)root.add(new THREE.Mesh(skyMerge(glow,1),thin(new THREE.MeshBasicMaterial({vertexColors:true}))));
  return foot}
