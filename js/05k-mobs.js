'use strict';
// ---------- mobs: low-poly maze dwellers ----------
// each mob is a small rig of groups (joints) holding merged vertex-coloured meshes, lit by the scene like the props.
// local frame: +z forward, y up, floor at y=0. a mob exposes its tuning (speed, chase, sight, lose), its sounds
// and anim(mo,dt,t,sp,mx,mz), called every frame with this frame's travel sp and move vector (mx,mz)

// recolour the faces of a merged (non-indexed) geometry: fn(centroid, normal) returns a colour or nothing
function paintFaces(geo,fn){const p=geo.attributes.position.array,n=geo.attributes.normal.array,c=geo.attributes.color.array,col=new THREE.Color(),
    C=new THREE.Vector3(),N=new THREE.Vector3();
  for(let i=0;i<p.length;i+=9){C.set((p[i]+p[i+3]+p[i+6])/3,(p[i+1]+p[i+4]+p[i+7])/3,(p[i+2]+p[i+5]+p[i+8])/3);N.set(n[i],n[i+1],n[i+2]);
    const k=fn(C,N);if(!k)continue;col.set(k);for(let v=0;v<3;v++){c[i+v*3]=col.r;c[i+v*3+1]=col.g;c[i+v*3+2]=col.b}}
  geo.attributes.color.needsUpdate=true;return geo}
// a prism-shaped limb segment from a to b
function limb(a,b,r0,r1,col,seg=5){const d=new THREE.Vector3().subVectors(b,a),L=d.length(),m=new THREE.Matrix4().compose(
  new THREE.Vector3().addVectors(a,b).multiplyScalar(.5),new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()),new THREE.Vector3(1,1,1));
  return [new THREE.CylinderGeometry(r1,r0,L,seg),col,m]}
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
// face the way it moves, turning smoothly
function faceMove(mo,dt,sp,mx,mz){const want=sp>0&&(mx||mz)?Math.atan2(mx,mz):mo.yaw,d0=want-mo.yaw;
  mo.yaw+=Math.atan2(Math.sin(d0),Math.cos(d0))*Math.min(1,dt*12);mo.m.rotation.y=mo.yaw}
// rig: the joints are bones; the parts hung on them are merged into one skinned mesh per material, so a whole mob
// costs a couple of draw calls instead of one per bone. every vertex follows exactly one bone (rigid parts)
function rig(m){return {m,bones:[],parts:{}}}
function joint(R,parent,x,y,z){const b=new THREE.Bone();b.rotation.order='YXZ';b.position.set(x,y,z);(parent||R.m).add(b);R.bones.push(b);return b}
function hang(R,bone,geo,mat){(R.parts[mat.uuid]||(R.parts[mat.uuid]={mat,list:[]})).list.push([bone,geo]);return bone}
function rigDone(R){const m=R.m;m.updateMatrixWorld(true);const inv=m.matrixWorld.clone().invert(),skel=new THREE.Skeleton(R.bones);
  for(const {mat,list} of Object.values(R.parts)){const P=[],N=[],U=[],C=[],SI=[],SW=[],v=new THREE.Vector3(),nm=new THREE.Matrix3();
    for(const [b,g] of list){const M=new THREE.Matrix4().multiplyMatrices(inv,b.matrixWorld),bi=R.bones.indexOf(b),p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,c=g.attributes.color;nm.getNormalMatrix(M);
      for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(M);P.push(v.x,v.y,v.z);v.fromBufferAttribute(n,i).applyMatrix3(nm).normalize();N.push(v.x,v.y,v.z);
        U.push(uv?uv.getX(i):0,uv?uv.getY(i):0);C.push(c.getX(i),c.getY(i),c.getZ(i));SI.push(bi,0,0,0);SW.push(1,0,0,0)}}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(P,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));
    geo.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));geo.setAttribute('color',new THREE.Float32BufferAttribute(C,3));
    geo.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(SI,4));geo.setAttribute('skinWeight',new THREE.Float32BufferAttribute(SW,4));
    // bounds wide enough for any pose (the bind pose alone would cut off a raised sword)
    geo.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,.9,0),1.7);const sm=new THREE.SkinnedMesh(geo,mat);m.add(sm);sm.bind(skel)}}
const skinMat=(key,make)=>G[key]||(G[key]=Object.assign(make(),{skinning:true}));
const mobMat=()=>skinMat('mobMat',()=>new THREE.MeshLambertMaterial({vertexColors:true}));

// ---------- wraith: a hooded guardian with a lantern ----------
// a tall robe floating a hand's breadth over the floor, a deep hood with two cold lights in the dark where the face
// should be. the right arm reaches forward with a bony claw, the left carries a green lantern on a short chain.
// the hem is a soft skirt that ripples in slow waves and trails behind when it moves. on patrol it drifts, chasing it
// leans in and reaches; right at the player it holds the lantern up to the face. the lantern light is seen around corners
const WRAITH={robe:'#41455a',dk:'#262836',bone:'#a8b0a0',claw:'#d4dac8',belt:'#4a3a2a',iron:'#3a3a40',chain:'#5a5a60',eye:'#b4f6ff',glass:'#6bffa0'};
function wraithGeos(){const K=WRAITH,R=K.robe,ico=(r,col,x,y,z,sx=1,sy=1,sz=1,rx=0)=>[new THREE.IcosahedronGeometry(r,0),col,_m4(x,y,z,rx,0,0,sx,sy,sz)];
  // robe and shoulder cape, a rope belt with two hanging ends; the body bone is at the floor, the robe ends at y .275
  const body=mergeParts([[new THREE.CylinderGeometry(.15,.34,.95,8,4),R,_m4(0,.75,0)],ico(.2,R,0,1.19,0,1.55,.6,1.05),[new THREE.TorusGeometry(.235,.02,3,10),K.belt,_m4(0,.85,0,Math.PI/2)],
    ...[-1,1].map(s=>limb(V3(s*.05,.85,.22),V3(s*.08,.6,.26),.012,.008,K.belt,4))]);
  // folds: darker vertical bands down the robe
  paintFaces(body,(c,n)=>c.y<1.1&&c.y>.3&&Math.abs(n.y)<.5&&Math.round(Math.atan2(c.x,c.z)/(Math.PI/4))%2?K.dk:null);
  // hood (the head bone sits at y 1.3): a pointed hood, a thick rim and the black void inside it
  const hood=mergeParts([[new THREE.IcosahedronGeometry(.19,1),R,_m4(0,.13,0,-.15,0,0,1,1.15,1.15)],[new THREE.ConeGeometry(.08,.22,5),R,_m4(0,.3,-.13,-.9)],
    [new THREE.TorusGeometry(.125,.035,4,9),K.dk,_m4(0,.11,.2,-.15,0,0,1,1.3,1)]]);
  // the eyes and the black void around them are unlit, so the faint glow of the robe never greys the void
  const eyes=mergeParts([ico(.12,'#040406',0,.1,.19,1,1.25,.4,-.15),...[-1,1].map(s=>[new THREE.OctahedronGeometry(.022,0),K.eye,_m4(s*.045,.12,.245)])]);
  // arm along -y from the shoulder: a wide sleeve, a bony wrist and a hand with four long claws and a thumb
  const arm=s=>mergeParts([limb(V3(0,0,0),V3(0,-.48,0),.075,.12,R,6),cy(.125,.125,.04,6,0,-.49,0,K.dk),limb(V3(0,-.47,0),V3(0,-.57,0),.026,.022,K.bone,5),
    bx(.07,.07,.03,0,-.6,0,K.bone),...[-.025,-.008,.008,.025].map(x=>limb(V3(x,-.63,0),V3(x*1.4,-.78,.04),.011,.003,K.claw,4)),
    limb(V3(-s*.035,-.6,0),V3(-s*.065,-.69,.04),.01,.003,K.claw,4)]);
  // lantern hanging from the fist: chain link, a pointed cap, four posts and a base; the glass glows on its own
  const lantern=mergeParts([limb(V3(0,.04,0),V3(0,-.06,0),.006,.006,K.chain,3),[new THREE.TorusGeometry(.03,.007,3,8),K.chain,_m4(0,-.08,0)],
    [new THREE.ConeGeometry(.08,.05,4),K.iron,_m4(0,-.12,0,0,Math.PI/4,0)],bx(.12,.018,.12,0,-.27,0,K.iron),
    ...[[-1,-1],[-1,1],[1,-1],[1,1]].map(([a,b])=>cy(.007,.007,.13,4,a*.05,-.205,b*.05,'#4a4a50'))]);
  const glass=mergeParts([bx(.085,.12,.085,0,-.205,0,K.glass)]);
  return {body,hood,eyes,armR:arm(1),armL:arm(-1),lantern,glass}}

// the hem: a skirt lathed onto the bottom of the robe, darker towards the edge. every wraith has its own copy, since it is
// moved vertex by vertex: the lower rings sway in slow waves and billow out, the edge itself is a little uneven, and when
// the wraith moves the hem trails back and lifts
const WRAITH_HEM={top:.32,bot:-.08};
function wraithHem(){const prof=[[.43,-.08],[.39,.06],[.355,.2],[.335,.32]],geo=mergeParts([lathe(prof,28,WRAITH.robe)]);
  paintFaces(geo,c=>c.y<.1?WRAITH.dk:null);geo.userData.base=geo.attributes.position.array.slice();
  geo.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,.12,0),.75);return geo}
function rippleHem(geo,t,drag){const {top,bot}=WRAITH_HEM,pos=geo.attributes.position,a=pos.array,base=geo.userData.base;
  for(let i=0;i<a.length;i+=3){const y0=base[i+1];if(y0>=top)continue;const k=(top-y0)/(top-bot),kk=k*k,ang=Math.atan2(base[i],base[i+2]),
      r=1+Math.sin(ang*3+t*1.7)*(.07+drag*.04)*kk;
    a[i]=base[i]*r;a[i+2]=base[i+2]*r-drag*.2*kk;
    a[i+1]=y0+(Math.sin(ang*4-t*2.2)*(.04+drag*.025)+(y0<bot+.001?Math.sin(ang*7+1.3)*.03:0))*k+drag*.07*kk}
  pos.needsUpdate=true;geo.computeVertexNormals()}

function makeWraith(root){if(!G.wraithGeo)G.wraithGeo=wraithGeos();const g=G.wraithGeo,
    // the robe glows faintly cold on its own: a dark shape in a dark corridor still reads as a figure
    mat=skinMat('wraithMat',()=>new THREE.MeshLambertMaterial({vertexColors:true,emissive:0x080a12})),
    em=skinMat('wraithGlow',()=>new THREE.MeshBasicMaterial({vertexColors:true})),
    cloth=G.wraithCloth||(G.wraithCloth=new THREE.MeshLambertMaterial({vertexColors:true,emissive:0x080a12,side:THREE.DoubleSide}));
  const m=new THREE.Group();root.add(m);const R=rig(m),bone=(p,x,y,z,geo,mt=mat)=>hang(R,joint(R,p,x,y,z),geo,mt);
  const body=bone(null,0,.18,0,g.body),head=bone(body,0,1.3,0,g.hood);hang(R,head,g.eyes,em);
  const armR=bone(body,.27,1.17,.03,g.armR),armL=bone(body,-.27,1.17,.03,g.armL),lan=bone(armL,0,-.66,0,g.lantern);hang(R,lan,g.glass,em);rigDone(R);
  const hemGeo=wraithHem(),hem=new THREE.Mesh(hemGeo,cloth);body.add(hem);
  const halo=glowSprite('rgba(160,240,255,.85)',.26);halo.position.set(0,.12,.27);head.add(halo);   // one halo for both eyes
  const flame=glowSprite('rgba(110,255,160,.9)',.55);flame.position.set(0,-.2,0);lan.add(flame);
  // one green light for all the wraiths: it follows the nearest one (a light per wraith would cost every surface a light)
  if(!G.lanternLight){G.lanternLight=new THREE.PointLight(WRAITH.glass,0,4.5,2);root.add(G.lanternLight)}
  return {m,kind:'wraith',yaw:0,body,head,armR,armL,lan,hem,hemGeo,halo,flame,run:0,pose:0,lean:0,bank:0,wave:0,
    ph0:Math.random()*20,lx:0,lvx:0,lz:0,lvz:0,v0:0,yaw0:0,
    // drifts faster than the player walks (3 m/s), never as fast as the player sprints (5.2 m/s)
    speed:1.2,chase:Math.min(4.6,3.9+.1*game.level),sight:11,lose:4,anim:animWraith,stepK:[.42,.85],growl:sndWail,stepSnd:sndLantern}}
function animWraith(mo,dt,t,sp,mx,mz){faceMove(mo,dt,sp,mx,mz);
  const h=Math.min(Math.max(dt,1e-4),.05),moving=sp>0,v=moving?sp/Math.max(dt,1e-4):0,T=t+mo.ph0,ease=k=>Math.min(1,h*k);
  // drift (patrol ~1.2 m/s) blends into a rush (chase ~4 m/s)
  mo.run+=(clamp((v-1.6)/1.8,0,1)-mo.run)*ease(5);const r=mo.run;
  const d=Math.hypot(pl.x-mo.x,pl.z-mo.z),near=mo.mode==='chase'&&d<2.4;mo.pose+=((near?1:0)-mo.pose)*ease(4);const q=mo.pose;
  // body: bobs in the air, leans into the way it goes and banks into turns
  let dy=mo.yaw-mo.yaw0;dy=Math.atan2(Math.sin(dy),Math.cos(dy));mo.yaw0=mo.yaw;const turn=dy/h;
  mo.lean+=((moving?lerp(.1,.34,r):0)-mo.lean)*ease(4);mo.bank+=(clamp(-turn*v*.05,-.3,.3)-mo.bank)*ease(5);
  mo.body.position.y=.18+Math.sin(T*1.5)*.05+r*.05;mo.body.rotation.set(.05+mo.lean-q*.08,0,Math.sin(T*.9)*.03+mo.bank);
  // the reaching claw: slow and searching on patrol, stretched out in a chase, up at the face right at the player, fingers trembling
  mo.armR.rotation.set(lerp(lerp(-1.15,-1.35,r),-1.85,q)+Math.sin(T*1.3)*.1*(1-q)+Math.sin(T*9)*.04*q-mo.lean*.5,0,-.12+Math.sin(T*2.1)*.04);
  // the lantern arm hangs low on patrol, trails a little in a chase and lifts the lantern towards the player at the end
  mo.armL.rotation.set(lerp(lerp(-.5,-.35,r),-2.05,q)+Math.sin(T*1.5+1)*.06-mo.lean*.4,0,lerp(.1,-.1,q));
  // the lantern swings on its chain like a pendulum: pushed back when the wraith speeds up, out to the side in a turn
  const acc=(v-mo.v0)/h;mo.v0+=(v-mo.v0)*ease(10);
  mo.lvx+=(-24*mo.lx-3*mo.lvx+clamp(acc,-12,12)*.45)*h;mo.lx=clamp(mo.lx+mo.lvx*h,-.7,.7);
  mo.lvz+=(-24*mo.lz-3*mo.lvz-clamp(turn*v,-12,12)*.45)*h;mo.lz=clamp(mo.lz+mo.lvz*h,-.7,.7);
  // ...and is kept hanging straight down whatever the arm and the body do
  const b=mo.body.rotation,a=mo.armL.rotation;mo.lan.rotation.set(-a.x-b.x+mo.lx+Math.sin(T*2.2)*.08,0,-a.z-b.z+mo.lz+Math.sin(T*1.7)*.06);
  // hood: looks around while it searches, looks down at the player close by, keeps level while it leans in
  const look=mo.wait>0&&mo.mode!=='chase'?Math.sin(T*1.4)*.9:moving?0:Math.sin(T*.6)*.25;
  mo.head.rotation.set(-mo.lean*.7+q*.2+Math.sin(T*1.1)*.03,mo.head.rotation.y+(look-mo.head.rotation.y)*ease(4),Math.sin(T*.7)*.06);
  // the eyes burn brighter in a chase; the lantern flickers
  const hot=mo.mode==='chase'?1:0;mo.halo.material.opacity=.55+.45*hot+Math.sin(T*13)*.05;mo.halo.scale.setScalar(.22+.12*hot+.05*q);
  const fl=1+Math.sin(T*11)*.08+Math.sin(T*5.3)*.07;mo.flame.material.opacity=.85*fl;
  // the hem ripples faster and trails back when it moves; not worth the vertex work while nobody sees it
  mo.wave+=h*(1+r*1.4);if(mo.m.visible)rippleHem(mo.hemGeo,mo.wave,clamp(v/4,0,1));
  // the shared green light goes to the nearest wraith, also one hidden behind a wall: its glow on the walls gives it away
  // before it comes round the corner
  const L=G.lanternLight;if(L){const o=L.owner,lit=d<WRAITH_LIT;if(!o||o===mo||!G.monsters.includes(o)||d<Math.hypot(pl.x-o.x,pl.z-o.z)-.5){
      L.owner=lit?mo:null;if(lit){mo.lan.updateWorldMatrix(true,false);L.position.setFromMatrixPosition(mo.lan.matrixWorld);L.position.y-=.2;L.intensity=1.3*fl}else L.intensity=0}}}
const WRAITH_LIT=14;   // m: further off its light would only cost and never be seen

// ---------- cave spider: a low-poly mob for the dungeons ----------
// a faceted body with bright markings and glowing eyes; eight jointed legs walk in an alternating tetrapod gait.
// it hunts like the wraith but differently: quicker, nearly blind (sees only up close) and quick to give up a chase
const SPIDER={scale:.8,speed:1.5,chase:4.8,sight:5.5,lose:2};   // chase: quicker than the wraith, still below the player's sprint (5.2 m/s)
// colourings, each its own species: body, darker joints and fangs, markings, leg tips, eyes and their glow
const SPIDER_SKINS={
  ember:{col:'#3a3640',dark:'#26232a',ember:'#c8562a',tip:'#8a3a1c',eye:'#ff8a3a',glow:'rgba(255,130,50,.8)'},
  venom:{col:'#2c3a2a',dark:'#1a2418',ember:'#8ad02a',tip:'#4a7a18',eye:'#c8ff4a',glow:'rgba(170,255,70,.75)'},
  frost:{col:'#8c98a8',dark:'#5a6474',ember:'#4ab8e8',tip:'#d8ecf8',eye:'#9ae8ff',glow:'rgba(140,220,255,.8)'},
  widow:{col:'#1c1a20',dark:'#0e0c10',ember:'#c81c28',tip:'#5a0c12',eye:'#ff3a3a',glow:'rgba(255,50,50,.75)'},
  bone:{col:'#8a7458',dark:'#5a4a36',ember:'#e8d8b0',tip:'#3a2e22',eye:'#ffd84a',glow:'rgba(255,215,80,.75)'},
  violet:{col:'#3a2c48',dark:'#241a2e',ember:'#b05ae8',tip:'#6a2a8a',eye:'#e09aff',glow:'rgba(210,140,255,.8)'}};

function spiderGeos(S){const V=V3;
  const body=mergeParts([
    [new THREE.IcosahedronGeometry(.34,2),S.col,_m4(0,.6,-.42,.25,0,0,1,.82,1.3)],   // abdomen, rear end raised
    [new THREE.IcosahedronGeometry(.2,1),S.col,_m4(0,.48,.02,-.1,0,0,1.05,.7,1.15)],  // cephalothorax
    [new THREE.IcosahedronGeometry(.14,1),S.col,_m4(0,.44,.27,0,0,0,1,.85,.95)],     // head
    ...[-1,1].map(s=>[new THREE.ConeGeometry(.035,.16,5),S.dark,_m4(s*.05,.32,.38,Math.PI-.3,0,0)]),    // fangs
    ...[-1,1].map(s=>limb(V(s*.07,.4,.34),V(s*.11,.3,.46),.022,.016,S.dark))]);       // pedipalps
  // markings: a chevron on the abdomen, a spine streak behind it, brows over the eyes
  paintFaces(body,(c,n)=>{const u=-.12-c.z;
    if(c.z<-.1&&n.y>.15&&u>0&&u<.62&&Math.abs(Math.abs(c.x)-u*.55)<.05)return S.ember;
    if(c.z<-.55&&n.y>.3&&Math.abs(c.x)<.035)return S.ember;
    if(c.z>.3&&c.y>.47&&n.y>.25&&n.z>.15&&Math.abs(c.x)>.025)return S.ember});
  // a leg points along +x: femur up and out, tibia down, a thin pointed tarsus to the floor
  const leg=k=>{const A=V(.06,0,0),B=V(.4*k,.26,0),C=V(.7*k,-.08,0),D=V(.84*k,-.45,0);
    return paintFaces(mergeParts([limb(A,B,.058,.046,S.col),limb(B,C,.046,.034,S.col),limb(C,D,.032,.006,S.dark),
      [new THREE.IcosahedronGeometry(.056,0),S.col,_m4(B.x,B.y,0)],[new THREE.IcosahedronGeometry(.042,0),S.col,_m4(C.x,C.y,0)]]),
      // ember streak along the top of the femur only, and glowing-hot tips; the rest stays charcoal
      (c,n)=>c.x>C.x+(D.x-C.x)*.6?S.tip:n.y>.75&&c.x>A.x+.08&&c.x<B.x-.04?S.ember:null)};
  const eyes=mergeParts([[-1,1].map(s=>[new THREE.OctahedronGeometry(.026,0),'#fff',_m4(s*.045,.48,.385)]),[-1,1].map(s=>[new THREE.OctahedronGeometry(.017,0),'#fff',_m4(s*.085,.465,.36)]),
    [-1,1].map(s=>[new THREE.OctahedronGeometry(.014,0),'#fff',_m4(s*.03,.53,.365)])].flat());
  return {body,eyes,legs:[1.1,.95,.95,1.05].map(leg)}}

// leg sockets on the cephalothorax and how far forward each leg points (radians, + is forward)
const SPIDER_LEGS=[[.14,.95],[.05,.35],[-.04,-.25],[-.12,-.85]];
// skin: a key of SPIDER_SKINS, random if not given
function makeSpider(root,skin){skin=skin||pick(Object.keys(SPIDER_SKINS));const S=SPIDER_SKINS[skin],GS=G.spiderGeo||(G.spiderGeo={}),
    g=GS[skin]||(GS[skin]=spiderGeos(S)),mat=mobMat(),em=skinMat('spiderEye:'+skin,()=>new THREE.MeshBasicMaterial({color:S.eye,vertexColors:true}));
  const m=new THREE.Group();root.add(m);const R=rig(m),sc=joint(R,null,0,0,0);sc.scale.setScalar(SPIDER.scale);
  const body=hang(R,joint(R,sc,0,0,0),g.body,mat);hang(R,body,g.eyes,em);
  const glow=glowSprite(S.glow,.32);glow.position.set(0,.48,.42);body.add(glow);
  const legs=[];
  // tetrapod gait: L1 R2 L3 R4 step together, then the other four
  for(const side of [-1,1])SPIDER_LEGS.forEach(([z,a],i)=>{const p=hang(R,joint(R,sc,side*.12,.45,z),g.legs[i],mat);
    legs.push({p,side,a,ph:((i+(side>0?1:0))%2)*Math.PI})});rigDone(R);
  return {m,body,legs,kind:'spider',skin,yaw:0,speed:SPIDER.speed,chase:SPIDER.chase,sight:SPIDER.sight,lose:SPIDER.lose,anim:animSpider,
    stepK:[.13,.24],growl:sndHiss,stepSnd:sndSkitter}}
function animSpider(mo,dt,t,sp,mx,mz){faceMove(mo,dt,sp,mx,mz);const p=mo.walk*7.5,moving=sp>0;
  for(const L of mo.legs){const s=moving?Math.sin(p+L.ph):Math.sin(t*1.3+L.a*3)*.08,lift=moving?Math.max(0,Math.cos(p+L.ph))*.28:0,a=L.a+s*.24;
    L.p.rotation.set(0,L.side>0?-a:Math.PI+a,lift)}
  mo.body.position.y=moving?Math.abs(Math.sin(p))*.02:Math.sin(t*2)*.006}

// ---------- giant centipede ----------
// thirteen chitin plates, a pair of legs on each. the head goes where the maze takes it and every plate follows the
// very path the head took (a trail of its past positions), so the body bends round corners and fills the corridor
// behind it. a wave of steps runs down the legs; when it closes on the player it rears up, the front third of the
// body lifting off the floor, and spreads its jaws. it is half blind (it sees only a few metres) but quick
// K: the whole rig's scale. at 1.6 its back stands clear of the floor mist and it is about 3 m long
const CENTI={K:1.6,N:13,SP:.15*1.6,speed:1.4,chase:4.5,sight:4.5,lose:3,col:{shell:'#6a2a18',plate:'#9a4426',dk:'#3a160e',leg:'#d08040',tip:'#f0c070',eye:'#ffe860'}};
const icoP=(r,col,x,y,z,sx=1,sy=1,sz=1,det=1)=>[new THREE.IcosahedronGeometry(r,det),col,_m4(x,y,z,0,0,0,sx,sy,sz)];
function centiGeos(){const C=CENTI.col;
  // a plate: a flattened shell, its back plate lighter, a dark ridge at the rear edge, a spine at each side
  const plate=r=>paintFaces(mergeParts([icoP(r,C.shell,0,0,0,1.25,.55,.85),bx(r*2.1,.03,.05,0,.04,-r*.55,C.dk),
    ...[-1,1].map(s=>[new THREE.ConeGeometry(.02,.08,4),C.dk,_m4(s*r*1.25,.01,-.02,0,0,-s*1.5)])]),(c,n)=>n.y>.6&&c.z>-.02?C.plate:null);
  // a leg along ±x: up and out to the knee, then down to a pale pointed tip
  const leg=s=>paintFaces(mergeParts([limb(V3(s*.1,0,0),V3(s*.2,.06,.02),.017,.014,C.leg,4),limb(V3(s*.2,.06,.02),V3(s*.27,-.13,.05),.014,.004,C.leg,4)]),c=>c.y<-.07?C.tip:null);
  const head=paintFaces(mergeParts([icoP(.1,C.shell,0,0,.02,1.3,.6,1.1),...[-1,1].map(s=>icoP(.02,'#140806',s*.075,.035,.09,1,1,1,0))]),(c,n)=>n.y>.5?C.plate:null);
  const eyes=mergeParts([-1,1].map(s=>[new THREE.OctahedronGeometry(.013,0),'#fff',_m4(s*.075,.04,.105)]));
  const jaw=s=>mergeParts([limb(V3(0,0,0),V3(s*.045,-.01,.1),.02,.016,C.dk,4),limb(V3(s*.045,-.01,.1),V3(-s*.035,-.015,.18),.016,.003,C.tip,4)]);
  const feeler=k=>mergeParts([limb(V3(0,0,0),V3(0,0,.11),.009-k*.0015,.007-k*.0015,C.leg,3)]);
  const K=CENTI.K,o={plates:[...Array(CENTI.N)].map((_,i)=>plate(i===0?.14:.13-Math.max(0,i-8)*.015)),legL:leg(-1),legR:leg(1),head,eyes,jawL:jaw(-1),jawR:jaw(1),feel:[0,1,2,3].map(feeler)};
  for(const g of [...o.plates,...o.feel,o.legL,o.legR,o.head,o.eyes,o.jawL,o.jawR])g.scale(K,K,K);return o}
function makeCentipede(root){const g=G.centiGeo||(G.centiGeo=centiGeos()),mat=mobMat(),em=skinMat('centiEye',()=>new THREE.MeshBasicMaterial({color:CENTI.col.eye,vertexColors:true}));
  const m=new THREE.Group();root.add(m);const R=rig(m),segs=[];
  const K=CENTI.K;
  for(let i=0;i<CENTI.N;i++){const b=hang(R,joint(R,null,0,.13*K,-i*CENTI.SP),g.plates[i],mat);
    segs.push({b,legs:[hang(R,joint(R,b,0,0,0),g.legL,mat),hang(R,joint(R,b,0,0,0),g.legR,mat)]})}
  const s0=segs[0].b,head=hang(R,joint(R,s0,0,.01*K,.12*K),g.head,mat);hang(R,head,g.eyes,em);
  const jaws=[-1,1].map(s=>hang(R,joint(R,head,s*.055*K,-.02*K,.1*K),s<0?g.jawL:g.jawR,mat));
  const feelers=[-1,1].map(s=>{const ch=[];let p=head;for(let k=0;k<4;k++){p=hang(R,joint(R,p,k?0:s*.05*K,k?0:.04*K,(k?.11:.1)*K),g.feel[k],mat);ch.push(p)}ch.s=s;return ch});
  rigDone(R);m.traverse(o=>{if(o.isMesh)o.frustumCulled=false});   // its bones sit in world space, far from the group's own origin
  const glow=glowSprite('rgba(255,220,90,.6)',.22*K);glow.position.set(0,.04*K,.1*K);head.add(glow);
  return {m,kind:'centipede',worldRig:true,segs,head,jaws,feelers,trail:null,rear:0,yaw:0,
    speed:CENTI.speed,chase:Math.min(4.8,CENTI.chase+.05*game.level),sight:CENTI.sight,lose:CENTI.lose,anim:animCentipede,stepK:[.08,.15],growl:sndClack,stepSnd:sndCrawl}}
// the trail starts laid out behind the head, towards the open neighbour of its cell, so it is never seen coiled up
function centiTrail(mo){const n=W.n,[i,j]=mo.cell||[0,0],nb=[[1,0],[-1,0],[0,1],[0,-1]].find(([a,b])=>i+a>=0&&j+b>=0&&i+a<n&&j+b<n&&W.M.open(i,j,a,b))||[1,0],
    q=mobWp(i+nb[0],j+nb[1]),dx=q[0]-mo.x,dz=q[1]-mo.z,l=Math.hypot(dx,dz)||1;
  mo.trail=[];for(let d=0;d<=CENTI.N*CENTI.SP+.4;d+=.05)mo.trail.push({x:mo.x+dx/l*d,z:mo.z+dz/l*d});mo.yaw=Math.atan2(-dx,-dz)}
function animCentipede(mo,dt,t,sp,mx,mz){if(!mo.trail)centiTrail(mo);const T=mo.trail,h=Math.min(Math.max(dt,1e-4),.05),moving=sp>0;
  mo.m.position.set(0,0,0);mo.m.rotation.y=0;
  // the trail: a point every 4 cm the head has gone, long enough for the whole body
  if(Math.hypot(mo.x-T[0].x,mo.z-T[0].z)>.04){T.unshift({x:mo.x,z:mo.z});let L=0;for(let k=1;k<T.length;k++){L+=Math.hypot(T[k].x-T[k-1].x,T[k].z-T[k-1].z);if(L>CENTI.N*CENTI.SP+.4){T.length=k+1;break}}}
  else T[0]={x:mo.x,z:mo.z};
  const K=CENTI.K,d=Math.hypot(pl.x-mo.x,pl.z-mo.z),want=mo.mode==='chase'&&d<3.4?1:mo.wait>0&&mo.mode!=='chase'?.55:0;mo.rear+=(want-mo.rear)*Math.min(1,h*3);const rear=mo.rear;
  // a point at arc length s back along the trail
  let k=0,acc=0;const at=s=>{while(k<T.length-1){const sl=Math.hypot(T[k+1].x-T[k].x,T[k+1].z-T[k].z);if(acc+sl>=s){const f=sl?(s-acc)/sl:0;return [lerp(T[k].x,T[k+1].x,f),lerp(T[k].z,T[k+1].z,f)]}acc+=sl;k++}return [T[T.length-1].x,T[T.length-1].z]};
  const P=[];for(let i=0;i<=CENTI.N;i++)P.push(at(i*CENTI.SP));
  const ph=mo.walk*8/K;
  mo.segs.forEach((S,i)=>{const a=P[i],b=P[i+1],lift=rear*Math.max(0,1-i/4.5),y=(.13+lift*.46+(moving?Math.sin(ph-i*.9)*.006:Math.sin(t*1.6-i*.5)*.004))*K;
    let yaw=Math.atan2(a[0]-b[0],a[1]-b[1]);if(i===0&&!moving)yaw+=Math.sin(t*1.3)*.25*(1-rear);   // the head casts about while it stands
    const yn=i<CENTI.N-1?(.13+rear*Math.max(0,1-(i+1)/4.5)*.46)*K:y;
    S.b.position.set(a[0],y,a[1]);S.b.rotation.set(-Math.atan2(y-yn,CENTI.SP)+(i===0?-rear*.3:0),yaw,0);
    // legs: a wave of steps runs back along the body; lifted legs paw at the air
    const air=y>.22*K;for(const [q,L] of S.legs.entries()){const s=q?1:-1,p=ph-i*.9+(q?Math.PI:0);
      L.rotation.set(0,air?s*Math.sin(t*6+i)*.3:moving?Math.sin(p)*.38:Math.sin(t*1.1+i)*.05,air?s*(.35+Math.sin(t*7+i)*.2):moving?s*Math.max(0,Math.cos(p))*.35:0)}});
  mo.yaw=Math.atan2(P[0][0]-P[1][0],P[0][1]-P[1][1]);
  mo.jaws.forEach((g,q)=>{const s=q?1:-1;g.rotation.y=-s*(.15+rear*.5+Math.max(0,Math.sin(t*(mo.mode==='chase'?9:3)))*.25)});
  mo.feelers.forEach(ch=>ch.forEach((g,q)=>g.rotation.set(-.2+Math.sin(t*3.2+q+ch.s)*.25-rear*.3,(q?0:ch.s*.4)+Math.sin(t*2.4-q*.8+ch.s)*.3,0)))}

// ---------- the watcher: a floating eye ----------
// an eyeball the size of a head drifts through the corridors at eye height, veined, with a slit pupil and heavy lids,
// fleshy stalks trailing under it. it never touches the player: it looks. a faint cone of its gaze shows where. caught
// in the cone for a moment, it screams, and every shadow on the level comes to the spot. it blinks every few seconds,
// and with its lids shut it sees nothing
const EYE={R:.26,Y:1.45,speed:.55,sight:8,cone:.5,react:.55,cool:7,turn:2.4,col:{white:'#e8dccc',vein:'#b0383a',lid:'#7e4a56',lid2:'#5e3440',iris:'#d8a030',iris2:'#a83a1a',flesh:'#8e5260',dk:'#4a2430'}};
function eyeGeos(){const E=EYE.col,R=EYE.R,sph=(r,t0,t1,col,m)=>[new THREE.SphereGeometry(r,18,10,0,Math.PI*2,t0,t1),col,m||_m4()];
  const ball=paintFaces(mergeParts([sph(R,0,Math.PI,E.white)]),c=>c.z<.12&&Math.abs(Math.sin(Math.atan2(c.y,c.x)*7+c.z*18))<.12?E.vein:null);
  const iris=paintFaces(mergeParts([sph(R+.004,0,.55,E.iris,_m4(0,0,0,Math.PI/2))]),c=>Math.hypot(c.x,c.y)<.07?E.iris2:null);
  const pupil=mergeParts([sph(R+.008,0,.2,'#080404',_m4(0,0,0,Math.PI/2,0,0,.4,1,1))]);
  const lid=top=>paintFaces(mergeParts([sph(R*1.06,top?0:Math.PI/2,Math.PI/2,E.lid),[new THREE.TorusGeometry(R*1.06,.025,4,20),E.lid2,_m4(0,0,0,Math.PI/2)]]),c=>Math.abs(c.y)<.03?E.lid2:null);
  const stalk=j=>mergeParts([limb(V3(0,0,0),V3(0,-.11,0),.03*(1-j/6)+.006,.03*(1-(j+1)/6)+.005,j%2?E.flesh:E.dk,5)]);
  return {ball,iris,pupil,lidU:lid(true),lidD:lid(false),stalk:[0,1,2,3,4,5].map(stalk)}}
function makeWatcher(root){const g=G.eyeGeo||(G.eyeGeo=eyeGeos()),mat=skinMat('eyeMat',()=>new THREE.MeshLambertMaterial({vertexColors:true,emissive:0x140808})),
    dark=skinMat('eyePupil',()=>new THREE.MeshBasicMaterial({vertexColors:true}));
  const m=new THREE.Group();root.add(m);const R=rig(m),bone=(p,x,y,z,geo,mt=mat)=>hang(R,joint(R,p,x,y,z),geo,mt);
  const body=joint(R,null,0,EYE.Y,0),ball=bone(body,0,0,0,g.ball),look=bone(ball,0,0,0,g.iris);hang(R,look,g.pupil,dark);
  const lidU=bone(ball,0,0,0,g.lidU),lidD=bone(ball,0,0,0,g.lidD);
  const stalks=[0,1,2,3,4,5].map(i=>{const a=i/6*Math.PI*2+.4,ch=[];let p=joint(R,ball,Math.sin(a)*.12,-.2,Math.cos(a)*.12-.05);
    for(let j=0;j<6;j++){p=bone(p,0,j?-.11:0,0,g.stalk[j]);ch.push(p)}ch.i=i;ch.z0=Math.sin(a)*.3;return ch});
  rigDone(R);
  // the gaze: a faint open cone from the pupil, its own material so each watcher can redden on its own
  const cone=new THREE.Mesh(new THREE.ConeGeometry(.6,2.6,20,1,true).translate(0,-1.3,0).rotateX(-Math.PI/2),
    new THREE.MeshBasicMaterial({color:0xffa060,transparent:true,opacity:.05,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
  cone.position.z=EYE.R;look.add(cone);
  const shine=glowSprite('rgba(255,250,230,.9)',.06);shine.position.set(.06,.07,EYE.R+.02);ball.add(shine);
  const halo=glowSprite('rgba(255,160,90,.5)',.5);halo.position.set(0,0,EYE.R*.6);look.add(halo);
  if(!G.eyeLight){G.eyeLight=new THREE.PointLight(0xff9050,0,3.6,2);root.add(G.eyeLight)}
  return {m,kind:'eye',watcher:true,body,ball,look,lidU,lidD,stalks,cone,halo,yaw:0,ly:0,lx:0,sy:0,sx:0,next:0,stare:0,alarmT:0,alert:0,blinking:false,ph0:Math.random()*20,
    speed:EYE.speed,chase:0,sight:EYE.sight,lose:0,anim:animWatcher,stepK:[1.4,1.4],growl:()=>{},stepSnd:sndSquelch}}
// is the player inside its cone of sight right now (lids open, in range, in the cone, a clear line)?
function watcherSees(mo,d){if(mo.blinking||d>EYE.sight*(G.bless.shadow?.45:1))return false;
  const a=Math.atan2(pl.x-mo.x,pl.z-mo.z),da=Math.atan2(Math.sin(a-mo.yaw-mo.ly),Math.cos(a-mo.yaw-mo.ly));return Math.abs(da)<EYE.cone&&los(mo.x,mo.z,pl.x,pl.z)}
// each frame from updateMonsters, instead of the chase logic: it stares, then raises the alarm
// it notices the player anywhere round it (in range, lids open, a clear line), stops and turns to look; the turn takes
// a moment (EYE.turn), long enough to duck out of sight. only once the player is inside the cone does it stare and scream
function watcherThink(mo,dt,d,inMaze){mo.alarmT=Math.max(0,mo.alarmT-dt);mo.alert=Math.max(0,mo.alert-dt*.25);
  const near=inMaze&&!mo.blinking&&d<EYE.sight*(G.bless.shadow?.45:1)&&los(mo.x,mo.z,pl.x,pl.z),sees=near&&watcherSees(mo,d);
  // it keeps turning to the spot for a little while after losing sight of the player
  if(near){mo.notice=1.2;mo.wait=Math.max(mo.wait,.6);if(mo.mode==='lure')mo.mode='search'}else mo.notice=Math.max(0,(mo.notice||0)-dt);
  if(sees){mo.stare+=dt;
    if(mo.stare>EYE.react&&mo.alarmT<=0){mo.alarmT=EYE.cool;mo.alert=1;sndShriek(mo.x,mo.z);noiseAt(pl.x,pl.z,60,mo);
      if(!G.hint.eye){G.hint.eye=1;toast('The watcher screams: the shadows are coming. Stay out of its gaze')}}}
  else mo.stare=Math.max(0,mo.stare-dt*2)}
function animWatcher(mo,dt,t,sp,mx,mz){const h=Math.min(Math.max(dt,1e-4),.05),T=t+mo.ph0,d=Math.hypot(pl.x-mo.x,pl.z-mo.z);
  // it faces the way it drifts; once it has caught sight of the player it turns to stare
  if(mo.notice>0){const a=Math.atan2(pl.x-mo.x,pl.z-mo.z),da=Math.atan2(Math.sin(a-mo.yaw),Math.cos(a-mo.yaw));
    mo.yaw+=Math.sign(da)*Math.min(Math.abs(da),EYE.turn*h,Math.abs(da)*h*6);mo.m.rotation.y=mo.yaw}
  else faceMove(mo,dt,sp,mx,mz);
  mo.body.position.y=EYE.Y+Math.sin(T*1.1)*.06;mo.ball.rotation.set(Math.sin(T*.6)*.05,0,Math.sin(T*.7)*.06);
  // the iris darts about: on patrol it scans to the sides, staring it holds on the player
  // the iris swings ahead of the slower ball, to the player
  if(mo.notice>0){const a=Math.atan2(pl.x-mo.x,pl.z-mo.z);mo.sy=clamp(Math.atan2(Math.sin(a-mo.yaw),Math.cos(a-mo.yaw)),-.45,.45);mo.sx=Math.atan2(mo.body.position.y-(pl.y||1.6),Math.max(d,.5))*.6}
  else if(t>mo.next){mo.next=t+.4+Math.random()*1.4;mo.sy=(Math.random()-.5)*.8;mo.sx=(Math.random()-.5)*.4}
  mo.ly+=(mo.sy-mo.ly)*Math.min(1,h*18);mo.lx+=(mo.sx-mo.lx)*Math.min(1,h*18);mo.look.rotation.set(mo.lx,mo.ly,0);
  // blinks: quick and regular, now and then a slow suspicious squint; wide open when it screams
  const b=(T%4.3),blink=b<.22?Math.sin(b/.22*Math.PI):0,squint=Math.max(0,Math.sin(T*.37))**4*.45*(1-mo.alert);
  mo.blinking=blink>.6;const o=1-Math.max(blink,squint)+mo.alert*.15;
  mo.lidU.rotation.set(-o*1.45+mo.lx*.4,mo.ly*.3,0);mo.lidD.rotation.set(o*1.25+mo.lx*.3,mo.ly*.3,0);
  for(const ch of mo.stalks)ch.forEach((g,j)=>{g.rotation.x=(j?.05:.2)+Math.sin(T*1.6-j*.7+ch.i)*.16+(sp>0?.08:0);g.rotation.z=(j?0:ch.z0)+Math.sin(T*1.2-j*.6+ch.i*2)*.14});
  // the gaze reddens while it stares and flares when it screams; its light follows the nearest watcher
  const heat=Math.max(mo.alert,Math.min(1,mo.stare/EYE.react));mo.cone.material.opacity=(mo.blinking?0:.045+.09*heat);
  mo.cone.material.color.setRGB(1,.63-.45*heat,.38-.3*heat);mo.halo.material.opacity=.45+.5*heat;
  const L=G.eyeLight;if(L){const o2=L.owner;if(!o2||o2===mo||!G.monsters.includes(o2)||d<Math.hypot(pl.x-o2.x,pl.z-o2.z)-.5){
    const lit=d<14;L.owner=lit?mo:null;if(lit){mo.ball.updateWorldMatrix(true,false);L.position.setFromMatrixPosition(mo.ball.matrixWorld);
      L.position.x+=Math.sin(mo.yaw)*.5;L.position.z+=Math.cos(mo.yaw)*.5;L.color.setRGB(1,.62-.38*heat,.42-.28*heat);L.intensity=(.45+heat*1.1)*(mo.blinking?.3:1)}else L.intensity=0}}}
