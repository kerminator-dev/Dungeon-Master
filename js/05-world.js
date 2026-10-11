'use strict';
// ---------- floor, vaults, sky, surroundings, decor, lights ----------
function themeMats(){const m={};
  m.brick=new THREE.MeshLambertMaterial({map:tex('brick',()=>mkBrickTex())});
  m.wall=new THREE.MeshLambertMaterial({map:tex('brickface',()=>mkBrickFaceTex()),vertexColors:true});
  m.floor=new THREE.MeshLambertMaterial({map:tex('floor_'+game.theme,()=>mkStoneTex(TH.floor)),vertexColors:true});
  m.slab=new THREE.MeshLambertMaterial({map:tex('slab',()=>mkBrickFaceTex(31)),vertexColors:true});
  if(TH.indoor)delete m.floor;
  if(TH.ground)m.ground=new THREE.MeshLambertMaterial({map:tex('ground_'+game.theme,()=>mkGroundTex(TH.ground,61,TH.blades)),vertexColors:true});
  return m}

// surface from a height function; uv in world coords
function heightPlane(x0,z0,x1,z1,res,hf,cf,uvs,down){
  const nx=Math.max(1,Math.ceil((x1-x0)/res)),nz=Math.max(1,Math.ceil((z1-z0)/res));
  const g=new THREE.PlaneGeometry(x1-x0,z1-z0,nx,nz);g.rotateX(down?Math.PI/2:-Math.PI/2);g.translate((x0+x1)/2,0,(z0+z1)/2);
  const p=g.attributes.position,uv=g.attributes.uv,col=new Float32Array(p.count*3),c=new THREE.Color();
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,hf(x,z));uv.setXY(i,x/uvs,-z/uvs);cf(x,z,c);c.toArray(col,i*3)}
  g.setAttribute('color',new THREE.BufferAttribute(col,3));g.computeVertexNormals();return g}

function buildFloorCeil(root,m){const b=W.b;
  if(!TH.indoor){// outdoors: uneven ground in chunks so it culls with the walls
    for(let x0=b.x0;x0<b.x1;x0+=CHUNK)for(let z0=b.z0;z0<b.z1;z0+=CHUNK){
      const g=heightPlane(x0,z0,Math.min(x0+CHUNK,b.x1),Math.min(z0+CHUNK,b.z1),.5,floorH,(x,z,c)=>{const d=wallDist(x,z);
        const v=(.55+.45*sstep(0,1.1,d))*(.88+.28*Noise.n2(x*.25+5,z*.25));c.setRGB(v,v,v);
        if(TH.snow){const s=.25*(1-sstep(0,.9,d));c.r+=s;c.g+=s;c.b+=s}},2.6);
      g.computeBoundingSphere();const mm=new THREE.Mesh(g,m.floor);root.add(mm);mm.userData.c=g.boundingSphere.center;mm.userData.r=g.boundingSphere.radius;W.cull.push(mm)}
    return}
  // dungeons: bonded 1×0.5 m flagstones on the same grid as the masonry
  const P=TH.brick.map(c=>new THREE.Color(c).multiplyScalar(TH.slabK||.62)),bufs=new Map();
  const buf=(x,z)=>{const k=Math.floor(x/6)+'|'+Math.floor(z/6);let q=bufs.get(k);if(!q)bufs.set(k,q={p:[],uv:[],c:[]});return q};
  const wallAt=(x,z)=>{const tx=Math.floor(x),tz=Math.floor(z);return tx<0||tz<0||tx>=W.TW||tz>=W.TW||W.tile[tx*W.TW+tz]>0&&W.tile[tx*W.TW+tz]!==3};   // no floor beyond the walls: abyss
  const quad=(q,x0,x1,z0,z1,u0,u1,c)=>{q.p.push(x0,0,z0,x0,0,z1,x1,0,z1,x0,0,z0,x1,0,z1,x1,0,z0);
    q.uv.push(u0,0,u0,1,u1,1,u0,0,u1,1,u1,0);for(let i=0;i<6;i++)q.c.push(c.r,c.g,c.b)};
  for(let r=Math.floor(b.z0/.5);r*.5<b.z1;r++){const z0=r*.5,z1=z0+.5,off=(r&1)*.5;
    for(let k=Math.floor(b.x0-off)-1;k+off<b.x1;k++){const x0=k+off,x1=x0+1,A=!wallAt(x0+.25,z0+.25),B=!wallAt(x0+.75,z0+.25);if(!A&&!B)continue;
      const h=hash(r,k,5,1),c=P[Math.floor(h*P.length)].clone().multiplyScalar(1+(hash(k,r,2,7)*2-1)*.12);
      if(hash(r,k,9,3)<.07)c.multiplyScalar(.6);                       // dirty/sunken slab
      if(wallDist(x0+.5,z0+.25)<.45)c.multiplyScalar(.82);              // shadow near the wall
      const q=buf(x0,z0);if(A&&B)quad(q,x0,x1,z0,z1,0,1,c);else if(A)quad(q,x0,x0+.5,z0,z1,0,.5,c);else quad(q,x0+.5,x1,z0,z1,.5,1,c)}}
  for(const q of bufs.values()){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(q.p,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(q.uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(q.c,3));
    g.setAttribute('normal',new THREE.Float32BufferAttribute(new Float32Array(q.p.length).map((v,i)=>i%3===1?1:0),3));g.computeBoundingSphere();
    const mm=new THREE.Mesh(g,m.slab);root.add(mm);mm.userData.c=g.boundingSphere.center;mm.userData.r=g.boundingSphere.radius;W.cull.push(mm)}}

// ---------- open sky and distance ----------
function buildEnv(root,m){
  if(TH.indoor){scene.background=new THREE.Color(TH.bg);scene.fog=new THREE.Fog(TH.bg,TH.fog[0],TH.fog[1]);
    root.add(new THREE.AmbientLight(TH.amb[0],TH.amb[1]*Math.max(.45,1-.08*(game.level-1))));
    return}
  scene.background=new THREE.Color(TH.bg);scene.fog=new THREE.Fog(TH.bg,TH.fog[0],TH.fog[1]);
  const sk=TH.sky,sd=new THREE.Vector3(...sk.dir).normalize();
  const sky=new THREE.Mesh(new THREE.SphereGeometry(1500,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,
    uniforms:{t:{value:0},cov:{value:TH.cov||0},flash:{value:0},mode:{value:TH.snow&&!TH.cov?1:2},moonD:{value:new THREE.Vector3(-sd.x,.42,-sd.z).normalize()},fogC:{value:new THREE.Color(TH.bg)},fogK:{value:0},top:{value:new THREE.Color(sk.top)},hor:{value:new THREE.Color(sk.hor)},bot:{value:new THREE.Color(sk.bot)},sunC:{value:new THREE.Color(sk.sun)},sunD:{value:sd}},
    vertexShader:'varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform vec3 top,hor,bot,sunC,sunD,fogC,moonD;uniform float fogK,t,mode,cov,flash;varying vec3 vD;
      float h21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),f.x),f.y);}
      float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*vn(p);p=p*2.03+7.1;a*=.5;}return s;}
      void main(){vec3 d=normalize(vD);float h=d.y;vec3 c=mix(hor,top,pow(clamp(h,0.,1.),.55));c=mix(c,bot,clamp(-h*5.,0.,1.));
      float s=max(dot(d,sunD),0.);c+=sunC*(smoothstep(.9985,.9992,s)*1.4+pow(s,10.)*.35+pow(s,90.)*.4)*(1.-cov*.85);
      float dark=clamp(1.-dot(c,vec3(.3,.6,.1))*1.6,0.,1.);
      // stars twinkle where the sky is dark
      vec3 q=floor(d*420.);float hs=fract(sin(dot(q,vec3(12.9898,78.233,37.719)))*43758.5453);
      c+=vec3(step(.9972,hs)*smoothstep(.04,.3,h)*(.55+.45*sin(t*2.7+hs*90.)))*dark*(mode<1.5?1.:.6)*(1.-cov);
      if(mode<1.5){// aurora: curtains with vertical rays
        vec2 p=d.xz/(d.y+.3);float wave=p.y*.55+sin(p.x*1.1+t*.05)*.55+fbm(vec2(p.x*.7,t*.025))*1.3;
        float band=exp(-pow(wave-1.1,2.)*2.6),rays=.45+.55*sin(p.x*16.+fbm(p*1.7+t*.06)*7.);
        vec3 ac=mix(vec3(.1,1.,.45),vec3(.45,.3,1.),clamp(h*2.6-1.1,0.,1.)*.7);c+=ac*band*rays*smoothstep(.07,.32,h)*.55;}
      else{// sunset-lit clouds and the moon
        vec2 p=d.xz/(d.y+.1);float n=fbm(p*1.3+vec2(t*.008,t*.003));float cl=smoothstep(.48-cov*.42,.78-cov*.36,n)*smoothstep(-.05,.12,h);
        vec3 cc=mix(vec3(.32,.28,.4),sunC*1.05,clamp(pow(s,3.)*.9+.25,0.,1.));cc*=1.-cov*.45;c=mix(c,cc,cl*(.8+cov*.15));c+=vec3(.75,.8,1.)*flash*(.25+cl);
        float m=dot(d,moonD);c+=vec3(.92,.94,1.)*(smoothstep(.9993,.9996,m)*1.1+pow(max(m,0.),300.)*.18)*(1.-cl);}
      gl_FragColor=vec4(mix(c,fogC,fogK*(1.-smoothstep(.0,.45,h))),1.);}`}));
  sky.renderOrder=-1;sky.name='sky';root.add(sky);W.sky=sky;
  const sun=new THREE.DirectionalLight(TH.sun[0],TH.sun[1]);sun.position.copy(sd).multiplyScalar(100);root.add(sun);
  root.add(W.hemi=new THREE.HemisphereLight(TH.hemi[0],TH.hemi[1],TH.hemi[2]));
  // ground and hills to the horizon
  const cx=(W.b.x0+W.b.x1)/2,cz=(W.b.z0+W.b.z1)/2,half=(W.b.x1-W.b.x0)/2,hc=TH.hills.map(c=>new THREE.Color(c));
  const th=(x,z)=>{const dx=Math.max(0,Math.abs(x-cx)-half),dz=Math.max(0,Math.abs(z-cz)-half),r=Math.hypot(dx,dz);
    const ridge=1-Math.abs(Noise.fbm(x*.004+9,z*.004,4))*2.2;
    return -.2+sstep(4,60,r)*(6*Noise.fbm(x*.02,z*.02,3)+4)+sstep(120,600,r)*Math.max(0,ridge)*190};
  const tg=heightPlane(cx-1400,cz-1400,cx+1400,cz+1400,18,th,(x,z,c)=>{const h=th(x,z),t=clamp(h/170,0,.999)*(hc.length-1),i=Math.floor(t);
    c.copy(hc[i]).lerp(hc[Math.min(i+1,hc.length-1)],t-i);if(h<8)c.setRGB(1,1,1)},6);
  root.add(new THREE.Mesh(tg,m.ground));
  // towers, castles and villages on hills, trees between
  const foot=W.skyFoot=buildSkyline(root,th,cx,cz,half);
  // trees around the maze
  const trunks=[],crowns=[],tc=new THREE.Color('#4a3424');
  for(let i=0;i<(TH.trees?520:0);i++){const a=rr(0,6.28),r=half+rr(6,40)+Math.pow(rnd(),2)*260,x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r;
    if(Math.abs(x-cx)<half+4&&Math.abs(z-cz)<half+4||foot.some(f=>Math.hypot(f.x-x,f.z-z)<f.r))continue;
    const y=th(x,z),s=rr(.8,1.6);
    if(TH.trees==='pine'){pushInst(trunks,x,y+.6*s,z,0,0,0,.25*s,1.2*s,.25*s,tc.clone(),0);
      for(let k=0;k<3;k++){const c=new THREE.Color(rnd()<.6?'#2e4a3a':'#3a5646');c.lerp(new THREE.Color('#e8eef6'),rr(.25,.6));
        pushInst(crowns,x,y+s*(1.4+k*1.25),z,0,rr(0,6),0,s*(2.1-k*.55),s*2,s*(2.1-k*.55),c,1)}}
    else{pushInst(trunks,x,y+1.1*s,z,rr(-.08,.08),0,rr(-.08,.08),.3*s,2.2*s,.3*s,tc.clone(),0);
      for(let k=0;k<3;k++){const c=new THREE.Color(pick(['#4a6a2a','#5a7a30','#3e5a26','#6a7a34']));
        pushInst(crowns,x+rr(-.7,.7)*s,y+s*rr(2.6,3.6),z+rr(-.7,.7)*s,rr(0,6),rr(0,6),0,s*rr(1.2,1.9),s*rr(1,1.5),s*rr(1.2,1.9),c,2)}}}
  const tm=new THREE.MeshLambertMaterial({flatShading:true});
  const trunkG=new THREE.CylinderGeometry(.35,.5,1,5),pineG=new THREE.ConeGeometry(1,1,7),blobG=new THREE.IcosahedronGeometry(1,0);
  instance(root,trunks,[trunkG],tm,false);instance(root,crowns,[trunkG,pineG,blobG],tm,false)}

// ---------- decor ----------
// point on the wall centreline (with bend) and normal towards face fc
function faceAt(fc,s,y){const p=fc.sg.at(s),nx=-p.tz*fc.side,nz=p.tx*fc.side,w=wob(p.x,p.z,y,fc.sg.lean);
  return {x:p.x-p.tz*w,z:p.z+p.tx*w,nx,nz,p}}
function crossGeo(){const a=new THREE.PlaneGeometry(1,1).toNonIndexed(),b=a.clone();a.translate(0,.5,0);b.rotateY(Math.PI/2);b.translate(0,.5,0);
  const g=new THREE.BufferGeometry(),pa=[...a.attributes.position.array,...b.attributes.position.array],uv=[...a.attributes.uv.array,...b.attributes.uv.array];
  g.setAttribute('position',new THREE.Float32BufferAttribute(pa,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  g.setAttribute('normal',new THREE.Float32BufferAttribute(new Array(pa.length/3).fill(0).flatMap(()=>[0,1,0]),3));return g}

function buildDecor(root,m){
  if(TH.grass){const tufts=[],tc=TH.tuft.map(c=>new THREE.Color(c));
    const tuft=(x,y,z,s)=>pushInst(tufts,x,y,z,0,rr(0,6.28),0,s*rr(.8,1.3),s,s*rr(.8,1.3),pick(tc).clone().multiplyScalar(rr(.75,1.1)),0);
    for(const fc of W.faces){if(fc.outer)continue;const L=fc.sg.len;
      for(let s=.2;s<L-.2;s+=rr(.2,.6))if(rnd()<.55){const f=faceAt(fc,s,0),d=BD+rr(-.02,.3),x=f.x+f.nx*d,z=f.z+f.nz*d;tuft(x,floorH(x,z)-.02,z,rr(.18,.5))}}
    for(const t of W.tops)if(rnd()<.22)tuft(t.x+rr(-.1,.1),t.y-.02,t.z+rr(-.1,.1),rr(.15,.35));
    const b=W.b;for(let i=0;i<W.n*W.n*14;i++){const x=rr(b.x0,b.x1),z=rr(b.z0,b.z1);
      if(Noise.n2(x*.35+2,z*.35-5)<.05||wallDist(x,z)<.2)continue;tuft(x,floorH(x,z)-.02,z,rr(.12,.35))}
    const tm=new THREE.MeshLambertMaterial({map:tex('tuft_'+game.theme,()=>mkTuftTex(['#ffffff','#e0e0e0','#c8c8c8'])),alphaTest:.5,side:THREE.DoubleSide});
    instance(root,tufts,[crossGeo()],tm)}
  if(TH.ivy){const leaves=[],ic=TH.ivy.map(c=>new THREE.Color(c));
    for(const fc of W.faces)for(let u=0;u<Math.max(1,Math.round(fc.sg.len/CS));u++){if(fc.outer||rnd()>.3)continue;const L=fc.sg.len,s0=rr(.5,L-.5),fromTop=rnd()<.5,top=wallTop(fc.sg.at(s0).x,fc.sg.at(s0).z);
      const n=ri(10,26);for(let i=0;i<n;i++){const s=clamp(s0+rr(-.7,.7),.35,L-.35),y=fromTop?top-Math.pow(rnd(),1.3)*rr(.6,2):Math.pow(rnd(),1.4)*rr(.6,2.2);
        const f=faceAt(fc,s,y),d=BD+.05+rr(0,.04),sz=rr(.35,.6);
        pushInst(leaves,f.x+f.nx*d,floorH(f.p.x,f.p.z)+y,f.z+f.nz*d,rr(-.2,.2),Math.atan2(f.nx,f.nz),rr(-.4,.4),sz,sz,sz,pick(ic).clone().multiplyScalar(rr(.8,1.15)),0)}}
    const im=new THREE.MeshLambertMaterial({map:tex('ivy',()=>mkIvyTex(['#ffffff','#e6e6e6','#cfcfcf'])),alphaTest:.5,side:THREE.DoubleSide});
    instance(root,leaves,[new THREE.PlaneGeometry(1,1)],im)}
  // snow on walls is the colour of masonry top faces (see 04-walls.js)
  if(TH.skulls){// skulls in niches: one instanced batch per level
    const bone='#d8ceb4',dk='#0a0806',sk=mergeParts([[new THREE.SphereGeometry(.1,7,5),bone,_m4(0,.1,0,0,0,0,1,.9,1.15)],bx(.11,.05,.08,0,.03,.06,bone),
      bx(.04,.035,.02,-.04,.11,.1,dk),bx(.04,.035,.02,.04,.11,.1,dk)]);
    const bn=mergeParts([cy(.018,.022,.32,5,0,.02,0,bone,Math.PI/2,0,0)]),list=[];
    for(const n of W.niches){if(rnd()>.55||n.r<.3)continue;n.used=1;const a=Math.atan2(n.nx,n.nz);
      pushInst(list,n.x,n.y,n.z,0,a+rr(-.5,.5),rr(-.2,.2),1,1,1,new THREE.Color(1,1,1),0);
      if(rnd()<.5)pushInst(list,n.x+rr(-.15,.15),n.y,n.z+rr(-.1,.1),0,rr(0,6),0,1,1,1,new THREE.Color(1,1,1),1)}
    instance(root,list,[sk,bn],new THREE.MeshLambertMaterial({vertexColors:true}),true,CHUNK*2)}}

// ---------- light sources ----------
function buildLights(root){
  if(TH.torch==='torch'){
    for(const fc of W.faces)for(let u=0;u<Math.max(1,Math.round(fc.sg.len/CS));u++){if(fc.outer&&rnd()<.5)continue;if(rnd()>.17)continue;const L=fc.sg.len,s=rr(.8,L-.8);
      if(fc.spots.some(sp=>Math.abs(sp.s-s)<sp.ru+.35&&sp.y>1))continue;
      const p=fc.sg.at(s),y=1.85,w=wob(p.x,p.z,y,fc.sg.lean),nx=-p.tz*fc.side,nz=p.tx*fc.side,bx=p.x-p.tz*w,bz=p.z+p.tx*w;
      if(Math.hypot(W.start.x-bx,W.start.z-bz)<2.5||W.wins.some(w=>Math.hypot(w.cx-bx,w.cz-bz)<1.8)||W.lights.some(l=>Math.hypot(l.x-bx,l.z-bz)<4.5)||W.tall.some(t=>Math.hypot(t.x-bx,t.z-bz)<1.4))continue;
      W.lights.push({x:bx+nx*(BD+.2),y:floorH(p.x,p.z)+y+.3,z:bz+nz*(BD+.2),bx,bz,nx,nz,base:floorH(p.x,p.z)+y,kind:'torch'})}}
  if(TH.torch==='candle'){for(const n of W.niches){if(rnd()>.35)continue;if(W.lights.some(l=>Math.hypot(l.x-n.x,l.z-n.z)<4))continue;
      n.used=1;W.lights.push({x:n.x,y:n.y+.2,z:n.z,nx:n.nx,nz:n.nz,base:n.y,kind:'candle'})}}
  // torch holders and candles are instanced (2 draw calls per level), fire materials shared
  const torch=mergeParts([bx(.16,.26,.04,0,0,.02,'#2a2420'),cy(.035,.025,.42,6,0,.1,.13,'#4a3020',.45,0,0)]);
  const candle=mergeParts([cy(.03,.035,.16,7,0,.08,0,'#e8dcc0')]),hw=[];
  for(const l of W.lights){
    if(l.kind==='torch')pushInst(hw,l.bx+l.nx*BD,l.base,l.bz+l.nz*BD,0,Math.atan2(l.nx,l.nz),0,1,1,1,new THREE.Color(1,1,1),0);
    else if(l.kind==='candle'){pushInst(hw,l.x,l.base,l.z,0,0,0,1,1,1,new THREE.Color(1,1,1),1);l.y=l.base+.22}
    makeFlame(root,l)}
  instance(root,hw,[torch,candle],new THREE.MeshLambertMaterial({vertexColors:true}),true,CHUNK*2)}
// fire for light l: size by kind (torch, candle, brazier). Flame and halo are drawn
// in shared per-level batches (flameBatch): two draw calls total instead of two per fire.
function makeFlame(root,l){l.k=l.k0||(l.kind==='torch'?1:l.kind==='brazier'?1.7:.45);l.ph=rr(0,100)}
const FLAME_V=`attribute vec3 off;attribute vec2 sz;uniform float fogNear,fogFar;varying vec2 vUv;varying float vF;
  void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(off,1.);mv.xy+=position.xy*sz;vF=smoothstep(fogNear,fogFar,-mv.z);gl_Position=projectionMatrix*mv;}`;
const FLAME_F=`uniform sampler2D map;uniform float fogOn;varying vec2 vUv;varying float vF;
  void main(){vec4 c=texture2D(map,vUv);gl_FragColor=vec4(c.rgb*c.a*(1.-vF*fogOn),1.);}`;
function flameBatch(root){const n=W.lights.length,q=new THREE.PlaneGeometry(1,1),out=[];
  const flameT=tex('flame',()=>mkGlowTex([[0,'rgba(255,255,230,1)'],[.25,'rgba(255,210,110,.95)'],[.6,'rgba(255,120,30,.45)'],[1,'rgba(255,60,0,0)']],32,64,2));
  const glowT=tex('glow',()=>mkGlowTex([[0,'rgba(255,200,120,.55)'],[.4,'rgba(255,150,60,.18)'],[1,'rgba(255,120,40,0)']]));
  for(const [map,fog] of [[glowT,1],[flameT,0]]){const g=new THREE.InstancedBufferGeometry();g.index=q.index;g.setAttribute('position',q.attributes.position);g.setAttribute('uv',q.attributes.uv);
    const off=new Float32Array(n*3);W.lights.forEach((l,i)=>{off[i*3]=l.x;off[i*3+1]=l.y;off[i*3+2]=l.z});
    g.setAttribute('off',new THREE.InstancedBufferAttribute(off,3));const sz=new THREE.InstancedBufferAttribute(new Float32Array(n*2),2);sz.setUsage(THREE.DynamicDrawUsage);g.setAttribute('sz',sz);g.instanceCount=n;
    const m=new THREE.Mesh(g,new THREE.ShaderMaterial({uniforms:{map:{value:map},fogNear:{value:1},fogFar:{value:1e4},fogOn:{value:fog}},vertexShader:FLAME_V,fragmentShader:FLAME_F,
      transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));m.frustumCulled=false;m.renderOrder=3;root.add(m);out.push(m)}
  return W.fb={glow:out[0],flame:out[1],n}}

// ---------- exit ----------
// arch portals: live at the exit, dead at the entrance
// pixel portal texture: stepped rings around the centre, 4 colours, no smoothing
function mkPortalTex(pal){const w=32,h=64,c=mkCanvas(w,h),x=c.getContext('2d');
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){const dx=(i+.5-w/2)/w*2,dy=(j+.5-h*.42)/w*2,r=Math.hypot(dx,dy),an=Math.atan2(dy,dx);
    const v=.5+.5*Math.sin(an*3+r*7)-r*.45+(r<.35?.6:0),k=Math.max(0,Math.min(3,Math.floor(v*3+.3)));x.fillStyle=pal[k];x.fillRect(i,j,1,1)}
  const t=new THREE.CanvasTexture(c);t.magFilter=t.minFilter=THREE.NearestFilter;t.generateMipmaps=false;return t}
// portal fits the stepped masonry opening exactly: brick-wide columns, no rounding
function buildExit(root){W.portals=[];
  for(const A of W.arches){const live=A.kind==='exit',ax=Math.abs(A.d[0])>.5,pos=[],uv=[],idx=[];let topMax=0;const cols=[];
    for(let q=(ax?A.z0:A.x0)*4;q<(ax?A.z1:A.x1)*4;q++){const c=(q+.5)*VX-(ax?A.cz:A.cx);if(Math.abs(c)>=A.w/2)continue;
      const yt=A.hs+Math.sqrt(Math.max(0,A.w*A.w/4-c*c));let ny=0;while(BASE+(ny+.5)*VX<yt)ny++;const top=BASE+ny*VX;cols.push([c,top]);topMax=Math.max(topMax,top)}
    const w0=cols[0][0]-VX/2,w1=cols[cols.length-1][0]+VX/2;
    for(const [c,top] of cols){const c0=c-VX/2-.01,c1=c+VX/2+.01,y1=top+.01,n=pos.length/3;
      const P=(cc,y)=>{pos.push(ax?A.cx:A.cx+cc,y,ax?A.cz+cc:A.cz);uv.push((cc-w0)/(w1-w0),y/topMax)};
      P(c0,0);P(c1,0);P(c1,y1);P(c0,y1);idx.push(n,n+1,n+2,n,n+2,n+3)}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);
    const map=live?tex('portal',()=>mkPortalTex(['#1c3c6c','#2f6aa8','#6fb4e8','#d4f0ff'])):tex('portal_off',()=>mkPortalTex(['#100c18','#1e1828','#2c2438','#3e3450']));
    const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({map,side:THREE.DoubleSide,fog:false}));m.userData.k=live?1:.9;root.add(m);W.portals.push(m)}}

// ---------- weather: storm lightning (sky and light flash, delayed thunder) ----------
function updateWeather(t,dt){if(!TH.lightning||!W.sky)return;
  if((W.nextBolt-=dt)<=0){W.nextBolt=6+Math.random()*14;W.flash=1;W.flash2=.15+Math.random()*.2;sndThunder(.4+Math.random()*2.5)}
  if(W.flash2>0&&(W.flash2-=dt)<=0)W.flash=Math.max(W.flash,.8);              // second flicker
  W.flash=Math.max(0,W.flash-dt*5);const f=W.flash*(.7+.3*Math.sin(t*90));
  W.sky.material.uniforms.flash.value=f;if(W.hemi)W.hemi.intensity=TH.hemi[2]*(1+f*3.5)}

// ---------- particles ----------
function buildFx(root){W.flash=0;W.nextBolt=3+Math.random()*6;if(!TH.fx){W.fx=null;return}const f=TH.fx,n=f.n,pos=new Float32Array(n*3),R=f.type==='dust'?9:f.type==='rain'?12:16;
  for(let i=0;i<n;i++){pos[i*3]=rr(-R,R);pos[i*3+1]=rr(0,TH.indoor?TH.H:10);pos[i*3+2]=rr(-R,R)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const dot=f.type==='rain'?tex('streak',()=>{const c=mkCanvas(8,32),x=c.getContext('2d'),g=x.createLinearGradient(0,0,0,32);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(1,'rgba(255,255,255,.9)');
    x.fillStyle=g;x.fillRect(3,0,2,32);return new THREE.CanvasTexture(c)}):tex('dot',()=>mkGlowTex([[0,'rgba(255,255,255,1)'],[.5,'rgba(255,255,255,.6)'],[1,'rgba(255,255,255,0)']],16,16));
  const pts=new THREE.Points(g,new THREE.PointsMaterial({color:f.col,size:f.size,map:dot,transparent:true,depthWrite:false,opacity:f.op||(f.type==='dust'?.5:.9)}));
  pts.frustumCulled=false;root.add(pts);W.fx={pts,R,type:f.type}}
