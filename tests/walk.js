// Проверка: игрок не проходит сквозь стены, выход переводит на новый уровень. node tests/walk.js
const {open,scene}=require('./helpers');
(async()=>{const {browser,page,errs}=await open(640,360);let fail=0;
  for(const th of ['dungeon','catacombs','ruins','winter']){
    const info=await scene(page,th,8,3);
    const r=await page.evaluate(()=>{let inside=0,moved=0;const sx=pl.x,sz=pl.z;
      // случайное блуждание с упором в стены
      for(let i=0;i<3000;i++){if(i%60===0){for(const k of ['KeyW','KeyA','KeyD','KeyS'])keys[k]=false;keys[['KeyW','KeyA','KeyD'][i/60%3|0]]=true;pl.yaw+=Math.random()*2-1}
        step(1/30);if(blocked(pl.x,pl.z))inside++}
      moved=Math.hypot(pl.x-sx,pl.z-sz);for(const k in keys)keys[k]=false;
      // телепорт к выходу и шаг наружу
      const lvl=game.level,e=W.exitCell,g=[e.i+.5+e.di*.2,e.j+.5+e.dj*.2],p=warp(g[0],g[1]);pl.x=p[0];pl.z=p[1];
      pl.yaw=e.di?-Math.PI/2:Math.PI;keys.KeyW=true;let t=0;while(game.level===lvl&&t<400){step(1/30);t++}keys.KeyW=false;
      return {inside,moved:+moved.toFixed(1),exited:game.level>lvl,steps:t}});
    const ok=r.inside===0&&r.exited&&r.moved>1;if(!ok)fail++;
    console.log(ok?'OK  ':'FAIL',th,JSON.stringify(info),JSON.stringify(r))}
  if(errs.length){console.log('errors:',errs);fail++}
  await browser.close();process.exit(fail?1:0)})();
