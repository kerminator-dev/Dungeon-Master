// Проверка утечек (первый проход заполняет общий кэш текстур, сравниваем со вторым): много смен уровня подряд — память видеокарты (геометрии/текстуры) не должна расти. node tests/leak.js
const {open}=require('./helpers');
(async()=>{const {browser,page,errs}=await open(640,360);let fail=0;
  const r=await page.evaluate(()=>{document.getElementById('ui').style.display='none';game.peaceful=false;const out=[];
    const th=['dungeon','catacombs','ruins','winter','city'];
    for(let i=0;i<20;i++){game.theme=th[i%th.length];game.size=8;game.level=1;game.seed=100+i;build();game.started=true;
      for(let k=0;k<20;k++){step(1/30);updateGameplay(1/30,k/30);animate(k/30,1/30)}renderFrame();
      const m=renderer.info.memory;out.push({th:game.theme,g:m.geometries,t:m.textures,heap:performance.memory?Math.round(performance.memory.usedJSHeapSize/1e6):0})}
    return out});
  const byTh={};for(const x of r)(byTh[x.th]=byTh[x.th]||[]).push(x);
  for(const [th,a] of Object.entries(byTh)){const first=a[1],lastE=a[a.length-1],ok=lastE.g<=first.g*1.25+10&&lastE.t<=first.t+3;if(!ok)fail++;
    console.log((ok?'OK  ':'FAIL')+' '+th,a.map(x=>`g${x.g}/t${x.t}/${x.heap}MB`).join('  '))}
  if(errs.length){console.log('errors:',errs);fail++}
  await browser.close();process.exit(fail?1:0)})();
