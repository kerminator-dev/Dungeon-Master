// No optional post-processing: normal frames go straight to the canvas; Watcher blindness remains gameplay-only.
const {launch,page:open}=require('./helpers');
(async()=>{const browser=await launch();let failures=0;
  const check=(name,ok,info)=>{console.log((ok?'OK  ':'FAIL')+' '+name+(info?' '+JSON.stringify(info):''));if(!ok)failures++};
  try{const {page,errs}=await open(browser,800,450,()=>localStorage.setItem('labyrinth2',JSON.stringify({post:true,vol:.45,voice:false})));
    check('the retired preference is removed without resetting other settings',await page.evaluate(()=>!Object.prototype.hasOwnProperty.call(S,'post')&&!Object.prototype.hasOwnProperty.call(SET_DEF,'post')&&!Object.prototype.hasOwnProperty.call(JSON.parse(localStorage.getItem('labyrinth2')),'post')&&S.vol===.45&&!S.voice));
    check('the setting and the bloom/grading pipeline are gone',await page.evaluate(()=>!document.getElementById('post')&&!document.getElementById('scr-set').textContent.includes('Visual effects')&&typeof PP==='undefined'&&typeof GRADE==='undefined'&&!document.querySelector('script[src*="07-post"]')));
    const inspect=()=>{const nativeRender=renderer.render,nativeTarget=renderer.setRenderTarget;let passes=0,offscreen=0;
      renderer.render=function(...args){passes++;return nativeRender.apply(this,args)};renderer.setRenderTarget=function(target,...args){if(target)offscreen++;return nativeTarget.call(this,target,...args)};
      try{renderFrame();return {passes,offscreen,target:renderer.getRenderTarget()===null,freed:!BlindRender.frame&&!BlindRender.quarter&&!BlindRender.blurA&&!BlindRender.blurB}}finally{renderer.render=nativeRender;renderer.setRenderTarget=nativeTarget}};
    for(const theme of ['dungeon','ruins','autumn','swamp']){
      await page.evaluate(theme=>{game.instant=true;game.peaceful=true;game.theme=theme;game.size=8;game.level=1;game.seed=11;build();game.started=true;document.getElementById('ui').style.display='none';camera.position.set(pl.x,pl.y,pl.z);camera.rotation.set(pl.pitch,pl.yaw,0,'YXZ');animate(10,.016)},theme);
      const direct=await page.evaluate(inspect);check(theme+': normal rendering has one scene pass and no offscreen targets',direct.passes===1&&direct.offscreen===0&&direct.target&&direct.freed,direct);
      if(theme==='ruins'||theme==='dungeon')await page.screenshot({path:'/tmp/labyrinth-direct-'+theme+'.png'});
    }
    await page.evaluate(()=>{G.blind=G.blindT=10;updateGameplay(.5,1)});
    const blind=await page.evaluate(inspect);check('Watcher blindness still blurs the frame and map',blind.passes>1&&blind.offscreen>0&&await page.evaluate(()=>G.viewBlind>.8&&!!mapC.style.filter),blind);
    check('blindness render targets resize correctly',await page.evaluate(()=>{S.pix=1;onResize();renderFrame();const size=renderer.getDrawingBufferSize(new THREE.Vector2());return BlindRender.frame.width===size.x&&BlindRender.frame.height===size.y&&renderer.getRenderTarget()===null}));
    await page.evaluate(()=>{pl.x=pl.z=-50;for(let i=0;i<12;i++)updateGameplay(1,2+i)});
    const clear=await page.evaluate(inspect);check('recovery returns to direct rendering and frees every blur target',clear.passes===1&&clear.offscreen===0&&clear.freed&&await page.evaluate(()=>!G.viewBlind&&!mapC.style.filter),clear);
    check('no JavaScript or rendering errors',errs.length===0,errs);
  }finally{await browser.close()}
  process.exitCode=failures?1:0;
})().catch(e=>{console.error(e);process.exitCode=1});
