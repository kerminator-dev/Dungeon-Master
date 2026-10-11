// Проверка игровых механик: node tests/features.js
const {open,scene}=require('./helpers');
(async()=>{const {browser,page,errs}=await open(800,450);let fail=0;
  const check=(name,ok,info)=>{console.log((ok?'OK  ':'FAIL')+' '+name+(info!==undefined?' '+JSON.stringify(info):''));if(!ok)fail++};
  for(const th of ['dungeon','winter']){await scene(page,th,10,5);console.log('--',th);
    const r=await page.evaluate(()=>{const o={};const tick=(n=1)=>{for(let i=0;i<n;i++){step(1/30);updateGameplay(1/30,performance.now()/1000)}};
      o.noBeam=!W.exitBeam;o.noMinimap=getComputedStyle(document.getElementById('map')).display==='none';o.fx=TH.fx?TH.fx.type:null;
      // ключ и решётка
      const key=G.items.find(i=>i.type==='key');o.hasKeyItem=!!key;
      const g=G.gate;pl.x=g.cx-(W.exitCell.di?2:0);pl.z=g.cz-(W.exitCell.dj?2:0);tick();o.gateClosed=!g.open&&!g.opening&&blocked(g.cx,g.cz);
      pl.x=key.x;pl.z=key.z;tick();o.keyTaken=G.hasKey&&key.taken;
      pl.x=g.cx-(W.exitCell.di?2:0);pl.z=g.cz-(W.exitCell.dj?2:0);tick(90);o.gateOpen=g.open&&!blocked(g.cx,g.cz);
      // карта
      const mp=G.items.find(i=>i.type==='map');if(mp){pl.x=mp.x;pl.z=mp.z;tick()}o.hasMap=G.hasMap;
      // золото
      o.goldTotal=G.goldTotal;const gi=G.items.find(i=>i.type==='gold');if(gi){pl.x=gi.x-gi.x%1+.5;pl.x=gi.x;pl.z=gi.z;tick()}o.gold=G.gold;
      // самоцвет
      o.gemTotal=G.gemTotal;const gm=G.items.find(i=>i.type==='gem');if(gm){pl.x=gm.x;pl.z=gm.z;tick()}o.gems=G.gems.slice();
      // факел
      if(TH.indoor){G.fuel=1;pl.x=W.start.x;pl.z=W.start.z;const far=W.lights.every(l=>Math.hypot(l.x-pl.x,l.z-pl.z)>1.6);
        if(far){tick(300);o.fuelDrops=G.fuel<1&&G.fuel>.9}else o.fuelDrops='start near torch';
        const l=W.lights[0];G.fuel=.3;pl.x=l.x;pl.z=l.z;tick();o.refill=G.fuel===1}
      // лужи
      o.puddles=G.drips.length;
      // тень: включаем, ставим рядом — должна догнать и вернуть на старт
      game.peaceful=false;buildMonsters(root);o.monsters=G.monsters.length;G.grace=0;
      const mo=G.monsters[0];const c=warp(mo.cell[0]+.5,mo.cell[1]+.5);pl.x=c[0]+.2;pl.z=c[1];const d0=G.deaths;
      for(let i=0;i<60&&G.deaths===d0;i++)tick();o.caught=G.deaths>d0&&Math.hypot(pl.x-W.start.x,pl.z-W.start.z)<.01;
      // тень двигается в патруле
      G.grace=0;const m2=G.monsters[0],p0=[m2.x,m2.z];pl.x=W.start.x;pl.z=W.start.z;for(let i=0;i<90;i++)updateMonsters(1/30,i/30);
      o.monsterMoves=Math.hypot(m2.x-p0[0],m2.z-p0[1])>.5;game.peaceful=true;
      return o});
    check('нет луча над выходом',r.noBeam);check('нет постоянной миникарты',r.noMinimap);check('нет пыльцы',r.fx!=='pollen',r.fx);
    check('решётка закрыта без ключа',r.gateClosed);check('ключ подбирается',r.keyTaken);check('решётка открывается с ключом',r.gateOpen);
    check('карта подбирается',r.hasMap);check('самоцвет подбирается',r.gems.length>=1,[r.gems,r.gemTotal]);check('золото подбирается',r.gold>=1,[r.gold,r.goldTotal]);
    if(th==='dungeon'){check('факел гаснет со временем',r.fuelDrops===true,r.fuelDrops);check('факел обновляется от огня',r.refill)}
    if(th==='dungeon')check('лужи есть',r.puddles>0,r.puddles);
    check('тени созданы',r.monsters>0,r.monsters);check('тень ловит и возвращает на старт',r.caught);check('тень патрулирует',r.monsterMoves)}
  if(errs.length){console.log('errors:',errs);fail++}
  await browser.close();process.exit(fail?1:0)})();
