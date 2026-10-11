// ===== площади: рынок, кузница, колодец, цветники =====
function stall(){const g=new THREE.Group(),aw=rnd()<.5?M.awnA:M.awnB;
  for(const [x,z] of [[-1.15,-.75],[1.15,-.75],[-1.15,.75],[1.15,.75]])g.add(box(.1,x<0?2.4:2.2,.1,M.wood2,x,x<0?1.2:1.1,z));
  const roof=box(2.7,.07,1.9,aw,0,2.3,0);roof.rotation.x=.16;g.add(roof);
  g.add(box(2.6,.3,.06,aw,0,2.05,.95));
  g.add(box(2.3,.85,.7,M.wood,0,.43,.45));g.add(box(2.4,.08,.8,M.wood2,0,.88,.45));
  for(let i=0;i<5;i++){const m=[M.apple,M.grain,M.flowerY,M.leafG2,M.apple][i];g.add(box(.3,.18,.3,M.crate0||M.wood,-.9+i*.45,.98,.45));g.add(box(.24,.12,.24,m,-.9+i*.45,1.12,.45))}
  g.add(box(.9,.5,.5,M.wood,.7,.25,-.4));g.add(box(.7,.35,.5,M.sack,-.7,.17,-.45));
  g.add(box(.5,.35,.04,M.wood,0,1.7,.98));return g}
function smithy(){const g=new THREE.Group();
  for(const [x,z] of [[-1.5,-1.1],[1.5,-1.1],[-1.5,1.1],[1.5,1.1]])g.add(box(.18,2.6,.18,M.wood2,x,1.3,z));
  const r1=box(3.6,.1,2.9,M.slateRoof,0,2.75,0);r1.rotation.x=.12;g.add(r1);
  g.add(tbox(1.5,1.1,1.0,M.stoneBase,-.9,.55,-.8));g.add(box(1.0,.3,.6,M.coal,-.9,1.15,-.8));g.add(box(1.0,.1,.6,M.ember,-.9,1.26,-.8));
  g.add(tbox(.8,3.0,.8,M.stoneBase,-.9,1.5,-1.0));
  const f=new THREE.Sprite(M.flame);f.scale.set(.7,.9,1);f.position.set(-.9,1.7,-.8);g.add(f);flames.push(f);
  const gl=new THREE.Sprite(M.glowS);gl.scale.set(2.4,2.4,1);gl.position.set(-.9,1.5,-.6);g.add(gl);
  g.add(box(.7,.5,.5,M.iron,.9,.25,.2));g.add(box(.9,.12,.4,M.iron,.9,.56,.2));g.add(box(.4,.1,.12,M.iron,1.4,.56,.2));
  const br=barrel();br.position.set(1.2,0,-.7);g.add(br);
  g.add(box(1.2,.08,.1,M.wood,-.5,1.6,1.05));for(let i=0;i<4;i++)g.add(box(.05,.55,.05,M.metal,-1+i*.28,1.35,1.05));
  g.add(box(.8,.3,.6,M.coal,-1.2,.15,.6));
  g.userData.light=new THREE.Vector3(-.9,1.4,-.4);g.userData.col=0xff8a30;return g}
function well(){const g=new THREE.Group();
  const ring=new THREE.Mesh(new THREE.CylinderGeometry(.85,.9,.95,8),M.stoneBase);ring.position.y=.47;g.add(ring);
  const wt=new THREE.Mesh(new THREE.CylinderGeometry(.62,.62,.05,8),M.puddle);wt.position.y=.86;g.add(wt);
  for(const sg of [-1,1])g.add(box(.14,1.9,.14,M.wood2,sg*.8,1.4,0));
  const rf=gableRoof(2.2,1.6,.9,M.slateRoof);rf.rotation.y=Math.PI/2;rf.position.set(0,2.35,0);g.add(rf);
  g.add(box(.08,.08,1.6,M.wood,0,2.0,0));g.add(box(.03,.5,.03,M.wrap,0,1.7,0));g.add(box(.2,.2,.2,M.wood,0,1.4,0));return g}
function fountain(){const g=new THREE.Group();
  const b=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.6,.6,10),M.archStone);b.position.y=.3;g.add(b);
  const w=new THREE.Mesh(new THREE.CylinderGeometry(1.3,1.3,.05,10),M.puddle);w.position.y=.62;g.add(w);
  const p=new THREE.Mesh(new THREE.CylinderGeometry(.22,.3,1.4,8),M.stoneBase);p.position.y=1.2;g.add(p);
  const u=new THREE.Mesh(new THREE.CylinderGeometry(.6,.3,.25,8),M.archStone);u.position.y=1.85;g.add(u);return g}
function hayBale(){const g=new THREE.Group();g.add(box(.95,.6,.6,M.hay,0,.3,0));g.add(box(.97,.08,.62,M.wood,-.25,.3,0));g.add(box(.97,.08,.62,M.wood,.25,.3,0));g.userData.half=.35;return g}
function cart(){const g=new THREE.Group();
  g.add(box(1.8,.14,1.0,M.wood,0,.55,0));g.add(box(1.8,.4,.08,M.wood2,0,.78,.5));g.add(box(1.8,.4,.08,M.wood2,0,.78,-.5));
  for(const z of [-.62,.62]){const t=new THREE.Mesh(new THREE.TorusGeometry(.42,.06,4,12),M.wood2);t.position.set(0,.45,z);g.add(t);g.add(box(.84,.06,.06,M.wood2,0,.45,z));g.add(box(.06,.84,.06,M.wood2,0,.45,z))}
  g.add(box(1.6,.06,.06,M.wood,-1.4,.5,.3));g.add(box(1.6,.06,.06,M.wood,-1.4,.5,-.3));
  const s=new THREE.Mesh(new THREE.SphereGeometry(.3,5,4),M.sack);s.position.set(.3,.95,0);g.add(s);g.add(box(.4,.4,.4,M.wood,-.4,.9,.1));return g}
function flowerBed(){const g=new THREE.Group();
  g.add(box(2.0,.22,1.2,M.rock,0,.11,0));g.add(box(1.8,.1,1.0,M.mud||M.trunk,0,.24,0));
  for(let i=0;i<14;i++)g.add(box(.14,R(.16,.34),.14,[M.flowerR,M.flowerY,M.flowerP,M.leafG2][i%4],R(-.85,.85),.35,R(-.45,.45)));return g}
function lawnTree(th){const g=new THREE.Group();
  if(th.snowy||th.trees==='pine'){for(const [y,r,h] of [[0,1.5,2.0],[1.2,1.2,1.7],[2.2,.8,1.4]]){const c=new THREE.Mesh(new THREE.ConeGeometry(r,h,7),th.snowy?M.pine:M.pineG);c.position.y=y+h/2+.9;g.add(c)}g.add(box(.3,1.2,.3,M.trunk,0,.6,0))}
  else{g.add(box(.4,2.0,.4,M.trunk,0,1.0,0));for(let i=0;i<3;i++){const c=new THREE.Mesh(new THREE.DodecahedronGeometry(1.2,0),[M.leafA,M.leafB,M.leafG][rnd()*3|0]);c.position.set(R(-.5,.5),2.6+R(-.1,.5),R(-.5,.5));c.scale.y=.85;g.add(c)}}
  g.userData.half=.8;return g}
function decorPlaza(p,th,place){
  const g=maze.g,x0=p.x0,y0=p.y0,w=p.w,b=p.b;
  const inB=(x,y)=>b&&x>=b.x0-1&&x<=b.x0+b.w&&y>=b.y0-1&&y<=b.y0+b.w;
  const inP=(x,y)=>x>=x0&&x<x0+w&&y>=y0&&y<y0+w;
  const lawn=[];for(let x=x0;x<x0+w;x++)for(let y=y0;y<y0+w;y++)if(!inB(x,y)&&g[x][y]===0)lawn.push([x,y]);
  // входы на площадь
  const ent=[];for(let i=0;i<w;i++){
    if(g[x0+i][y0-1]===0)ent.push([x0+i,y0]);if(g[x0+i][y0+w]===0)ent.push([x0+i,y0+w-1]);
    if(g[x0-1][y0+i]===0)ent.push([x0,y0+i]);if(g[x0+w][y0+i]===0)ent.push([x0+w-1,y0+i])}
  // улицы: BFS от двери здания до каждого входа
  const pathSet=new Set(),paths=[];
  if(b){const d=b.doors[0],n=[[0,-1],[0,1],[-1,0],[1,0]][p.side],F=[d.rx+n[0],d.ry+n[1]];
    for(const E of ent){const prev=new Map([[F.join(),null]]),q=[F];let found=false;
      while(q.length){const c=q.shift();if(c[0]===E[0]&&c[1]===E[1]){found=true;break}
        for(const [dx,dy] of dirs){const nx=c[0]+dx,ny=c[1]+dy;if(inP(nx,ny)&&!inB(nx,ny)&&g[nx][ny]===0&&!prev.has(nx+','+ny)){prev.set(nx+','+ny,c);q.push([nx,ny])}}}
      if(found){let c=E;while(c){pathSet.add(c.join());c=prev.get(c.join())}}}
  }else ent.forEach(e=>pathSet.add(e.join()));
  const pathB=[...pathSet].map(k=>k.split(',').map(Number));
  instanced(new THREE.BoxGeometry(B*.97,.07,B*.97),M.cobble,pathB,(d,[x,y])=>d.position.set(wc(x),.05,wc(y)));
  p.pathSet=pathSet;
  // кандидаты: газон рядом с улицей / вдали
  const free=lawn.filter(([x,y])=>!pathSet.has(x+','+y));
  const near=free.filter(([x,y])=>dirs.some(([dx,dy])=>pathSet.has((x+dx)+','+(y+dy))));
  const pickB=arr=>arr.length?arr.splice(rnd()*arr.length|0,1)[0]:null;
  const nearA=near.slice(),farA=free.filter(([x,y])=>!near.some(q=>q[0]===x&&q[1]===y));
  const faceTo=([x,y])=>{const t=dirs.find(([dx,dy])=>pathSet.has((x+dx)+','+(y+dy)))||[0,1];return Math.atan2(t[0],t[1])};
  // рынок
  for(let i=0;i<3;i++){const c=pickB(nearA);if(!c)break;place(stall(),{x:wc(c[0]),z:wc(c[1]),yaw:faceTo(c)})}
  // кузница в углу площади
  {const c=pickB(farA.filter(([x,y])=>Math.abs(x-(x0+(w-1)/2))>3&&Math.abs(y-(y0+(w-1)/2))>3));if(c){const t=smithy();place(t,{x:wc(c[0]),z:wc(c[1]),yaw:Math.atan2(x0+(w-1)/2-c[0],y0+(w-1)/2-c[1])})}}
  // колодец, цветники, деревья, повозки
  for(const mk of [well,flowerBed,flowerBed,()=>lawnTree(th),()=>lawnTree(th),()=>lawnTree(th),cart,hayBale,hayBale,fence]){const c=pickB(farA.length?farA:nearA);if(!c)break;
    place(mk(),{x:wc(c[0])+R(-.4,.4),z:wc(c[1])+R(-.4,.4),yaw:rnd()*6.28})}
  // фонари вдоль улицы
  let k=0;for(const [x,y] of pathB){if(k++%3!==0)continue;const t=dirs.find(([dx,dy])=>!pathSet.has((x+dx)+','+(y+dy))&&inP(x+dx,y+dy)&&!inB(x+dx,y+dy)&&g[x+dx][y+dy]===0);if(!t)continue;
    const lp=lampPost();place(lp,{x:wc(x)+t[0]*.8,z:wc(y)+t[1]*.8,yaw:Math.atan2(-t[0],-t[1])})}
}


function pipeRun(cx,cz,dx,dy,H){
  const y=2.4,along=dx!==0?[0,1]:[1,0];
  const p=new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,B*.96,6),M.pipe);
  p.rotation.set(dx!==0?Math.PI/2:0,0,dx!==0?0:Math.PI/2);
  p.position.set(cx+dx*(B/2-.2),y,cz+dy*(B/2-.2));world.add(p);
  for(const o of [-.8,.8]){world.add(box(dx!==0?.08:.34,.34,dx!==0?.34:.08,M.metal,cx+dx*(B/2-.2)+along[0]*o,y,cz+dy*(B/2-.2)+along[1]*o))}
  if(rnd()<.5){const d=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,y,5),M.slime);d.position.set(cx+dx*(B/2-.22),y/2,cz+dy*(B/2-.22));world.add(d)}
}
function lavaPool(){const g=new THREE.Group();
  g.add(box(1.5,.16,1.1,M.lavaD,0,.08,0));g.add(box(1.2,.05,.8,M.lava,0,.17,0));
  for(const [x,z,sx,sz] of [[-.75,0,.18,1.2],[.75,0,.18,1.2],[0,-.55,1.5,.18],[0,.55,1.5,.18]])g.add(box(sx,.28,sz,M.basaltM,x,.14,z));
  const gl=new THREE.Sprite(M.glowS);gl.scale.set(2.4,2.4,1);gl.position.set(0,.5,0);g.add(gl);
  g.userData.light=new THREE.Vector3(0,.8,0);g.userData.col=0xff7a30;g.userData.half=.6;return g}
function cactus(){const g=new THREE.Group();
  g.add(box(.4,1.7,.4,M.cactus,0,.85,0));g.add(box(.7,.28,.28,M.cactus,.35,1.0,0));g.add(box(.28,.7,.28,M.cactus,.6,1.3,0));
  g.add(box(.6,.26,.26,M.cactus,-.3,.7,0));g.add(box(.26,.6,.26,M.cactus,-.5,1.0,0));g.userData.half=.4;return g}
function reeds(){const g=new THREE.Group();for(let i=0;i<14;i++)g.add(box(.05,R(.8,1.6),.05,M.reed,R(-.4,.4),R(.4,.8),R(-.25,.25)));g.userData.half=.3;return g}
function skullPole(){const g=new THREE.Group();g.add(box(.1,1.9,.1,M.wood2,0,.95,0));g.add(box(.26,.24,.26,M.bone,0,1.95,0));g.add(box(.06,.06,.05,M.coal,-.06,1.97,.13));g.add(box(.06,.06,.05,M.coal,.06,1.97,.13));g.add(box(.6,.08,.08,M.wood2,0,1.55,0));g.userData.half=.15;return g}
