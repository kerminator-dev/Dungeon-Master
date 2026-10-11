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
// ===== оболочка здания: толстые стены, окна, цоколь, каркас, крыша =====
function buildShell(s,th){
  const w=s.w,x0=s.x0,y0=s.y0,SH=s.H,tower=s.kind==='tower',snowy=!!th.snowy;
  const body=tower?th.walls[0]:bodyMatOf(th);
  const g=maze.g,doorKeys=new Set(s.doors.map(d=>d.rx+','+d.ry)),gateKeys=new Set(maze.gates.map(q=>q.join(',')));
  const sides=[{n:[0,-1],ring:y0-1,ax:'x',lo:x0-1,hi:x0+w},{n:[0,1],ring:y0+w,ax:'x',lo:x0-1,hi:x0+w},{n:[-1,0],ring:x0-1,ax:'z',lo:y0,hi:y0+w-1},{n:[1,0],ring:x0+w,ax:'z',lo:y0,hi:y0+w-1}];
  const cX=wc(x0+(w-1)/2),cZ=wc(y0+(w-1)/2),ext=(w+2)*B;
  const doorSide=new Set();
  sides.forEach((sd,si)=>{
    const [nx,nz]=sd.n,alongX=sd.ax==='x';
    const pos=k=>alongX?[wc(k),wc(sd.ring)]:[wc(sd.ring),wc(k)];
    let run=[];
    const flush=()=>{if(!run.length)return;const k0=run[0],k1=run[run.length-1],len=(k1-k0+1)*B,[ax_,az_]=pos((k0+k1)/2);
      world.add(alongX?tbox(len,SH,B,body,ax_,SH/2,az_):tbox(B,SH,len,body,ax_,SH/2,az_));run=[]};
    for(let k=sd.lo;k<=sd.hi;k++){
      const key=alongX?k+','+sd.ring:sd.ring+','+k,[px,pz]=pos(k);
      if(doorKeys.has(key)){flush();archWall(px,pz,!alongX,SH,body,false,B,.95,1.55);doorSide.add(si);
        // ступени, створки и фонари у двери
        for(let q=0;q<2;q++)world.add(box(alongX?B-.2:.5,.16-q*.07,alongX?.5:B-.2,M.archStone,px+nx*(B/2+.25+q*.5),(.16-q*.07)/2,pz+nz*(B/2+.25+q*.5)));
        for(const sg of [-1,1]){const hx=px+nx*(B/2)+(alongX?sg*.92:0),hz=pz+nz*(B/2)+(alongX?0:sg*.92);
          world.add(box(alongX?.08:.9,2.3,alongX?.9:.08,M.wood,hx+(alongX?0:nx*.45),1.15,hz+(alongX?nz*.45:0)));
          const lp=lampPost();lp.scale.set(.8,.8,.8);lp.position.set(px+nx*(B/2+1.2)+(alongX?sg*1.7:0),0,pz+nz*(B/2+1.2)+(alongX?0:sg*1.7));world.add(lp);registerLight(lp)}
        continue}
      if(gateKeys.has(key)){flush();gateBlock(alongX?k:sd.ring,alongX?sd.ring:k,body,SH);continue}
      run.push(k);
    }
    flush();
    for(let k=sd.lo;k<=sd.hi;k++){
      const key=alongX?k+','+sd.ring:sd.ring+','+k;if(doorKeys.has(key)||gateKeys.has(key))continue;
      const [px,pz]=pos(k),corner=alongX&&(k===sd.lo||k===sd.hi);
      const ox=px+nx*B/2,oz=pz+nz*B/2;
      const E=(ww,hh,dd,m,y,lat=0)=>world.add(box(alongX?ww:dd,hh,alongX?dd:ww,m,ox+nx*dd/2+(alongX?lat:0),y,oz+nz*dd/2+(alongX?0:lat)));
      E(B+.02,1.0,.3,M.stoneBase,.5);E(B+.02,.14,.38,M.archStone,1.04);
      E(B+.02,.34,.42,M.wood2,HF-.2);E(B+.02,.3,.5,M.wood2,SH-.25);
      if(!tower){E(.24,SH-1.1,.16,M.wood2,(SH+1.1)/2,-(B/2-.12));E(.24,SH-1.1,.16,M.wood2,(SH+1.1)/2,B/2-.12)}
      if(k%2===1&&!corner){
        for(const [wy,wh] of [[2.3,2.0],[HF+2.0,2.0]]){
          const wm=tower?M.winW:M.winG;
          decal(wm,1.0,wh,px+nx*B,pz+nz*B,-nx,-nz,wy,0);decal(wm,1.0,wh,px-nx*B,pz-nz*B,nx,nz,wy,0);
          E(1.3,.14,.34,M.archStone,wy-wh/2-.04);
          if(!tower){for(const sg of [-1,1])E(.3,wh*.85,.12,M.wood2,wy,sg*.72);
            if(wy<3){E(1.0,.22,.36,M.wood,wy-wh/2-.2);for(let f=-1.5;f<=1.5;f++)E(.16,.2,.18,[M.flowerR,M.flowerY,M.flowerP][(f+2)|0],wy-wh/2-.02,f*.28)}}
        }
      }
      if(rnd()<.35)for(let q=0;q<3;q++)E(R(.4,.9),R(.5,1.3),.1,rnd()<.7?M.leafG:M.leafG2,R(1.3,3.8),R(-.5,.5));
    }
  });
  // --- крыша и пристройки ---
  const grp=new THREE.Group();grp.position.set(cX,0,cZ);world.add(grp);
  if(tower){
    const r=ext/2;
    // круговой балкон с зубцами, как на референсе
    grp.add(box(ext+1.6,.4,ext+1.6,M.archStone,0,SH-1.6,0));
    for(let i=0;i<14;i++){const t=i/14*4,side=t|0,u=(t%1)-.5,e=(ext+1.6)/2-.1;
      const p=[[u*(ext+1.6),-e],[e,u*(ext+1.6)],[-u*(ext+1.6),e],[-e,-u*(ext+1.6)]][side];grp.add(box(.55,.8,.55,M.archStone,p[0],SH-.8,p[1]))}
    grp.add(box(ext-.2,.5,ext-.2,body,0,SH+.25,0));
    for(const sx of [-1,1])for(const sz of [-1,1]){const tt=new THREE.Mesh(new THREE.CylinderGeometry(.75,.8,2.6,8),M.stoneBase);tt.position.set(sx*(ext/2+.5),SH-.2,sz*(ext/2+.5));grp.add(tt);
      const tc=new THREE.Mesh(new THREE.ConeGeometry(1.1,2.2,8),M.tileRoof);tc.position.set(sx*(ext/2+.5),SH+2.2,sz*(ext/2+.5));grp.add(tc)}
    const cone=new THREE.Mesh(new THREE.ConeGeometry(r*1.05,7.4,8),th.snowy?M.snowRoof:M.tileRoof);cone.position.set(0,SH+3.9,0);grp.add(cone);
    grp.add(box(.14,1.6,.14,M.wood2,0,SH+8.1,0));
  }else{
    const turret=rnd()<.7?[rnd()<.5?-1:1,rnd()<.5?-1:1]:null;
    roofKit(grp,ext,ext,SH,th,{ridgeX:rnd()<.5,height:Math.max(4.4,ext*.34),turret});
    const free=sides.map((sd,i)=>i).filter(i=>!doorSide.has(i));
    if(free.length&&rnd()<.8){const si=free[rnd()*free.length|0],sd=sides[si],[nx,nz]=sd.n;balcony(grp,nx*ext/2,nz*ext/2,nx,nz,HF-.05,3.8,1.4);
      const alongX=sd.ax==='x';decal(M.door,1.3,2.4,cX+nx*(ext/2+B/2+.0),cZ+nz*(ext/2+B/2),-nx,-nz,HF+1.15,0)}
  }
}
