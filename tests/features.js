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
      o.urns=G.chests.filter(c=>c.kind==='urn').length;o.purses=G.chests.filter(c=>c.kind==='coins').length;
      // coins lie on the bottom brick of a wall pit, at hand height; standing in front of the pit, E takes them
      const hc=G.chests.filter(c=>c.kind==='coins');o.coinsInPits=hc.every(c=>{const h=c.g.position.y-floorH(c.x+c.nx*.6,c.z+c.nz*.6);
        return W.wallSolid(c.x,c.g.position.y-.05,c.z)&&!W.wallSolid(c.x,c.g.position.y+.05,c.z)&&h>.4&&h<1.45});
      if(hc[0]){const c=hc[0],sx=pl.x,sz=pl.z,sy=pl.yaw,gg=G.gold;pl.x=c.x+c.nx*.75;pl.z=c.z+c.nz*.75;pl.yaw=Math.atan2(c.nx,c.nz);
        o.coinPrompt=chestInReach()===c;useAction();
        // the very coins of the heap fly out, one after another; they never drop to the floor, and the gold counts when the last one arrives
        const n=c.g.userData.heap.list.length,flying=G.fly.length;let low=9,early=G.gold>gg;for(let i=0;i<20;i++){updateChests(1/30,i/30);for(const f of G.fly)low=Math.min(low,f.m.position.y-c.g.position.y)}
        for(let i=0;i<100;i++)updateChests(1/30,i/30);o.coinsFly=[flying,n,+low.toFixed(3)];o.coinsFlyOk=flying===n&&low>-.02&&!early;
        o.coinsTaken=c.opened&&G.gold>gg&&!c.g.visible&&!G.fly.length;pl.x=sx;pl.z=sz;pl.yaw=sy}
      // an urn: the lid lifts and tips over first; the loot only comes out once it has (and grows out of the mouth)
      const u=G.chests.find(c=>c.kind==='urn'&&!c.opened);if(u){const f0=G.fly.length;openContainer(u);let at=-1,most=0;for(let i=0;i<60;i++){updateChests(1/30,i/30);most=Math.max(most,G.fly.length-f0);if(!u.loot.length&&at<0)at=u.t}
        o.urnCoins=most;
        o.urnAt=+at.toFixed(2);o.urnOk=at>=.7&&Math.abs(u.piv.rotation.z+.5)<.01}else o.urnOk=true;
      const g0=G.gold,n0=G.gems.length;for(const c of G.chests.filter(c=>!c.opened&&c.kind!=='altar'))openChest(c);
      o.glowShown=kc.maxGlow>.5;o.lockedOpened=!lc||lc.opened;o.gold=G.gold-g0;o.gems=G.gems.slice(n0);
      o.allOpen=G.chests.every(c=>c.opened||c.kind==='altar');o.fly=G.fly.length;o.lootLines=document.getElementById('loot').children.length;
      // altar: praying is free and grants the blessing rolled for this maze, once
      const alt=G.chests.find(c=>c.kind==='altar');o.altar=!!alt;
      if(alt){pl.x=alt.x+alt.nx*1.1;pl.z=alt.z+alt.nz*1.1;pl.yaw=Math.atan2(alt.nx,alt.nz);tick();game.gold=0;const want=rollBlessing();useAction();
        o.blessed=alt.opened&&G.bless[want.id]===1&&game.gold===0&&Object.keys(G.bless).length===1;
        // fixed per maze: the same seed rolls the same blessing, other mazes roll others
        const s0=game.seed,seen=new Set();for(let k=0;k<40;k++){game.seed=s0+k;seen.add(rollBlessing().id)}game.seed=s0;o.sameRoll=rollBlessing().id===want.id;o.kinds=seen.size}
      // rubble blocks a passage, but the maze stays connected
      o.rubbles=W.rubbles.length;if(W.rubbles.length){const R=W.rubbles[0];o.rubbleBlocks=blocked(R.cx,R.cz);o.connected=cellDist(W.M,W.n,0,0).every(d=>d>=0)}
      o.shafts=TH.indoor?W.shafts.length:-1;o.banners=root.children.length;
      // gem variety
      const kinds=new Set();for(let i=0;i<400;i++)kinds.add(rollGem().key);o.gemKinds=kinds.size;
      // icon hud
      updateHud();o.hudIcons=document.querySelectorAll('#inv img').length;
      // torch: none to begin with (no light of the player's own, no fuel bar, nothing in view); once bought it is held in view and lights the way
      o.torchless=!game.torch;if(TH.indoor){tick();o.dark=hand.intensity===0&&document.getElementById('fuel').style.display==='none'&&(!TORCH||!TORCH.T.visible);
        game.torch=true;tick();o.torchShown=!!TORCH&&TORCH.T.visible&&hand.intensity>0&&document.getElementById('fuel').style.display==='block';
        // spent, it goes out completely: no flame, no light; it is drawn solid (with depth), in a pass of its own
        const fx=pl.x,fz=pl.z;let far=null;for(let i=0;i<W.n&&!far;i++)for(let j=0;j<W.n&&!far;j++){const c=warp(i+.5,j+.5);if(W.lights.every(l=>Math.hypot(l.x-c[0],l.z-c[1])>2))far=c}
        if(far){pl.x=far[0];pl.z=far[1]}G.fuel=0;G.fuelT=1e9;tick();pl.x=fx;pl.z=fz;o.torchOutV=[G.fuel,hand.intensity,TORCH.fl.visible,TORCH.lit.intensity];o.torchOut=hand.intensity===0&&!TORCH.fl.visible&&TORCH.lit.intensity===0;o.torchSolid=TORCH.T.children.filter(c=>c.isMesh).every(c=>c.material.depthTest&&c.material.depthWrite&&!c.material.transparent);G.fuel=1;G.fuelT=120}
      else{game.torch=true;tick();o.dark=hand.intensity===0&&(!TORCH||!TORCH.T.visible);o.torchShown=true}
      if(TH.indoor){G.fuel=1;pl.x=W.start.x;pl.z=W.start.z;const far=W.lights.every(l=>Math.hypot(l.x-pl.x,l.z-pl.z)>1.6);
        if(far){tick(300);o.fuelDrops=G.fuel<1&&G.fuel>.9}else o.fuelDrops='start near torch';
        const l=W.lights[0];G.fuel=.3;pl.x=l.x;pl.z=l.z;tick();o.refill=G.fuel===1}
      game.torch=false;
      // puddles
      o.puddles=G.drips.length;
      // shade: enable, place nearby; must catch and send back to start
      game.peaceful=false;buildMonsters(root,['wraith']);
      o.monsters=G.monsters.length;G.grace=0;
      const mo=G.monsters[0];o.spawned=mo.m.position.distanceTo(new THREE.Vector3(mo.x,0,mo.z))<.01&&Math.hypot(mo.x,mo.z)>1;const c=warp(mo.cell[0]+.5,mo.cell[1]+.5);pl.x=c[0]+.2;pl.z=c[1];const d0=game.caught;
      game.entry={gold:7,gems:[],picks:2,mapNext:false};const G0=G;
      for(let i=0;i<60&&game.caught===d0;i++)tick();o.caught=game.caught>d0&&Math.hypot(pl.x-W.start.x,pl.z-W.start.z)<.01;
      o.reset=G!==G0&&!G.hasKey&&G.chests.every(c=>!c.opened)&&G.chests.some(c=>c.isKey&&c.loot.some(l=>l.t==='key'))&&game.gold===7&&game.picks===2&&game.gems.length===0;
      for(const m of G.monsters)root.remove(m.m);G.monsters=[];buildMonsters(root,['wraith']);   // the rebuilt level rolled its own mobs
      // shade moves on patrol
      G.grace=0;const m2=G.monsters[0],p0=[m2.x,m2.z];pl.x=W.start.x;pl.z=W.start.z;for(let i=0;i<90;i++)updateMonsters(1/30,i/30);
      o.monsterMoves=Math.hypot(m2.x-p0[0],m2.z-p0[1])>.5;
      // it floats while it drifts: bobs, sways its arms, the hem ripples
      const J=()=>[m2.body.position.y,m2.armR.rotation.x,m2.armL.rotation.x,m2.hemGeo.attributes.position.array[1]];let swing=[0,0,0,0];const j0=J();
      for(let i=0;i<60;i++){updateMonsters(1/30,i/30);J().forEach((v,k)=>swing[k]=Math.max(swing[k],Math.abs(v-j0[k])))}o.swing=swing.map(v=>+v.toFixed(3));
      o.floats=m2.body.position.y>.1;
      // skinned robe and glow (eyes, lantern glass), the hem, two halos: five draw calls for the whole wraith
      const parts=[];m2.m.traverse(c=>{if(c.isMesh||c.isSprite)parts.push(c)});
      o.model=m2.kind==='wraith'&&parts.length<=5&&parts.some(c=>c.isSkinnedMesh&&c.material.isMeshLambertMaterial)&&parts.some(c=>c.isSkinnedMesh&&c.material.isMeshBasicMaterial);
      // its lantern lights the walls near the player, also while it is hidden behind a wall (not drawn); far off it is dark
      const sx=pl.x,sz=pl.z,lit=vis=>{G.lanternLight.intensity=0;m2.m.visible=vis;animWraith(m2,1/30,3,0,0,0);m2.m.visible=true;return G.lanternLight.intensity>0};
      pl.x=m2.x+3;pl.z=m2.z;o.light=lit(true);o.lightHidden=lit(false);pl.x=m2.x+40;o.lightFar=!lit(true);pl.x=sx;pl.z=sz;
      // chasing far off it leans in and reaches; right at the player it lifts the lantern
      m2.mode='chase';m2.pose=0;const px=pl.x,pz=pl.z;pl.x=m2.x+6;pl.z=m2.z;for(let i=0;i<30;i++)animWraith(m2,1/30,i/30,4/30,0,4/30);
      o.runs=m2.run>.8&&m2.pose<.05&&m2.body.rotation.x>.3;const sw=m2.armL.rotation.x;pl.x=m2.x+1;for(let i=0;i<30;i++)animWraith(m2,1/30,i/30,4/30,0,4/30);
      o.raises=m2.armL.rotation.x<sw-.5;
      // the lantern keeps hanging down whatever the arm does
      m2.lan.updateWorldMatrix(true,false);const up=new THREE.Vector3(0,1,0).transformDirection(m2.lan.matrixWorld);o.upright=+up.y.toFixed(2);
      pl.x=px;pl.z=pz;m2.mode='patrol';
      // chase speed: faster than a walking player, slower than a sprinting one
      o.pace=[m2.chase,G.monsters.length];o.paceOk=m2.chase>3&&m2.chase<5.2;game.peaceful=true;
      return o});
    check('no beam over exit',r.noBeam);check('no permanent minimap',r.noMinimap);check('no pollen',r.fx!=='pollen',r.fx);
    check('chests exist, one holds the key',r.chests>0&&r.keyChest,r.chests);check('gate closed without key',r.gateClosed);
    check('chest shows [E] prompt and opens',r.keyPrompt);check('key flies out and is picked up',r.keyTaken);check('chest blocks movement',r.chestBlocks);
    check('gate opens with key',r.gateOpen);
    check('map from chest',r.hasMap);check('gold and gems from chests',r.gold>0,[r.gold,r.gems]);
    check('glow from open chest',r.glowShown);check('urns and handfuls of coins exist',r.urns>0&&r.purses>0,[r.urns,r.purses]);check('coins lie on bricks in wall pits at hand height',r.coinsInPits);check('coins in a pit are taken with E',r.coinPrompt&&r.coinsTaken,[r.coinPrompt,r.coinsTaken]);
    if(r.locked){check('locked chest opens lockpick screen',r.lpOpened);check('wrong spot breaks the pick',r.pickBroke);check('E held from opening does not turn lock',r.heldE);check('W turns the lock',r.wTurns);check('lock stays locked',r.stillLocked);check('right spot opens the lock',r.lockedOpened)}
    check('all chests open, loot landed',r.allOpen&&r.fly===0);check('loot lines on screen',r.lootLines>0,r.lootLines);
    check('no torch to begin with: no light of your own, nothing in view',r.torchless&&r.dark);check('a torch, once had, is held in view and lights the way',r.torchShown);if(r.torchOut!==undefined){check('a spent torch goes out completely',r.torchOut,r.torchOutV);check('the torch is drawn solid',r.torchSolid)}
    check('urn lid opens before the loot comes out',r.urnOk,r.urnAt);check('gold from an urn flies out as a burst of coins',r.urnCoins>=5,r.urnCoins);check('the coins of the heap fly to the player one by one',r.coinsFlyOk,r.coinsFly);
    if(th==='dungeon'){check('torch burns down over time',r.fuelDrops===true,r.fuelDrops);check('torch refills from fire',r.refill)}
    if(th==='dungeon')check('puddles exist',r.puddles>0,r.puddles);
    if(r.altar){check('altar grants a blessing for free',r.blessed);check('blessing is fixed per maze, varies between mazes',r.sameRoll&&r.kinds>=4,r.kinds)}
   if(r.rubbles)check('rubble blocks passage, maze connected',r.rubbleBlocks&&r.connected);
    if(r.shafts>=0)check('light shafts from vault',r.shafts>0,r.shafts);check('many gem kinds',r.gemKinds>=14,r.gemKinds);check('icon hud',r.hudIcons>=5,r.hudIcons);
        check('shades spawned',r.monsters>0,r.monsters);check('shade catches and sends to start',r.caught);check('catch restarts the level, purse back to entry',r.reset);check('shade patrols',r.monsterMoves)
    check('wraith is a low-poly model with glowing eyes and a lantern',r.model);check('its lantern lights the walls',r.light);check('far off its light is out',r.lightFar);check('its light shows round the corner before it does',r.lightHidden);check('wraith floats: bobs, sways, hem ripples',r.floats&&r.swing.every(v=>v>.02),r.swing);check('chasing wraith leans in',r.runs);check('right at the player it lifts the lantern',r.raises);check('lantern hangs straight down',r.upright>.85,r.upright);check('wraith outruns a walk, not a sprint',r.paceOk,r.pace);check('wraith spawns on its cell',r.spawned);}
  // exit gate picked without the key: two tumblers, then the trader between levels
  await scene(page,'dungeon',8,3);
  const t=await page.evaluate(()=>{const o={},A=W.exitArch;game.picks=10;game.gold=200;game.gems=[rollGem(),rollGem()];
    pl.x=A.cx-A.d[0]*(WT/2+1);pl.z=A.cz-A.d[1]*(WT/2+1);updateGameplay(1/30,0);useAction();o.lp=LP.active&&LP.tumblers===2;
    // walking away from a lock and coming back finds the same lock: the same sweet spot, and a set tumbler stays set
    const s0=LP.sweet;stopLockpick();useAction();o.sameLock=LP.active&&LP.sweet===s0&&LP.stage===0;
    LP.ang=LP.sweet;LP.hold=true;for(let i=0;i<60&&LP.stage===0;i++)updateLockpick(1/30);LP.hold=false;const s1=LP.sweet;
    stopLockpick();useAction();o.pinKept=LP.active&&LP.stage===1&&LP.sweet===s1&&s1!==s0;
    for(let s=0;s<2&&LP.active;s++){LP.ang=LP.sweet;LP.hold=true;for(let i=0;i<60&&LP.active&&LP.stage===s;i++)updateLockpick(1/30)}
    o.gate=!LP.active&&G.gate.opening;
    for(let i=0;i<120;i++){updateGameplay(1/30,i/30)}
    for(let i=0;i<120&&!game.trading;i++){pl.x+=A.d[0]*.05;pl.z+=A.d[1]*.05;step(1/30)}o.trader=game.trading&&!document.getElementById('scr-trader').classList.contains('hidden');
    const q=document.querySelector.bind(document),p0=game.picks,g0=game.gold;q('[data-buy="pick"]').click();o.bought=game.picks===p0+1&&game.gold===g0-12;
    const g1=game.gold,v=gemPrice(game.gems[0]);q('[data-sell]').click();o.sold=game.gems.length===1&&game.gold===g1+v;
    game.gold=TORCH_PRICE-1;drawTrader();o.torchDear=q('[data-buy="torch"]').disabled;
    game.gold=TORCH_PRICE+5;drawTrader();q('[data-buy="torch"]').click();o.torchBought=game.torch&&game.gold===5&&q('[data-buy="torch"]').disabled;o.price=TORCH_PRICE;game.gold=200;drawTrader();
    q('[data-buy="map"]').click();const lvl=game.level;q('[data-go]').click();o.next=game.level===lvl+1&&!game.trading&&G.hasMap&&game.gold>0;
    return o});
  check('gate lock opens with two tumblers',t.lp&&t.gate,t);check('a lock left and picked again is the same lock',t.sameLock);check('a set tumbler stays set',t.pinKept);check('exit leads to the trader',t.trader);check('trader sells a lockpick',t.bought);
  check('trader buys a gem',t.sold);check('trader sells a torch, for a good sum',t.torchDear&&t.torchBought&&t.price>=150,t.price);check('next level: purse kept, bought map in hand',t.next);
  // thrown coin: flies, lands, costs a coin; a shadow out of sight walks to it and searches
  await scene(page,'dungeon',10,4);
  const c=await page.evaluate(()=>{const o={};game.gold=5;pl.x=W.start.x;pl.z=W.start.z;pl.yaw=W.start.yaw;pl.pitch=0;throwCoin();o.paid=game.gold===4&&G.coins.length===1;
    for(let i=0;i<120;i++)updateCoins(1/30);const k=G.coins[0];o.landed=k.rest>0&&Math.abs(k.y-floorH(k.x,k.z))<.02&&!blocked(k.x,k.z);
    game.peaceful=false;buildMonsters(root,['spider']);G.grace=0;const mo=G.monsters[0],n=W.n;pl.x=-50;pl.z=-50;   // player away: nobody sees them
    // coin 3 cells away by path from the shadow
    const d0=cellDist(W.M,n,mo.target[0],mo.target[1]);let cell=null;for(let i=0;i<n*n&&!cell;i++)if(d0[i]===3)cell=[Math.floor(i/n),i%n];
    const p=warp(cell[0]+.5,cell[1]+.5);coinNoise(p[0],p[1]);o.lured=mo.mode==='lure';
    let arrived=false;for(let i=0;i<400&&!arrived;i++){updateMonsters(1/30,i/30);arrived=mo.mode==='search'}
    o.arrived=arrived&&Math.hypot(mo.x-p[0],mo.z-p[1])<.1;const x0=mo.x;for(let i=0;i<30;i++)updateMonsters(1/30,i/30);o.waits=mo.x===x0;
    for(let i=0;i<200;i++)updateMonsters(1/30,i/30);o.patrol=mo.mode==='patrol';game.peaceful=true;return o});
  check('coin throw costs a coin and lands on the floor',c.paid&&c.landed,c);check('coin lures a shadow to the spot',c.lured&&c.arrived);
  check('shadow searches, then patrols again',c.waits&&c.patrol);
  // R rolls the purse back to level entry; the level clock stops in the menu; shadows keep walking while a lock is picked
  await scene(page,'dungeon',10,5);
  const h=await page.evaluate(()=>{const o={};game.gold=10;game.picks=3;game.gems=[];saveEntry();
    game.gold=500;game.picks=9;game.gems=[rollGem()];const s0=game.seed;
    window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyR'}));window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyR'}));
    o.rollback=game.seed===s0+1&&game.gold===10&&game.picks===3&&game.gems.length===0;
    // loop() is driven by hand here: keep it from queueing extra animation frames
    game.peaceful=false;buildMonsters(root);G.grace=0;game.peaceful=true;pl.x=-50;pl.z=-50;const mo=G.monsters[0],p0=[mo.x,mo.z],raf=window.requestAnimationFrame;
    window.requestAnimationFrame=()=>0;const ch=G.chests.find(q=>q.kind==='chest');ch.lock=1;game.picks=3;startLockpick(ch);let t=performance.now();for(let i=0;i<60;i++){t+=34;last=t-34;loop(t)}stopLockpick();window.requestAnimationFrame=raf;
    o.lockLive=Math.hypot(mo.x-p0[0],mo.z-p0[1])>.3;
    // ward: the first catch strikes the shadow down instead, the second one counts
    let hits=0;const cb=window.caught;window.caught=()=>{hits++};game.peaceful=false;G.grace=0;G.bless.ward=1;pl.x=mo.x+.3;pl.z=mo.z;updateMonsters(1/30,0);
    o.ward=hits===0&&mo.stun>0&&!G.bless.ward;mo.stun=0;updateMonsters(1/30,0);o.ward=o.ward&&hits===1;window.caught=cb;game.peaceful=true;
    // swiftness: a fifth faster on foot
    const run=()=>{pl.x=W.start.x;pl.z=W.start.z;pl.yaw=W.start.yaw;keys.KeyW=true;step(1/60);keys.KeyW=false;return Math.hypot(pl.x-W.start.x,pl.z-W.start.z)};
    const v0=run();G.bless.swift=1;o.swift=Math.abs(run()/v0-1.2)<.01;G.bless.swift=0;
    // menu open for real time: the level clock must not move
    G.time=0;document.getElementById('ui').style.display='flex';return o});
  await page.waitForTimeout(1500);
  h.clockPaused=await page.evaluate(()=>{const ok=G.time===0;document.getElementById('ui').style.display='none';updateHud();
    return ok&&document.querySelector('#inv .time').textContent==='0:00'});
  check('R rolls the purse back to level entry',h.rollback,h);check('level clock stops in the menu',h.clockPaused);
  check('shadows keep walking while a lock is picked',h.lockLive);check('ward strikes down the first shadow, once',h.ward);check('swiftness: a fifth faster',h.swift);
  // cave spider: a low-poly mob, only underground; quick, short-sighted, gives up a chase sooner
  await scene(page,'dungeon',12,6);
  const sp=await page.evaluate(()=>{const o={};game.peaceful=false;buildMonsters(root,['spider','wraith']);G.grace=0;game.peaceful=true;
    const s=G.monsters[0],k=G.monsters[1];const sp_=[];s.m.traverse(c=>{if(c.isMesh||c.isSprite)sp_.push(c)});o.mesh=s.kind==='spider'&&s.legs.length===8&&sp_.length<=3&&sp_.some(c=>c.isSkinnedMesh&&c.material.isMeshBasicMaterial);
    o.faster=s.chase>k.chase&&s.chase<5.2&&s.sight<k.sight&&s.lose<k.lose;
    // walks, turns to face its way, moves its legs
    pl.x=-50;pl.z=-50;const p0=[s.x,s.z],l0=s.legs.map(L=>L.p.rotation.y+L.p.rotation.z);let turned=0;
    for(let i=0;i<90;i++){const x=s.x,z=s.z;updateMonsters(1/30,i/30);const dx=s.x-x,dz=s.z-z;if(Math.hypot(dx,dz)>.01){const d=Math.atan2(dx,dz)-s.yaw;turned=Math.max(turned,Math.cos(d))}}
    o.walks=Math.hypot(s.x-p0[0],s.z-p0[1])>.5;o.faces=turned>.9;o.legs=s.legs.filter((L,i)=>Math.abs(L.p.rotation.y+L.p.rotation.z-l0[i])>.02).length;
    // sight: along a straight corridor the wraith sees 8 m, the spider does not; both see at 4 m
    const n=W.n;let run=null;for(let i=0;i<n&&!run;i++)for(let j=0;j<n&&!run;j++)for(const [a,b] of [[1,0],[0,1]])
      if(!run&&i+2*a<n&&j+2*b<n&&W.M.open(i,j,a,b)&&W.M.open(i+a,j+b,a,b))run=[i,j,a,b];
    o.run=!!run;if(run){const [i,j,a,b]=run,P=c=>warp(i+c*a+.5,j+c*b+.5),look=(m,dist)=>{const q=P(0);m.x=q[0];m.z=q[1];m.target=[i,j];m.mode='patrol';m.wait=0;
        const r=P(dist/CS);pl.x=r[0];pl.z=r[1];G.grace=0;updateMonsters(1/60,0);return m.mode==='chase'};
      for(const m of G.monsters)m.x=m.z=-99;
      const far=CS*2,saw=[look(k,far),look(s,far),look(s,CS)];o.sight=saw;o.sightOk=saw[1]===false&&saw[2]===true}
    // colourings: every species has its own body and eye colours
    const sk=Object.keys(SPIDER_SKINS).map(k=>{const q=makeSpider(root,k);const ms=[];q.m.traverse(c=>{if(c.isSkinnedMesh)ms.push(c)});root.remove(q.m);
      return ms.find(c=>c.material.isMeshLambertMaterial).geometry.attributes.color.array.slice(0,3).join()+'|'+ms.find(c=>c.material.isMeshBasicMaterial).material.color.getHexString()});
    o.skins=new Set(sk).size;o.skinsOk=o.skins===Object.keys(SPIDER_SKINS).length&&o.skins>=4;
    // outdoors only wraiths; underground spiders turn up
    let spiders=0;game.level=7;for(let r=0;r<6;r++){G.monsters=[];game.peaceful=false;buildMonsters(root);game.peaceful=true;spiders+=G.monsters.filter(m=>m.kind==='spider').length}o.spiders=spiders;
    return o});
  check('spider is a low-poly mesh with eight legs and glowing eyes',sp.mesh,sp);check('spider is quicker but short-sighted',sp.faster);check('spiders come in several colourings',sp.skinsOk,sp.skins);
  check('spider walks, faces its way, moves its legs',sp.walks&&sp.faces&&sp.legs>=6);
  if(sp.run)check('spider sees only up close',sp.sightOk,sp.sight);check('spiders turn up underground',sp.spiders>0,sp.spiders);
  await scene(page,'winter',12,6);
  const ws=await page.evaluate(()=>{game.level=7;let s=0;for(let r=0;r<6;r++){G.monsters=[];game.peaceful=false;buildMonsters(root);game.peaceful=true;s+=G.monsters.filter(m=>m.kind==='spider').length}return s});
  check('no spiders outdoors',ws===0,ws);
  // mobs: never into walls or props, and a player pressed to a wall is still caught
  await scene(page,'winter',12,2);
  const mv=await page.evaluate(()=>{const o={inWall:0};game.peaceful=false;buildMonsters(root,['wraith','spider']);game.peaceful=true;G.grace=0;pl.x=-50;pl.z=-50;const dt=1/30;
    for(let f=0;f<900;f++){updateMonsters(dt,f*dt);G.monsters.forEach(m=>{if(!freeR(m.x,m.z,.18))o.inWall++})}
    // chasing wraith, player pressed to the side wall of the next cell
    // the mob's own cell first; if no neighbour there has a side wall close enough, the nearest cell that has one (the mob is moved there)
    const m=G.monsters[0],c=toGrid(m.x,m.z),c0=[Math.floor(c[0]),Math.floor(c[1])];let spot=null;
    const cells=[];for(let i=0;i<W.n;i++)for(let j=0;j<W.n;j++)cells.push([i,j]);cells.sort((p,q)=>Math.hypot(p[0]-c0[0],p[1]-c0[1])-Math.hypot(q[0]-c0[0],q[1]-c0[1]));
    for(const [ci,cj] of cells){if(spot)break;
      for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]])if(!spot&&ci+a>=0&&cj+b>=0&&ci+a<W.n&&cj+b<W.n&&W.M.open(ci,cj,a,b)){const p=warp(ci+.5+a,cj+.5+b);
        for(let s=0;s<1.2;s+=.02)if(!freeR(p[0]+b*s,p[1]+a*s,.3)){spot=[p[0]+b*(s-.03),p[1]+a*(s-.03)];break}}
      if(spot&&(ci!==c0[0]||cj!==c0[1])){const q=mobWp(ci,cj);m.x=q[0];m.z=q[1];m.target=[ci,cj];m.prev=null}}
    pl.x=spot[0];pl.z=spot[1];o.wd=+wallDist(pl.x,pl.z).toFixed(2);let caught=false;const cb=window.caught;window.caught=()=>{caught=true};game.peaceful=false;
    for(let f=0;f<300&&!caught;f++){if(m.mode!=='chase'){m.mode='chase';m.lost=0}updateMonsters(dt,f*dt)}window.caught=cb;game.peaceful=true;o.caught=caught;
    // an opened chest creaks: a shadow within earshot comes to see; one far off does not hear it
    G.monsters.forEach(q=>{q.mode='patrol';q.wait=0});pl.x=-50;pl.z=-50;const ch=G.chests.find(q=>q.kind==='chest'),n=W.n,g=toGrid(ch.x,ch.z),ld=cellDist(W.M,n,Math.floor(g[0]),Math.floor(g[1]));
    const near=G.monsters[0],far=G.monsters[1];let cn=null,cf=null;for(let i=0;i<n*n;i++){if(ld[i]>=3&&ld[i]<=8&&!cn)cn=[Math.floor(i/n),i%n];if(ld[i]>=14&&!cf)cf=[Math.floor(i/n),i%n]}
    const put=(m,c)=>{const q=mobWp(c[0],c[1]);m.x=q[0];m.z=q[1];m.target=c;m.prev=null};put(near,cn);if(cf)put(far,cf);openContainer(ch);o.heard=near.mode==='lure';o.farDeaf=!cf||far.mode==='patrol';
    let arrived=false;for(let f=0;f<900&&!arrived;f++){updateMonsters(dt,f*dt);arrived=near.mode==='search'}o.comes=arrived&&Math.hypot(near.x-ch.x,near.z-ch.z)<2.5;
    // a lockpick snapping in a lock is heard too: shadows within earshot head for the chest, or for the exit gate
    const lure=(c,x,z)=>{const gg=toGrid(x,z),cell=[clamp(Math.floor(gg[0]),0,n-1),clamp(Math.floor(gg[1]),0,n-1)],ld2=cellDist(W.M,n,cell[0],cell[1]);let cc=null;for(let i=0;i<n*n;i++)if(ld2[i]>=3&&ld2[i]<=PICK_NOISE-1&&!cc)cc=[Math.floor(i/n),i%n];
      G.monsters.forEach(q=>{q.mode='patrol';q.wait=0;q.lure=null;q.x=q.z=-99;q.target=[0,0]});if(!cc)return 'no cell';put(near,cc);pickNoise(c);return near.mode==='lure'&&near.lure.c.join()===cell.join()};
    o.pickHeard=[lure(ch,ch.x,ch.z),lure(G.gate,G.gate.cx,G.gate.cz)];
    // the map: M holds it low and tilted (the view above stays clear), M again holds it up flat, M once more puts it away
    G.hasMap=true;document.getElementById('ui').style.display='none';game.started=true;const mk=()=>{dispatchEvent(new KeyboardEvent('keydown',{code:'KeyM'}));dispatchEvent(new KeyboardEvent('keyup',{code:'KeyM'}))},mc=document.getElementById('map');
    mk();const t1=mc.style.display==='block'&&mc.className==='tilt'&&mc.getBoundingClientRect().top>innerHeight*.3;mk();const t2=mc.style.display==='block'&&mc.className==='big';mk();o.mapModes=[t1,t2,mc.style.display==='none'];
    return o});
  check('mobs keep off walls and props',mv.inWall===0,mv.inWall);
  check('a player pressed to a wall is caught',mv.caught,mv.wd);check('an opened chest creaks: shadows nearby come',mv.heard&&mv.comes);check('shadows far off do not hear the chest',mv.farDeaf);check('a snapped lockpick is heard: shadows head for the chest or the gate',mv.pickHeard.every(v=>v===true),mv.pickHeard);
  check('map: tilted low to walk with, then flat, then away',mv.mapModes.every(v=>v),mv.mapModes);
  // a pick breaks while the key is held: the next pick waits for a release, it does not bend straight away
  const lp=await page.evaluate(()=>{const o={};const c=G.chests.find(q=>q.kind==='chest');c.opened=false;c.lock=2;game.picks=4;startLockpick(c);
    LP.ang=LP.sweet>1.5?LP.sweet-1.4:LP.sweet+1.4;updateLockpick(1/30);keys.KeyW=true;let i=0;for(;i<200&&game.picks===4;i++)updateLockpick(1/30);o.broke=game.picks===3;
    for(let k=0;k<120;k++)updateLockpick(1/30);o.waits=game.picks===3&&LP.turn===0;
    keys.KeyW=false;updateLockpick(1/30);LP.ang=LP.sweet;keys.KeyW=true;for(let k=0;k<10;k++)updateLockpick(1/30);o.turnsAgain=LP.turn>0;keys.KeyW=false;stopLockpick();return o});
  check('a broken pick needs the key released first',lp.broke&&lp.waits&&lp.turnsAgain,lp);
  // props must never plug a passage: walk every open passage from cell centre to cell centre (dead ends with a chest
  // or an altar are left out: the chest stands in the way by design and is reached from the front)
  const plugged=[];
  for(const th of ['ruins','winter','dungeon','catacombs','tomb','cistern','desert','graveyard'])for(const seed of [1,2,5,11]){await scene(page,th,12,seed);
    plugged.push(...await page.evaluate(th=>{const n=W.n,M=W.M,out=[];
      for(let i=0;i<n;i++)for(let j=0;j<n;j++)for(const [a,b] of [[1,0],[0,1]]){if(i+a>=n||j+b>=n||!M.open(i,j,a,b))continue;
        const A=warp(i+.5,j+.5),B=warp(i+.5+a,j+.5+b);if(G.chests.some(c=>(c.kind==='chest'||c.kind==='altar')&&Math.min(Math.hypot(c.x-A[0],c.z-A[1]),Math.hypot(c.x-B[0],c.z-B[1]))<1.3))continue;
        if(!passOpen(i,j,a,b))out.push(th+' '+game.seed+' '+[i,j,a,b])}return out},th))}
  check('props never plug a passage',plugged.length===0,plugged);
  // a pit holds one thing: never a candle standing in a skull (maze and the catacomb ring beyond the grates)
  const shared=[];for(const seed of [1,2,3,4,5,6]){await scene(page,'catacombs',12,seed);
    shared.push(...await page.evaluate(()=>{const sk=W.niches.filter(n=>n.used==='skull');
      return W.lights.filter(l=>l.kind==='candle'&&sk.some(n=>Math.hypot(n.x-l.x,n.z-l.z)<.3&&Math.abs(n.y-l.base)<.3)).map(l=>game.seed+' '+l.x.toFixed(1)+','+l.z.toFixed(1))}))}
  check('no candle stands in a skull',shared.length===0,shared);
  // wall pits: each stands on a brick with air above it, so no skull or candle hangs in the air or sits in the masonry
  const pits=[];for(const th of ['catacombs','dungeon'])for(const seed of [1,3,7]){await scene(page,th,12,seed);
    pits.push(...await page.evaluate(()=>W.niches.filter(n=>!W.wallSolid(n.x,n.y-.1,n.z)||W.wallSolid(n.x,n.y+.1,n.z)).map(n=>game.theme+' '+game.seed+' '+[n.x,n.y,n.z].map(v=>v.toFixed(2)))))}
  check('wall pits rest on a brick',pits.length===0,pits.slice(0,5));
  // the newer maps: each carries features of its own
  const tf={};for(const th of ['tomb','cistern','desert','graveyard']){await scene(page,th,12,3);
    tf[th]=await page.evaluate(()=>({frames:(W.frames||[]).length,water:!!W.td.water,
      wisps:W.td.wisps.length,falls:W.td.falls.length,trees:W.trees?W.trees.geometry.instanceCount:0,sky:(W.skyFoot||[]).filter(f=>f.kind).map(f=>f.kind)}))}
  check('tomb: painted doorways, sand falling from the vault',tf.tomb.frames>0&&tf.tomb.falls>0,tf.tomb);
  check('cistern: water over the floor, arches in the passages',tf.cistern.water&&tf.cistern.frames>0,tf.cistern);
  check('desert: palms and pyramids on the horizon',tf.desert.trees>0&&tf.desert.sky.includes('pyramid'),tf.desert);
  check('graveyard: wisps over the graves, dead trees round it',tf.graveyard.wisps>0&&tf.graveyard.trees>0,tf.graveyard);
  // beyond the grates no hall opens up: nowhere in the fake ring is wider than a crossing of two corridors
  const halls=await page.evaluate(()=>{const orig=buildFloorCeil,out=[];window.buildFloorCeil=function(r,m){if(r!==root)window.RING=W;return orig(r,m)};
    for(const th of ['dungeon','cistern','tomb'])for(let sd=1;sd<=8;sd++){game.theme=th;game.size=12;game.level=1;game.seed=sd;window.RING=null;build();
      const R=window.RING;if(R){let mx=0;for(const v of R.occ.D)mx=Math.max(mx,v);if(mx>1.5)out.push(th+' '+sd+' '+mx.toFixed(2))}}
    window.buildFloorCeil=orig;return out});
  check('no hall behind the grates',halls.length===0,halls);
  await scene(page,'dungeon',12,6);
  // watcher: never catches anyone; caught in its gaze, it screams and the other shadows come; with its lids shut it sees nothing
  const wa=await page.evaluate(()=>{const o={};G.monsters.forEach(m=>root.remove(m.m));G.monsters=[];game.peaceful=false;buildMonsters(root,['eye','spider']);G.grace=0;
    const [e,sp]=G.monsters,n=W.n;let run=null;for(let i=0;i<n&&!run;i++)for(let j=0;j<n&&!run;j++)for(const [a,b] of [[1,0],[0,1]])
      if(!run&&i+1<n&&j+1<n&&W.M.open(i,j,a,b))run=[i,j,a,b];
    const [i,j,a,b]=run,p=warp(i+.5,j+.5),q=warp(i+.5+a,j+.5+b);Object.assign(e,{x:p[0],z:p[1],target:[i,j],cell:[i,j],mode:'patrol',wait:0});e.yaw=Math.atan2(q[0]-p[0],q[1]-p[1]);
    // the spider far away along the maze, out of sight
    const d=cellDist(W.M,n,i,j);let far=0;for(let k=0;k<n*n;k++)if(d[k]>d[far])far=k;const fp=warp(Math.floor(far/n)+.5,far%n+.5);Object.assign(sp,{x:fp[0],z:fp[1],target:[Math.floor(far/n),far%n],mode:'patrol'});
    pl.x=q[0];pl.z=q[1];let hits=0;const cb=window.caught;window.caught=()=>{hits++};
    e.blinking=true;o.blind=!watcherSees(e,Math.hypot(pl.x-e.x,pl.z-e.z));e.blinking=false;
    for(let k=0;k<30;k++){updateMonsters(1/30,k/30);e.blinking=false}o.alarm=e.alarmT>0;o.lured=sp.mode==='lure';
    // behind its back: it notices, turns round to the player (not at once), then screams
    pl.x=q[0];pl.z=q[1];Object.assign(e,{x:p[0],z:p[1],alarmT:0,stare:0,notice:0,alert:0});e.yaw+=Math.PI;
    for(let k=0;k<6;k++){updateMonsters(1/30,k/30);e.blinking=false}const a0=Math.atan2(q[0]-p[0],q[1]-p[1]);o.notAtOnce=Math.cos(e.yaw-a0)<.5&&e.alarmT===0;
    for(let k=0;k<90;k++){updateMonsters(1/30,k/30);e.blinking=false}o.turned=Math.cos(e.yaw-a0)>.97;o.alarm2=e.alarmT>0;
    pl.x=e.x+.2;pl.z=e.z;for(let k=0;k<10;k++)updateMonsters(1/30,k/30);o.harmless=hits===0;window.caught=cb;game.peaceful=true;return o});
  check('watcher screams when it sees you and the shadows come',wa.alarm&&wa.lured,wa);check('watcher never catches anyone',wa.harmless);check('a blinking watcher sees nothing',wa.blind);
  check('watcher turns round to the player behind it, then screams',wa.notAtOnce&&wa.turned&&wa.alarm2,wa);
  const pp=await page.evaluate(()=>{S.post=true;renderFrame();const a=!!PP.rt;S.post=false;renderFrame();S.post=true;return a});check('post-processing renders a frame',pp);
  if(errs.length){console.log('errors:',errs);fail++}
  await browser.close();process.exit(fail?1:0)})();
