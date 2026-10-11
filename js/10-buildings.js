// ===== красивые здания =====
const roofMatOf=th=>th.roof==='tile'?M.tileRoof:(th.snowy?M.snowRoof:M.slateRoof);
const bodyMatOf=th=>th.body==='sand'?M.sandPlaster:th.body==='wood'?M.woodWallM:M.plasterM;
// крыша, дымоход, мансарды, башенка — в локальных координатах группы (центр здания, низ крыши на высоте H0)
function roofKit(grp,w,d,H0,th,o={}){
  const hr=o.height||Math.max(3.4,Math.min(w,d)*.34),roofM=roofMatOf(th),ov=1.5;
  const rg=new THREE.Group();rg.position.set(0,H0,0);rg.rotation.y=o.ridgeX?Math.PI/2:0;grp.add(rg);
  const wl=o.ridgeX?d:w, dl=o.ridgeX?w:d,hw=(wl+ov)/2,L2=dl+ov;
  rg.add(gableRoof(wl+ov,L2,hr,roofM));
  const sl=Math.hypot(hw,hr),ang=Math.atan2(hr,hw);
  for(const sgz of [-1,1])for(const sgx of [-1,1]){const b=box(sl,.16,.2,M.wood2,sgx*hw/2,hr/2+.06,sgz*(L2/2+.02));b.rotation.z=-sgx*ang;rg.add(b)}
  rg.add(box(.22,.22,L2,M.wood2,0,hr+.04,0));
  for(const sgz of [-1,1])rg.add(box(wl+ov,.3,.24,M.wood2,0,.0,sgz*(L2/2-.1)));
  if(o.dormers!==false)for(const sgx of [-1,1])for(const zz of (L2>9?[-.24,.24]:[0])){
    const dx=sgx*hw*.5,dy=hr*.5;const dg=new THREE.Group();dg.position.set(dx,dy,zz*L2);rg.add(dg);
    dg.add(box(1.5,1.6,1.3,bodyMatOf(th),sgx*.1,.35,0));
    const dr=gableRoof(1.9,1.8,1.1,roofM);dr.rotation.y=Math.PI/2;dr.position.set(sgx*.1,1.1,0);dg.add(dr);
    const pl=new THREE.Mesh(new THREE.PlaneGeometry(.8,1.0),M.winG);pl.position.set(sgx*.78,.4,0);pl.rotation.y=sgx>0?Math.PI/2:-Math.PI/2;dg.add(pl);
    dg.add(box(.14,1.1,.9,M.wood2,sgx*.72,.4,0))}
  if(o.chimney!==false){const cx=hw*.38,cz=L2*.2;
    rg.add(box(1.2,hr+3.4,1.2,M.stoneBase,cx,(hr+2.4-1.2)/2+.0,cz));rg.add(box(1.6,.28,1.6,M.archStone,cx,hr+2.4,cz));
    for(const k of [-.3,.3])rg.add(box(.32,.55,.32,M.tileRoof,cx+k,hr+2.82,cz))}
  if(o.turret){const sx=o.turret[0],sz=o.turret[1],r=1.45,th_=H0+3.2;
    const tx=sx*(w/2+.1),tz=sz*(d/2+.1);
    const cg=new THREE.CylinderGeometry(r,r*1.06,th_,8),uv=cg.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*3,uv.getY(i)*th_/3.2);
    const cyl=new THREE.Mesh(cg,M.stoneBase);cyl.position.set(tx,th_/2-H0,tz);grp.add(cyl);cyl.position.y=th_/2;cyl.position.add(new THREE.Vector3(0,0,0));
    cyl.parent.remove(cyl);cyl.position.set(tx,th_/2,tz);grp.add(cyl);
    for(const wy of [2.4,HF+1.9]){const pl=new THREE.Mesh(new THREE.PlaneGeometry(.7,1.4),M.winG);pl.position.set(tx+sx*(r*.72),wy,tz+sz*(r*.72));pl.rotation.y=Math.atan2(sx,sz);grp.add(pl);
      const pl2=pl.clone();pl2.position.set(tx+sx*(r*.72)*1.0,wy,tz+sz*(r*.72));grp.remove(pl2)}
    const ring=new THREE.Mesh(new THREE.CylinderGeometry(r*1.2,r*1.2,.35,8),M.archStone);ring.position.set(tx,H0+.9,tz);grp.add(ring);
    const cap=new THREE.Mesh(new THREE.ConeGeometry(r*1.5,4.6,8),M.tileRoof);cap.position.set(tx,th_+2.2,tz);grp.add(cap);
    grp.add(box(.12,1.2,.12,M.wood2,tx,th_+4.9,tz))}
}
// балкон с перилами и кронштейнами на высоте второго этажа; n — наружная нормаль, (px,pz) — центр грани, face — расстояние до грани
function balcony(grp,px,pz,nx,nz,y,len=3.6,dep=1.4){
  const alongX=nz!==0,cx=px+nx*(dep/2),cz=pz+nz*(dep/2);
  grp.add(box(alongX?len:dep,.3,alongX?dep:len,M.archStone,cx,y,cz));
  for(const sg of [-.5,.5])grp.add(box(alongX?.3:.9,.45,alongX?.9:.3,M.archStone,cx+(alongX?sg*len*.8:nx*.3),y-.35,cz+(alongX?nz*.3:sg*len*.8)));
  const L=len,px2=(a,b)=>[cx+(alongX?a:b),cz+(alongX?b:a)];
  for(let i=0;i<=6;i++){const a=-L/2+i*L/6,[qx,qz]=px2(a,nx*0+0);const o=px2(a,(alongX?nz:nx)*(dep/2-.06));grp.add(box(.1,.8,.1,M.wood2,o[0],y+.55,o[1]))}
  const o1=px2(0,(alongX?nz:nx)*(dep/2-.06));grp.add(box(alongX?L:.12,.1,alongX?.12:L,M.wood2,o1[0],y+.98,o1[1]));
  for(const sg of [-1,1]){const o=px2(sg*(L/2-.06),0);grp.add(box(alongX?.12:dep,.1,alongX?dep:.12,M.wood2,o[0],y+.98,o[1]))}
}
// компактный фасад для домов на заднем плане и мелких построек
function houseModel(snowy,big){
  const th=curTh,g=new THREE.Group(),w=R(4.4,6),d=R(4.4,6),h=R(3.2,4.2);
  const body=bodyMatOf(th);
  g.add(tbox(w+.3,1.0,d+.3,M.stoneBase,0,.5,0));g.add(box(w+.34,.14,d+.34,M.archStone,0,1.04,0));
  g.add(box(w,h-1,d,body,0,1+(h-1)/2,0));
  g.add(box(w+.1,.3,d+.1,M.wood2,0,h*.62,0));
  for(const sx of [-1,1])for(const sz of [-1,1])g.add(box(.26,h-1,.26,M.wood2,sx*(w/2),1+(h-1)/2,sz*(d/2)));
  // окна и дверь на лицевой стороне (+z)
  for(const sx of [-.3,.3]){const pl=new THREE.Mesh(new THREE.PlaneGeometry(.8,1.3),M.winG);pl.position.set(sx*w,h*.42,d/2+.04);g.add(pl);
    g.add(box(1.0,.12,.3,M.archStone,sx*w,h*.42-.7,d/2+.12));for(const k of [-1,1])g.add(box(.26,1.2,.1,M.wood2,sx*w+k*.55,h*.42,d/2+.08))}
  const pl2=new THREE.Mesh(new THREE.PlaneGeometry(.8,1.3),M.winG);pl2.position.set(0,h*.82,d/2+.04);g.add(pl2);
  g.add(box(1.0,2.0,.12,M.wood,0,1.0+.0,d/2+.06));g.add(box(1.3,.14,.5,M.archStone,0,2.15,d/2+.2));
  g.add(box(1.4,.12,.6,M.archStone,0,.06,d/2+.4));
  roofKit(g,w,d,h,th,{ridgeX:w>d,turret:big||rnd()<.18?[rnd()<.5?-1:1,-1]:null,dormers:rnd()<.7});
  if(rnd()<.6){const b=barrel();b.position.set(w/2+.6,0,d/2-.2);g.add(b)}
  if(rnd()<.5){const c=crate(snowy);c.position.set(-w/2-.6,0,d/2-.3);g.add(c)}
  if(rnd()<.45){balcony(g,0,d/2,0,1,h*.55,3,1.2)}
  return g}
// ===== Оболочка здания: стены из «кожи», каменный цоколь, окна с обрамлением, крыша из плиток =====
const STONE_PAL=[[1,.82,.58],[.78,.74,.7],[.95,.62,.42],[.82,.8,.6],[.7,.66,.62],[.9,.7,.5]];
const CREAM_PAL=[[1,.94,.72],[.95,.88,.68],[1,.9,.78],[.9,.84,.66]];
function stoneTint(pal){return (c,r,rn)=>pal[rn()*pal.length|0]}
// окно с каменным обрамлением: плоскость + подоконник + кронштейны + арочное кольцо из камней
function windowDeco(px,pz,nx,nz,wy,hh,th,o={}){
  const wm=o.glass||(th.outdoor?M.winG:M.winW);
  decal(wm,1.0,hh,px+nx*B,pz+nz*B,-nx,-nz,wy,0);
  if(o.inside!==false)decal(M.winW,1.0,hh,px-nx*B,pz-nz*B,nx,nz,wy,0);
  const ax=nz!==0,fx=px+nx*(B/2),fz=pz+nz*(B/2);
  const E=(ww,h2,dd,m,y,lat=0)=>world.add(box(ax?ww:dd,h2,ax?dd:ww,m,fx+nx*dd/2+(ax?lat:0),y,fz+nz*dd/2+(ax?0:lat)));
  E(1.35,.16,.42,M.archStone,wy-hh/2-.06);
  for(const sg of [-1,1])E(.22,.34,.3,M.archStone,wy-hh/2-.28,sg*.5);
  // арка из камней над окном
  const R0=.62,cy=wy+hh/2-.58;
  for(let k=0;k<7;k++){const a=Math.PI*(k/6),lx=Math.cos(a)*R0,ly=Math.sin(a)*R0;if(rnd()<.08)continue;E(.2,.22,.2,M.archStone,cy+ly,lx)}
  if(o.shutters)for(const sg of [-1,1])E(.3,hh*.86,.1,M.wood2,wy,sg*.78);
  if(o.flowers){E(1.0,.2,.36,M.wood,wy-hh/2-.24);for(let f=-2;f<=2;f++)E(.15,.2+rnd()*.12,.16,[M.flowerR,M.flowerY,M.flowerP,M.leafG2][(f+2)&3],wy-hh/2-.06,f*.2)}
}
// массивная каменная труба снаружи торцевой стены (локальные координаты группы крыши)
function chimneyStack(rg,x,z,yBot,yTop,w,d){
  const hgt=yTop-yBot,rows=Math.max(3,Math.round(hgt/.55)),pal=stoneTint(STONE_PAL);
  const opt={depth:.14,up:.06,miss:.02,holeP:.1,crackP:.2,moss:.18,tintFn:pal,tileUV:true};
  const faces=[[[x-w/2,yBot,z+d/2],[1,0,0],[0,0,1],w],[[x+w/2,yBot,z+d/2],[0,0,-1],[1,0,0],d],[[x-w/2,yBot,z-d/2],[0,0,1],[-1,0,0],d],[[x+w/2,yBot,z-d/2],[-1,0,0],[0,0,-1],w]];
  for(const [O,U,N,wd] of faces)skinFace(M.rockwall,O,U,[0,1,0],N,Math.max(2,Math.round(wd/.55)),rows,wd,hgt,opt);
  rg.add(box(w+.1,.3,d+.1,M.archStone,x,yTop,z));rg.add(box(w*.8,.22,d*.8,M.tileRoof,x,yTop+.26,z));
  for(const k of [-.28,.28])rg.add(box(.34,.6,.34,M.tileRoof,x+k*w*.6,yTop+.6,z));
  rg.add(box(w+.6,.5,d+.4,M.rockwall,x,yBot+.25,z));
}
// крыша: плитки разной глубины поверх тёмной подкладки; фронтоны с деревянным декором
function buildRoof(cx,cz,y0,ext,th,o){
  const rg=new THREE.Group();rg.position.set(cx,y0,cz);rg.rotation.y=o.ridgeX?Math.PI/2:0;world.add(rg);rg.updateMatrix();
  const roofM=roofMatOf(th),e=ext/2,ovG=1.5,ovE=1.15,hw=e+ovE,L=ext+ovG*2,hr=o.height,sl=Math.hypot(hw,hr);
  skinXf=rg.matrix.clone();
  const base=THREE.Math?0:0;
  for(const s of [-1,1]){
    const V=[-s*hw/sl,hr/sl,0],N=[s*hr/sl,hw/sl,0];
    skinFace(roofM,[s*hw,0,-L/2],[0,0,1],V,N,Math.round(L/.62),Math.round(sl/.5),L,sl,
      {depth:.12,up:.07,miss:.012,edgeB:.1,edgeL:.12,edgeR:.12,holeP:.12,crackP:0,moss:th.snowy?0:.12,tileUV:true,tintFn:o.tileTint||((c,r,rn)=>{const k=.85+rn()*.3;return [k,k,k]})});
  }
  skinXf=null;
  const under=new THREE.Mesh(prismGeo(hw*2-.2,L-.2,hr-.1),darkOf(roofM));under.position.y=-.16;under.userData.keep=false;rg.add(under);
  const sl2=Math.hypot(hw,hr),ang=Math.atan2(hr,hw);
  for(const sgz of [-1,1])for(const sgx of [-1,1]){const b=box(sl2+.2,.2,.24,M.wood2,sgx*hw/2,hr/2+.08,sgz*(L/2+.02));b.rotation.z=-sgx*ang;rg.add(b);
    const knob=box(.3,.3,.3,M.wood2,sgx*(hw+.05),-.05,sgz*(L/2+.02));rg.add(knob)}
  rg.add(box(.26,.26,L,M.wood2,0,hr+.06,0));
  for(const sgz of [-1,1])rg.add(box(ext+ovE*2,.3,.26,M.wood2,0,-.02,sgz*(L/2-.1)));
  // фронтоны: штукатурка + деревянный каркас + окошко
  const ht=hr*(1-e/hw);
  for(const sgz of [-1,1]){
    const z=sgz*(e+.01),P=[[-e,0],[e,0],[e,ht],[0,hr-.05],[-e,ht]],pos=[],uv=[];
    for(const [a,b,c] of [[0,1,2],[0,2,3],[0,3,4]])for(const i of [a,b,c]){pos.push(P[i][0],P[i][1],z);uv.push(P[i][0]/B+.5,P[i][1]/B)}
    const gg=new THREE.BufferGeometry();gg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));gg.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));gg.computeVertexNormals();
    const gm=new THREE.Mesh(gg,new THREE.MeshLambertMaterial({map:M.plasterM.map,side:THREE.DoubleSide}));rg.add(gm);
    const zt=sgz*(e+.12);
    const rafL=Math.hypot(e,hr-.7),rafA=Math.atan2(hr-.7,e);
    for(const sx of [-1,1]){const rb=box(rafL,.26,.2,M.wood2,sx*e/2,(hr-.7)/2+.25,zt);rb.rotation.z=-sx*rafA;rg.add(rb)}
    rg.add(box(ext-.2,.28,.2,M.wood2,0,.42,zt));rg.add(box(.26,hr-.8,.2,M.wood2,0,(hr-.8)/2+.3,zt));
    for(const sx of [-1,1]){const br=box(Math.hypot(e*.45,hr*.4),.2,.18,M.wood2,sx*e*.3,hr*.28+.3,zt);br.rotation.z=sx*Math.atan2(hr*.4,e*.45)*-1;rg.add(br)}
    const pl=new THREE.Mesh(new THREE.PlaneGeometry(.9,1.3),M.winG);pl.position.set(0,hr*.38,sgz*(e+.05));pl.rotation.y=sgz>0?0:Math.PI;rg.add(pl);
    rg.add(box(1.1,.14,.3,M.archStone,0,hr*.38-.72,sgz*(e+.15)));
  }
  if(o.chimney){const [cxo,czo]=o.chimney;chimneyStack(rg,cxo,czo,-(o.wallH),hr+2.0,1.9,1.5)}
  // слуховые окна
  if(o.dormers)for(const sx of [-1,1])for(const zz of [-.22,.22]){
    const dx=sx*hw*.5,dy=hr*.5,dg=new THREE.Group();dg.position.set(dx,dy,zz*L);rg.add(dg);
    dg.add(box(1.5,1.6,1.3,M.plasterM,sx*.1,.35,0));
    const dr=gableRoof(1.9,1.8,1.1,roofM);dr.rotation.y=Math.PI/2;dr.position.set(sx*.1,1.1,0);dg.add(dr);
    const pl=new THREE.Mesh(new THREE.PlaneGeometry(.8,1.0),M.winG);pl.position.set(sx*.78,.4,0);pl.rotation.y=sx>0?Math.PI/2:-Math.PI/2;dg.add(pl)}
  return rg;
}
function ringBalcony(cx,cz,y,ext,out,th){
  const half=ext/2+out;
  for(const s of [-1,1]){world.add(box(half*2,.34,out+.2,M.archStone,cx,y,cz+s*(ext/2+out/2)));world.add(box(out+.2,.34,half*2-out*2,M.archStone,cx+s*(ext/2+out/2),y,cz))}
  // кронштейны-ступени под балконом
  for(let i=0;i<10;i++){const t=(i/10-.45)*ext*.9;for(const [ax,az,sx,sz] of [[0,1,1,0],[0,-1,1,0],[1,0,0,1],[-1,0,0,1]])
    world.add(box(sx?.5:.55,.55,sz?.5:.55,M.archStone,cx+ax*(ext/2+.5)+sx*t,y-.45,cz+az*(ext/2+.5)+sz*t))}
  // парапет с зубцами
  for(let i=0;i<22;i++){const t=(i/22)*4,side=t|0,u=(t%1)-.5,e2=half-.12,L2=half*2;
    const p=[[u*L2,-e2],[e2,u*L2],[-u*L2,e2],[-e2,-u*L2]][side];
    if(i%2===0)world.add(box(.55,.95,.55,M.archStone,cx+p[0],y+.65,cz+p[1]));else world.add(box(.6,.5,.6,M.archStone,cx+p[0],y+.42,cz+p[1]))}
}
function buildShell(s,th){
  const w=s.w,x0=s.x0,y0=s.y0,SH=s.H,tower=s.kind==='tower';
  const g=maze.g,doorKeys=new Set(s.doors.map(d=>d.rx+','+d.ry)),gateKeys=new Set(maze.gates.map(q=>q.join(',')));
  const sides=[{n:[0,-1],ring:y0-1,ax:'x',lo:x0-1,hi:x0+w},{n:[0,1],ring:y0+w,ax:'x',lo:x0-1,hi:x0+w},{n:[-1,0],ring:x0-1,ax:'z',lo:y0,hi:y0+w-1},{n:[1,0],ring:x0+w,ax:'z',lo:y0,hi:y0+w-1}];
  const cX=wc(x0+(w-1)/2),cZ=wc(y0+(w-1)/2),ext=(w+2)*B;
  const plaster=bodyMatOf(th),baseH=tower?SH-3.6:1.7,stonePal=tower?CREAM_PAL:STONE_PAL;
  const coreMat=M.stoneBase,doorSide=new Set();
  sides.forEach((sd,si)=>{
    const [nx,nz]=sd.n,alongX=sd.ax==='x',tx=-nz,tz=nx;
    const pos=k=>alongX?[wc(k),wc(sd.ring)]:[wc(sd.ring),wc(k)];
    let run=[];
    const flush=()=>{if(!run.length)return;
      const k0=run[0],k1=run[run.length-1],len=(k1-k0+1)*B,[ax_,az_]=pos((k0+k1)/2),[sx_,sz_]=pos(k0);
      // ядро (кладка) — с зазором под кожу
      world.add(alongX?box(len-.02,SH,B-.34,coreMat,ax_,SH/2,az_):box(B-.34,SH,len-.02,coreMat,ax_,SH/2,az_));
      const half=B/2,Ox=sx_-tx*half,Oz=sz_-tz*half;           // начало вдоль стороны
      const ext0=[Ox+nx*half,Oz+nz*half],int0=[Ox-nx*half,Oz-nz*half];
      const mk=(y,h,rowsH,pal,protr,oo)=>skinFace(oo.mat,[ext0[0]+nx*protr,y,ext0[1]+nz*protr],[tx,0,tz],[0,1,0],[nx,0,nz],Math.max(2,Math.round(len/oo.cw)),Math.max(1,Math.round(h/rowsH)),len,h,oo);
      // цоколь / нижний ярус
      mk(0,baseH,.55,stonePal,.22,{mat:M.rockwall,cw:.8,depth:.14,up:.07,miss:.02,edgeT:.0,holeP:.12,crackP:.25,moss:tower?.1:.3,tintFn:stoneTint(stonePal),tileUV:true,ivy:tower?.5:.3});
      world.add(alongX?box(len+.2,.22,.5,M.archStone,ax_+0,baseH+.05,az_+nz*(half+.12)):box(.5,.22,len+.2,M.archStone,ax_+nx*(half+.12),baseH+.05,az_));
      // верхняя часть: штукатурка (где-то осыпалась до кладки)
      mk(baseH,SH-baseH,.5,null,0,{mat:plaster,cw:.5,depth:.1,up:.03,miss:.02,edgeT:.0,holeP:.3,crackP:.45,moss:0,tint:[1,.99,.94],uv:[0,0,len/B,(SH-baseH)/H0w],tileUV:false});
      // внутренняя сторона: штукатурка во всю высоту
      skinFace(plaster,[int0[0],0,int0[1]],[tx,0,tz],[0,1,0],[-nx,0,-nz],Math.max(2,Math.round(len/.5)),Math.max(2,Math.round(SH/.5)),len,SH,{depth:.1,miss:.015,holeP:.25,crackP:.4,tint:[1,.97,.9],uv:[0,0,len/B,SH/H0w]});
      run=[]};
    const H0w=3.2;
    for(let k=sd.lo;k<=sd.hi;k++){
      const key=alongX?k+','+sd.ring:sd.ring+','+k,[px,pz]=pos(k);
      if(doorKeys.has(key)){flush();archWall(px,pz,!alongX,SH,plaster,false,B,.95,1.55);doorSide.add(si);
        for(let q=0;q<3;q++)world.add(box(alongX?B+.8-q*.15:.6,.17-q*.045+.0,alongX?.6:B+.8-q*.15,M.rockwall,px+nx*(B/2+.3+q*.55),(.17*(3-q))/2+.03,pz+nz*(B/2+.3+q*.55)));
        for(const sg of [-1,1]){world.add(box(alongX?.5:1.5,.8,alongX?1.5:.5,M.archStone,px+nx*(B/2+.9)+(alongX?sg*1.25:0)*1,.4,pz+nz*(B/2+.9)+(alongX?0:sg*1.25)));
          const hx=px+nx*(B/2)+(alongX?sg*.95:0),hz=pz+nz*(B/2)+(alongX?0:sg*.95);
          world.add(box(alongX?.08:.9,2.3,alongX?.9:.08,M.wood,hx+(alongX?0:nx*.45),1.15,hz+(alongX?nz*.45:0)));
          const lp=lampPost();lp.scale.set(.8,.8,.8);lp.position.set(px+nx*(B/2+1.4)+(alongX?sg*1.9:0),0,pz+nz*(B/2+1.4)+(alongX?0:sg*1.9));world.add(lp);registerLight(lp)}
        // навес над дверью
        const cn=box(alongX?3:1.3,.14,alongX?1.3:3,M.slateRoof,px+nx*(B/2+.55),3.35,pz+nz*(B/2+.55));cn.rotation.x=nz?-nz*.22:0;cn.rotation.z=nx?nx*.22:0;world.add(cn);
        continue}
      if(gateKeys.has(key)){flush();gateBlock(alongX?k:sd.ring,alongX?sd.ring:k,plaster,SH);continue}
      run.push(k);
    }
    flush();
    // окна и детали по ячейкам
    for(let k=sd.lo;k<=sd.hi;k++){
      const key=alongX?k+','+sd.ring:sd.ring+','+k;if(doorKeys.has(key)||gateKeys.has(key))continue;
      const [px,pz]=pos(k),corner=alongX&&(k===sd.lo||k===sd.hi);
      if(k%2===1&&!corner){
        windowDeco(px,pz,nx,nz,baseH+(tower?-1.4:1.6),1.6,th,{shutters:!tower,flowers:!tower});
        windowDeco(px,pz,nx,nz,HF+2.1,1.7,th,{shutters:!tower,flowers:!tower&&rnd()<.5});
      }
    }
  });
  // угловые камни (как в кладке углов)
  for(const sx of [-1,1])for(const sz of [-1,1]){const qx=cX+sx*ext/2,qz=cZ+sz*ext/2;
    for(let y=.35;y<SH-.2;y+=.62){const a=((y/.62)|0)%2;world.add(box(.7+a*.25,.5,.7+(1-a)*.25,[M.archStone,M.rockwall][rnd()*2|0],qx+sx*.05,y,qz+sz*.05))}}
  if(tower){
    ringBalcony(cX,cZ,SH-3.7,ext,1.15,th);
    // верхний ярус: каркас из тёмных балок поверх штукатурки
    for(const [nx,nz] of [[0,-1],[0,1],[-1,0],[1,0]]){const ax=nz!==0;
      for(let i=0;i<=7;i++){const t=(i/7-.5)*(ext-.6),bx=cX+nx*(ext/2+.1)+(ax?t:0),bz=cZ+nz*(ext/2+.1)+(ax?0:t);world.add(box(ax?.26:.2,3.0,ax?.2:.26,M.wood2,bx,SH-1.9,bz))}
      world.add(box(ax?ext:.22,.3,ax?.22:ext,M.wood2,cX+nx*(ext/2+.1),SH-3.55,cZ+nz*(ext/2+.1)));world.add(box(ax?ext:.22,.3,ax?.22:ext,M.wood2,cX+nx*(ext/2+.1),SH-.3,cZ+nz*(ext/2+.1)))}
    const ridgeX=rnd()<.5;
    const rg=buildRoof(cX,cZ,SH,ext,th,{ridgeX,height:Math.max(5,ext*.4),dormers:true,chimney:null,wallH:SH});
    // круглая башенка рядом, как на референсе
    const sx=rnd()<.5?-1:1,sz=rnd()<.5?-1:1,r=1.5,th_=SH+2.6,tx=cX+sx*(ext/2+.35),tz=cZ+sz*(ext/2+.35);
    const cg=new THREE.CylinderGeometry(r,r*1.08,th_,10),uv=cg.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*3,uv.getY(i)*th_/3.2);
    const cyl=new THREE.Mesh(cg,M.rockwall);cyl.position.set(tx,th_/2,tz);world.add(cyl);
    const rg2=new THREE.Mesh(new THREE.CylinderGeometry(r*1.2,r*1.2,.4,10),M.archStone);rg2.position.set(tx,th_-.1,tz);world.add(rg2);
    const cap=new THREE.Mesh(new THREE.ConeGeometry(r*1.5,4.8,10),M.tileRoof);cap.position.set(tx,th_+2.3,tz);world.add(cap);
    for(const wy of [3,6]){const pl=new THREE.Mesh(new THREE.PlaneGeometry(.6,1.2),M.winW);pl.position.set(tx+sx*r*.7,wy,tz+sz*r*.7);pl.rotation.y=Math.atan2(sx,sz);world.add(pl)}
  }else{
    // коттедж: конёк вдоль стены с дверью, торцы — фронтоны; труба на торце
    const di=[...doorSide][0]??0,[dnx,dnz]=sides[di].n,ridgeX=dnz!==0;
    const hr=Math.max(5.2,ext*.42),ch=[ridgeX?1:-1,0];
    buildRoof(cX,cZ,SH,ext,th,{ridgeX,height:hr,dormers:false,chimney:rnd()<.9?[(rnd()<.5?-1:1)*2.2,ext/2+.9]:null,wallH:SH,tileTint:(c,r,rn)=>th.roof==='tile'?[.9+rn()*.25,.9+rn()*.2,.9+rn()*.2]:[.8+rn()*.35,.8+rn()*.35,.85+rn()*.35]});
  }
}
