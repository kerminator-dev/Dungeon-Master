// Проверка игровых механик: node tests/features.js
const {open,scene}=require('./helpers');
(async()=>{const {browser,page,errs}=await open(800,450);let fail=0;
  const check=(name,ok,info)=>{console.log((ok?'OK  ':'FAIL')+' '+name+(info!==undefined?' '+JSON.stringify(info):''));if(!ok)fail++};
  for(const th of ['dungeon','winter']){await scene(page,th,10,5);console.log('--',th);
    const r=await page.evaluate(()=>{const o={};const tick=(n=1)=>{for(let i=0;i<n;i++){step(1/30);updateGameplay(1/30,performance.now()/1000)}};
      o.noBeam=!W.exitBeam;o.noMinimap=getComputedStyle(document.getElementById('map')).display==='none';o.fx=TH.fx?TH.fx.type:null;
      // сундуки: подойти, нажать E, дождаться вылета добычи
      const openChest=c=>{pl.x=c.x+c.nx*1.1;pl.z=c.z+c.nz*1.1;pl.yaw=Math.atan2(c.nx,c.nz);tick();const pr=document.getElementById('prompt').style.display==='block';useAction();
        if(LP.active){LP.ang=LP.sweet;LP.hold=true;for(let i=0;i<200&&LP.active;i++)updateLockpick(1/30);LP.hold=false}
        let glow=0;for(let i=0;i<110;i++){tick();if(c.glow)glow=Math.max(glow,c.glow.scale.x)}c.maxGlow=glow;return pr&&c.opened};
      o.chests=G.chests.length;const kc=G.chests.find(c=>c.isKey);o.keyChest=!!kc;
      const g=G.gate;const A=W.exitArch;pl.x=A.cx-A.d[0]*(WT/2+1);pl.z=A.cz-A.d[1]*(WT/2+1);tick();o.gateClosed=!g.open&&!g.opening&&blocked(W.exitIn.x,W.exitIn.z);
      o.keyPrompt=openChest(kc);o.keyTaken=G.hasKey;o.chestBlocks=blocked(kc.x,kc.z);
      pl.x=A.cx-A.d[0]*(WT/2+1);pl.z=A.cz-A.d[1]*(WT/2+1);tick(90);o.gateOpen=g.open&&!blocked(W.exitIn.x,W.exitIn.z);
      const mc=G.chests.find(c=>!c.opened&&c.loot.some(l=>l.t==='map'));if(mc)openChest(mc);o.hasMap=G.hasMap;
      // взлом: отмычка не в той точке — гнётся и ломается
      let lc=G.chests.find(c=>!c.opened&&c.lock>=0);if(!lc){lc=G.chests.find(c=>c.kind==='chest'&&!c.opened&&!c.isKey&&!c.loot.some(l=>l.t==='map'));if(lc)lc.lock=1}o.locked=!!lc;
      if(lc){game.picks=3;pl.x=lc.x+lc.nx*1.1;pl.z=lc.z+lc.nz*1.1;pl.yaw=Math.atan2(lc.nx,lc.nz);tick();useAction();o.lpOpened=LP.active;
        LP.ang=LP.sweet>1.5?LP.sweet-1.4:LP.sweet+1.4;LP.hold=true;for(let i=0;i<120;i++)updateLockpick(1/30);LP.hold=false;o.pickBroke=game.picks<3;o.stillLocked=lc.lock>=0&&!lc.opened;
        // клавиши: зажатая с открытия E не крутит; после отпускания W поворачивает замок
        LP.ang=LP.sweet;LP.turn=0;LP.hp=1;LP.ready=false;keys.KeyE=true;updateLockpick(.3);o.heldE=LP.turn===0;keys.KeyE=false;
        updateLockpick(1/30);keys.KeyW=true;updateLockpick(.2);o.wTurns=LP.turn>0||!LP.active;keys.KeyW=false;
        stopLockpick();game.picks=5}
      o.urns=G.chests.filter(c=>c.kind==='urn').length;o.purses=G.chests.filter(c=>c.kind==='purse').length;
      const g0=G.gold,n0=G.gems.length;for(const c of G.chests.filter(c=>!c.opened&&c.kind!=='altar'))openChest(c);
      o.glowShown=kc.maxGlow>.5;o.lockedOpened=!lc||lc.opened;o.gold=G.gold-g0;o.gems=G.gems.slice(n0);
      o.allOpen=G.chests.every(c=>c.opened||c.kind==='altar');o.fly=G.fly.length;o.lootLines=document.getElementById('loot').children.length;
      // святилище: молитва даёт полный факел и продлевает горение
      const alt=G.chests.find(c=>c.kind==='altar');o.altar=!!alt;
      if(alt){G.fuel=.3;const ft=G.fuelT;pl.x=alt.x+alt.nx*1.1;pl.z=alt.z+alt.nz*1.1;pl.yaw=Math.atan2(alt.nx,alt.nz);tick();useAction();o.blessed=G.fuel===1&&G.fuelT>ft}
      // Стена слов: подойти — выучить Крик
      o.ww=!!G.wordWall;game.shout=false;if(G.wordWall){const w=G.wordWall;pl.x=w.x+w.nx*1.4;pl.z=w.z+w.nz*1.4;tick(3);o.learned=game.shout&&w.learned}
      // обвал перекрывает проход, но лабиринт связный
      o.rubbles=W.rubbles.length;if(W.rubbles.length){const R=W.rubbles[0];o.rubbleBlocks=blocked(R.cx,R.cz);o.connected=cellDist(W.M,W.n,0,0).every(d=>d>=0)}
      o.shafts=TH.indoor?W.shafts.length:-1;o.banners=root.children.length;
      // разнообразие камней
      const kinds=new Set();for(let i=0;i<400;i++)kinds.add(rollGem().key);o.gemKinds=kinds.size;
      // панель с иконками
      updateHud();o.hudIcons=document.querySelectorAll('#inv img').length;
      // факел
      if(TH.indoor){G.fuel=1;pl.x=W.start.x;pl.z=W.start.z;const far=W.lights.every(l=>Math.hypot(l.x-pl.x,l.z-pl.z)>1.6);
        if(far){tick(300);o.fuelDrops=G.fuel<1&&G.fuel>.9}else o.fuelDrops='start near torch';
        const l=W.lights[0];G.fuel=.3;pl.x=l.x;pl.z=l.z;tick();o.refill=G.fuel===1}
      // лужи
      o.puddles=G.drips.length;
      // тень: включаем, ставим рядом — должна догнать и вернуть на старт
      game.peaceful=false;buildMonsters(root);
      // Крик отбрасывает и оглушает скелета перед игроком
      {G.grace=0;const m=G.monsters[0];G.shoutCd=0;game.shout=true;pl.x=m.x-3;pl.z=m.z;if(blocked(pl.x,pl.z)){pl.x=m.x;pl.z=m.z-3}if(blocked(pl.x,pl.z)){pl.x=m.x+3;pl.z=m.z}if(blocked(pl.x,pl.z)){pl.x=m.x;pl.z=m.z+3}
        pl.yaw=Math.atan2(-(m.x-pl.x),-(m.z-pl.z));const x0=m.x,z0=m.z;shout();o.stunned=m.stun>0;o.cooldown=G.shoutCd>0;m.stun=0;placeMonster(m,0)}o.monsters=G.monsters.length;G.grace=0;
      const mo=G.monsters[0];o.spawned=mo.m.position.distanceTo(new THREE.Vector3(mo.x,0,mo.z))<.01&&Math.hypot(mo.x,mo.z)>1;const c=warp(mo.cell[0]+.5,mo.cell[1]+.5);pl.x=c[0]+.2;pl.z=c[1];const d0=G.deaths;
      for(let i=0;i<60&&G.deaths===d0;i++)tick();o.caught=G.deaths>d0&&Math.hypot(pl.x-W.start.x,pl.z-W.start.z)<.01;o.keyBack=!G.hasKey&&!kc.opened&&kc.loot.some(l=>l.t==='key');
      // тень двигается в патруле
      G.grace=0;const m2=G.monsters[0],p0=[m2.x,m2.z];pl.x=W.start.x;pl.z=W.start.z;for(let i=0;i<90;i++)updateMonsters(1/30,i/30);
      o.monsterMoves=Math.hypot(m2.x-p0[0],m2.z-p0[1])>.5;o.frames=new Set();for(let i=0;i<60;i++){updateMonsters(1/30,i/30);o.frames.add(m2.body.material.map.offset.x)}o.frames=o.frames.size;o.sprite=m2.body.isSprite;game.peaceful=true;
      return o});
    check('нет луча над выходом',r.noBeam);check('нет постоянной миникарты',r.noMinimap);check('нет пыльцы',r.fx!=='pollen',r.fx);
    check('сундуки есть, среди них сундук с ключом',r.chests>0&&r.keyChest,r.chests);check('решётка закрыта без ключа',r.gateClosed);
    check('у сундука подсказка [E], он открывается',r.keyPrompt);check('ключ вылетает из сундука и берётся',r.keyTaken);check('сундук непроходим',r.chestBlocks);
    check('решётка открывается с ключом',r.gateOpen);
    check('карта из сундука',r.hasMap);check('золото и самоцветы из сундуков',r.gold>0,[r.gold,r.gems]);
    check('свечение из открытого сундука',r.glowShown);check('есть урны и кошели',r.urns>0&&r.purses>0,[r.urns,r.purses]);
    if(r.locked){check('запертый сундук открывает экран взлома',r.lpOpened);check('неверная позиция ломает отмычку',r.pickBroke);check('зажатая с открытия E не крутит замок',r.heldE);check('клавиша W поворачивает замок',r.wTurns);check('замок не поддался',r.stillLocked);check('верная позиция открывает замок',r.lockedOpened)}
    check('все сундуки открыты, добыча долетела',r.allOpen&&r.fly===0);check('строки добычи на экране',r.lootLines>0,r.lootLines);
    if(th==='dungeon'){check('факел гаснет со временем',r.fuelDrops===true,r.fuelDrops);check('факел обновляется от огня',r.refill)}
    if(th==='dungeon')check('лужи есть',r.puddles>0,r.puddles);
    if(r.altar)check('молитва у алтаря обновляет и продлевает факел',r.blessed);if(r.ww)check('у Стены слов изучается Крик',r.learned);
    check('Крик оглушает скелета и уходит на перезарядку',r.stunned&&r.cooldown);if(r.rubbles)check('обвал перекрывает проход, лабиринт связный',r.rubbleBlocks&&r.connected);
    if(r.shafts>=0)check('лучи света из свода',r.shafts>0,r.shafts);check('камней много видов',r.gemKinds>=14,r.gemKinds);check('панель с иконками',r.hudIcons>=5,r.hudIcons);
        check('тени созданы',r.monsters>0,r.monsters);check('тень ловит и возвращает на старт',r.caught);check('потерянный ключ возвращается в сундук',r.keyBack);check('тень патрулирует',r.monsterMoves)
    check('скелет — спрайт с анимацией шагов',r.sprite&&r.frames>=3,r.frames);check('скелет сразу стоит на своей клетке',r.spawned);}
  const pp=await page.evaluate(()=>{S.post=true;renderFrame();const a=!!PP.rt;S.post=false;renderFrame();S.post=true;return a});check('пост-обработка рисует кадр',pp);
  if(errs.length){console.log('errors:',errs);fail++}
  await browser.close();process.exit(fail?1:0)})();
