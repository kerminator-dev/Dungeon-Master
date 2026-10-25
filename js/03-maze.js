'use strict';
// ---------- maze on a metre grid ----------
// The logical cell grid sets connectivity. The world is 1×1 m tiles: wall and corridor both K m wide.
// No warping: all corridors are identical, masonry lines up everywhere.
let CW=2;              // corridor width, m
let WT=2;              // wall thickness = corridor width
let CS=4;              // logical cell pitch, m (corridor + wall)
let W=null,TH=null;
const BRAID_CHANCE=1;   // share of dead ends opened into a neighbouring passage
const BRAID_MIN_LOOP=10; // a new shortcut must bypass at least this many cells of the maze
function setGeom(k){CW=WT=k;CS=2*k;BD=k/2;CHUNK=Math.max(12,3*CS)}
// the four neighbours of a cell (and of a grid point in the flood fills)
const DIRS=[[1,0],[-1,0],[0,1],[0,-1]];
// open passages out of cell (i,j): their directions
const openDirs=(M,n,i,j)=>DIRS.filter(([a,b])=>i+a>=0&&j+b>=0&&i+a<n&&j+b<n&&M.open(i,j,a,b));

// logical coords (cell i,j; nodes are integers) -> metres (centre of wall/corridor strip)
function warp(gx,gz){return [gx*CS+WT/2,gz*CS+WT/2]}
function toGrid(x,z){return [(x-WT/2)/CS,(z-WT/2)/CS]}

function genGrid(n){
  const V=[],Hh=[];
  for(let i=0;i<=n;i++)V[i]=new Uint8Array(n).fill(1);
  for(let i=0;i<n;i++)Hh[i]=new Uint8Array(n+1).fill(1);
  // "growing tree": usually extend the last corridor, sometimes branch from a random cell —
  // gives long winding corridors with many forks and dead ends
  const seen=new Uint8Array(n*n),act=[[ri(0,n-1),ri(0,n-1)]];seen[act[0][0]*n+act[0][1]]=1;
  while(act.length){const idx=rnd()<.7?act.length-1:ri(0,act.length-1),[x,y]=act[idx],nb=[];
    if(x>0&&!seen[(x-1)*n+y])nb.push([-1,0]);if(x<n-1&&!seen[(x+1)*n+y])nb.push([1,0]);
    if(y>0&&!seen[x*n+y-1])nb.push([0,-1]);if(y<n-1&&!seen[x*n+y+1])nb.push([0,1]);
    if(!nb.length){act.splice(idx,1);continue}
    const [dx,dy]=pick(nb);
    if(dx===1)V[x+1][y]=0;else if(dx===-1)V[x][y]=0;else if(dy===1)Hh[x][y+1]=0;else Hh[x][y]=0;
    seen[(x+dx)*n+y+dy]=1;act.push([x+dx,y+dy])}
  // rare loops — only if both wall ends keep other walls (no empty plazas)
  const vdeg=(i,j)=>(j>0&&V[i][j-1]?1:0)+(j<n&&V[i][j]?1:0)+(i>0&&Hh[i-1][j]?1:0)+(i<n&&Hh[i][j]?1:0);
  for(let k=0;k<n*n*.03;k++){if(rnd()<.5){const i=ri(1,n-1),j=ri(0,n-1);if(V[i][j]&&vdeg(i,j)>1&&vdeg(i,j+1)>1)V[i][j]=0}
    else{const i=ri(0,n-1),j=ri(1,n-1);if(Hh[i][j]&&vdeg(i,j)>1&&vdeg(i+1,j)>1)Hh[i][j]=0}}
  const open=(i,j,di,dj)=>di===1?!V[i+1][j]:di===-1?!V[i][j]:dj===1?!Hh[i][j+1]:!Hh[i][j];
  // braid: most dead ends get knocked through to a passage that is far away along the maze
  // (so the shortcut is worth it, and no tiny loops or plazas appear). a dead end then
  // never costs a long walk back to the last fork
  const M0={open},cellOpen=(i,j)=>openDirs(M0,n,i,j).length;
  for(let i=0;i<n;i++)for(let j=0;j<n;j++){
    if(cellOpen(i,j)!==1||rnd()>BRAID_CHANCE)continue;
    const d=cellDist(M0,n,i,j),cand=[];
    for(const [di,dj] of DIRS){const a=i+di,b=j+dj;
      if(a<0||b<0||a>=n||b>=n||open(i,j,di,dj)||d[a*n+b]<BRAID_MIN_LOOP||cellOpen(a,b)>2)continue;cand.push([di,dj])}
    if(!cand.length)continue;
    const [di,dj]=pick(cand);
    if(di===1)V[i+1][j]=0;else if(di===-1)V[i][j]=0;else if(dj===1)Hh[i][j+1]=0;else Hh[i][j]=0}
  return {V,Hh,open}}

// exit: an arch in any wall of a cell far from the start (half the longest walk there or more, and half the maze across
// or more): in the outer wall or in a corridor's, so no edge or direction gives it away. an arch in a corridor wall is a
// recess, the wall stays (3: a wall no run of wall goes past, see gridWalls). its own stream: the rest of the level stays
const EXIT_FAR=.5;
function placeExit(M,n){const r=mulberry(game.seed*61+game.level*17+n),d=cellDist(M,n,0,0),far=Math.max(...d)*EXIT_FAR,all=[];
  for(let i=0;i<n;i++)for(let j=0;j<n;j++){const w=DIRS.filter(([a,b])=>!M.open(i,j,a,b));if(w.length)all.push({i,j,w,d:d[i*n+j]})}
  const C=all.filter(c=>c.d>=far&&c.i+c.j>=n/2),c=C.length?C[Math.floor(r()*C.length)]:all.reduce((a,b)=>b.d>a.d?b:a);
  const [di,dj]=c.w[Math.floor(r()*c.w.length)],i=c.i,j=c.j,inner=i+di>=0&&j+dj>=0&&i+di<n&&j+dj<n,v=inner?3:0;
  if(di===1)M.V[i+1][j]=v;else if(di===-1)M.V[i][j]=v;else if(dj===1)M.Hh[i][j+1]=v;else M.Hh[i][j]=v;
  M.exit={i,j,di,dj,inner}}

// step distances from cell (i0,j0) through open passages
function cellDist(M,n,i0,j0){const d=new Int32Array(n*n).fill(-1),q=[i0*n+j0];d[q[0]]=0;
  for(let h=0;h<q.length;h++){const c=q[h],i=Math.floor(c/n),j=c%n;
    for(const [di,dj] of DIRS){const a=i+di,b=j+dj;if(a<0||b<0||a>=n||b>=n||d[a*n+b]>=0||!M.open(i,j,di,dj))continue;d[a*n+b]=d[c]+1;q.push(a*n+b)}}
  return d}

// walls from the maze grid: segments for decor, node degrees, 1×1 m tiles (also used for the "continuation" behind grates)
function gridWalls(M,n){const N1=n+1;W.n=n;W.M=M;
  const segs=[],deg=new Uint8Array(N1*N1),thru=new Uint8Array(N1*N1);
  for(let i=0;i<=n;i++)for(let j=0;j<n;j++)if(M.V[i][j]){deg[i*N1+j]++;deg[i*N1+j+1]++}
  for(let i=0;i<n;i++)for(let j=0;j<=n;j++)if(M.Hh[i][j]){deg[i*N1+j]++;deg[(i+1)*N1+j]++}
  // consecutive straight runs form one wall (for placing decor and dents). the exit's arch in a corridor wall (3) is
  // left out, as an opening is: nothing is put on it, on either face
  const add=(a,b,outer)=>segs.push({a,b,outer});
  for(let i=0;i<=n;i++)for(let j=0;j<n;){if(M.V[i][j]!==1){j++;continue}let e=j+1;
    while(e<n&&M.V[i][e]===1&&deg[i*N1+e]===2){thru[i*N1+e]=1;e++}add([i,j],[i,e],i===0||i===n);j=e}
  for(let j=0;j<=n;j++)for(let i=0;i<n;){if(M.Hh[i][j]!==1){i++;continue}let e=i+1;
    while(e<n&&M.Hh[e][j]===1&&deg[e*N1+j]===2){thru[e*N1+j]=1;e++}add([i,j],[e,j],j===0||j===n);i=e}
  W.deg=v=>deg[v[0]*N1+v[1]];
  W.crum=new Float32Array(N1*N1);
  for(let i=0;i<=n;i++)for(let j=0;j<=n;j++)if(deg[i*N1+j]===1)W.crum[i*N1+j]=rr(.3,1.5)*(TH.indoor?.5:1);
  W.crumAt=v=>W.crum[v[0]*N1+v[1]];
  for(const s of segs){const a=warp(...s.a),b=warp(...s.b),L=Math.hypot(b[0]-a[0],b[1]-a[1]),tx=(b[0]-a[0])/L,tz=(b[1]-a[1])/L;
    s.len=L;s.at=v=>({x:a[0]+tx*v,z:a[1]+tz*v,tx,tz})}
  W.segs=segs;
  // tiles: 1 = wall (3 = an arch in the outer wall, 5 = the real maze inside the ring beyond the grates)
  const K=WT,TW=n*CS+K,tile=new Uint8Array(TW*TW);W.TW=TW;W.tile=tile;
  const fill=(x0,z0)=>{for(let a=0;a<K;a++)for(let b=0;b<K;b++)tile[(x0+a)*TW+z0+b]=1};
  for(let i=0;i<=n;i++)for(let j=0;j<n;j++)if(M.V[i][j])fill(i*CS,j*CS+K);
  for(let i=0;i<n;i++)for(let j=0;j<=n;j++)if(M.Hh[i][j])fill(i*CS+K,j*CS);
  for(let i=0;i<=n;i++)for(let j=0;j<=n;j++)if(deg[i*N1+j]>0)fill(i*CS,j*CS)}

function buildLayout(n){
  const M=genGrid(n),N1=n+1;placeExit(M,n);gridWalls(M,n);const K=WT,TW=W.TW,tile=W.tile;

  const m=2*CS;W.b={x0:-m,z0:-m,x1:TW+m,z1:TW+m};
  // arches: the exit (portal and grate) in the wall of its cell, the entrance in the outer wall behind the start (portal
  // dead). d: out of the maze, through the arch; inner: the exit's arch is in a corridor wall
  const e=M.exit;W.exitCell=e;const startX=M.open(0,0,1,0);
  const arch=(kind,x0,z0,d,inner)=>{for(let a=0;a<K;a++)for(let b=0;b<K;b++)tile[(x0+a)*TW+z0+b]=3;
    const w=Math.max(.9,Math.min(CW-.45,1.7)),hs=1.85;return {kind,x0,z0,x1:x0+K,z1:z0+K,cx:x0+K/2,cz:z0+K/2,d,w,hs,top:hs+w/2,inner}};
  W.arches=[arch('exit',e.di?(e.di>0?e.i+1:e.i)*CS:e.i*CS+K,e.dj?(e.dj>0?e.j+1:e.j)*CS:e.j*CS+K,[e.di,e.dj],e.inner),
    startX?arch('entrance',0,K,[-1,0]):arch('entrance',K,0,[0,-1])];
  W.exitArch=W.arches[0];const A=W.exitArch;
  // windows to the abyss: grated arches in the dungeon outer wall (own RNG so the layout stays put)
  W.wins=[];if(TH.indoor){const r=mulberry(game.seed*53+game.level*11+n),C=[];
    for(let k=0;k<n;k++){C.push([0,k*CS+K,[-1,0]],[n*CS,k*CS+K,[1,0]],[k*CS+K,0,[0,-1]],[k*CS+K,n*CS,[0,1]])}
    for(const [x0,z0,d] of C){if(W.arches.some(a=>Math.abs(a.x0-x0)<CS&&Math.abs(a.z0-z0)<CS)||r()>.32)continue;
      W.wins.push({x0,z0,x1:x0+K,z1:z0+K,cx:x0+K/2,cz:z0+K/2,d,w:1.5,sill:.02,hs:1.9})}}   // grated arches from the floor
  W.exitPos={x:A.cx,z:A.cz};W.exitIn={x:A.cx-A.d[0]*.4,z:A.cz-A.d[1]*.4};
  // exitIn: spot in the opening before the portal where the player can stand
  buildOcc();
  // exit arch opening is walkable from the wall face to the portal plane
  {const o=W.occ,b=W.b;for(let gz=0;gz<o.gh;gz++)for(let gx=0;gx<o.gw;gx++){const x=b.x0+(gx+.5)*o.R,z=b.z0+(gz+.5)*o.R;
    const al=(x-A.cx)*A.d[0]+(z-A.cz)*A.d[1],ac=Math.abs((x-A.cx)*A.d[1]-(z-A.cz)*A.d[0]);
    if(al>-K/2-.03&&al<-.05&&ac<A.w/2)o.occ[gz*o.gw+gx]=0}}
  const sp=warp(.5,.5);W.start={x:sp[0],z:sp[1],yaw:startX?-Math.PI/2:Math.PI};
  buildCollapse()}

// cave-in: block a passage the maze stays connected without, forcing a detour
function buildCollapse(){const n=W.n,M=W.M,K=WT,TW=W.TW;W.rubbles=[];
  const allReach=()=>{const d=cellDist(M,n,0,0);for(let i=0;i<d.length;i++)if(d[i]<0)return false;return true};
  const cands=[],e=W.exitCell,bad=c=>c[0]+c[1]<2||Math.abs(c[0]-e.i)+Math.abs(c[1]-e.j)<2;
  for(let i=1;i<n;i++)for(let j=0;j<n;j++)if(!M.V[i][j])cands.push({v:1,i,j,a:[i-1,j],b:[i,j]});
  for(let i=0;i<n;i++)for(let j=1;j<n;j++)if(!M.Hh[i][j])cands.push({v:0,i,j,a:[i,j-1],b:[i,j]});
  for(const c of shuffle(cands)){if(W.rubbles.length>=(n>=12?2:1))break;if(bad(c.a)||bad(c.b))continue;
    if(c.v)M.V[c.i][c.j]=2;else M.Hh[c.i][c.j]=2;
    if(!allReach()){if(c.v)M.V[c.i][c.j]=0;else M.Hh[c.i][c.j]=0;continue}
    const x0=c.v?c.i*CS:c.i*CS+K,z0=c.v?c.j*CS+K:c.j*CS;
    // block exactly the span between cells (otherwise rubble would cut nearby forks)
    const ax=c.v?[1,0]:[0,1],cx=x0+K/2,cz=z0+K/2,o=W.occ,b=W.b;
    for(let gz=Math.round((z0-b.z0)/o.R);gz<Math.round((z0+K-b.z0)/o.R);gz++)for(let gx=Math.round((x0-b.x0)/o.R);gx<Math.round((x0+K-b.x0)/o.R);gx++)o.occ[gz*o.gw+gx]=1;
    W.rubbles.push({cx,cz,ax,K})}}

// mark a capsule around segment p-q as blocked
function occStamp(p,q,rad){const o=W.occ,R=o.R,b=W.b,gw=o.gw,gh=o.gh,occ=o.occ;
  const x0=Math.max(0,Math.floor((Math.min(p[0],q[0])-rad-b.x0)/R)),x1=Math.min(gw-1,Math.ceil((Math.max(p[0],q[0])+rad-b.x0)/R)),
    z0=Math.max(0,Math.floor((Math.min(p[1],q[1])-rad-b.z0)/R)),z1=Math.min(gh-1,Math.ceil((Math.max(p[1],q[1])+rad-b.z0)/R));
  const dx=q[0]-p[0],dz=q[1]-p[1],ll=dx*dx+dz*dz||1e-9,r2=rad*rad;
  for(let gz=z0;gz<=z1;gz++)for(let gx=x0;gx<=x1;gx++){const x=b.x0+(gx+.5)*R,z=b.z0+(gz+.5)*R;
    const t=clamp(((x-p[0])*dx+(z-p[1])*dz)/ll,0,1),ex=p[0]+dx*t-x,ez=p[1]+dz*t-z;if(ex*ex+ez*ez<r2)occ[gz*gw+gx]=1}}
// raster walkability map (0.1 m) + wall distance field
function buildOcc(){const R=.1,b=W.b,gw=Math.ceil((b.x1-b.x0)/R),gh=Math.ceil((b.z1-b.z0)/R),occ=new Uint8Array(gw*gh);
  W.occ={R,gw,gh,occ};const TW=W.TW;
  for(let tx=0;tx<TW;tx++)for(let tz=0;tz<TW;tz++){if(!W.tile[tx*TW+tz])continue;
    const x0=Math.round((tx-.02-b.x0)/R),x1=Math.round((tx+1.02-b.x0)/R),z0=Math.round((tz-.02-b.z0)/R),z1=Math.round((tz+1.02-b.z0)/R);
    for(let gz=z0;gz<z1;gz++)for(let gx=x0;gx<x1;gx++)occ[gz*gw+gx]=1}
  // chamfer distance, in metres
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
  if(gx<0||gz<0||gx>=o.gw||gz>=o.gh)return true;return o.occ[gz*o.gw+gx]===1||!!(W.gateBlk&&W.gateBlk(x,z))}
// floor: gentle undulation + scree along walls
function floorH(x,z){if(TH.indoor)return 0;return .07*Noise.fbm(x*.3,z*.3,3)+.035*Noise.n2(x*1.7,z*1.7)+.06*(1-sstep(0,.7,wallDist(x,z)))}
// vault height: 25 cm steps from wall to corridor centre
function ceilH(x,z){const d=W.vaultD?W.vaultD(x,z):1;return TH.H+Math.max(0,d-1)*VX}
