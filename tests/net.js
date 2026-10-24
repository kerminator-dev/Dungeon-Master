// playing together, the browsers' side: pages of the game with a stand-in socket instead of the server. this script plays
// the server: it passes the players' news on (state, shadows, coins...) and answers as the server does (the server's own
// rules are tested in server/: cargo test). node tests/net.js
const {launch,page:open}=require('./helpers');
// the stand-in socket: what the page sends piles up in __out, __in hands it a message from "the server"
const FAKE=()=>{window.__out=[];window.__ws=null;window.__closed=0;window.__urls=[];
  window.WebSocket=class{constructor(url){this.url=url;this.readyState=0;window.__ws=this;window.__urls.push(url);setTimeout(()=>{this.readyState=1;if(this.onopen)this.onopen()},0)}
    send(s){window.__out.push(JSON.parse(s))}
    close(){if(this.readyState===3)return;this.readyState=3;window.__closed++;setTimeout(()=>{if(this.onclose)this.onclose()},0)}};
  window.__in=m=>{const w=window.__ws;if(w&&w.onmessage)w.onmessage({data:JSON.stringify(m)})};
  window.__take=()=>{const o=window.__out;window.__out=[];return o}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const browser=await launch();let fail=0;
  const check=(name,ok,info)=>{console.log((ok?'OK  ':'FAIL')+' '+name+(info!==undefined?' '+JSON.stringify(info):''));if(!ok)fail++};
  const mk=async id=>Object.assign(await open(browser,800,450,FAKE),{id,q:[],log:[]});
  const ev=(p,f,a)=>p.page.evaluate(f,a),give=(p,...ms)=>p.page.evaluate(ms=>ms.forEach(m=>__in(m)),ms);
  // the server's part: what each page sent is logged; states, shadows and news go on to the others with the sender's id
  const P=[];
  async function pump(){for(const a of P){const out=await ev(a,()=>__take());for(const m of out){a.log.push(m);
      if(m.t==='s'||m.t==='mobs'||m.t==='fx')for(const b of P)if(b!==a&&b.live)b.q.push(Object.assign({},m,{id:a.id}))}}
    for(const b of P)if(b.q.length){const q=b.q;b.q=[];await give(b,...q)}}
  async function run(ms){const end=Date.now()+ms;do{await pump();await sleep(30)}while(Date.now()<end)}
  const sent=(p,t)=>p.log.filter(m=>m.t===t),all=(...ms)=>Promise.all(P.filter(p=>p.live).map(p=>give(p,...ms)));
  const people=[{id:1,name:'Ann',col:0},{id:2,name:'Bob',col:1},{id:3,name:'Cid',col:2}];
  const roster=(ids,st,o={})=>({t:'room',players:ids.map(i=>Object.assign({st:typeof st==='string'?st:st[i],ready:false,hidden:false,loaded:true},people[i-1],(o.p||{})[i])),
    leader:o.leader||ids[0],host:o.host||ids[0],play:o.play!==undefined?o.play:st!=='lobby',done:!!o.done});
  const welcome=(id,ids,st,o={})=>Object.assign({t:'welcome',v:1,id,token:'tok'+id+'abcdefgh',purse:null,pos:null},{room:Object.assign(roster(ids,st,o),
    {setup:o.setup||null,lv:o.lv||null,opened:o.opened||[],gate:o.gate||null,mapBuy:null,go:!!o.go})},o.w||{});
  // the level as this page has it
  const FP=()=>{const h=a=>{let x=2166136261>>>0;for(let i=0;i<a.length;i++){x^=a[i]&255;x=Math.imul(x,16777619)>>>0}return x};
    return JSON.stringify({occ:h(W.occ.occ),chests:G.chests.map(c=>c.kind+Math.round(c.x*100)+','+Math.round(c.z*100)+JSON.stringify(c.loot0)).join(';').length,
      mobs:G.monsters.map(m=>m.kind+m.cell).join(' '),theme:game.theme,level:game.level})};

  // ---------- joining and the lobby ----------
  const A=await mk(1),B=await mk(2);P.push(A,B);
  await ev(A,()=>{document.getElementById('btnNet').click();document.getElementById('netName').value='Ann';document.getElementById('netAddr').value='192.168.1.20';document.getElementById('btnJoin').click()});
  await sleep(60);await pump();
  const hello=sent(A,'hello')[0]||{};
  check('join: the address gets the port, the hello carries the name and the version',hello.v===2&&hello.name==='Ann'&&hello.token===''&&(await ev(A,()=>__urls[0]))==='ws://192.168.1.20:7777/ws',hello);
  A.live=true;await give(A,welcome(1,[1],'lobby'));await pump();
  const la=await ev(A,()=>({lobby:!document.getElementById('lobby').classList.contains('hidden')&&!document.getElementById('scr-play').classList.contains('hidden'),
    start:!document.getElementById('btnStart').disabled,list:document.getElementById('lobbyList').textContent,token:sessionStorage.getItem('labyrinthNet'),back:document.querySelector('#scr-play [data-back]').textContent}));
  check('the first one in leads: the lobby with the picker and Start',la.lobby&&la.start&&/Ann/.test(la.list)&&la.back==='Leave',la);
  check('the server\'s token is kept for a reload',la.token==='tok1abcdefgh');
  const setup0=sent(A,'setup').pop();check('the leader shows the others the pick at once',!!setup0&&Array.isArray(setup0.pool)&&setup0.pool.length>0,setup0);
  await ev(B,()=>{document.getElementById('btnNet').click();document.getElementById('netName').value='Bob';document.getElementById('btnJoin').click()});await sleep(60);await pump();
  B.live=true;await give(B,welcome(2,[1,2],'lobby',{setup:{world:'outdoor',pick:null,size:18,pool:['ruins','winter','graveyard']}}));await give(A,roster([1,2],'lobby'));
  const lb=await ev(B,()=>({ro:document.getElementById('scr-play').classList.contains('ro'),start:document.getElementById('btnStart').disabled,txt:document.getElementById('btnStart').textContent,
    lit:[...document.querySelectorAll('#maps .sel')].map(b=>b.dataset.w||b.dataset.t).join(),size:document.querySelector('#sizes .sel').textContent,S:S.size}));
  check('the others see the leader\'s pick and wait for Start',lb.ro&&lb.start&&lb.txt==='Waiting for Ann'&&lb.lit==='outdoor'&&lb.size==='Large',lb);
  check('...without it becoming their own setting',lb.S===12,lb.S);
  await ev(A,()=>{document.querySelector('.mapc[data-t="dungeon"]').click();document.querySelector('#sizes [data-n="8"]').click()});await pump();
  const s1=sent(A,'setup').pop();check('the leader\'s pick goes out as it changes',s1.pick==='dungeon'&&s1.world==='underground'&&s1.size===8&&s1.pool.join()==='dungeon',s1);
  await give(B,{t:'setup',setup:s1});check('...and the others see it',(await ev(B,()=>[...document.querySelectorAll('#maps .sel')].map(b=>b.dataset.t||b.dataset.w).join()))==='dungeon');

  // ---------- the first level: the same maze for both ----------
  await ev(A,()=>document.getElementById('btnStart').click());await pump();
  check('Start asks the server to start',sent(A,'start').length===1);
  const lv1={n:1,seed:4242,theme:'dungeon',size:8,mapNext:false,extra:1,key:1,restart:false};
  // the shadows are built with the level, then they spare the players (game.peaceful) except where a test wants a touch
  const level=async(...ms)=>{await Promise.all(P.filter(p=>p.live).map(p=>ev(p,()=>{game.peaceful=false})));await all(...ms);await pump();
    await Promise.all(P.filter(p=>p.live).map(p=>ev(p,()=>{game.peaceful=true})))};
  await level({t:'level',lv:lv1},roster([1,2],'in',{p:{1:{loaded:false},2:{loaded:false}}}));
  const fa=await ev(A,FP),fb=await ev(B,FP);
  check('both build the very same level from the server\'s numbers',fa===fb&&JSON.parse(fa).level===1,[fa,fb]);
  check('together a shadow more',(await ev(A,()=>{const k=G.monsters.filter(m=>!m.watcher).length;return k}))===2);
  check('both say the level is built',sent(A,'loaded').pop().key===1&&sent(B,'loaded').pop().key===1);
  const st0=await ev(B,()=>({started:game.started,st:NET.st,picks:game.picks,gold:game.gold,team:document.getElementById('team').style.display,host:NET.isHost,start:[pl.x,pl.z]}));
  check('a new run: a fresh purse, in the maze, the team shown',st0.started&&st0.st==='in'&&st0.picks===5&&st0.gold===0&&st0.team==='block'&&!st0.host,st0);
  const spots=await Promise.all([A,B].map(p=>ev(p,()=>[pl.x,pl.z])));check('the players start a step apart',Math.hypot(spots[0][0]-spots[1][0],spots[0][1]-spots[1][1])>.5,spots);

  // ---------- each other and the shadows ----------
  await all({t:'go'});await run(800);
  const av=await ev(A,()=>{const p=NET.peers.get(2);return {av:!!p.av,shown:!!p.av&&p.av.m.visible,at:p.av?[p.av.m.position.x,p.av.m.position.z]:null,parts:p.av?p.av.m.children.length:0}});
  const bpos=await ev(B,()=>[pl.x,pl.z]);
  check('the other player is seen as a frog where they stand',av.av&&av.shown&&Math.hypot(av.at[0]-bpos[0],av.at[1]-bpos[1])<.05,[av,bpos]);
  // B walks: A sees the frog follow, a moment late, facing the way B looks
  await ev(B,()=>{const c=warp(0.5,1.5),d=warp(1.5,.5);pl.yaw=1;window.__to=W.M.open(0,0,0,1)?c:d});
  for(let i=0;i<20;i++){await ev(B,()=>{const t=__to;pl.x+=(t[0]-pl.x)*.1;pl.z+=(t[1]-pl.z)*.1;pl.y=floorH(pl.x,pl.z)+1.6});await run(30)}
  await run(400);
  const fol=await ev(A,()=>{const p=NET.peers.get(2);return {at:[p.x,p.z],yaw:p.yaw,v:+p.av.v.toFixed(2)}}),bnow=await ev(B,()=>[pl.x,pl.z,pl.yaw]);
  check('it follows the player smoothly, a moment late',Math.hypot(fol.at[0]-bnow[0],fol.at[1]-bnow[1])<.05&&Math.abs(fol.yaw-1)<.01,[fol,bnow]);
  // ...as little in the past as the network allows: snapshots (30 a second) coming evenly, some 40 ms back; coming up to 40 ms
  // late, far enough back for the next one to be there in time; a teammate silent for 2 s (away) does not push it back
  const dw=await ev(A,()=>{const now0=performance.now;let sim=0;performance.now=()=>sim;
    try{const run=(late,quiet)=>{const o={},msgs=[];let arr=0,i=0,seed=1,dry=0;const rnd=()=>(seed=seed*16807%2147483647)/2147483647;
        for(let k=0;k<300;k++){const tm=k*1000/30+(quiet&&k>=150?2000:0);arr=Math.max(arr,tm+3+late*rnd());msgs.push([arr,tm])}
        const B=[];for(let ft=0;ft<12000;ft+=1000/60){while(i<msgs.length&&msgs[i][0]<=ft){sim=msgs[i][0];B.push(netStamp(o,msgs[i][1]));i++}
          sim=ft;const d=netWait(o,1/60);if(ft>4000&&ft<9500&&!quiet&&ft-d>B[B.length-1])dry++}
        return {d:+o.dly.toFixed(1),dry}};
      return {even:run(0),late:run(40),quiet:run(0,true)}}finally{performance.now=now0}});
  check('...as little in the past as the network allows, the next snapshot there in time',dw.even.d>35&&dw.even.d<45&&dw.late.d>65&&dw.late.d<90&&dw.quiet.d<45&&dw.even.dry+dw.late.dry+dw.quiet.dry===0,dw);
  // B looks at A and backs away, then steps sideways, still looking at A: A sees B's frog turned to it, its head on A
  // (body: how far the frog's front is off A; head: how far its head points off A, in degrees)
  const toA=async way=>{await ev(B,way=>{const a=NET.peers.get(1),yaw=Math.atan2(-(a.x-pl.x),-(a.z-pl.z)),f=[-Math.sin(yaw),-Math.cos(yaw)],r=[Math.cos(yaw),-Math.sin(yaw)],
      v=way==='back'?[-f[0],-f[1]]:r;pl.yaw=yaw;pl.pitch=0;let last=performance.now();
      window.__walk=()=>{const now=performance.now(),dt=Math.min(.05,(now-last)/1000);last=now;pl.x+=v[0]*3*dt;pl.z+=v[1]*3*dt;pl.y=floorH(pl.x,pl.z)+1.6;
        const a2=NET.peers.get(1);pl.yaw=Math.atan2(-(a2.x-pl.x),-(a2.z-pl.z))};
      const go=()=>{if(window.__walk){window.__walk();requestAnimationFrame(go)}};requestAnimationFrame(go)},way);
    await run(1500);
    const r=await ev(A,()=>{const p=NET.peers.get(2),q=new THREE.Quaternion(),h=new THREE.Vector3();p.av.F.head.getWorldQuaternion(q);h.set(0,0,1).applyQuaternion(q);
      const to=Math.atan2(pl.x-p.x,pl.z-p.z),d=a=>+(Math.abs(Math.atan2(Math.sin(a),Math.cos(a)))*57.3).toFixed(1);
      return {body:d(p.av.A.yaw-to),head:d(Math.atan2(h.x,h.z)-to),speed:+Math.hypot(p.av.vx,p.av.vz).toFixed(1)}});
    await ev(B,()=>{window.__walk=null});await run(200);return r};
  const bk=await toA('back');
  check('backing away while looking at the other: they see the frog facing them, its eyes on them',bk.speed>2&&bk.body<10&&bk.head<10,bk);
  const sd=await toA('side');
  check('stepping sideways while looking at the other: the frog walks sideways, its eyes on them',sd.speed>2&&sd.body>30&&sd.head<10,sd);
  // the shadows: moved by the host (A), drawn by the other from its snapshots
  await run(4500);
  const ma=await ev(A,()=>G.monsters.map(m=>[m.x,m.z])),mb=await ev(B,()=>G.monsters.map(m=>[m.x,m.z,m.m.position.x]));
  const moved=await ev(A,()=>G.monsters.some(m=>Math.hypot(m.x-warp(m.cell[0]+.5,m.cell[1]+.5)[0],m.z-warp(m.cell[0]+.5,m.cell[1]+.5)[1])>.5));
  const gap=Math.max(...ma.map((p,k)=>Math.hypot(p[0]-mb[k][0],p[1]-mb[k][1])));
  check('the host moves the shadows, the other draws them where the host has them',moved&&gap<1,{gap:+gap.toFixed(2)});
  check('the other moves no shadow of its own',sent(B,'mobs').length===0&&sent(A,'mobs').length>40,[sent(A,'mobs').length]);

  // ---------- caught: the ward first, then a ghost watching the other ----------
  const ward=await ev(B,()=>{game.peaceful=false;G.bless.ward=1;const mo=G.monsters.find(m=>!m.watcher);pl.x=mo.x+.3;pl.z=mo.z;updateMonsters(1/30,1);return {st:NET.st,ward:G.bless.ward,spared:mo.spared>0,i:G.monsters.indexOf(mo)}});
  await run(300);const fxw=sent(B,'fx').find(m=>m.k==='ward');
  check('the ward strikes the shadow down: the host is told',ward.st==='in'&&!ward.ward&&ward.spared&&fxw&&fxw.i===ward.i,ward);
  check('...and the host\'s shadow is struck down',await ev(A,i=>G.monsters[i].stun>0,ward.i));
  await ev(A,i=>{G.monsters[i].stun=0},ward.i);
  await ev(B,i=>{const mo=G.monsters[i];mo.spared=0;pl.x=mo.x+.3;pl.z=mo.z},ward.i);
  for(let k=0;k<60&&!sent(B,'caught').length;k++)await run(50);await ev(B,()=>{game.peaceful=true});
  const gh=await ev(B,()=>({st:NET.st,watch:NET.watch,ghost:document.getElementById('ghost').style.display,txt:document.getElementById('ghost').textContent,
    cam:[camera.position.x,camera.position.z],ann:[NET.peers.get(1).x,NET.peers.get(1).z]}));
  check('caught: a ghost watching the other player\'s view',gh.st==='ghost'&&sent(B,'caught').length===1&&gh.watch===1&&gh.ghost==='block'&&/Ann/.test(gh.txt)&&Math.hypot(gh.cam[0]-gh.ann[0],gh.cam[1]-gh.ann[1])<.01,gh);
  const sb=sent(B,'s').length;await run(500);check('a ghost sends no state of its own',sent(B,'s').length===sb);
  await all(roster([1,2],{1:'in',2:'ghost'},{play:true}));
  const seenGhost=await ev(A,()=>({shown:NET.peers.get(2).av.m.visible,team:document.getElementById('team').textContent}));
  check('the others no longer see the caught one; the team panel says caught',!seenGhost.shown&&/Bobcaught/.test(seenGhost.team),seenGhost);

  // ---------- a chest: asked for, opened by the server's word, the loot to its opener ----------
  const ch=await ev(A,()=>{const ok=c=>c.lock<0&&!c.isKey&&c.loot.some(l=>l.t==='gold')&&!c.loot.some(l=>l.t==='gem'||l.t==='map');
    const c=G.chests.find(c=>c.kind==='chest'&&ok(c))||G.chests.find(c=>c.kind!=='altar'&&ok(c));
    pl.x=c.x+c.nx*1.1;pl.z=c.z+c.nz*1.1;pl.yaw=Math.atan2(c.nx,c.nz);const g0=game.gold;useAction();return {i:G.chests.indexOf(c),g0,gold:c.loot.reduce((s,l)=>s+(l.t==='gold'?l.n:0),0),key:c.loot.some(l=>l.t==='key'),open:c.opened}});
  await pump();const ask=sent(A,'open').pop();
  check('E at a chest asks the server, it does not open by itself',ask&&ask.i===ch.i&&!ch.open,ask);
  const g0b=await ev(B,()=>game.gold);await all({t:'opened',i:ch.i,by:1});await run(1000);
  for(let k=0;k<40&&await ev(A,()=>G.fly.length>0||G.chests.some(c=>c.t>=0));k++)await run(150);
  const ca=await ev(A,i=>({open:G.chests[i].opened,gold:game.gold}),ch.i),cb=await ev(B,i=>({open:G.chests[i].opened,gold:game.gold,fly:G.fly.length}),ch.i);
  check('the chest opens for both, the gold goes to its opener',ca.open&&cb.open&&ca.gold===ch.g0+ch.gold&&cb.gold===g0b&&cb.fly===0,[ch,ca,cb]);
  // the key: the team's
  const kc=await ev(A,()=>{const c=G.chests.find(c=>c.isKey&&!c.opened);return c?G.chests.indexOf(c):-1});
  if(kc>=0){await all({t:'opened',i:kc,by:1});await run(1000);for(let k=0;k<40&&await ev(B,()=>G.fly.length>0||!G.hasKey);k++)await run(150);check('the key is the whole team\'s',await ev(B,()=>G.hasKey)&&await ev(A,()=>G.hasKey))}
  // a second claim of the same chest changes nothing
  await all({t:'opened',i:ch.i,by:2});check('a chest opens once',(await ev(A,()=>game.gold))===ca.gold+(kc>=0?await ev(A,i=>G.chests[i].loot0.reduce((s,l)=>s+(l.t==='gold'?l.n:0),0),kc):0));

  // ---------- the gate: one player with the key asks, it rises for all ----------
  await ev(A,()=>{G.hasKey=true;const g=G.gate;pl.x=g.cx-W.exitArch.d[0]*2;pl.z=g.cz-W.exitArch.d[1]*2;updateGameplay(1/30,10)});await pump();
  check('with the key the gate is asked for',sent(A,'gate').length===1);
  await all({t:'gate',by:1});for(let k=0;k<40&&!(await ev(B,()=>G.gate.open)&&await ev(A,()=>G.gate.open));k++)await run(150);
  const gt=await Promise.all([A,B].map(p=>ev(p,()=>({opening:G.gate.opening,open:G.gate.open,y:+G.gate.m.position.y.toFixed(2),H:G.gate.H,ng:NET.gate,up:netUp(),key:NET.levelKey}))));
  check('...and rises for everyone',gt.every(g=>g.opening&&g.open),gt);

  // ---------- through the exit, the trader, everyone ready: the next level ----------
  await ev(A,()=>{const A_=W.exitArch;pl.x=A_.cx-A_.d[0]*.3;pl.z=A_.cz-A_.d[1]*.3;step(1/30)});await pump();
  const tr=await ev(A,()=>({trading:game.trading,st:NET.st,team:document.querySelector('#scr-trader .team').textContent,go:document.querySelector('#scr-trader [data-go]').textContent,
    wait:document.querySelector('#scr-trader .wait').textContent}));
  check('through the exit: the server is told, the trader opens with the team',sent(A,'exit').length===1&&tr.trading&&tr.st==='out'&&/Ann/.test(tr.team)&&/Bob/.test(tr.team)&&/Ready for level 2/.test(tr.go),tr);
  // the team's map: the server says who pays
  const gm=await ev(A,()=>{game.gold=500;drawTrader();const g=game.gold;document.querySelector('[data-buy="map"]').click();return {paidNow:game.gold!==g,g,price:WARES.find(w=>w.id==='map').price()}});await pump();
  check('buying the team\'s map asks the server first',sent(A,'mapnext').length===1&&!gm.paidNow,gm);
  await all({t:'done'},roster([1,2],'out',{done:true}),{t:'mapnext',by:1});
  const after=await ev(A,()=>({gold:game.gold,sold:document.querySelector('[data-buy="map"]').disabled}));
  const bt=await ev(B,()=>({trading:game.trading,st:NET.st,ghost:document.getElementById('ghost').style.display,map:[...document.querySelectorAll('#scr-trader .ware')].find(w=>/Map of the next/.test(w.textContent)).textContent}));
  check('...and takes the price when it says so',after.gold===gm.g-gm.price&&after.sold,after);
  check('the level is done: the caught one goes to the trader too',bt.trading&&bt.st==='out'&&bt.ghost==='none'&&/Bought by Ann for the team/.test(bt.map),bt);
  await ev(A,()=>document.querySelector('#scr-trader [data-go]').click());await ev(B,()=>document.querySelector('#scr-trader [data-go]').click());await pump();
  check('Ready goes to the server',sent(A,'ready').pop().on===true&&sent(B,'ready').pop().on===true);
  const goldIn=await ev(A,()=>game.gold);
  const lv2={n:2,seed:999,theme:'catacombs',size:8,mapNext:true,extra:1,key:2,restart:false};
  await level({t:'level',lv:lv2},roster([1,2],'in',{p:{1:{loaded:false},2:{loaded:false}}}));
  const l2=await Promise.all([A,B].map(p=>ev(p,FP))),n2=await ev(A,()=>({lvl:game.level,trading:game.trading,ui:document.getElementById('ui').style.display,gold:game.gold,map:G.hasMap,st:NET.st}));
  check('the next level, the same for both, with the team\'s map; the purse carried',l2[0]===l2[1]&&n2.lvl===2&&!n2.trading&&n2.ui==='none'&&n2.gold===goldIn&&n2.map&&n2.st==='in',n2);
  check('...and the caught one is back in the maze',await ev(B,()=>NET.st==='in'&&!netGhost()));
  // everyone caught: the level once more, every purse as it came in
  await ev(A,()=>{game.gold+=50;game.picks=1});await level({t:'level',lv:Object.assign({},lv2,{key:3,restart:true})});
  const rs=await ev(A,()=>({gold:game.gold,picks:game.picks,lvl:game.level,key:NET.levelKey}));
  check('all caught: the same level again, the purse as it came in',rs.gold===goldIn&&rs.picks===5&&rs.lvl===2&&rs.key===3,rs);
  await all(roster([1,2],'in'),{t:'go'});

  // ---------- a coin thrown: the others see it fly ----------
  // (A draws 30 frames a second, B as many as it can: the copy must still land where the thrown one does)
  await ev(A,()=>{S.cap=30});
  await ev(B,()=>{game.gold=3;pl.pitch=.3;throwCoin()});await run(600);
  for(let k=0;k<40&&!(await ev(A,()=>G.coins.some(c=>c.copy&&c.rest>0))&&await ev(B,()=>G.coins.some(c=>!c.copy&&c.rest>0)));k++)await run(150);
  const co=await ev(A,()=>({copies:G.coins.filter(c=>c.copy).length,rest:G.coins.filter(c=>c.copy).every(c=>c.rest>0),gold:game.gold,at:G.coins.filter(c=>c.copy).map(c=>[c.x,c.y,c.z])[0]}));
  const bc=await ev(B,()=>{const c=G.coins.find(c=>!c.copy);return c&&c.rest>0?[c.x,c.y,c.z]:null});await ev(A,()=>{S.cap=0});
  check('a thrown coin flies for the others too, and costs only its thrower',co.copies===1&&co.rest&&(await ev(B,()=>game.gold))===2,co);
  check('...and lands just where the thrown one does, whatever the frame rate',!!bc&&!!co.at&&Math.hypot(bc[0]-co.at[0],bc[1]-co.at[1],bc[2]-co.at[2])<1e-9,[bc,co.at]);

  // ---------- the host leaves its page out of view: the shadows change hands ----------
  const before=await ev(A,()=>G.monsters.map(m=>[m.x,m.z]));
  await all(roster([1,2],'in',{host:2,p:{1:{hidden:true}}}));
  const took=await ev(B,()=>({host:NET.isHost,at:G.monsters.map(m=>[m.x,m.z])}));
  const near=took.at.every((p,k)=>Math.hypot(p[0]-before[k][0],p[1]-before[k][1])<1.2);
  await run(2000);
  const moves=await ev(B,()=>G.monsters.map(m=>[m.x,m.z]));
  check('a new host goes on from where the shadows were',took.host&&near&&moves.some((p,k)=>Math.hypot(p[0]-took.at[k][0],p[1]-took.at[k][1])>.3),{near});
  check('...and sends them to the rest',sent(B,'mobs').length>10&&(await ev(A,()=>!NET.isHost&&NET.mobBuf.length>0)));
  // a watcher, as the host's snapshots have it: turned and looking the host's way (what it is seen to look at is what it sees)
  const wt=await ev(A,()=>{const w=Object.assign(makeWatcher(root),{walk:0,mode:'patrol',stepT:0,lost:0,ph0:3});placeMonster(w,0);G.monsters.push(w);
    const k=G.monsters.length-1,m=G.monsters.map(mobPack);m[k][19]=1.234;m[k][20]=.321;m[k][21]=-.111;
    const now=performance.now(),clk=NET.clk;NET.mobBuf.length=0;NET.mobBuf.push({te:now-1e4,m},{te:now+1e4,m});NET.clk=0;
    netMobs(1/60,now/1000);const r={yaw:w.yaw,turned:w.m.rotation.y,ly:w.ly,lx:w.lx,iris:w.look.rotation.y};
    G.monsters.pop();root.remove(w.m);NET.mobBuf.length=0;NET.clk=clk;return r});
  check('a watcher is seen turned and looking as the host has it',[wt.yaw-1.234,wt.turned-1.234,wt.ly-.321,wt.lx+.111,wt.iris-.321].every(d=>Math.abs(d)<1e-6),wt);
  const ph=await Promise.all([A,B].map(p=>ev(p,()=>G.monsters.map(m=>m.ph0).join())));
  check('...and blinks when it blinks there (the same phase for everyone)',ph[0]===ph[1],ph);

  // ---------- away: a player whose game is out of view stays in the maze, and the host's shadows can catch it there ----------
  // (A is shown out of view since the host changed.) A holds a ward: the first shadow on it is struck down, the next catches it
  const team=await ev(B,()=>document.getElementById('team').textContent);
  check('away: the team sees who is away',/Annaway/.test(team),team);
  await ev(A,()=>{G.bless.ward=1});await run(300);
  const k0=sent(B,'catch').length,put=async()=>{await ev(B,()=>{const p=NET.peers.get(1),mo=G.monsters.find(m=>!m.watcher);mo.stun=0;mo.x=p.last.x;mo.z=p.last.z;game.peaceful=false});
    await run(300);await ev(B,()=>{game.peaceful=true})};
  await put();const wa=await ev(A,()=>G.bless.ward),fw=sent(B,'fx').filter(m=>m.k==='warded'),stunned=await ev(B,()=>G.monsters.find(m=>!m.watcher).stun>0);
  check('...a shadow reaching one away: its ward strikes the shadow down first (and its own game hears so)',fw.length===1&&fw[0].who===1&&wa===0&&stunned&&sent(B,'catch').length===k0,{fx:fw.length,ward:wa,stunned});
  await put();const said=sent(B,'catch').slice(k0);
  check('...the next one catches it: the host tells the server',said.length>=1&&said.every(m=>m.who===1&&m.lk===3),said);
  // the server takes it (A is away): A's game finds itself caught, a ghost watching the others
  await all(roster([1,2],{1:'ghost',2:'in'},{host:2,p:{1:{hidden:true}}}));
  const ag=await ev(A,()=>({st:NET.st,ghost:document.getElementById('ghost').style.display,watch:NET.watch,toast:document.getElementById('toast').textContent}));
  check('...and the one away, told so, is a ghost watching the others',ag.st==='ghost'&&ag.ghost==='block'&&ag.watch===2&&/while you were away/.test(ag.toast),ag);
  // one in play is not caught by the host's word: its own game decides
  const k1=sent(B,'catch').length;await all(roster([1,2],'in',{host:2}));await ev(A,()=>{NET.st='in'});
  await put();check('...one in play is not caught by the host: its own game decides',sent(B,'catch').length===k1);

  // ---------- a late join: the level as it is, opened chests open, the gate up ----------
  const C=await mk(3);P.push(C);
  const keyI=await ev(A,()=>{const c=G.chests.find(c=>c.isKey);return G.chests.indexOf(c)});
  await ev(C,()=>{document.getElementById('btnNet').click();document.getElementById('btnJoin').click()});await sleep(60);await pump();C.live=true;
  await ev(C,()=>{game.peaceful=false});await give(C,welcome(3,[1,2,3],'in',{lv:Object.assign({},lv2,{key:3,restart:true}),opened:[[keyI,1]],gate:1,go:true,host:2}));await pump();
  await ev(C,()=>{game.peaceful=true});
  const cj=await ev(C,()=>({key:G.hasKey,gate:G.gate.open,picks:game.picks,gold:game.gold,lvl:game.level,st:NET.st,loaded:__out.length}));
  const fc=await ev(C,FP);
  check('a late join builds the level as it is: same maze, the key found, the gate up',fc===(await ev(B,FP))&&cj.key&&cj.gate&&cj.lvl===2&&cj.st==='in',cj);
  check('...with a fresh purse, and says it is in',cj.picks===5&&cj.gold===0&&sent(C,'loaded').pop().key===3);
  // the shadows change hands between two others: this page measures the new host's clock afresh
  await ev(C,()=>{NET.clk=12345});await give(C,roster([1,2,3],'in',{host:1}));const ck=await ev(C,()=>NET.clk);await give(C,roster([1,2,3],'in',{host:2}));
  check('...another host for the shadows: their clock is measured afresh',ck===undefined,ck);
  // a reload: the same tab keeps its token; the server's copy of the purse and the spot come back
  await C.page.reload();await ev(C,()=>{game.instant=true;document.getElementById('btnNet').click();document.getElementById('btnJoin').click()});await sleep(60);await pump();
  const h2=sent(C,'hello').pop();check('a reloaded page joins with its token',h2.token==='tok3abcdefgh',h2);
  const spot=await ev(B,()=>{const c=warp(1.5,1.5);return {x:c[0],z:c[1],yaw:2}});
  await give(C,welcome(3,[1,2,3],'in',{lv:Object.assign({},lv2,{key:3,restart:true}),go:true,host:2,w:{pos:spot,purse:{gold:42,picks:3,gems:[],torch:true,orb:false,entry:{gold:40,gems:[],picks:3,mapNext:false},key:3,bless:{swift:1},fuel:.5}}}));await pump();
  await ev(C,()=>{game.peaceful=true});
  const cr=await ev(C,()=>({gold:game.gold,picks:game.picks,torch:game.torch,swift:G.bless.swift,fuel:G.fuel,at:[pl.x,pl.z,pl.yaw],entry:game.entry.gold}));
  check('...back with its purse, blessing, torch and spot',cr.gold===42&&cr.picks===3&&cr.torch&&cr.swift===1&&cr.fuel<=.5&&cr.fuel>.45&&Math.hypot(cr.at[0]-spot.x,cr.at[1]-spot.z)<.01&&cr.entry===40,cr);
  const alt=await ev(C,()=>G.chests.filter(c=>c.kind==='altar').map(c=>c.opened));
  check('...and the altar it prayed at is not there to pray at again',alt.length>0&&alt.every(x=>x),alt);
  // everyone caught now: the page that came back has an entry of its own (with no map in it), the level has the map: it
  // builds the very maze the others do
  // (A is away meanwhile: out of view, it sends nothing on the new level)
  await ev(A,()=>{NET.sendT=1e9});
  const cur=Object.assign({},lv2,{key:4,restart:true});await level({t:'level',lv:cur},roster([1,2,3],'in',{host:2,p:{1:{hidden:true}}}));
  const fr=await Promise.all([A,B,C].map(p=>ev(p,FP)));
  check('all caught after a page came back: the very same maze for everyone',fr[0]===fr[1]&&fr[1]===fr[2],fr);
  // a new level: the teammate away, who sends nothing, stands where it starts; seen there, and caught there by the shadows
  const seed=await ev(B,()=>{const p=NET.peers.get(1),s=netSpawnAt(p.col);return {last:p.last&&[p.last.x,p.last.z],spawn:s,shown:!!p.show&&!!p.av}});
  check('a new level: a teammate away, who sends nothing, is seen where it starts',!!seed.last&&Math.hypot(seed.last[0]-seed.spawn[0],seed.last[1]-seed.spawn[1])<1e-6&&seed.shown,seed);
  const k2=sent(B,'catch').length;await ev(B,()=>{NET.go=true;G.grace=0});await put();
  check('...and the shadows can catch it there',sent(B,'catch').slice(k2).some(m=>m.who===1&&m.lk===4),sent(B,'catch').slice(k2));
  await ev(A,()=>{NET.sendT=0});
  await all(roster([1,2,3],'in',{host:2}),{t:'go'});

  // ---------- a dropped connection comes back by itself, the level kept ----------
  const W0=await ev(A,()=>{window.__W0=W;__ws.close();return 1});await sleep(200);
  const lost=await ev(A,()=>document.getElementById('netlost').style.display);
  // meanwhile the player stands (the shadows can't be seen moving): W held, the mouse captured, A does not go
  const walk=()=>ev(A,()=>{const x0=pl.x,z0=pl.z,l0=locked,u0=document.getElementById('ui').style.display;locked=true;document.getElementById('ui').style.display='none';keys.KeyW=true;
    return new Promise(r=>setTimeout(()=>{keys.KeyW=false;locked=l0;document.getElementById('ui').style.display=u0;r(Math.hypot(pl.x-x0,pl.z-z0))},400))});
  const cutWalk=await walk();
  const hellos=async(p,n)=>{for(let k=0;k<60&&sent(p,'hello').length<n;k++){await sleep(50);await pump()}};
  await hellos(A,2);
  const again=sent(A,'hello').pop();await give(A,welcome(1,[1,2,3],'in',{lv:cur,go:true,host:2}));await pump();
  const back=await ev(A,()=>({same:W===window.__W0,on:NET.on,lost:document.getElementById('netlost').style.display}));
  check('a dropped connection: a note, a new join with the token, the level kept',lost==='flex'&&again&&again.token==='tok1abcdefgh'&&back.same&&back.on&&back.lost==='none'&&sent(A,'loaded').pop().key===4,[lost,back]);
  const backWalk=await walk();
  check('...with the connection lost the player stands; back, it walks again',cutWalk===0&&backWalk>.3,{cut:cutWalk,back:+backWalk.toFixed(2)});
  // B's connection drops, and meanwhile a shadow catches it and its purse changes: none of it can be said. back on the same
  // level, the server still has it in the maze: it says it again (the level is not over without it), and the purse goes out
  const cb0=sent(B,'caught').length;await ev(B,()=>{__ws.close()});await sleep(100);
  await ev(B,()=>{game.gold+=5;netCaught()});await run(200);const gB=await ev(B,()=>game.gold);
  check('...caught while the connection is down: nothing can go out yet',sent(B,'caught').length===cb0&&(await ev(B,()=>NET.st))==='ghost');
  await hellos(B,2);await give(B,welcome(2,[1,2,3],'in',{lv:cur,go:true,host:2}));await run(2600);
  const rc=sent(B,'caught').slice(cb0),pu=sent(B,'purse').filter(m=>m.p.gold===gB);
  check('...back: what the server has not heard (caught) is said again, and the purse goes out as it is',rc.length>=1&&rc.every(m=>m.lk===4)&&pu.length>0,{caught:rc.length,purse:pu.length});
  await all(roster([1,2,3],{1:'in',2:'ghost',3:'in'},{host:2}));
  // A's connection drops for long, and the level is over meanwhile: back, it goes to the trader with the others
  await ev(A,()=>{__ws.close()});await hellos(A,3);
  await give(A,welcome(1,[1,2,3],'out',{lv:cur,go:true,host:2,done:true}));await pump();
  const lim=await ev(A,()=>({trading:game.trading,st:NET.st,trader:!document.getElementById('scr-trader').classList.contains('hidden')&&document.getElementById('ui').style.display!=='none'}));
  check('...back after the level was over: at the trader, not left in the maze',lim.trading&&lim.st==='out'&&lim.trader,lim);

  // ---------- the run ends: everyone in the lobby; leaving ----------
  await all({t:'lobby'},roster([1,2,3],'lobby',{play:false}));
  const lo=await ev(B,()=>({lobby:!document.getElementById('scr-play').classList.contains('hidden'),started:game.started,team:document.getElementById('team').style.display}));
  check('the leader ends the run: everyone back in the lobby',lo.lobby&&!lo.started&&lo.team==='none',lo);
  // the leader goes: the next one leads and starts with the size on screen (the old leader's pick), not a setting of its own
  await all(roster([2,3],'lobby',{play:false,leader:2,host:2}));
  const ls=await ev(B,()=>({lead:netLeader(),lit:+document.querySelector('#sizes .sel').dataset.n,S:S.size}));
  await ev(B,()=>document.getElementById('btnStart').click());await pump();const st2=sent(B,'setup').pop();
  check('a new leader starts with the size on screen',ls.lead&&ls.lit!==ls.S&&st2.size===ls.lit,[ls,st2.size]);
  // ...and the server does not start (no level comes): the lobby comes back
  await sleep(3300);const sl=await ev(B,()=>({ui:document.getElementById('ui').style.display,lobby:!document.getElementById('scr-play').classList.contains('hidden')}));
  check('...a start the server did not take: the lobby comes back',sl.ui!=='none'&&sl.lobby,sl);
  // a page out of view builds a level at once (it draws no frames to wait for): nobody waits for it
  // (the level is handed over and looked at in one go: a page in view would still be waiting for its frames)
  const hb=await ev(C,lv=>{game.instant=false;Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});__in({t:'level',lv});
    const r={started:game.started,loading:game.loading,key:NET.levelKey};delete document.hidden;game.instant=true;return r},Object.assign({},lv2,{n:3,seed:78,key:10}));
  await pump();
  check('a page out of view builds the level at once, and says so',hb.started&&!hb.loading&&hb.key===10&&sent(C,'loaded').pop().key===10,hb);
  await give(C,{t:'lobby'});
  // the run is ended while a level is being built: it is not played behind the lobby
  await ev(C,()=>{game.instant=false});await give(C,{t:'level',lv:Object.assign({},lv2,{n:3,seed:77,key:9})},{t:'lobby'});await sleep(500);
  const cl=await ev(C,()=>({started:game.started,loading:game.loading,lv:NET.lv,lobby:!document.getElementById('scr-play').classList.contains('hidden'),ui:document.getElementById('ui').style.display}));
  await ev(C,()=>{game.instant=true});
  check('the run ended while a level was being built: it is not played behind the lobby',!cl.started&&!cl.loading&&cl.lv===null&&cl.lobby&&cl.ui!=='none',cl);
  const closed0=await ev(B,()=>__closed);await ev(B,()=>document.querySelector('#scr-play [data-back]').click());await sleep(50);
  const lv=await ev(B,()=>({main:!document.getElementById('scr-main').classList.contains('hidden'),closed:__closed,on:NET.on,net:!document.getElementById('btnNet').classList.contains('hidden')}));
  check('Leave closes the connection and goes back to the main menu',lv.main&&lv.closed===closed0+1&&!lv.on&&lv.net,lv);
  // a full game turns a join away with a word
  await ev(B,()=>{document.getElementById('btnNet').click();document.getElementById('btnJoin').click()});await sleep(60);
  await give(B,{t:'error',code:'full',msg:'The game is full: 6 players already'});await sleep(50);
  const full=await ev(B,()=>({msg:document.getElementById('netMsg').textContent,on:NET.on,net:!document.getElementById('scr-net').classList.contains('hidden')}));
  check('a full game: the join screen says so',/full/.test(full.msg)&&!full.on&&full.net,full);

  const errs=P.flatMap(p=>p.errs);if(errs.length){console.log('errors:',errs.slice(0,8));fail++}
  await browser.close();process.exit(fail?1:0)})();
