'use strict';
// ---------- предметы окружения ----------
// Каждый предмет — шаблон, склеенный из простых фигур в одну геометрию с вершинными цветами.
// Экземпляры рисуются инстансингом (как кирпичи), крупные предметы непроходимы.
const _m4=(x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1,sy=1,sz=1)=>new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),
  new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz,'YXZ')),new THREE.Vector3(sx,sy,sz));
function mergeParts(parts){const P=[],N=[],U=[],C=[],c=new THREE.Color();
  for(const [g0,col,m] of parts){const g=g0.index?g0.toNonIndexed():g0.clone();if(m)g.applyMatrix4(m);g.computeVertexNormals();
    const p=g.attributes.position.array,n=g.attributes.normal.array,uv=g.attributes.uv&&g.attributes.uv.array;c.set(col);
    for(let i=0;i<p.length/3;i++){P.push(p[i*3],p[i*3+1],p[i*3+2]);N.push(n[i*3],n[i*3+1],n[i*3+2]);U.push(uv?uv[i*2]:0,uv?uv[i*2+1]:0);C.push(c.r,c.g,c.b)}
    g.dispose()}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));g.setAttribute('color',new THREE.Float32BufferAttribute(C,3));return g}
const bx=(w,h,d,x,y,z,col,rx,ry,rz)=>[new THREE.BoxGeometry(w,h,d),col,_m4(x,y,z,rx,ry,rz)];
const cy=(rt,rb,h,seg,x,y,z,col,rx,ry,rz,open)=>[new THREE.CylinderGeometry(rt,rb,h,seg,1,!!open),col,_m4(x,y,z,rx,ry,rz)];
const lathe=(prof,seg,col,m)=>[new THREE.LatheGeometry(prof.map(p=>new THREE.Vector2(p[0],p[1])),seg),col,m||_m4()];
const shade=(c,k)=>'#'+new THREE.Color(c).multiplyScalar(k).getHexString();
const snowCap=(parts,w,d,y)=>{if(TH.snow)parts.push(bx(w*.96,.07,d*.96,0,y+.035,0,'#eef3fa',0,rr(-.05,.05),0))};

// --- шаблоны: geo, w/d — габарит для коллизий, h — высота (для штабелей) ---
const PROPS={
  barrel(){const wd=pick(['#7a5434','#6a4a2e','#84603a']),ir='#2e2a26',pr=[];
    for(let i=0;i<=8;i++){const t=i/8;pr.push([.25+.055*Math.sin(Math.PI*t),t*.86])}
    const parts=[lathe(pr,12,wd),cy(.26,.26,.02,12,0,.85,0,shade(wd,.85))];
    for(const y of [.1,.76])parts.push(cy(.272,.272,.045,12,0,y,0,ir,0,0,0,true));
    for(const y of [.3,.56])parts.push(cy(.302,.302,.045,12,0,y,0,ir,0,0,0,true));
    snowCap(parts,.5,.5,.86);return {parts,w:.62,d:.62,h:.87,round:1}},
  crate(){const wd=pick(['#8a6a42','#7a5c38','#94744a']),fr=shade(wd,.7),s=rr(.5,.66),parts=[bx(s,s,s,0,s/2,0,wd)];
    const e=.05,h=s/2;
    for(const [a,b] of [[-1,-1],[1,-1],[-1,1],[1,1]]){parts.push(bx(e,s+.01,e,a*(h-e/2+.006),h,b*(h-e/2+.006),fr));parts.push(bx(s+.01,e,e,0,h+a*(h-e/2+.006),b*(h-e/2+.006),fr));parts.push(bx(e,e,s+.01,a*(h-e/2+.006),h+b*(h-e/2+.006),0,fr))}
    parts.push(bx(e*.8,s*1.3,e*.6,0,h,h+.01,fr,0,0,Math.PI/4));
    snowCap(parts,s,s,s);return {parts,w:s+.04,d:s+.04,h:s}},
  chest(){const wd=pick(['#6a4024','#5a3620','#74482a']),ir='#34302c',gold='#c8a040',parts=[bx(.86,.42,.52,0,.21,0,wd)];
    parts.push([new THREE.CylinderGeometry(.26,.26,.86,12,1,false,0,Math.PI),wd,_m4(0,.42,0,0,0,Math.PI/2,.62,1,1)]);
    for(const x of [-.33,.33]){parts.push(bx(.06,.43,.54,x,.215,0,ir));parts.push([new THREE.CylinderGeometry(.27,.27,.06,12,1,false,0,Math.PI),ir,_m4(x,.42,0,0,0,Math.PI/2,.64,1,1)])}
    parts.push(bx(.12,.14,.04,0,.4,.27,gold));parts.push(bx(.88,.04,.54,0,.03,0,ir));
    snowCap(parts,.8,.4,.58);return {parts,w:.9,d:.56,h:.6}},
  cabinet(){const wd=pick(['#5a3a24','#4a3020','#64422a']),lt=shade(wd,1.2),dk=shade(wd,.7),gold='#b89040',parts=[bx(1,1.9,.5,0,.95,0,wd)];
    parts.push(bx(1.1,.08,.58,0,1.94,.01,dk),bx(1.04,.1,.54,0,.05,.01,dk));
    for(const x of [-.24,.24]){parts.push(bx(.45,1.66,.03,x,1.0,.26,lt));
      for(const y of [.55,1.4])parts.push(bx(.33,.6,.02,x,y,.28,shade(wd,.9)));parts.push(bx(.03,.12,.04,x*.15,1.02,.29,gold))}
    return {parts,w:1.1,d:.58,h:1.98,tall:1}},
  shelf(){const wd=pick(['#5a3a24','#6a4630']),parts=[],bc=['#6a2a22','#2a3a5a','#3a5a2a','#7a6a3a','#4a2a4a','#8a5a2a','#5a5a5a','#7a3a2a'];
    for(const x of [-.5,.5])parts.push(bx(.05,1.8,.36,x,.9,0,wd));parts.push(bx(1.04,1.8,.02,0,.9,-.17,shade(wd,.7)));
    const ys=[.03,.47,.91,1.35,1.78];for(const y of ys)parts.push(bx(1.02,.035,.36,0,y,0,wd));
    for(let l=0;l<4;l++){let x=-.46;while(x<.44){const w=rr(.03,.075),h=rr(.24,.38);if(rnd()<.12){x+=rr(.05,.15);continue}
      const tilt=rnd()<.1?rr(.2,.4):0;parts.push(bx(w,h,rr(.22,.28),x+w/2,ys[l]+.02+h/2*Math.cos(tilt),.02,pick(bc),0,0,tilt));x+=w+.003+(tilt?.08:0)}}
    return {parts,w:1.06,d:.38,h:1.8,tall:1}},
  coffin(){const wd=pick(['#4a2e1e','#3e2618','#553524']),sh=new THREE.Shape();
    sh.moveTo(-.95,-.17);sh.lineTo(-.45,-.29);sh.lineTo(.95,-.15);sh.lineTo(.95,.15);sh.lineTo(-.45,.29);sh.lineTo(-.95,.17);sh.closePath();
    const body=new THREE.ExtrudeGeometry(sh,{depth:.36,bevelEnabled:false}),lid=new THREE.ExtrudeGeometry(sh,{depth:.06,bevelEnabled:false});
    const parts=[[body,wd,_m4(0,0,0,-Math.PI/2)],[lid,shade(wd,1.2),_m4(rr(-.05,.08),.36,0,-Math.PI/2,rr(-.12,.12),0,1.03,1.05,1)]];
    parts.push(bx(.36,.03,.05,-.3,.43,0,'#8a7a5a'),bx(.05,.03,.2,-.36,.43,0,'#8a7a5a'));
    return {parts,w:1.95,d:.62,h:.45,long:1}},
  sarcophagus(){const st=pick(['#8a8474','#7a7466','#968e7c']),parts=[bx(2,.72,.9,0,.36,0,st),bx(2.08,.08,.98,0,.04,0,shade(st,.8))];
    parts.push(bx(2.12,.16,1.02,rr(.05,.2),.8,rr(-.05,.05),shade(st,1.08),0,rr(.06,.16),0));
    for(const x of [-.6,0,.6])parts.push(bx(.4,.3,.02,x,.4,.455,shade(st,.85)));
    parts.push(bx(.5,.07,.24,.1,.91,0,shade(st,1.15)));
    return {parts,w:2.1,d:1.0,h:.9,long:1}},
  table(){const wd=pick(['#6a4a2e','#5a3e26']),parts=[bx(1.2,.06,.72,0,.76,0,wd,0,0,rr(-.01,.01))];
    for(const [a,b] of [[-1,-1],[1,-1],[-1,1],[1,1]])parts.push(bx(.07,.74,.07,a*.52,.37,b*.29,shade(wd,.8)));
    parts.push(cy(.035,.035,.14,7,rr(-.4,-.2),.86,rr(-.15,.15),'#e8dcc0'),cy(.05,.04,.1,8,rr(.1,.3),.84,rr(-.2,.1),'#6a6a70'),
      cy(.13,.12,.02,10,rr(-.1,.2),.8,rr(0,.2),'#8a8a80'),bx(.2,.05,.28,rr(.25,.45),.815,rr(-.15,.15),'#5a2a22',0,rr(-1,1),0));
    return {parts,w:1.2,d:.72,h:.8}},
  stool(){const wd=pick(['#6a4a2e','#5a3e26']),parts=[cy(.19,.19,.05,9,0,.46,0,wd)];
    for(let i=0;i<3;i++){const a=i*2.09;parts.push(cy(.025,.03,.46,5,Math.cos(a)*.12,.22,Math.sin(a)*.12,shade(wd,.8),Math.sin(a)*.12,0,-Math.cos(a)*.12))}
    return {parts,w:.4,d:.4,h:.48,round:1}},
  sack(){const c=pick(['#9a8460','#8a7654','#a89070']),g=new THREE.IcosahedronGeometry(1,1),p=g.attributes.position;
    for(let i=0;i<p.count;i++){const y=p.getY(i),k=1+.08*Math.sin(p.getX(i)*7+p.getZ(i)*5);p.setXYZ(i,p.getX(i)*k*(y<-.6?1.1:1),y,p.getZ(i)*k)}
    const parts=[[g,c,_m4(0,.3,0,0,0,0,.28,.32,.24)],cy(.06,.1,.12,6,0,.62,0,shade(c,.8)),cy(.07,.07,.03,6,0,.58,0,'#5a4a30')];
    return {parts,w:.55,d:.5,h:.6,round:1}},
  urn(){const c=TH.indoor?pick(['#7a7468','#8a6a50','#6a5a4a']):pick(['#a0583a','#b06a42','#8a5a3a']),pr=[[.0,0],[.12,0],[.2,.1],[.24,.3],[.2,.5],[.09,.62],[.08,.72],[.12,.76],[.0,.76]];
    const parts=[lathe(pr,10,c)];for(const s of [-1,1])parts.push([new THREE.TorusGeometry(.07,.018,4,8,Math.PI),shade(c,.9),_m4(s*.13,.6,0,0,s>0?0:Math.PI,-Math.PI/2)]);
    return {parts,w:.5,d:.5,h:.76,round:1}},
  bones(){const parts=[],b='#d8ceb4';for(let i=0;i<ri(5,9);i++)parts.push(cy(.02,.024,rr(.25,.45),5,rr(-.3,.3),.03+rr(0,.06),rr(-.25,.25),shade(b,rr(.8,1)),Math.PI/2,rr(0,6),rr(-.2,.2)));
    parts.push([new THREE.SphereGeometry(.1,8,6),b,_m4(rr(-.15,.15),.09,rr(-.1,.1),0,0,0,1,.9,1.15)]);
    return {parts,w:.6,d:.5,h:.15,soft:1}},
  candles(){const parts=[cy(.2,.24,.015,10,0,.008,0,'#e0d4b8')];for(let i=0;i<ri(3,6);i++){const h=rr(.08,.32);parts.push(cy(.025,.03,h,7,rr(-.13,.13),h/2,rr(-.13,.13),shade('#e8dcc0',rr(.85,1))))}
    return {parts,w:.4,d:.4,h:.3,soft:1,light:1}},
  drum(){const st=TH.snow?'#9a9a9c':pick(['#b8a888','#c4b494','#a89878']),r=rr(.32,.42),h=rr(.4,.7),parts=[];
    const g=new THREE.CylinderGeometry(r,r,h,14,2),p=g.attributes.position;for(let i=0;i<p.count;i++){const a=Math.atan2(p.getZ(i),p.getX(i)),k=1-.06*(Math.cos(a*14)>.3?1:0);p.setX(i,p.getX(i)*k);p.setZ(i,p.getZ(i)*k);if(p.getY(i)>0)p.setY(i,p.getY(i)+Math.sin(a*3)*.06)}
    const lying=rnd()<.45;parts.push([g,st,lying?_m4(0,r,0,0,0,Math.PI/2):_m4(0,h/2,0)]);
    if(!lying&&rnd()<.4)parts.push([new THREE.CylinderGeometry(r*.95,r,h*.7,14),shade(st,.95),_m4(rr(-.05,.05),h+h*.35,rr(-.05,.05),rr(-.08,.08),0,rr(-.08,.08))]);
    if(lying)snowCap(parts,h*.85,r*.55,r*2-.02);else snowCap(parts,r*1.4,r*1.4,h);return {parts,w:lying?h+.1:r*2+.1,d:r*2+.1,h:lying?r*2:h,round:!lying}},
  wheel(){const wd='#5e4428',parts=[[new THREE.TorusGeometry(.48,.05,5,16),wd,_m4(0,.5,0)],cy(.08,.08,.14,8,0,.5,0,shade(wd,.8),Math.PI/2)];
    for(let i=0;i<8;i++)parts.push(bx(.04,.88,.04,0,.5,0,wd,0,0,i*Math.PI/8));
    const m=new THREE.Matrix4().makeRotationX(-.22);parts.forEach(p=>p[2]=m.clone().multiply(p[2]));
    return {parts,w:1.0,d:.3,h:1,lean:1}},
  logs(){const bk='#5a4030',end='#a8885a',parts=[];let k=0;
    for(const [n,y] of [[3,.12],[2,.34],[1,.56]])for(let i=0;i<n;i++){const x=(i-(n-1)/2)*.25,z=x+rr(-.02,.02);parts.push(cy(.12,.12,1.1,7,0,y,z,bk,Math.PI/2,Math.PI/2,0));
      for(const s of [-1,1])parts.push(cy(.112,.112,.01,7,s*.552,y,z,end,0,0,Math.PI/2));
      // снег лежит на каждом бревне валиком по его верху (а не плитой над всей поленницей)
      if(TH.snow)parts.push(bx(rr(.85,1.05),.04,.12,rr(-.04,.04),y+.108,z,'#eef3fa'));k++}
    return {parts,w:1.15,d:.8,h:.7}},
  rack(){const wd='#4a3020',ir='#8a8a90',parts=[bx(1,.06,.2,0,.3,0,wd),bx(1,.06,.2,0,1.3,0,wd),bx(.06,1.5,.06,-.45,.75,-.05,wd),bx(.06,1.5,.06,.45,.75,-.05,wd)];
    for(let i=0;i<4;i++){const x=-.33+i*.22;parts.push(bx(.025,1.25,.012,x,.85,.06,ir,0,0,rr(-.05,.05)),bx(.12,.03,.04,x,.4,.06,'#3a2a1a'))}
    return {parts,w:1.0,d:.3,h:1.5,tall:1}},
};

// --- наборы по темам: [шаблон, вес] ---
const PROP_SETS={
  dungeon:{wall:[['barrel',4],['crate',4],['sack',3],['cabinet',2],['shelf',1],['rack',1],['candles',1]],dead:'chest',room:'table',dens:.22,webs:.5},
  catacombs:{wall:[['coffin',5],['bones',4],['candles',3],['crate',1]],dead:'coffin',room:'sarcophagus',dens:.25,webs:.7},
  ruins:{wall:[['drum',4],['crate',2],['barrel',2],['wheel',2],['sack',1]],dead:'chest',room:'drum',dens:.18},
  winter:{wall:[['logs',3],['barrel',3],['crate',3],['drum',3],['wheel',1]],dead:'chest',room:'drum',dens:.18},
};

function buildProps(root){
  const set=PROP_SETS[game.theme],T={},list=[],placed=[];
  const tpl=name=>{if(!T[name]){T[name]=[];for(let i=0;i<3;i++){const t=PROPS[name]();t.geo=mergeParts(t.parts);t.parts=null;T[name].push(t)}}return pick(T[name])};
  const sx=W.start.x,sz=W.start.z,ec=warp(W.exitCell.i+.5,W.exitCell.j+.5);
  const free=(x,z,r)=>Math.hypot(x-sx,z-sz)>2.4&&Math.hypot(x-ec[0],z-ec[1])>2.4&&placed.every(p=>Math.hypot(p.x-x,p.z-z)>p.r+r+.25);
  const geos=[],idx=new Map(),stamps=[],base=W.occ.occ.slice();let grp=0;
  const put=(t,x,y,z,yaw,solid=true)=>{if(!idx.has(t.geo)){idx.set(t.geo,geos.length);geos.push(t.geo)}
    const k=rr(.9,1.06);pushInst(list,x,y,z,0,yaw,0,1,1,1,new THREE.Color(k,k,k),idx.get(t.geo));list[list.length-1].g=grp;
    if(solid&&!t.soft){const w=t.w/2,d=t.d/2,c=Math.cos(yaw),s=Math.sin(yaw),a=w>=d,L=Math.max(0,(a?w-d:d-w)),r=Math.min(w,d);
      const ax=a?c:s,az=a?-s:c,st=[[x-ax*L,z-az*L],[x+ax*L,z+az*L],r+.02,grp];stamps.push(st);occStamp(...st)}
    if(t.light)W.lights.push({x,y:y+.42,z,base:y,kind:'cluster',nx:0,nz:0,g:grp})};
  const weighted=a=>{let s=0;for(const [,w] of a)s+=w;let r=rnd()*s;for(const [n,w] of a){r-=w;if(r<=0)return n}return a[0][0]};
  // у стен
  for(const fc of W.faces)for(let u=0;u<Math.max(1,Math.round(fc.sg.len/CS));u++){if(fc.outer||rnd()>set.dens)continue;const L=fc.sg.len;
    const name=weighted(set.wall),t=tpl(name),half=t.w/2;if(L<t.w+WT+.3||CW<2&&!t.round)continue;
    const s=rr(BD+.1+half,L-BD-.1-half),f=faceAt(fc,s,.4),d=BD+.04+t.d/2,x=f.x+f.nx*d,z=f.z+f.nz*d,r=Math.max(t.w,t.d)/2;
    if(!free(x,z,r))continue;
    const yaw=Math.atan2(f.nx,f.nz)+(t.round?rr(0,6.28):rr(-.1,.1)),y=floorH(x,z)-.02;
    grp++;put(t,x,y,z,yaw);placed.push({x,z,r});if(t.tall)W.tall.push({x,z});
    // группы: бочки, мешки, ящики рядом; ящики штабелем
    if((name==='barrel'||name==='sack'||name==='urn'||name==='crate')&&rnd()<.35)for(const sd of [-1,1]){if(rnd()<.45)continue;
      const t2=tpl(name),off=(t.w+t2.w)/2+rr(.02,.12),x2=x+fc.sg.at(s).tx*off*sd,z2=z+fc.sg.at(s).tz*off*sd,r2=Math.max(t2.w,t2.d)/2;
      if(s+off*sd<BD+.1+t2.w/2||s+off*sd>L-BD-.1-t2.w/2||!placed.every(p=>p.x===x&&p.z===z||Math.hypot(p.x-x2,p.z-z2)>p.r+r2+.25))continue;
      put(t2,x2,floorH(x2,z2)-.02,z2,yaw+(t2.round?rr(0,6):rr(-.15,.15)));placed.push({x:x2,z:z2,r:r2})}
    if(name==='crate'&&rnd()<.4){const t2=tpl('crate');put(t2,x+rr(-.06,.06),y+t.h,z+rr(-.06,.06),yaw+rr(-.3,.3),false)}}
  // тупики свободны: там стоят сундуки (js/05d-gameplay.js)
  const n=W.n,M=W.M;
  // залы: центральный предмет
  for(const [i0,j0,w,h] of M.rooms){const c=warp(i0+w/2,j0+h/2);let x=c[0],z=c[1];
    if(W.cols.some(k=>k.pillar&&Math.hypot(k.x-x,k.z-z)<1.6)){const c2=warp(i0+w/2+(w>2?.5:0),j0+h/2+.5);x=c2[0];z=c2[1]}
    const t=tpl(set.room),yaw=rr(0,6.28);if(!free(x,z,Math.max(t.w,t.d)/2))continue;
    grp++;put(t,x,floorH(x,z)-.02,z,yaw);placed.push({x,z,r:Math.max(t.w,t.d)/2});
    if(set.room==='table')for(let k=0;k<ri(2,4);k++){const a=yaw+k*Math.PI/2+rr(-.3,.3),st=tpl('stool'),dd=k%2?.85:.7,sx2=x+Math.sin(a)*dd,sz2=z+Math.cos(a)*dd;
      put(st,sx2,floorH(sx2,sz2)-.02,sz2,rr(0,6))}
    if(set.room==='drum')for(let k=0;k<ri(2,4);k++){const a=rr(0,6.28),dd=rr(1,1.6),t2=tpl('drum'),x2=x+Math.cos(a)*dd,z2=z+Math.sin(a)*dd;
      if(free(x2,z2,.45)&&wallDist(x2,z2)>.6){grp++;put(t2,x2,floorH(x2,z2)-.02,z2,rr(0,6));placed.push({x:x2,z:z2,r:.45})}}}
  // предметы не должны отрезать ни выход, ни одну клетку лабиринта: убираем те, что разделяют достижимые области
  const e=W.exitCell,ep=warp(e.i+.5+e.di*.7,e.j+.5+e.dj*.7),drop=new Set(),cells=[[ep[0],ep[1]]];
  for(let i=0;i<W.n;i++)for(let j=0;j<W.n;j++)cells.push(warp(i+.5,j+.5));
  const inCell=(A,c)=>[[0,0],[.3,0],[-.3,0],[0,.3],[0,-.3]].some(([a,b])=>A.has(c[0]+a*CW,c[1]+b*CW));
  for(let it=0;it<80;it++){const A=reachMap(W.start.x,W.start.z),lost=cells.find(c=>!inCell(A,c));if(!lost)break;
    const B=reachMap(...([[0,0],[.3,0],[-.3,0],[0,.3],[0,-.3]].map(([a,b])=>[lost[0]+a*CW,lost[1]+b*CW]).find(p=>freeR(p[0],p[1],.45))||lost));let found=0;
    for(const st of stamps){if(drop.has(st[3]))continue;const [p,q,r]=st,cx=(p[0]+q[0])/2,cz=(p[1]+q[1])/2,R=r+Math.hypot(p[0]-q[0],p[1]-q[1])/2+1.1;
      if(A.near(cx,cz,R)&&B.near(cx,cz,R)){drop.add(st[3]);found++}}
    if(!found){const st=stamps.find(s=>!drop.has(s[3]));if(!st)break;drop.add(st[3])}
    W.occ.occ.set(base);for(const st of stamps)if(!drop.has(st[3]))occStamp(...st)}
  if(drop.size){for(let i=list.length-1;i>=0;i--)if(drop.has(list[i].g))list.splice(i,1);W.lights=W.lights.filter(l=>!drop.has(l.g))}
  const mat=new THREE.MeshPhongMaterial({vertexColors:true,map:tex('prop',()=>mkBrickTex(77)),shininess:8,specular:0x141414});
  instance(root,list,geos,mat,true,CHUNK*2);W.propCount=list.length;W.placed=placed;
  // паутина в углах под сводом
  if(set.webs){const webs=[],wt=tex('web',mkWebTex);
    for(const fc of W.faces)for(let u=0;u<Math.max(1,Math.round(fc.sg.len/CS));u++){if(fc.outer||rnd()>set.webs*.35)continue;const s=rnd()<.5?.55:fc.sg.len-.55,f=faceAt(fc,s,TH.H),x=f.x+f.nx*(BD+.18),z=f.z+f.nz*(BD+.18);
      pushInst(webs,x,ceilH(x,z)-.32,z,-.75,Math.atan2(f.nx,f.nz)+rr(-.3,.3),rr(-.3,.3),rr(.6,1),rr(.6,1),1,new THREE.Color(1,1,1),0)}
    instance(root,webs,[new THREE.PlaneGeometry(1,1)],new THREE.MeshLambertMaterial({map:wt,transparent:true,opacity:.75,alphaTest:.05,side:THREE.DoubleSide,depthWrite:false}),false)}}

// заливка проходимых точек (шаг 0.2 м); запас .45 м, чтобы предметы не оставляли щель «впритирку»
function reachMap(x0,z0,rad=.45){const st=.2,b=W.b,gw=Math.ceil((b.x1-b.x0)/st),gh=Math.ceil((b.z1-b.z0)/st),seen=new Uint8Array(gw*gh);
  const ix=x=>Math.floor((x-b.x0)/st),iz=z=>Math.floor((z-b.z0)/st),q=[ix(x0),iz(z0)];seen[q[1]*gw+q[0]]=1;
  for(let h=0;h<q.length;h+=2){const gx=q[h],gz=q[h+1];
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=gx+dx,nz=gz+dz;if(nx<0||nz<0||nx>=gw||nz>=gh||seen[nz*gw+nx])continue;
      if(!freeR(b.x0+(nx+.5)*st,b.z0+(nz+.5)*st,rad))continue;seen[nz*gw+nx]=1;q.push(nx,nz)}}
  const at=(x,z)=>{const a=ix(x),c=iz(z);return a>=0&&c>=0&&a<gw&&c<gh&&seen[c*gw+a]===1};
  return {has:(x,z)=>at(x,z)||at(x+st,z)||at(x-st,z)||at(x,z+st)||at(x,z-st),
    near:(x,z,R)=>{for(let dz=-R;dz<=R;dz+=st)for(let dx=-R;dx<=R;dx+=st)if(dx*dx+dz*dz<=R*R&&at(x+dx,z+dz))return true;return false}}}

function mkWebTex(){const c=mkCanvas(128,128),x=c.getContext('2d'),r=mulberry(3);x.strokeStyle='rgba(235,235,235,.85)';x.lineWidth=1;
  const cx=8,cy=8,N=9,ang=[];for(let i=0;i<N;i++)ang.push(i/(N-1)*Math.PI/2+r()*.08);
  for(const a of ang){x.beginPath();x.moveTo(cx,cy);x.lineTo(cx+Math.cos(a)*170,cy+Math.sin(a)*170);x.stroke()}
  for(let d=12;d<170;d+=8+r()*6){x.beginPath();ang.forEach((a,i)=>{const dd=d*(1+(r()-.5)*.08),px=cx+Math.cos(a)*dd,py=cy+Math.sin(a)*dd;i?x.quadraticCurveTo(cx+Math.cos(a-.08)*dd*.94,cy+Math.sin(a-.08)*dd*.94,px,py):x.moveTo(px,py)});x.stroke()}
  const t=new THREE.CanvasTexture(c);return t}
