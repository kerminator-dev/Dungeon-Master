'use strict';
// ---------- лабиринт: логическая сетка + искривлённый мир ----------
// Сетка нужна только для связности. Всё видимое проходит через warp(),
// поэтому коридоры плавно изгибаются, а углы перестают быть прямыми.
const CS=3.2;          // шаг клетки, м
const WT=.62;          // толщина стены
let W=null,TH=null;

function warp(gx,gz){const f=.27,a=W.A;
  return [gx*CS+a*(Noise.n2(gx*f+3.1,gz*f+7.7)+.35*Noise.n2(gx*.9+1.3,gz*.9-4.1)),
          gz*CS+a*(Noise.n2(gx*f+11.3,gz*f+1.9)+.35*Noise.n2(gx*.9-6.2,gz*.9+2.7))]}
function toGrid(x,z){let gx=x/CS,gz=z/CS;
  for(let i=0;i<6;i++){const w=warp(gx,gz);gx+=(x-w[0])/CS;gz+=(z-w[1])/CS}return [gx,gz]}

// V[i][j]: стена x=i между клетками (i-1,j)/(i,j); Hh[i][j]: стена z=j между (i,j-1)/(i,j)
function genGrid(n){
  const V=[],Hh=[];
  for(let i=0;i<=n;i++)V[i]=new Uint8Array(n).fill(1);
  for(let i=0;i<n;i++)Hh[i]=new Uint8Array(n+1).fill(1);
  const seen=new Uint8Array(n*n),st=[[0,0]];seen[0]=1;
  while(st.length){const [x,y]=st[st.length-1],nb=[];
    if(x>0&&!seen[(x-1)*n+y])nb.push([-1,0]);if(x<n-1&&!seen[(x+1)*n+y])nb.push([1,0]);
    if(y>0&&!seen[x*n+y-1])nb.push([0,-1]);if(y<n-1&&!seen[x*n+y+1])nb.push([0,1]);
    if(!nb.length){st.pop();continue}
    const [dx,dy]=pick(nb);
    if(dx===1)V[x+1][y]=0;else if(dx===-1)V[x][y]=0;else if(dy===1)Hh[x][y+1]=0;else Hh[x][y]=0;
    seen[(x+dx)*n+y+dy]=1;st.push([x+dx,y+dy])}
  // немного петель
  for(let k=0;k<n*n*.07;k++){if(rnd()<.5){V[ri(1,n-1)][ri(0,n-1)]=0}else{Hh[ri(0,n-1)][ri(1,n-1)]=0}}
  // залы: снимаем внутренние стены в блоке клеток
  const rooms=[];
  for(let k=0;k<Math.max(1,Math.floor(n*n/40));k++){const w=ri(2,3),h=ri(2,3);if(w>=n||h>=n)continue;
    const i0=ri(0,n-w),j0=ri(0,n-h);if(i0+j0===0)continue;
    for(let i=i0+1;i<i0+w;i++)for(let j=j0;j<j0+h;j++)V[i][j]=0;
    for(let i=i0;i<i0+w;i++)for(let j=j0+1;j<j0+h;j++)Hh[i][j]=0;
    rooms.push([i0,j0,w,h])}
  const open=(i,j,di,dj)=>di===1?!V[i+1][j]:di===-1?!V[i][j]:dj===1?!Hh[i][j+1]:!Hh[i][j];
  // выход: самая дальняя клетка на дальних краях
  const dist=new Int32Array(n*n).fill(-1),q=[0];dist[0]=0;
  while(q.length){const c=q.shift(),i=Math.floor(c/n),j=c%n;
    for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=i+di,b=j+dj;
      if(a<0||b<0||a>=n||b>=n||dist[a*n+b]>=0||!open(i,j,di,dj))continue;dist[a*n+b]=dist[c]+1;q.push(a*n+b)}}
  let best=null;
  for(let t=0;t<n;t++){for(const [i,j,di,dj] of [[n-1,t,1,0],[t,n-1,0,1]]){
    if(!best||dist[i*n+j]>best.d)best={i,j,di,dj,d:dist[i*n+j]}}}
  if(best.di)V[n][best.j]=0;else Hh[best.i][n]=0;
  return {V,Hh,rooms,open,exit:best}}

function buildLayout(n){
  const M=genGrid(n),N1=n+1;W.n=n;W.M=M;
  const segs=[],deg=new Uint8Array(N1*N1),thru=new Uint8Array(N1*N1);
  for(let i=0;i<=n;i++)for(let j=0;j<n;j++)if(M.V[i][j]){deg[i*N1+j]++;deg[i*N1+j+1]++}
  for(let i=0;i<n;i++)for(let j=0;j<=n;j++)if(M.Hh[i][j]){deg[i*N1+j]++;deg[(i+1)*N1+j]++}
  // прямые участки подряд склеиваются в одну стену: узел, где стена просто продолжается, без колонны и без шва
  const add=(a,b,outer)=>segs.push({a,b,outer});
  for(let i=0;i<=n;i++)for(let j=0;j<n;){if(!M.V[i][j]){j++;continue}let e=j+1;
    while(e<n&&M.V[i][e]&&deg[i*N1+e]===2){thru[i*N1+e]=1;e++}add([i,j],[i,e],i===0||i===n);j=e}
  for(let j=0;j<=n;j++)for(let i=0;i<n;){if(!M.Hh[i][j]){i++;continue}let e=i+1;
    while(e<n&&M.Hh[e][j]&&deg[e*N1+j]===2){thru[e*N1+j]=1;e++}add([i,j],[e,j],j===0||j===n);i=e}
  W.deg=v=>deg[v[0]*N1+v[1]];
  W.crum=new Float32Array(N1*N1);
  for(let i=0;i<=n;i++)for(let j=0;j<=n;j++)if(deg[i*N1+j]===1)W.crum[i*N1+j]=rr(.15,1.5)*(TH.indoor?.6:1);
  W.crumAt=v=>W.crum[v[0]*N1+v[1]];
  for(const s of segs){const K=12*Math.max(1,Math.abs(s.b[0]-s.a[0])+Math.abs(s.b[1]-s.a[1])),pts=[],cum=[0];
    for(let k=0;k<=K;k++){const t=k/K;pts.push(warp(lerp(s.a[0],s.b[0],t),lerp(s.a[1],s.b[1],t)))}
    for(let k=1;k<=K;k++)cum.push(cum[k-1]+Math.hypot(pts[k][0]-pts[k-1][0],pts[k][1]-pts[k-1][1]));
    s.pts=pts;s.cum=cum;s.len=cum[K];s.lean=rr(-.03,.03);
    s.at=v=>{let k=0;while(k<K-1&&cum[k+1]<v)k++;const t=(v-cum[k])/(cum[k+1]-cum[k]),p=pts[k],q=pts[k+1],l=cum[k+1]-cum[k];
      return {x:lerp(p[0],q[0],t),z:lerp(p[1],q[1],t),tx:(q[0]-p[0])/l,tz:(q[1]-p[1])/l}}}
  W.segs=segs;
  // узлы: колонны на стыках, одиночные столбы в залах
  W.cols=[];
  for(let i=0;i<=n;i++)for(let j=0;j<=n;j++){const d=deg[i*N1+j];
    if(thru[i*N1+j]||d===0&&(i===0||j===0||i===n||j===n))continue;
    if(d===0&&rnd()>.55)continue;
    const p=warp(i,j);W.cols.push({x:p[0],z:p[1],v:[i,j],deg:d,crum:d===1?W.crum[i*N1+j]:0,pillar:d===0})}
  // мир в метрах
  const m=2*CS;W.b={x0:-m,z0:-m,x1:n*CS+m,z1:n*CS+m};
  buildOcc();
  const e=M.exit;W.exitCell=e;
  const ep=warp(e.i+.5+e.di*1.05,e.j+.5+e.dj*1.05);W.exitPos={x:ep[0],z:ep[1]};
  const sp=warp(.5,.5);W.start={x:sp[0],z:sp[1],yaw:M.open(0,0,1,0)?-Math.PI/2:Math.PI}}

// пометить непроходимой «капсулу» вокруг отрезка p-q
function occStamp(p,q,rad){const o=W.occ,R=o.R,b=W.b,gw=o.gw,gh=o.gh,occ=o.occ;const x0=Math.max(0,Math.floor((Math.min(p[0],q[0])-rad-b.x0)/R)),x1=Math.min(gw-1,Math.ceil((Math.max(p[0],q[0])+rad-b.x0)/R)),
    z0=Math.max(0,Math.floor((Math.min(p[1],q[1])-rad-b.z0)/R)),z1=Math.min(gh-1,Math.ceil((Math.max(p[1],q[1])+rad-b.z0)/R));
    const dx=q[0]-p[0],dz=q[1]-p[1],ll=dx*dx+dz*dz||1e-9,r2=rad*rad;
    for(let gz=z0;gz<=z1;gz++)for(let gx=x0;gx<=x1;gx++){const x=b.x0+(gx+.5)*R,z=b.z0+(gz+.5)*R;
      const t=clamp(((x-p[0])*dx+(z-p[1])*dz)/ll,0,1),ex=p[0]+dx*t-x,ez=p[1]+dz*t-z;if(ex*ex+ez*ez<r2)occ[gz*gw+gx]=1}}
// растровая карта проходимости (0.1 м) + поле расстояний до стен
function buildOcc(){const R=.1,b=W.b,gw=Math.ceil((b.x1-b.x0)/R),gh=Math.ceil((b.z1-b.z0)/R),occ=new Uint8Array(gw*gh);
  W.occ={R,gw,gh,occ};
  for(const s of W.segs)for(let k=0;k<s.pts.length-1;k++)occStamp(s.pts[k],s.pts[k+1],WT/2+.04);
  for(const c of W.cols)occStamp([c.x,c.z],[c.x,c.z],.5);
  // чамфер-расстояние, в метрах
  const D=new Float32Array(gw*gh);for(let i=0;i<D.length;i++)D[i]=occ[i]?0:1e6;
  const S2=1.4142;
  for(let z=0;z<gh;z++)for(let x=0;x<gw;x++){const i=z*gw+x;let d=D[i];if(!d)continue;
    if(x>0)d=Math.min(d,D[i-1]+1);if(z>0){d=Math.min(d,D[i-gw]+1);if(x>0)d=Math.min(d,D[i-gw-1]+S2);if(x<gw-1)d=Math.min(d,D[i-gw+1]+S2)}D[i]=d}
  for(let z=gh-1;z>=0;z--)for(let x=gw-1;x>=0;x--){const i=z*gw+x;let d=D[i];if(!d)continue;
    if(x<gw-1)d=Math.min(d,D[i+1]+1);if(z<gh-1){d=Math.min(d,D[i+gw]+1);if(x<gw-1)d=Math.min(d,D[i+gw+1]+S2);if(x>0)d=Math.min(d,D[i+gw-1]+S2)}D[i]=d}
  for(let i=0;i<D.length;i++)D[i]=Math.min(D[i]*R,50);
  W.occ.D=D}

function wallDist(x,z){const o=W.occ,b=W.b,fx=(x-b.x0)/o.R-.5,fz=(z-b.z0)/o.R-.5;
  const x0=clamp(Math.floor(fx),0,o.gw-2),z0=clamp(Math.floor(fz),0,o.gh-2),tx=clamp(fx-x0,0,1),tz=clamp(fz-z0,0,1),D=o.D,i=z0*o.gw+x0;
  return lerp(lerp(D[i],D[i+1],tx),lerp(D[i+o.gw],D[i+o.gw+1],tx),tz)}
function blocked(x,z){const o=W.occ,b=W.b,gx=Math.floor((x-b.x0)/o.R),gz=Math.floor((z-b.z0)/o.R);
  if(gx<0||gz<0||gx>=o.gw||gz>=o.gh)return true;return o.occ[gz*o.gw+gx]===1}
// пол: мягкие перепады + осыпь у стен
function floorH(x,z){return .07*Noise.fbm(x*.3,z*.3,3)+.035*Noise.n2(x*1.7,z*1.7)+.06*(1-sstep(0,.7,wallDist(x,z)))}
// свод: сам выгибается по форме коридоров (от поля расстояний), плюс провисания
function ceilH(x,z){const d=wallDist(x,z);
  return TH.H+.22*Noise.fbm(x*.22+40,z*.22-7,3)+TH.vault*(1-Math.pow(1-Math.min(d/1.45,1),2))-.12*Math.max(0,Noise.n2(x*.6+3,z*.6))}
