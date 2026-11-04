// Focused checks for the two imported maps, including cold/warm texture caches and playable routes.
const {open,page:openPage}=require('./helpers');
(async()=>{const {browser,page,errs}=await open(960,540);let failed=0;
  const check=(name,ok,info)=>{console.log((ok?'OK  ':'FAIL')+' '+name+(info?': '+JSON.stringify(info):''));if(!ok)failed++};
  try{
    check('both maps appear in the outdoor picker with loaded previews',await page.evaluate(()=>['autumn','swamp'].every(k=>{const card=document.querySelector(`.mapc[data-t="${k}"]`);return WORLDS.outdoor.includes(k)&&card&&card.querySelector('img').complete&&card.querySelector('img').naturalWidth>0})));
    check('exactly two groups classify every map once by its setting',await page.evaluate(()=>{
      const groups=[...document.querySelectorAll('#maps .map-group')];return groups.length===2&&groups.map(g=>g.querySelector('h3').textContent).join(',')==='Outdoors,Underground'&&Object.keys(THEMES).every(k=>{
        const cards=[...document.querySelectorAll(`.mapc[data-t="${k}"]`)];return cards.length===1&&cards[0].closest('.map-group').dataset.group===(THEMES[k].indoor?'underground':'outdoor')&&cards[0].querySelector('img').naturalWidth>0})}));
    check('all theme names, descriptions and weather labels are English',await page.evaluate(()=>Object.values(THEMES).every(t=>!/[\u0400-\u04ff]/.test([t.name,t.desc,...Object.values(t.weather||{}).map(w=>w.name)].join(' ')))));
    check('individual maps and both group selections use the correct pools',await page.evaluate(()=>{
      for(const key of Object.keys(THEMES)){document.querySelector(`.mapc[data-t="${key}"]`).click();if(PICK.get().k!==key||PICK.get().w!==(THEMES[key].indoor?'underground':'outdoor'))return false}
      for(const w of ['outdoor','underground']){document.querySelector(`.world[data-w="${w}"]`).click();if(PICK.get().w!==w||PICK.get().k||!document.getElementById('pickSum').textContent.includes('take turns'))return false}
      return true}));
    await page.evaluate(()=>{showMenu('play');document.querySelector('.mapc[data-t="autumn"]').click()});await page.setViewportSize({width:960,height:800});await page.screenshot({path:'/tmp/labyrinth-map-picker-desktop.png'});
    await page.setViewportSize({width:390,height:844});
    check('the mobile picker fits the viewport and retains all previews',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.querySelector('#maps').scrollWidth<=document.querySelector('#maps').clientWidth&&document.querySelectorAll('.mapc img').length===Object.keys(THEMES).length));
    await page.screenshot({path:'/tmp/labyrinth-map-picker-mobile.png'});await page.setViewportSize({width:960,height:540});
    for(const [width,height] of [[960,540],[390,844],[320,568]]){
      await page.setViewportSize({width,height});
      check(`Start, Back and maze size remain visible at ${width}x${height}`,await page.evaluate(()=>{
        const visible=id=>{const r=document.getElementById(id).getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth};
        const back=document.querySelector('#scr-play [data-back]').getBoundingClientRect();return visible('btnStart')&&visible('sizes')&&back.top>=0&&back.bottom<=innerHeight&&document.documentElement.scrollWidth<=innerWidth}));
      await page.locator('.world[data-w="any"]').click();check(`Any map is reachable and selects the rotation at ${width}px`,await page.evaluate(()=>PICK.get().w==='any'&&!PICK.get().k&&document.querySelectorAll('#scr-play .world[aria-pressed="true"],#maps .mapc[aria-pressed="true"]').length===1));
    }
    await page.setViewportSize({width:960,height:540});
    const legacy=await openPage(browser,960,540,()=>localStorage.setItem('labyrinth2',JSON.stringify({world:'desert',theme:'tomb',pick:null,size:8})));
    check('saved Desert category migrates to the setting of its current map',await legacy.page.evaluate(()=>game.world==='underground'&&PICK.get().w==='underground'&&!document.querySelector('.world[data-w="desert"]')));await legacy.page.context().close();
    if(process.argv.includes('--picker-only')){check('picker pages have no JavaScript errors',errs.length===0,errs);if(failed)process.exitCode=1;return}
    const verify=arg=>{const [theme,seed]=arg;game.peaceful=true;game.instant=true;game.theme=theme;game.size=8;game.level=1;game.seed=seed;game.mapNext=false;build();game.started=true;
      const route=reachMap(W.start.x,W.start.z,.28),key=G.chests.find(c=>c.isKey),n=W.n;
      let cells=true;for(let i=0;i<n;i++)for(let j=0;j<n;j++){const c=warp(i+.5,j+.5);if(!route.near(c[0],c[1],CW*.5+.35))cells=false}
      const loot=G.chests.every(c=>route.near(c.x+c.nx*.7,c.z+c.nz*.7,.45)),keyReach=!!key&&route.near(key.x+key.nx*.7,key.z+key.nz*.7,.45);
      const gateBlocks=!route.has(W.exitIn.x,W.exitIn.z);G.gate.open=true;const exitReach=reachMap(W.start.x,W.start.z,.28).has(W.exitIn.x,W.exitIn.z);G.gate.open=false;
      const h=a=>{let x=2166136261>>>0;for(let i=0;i<a.length;i++){x^=Math.round(a[i]*1000);x=Math.imul(x,16777619)>>>0}return x};
      const geometry=[];root.updateMatrixWorld(true);root.traverse(o=>{if(o===root)return;const g=o.geometry,a=g&&g.attributes;geometry.push([o.type,h(o.matrixWorld.elements),a&&a.position&&h(a.position.array),a&&a.color&&h(a.color.array),a&&a.off&&h(a.off.array),o.count,g&&g.instanceCount])});
      const signature=JSON.stringify({geometry,occ:h(W.occ.occ),chests:G.chests.map(c=>[c.x,c.z,c.kind,c.loot0]),mobs:G.monsters.map(m=>[m.kind,m.cell]),lights:W.lights});
      const effects=!!W.nm&&W.nm.pts.length>0&&(theme!=='swamp'||!!W.td.water&&W.td.wisps.length>0);
      const before=W.nm.pts.length;SeasonMaps.update(10,.016);document.getElementById('ui').style.display='none';camera.position.set(pl.x,pl.y,pl.z);camera.rotation.set(pl.pitch,pl.yaw,0,'YXZ');animate(10,.016);renderFrame();
      return {cells,loot,keyReach,gateBlocks,exitReach,effects,signature,water:!!W.td.water,callbacks:before,mem:{...renderer.info.memory}};
    };
    for(const theme of ['autumn','swamp']){
      const first=await page.evaluate(verify,[theme,11]);check(theme+': every cell, key and chest are reachable; gate controls exit',first.cells&&first.loot&&first.keyReach&&first.gateBlocks&&first.exitReach);
      check(theme+': imported effects render and update',first.effects,{water:first.water,callbacks:first.callbacks});
      // Camera/player position from the preceding level and a warmed tree atlas must not change the level.
      await page.evaluate(()=>{camera.position.set(90,4,-30);pl.x=90;pl.z=-30});
      const warm=await page.evaluate(verify,[theme,11]);check(theme+': cold and warm cache generate exactly the same level',first.signature===warm.signature);
      await page.screenshot({path:'/tmp/labyrinth-'+theme+'-final.png'});
      const other=await page.evaluate(verify,[theme,73]);check(theme+': a second seed also has reachable loot and exit',other.cells&&other.loot&&other.keyReach&&other.gateBlocks&&other.exitReach);
      const again=await page.evaluate(verify,[theme,11]);check(theme+': regeneration releases GPU resources',again.mem.geometries<=warm.mem.geometries+2&&again.mem.textures<=warm.mem.textures+2,{before:warm.mem,after:again.mem});
    }
    check('the original outdoor maps still build',await page.evaluate(()=>{for(const theme of ['ruins','winter','graveyard']){game.theme=theme;game.size=8;game.level=1;build();if(!G.chests.some(c=>c.isKey))return false}return true}));
    check('no JavaScript or rendering errors',errs.length===0,errs);
  }finally{await browser.close()}
  process.exitCode=failed?1:0;
})().catch(e=>{console.error(e);process.exitCode=1});
