// Проверяет работу лимита FPS (на программном рендере базовая частота ограничена железом).
const {open}=require('./helpers');
(async()=>{const {browser,page,errs}=await open(640,360);
  await page.evaluate(()=>{S.pix=6;resize();game.theme='dungeon';N=6;build()});
  for(const cap of [0,10,20,30,60]){await page.evaluate(c=>{S.cap=c;nextT=0},cap);
    const r=await page.evaluate(()=>new Promise(res=>{let n=0;const t0=performance.now(),orig=renderer.render.bind(renderer);renderer.render=(a,b)=>{n++;return orig(a,b)};setTimeout(()=>{renderer.render=orig;res(n/((performance.now()-t0)/1000))},3000)}));
    console.log('cap',cap,'->',r.toFixed(1),'fps')}
  console.log(errs);await browser.close()})();
