function decorRoom(r,th,place,H){
  const mid=(r.w-1)/2, cx=wc(r.x0+mid), cz=wc(r.y0+mid), winter=th.id==='winter';
  const gm=maze.g;
  const corners=[[-1,-1],[1,-1],[-1,1],[1,1]].map(([sx,sy])=>{
    const bx=r.x0+(sx>0?r.w-1:0),by=r.y0+(sy>0?r.w-1:0),cxw=wc(bx),czw=wc(by);
    const openX=gm[bx+sx]&&gm[bx+sx][by]===0,openY=gm[bx][by+sy]===0;
    if(openX||openY)return null;                                   // у входа не ставим
    return rnd()<.5?wspot(cxw,czw,sx,0,sy*-.45):wspot(cxw,czw,0,sy,sx*-.45)}).filter(Boolean);
  const at=(x,z,yaw=0)=>({x,z,yaw});
  const alt=(a,b)=>corners.forEach((c,i)=>place(i%2?b():a(),c));
  switch(r.type){
    case 'crypt':place(sarcophagus(),at(cx,cz,rnd()<.5?0:Math.PI/2));corners.forEach((c,i)=>place(i%2?candles():skeleton(true),c));break;
    case 'treasure':{corners.forEach(c=>place(chest(true),c));
      const d=new THREE.Group();d.add(box(1.6,.2,1.6,M.rock,0,.1,0));const ch=chest(true);ch.position.y=.2;ch.scale.set(1.2,1.2,1.2);d.add(ch);d.add(goldPile(0,.2,.7));
      d.userData.light=new THREE.Vector3(0,1.2,0);place(d,at(cx,cz,rnd()*6));break}
    case 'pillars':alt(()=>barrel(),()=>skeleton(false));if(r.big)place(candles(),at(cx,cz));break;
    case 'ossuary':place(skullPyramid(),at(cx,cz,rnd()*6));corners.forEach((c,i)=>place(i%2?bonePile():candles(),c));break;
    case 'burial':place(sarcophagus(),at(cx,cz,rnd()<.5?0:Math.PI/2));corners.forEach(c=>place(brazier(),c));break;
    case 'crystal':{const c=crystal(rnd()<.5?M.crystalI:M.crystalP);c.scale.set(2,2,2);place(c,at(cx,cz));corners.forEach((cc,i)=>{if(i%2)place(stalagmite(),cc)});break}
    case 'frozen':place(iceBlock(true),at(cx,cz,rnd()*6));corners.forEach((c,i)=>{if(i%2)place(icePatch(),c);else place(stalagmite(),c)});break;
    case 'grove':{place(mushrooms(),at(cx,cz));place(mushrooms(),at(cx+1.2,cz+1.2));corners.forEach((c,i)=>{if(i%2)place(mushrooms(),c);else place(stalagmite(),c)});break}
    case 'lair':place(bonePile(),at(cx,cz));corners.forEach((c,i)=>{if(i%2)place(skeleton(i>1),c);else place(stalagmite(),c)});break;
    case 'hall':{place(tableSet(),at(cx,cz,rnd()<.5?0:Math.PI/2));const ch=chandelier(H);ch.position.set(cx,0,cz);world.add(ch);registerLight(ch);
      corners.forEach((c,i)=>place(i%2?candelabra():armor(),c));break}
    case 'throne':{place(throne(),at(cx,cz,rnd()<.5?0:Math.PI));const ch=chandelier(H);ch.position.set(cx,0,cz);world.add(ch);registerLight(ch);
      corners.forEach((c,i)=>place(i%2?statue():armor(),c));break}
    case 'library':{corners.forEach(c=>place(bookshelf(),c));place(desk(),at(cx,cz,rnd()<.5?0:Math.PI/2));break}
    case 'camp':{place(campfire(),at(cx,cz));for(let i=0;i<4;i++){const a=i/4*6.28+.4;const gg=new THREE.Group();gg.add(box(1,.28,.3,M.wood,0,.14,0));place(gg,at(cx+Math.cos(a)*1.5,cz+Math.sin(a)*1.5,-a+1.57))}
      corners.forEach((c,i)=>place(i%2?crate(true):sacks(),c));break}
    case 'ruins':corners.forEach(c=>{const rr=new THREE.Group();rr.add(box(.6,R(.6,1.4),.6,M.snowRock,0,.5,0));rr.add(box(.7,.14,.7,M.snow,0,1.3,0));place(rr,c)});
      place(skeleton(false),at(cx+.9,cz+.5,rnd()*6));if(r.big)place(chest(false),at(cx,cz,rnd()*6));break;
  }
}

function buildExit(th,H){
  const winter=!!th.outdoor;
  const g=new THREE.Group();g.position.copy(exitPos);
  const door=new THREE.Group();door.position.x=B/2-.1;
  if(winter){
    door.add(box(.35,2.3,1.7,M.coal,0,1.15,0));
    for(const z of [-.5,0,.5])door.add(box(.4,2.3,.08,M.metal,0,1.15,z));
    door.add(box(.45,.25,2.1,M.rock,0,2.4,0));
    for(const z of [-1.1,1.1]){door.add(box(.5,2.6,.3,M.rock,0,1.3,z));
      const b=new THREE.Mesh(new THREE.PlaneGeometry(.7,1.5),M.banner);b.position.set(-.2,1.7,z*1.6);b.rotation.y=-Math.PI/2;door.add(b)}
  }else if(th.id==='icecave'||th.id==='cave'){ // светящийся проход
    door.add(box(.5,.3,2.4,M.caveRock,0,2.7,0));door.add(box(.5,2.6,.35,M.caveRock,0,1.3,-1.05));door.add(box(.5,2.6,.35,M.caveRock,0,1.3,1.05));
    door.add(box(.05,2.4,1.5,basic(th.id==='icecave'?0x9fd8ff:0x60ffc0),-.05,1.2,0));
  }else{
    door.add(box(.25,2.4,1.5,M.wood,0,1.2,0));
    for(const y of [.5,1.2,1.9])door.add(box(.3,.12,1.55,M.metal,0,y,0));
    const top=new THREE.Mesh(new THREE.CylinderGeometry(.75,.75,.25,8,1,false,0,Math.PI),M.wood);
    top.rotation.set(Math.PI/2,0,Math.PI/2);top.position.y=2.4;door.add(top);
    door.add(box(.35,.3,.3,M.metal,-.1,1.1,.5));
  }
  g.add(door);
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,H,6,1,true),new THREE.MeshBasicMaterial({color:0xffcc66,transparent:true,opacity:.18,fog:false,side:THREE.DoubleSide}));
  beam.position.set(-.2,H/2,0);beam.userData.keep=true;g.add(beam);
  world.add(g);
  const l=new THREE.PointLight(0xffc060,1.2,10,1.5);l.position.set(exitPos.x,2,exitPos.z);world.add(l);
  if(th.torch){addTorch(exitPos.x+B/2-.15,exitPos.z-.95,1,0,th.torch);addTorch(exitPos.x+B/2-.15,exitPos.z+.95,1,0,th.torch)}
}
function addTorch(x,z,dx,dy,style,y0=0){
  const g=new THREE.Group();g.position.set(x,(style==='lantern'?1.9:1.7)+y0,z);
  const fy=(style==='lantern'?1.8:2.1)+y0;let fx,fz;
  if(style==='lantern'){
    g.add(box(.08,.9,.08,M.wood,-dx*.1,0,-dy*.1));
    g.add(box(Math.abs(dx)?.35:.08,.06,Math.abs(dy)?.35:.08,M.wood,-dx*.2,.4,-dy*.2));
    g.add(box(.27,.36,.27,M.lantern,-dx*.35,.05,-dy*.35));
    g.add(box(.31,.05,.31,M.metal,-dx*.35,.26,-dy*.35));
    fx=x-dx*.35;fz=z-dy*.35;
  }else{
    const px=Math.abs(dx)>.5;
    g.add(box(px?.05:.28,.38,px?.28:.05,M.metal,dx*.13,0,dy*.13));
    g.add(box(px?.3:.06,.06,px?.06:.3,M.metal,-dx*.01,-.12,-dy*.01));
    const cup=new THREE.Mesh(new THREE.CylinderGeometry(.1,.06,.16,6),M.metal);cup.position.set(-dx*.17,-.04,-dy*.17);g.add(cup);
    g.add(box(.05,.1,.05,M.wood,-dx*.17,.08,-dy*.17));
    const f=new THREE.Sprite(M.flame);f.scale.set(.5,.75,1);f.position.set(-dx*.17,.3,-dy*.17);g.add(f);flames.push(f);
    const gl=new THREE.Sprite(M.glowS);gl.scale.set(1.5,1.5,1);gl.position.set(-dx*.17,.3,-dy*.17);g.add(gl);
    fx=x-dx*.17;fz=z-dy*.17;
  }
  world.add(g);const v=new THREE.Vector3(fx,fy,fz);v.col=0xffa860;torches.push(v);
}
// ---- реквизит ----
