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
  const browser=await launch(['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--disable-features=WebRtcHideLocalIpsWithMdns']);
  try{
    // ---------- the server hands out the game ----------
    const [js,idx,up,nope]=await Promise.all([get(url+'/js/06-game.js'),get(url+'/'),get(url+'/../server/Cargo.toml'),get(url+'/nope.js')]);
    check('the server hands out the game, nothing outside it',js.status===200&&/javascript/.test(js.type)&&/function loop/.test(js.body)&&idx.status===200&&/DUNGEON/.test(idx.body)&&up.status===404&&nope.status===404,[js.status,js.type,idx.status,up.status,nope.status]);
    const P=[];const mk=async()=>{const p=await open(browser,800,450,null,url+'/');P.push(p);return p};
    const ev=(p,f,a)=>p.page.evaluate(f,a);
    const join=async(p,name)=>{await p.page.locator('#btnNet').click();await p.page.locator('#netName').fill(name);await p.page.locator('#btnJoin').click();
      for(let i=0;i<100&&!(await ev(p,()=>NET.on));i++)await sleep(50)};
    const until=async(p,f,ms=8000,a)=>{const end=Date.now()+ms;while(Date.now()<end){if(await ev(p,f,a))return true;await sleep(60)}return false};
    const FP=()=>{const h=a=>{let x=2166136261>>>0;for(let i=0;i<a.length;i++){x^=a[i]&255;x=Math.imul(x,16777619)>>>0}return x};
      return JSON.stringify({occ:h(W.occ.occ),chests:G.chests.map(c=>c.kind+Math.round(c.x*100)+JSON.stringify(c.loot0)).join(';').length,mobs:G.monsters.map(m=>m.kind+m.cell).join(' '),theme:game.theme,level:game.level})};
    // ---------- joining: the leader and the others ----------
    const A=await mk(),B=await mk();
    check('the page served by the server fills in its address',(await ev(A,()=>document.getElementById('netAddr').value))===url.replace('http://',''));
    await join(A,'Ann');await join(B,'Bob');
    check('both join; the first leads',await ev(A,()=>netLeader()&&NET.players.length===2)&&await ev(B,()=>!netLeader()&&NET.players.length===2));
    if(process.argv.includes('--proximity-only')){
      const C=await mk();await join(C,'Cid');
      check('three clients receive microphones and voice streams',await until(A,()=>!!VOICE.stream&&VOICE.peers.size===2&&[...VOICE.peers.values()].every(p=>!!p.audio))&&await until(B,()=>!!VOICE.stream&&VOICE.peers.size===2&&[...VOICE.peers.values()].every(p=>!!p.audio))&&await until(C,()=>!!VOICE.stream&&VOICE.peers.size===2&&[...VOICE.peers.values()].every(p=>!!p.audio)));
      const direct=await ev(B,()=>[...VOICE.peers.values()].every(p=>p.pc?.connectionState==='connected'&&p.audio?.el));
      console.log('INFO initial transport '+JSON.stringify(await ev(B,()=>[...VOICE.peers.values()].map(p=>({id:p.id,relay:p.relay,state:p.pc?.connectionState})))));
      const ids=await Promise.all([A,B,C].map(p=>ev(p,()=>NET.id))),[aid,bid,cid]=ids;
      const place=async(p,x)=>ev(p,x=>{pl.x=x;pl.z=3;pl.y=floorH(x,3)+1.6},x);
      const volume=(p,id)=>ev(p,id=>{const a=VOICE.peers.get(id)?.audio;return a?.gain?a.gain.gain.value:a?.el?.volume/S.vol},id);
      const heard=async(p,id,expected)=>until(p,([id,expected])=>{const a=VOICE.peers.get(id)?.audio,v=a?.gain?a.gain.gain.value:a?.el?.volume/S.vol;return Math.abs(v-expected)<.02},5000,[id,expected]);
      await ev(A,()=>{document.querySelector('.mapc[data-t="dungeon"]').click();document.querySelector('#sizes [data-n="8"]').click()});
      await Promise.all([A,B,C].map(p=>ev(p,()=>{game.peaceful=true})));
      await ev(A,()=>document.getElementById('btnStart').click());
      check('three clients enter the same live level',await until(A,()=>netUp()&&NET.go,30000)&&await until(B,()=>netUp()&&NET.go,30000)&&await until(C,()=>netUp()&&NET.go,30000));
      await Promise.all([A,B,C].map(p=>ev(p,()=>{game.peaceful=true})));
      // Coordinates are set on the sending clients; the real server forwards their snapshots.
      await place(A,3);await place(B,5);await place(C,27);
      check('initial transport: nearby voices audible, distant voices silent',await heard(B,aid,1)&&await heard(B,cid,0),[await volume(B,aid),await volume(B,cid)]);
      await place(A,11);
      check('initial transport: moving away fades a live voice',await until(B,id=>{const a=VOICE.peers.get(id)?.audio,v=a?.gain?a.gain.gain.value:a?.el?.volume/S.vol;return v>.5&&v<.9},5000,aid));
      await place(A,27);check('initial transport: moving out of range silences the voice',await heard(B,aid,0));
      if(!direct)console.log('SKIP direct WebRTC: initial connections fell back to relay in this environment');
      await place(A,3);
      await ev(B,()=>{for(const p of VOICE.peers.values())voiceRelay(p)});
      check('relay: real microphone audio arrives from both peers',await until(B,()=>[...VOICE.peers.values()].every(p=>p.relay&&p.relayBytes>0&&p.audio?.gain)));
      check('relay: proximity applies to actual playback gains',await heard(B,aid,1)&&await heard(B,cid,0));
      // Tap the graph after the playback gain to check rendered sound, including silence.
      await ev(B,()=>{window.__meters=new Map();for(const p of VOICE.peers.values()){const meter=Snd.ctx.createAnalyser();meter.fftSize=1024;(p.audio.pan||p.audio.gain).disconnect(Snd.out);(p.audio.pan||p.audio.gain).connect(meter);meter.connect(Snd.out);__meters.set(p.id,meter)}
        window.__rms=id=>{const meter=__meters.get(id),data=new Float32Array(meter.fftSize);meter.getFloatTimeDomainData(data);return Math.sqrt(data.reduce((n,v)=>n+v*v,0)/data.length)}});
      check('relay: nearby microphone produces sound after the gain',await until(B,id=>__rms(id)>.001,5000,aid));
      check('relay: distant microphone renders silence after the gain',await until(B,id=>__rms(id)<.00001,5000,cid));
      await place(A,27);check('relay: walking away silences already queued audio',await heard(B,aid,0)&&await until(B,id=>__rms(id)<.00001,5000,aid),await ev(B,id=>({volume:VOICE.peers.get(id).audio.gain.gain.value,rms:__rms(id),context:Snd.ctx.state,local:[pl.x,pl.z],remote:[NET.peers.get(id).x,NET.peers.get(id).z]}),aid));
      await place(A,3);await place(C,9);await ev(B,()=>netCaught());
      check('death starts observing a live teammate',await until(B,id=>NET.st==='ghost'&&NET.watch===id,5000,aid));
      check('observer hears watched player at full volume and their neighbour with fading',await heard(B,aid,1)&&await until(B,id=>{const v=VOICE.peers.get(id)?.audio?.gain?.gain.value;return v>.5&&v<.9},5000,cid));
      check('living clients cannot hear the observer',await heard(A,bid,0)&&await heard(C,bid,0));
      await place(C,27);check('observer cannot hear a distant teammate',await heard(B,cid,0));
      await ev(B,()=>netWatchNext(1));
      check('switching observation moves hearing to the new player immediately',await heard(B,cid,1)&&await heard(B,aid,0)&&await ev(B,cid=>NET.watch===cid,cid));
      await ev(B,id=>{ROSTER.voice.add(id);voiceVolume()},cid);
      check('personal mute overrides watched-player hearing',await heard(B,cid,0));
      check('proximity pages have no JavaScript errors',P.every(p=>p.errs.length===0),P.map(p=>p.errs));
      if(fail)process.exitCode=1;return;
    }
    if(process.argv.includes('--maps-only')){
      await Promise.all([A,B].map(p=>ev(p,()=>{S.voice=false;voiceStop();game.peaceful=true})));
      check('followers cannot change rotation, map or size using mouse or keyboard',await ev(B,()=>[...document.querySelectorAll('#scr-play .world,#maps .mapc,#sizes button')].every(b=>b.disabled)));
      for(const theme of ['autumn','swamp','desert','tomb']){
        await A.page.bringToFront();check(theme+': host can select the imported map',await until(A,()=>netLeader()));
        await ev(A,k=>{document.querySelector(`.mapc[data-t="${k}"]`).click();document.querySelector('#sizes [data-n="8"]').click()},theme);
        check(theme+': map selection reaches the teammate',await until(B,k=>PICK.get().k===k,8000,theme));
        await ev(A,()=>netSend({t:'start'}));
        check(theme+': both clients load the server-selected theme',await until(A,k=>netUp()&&game.theme===k,12000,theme)&&await until(B,k=>netUp()&&game.theme===k,12000,theme));
        check(theme+': maze, loot and monsters match for both players',(await ev(A,FP))===(await ev(B,FP)));
        await ev(A,()=>netSend({t:'lobby'}));check(theme+': returns to the lobby',await until(A,()=>!NET.play)&&await until(B,()=>!NET.play));
      }
      check('new map sessions have no JavaScript errors',P.every(p=>p.errs.length===0),P.map(p=>p.errs));if(fail)process.exitCode=1;return;
    }
    if(process.argv.includes('--roster-only')){
      const aid=await ev(A,()=>NET.id),bid=await ev(B,()=>NET.id);
      check('server ping reaches every player',await until(A,()=>NET.players.every(p=>Number.isFinite(p.ping)))&&await until(B,()=>NET.players.every(p=>Number.isFinite(p.ping))));
      await A.page.locator('#lobbyNote').click();await A.page.keyboard.down('Tab');
      check('Tab opens the list with Admin and ping',await ev(A,()=>ROSTER.on&&document.querySelectorAll('.roster-player').length===2&&NET.admin===NET.id&&[...document.querySelectorAll('.roster-ping')].every(p=>/\d+ ms/.test(p.textContent))));
      check('the player list is a compact translucent table',await ev(A,()=>{const panel=document.querySelector('.roster-panel'),color=getComputedStyle(panel).backgroundColor;return !!document.querySelector('table #rosterList')&&document.querySelectorAll('.roster-table th').length===5&&panel.getBoundingClientRect().width<=600&&color.startsWith('rgba(')&&getComputedStyle(document.getElementById('roster')).backgroundColor==='rgba(0, 0, 0, 0)'}));
      await A.page.keyboard.down('Tab');check('repeated Tab keydown keeps the table open',await ev(A,()=>ROSTER.on));
      await A.page.keyboard.up('Tab');check('releasing Tab closes the table',await ev(A,()=>!ROSTER.on));
      await A.page.keyboard.down('Tab');await ev(A,()=>window.dispatchEvent(new Event('blur')));check('losing focus closes the held table',await ev(A,()=>!ROSTER.on));
      await A.page.keyboard.up('Tab');await A.page.keyboard.down('Tab');
      check('colors and Admin are shown in their own columns',await ev(A,()=>[...document.querySelectorAll('#rosterList tr')].every(row=>{const p=NET.players.find(p=>p.id===+row.dataset.player);return row.children.length===5&&row.children[1].textContent===HERO_COLS[p.col%HERO_COLS.length][0]&&row.children[2].textContent===(p.id===NET.admin?'Admin':'')&&!row.children[0].textContent.includes('Admin')})));
      const row=A.page.locator(`[data-player="${bid}"]`);await row.hover();
      check('hover reveals separate voice/chat mute and kick',await row.locator('[data-action="voice"]').isVisible()&&await row.locator('[data-action="chat"]').isVisible()&&await row.locator('[data-action="kick"]').isVisible()&&await row.locator('.roster-actions').evaluate(e=>getComputedStyle(e).opacity==='1'));
      await A.page.screenshot({path:'/tmp/labyrinth-roster.png'});
      check('voice auto-started before personal mute',await until(A,()=>VOICE.on&&!!VOICE.stream&&VOICE.peers.size===1)&&await until(B,()=>VOICE.on&&!!VOICE.stream&&VOICE.peers.size===1));
      await ev(A,()=>voiceRelay(VOICE.peers.values().next().value));
      check('voice audio arrives before personal mute',await until(A,()=>[...VOICE.peers.values()][0].relayBytes>0));
      await row.locator('[data-action="voice"]').click();
      check('voice mute is local and stops incoming audio',await ev(A,id=>{const p=VOICE.peers.get(id);window.__beforeMute=p.relayBytes;const n=voiceNodes(VOICE.stream,true,id),silent=n.el.volume===0&&n.gain.gain.value===0;voiceFreeNodes(n);return ROSTER.voice.has(id)&&voiceState(id)[0]==='muted'&&silent},bid)&&await ev(B,()=>!VOICE.muted&&VOICE.stream.getTracks().every(t=>t.enabled)));
      await sleep(400);check('muted relay audio is discarded',await ev(A,id=>VOICE.peers.get(id).relayBytes===window.__beforeMute,bid));
      await ev(B,()=>netSend({t:'chat',tx:'before mute'}));check('chat arrives before personal mute',await until(A,()=>CHAT.lines.some(l=>l.tx==='before mute')));
      await row.locator('[data-action="chat"]').click();await ev(B,()=>netSend({t:'chat',tx:'hidden by mute'}));await sleep(250);
      check('chat mute hides history and new messages independently',await ev(A,id=>ROSTER.chat.has(id)&&ROSTER.voice.has(id)&&!document.getElementById('chatLog').textContent.includes('before mute')&&!CHAT.lines.some(l=>l.tx==='hidden by mute'),bid));
      await row.locator('[data-action="voice"]').click();check('unmute restores voice without negotiation',await until(A,()=>[...VOICE.peers.values()][0].relayBytes>window.__beforeMute));
      await row.locator('[data-action="chat"]').click();await ev(B,()=>netSend({t:'chat',tx:'after unmute'}));check('unmute restores chat',await until(A,()=>CHAT.lines.some(l=>l.tx==='after unmute')));
      await ev(A,()=>netSend({t:'vis',hidden:true}));check('Admin does not transfer when a tab is hidden',await until(B,()=>NET.leader===NET.id&&NET.admin!==NET.id));
      await ev(B,id=>netSend({t:'kick',id,admin:true}),aid);await sleep(200);check('a non-admin cannot forge kick authority',await ev(A,()=>NET.on)&&await ev(B,()=>NET.players.length===2));
      await ev(A,()=>netSend({t:'vis',hidden:false}));
      await B.page.locator('#lobbyNote').click();await B.page.keyboard.down('Tab');check('other players do not get Kick buttons',await ev(B,()=>ROSTER.on&&!document.querySelector('#rosterList [data-action="kick"]')));
      await B.page.keyboard.up('Tab');check('releasing Tab closes the other player roster',await ev(B,()=>!ROSTER.on));
      await A.page.keyboard.up('Tab');await A.page.locator('#sizes [data-n="8"]').click();await A.page.locator('#btnStart').click();
      check('the roster works during a real run',await until(A,()=>netUp())&&await until(B,()=>netUp()));
      await Promise.all([A,B].map(p=>ev(p,()=>{game.peaceful=true})));
      await A.page.bringToFront();await A.page.locator('#c').click();
      if(!await until(A,()=>locked,1000)){
        console.log('SKIP native pointer lock: unavailable in this headless browser; checking the same lifecycle with simulated pointer-lock events');
        await ev(A,()=>{window.__nativeExit=document.exitPointerLock;window.__nativeRequest=canvas.requestPointerLock;window.__pointer=canvas;
          Object.defineProperty(document,'pointerLockElement',{configurable:true,get:()=>window.__pointer});
          document.exitPointerLock=()=>{window.__pointer=null;document.dispatchEvent(new Event('pointerlockchange'))};
          canvas.requestPointerLock=()=>{window.__pointer=canvas;document.dispatchEvent(new Event('pointerlockchange'));return Promise.resolve()};
          document.dispatchEvent(new Event('pointerlockchange'))});
      }
      check('pointer-lock lifecycle starts captured',await ev(A,()=>locked));
      await ev(A,()=>{const a=warp(.5,.5),b=W.M.open(0,0,1,0)?warp(1.5,.5):warp(.5,1.5);pl.x=a[0];pl.z=a[1];pl.yaw=Math.atan2(a[0]-b[0],a[1]-b[1]);window.__rosterStart=[pl.x,pl.z,pl.bob]});
      await A.page.keyboard.down('w');await A.page.keyboard.down('Tab');
      check('Tab preserves held movement keys and pointer capture',await ev(A,()=>ROSTER.on&&locked&&keys.KeyW&&document.getElementById('ui').style.display==='none'));
      check('the player keeps moving with the table open',await until(A,()=>ROSTER.on&&running&&Math.hypot(pl.x-window.__rosterStart[0],pl.z-window.__rosterStart[1])>.05));
      await A.page.keyboard.down('d');check('new movement keys work with the table open',await ev(A,()=>keys.KeyD));await A.page.keyboard.up('d');
      check('mouse look continues with the table open',await ev(A,()=>{const before=pl.yaw,e=new MouseEvent('mousemove');Object.defineProperties(e,{movementX:{value:12},movementY:{value:3}});document.dispatchEvent(e);return pl.yaw!==before}));
      await A.page.keyboard.up('w');await A.page.keyboard.press('n');check('gameplay hotkeys still work with the table open',await ev(A,()=>VOICE.muted));await A.page.keyboard.press('n');
      check('the table has no close button or explanatory labels',await ev(A,()=>!document.getElementById('rosterClose')&&!document.querySelector('#roster p, #roster header')&&document.getElementById('roster').getAttribute('role')==='region'));
      await A.page.keyboard.press('c');
      check('C releases the cursor for trackpad selection',await until(A,()=>ROSTER.on&&ROSTER.cursor&&!locked&&document.getElementById('ui').style.display==='none'));
      await A.page.keyboard.down('w');check('movement continues while using table controls',await until(A,()=>running&&keys.KeyW));await A.page.keyboard.up('w');
      await row.hover();await A.page.screenshot({path:'/tmp/labyrinth-roster-game.png'});
      await A.page.keyboard.press('c');check('C restores camera control while Tab stays held',await until(A,()=>ROSTER.on&&locked&&!ROSTER.cursor));
      await A.page.keyboard.up('Tab');check('releasing Tab closes the table and restores pointer capture',await until(A,()=>!ROSTER.on&&locked&&document.getElementById('ui').style.display==='none'));
      await A.page.keyboard.down('Tab');await A.page.keyboard.press('c');
      await row.hover();await row.locator('[data-action="kick"]').click();check('kick requires a second deliberate click',await ev(B,()=>NET.on)&&await row.locator('[data-action="kick"]').textContent()==='Confirm kick');
      await row.locator('[data-action="kick"]').click();check('Admin kick removes the target and stops auto-reconnect',await until(B,()=>!NET.on&&NET.leaving&&!VOICE.on)&&await until(A,()=>NET.players.length===1));
      await B.page.locator('#btnJoin').click();check('kicked session cannot rejoin for 10 minutes',await until(B,()=>!NET.on&&document.getElementById('netMsg').textContent.includes('10-minute')));
      await A.page.keyboard.up('Tab');
      await ev(A,()=>{if(window.__nativeExit){document.exitPointerLock=window.__nativeExit;canvas.requestPointerLock=window.__nativeRequest;delete document.pointerLockElement}});
      check('roster pages have no JavaScript errors',P.every(p=>p.errs.length===0),P.map(p=>p.errs));if(fail)process.exitCode=1;return;
    }
    // ---------- voice: real microphone capture and peer-to-peer audio (Chromium's fake microphone) ----------
    const iceProbe=await ev(A,async()=>{const a=new RTCPeerConnection(),b=new RTCPeerConnection();a.onicecandidate=e=>e.candidate&&b.addIceCandidate(e.candidate).catch(()=>{});b.onicecandidate=e=>e.candidate&&a.addIceCandidate(e.candidate).catch(()=>{});
      const d=a.createDataChannel('probe'),linked=new Promise(r=>{d.onopen=()=>r(true);setTimeout(()=>r(false),3000)});await a.setLocalDescription(await a.createOffer());await b.setRemoteDescription(a.localDescription);await b.setLocalDescription(await b.createAnswer());await a.setRemoteDescription(b.localDescription);
      const ok=await linked;a.close();b.close();return ok});
    check('voice starts automatically on join',await until(A,()=>VOICE.on&&!!VOICE.stream)&&await until(B,()=>VOICE.on&&!!VOICE.stream));
    check('voice controls exist only in Settings',await ev(A,()=>!document.getElementById('btnVoice')&&!document.getElementById('btnVoiceLobby')&&!document.getElementById('voiceHud')&&S.voice));
    check('voice chat starts the microphone for both players',await ev(A,()=>VOICE.on&&!!VOICE.stream&&VOICE.stream.getAudioTracks().length===1)&&await ev(B,()=>VOICE.on&&!!VOICE.stream&&VOICE.stream.getAudioTracks().length===1));
    await Promise.all([A,B].map(p=>ev(p,()=>{window.__voiceBytes=async()=>{const R=[];for(const q of VOICE.peers.values()){let bytes=0;const stats=await q.pc.getStats();stats.forEach(s=>{if(s.type==='inbound-rtp'&&s.kind==='audio')bytes+=s.bytesReceived||0});R.push({state:q.pc.connectionState,bytes,audio:!!q.audio})}return R};
      window.__voiceSignaled=()=>{const p=VOICE.peers.values().next().value;return !!(p&&p.pc?.signalingState==='stable'&&p.pc.localDescription&&p.pc.remoteDescription)};
      window.__voiceReady=()=>{const p=VOICE.peers.values().next().value;return p&&p.pc?.signalingState==='stable'&&!!p.audio}})));
    check('WebRTC negotiates after automatic voice startup',await until(A,()=>__voiceSignaled())&&await until(B,()=>__voiceSignaled()));
    if(iceProbe){
      check('WebRTC negotiates remote audio streams in both directions',await until(A,()=>__voiceReady())&&await until(B,()=>__voiceReady()));
      const voiceLinked=await until(A,async()=>{const r=await __voiceBytes();return r.length===1&&r[0].state==='connected'&&r[0].bytes>0&&r[0].audio},4000)&&await until(B,async()=>{const r=await __voiceBytes();return r.length===1&&r[0].state==='connected'&&r[0].bytes>0&&r[0].audio},4000);
      check('WebRTC carries audio packets in both directions',voiceLinked);
    }else console.log('SKIP WebRTC signaling and audio transport: a minimal WebRTC ICE connection is unavailable in this environment');
    await A.page.locator('#lobbyNote').click();await A.page.keyboard.press('n');
    check('mute in the lobby updates the teammate icon',await until(B,()=>voiceState([...NET.peers.keys()][0])[0]==='muted'));
    check('mute disables the microphone track without dropping voice',await ev(A,()=>VOICE.on&&VOICE.muted&&VOICE.stream.getAudioTracks().every(t=>!t.enabled))&&await ev(B,()=>VOICE.on&&!VOICE.muted));
    await ev(A,()=>voiceMute());await ev(B,()=>voiceStop());
    check('stopping voice releases the microphone and closes the remote peer',await ev(B,()=>!VOICE.on&&!VOICE.stream&&VOICE.peers.size===0)&&await until(A,()=>VOICE.peers.size===0));
    await ev(B,()=>voiceEnable());
    check('voice can be enabled again',iceProbe?await until(A,()=>__voiceReady())&&await until(B,()=>__voiceReady()):await until(B,()=>VOICE.on&&!!VOICE.stream));
    await ev(A,()=>voiceRelay(VOICE.peers.values().next().value));
    check('server relay carries audible microphone audio in both directions when P2P is unavailable',await until(A,()=>{const p=VOICE.peers.values().next().value;return p&&p.relay&&p.relayBytes>0&&p.audio&&p.audio.level>0&&VOICE.capture})&&await until(B,()=>{const p=VOICE.peers.values().next().value;return p&&p.relay&&p.relayBytes>0&&p.audio&&p.audio.level>0&&VOICE.capture}));
    check('updated clients negotiate Opus where supported and retain PCM compatibility',await until(A,()=>{const p=VOICE.peers.values().next().value;return p&&VOICE.capture?.processor&&(VOICE.opus&&VOICE.states.get(p.id)?.opus?!!p.audio?.decoder:[...p.audio.sources].some(s=>s.buffer.sampleRate===24000))})&&await until(B,()=>{const p=VOICE.peers.values().next().value;return p&&VOICE.capture?.processor&&(VOICE.opus&&VOICE.states.get(p.id)?.opus?!!p.audio?.decoder:[...p.audio.sources].some(s=>s.buffer.sampleRate===24000))}));
    check('server relay uses AudioWorklet capture on supported browsers',await ev(A,()=>!Snd.ctx.audioWorklet||!!VOICE.capture.processor.port)&&await ev(B,()=>!Snd.ctx.audioWorklet||!!VOICE.capture.processor.port));
    await ev(B,()=>{VOICE.opus=false;voiceAnnounce()});
    check('a peer without Opus falls back to audible 24 kHz PCM in both directions',await until(A,()=>{const p=VOICE.peers.values().next().value;return !VOICE.states.get(p.id)?.opus&&!p.audio.decoder&&[...p.audio.sources].some(s=>s.buffer.sampleRate===24000)})&&await until(B,()=>{const p=VOICE.peers.values().next().value;return !p.audio.decoder&&[...p.audio.sources].some(s=>s.buffer.sampleRate===24000)}));
    check('relay updates player icons without a voice HUD',await ev(A,()=>{const id=[...NET.peers.keys()][0];return ['connected','speaking'].includes(voiceState(id)[0])&&!document.getElementById('voiceHud')}));
    const playback=await ev(A,()=>{const n=voiceNodes(VOICE.stream,true,[...NET.peers.keys()][0]),ok=n.el&&n.el.autoplay&&n.el.srcObject===VOICE.stream&&n.el.volume===0&&!!n.gain&&!!n.pan;voiceFreeNodes(n);return !!ok});
    check('remote voice uses one spatial Web Audio output and a silent media unlock element',playback);
    const activity=await ev(A,()=>{const events=[],listen=e=>events.push(e.detail.isSpeaking);document.addEventListener('voiceactivity',listen);const n={analyser:{getByteTimeDomainData:d=>d.fill(200)},data:new Uint8Array(512),speaking:false,lastLoud:0};
      voiceMeasure(NET.id,n);const loud=n.speaking;n.analyser.getByteTimeDomainData=d=>d.fill(128);n.lastLoud=performance.now()-400;voiceMeasure(NET.id,n);document.removeEventListener('voiceactivity',listen);return {loud,quiet:!n.speaking,events:events.join()}});
    check('the sound threshold emits isSpeaking without animating the avatar',activity.loud&&activity.quiet&&activity.events==='true,false',activity);
    await ev(B,()=>{document.getElementById('voice').checked=false;voiceToggle()});
    check('Settings disables voice and saves the preference',await ev(B,()=>!VOICE.on&&!S.voice&&!JSON.parse(localStorage.getItem('labyrinth2')).voice)&&await until(A,()=>VOICE.peers.size===0));
    await ev(B,()=>{window.__gum=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=()=>Promise.reject(new DOMException('Denied','NotAllowedError'));document.getElementById('voice').checked=true;voiceToggle()});
    check('microphone denial preserves automatic listening',await until(B,()=>VOICE.on&&!VOICE.busy&&!VOICE.stream&&!!VOICE.error)&&await until(A,()=>VOICE.peers.size===1));
    await ev(A,()=>voiceRelay(VOICE.peers.values().next().value));
    check('a player denied microphone receives teammates through relay',await until(B,()=>{const p=VOICE.peers.values().next().value;return p&&p.relayBytes>0&&p.audio&&p.audio.level>0}));
    check('listening-only status reaches teammates',await until(A,()=>voiceState([...NET.peers.keys()][0])[0]==='listen'));
    await ev(B,()=>{navigator.mediaDevices.getUserMedia=window.__gum;voiceMute()});
    check('microphone can be retried without losing listening',await until(B,()=>VOICE.on&&!!VOICE.stream));
    await ev(A,()=>{NET.play=true;netHud()});
    check('every player row has a labelled voice icon',await ev(A,()=>document.querySelectorAll('#team .voice-icon[aria-label]').length===NET.players.length));
    await A.page.screenshot({path:'/tmp/labyrinth-voice-roster.png'});
    await ev(A,()=>{NET.play=false;netHud()});
    await ev(B,()=>{NET.ws.close()});
    check('voice reconnects automatically with the existing microphone',await until(B,()=>!NET.cut&&NET.ws&&NET.ws.readyState===1&&VOICE.on&&!!VOICE.stream&&VOICE.ready.size===1));
    await ev(B,()=>{VOICE.stream.getAudioTracks()[0].dispatchEvent(new Event('ended'))});
    check('microphone disconnection keeps receiving active',await ev(B,()=>VOICE.on&&!VOICE.stream&&!!VOICE.error));
    await ev(B,()=>{window.__late=null;navigator.mediaDevices.getUserMedia=()=>new Promise(r=>window.__late=r);voiceMicrophone();document.getElementById('voice').checked=false;voiceToggle()});
    await ev(B,async()=>{const stream=await window.__gum({audio:true});window.__late(stream);await new Promise(r=>setTimeout(r,50));window.__lateStopped=stream.getTracks().every(t=>t.readyState==='ended')});
    check('disabling while microphone permission is pending releases late tracks',await ev(B,()=>!VOICE.on&&!VOICE.busy&&!VOICE.stream&&window.__lateStopped));
    await ev(B,()=>{navigator.mediaDevices.getUserMedia=window.__gum});
    await Promise.all([A,B].map(p=>ev(p,()=>{document.getElementById('voice').checked=false;voiceToggle()})));
    await ev(B,()=>NET.ws.close());
    check('reconnecting respects disabled voice preference',await until(B,()=>NET.on&&!NET.cut&&NET.ws&&NET.ws.readyState===1&&!VOICE.on));
    await B.page.reload();
    check('voice preference survives page reload',await ev(B,()=>S.voice===false&&!document.getElementById('voice').checked));
    await join(B,'Bob');
    check('joining again respects disabled voice preference',await ev(B,()=>!VOICE.on&&!VOICE.stream));
    if(process.argv.includes('--voice-only')){check('voice pages have no JavaScript errors',P.every(p=>p.errs.length===0),P.map(p=>p.errs));if(fail)process.exitCode=1;return}

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
    // The first page to finish loading may host; it keeps that role while available.
    const hosts=await Promise.all([A,B].map(p=>ev(p,()=>NET.isHost)));
    check('one host moves the shadows, the other follows',hosts.filter(Boolean).length===1&&gap<1.2,{hosts,gap:+gap.toFixed(2)});
    // ---------- two players at one chest at the same moment: one gets it ----------
    const ci=await ev(A,()=>G.chests.findIndex(c=>c.kind==='chest'&&c.lock<0&&!c.isKey&&c.loot.some(l=>l.t==='gold')&&!c.loot.some(l=>l.t==='map')));
    const g0=await Promise.all([A,B].map(p=>ev(p,()=>game.gold)));
    await Promise.all([A,B].map(p=>ev(p,i=>claimOpen(G.chests[i]),ci)));
    await until(A,i=>G.chests[i].opened&&!G.chests[i].loot.length&&!G.fly.length,8000,ci);await until(B,i=>G.chests[i].opened&&!G.chests[i].loot.length&&!G.fly.length,8000,ci);await sleep(300);
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
    check('the leader and host leaves: the next one leads and moves the shadows',await until(B,()=>NET.isHost&&netLeader()&&NET.players.filter(p=>!p.off).length===2));
    const m0=await ev(B,()=>G.monsters.map(m=>[m.x,m.z]));await sleep(2500);const m1=await ev(B,()=>G.monsters.map(m=>[m.x,m.z]));
    check('...and they keep moving',m1.some((p,k)=>Math.hypot(p[0]-m0[k][0],p[1]-m0[k][1])>.3));
    check('the others follow the new host',await until(C,()=>!NET.isHost&&NET.mobBuf.length>0));
    check('the server window tells the story',['Ann joined','Bob joined','Level 1','was caught','is through the exit','Level 2','starts over','Cid joined','Cid lost the connection','Cid is back','Ann lost the connection'].every(w=>log.some(l=>l.includes(w))),log.slice(-8));
    const errs=P.flatMap(p=>p.errs);if(errs.length){console.log('errors:',errs.slice(0,8));fail++}
  }finally{await browser.close();srv.kill()}
  process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(1)});
