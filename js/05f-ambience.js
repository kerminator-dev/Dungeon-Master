'use strict';
// ---------- ambience: light shafts, ground fog, zone details, rubble ----------
// zones: each part of the maze has its own character (smooth noise).
// 0 = noble crypt: banners and braziers; 1 = plain corridors; 2 = overgrown: roots and mushrooms.
function zoneAt(x,z){const v=Noise.n2(x*.055+11,z*.055-7);return v<-.12?0:v<.14?1:2}

const BANNER={dungeon:['#6a1a14','#c8a040'],catacombs:['#1a2a4a','#b8b0a0'],ruins:['#3a4a24','#a89060'],winter:['#20304e','#c8ccd4']};
function mkBannerTex(cloth,trim,torn){const w=64,h=128,c=mkCanvas(w,h),x=c.getContext('2d'),r=mulberry(7);
  x.fillStyle=cloth;x.beginPath();x.moveTo(2,0);x.lineTo(62,0);x.lineTo(62,104);x.lineTo(32,124);x.lineTo(2,104);x.closePath();x.fill();
  for(let i=0;i<500;i++){x.fillStyle=`rgba(0,0,0,${r()*.12})`;x.fillRect(r()*w,r()*h,1+r()*2,1)}          // cloth texture
  x.strokeStyle=trim;x.lineWidth=3;x.beginPath();x.moveTo(6,4);x.lineTo(58,4);x.lineTo(58,101);x.lineTo(32,119);x.lineTo(6,101);x.closePath();x.stroke();
  // norse knot: circle and three interlaced triangles
  x.lineWidth=2.5;x.beginPath();x.arc(32,48,17,0,7);x.stroke();
  for(let k=0;k<3;k++){const a=k*2.094-1.57;x.beginPath();for(let i=0;i<3;i++){const b=a+i*2.094;const px=32+Math.cos(b)*12,py=48+Math.sin(b)*12;i?x.lineTo(px,py):x.moveTo(px,py)}x.closePath();x.stroke()}
  x.beginPath();x.moveTo(20,78);x.lineTo(44,78);x.moveTo(24,86);x.lineTo(40,86);x.stroke();
  if(torn){x.globalCompositeOperation='destination-out';for(let i=0;i<7;i++){x.beginPath();x.arc(r()*w,40+r()*88,3+r()*7,0,7);x.fill()}}
  const t=toTex(c);t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;return t}
function buildAmbience(root){const T=game.theme;W.amb={dust:[]};
  const faces=W.faces.filter(f=>!f.outer),bannerT=tex('banner_'+T,()=>mkBannerTex(...BANNER[T],!TH.indoor));
  const banners=[],roots=[],crystals=[],white=new THREE.Color(1,1,1);
  const clear=(x,z,r)=>!W.arches.some(A=>Math.hypot(A.cx-x,A.cz-z)<A.w+r)&&!W.wins.some(A=>Math.hypot(A.cx-x,A.cz-z)<1.6+r)&&!W.lights.some(l=>Math.hypot(l.x-x,l.z-z)<1)&&Math.hypot(x-W.start.x,z-W.start.z)>1.5;
  for(const fc of faces){const L=fc.sg.len;if(L<WT+1)continue;
    for(let u=0;u<Math.max(1,Math.round(L/CS));u++){const s=rr(BD+.5,L-BD-.5),f=faceAt(fc,s,1.5),z0=zoneAt(f.x,f.z);
      if(fc.spots.some(sp=>Math.abs(sp.s-s)<sp.ru+.5))continue;
      const yaw=Math.atan2(f.nx,f.nz),px=f.x+f.nx*(BD+.03),pz=f.z+f.nz*(BD+.03);if(!clear(px,pz,.5))continue;
      if(z0===0&&rnd()<.5){const top=TH.indoor?Math.min(TH.H-.15,2.75):2.6;pushInst(banners,px,top,pz,0,yaw,0,1,1,1,white.clone().multiplyScalar(rr(.85,1.05)),0)}
      // roots hang from the vault (dungeons, more often in the ritual zone)
      if(TH.indoor&&rnd()<(z0===2?.7:.15))for(let k=ri(2,5);k>0;k--){const d=BD+rr(.05,.6),a=rr(-.6,.6),x=f.x+f.nx*d+f.nz*a,z=f.z+f.nz*d-f.nx*a,
        top=ceilH(x,z)+.05,len=rr(.4,1.3);pushInst(roots,x,top,z,rr(-.15,.15),rr(0,6),rr(-.15,.15),1,len,1,white.clone().multiplyScalar(rr(.7,1)),ri(0,2))}
      // in winter ice crystals grow at the wall base
      if(TH.snow&&rnd()<.35)for(let k=ri(2,5);k>0;k--){const d=BD+rr(0,.25),a=rr(-.5,.5),x=f.x+f.nx*d+f.nz*a,z=f.z+f.nz*d-f.nx*a,sc=rr(.5,1.2);
        pushInst(crystals,x,-.02,z,rr(-.4,.4),rr(0,6),rr(-.4,.4),sc,sc*rr(.8,1.6),sc,white.clone(),0)}}}
  // banner: slightly curved cloth and a crossbar
  const bg=new THREE.PlaneGeometry(.7,1.4,1,8);{const p=bg.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,.03*Math.sin((p.getY(i)+.7)*3)+.02)}bg.translate(0,-.75,0);
  instance(root,banners,[bg],new THREE.MeshLambertMaterial({map:bannerT,alphaTest:.5,side:THREE.DoubleSide}),true,CHUNK*2);
  instance(root,banners,[mergeParts([cy(.02,.02,.82,6,0,0,.06,'#3a2a1a',0,0,Math.PI/2),cy(.035,.035,.04,6,-.42,0,.06,'#a08040',0,0,Math.PI/2),cy(.035,.035,.04,6,.42,0,.06,'#a08040',0,0,Math.PI/2)])],
    new THREE.MeshLambertMaterial({vertexColors:true}),true,CHUNK*2);
  const rootG=[0,1,2].map(k=>{const parts=[];let x=0,z=0;for(let i=0;i<5;i++){const nx=x+rr(-.05,.05),nz=z+rr(-.05,.05),r0=.03*(1-i*.15);
      parts.push(cy(r0*.8,r0,.22,5,(x+nx)/2,-.11-i*.2,(z+nz)/2,i%2?'#4a3220':'#5a3e28'));x=nx;z=nz}return mergeParts(parts)});
  instance(root,roots,rootG,new THREE.MeshLambertMaterial({vertexColors:true}),true,CHUNK*2);
  instance(root,crystals,[mergeParts([[new THREE.ConeGeometry(.06,.35,5),'#bfe4ff',_m4(0,.17,0)],[new THREE.ConeGeometry(.04,.22,5),'#d8f0ff',_m4(.06,.1,.02,0,0,-.4)],[new THREE.ConeGeometry(.035,.18,5),'#a8d8ff',_m4(-.05,.08,-.03,.3,0,.4)]])],
    new THREE.MeshPhongMaterial({vertexColors:true,transparent:true,opacity:.8,shininess:120,specular:0xffffff,emissive:0x16304a}),true,CHUNK*2);
  buildShafts(root);buildGroundFog(root);buildRubble(root)}

// ---------- light shafts from vault breaches ----------
function buildShafts(root){if(!TH.indoor||!W.shafts)return;const col=new THREE.Color(game.theme==='catacombs'?0xd8e8ff:0xffd9a8);
  const spotT=tex('glow',()=>mkGlowTex([[0,'rgba(255,200,120,.55)'],[.4,'rgba(255,150,60,.18)'],[1,'rgba(255,120,40,0)']]));
  for(const sh of W.shafts){const H=sh.top;
    const g=new THREE.CylinderGeometry(sh.r*1.05,sh.r*2.2,H,14,1,true);g.translate(0,H/2,0);
    const m=new THREE.Mesh(g,new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{c:{value:col},h:{value:H},t:{value:0}},
      vertexShader:'varying float vY;varying vec3 vN,vV;void main(){vY=position.y;vec4 mv=modelViewMatrix*vec4(position,1.);vV=normalize(-mv.xyz);vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*mv;}',
      fragmentShader:'uniform vec3 c;uniform float h,t;varying float vY;varying vec3 vN,vV;void main(){float e=pow(abs(dot(vN,vV)),1.6),y=vY/h;float a=e*(.09+.3*y)*(.85+.15*sin(t*.7+vY*2.));gl_FragColor=vec4(c*a,1.);}'}));
    m.position.set(sh.x,0,sh.z);root.add(m);sh.mesh=m;
    const sky=new THREE.Mesh(new THREE.PlaneGeometry(sh.r*2.4,sh.r*2.4),new THREE.MeshBasicMaterial({color:col,fog:false}));sky.rotation.x=Math.PI/2;sky.position.set(sh.x,H-.05,sh.z);root.add(sky);
    const spot=new THREE.Mesh(new THREE.PlaneGeometry(sh.r*5,sh.r*5),new THREE.MeshBasicMaterial({map:spotT,color:col,transparent:true,opacity:1,blending:THREE.AdditiveBlending,depthWrite:false}));
    spot.rotation.x=-Math.PI/2;spot.position.set(sh.x,.012,sh.z);root.add(spot);
    // dust motes in the beam
    const n=24,pos=new Float32Array(n*3);for(let i=0;i<n;i++){const a=rr(0,6.28),r=rr(0,sh.r*1.4);pos[i*3]=Math.cos(a)*r;pos[i*3+1]=rr(0,H);pos[i*3+2]=Math.sin(a)*r}
    const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(pos,3));
    const pts=new THREE.Points(pg,new THREE.PointsMaterial({color:col,size:.04,map:tex('dot',()=>mkGlowTex([[0,'rgba(255,255,255,1)'],[.5,'rgba(255,255,255,.6)'],[1,'rgba(255,255,255,0)']],16,16)),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
    pts.position.set(sh.x,0,sh.z);root.add(pts);W.amb.dust.push({pts,H})}}

// ---------- low ground fog ----------
const FOG_COL={dungeon:[0x8a7060,.32],catacombs:[0x8090a8,.4],ruins:[0xe8c8a0,.16],winter:[0xe8eef8,.28]};
function buildGroundFog(root){const [col,a]=FOG_COL[game.theme],R=BEYOND_RING*CS,ring=TH.indoor&&W.wins.length,   // indoors: the fog covers the fake ring behind the grates too
    b=TH.indoor?{x0:ring?-R:0,z0:ring?-R:0,x1:W.TW+(ring?R:0),z1:W.TW+(ring?R:0)}:W.b;
 W.amb.fog=[];
  for(const [y,k] of [[.2,1.15]]){const m=new THREE.Mesh(new THREE.PlaneGeometry(b.x1-b.x0,b.z1-b.z0),new THREE.ShaderMaterial({transparent:true,depthWrite:false,
      uniforms:{t:{value:0},col:{value:new THREE.Color(col)},a:{value:a*k},cam:{value:new THREE.Vector3()},lit:{value:TH.indoor?1:0}},
      vertexShader:'varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
      fragmentShader:`uniform float t,a,lit;uniform vec3 col,cam;varying vec3 vW;
        float h21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),f.x),f.y);}
        void main(){vec2 p=vW.xz;float n=vn(p*.35+vec2(t*.05,t*.03))*.55+vn(p*.9-vec2(t*.08,0.))*.3+vn(p*2.1+t*.1)*.15;
          float d=length(vW.xz-cam.xz),al=a*smoothstep(.3,.75,n)*smoothstep(24.,5.,d)*smoothstep(.2,1.4,d);
          vec3 c=col*mix(1.,.25+.9*smoothstep(9.,1.,d),lit);gl_FragColor=vec4(c,al);}`}));
    m.rotation.x=-Math.PI/2;m.position.set((b.x0+b.x1)/2,y,(b.z0+b.z1)/2);m.renderOrder=2;root.add(m);W.amb.fog.push(m)}}

// ---------- rubble: brick pile and broken beams ----------
function buildRubble(root){if(!W.rubbles||!W.rubbles.length)return;const P=TH.brick.map(c=>new THREE.Color(c)),list=[],beams=[];
  for(const R of W.rubbles){const H=Math.min(TH.indoor?TH.H*.75:2.2,1.4+R.K*.35),len=R.K*.78,wid=R.K*.55;
    // soft base mound so there are no gaps between bricks
    pushInst(list,R.cx,0,R.cz,0,Math.atan2(R.ax[0],R.ax[1]),0,wid*1.05,H*.6,len*.95,P[1%P.length].clone().multiplyScalar(.7),2);
    for(let i=0;i<R.K*90;i++){const u=rr(-1,1),v=rr(-1,1);if(u*u+v*v>1)continue;
      const x=R.cx+R.ax[0]*u*len+R.ax[1]*v*wid,z=R.cz+R.ax[1]*u*len+R.ax[0]*v*wid,top=H*.62*Math.sqrt(Math.max(0,1-u*u-v*v))+.05;
      pushInst(list,x,top*rr(.6,.95)+.04,z,rr(0,6.3),rr(0,6.3),rr(0,6.3),BL*rr(.5,1),BH*rr(.8,1),BL*.5*rr(.8,1),pick(P).clone().multiplyScalar(rr(.55,.95)),ri(0,1))}
    for(let k=0;k<2;k++)pushInst(beams,R.cx+rr(-.3,.3),H*rr(.3,.6),R.cz+rr(-.3,.3),rr(-.5,.5),rr(0,6.3),rr(-.6,.6),.14,.14,R.K*1.3,new THREE.Color('#4a3020'),0)}
  const mound=new THREE.SphereGeometry(1,10,6,0,Math.PI*2,0,Math.PI/2);
  instance(root,list,[roughBox(1,1,1,.05,.1,7),roughBox(1,1,1,.05,.1,8),mound],new THREE.MeshLambertMaterial({map:tex('brick',()=>mkBrickTex())}),true,CHUNK*2);
  instance(root,beams,[roughBox(1,1,3,.04,.06,12)],new THREE.MeshLambertMaterial({}),true,CHUNK*2)}

function updateAmbience(t){if(!W.amb)return;
  for(const m of W.amb.fog||[]){m.material.uniforms.t.value=t;m.material.uniforms.cam.value.copy(camera.position)}
  for(const s of W.shafts||[])if(s.mesh)s.mesh.material.uniforms.t.value=t;
  for(const d of W.amb.dust){const p=d.pts.geometry.attributes.position,a=p.array;for(let i=1;i<a.length;i+=3){a[i]-=.004;if(a[i]<0)a[i]+=d.H}p.needsUpdate=true}}
