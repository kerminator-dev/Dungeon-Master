// Универсальный просмотр: node tests/view.js <theme> <out.png> "<js, выполняется в игре после build>"
const {open}=require('./helpers');
(async()=>{const [th='dungeon',out='view.png',code='']=process.argv.slice(2);const {browser,page,errs}=await open(1024,576);
  await page.evaluate(([th])=>{game.theme=th;level=0;N=18;player.eye=1.6;build();game.started=true;nextT=0},[th]);
  if(code)await page.evaluate(code);
  await page.waitForTimeout(700);await page.screenshot({path:out});console.log('saved',out,errs);await browser.close()})();
