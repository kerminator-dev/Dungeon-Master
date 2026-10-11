// Проверка: игрок не проходит сквозь стены, выход переводит на новый уровень. node tests/walk.js
const {open,scene}=require('./helpers');
(async()=>{const {browser,page,errs}=await open(640,360);let fail=0;
  for(const th of ['dungeon','catacombs','ruins','winter','city']){
    for(const seed of [3,11,27]){const info=await scene(page,th,8,seed);info.props=await page.evaluate(()=>W.propCount);
    await page.evaluate(()=>{G.gate.open=true});
    // путь от старта до выхода существует с учётом предметов (поиск в ширину по сетке 0.2 м)
    const path=await page.evaluate(()=>{const st=0.2,b=W.b,gw=Math.ceil((b.x1-b.x0)/st),gh=Math.ceil((b.z1-b.z0)/st),seen=new Uint8Array(gw*gh);
      const X=i=>b.x0+(i+.5)*st,Z=j=>b.z0+(j+.5)*st,ep=[W.exitIn.x,W.exitIn.z];
      const s0=[Math.floor((W.start.x-b.x0)/st),Math.floor((W.start.z-b.z0)/st)],q=[s0];seen[s0[1]*gw+s0[0]]=1;
      for(let h=0;h<q.length;h++){const [i,j]=q[h];if(Math.hypot(X(i)-ep[0],Z(j)-ep[1])<.3)return true;
        for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=i+di,c=j+dj;if(a<0||c<0||a>=gw||c>=gh||seen[c*gw+a]||!free(X(a),Z(c)))continue;seen[c*gw+a]=1;q.push([a,c])}}
      return false});
    const r=await page.evaluate(()=>{let inside=0,moved=0;const sx=pl.x,sz=pl.z;
      // случайное блуждание с упором в стены
      for(let i=0;i<3000;i++){if(i%60===0){for(const k of ['KeyW','KeyA','KeyD','KeyS'])keys[k]=false;keys[['KeyW','KeyA','KeyD'][i/60%3|0]]=true;pl.yaw+=Math.random()*2-1}
        const ox=pl.x,oz=pl.z;step(1/30);moved+=Math.hypot(pl.x-ox,pl.z-oz);if(blocked(pl.x,pl.z))inside++}
      for(const k in keys)keys[k]=false;
      // телепорт к выходу и шаг наружу
      const lvl=game.level,e=W.exitCell,g=[e.i+.5+e.di*.2,e.j+.5+e.dj*.2],p=warp(g[0],g[1]);pl.x=p[0];pl.z=p[1];
      pl.yaw=e.di?-Math.PI/2:Math.PI;keys.KeyW=true;let t=0;while(game.level===lvl&&t<400){step(1/30);t++}keys.KeyW=false;
      return {inside,moved:+moved.toFixed(1),exited:game.level>lvl,steps:t}});
    const ok=path&&r.inside===0&&r.exited&&r.moved>5;r.path=path;if(!ok)fail++;
    console.log(ok?'OK  ':'FAIL',th,seed,JSON.stringify(info),JSON.stringify(r))}}
  if(errs.length){console.log('errors:',errs);fail++}
  await browser.close();process.exit(fail?1:0)})();
