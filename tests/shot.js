// Скриншоты: node tests/shot.js <theme> [seed] [outPrefix]
const {open,scene,pose}=require('./helpers');
(async()=>{const [th='dungeon',seed='1',out='shot']=process.argv.slice(2);const {browser,page,errs}=await open();
  console.log(await scene(page,th,8,+seed));
  // старт, вдоль коридора
  const st=await page.evaluate(()=>W.start);
  await pose(page,st.x,st.z,st.yaw);await page.screenshot({path:out+'-a.png'});
  // вплотную к стене, повернуться
  await pose(page,st.x,st.z,st.yaw+Math.PI/2,-.05);await page.screenshot({path:out+'-b.png'});
  // ищем точку с широким видом: центр зала/перекрёстка
  const p=await page.evaluate(()=>{let best=null;for(let i=0;i<400;i++){const x=W.b.x0+Math.random()*(W.b.x1-W.b.x0),z=W.b.z0+Math.random()*(W.b.z1-W.b.z0);
    const g=toGrid(x,z);if(g[0]<.3||g[1]<.3||g[0]>W.n-.3||g[1]>W.n-.3)continue;const d=wallDist(x,z);if(!best||d>best.d)best={x,z,d}}return best});
  await pose(page,p.x,p.z,0.7,.08);await page.screenshot({path:out+'-c.png'});
  // выбоина в стене крупным планом
  const n=await page.evaluate(()=>{const c=W.niches.filter(n=>n.r>.4&&n.y-floorH(n.x,n.z)<1.2);const k=c[1]||W.niches[0];
    const x=k.x+k.nx*1.5,z=k.z+k.nz*1.5;return {x,z,yaw:Math.atan2(k.nx,k.nz)}});
  await pose(page,n.x,n.z,n.yaw,-.35);await page.screenshot({path:out+'-d.png'});
  console.log(errs.length?errs:'no errors');await browser.close()})();
