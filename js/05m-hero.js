'use strict';
// ---------- the players: a felt frog in a cloak ----------
// playing together, the others are seen as this frog: an egg of green felt on long thin legs, a puppet's wide head with two
// white eyes that blink, thin arms with big four-fingered hands, flat paddle feet, and a cloak in the player's colour
// (HERO_COLS; the server names a player after it until they give a name) tied at the throat with a brass clasp. it walks
// and runs on planted feet the way it goes (backing away, it faces the way its player looks and steps backwards), turns its
// head to where its player looks and carries the player's light: the torch in its right fist, or Candlelight over its right
// shoulder. its eyes are where the player's are (FROG.SCALE).
// the model is built once (FROG, between the frog marks below: the same text drives the model's own preview page) and
// rigged anew for each player: one skeleton, a skinned mesh per material
// how finely the frog is made: 2 of FROG.LODS (1826 triangles; the user's pick of the four, 2026-10-24)
const HERO_LOD=2;
const HERO_COLS=[['Crimson','#842b26'],['Ochre','#a88038'],['Teal','#2f6762'],['Blue','#34507e'],['Plum','#5a3956'],['Linen','#cbc0a2']];

// <frog>
const FROG=(()=>{
// ---------- helpers ----------
const TAU=Math.PI*2,clamp=(x,a,b)=>x<a?a:x>b?b:x,lerp=(a,b,t)=>a+(b-a)*t,sst=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
const V3=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),V2=(x,y)=>new THREE.Vector2(x,y);
const adiff=(a,b)=>{let d=(a-b)%TAU;if(d>Math.PI)d-=TAU;if(d<-Math.PI)d+=TAU;return d};
const frac=x=>x-Math.floor(x);
// colours are written as they look on screen; a page that draws in sRGB (FROG_SRGB) wants them linear
const colour=c=>{const k=new THREE.Color(c);return typeof FROG_SRGB!=='undefined'&&FROG_SRGB?k.convertSRGBToLinear():k};
// a monotone cubic through keys [[x,y],…]: it never overshoots between keys, so a profile drawn through them has no bumps
function mono(K){const n=K.length,d=[],m=[];for(let i=0;i<n-1;i++)d.push((K[i+1][1]-K[i][1])/(K[i+1][0]-K[i][0]));
  m[0]=d[0];m[n-1]=d[n-2];for(let i=1;i<n-1;i++){const h0=K[i][0]-K[i-1][0],h1=K[i+1][0]-K[i][0],w1=2*h1+h0,w2=h1+2*h0;
    m[i]=d[i-1]*d[i]>0?(w1+w2)/(w1/d[i-1]+w2/d[i]):0}
  return x=>{if(x<=K[0][0])return K[0][1];if(x>=K[n-1][0])return K[n-1][1];let i=0;while(K[i+1][0]<x)i++;
    const h=K[i+1][0]-K[i][0],t=(x-K[i][0])/h,t2=t*t,t3=t2*t;
    return (2*t3-3*t2+1)*K[i][1]+(t3-2*t2+t)*h*m[i]+(3*t2-2*t3)*K[i+1][1]+(t3-t2)*h*m[i+1]}}
// springs for the loose parts. crit: follows its goal without overshooting (exact for any step); wob (damping z<1):
// overshoots and settles, for cloth and floppy arms
const spring=(x=0)=>({x,v:0});
function crit(s,goal,w,dt){const y=s.x-goal,k=s.v+w*y,e=Math.exp(-w*dt);s.x=goal+(y+k*dt)*e;s.v=(s.v-w*k*dt)*e;return s.x}
function wob(s,goal,w,z,dt){const n=Math.ceil(dt*240),h=dt/n;for(let i=0;i<n;i++){s.v+=(w*w*(goal-s.x)-2*z*w*s.v)*h;s.x+=s.v*h}return s.x}

// ---------- geometry: smooth parts with vertex colours, hung on bones, merged into one skinned mesh per material ----------
const _m4=(x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1,sy=1,sz=1)=>new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),
  new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz,'YXZ')),new THREE.Vector3(sx,sy,sz));
// smooth normals that ignore seams: every face adds into all vertices at the same spot
function smooth(g){const p=g.attributes.position,n=p.count;if(!g.index)g.setIndex([...Array(n).keys()]);const idx=g.index.array;
  const id=new Map(),k=new Int32Array(n);
  for(let i=0;i<n;i++){const s=Math.round(p.getX(i)*2e4)+','+Math.round(p.getY(i)*2e4)+','+Math.round(p.getZ(i)*2e4);if(!id.has(s))id.set(s,id.size);k[i]=id.get(s)}
  const acc=new Float32Array(id.size*3),a=V3(),b=V3(),c=V3();
  for(let t=0;t<idx.length;t+=3){a.fromBufferAttribute(p,idx[t]);b.fromBufferAttribute(p,idx[t+1]);c.fromBufferAttribute(p,idx[t+2]);
    c.sub(b);a.sub(b);c.cross(a);for(let j=0;j<3;j++){const q=k[idx[t+j]]*3;acc[q]+=c.x;acc[q+1]+=c.y;acc[q+2]+=c.z}}
  const N=new Float32Array(n*3);for(let i=0;i<n;i++){a.fromArray(acc,k[i]*3).normalize();a.toArray(N,i*3)}
  g.setAttribute('normal',new THREE.BufferAttribute(N,3));return g}
// one part: placed by a matrix, bent by warp(v), smoothed and coloured; felt is a faint soft mottling of the colour
const _v=V3();
function part(g0,col,m,warp){const g=g0.clone();g0.dispose();if(m)g.applyMatrix4(m);const p=g.attributes.position;
  if(warp)for(let i=0;i<p.count;i++){warp(_v.fromBufferAttribute(p,i));p.setXYZ(i,_v.x,_v.y,_v.z)}
  smooth(g);const C=new Float32Array(p.count*3),c=colour(col);
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=1+.05*Math.sin(x*61+y*23)*Math.sin(y*47-z*31)*Math.sin(z*53+x*19);
    C[i*3]=c.r*k;C[i*3+1]=c.g*k;C[i*3+2]=c.b*k}
  for(const k of Object.keys(g.attributes))if(k!=='position'&&k!=='normal')g.deleteAttribute(k);
  g.setAttribute('color',new THREE.BufferAttribute(C,3));return g}
// a polygon of few sides inscribed in a circle is thinner than the circle: widen it so its sides sit half in, half out
const comp=seg=>(1+1/Math.cos(Math.PI/seg))/2;
// a capsule from a to b, radius r0 at a and r1 at b
function capsule(a,b,r0,r1,seg){const L=a.distanceTo(b),n=Math.max(2,seg>>1),pts=[];
  for(let i=0;i<=n;i++){const t=-Math.PI/2+Math.PI/2*i/n;pts.push(V2(Math.cos(t)*r0+1e-5,Math.sin(t)*r0))}
  for(let i=0;i<=n;i++){const t=Math.PI/2*i/n;pts.push(V2(Math.cos(t)*r1+1e-5,L+Math.sin(t)*r1))}
  const m=new THREE.Matrix4().compose(a,new THREE.Quaternion().setFromUnitVectors(V3(0,1,0),V3().subVectors(b,a).normalize()),V3(1,1,1));
  const g=new THREE.LatheGeometry(pts,seg);g.applyMatrix4(m);return g}
// rig: the joints are bones, named (a player's skeleton is matched to the model's by name); the parts are [bone, geometry in
// the bone's space, the bones it is skinned to (null: that bone alone), material]
function rig(m){return {m,bones:[]}}
function joint(R,parent,name,x,y,z){const b=new THREE.Bone();b.name=name;b.rotation.order='YXZ';b.position.set(x,y,z);(parent||R.m).add(b);R.bones.push(b);return b}
// merge the parts into one skinned mesh per material, all on one skeleton; a vertex keeps its four heaviest bones
function rigDone(R,parts,mats){const m=R.m;m.updateMatrixWorld(true);const inv=m.matrixWorld.clone().invert(),skel=new THREE.Skeleton(R.bones),by=new Map();let tris=0;
  for(const p of parts){if(!by.has(p[3]))by.set(p[3],[]);by.get(p[3]).push(p)}
  for(const [key,list] of by){const P=[],N=[],C=[],SI=[],SW=[],I=[],v=V3(),nm=new THREE.Matrix3();
    for(const [b,g,sk] of list){const M=new THREE.Matrix4().multiplyMatrices(inv,b.matrixWorld),bi=R.bones.indexOf(b),p=g.attributes.position,n=g.attributes.normal,c=g.attributes.color,
        w=g.attributes.skw,base=P.length/3;nm.getNormalMatrix(M);
      for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(M);P.push(v.x,v.y,v.z);v.fromBufferAttribute(n,i).applyMatrix3(nm).normalize();N.push(v.x,v.y,v.z);
        C.push(c.getX(i),c.getY(i),c.getZ(i));
        if(sk){const nb=sk.length,row=[];for(let k=0;k<nb;k++)row.push([w.array[i*nb+k],R.bones.indexOf(sk[k])]);row.sort((a,b)=>b[0]-a[0]);
          const sum=row.slice(0,4).reduce((a,r)=>a+r[0],0)||1;for(let k=0;k<4;k++){SI.push(k<nb?row[k][1]:0);SW.push(k<nb?row[k][0]/sum:0)}}
        else{SI.push(bi,0,0,0);SW.push(1,0,0,0)}}
      for(const i of g.index.array)I.push(base+i)}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(P,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));
    geo.setAttribute('color',new THREE.Float32BufferAttribute(C,3));geo.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(SI,4));geo.setAttribute('skinWeight',new THREE.Float32BufferAttribute(SW,4));
    // bounds wide enough for any pose
    geo.setIndex(I);geo.boundingSphere=new THREE.Sphere(V3(0,.9,0),1.7);tris+=I.length/3;const sm=new THREE.SkinnedMesh(geo,mats[key]);m.add(sm);sm.bind(skel)}
  return tris}

// ---------- the frog ----------
// sizes in metres of its own (SCALE takes them to the game's), measured off the reference pictures (front: 870 px = 1.27 m to
// the top of the eyes; side: 864 px). It faces +z, its left is +x. Egg body .6–1 m, .333 wide, .32 deep, running on into a thick
// neck; head .27 wide, .3 long, its snout .28 in front of the body's middle; legs .1 off the middle; arms .42 from shoulder to
// wrist; flippers .18 long ahead of the ankle, round in front, their back flush with the back of the shin.
// Every part is drawn in the world of the bind pose and hung on its bones from there.
const SCALE=1.3;   // its eyes at 1.23 m of its own: at the game's 1.6 m, where the player's eyes are
const GREEN='#66a83d',ROOF='#a23a4e',MOUTH='#e48d9c',THROAT='#3c1018',TONGUE='#f2a9b5',WHITE='#f4f3ec',INK='#151515',BRASS='#c8a040';
// the arms hang out from the shoulders by armOut, the forearms straight down from the elbows
const L={hip:.66,thigh:.285,shin:.285,hipX:.1,chestY:.24,shY:.068,shX:.12,ua:.23,fa:.19,armOut:.52};
// the flipper: the ankle's height over the floor, the ball (where its front bends) and the back of the flat of the sole, its tip
const FT={ank:.09,ball:.095,ballY:.006,heel:-.028,toe:.18};
// its shape, back to front: [z ahead of the ankle, half-width, height of the sole, of the top, how flat the underside is (the
// lower half's depth to the upper's)]. No heel: its back is round and just covers the back of the shin; the top is highest over
// the ankle and thins out to a flat paddle, round in front
const FOOT=[[-.04,.0001,.011,.012,1],[-.037,.014,.004,.022,.8],[-.03,.022,.002,.031,.5],[-.018,.027,.001,.036,.4],[0,.03,.001,.038,.4],
  [.075,.041,.001,.022,.4],[.115,.046,.001,.0145,.4],[.142,.0437,.001,.009,.4],[.16,.0355,.0012,.0058,.4],[.172,.024,.0015,.0045,.5],[.18,.0001,.002,.0035,1]];
// the hand: the knuckles below the wrist; three fingers across the palm (front to back), splayed a little, bending together at
// the knuckles and l1 further down; the thumb from the front of the palm at t0 (x toward the back of the hand), its first
// joint turned down, forward (tx) and across the palm (ty), tl1 to its second. HS: the hand's size, against the hand first drawn
const HS=1.4,HAND={kn:-.042*HS,l1:.021*HS,fz:[.0125*HS,0,-.0125*HS],splay:[.07,0,-.07],l2:[.026*HS,.029*HS,.024*HS],r:.0048*HS,
  t0:V3(-.003,-.014,.013).multiplyScalar(HS),tl1:.016*HS,tl2:.017*HS,tr:.0052*HS,tx:-.75,ty:.35};
// the hands' poses: [knuckles, middle joints, thumb forward, thumb across, thumb bend, its tip] (bends >0 close the hand)
const HPOSE={rest:[.25,.4,HAND.tx,HAND.ty,.15,.25],fist:[.55,1.24,0,0,1.04,.33]};
const W={head:V3(0,1.07,.02),neck:V3(0,.99,0)};   // the head's and the neck's joints in the bind pose
const CAPE={y:.8,z:-.164};   // the back's widest point, where the cloak leaves the body and swings
// the game's polygon budget (the fewest of the variants tried)
const Q={rad:12,hw:12,hh:8,eye:7,eh:4,limb:6};
const BROW={h:.021,x:.03,z:.042,z0:.1,rows:6};   // the rise between the eyes (template: brow) and the crown's rows

const halfBall=(up,w,h)=>new THREE.SphereGeometry(1,w,h,0,TAU,up?0:Math.PI/2,Math.PI/2);
// body and neck: one smooth surface of rows of ellipses, each row set by its half-width W and its front F and back B (z).
// Below the shoulders the egg keeps the measured profile (BP); above them the neck is deep front to back, as on the side
// picture: its back runs on into the back of the head, the throat slants up under the chin. W, F and B are monotone splines
// through their keys, so the neck has no kinks or bumps
const BP=[[0,.618],[.07,.622],[.11,.632],[.132,.648],[.141,.67],[.149,.70],[.16,.75],[.1665,.80],[.164,.84],[.158,.875],[.148,.905],
    [.134,.935],[.118,.96],[.1,.99],[.095,1.03],[.09,1.08],[.082,1.13],[.065,1.17],[.04,1.2],[0,1.21]];
const BPs=new THREE.SplineCurve(BP.map(p=>V2(p[0],p[1]))).getPoints(400);
const eggW=h=>{for(let i=1;i<BPs.length;i++)if(BPs[i].y>=h){const a=BPs[i-1],b=BPs[i];return lerp(a.x,b.x,(h-a.y)/Math.max(1e-6,b.y-a.y))}return 0};
const eggK=h=>h>.75?.97:lerp(.82,.97,(h-.63)/.12);   // the egg is a little flatter front to back low down
// the neck: [height, W, F, B]; its back stays behind the head until over the mouth's seam, then turns into the crown
const NECK=[[.97,.113,.109,-.12],[1.005,.099,.104,-.103],[1.04,.094,.118,-.087],[1.075,.09,.145,-.07],[1.11,.087,.168,-.051],[1.14,.084,.182,-.038],
  [1.165,.081,.188,-.03],[1.19,.078,.19,-.02],[1.22,.074,.19,-.005]];
const nkeys=c=>[.78,.82,.86,.9,.935].map(h=>[h,c?(c===1?1:-1)*eggW(h)*eggK(h):eggW(h)]).concat(NECK.map(k=>[k[0],k[c+1]]));
const nW=mono(nkeys(0)),nF=mono(nkeys(1)),nB=mono(nkeys(2));
const bodyW=h=>h<.86?eggW(h):nW(h),bodyF=h=>h<.86?eggW(h)*eggK(h):nF(h),bodyB=h=>h<.86?-eggW(h)*eggK(h):nB(h);
// the middle of the body front to back at a height: rays to lay things on the body start here
const zc=h=>(bodyF(h)+bodyB(h))/2;
// a point of the surface: height h, angle a round it (0 = straight ahead), the polygon of seg sides widened as comp says
// (with fewer sides it is made wider by comp, so it looks as thick; up the neck, under the head, no wider than with 12: wider,
// its back would pass behind the head instead of running into it)
const bodyAt=(h,a,seg)=>{const c=lerp(comp(seg),comp(12),sst((h-.97)/.12)),f=bodyF(h),b=bodyB(h);return V3(bodyW(h)*c*Math.sin(a),h,(f+b)/2+(f-b)/2*c*Math.cos(a))};
// rows round the egg; above them the neck's rows are spread evenly up each column from NECK0 to where that column meets the
// head (seams[i]), so the neck ends on the underside of the head all round, its last ring just inside it, with no ragged seam.
// Two more rows run on inside the head (TROWS, m past the seam, closing in toward the middle by TIN) and a cap closes it: the
// throat, the colour of the inside of the mouth
const ROWS=[.623,.64,.67,.72,.78,.84,.89,.935,.97],NROWS=6,NECK0=1.005,TROWS=[.003,.01],TIN=[.8,.55];
function bodyGeo(seg,seams){const P=[0,.618,0],I=[],n=seg+1,rows=ROWS.length+NROWS+TROWS.length;let cy=0,cz=0;
  for(let r=0;r<rows;r++)for(let i=0;i<=seg;i++){const a=i/seg*TAU,k=r-ROWS.length,S=seams[i%seg],top=S.top;
    // (the neck's rows closer together toward the head, where it flares)
    const h=k<0?ROWS[r]:k<NROWS?0:top+TROWS[k-NROWS];
    // the throat's rows close in toward the neck's middle (TIN) as they go into the head: with few sides the straight edge
    // between two columns would come out at the back of the head
    const p=k>=0&&k<NROWS?neckPt(a,seg,S,1-(1-k/(NROWS-1))**1.5):bodyAt(h,a,seg);if(k>=NROWS){const c=zc(h),f=TIN[k-NROWS];p.x*=f;p.z=c+(p.z-c)*f}
    P.push(p.x,p.y,p.z);if(r===rows-1&&i<seg){cy+=p.y/seg;cz+=p.z/seg}}
  P.push(0,cy,cz);const last=P.length/3-1;   // the cap, hidden in the head
  for(let i=0;i<seg;i++)I.push(0,1+i+1,1+i);
  for(let r=0;r<rows-1;r++)for(let i=0;i<seg;i++){const a=1+r*n+i,b=a+n;I.push(a,a+1,b,a+1,b+1,b)}
  for(let i=0;i<seg;i++){const a=1+(rows-1)*n+i;I.push(a,a+1,last)}
  const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(P,3));g.setIndex(I);return g}
// where a ray from o along d first leaves (or enters) a set of meshes, with the surface's smooth normal there
const _ray=new THREE.Raycaster(),_tri=new THREE.Triangle(),_bc=V3(),_na=V3(),_nb=V3(),_nc=V3();
function cast(meshes,o,d,last){_ray.set(o,d);const hs=_ray.intersectObjects(meshes);if(!hs.length)return null;const h=last?hs[hs.length-1]:hs[0];
  const g=h.object.geometry,p=g.attributes.position,n=g.attributes.normal,{a,b,c}=h.face;
  _tri.set(V3().fromBufferAttribute(p,a),V3().fromBufferAttribute(p,b),V3().fromBufferAttribute(p,c)).getBarycoord(h.point,_bc);
  const nrm=_na.fromBufferAttribute(n,a).multiplyScalar(_bc.x).add(_nb.fromBufferAttribute(n,b).multiplyScalar(_bc.y)).add(_nc.fromBufferAttribute(n,c).multiplyScalar(_bc.z)).normalize().clone();
  return {dist:h.distance,point:h.point.clone(),normal:nrm,face:h.face.normal.clone(),object:h.object}}
// the neck flares out where it goes in under the head, so neck and head are one piece of felt and not a head set on a post.
// Where a column meets the head's underside (the jaw, facing down; at the back, where the neck runs on into the back of the
// head, it does not flare), its last FIL.L turns out in a smooth curve that leaves the neck going up and lies down on the
// head's underside FIL.D further out (times k, all of it where the underside faces straight down), going on along it
const FIL={L:.06,D:.05};
// the first surface of the head met from outside walking from o along the unit d, no further than len: where, and the head's
// smooth normal there
function headHit(head,o,d,len){_ray.set(o,d);_ray.far=len;const hs=_ray.intersectObjects(head);_ray.far=Infinity;const x=hs.find(x=>x.face.normal.dot(d)<0);if(!x)return null;
  const g=x.object.geometry,P=g.attributes.position,N=g.attributes.normal,{a,b,c}=x.face;
  _tri.set(V3().fromBufferAttribute(P,a),V3().fromBufferAttribute(P,b),V3().fromBufferAttribute(P,c)).getBarycoord(x.point,_bc);
  const n=_na.fromBufferAttribute(N,a).multiplyScalar(_bc.x).add(_nb.fromBufferAttribute(N,b).multiplyScalar(_bc.y)).add(_nc.fromBufferAttribute(N,c).multiplyScalar(_bc.z));
  return {p:x.point.clone(),n:n.normalize().clone(),dist:x.distance}}
const bez=(a,b,c,d,t)=>{const u=1-t;return V3().addScaledVector(a,u*u*u).addScaledVector(b,3*u*u*t).addScaledVector(c,3*u*t*t).addScaledVector(d,t*t*t)};
// for each column of the neck: where it goes into the head (top: its height; n: the head's normal there) and, flaring, its
// curve (A on the neck to E on the head, the handles P1, P2; h0 where it leaves the straight neck; l2 its length)
function neckSeams(seg,head){const d=V3();return [...Array(seg)].map((_,i)=>{const a=i/seg*TAU;let s0=null;
    // walked up the straight column in 4 mm steps (rays against the head's parts as they lie in the bind pose)
    for(let h=NECK0;h<1.24&&!s0;h+=.004){const p=bodyAt(h,a,seg),q=bodyAt(h+.004,a,seg);d.subVectors(q,p);const len=d.length(),x=headHit(head,p,d.normalize(),len);
      if(x)s0={top:h+.004*x.dist/len,n:x.n,k:0}}
    if(!s0)return {top:1.23,n:V3(0,-1,0),k:0};
    const k=sst((-s0.n.y-.25)/.5);if(!k)return s0;
    // where the flare lies down on the head: straight up from under the head, FIL.D out from where the column met it
    const S=bodyAt(s0.top,a,seg),r=V3(S.x,0,S.z-zc(s0.top)).normalize();let E=null;
    for(const f of [1,.6,.35]){const o=S.clone().addScaledVector(r,k*FIL.D*f);o.y-=.1;E=headHit(head,o,V3(0,1,0),.25);if(E)break}
    if(!E)return s0;
    const h0=s0.top-FIL.L*k,A=bodyAt(h0,a,seg),TA=bodyAt(h0+.01,a,seg).sub(A).normalize(),TE=r.clone().addScaledVector(E.n,-r.dot(E.n)).normalize();
    const e=E.p.clone();e.y+=.001;const P1=A.clone().addScaledVector(TA,FIL.L*k*.6),P2=e.clone().addScaledVector(TE,-k*FIL.D*.8);
    let l2=0,q=A;for(let j=1;j<=12;j++){const p=bez(A,P1,P2,e,j/12);l2+=p.distanceTo(q);q=p}
    return {top:e.y,n:E.n,k,h0,A,P1,P2,E:e,l2}})}
// a point up column a of the neck, at share t of the way from NECK0 to where it goes into the head (along its flare if it has one)
function neckPt(a,seg,S,t){if(!S.k)return bodyAt(lerp(NECK0,S.top+.001,t),a,seg);
  const l1=S.h0-NECK0,u=t*(l1+S.l2);return u<=l1?bodyAt(NECK0+u,a,seg):bez(S.A,S.P1,S.P2,S.E,Math.min(1,(u-l1)/S.l2))}
// the body's skin: the hips below, the chest from the middle of the egg up, the neck's joint up the neck, the head over it.
// The cloak lying on the body takes the same weights, so they move as one
// (the neck's joint takes over above the neck band, which lies on the chest alone; the head all of it from where the neck's
// flare lies on the jaw)
const bodySkin=v=>{const c=sst((v.y-.84)/.14),n=sst((v.y-1.005)/.05),h=sst((v.y-1.03)/.06);return [1-c,c*(1-n),c*n*(1-h),c*n*h]};
// a grid of points (cols+1 by rows+1) into an indexed surface
function grid(cols,rows,at){const P=[],I=[];for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){const v=at(i,j);P.push(v.x,v.y,v.z)}
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i,b=a+cols+1;I.push(a,b,a+1,b,b+1,a+1)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setIndex(I);return g}
const rayMat=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
const worldMesh=g=>{const m=new THREE.Mesh(g,rayMat);m.updateMatrixWorld(true);return m};
// skin weights over a list of bones, one row per vertex
function setSkin(g,bones,fn){const p=g.attributes.position,Wt=new Float32Array(p.count*bones.length),v=V3();
  for(let i=0;i<p.count;i++){const w=fn(v.fromBufferAttribute(p,i),i);for(let b=0;b<bones.length;b++)Wt[i*bones.length+b]=w[b]||0}
  g.setAttribute('skw',new THREE.BufferAttribute(Wt,bones.length));g.userData.skin=bones;return g}
// a limb as one smooth sweep: elliptic cross-sections (half-width rx sideways, rz the other way) along a spline through the key
// points; each key carries its bone weights, so the skin bends smoothly over every joint and the limb runs on into the hand or
// the foot. f flattens the sections' lower half (a sole). rx lies along X0 (as far as it is across the limb), rz across both
function sweep(keys,along,around,bones,clip,{X0=V3(1,0,0)}={}){const curve=new THREE.CatmullRomCurve3(keys.map(k=>k.p)),P=[],Wt=[],I=[],X=V3(),T=V3(),N=V3(),c=V3();
  for(let j=0;j<=along;j++){const t=j/along,u=t*(keys.length-1),k0=Math.min(keys.length-2,Math.floor(u)),f=u-k0,A=keys[k0],B=keys[k0+1],m=(a,b)=>lerp(a,b,f);
    curve.getPoint(t,c);curve.getTangent(t,T);X.copy(X0).addScaledVector(T,-X0.dot(T)).normalize();N.crossVectors(X,T).normalize();
    const rx=m(A.rx,B.rx),rz=m(A.rz,B.rz),fl=m(A.f??1,B.f??1);
    for(let i=0;i<=around;i++){const th=i/around*TAU,cs=Math.cos(th),sn=Math.sin(th);
      const v=c.clone().addScaledVector(X,rx*cs).addScaledVector(N,rz*sn*(sn>0?fl:1));if(clip)clip(v);P.push(v.x,v.y,v.z);
      for(let b=0;b<bones.length;b++)Wt.push(m(A.w[b],B.w[b]))}}
  for(let j=0;j<along;j++)for(let i=0;i<around;i++){const a=j*(around+1)+i,b=a+around+1;I.push(a,b,a+1,b,b+1,a+1)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setIndex(I);
  const out=part(g,GREEN);out.setAttribute('skw',new THREE.Float32BufferAttribute(Wt,bones.length));out.userData.skin=bones;return out}
// grow a limb out of another surface: vertices that lie inside it are laid on it from within, and near the seam
// the normals turn to the surface's and the skin is handed to the surface's, so the two read as one piece of felt.
// probe(v) gives {o,d}: a ray that starts inside the surface and passes the vertex; to(p): the skin weights (over the part's
// bone list) of the surface at the point p
function fuse(g,meshes,probe,to,reach=.04,inset=.004){const p=g.attributes.position,n=g.attributes.normal,sk=g.attributes.skw,nb=sk.itemSize,v=V3(),a=V3();
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const {o,d}=probe(v),hit=cast(meshes,o,d,false);if(!hit)continue;
    const dv=v.distanceTo(o),lim=hit.dist-inset;if(dv<lim)p.setXYZ(i,o.x+d.x*lim,o.y+d.y*lim,o.z+d.z*lim);
    const k=1-sst((Math.max(dv,lim)-lim)/reach);if(k<=0)continue;
    a.fromBufferAttribute(n,i).lerp(hit.normal,k).normalize();n.setXYZ(i,a.x,a.y,a.z);
    const T=to(hit.point);for(let b=0;b<nb;b++)sk.array[i*nb+b]=sk.array[i*nb+b]*(1-k)+(T[b]||0)*k}
  p.needsUpdate=n.needsUpdate=true;return g}

// the joints, in the bind pose: arms hanging out from the shoulders with the forearms straight down. The left hand never
// moves, so it has no joints of its own (full: the model's own skeleton has them while it bakes that hand, see template)
function skeleton(R,full){const J=(p,name,x,y,z)=>joint(R,p,name,x,y,z);
  // (the neck has a joint of its own half way up, so a head turned far round twists the neck in two halves, not one)
  const hips=J(null,'hips',0,L.hip,0),chest=J(hips,'chest',0,L.chestY,0),neck=J(chest,'neck',0,W.neck.y-.9,W.neck.z),head=J(neck,'head',0,W.head.y-W.neck.y,W.head.z-W.neck.z);
  const eyes=[1,-1].map(s=>{const e=J(head,'eye'+s,s*.047,1.228-W.head.y,.125-W.head.z);e.rotation.set(-.5,-s*.1,0);return e});
  // the shoulder joint sits on the felt at the top of the body's side; the hand faces the body; its fingers bend at the
  // knuckles (fg) and halfway (fm), the thumb at t1 and t2 (HAND)
  const arms=[1,-1].map(s=>{const n=s>0?'L':'R',sh=J(chest,'sh'+n,s*L.shX,L.shY,0),el=J(sh,'el'+n,0,-L.ua,0),a={s,sh,el};
    sh.rotation.z=s*L.armOut;el.rotation.z=-s*L.armOut;
    if(s<0||full){a.hd=J(el,'hd'+n,0,-L.fa,0);a.fg=J(a.hd,'fg'+n,0,HAND.kn,0);a.fm=J(a.fg,'fm'+n,0,-HAND.l1,0);
      a.t1=J(a.hd,'t1'+n,s*HAND.t0.x,HAND.t0.y,HAND.t0.z);a.t2=J(a.t1,'t2'+n,0,-HAND.tl1,0);a.t1.rotation.set(HAND.tx,-s*HAND.ty,0)}
    return a});
  // legs: hip, knee, ankle, and the ball of the flipper, where its front bends
  const legs=[1,-1].map(s=>{const n=s>0?'L':'R',hp=J(hips,'hp'+n,s*L.hipX,0,.045),kn=J(hp,'kn'+n,0,-L.thigh,0),an=J(kn,'an'+n,0,-L.shin,0),
    tp=J(an,'tp'+n,0,FT.ballY-FT.ank,FT.ball);return {s,hp,kn,an,tp}});
  // the cloak's two joints: where the back is widest (above it the cloak lies on the body) and lower down
  const cape=[J(hips,'cape0',0,CAPE.y-L.hip,CAPE.z)];cape.push(J(cape[0],'cape1',0,-.17,-.01));
  R.m.updateMatrixWorld(true);return {hips,chest,neck,head,eyes,arms,legs,cape}}

// every part, built once on the model's own skeleton: [bone name, geometry in that bone's space, the bones it is skinned to
// by name (null: that bone alone), material: body (the felt and the rest), brass (two-sided), cloth (the cloak)]
// how finely it is made, from the most triangles to the fewest: the head and the eyes the same in all; the body's sides (12, 8
// or 6: a side ends on every column of the cloak, 15° apart, and the neck band has two columns to each side, so neither cuts
// into the felt between its columns); the legs', flippers' and arms' [sides, steps along]; the fingers' sides (their steps are
// their shape's own, so the round tips stay); the clasp's [sides, rings]. A limb with fewer sides is made as much wider as its
// corners cut in (comp), so it looks as thick
const LODS=[{rad:12,leg:[10,12],foot:[12,10],arm:[6,14],fing:6,clasp:[10,3]},
  {rad:12,leg:[8,10],foot:[10,8],arm:[6,10],fing:5,clasp:[8,2]},
  {rad:8,leg:[6,8],foot:[8,6],arm:[5,8],fing:5,clasp:[6,2]},
  {rad:6,leg:[5,6],foot:[6,5],arm:[4,6],fing:4,clasp:[6,2]}];
const TPL=[];
function template(lod=0){if(TPL[lod])return TPL[lod];const q=Q,LD=LODS[lod],R=rig(new THREE.Group()),B=skeleton(R,true),{hips,chest,neck,head,eyes,arms,legs,cape}=B,parts=[];
  // hang a part drawn in the world on a bone
  const hangW=(bone,geo,key)=>{geo.applyMatrix4(bone.matrixWorld.clone().invert());parts.push([bone,geo,geo.userData.skin||null,key]);return bone};
  const wpos=b=>V3().setFromMatrixPosition(b.matrixWorld);

  // head: a dome with a flat underside (the upper lip), long and wedge-shaped from the side, widest at the mouth corners;
  // the jaw a boxy bowl under it; both lined with pink; the lips meet on a nearly flat line. The mouth stays shut: the jaw
  // rides the head
  const hx=(x,w,k)=>x*(1-k*Math.max(0,w)**2),HW=.135,JW=.13,yb=x=>1.165-.008*(x/HW)**2,lip=y=>1-.16*(1-Math.min(1,y*2.5))**2;
  const D=w=>w>0?.09-.05*w**1.1:.09-.02*w*w,fh=comp(q.hw),wide=v=>{v.x*=fh;v.z*=fh};
  // the brow between the eyes is a rise of the crown itself (BROW: its height, its half-widths across and along, where along)
  const brow=(x,z)=>BROW.h*Math.exp(-((x/BROW.x)**2)-(((z-BROW.z0)/BROW.z)**2));
  const crown=part(halfBall(true,q.hw,BROW.rows),GREEN,null,v=>{wide(v);const w=v.z,x=HW*hx(v.x,w,.18)*lip(v.y),z=.1275+.153*w;v.set(x,yb(x)+.08*Math.max(0,v.y)**.7+brow(x,z),z)});
  const roof=part(new THREE.CircleGeometry(1,q.hw),ROOF,_m4(0,0,0,Math.PI/2),v=>{wide(v);const w=v.z*.97,x=HW*.84*hx(v.x,w,.18);v.set(x,yb(x)+.0005,.1275+.153*w)});
  const sockets=[1,-1].map(s=>part(new THREE.SphereGeometry(1,q.eye,q.eh),GREEN,_m4(s*.049,1.212,.115,0,0,0,.047,.04,.045)));
  // behind the mouth's corners the jaw grows flush with the crown, so the back of the head has no ledge
  const jawG=part(halfBall(false,q.hw,6),GREEN,null,v=>{wide(v);const w=v.z,k=sst(-w/.7),x=lerp(JW,HW,k)*hx(v.x,w,.3)*lip(-v.y);
    v.set(x,yb(x)-D(w)*Math.pow(Math.max(0,-v.y),.7),lerp(.128+.148*w,.1275+.153*w,k))});
  const floorG=part(new THREE.CircleGeometry(1,q.hw),MOUTH,_m4(0,0,0,-Math.PI/2),v=>{wide(v);const w=v.z*.97,x=JW*.84*hx(v.x,w,.3);v.set(x,yb(x)-.0005,.128+.148*w)});
  const tongueG=part(new THREE.SphereGeometry(1,6,3),TONGUE,_m4(0,1.15,.15,0,0,0,.062,.012,.075));
  // where the neck meets the head, found while the head's parts still lie in the world (hanging moves them into their bone)
  const seams=neckSeams(LD.rad,[worldMesh(crown.clone()),worldMesh(jawG.clone())]);
  for(const geo of [crown,roof,...sockets,jawG,floorG,tongueG])hangW(head,geo,'body');

  // eyes: white balls with a wide black lens for a pupil on the front, drawn in the eye's own space; they blink
  const ER=.044;for(const e of eyes){parts.push([e,part(new THREE.SphereGeometry(ER,q.eye,q.eh),WHITE),null,'body']);
    parts.push([e,part(new THREE.SphereGeometry(ER*1.025,Math.max(4,q.eye>>2),2,Math.PI/2-.4,.8,Math.PI/2-.16,.32),INK,null,
      v=>{const u=Math.atan2(v.x,v.z)/.4;v.y*=1-.45*u*u;v.setLength(ER*1.025)}),null,'body'])}

  // body and neck: one smooth surface (bodyGeo) whose top ends inside the head, so neck and head read as one piece
  const BS=[hips,chest,neck,head],bodyG=part(bodyGeo(LD.rad,seams),GREEN);
  // the neck's last ring is shaded as the head is where it goes in: the felt runs on from the neck into the head with no line
  {const N=bodyG.attributes.normal,r0=1+(ROWS.length+NROWS-1)*(LD.rad+1);for(let i=0;i<=LD.rad;i++){const n=seams[i%LD.rad].n;N.setXYZ(r0+i,n.x,n.y,n.z)}}
  // the throat's rows and the cap inside the head take the colour of the inside of the mouth
  const bc=bodyG.attributes.color,th=colour(THROAT);
  for(let i=1+(ROWS.length+NROWS)*(LD.rad+1);i<bc.count;i++)bc.setXYZ(i,th.r,th.g,th.b);
  const body=setSkin(bodyG,BS,bodySkin);
  const bodyMesh=[worldMesh(body.clone())];
  hangW(hips,body,'body');
  // a point on the body: from the body's axis at height h, outward at angle a (0 = straight ahead), lifted off the felt
  const onBody=(h,a,lift)=>{const o=V3(0,h,zc(h)),d=V3(Math.sin(a),0,Math.cos(a)*.97).normalize(),hit=cast(bodyMesh,o,d,true);
    return o.addScaledVector(d,(hit?hit.dist:.09)+lift)};
  const skinB=geo=>setSkin(geo,BS,bodySkin);

  // legs: one sweep each from inside the body down into the flipper; the top grows out of the body's underside, the foot end
  // into the top of the flipper. The flipper is a sweep of its own from its round back to its round front (FOOT), flat
  // underneath; it rides the ankle back of the ball and the toe joint in front of it, bending smoothly between
  const kneeW=y=>sst((-y-.24)/.09),ankW=y=>sst((-y-.53)/.06),toeW=z=>sst((z-.058)/.075),lc=comp(LD.leg[0])/comp(10);
  for(const {hp,kn,an,tp} of legs){const H=wpos(hp),K=(y,z,o)=>Object.assign({p:V3(H.x,H.y+y,H.z+z)},o);
    const fc=comp(LD.foot[0])/comp(12),foot=sweep(FOOT.map(([z,w,lo,hi,f])=>{const rz=(hi-lo)/(1+f);return {p:V3(H.x,lo+rz*f,H.z+z),rx:w*fc,rz,f,w:[1-toeW(z),toeW(z)]}}),LD.foot[1],LD.foot[0],[an,tp]);
    const footMesh=[worldMesh(foot.clone())],top=(x,z)=>{const h=cast(footMesh,V3(x,.008,z),V3(0,1,0),false);return h?h.point.y:.03};
    hangW(an,foot,'body');
    // the leg runs down into the top of the flipper: its last ring lies on it, the one above a centimetre over it all round, so
    // the shin stands in the flipper with no seam, the shading turning into the flipper's over the last centimetres
    const legW=y=>{const k=kneeW(y),a=ankW(y);return [1-k,k*(1-a),a,0,0]};
    const keys=[[.07,.012,1],[.05,.05,1],[.02,.052,1.05],[-.04,.042,1.11],[-.127,.037,1.12],[-.205,.0314,1.14],[-.27,.0277,1.18],[-.34,.026,1.25],[-.44,.022,1.35],
        [-.54,.024,1.3],[-.595,.0235,1.25],[-.61,.024,1.27],[-.64,.025,1.42]].map(([y,r,d])=>K(y,0,{rx:r*lc,rz:r*d*lc,w:legW(y)}));
    const geo=sweep(keys,LD.leg[1],LD.leg[0],[hp,kn,an,tp,hips],v=>{if(v.y<.035)v.y=top(v.x,v.z)-.0005;else if(v.y<.056)v.y=top(v.x,v.z)+.011});
    fuse(geo,bodyMesh,v=>{const o=V3(0,.8,0);return {o,d:v.clone().sub(o).normalize()}},()=>[0,0,0,0,1],.05);
    fuse(geo,footMesh,v=>({o:V3(v.x,.008,v.z),d:V3(0,1,0)}),p=>{const b=toeW(p.z-H.z);return [0,0,1-b,b,0]},.025,.001);
    hangW(hp,geo,'body')}

  // arms and palms, one sweep each from inside the shoulder to the knuckles. The arm rides its own bones only, so it never
  // stretches: from the shoulder joint its root turns and runs on round into the body, level and a little down, and the arm
  // turns in it as in a socket, coming out of the body whole whichever way it points. The palm is flat and faces the body;
  // past the knuckles it bends with the fingers
  const wr=L.ua+L.fa,ac=comp(LD.arm[0])/comp(6),armW=t=>{const k=sst((t-L.ua+.025)/.05),h=sst((t-wr+.015)/.03),n=sst((t-wr-.034*HS)/(.016*HS));return [1-k,k*(1-h),h*(1-n),h*n]};
  for(const {s,sh,el,hd,fg,fm,t1,t2} of arms){const S=wpos(sh),E=wpos(el),Wr=wpos(hd),u=E.clone().sub(S).normalize(),f=Wr.clone().sub(E).normalize();
    const inward=V3(-s,-.25,0).normalize(),at=t=>t<0?S.clone().addScaledVector(inward,-t):t<=L.ua?S.clone().addScaledVector(u,t):E.clone().addScaledVector(f,t-L.ua);
    // [t from the shoulder, half-width front to back, half-depth]: the root, keys along the upper arm and the forearm, and the
    // palm from the wrist on, as big as the hand
    const keys=[[-.045,.005,.005],[-.032,.015,.015],[-.012,.0185,.0185],[.08*L.ua,.018,.018],[.26*L.ua,.016,.016],[.68*L.ua,.0145,.0145],[L.ua,.0135,.0135],
        [L.ua+.36*L.fa,.0125,.0125],[L.ua+.68*L.fa,.0115,.0115],[wr-.01,.011,.011],
        ...[[.006,.0148,.0102],[.022,.019,.0096],[.036,.0205,.0093],[.047,.0185,.008],[.055,.009,.0035]].map(([t,rx,rz])=>[wr+t*HS,rx*HS,rz*HS])]
      .map(([t,rx,rz])=>({p:at(t),rx:rx*ac,rz:rz*ac,w:armW(t)}));
    const geo=sweep(keys,LD.arm[1],LD.arm[0],[sh,el,hd,fg],null,{X0:V3(0,0,1)});
    const palm=[worldMesh(geo.clone())],inv=hd.matrixWorld.clone().invert(),l=V3();
    hangW(sh,geo,'body');
    // fingers and the thumb: small sweeps from inside the palm to round tips, a little flat; each bends at its two joints. The
    // root is laid into the palm (rays from the hand's middle line), so it grows out of it
    const finger=(o,d,l1,l2,r,bones)=>{const W=u=>{const a=sst((u+.004*HS)/(.008*HS)),b=sst((u-l1+.004*HS)/(.008*HS));return [1-a,a*(1-b),a*b]},c=comp(LD.fing);
      // (made simpler, it drops the ring inside the palm, never the two that round the tip)
      const fk=[[-.014*HS,.75],[-.005*HS,1],[.006*HS,1],[l1,.93],[l1+l2-.004*HS,.86],[l1+l2,.05]].filter((x,i)=>i!==1||!lod);
      const g=sweep(fk.map(([u,k])=>({p:o.clone().addScaledVector(d,u),rx:r*k*.85*c,rz:r*k*c,w:W(u)})),fk.length-1,LD.fing,bones);
      fuse(g,palm,v=>{l.copy(v).applyMatrix4(inv);const o=V3(0,clamp(l.y,-.045*HS,-.008*HS),0).applyMatrix4(hd.matrixWorld);return {o,d:v.clone().sub(o).normalize()}},
        p=>{const n=sst((-l.copy(p).applyMatrix4(inv).y-.034*HS)/(.016*HS));return bones[1]===fg?[1-n,n,0]:[1,0,0]},.012*HS,.0015*HS);
      hangW(hd,g,'body')};
    for(let k=0;k<3;k++){const a=HAND.splay[k];
      finger(V3(0,0,HAND.fz[k]).applyMatrix4(fg.matrixWorld),V3(0,-Math.cos(a),Math.sin(a)).transformDirection(fg.matrixWorld),HAND.l1/Math.cos(a),HAND.l2[k],HAND.r,[hd,fg,fm])}
    finger(wpos(t1),V3(0,-1,0).transformDirection(t1.matrixWorld),HAND.tl1,HAND.tl2,HAND.tr,[hd,t1,t2])}

  // ---------- the cloak ----------
  // a band of its cloth round the neck, held at the throat by a brass clasp, and from the band down the back the cloak. It lies
  // on the back down to where each of its columns stands out furthest, and from there falls straight, flaring a little, in soft
  // folds, to a brass hem that stands off the legs. Band and cloak run along the body's seams (a column every 15°, two to each
  // side of the body), and where the cloak lies on the body its rows are the body's, so the felt never shows through. Below the
  // widest point it rides its two joints (cape), which the frame swings back with the speed and lets flap. The cloth is drawn
  // white (a little grey for shade) and takes the player's colour from its material
  const N=24,A=8,band=.016,top=a=>1.012-.02*((1+Math.cos(a))/2)**2,ca=i=>Math.PI+(i/A-.5)*TAU*A/N;   // ca: 120° to 240°
  const rowsOn=[.97,.935,.89,.84,CAPE.y],rowsOff=[.66,.53],HEM=.5;
  // how far out the body is at a height along a column, from its middle
  const out=(h,a)=>onBody(h,a,0).sub(V3(0,h,zc(h))).length();
  const at=(i,h)=>{const a=ca(i);if(h>=CAPE.y)return onBody(h,a,.005);
    let r=0;for(let y=CAPE.y;y<=.95;y+=.01)r=Math.max(r,out(y,a));   // falls straight from the widest point above it
    const k=(CAPE.y-h)/(CAPE.y-HEM),d=V3(Math.sin(a),0,Math.cos(a)*.97).normalize();
    return V3(0,h,zc(h)).addScaledVector(d,r+.006+.035*k+.012*k*Math.cos((a-Math.PI)*6))};
  const rows=[i=>top(ca(i))-band,...rowsOn.map(h=>()=>h),...rowsOff.map(h=>()=>h)];
  const skinC=geo=>setSkin(geo,[hips,chest,neck,head,cape[0],cape[1]],v=>{const b=bodySkin(v),k0=sst((.845-v.y)/.07),k1=sst((.72-v.y)/.14);
    return [b[0]*(1-k0),b[1]*(1-k0),b[2]*(1-k0),b[3]*(1-k0),k0*(1-k1),k0*k1]});
  hangW(hips,skinC(part(grid(A,rows.length-1,(i,j)=>at(i,rows[j](i))),'#ffffff')),'cloth');
  hangW(hips,skinC(part(grid(A,1,(i,j)=>at(i,j?HEM:rowsOff[1])),BRASS)),'brass');
  // the band: all round the neck, lower in front; at the back it is the cloak's top edge, a shade darker than the cloak
  const NB=2*LD.rad;hangW(chest,skinB(part(grid(NB,1,(i,j)=>onBody(top(i/NB*TAU)-band*j,i/NB*TAU,.005)),'#d6d6d6')),'cloth');
  // the clasp: a low brass dome on the band at the throat
  const hb=top(0)-band/2,K=cast(bodyMesh,V3(0,hb,zc(hb)),V3(0,0,1),true);
  hangW(chest,skinB(part(halfBall(true,...LD.clasp),BRASS,new THREE.Matrix4().compose(K.point.clone().addScaledVector(K.normal,.0055),
    new THREE.Quaternion().setFromUnitVectors(V3(0,1,0),K.normal),V3(.011,.0045,.011)))),'body');

  bakeLeft(R,B,parts);
  return TPL[lod]={parts:parts.map(([b,g,sk,key])=>[b.name,g,sk&&sk.map(x=>x.name),key])}}

// the left hand never moves (the right one holds the torch): it is baked as it rests, fingers a little bent, and handed to the
// forearm, so its joints are not needed. Each of its vertices is put where the hand's joints in that pose would take it
function bakeLeft(R,B,parts){const a=B.arms[0],s=a.s,gone=[a.hd,a.fg,a.fm,a.t1,a.t2],r=HPOSE.rest,bind=new Map(R.bones.map(b=>[b,b.matrixWorld.clone()]));
  a.fg.rotation.z=-s*r[0];a.fm.rotation.z=-s*r[1];a.t1.rotation.set(r[2],-s*r[3],-s*r[4]);a.t2.rotation.z=-s*r[5];R.m.updateMatrixWorld(true);
  const S=new Map(gone.map(b=>[b,b.matrixWorld.clone().multiply(bind.get(b).clone().invert())])),v=V3(),n=V3(),p=V3(),q=V3(),t=V3();
  for(const P of parts){const [hb,geo,sk]=P;if(!sk||!sk.some(b=>gone.includes(b)))continue;
    const to=gone.includes(hb)?a.el:hb,H=bind.get(hb),Hi=bind.get(to).clone().invert(),nb=sk.length,w=geo.attributes.skw.array,
      pos=geo.attributes.position,nor=geo.attributes.normal,keep=sk.filter(b=>!gone.includes(b));if(!keep.includes(a.el))keep.push(a.el);
    const W2=new Float32Array(pos.count*keep.length);
    for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i).applyMatrix4(H);n.fromBufferAttribute(nor,i).transformDirection(H);p.set(0,0,0);q.set(0,0,0);
      for(let j=0;j<nb;j++){const wj=w[i*nb+j];if(!wj)continue;const M=S.get(sk[j]);
        p.addScaledVector(M?t.copy(v).applyMatrix4(M):v,wj);q.addScaledVector(M?t.copy(n).transformDirection(M):n,wj);
        W2[i*keep.length+keep.indexOf(gone.includes(sk[j])?a.el:sk[j])]+=wj}
      p.applyMatrix4(Hi);q.transformDirection(Hi);pos.setXYZ(i,p.x,p.y,p.z);nor.setXYZ(i,q.x,q.y,q.z)}
    geo.setAttribute('skw',new THREE.BufferAttribute(W2,keep.length));P[0]=to;P[2]=keep}
  a.fg.rotation.z=a.fm.rotation.z=a.t2.rotation.z=0;a.t1.rotation.set(HAND.tx,-s*HAND.ty,0);R.m.updateMatrixWorld(true)}

// a frog of its own: a skeleton and its skinned meshes on materials {body, brass, cloth} (the caller's, so it can colour the
// cloth and dispose of them). F.g is to be placed in the world (scaled by SCALE), F.hand holds the torch
function make(mats,lod=0){const T=template(lod),R=rig(new THREE.Group()),B=skeleton(R,false),by=new Map(R.bones.map(b=>[b.name,b]));
  const tris=rigDone(R,T.parts.map(([b,g,sk,key])=>[by.get(b),g,sk&&sk.map(n=>by.get(n)),key]),mats);
  return Object.assign(B,{g:R.m,tris,bones:R.bones.length,hand:B.arms[1].hd})}

// the torch, the one model for everyone (the player's own in view too, js/05d-gameplay.js makeTorch): a short tapered shaft
// as thick as the fist wants, an iron collar, a pitch-soaked wrap; one geometry, vertex coloured, standing along y, to be held
// at GRIP along the fist's z
const GRIP=V3(.021,-.0405,0).multiplyScalar(HS);
function torchGeo(){const P=[],N=[],C=[],I=[];
  for(const g of [part(capsule(V3(0,-.07,0),V3(0,.2,0),.011*HS,.014*HS,8),'#7a4c2a'),part(new THREE.CylinderGeometry(.016*HS,.016*HS,.02,10),'#55524c',_m4(0,.205,0)),
      part(new THREE.CylinderGeometry(.0185*HS,.0165*HS,.055,10),'#4a3826',_m4(0,.24,0)),part(new THREE.IcosahedronGeometry(.018*HS,1),'#21170f',_m4(0,.272,0,0,0,0,1,.6,1))]){
    const b=P.length/3;P.push(...g.attributes.position.array);N.push(...g.attributes.normal.array);C.push(...g.attributes.color.array);for(const i of g.index.array)I.push(b+i);g.dispose()}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(C,3));g.setIndex(I);return g}

// ---------- how it moves ----------
// Speed (its own m/s: the game's divided by SCALE) sets the cadence (strides a second), the duty (the share of a stride a foot
// is down: over half walking; under half running, when both feet are up between steps), the lift of the swinging foot, the
// height of the hips and their bob (up over the standing foot walking, down onto it running), the lean, how far the heel rises
// at push-off and the toes at heel strike, the arm swing and the elbow bend. Tables over speed, read with lerp. The game's
// walk (3 m/s, 3.6 with the blessing of swiftness) is a quick walk, a foot always down; its run (5.2, 6.2) a run with both
// feet up between the steps; the speeds in between pass only as the player speeds up or slows down
const GV=[0,.8,1.5,2.3,2.8,3.3,4,4.8,6],GT={
  f:[1.7,1.9,2.15,2.5,2.75,2.7,2.55,2.65,2.8],duty:[.6,.59,.57,.53,.52,.4,.28,.24,.2],lift:[.04,.05,.065,.09,.1,.12,.15,.16,.17],
  hip:[.655,.651,.646,.64,.637,.635,.632,.63,.627],bob:[.012,.012,.014,.017,.018,.004,-.012,-.012,-.013],lean:[0,.02,.04,.065,.075,.1,.15,.16,.18],
  heel:[.2,.25,.32,.42,.46,.52,.6,.62,.64],strike:[.1,.14,.18,.2,.18,.1,0,0,0],arm:[0,.2,.3,.42,.46,.52,.6,.62,.65],elbow:[-.12,-.2,-.3,-.45,-.52,-.9,-1.35,-1.42,-1.5]};
const gv=(k,v)=>{const T=GT[k];for(let i=1;i<GV.length;i++)if(v<=GV[i])return lerp(T[i-1],T[i],clamp((v-GV[i-1])/(GV[i]-GV[i-1]),0,1));return T[T.length-1]};
const LMAX=.997*(L.thigh+L.shin),TOEOUT=.12;
const smin=(a,b,k)=>{const h=Math.max(k-Math.abs(a-b),0)/k;return Math.min(a,b)-h*h*k/4};
const _e=new THREE.Euler(0,0,0,'YXZ'),_q=new THREE.Quaternion(),_o=V3(),_A1=V3(),_H=V3(),_X=V3(1,0,0);
// the ankle of a flipper at spot (x,z), turned out by yaw and tipped by a about its ball (a>0) or its heel (a<0)
function ankleAt(out,x,z,yaw,a){const py=a>0?FT.ballY:0,pz=a>0?FT.ball:FT.heel;_q.setFromEuler(_e.set(a,yaw,0));
  _o.set(0,FT.ank-py,-pz).applyQuaternion(_q);return out.set(x+Math.sin(yaw)*pz+_o.x,py+_o.y,z+Math.cos(yaw)*pz+_o.z)}
// how far below the ankle the lowest point of the sole is (heel, ball or tip), the flipper tipped by a, its front by toe
const soleDrop=(a,toe)=>{const c=Math.cos(a),s=Math.sin(a),b=(FT.ank-FT.ballY)*c+FT.ball*s;
  return Math.max(FT.ank*c+FT.heel*s,b+FT.ballY*Math.cos(a+toe)+Math.max(0,(FT.toe-FT.ball)*Math.sin(a+toe)))};
// a leg of two bones: the thigh's turn in the hips' frame and the knee's bend that put the ankle on A (as near as the leg
// reaches), the knee pointing ahead and a little out; then the ankle's turn that lays the flipper as Qf (the frog's frame) says
const _d=V3(),_n=V3(),_k=V3(),_t=V3(),_y=V3(),_z=V3(),_m=new THREE.Matrix4(),_qi=new THREE.Quaternion(),_qk=new THREE.Quaternion();
function legIK(out,Hj,Qh,A,s,Qf){_qi.copy(Qh).invert();_d.subVectors(A,Hj).applyQuaternion(_qi);
  const a=L.thigh,b=L.shin,D=clamp(_d.length(),.1,LMAX);_n.copy(_d).normalize();
  _k.set(s*.12,0,1).normalize().cross(_n).normalize();
  const al=Math.acos(clamp((a*a+D*D-b*b)/(2*a*D),-1,1));out.kn=Math.PI-Math.acos(clamp((a*a+b*b-D*D)/(2*a*b),-1,1));
  _t.crossVectors(_k,_n).multiplyScalar(-Math.sin(al)).addScaledVector(_n,Math.cos(al));
  _y.copy(_t).negate();_z.crossVectors(_k,_y);out.hp.setFromRotationMatrix(_m.makeBasis(_k,_y,_z));
  out.an.copy(Qh).multiply(out.hp).multiply(_qk.setFromAxisAngle(_X,out.kn)).invert().multiply(Qf)}
// the right hand's turn about its forearm that brings the fist's z (the torch) nearest to upright, leaning a little forward
// and out: the forearm's frame from the hips, chest, shoulder and elbow as posed
const UPRIGHT=V3(0,1,0).applyEuler(new THREE.Euler(.18,0,.12,'YXZ')),_qa=new THREE.Quaternion(),_qb=new THREE.Quaternion();
const _qg=new THREE.Quaternion(),_qc=new THREE.Quaternion(),_qd=new THREE.Quaternion(),_qn=new THREE.Quaternion(),_qt=new THREE.Quaternion(),_eh=new THREE.Euler(0,0,0,'YXZ');
const NK=[.3,.5];   // the neck joint's share of the head's nod and of its turn
function torchTurn(P){const [x,z,ex,ez]=P.arms[1];_qa.copy(P.Qh).multiply(_qb.setFromEuler(_e.set(...P.ch)))
  .multiply(_qb.setFromEuler(_e.set(x,0,z))).multiply(_qb.setFromEuler(_e.set(ex,0,ez))).invert();
  _o.copy(UPRIGHT).applyQuaternion(_qa);return Math.atan2(_o.x,_o.z)}

// a frog's own state of motion: its facing, the gait's phase, the feet (in its own frame: x, z the spot on the floor under the
// ankle of the flipper lying flat; down: planted, still in the world as the body passes over it; a: its tip, >0 heel up rolling
// on the ball, <0 toes up rocking on the heel; toe: the front's bend at the ball; A: where the ankle is), the springs, the pose
function state(yaw=0){return {yaw,back:false,turn:0,acc:0,fw:0,ph:Math.random(),step:0,t0:Math.random()*20,blink:{next:1+Math.random()*4,t:-1},
  feet:[1,-1].map(s=>({s,x:s*L.hipX,z:.045,yw:s*TOEOUT,down:true,u:0,a:0,toe:0,A:V3(s*L.hipX,FT.ank,.045),A0:V3(),a0:0,yw0:0})),
  SP:{arm:[1,-1].map(s=>({x:spring(),z:spring(s*L.armOut),ex:spring(-.1),ez:spring(-s*L.armOut)})),hd:[spring(),spring(),spring()],lk:spring(),cl:[spring(),spring(),spring()],
    hand:HPOSE.rest.concat(0).map(x=>spring(x))},
  P:{hx:0,hy:.655,Qh:new THREE.Quaternion(),legs:[0,1].map(()=>({hp:new THREE.Quaternion(),kn:0,an:new THREE.Quaternion()})),
    arms:[[0,L.armOut,-.1,-L.armOut],[0,-L.armOut,-.1,L.armOut]],hand:HPOSE.rest.concat(0),ch:[0,0,0],hd:[0,0,0],cape:[0,0,0]}}}

// one frame: the pose worked out and put on F's bones. inp: vx, vz how it goes (the world's m/s); mx, mz how far F.g went
// this very frame (the world's metres: the planted feet stay where they are on the floor; left out, the speed's share of
// the frame); face: the way to face when standing (null: as it is); look: the way its player looks (null: it looks about by itself); pitch: up (>0) or down; light:
// what it carries, 0 nothing, 1 the torch (in the right fist), 2 Candlelight (nothing in the hands). F.g's place is the caller's
function step(F,A,dt,t,inp){dt=clamp(dt,1e-4,.05);const T=t+A.t0,P=A.P,SP=A.SP;
  // ---- facing: the way it goes, or standing, the way it is told; then its speed along and across its facing, in its own measure.
  // going back (the way it goes is more than a quarter turn off the way its player looks: past 100 degrees; back under 80, so
  // a step straight to the side keeps it as it was) it keeps facing its player's way and steps backwards
  const sp=Math.hypot(inp.vx,inp.vz),y0=A.yaw;let want=inp.face;
  if(sp>.35){want=Math.atan2(inp.vx,inp.vz);A.back=inp.look!=null&&Math.abs(adiff(want,inp.look))>(A.back?1.4:1.75);if(A.back)want+=Math.PI}
  else A.back=false;
  if(want!=null)A.yaw+=adiff(want,A.yaw)*Math.min(1,dt*6);
  const dyaw=adiff(A.yaw,y0);A.turn=lerp(A.turn,dyaw/dt,Math.min(1,dt*10));
  const sy=Math.sin(A.yaw),cy=Math.cos(A.yaw),fw=(inp.vx*sy+inp.vz*cy)/SCALE,sd=(inp.vx*cy-inp.vz*sy)/SCALE,v=Math.hypot(fw,sd);
  const gx=inp.mx??inp.vx*dt,gz=inp.mz??inp.vz*dt,gf=(gx*sy+gz*cy)/SCALE,gs=(gx*cy-gz*sy)/SCALE;
  A.acc=lerp(A.acc,(fw-A.fw)/dt,Math.min(1,dt*8));A.fw=fw;

  // ---- the gait at this speed (turning on the spot steps like a slow walk); it steps while moving or turning, and on
  // until both feet are back under the hips. runK goes from the walk to the run
  const vs=Math.max(v,Math.abs(A.turn)*.3),runK=sst((vs-2.9)/1.1),gk=sst(vs/.7);
  const f=gv('f',vs),duty=gv('duty',vs),lift=gv('lift',vs),heel=gv('heel',vs),strike=gv('strike',vs);
  const feet=A.feet,apart=feet.some(Ft=>!Ft.down||Math.hypot(Ft.x-Ft.s*L.hipX,Ft.z-.045)>.03||Math.abs(Ft.yw-Ft.s*TOEOUT)>.1),stepping=vs>.05||apart;
  A.step=lerp(A.step,stepping?1:0,Math.min(1,dt*8));if(stepping)A.ph+=f*dt;
  // a new foot goes half a stance's travel ahead of its hip, the way the frog goes
  const ph=A.ph,cs=Math.cos(dyaw),sn=Math.sin(dyaw),ax=sd*duty/(2*f),az=fw*duty/(2*f);
  // the flipper's tip over a stance: the front comes down after the heel strike; late in the stance the heel rises and the
  // flipper rolls on its ball. stepping backwards it runs the other way: down on the ball, then flat, then toes up off the
  // heel (bk: how much it goes backwards)
  const bk=sst(-fw/.4),tip=u=>-strike*(1-sst(u/(.2*duty)))+heel*sst((u-.6*duty)/(.4*duty)),land=lerp(-strike,heel,bk);

  // ---- feet
  for(const [i,Ft] of feet.entries()){const u=frac(ph+i*.5),pu=Ft.u;Ft.u=u;
    if(Ft.down){
      // planted: the floor turns and slides back under the frog as it turns and goes, and the flipper on it keeps its way
      const x=Ft.x*cs-Ft.z*sn,z=Ft.x*sn+Ft.z*cs;Ft.x=x-gs;Ft.z=z-gf;Ft.yw-=dyaw;
      Ft.a=A.step*(u<duty?lerp(tip(u),tip(duty-u),bk):lerp(heel,-strike,bk));
      // push off when the stride says so (or a foot left far behind can no longer be reached, or is turned too far)
      if(stepping&&(u>=duty||Math.hypot(Ft.x-Ft.s*L.hipX,Ft.z-.045)>.34||Math.abs(Ft.yw-Ft.s*TOEOUT)>.6)){Ft.down=false;Ft.a0=Ft.a;Ft.yw0=Ft.yw;ankleAt(Ft.A0,Ft.x,Ft.z,Ft.yw,Ft.a)}
      else{ankleAt(Ft.A,Ft.x,Ft.z,Ft.yw,Ft.a);Ft.toe=-Math.max(0,Ft.a);continue}}
    const lx=Ft.s*L.hipX+ax,lz=.045+az;
    if(u<pu){Ft.down=true;Ft.x=lx;Ft.z=lz;Ft.yw=Ft.s*TOEOUT;Ft.a=land*A.step;ankleAt(Ft.A,lx,lz,Ft.yw,Ft.a);Ft.toe=-Math.max(0,Ft.a);continue}
    // the swing: from where it pushed off to the next spot, keeping the floor's speed at both ends; lifted in an arc that
    // peaks early (the heel comes up first); the flipper levels out and its front trails (and lies flat again for a landing
    // on the ball)
    const sw=clamp((u-duty)/(1-duty),0,1);ankleAt(_A1,lx,lz,Ft.s*TOEOUT,land);
    const g=-(1-duty)/f*.6,mx=sd*g,mz=fw*g,s2=sw*sw,s3=s2*sw,h00=2*s3-3*s2+1,h10=s3-2*s2+sw,h01=3*s2-2*s3,h11=s3-s2;
    Ft.A.set(h00*Ft.A0.x+h10*mx+h01*_A1.x+h11*mx,h00*Ft.A0.y+h01*_A1.y,h00*Ft.A0.z+h10*mz+h01*_A1.z+h11*mz);
    Ft.a=lerp(Ft.a0,land,sst(sw));Ft.yw=lerp(Ft.yw0,Ft.s*TOEOUT,sst(sw));Ft.toe=lerp(-Math.max(0,Ft.a0),0,sst(sw/.4))+.3*Math.sin(Math.PI*sw)-Math.max(0,land)*sst((sw-.6)/.4);
    Ft.A.y=Math.max(Ft.A.y+lift*Math.sin(Math.PI*Math.pow(sw,.8)),soleDrop(Ft.a,Ft.toe)+.004*sst(sw/.15))}

  // ---- hips: the gait's height and bob, let down where a planted foot would be out of reach; they lean with the speed and
  // into a speed-up, twist with the swinging leg and waddle over the standing foot
  const mid=TAU*2*frac(ph-duty/2),side=Math.cos(TAU*(ph-duty/2));
  let hy=gv('hip',vs)+gk*gv('bob',vs)*Math.cos(mid)+(1-gk)*.003*Math.sin(T*2.1);
  const lean=gv('lean',vs)*lerp(1,.4,bk)+clamp(A.acc*.03,-.1,.12);
  const tw=-gk*lerp(.09,.05,runK)*Math.cos(TAU*ph),roll=-gk*lerp(.05,.02,runK)*side,hx=gk*lerp(.012,.005,runK)*side;
  P.Qh.setFromEuler(_e.set(lean,tw,roll));
  for(const Ft of feet)if(Ft.down){_o.set(Ft.s*L.hipX,0,.045).applyQuaternion(P.Qh);
    const dx=Ft.A.x-hx-_o.x,dz=Ft.A.z-_o.z;hy=smin(hy,Ft.A.y-_o.y+Math.sqrt(Math.max(LMAX*LMAX-dx*dx-dz*dz,0)),.015)}
  P.hx=hx;P.hy=hy;
  // the legs reach their ankles
  for(const [i,Ft] of feet.entries()){_H.set(Ft.s*L.hipX,0,.045).applyQuaternion(P.Qh);_H.x+=hx;_H.y+=hy;
    _q.setFromEuler(_e.set(Ft.a,Ft.yw,0));legIK(P.legs[i],_H,P.Qh,Ft.A,Ft.s,_q)}

  // ---- arms: they swing against the legs, a beat late and loose (springs); running they pump, bent at the elbow, out from the
  // shoulders as standing. However the elbow bends, the forearm keeps to the upright plane through it (a little outward on the
  // move), so the hand passes the belly and never cuts into it. The right one holds the torch out in front, steady
  const armA=gv('arm',vs)*gk,elb=lerp(-.1,gv('elbow',vs),gk),held=inp.light===1;
  for(let i=0;i<2;i++){const s=i?-1:1,c=Math.cos(TAU*(ph+i*.5)-.4),S=SP.arm[i];
    let x=armA*c+.03*Math.sin(T*.8+i)*(1-gk),z=s*(L.armOut+.06*runK),ex=elb-.35*armA*Math.max(0,-c),
      ez=Math.atan2(-Math.sin(z)*Math.cos(ex),Math.cos(z))+s*.06*gk;
    if(i===1&&held){x=-.42+.05*gk*c-.08*runK;z=-.55;ex=-1.15-.1*runK;ez=0}
    P.arms[i]=[wob(S.x,x,13,.6,dt),crit(S.z,z,14,dt),wob(S.ex,ex,11,.45,dt),crit(S.ez,ez,14,dt)]}

  // ---- chest: turns against the hips (the shoulders against the legs) and sits up a little; breathes when standing; bends a
  // little to look down. head: looks where its player looks, to the side and up or down, its gaze steady however the body
  // leans, rolls and twists (a little of it shows), nodding a touch with the steps. when the look is far off the way the frog
  // goes (going one way, looking another: up to a quarter turn and more) the chest turns a little of it (no more than keeps the
  // arms out of the cloak) and the head the rest.
  // with no player's look it looks about by itself, and into a turn ahead of the body. the head's turn is wanted in the frog's
  // frame and put in the chest's (after the hips and the chest) for its own joint
  const look=inp.look!=null,off=look?adiff(inp.look,A.yaw):0,pitch=look?inp.pitch||0:0,cl=crit(SP.lk,clamp(off*.15,-.2,.2),10,dt);
  const cb=.12*lean+(1-gk)*.012*Math.sin(T*2.1),ch=P.ch;ch[0]=cb+clamp(-pitch*.12,-.1,.1);ch[1]=-1.1*tw+cl;ch[2]=-.6*roll;
  const gy=look?off:(1-gk)*.4*Math.sin(T*.37)*Math.sin(T*.13+1)+clamp(A.turn*.15,-.35,.35);
  _qg.setFromEuler(_eh.set(.15*(lean+cb)+.03*gk*Math.cos(mid-.8)+clamp(-pitch,-.5,.7),gy+.1*tw,.3*(roll+ch[2])+(1-gk)*.05*Math.sin(T*.29)));
  _qc.copy(P.Qh).multiply(_qd.setFromEuler(_eh.set(ch[0],ch[1],ch[2]))).invert().multiply(_qg);_eh.setFromQuaternion(_qc);
  P.hd=[crit(SP.hd[0],_eh.x,12,dt),crit(SP.hd[1],clamp(_eh.y,-1.6,1.6),8,dt),crit(SP.hd[2],_eh.z,10,dt)];
  // ---- the right hand: fingers a little bent, or closed round the torch's shaft, its thumb up along it, turned about the
  // forearm to stand the torch upright
  const goal=held?HPOSE.fist.concat(torchTurn(P)):HPOSE.rest.concat(0);P.hand=goal.map((g,k)=>crit(SP.hand[k],g,16,dt));
  // ---- cloak: below the back's widest point it hangs plumb however the hips lean, is blown back by the speed ahead (not
  // stepping backwards) and by a speed-up, flaps at a run and swings out in a turn; it never swings into the legs
  const wind=.6*sst(Math.max(0,fw)/4.2)+clamp(A.acc*.04,-.1,.2),flap=sst((v-1.15)/2.3)*(.06*Math.sin(T*13.7)+.035*Math.sin(T*21.3+1));
  P.cape=[Math.max(-.04,wob(SP.cl[0],wind-lean,6,.35,dt)),wob(SP.cl[1],.25*wind+flap,9,.3,dt),wob(SP.cl[2],clamp(-A.turn*v*.04,-.35,.35)-roll,6,.4,dt)];
  // blink: the eyes flatten for a moment, as the mobs' do
  const bl=A.blink;bl.next-=dt;if(bl.next<=0){bl.t=0;bl.next=2+Math.random()*3}
  let b=0;if(bl.t>=0){bl.t+=dt;b=Math.sin(clamp(bl.t/.15,0,1)*Math.PI);if(bl.t>.15)bl.t=-1}

  // ---- the bones
  F.g.rotation.y=A.yaw;F.hips.position.set(P.hx,P.hy,0);F.hips.quaternion.copy(P.Qh);
  for(const [i,g] of F.legs.entries()){const Lg=P.legs[i];g.hp.quaternion.copy(Lg.hp);g.kn.rotation.set(Lg.kn,0,0);g.an.quaternion.copy(Lg.an);g.tp.rotation.set(feet[i].toe,0,0)}
  for(const [i,a] of F.arms.entries()){const [x,z,ex,ez]=P.arms[i];a.sh.rotation.set(x,0,z);a.el.rotation.set(ex,0,ez)}
  const h=P.hand,a=F.arms[1],s=a.s;a.hd.rotation.set(0,h[6],0);a.fg.rotation.z=-s*h[0];a.fm.rotation.z=-s*h[1];a.t1.rotation.set(h[2],-s*h[3],-s*h[4]);a.t2.rotation.z=-s*h[5];
  // the head's turn (from the chest) split: the neck's joint takes NK of its nod and of its turn about the neck, the head the rest
  F.chest.rotation.set(...ch);_qn.setFromEuler(_eh.set(P.hd[0]*NK[0],P.hd[1]*NK[1],0));F.neck.quaternion.copy(_qn);
  F.head.quaternion.copy(_qn.invert().multiply(_qt.setFromEuler(_eh.set(...P.hd))));
  F.cape[0].rotation.set(P.cape[0],0,P.cape[2]);F.cape[1].rotation.set(P.cape[1],0,0);
  for(const e of F.eyes)e.scale.y=1-b*.9}

// for checks: the body's measures and the limbs' sizes
const dbg={bodyW,bodyF,bodyB,comp,L,HS,GV};
return {SCALE,GRIP,LODS,make,state,step,torchGeo,dbg}})();
// </frog>

// the name over the head, in the player's colour
function nameTag(name,col){const c=mkCanvas(256,64),x=c.getContext('2d');x.font='bold 30px Georgia,serif';x.textAlign='center';x.textBaseline='middle';
  x.lineWidth=6;x.strokeStyle='rgba(0,0,0,.85)';x.strokeText(name,128,34,244);x.fillStyle='#'+new THREE.Color(col).lerp(new THREE.Color('#ffffff'),.35).getHexString();x.fillText(name,128,34,244);
  const t=new THREE.CanvasTexture(c),s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false,fog:false}));s.scale.set(1,.25,1);s.renderOrder=6;return s}

// col: an index of HERO_COLS. returns the avatar, moved by animHero
function makeHero(root,col,name){const C=HERO_COLS[col%HERO_COLS.length],k=FROG.SCALE,
    lam=o=>Object.assign(new THREE.MeshLambertMaterial(Object.assign({vertexColors:true},o)),{skinning:true});
  // materials of its own (an avatar is disposed of on its own); a faint glow keeps the frog a shape in a dark corridor
  const mats={body:lam({emissive:0x0b1408}),brass:lam({side:THREE.DoubleSide,emissive:0x0d0a04}),
    cloth:lam({side:THREE.DoubleSide,color:C[1],emissive:new THREE.Color(C[1]).multiplyScalar(.12)})};
  const F=FROG.make(mats,HERO_LOD),m=F.g;m.scale.setScalar(k);root.add(m);
  const tag=nameTag(name,C[1]);tag.position.y=1.45;tag.scale.multiplyScalar(1/k);m.add(tag);
  const add=(p,map,col,op,s,y)=>{const x=new THREE.Sprite(new THREE.SpriteMaterial({map,color:col,transparent:true,opacity:op,blending:THREE.AdditiveBlending,depthWrite:false}));
    x.scale.set(s[0],s[1],1);x.position.y=y;p.add(x);return x};
  // the torch in its right fist, the flame the game's sprites; Candlelight hovers over its right shoulder
  const torch=new THREE.Group();torch.position.copy(FROG.GRIP);torch.rotation.set(Math.PI/2,0,0);torch.visible=false;F.hand.add(torch);
  torch.add(new THREE.Mesh(FROG.torchGeo(),new THREE.MeshLambertMaterial({vertexColors:true})));
  const tongue=add(torch,flameTex(),0xffffff,.95,[.09,.19],.28),core=add(torch,flameTex(),0xfff0c0,.8,[.05,.11],.28),halo=add(torch,glowTex(),0xffffff,.6,[.5,.5],.32);
  tongue.center.set(.5,.12);core.center.set(.5,.12);
  const orb=new THREE.Group();orb.position.set(-.3,1.24,.12);orb.scale.setScalar(1/k);orb.visible=false;m.add(orb);
  const haze=add(orb,orbGlowTex(),0x4a88ff,.45,[.95,.95],0),ohalo=add(orb,orbGlowTex(),0x9ccaff,.8,[.36,.36],0);add(orb,orbTex(),0xffffff,1,[.13,.13],0);
  return {m,F,A:FROG.state(),tag,torch,tongue,core,halo,orb,haze,ohalo,v:0,vx:0,vz:0,light:new THREE.Vector3()}}

// p: the other player as their snapshots have them (x, z, yaw, pitch, lt: 0 no light, 1 the torch, 2 Candlelight, fu: the
// torch's fuel). the avatar is already where p is; light: the world spot of the light it carries
function animHero(av,dt,t,p){const h=clamp(dt,1e-4,.05);
  // how it goes, from where it is put, smoothed (the gait goes by it; the feet on the floor go by the very step it took); a
  // jump of a metre or more (a new level, a page back) is no walk
  const dx=p.x-(av.px??p.x),dz=p.z-(av.pz??p.z),jump=Math.hypot(dx,dz)>1;av.px=p.x;av.pz=p.z;
  if(jump){av.vx=av.vz=0;av.A=FROG.state(p.yaw+Math.PI)}
  else{av.vx+=(clamp(dx/h,-8,8)-av.vx)*Math.min(1,h*8);av.vz+=(clamp(dz/h,-8,8)-av.vz)*Math.min(1,h*8)}
  // standing, it turns to where its player looks (the camera looks down -z, the frog faces +z)
  const look=p.yaw+Math.PI;FROG.step(av.F,av.A,h,t,{vx:av.vx,vz:av.vz,mx:jump?0:dx,mz:jump?0:dz,face:look,look,pitch:p.pitch,light:p.lt});
  // its light: the torch burning down (the flame shrinks with the fuel, gone when it is spent), or the steady orb
  const lt=p.lt;av.torch.visible=lt===1;av.orb.visible=lt===2;
  if(lt===1){const fu=p.fu,live=clamp(fu/.06,0,1),fk=(.25+.75*fu)*live,f1=1+.14*Math.sin(t*23)+.09*Math.sin(t*37+1.3);
    av.tongue.scale.set(.09*fk,.19*fk*f1,1);av.core.scale.set(.05*fk,.11*fk,1);av.halo.material.opacity=.6*fk;
    av.tongue.visible=av.core.visible=av.halo.visible=fk>.01;av.torch.updateWorldMatrix(true,false);av.light.set(0,.32,0).applyMatrix4(av.torch.matrixWorld)}
  else if(lt===2){const br=1+.05*Math.sin(t*2.1)+.03*Math.sin(t*3.7+1);av.orb.position.y=1.24+Math.sin(t*1.4)*.025;
    av.ohalo.scale.setScalar(.36*br);av.haze.scale.setScalar(.95*(1+.08*Math.sin(t*1.3+1)));av.orb.updateWorldMatrix(true,false);av.light.setFromMatrixPosition(av.orb.matrixWorld)}}
