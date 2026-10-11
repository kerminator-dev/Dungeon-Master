function chest(open){const g=new THREE.Group();g.add(box(.9,.45,.55,M.chest,0,.225,0));g.add(box(.1,.12,.6,M.metal,0,.45,0));
  if(open){const lid=box(.9,.2,.55,M.chest,0,0,0);const pv=new THREE.Group();pv.position.set(0,.45,-.27);lid.position.set(0,.1,.27);pv.add(lid);pv.rotation.x=-1.9;g.add(pv);
    g.add(box(.8,.06,.45,M.gold,0,.44,0));g.add(goldPile(0,.45,.2))}
  else g.add(box(.9,.2,.55,M.chest,0,.55,0));g.userData.half=0.32;return g}
function goldPile(x,y,r){const g=new THREE.Group();for(let i=0;i<9;i++){const c=box(.12,.05,.12,M.gold,x+R(-r,r)*.8,y+R(0,.08),R(-r,r)*.8);c.rotation.y=rnd()*3;g.add(c)}return g}
function barrel(){const g=new THREE.Group();
  const b=new THREE.Mesh(new THREE.CylinderGeometry(.34,.3,.85,8),M.wood);b.position.y=.43;g.add(b);
  for(const y of [.2,.65]){const r=new THREE.Mesh(new THREE.CylinderGeometry(.36,.36,.06,8),M.metal);r.position.y=y;g.add(r)}g.userData.half=0.36;return g}
function crate(snowy){const g=new THREE.Group();g.add(box(.7,.7,.7,M.wood,0,.35,0));
  for(const [a,b] of [[-.3,-.3],[.3,-.3],[-.3,.3],[.3,.3]])g.add(box(.08,.72,.08,M.metal,a,.35,b));
  if(rnd()<.5){const c=box(.5,.5,.5,M.wood,.1,.95,0);c.rotation.y=.5;g.add(c)}
  if(snowy)g.add(box(.76,.12,.76,M.snow,0,.74,0));g.userData.half=0.4;return g}
function skeleton(sitting,helmet){const g=new THREE.Group();
  const head=new THREE.Group();
  [box(.26,.24,.28,M.bone,0,0,0),box(.07,.07,.05,M.coal,-.06,.03,.14),box(.07,.07,.05,M.coal,.06,.03,.14),box(.18,.07,.2,M.bone,0,-.14,.04)].forEach(o=>head.add(o));
  if(helmet){head.add(box(.32,.1,.32,M.metal,0,.14,0));for(const s of [-1,1]){const h=box(.05,.22,.05,M.bone,s*.19,.22,0);h.rotation.z=-s*.5;head.add(h)}}
  if(sitting){
    head.position.set(0,.95,-.05);g.add(head);
    g.add(box(.08,.55,.08,M.bone,0,.55,-.05));
    for(let i=0;i<4;i++)g.add(box(.36-i*.03,.04,.14,M.bone,0,.78-i*.1,-.02));
    g.add(box(.3,.07,.16,M.bone,0,.24,0));
    for(const s of [-.1,.1]){g.add(box(.07,.07,.55,M.bone,s,.22,.3));g.add(box(.07,.4,.07,M.bone,s,.12,.58));g.add(box(.06,.06,.4,M.bone,s*2.4,.55,.08))}
  }else{
    head.position.set(0,.14,-.6);head.rotation.x=-.4;g.add(head);
    g.add(box(.08,.07,.7,M.bone,0,.05,-.1));
    for(let i=0;i<4;i++)g.add(box(.36-i*.03,.04,.07,M.bone,0,.1,-.4+i*.1));
    g.add(box(.3,.06,.14,M.bone,0,.05,.3));
    for(const s of [-.1,.1]){const l=box(.07,.06,.6,M.bone,s,.04,.7);l.rotation.y=s*2;g.add(l)}
    for(const s of [-.28,.28]){const a=box(.07,.05,.5,M.bone,s,.04,-.25);a.rotation.y=-s*1.6;g.add(a)}
    g.add(box(.3,.4,.05,M.bone,.5,.2,0));
  }
  if(!sitting){const o=new THREE.Group();g.rotation.y=Math.PI/2;o.add(g);o.userData.half=.5;return o}
  g.userData.half=.2;return g}
function draugr(sitting){return skeleton(sitting,true)}
function boneBits(){const g=new THREE.Group();for(let i=0;i<4;i++){const b=box(.4,.05,.07,M.bone,R(-.3,.3),.04,R(-.3,.3));b.rotation.y=rnd()*3;g.add(b)}g.add(box(.2,.18,.2,M.bone,.1,.09,0));return g}
function bonePile(){const g=new THREE.Group();g.add(boneBits());for(let i=0;i<6;i++){const b=box(.5,.06,.07,M.bone,R(-.4,.4),.05+i*.02,R(-.4,.4));b.rotation.set(0,rnd()*3,R(-.3,.3));g.add(b)}
  for(const [x,z] of [[.2,.1],[-.25,-.15]]){g.add(box(.24,.22,.26,M.bone,x,.2,z));g.add(box(.06,.06,.05,M.coal,x-.05,.22,z+.13));g.add(box(.06,.06,.05,M.coal,x+.05,.22,z+.13))}g.userData.half=0.4;return g}
function skullPyramid(){const g=new THREE.Group();
  const sk=(x,y,z)=>{g.add(box(.22,.2,.22,M.bone,x,y,z));g.add(box(.05,.05,.04,M.coal,x-.05,y+.02,z+.11));g.add(box(.05,.05,.04,M.coal,x+.05,y+.02,z+.11))};
  for(let i=0;i<3;i++)sk(-.25+i*.25,.12,0);for(let i=0;i<2;i++)sk(-.125+i*.25,.32,0);sk(0,.52,0);g.add(box(.9,.04,.4,M.rock,0,.02,0));g.userData.half=0.22;return g}
function mummy(){const g=new THREE.Group();
  g.add(box(.3,.55,.2,M.wrap,0,.3,0));g.add(box(.44,.6,.26,M.wrap2,0,.85,0));g.add(box(.27,.3,.27,M.wrap,0,1.3,0));
  g.add(box(.06,.05,.04,M.coal,-.06,1.33,.14));g.add(box(.06,.05,.04,M.coal,.06,1.33,.14));
  g.add(box(.55,.1,.1,M.wrap,0,1.0,.15));
  for(let i=0;i<5;i++)g.add(box(.46,.035,.28,M.wrapD,0,.6+i*.14,0));
  g.add(box(.05,.5,.02,M.wrap2,.15,.7,.15));g.add(box(.05,.4,.02,M.wrapD,-.18,.6,.15));return g}
function coffin(){const g=new THREE.Group();
  g.add(box(.9,.5,1.9,M.wood,0,.25,0));const lid=box(.95,.12,1.95,M.wood,.12,.56,.1);lid.rotation.y=.12;g.add(lid);
  g.add(box(.7,.02,1.6,M.coal,-.05,.5,0));g.add(box(.3,.1,.6,M.wrap,-.05,.55,-.3));const o=new THREE.Group();g.rotation.y=Math.PI/2;o.add(g);o.userData.half=.5;return o}
function sarcophagus(){const g=new THREE.Group();
  g.add(box(1.3,.6,2.3,M.pillar,0,.3,0));const lid=box(1.4,.22,2.4,M.rock,0,.71,0);lid.rotation.y=.04;g.add(lid);
  g.add(box(.5,.14,.5,M.bone,0,.9,-.6));g.add(box(.12,.1,1,M.bone,0,.86,.2));
  g.userData.light=new THREE.Vector3(0,1.4,0);return g}
function urn(){const g=new THREE.Group();
  const b=new THREE.Mesh(new THREE.CylinderGeometry(.24,.16,.5,6),M.clay);b.position.y=.28;g.add(b);
  const n=new THREE.Mesh(new THREE.CylinderGeometry(.12,.2,.2,6),M.clay);n.position.y=.58;g.add(n);
  g.add(box(.3,.04,.3,M.clay,0,.7,0));g.userData.half=0.3;return g}
function brazier(){const g=new THREE.Group();
  g.add(box(.3,.9,.3,M.rock,0,.45,0));g.add(box(.6,.1,.6,M.rock,0,.05,0));
  const bowl=new THREE.Mesh(new THREE.CylinderGeometry(.42,.22,.25,6),M.metal);bowl.position.y=1.0;g.add(bowl);
  g.add(box(.6,.06,.6,M.ember,0,1.1,0));
  const f=new THREE.Sprite(M.flame);f.scale.set(.7,1.05,1);f.position.y=1.5;g.add(f);flames.push(f);
  g.userData.light=new THREE.Vector3(0,1.6,0);g.userData.col=0xff9040;g.userData.half=0.4;return g}
function candles(){const g=new THREE.Group();
  for(let i=0;i<4;i++){const x=R(-.35,.35),z=R(-.35,.35),h=R(.12,.3);
    const c=new THREE.Mesh(new THREE.CylinderGeometry(.04,.05,h,5),M.candle);c.position.set(x,h/2,z);g.add(c);
    const f=new THREE.Sprite(M.flame);f.scale.set(.1,.16,1);f.position.set(x,h+.08,z);g.add(f);flames.push(f)}
  g.add(box(.5,.04,.5,M.rock,0,.02,0));g.userData.light=new THREE.Vector3(0,.6,0);g.userData.half=0.3;return g}
function weaponRack(){const g=new THREE.Group();
  g.add(box(1.2,.1,.1,M.wood,0,1.1,0));g.add(box(.1,1.3,.1,M.wood,-.55,.65,0));g.add(box(.1,1.3,.1,M.wood,.55,.65,0));g.add(box(1.2,.1,.1,M.wood,0,.5,0));
  for(let i=-2;i<=2;i++){const s=box(.05,1.1,.05,M.metal,i*.2,.8,.05);s.rotation.z=i*.04;g.add(s);g.add(box(.14,.04,.05,M.wood,i*.2,.28,.05))}
  g.userData.half=0.2;return g}
function hangingCage(x,z,H){const g=new THREE.Group();g.position.set(x,0,z);
  g.add(box(.04,H-2.2,.04,M.metal,0,H-(H-2.2)/2,0));
  for(const [a,b] of [[-.25,-.25],[.25,-.25],[-.25,.25],[.25,.25]])g.add(box(.03,.9,.03,M.metal,a,1.7,b));
  g.add(box(.55,.04,.55,M.metal,0,1.25,0));g.add(box(.55,.04,.55,M.metal,0,2.15,0));
  for(const k of [-.1,.1])g.add(box(.03,.9,.03,M.metal,k,1.7,.25));
  g.add(box(.18,.18,.18,M.bone,0,1.35,0));g.add(box(.3,.04,.06,M.bone,.05,1.28,.1));
  world.add(g)}
function slimePit(){const g=new THREE.Group();
  const s=new THREE.Mesh(new THREE.PlaneGeometry(1.1,1.4),M.slime);s.rotation.x=-Math.PI/2;s.position.y=.03;g.add(s);
  g.add(box(1.3,.18,.14,M.rock,0,.09,.77));g.add(box(1.3,.18,.14,M.rock,0,.09,-.77));g.add(box(.14,.18,1.6,M.rock,.62,.09,0));g.add(box(.14,.18,1.6,M.rock,-.62,.09,0));return g}
function puddle(){const g=new THREE.Group();const p=new THREE.Mesh(new THREE.CircleGeometry(.6,8),M.puddle);p.rotation.x=-Math.PI/2;p.position.y=.02;p.scale.set(1.2,1,.8);g.add(p);return g}
function icePatch(){const g=new THREE.Group();const p=new THREE.Mesh(new THREE.CircleGeometry(.8,7),M.ice);p.rotation.x=-Math.PI/2;p.position.y=.1;p.scale.set(1.3,1,.9);g.add(p);return g}
function rubble(){const g=new THREE.Group();for(let i=0;i<7;i++){const b=box(R(.12,.3),R(.1,.22),R(.12,.3),M.rubble,R(-.4,.4),.08,R(-.4,.4));b.rotation.set(R(0,1),R(0,3),R(0,1));g.add(b)}g.userData.half=0.3;return g}
function planks(){const g=new THREE.Group();for(let i=0;i<3;i++){const b=box(.9,.05,.18,M.wood,R(-.2,.2),.05+i*.04,R(-.3,.3));b.rotation.y=R(-.6,.6);g.add(b)}
  const t=box(.8,.05,.18,M.wood,0,.3,0);t.rotation.set(0,.4,.5);g.add(t);return g}
function crystal(mat){const g=new THREE.Group();
  for(let i=0;i<4;i++){const c=new THREE.Mesh(new THREE.OctahedronGeometry(.18,0),mat);const h=R(1.6,3.4);c.scale.set(1,h,1);c.position.set(R(-.25,.25),.18*h*.9,R(-.25,.25));c.rotation.set(R(-.3,.3),R(0,3),R(-.3,.3));g.add(c)}
  g.userData.light=new THREE.Vector3(0,.6,0);g.userData.col=mat===M.crystalP?0xb070ff:0x70c0ff;g.userData.half=0.3;return g}
function stalagmite(){const g=new THREE.Group();const m=curTh.id==='icecave'?M.iceRock:M.caveRock;
  for(let i=0;i<3;i++){const h=R(.5,1.3),c=new THREE.Mesh(new THREE.ConeGeometry(R(.13,.25),h,5),m);c.position.set(R(-.25,.25),h/2,R(-.25,.25));g.add(c)}g.userData.half=0.3;return g}
function iceBlock(withSkel){const g=new THREE.Group();
  g.add(box(1.1,.12,1.1,M.rock,0,.06,0));g.add(box(1.0,1.4,1.0,M.ice,0,.82,0));
  if(withSkel){const s=skeleton(true);s.scale.set(.8,.8,.8);s.position.set(0,.12,-.1);g.add(s)}g.userData.half=0.55;return g}
function mushrooms(){const g=new THREE.Group();const m=rnd()<.5?M.shroomB:M.shroomC;
  for(let i=0;i<4;i++){const h=R(.2,.6),x=R(-.3,.3),z=R(-.3,.3);
    g.add(box(.06,h,.06,M.shroomStem,x,h/2,z));
    const cap=new THREE.Mesh(new THREE.ConeGeometry(R(.14,.26),.16,6),m);cap.position.set(x,h+.05,z);g.add(cap)}
  g.userData.light=new THREE.Vector3(0,.5,0);g.userData.col=m===M.shroomB?0x40ffc0:0x60a0ff;g.userData.half=0.3;return g}
function wheel(){const g=new THREE.Group();
  const t=new THREE.Mesh(new THREE.TorusGeometry(.5,.05,4,12),M.wood);t.position.y=.55;g.add(t);
  g.add(box(1,.07,.07,M.wood,0,.55,0));g.add(box(.07,1,.07,M.wood,0,.55,0));g.add(box(.14,.14,.14,M.metal,0,.55,0));g.rotation.x=-.25;
  const o=new THREE.Group();o.add(g);return o}
function pickaxe(){const g=new THREE.Group();
  g.add(box(.07,.07,.9,M.wood,0,.06,0));g.add(box(.5,.07,.07,M.metal,0,.1,.4));g.add(box(.1,.14,.1,M.snow,0,.13,0));return g}
function lampPost(){const g=new THREE.Group();
  g.add(box(.14,2.4,.14,M.wood,0,1.2,0));g.add(box(.8,.1,.1,M.wood,.35,2.35,0));
  g.add(box(.3,.4,.3,M.lantern,.7,2.1,0));g.add(box(.35,.06,.35,M.metal,.7,2.33,0));
  const f=new THREE.Sprite(M.flame);f.scale.set(.2,.3,1);f.position.set(.7,2.1,0);g.add(f);flames.push(f);
  g.userData.light=new THREE.Vector3(.7,2.1,0);g.userData.half=0.15;return g}
function signpost(){const g=new THREE.Group();
  g.add(box(.12,1.8,.12,M.wood,0,.9,0));
  const a=box(.8,.25,.06,M.wood,.3,1.5,.07);a.rotation.z=.08;g.add(a);const b=box(.7,.25,.06,M.wood,-.25,1.15,.07);b.rotation.z=-.1;g.add(b);
  g.add(box(.9,.08,.9,M.snow,0,.04,0));g.userData.half=0.15;return g}
function sacks(){const g=new THREE.Group();
  for(let i=0;i<3;i++){const s=new THREE.Mesh(new THREE.SphereGeometry(.25,5,4),M.sack);s.scale.set(1,.9,.8);s.position.set(R(-.3,.3),.22+(i===2?.28:0),R(-.2,.2));g.add(s)}g.userData.half=0.3;return g}
function woodpile(){const g=new THREE.Group();
  for(let row=0;row<3;row++)for(let i=0;i<3-row;i++){const l=new THREE.Mesh(new THREE.CylinderGeometry(.11,.11,.9,5),M.wood);l.rotation.z=Math.PI/2;l.position.set(0,.12+row*.2,-.3+i*.24+row*.12);g.add(l)}
  g.add(box(1,.1,.9,M.snow,0,.7,0));g.scale.y=.9;g.userData.half=0.45;return g}
function fence(){const g=new THREE.Group();
  for(const x of [-.6,0,.6])g.add(box(.1,.9,.1,M.wood,x,.45,0));
  g.add(box(1.4,.08,.06,M.wood,0,.75,0));g.add(box(1.4,.08,.06,M.wood,0,.45,0));g.add(box(1.4,.06,.1,M.snow,0,.82,0));g.userData.half=0.1;return g}
function campfire(){const g=new THREE.Group();
  for(let i=0;i<6;i++){const a=i/6*6.28;const s=box(.25,.15,.2,M.rock,Math.cos(a)*.4,.08,Math.sin(a)*.4);s.rotation.y=-a;g.add(s)}
  for(let i=0;i<3;i++){const l=box(.7,.1,.1,M.wood,0,.15,0);l.rotation.y=i*1.05;g.add(l)}
  for(let i=0;i<3;i++){const a=i/3*6.28;const l=box(.05,1.3,.05,M.wood,Math.cos(a)*.25,.65,Math.sin(a)*.25);l.rotation.set(Math.sin(a)*.3,0,-Math.cos(a)*.3);g.add(l)}
  const pot=new THREE.Mesh(new THREE.SphereGeometry(.22,6,5),M.pot);pot.position.y=.95;pot.scale.y=.8;g.add(pot);
  const f=new THREE.Sprite(M.flame);f.scale.set(.6,.9,1);f.position.y=.5;g.add(f);flames.push(f);
  g.userData.light=new THREE.Vector3(0,.8,0);return g}
function deadTree(){const g=new THREE.Group();
  g.add(box(.3,3,.3,M.trunk,0,1.5,0));
  for(let i=0;i<4;i++){const b=box(.12,1.1,.12,M.trunk,0,0,0);b.position.set(Math.cos(i*1.6)*.4,2+i*.25,Math.sin(i*1.6)*.4);b.rotation.set(Math.sin(i*1.6)*.9,0,-Math.cos(i*1.6)*.9);g.add(b)}
  g.add(box(.5,.08,.5,M.snow,0,3.05,0));return g}
function armor(){const g=new THREE.Group();
  g.add(box(.7,.12,.7,M.rock,0,.06,0));
  for(const s of [-.1,.1])g.add(box(.12,.55,.14,M.armor,s,.4,0));
  g.add(box(.42,.5,.26,M.armor,0,.95,0));g.add(box(.3,.28,.3,M.armor,0,1.35,0));g.add(box(.2,.05,.05,M.coal,0,1.38,.16));g.add(box(.06,.14,.2,M.armor,0,1.56,0));
  for(const s of [-.28,.28])g.add(box(.1,.45,.12,M.armor,s,1.0,0));
  g.add(box(.05,1.9,.05,M.wood,.38,.95,.05));g.add(box(.2,.3,.04,M.metal,.38,1.8,.05));g.userData.half=0.4;return g}
function bookshelf(){const g=new THREE.Group();
  g.add(box(1.4,2.2,.1,M.wood,0,1.1,-.15));g.add(box(.08,2.2,.4,M.wood,-.7,1.1,0));g.add(box(.08,2.2,.4,M.wood,.7,1.1,0));
  for(let i=0;i<5;i++){const y=.05+i*.5;g.add(box(1.4,.05,.4,M.wood,0,y,0));
    if(i<4)for(let j=0;j<8;j++){const h=R(.3,.44);g.add(box(.1,h,.28,[M.book1,M.book2,M.book3][rnd()*3|0],-.58+j*.16+R(-.02,.02),y+.03+h/2,0))}}
  g.add(box(1.5,.08,.45,M.wood,0,2.24,0));g.userData.half=0.27;return g}
function throne(){const g=new THREE.Group();
  g.add(box(2.4,.22,1.9,M.stoneLite,0,.11,0));g.add(box(1.8,.22,1.4,M.stoneLite,0,.33,0));
  g.add(box(.8,.4,.75,M.wood,0,.64,0));g.add(box(.8,1.7,.15,M.wood,0,1.4,-.33));g.add(box(.9,.12,.2,M.trim,0,2.25,-.33));
  for(const s of [-.45,.45])g.add(box(.1,.45,.7,M.wood,s,.9,0));g.add(box(.7,.1,.65,M.carpet,0,.87,0));
  g.add(box(.2,.3,.2,M.trim,-.45,1.2,-.33));g.add(box(.2,.3,.2,M.trim,.45,1.2,-.33));return g}
function candelabra(){const g=new THREE.Group();
  g.add(box(.4,.06,.4,M.metal,0,.03,0));g.add(box(.06,1.1,.06,M.metal,0,.58,0));g.add(box(.5,.04,.06,M.metal,0,1.1,0));
  for(const x of [-.22,0,.22]){g.add(box(.05,.14,.05,M.candle,x,1.2,0));const f=new THREE.Sprite(M.flame);f.scale.set(.1,.16,1);f.position.set(x,1.34,0);g.add(f);flames.push(f)}
  g.userData.light=new THREE.Vector3(0,1.4,0);g.userData.half=0.25;return g}
function statue(){const g=new THREE.Group();
  g.add(box(.7,.5,.7,M.stoneLite,0,.25,0));g.add(box(.35,.9,.25,M.rock,0,.95,0));g.add(box(.22,.25,.22,M.rock,0,1.55,0));
  g.add(box(.06,.9,.06,M.metal,.3,1.0,.1));g.add(box(.5,.08,.1,M.metal,.3,1.35,.1));g.userData.half=0.38;return g}
function longTable(){const g=new THREE.Group();
  g.add(box(2.6,.1,.95,M.wood,0,.8,0));for(const [x,z] of [[-1.2,-.4],[1.2,-.4],[-1.2,.4],[1.2,.4]])g.add(box(.1,.8,.1,M.wood,x,.4,z));
  for(const z of [-.75,.75])g.add(box(2.4,.08,.35,M.wood,0,.45,z));
  for(const x of [-.7,.7]){g.add(box(.06,.14,.06,M.candle,x,.92,0));const f=new THREE.Sprite(M.flame);f.scale.set(.1,.16,1);f.position.set(x,1.06,0);g.add(f);flames.push(f)}
  for(const [x,z] of [[-.2,.25],[.4,-.25],[.9,.2]])g.add(box(.2,.03,.2,M.metal,x,.87,z));
  g.userData.light=new THREE.Vector3(0,1.2,0);return g}
function log(){const g=new THREE.Group();
  const l=new THREE.Mesh(new THREE.CylinderGeometry(.22,.24,1.8,6),M.trunk);l.rotation.z=Math.PI/2;l.position.y=.24;g.add(l);
  g.add(box(1.2,.08,.2,M.bush,.1,.45,0));g.userData.half=0.3;return g}
function bush(){const g=new THREE.Group();
  for(let i=0;i<3;i++){const b=new THREE.Mesh(new THREE.DodecahedronGeometry(R(.35,.55),0),M.bush);b.position.set(R(-.3,.3),.3,R(-.3,.3));b.scale.y=.8;g.add(b)}g.userData.half=0.45;return g}
