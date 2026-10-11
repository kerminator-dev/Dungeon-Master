"use strict";
// ===== «Рельефная кожа» =====
// Поверхность собирается из плиток разной глубины: где-то кирпичи выпали, где-то выщерблены края,
// где-то трещина или мох. Вместо ровных коробок получаются живые, неровные стены, крыши и стыки.
const skinMats=new Map(), skinBuf=new Map();
let skinXf=null; // матрица преобразования (для построек, поставленных с поворотом)
function skinMat(mat){let m=skinMats.get(mat);if(!m){m=new THREE.MeshLambertMaterial({map:mat.map,vertexColors:true});skinMats.set(mat,m)}return m}
function skinBuffer(mat){let b=skinBuf.get(mat);if(!b){b={pos:[],uv:[],col:[],nrm:[],idx:[],n:0};skinBuf.set(mat,b)}return b}
const _v=new THREE.Vector3(),_n=new THREE.Vector3(),_nm=new THREE.Matrix3();
/* Одна грань-сетка.
   O — нижний левый угол, U — вдоль ширины, V — вверх по грани, N — наружная нормаль (массивы [x,y,z]).
   cols×rows — плитки, wd×hd — размер грани. o: depth,up,miss,edgeL/R/T/B,holeP,crackP,tint,moss,mossCol,ivy,uv,tileUV,tintFn */
function skinFace(mat,O,U,V,N,cols,rows,wd,hd,o={}){
  const b=skinBuffer(mat),cw=wd/cols,ch=hd/rows;
  const depth=o.depth??.16,up=o.up??.02,pm=o.miss??.03;
  const eL=o.edgeL??0,eR=o.edgeR??0,eT=o.edgeT??0,eB=o.edgeB??0;
  const tint=o.tint||[1,1,1],moss=o.moss||0,mc=o.mossCol||[.45,.72,.3];
  const uv=o.uv||[0,0,wd/B,hd/curH];
  const holes=new Set(),nH=rnd()<(o.holeP??.18)?1+(rnd()<.4?1:0):0;
  for(let k=0;k<nH;k++){const hc=rnd()*cols|0,hr=rnd()*rows|0,rw=1+(rnd()*2|0),rh=1+(rnd()*2|0);for(let a=0;a<rw;a++)for(let q=0;q<rh;q++)holes.add((hc+a)+','+(hr+q))}
  const cracks=new Set();
  if(rnd()<(o.crackP??.28)){let cc=rnd()*cols|0,rr=rows-1-(rnd()*2|0);const len=3+(rnd()*rows|0);for(let k=0;k<len&&rr>=0;k++){cracks.add(cc+','+rr);if(rnd()<.55)cc+=rnd()<.5?-1:1;cc=Math.max(0,Math.min(cols-1,cc));rr--}}
  const ivy=new Set();
  if(o.ivy&&rnd()<o.ivy){const ic=rnd()*cols|0,ir=rnd()*Math.min(rows,5)|0,iw=1+(rnd()*2|0),ih=2+(rnd()*Math.min(4,rows)|0);for(let a=0;a<iw;a++)for(let q=0;q<ih;q++)if(rnd()<.8)ivy.add((ic+a)+','+(ir+q))}
  const ivyCols=o.ivyCols||[[.3,.55,.2],[.4,.62,.22],[.7,.62,.2],[.62,.3,.15]],ivyCol=ivyCols[rnd()*ivyCols.length|0];
  // ориентация обхода
  const cx_=U[1]*V[2]-U[2]*V[1],cy_=U[2]*V[0]-U[0]*V[2],cz_=U[0]*V[1]-U[1]*V[0],flip=(cx_*N[0]+cy_*N[1]+cz_*N[2])<0;
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const key=c+','+r;let miss=pm;if(c===0)miss+=eL;if(c===cols-1)miss+=eR;if(r===rows-1)miss+=eT;if(r===0)miss+=eB;
    if(holes.has(key)||(rnd()<miss&&!ivy.has(key)))continue;
    const crack=cracks.has(key),isIvy=ivy.has(key);
    let d=-rnd()*depth+(rnd()<.1?up:0);if(crack)d-=.05;if(isIvy)d=up+.04;
    const sh=.82+rnd()*.3;let cr=tint[0]*sh,cg=tint[1]*sh,cb=tint[2]*sh;
    if(o.tintFn){const t=o.tintFn(c,r,rnd);cr*=t[0];cg*=t[1];cb*=t[2]}
    if(crack){cr*=.5;cg*=.5;cb*=.5}
    if(moss&&r<3&&rnd()<moss*(1-r*.3)){cr=cr*.5+mc[0]*.5;cg=cg*.5+mc[1]*.5;cb=cb*.5+mc[2]*.5}
    if(isIvy){cr=ivyCol[0]*sh;cg=ivyCol[1]*sh;cb=ivyCol[2]*sh}
    const bx=O[0]+U[0]*c*cw+V[0]*r*ch+N[0]*d,by=O[1]+U[1]*c*cw+V[1]*r*ch+N[1]*d,bz=O[2]+U[2]*c*cw+V[2]*r*ch+N[2]*d;
    const corners=[[0,0],[1,0],[1,1],[0,1]];
    const nj=[N[0]+(rnd()-.5)*.18,N[1]+(rnd()-.5)*.18,N[2]+(rnd()-.5)*.18];
    const u0=o.tileUV?0:uv[0]+c/cols*uv[2],u1=o.tileUV?1:u0+uv[2]/cols,v0=o.tileUV?0:uv[1]+r/rows*uv[3],v1=o.tileUV?1:v0+uv[3]/rows;
    const base=b.n;
    for(const [a,q] of corners){
      let px=bx+U[0]*a*cw+V[0]*q*ch,py=by+U[1]*a*cw+V[1]*q*ch,pz=bz+U[2]*a*cw+V[2]*q*ch,nx=nj[0],ny=nj[1],nz=nj[2];
      if(skinXf){_v.set(px,py,pz).applyMatrix4(skinXf);px=_v.x;py=_v.y;pz=_v.z;_nm.getNormalMatrix(skinXf);_n.set(nx,ny,nz).applyMatrix3(_nm).normalize();nx=_n.x;ny=_n.y;nz=_n.z}
      b.pos.push(px,py,pz);b.nrm.push(nx,ny,nz);b.col.push(Math.min(1.4,cr),Math.min(1.4,cg),Math.min(1.4,cb));b.uv.push(a?u1:u0,q?v1:v0)}
    if(flip)b.idx.push(base,base+2,base+1,base,base+3,base+2);else b.idx.push(base,base+1,base+2,base,base+2,base+3);
    b.n+=4;
  }
}
function skinFlush(){
  for(const [mat,b] of skinBuf){if(!b.n)continue;
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(b.pos,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(b.nrm,3));
    g.setAttribute('color',new THREE.Float32BufferAttribute(b.col,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(b.uv,2));
    g.setIndex(b.n>65000?new THREE.Uint32BufferAttribute(b.idx,1):new THREE.Uint16BufferAttribute(b.idx,1));
    g.computeBoundingSphere();const m=new THREE.Mesh(g,skinMat(mat));m.userData.keep=true;world.add(m)}
  skinBuf.clear();
}
// Обычные стены лабиринта: тёмное ядро + плитки-кирпичи + неровная кромка + осыпь на верхушке
function buildSkinWalls(list,g,wH,th,mats,bareIdx){
  const core=[],cap=[],rub=[],coreMat=darkOf(mats[0]);
  const wall=(a,b)=>g[a]&&g[a][b]===1;
  for(const [x,y] of list){
    const h=wH(x,y),mat=mats[rnd()<.22?bareIdx:(rnd()*(mats.length-1)|0)];let exposed=false;
    for(const [dx,dy] of dirs){
      const nb=g[x+dx]&&g[x+dx][y+dy];if(nb===undefined||nb===1)continue;exposed=true;
      const tx=-dy,tz=dx,cx=wc(x),cz=wc(y),lw=wall(x-tx,y-tz),rw=wall(x+tx,y+tz),rows=Math.max(2,Math.round(h/.5333)),ruin=rnd()<.07;
      skinFace(mat,[cx+dx*B/2-tx*B/2,0,cz+dy*B/2-tz*B/2],[tx,0,tz],[0,1,0],[dx,0,dy],4,rows,B,h,
        {depth:.17,miss:ruin?.16:.03,edgeL:lw?0:.3,edgeR:rw?0:.3,edgeT:.3,edgeB:.05,holeP:ruin?1:.16,crackP:.26,moss:th.moss??.35,tint:th.wallTint||[1,1,1],uv:[0,0,1,h/curH]});
    }
    if(exposed)core.push([x,y,h]);cap.push([x,y,h]);
    if(rnd()<.18)rub.push([wc(x)+R(-.7,.7),h,wc(y)+R(-.7,.7),R(.12,.3)]);
  }
  instanced(unitBox,coreMat,core,(d,[x,y,h])=>{d.position.set(wc(x),(h-.1)/2,wc(y));d.scale.set(B-.4,h-.1,B-.4)});
  instanced(unitBox,mats[0],cap,(d,[x,y,h])=>{if(rnd()<.07){d.scale.set(0,0,0);d.position.set(wc(x),h,wc(y));return}
    d.position.set(wc(x)+R(-.03,.03),h-.06+R(-.05,.03),wc(y)+R(-.03,.03));d.scale.set(B+.02,.16+R(0,.12),B+.02);d.rotation.y=R(-.02,.02)});
  instanced(new THREE.DodecahedronGeometry(1,0),th.snowy?M.snowRock:M.rock,rub,(d,[x,y,z,s],i)=>{d.position.set(x,y+s*.3,z);d.scale.set(s*1.4,s*.8,s);d.rotation.set(i,i*2,0)});
  skinFlush();
}
