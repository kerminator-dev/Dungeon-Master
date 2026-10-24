'use strict';
// ---------- playing together over the local network ----------
// one player starts the co-op server (server/: a single executable that also serves this very game); everyone opens
// its address, picks Play together and joins. the server hands out the levels (seed, map, size: every browser builds the
// very same maze from them), settles what may happen once only (a chest, the gate), keeps the score of who is in the
// maze, caught or through, and passes the players' news on. one browser, the host, moves the shadows and sends them to
// the others thirty times a second; everyone draws the others a little in the past, smoothly between two of their
// snapshots (as little as the network allows), and decides for themselves when a shadow has caught them.
// the rules: the level is done when everyone still in the maze is through the exit; the caught watch a teammate's view
// till then, and if all are caught the level starts over with every purse as it came in. whoever opens a chest takes
// what is in it; the key and the map are the team's
const NET_PROTO=2;          // server/src/room.rs: PROTO
const NET_PORT=7777;
const NET_RATE=1/30;        // s between two of one's own snapshots (the player's state, the host's shadows)
// ms: how far in the past the others are drawn to begin with, and at most (netWait: as far as their snapshots need)
const NET_D0=100,NET_DMAX=120;
const MOB_MODES=['patrol','chase','lure','search'];
const NET={on:false,ws:null,addr:'',id:0,st:'lobby',players:[],leader:0,host:0,isHost:false,play:false,peers:new Map(),lv:null,levelKey:0,
  go:false,opened:new Map(),gate:0,mapBuy:0,done:false,watch:0,sendT:0,mobT:0,mobBuf:[],purseSig:'',purseT:0,stT:0,tries:0,leaving:false,welcomed:false,warded:new Set(),catchT:new Map()};
const ST_RANK={lobby:0,in:1,ghost:2,out:3};
const r2=v=>Math.round(v*100)/100,r3=v=>Math.round(v*1000)/1000;
const num=v=>typeof v==='number'&&isFinite(v);
const esc=s=>String(s).replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const netMe=()=>NET.players.find(p=>p.id===NET.id);
const netName=id=>id===NET.id?'You':(NET.players.find(p=>p.id===id)||{}).name||'Someone';
const netLeader=()=>NET.on&&NET.leader===NET.id;
// caught, watching a teammate until the level is over
const netGhost=()=>NET.on&&NET.st==='ghost';
const netWatched=()=>netGhost()&&NET.peers.get(NET.watch)||null;
// where the world is seen from: the player, or (caught) the teammate being watched
function eye(){const p=netWatched();return p&&p.x!==undefined?p:pl}
// false: not sent (no connection right now)
function netSend(o){const w=NET.ws;if(!w||w.readyState!==1)return false;w.send(JSON.stringify(o));return true}
// what concerns the level under way carries its key (lk): said on one level, it is not taken for the next one, by the
// server or by the others
const netLk=()=>NET.lv?NET.lv.key:0;
const netAsk=o=>netSend(Object.assign(o,{lk:netLk()}));
const netFx=o=>{if(NET.on)netAsk(Object.assign({t:'fx'},o))};
const netHere=m=>NET.lv&&m.lk===NET.lv.key;

// ---------- joining ----------
// what was typed: a name or an address with or without the port, or a link copied from the server's window
function netAddr(a){a=(a||'').trim().replace(/^[a-z]+:\/\//i,'').replace(/\/.*$/,'');return !a?'':/:\d+$/.test(a)?a:a+':'+NET_PORT}
function netJoin(){const addr=netAddr($('netAddr').value),name=$('netName').value.trim().slice(0,16);
  if(!addr){netMsg('Type the address the server shows, for example 192.168.1.20:7777');return}
  S.netAddr=addr;S.netName=name;saveSet();NET.addr=addr;NET.leaving=false;NET.welcomed=false;NET.tries=0;netMsg('Joining '+addr+'…');netConnect()}
function netMsg(s,bad){const el=$('netMsg');el.textContent=s||'';el.classList.toggle('bad',!!bad)}
function netConnect(){let ws;try{ws=new WebSocket('ws://'+NET.addr+'/ws')}catch(e){netMsg('That is not an address a game can join',true);return}NET.ws=ws;
  ws.onopen=()=>{let token='';try{token=sessionStorage.getItem('labyrinthNet')||''}catch(e){}
    netSend({t:'hello',v:NET_PROTO,name:S.netName||'',token})};
  ws.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch(x){return}if(m&&typeof m.t==='string')netOn(m)};
  ws.onclose=()=>{if(NET.ws!==ws)return;NET.ws=null;if(NET.leaving)return;
    if(!NET.welcomed){netMsg('No server answers at '+NET.addr+'. Is it running, and are you on the same network?',true);return}
    // dropped in the middle of the game: try again for a while; the server keeps the place (purse, spot) meanwhile
    netLost(true);if(NET.tries++<40)setTimeout(()=>{if(!NET.leaving&&!NET.ws)netConnect()},1000);else netQuit('The connection to the server was lost')}}
function netLost(on){NET.cut=on;domSet($('netlost'),'display',on?'flex':'none')}
// the connection is lost and being joined again (till the server's welcome)
const netCut=()=>NET.on&&!!NET.cut;
// leaving: back to the main menu (the server keeps the place a while, a join from this page comes back to it)
function netQuit(msg){NET.leaving=true;netSend({t:'leave'});const w=NET.ws;NET.ws=null;if(w)try{w.close()}catch(e){}netLost(false);
  for(const p of NET.peers.values())netDropAvatar(p);NET.peers.clear();
  clearTimeout(NET.startT);
  Object.assign(NET,{on:false,id:0,st:'lobby',players:[],leader:0,host:0,isHost:false,play:false,lv:null,levelKey:0,pendLv:null,go:false,opened:new Map(),gate:0,mapBuy:0,done:false,watch:0,mobBuf:[],purseSig:''});
  game.started=false;game.trading=false;game.mobsExtra=0;if(LP.active)stopLockpick();bigMap=0;drawMap();netHud();PICK.mine();
  if(document.pointerLockElement&&document.exitPointerLock)document.exitPointerLock();
  showMenu(msg?'net':'main');if(msg)netMsg(msg,true)}

// ---------- what the server says ----------
function netOn(m){switch(m.t){
  case 'welcome':return netWelcome(m);
  case 'room':return netRoom(m);
  case 'setup':if(!netLeader())netSetupIn(m.setup);return;
  case 'lobby':return netToLobby();
  case 'level':return netLevel(m.lv);
  case 'go':NET.go=true;return;
  case 's':return netState(m);
  case 'mobs':return netMobsIn(m);
  case 'fx':return netFxIn(m);
  case 'opened':if(!num(m.i))return;NET.opened.set(m.i,m.by);if(netUp())netOpened(m.i,m.by,true);return;
  case 'gate':NET.gate=m.by;if(netUp())netGateOpened(m.by,true);return;
  case 'done':NET.done=true;if(NET.st==='ghost')netGhostOut();else if(game.trading)drawTrader();return;
  case 'mapnext':return netMapNext(m.by);
  case 'error':if(m.code==='replaced'||m.code==='full'||m.code==='version'){const ws=NET.ws;NET.leaving=true;if(NET.welcomed)netQuit(m.msg);else{netMsg(m.msg,true);NET.ws=null;if(ws)ws.close()}}return}}
// the level this page has up is the one being played
const netUp=()=>NET.on&&game.started&&!game.loading&&NET.lv&&NET.levelKey===NET.lv.key;

function netWelcome(m){const r=m.room||{};NET.on=true;NET.welcomed=true;NET.id=m.id;NET.tries=0;netLost(false);
  try{sessionStorage.setItem('labyrinthNet',m.token)}catch(e){}
  const back=NET.lv&&r.lv&&NET.lv.key===r.lv.key&&netUp();   // the connection came back, the level still up
  NET.opened=new Map(Array.isArray(r.opened)?r.opened:[]);NET.gate=r.gate||0;NET.mapBuy=r.mapBuy||0;NET.done=!!r.done;NET.go=!!r.go;
  if(!back)NET.st='lobby';
  netRoom(r);
  // a page out of view moves no shadows (the server takes a page that joins for one in view)
  if(document.hidden)netSend({t:'vis',hidden:true});
  // back after a reload: the purse as it was left (a page that kept its level up has its own, newer)
  NET.restored=false;if(!back&&m.purse&&typeof m.purse==='object')netPurseIn(m.purse);
  NET.pos=m.pos&&num(m.pos.x)&&num(m.pos.z)?m.pos:null;
  if(!r.play){netToLobby(r.setup);return}
  // the connection back, the level still up: what was opened meanwhile opens at once (what this player had asked for still
  // flies to them: it is theirs), and the server gets the purse as it is now
  if(back){for(const [i,by] of NET.opened)netOpened(i,by,by===NET.id);if(NET.gate)netGateOpened(NET.gate,false);
    netSend({t:'loaded',key:NET.lv.key});netPurseOut(true);return}
  netLevel(r.lv,{join:true})}

// who is in, and how they are doing
function netRoom(r){if(!Array.isArray(r.players))return;const host0=NET.host;NET.players=r.players.filter(p=>p&&num(p.id));NET.leader=r.leader;NET.host=r.host;
  if(r.play!==undefined)NET.play=!!r.play;if(r.done!==undefined)NET.done=!!r.done;
  const was=NET.isHost;NET.isHost=NET.host===NET.id;
  // one's own state only moves on within a level (in, caught, out): an older word from the server does not take it back.
  // one the server sends out (the level is done; or it was over while this page's connection was gone) goes to the trader
  const me=netMe(),was0=NET.st;if(me&&ST_RANK[me.st]!==undefined&&(ST_RANK[me.st]>=ST_RANK[NET.st]||NET.st==='lobby'))NET.st=me.st;
  if((was0==='ghost'||was0==='in')&&NET.st==='out')netGhostOut(was0);
  // the host's shadows caught this player while its game was out of view (shown once the others are in place, below)
  const away=was0==='in'&&NET.st==='ghost';
  // a new leader may end the run from the menu
  $('btnLobby').classList.toggle('hidden',!NET.play||!netLeader());
  for(const p of NET.players)if(p.id!==NET.id){let q=NET.peers.get(p.id);if(!q)NET.peers.set(p.id,q={id:p.id,buf:[],av:null,bob:0});
    if(q.av&&(q.name!==p.name||q.col!==p.col))netDropAvatar(q);Object.assign(q,{name:String(p.name),col:p.col|0,st:p.st,ready:!!p.ready,off:!!p.off,hidden:!!p.hidden})}
  for(const [id,q] of NET.peers)if(!NET.players.some(p=>p.id===id)){netDropAvatar(q);NET.peers.delete(id)}
  if(netUp())netAvatars();
  // the shadows change hands: from the last snapshot on, as the old host had them. their snapshots come by another clock now
  // (for every page: its time is measured afresh)
  if(NET.isHost&&!was)netTakeMobs();if(!NET.isHost&&was)NET.mobBuf.length=0;if(NET.host!==host0)NET.clk=undefined;
  if(away&&netUp())netCaughtAway();
  if(netGhost()&&!netWatchOk(NET.watch))netWatchNext(1);
  netHud();if(!$('scr-play').classList.contains('hidden'))netLobbyDraw();if(game.trading)drawTrader()}

// ---------- the lobby: the leader picks the path, everyone waits for Start ----------
function netToLobby(setup){NET.play=false;NET.st='lobby';NET.lv=null;NET.levelKey=0;NET.pendLv=null;NET.done=false;game.started=false;game.trading=false;
  if(LP.active)stopLockpick();bigMap=0;drawMap();if(document.pointerLockElement&&document.exitPointerLock)document.exitPointerLock();
  showMenu('play');if(setup&&setup.pool)netSetupIn(setup);else if(netLeader())netSetupOut();netLobbyDraw()}
function netLobbyDraw(){const on=NET.on&&!NET.play,lead=netLeader(),L=NET.players.find(p=>p.id===NET.leader);
  $('lobby').classList.toggle('hidden',!on);$('scr-play').classList.toggle('ro',on&&!lead);
  $('btnStart').disabled=on&&!lead;$('btnStart').textContent=on&&!lead?'Waiting for '+(L?L.name:'the leader'):'Start';
  document.querySelector('#scr-play [data-back]').textContent=on?'Leave':'Back';
  if(!on)return;
  $('lobbyList').innerHTML=NET.players.map(p=>`<span class="pl${p.id===NET.id?' me':''}"><i style="background:${HERO_COLS[p.col%HERO_COLS.length][1]}"></i>${esc(p.name)}${p.id===NET.leader?' <small>leads</small>':''}</span>`).join('');
  $('lobbyNote').textContent=lead?(NET.players.length>1?'You lead: pick the path and the size, then Start':'Waiting for the others to join. You can start alone too'):`${L?L.name:'The leader'} picks the path. The game starts when they press Start`}
// the leader's pick goes to the others as it changes
function netSetupOut(){if(!netLeader()||NET.play)return;const c=PICK.get(),pool=c.k?[c.k]:c.w==='any'?Object.keys(THEMES):WORLDS[c.w]||['dungeon'];
  netSend({t:'setup',world:c.w,pick:c.k||null,size:PICK.size(),pool})}
function netSetupIn(s){if(!s||NET.play)return;PICK.show(s.world,s.pick,s.size)}
function netStart(){if(!netLeader())return;netSetupOut();netSend({t:'start'});
  // the click captures the mouse (it needs one); the level comes in a moment, behind its loading screen. should the server not
  // start (another player leads by now, the connection is gone), the lobby comes back
  hideMenu();clearTimeout(NET.startT);
  NET.startT=setTimeout(()=>{if(NET.on&&!NET.play&&!game.started&&$('ui').style.display==='none'){if(document.exitPointerLock)document.exitPointerLock();showMenu('play')}},3000)}

// ---------- levels ----------
// a new run: the purse as on a new game
function netNewPurse(){Object.assign(game,{level:1,picks:5,gold:0,gems:[],mapNext:false,torch:false,orb:false,darkHint:0,trading:false})}
function netLevel(lv,o={}){if(!lv||!num(lv.key))return;if(game.loading){NET.pendLv=[lv,o];return}
  const run=!NET.lv&&!o.join||o.join&&!NET.restored;if(run)netNewPurse();
  NET.lv=lv;NET.levelKey=0;NET.play=true;NET.watch=0;NET.mobBuf.length=0;NET.clk=undefined;NET.warded.clear();NET.catchT.clear();
  for(const p of NET.peers.values())Object.assign(p,{buf:[],last:null,x:undefined,show:false});
  if(!o.join){NET.go=false;NET.opened.clear();NET.gate=0;NET.done=false;if(!lv.restart)NET.mapBuy=0;NET.st='in'}
  Object.assign(game,{level:lv.n,seed:lv.seed,theme:THEMES[lv.theme]?lv.theme:'dungeon',size:lv.size,mapNext:!!lv.mapNext,mobsExtra:lv.extra|0,trading:false});
  // caught all together: every purse back to what it came in with; a new level: what it comes in with now (a page back on the
  // very level its purse was kept on keeps the entry that came with it). the next maze's map is always the level's word, never
  // an entry's: everyone's maze is built by it
  if(lv.restart&&!o.join)restoreEntry();else if(!(o.join&&NET.restored&&NET.restLv&&NET.restLv.key===lv.key))saveEntry();
  game.mapNext=!!lv.mapNext;
  if(LP.active)stopLockpick();bigMap=0;drawMap();$('ui').style.display='none';
  loadLevel({head:lv.restart&&!o.join?'The shadows caught everyone':o.join?'Joining · level '+lv.n:'Level '+lv.n,sub:lv.restart&&!o.join?'The level starts over':undefined,
    cls:lv.restart&&!o.join?'caught':'',done:()=>netLevelUp(lv,o)})}
function netLevelUp(lv,o){
  // the run was ended, or this page left the game, while the level was being built: it is not played
  if(!NET.on||NET.lv!==lv){game.started=false;return}
  NET.levelKey=lv.key;
  // what happened before this page had the level up (it joined late): opened at once, nothing flies
  for(const [i,by] of NET.opened)netOpened(i,by,false);if(NET.gate)netGateOpened(NET.gate,false);
  // back after a reload: on the same spot, the same blessing (and the altar prayed at) and torch; otherwise a step aside from
  // the others at the start
  const R=NET.restored&&NET.restLv;if(R&&R.key===lv.key){if(num(R.fuel))G.fuel=R.fuel;
    if(R.bless&&Object.keys(R.bless).length){G.bless=R.bless;if(R.bless.flame)G.fuelT*=2;for(const c of G.chests)if(c.kind==='altar')c.opened=true}}
  if(o.join&&NET.pos){const p=NET.pos;pl.x=p.x;pl.z=p.z;pl.yaw=num(p.yaw)?p.yaw:pl.yaw;pl.y=floorH(pl.x,pl.z)+1.6}else netSpawn();
  if(!o.join)netSpawnOthers();
  NET.pos=null;netAvatars();netSend({t:'loaded',key:lv.key});netPurseOut(true);
  if(NET.st==='ghost')netGhostStart(true);
  else if(NET.st==='out'||NET.done){NET.st='out';openTrader(NET.done?`Level ${lv.n} is over: everyone is at the trader`:'')}
  else toast(TH.name+(TH.wname?' · '+TH.wname:'')+' · level '+lv.n+(lv.restart&&!o.join?' · once more':''));
  netHud();if(NET.pendLv){const [l,q]=NET.pendLv;NET.pendLv=null;netLevel(l,q)}}
// everyone starts at the entrance: a step apart (by the cloak's colour), so nobody stands inside another
function netSpawnAt(col){const f=[-Math.sin(W.start.yaw),-Math.cos(W.start.yaw)],r=[-f[1],f[0]];
  const O=[[0,0],[-.7,.5],[-.7,-.5],[-1.3,0],[.6,.5],[.6,-.5]][(col|0)%6],x=W.start.x+f[0]*O[0]+r[0]*O[1],z=W.start.z+f[1]*O[0]+r[1]*O[1];
  return free(x,z)?[x,z]:[W.start.x,W.start.z]}
function netSpawn(){const me=netMe(),[x,z]=netSpawnAt(me?me.col:0);pl.x=x;pl.z=z;pl.y=floorH(x,z)+1.6}
// the others at a new level: where they start, till their own news comes (seen there; and a teammate away, who sends none, is
// found there by the shadows)
function netSpawnOthers(){const now=performance.now();
  for(const p of NET.peers.values())if(!p.last){const [x,z]=netSpawnAt(p.col),s={x,y:floorH(x,z)+1.6,z,yaw:W.start.yaw,pitch:0,mv:0,lt:p.lt|0,fu:1};
    p.buf=[{te:now-NET_D0,s}];p.last=s;p.lastT=now}}
// the level's part in it, when it is built (buildGameplay): the light the others carry, one for all of them, on the
// nearest (a light each would cost every lit surface one more), and their avatars
function netBuild(root){G.allyLight=new THREE.PointLight(0xffc890,0,8,2);root.add(G.allyLight);for(const p of NET.peers.values())p.av=null;netAvatars()}
function netAvatars(){if(!root||!G.chests)return;for(const p of NET.peers.values())if(!p.av&&p.st==='in')p.av=makeHero(root,p.col,p.name)}
function netDropAvatar(p){if(!p.av)return;if(p.av.m.parent)p.av.m.parent.remove(p.av.m);disposeTree(p.av.m);p.av=null}

// ---------- the others: their snapshots, drawn in the past ----------
// the sender's clock against ours: the smallest gap seen (a message can come late, never early), let up a little with
// each message so a slower network is followed too; a jump of a second or more is a clock started anew (the sender's
// page reloaded, another host). and how far in the past the stream must be drawn for this snapshot to have been there in
// time: how long after the one before it this one came (the time between them, and how late it was). the most of that
// over the last 3-6 s is kept; a longer wait (the connection hung a moment, the sender stopped) is not waited for later
function netStamp(o,tm){const now=performance.now();if(!num(tm))return now;const gap=now-tm,anew=o.clk===undefined||gap>o.clk+1000;
  o.clk=anew||gap<o.clk?gap:o.clk+.5;const te=tm+o.clk,need=now-o.te0;
  if(now-(o.pkT||0)>3000){o.pk0=o.pk1||0;o.pk1=0;o.pkT=now}
  if(!anew&&need<NET_DMAX)o.pk1=Math.max(o.pk1,need);o.te0=te;return te}
// how far in the past a stream (a player, the shadows) is drawn this frame: what its snapshots need and a few ms more. it
// eases there, the stream's time running up to a tenth slower or faster meanwhile
function netWait(o,dt){const pk=Math.max(o.pk0||0,o.pk1||0),want=pk?Math.min(pk+5,NET_DMAX):NET_D0;
  o.dly=o.dly===undefined?NET_D0:o.dly+clamp(want-o.dly,-dt*100,dt*100);return o.dly}
// the two snapshots around time rt and how far between them (past the last one it holds the last)
function netSpan(B,rt){let i=B.length-1;while(i>0&&B[i].te>rt)i--;const a=B[i],b=B[Math.min(i+1,B.length-1)];return [a,b,b.te>a.te?clamp((rt-a.te)/(b.te-a.te),0,1):0]}
const lerpA=(a,b,f)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*f;
function netState(m){const p=NET.peers.get(m.id);if(!p||!num(m.x)||!num(m.z)||!netHere(m))return;p.buf.push({te:netStamp(p,m.tm),s:m});if(p.buf.length>40)p.buf.shift();p.last=m;p.lastT=performance.now()}
function netFollow(p,rt,dt){const B=p.buf;while(B.length>2&&B[1].te<rt-300)B.shift();if(!B.length)return;
  const [a,b,f]=netSpan(B,rt),A=a.s,Z=b.s,x0=p.x,z0=p.z;
  p.x=lerp(A.x,Z.x,f);p.z=lerp(A.z,Z.z,f);p.y=lerp(num(A.y)?A.y:1.6,num(Z.y)?Z.y:1.6,f);p.yaw=lerpA(+A.yaw||0,+Z.yaw||0,f);p.pitch=lerp(+A.pitch||0,+Z.pitch||0,f);
  p.mv=Z.mv|0;p.lt=Z.lt|0;p.fu=num(Z.fu)?Z.fu:1;
  // (one whose connection dropped is not shown standing frozen meanwhile)
  const moved=x0===undefined?0:Math.hypot(p.x-x0,p.z-z0);p.show=p.st==='in'&&!p.off&&p.id!==NET.watch;
  if(p.av){const av=p.av,h=Math.max(dt,1e-4);av.v+=(Math.min(moved/h,8)-av.v)*Math.min(1,h*8);av.m.position.set(p.x,p.y-1.6,p.z);
    animHero(av,dt,performance.now()/1000,p);
    const d=Math.hypot(p.x-camera.position.x,p.z-camera.position.z);av.tag.material.opacity=1-sstep(9,15,d)}
  // their footsteps, as one's own: on every half stride
  if(p.st==='in'&&moved>.002){const ph=Math.floor(p.bob/Math.PI);p.bob+=dt*(p.mv===2?11:7.5);
    if(Math.floor(p.bob/Math.PI)!==ph&&Math.hypot(p.x-camera.position.x,p.z-camera.position.z)<25){sndStep(p.mv===2,p.x,p.z);if(TH.water)waterRipple(p.x,p.z,p.mv===2?1.3:1)}}}
// a player's spot, for loot flying to them: one's own eyes, or the middle of their avatar
function netPos(id){if(!NET.on||!id||id===NET.id)return null;const p=NET.peers.get(id);return p&&p.x!==undefined?{x:p.x,y:p.y-1,z:p.z}:null}
// the light the others carry: one light for them all, on the nearest who has one (the watched one's is the view's own)
function netAllyLight(t){const L=G.allyLight;if(!L)return;const E=eye();let best=null,bd=16;
  for(const p of NET.peers.values()){if(!p.av||!p.show&&p.id!==NET.watch||!p.lt||p.id===NET.watch||p.lt===1&&p.fu<=0)continue;const d=Math.hypot(p.x-E.x,p.z-E.z);if(d<bd){bd=d;best=p}}
  if(!best){L.intensity=0;return}const base=TH.hand||[0xffc890,.4,6],orb=best.lt===2,k=best.fu;
  L.color.set(orb?ORB_COL:base[0]);L.position.copy(best.av.light);
  if(orb){L.intensity=base[1]*ORB_LIGHT[0]*(1+.05*Math.sin(t*2.1))*lightNeed();L.distance=base[2]*ORB_LIGHT[1]}
  else{L.intensity=base[1]*TORCH_LIGHT[0]*(.08+.92*k)*(.93+.07*Math.sin(t*23))*lightNeed();L.distance=base[2]*TORCH_LIGHT[1]*(.35+.65*k)}}

// every frame: one's own snapshot out, the others followed, the shadows sent (by the host), the ghost's view
function netTick(dt,now){if(!netUp())return;const t=now/1000;
  for(const p of NET.peers.values())netFollow(p,now-netWait(p,dt),dt);
  // a snapshot on the frame nearest its time, so they come evenly spaced (at 60 fps every other frame, at 30 every one)
  if((NET.sendT-=dt)<=dt/2&&NET.st==='in'){NET.sendT=NET_RATE;
    netAsk({t:'s',tm:Math.round(now),x:r3(pl.x),y:r3(pl.y),z:r3(pl.z),yaw:r3(pl.yaw),pitch:r3(pl.pitch),mv:pl.mv|0,lt:game.orb?2:game.torch?1:0,fu:r2(G.fuel),sh:G.bless.shadow?1:0,wd:G.bless.ward?1:0})}
  if(NET.isHost&&G.monsters&&(NET.mobT-=dt)<=dt/2){NET.mobT=NET_RATE;netAsk({t:'mobs',tm:Math.round(now),m:G.monsters.map(mobPack)})}
  if(netGhost())netWatchView();
  netAllyLight(t);
  // caught or through while the connection was down: said again until the server has it so (the level is not over without it)
  const me=netMe();if(me&&me.st==='in'&&(NET.st==='ghost'||NET.st==='out')&&now-NET.stT>2000){NET.stT=now;netAsk({t:NET.st==='ghost'?'caught':'exit'})}
  if(now-NET.purseT>1000){NET.purseT=now;netPurseOut()}}

// ---------- the shadows: the host's snapshots ----------
// (the last three: its turn, and where a watcher's iris points across and up: what a watcher is seen to look at is what it sees)
function mobPack(mo){return [r2(mo.x),r2(mo.z),Math.max(0,MOB_MODES.indexOf(mo.mode)),mo.tid||0,r2(mo.wait||0),r2(Math.max(0,mo.stun||0)),r2(mo.notice||0),r2(mo.stare||0),r2(mo.alert||0),
  mo.target[0],mo.target[1],mo.prev?mo.prev[0]:-1,mo.prev?mo.prev[1]:-1,mo.via?1:0,r2(mo.lost||0),mo.lure?mo.lure.c[0]:-1,mo.lure?mo.lure.c[1]:-1,mo.close?1:0,r2(mo.alarmT||0),
  r3(mo.yaw||0),r3(mo.ly||0),r3(mo.lx||0)]}
function netMobsIn(m){if(NET.isHost||!Array.isArray(m.m)||!netUp()||!netHere(m))return;const B=NET.mobBuf;B.push({te:netStamp(NET,m.tm),m:m.m});if(B.length>40)B.shift()}
// where a shadow aims (the one it chases, the one a watcher stares at): one's own spot, a teammate's, or nobody
function netAim(id){if(!id)return null;if(id===NET.id)return NET.st==='in'?pl:null;const p=NET.peers.get(id);return p&&p.x!==undefined?p:null}
// not the host: the shadows go where the host's snapshots put them, a little in the past; they walk, turn, growl and
// make their sounds here as they would there, on the host's clock (a watcher blinks when it blinks there)
function netMobs(dt,t){const B=NET.mobBuf,rt=performance.now()-netWait(NET,dt);while(B.length>2&&B[1].te<rt-300)B.shift();
  for(const mo of G.monsters)if(mo.spared>0)mo.spared-=dt;
  if(!B.length){for(const mo of G.monsters)mobPresent(mo,dt,t,0,0,0);return}
  const [a,b,f]=netSpan(B,rt),last=a;if(NET.clk!==undefined)t=(rt-NET.clk)/1000;
  G.monsters.forEach((mo,k)=>{const A=a.m[k],Z=b.m[k],q=last.m[k];if(!A||!Z)return;const x0=mo.x,z0=mo.z;
    mo.x=lerp(A[0],Z[0],f);mo.z=lerp(A[1],Z[1],f);mo.net=A.length>21?[lerpA(A[19],Z[19],f),lerp(A[20],Z[20],f),lerp(A[21],Z[21],f)]:null;
    const mode=MOB_MODES[q[2]]||'patrol';if(mode==='chase'&&mo.mode!=='chase'&&!mo.watcher)mo.growl(mo.x,mo.z);
    Object.assign(mo,{mode,tid:q[3],wait:q[4],stun:q[5],notice:q[6],stare:q[7],alert:q[8]});mo.aim=netAim(mo.tid);
    const sp=Math.hypot(mo.x-x0,mo.z-z0);mo.walk+=sp;
    if(mo.stun>0){mo.m.position.set(mo.x+Math.sin(t*40)*.03,0,mo.z);return}
    mo.m.position.set(mo.x,0,mo.z);mobPresent(mo,dt,t,sp,mo.x-x0,mo.z-z0)})}
// this page becomes the host: the shadows go on from where the last snapshot had them, with what they were up to
function netTakeMobs(){const s=NET.mobBuf[NET.mobBuf.length-1];NET.mobBuf.length=0;if(!G.monsters)return;if(NET.go)G.grace=0;
  for(const mo of G.monsters){mo.net=null;mo.next=0}if(!s)return;
  G.monsters.forEach((mo,k)=>{const q=s.m[k];if(!Array.isArray(q)||q.length<22)return;Object.assign(mo,{yaw:q[19],ly:q[20],lx:q[21],sy:q[20],sx:q[21]});mo.m.rotation.y=mo.yaw;
    Object.assign(mo,{x:q[0],z:q[1],mode:MOB_MODES[q[2]]||'patrol',tid:q[3],wait:q[4],stun:q[5],notice:q[6],stare:q[7],alert:q[8],target:[q[9],q[10]],prev:q[11]>=0?[q[11],q[12]]:null,
      lost:q[14],close:q[17],alarmT:q[18],tp:null,stuckT:0});
    mo.via=q[13]&&mo.prev?mobVia(mo.prev,mo.target):null;mo.lure=q[15]>=0?{c:[q[15],q[16]],d:cellDist(W.M,W.n,q[15],q[16])}:null;mo.m.position.set(mo.x,0,mo.z)})}

// ---------- things that happen once: chests, the gate, the map ----------
// a container opened by `by`. anim: as it happens (the lid, the loot flying to them); otherwise at once, nothing flies
function netOpened(i,by,anim){const c=G.chests&&G.chests[i];if(!c||c.kind==='altar'||c.opened)return;
  if(LP.active&&LP.c===c&&by!==NET.id)stopLockpick(netName(by)+' got there first');
  c.lock=-1;c.ask=0;if(anim)return openContainer(c,by);
  c.opened=true;c.by=by;c.loot=[];
  if(c.kind==='chest')c.piv.rotation.x=-1.05;else if(c.kind==='urn'){c.piv.position.x=.12;c.piv.rotation.z=-.5}else c.g.visible=false;
  for(const l of c.loot0||[]){if(l.t==='key')G.hasKey=true;else if(l.t==='map')G.hasMap=true}}
function netGateOpened(by,anim){const g=G.gate;if(!g||g.opening)return;
  if(LP.active&&LP.c===g)stopLockpick(by===NET.id?'':netName(by)+' got the gate open');
  if(anim)return openGate(by);
  g.opening=g.open=true;g.m.position.y=g.H-.25}
// the team's map of the next maze: the first to buy it pays
function netMapNext(by){NET.mapBuy=by;if(by===NET.id){const p=WARES.find(w=>w.id==='map').price();game.gold=Math.max(0,game.gold-p);game.mapNext=true;sndCoins()}
  else toast(netName(by)+' bought the map of the next maze: it is the whole team\'s');if(game.trading)drawTrader()}
// the others' news: a coin thrown, a noise for the shadows, a lockpick snapping, a watcher's scream, a ward struck
function netFxIn(m){const ok=num(m.x)&&num(m.z);if(!netUp()||!netHere(m))return;
  if(m.k==='coin'&&ok&&num(m.y)&&num(m.vx)&&num(m.vy)&&num(m.vz))spawnCoin(m,true);
  else if(m.k==='noise'&&ok)noiseAt(m.x,m.z,clamp(+m.r||7,1,60));
  else if(m.k==='pick'&&ok){sndPickBreak(m.x,m.z);noiseAt(m.x,m.z,PICK_NOISE)}
  else if(m.k==='shriek'&&ok){sndShriek(m.x,m.z);eyeHint()}
  else if(m.k==='ward'&&NET.isHost){const mo=G.monsters[m.i];if(mo){mo.stun=6;mo.mode='patrol';mo.lost=0}}
  else if(m.k==='warded'&&num(m.who)){NET.warded.add(m.who);if(m.who===NET.id&&G.bless.ward){G.bless.ward=0;toast('A shadow reached you while you were away: your ward struck it down',5000)}}}

// ---------- in, caught, through ----------
function netCaught(){if(NET.st!=='in')return;NET.st='ghost';NET.stT=performance.now();netAsk({t:'caught'});netCaughtFx();netGhostStart()}
// a shadow caught this player while its game was out of view (the host's shadows reached it where it stood; the server said so)
function netCaughtAway(){netCaughtFx();netGhostStart(true);toast('A shadow caught you while you were away. You watch the others until the level is over',5000)}
function netCaughtFx(){if(LP.active)stopLockpick();bigMap=0;drawMap();G.blind=0;sndCaught();
  const f=$('flash');f.style.transition='none';f.style.opacity=.8;requestAnimationFrame(()=>{f.style.transition='opacity 1.2s';f.style.opacity=0})}
// the host: a teammate whose game is out of view (another tab, a window put away) or silent a while is away. it stands where it
// was last seen and the shadows can catch it there: a shadow on it is told to the server (which takes it of one away only); a
// ward it holds strikes the first shadow down instead, as it would there (its own game hears so)
function netAway(T){if(game.peaceful)return;const now=performance.now();
  for(const q of T){if(!q.away)continue;
    for(const mo of G.monsters){if(mo.watcher||mo.stun>0||Math.hypot(q.x-mo.x,q.z-mo.z)>=.7)continue;
      if(q.wd&&!NET.warded.has(q.id)){NET.warded.add(q.id);mo.stun=6;mo.mode='patrol';mo.lost=0;netFx({k:'warded',who:q.id});continue}
      if(now-(NET.catchT.get(q.id)||-1e9)>2000){NET.catchT.set(q.id,now);netAsk({t:'catch',who:q.id})}break}}}
// the level is done while this player is caught (was: what it was till then): off to the trader with the others
function netGhostOut(was){NET.st='out';NET.watch=0;if(LP.active)stopLockpick();netHud();
  if(netUp()&&!game.trading)openTrader(was==='in'?`Level ${game.level} is over: everyone is at the trader`:`Level ${game.level}: the shadows caught you, the others got through`)}
function netExit(sum){if(NET.st!=='in')return;NET.st='out';NET.stT=performance.now();netAsk({t:'exit'});netHud();openTrader(sum)}
function netReady(){const me=netMe();netAsk({t:'ready',on:!(me&&me.ready)})}
function netGhostStart(quiet){NET.watch=0;netWatchNext(1);netHud();
  if(!quiet)toast(NET.watch?'The shadow caught you. You watch the others until the level is over':'The shadow caught you',4000)}
const netWatchOk=id=>{const p=NET.peers.get(id);return !!p&&p.st==='in'&&!p.off};
function netWatchNext(d){const L=[...NET.peers.values()].filter(p=>netWatchOk(p.id)).sort((a,b)=>a.id-b.id),i=L.findIndex(p=>p.id===NET.watch);
  NET.watch=L.length?L[((i<0?0:i+d)%L.length+L.length)%L.length].id:0;netHud()}
// a ghost's view: the watched teammate's eyes
function netWatchView(){const p=netWatched();if(!p||p.x===undefined)return;camera.position.set(p.x,p.y,p.z);camera.rotation.set(p.pitch,p.yaw,0,'YXZ')}
// their light, as they see it (the torch in view, Candlelight at the shoulder)
function netLightView(){const p=netWatched();return p&&p.x!==undefined?{torch:p.lt===1,orb:p.lt===2,fuel:p.fu,flare:0,yaw:p.yaw,pitch:p.pitch,bob:0,own:false}:null}

// ---------- the purse, kept by the server for a page that comes back ----------
function netPurseOut(force){const p={gold:game.gold,gems:game.gems,picks:game.picks,torch:game.torch,orb:game.orb,entry:game.entry,caught:game.caught,
    hints:[game.coinHint|0,game.mapHint|0,game.darkHint|0],key:NET.levelKey,bless:G.bless,fuel:r2(G.fuel||0)},s=JSON.stringify(p);
  if((s!==NET.purseSig||force)&&netSend({t:'purse',p}))NET.purseSig=s}
function netPurseIn(p){const n=(v,d)=>num(v)&&v>=0?v:d,gems=a=>Array.isArray(a)?a.filter(g=>g&&GEMS.some(x=>x.key===g.key)):[];
  Object.assign(game,{gold:n(p.gold,0),picks:n(p.picks,5),gems:gems(p.gems),torch:!!p.torch,orb:!!p.orb,caught:n(p.caught,0)});
  if(p.entry&&typeof p.entry==='object')game.entry={gold:n(p.entry.gold,0),gems:gems(p.entry.gems),picks:n(p.entry.picks,5),mapNext:!!p.entry.mapNext};
  if(Array.isArray(p.hints))[game.coinHint,game.mapHint,game.darkHint]=p.hints.map(v=>v|0);
  NET.restored=true;NET.restLv={key:p.key,bless:p.bless&&typeof p.bless==='object'?p.bless:null,fuel:p.fuel}}

// ---------- on screen: the team, the ghost's line ----------
const NET_ST={in:'in the maze',ghost:'caught',out:'through',lobby:''},netSt=p=>p.off?'no connection':p.hidden&&p.st==='in'?'away':NET_ST[p.st]||'';
function netHud(){const el=$('team'),on=NET.on&&NET.play;domSet(el,'display',on?'block':'none');
  domSet($('pause').querySelector('small'),'text',on?'Esc: menu · the game does not wait':'Esc: menu');
  domSet($('ghost'),'display',netGhost()?'block':'none');if(!on)return;
  el.innerHTML=NET.players.map(p=>`<div class="${p.st}${p.id===NET.id?' me':''}"><i style="background:${HERO_COLS[p.col%HERO_COLS.length][1]}"></i>${esc(p.name)}<small>${netSt(p)}</small></div>`).join('');
  const w=NET.peers.get(NET.watch);$('ghost').innerHTML=w?`Caught · you watch <b>${esc(w.name)}</b> · <kbd>Space</kbd> next`:'Caught · nobody else is left in the maze'}
// the team at the trader: who is where, who is ready
function netTeam(){return NET.players.map(p=>`<span class="tm${p.ready?' rd':''}"><i style="background:${HERO_COLS[p.col%HERO_COLS.length][1]}"></i>${esc(p.name)}<small>${p.off?'no connection':p.ready?'ready':netSt(p)}</small></span>`).join('')}

// the join screen: the address of the server this page came from, or the last one used
function netInitUI(){const served=/^https?:$/.test(location.protocol)&&location.host;
  $('netName').value=S.netName||'';$('netAddr').value=served?location.host:S.netAddr||'localhost:'+NET_PORT;
  $('btnNet').onclick=()=>{netMsg('');showMenu('net');setTimeout(()=>$('netName').focus(),0)};
  $('btnJoin').onclick=netJoin;for(const id of ['netName','netAddr'])$(id).addEventListener('keydown',e=>{if(e.code==='Enter')netJoin();e.stopPropagation()});
  $('btnLeave').onclick=()=>netQuit();
  // ending the run takes a second click, it sends everyone back to the lobby
  let sure=0;$('btnLobby').onclick=()=>{if(performance.now()-sure>3000){sure=performance.now();$('btnLobby').textContent='Click again to end the run';return}sure=0;netSend({t:'lobby'})};
  // a page served by the co-op server: playing together comes first
  if(served){const n=$('btnNet'),p=$('btnPlay');n.classList.remove('alt');p.classList.add('alt');p.parentNode.insertBefore(n,p)}
  document.addEventListener('visibilitychange',()=>{if(NET.on)netSend({t:'vis',hidden:document.hidden})})}
