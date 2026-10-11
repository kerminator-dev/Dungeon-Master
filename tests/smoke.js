// Строит каждую карту на нескольких размерах и проверяет отсутствие ошибок.
const {open}=require('./helpers');
(async()=>{const {browser,page,errs}=await open(640,360);
  const out=await page.evaluate(()=>{const r=[];for(const th of Object.keys(THEMES))for(const n of [5,8,12,30]){
    try{game.theme=th;N=n;const t0=performance.now();build();renderer.render(scene,camera);r.push(`${th} ${n}: ${(performance.now()-t0)|0}ms structs=${maze.structs.length} plazas=${maze.plazas.length} calls=${renderer.info.render.calls}`)}catch(e){r.push(`${th} ${n}: ERROR ${e.message}`)}}return r});
  console.log(out.join('\n'));console.log('console errors:',errs);await browser.close();process.exit(errs.length||out.some(x=>x.includes('ERROR'))?1:0)})();
