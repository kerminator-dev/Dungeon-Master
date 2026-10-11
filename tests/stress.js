// Общая проверка: все темы × ширина 1/2/3 м × уровни 1 и 4, с тенями и случайным движением. node tests/stress.js
const {open}=require('./helpers');
(async()=>{const {browser,page,errs}=await open(640,360);let fail=0;
  await page.evaluate(()=>{document.getElementById('ui').style.display='none';S.pix=3;onResize()});
  for(const sd of [1,2,3])for(const th of ['dungeon','catacombs','ruins','winter'])for(const lvl of [1,4]){
    const r=await page.evaluate(([sd,th,lvl])=>{game.peaceful=false;game.theme=th;game.size=8;game.level=lvl;game.seed=sd*100+lvl;build();game.started=true;
      const o={minH:+W.minWallH.toFixed(2),n:W.n,mon:G.monsters.length,chests:G.chests.length,map:G.chests.some(c=>c.loot.some(l=>l.t==='map'))||G.hasMap};
      const kc=G.chests.find(c=>c.isKey);o.keyReach=!!kc&&reachMap(W.start.x,W.start.z,.28).near(kc.x+kc.nx*.7,kc.z+kc.nz*.7,.4);
      const ep=[W.exitIn.x,W.exitIn.z];o.gateBlocks=!reachMap(W.start.x,W.start.z,.28).has(ep[0],ep[1]);
      {const R=reachMap(W.start.x,W.start.z,.28);o.cellsReach=true;for(let i=0;i<W.n;i++)for(let j=0;j<W.n;j++){const c=warp(i+.5,j+.5);if(!R.near(c[0],c[1],CW*.5+.35))o.cellsReach=false}
       o.rubbles=W.rubbles.length;o.itemsReach=G.chests.every(c=>R.near(c.x+c.nx*.7,c.z+c.nz*.7,.4))}
      G.gate.open=true;o.exitReach=reachMap(W.start.x,W.start.z,.28).has(ep[0],ep[1]);G.gate.open=false;
      // 600 кадров игры со случайным управлением
      const ks=['KeyW','KeyA','KeyD','ShiftLeft'];let t=0;
      for(let i=0;i<600;i++){if(i%45===0){for(const k of ks)keys[k]=false;keys[ks[i/45%3|0]]=true;pl.yaw+=Math.random()*2-1}
        t+=1/30;step(1/30);if(game.level!==lvl)break;updateGameplay(1/30,t);animate(t,1/30);if(i%60===0)renderer.render(scene,camera)}
      for(const k of ks)keys[k]=false;o.inWall=blocked(pl.x,pl.z);
      // жаровни (у стен и у алтаря) не должны уходить в кладку
      o.brz=+Math.min(9,...W.lights.filter(l=>l.kind==='brazier').map(l=>wallDist(l.x,l.z))).toFixed(2);return o},[sd,th,lvl]);
    const ok=r.cellsReach&&r.minH>=2.3&&r.itemsReach&&r.keyReach&&r.gateBlocks&&r.exitReach&&!r.inWall&&r.brz>=.36&&r.mon>0&&r.chests>1&&r.map;if(!ok)fail++;
    console.log((ok?'OK  ':'FAIL')+` seed${sd} ${th} L${lvl}`,JSON.stringify(r))}
  if(errs.length){console.log('errors:',errs.slice(0,5));fail++}
  await browser.close();process.exit(fail?1:0)})();
