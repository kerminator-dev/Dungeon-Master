// general check: all themes × width 1/2/3 m × levels 1 and 4, with shades and random movement. node tests/stress.js
const {open}=require('./helpers');
(async()=>{const {browser,page,errs}=await open(640,360);let fail=0;
  await page.evaluate(()=>{document.getElementById('ui').style.display='none';S.pix=3;onResize()});
  for(const sd of [1,2,3])for(const th of ['dungeon','catacombs','ruins','winter','tomb','cistern','desert','graveyard'])for(const lvl of [1,4]){
    const r=await page.evaluate(([sd,th,lvl])=>{game.peaceful=false;game.theme=th;game.size=8;game.level=lvl;game.seed=sd*100+lvl;build();game.started=true;
      const o={minH:+W.minWallH.toFixed(2),n:W.n,mon:G.monsters.length,chests:G.chests.length,map:G.chests.some(c=>c.loot.some(l=>l.t==='map'))||G.hasMap};
      const kc=G.chests.find(c=>c.isKey);o.keyReach=!!kc&&reachMap(W.start.x,W.start.z,.28).near(kc.x+kc.nx*.7,kc.z+kc.nz*.7,.4);
      const ep=[W.exitIn.x,W.exitIn.z];o.gateBlocks=!reachMap(W.start.x,W.start.z,.28).has(ep[0],ep[1]);
      {const R=reachMap(W.start.x,W.start.z,.28);o.cellsReach=true;for(let i=0;i<W.n;i++)for(let j=0;j<W.n;j++){const c=warp(i+.5,j+.5);if(!R.near(c[0],c[1],CW*.5+.35))o.cellsReach=false}
       o.rubbles=W.rubbles.length;o.itemsReach=G.chests.every(c=>R.near(c.x+c.nx*.7,c.z+c.nz*.7,.4))}
      G.gate.open=true;o.exitReach=reachMap(W.start.x,W.start.z,.28).has(ep[0],ep[1]);G.gate.open=false;
      // the exit far from the start (half the longest walk there, the cave-in left out, and half the maze across, or more);
      // masonry over every arch; an arch in a corridor wall is a recess: behind it a wall, no way through, no gate in reach
      {const A=W.exitArch,e=W.exitCell,d=A.d,n=W.n,M=W.M,wall=(i,j,a,b)=>a===1?M.V[i+1][j]:a===-1?M.V[i][j]:b===1?M.Hh[i][j+1]:M.Hh[i][j],
         dist=cellDist({open:(i,j,a,b)=>!wall(i,j,a,b)||wall(i,j,a,b)===2},n,0,0);
       o.exitFar=dist[e.i*n+e.j]>=Math.max(...dist)*.5&&e.i+e.j>=n/2;o.inner=!!A.inner;
       o.crown=W.arches.every(B=>{const ax=Math.abs(B.d[0])>.5;for(let c=-B.w/2+.125;c<B.w/2;c+=.25)
         if(!W.wallSolid(B.cx-B.d[0]*.6+(ax?0:c),B.hs+Math.sqrt(B.w*B.w/4-c*c)+.15,B.cz-B.d[1]*.6+(ax?c:0)))return false;return true});
       if(A.inner){let back=true;for(let u=-.7;u<=.7;u+=.35)for(let y=.2;y<2.2;y+=.5)if(!W.wallSolid(A.cx+d[0]*.6+d[1]*u,y,A.cz+d[1]*.6+d[0]*u))back=false;
         const p0=[pl.x,pl.z,pl.yaw];G.gate.open=true;pl.x=A.cx+d[0]*(WT/2+.3);pl.z=A.cz+d[1]*(WT/2+.3);pl.yaw=Math.atan2(d[0],d[1]);keys.KeyW=true;
         for(let t=0;t<30&&!game.trading;t++)step(1/30);keys.KeyW=false;o.behind=back&&!game.trading&&gateDist()===99;G.gate.open=false;[pl.x,pl.z,pl.yaw]=p0}}
      // 600 frames of random input
      const ks=['KeyW','KeyA','KeyD','ShiftLeft'];let t=0;
      for(let i=0;i<600;i++){if(i%45===0){for(const k of ks)keys[k]=false;keys[ks[i/45%3|0]]=true;pl.yaw+=Math.random()*2-1}
        t+=1/30;step(1/30);if(game.level!==lvl)break;updateGameplay(1/30,t);animate(t,1/30);if(i%60===0)renderer.render(scene,camera)}
      for(const k of ks)keys[k]=false;o.inWall=blocked(pl.x,pl.z);
      // braziers (by walls and altar) must not sink into masonry
      o.brz=+Math.min(9,...W.lights.filter(l=>l.kind==='brazier').map(l=>wallDist(l.x,l.z))).toFixed(2);return o},[sd,th,lvl]);
    const ok=r.cellsReach&&r.minH>=2.0&&r.itemsReach&&r.keyReach&&r.gateBlocks&&r.exitReach&&r.exitFar&&r.crown&&r.behind!==false&&!r.inWall&&r.brz>=.36&&r.mon>0&&r.chests>1&&r.map;if(!ok)fail++;
    console.log((ok?'OK  ':'FAIL')+` seed${sd} ${th} L${lvl}`,JSON.stringify(r))}
  if(errs.length){console.log('errors:',errs.slice(0,5));fail++}
  await browser.close();process.exit(fail?1:0)})();
