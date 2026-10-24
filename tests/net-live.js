// playing together for real: the co-op server (built from server/, the game served from this folder) and browsers that
// open its address and join from its page, as players do. it starts the server on a free port and stops it at the end.
// node tests/net-live.js   (npm run test-live)
const {spawn,execFileSync}=require('child_process'),path=require('path'),http=require('http');
const {launch,page:open}=require('./helpers');
const ROOT=path.join(__dirname,'..');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const get=url=>new Promise(res=>http.get(url,r=>{let b='';r.on('data',d=>b+=d);r.on('end',()=>res({status:r.statusCode,type:r.headers['content-type'],body:b}))}).on('error',e=>res({status:0,body:String(e)})));
(async()=>{let fail=0;const check=(name,ok,info)=>{console.log((ok?'OK  ':'FAIL')+' '+name+(info!==undefined?' '+JSON.stringify(info):''));if(!ok)fail++};
  execFileSync('cargo',['build','--release'],{cwd:path.join(ROOT,'server'),stdio:'inherit'});
  const srv=spawn(path.join(ROOT,'server','target','release','dungeon-master-server'+(process.platform==='win32'?'.exe':'')),['--port','0','--no-open','--dir',ROOT]);
  const log=[];srv.stdout.on('data',d=>log.push(...String(d).split('\n').filter(l=>l.trim())));
  const url=await new Promise((res,rej)=>{const t=setInterval(()=>{const l=log.find(l=>/This computer/.test(l));if(l){clearInterval(t);res(l.match(/http:\/\/localhost:\d+/)[0].replace('localhost','127.0.0.1'))}},50);
    setTimeout(()=>rej(new Error('the server did not start:\n'+log.join('\n'))),15000)});
  const browser=await launch();
  try{
    // ---------- the server hands out the game ----------
    const [js,idx,up,nope]=await Promise.all([get(url+'/js/06-game.js'),get(url+'/'),get(url+'/../server/Cargo.toml'),get(url+'/nope.js')]);
    check('the server hands out the game, nothing outside it',js.status===200&&/javascript/.test(js.type)&&/function loop/.test(js.body)&&idx.status===200&&/DUNGEON/.test(idx.body)&&up.status===404&&nope.status===404,[js.status,js.type,idx.status,up.status,nope.status]);
    const P=[];const mk=async()=>{const p=await open(browser,800,450,null,url+'/');P.push(p);return p};
    const ev=(p,f,a)=>p.page.evaluate(f,a);
    const join=async(p,name)=>{await ev(p,n=>{document.getElementById('btnNet').click();document.getElementById('netName').value=n;document.getElementById('btnJoin').click()},name);
      for(let i=0;i<100&&!(await ev(p,()=>NET.on));i++)await sleep(50)};
    const until=async(p,f,ms=8000,a)=>{const end=Date.now()+ms;while(Date.now()<end){if(await ev(p,f,a))return true;await sleep(60)}return false};
    const FP=()=>{const h=a=>{let x=2166136261>>>0;for(let i=0;i<a.length;i++){x^=a[i]&255;x=Math.imul(x,16777619)>>>0}return x};
      return JSON.stringify({occ:h(W.occ.occ),chests:G.chests.map(c=>c.kind+Math.round(c.x*100)+JSON.stringify(c.loot0)).join(';').length,mobs:G.monsters.map(m=>m.kind+m.cell).join(' '),theme:game.theme,level:game.level})};
    // ---------- joining: the leader and the others ----------
    const A=await mk(),B=await mk();
    check('the page served by the server fills in its address',(await ev(A,()=>document.getElementById('netAddr').value))===url.replace('http://',''));
    await join(A,'Ann');await join(B,'Bob');
    check('both join; the first leads',await ev(A,()=>netLeader()&&NET.players.length===2)&&await ev(B,()=>!netLeader()&&NET.players.length===2));
    await ev(A,()=>{document.querySelector('.mapc[data-t="dungeon"]').click();document.querySelector('#sizes [data-n="8"]').click()});
    check('the leader\'s pick reaches the other',await until(B,()=>document.querySelector('#maps .sel')&&document.querySelector('#maps .sel').dataset.t==='dungeon'&&document.querySelector('#sizes .sel').dataset.n==='8'));
    await Promise.all([A,B].map(p=>ev(p,()=>{game.peaceful=false})));
    await ev(A,()=>document.getElementById('btnStart').click());
    check('Start: both build level 1',await until(A,()=>netUp()&&game.level===1)&&await until(B,()=>netUp()&&game.level===1));
    await Promise.all([A,B].map(p=>ev(p,()=>{game.peaceful=true})));
    const f=await Promise.all([A,B].map(p=>ev(p,FP)));check('the very same maze for both',f[0]===f[1],f);
    check('the shadows may move once both are in',await until(A,()=>NET.go)&&await until(B,()=>NET.go));
    // ---------- each other, the shadows ----------
    await ev(B,()=>{const c=warp(.5,1.5),d=warp(1.5,.5),t=W.M.open(0,0,0,1)?c:d;pl.x=t[0];pl.z=t[1];pl.y=floorH(pl.x,pl.z)+1.6});
    check('the other is seen where they are',await until(A,()=>{const p=NET.peers.values().next().value;return p&&p.av&&Math.hypot(p.x-(p.last||{}).x,p.z-(p.last||{}).z)<.05&&Math.hypot(p.x-W.start.x,p.z-W.start.z)>1}));
    await sleep(6000);
    const ma=await ev(A,()=>G.monsters.map(m=>[m.x,m.z])),mb=await ev(B,()=>G.monsters.map(m=>[m.x,m.z]));
    const gap=Math.max(...ma.map((p,k)=>Math.hypot(p[0]-mb[k][0],p[1]-mb[k][1])));
    check('the host moves the shadows, the other sees them where they are',await ev(A,()=>NET.isHost)&&gap<1.2,{gap:+gap.toFixed(2)});
    // ---------- two players at one chest at the same moment: one gets it ----------
    const ci=await ev(A,()=>G.chests.findIndex(c=>c.kind==='chest'&&c.lock<0&&!c.isKey&&c.loot.some(l=>l.t==='gold')&&!c.loot.some(l=>l.t==='map')));
    const g0=await Promise.all([A,B].map(p=>ev(p,()=>game.gold)));
    await Promise.all([A,B].map(p=>ev(p,i=>claimOpen(G.chests[i]),ci)));
    await until(A,i=>G.chests[i].opened&&!G.fly.length,8000,ci);await until(B,i=>G.chests[i].opened&&!G.fly.length,8000,ci);await sleep(300);
    const g1=await Promise.all([A,B].map(p=>ev(p,()=>game.gold))),won=[g1[0]-g0[0],g1[1]-g0[1]];
    check('a chest asked for by both at once: one of them gets its gold, never both',(won[0]>0)!==(won[1]>0),won);
    // ---------- caught: a ghost; through the exit: the trader for both; ready: the next level ----------
    await ev(B,()=>{game.peaceful=false;const mo=G.monsters.find(m=>!m.watcher);pl.x=mo.x+.2;pl.z=mo.z});
    check('caught: the other becomes a ghost watching the first',await until(B,()=>NET.st==='ghost'&&NET.watch>0));
    check('...and the first sees it',await until(A,()=>[...NET.peers.values()][0].st==='ghost'));
    await ev(A,()=>{G.gate.open=true;const X=W.exitArch;pl.x=X.cx-X.d[0]*.3;pl.z=X.cz-X.d[1]*.3;step(1/30)});
    check('through the exit: the level is done, both at the trader',await until(A,()=>game.trading&&NET.done)&&await until(B,()=>game.trading&&NET.st==='out'));
    await Promise.all([A,B].map(p=>ev(p,()=>{game.peaceful=false;document.querySelector('#scr-trader [data-go]').click()})));
    check('everyone ready: level 2 for both',await until(A,()=>netUp()&&game.level===2)&&await until(B,()=>netUp()&&game.level===2&&NET.st==='in'));
    await Promise.all([A,B].map(p=>ev(p,()=>{game.peaceful=true})));
    const f2=await Promise.all([A,B].map(p=>ev(p,FP)));check('...the same maze again',f2[0]===f2[1],f2);
    // ---------- everyone caught: the level starts over ----------
    await until(A,()=>NET.go);const key=await ev(A,()=>NET.lv.key);
    await Promise.all([A,B].map(p=>ev(p,()=>{game.peaceful=false;netCaught()})));
    check('all caught: the same level once more',await until(A,k=>netUp()&&NET.lv.key!==k&&NET.lv.restart&&game.level===2,8000,key)&&await until(B,k=>netUp()&&NET.lv.key!==k,8000,key));
    await Promise.all([A,B].map(p=>ev(p,()=>{game.peaceful=true})));
    // ---------- a late join, and a page that reloads ----------
    const C=await mk();await ev(C,()=>{game.peaceful=false});await join(C,'Cid');
    check('a late join builds the level as it is',await until(C,()=>netUp()&&game.level===2)&&(await ev(C,FP))===(await ev(A,FP)));
    await ev(C,()=>{game.peaceful=true;game.gold=77;netPurseOut(true)});await sleep(300);
    await C.page.reload();await ev(C,()=>{game.instant=true});await join(C,'');
    check('a reloaded page comes back as the same player with its purse',await until(C,()=>netUp()&&game.gold===77&&netMe()&&netMe().name==='Cid'));
    // ---------- the host leaves: the shadows go on with another ----------
    await A.page.close();P.splice(P.indexOf(A),1);
    check('the leader and host leaves: the next one leads and moves the shadows',await until(B,()=>NET.isHost&&netLeader()&&NET.players.length===2));
    const m0=await ev(B,()=>G.monsters.map(m=>[m.x,m.z]));await sleep(2500);const m1=await ev(B,()=>G.monsters.map(m=>[m.x,m.z]));
    check('...and they keep moving',m1.some((p,k)=>Math.hypot(p[0]-m0[k][0],p[1]-m0[k][1])>.3));
    check('the others follow the new host',await until(C,()=>!NET.isHost&&NET.mobBuf.length>0));
    check('the server window tells the story',['Ann joined','Bob joined','Level 1','was caught','is through the exit','Level 2','starts over','Cid joined','Cid lost the connection','Cid is back','Ann lost the connection'].every(w=>log.some(l=>l.includes(w))),log.slice(-8));
    const errs=P.flatMap(p=>p.errs);if(errs.length){console.log('errors:',errs.slice(0,8));fail++}
  }finally{await browser.close();srv.kill()}
  process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(1)});
