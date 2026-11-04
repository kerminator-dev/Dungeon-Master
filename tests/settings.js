// Settings navigation, keyboard input, saved values and responsive layout.
const {open}=require('./helpers');
(async()=>{const {browser,page,errs}=await open(960,700);let failures=0;
  const check=(name,ok,info)=>{console.log((ok?'OK  ':'FAIL')+' '+name+(info?' '+JSON.stringify(info):''));if(!ok)failures++};
  try{
    await page.locator('#btnSet').click();
    check('one settings category is shown at a time',await page.evaluate(()=>document.querySelectorAll('[role="tab"][aria-selected="true"]').length===1&&document.querySelectorAll('.settings-pane:not(.hidden)').length===1));
    await page.screenshot({path:'/tmp/labyrinth-settings-graphics.png'});
    await page.locator('#tabGraphics').focus();await page.keyboard.press('ArrowRight');
    check('arrow keys select and focus the next tab',await page.evaluate(()=>document.activeElement.id==='tabAudio'&&document.getElementById('tabAudio').getAttribute('aria-selected')==='true'&&!document.getElementById('settingsAudio').classList.contains('hidden')));
    await page.screenshot({path:'/tmp/labyrinth-settings-audio.png'});
    await page.locator('#vol').focus();await page.keyboard.press('Home');
    check('master volume applies immediately without changing music',await page.evaluate(()=>S.vol===0&&Snd.out.gain.value===0&&S.music===.5&&document.getElementById('volV').textContent==='0%'));
    await page.locator('#voice').focus();await page.keyboard.press('Space');
    check('voice preference can be changed from the keyboard',await page.evaluate(()=>S.voice===false&&!document.getElementById('voice').checked&&JSON.parse(localStorage.getItem('labyrinth2')).voice===false));
    await page.locator('#tabAudio').focus();await page.keyboard.press('End');
    await page.locator('#sens').focus();await page.keyboard.press('ArrowRight');
    await page.locator('#fov').focus();await page.keyboard.press('ArrowRight');
    await page.locator('#invert').focus();await page.keyboard.press('Space');
    check('camera settings apply and save on input',await page.evaluate(()=>Math.abs(S.sens-1.05)<.001&&S.fov===76&&camera.fov===76&&S.invert&&JSON.parse(localStorage.getItem('labyrinth2')).fov===76));
    await page.screenshot({path:'/tmp/labyrinth-settings-controls.png'});
    await page.locator('#tabControls').focus();await page.keyboard.press('Home');
    await page.locator('#showfps').focus();await page.keyboard.press('Space');
    check('FPS counter belongs to Graphics and can be toggled by keyboard',await page.evaluate(()=>S.showfps&&document.getElementById('fps').style.display==='block'&&document.getElementById('showfps').closest('[role="tabpanel"]').id==='settingsGraphics'));
    await page.evaluate(()=>{NET.on=true;NET.id=1;NET.leader=1;NET.players=[{id:1,name:'Test',col:0,st:'lobby'}]});
    await page.locator('#tabGraphics').focus();await page.keyboard.press('Tab');await page.keyboard.press('Enter');
    check('settings keyboard navigation does not open player list or chat',await page.evaluate(()=>!ROSTER.on&&!CHAT.on));
    await page.locator('#tabAudio').click();await page.locator('#scr-set [data-back]').click();
    check('Back returns to the multiplayer lobby without leaving the session',await page.evaluate(()=>NET.on&&!document.getElementById('scr-play').classList.contains('hidden')));
    await page.evaluate(()=>{NET.on=false;showMenu('set')});
    for(const [width,height] of [[960,540],[390,844],[320,568]]){
      await page.setViewportSize({width,height});
      let anchor=null;
      for(const id of ['tabGraphics','tabAudio','tabControls']){
        await page.locator('#'+id).click();
        const geometry=await page.evaluate(()=>({tabs:document.querySelector('.settings-tabs').getBoundingClientRect().top,back:document.querySelector('#scr-set [data-back]').getBoundingClientRect().top}));if(!anchor)anchor=geometry;check(id+' keeps navigation in place',Math.abs(geometry.tabs-anchor.tabs)<=1&&Math.abs(geometry.back-anchor.back)<=1);
        check(id+` fits ${width}x${height} with Back visible`,await page.evaluate(()=>{const panel=document.getElementById('scr-set'),back=panel.querySelector('[data-back]').getBoundingClientRect();return document.documentElement.scrollWidth<=innerWidth&&panel.scrollWidth<=panel.clientWidth&&back.top>=0&&back.bottom<=innerHeight}));
      }
    }
    await page.screenshot({path:'/tmp/labyrinth-settings-mobile.png'});
    await page.reload();await page.locator('#btnSet').click();
    check('settings survive reload and tab changes',await page.evaluate(()=>S.vol===0&&S.music===.5&&S.fov===76&&Math.abs(S.sens-1.05)<.001&&S.invert&&S.showfps&&!S.voice&&document.getElementById('fov').value==='76'&&document.getElementById('volV').textContent==='0%'));
    check('no JavaScript or browser errors',errs.length===0,errs);
  }finally{await browser.close()}
  process.exitCode=failures?1:0;
})().catch(e=>{console.error(e);process.exitCode=1});
