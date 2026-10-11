function towerModel(snowy,mat){
  const g=new THREE.Group(),r=R(1.6,2.3),h=R(12,22);
  g.add(tbox(r*2,h,r*2,mat,0,h/2,0));g.add(box(r*2.6,.9,r*2.6,M.rock,0,h+.45,0));
  const rf=new THREE.Mesh(new THREE.ConeGeometry(r*1.9,r*2.4,8),snowy?M.snowRoof:M.slateRoof);rf.position.y=h+.9+r*1.2;g.add(rf);
  for(let i=0;i<3;i++){const wn=new THREE.Mesh(new THREE.PlaneGeometry(.6,1),M.win);wn.position.set(0,h*(.35+i*.2),r+.03);g.add(wn)}
  const bn=new THREE.Mesh(new THREE.PlaneGeometry(1.2,3),M.banner);bn.position.set(r+.03,h*.6,0);bn.rotation.y=Math.PI/2;g.add(bn);return g}
function castleModel(mat,snowy){
  const c=new THREE.Group(),W_=(w,h,d,x,y,z)=>c.add(tbox(w,h,d,mat,x,y,z));
  W_(14,16,12,0,8,0);c.add(box(16,1,14,M.rock,0,16.5,0));
  for(let i=-3;i<=3;i++)for(const zz of [-6.5,6.5])c.add(box(1.4,1.4,1.4,M.rock,i*2.3,17.7,zz));
  for(const sx of [-12,12]){W_(6,22,6,sx,11,0);c.add(box(7,1,7,M.rock,sx,22.5,0));
    for(const [a,b] of [[-3,-3],[3,-3],[-3,3],[3,3]])c.add(box(1.4,1.4,1.4,M.rock,sx+a,23.7,b));
    const rf=new THREE.Mesh(new THREE.ConeGeometry(4.6,6,8),snowy?M.snowRoof:M.slateRoof);rf.position.set(sx,26.2,0);c.add(rf)}
  W_(24,9,3,0,4.5,8);
  c.add(box(4,6,.5,M.coal,-7,3,-6.2));
  for(const z of [-3,3]){const b=new THREE.Mesh(new THREE.PlaneGeometry(1.6,5),M.banner);b.position.set(-7.05,10,z);b.rotation.y=-Math.PI/2;c.add(b)}
  for(const wy of [12,14]) for(const wz of [-4,0,4]){const w=new THREE.Mesh(new THREE.PlaneGeometry(1.2,2),M.win);w.position.set(-7.05,wy,wz);w.rotation.y=-Math.PI/2;c.add(w)}
  if(snowy){c.add(box(14.6,.5,12.6,M.snow,0,17.1,0))}
  return c}
function setSky(cfg){
  const RAD_=380;
  if(!skyMesh){
    skyMesh=new THREE.Mesh(new THREE.SphereGeometry(RAD_,20,12),new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide,fog:false,depthWrite:false}));
    skyMesh.renderOrder=-2;scene.add(skyMesh);
    moonSprite=new THREE.Sprite(new THREE.SpriteMaterial({fog:false,depthWrite:false}));moonSprite.renderOrder=-1;scene.add(moonSprite);
  }
  const geo=skyMesh.geometry,p=geo.attributes.position,col=[],c=new THREE.Color(),top=new THREE.Color(cfg.top),hor=new THREE.Color(cfg.hor);
  for(let i=0;i<p.count;i++){const t=Math.max(0,Math.min(1,p.getY(i)/RAD_*1.6));c.copy(hor).lerp(top,Math.pow(t,.7));col.push(c.r,c.g,c.b)}
  geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  const cv=document.createElement('canvas');cv.width=cv.height=16;const g=cv.getContext('2d');
  g.fillStyle='#'+new THREE.Color(cfg.body).getHexString();g.beginPath();g.arc(8,8,6,0,6.3);g.fill();
  const t=new THREE.CanvasTexture(cv);t.magFilter=t.minFilter=THREE.NearestFilter;
  moonSprite.material.map=t;moonSprite.material.needsUpdate=true;moonSprite.scale.set(cfg.bsize,cfg.bsize,1);moonSprite.userData.bpos=cfg.bpos;
}
function buildMountains(size,th){
  const snowy=!!th.snowy,cx=size/2,dS=size*.5+95,d0=size*.5+160,d1=size*.5+760,seed=(rnd()*1e6)|0;
  const hash=(x,y)=>{let h=(Math.imul(x|0,374761393)+Math.imul(y|0,668265263)+seed)|0;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296};
  const vn=(x,y)=>{const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
    const a=hash(ix,iy),b=hash(ix+1,iy),c=hash(ix,iy+1),d=hash(ix+1,iy+1);return a+(b-a)*sx+(c-a)*sy+(a-b-c+d)*sx*sy};
  const HT=(x,z)=>{
    const d=Math.hypot(x-cx,z-cx),t=Math.max(0,Math.min(1,(d-d0)/(d1-d0)));
    let r=0,amp=1,f=1/300,sum=0;
    for(let o=0;o<6;o++){const n=1-Math.abs(vn(x*f+o*17.3,z*f+o*31.7)*2-1);r+=n*n*amp;sum+=amp;amp*=.52;f*=2.05}
    r/=sum;
    const fore=Math.min(1,Math.max(0,(d-dS)/(d0-dS)));
    return Math.pow(t,1.25)*(40+330*Math.pow(r,1.4))+fore*fore*vn(x/70,z/70)*20;
  };
  const NR=60,NA=260,P=new Float32Array((NR+1)*NA*3),Hs=new Float32Array((NR+1)*NA);
  for(let i=0;i<=NR;i++){const u=i/NR,rad=dS+(d1-dS)*Math.pow(u,1.7);
    for(let j=0;j<NA;j++){const a=j/NA*6.2832,x=cx+Math.cos(a)*rad,z=cx+Math.sin(a)*rad,h=HT(x,z),k=i*NA+j;
      P[k*3]=x;P[k*3+1]=h;P[k*3+2]=z;Hs[k]=h}}
  const pos=[],col=[],uvs=[],c=new THREE.Color();
  const mt=th.mt,ground=mt?new THREE.Color(mt.ground):snowy?new THREE.Color('#c4d0e0'):new THREE.Color('#4a6a30'), fcol=mt?new THREE.Color(mt.fcol):snowy?new THREE.Color('#1f3d34'):new THREE.Color('#34502a'),
        rock=mt?new THREE.Color(mt.rock):snowy?new THREE.Color('#5c5a66'):new THREE.Color('#7a6a58'), snow=new THREE.Color(mt?mt.snow:snowy?'#eef4fa':'#f2ece4');
  const tri=(a,b,d)=>{
    const hn=(Hs[a]+Hs[b]+Hs[d])/3/200,j=R(.88,1.12);
    const ux=P[b*3]-P[a*3],uy=P[b*3+1]-P[a*3+1],uz=P[b*3+2]-P[a*3+2],vx=P[d*3]-P[a*3],vy=P[d*3+1]-P[a*3+1],vz=P[d*3+2]-P[a*3+2];
    const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,ln=Math.hypot(nx,ny,nz)||1,flat=Math.abs(ny)/ln;
    const snowLine=(mt?mt.line:snowy?.42:.7)+R(-.05,.05);
    if(hn<.02)c.copy(ground);
    else if(hn<.2+R(-.03,.03)&&flat>.5)c.copy(fcol).lerp(ground,Math.max(0,.3-hn*2));
    else if(hn>snowLine&&flat>.62)c.copy(snow);
    else c.copy(rock).lerp(fcol,flat<.45?.0:0);
    if(flat<.5)c.multiplyScalar(.82);
    c.multiplyScalar(j);
    for(const v of [a,b,d]){pos.push(P[v*3],P[v*3+1]-.6,P[v*3+2]);col.push(c.r,c.g,c.b);uvs.push(P[v*3]/9+P[v*3+1]/14,P[v*3+2]/9+P[v*3+1]/14)}};
  for(let i=0;i<NR;i++)for(let j=0;j<NA;j++){
    const j2=(j+1)%NA,a=i*NA+j,b=i*NA+j2,d=(i+1)*NA+j,e=(i+1)*NA+j2;
    tri(a,d,b);tri(b,d,e)}
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  g.computeVertexNormals();g.computeBoundingSphere();
  const m=new THREE.Mesh(g,new THREE.MeshLambertMaterial({vertexColors:true,map:T.mtn}));m.userData.keep=true;world.add(m);
}
function buildOutdoor(size,th){
  const snowy=!!th.snowy,cx=size/2,forest=th.id==='forest';
  const inWedge=(x,z)=>(maze.vistas||[]).some(v=>{const dx=x-cx,dz=z-cx,l=Math.hypot(dx,dz)||1;return (dx*v.ox+dz*v.oz)/l>.84});
  const trees=[],rocks=[],dead=[],oaks=[[],[],[]];
  for(let i=0;i<560;i++){
    const a=rnd()*6.28,r=size*.7+rnd()*70;
    const x=cx+Math.cos(a)*r,z=cx+Math.sin(a)*r;
    if(Math.abs(x-cx)<size/2+3&&Math.abs(z-cx)<size/2+3)continue;
    if(inWedge(x,z))continue;
    const q=rnd();
    if(forest&&q<.4)oaks[rnd()*3|0].push([x,z,.9+rnd()*.9]);
    else (q<.78?trees:q<.93?rocks:dead).push([x,z,.8+rnd()*1.2]);
  }
  const layers=[[0,2.3,2.4],[1.3,1.9,2.1],[2.6,1.5,1.8],[3.8,1.0,1.5]];
  const tm=snowy?M.pine:M.pineG;
  if(th.trees==='palm'){
    instanced(new THREE.BoxGeometry(.4,1,.4),M.palmTrunk,trees,(d,[x,z,s],i)=>{d.position.set(x,2.6*s,z);d.scale.set(s,5.2*s,s);d.rotation.z=(i%5-2)*.025});
    for(let k=0;k<7;k++)instanced(new THREE.BoxGeometry(2.8,.08,.55),M.palmLeaf,trees,(d,[x,z,s],i)=>{const a=k/7*6.28+i;d.position.set(x+Math.cos(a)*1.0*s,5.1*s,z+Math.sin(a)*1.0*s);d.rotation.set(0,-a,-.45);d.scale.set(s,s,s)});
    const cacti=[];for(let i=0;i<110;i++){const a=rnd()*6.28,r=size*.7+rnd()*70,x=cx+Math.cos(a)*r,z=cx+Math.sin(a)*r;if(Math.abs(x-cx)<size/2+3&&Math.abs(z-cx)<size/2+3||inWedge(x,z))continue;cacti.push([x,z,R(.8,1.8)])}
    instanced(new THREE.BoxGeometry(.5,1,.5),M.cactus,cacti,(d,[x,z,s])=>{d.position.set(x,1.2*s,z);d.scale.set(s,2.4*s,s)});
    instanced(new THREE.BoxGeometry(.9,.3,.3),M.cactus,cacti,(d,[x,z,s])=>{d.position.set(x+.5*s,1.4*s,z);d.scale.set(s,s,s)});
  }else if(th.trees==='mangrove'){
    instanced(new THREE.BoxGeometry(.5,1,.5),M.trunk,trees,(d,[x,z,s])=>{d.position.set(x,1.6*s,z);d.scale.set(s,3.2*s,s)});
    instanced(new THREE.DodecahedronGeometry(2.3,0),M.mangLeaf,trees,(d,[x,z,s],i)=>{d.position.set(x,3.8*s,z);d.scale.set(s*1.3,s*.7,s*1.3);d.rotation.y=i});
    for(const k of [0,1,2])instanced(new THREE.BoxGeometry(.14,1.6,.14),M.trunk,trees,(d,[x,z,s],i)=>{const a=k*2.1+i;d.position.set(x+Math.cos(a)*.7*s,.6*s,z+Math.sin(a)*.7*s);d.rotation.set(Math.sin(a)*.5,0,-Math.cos(a)*.5);d.scale.set(s,s,s)});
  }else{
  layers.forEach(([y,r,h])=>instanced(new THREE.ConeGeometry(r,h,7),tm,trees,(d,[x,z,s],i)=>{d.position.set(x,(y+h/2+1)*s,z);d.scale.set(s,s,s);d.rotation.y=i}));
  instanced(new THREE.BoxGeometry(.4,1.6,.4),M.trunk,trees,(d,[x,z,s])=>{d.position.set(x,.8*s,z);d.scale.set(s,s,s)});
  }
  const allOaks=[].concat(...oaks);
  instanced(new THREE.BoxGeometry(.5,2.2,.5),M.trunk,allOaks,(d,[x,z,s])=>{d.position.set(x,1.1*s,z);d.scale.set(s,s,s)});
  [M.leafA,M.leafB,M.leafC].forEach((m,k)=>instanced(new THREE.DodecahedronGeometry(1.7,0),m,oaks[k],(d,[x,z,s],i)=>{d.position.set(x,3.2*s,z);d.scale.set(s,s*.9,s);d.rotation.y=i}));
  instanced(new THREE.DodecahedronGeometry(1.4,0),snowy?M.snowRock:M.rock,rocks,(d,[x,z,s],i)=>{d.position.set(x,.5,z);d.scale.set(s*1.4,s,s*1.4);d.rotation.set(i,i*2,0)});
  dead.forEach(([x,z,s])=>{const t=deadTree();t.position.set(x,0,z);t.scale.set(s,s,s);world.add(t)});
  buildMountains(size,th);
  // деревни
  for(let v=0;v<6;v++){const a=rnd()*6.28,d0=size*.5+55+rnd()*80,vx=cx+Math.cos(a)*d0,vz=cx+Math.sin(a)*d0,n=3+(rnd()*5|0);
    if(inWedge(vx,vz))continue;
    for(let i=0;i<n;i++){const h=houseModel(snowy);h.position.set(vx+R(-14,14),0,vz+R(-14,14));h.rotation.y=Math.atan2(cx-h.position.x,cx-h.position.z)+R(-.7,.7);world.add(h)}}
  // сторожевые башни
  const wm=snowy?M.wallW[0]:M.wallF[0];
  for(let i=0;i<9;i++){const a=rnd()*6.28,d0=size*.5+45+rnd()*110,t=towerModel(snowy,wm);t.position.set(cx+Math.cos(a)*d0,0,cx+Math.sin(a)*d0);world.add(t)}
  // угловые башни и ограда лабиринта
  for(const [x,z] of [[-3,-3],[size+3,-3],[-3,size+3],[size+3,size+3]]){
    world.add(box(4,9,4,wm,x,4.5,z));world.add(box(4.6,.8,4.6,M.rock,x,9.3,z));
    for(const [a,b] of [[-1.8,-1.8],[1.8,-1.8],[-1.8,1.8],[1.8,1.8]])world.add(box(1,.8,1,M.rock,x+a,10,z+b));
    const bn=new THREE.Mesh(new THREE.PlaneGeometry(1.3,3),M.banner);bn.position.set(x-2.05,7,z);bn.rotation.y=-Math.PI/2;world.add(bn);
    if(snowy)world.add(box(4.8,.4,4.8,M.snow,x,9.9,z));
  }
  const wm2=snowy?M.wallW[1]:M.wallF[1];
  for(const [px_,pz,sx,sz] of [[cx,-5,size+14,1],[cx,size+5,size+14,1],[-5,cx,1,size+14]]){
    world.add(box(sx,3.2,sz,wm2,px_,1.6,pz));if(snowy)world.add(box(sx,.3,sz+.2,M.snow,px_,3.3,pz))}
  // главный замок за выходом + дальние замки
  const c=castleModel(wm,snowy);c.position.set(size+36,0,size-6);world.add(c);
  for(let i=0;i<3;i++){const a=rnd()*6.28,d0=size*.5+110+rnd()*70,x=cx+Math.cos(a)*d0,z=cx+Math.sin(a)*d0,s=R(1.2,1.8);
    const cc=castleModel(wm,snowy);cc.scale.set(s,s,s);cc.position.set(x,0,z);cc.rotation.y=Math.atan2(cx-z,-(cx-x));world.add(cc)}
}
