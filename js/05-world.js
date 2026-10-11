'use strict';
// ---------- пол, своды, небо, окружение, декор, свет ----------
function themeMats(){const m={};
  m.brick=new THREE.MeshPhongMaterial({map:tex('brick',()=>mkBrickTex()),shininess:5,specular:0x0c0c0c});
  m.wall=new THREE.MeshPhongMaterial({map:tex('brickface',()=>mkBrickFaceTex()),vertexColors:true,shininess:5,specular:0x0c0c0c});
  m.floor=new THREE.MeshPhongMaterial({map:tex('floor_'+game.theme,()=>mkStoneTex(TH.floor)),vertexColors:true,shininess:TH.indoor?14:3,specular:TH.indoor?0x1a1a1a:0x050505});
  m.slab=new THREE.MeshPhongMaterial({map:tex('slab',()=>mkBrickFaceTex(31)),vertexColors:true,shininess:10,specular:0x111111});
  if(TH.indoor)delete m.floor;
  if(TH.ground)m.ground=new THREE.MeshLambertMaterial({map:tex('ground_'+game.theme,()=>mkGroundTex(TH.ground,61,TH.blades)),vertexColors:true});
  return m}

// поверхность по функции высоты; uv в мировых координатах
function heightPlane(x0,z0,x1,z1,res,hf,cf,uvs,down){
  const nx=Math.max(1,Math.ceil((x1-x0)/res)),nz=Math.max(1,Math.ceil((z1-z0)/res));
  const g=new THREE.PlaneGeometry(x1-x0,z1-z0,nx,nz);g.rotateX(down?Math.PI/2:-Math.PI/2);g.translate((x0+x1)/2,0,(z0+z1)/2);
  const p=g.attributes.position,uv=g.attributes.uv,col=new Float32Array(p.count*3),c=new THREE.Color();
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,hf(x,z));uv.setXY(i,x/uvs,-z/uvs);cf(x,z,c);c.toArray(col,i*3)}
  g.setAttribute('color',new THREE.BufferAttribute(col,3));g.computeVertexNormals();return g}

function buildFloorCeil(root,m){const b=W.b;
  if(!TH.indoor){// улица: неровная земля кусками, чтобы отсекалась вместе со стенами
    for(let x0=b.x0;x0<b.x1;x0+=CHUNK)for(let z0=b.z0;z0<b.z1;z0+=CHUNK){
      const g=heightPlane(x0,z0,Math.min(x0+CHUNK,b.x1),Math.min(z0+CHUNK,b.z1),.5,floorH,(x,z,c)=>{const d=wallDist(x,z);
        const v=(.55+.45*sstep(0,1.1,d))*(.88+.28*Noise.n2(x*.25+5,z*.25));c.setRGB(v,v,v);
        if(TH.snow){const s=.25*(1-sstep(0,.9,d));c.r+=s;c.g+=s;c.b+=s}},2.6);
      g.computeBoundingSphere();const mm=new THREE.Mesh(g,m.floor);root.add(mm);mm.userData.c=g.boundingSphere.center;mm.userData.r=g.boundingSphere.radius;W.cull.push(mm)}
    return}
  // подземелья: каменные плиты 1×0.5 м с перевязкой, на той же сетке, что и кладка
  const P=TH.brick.map(c=>new THREE.Color(c).multiplyScalar(TH.slabK||.62)),bufs=new Map();
  const buf=(x,z)=>{const k=Math.floor(x/CHUNK)+'|'+Math.floor(z/CHUNK);let q=bufs.get(k);if(!q)bufs.set(k,q={p:[],uv:[],c:[]});return q};
  const wallAt=(x,z)=>{const tx=Math.floor(x),tz=Math.floor(z);return tx>=0&&tz>=0&&tx<W.TW&&tz<W.TW&&W.tile[tx*W.TW+tz]>0&&W.tile[tx*W.TW+tz]!==3};
  const quad=(q,x0,x1,z0,z1,u0,u1,c)=>{q.p.push(x0,0,z0,x0,0,z1,x1,0,z1,x0,0,z0,x1,0,z1,x1,0,z0);
    q.uv.push(u0,0,u0,1,u1,1,u0,0,u1,1,u1,0);for(let i=0;i<6;i++)q.c.push(c.r,c.g,c.b)};
  for(let r=Math.floor(b.z0/.5);r*.5<b.z1;r++){const z0=r*.5,z1=z0+.5,off=(r&1)*.5;
    for(let k=Math.floor(b.x0-off)-1;k+off<b.x1;k++){const x0=k+off,x1=x0+1,A=!wallAt(x0+.25,z0+.25),B=!wallAt(x0+.75,z0+.25);if(!A&&!B)continue;
      const h=hash(r,k,5,1),c=P[Math.floor(h*P.length)].clone().multiplyScalar(1+(hash(k,r,2,7)*2-1)*.12);
      if(hash(r,k,9,3)<.07)c.multiplyScalar(.6);                       // грязная/просевшая плита
      if(wallDist(x0+.5,z0+.25)<.45)c.multiplyScalar(.82);              // тень у стены
      const q=buf(x0,z0);if(A&&B)quad(q,x0,x1,z0,z1,0,1,c);else if(A)quad(q,x0,x0+.5,z0,z1,0,.5,c);else quad(q,x0+.5,x1,z0,z1,.5,1,c)}}
  for(const q of bufs.values()){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(q.p,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(q.uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(q.c,3));
    g.setAttribute('normal',new THREE.Float32BufferAttribute(new Float32Array(q.p.length).map((v,i)=>i%3===1?1:0),3));g.computeBoundingSphere();
    const mm=new THREE.Mesh(g,m.slab);root.add(mm);mm.userData.c=g.boundingSphere.center;mm.userData.r=g.boundingSphere.radius;W.cull.push(mm)}}

// ---------- открытое небо и даль ----------
function buildEnv(root,m){
  if(TH.indoor){scene.background=new THREE.Color(TH.bg);scene.fog=new THREE.Fog(TH.bg,TH.fog[0],TH.fog[1]);
    root.add(new THREE.AmbientLight(TH.amb[0],TH.amb[1]*Math.max(.45,1-.08*(game.level-1))));return}
  scene.background=new THREE.Color(TH.bg);scene.fog=new THREE.Fog(TH.bg,TH.fog[0],TH.fog[1]);
  const sk=TH.sky,sd=new THREE.Vector3(...sk.dir).normalize();
  const sky=new THREE.Mesh(new THREE.SphereGeometry(1500,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,
    uniforms:{t:{value:0},mode:{value:TH.snow?1:2},moonD:{value:new THREE.Vector3(-sd.x,.42,-sd.z).normalize()},fogC:{value:new THREE.Color(TH.bg)},fogK:{value:0},top:{value:new THREE.Color(sk.top)},hor:{value:new THREE.Color(sk.hor)},bot:{value:new THREE.Color(sk.bot)},sunC:{value:new THREE.Color(sk.sun)},sunD:{value:sd}},
    vertexShader:'varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform vec3 top,hor,bot,sunC,sunD,fogC,moonD;uniform float fogK,t,mode;varying vec3 vD;
      float h21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),f.x),f.y);}
      float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*vn(p);p=p*2.03+7.1;a*=.5;}return s;}
      void main(){vec3 d=normalize(vD);float h=d.y;vec3 c=mix(hor,top,pow(clamp(h,0.,1.),.55));c=mix(c,bot,clamp(-h*5.,0.,1.));
      float s=max(dot(d,sunD),0.);c+=sunC*(smoothstep(.9985,.9992,s)*1.4+pow(s,10.)*.35+pow(s,90.)*.4);
      float dark=clamp(1.-dot(c,vec3(.3,.6,.1))*1.6,0.,1.);
      // звёзды: мерцают там, где небо тёмное
      vec3 q=floor(d*420.);float hs=fract(sin(dot(q,vec3(12.9898,78.233,37.719)))*43758.5453);
      c+=vec3(step(.9972,hs)*smoothstep(.04,.3,h)*(.55+.45*sin(t*2.7+hs*90.)))*dark*(mode<1.5?1.:.6);
      if(mode<1.5){// северное сияние: занавеси с вертикальными лучами
        vec2 p=d.xz/(d.y+.3);float wave=p.y*.55+sin(p.x*1.1+t*.05)*.55+fbm(vec2(p.x*.7,t*.025))*1.3;
        float band=exp(-pow(wave-1.1,2.)*2.6),rays=.45+.55*sin(p.x*16.+fbm(p*1.7+t*.06)*7.);
        vec3 ac=mix(vec3(.1,1.,.45),vec3(.45,.3,1.),clamp(h*2.6-1.1,0.,1.)*.7);c+=ac*band*rays*smoothstep(.07,.32,h)*.55;}
      else{// облака, подсвеченные закатом, и луна
        vec2 p=d.xz/(d.y+.1);float n=fbm(p*1.3+vec2(t*.008,t*.003));float cl=smoothstep(.48,.78,n)*smoothstep(.0,.12,h);
        vec3 cc=mix(vec3(.32,.28,.4),sunC*1.05,clamp(pow(s,3.)*.9+.25,0.,1.));c=mix(c,cc,cl*.8);
        float m=dot(d,moonD);c+=vec3(.92,.94,1.)*(smoothstep(.9993,.9996,m)*1.1+pow(max(m,0.),300.)*.18)*(1.-cl);}
      gl_FragColor=vec4(mix(c,fogC,fogK*(1.-smoothstep(.0,.45,h))),1.);}`}));
  sky.renderOrder=-1;sky.name='sky';root.add(sky);W.sky=sky;
  const sun=new THREE.DirectionalLight(TH.sun[0],TH.sun[1]);sun.position.copy(sd).multiplyScalar(100);root.add(sun);
  root.add(new THREE.HemisphereLight(TH.hemi[0],TH.hemi[1],TH.hemi[2]));
  // земля и холмы до горизонта
  const cx=(W.b.x0+W.b.x1)/2,cz=(W.b.z0+W.b.z1)/2,half=(W.b.x1-W.b.x0)/2,hc=TH.hills.map(c=>new THREE.Color(c));
  const th=(x,z)=>{const dx=Math.max(0,Math.abs(x-cx)-half),dz=Math.max(0,Math.abs(z-cz)-half),r=Math.hypot(dx,dz);
    const ridge=1-Math.abs(Noise.fbm(x*.004+9,z*.004,4))*2.2;
    return -.2+sstep(4,60,r)*(6*Noise.fbm(x*.02,z*.02,3)+4)+sstep(120,600,r)*Math.max(0,ridge)*190};
  const tg=heightPlane(cx-1400,cz-1400,cx+1400,cz+1400,18,th,(x,z,c)=>{const h=th(x,z),t=clamp(h/170,0,.999)*(hc.length-1),i=Math.floor(t);
    c.copy(hc[i]).lerp(hc[Math.min(i+1,hc.length-1)],t-i);if(h<8)c.setRGB(1,1,1)},6);
  root.add(new THREE.Mesh(tg,m.ground));
  // деревья вокруг лабиринта
  const trunks=[],crowns=[],tc=new THREE.Color('#4a3424');
  for(let i=0;i<520;i++){const a=rr(0,6.28),r=half+rr(6,40)+Math.pow(rnd(),2)*260,x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r;
    if(Math.abs(x-cx)<half+4&&Math.abs(z-cz)<half+4)continue;
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

// ---------- декор ----------
// точка на осевой линии стены (с учётом изгиба) и нормаль в сторону лица fc
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
  // снег на стенах — это цвет верхних граней кладки (см. 04-walls.js)
  if(TH.skulls){// черепа в нишах — один инстанс-пакет на весь уровень
    const bone='#d8ceb4',dk='#0a0806',sk=mergeParts([[new THREE.SphereGeometry(.1,7,5),bone,_m4(0,.1,0,0,0,0,1,.9,1.15)],bx(.11,.05,.08,0,.03,.06,bone),
      bx(.04,.035,.02,-.04,.11,.1,dk),bx(.04,.035,.02,.04,.11,.1,dk)]);
    const bn=mergeParts([cy(.018,.022,.32,5,0,.02,0,bone,Math.PI/2,0,0)]),list=[];
    for(const n of W.niches){if(rnd()>.75||n.r<.3)continue;n.used=1;const a=Math.atan2(n.nx,n.nz);
      pushInst(list,n.x,n.y,n.z,0,a+rr(-.5,.5),rr(-.2,.2),1,1,1,new THREE.Color(1,1,1),0);
      if(rnd()<.5)pushInst(list,n.x+rr(-.15,.15),n.y,n.z+rr(-.1,.1),0,rr(0,6),0,1,1,1,new THREE.Color(1,1,1),1)}
    instance(root,list,[sk,bn],new THREE.MeshLambertMaterial({vertexColors:true}),true,CHUNK*2)}}

// ---------- источники света ----------
function buildLights(root){
  if(TH.torch==='torch'){
    for(const fc of W.faces)for(let u=0;u<Math.max(1,Math.round(fc.sg.len/CS));u++){if(fc.outer&&rnd()<.5)continue;if(rnd()>.17)continue;const L=fc.sg.len,s=rr(.8,L-.8);
      if(fc.spots.some(sp=>Math.abs(sp.s-s)<sp.ru+.35&&sp.y>1))continue;
      const p=fc.sg.at(s),y=1.85,w=wob(p.x,p.z,y,fc.sg.lean),nx=-p.tz*fc.side,nz=p.tx*fc.side,bx=p.x-p.tz*w,bz=p.z+p.tx*w;
      if(W.lights.some(l=>Math.hypot(l.x-bx,l.z-bz)<4.5)||W.tall.some(t=>Math.hypot(t.x-bx,t.z-bz)<1.4))continue;
      W.lights.push({x:bx+nx*(BD+.2),y:floorH(p.x,p.z)+y+.3,z:bz+nz*(BD+.2),bx,bz,nx,nz,base:floorH(p.x,p.z)+y,kind:'torch'})}}
  if(TH.torch==='candle'){for(const n of W.niches){if(rnd()>.35)continue;if(W.lights.some(l=>Math.hypot(l.x-n.x,l.z-n.z)<4))continue;
      n.used=1;W.lights.push({x:n.x,y:n.y+.2,z:n.z,nx:n.nx,nz:n.nz,base:n.y,kind:'candle'})}}
  const flameT=tex('flame',()=>mkGlowTex([[0,'rgba(255,255,230,1)'],[.25,'rgba(255,210,110,.95)'],[.6,'rgba(255,120,30,.45)'],[1,'rgba(255,60,0,0)']],32,64,2));
  const glowT=tex('glow',()=>mkGlowTex([[0,'rgba(255,200,120,.55)'],[.4,'rgba(255,150,60,.18)'],[1,'rgba(255,120,40,0)']]));
  // держатели факелов и свечи — инстансами (2 вызова отрисовки на весь уровень), материалы огня общие
  const torch=mergeParts([bx(.16,.26,.04,0,0,.02,'#2a2420'),cy(.035,.025,.42,6,0,.1,.13,'#4a3020',.45,0,0)]);
  const candle=mergeParts([cy(.03,.035,.16,7,0,.08,0,'#e8dcc0')]),hw=[];
  for(const l of W.lights){
    if(l.kind==='torch')pushInst(hw,l.bx+l.nx*BD,l.base,l.bz+l.nz*BD,0,Math.atan2(l.nx,l.nz),0,1,1,1,new THREE.Color(1,1,1),0);
    else if(l.kind==='candle'){pushInst(hw,l.x,l.base,l.z,0,0,0,1,1,1,new THREE.Color(1,1,1),1);l.y=l.base+.22}
    makeFlame(root,l)}
  instance(root,hw,[torch,candle],new THREE.MeshLambertMaterial({vertexColors:true}),true,CHUNK*2)}
// огонь (спрайт пламени + ореол) для источника света l; размер по виду: факел, свеча, жаровня
function makeFlame(root,l){if(!W.flameMat){
    W.flameMat=new THREE.SpriteMaterial({map:tex('flame',()=>mkGlowTex([[0,'rgba(255,255,230,1)'],[.25,'rgba(255,210,110,.95)'],[.6,'rgba(255,120,30,.45)'],[1,'rgba(255,60,0,0)']],32,64,2)),blending:THREE.AdditiveBlending,depthWrite:false,fog:false});
    W.glowMat=new THREE.SpriteMaterial({map:tex('glow',()=>mkGlowTex([[0,'rgba(255,200,120,.55)'],[.4,'rgba(255,150,60,.18)'],[1,'rgba(255,120,40,0)']])),blending:THREE.AdditiveBlending,depthWrite:false,fog:true,transparent:true})}
  const k=l.kind==='torch'?1:l.kind==='brazier'?1.7:.45,f=new THREE.Sprite(W.flameMat);f.position.set(l.x,l.y,l.z);f.scale.set(.22*k,.4*k,1);root.add(f);l.spr=f;l.k=k;
  const gl=new THREE.Sprite(W.glowMat);gl.position.copy(f.position);gl.scale.set(1.6*k,1.6*k,1);root.add(gl);l.glow=gl;l.ph=rr(0,100)}

// ---------- выход ----------
// порталы в арках: у выхода — живой, у входа — погасший
function buildExit(root){W.portals=[];
  for(const A of W.arches){const live=A.kind==='exit',sh=new THREE.Shape(),hw=A.w/2-.01;
    sh.moveTo(-hw,0);sh.lineTo(-hw,A.hs);sh.absarc(0,A.hs,hw,Math.PI,0,true);sh.lineTo(hw,0);
    const mat=new THREE.ShaderMaterial({side:THREE.DoubleSide,uniforms:{t:{value:0},k:{value:live?1:.32},a:{value:new THREE.Color(live?0x7fd0ff:0x6a5a8a)},b:{value:new THREE.Color(live?0xf4fbff:0x2a2436)},h:{value:A.top}},
      vertexShader:'varying vec2 vP;void main(){vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:`uniform float t,k,h;uniform vec3 a,b;varying vec2 vP;
        void main(){vec2 c=vec2(0.,h*.55),p=vP-c;float r=length(p),an=atan(p.y,p.x);
          float s=sin(an*3.+r*9.-t*1.8)*.5+.5,s2=sin(an*5.-r*14.+t*2.6)*.5+.5;float core=exp(-r*1.6);
          vec3 col=mix(a*.35,b,clamp(s*.55+s2*.25+core*.8,0.,1.));gl_FragColor=vec4(col*k+a*core*.4*k,1.);}`});
    const m=new THREE.Mesh(new THREE.ShapeGeometry(sh,16),mat);m.position.set(A.cx,0,A.cz);m.rotation.y=Math.atan2(-A.d[0],-A.d[1]);root.add(m);W.portals.push(m);
  }}

// ---------- частицы ----------
function buildFx(root){if(!TH.fx){W.fx=null;return}const f=TH.fx,n=f.n,pos=new Float32Array(n*3),R=f.type==='snow'?16:9;
  for(let i=0;i<n;i++){pos[i*3]=rr(-R,R);pos[i*3+1]=rr(0,TH.indoor?TH.H:10);pos[i*3+2]=rr(-R,R)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const dot=tex('dot',()=>mkGlowTex([[0,'rgba(255,255,255,1)'],[.5,'rgba(255,255,255,.6)'],[1,'rgba(255,255,255,0)']],16,16));
  const pts=new THREE.Points(g,new THREE.PointsMaterial({color:f.col,size:f.size,map:dot,transparent:true,depthWrite:false,opacity:f.type==='dust'?.5:.9}));
  pts.frustumCulled=false;root.add(pts);W.fx={pts,R,type:f.type}}
