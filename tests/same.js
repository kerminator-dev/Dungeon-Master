// playing together, every browser must build the very same level from the same numbers: Chromium and WebKit (Safari) build
// a few levels of every map and compare all of it (every object's place, turn, size and shape, the chests and what they
// hold, the shadows, the lights, where one can walk). node tests/same.js (without WebKit installed it says so and passes)
const path=require('path');let pw;try{pw=require('playwright')}catch(e){pw=require(path.join(require('child_process').execSync('npm root -g').toString().trim(),'playwright'))}
const {launch}=require('./helpers');
const LEVELS=[[1,'dungeon',8,4242,0],[3,'catacombs',12,777,1],[2,'cistern',14,31337,1],[4,'ruins',16,55,2],[2,'winter',12,91,0],[5,'graveyard',10,123456,1],[3,'tomb',12,8,0],[2,'desert',12,999999,1]];
// the level as this page has it: hashes of everything, by object
const FP=L=>{game.instant=true;game.peaceful=false;game.mobsExtra=L[4];game.level=L[0];game.theme=L[1];game.size=L[2];game.seed=L[3];game.mapNext=false;build();
  const h=a=>{let x=2166136261>>>0;for(let i=0;i<a.length;i++){const v=Math.round(a[i]*1000);x^=v&0xffff;x=Math.imul(x,16777619)>>>0;x^=v>>>16;x=Math.imul(x,16777619)>>>0}return x};
  const r=v=>Math.round(v*1000)/1000,obj=[];root.updateMatrixWorld(true);
  root.traverse(o=>{if(o===root)return;const g=o.geometry,a=g&&g.attributes;
    obj.push([o.type,...o.matrixWorld.elements.map(r),a&&a.position?a.position.count+':'+h(a.position.array):'',a&&a.color?h(a.color.array):'',
      o.material&&o.material.color?o.material.color.getHexString():'',o.count===undefined?'':o.count,o.instanceMatrix?h(o.instanceMatrix.array):'',o.instanceColor?h(o.instanceColor.array):''].join(','))});
  return {obj,chests:JSON.stringify(G.chests.map(c=>[c.kind,r(c.x),r(c.z),c.loot0,c.lock])),mobs:JSON.stringify(G.monsters.map(m=>[m.kind,m.cell,r(m.x),r(m.z)])),
    lights:JSON.stringify(W.lights.map(l=>[l.kind,r(l.x),r(l.y),r(l.z)])),occ:h(W.occ.occ),rnd:rnd()}};
(async()=>{let wk;try{wk=await pw.webkit.launch()}catch(e){console.log('SKIP WebKit is not installed (npx playwright install webkit)');return}
  const cr=await launch(),url='file://'+path.resolve(__dirname,'..','index.html');let fail=0;
  const run=async(b,L)=>{const p=await (await b.newContext({viewport:{width:800,height:450}})).newPage();await p.goto(url);const f=await p.evaluate(FP,L);await p.context().close();return f};
  for(const L of LEVELS){const a=await run(cr,L),b=await run(wk,L),bad=[];
    for(const k in a){if(k==='obj'){const n=a.obj.filter((s,i)=>s!==b.obj[i]).length+Math.abs(a.obj.length-b.obj.length);if(n)bad.push(n+' of '+a.obj.length+' objects')}
      else if(a[k]!==b[k])bad.push(k)}
    console.log((bad.length?'FAIL':'OK  ')+' the same level in Chromium and WebKit: '+L[1]+' level '+L[0]+' size '+L[2]+(bad.length?' differ: '+bad.join(', '):''));if(bad.length)fail++}
  await cr.close();await wk.close();if(fail){console.log(fail+' FAILED');process.exit(1)}})();
