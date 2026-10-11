// Проверка игровых механик: node tests/features.js
const {open,scene}=require('./helpers');
(async()=>{const {browser,page,errs}=await open(800,450);let fail=0;
  const check=(name,ok,info)=>{console.log((ok?'OK  ':'FAIL')+' '+name+(info!==undefined?' '+JSON.stringify(info):''));if(!ok)fail++};
  for(const th of ['dungeon','winter']){await scene(page,th,10,5);console.log('--',th);
    const r=await page.evaluate(()=>{const o={};const tick=(n=1)=>{for(let i=0;i<n;i++){step(1/30);updateGameplay(1/30,performance.now()/1000)}};
      o.noBeam=!W.exitBeam;o.noMinimap=getComputedStyle(document.getElementById('map')).display==='none';o.fx=TH.fx?TH.fx.type:null;
      // сундуки: подойти, нажать E, дождаться вылета добычи
      const openChest=c=>{pl.x=c.x+c.nx*1.1;pl.z=c.z+c.nz*1.1;pl.yaw=Math.atan2(c.nx,c.nz);tick();const pr=document.getElementById('prompt').style.display==='block';useAction();tick(110);return pr&&c.opened};
      o.chests=G.chests.length;const kc=G.chests.find(c=>c.isKey);o.keyChest=!!kc;
      const g=G.gate;pl.x=g.cx-(W.exitCell.di?2:0);pl.z=g.cz-(W.exitCell.dj?2:0);tick();o.gateClosed=!g.open&&!g.opening&&blocked(g.cx,g.cz);
      o.keyPrompt=openChest(kc);o.keyTaken=G.hasKey;o.chestBlocks=blocked(kc.x,kc.z);
      pl.x=g.cx-(W.exitCell.di?2:0);pl.z=g.cz-(W.exitCell.dj?2:0);tick(90);o.gateOpen=g.open&&!blocked(g.cx,g.cz);
      const mc=G.chests.find(c=>!c.opened&&c.loot.some(l=>l.t==='map'));if(mc)openChest(mc);o.hasMap=G.hasMap;
      const g0=G.gold,n0=G.gems.length;for(const c of G.chests.filter(c=>!c.opened))openChest(c);o.gold=G.gold-g0;o.gems=G.gems.slice(n0);
      o.allOpen=G.chests.every(c=>c.opened);o.fly=G.fly.length;o.lootLines=document.getElementById('loot').children.length;
      // факел
      if(TH.indoor){G.fuel=1;pl.x=W.start.x;pl.z=W.start.z;const far=W.lights.every(l=>Math.hypot(l.x-pl.x,l.z-pl.z)>1.6);
        if(far){tick(300);o.fuelDrops=G.fuel<1&&G.fuel>.9}else o.fuelDrops='start near torch';
        const l=W.lights[0];G.fuel=.3;pl.x=l.x;pl.z=l.z;tick();o.refill=G.fuel===1}
      // лужи
      o.puddles=G.drips.length;
      // тень: включаем, ставим рядом — должна догнать и вернуть на старт
      game.peaceful=false;buildMonsters(root);o.monsters=G.monsters.length;G.grace=0;
      const mo=G.monsters[0];const c=warp(mo.cell[0]+.5,mo.cell[1]+.5);pl.x=c[0]+.2;pl.z=c[1];const d0=G.deaths;
      for(let i=0;i<60&&G.deaths===d0;i++)tick();o.caught=G.deaths>d0&&Math.hypot(pl.x-W.start.x,pl.z-W.start.z)<.01;o.keyBack=!G.hasKey&&!kc.opened&&kc.loot.some(l=>l.t==='key');
      // тень двигается в патруле
      G.grace=0;const m2=G.monsters[0],p0=[m2.x,m2.z];pl.x=W.start.x;pl.z=W.start.z;for(let i=0;i<90;i++)updateMonsters(1/30,i/30);
      o.monsterMoves=Math.hypot(m2.x-p0[0],m2.z-p0[1])>.5;game.peaceful=true;
      return o});
    check('нет луча над выходом',r.noBeam);check('нет постоянной миникарты',r.noMinimap);check('нет пыльцы',r.fx!=='pollen',r.fx);
    check('сундуки есть, среди них сундук с ключом',r.chests>0&&r.keyChest,r.chests);check('решётка закрыта без ключа',r.gateClosed);
    check('у сундука подсказка [E], он открывается',r.keyPrompt);check('ключ вылетает из сундука и берётся',r.keyTaken);check('сундук непроходим',r.chestBlocks);
    check('решётка открывается с ключом',r.gateOpen);
    check('карта из сундука',r.hasMap);check('золото и самоцветы из сундуков',r.gold>0,[r.gold,r.gems]);
    check('все сундуки открыты, добыча долетела',r.allOpen&&r.fly===0);check('строки добычи на экране',r.lootLines>0,r.lootLines);
    if(th==='dungeon'){check('факел гаснет со временем',r.fuelDrops===true,r.fuelDrops);check('факел обновляется от огня',r.refill)}
    if(th==='dungeon')check('лужи есть',r.puddles>0,r.puddles);
    check('тени созданы',r.monsters>0,r.monsters);check('тень ловит и возвращает на старт',r.caught);check('потерянный ключ возвращается в сундук',r.keyBack);check('тень патрулирует',r.monsterMoves)}
  if(errs.length){console.log('errors:',errs);fail++}
  await browser.close();process.exit(fail?1:0)})();
