'use strict';
// ---------- environment props ----------
// each prop is a template merged from simple shapes into one vertex-colored geometry.
// instances are drawn with instancing (like bricks); large props block movement.
const _m4=(x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1,sy=1,sz=1)=>new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),
  new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz,'YXZ')),new THREE.Vector3(sx,sy,sz));
// a part may carry a 4th element, its glow: the prop material adds that much of the part's color as emission (lantern glass)
function mergeParts(parts){const P=[],N=[],U=[],C=[],E=[],c=new THREE.Color();
  for(const [g0,col,m,glow=0] of parts){const g=g0.index?g0.toNonIndexed():g0.clone();if(m)g.applyMatrix4(m);g.computeVertexNormals();
    const p=g.attributes.position.array,n=g.attributes.normal.array,uv=g.attributes.uv&&g.attributes.uv.array;c.set(col);
    for(let i=0;i<p.length/3;i++){P.push(p[i*3],p[i*3+1],p[i*3+2]);N.push(n[i*3],n[i*3+1],n[i*3+2]);U.push(uv?uv[i*2]:0,uv?uv[i*2+1]:0);C.push(c.r,c.g,c.b);E.push(glow)}
    g.dispose()}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));g.setAttribute('color',new THREE.Float32BufferAttribute(C,3));g.setAttribute('emit',new THREE.Float32BufferAttribute(E,1));return g}
const bx=(w,h,d,x,y,z,col,rx,ry,rz)=>[new THREE.BoxGeometry(w,h,d),col,_m4(x,y,z,rx,ry,rz)];
const cy=(rt,rb,h,seg,x,y,z,col,rx,ry,rz,open)=>[new THREE.CylinderGeometry(rt,rb,h,seg,1,!!open),col,_m4(x,y,z,rx,ry,rz)];
const lathe=(prof,seg,col,m)=>[new THREE.LatheGeometry(prof.map(p=>new THREE.Vector2(p[0],p[1])),seg),col,m||_m4()];
// the props' material: vertex colours over a fine stone grain, plus the glow of the parts that carry one (emit).
// one per level for every prop, chest, urn, altar and doorway; side: two-sided for the open urns
function propMat(side=THREE.FrontSide){const k='propMat'+side;if(W[k])return W[k];
  const m=new THREE.MeshLambertMaterial({vertexColors:true,map:tex('prop',()=>mkBrickTex(77)),side});
  m.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute float emit;varying float vEmit;').replace('#include <begin_vertex>','#include <begin_vertex>\nvEmit=emit;');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying float vEmit;').replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vColor.rgb*vEmit;')};
  return W[k]=m}
// the plain vertex-coloured material of small things (torch holders, skulls, roots, banner rods, crystal beds): one per
// level, so a chunk bakes them all into one mesh
const plainMat=()=>W.plainMat||(W.plainMat=new THREE.MeshLambertMaterial({vertexColors:true}));
const shade=(c,k)=>'#'+new THREE.Color(c).multiplyScalar(k).getHexString();
const snowCap=(parts,w,d,y)=>{if(TH.snow)parts.push(bx(w*.96,.07,d*.96,0,y+.035,0,'#eef3fa',0,rr(-.05,.05),0))};
// round snow cap for barrels and drums: slightly domed, edge follows the circle
const snowDisc=(parts,r,y)=>{if(TH.snow)parts.push(lathe([[0,.07],[r*.6,.06],[r*.92,.035],[r,.005],[r*.97,0],[0,0]],16,'#eef3fa',_m4(0,y,0)))};

// --- templates: geo, w/d = collision footprint, h = height (for stacking) ---
const PROPS={
  barrel(){const wd=pick(['#7a5434','#6a4a2e','#84603a']),ir='#2e2a26',pr=[];
    for(let i=0;i<=8;i++){const t=i/8;pr.push([.25+.055*Math.sin(Math.PI*t),t*.86])}
    const parts=[lathe(pr,12,wd),cy(.26,.26,.02,12,0,.85,0,shade(wd,.85))];
    for(const y of [.1,.76])parts.push(cy(.272,.272,.045,12,0,y,0,ir,0,0,0,true));
    for(const y of [.3,.56])parts.push(cy(.302,.302,.045,12,0,y,0,ir,0,0,0,true));
    snowDisc(parts,.255,.86);return {parts,w:.62,d:.62,h:.87,round:1}},
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
    return {parts,w:1.95,d:.62,h:.45,long:1,soft:1}},
  sack(){const c=pick(['#9a8460','#8a7654','#a89070']),g=new THREE.IcosahedronGeometry(1,1),p=g.attributes.position;
    for(let i=0;i<p.count;i++){const y=p.getY(i),k=1+.08*Math.sin(p.getX(i)*7+p.getZ(i)*5);p.setXYZ(i,p.getX(i)*k*(y<-.6?1.1:1),y,p.getZ(i)*k)}
    const parts=[[g,c,_m4(0,.3,0,0,0,0,.28,.32,.24)],cy(.06,.1,.12,6,0,.62,0,shade(c,.8)),cy(.07,.07,.03,6,0,.58,0,'#5a4a30')];
    return {parts,w:.55,d:.5,h:.6,round:1}},
  urn(){const c=TH.indoor?pick(['#7a7468','#8a6a50','#6a5a4a']):pick(['#a0583a','#b06a42','#8a5a3a']),pr=[[.0,0],[.12,0],[.2,.1],[.24,.3],[.2,.5],[.09,.62],[.08,.72],[.12,.76],[.0,.76]];
    const parts=[lathe(pr,10,c)];for(const s of [-1,1])parts.push([new THREE.TorusGeometry(.07,.018,4,8,Math.PI),shade(c,.9),_m4(s*.13,.6,0,0,s>0?0:Math.PI,-Math.PI/2)]);
    return {parts,w:.5,d:.5,h:.76,round:1}},
  bones(){const parts=[],b='#d8ceb4';for(let i=0;i<ri(5,9);i++)parts.push(cy(.02,.024,rr(.25,.45),5,rr(-.3,.3),.03+rr(0,.06),rr(-.25,.25),shade(b,rr(.8,1)),Math.PI/2,rr(0,6),rr(-.2,.2)));
    if(rnd()<.4)parts.push([new THREE.SphereGeometry(.1,8,6),b,_m4(rr(-.15,.15),.09,rr(-.1,.1),0,0,0,1,.9,1.15)]);   // skull — not in every pile
    return {parts,w:.6,d:.5,h:.15,soft:1}},
  skeleton(){return {parts:skelLying(),w:1.8,d:.55,h:.2,soft:1}},
  remains(){return {parts:skelSitting(),w:.6,d:1,h:.8,soft:1}},
  candles(){const parts=[cy(.2,.24,.015,10,0,.008,0,'#e0d4b8')];for(let i=0;i<ri(3,6);i++){const h=rr(.08,.32);parts.push(cy(.025,.03,h,7,rr(-.13,.13),h/2,rr(-.13,.13),shade('#e8dcc0',rr(.85,1))))}
    return {parts,w:.4,d:.4,h:.3,soft:1,light:1}},
  drum(){const st=TH.snow?'#9a9a9c':pick(['#b8a888','#c4b494','#a89878']),r=rr(.32,.42),h=rr(.4,.7),parts=[];
    const g=new THREE.CylinderGeometry(r,r,h,14,2),p=g.attributes.position;for(let i=0;i<p.count;i++){const a=Math.atan2(p.getZ(i),p.getX(i)),k=1-.06*(Math.cos(a*14)>.3?1:0);p.setX(i,p.getX(i)*k);p.setZ(i,p.getZ(i)*k);if(p.getY(i)>0)p.setY(i,p.getY(i)+Math.sin(a*3)*.06)}
    const lying=rnd()<.45;parts.push([g,st,lying?_m4(0,r,0,0,0,Math.PI/2):_m4(0,h/2,0)]);
    let top=h-.03;if(!lying&&rnd()<.4){parts.push([new THREE.CylinderGeometry(r*.95,r,h*.7,14),shade(st,.95),_m4(0,h+h*.35,0)]);top=h*1.7}
    if(lying)snowCap(parts,h*.85,r*.55,r*2-.02);else snowDisc(parts,r*.94,top);return {parts,w:lying?h+.1:r*2+.1,d:r*2+.1,h:lying?r*2:h,round:!lying}},
  wheel(){const wd='#5e4428',parts=[[new THREE.TorusGeometry(.48,.05,5,16),wd,_m4(0,.5,0)],cy(.08,.08,.14,8,0,.5,0,shade(wd,.8),Math.PI/2)];
    for(let i=0;i<8;i++)parts.push(bx(.04,.88,.04,0,.5,0,wd,0,0,i*Math.PI/8));
    const m=new THREE.Matrix4().makeRotationX(-.22);parts.forEach(p=>p[2]=m.clone().multiply(p[2]));
    return {parts,w:1.0,d:.3,h:1,lean:1}},
  logs(){const bk='#5a4030',end='#a8885a',parts=[];let k=0;
    for(const [n,y] of [[3,.12],[2,.34],[1,.56]])for(let i=0;i<n;i++){const x=(i-(n-1)/2)*.25,z=x+rr(-.02,.02);parts.push(cy(.12,.12,1.1,7,0,y,z,bk,Math.PI/2,Math.PI/2,0));
      for(const s of [-1,1])parts.push(cy(.112,.112,.01,7,s*.552,y,z,end,0,0,Math.PI/2));
      // snow sits as a ridge on top of each log (not a slab over the whole pile)
      if(TH.snow)parts.push(bx(rr(.85,1.05),.04,.12,rr(-.04,.04),y+.108,z,'#eef3fa'));k++}
    return {parts,w:1.15,d:.8,h:.7}},
  brazier(){const ir='#2a2622',parts=[];for(let i=0;i<3;i++){const a=i*2.094;parts.push(cy(.025,.03,.8,5,Math.cos(a)*.16,.4,Math.sin(a)*.16,ir,Math.sin(a)*.18,0,-Math.cos(a)*.18))}
    parts.push(lathe([[0,0],[.2,0],[.28,.12],[.3,.16],[0,.16]],10,'#3a3430',_m4(0,.78,0)),cy(.24,.24,.04,10,0,.92,0,'#ff7a30'),cy(.2,.2,.05,8,0,.94,0,'#401a10'));
    if(TH.snow)parts.push(cy(.29,.27,.03,10,0,.95,0,'#eef3fa'));return {parts,w:.65,d:.65,h:1,round:1,fire:1}},
  rack(){const wd='#4a3020',ir='#8a8a90',parts=[bx(1,.06,.2,0,.3,0,wd),bx(1,.06,.2,0,1.3,0,wd),bx(.06,1.5,.06,-.45,.75,-.05,wd),bx(.06,1.5,.06,.45,.75,-.05,wd)];
    for(let i=0;i<4;i++){const x=-.33+i*.22;parts.push(bx(.025,1.25,.012,x,.85,.06,ir,0,0,rr(-.05,.05)),bx(.12,.03,.04,x,.4,.06,'#3a2a1a'))}
    return {parts,w:1.0,d:.3,h:1.5,tall:1}},


  // --- tomb ---
  // a jackal-headed guardian in black stone and gold: staff in one hand, the other at its side
  statue(){const st='#2a2a30',gd='#c8a040',bl='#2a4a9a',parts=[bx(.7,.3,.6,0,.15,0,'#8a7454'),bx(.74,.05,.64,0,.31,0,'#a08a64')];
    parts.push(bx(.12,.62,.16,-.09,.64,.02,st),bx(.12,.62,.16,.09,.64,.02,st),bx(.13,.05,.24,-.09,.355,.05,st),bx(.13,.05,.24,.09,.355,.05,st));
    parts.push([new THREE.CylinderGeometry(.16,.24,.3,4),gd,_m4(0,1.02,0,0,Math.PI/4,0,1,1,.6)],bx(.34,.06,.2,0,1.19,0,gd));
    parts.push(bx(.32,.42,.18,0,1.42,0,st),bx(.46,.1,.2,0,1.62,0,st),bx(.4,.06,.21,0,1.55,.005,gd),bx(.36,.04,.215,0,1.5,.007,bl));
    for(const s of [-1,1])parts.push(bx(.09,.5,.1,s*.27,1.36,0,st),bx(.1,.06,.11,s*.27,1.16,.01,gd));
    parts.push(cy(.022,.022,1.9,6,.3,1.05,.12,gd),bx(.12,.06,.04,.3,2,.12,gd,0,0,.3),bx(.06,.14,.06,.3,1.25,.07,st));
    // head: nemes headdress in stripes, a long muzzle and tall ears
    parts.push(bx(.1,.12,.1,0,1.72,0,st),bx(.2,.18,.2,0,1.86,0,st),bx(.09,.08,.22,0,1.82,.17,st),bx(.07,.04,.06,0,1.82,.29,'#141418'));
    for(const s of [-1,1])parts.push([new THREE.ConeGeometry(.045,.2,4),st,_m4(s*.06,2.04,-.02,0,0,-s*.12)],bx(.08,.3,.04,s*.14,1.72,.04,s<0?gd:bl),bx(.012,.012,.012,s*.05,1.9,.1,'#e8c050'));
    parts.push(bx(.22,.06,.24,0,1.94,0,gd),bx(.06,.18,.05,0,1.68,-.08,gd));
    return {parts,w:.74,d:.64,h:2.2,tall:1}},
  // four canopic jars on a low chest, their lids carved as heads
  canopic(){const parts=[bx(.9,.24,.34,0,.12,0,'#8a6a44'),bx(.94,.04,.38,0,.25,0,'#c8a040')],jar='#e0cca4',heads=[['#d8c4a0',0],['#6a7a5a',1],['#2a2a30',2],['#a06a3a',3]];
    heads.forEach(([c,k],i)=>{const x=-.33+i*.22;parts.push(lathe([[0,0],[.06,0],[.085,.08],[.08,.2],[.06,.26],[0,.26]],8,jar,_m4(x,.27,0)),cy(.065,.06,.03,8,x,.54,0,'#c8a040'));
      parts.push([new THREE.SphereGeometry(.06,7,5),c,_m4(x,.6,0,0,0,0,1,1.1,1)]);
      if(k===1)parts.push([new THREE.ConeGeometry(.025,.08,4),c,_m4(x,.61,.07,Math.PI/2,0,0)]);
      if(k===2)for(const s of [-1,1])parts.push([new THREE.ConeGeometry(.018,.08,4),c,_m4(x+s*.03,.69,0)]);
      if(k===3)parts.push(bx(.04,.03,.06,x,.6,.07,c))});
    return {parts,w:.94,d:.38,h:.7}},
  // a tall amphora of fired clay, two handles, a painted band
  amphora(){const c=pick(['#b0683e','#a05a34','#c07848']),pr=[[0,0],[.04,0],[.07,.06],[.17,.3],[.19,.5],[.15,.7],[.07,.82],[.06,.95],[.09,.98],[0,.98]],parts=[lathe(pr,10,c)];
    parts.push(cy(.192,.188,.08,10,0,.48,0,'#2a1a10',0,0,0,true));for(const s of [-1,1])parts.push([new THREE.TorusGeometry(.08,.016,4,8,Math.PI),shade(c,.9),_m4(s*.09,.86,0,0,s>0?0:Math.PI,-Math.PI/2,1,1.3,1)]);
    if(rnd()<.35)return {parts:parts.map(p=>[p[0],p[1],_m4(0,.17,0,0,0,Math.PI/2-.08).multiply(p[2])]),w:1.0,d:.42,h:.4,soft:1};   // knocked over
    return {parts,w:.42,d:.42,h:.98,round:1}},
  // a heap of gold: coins, cups, a crown and a few gems
  treasure(){const g='#d8a838',parts=[[new THREE.SphereGeometry(.4,10,5,0,Math.PI*2,0,Math.PI/2),g,_m4(0,0,0,0,0,0,1,.42,.8)]];
    for(let i=0;i<22;i++){const a=rr(0,6.28),d=Math.sqrt(rnd())*.42,y=.17*Math.sqrt(Math.max(0,1-(d*d)/(.4*.4)))*.98;parts.push(cy(.04,.04,.01,8,Math.cos(a)*d,y,Math.sin(a)*d*.8,pick([g,'#f0c860','#c09030']),rr(-.5,.5),0,rr(-.5,.5)))}
    parts.push(lathe([[0,0],[.05,0],[.02,.03],[.02,.1],[.07,.14],[.07,.2],[0,.15]],8,'#e8c050',_m4(rr(-.15,.15),.1,rr(-.1,.1),rr(-.2,.2),0,rr(-.3,.3))));
    parts.push(cy(.09,.09,.06,8,-.22,.08,.1,'#e8c050',.3,0,.2,true));
    for(let i=0;i<5;i++)parts.push([new THREE.OctahedronGeometry(.035,0),pick(['#e8102a','#1e4ee8','#14b45a','#9a50d8']),_m4(rr(-.3,.3),.12+rr(0,.06),rr(-.2,.2),rr(0,6),rr(0,6),0)]);
    return {parts,w:.85,d:.7,h:.25,soft:1}},
  // a gilded sarcophagus: a painted face at the head, crossed arms, bands of blue
  goldsarc(){const g='#c8a040',b='#1e3a7a',parts=[bx(2,.5,.75,0,.25,0,'#8a6a3a'),bx(2.06,.06,.81,0,.03,0,shade('#8a6a3a',.8))];
    parts.push(bx(1.92,.12,.68,0,.56,0,g),[new THREE.CylinderGeometry(.34,.34,1.6,10,1,false,0,Math.PI),g,_m4(.12,.62,0,0,0,Math.PI/2,1,1,.45)]);
    for(const x of [-.4,-.1,.2,.5])parts.push([new THREE.CylinderGeometry(.345,.345,.06,10,1,true,0,Math.PI),b,_m4(x,.62,0,0,0,Math.PI/2,1,1,.46)]);
    parts.push([new THREE.SphereGeometry(.24,10,6),g,_m4(-.82,.74,0,0,0,0,.8,.75,1)],bx(.16,.18,.2,-.97,.74,0,'#d8b880'),bx(.03,.03,.05,-1.06,.79,-.05,'#141418'),bx(.03,.03,.05,-1.06,.79,.05,'#141418'));
    for(const s of [-1,1])parts.push(bx(.12,.3,.08,-.82,.62,s*.25,b),bx(.32,.05,.08,-.35,.86,s*.06,'#d8b880',0,s*.4,0));
    return {parts,w:2.1,d:.84,h:.98,long:1}},

  // --- cistern ---
  // a fallen column capital, its acanthus leaves worn smooth
  capital(){const st=pick(['#8a8c80','#7e8076','#949688']),parts=[bx(.7,.12,.7,0,.06,0,shade(st,.9),0,rr(0,1),0),lathe([[.18,.12],[.26,.2],[.33,.42],[.36,.5],[0,.5]],10,st)];
    for(let i=0;i<8;i++){const a=i*.785;parts.push([new THREE.ConeGeometry(.06,.24,4),shade(st,1.08),_m4(Math.cos(a)*.27,.32,Math.sin(a)*.27,Math.sin(a)*.4,0,-Math.cos(a)*.4)])}
    const tilt=rr(.25,.5);return {parts:parts.map(p=>[p[0],p[1],_m4(0,.12,0,tilt,0,0).multiply(p[2])]),w:.8,d:.8,h:.55,round:1,soft:1}},
  // a carved Medusa head lying on its side at the foot of a column, snakes for hair
  medusa(){const st=pick(['#7e8274','#8a8c80']),parts=[bx(.7,.55,.4,0,.27,-.04,shade(st,.85))],H=new THREE.Matrix4().makeTranslation(0,.3,.14).multiply(_rot(0,0,Math.PI/2));
    const head=[[new THREE.SphereGeometry(.2,9,7),st,_m4(0,0,0,0,0,0,1,1.15,.85)],bx(.05,.08,.06,0,-.01,.17,shade(st,1.05)),bx(.1,.02,.03,0,-.11,.15,shade(st,.6)),
      bx(.05,.025,.03,-.07,.05,.16,shade(st,.55)),bx(.05,.025,.03,.07,.05,.16,shade(st,.55))];
    for(let i=0;i<9;i++){const a=-1.2+i*.3;head.push([new THREE.TorusGeometry(.05,.016,4,7,Math.PI*1.4),shade(st,rr(.85,1.05)),_m4(Math.sin(a)*.22,Math.cos(a)*.24,-.02,rr(-.5,.5),0,a)])}
    parts.push(...xform(head,H));return {parts,w:.74,d:.5,h:.6}},
  // boards drifting on the water
  planks(){const wd=pick(['#4a3824','#3e3020','#54402a']),parts=[];for(let i=0;i<ri(2,4);i++)parts.push(bx(rr(.9,1.4),.04,rr(.14,.2),rr(-.15,.15),i*.012,rr(-.25,.25),shade(wd,rr(.8,1.1)),0,rr(-.5,.5),0));
    return {parts,w:1.3,d:.7,h:.06,soft:1,floatY:1}},

  // --- desert ---
  // a cluster of small clay pots, one broken: low enough to step through (soft), so it never blocks a passage
  pots(){const parts=[];for(let i=0;i<ri(3,5);i++){const c=pick(['#c47a4a','#d08a58','#b87448','#d89c68']),s=rr(.55,1),a=rr(0,6.28),d=i?rr(.15,.3):0,h=.42*s;
      parts.push(lathe([[0,0],[.08*s,0],[.15*s,.12*s],[.16*s,.24*s],[.1*s,.36*s],[.07*s,h],[.09*s,h+.02],[0,h]],9,c,_m4(Math.cos(a)*d,0,Math.sin(a)*d)))}
    parts.push(...[0,1,2].map(i=>bx(rr(.06,.12),.015,rr(.05,.1),rr(-.35,.35),.008,rr(-.3,.3),'#9a5a34',0,rr(0,6),0)));
    return {parts,w:.7,d:.7,h:.45,round:1,soft:1}},
  // sandstone boulders broken off the walls
  rocks(){const parts=[],c=TH.brick;for(let i=0;i<ri(2,4);i++){const r=i?rr(.12,.22):rr(.25,.34),a=rr(0,6.28),d=i?rr(.2,.4):0;
      parts.push([new THREE.IcosahedronGeometry(r,0),shade(pick(c),rr(.8,1)),_m4(Math.cos(a)*d,r*.55,Math.sin(a)*d,rr(0,6),rr(0,6),0,1.2,.75,1)])}
    return {parts,w:.8,d:.8,h:.45,round:1,soft:1}},
  // the bleached skull of an ox with its horns
  ox(){const b='#e8dcc0',parts=[[new THREE.SphereGeometry(.11,8,6),b,_m4(0,.1,-.04,0,0,0,1.1,.85,1)],bx(.12,.08,.26,0,.07,.12,b,-.15,0,0),bx(.03,.03,.02,-.05,.11,.05,'#2a2018'),bx(.03,.03,.02,.05,.11,.05,'#2a2018')];
    for(const s of [-1,1])parts.push(limb(V3(s*.09,.13,-.05),V3(s*.26,.2,-.02),.035,.022,b),limb(V3(s*.26,.2,-.02),V3(s*.3,.32,.06),.022,.006,shade(b,.9)));
    parts.push(cy(.02,.02,.3,5,.25,.02,.2,b,Math.PI/2,.8,0));return {parts,w:.7,d:.5,h:.3,soft:1}},

  // --- graveyard ---
  // a headstone with a low grassy mound in front of it; low enough to step past (soft), like the other knee-high props
  grave(){const st=pick(['#7a7a76','#6e6e6c','#86847e']),parts=[],tilt=rr(-.12,.12),lean=rr(-.08,.08);
    const stone=[bx(.56,.62,.1,0,.31,0,st),[new THREE.CylinderGeometry(.28,.28,.1,10,1,false,Math.PI/2,Math.PI),st,_m4(0,.62,0,Math.PI/2,0,0)],bx(.4,.04,.012,0,.48,.056,shade(st,.7)),bx(.3,.03,.012,0,.38,.056,shade(st,.7))];
    parts.push(...xform(stone,_m4(0,0,-.32,tilt,0,lean)),bx(.66,.06,.18,0,.03,-.32,shade(st,.8)));
    parts.push([new THREE.SphereGeometry(.4,9,4,0,Math.PI*2,0,Math.PI/2),pick(['#2e3a22','#36402a','#3a3a2a']),_m4(0,0,.15,0,0,0,.75,.32,1.3)]);
    if(rnd()<.4)for(let i=0;i<3;i++)parts.push([new THREE.IcosahedronGeometry(.03,0),pick(['#a02020','#e8e0c0','#7a3a8a']),_m4(rr(-.15,.15),.13,rr(-.05,.3))]);
    return {parts,w:.72,d:1.0,h:.72,soft:1}},
  // a stone obelisk on a stepped plinth, an inscribed panel on its face
  obelisk(){const st=pick(['#7a7a76','#6a6a66','#848078']),dk=shade(st,.85),parts=[],Z=-.3;
    parts.push(bx(.5,.14,.44,0,.07,Z,dk),bx(.38,.16,.32,0,.22,Z,st),[new THREE.CylinderGeometry(.1,.15,1.0,4),st,_m4(0,.8,Z,0,Math.PI/4,0)],
      [new THREE.ConeGeometry(.072,.16,4),shade(st,1.08),_m4(0,1.38,Z,0,Math.PI/4,0)],bx(.12,.2,.012,0,.62,Z+.12,shade(st,.7),-.05,0,0));
    parts.push([new THREE.SphereGeometry(.36,8,4,0,Math.PI*2,0,Math.PI/2),'#2e3a22',_m4(0,0,.25,0,0,0,.7,.28,1.0)]);
    return {parts,w:.6,d:1.0,h:1.46,tall:1,col:[Z,.46]}},
  // a draped funeral urn on a square pedestal
  urnstone(){const st=pick(['#7e7c76','#72706a']),dk=shade(st,.85),Z=-.3,parts=[bx(.46,.1,.46,0,.05,Z,dk),bx(.34,.6,.34,0,.4,Z,st),bx(.42,.07,.42,0,.73,Z,dk)];
    parts.push(lathe([[0,0],[.08,0],[.06,.04],[.15,.14],[.17,.24],[.12,.34],[.07,.38],[.09,.42],[0,.44]],10,st,_m4(0,.765,Z)));
    parts.push(lathe([[.176,0],[.18,.06],[.16,.14],[.12,.2]],10,shade(st,1.1),_m4(0,.93,Z,0,0,.12)),[new THREE.SphereGeometry(.03,6,4),st,_m4(0,1.22,Z)]);
    parts.push([new THREE.SphereGeometry(.36,8,4,0,Math.PI*2,0,Math.PI/2),'#2e3a22',_m4(0,0,.22,0,0,0,.7,.28,1.0)]);
    return {parts,w:.6,d:1.0,h:1.25,tall:1,col:[Z,.48]}},
  // a broken slab tilted on its mound
  headstone(){const st=pick(['#6a6a68','#767470','#5e5e5a']),parts=[];const k=rnd()<.4;
    parts.push(...xform([bx(.5,k?.4:.75,.12,0,k?.2:.37,0,st),bx(.36,.05,.014,0,k?.3:.55,.065,shade(st,.6))],_m4(0,0,-.3,rr(-.25,.1),0,rr(-.15,.15))));
    if(k)parts.push(bx(.42,.1,.3,.1,.05,.1,st,0,rr(0,1),rr(-.2,.2)));
    parts.push([new THREE.SphereGeometry(.38,8,4,0,Math.PI*2,0,Math.PI/2),'#2a3420',_m4(0,0,.2,0,0,0,.72,.28,1.2)]);return {parts,w:.66,d:.95,h:.8,soft:1}},
  // a headstone with an iron lantern standing on it: a base, four corner posts, glowing panes, a hipped roof and a ring
  gravelamp(){const st=pick(['#7a7a76','#6e6e6c']),ir='#24221e',Z=-.3,parts=[bx(.5,.7,.14,0,.35,Z,st),bx(.58,.08,.22,0,.74,Z,shade(st,.85))];
    const y0=.78,H=.24,yc=y0+.03+H/2;
    parts.push(bx(.19,.03,.19,0,y0+.015,Z,ir),bx(.17,.02,.17,0,y0+.03+H,Z,ir));
    for(const [a,b] of [[-1,-1],[-1,1],[1,-1],[1,1]])parts.push(bx(.02,H,.02,a*.075,yc,Z+b*.075,ir));
    for(const [x,z,ry] of [[0,.068,0],[0,-.068,0],[.068,0,Math.PI/2],[-.068,0,Math.PI/2]])parts.push(bx(.13,H-.02,.006,x,yc,Z+z,'#ffb850',0,ry,0).concat(.9),
      bx(.012,H-.02,.01,x,yc,Z+z,ir,0,ry,0));
    parts.push([new THREE.ConeGeometry(.15,.11,4),ir,_m4(0,y0+.04+H+.055,Z,0,Math.PI/4,0)],[new THREE.SphereGeometry(.018,6,4),ir,_m4(0,y0+H+.16,Z)],
      [new THREE.TorusGeometry(.035,.007,4,10),ir,_m4(0,y0+H+.205,Z)]);
    parts.push([new THREE.SphereGeometry(.38,8,4,0,Math.PI*2,0,Math.PI/2),'#2e3a22',_m4(0,0,.15,0,0,0,.72,.3,1.25)]);
    return {parts,w:.66,d:.95,h:1.25,light:1,lightY:yc,lightZ:Z,col:[Z,.26]}},
  // a little iron fence round a plot, one rail bent
  fence(){const ir='#26242a',parts=[];const W2=1.1,D2=.7;
    for(let i=0;i<=6;i++){const x=-W2/2+i*W2/6;parts.push(cy(.012,.012,.6,4,x,.3,D2/2,ir),[new THREE.ConeGeometry(.025,.07,4),ir,_m4(x,.63,D2/2)],cy(.012,.012,.6,4,x,.3,-D2/2,ir))}
    for(let i=1;i<4;i++){const z=-D2/2+i*D2/4;for(const s of [-1,1])parts.push(cy(.012,.012,.6,4,s*W2/2,.3,z,ir))}
    for(const y of [.12,.5])for(const z of [-D2/2,D2/2])parts.push(bx(W2,.02,.02,0,y,z,ir,0,0,z>0&&y>.4?rr(-.08,.08):0));
    for(const y of [.12,.5])for(const s of [-1,1])parts.push(bx(.02,.02,D2,s*W2/2,y,0,ir));
    parts.push([new THREE.SphereGeometry(.4,8,4,0,Math.PI*2,0,Math.PI/2),'#2e3a22',_m4(0,0,0,0,0,0,1.1,.3,.7)],bx(.4,.5,.08,0,.25,-.26,'#74726c'));
    return {parts,w:1.16,d:.76,h:.68}},
};

// --- remains: skeletons and mummies ---
const BONE='#d4cab0';
const _rot=(x,y,z)=>new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(x,y,z,'YXZ'));
const xform=(parts,m)=>parts.map(p=>[p[0],p[1],m.clone().multiply(p[2])]);
// skull centered at origin: face to +Z, crown to +Y
function skullParts(b=BONE){const dk='#1a140e';return [[new THREE.SphereGeometry(.1,8,6),b,_m4(0,0,0,0,0,0,1,.92,1.15)],bx(.1,.05,.07,0,-.065,.07,shade(b,.92)),
  bx(.036,.032,.02,-.036,0,.108,dk),bx(.036,.032,.02,.036,0,.108,dk),bx(.016,.026,.02,0,-.035,.112,dk)]}
// lying on its back along X, head to -X; some bones scattered or missing
function skelLying(b=BONE){const P=[],lost=()=>rnd()<.12,c=()=>shade(b,rr(.82,1));
  P.push(...xform(skullParts(b),new THREE.Matrix4().makeTranslation(-.8,.11,rr(-.03,.03)).multiply(_rot(0,Math.PI/2,0)).multiply(_rot(-Math.PI/2,0,0)).multiply(_rot(0,rr(-.7,.7),0))));
  P.push(cy(.018,.02,.62,5,-.38,.035,0,c(),0,0,Math.PI/2),cy(.012,.012,.28,4,-.69,.04,0,c(),Math.PI/2,0,0));
  const sq=rr(.45,.8);for(let i=0;i<6;i++)if(rnd()>.1)P.push([new THREE.TorusGeometry(.11-i*.005,.011,4,8,Math.PI),c(),_m4(-.63+i*.065,.03,0,0,Math.PI/2,rr(-.1,.1),1,sq,1)]);
  P.push(bx(.1,.06,.24,-.02,.035,0,c()));
  for(const sd of [-1,1]){if(!lost())P.push(cy(.018,.016,.3,5,-.53,.03,sd*.2,c(),0,rr(-.15,.15),Math.PI/2));
    if(rnd()<.5)P.push(cy(.014,.012,.26,5,-.25,.025,sd*.22,c(),0,rr(-.1,.1),Math.PI/2),bx(.07,.02,.05,-.08,.012,sd*.22,c()));
    else P.push(cy(.014,.012,.26,5,-.3,.06,sd*.08,c(),0,sd*.9,Math.PI/2));                       // arms folded on the belly
    const sp=rr(0,.12);if(!lost())P.push(cy(.024,.02,.42,5,.21,.035,sd*(.09+sp/2),c(),0,-sd*sp,Math.PI/2));
    if(!lost())P.push(cy(.018,.015,.38,5,.62,.03,sd*(.11+sp),c(),0,-sd*sp*.5,Math.PI/2),bx(.1,.03,.06,.86,.016,sd*(.12+sp*1.2),c()))}
  if(rnd()<.4)P.push(cy(.02,.02,.4,5,rr(-.4,.6),.02,rr(.25,.4)*pick([-1,1]),c(),Math.PI/2,rr(0,6),0));   // a bone rolled off to the side
  return P}
// sitting against the wall (wall in plane z=-.5), legs stretched forward
function skelSitting(b=BONE){const P=[],c=()=>shade(b,rr(.82,1)),Z=w=>w-.5,lean=rr(-.12,.12);
  P.push(bx(.24,.07,.1,0,.07,Z(.16),c()),cy(.02,.02,.52,5,0,.35,Z(.13),c(),-.16,0,lean*.5),cy(.012,.012,.32,4,lean*.3,.6,Z(.1),c(),0,0,Math.PI/2));
  for(let i=0;i<5;i++)P.push([new THREE.TorusGeometry(.12-i*.006,.011,4,8,Math.PI),c(),_m4(lean*.15*i,.3+i*.06,Z(.13),Math.PI/2,0,0,1,.8,1)]);
  const onFloor=rnd()<.2;
  P.push(...xform(skullParts(b),onFloor?new THREE.Matrix4().makeTranslation(rr(-.15,.15),.1,Z(rr(.6,.9))).multiply(_rot(rr(-.4,.4),rr(0,6),Math.PI/2*pick([-1,1])))
    :new THREE.Matrix4().makeTranslation(lean*.4,.72,Z(.16)).multiply(_rot(rr(.3,.7),rr(-.5,.5),lean*2))));
  for(const sd of [-1,1]){P.push(cy(.018,.016,.3,5,sd*.19,.44,Z(.15),c(),.15,0,-sd*.1));
    if(rnd()<.75)P.push(cy(.014,.012,.31,5,sd*.19,.21,Z(.36),c(),-.95,0,0),bx(.05,.02,.08,sd*.18,.03,Z(.53),c()));
    const k=rnd()<.25?.18:0;           // sometimes one knee raised
    P.push(cy(.024,.02,.42,5,sd*.1,.08+k*(sd>0?1:0),Z(.4),c(),Math.PI/2-(sd>0?k*.9:0),0,0),cy(.018,.015,.38,5,sd*.12,.05+(sd>0?k*.5:0),Z(.78-(sd>0?k*.3:0)),c(),Math.PI/2+(sd>0?k:0),0,0),
      bx(.07,.04,.1,sd*.13,.03,Z(.98-(sd>0?k*.4:0)),c()))}
  return P}
// mummy: swaddled body along X, head to -X; bandages are dark strips on top
function mummyParts(){const L=pick(['#8c7c5c','#7e7054','#9a8a68']),D=shade(L,.7),P=[];
  const fl=(rt,rb,h,x,y,sx,sz,col,open)=>[new THREE.CylinderGeometry(rt,rb,h,9,1,!!open),col,_m4(x,y,0,0,0,Math.PI/2,sx,1,sz)];
  P.push([new THREE.SphereGeometry(.11,8,6),L,_m4(-.8,.12,0,0,0,0,1.25,.85,1)],fl(.06,.06,.12,-.68,.11,.8,1,L),fl(.14,.13,.56,-.38,.13,.72,1.25,L),
    fl(.13,.06,.86,.3,.1,.72,1.15,L),[new THREE.SphereGeometry(.07,7,5),L,_m4(.76,.08,0,0,0,0,1,.8,1.2)]);
  for(const sd of [-1,1])P.push([new THREE.CylinderGeometry(.035,.032,.36,6),shade(L,.95),_m4(-.42,.22,0,0,sd*.7,Math.PI/2)]);
  for(let x=-.75;x<.72;x+=rr(.06,.12)){if(x>-.72&&x<-.62)continue;const r=x<-.66?.115:x<-.1?.145:lerp(.13,.06,(x+.13)/.86),y=x<-.66?.12:x<-.1?.13:.1;
    P.push([new THREE.CylinderGeometry(r+.006,r+.006,.022,9,1,true),shade(D,rr(.85,1.1)),_m4(x,y,0,0,rr(-.25,.25),Math.PI/2,x<-.66?.8:.72,1,x<-.66?1:1.2)])}
  return P}

// --- theme sets: [template, weight] ---
const PROP_SETS={
  dungeon:{wall:[['barrel',4],['crate',4],['sack',3],['cabinet',2],['shelf',1],['rack',1],['candles',1],['skeleton',.8],['remains',.8]],dead:'chest',dens:.22,webs:.5},
  catacombs:{wall:[['coffin',5],['bones',3],['candles',3],['crate',1],['skeleton',1.5],['remains',1.5]],dead:'coffin',dens:.25,webs:.7},
  ruins:{wall:[['drum',4],['crate',2],['barrel',2],['wheel',2],['sack',1],['skeleton',.5],['remains',.6]],dead:'chest',dens:.18},
  winter:{wall:[['logs',3],['barrel',3],['crate',3],['drum',3],['wheel',1],['skeleton',.4],['remains',.5]],dead:'chest',dens:.18},
  tomb:{wall:[['amphora',3],['canopic',2],['urn',2],['statue',1.4],['treasure',1],['goldsarc',.8],['bones',1.5],['skeleton',1],['remains',1],['sack',.8]],dead:'chest',dens:.25,webs:.6},
  cistern:{wall:[['drum',3],['capital',2],['medusa',.8],['barrel',2],['crate',2],['planks',2.5],['skeleton',.5],['remains',.6]],dead:'chest',dens:.2,webs:.3,noBrazier:1},
  desert:{wall:[['amphora',3],['pots',2.5],['drum',2.5],['urn',1.5],['rocks',2.5],['crate',1.2],['sack',1.2],['ox',1],['skeleton',.6],['remains',.6]],dead:'chest',dens:.2},
  graveyard:{wall:[['grave',5],['obelisk',2.2],['headstone',3],['urnstone',2.6],['gravelamp',3.2],['fence',1.5],['coffin',.8],['bones',.8]],dead:'chest',dens:.44,webs:.15},
};

function buildProps(root){
  const set=PROP_SETS[game.theme],T={},list=[],placed=[];
  const tpl=name=>{if(!T[name]){T[name]=[];for(let i=0;i<3;i++){const t=PROPS[name]();t.geo=mergeParts(t.parts);t.parts=null;T[name].push(t)}}return pick(T[name])};
  const sx=W.start.x,sz=W.start.z,ec=warp(W.exitCell.i+.5,W.exitCell.j+.5);
  const free=(x,z,r)=>Math.hypot(x-sx,z-sz)>2.4&&Math.hypot(x-ec[0],z-ec[1])>2.4&&placed.every(p=>Math.hypot(p.x-x,p.z-z)>p.r+r+.25);
  const geos=[],idx=new Map(),stamps=[],base=W.occ.occ.slice();let grp=0;
  const put=(t,x,y,z,yaw,solid=true)=>{if(!idx.has(t.geo)){idx.set(t.geo,geos.length);geos.push(t.geo)}
    const k=rr(.9,1.06);pushInst(list,x,y,z,0,yaw,0,1,1,1,new THREE.Color(k,k,k),idx.get(t.geo));list[list.length-1].g=grp;
    // col = [offset, depth]: graves block only at the stone, the low mound in front of it can be walked over
    if(solid&&!t.soft){const w=t.w/2,d=(t.col?t.col[1]:t.d)/2,c=Math.cos(yaw),s=Math.sin(yaw),a=w>=d,L=Math.max(0,(a?w-d:d-w)),r=Math.min(w,d);
      const cz=t.col?t.col[0]:0,ox=x+s*cz,oz=z+c*cz,ax=a?c:s,az=a?-s:c,st=[[ox-ax*L,oz-az*L],[ox+ax*L,oz+az*L],r+.02,grp];stamps.push(st);occStamp(...st)}
    // a light set off the prop's centre (a lantern on a headstone) turns with it
    const lx=x+Math.sin(yaw)*(t.lightZ||0),lz=z+Math.cos(yaw)*(t.lightZ||0);
    if(t.light)W.lights.push({x:lx,y:y+(t.lightY||.42),z:lz,base:y+(t.lightY||.42)-.2,kind:'cluster',nx:0,nz:0,g:grp});
    if(t.fire){const fy=t.fireY||1.15,fx=x+Math.sin(yaw)*(t.fireY?.36:0),fz=z+Math.cos(yaw)*(t.fireY?.36:0);W.lights.push({x:fx,y:y+fy,z:fz,base:y+fy-.2,kind:'brazier',nx:0,nz:0,g:grp})}};
  const weighted=a=>{let s=0;for(const [,w] of a)s+=w;let r=rnd()*s;for(const [n,w] of a){r-=w;if(r<=0)return n}return a[0][0]};
  // along walls
  for(const fc of W.faces)for(let u=0;u<Math.max(1,Math.round(fc.sg.len/CS));u++){if(fc.outer||rnd()>set.dens)continue;const L=fc.sg.len;
    const zf=faceAt(fc,L/2),name=zoneAt(zf.x,zf.z)===0&&rnd()<.45&&!set.noBrazier?'brazier':weighted(set.wall),t=tpl(name),half=t.w/2;if(L<t.w+WT+.3||CW<2&&!t.round)continue;
    const s=rr(BD+.1+half,L-BD-.1-half),f=faceAt(fc,s),d=BD+.04+t.d/2,x=f.x+f.nx*d,z=f.z+f.nz*d,r=Math.max(t.w,t.d)/2;
    if(!free(x,z,r)||t.round&&wallDist(x,z)<r+.04||(W.crypts||[]).some(c=>Math.hypot(c.fx-x,c.fz-z)<1.2+r))continue;
    const yaw=Math.atan2(f.nx,f.nz)+(t.round?rr(0,6.28):rr(-.1,.1)),y=t.floatY&&TH.water?TH.water-.02:floorH(x,z)-.02;
    grp++;put(t,x,y,z,yaw);placed.push({x,z,r,n:name,nx:f.nx,nz:f.nz,g:grp});if(t.tall)W.tall.push({x,z});
    // clusters: barrels, sacks, crates together; crates stacked
    if((name==='barrel'||name==='sack'||name==='urn'||name==='crate')&&rnd()<.35)for(const sd of [-1,1]){if(rnd()<.45)continue;
      const t2=tpl(name),off=(t.w+t2.w)/2+rr(.02,.12),x2=x+fc.sg.at(s).tx*off*sd,z2=z+fc.sg.at(s).tz*off*sd,r2=Math.max(t2.w,t2.d)/2;
      if(s+off*sd<BD+.1+t2.w/2||s+off*sd>L-BD-.1-t2.w/2||!placed.every(p=>p.x===x&&p.z===z||Math.hypot(p.x-x2,p.z-z2)>p.r+r2+.25))continue;
      put(t2,x2,floorH(x2,z2)-.02,z2,yaw+(t2.round?rr(0,6):rr(-.15,.15)));placed.push({x:x2,z:z2,r:r2,g:grp})}
    if(name==='crate'&&rnd()<.4){const t2=tpl('crate');put(t2,x+rr(-.06,.06),y+t.h,z+rr(-.06,.06),yaw+rr(-.3,.3),false)}}
  // dead ends stay free: chests go there (js/05d-gameplay.js)
  const n=W.n,M=W.M;
  // props must not cut off the exit or any cell: remove those that split reachable areas
  const ep=[W.exitIn.x,W.exitIn.z],drop=new Set(),cells=[[ep[0],ep[1]]];
  for(let i=0;i<W.n;i++)for(let j=0;j<W.n;j++)cells.push(warp(i+.5,j+.5));
  const inCell=(A,c)=>[[0,0],[.3,0],[-.3,0],[0,.3],[0,-.3]].some(([a,b])=>A.has(c[0]+a*CW,c[1]+b*CW));
  for(let it=0;it<80;it++){const A=reachMap(W.start.x,W.start.z),lost=cells.find(c=>!inCell(A,c));if(!lost)break;
    const B=reachMap(...([[0,0],[.3,0],[-.3,0],[0,.3],[0,-.3]].map(([a,b])=>[lost[0]+a*CW,lost[1]+b*CW]).find(p=>freeR(p[0],p[1],.45))||lost));let found=0;
    for(const st of stamps){if(drop.has(st[3]))continue;const [p,q,r]=st,cx=(p[0]+q[0])/2,cz=(p[1]+q[1])/2,R=r+Math.hypot(p[0]-q[0],p[1]-q[1])/2+1.1;
      if(A.near(cx,cz,R)&&B.near(cx,cz,R)){drop.add(st[3]);found++}}
    if(!found){const st=stamps.find(s=>!drop.has(s[3]));if(!st)break;drop.add(st[3])}
    W.occ.occ.set(base);for(const st of stamps)if(!drop.has(st[3]))occStamp(...st)}
  // every open passage must stay walkable too: the maze has loops, so a corridor plugged by two props facing each other
  // leaves every cell reachable the long way round and slips past the check above. walk each passage from cell centre
  // to cell centre; if it is plugged, drop the prop nearest the middle of the passage and try again
  for(let i=0;i<n;i++)for(let j=0;j<n;j++)for(const [a,b] of [[1,0],[0,1]]){if(i+a>=n||j+b>=n||!M.open(i,j,a,b))continue;
    const m=warp(i+.5+a/2,j+.5+b/2),hw=CS/2+CW/2,inStrip=st=>!drop.has(st[3])&&[st[0],st[1]].some(p=>
      Math.abs(p[0]-m[0])<(a?hw:CW/2)+st[2]+.3&&Math.abs(p[1]-m[1])<(b?hw:CW/2)+st[2]+.3);
    // a passage with no prop by it has nothing to drop: only those with one are walked
    for(let it=0;it<6&&stamps.some(inStrip)&&!passOpen(i,j,a,b);it++){
      const c=stamps.filter(inStrip).sort((p,q)=>Math.hypot((p[0][0]+p[1][0])/2-m[0],(p[0][1]+p[1][1])/2-m[1])-Math.hypot((q[0][0]+q[1][0])/2-m[0],(q[0][1]+q[1][1])/2-m[1]))[0];
      drop.add(c[3]);W.occ.occ.set(base);for(const st of stamps)if(!drop.has(st[3]))occStamp(...st)}}
  if(drop.size){for(let i=list.length-1;i>=0;i--)if(drop.has(list[i].g))list.splice(i,1);W.lights=W.lights.filter(l=>!drop.has(l.g));
    for(let i=placed.length-1;i>=0;i--)if(drop.has(placed[i].g))placed.splice(i,1)}
  // burial niches: mummy, skeleton or a few bones; a rotted shroud on the floor
  if(W.crypts){const CT={};const ctpl=(name,f)=>{if(!CT[name]){CT[name]=[];for(let i=0;i<3;i++)CT[name].push({geo:mergeParts(f()),w:1,d:1})}return pick(CT[name])};
    for(const c of W.crypts){const r=rnd(),yaw=Math.atan2(-c.tz,c.tx)+(rnd()<.5?Math.PI:0);grp++;
      if(rnd()<.6)put(ctpl('shroud',()=>[bx(1.8,.012,.52,0,.006,0,'#3e3428'),bx(.5,.014,.4,rr(-.5,.5),.01,rr(-.05,.05),'#4a3e30',0,rr(-.3,.3),0)]),c.x,c.y,c.z,yaw,false);
      const t=r<.45?ctpl('mummy',mummyParts):r<.88?ctpl('skel',skelLying):ctpl('pile',()=>PROPS.bones().parts);
      put(t,c.x+c.nx*rr(-.04,.04),c.y+.012,c.z+c.nz*rr(-.04,.04),yaw+rr(-.04,.04),false)}}
  instance(root,list,geos,propMat(),true,CHUNK*2);W.propCount=list.length;W.placed=placed;
  // cobwebs in corners under the vault
  if(set.webs){const webs=[],wt=tex('web',mkWebTex);
    for(const fc of W.faces)for(let u=0;u<Math.max(1,Math.round(fc.sg.len/CS));u++){if(fc.outer||rnd()>set.webs*.35)continue;const s=rnd()<.5?.55:fc.sg.len-.55,f=faceAt(fc,s),x=f.x+f.nx*(BD+.18),z=f.z+f.nz*(BD+.18);
      pushInst(webs,x,ceilH(x,z)-.32,z,-.75,Math.atan2(f.nx,f.nz)+rr(-.3,.3),rr(-.3,.3),rr(.6,1),rr(.6,1),1,new THREE.Color(1,1,1),0)}
    instance(root,webs,[new THREE.PlaneGeometry(1,1)],new THREE.MeshLambertMaterial({map:wt,transparent:true,opacity:.75,alphaTest:.05,side:THREE.DoubleSide,depthWrite:false}),false)}}

// can the player walk from the centre of cell (i,j) to its neighbour (i+a,j+b)? flood fill (0.1 m step) inside the strip
// between the two centres, with some room to spare around the player's own radius
const PASS_R=.36;
function passOpen(i,j,a,b){const A=warp(i+.5,j+.5),B=warp(i+.5+a,j+.5+b),st=.1,x0=Math.min(A[0],B[0])-CW/2,z0=Math.min(A[1],B[1])-CW/2,
    gw=Math.ceil((Math.max(A[0],B[0])+CW/2-x0)/st),gh=Math.ceil((Math.max(A[1],B[1])+CW/2-z0)/st),seen=new Uint8Array(gw*gh),q=[];
  const P=(gx,gz)=>[x0+(gx+.5)*st,z0+(gz+.5)*st],near=(c,gx,gz)=>{const p=P(gx,gz);return Math.hypot(p[0]-c[0],p[1]-c[1])<.35};
  for(let gz=0;gz<gh;gz++)for(let gx=0;gx<gw;gx++)if(near(A,gx,gz)&&freeR(...P(gx,gz),PASS_R)){seen[gz*gw+gx]=1;q.push(gx,gz)}
  for(let h=0;h<q.length;h+=2){const gx=q[h],gz=q[h+1];if(near(B,gx,gz))return true;
    for(const [dx,dz] of DIRS){const nx=gx+dx,nz=gz+dz;if(nx<0||nz<0||nx>=gw||nz>=gh||seen[nz*gw+nx])continue;
      seen[nz*gw+nx]=1;if(freeR(...P(nx,nz),PASS_R))q.push(nx,nz)}}
  return false}
// flood fill of walkable points (0.2 m step); .45 m margin so props leave no tight gaps
function reachMap(x0,z0,rad=.45){const st=.2,b=W.b,gw=Math.ceil((b.x1-b.x0)/st),gh=Math.ceil((b.z1-b.z0)/st),seen=new Uint8Array(gw*gh);
  const ix=x=>Math.floor((x-b.x0)/st),iz=z=>Math.floor((z-b.z0)/st),q=[ix(x0),iz(z0)];seen[q[1]*gw+q[0]]=1;
  for(let h=0;h<q.length;h+=2){const gx=q[h],gz=q[h+1];
    for(const [dx,dz] of DIRS){const nx=gx+dx,nz=gz+dz;if(nx<0||nz<0||nx>=gw||nz>=gh||seen[nz*gw+nx])continue;
      if(!freeR(b.x0+(nx+.5)*st,b.z0+(nz+.5)*st,rad))continue;seen[nz*gw+nx]=1;q.push(nx,nz)}}
  const at=(x,z)=>{const a=ix(x),c=iz(z);return a>=0&&c>=0&&a<gw&&c<gh&&seen[c*gw+a]===1};
  return {has:(x,z)=>at(x,z)||at(x+st,z)||at(x-st,z)||at(x,z+st)||at(x,z-st),
    near:(x,z,R)=>{for(let dz=-R;dz<=R;dz+=st)for(let dx=-R;dx<=R;dx+=st)if(dx*dx+dz*dz<=R*R&&at(x+dx,z+dz))return true;return false}}}

function mkWebTex(){const c=mkCanvas(128,128),x=c.getContext('2d'),r=mulberry(3);x.strokeStyle='rgba(235,235,235,.85)';x.lineWidth=1;
  const cx=8,cy=8,N=9,ang=[];for(let i=0;i<N;i++)ang.push(i/(N-1)*Math.PI/2+r()*.08);
  for(const a of ang){x.beginPath();x.moveTo(cx,cy);x.lineTo(cx+Math.cos(a)*170,cy+Math.sin(a)*170);x.stroke()}
  for(let d=12;d<170;d+=8+r()*6){x.beginPath();ang.forEach((a,i)=>{const dd=d*(1+(r()-.5)*.08),px=cx+Math.cos(a)*dd,py=cy+Math.sin(a)*dd;i?x.quadraticCurveTo(cx+Math.cos(a-.08)*dd*.94,cy+Math.sin(a-.08)*dd*.94,px,py):x.moveTo(px,py)});x.stroke()}
  const t=new THREE.CanvasTexture(c);return t}

// ---------- glowing crystals and mushrooms (dungeons only) ----------
// glow comes from vertex colors (independent of torches); halo and floor spot are additive.
function glowMat(){if(W.glowMat2)return W.glowMat2;const m=new THREE.MeshLambertMaterial({vertexColors:true});
  m.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <emissivemap_fragment>','totalEmissiveRadiance=pow(vColor.rgb,vec3(2.2))*.85;')};
  return W.glowMat2=m}
// a cluster grows from its own base, not floor tiles: crystals from a rock ledge, mushrooms from a mound
// of mossy earth. base = base mesh (regular material), grow = glowing part; both share coordinates.
function crystalSet(){const B=[],P=[],rock=['#3a3530','#46403a','#332e2a'];
  for(let i=ri(4,6);i>0;i--){const a=rr(0,6.28),d=i===1?0:rr(.08,.24),r=i===1?rr(.17,.22):rr(.08,.15);
    B.push([new THREE.IcosahedronGeometry(r,0),pick(rock),_m4(Math.cos(a)*d,r*.25,Math.sin(a)*d,rr(0,6),rr(0,6),0,1.2,.75,1)])}
  for(let i=ri(5,8);i>0;i--){const r=rr(.018,.045),h=rr(.14,.4)*(i===1?1.4:1),a=rr(0,6.28),d=rr(0,.18),t=rr(.1,.6);
    P.push(lathe([[0,0],[r,0],[r,h*.72],[0,h]],6,rnd()<.5?'#ffffff':'#d0d0d0',_m4(Math.cos(a)*d,.1-d*.3,Math.sin(a)*d,Math.cos(a)*t,0,-Math.sin(a)*t)))}
  return {base:mergeParts(B),grow:mergeParts(P)}}
function shroomSet(){const B=[],P=[],R=rr(.32,.42),hgt=rr(.08,.12),g=new THREE.SphereGeometry(1,10,5,0,Math.PI*2,0,Math.PI/2),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const k=1+.18*Math.sin(p.getX(i)*5+p.getZ(i)*3);p.setXYZ(i,p.getX(i)*k,p.getY(i),p.getZ(i)*k)}
  B.push([g,'#2c241a',_m4(0,-.01,0,0,0,0,R,hgt,R*rr(.75,.95))]);
  for(let i=ri(3,5);i>0;i--){const a=rr(0,6.28),d=rr(0,R*.7);B.push([new THREE.SphereGeometry(rr(.07,.13),6,3,0,Math.PI*2,0,Math.PI/2),pick(['#2e3a1e','#3a4a24','#26301a']),_m4(Math.cos(a)*d,0,Math.sin(a)*d,0,0,0,1,.35,1)])}
  for(let i=ri(2,4);i>0;i--){const a=rr(0,6.28),d=R*rr(.8,1.05);B.push([new THREE.IcosahedronGeometry(rr(.03,.06),0),'#4a443c',_m4(Math.cos(a)*d,.01,Math.sin(a)*d*.85,rr(0,6),rr(0,6),0)])}
  const top=(x,z)=>hgt*Math.sqrt(Math.max(0,1-(x*x+z*z)/(R*R)))-.015;
  for(let i=ri(4,8);i>0;i--){const big=i===1&&rnd()<.6,h=big?rr(.18,.28):rr(.05,.15),r=big?rr(.07,.1):rr(.025,.06),a=rr(0,6.28),d=rr(0,R*.75),x=Math.cos(a)*d,z=Math.sin(a)*d;
    P.push(...xform([cy(r*.22,r*.32,h,6,0,h/2,0,'#5a6460'),[new THREE.SphereGeometry(r,8,4,0,Math.PI*2,0,Math.PI/2),'#ffffff',_m4(0,h-r*.1,0,0,0,0,1,.55,1)],
      cy(r*.95,r*.3,.012,8,0,h-r*.12,0,'#9aa6a0')],_m4(x,top(x,z),z,rr(-.2,.2),0,rr(-.2,.2))))}
  return {base:mergeParts(B),grow:mergeParts(P)}}
function buildGlow(root){if(!TH.indoor||!TH.glow)return;
  const CRY=['#6ad8ff','#b07aff','#6affb8','#ff7ad0','#ffd06a'],SHR=['#4affd0','#6aa8ff','#b0ff5a','#c88aff'];
  const cry=[],shr=[],decal=[],gp=[],gc=[],chests=G.chests||[];
  const ok=(x,z)=>Math.hypot(x-W.start.x,z-W.start.z)>1.5&&wallDist(x,z)>.03&&!W.lights.some(l=>Math.hypot(l.x-x,l.z-z)<1.8)&&
    !(W.placed||[]).some(p=>Math.hypot(p.x-x,p.z-z)<p.r+.2)&&!chests.some(c=>Math.hypot(c.x-x,c.z-z)<.9);
  const base=[],sets={c:[0,1,2].map(crystalSet),s:[0,1,2].map(shroomSet)};
  const add=(x,y,z,crystal,scale=1)=>{const col=new THREE.Color(pick(crystal?CRY:SHR)).multiplyScalar(rr(.8,1)),v=ri(0,2),yaw=rr(0,6.28),s=scale*rr(.85,1.15);
    pushInst(crystal?cry:shr,x,y,z,0,yaw,0,s,s,s,col,v);pushInst(base,x,y,z,0,yaw,0,s,s,s,new THREE.Color(1,1,1).multiplyScalar(rr(.8,1)),crystal?v:3+v);
    pushInst(decal,x,y+.02,z,-Math.PI/2,0,0,1.6*scale,1.6*scale,1,col.clone().multiplyScalar(.45),0);
    gp.push(x,y+.2*scale,z);gc.push(col.r,col.g,col.b)};
  for(const fc of W.faces){if(fc.outer)continue;for(let u=0;u<Math.max(1,Math.round(fc.sg.len/CS));u++){if(rnd()>TH.glow)continue;
    const f=faceAt(fc,rr(BD+.5,fc.sg.len-BD-.5)),d=BD+rr(.22,.38),x=f.x+f.nx*d,z=f.z+f.nz*d;if(!ok(x,z))continue;
    add(x,floorH(x,z),z,rnd()<(zoneAt(x,z)===2?.3:.55))}}
  // occasionally a crystal grows out of a wall pit
  for(const n of W.niches)if(!n.used&&rnd()<.05&&n.r>.35){n.used=1;add(n.x,n.y,n.z,true,.7)}
  const m=glowMat();instance(root,cry,sets.c.map(q=>q.grow),m,true,CHUNK*2);instance(root,shr,sets.s.map(q=>q.grow),m,true,CHUNK*2);
  instance(root,base,[...sets.c,...sets.s].map(q=>q.base),plainMat(),true,CHUNK*2);
  const soft=tex('softglow',()=>mkGlowTex([[0,'rgba(255,255,255,.75)'],[.3,'rgba(255,255,255,.25)'],[1,'rgba(255,255,255,0)']],64,64));
  instance(root,decal,[new THREE.PlaneGeometry(1,1)],new THREE.MeshBasicMaterial({map:soft,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}),true,CHUNK*2);
  if(gp.length){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(gp,3));g.setAttribute('color',new THREE.Float32BufferAttribute(gc,3));
    const pts=new THREE.Points(g,new THREE.PointsMaterial({size:1.1,map:soft,vertexColors:true,transparent:true,opacity:.4,blending:THREE.AdditiveBlending,depthWrite:false}));root.add(pts)}}
