'use strict';
// ---------- floor, vaults, sky, surroundings, decor, lights ----------
function themeMats(){const m={};
  m.brick=new THREE.MeshLambertMaterial({map:tex('brick',()=>mkBrickTex())});
  m.wall=new THREE.MeshLambertMaterial({map:tex('brickface',()=>mkBrickFaceTex()),vertexColors:true});
  if(!TH.indoor)m.floor=new THREE.MeshLambertMaterial({map:tex('floor_'+game.theme,()=>mkStoneTex(TH.floor)),vertexColors:true});   // dungeons are paved with slabs
  m.slab=new THREE.MeshLambertMaterial({map:tex('slab',()=>mkBrickFaceTex(31)),vertexColors:true});
  if(TH.ground)m.ground=new THREE.MeshLambertMaterial({map:tex('ground_'+game.theme,()=>mkGroundTex(TH.ground,61,TH.blades)),vertexColors:true});
  return m}

// surface from a height function; uv in world coords
function heightPlane(x0,z0,x1,z1,res,hf,cf,uvs,down){
  const nx=Math.max(1,Math.ceil((x1-x0)/res)),nz=Math.max(1,Math.ceil((z1-z0)/res));
  const g=new THREE.PlaneGeometry(x1-x0,z1-z0,nx,nz);g.rotateX(down?Math.PI/2:-Math.PI/2);g.translate((x0+x1)/2,0,(z0+z1)/2);
  const p=g.attributes.position,uv=g.attributes.uv,col=new Float32Array(p.count*3),c=new THREE.Color();
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,hf(x,z));uv.setXY(i,x/uvs,-z/uvs);cf(x,z,c);c.toArray(col,i*3)}
  g.setAttribute('color',new THREE.BufferAttribute(col,3));g.computeVertexNormals();g.userData.grid=[x0,z0,(x1-x0)/nx,(z1-z0)/nz,nx,nz];return g}
// the height of an upward heightPlane as drawn: flat triangles between its corners (a cell is split from corner (i,j+1)
// to (i+1,j)), not the function it sampled. on a coarse grid the two part by metres
function planeH(g){const p=g.attributes.position.array,[x0,z0,sw,sh,nx,nz]=g.userData.grid,H=(i,j)=>p[(j*(nx+1)+i)*3+1];
  return (x,z)=>{const fx=clamp((x-x0)/sw,0,nx-1e-6),fz=clamp((z-z0)/sh,0,nz-1e-6),i=Math.floor(fx),j=Math.floor(fz),u=fx-i,v=fz-j;
    return u+v<=1?H(i,j)+u*(H(i+1,j)-H(i,j))+v*(H(i,j+1)-H(i,j)):H(i+1,j+1)+(1-u)*(H(i,j+1)-H(i+1,j+1))+(1-v)*(H(i+1,j)-H(i+1,j+1))}}

function buildFloorCeil(root,m){const b=W.b;
  if(!TH.indoor){// outdoors: uneven ground in chunks so it culls with the walls
    for(let x0=b.x0;x0<b.x1;x0+=CHUNK)for(let z0=b.z0;z0<b.z1;z0+=CHUNK){
      const g=heightPlane(x0,z0,Math.min(x0+CHUNK,b.x1),Math.min(z0+CHUNK,b.z1),.5,floorH,(x,z,c)=>{const d=wallDist(x,z);
        const v=(.55+.45*sstep(0,1.1,d))*(.88+.28*Noise.n2(x*.25+5,z*.25));c.setRGB(v,v,v);
        if(TH.snow){const s=.25*(1-sstep(0,.9,d));c.r+=s;c.g+=s;c.b+=s}},2.6);
      g.computeBoundingSphere();const mm=new THREE.Mesh(g,m.floor);root.add(mm);mm.userData.c=g.boundingSphere.center;mm.userData.r=g.boundingSphere.radius;W.cull.push(mm)}
    return}
  // dungeons: bonded 1×0.5 m flagstones on the same grid as the masonry, in 12 m chunks (compact quads like the walls)
  const P=TH.brick.map(c=>new THREE.Color(c).multiplyScalar(TH.slabK||.62)),bufs=new Map();
  const buf=(x,z)=>{const k=Math.floor(x/12)*4096+Math.floor(z/12);let q=bufs.get(k);if(!q)bufs.set(k,q=quadBuf());return q};
  const wallAt=(x,z)=>{const tx=Math.floor(x),tz=Math.floor(z);return tx<0||tz<0||tx>=W.TW||tz>=W.TW||W.tile[tx*W.TW+tz]>0&&W.tile[tx*W.TW+tz]!==3};   // no floor beyond the walls: abyss
  const quad=(q,x0,x1,z0,z1,u0,u1,c)=>{quadCorner(0,x0,0,z0,c.r,c.g,c.b,u0,0);quadCorner(1,x0,0,z1,c.r,c.g,c.b,u0,1);
    quadCorner(2,x1,0,z1,c.r,c.g,c.b,u1,1);quadCorner(3,x1,0,z0,c.r,c.g,c.b,u1,0);quadEmit(q,0,1,0,false)};
  for(let r=Math.floor(b.z0/.5);r*.5<b.z1;r++){const z0=r*.5,z1=z0+.5,off=(r&1)*.5;
    for(let k=Math.floor(b.x0-off)-1;k+off<b.x1;k++){const x0=k+off,x1=x0+1,A=!wallAt(x0+.25,z0+.25),B=!wallAt(x0+.75,z0+.25);if(!A&&!B)continue;
      const h=hash(r,k,5,1),c=P[Math.floor(h*P.length)].clone().multiplyScalar(1+(hash(k,r,2,7)*2-1)*.12);
      if(hash(r,k,9,3)<.07)c.multiplyScalar(.6);                       // dirty/sunken slab
      if(wallDist(x0+.5,z0+.25)<.45)c.multiplyScalar(.82);              // shadow near the wall
      const q=buf(x0,z0);if(A&&B)quad(q,x0,x1,z0,z1,0,1,c);else if(A)quad(q,x0,x0+.5,z0,z1,0,.5,c);else quad(q,x0+.5,x1,z0,z1,.5,1,c)}}
  for(const q of bufs.values()){const g=quadGeo(q),mm=new THREE.Mesh(g,m.slab);root.add(mm);mm.userData.c=g.boundingSphere.center;mm.userData.r=g.boundingSphere.radius;W.cull.push(mm)}}

// ---------- open sky and distance ----------
function buildEnv(root,m){
  if(TH.indoor){scene.background=new THREE.Color(TH.bg);scene.fog=new THREE.Fog(TH.bg,TH.fog[0],TH.fog[1]);
    root.add(new THREE.AmbientLight(TH.amb[0],TH.amb[1]*Math.max(.45,1-.08*(game.level-1))));
    return}
  scene.background=new THREE.Color(TH.bg);scene.fog=new THREE.Fog(TH.bg,TH.fog[0],TH.fog[1]);
  const sk=TH.sky,sd=new THREE.Vector3(...sk.dir).normalize();
  // the sky is drawn after the solid scene (renderOrder 1), so only the pixels left open are shaded. its sphere lies
  // beyond the farthest hill (the ground reaches 1400 m from the maze, under 2100 m in all) and within the camera's reach.
  // clouds and the northern lights are three layers of noise, not five: cheaper for every open pixel
  const sky=new THREE.Mesh(new THREE.SphereGeometry(2400,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,
    uniforms:{t:{value:0},cov:{value:TH.cov||0},flash:{value:0},mode:{value:TH.snow&&!TH.cov?1:2},night:{value:TH.night?1:0},moonD:{value:new THREE.Vector3(-sd.x,.42,-sd.z).normalize()},fogC:{value:new THREE.Color(TH.bg)},fogK:{value:0},top:{value:new THREE.Color(sk.top)},hor:{value:new THREE.Color(sk.hor)},bot:{value:new THREE.Color(sk.bot)},sunC:{value:new THREE.Color(sk.sun)},sunD:{value:sd}},
    vertexShader:'varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform vec3 top,hor,bot,sunC,sunD,fogC,moonD;uniform float fogK,t,mode,cov,flash,night;varying vec3 vD;
      float h21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),f.x),f.y);}
      float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<3;i++){s+=a*vn(p);p=p*2.03+7.1;a*=.5;}return s;}
      void main(){vec3 d=normalize(vD);float h=d.y;vec3 c=mix(hor,top,pow(clamp(h,0.,1.),.55));c=mix(c,bot,clamp(-h*5.,0.,1.));
      float s=max(dot(d,sunD),0.);c+=sunC*(smoothstep(.9985,.9992,s)*1.4+pow(s,10.)*.35+pow(s,90.)*.4)*(1.-cov*.85);
      float dark=clamp(1.-dot(c,vec3(.3,.6,.1))*1.6,0.,1.);
      // stars twinkle where the sky is dark
      vec3 q=floor(d*420.);float hs=fract(sin(dot(q,vec3(12.9898,78.233,37.719)))*43758.5453);
      c+=vec3(step(.9972,hs)*smoothstep(.04,.3,h)*(.55+.45*sin(t*2.7+hs*90.)))*dark*(mode<1.5?1.:.6)*(1.-cov);
      if(mode<1.5&&h>.07){// aurora: curtains with vertical rays (none low over the horizon)
        vec2 p=d.xz/(d.y+.3);float wave=p.y*.55+sin(p.x*1.1+t*.05)*.55+fbm(vec2(p.x*.7,t*.025))*1.3;
        float band=exp(-pow(wave-1.1,2.)*2.6),rays=.45+.55*sin(p.x*16.+fbm(p*1.7+t*.06)*7.);
        vec3 ac=mix(vec3(.1,1.,.45),vec3(.45,.3,1.),clamp(h*2.6-1.1,0.,1.)*.7);c+=ac*band*rays*smoothstep(.07,.32,h)*.55;}
      else if(mode>1.5){// sunset-lit clouds and the moon (no clouds below the horizon)
        vec2 p=d.xz/(d.y+.1);float n=h>-.05?fbm(p*1.3+vec2(t*.008,t*.003)):0.;float cl=smoothstep(.48-cov*.42,.78-cov*.36,n)*smoothstep(-.05,.12,h);
        vec3 cc=mix(vec3(.32,.28,.4),sunC*1.05,clamp(pow(s,3.)*.9+.25,0.,1.));cc*=1.-cov*.45;
        // at night the clouds are dark shapes against the stars, their edges silvered where the moon is behind them
        float m=dot(d,moonD);cc=mix(cc,vec3(.05,.06,.09)+vec3(.35,.4,.5)*pow(max(m,0.),24.),night);
        c=mix(c,cc,cl*(.8+cov*.15));c+=vec3(.75,.8,1.)*flash*(.25+cl);
        // the moon: a bigger disc with faint maria (worked out only on the disc) and a wide halo on moonlit nights
        float disc=smoothstep(.9993-night*.0009,.9996-night*.0008,m);vec3 mc=vec3(.92,.94,1.);if(disc>0.&&night>0.)mc*=1.-night*.25*smoothstep(.4,.7,fbm(d.xz*900.));
        c+=(mc*disc*(1.1+night*.3)+vec3(.92,.94,1.)*(pow(max(m,0.),300.)*.18+night*(pow(max(m,0.),40.)*.22+pow(max(m,0.),6.)*.05)))*(1.-cl);}
      gl_FragColor=vec4(mix(c,fogC,fogK*(1.-smoothstep(.0,.45,h))),1.);}`}));
  sky.renderOrder=1;sky.name='sky';root.add(sky);W.sky=sky;
  // at night the light comes from the moon, which the sky draws opposite the sun
  const sun=new THREE.DirectionalLight(TH.sun[0],TH.sun[1]);sun.position.copy(TH.night?sky.material.uniforms.moonD.value:sd).multiplyScalar(100);root.add(sun);
  root.add(W.hemi=new THREE.HemisphereLight(TH.hemi[0],TH.hemi[1],TH.hemi[2]));
  // ground and hills to the horizon
  const cx=(W.b.x0+W.b.x1)/2,cz=(W.b.z0+W.b.z1)/2,half=(W.b.x1-W.b.x0)/2,hc=TH.hills.map(c=>new THREE.Color(c));
  const th=(x,z)=>{const dx=Math.max(0,Math.abs(x-cx)-half),dz=Math.max(0,Math.abs(z-cz)-half),r=Math.hypot(dx,dz);
    const ridge=1-Math.abs(Noise.fbm(x*.004+9,z*.004,4))*2.2;
    // dunes: long sharp-crested waves that wander with the noise, low rocky ranges far off
    if(TH.dunes){const q=Noise.fbm(x*.008,z*.008,3),w=Math.sin(x*.03+z*.018+q*7);
      return -.2+sstep(4,50,r)*(3+9*Math.pow(1-Math.abs(w),1.6)*(.55+q))+sstep(160,600,r)*Math.max(0,ridge)*80}
    return -.2+sstep(4,60,r)*(6*Noise.fbm(x*.02,z*.02,3)+4)+sstep(120,600,r)*Math.max(0,ridge)*190};
  // a 36 m grid: from the maze a finer one looks the same and costs a weak PC more
  const tg=heightPlane(cx-1400,cz-1400,cx+1400,cz+1400,36,th,(x,z,c)=>{const h=th(x,z),t=clamp(h/170,0,.999)*(hc.length-1),i=Math.floor(t);
    c.copy(hc[i]).lerp(hc[Math.min(i+1,hc.length-1)],t-i);if(h<8)c.setRGB(1,1,1)},6);
  root.add(new THREE.Mesh(tg,m.ground));
  // towers, castles and villages on hills, trees between: on the hills as drawn, or they would hang in the air
  const gh=planeH(tg),foot=W.skyFoot=buildSkyline(root,gh,cx,cz,half);
  // trees around the maze: pixel-art billboards, one draw call for the whole forest (see buildTrees)
  if(TH.trees)buildTrees(root,gh,cx,cz,half,foot)}

// ---------- trees: billboard sprites ----------
// every tree is a quad that turns round its own trunk to face the camera, cut out of a pixel-art atlas with an alpha
// test (no sorting, depth written as for solid things). four variants per kind, drawn once on canvas in the game's
// sprite style: hard edges, a dark outline, the light coming from the upper left. hundreds of trees cost one draw call
const TREE_KINDS={leaf:{w:.72,h:[4.6,6.8]},pine:{w:.5,h:[4.4,6.6]},palm:{w:.82,h:[5,7.4]},dead:{w:.72,h:[3.6,5.4]}};
function mkTreeAtlas(kind){const CW2=64,CH=128,c=mkCanvas(CW2*4,CH),x=c.getContext('2d'),r=mulberry(kind.length*97+11),R=(a,b)=>a+(b-a)*r();
  const blob=(px,py,rx,ry,col)=>{x.fillStyle=col;x.beginPath();x.ellipse(px,py,rx,ry,0,0,7);x.fill()};
  const line=(pts,w,col)=>{x.strokeStyle=col;x.lineWidth=w;x.lineCap=x.lineJoin='round';x.beginPath();pts.forEach(([a,b],i)=>i?x.lineTo(a,b):x.moveTo(a,b));x.stroke()};
  for(let v=0;v<4;v++){const ox=v*CW2+CW2/2;x.save();x.beginPath();x.rect(v*CW2,0,CW2,CH);x.clip();
    if(kind==='leaf'){// a broad deciduous tree: a forked trunk, a canopy of clumps lit from the upper left
      const G=['#24381a','#34501f','#4a6a28','#628434','#7e9a40'];line([[ox+1,CH],[ox+R(-2,2),CH*.62]],7,'#3a2818');line([[ox+3,CH],[ox+3,CH*.65]],2,'#22180e');
      line([[ox,CH*.7],[ox-12,CH*.48]],3,'#3a2818');line([[ox+1,CH*.68],[ox+13,CH*.45]],3,'#3a2818');
      blob(ox,CH*.37,20,24,G[0]);const cl=[];for(let i=0;i<26;i++){const a=r()*6.28,d=Math.sqrt(r()),px=ox+Math.cos(a)*d*19,py=CH*.36+Math.sin(a)*d*26;cl.push([px,py,R(7,11)])}
      cl.sort((p,q)=>(q[0]-ox)+(q[1]-CH*.36)-((p[0]-ox)+(p[1]-CH*.36)));   // the shadowed clumps first, the lit ones on top
      for(const [px,py,rr0] of cl){const k=clamp(Math.round(2.4-((px-ox)/24+(py-CH*.36)/28)*1.2+R(-.6,.6)),0,4);
        blob(px,py,rr0,rr0*.85,G[Math.max(0,k-1)]);blob(px-rr0*.25,py-rr0*.25,rr0*.62,rr0*.5,G[k])}}
    else if(kind==='pine'){// a snowy pine: ragged tiers, dark on the shadow side, snow on every ledge
      line([[ox,CH],[ox,CH*.78]],5,'#3a2a1c');const T=6;
      for(let i=0;i<T;i++){const y0=CH*.82-i*CH*.13,w=26-i*3.6+R(-1,1),h=CH*.2;
        x.fillStyle='#1e3428';x.beginPath();x.moveTo(ox,y0-h);for(let k=0;k<=8;k++){const u=k/8;x.lineTo(ox-w+u*2*w,y0+(k%2?-3:2))}x.closePath();x.fill();
        x.fillStyle='#2e4a38';x.beginPath();x.moveTo(ox,y0-h);x.lineTo(ox-w,y0);x.lineTo(ox-w*.2,y0-2);x.closePath();x.fill();
        line([[ox-w+2,y0-1],[ox-w*.3,y0-h*.55],[ox,y0-h]],3,'#e8eef6');line([[ox+w*.2,y0-h*.5],[ox+w-3,y0-1]],2,'#c8d4e4')}}
    else if(kind==='palm'){// a slender curved trunk ringed with old leaf bases, a crown of drooping fronds, dates
      const lean=R(-10,10),top=[ox+lean,CH*.28];const P=k=>[ox+lean*k*k+(1-k)*R(-.5,.5),CH-k*(CH-top[1])];
      for(let k=0;k<1;k+=.06){const [a,b]=P(k),[a2,b2]=P(k+.06);line([[a,b],[a2,b2]],5-k*1.5,k*16%2<1?'#7a5a3a':'#5e4428')}
      for(let i=0;i<11;i++){const a=-Math.PI-.25+i/10*(Math.PI+.5)+R(-.12,.12),L=R(24,31),up=Math.sin(a)<-.6,pts=[];
        for(let k=0;k<=7;k++){const u=k/7;pts.push([top[0]+Math.cos(a)*L*u,top[1]+Math.sin(a)*L*u*(up?.75:.4)+u*u*L*(up?.35:.6)])}
        line(pts,3,i%2?'#3e5a24':'#4e7028');for(let k=1;k<7;k++){const [px,py]=pts[k];for(const e of [-1,1])line([[px,py],[px+e*R(1,4),py+R(3,7)]],1.5,k%2?'#5a7a30':'#46682a')}}
      blob(top[0],top[1]+3,4,3,'#8a4a24');blob(top[0]+3,top[1]+4,3,2,'#a85a2a')}
    else{// a dead tree: a crooked black trunk splitting into bare limbs and twigs, a cold rim of moonlight on one side
      const br=(px,py,a,L,w,d)=>{const ex=px+Math.cos(a)*L,ey=py+Math.sin(a)*L;line([[px,py],[(px+ex)/2+R(-3,3),(py+ey)/2],[ex,ey]],w,'#141210');
        line([[px+w*.3,py],[ex+w*.3,ey]],Math.max(1,w*.25),'#4a5468');if(d<4)for(let k=r()<.5?2:3;k>0;k--)br(ex,ey,a+R(-.7,.7),L*R(.55,.75),w*.62,d+1)};
      br(ox+R(-3,3),CH,-Math.PI/2+R(-.15,.15),CH*.32,7,0)}
    x.restore()}
  crisp(x,CW2*4,CH,[14,12,10]);const t=new THREE.CanvasTexture(c);t.magFilter=THREE.NearestFilter;return t}
const TREE_V=`attribute vec3 off;attribute vec3 sz;varying vec2 vUv;varying float vF,vK;uniform float fogNear,fogFar;
  void main(){vUv=vec2((uv.x+sz.z)*.25,uv.y);vK=fract(sin(off.x*12.99+off.z*78.23)*43758.5)*.25+.82;
    vec3 right=normalize(vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]));
    vec3 p=off+right*position.x*sz.x+vec3(0.,(position.y+.5)*sz.y,0.);vec4 mv=viewMatrix*vec4(p,1.);vF=smoothstep(fogNear,fogFar,-mv.z)*.7;gl_Position=projectionMatrix*mv;}`;
const TREE_F=`uniform sampler2D map;uniform vec3 lit,fogC;varying vec2 vUv;varying float vF,vK;
  void main(){vec4 c=texture2D(map,vUv);if(c.a<.5)discard;gl_FragColor=vec4(mix(c.rgb*lit*vK,fogC,vF),1.);}`;
function buildTrees(root,th,cx,cz,half,foot){const K=TREE_KINDS[TH.trees],N=TH.trees==='palm'?240:TH.trees==='dead'?380:560,off=[],sz=[];
  for(let i=0;i<N;i++){const a=rr(0,6.28),r=half+rr(6,40)+Math.pow(rnd(),2)*260,x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r;
    if(Math.abs(x-cx)<half+4&&Math.abs(z-cz)<half+4||foot.some(f=>Math.hypot(f.x-x,f.z-z)<f.r))continue;
    // palms keep to oases: little groves round a few spots instead of an even scatter
    if(TH.trees==='palm'&&Noise.n2(x*.02+3,z*.02-7)<.12)continue;
    const h=rr(...K.h)*(r>half+80?1.25:1);off.push(x,th(x,z)-.3,z);sz.push(h*K.w,h,ri(0,3))}
  const q=new THREE.PlaneGeometry(1,1),g=new THREE.InstancedBufferGeometry();g.index=q.index;g.setAttribute('position',q.attributes.position);g.setAttribute('uv',q.attributes.uv);
  g.setAttribute('off',new THREE.InstancedBufferAttribute(new Float32Array(off),3));g.setAttribute('sz',new THREE.InstancedBufferAttribute(new Float32Array(sz),3));g.instanceCount=off.length/3;
  // the light on a tree: the sky's share and the sun's (the moon's at night), so trees sit in the scene's light
  const lit=new THREE.Color(TH.hemi[0]).multiplyScalar(TH.hemi[2]*.75).add(new THREE.Color(TH.sun[0]).multiplyScalar(TH.sun[1]*.55));lit.r=Math.min(lit.r,1.15);lit.g=Math.min(lit.g,1.15);lit.b=Math.min(lit.b,1.15);
  const m=new THREE.Mesh(g,new THREE.ShaderMaterial({uniforms:{map:{value:tex('trees_'+TH.trees,()=>mkTreeAtlas(TH.trees))},lit:{value:lit},fogC:{value:new THREE.Color(TH.bg)},fogNear:{value:1},fogFar:{value:1e4}},
    vertexShader:TREE_V,fragmentShader:TREE_F}));m.frustumCulled=false;root.add(m);W.trees=m}

// ---------- decor ----------
// point on the wall centreline and normal towards face fc (walls are straight)
function faceAt(fc,s){const p=fc.sg.at(s);return {x:p.x,z:p.z,nx:-p.tz*fc.side,nz:p.tx*fc.side,p}}
function crossGeo(){const a=new THREE.PlaneGeometry(1,1).toNonIndexed(),b=a.clone();a.translate(0,.5,0);b.rotateY(Math.PI/2);b.translate(0,.5,0);
  const g=new THREE.BufferGeometry(),pa=[...a.attributes.position.array,...b.attributes.position.array],uv=[...a.attributes.uv.array,...b.attributes.uv.array];
  g.setAttribute('position',new THREE.Float32BufferAttribute(pa,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  g.setAttribute('normal',new THREE.Float32BufferAttribute(new Array(pa.length/3).fill(0).flatMap(()=>[0,1,0]),3));return g}

function buildDecor(root,m){
  // tuftK thins the grass: the desert has only a few dry tufts, the graveyard less than a summer meadow
  if(TH.grass){const tufts=[],tc=TH.tuft.map(c=>new THREE.Color(c)),K=TH.tuftK===undefined?1:TH.tuftK;
    const tuft=(x,y,z,s)=>pushInst(tufts,x,y,z,0,rr(0,6.28),0,s*rr(.8,1.3),s,s*rr(.8,1.3),pick(tc).clone().multiplyScalar(rr(.75,1.1)),0);
    for(const fc of W.faces){if(fc.outer)continue;const L=fc.sg.len;
      for(let s=.2;s<L-.2;s+=rr(.2,.6))if(rnd()<.55*K){const f=faceAt(fc,s),d=BD+rr(-.02,.3),x=f.x+f.nx*d,z=f.z+f.nz*d;tuft(x,floorH(x,z)-.02,z,rr(.18,.5))}}
    for(const t of W.tops)if(rnd()<.22)tuft(t.x+rr(-.1,.1),t.y-.02,t.z+rr(-.1,.1),rr(.15,.35));
    const b=W.b;for(let i=0;i<W.n*W.n*14*K;i++){const x=rr(b.x0,b.x1),z=rr(b.z0,b.z1);
      if(Noise.n2(x*.35+2,z*.35-5)<.05||wallDist(x,z)<.2)continue;tuft(x,floorH(x,z)-.02,z,rr(.12,.35))}
    const tm=new THREE.MeshLambertMaterial({map:tex('tuft_'+game.theme,()=>mkTuftTex(['#ffffff','#e0e0e0','#c8c8c8'])),alphaTest:.5,side:THREE.DoubleSide});
    // every other tuft is drawn: grass is dear for a weak GPU (cut-out leaves drawn over each other). all are still
    // rolled, so nothing placed after them moves
    instance(root,tufts.filter((t,i)=>i%2===0),[crossGeo()],tm)}
  if(TH.ivy){const leaves=[],ic=TH.ivy.map(c=>new THREE.Color(c));
    for(const fc of W.faces)for(let u=0;u<Math.max(1,Math.round(fc.sg.len/CS));u++){if(fc.outer||rnd()>.3)continue;const L=fc.sg.len,s0=rr(.5,L-.5),fromTop=rnd()<.5,top=wallTop(fc.sg.at(s0).x,fc.sg.at(s0).z);
      const n=ri(10,26);for(let i=0;i<n;i++){const s=clamp(s0+rr(-.7,.7),.35,L-.35),y=fromTop?top-Math.pow(rnd(),1.3)*rr(.6,2):Math.pow(rnd(),1.4)*rr(.6,2.2);
        const f=faceAt(fc,s),d=BD+.05+rr(0,.04),sz=rr(.35,.6);
        pushInst(leaves,f.x+f.nx*d,floorH(f.p.x,f.p.z)+y,f.z+f.nz*d,rr(-.2,.2),Math.atan2(f.nx,f.nz),rr(-.4,.4),sz,sz,sz,pick(ic).clone().multiplyScalar(rr(.8,1.15)),0)}}
    const im=new THREE.MeshLambertMaterial({map:tex('ivy',()=>mkIvyTex(['#ffffff','#e6e6e6','#cfcfcf'])),alphaTest:.5,side:THREE.DoubleSide});
    instance(root,leaves.filter((l,i)=>i%2===0),[new THREE.PlaneGeometry(1,1)],im)}   // every other leaf, as the grass
  // snow on walls is the colour of masonry top faces (see 04-walls.js)
  if(TH.skulls){// skulls in niches: one instanced batch per level
    const bone='#d8ceb4',dk='#0a0806',sk=mergeParts([[new THREE.SphereGeometry(.1,7,5),bone,_m4(0,.1,0,0,0,0,1,.9,1.15)],bx(.11,.05,.08,0,.03,.06,bone),
      bx(.04,.035,.02,-.04,.11,.1,dk),bx(.04,.035,.02,.04,.11,.1,dk)]);
    const bn=mergeParts([cy(.018,.022,.32,5,0,.02,0,bone,Math.PI/2,0,0)]),list=[];
    for(const n of W.niches){if(rnd()>.55||n.r<.3)continue;n.used='skull';const a=Math.atan2(n.nx,n.nz);
      pushInst(list,n.x,n.y,n.z,0,a+rr(-.5,.5),rr(-.2,.2),1,1,1,new THREE.Color(1,1,1),0);
      if(rnd()<.5)pushInst(list,n.x+rr(-.15,.15),n.y,n.z+rr(-.1,.1),0,rr(0,6),0,1,1,1,new THREE.Color(1,1,1),1)}
    instance(root,list,[sk,bn],plainMat(),true,CHUNK*2)}
  buildThemeDecor(root)}

// ---------- light sources ----------
// a wall torch's iron bracket and wooden shaft (the maze and the ring beyond the grates)
const torchHolderGeo=()=>mergeParts([bx(.16,.26,.04,0,0,.02,'#2a2420'),cy(.035,.025,.42,6,0,.1,.13,'#4a3020',.45,0,0)]);
function buildLights(root){
  if(TH.torch==='torch'){
    for(const fc of W.faces)for(let u=0;u<Math.max(1,Math.round(fc.sg.len/CS));u++){if(fc.outer&&rnd()<.5)continue;if(rnd()>.17)continue;const L=fc.sg.len,s=rr(.8,L-.8);
      if(fc.spots.some(sp=>Math.abs(sp.s-s)<sp.ru+.35&&sp.y>1))continue;
      const p=fc.sg.at(s),y=1.85,nx=-p.tz*fc.side,nz=p.tx*fc.side,bx=p.x,bz=p.z;
      if(Math.hypot(W.start.x-bx,W.start.z-bz)<2.5||W.wins.some(w=>Math.hypot(w.cx-bx,w.cz-bz)<1.8)||W.lights.some(l=>Math.hypot(l.x-bx,l.z-bz)<4.5)||W.tall.some(t=>Math.hypot(t.x-bx,t.z-bz)<1.4))continue;
      W.lights.push({x:bx+nx*(BD+.2),y:floorH(p.x,p.z)+y+.3,z:bz+nz*(BD+.2),bx,bz,nx,nz,base:floorH(p.x,p.z)+y,kind:'torch'})}}
  if(TH.torch==='candle'){for(const n of W.niches){if(rnd()>.35||n.used)continue;if(W.lights.some(l=>Math.hypot(l.x-n.x,l.z-n.z)<4))continue;
      n.used='candle';W.lights.push({x:n.x,y:n.y+.2,z:n.z,nx:n.nx,nz:n.nz,base:n.y,kind:'candle'})}}
  // torch holders and candles are instanced (2 draw calls per level), fire materials shared
  const torch=torchHolderGeo(),candle=mergeParts([cy(.03,.035,.16,7,0,.08,0,'#e8dcc0')]),hw=[];
  for(const l of W.lights){
    if(l.kind==='torch')pushInst(hw,l.bx+l.nx*BD,l.base,l.bz+l.nz*BD,0,Math.atan2(l.nx,l.nz),0,1,1,1,new THREE.Color(1,1,1),0);
    else if(l.kind==='candle'){pushInst(hw,l.x,l.base,l.z,0,0,0,1,1,1,new THREE.Color(1,1,1),1);l.y=l.base+.22}
    makeFlame(root,l)}
  instance(root,hw,[torch,candle],plainMat(),true,CHUNK*2)}
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
