// screenshots: node tests/shot.js <theme> [seed] [outPrefix]
const {open,scene,pose}=require('./helpers');
(async()=>{const [th='dungeon',seed='1',out='shot']=process.argv.slice(2);const {browser,page,errs}=await open();
  console.log(await scene(page,th,8,+seed));
  // start, along the corridor
  const st=await page.evaluate(()=>W.start);
  await pose(page,st.x,st.z,st.yaw);await page.screenshot({path:out+'-a.png'});
  // close to a wall, turned
  await pose(page,st.x,st.z,st.yaw+Math.PI/2,-.05);await page.screenshot({path:out+'-b.png'});
  // find a wide view: hall/crossing centre
  const p=await page.evaluate(()=>{let best=null;for(let i=0;i<400;i++){const x=W.b.x0+Math.random()*(W.b.x1-W.b.x0),z=W.b.z0+Math.random()*(W.b.z1-W.b.z0);
    const g=toGrid(x,z);if(g[0]<.3||g[1]<.3||g[0]>W.n-.3||g[1]>W.n-.3)continue;const d=wallDist(x,z);if(!best||d>best.d)best={x,z,d}}return best});
  await pose(page,p.x,p.z,0.7,.08);await page.screenshot({path:out+'-c.png'});
  // wall damage close-up
  const n=await page.evaluate(()=>{const c=W.niches.filter(n=>n.r>.4&&n.y-floorH(n.x,n.z)<1.2);const k=c[1]||W.niches[0];
    const x=k.x+k.nx*1.5,z=k.z+k.nz*1.5;return {x,z,yaw:Math.atan2(k.nx,k.nz)}});
  await pose(page,n.x,n.z,n.yaw,-.35);await page.screenshot({path:out+'-d.png'});
  // items: look at several from ~2 m
  for(const k of [0,1,2]){const v=await page.evaluate(k=>{const ps=W.placed;const p=ps[(k*7+3)%ps.length];
      for(let i=0;i<64;i++){const a=i*.4,d=2+(i%3)*.4,x=p.x+Math.cos(a)*d,z=p.z+Math.sin(a)*d;if(free(x,z)&&wallDist(x,z)>.5)return {x,z,yaw:Math.atan2(x-p.x,z-p.z)}}return null},k);
    if(v){await pose(page,v.x,v.z,v.yaw,-.3);await page.screenshot({path:out+'-p'+k+'.png'})}}
  console.log(errs.length?errs:'no errors');await browser.close()})();
