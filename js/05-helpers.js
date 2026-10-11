// ---------- Построение мира ----------
let world=null, maze=null, torches=[], flames=[], parts=null, exitPos=new THREE.Vector3(), skyMesh=null, moonSprite=null, curH=3.2, curTh=THEMES.dungeon;
const pool=[]; for(let i=0;i<3;i++){const l=new THREE.PointLight(0xffa860,1,14,1.6);scene.add(l);pool.push(l)}
const amb=new THREE.AmbientLight(0x404050,1); scene.add(amb);
const moon=new THREE.DirectionalLight(0x8fa8d8,0); moon.position.set(-1,2,1); scene.add(moon);
const hand=new THREE.PointLight(0xffc890,0.8,12,1.5); camera.add(hand); hand.position.set(.3,-.2,0);
const dummy=new THREE.Object3D();
function instanced(geo,mat,list,fn){
  if(!list.length)return;
  const m=new THREE.InstancedMesh(geo,mat,list.length);
  list.forEach((it,i)=>{dummy.position.set(0,0,0);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);fn(dummy,it,i);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix)});
  world.add(m);return m;
}
function decal(mat,w,h,cx,cz,dx,dy,y,off=0,flip=false){
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);
  m.position.set(cx+dx*(B/2-.03)+(-dy)*off,y,cz+dy*(B/2-.03)+dx*off);
  m.rotation.y=Math.atan2(-dx,-dy);if(flip)m.scale.x=-1;world.add(m);return m;
}
const box=(w,h,d,m,x,y,z)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);return o};
// бокс с UV в масштабе кладки (кирпич не растягивается)
function tbox(w,h,d,mat,x,y,z){
  const g=new THREE.BoxGeometry(w,h,d),uv=g.attributes.uv,dims=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];
  for(let f=0;f<6;f++)for(let i=0;i<4;i++){const k=f*4+i;uv.setXY(k,uv.getX(k)*dims[f][0]/B,uv.getY(k)*dims[f][1]/curH)}
  const m=new THREE.Mesh(g,mat);m.position.set(x,y,z);return m}
const dirs=[[1,0],[-1,0],[0,1],[0,-1]];

function mergeStatic(){
  world.updateMatrixWorld(true);
  const buckets=new Map(), meshes=[];
  world.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&!o.userData.keep)meshes.push(o)});
  for(const m of meshes){
    const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();
    g.applyMatrix4(m.matrixWorld);
    let b=buckets.get(m.material);if(!b){b=[];buckets.set(m.material,b)}
    b.push(g);m.parent.remove(m);m.geometry.dispose();
  }
  for(const [mat,gs] of buckets){
    let n=0;for(const g of gs)n+=g.attributes.position.count;
    const P=new Float32Array(n*3),Nn=new Float32Array(n*3),U=new Float32Array(n*2);let o=0;
    for(const g of gs){const c=g.attributes.position.count;P.set(g.attributes.position.array,o*3);Nn.set(g.attributes.normal.array,o*3);U.set(g.attributes.uv.array,o*2);o+=c;g.dispose()}
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.BufferAttribute(P,3));geo.setAttribute('normal',new THREE.BufferAttribute(Nn,3));geo.setAttribute('uv',new THREE.BufferAttribute(U,2));
    geo.computeBoundingSphere();world.add(new THREE.Mesh(geo,mat));
  }
}
function wspot(cx,cz,nx,nz,lat=0){return {wx:cx+nx*B/2+(-nz)*lat,wz:cz+nz*B/2+nx*lat,nx,nz,yaw:Math.atan2(-nx,-nz)}}
function flushSpot(g,x,y,cx,cz){
  const open=dirs.filter(([dx,dy])=>g[x+dx]&&g[x+dx][y+dy]===0).length;
  if(open>=3)return null;
  const sd=dirs.filter(([dx,dy])=>g[x+dx]&&g[x+dx][y+dy]!==0);if(!sd.length)return null;
  const [dx,dy]=sd[rnd()*sd.length|0];return wspot(cx,cz,dx,dy,[-.5,0,.5][rnd()*3|0])}
function wallSpot(g,x,y,cx,cz,inset=.5){
  const sd=dirs.filter(([dx,dy])=>g[x+dx]&&g[x+dx][y+dy]!==0);
  if(!sd.length)return null;
  const [dx,dy]=sd[rnd()*sd.length|0];
  let px_=cx+dx*(B/2-inset),pz=cz+dy*(B/2-inset);
  const lat=(rnd()-.5)*1.0;px_+=-dy*lat;pz+=dx*lat;
  const perp=sd.filter(([ex,ey])=>ex*dx+ey*dy===0);
  if(perp.length){const [ex,ey]=perp[0];px_=cx+dx*(B/2-inset)+ex*(B/2-inset);pz=cz+dy*(B/2-inset)+ey*(B/2-inset)}
  return {x:px_,z:pz,yaw:Math.atan2(-dx,-dy)+(rnd()-.5)*.5,dx,dy};
}

// выемки / вмятины / трещины / дыры / окна / ниши разной формы — глубина в толще стены, без чёрных провалов
const darkCache=new Map();
function darkOf(mat){let d=darkCache.get(mat);if(!d){d=new THREE.MeshLambertMaterial({map:mat.map,color:0x7c7c7c,side:THREE.DoubleSide});darkCache.set(mat,d)}return d}
function tplane(w,h,mat,x,y,z,rx,ry){
  const g=new THREE.PlaneGeometry(w,h),uv=g.attributes.uv;
  for(let i=0;i<4;i++)uv.setXY(i,uv.getX(i)*w/B,uv.getY(i)*h/curH);
  const m=new THREE.Mesh(g,mat);m.position.set(x,y,z);m.rotation.set(rx||0,ry||0,0);return m}
function nicheBlock(x,y,f,mat,H,th){
  const grp=new THREE.Group();grp.position.set(wc(x),0,wc(y));grp.rotation.y=Math.atan2(f.dx,f.dy);
  const k=f.kind,dk=darkOf(mat);let w,y0,y1,d,ox=0;
  switch(k){
    case 'window':{const tall=H>3.8;w=R(.8,1.1);y0=tall?1.5:1.0;y1=y0+(tall?R(1.6,2):1.3);d=1.1;ox=R(-.25,.25);break}
    case 'mummy':w=1.15;y0=.15;y1=2.45;d=1.25;ox=R(-.15,.15);break;
    case 'hole':w=R(.7,1.6);y0=rnd()<.5?0:R(0,.8);y1=y0+R(.9,1.9);d=R(.55,1.0);ox=R(-.3,.3);break;
    case 'dent':w=R(.8,1.5);y0=R(.3,1.6);y1=y0+R(.6,1.4);d=R(.15,.35);ox=R(-.3,.3);break;
    default:w=R(.12,.28);y0=rnd()<.5?0:R(.2,.8);y1=R(1.8,H-.2);d=R(.4,.9);ox=R(-.7,.7);
  }
  y1=Math.min(y1,H-.2);
  const lx=ox-w/2,rx=ox+w/2;
  const P=(ww,hh,dd,xx,yy,zz)=>{if(ww>.01&&hh>.01)grp.add(tbox(ww,hh,dd,mat,xx,yy,zz))};
  P(B,H,B-d,0,H/2,-d/2);
  P(lx+1,H,d,(lx-1)/2,H/2,1-d/2);P(1-rx,H,d,(rx+1)/2,H/2,1-d/2);
  P(w,H-y1,d,ox,y1+(H-y1)/2,1-d/2);
  if(y0>.01)P(w,y0,d,ox,y0/2,1-d/2);
  // тёмная (но не чёрная) облицовка выемки
  const hh=y1-y0, my=(y0+y1)/2, e=.012;
  grp.add(tplane(w,hh,dk,ox,my,1-d+e));
  grp.add(tplane(d,hh,dk,lx+e,my,1-d/2,0,Math.PI/2));
  grp.add(tplane(d,hh,dk,rx-e,my,1-d/2,0,-Math.PI/2));
  grp.add(tplane(w,d,dk,ox,y1-e,1-d/2,Math.PI/2,0));
  if(y0>.01)grp.add(tplane(w,d,dk,ox,y0+e,1-d/2,-Math.PI/2,0));
  if(k!=='window'&&k!=='mummy'){ // неровные края и камни внутри
    for(let i=0;i<4;i++){const sx=rnd()<.5?-1:1;const s=tbox(R(.15,.35),R(.15,.3),R(.15,.3),mat,ox+sx*(w/2+R(-.05,.08)),R(y0,y1),1-R(.02,.14));s.rotation.set(R(-.3,.3),R(-.4,.4),R(-.3,.3));grp.add(s)}
    if(k==='hole'||k==='crack')for(let i=0;i<2;i++){const s=tbox(R(.15,.3),R(.12,.25),R(.15,.3),dk,ox+R(-w/3,w/3),y0+R(.05,.3),1-d+R(.1,.22));s.rotation.y=R(0,3);grp.add(s)}
    if(k==='hole'){const rb=rubble();rb.position.set(ox,0,1+.5);grp.add(rb);if(rnd()<.45){const bn=boneBits();bn.position.set(ox,0,1-.4);grp.add(bn)}}
  }
  if(k==='window'){
    const gl=th.id==='castle'?[M.stainA,M.stainB,M.stainC][rnd()*3|0]:(th.outdoor?M.latG:null);
    if(gl){const gp=new THREE.Mesh(new THREE.PlaneGeometry(w,hh),gl);gp.position.set(ox,my,1-d+.03);grp.add(gp)}
    if(!gl){const nb=3;for(let i=0;i<nb;i++)grp.add(box(.04,hh,.04,M.metal,lx+w*(i+1)/(nb+1),my,1-.2));grp.add(box(w+.1,.06,.06,M.metal,ox,y0+hh*.4,1-.2))}
    else grp.add(box(w+.1,.06,.1,M.wood2,ox,y1,1-.2));grp.add(box(w+.16,.08,.3,M.rock,ox,y0-.03,1-.15));
  }
  if(k==='mummy'){const m=mummy();m.position.set(ox,y0,1-d+.5);grp.add(m);grp.add(box(w+.1,.1,.4,M.rock,ox,y0+.02,1-.2))}
  world.add(grp);
}
// кирпичная арка поперёк коридора: из тех же кирпичей, что и стены; светлое кольцо с выпавшими камнями
function archWall(cx,cz,alongX,H,mat,ruin,T_=.6,hw=.9,sp=1.45){
  const g=new THREE.Group();g.position.set(cx,0,cz);g.rotation.y=alongX?Math.PI/2:0;
  const NC=8,cw=2*hw/NC,add=(m,w,h,d,x,y,z)=>g.add(tbox(w,h,d,m,x,y,z));
  add(mat,1-hw,H,T_,-(1+hw)/2,H/2,0);add(mat,1-hw,H,T_,(1+hw)/2,H/2,0);
  for(let k=0;k<NC;k++){const x=-hw+(k+.5)*cw,top=sp+Math.sqrt(Math.max(0,hw*hw-x*x));
    if(top<H-.05&&!(ruin&&rnd()<.22))add(mat,cw,H-top,T_,x,(top+H)/2,0);
    if(rnd()>(ruin?.38:.1))add(M.archStone,cw,.26,T_+.14,x,top+.13,0)}
  for(let q=0;q<4;q++)for(const sg of [-1,1])if(rnd()>(ruin?.35:.08))add(M.archStone,.2,.36,T_+.14,sg*(hw-.08),.18+q*.36,0);
  world.add(g)}
function pilaster(cx,cz,dx,dy,mat,H,off){
  const g=new THREE.Group();g.position.set(cx+dx*(B/2-.2)+(-dy)*off,0,cz+dy*(B/2-.2)+dx*off);g.rotation.y=Math.atan2(-dx,-dy);
  g.add(tbox(.5,H,.4,mat,0,H/2,0));
  g.add(tbox(.72,.3,.52,M.archStone,0,.15,.04));g.add(tbox(.72,.34,.52,M.archStone,0,H-.17,.04));
  for(let y=.75;y<H-.55;y+=.8)g.add(tbox(.56,.28,.46,M.archStone,0,y,0));
  world.add(g)}
function chair(){const g=new THREE.Group();
  g.add(box(.5,.07,.5,M.wood2,0,.5,0));g.add(box(.4,.04,.4,M.carpetM,0,.55,0));
  for(const [x,z] of [[-.22,-.22],[.22,-.22],[-.22,.22],[.22,.22]])g.add(box(.06,.5,.06,M.wood2,x,.25,z));
  g.add(box(.5,.8,.06,M.wood2,0,.95,-.22));for(const x of [-.15,0,.15])g.add(box(.05,.5,.04,M.wood,x,.98,-.2));
  g.add(box(.54,.06,.08,M.trim,0,1.36,-.22));g.userData.half=.3;return g}
function tableSet(){const g=new THREE.Group();
  g.add(box(1.8,.1,1.1,M.wood2,0,.8,0));g.add(box(1.84,.03,1.14,M.trim,0,.86,0));
  for(const [x,z] of [[-.8,-.45],[.8,-.45],[-.8,.45],[.8,.45]])g.add(box(.12,.8,.12,M.wood2,x,.4,z));
  g.add(box(1.4,.08,.08,M.wood2,0,.3,0));
  for(const [x,z,r] of [[-.45,-.95,0],[.45,-.95,0],[-.45,.95,Math.PI],[.45,.95,Math.PI],[-1.25,0,-Math.PI/2],[1.25,0,Math.PI/2]]){
    const c=chair();c.position.set(x,0,z);c.rotation.y=r;g.add(c)}
  g.add(box(.07,.2,.07,M.candle,.3,.98,.1));const f=new THREE.Sprite(M.flame);f.scale.set(.13,.2,1);f.position.set(.3,1.18,.1);g.add(f);flames.push(f);
  g.add(box(.18,.16,.18,M.gold,-.5,.97,-.2));g.add(box(.28,.1,.2,M.book2,.6,.91,-.25));g.add(box(.26,.08,.18,M.book1,.6,.99,-.25));
  g.add(box(.4,.015,.3,M.wrap,-.1,.87,.25));g.add(box(.22,.04,.22,M.metal,-.7,.88,.2));
  g.userData.light=new THREE.Vector3(.3,1.4,.1);g.userData.col=0xffc070;return g}
function desk(){const g=new THREE.Group();
  g.add(box(1.0,.08,.6,M.wood2,0,.78,0));for(const [x,z] of [[-.4,-.22],[.4,-.22],[-.4,.22],[.4,.22]])g.add(box(.08,.78,.08,M.wood2,x,.39,z));
  g.add(box(.26,.12,.18,M.book2,-.3,.88,0));g.add(box(.24,.09,.17,M.book1,-.3,.97,0));g.add(box(.2,.2,.22,M.bone,.1,.92,.05));
  g.add(box(.05,.05,.04,M.coal,.06,.94,.17));g.add(box(.05,.05,.04,M.coal,.14,.94,.17));
  g.add(box(.07,.2,.07,M.candle,.35,.92,-.1));const f=new THREE.Sprite(M.flame);f.scale.set(.12,.18,1);f.position.set(.35,1.12,-.1);g.add(f);flames.push(f);
  const ch=chair();ch.position.set(0,0,.7);ch.rotation.y=Math.PI;g.add(ch);g.userData.light=new THREE.Vector3(.35,1.3,-.1);g.userData.col=0xffc070;g.userData.half=.45;return g}
function prismGeo(w,d,h){ // двускатная крыша: основание w×d, конёк вдоль z
  const hw=w/2,hd=d/2,P=[-hw,0,-hd, hw,0,-hd, 0,h,-hd, -hw,0,hd, hw,0,hd, 0,h,hd],pos=[],uv=[],sl=Math.hypot(hw,h);
  const q=(a,b,c,d_,ua,ub,uc,ud)=>{for(const i of [a,b,c,a,c,d_])pos.push(P[i*3],P[i*3+1],P[i*3+2]);uv.push(...ua,...ub,...uc,...ua,...uc,...ud)};
  q(0,3,5,2,[0,0],[d/2,0],[d/2,sl/2],[0,sl/2]);       // левый скат
  q(1,2,5,4,[0,0],[0,sl/2],[d/2,sl/2],[d/2,0]);       // правый скат
  for(const i of [0,1,2])pos.push(P[i*3],P[i*3+1],P[i*3+2]);uv.push(0,0,w/2,0,w/4,h/2);
  for(const i of [3,5,4])pos.push(P[i*3],P[i*3+1],P[i*3+2]);uv.push(0,0,w/4,h/2,w/2,0);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();return g}
function gableRoof(w,d,h,mat){const m=new THREE.Mesh(prismGeo(w,d,h),new THREE.MeshLambertMaterial({map:mat.map,color:mat.color,side:THREE.DoubleSide}));return m}
