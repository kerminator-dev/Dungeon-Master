// Скриншот карты: node tests/shot.js <theme> [seedIndex] [out.png]
const {open}=require('./helpers');
(async()=>{const [th='forest',seed='1',out='shot.png']=process.argv.slice(2);const {browser,page,errs}=await open(1024,576);
  await page.evaluate(([th])=>{game.theme=th;level=0;N=18;build();game.started=true},[th]);
  await page.waitForTimeout(800);await page.screenshot({path:out});console.log('saved',out,errs);await browser.close()})();
