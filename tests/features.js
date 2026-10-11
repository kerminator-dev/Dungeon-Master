// gameplay mechanics check: node tests/features.js
const {open,scene}=require('./helpers');
(async()=>{const {browser,page,errs}=await open(800,450);let fail=0;
  const check=(name,ok,info)=>{console.log((ok?'OK  ':'FAIL')+' '+name+(info!==undefined?' '+JSON.stringify(info):''));if(!ok)fail++};
  for(const th of ['dungeon','winter']){await scene(page,th,10,5);console.log('--',th);
    const r=await page.evaluate(()=>{const o={};const tick=(n=1)=>{for(let i=0;i<n;i++){step(1/30);updateGameplay(1/30,performance.now()/1000)}};
      o.noBeam=!W.exitBeam;o.noMinimap=getComputedStyle(document.getElementById('map')).display==='none';o.fx=TH.fx?TH.fx.type:null;
      // chests: walk up, press E, wait for loot to fly out
      const openChest=c=>{pl.x=c.x+c.nx*1.1;pl.z=c.z+c.nz*1.1;pl.yaw=Math.atan2(c.nx,c.nz);tick();const pr=document.getElementById('prompt').style.display==='block';useAction();
        if(LP.active){LP.ang=LP.sweet;LP.hold=true;for(let i=0;i<200&&LP.active;i++)updateLockpick(1/30);LP.hold=false}
        let glow=0;for(let i=0;i<110;i++){tick();if(c.glow)glow=Math.max(glow,c.glow.scale.x)}c.maxGlow=glow;return pr&&c.opened};
      o.chests=G.chests.length;const kc=G.chests.find(c=>c.isKey);o.keyChest=!!kc;
      const g=G.gate;const A=W.exitArch;pl.x=A.cx-A.d[0]*(WT/2+1);pl.z=A.cz-A.d[1]*(WT/2+1);tick();o.gateClosed=!g.open&&!g.opening&&blocked(W.exitIn.x,W.exitIn.z);
      o.keyPrompt=openChest(kc);o.keyTaken=G.hasKey;o.chestBlocks=blocked(kc.x,kc.z);
      pl.x=A.cx-A.d[0]*(WT/2+1);pl.z=A.cz-A.d[1]*(WT/2+1);tick(90);o.gateOpen=g.open&&!blocked(W.exitIn.x,W.exitIn.z);
      const mc=G.chests.find(c=>!c.opened&&c.loot.some(l=>l.t==='map'));if(mc)openChest(mc);o.hasMap=G.hasMap;
      // lockpicking: pick at the wrong spot bends and breaks
      let lc=G.chests.find(c=>!c.opened&&c.lock>=0);if(!lc){lc=G.chests.find(c=>c.kind==='chest'&&!c.opened&&!c.isKey&&!c.loot.some(l=>l.t==='map'));if(lc)lc.lock=1}o.locked=!!lc;
      if(lc){game.picks=3;pl.x=lc.x+lc.nx*1.1;pl.z=lc.z+lc.nz*1.1;pl.yaw=Math.atan2(lc.nx,lc.nz);tick();useAction();o.lpOpened=LP.active;
        LP.ang=LP.sweet>1.5?LP.sweet-1.4:LP.sweet+1.4;LP.hold=true;for(let i=0;i<120;i++)updateLockpick(1/30);LP.hold=false;o.pickBroke=game.picks<3;o.stillLocked=lc.lock>=0&&!lc.opened;
        // keys: E held from opening does not turn; after release W turns the lock
        LP.ang=LP.sweet;LP.turn=0;LP.hp=1;LP.ready=false;keys.KeyE=true;updateLockpick(.3);o.heldE=LP.turn===0;keys.KeyE=false;
        updateLockpick(1/30);keys.KeyW=true;updateLockpick(.2);o.wTurns=LP.turn>0||!LP.active;keys.KeyW=false;
        stopLockpick();game.picks=5}
      o.urns=G.chests.filter(c=>c.kind==='urn').length;o.purses=G.chests.filter(c=>c.kind==='purse').length;
      const g0=G.gold,n0=G.gems.length;for(const c of G.chests.filter(c=>!c.opened&&c.kind!=='altar'))openChest(c);
      o.glowShown=kc.maxGlow>.5;o.lockedOpened=!lc||lc.opened;o.gold=G.gold-g0;o.gems=G.gems.slice(n0);
      o.allOpen=G.chests.every(c=>c.opened||c.kind==='altar');o.fly=G.fly.length;o.lootLines=document.getElementById('loot').children.length;
      // shrine: prayer refills the torch and extends burn time
      const alt=G.chests.find(c=>c.kind==='altar');o.altar=!!alt;
      if(alt){G.fuel=.3;const ft=G.fuelT;pl.x=alt.x+alt.nx*1.1;pl.z=alt.z+alt.nz*1.1;pl.yaw=Math.atan2(alt.nx,alt.nz);tick();useAction();o.blessed=G.fuel===1&&G.fuelT>ft}
      // rubble blocks a passage, but the maze stays connected
      o.rubbles=W.rubbles.length;if(W.rubbles.length){const R=W.rubbles[0];o.rubbleBlocks=blocked(R.cx,R.cz);o.connected=cellDist(W.M,W.n,0,0).every(d=>d>=0)}
      o.shafts=TH.indoor?W.shafts.length:-1;o.banners=root.children.length;
      // gem variety
      const kinds=new Set();for(let i=0;i<400;i++)kinds.add(rollGem().key);o.gemKinds=kinds.size;
      // icon hud
      updateHud();o.hudIcons=document.querySelectorAll('#inv img').length;
      // torch
      if(TH.indoor){G.fuel=1;pl.x=W.start.x;pl.z=W.start.z;const far=W.lights.every(l=>Math.hypot(l.x-pl.x,l.z-pl.z)>1.6);
        if(far){tick(300);o.fuelDrops=G.fuel<1&&G.fuel>.9}else o.fuelDrops='start near torch';
        const l=W.lights[0];G.fuel=.3;pl.x=l.x;pl.z=l.z;tick();o.refill=G.fuel===1}
      // puddles
      o.puddles=G.drips.length;
      // shade: enable, place nearby; must catch and send back to start
      game.peaceful=false;buildMonsters(root);
      o.monsters=G.monsters.length;G.grace=0;
      const mo=G.monsters[0];o.spawned=mo.m.position.distanceTo(new THREE.Vector3(mo.x,0,mo.z))<.01&&Math.hypot(mo.x,mo.z)>1;const c=warp(mo.cell[0]+.5,mo.cell[1]+.5);pl.x=c[0]+.2;pl.z=c[1];const d0=G.deaths;
      for(let i=0;i<60&&G.deaths===d0;i++)tick();o.caught=G.deaths>d0&&Math.hypot(pl.x-W.start.x,pl.z-W.start.z)<.01;o.keyBack=!G.hasKey&&!kc.opened&&kc.loot.some(l=>l.t==='key');
      // shade moves on patrol
      G.grace=0;const m2=G.monsters[0],p0=[m2.x,m2.z];pl.x=W.start.x;pl.z=W.start.z;for(let i=0;i<90;i++)updateMonsters(1/30,i/30);
      o.monsterMoves=Math.hypot(m2.x-p0[0],m2.z-p0[1])>.5;o.frames=new Set();for(let i=0;i<60;i++){updateMonsters(1/30,i/30);o.frames.add(m2.body.material.map.offset.x)}o.frames=o.frames.size;o.sprite=m2.body.isSprite;game.peaceful=true;
      return o});
    check('no beam over exit',r.noBeam);check('no permanent minimap',r.noMinimap);check('no pollen',r.fx!=='pollen',r.fx);
    check('chests exist, one holds the key',r.chests>0&&r.keyChest,r.chests);check('gate closed without key',r.gateClosed);
    check('chest shows [E] prompt and opens',r.keyPrompt);check('key flies out and is picked up',r.keyTaken);check('chest blocks movement',r.chestBlocks);
    check('gate opens with key',r.gateOpen);
    check('map from chest',r.hasMap);check('gold and gems from chests',r.gold>0,[r.gold,r.gems]);
    check('glow from open chest',r.glowShown);check('urns and purses exist',r.urns>0&&r.purses>0,[r.urns,r.purses]);
    if(r.locked){check('locked chest opens lockpick screen',r.lpOpened);check('wrong spot breaks the pick',r.pickBroke);check('E held from opening does not turn lock',r.heldE);check('W turns the lock',r.wTurns);check('lock stays locked',r.stillLocked);check('right spot opens the lock',r.lockedOpened)}
    check('all chests open, loot landed',r.allOpen&&r.fly===0);check('loot lines on screen',r.lootLines>0,r.lootLines);
    if(th==='dungeon'){check('torch burns down over time',r.fuelDrops===true,r.fuelDrops);check('torch refills from fire',r.refill)}
    if(th==='dungeon')check('puddles exist',r.puddles>0,r.puddles);
    if(r.altar)check('altar prayer refills and extends torch',r.blessed);
   if(r.rubbles)check('rubble blocks passage, maze connected',r.rubbleBlocks&&r.connected);
    if(r.shafts>=0)check('light shafts from vault',r.shafts>0,r.shafts);check('many gem kinds',r.gemKinds>=14,r.gemKinds);check('icon hud',r.hudIcons>=5,r.hudIcons);
        check('shades spawned',r.monsters>0,r.monsters);check('shade catches and sends to start',r.caught);check('lost key returns to chest',r.keyBack);check('shade patrols',r.monsterMoves)
    check('skeleton is an animated walking sprite',r.sprite&&r.frames>=3,r.frames);check('skeleton spawns on its cell',r.spawned);}
  const pp=await page.evaluate(()=>{S.post=true;renderFrame();const a=!!PP.rt;S.post=false;renderFrame();S.post=true;return a});check('post-processing renders a frame',pp);
  if(errs.length){console.log('errors:',errs);fail++}
  await browser.close();process.exit(fail?1:0)})();
