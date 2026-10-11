'use strict';
// ---------- лабиринт на метровой сетке ----------
// Логическая сетка клеток задаёт связность. Мир — плитки 1×1 м: стена ровно 1 м,
// коридор ровно CW м. Никаких искривлений: все коридоры одной ширины, кладка совпадает везде.
const CW=2;            // ширина коридора, м (клеток-плиток)
const CS=CW+1;         // шаг логической клетки, м
const WT=1;            // толщина стены
let W=null,TH=null;

// логические координаты (клетка i,j; узел — целые) -> метры (центр плитки)
function warp(gx,gz){return [gx*CS+.5,gz*CS+.5]}
function toGrid(x,z){return [(x-.5)/CS,(z-.5)/CS]}

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
  // прямые участки подряд — одна стена (для расстановки декора и выбоин)
  const add=(a,b,outer)=>segs.push({a,b,outer});
  for(let i=0;i<=n;i++)for(let j=0;j<n;){if(!M.V[i][j]){j++;continue}let e=j+1;
    while(e<n&&M.V[i][e]&&deg[i*N1+e]===2){thru[i*N1+e]=1;e++}add([i,j],[i,e],i===0||i===n);j=e}
  for(let j=0;j<=n;j++)for(let i=0;i<n;){if(!M.Hh[i][j]){i++;continue}let e=i+1;
    while(e<n&&M.Hh[e][j]&&deg[e*N1+j]===2){thru[e*N1+j]=1;e++}add([i,j],[e,j],j===0||j===n);i=e}
  W.deg=v=>deg[v[0]*N1+v[1]];
  W.crum=new Float32Array(N1*N1);
  for(let i=0;i<=n;i++)for(let j=0;j<=n;j++)if(deg[i*N1+j]===1)W.crum[i*N1+j]=rr(.3,1.5)*(TH.indoor?.5:1);
  W.crumAt=v=>W.crum[v[0]*N1+v[1]];
  for(const s of segs){const a=warp(...s.a),b=warp(...s.b),L=Math.hypot(b[0]-a[0],b[1]-a[1]),tx=(b[0]-a[0])/L,tz=(b[1]-a[1])/L;
    s.len=L;s.at=v=>({x:a[0]+tx*v,z:a[1]+tz*v,tx,tz})}
  W.segs=segs;
  // плитки: 1 — стена, 2 — отдельный столб в зале
  const TW=n*CS+1,tile=new Uint8Array(TW*TW);W.TW=TW;W.tile=tile;W.cols=[];
  for(let i=0;i<=n;i++)for(let j=0;j<n;j++)if(M.V[i][j])for(let k=1;k<CS;k++)tile[(i*CS)*TW+j*CS+k]=1;
  for(let i=0;i<n;i++)for(let j=0;j<=n;j++)if(M.Hh[i][j])for(let k=1;k<CS;k++)tile[(i*CS+k)*TW+j*CS]=1;
  for(let i=0;i<=n;i++)for(let j=0;j<=n;j++){const d=deg[i*N1+j];
    if(d>0)tile[(i*CS)*TW+j*CS]=1;
    else if(i>0&&j>0&&i<n&&j<n&&rnd()<.45){tile[(i*CS)*TW+j*CS]=2;const p=warp(i,j);W.cols.push({x:p[0],z:p[1],v:[i,j],pillar:true})}}
  const m=2*CS;W.b={x0:-m,z0:-m,x1:TW+m,z1:TW+m};
  buildOcc();
  const e=M.exit;W.exitCell=e;
  const ep=warp(e.i+.5+e.di*1.05,e.j+.5+e.dj*1.05);W.exitPos={x:ep[0],z:ep[1]};
  const sp=warp(.5,.5);W.start={x:sp[0],z:sp[1],yaw:M.open(0,0,1,0)?-Math.PI/2:Math.PI}}

// пометить непроходимой «капсулу» вокруг отрезка p-q
function occStamp(p,q,rad){const o=W.occ,R=o.R,b=W.b,gw=o.gw,gh=o.gh,occ=o.occ;
  const x0=Math.max(0,Math.floor((Math.min(p[0],q[0])-rad-b.x0)/R)),x1=Math.min(gw-1,Math.ceil((Math.max(p[0],q[0])+rad-b.x0)/R)),
    z0=Math.max(0,Math.floor((Math.min(p[1],q[1])-rad-b.z0)/R)),z1=Math.min(gh-1,Math.ceil((Math.max(p[1],q[1])+rad-b.z0)/R));
  const dx=q[0]-p[0],dz=q[1]-p[1],ll=dx*dx+dz*dz||1e-9,r2=rad*rad;
  for(let gz=z0;gz<=z1;gz++)for(let gx=x0;gx<=x1;gx++){const x=b.x0+(gx+.5)*R,z=b.z0+(gz+.5)*R;
    const t=clamp(((x-p[0])*dx+(z-p[1])*dz)/ll,0,1),ex=p[0]+dx*t-x,ez=p[1]+dz*t-z;if(ex*ex+ez*ez<r2)occ[gz*gw+gx]=1}}
// растровая карта проходимости (0.1 м) + поле расстояний до стен
function buildOcc(){const R=.1,b=W.b,gw=Math.ceil((b.x1-b.x0)/R),gh=Math.ceil((b.z1-b.z0)/R),occ=new Uint8Array(gw*gh);
  W.occ={R,gw,gh,occ};const TW=W.TW;
  for(let tx=0;tx<TW;tx++)for(let tz=0;tz<TW;tz++){if(!W.tile[tx*TW+tz])continue;
    const x0=Math.round((tx-.02-b.x0)/R),x1=Math.round((tx+1.02-b.x0)/R),z0=Math.round((tz-.02-b.z0)/R),z1=Math.round((tz+1.02-b.z0)/R);
    for(let gz=z0;gz<z1;gz++)for(let gx=x0;gx<x1;gx++)occ[gz*gw+gx]=1}
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
  return TH.H+.22*Noise.fbm(x*.22+40,z*.22-7,3)+TH.vault*(1-Math.pow(1-Math.min(d/(CW/2),1),2))-.12*Math.max(0,Noise.n2(x*.6+3,z*.6))}
