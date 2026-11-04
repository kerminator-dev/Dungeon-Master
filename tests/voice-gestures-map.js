// Input safety, intact parchment/landmarks and bounded PCM playback under bursty delivery.
const {open,scene}=require('./helpers');
(async()=>{const {browser,page,errs}=await open(1000,720);let failures=0;
const check=(name,ok,info)=>{console.log((ok?'OK  ':'FAIL')+' '+name+(info?' '+JSON.stringify(info):''));if(!ok)failures++};
try{
  await scene(page,'dungeon',12,31);
  await page.evaluate(()=>{locked=true;GEST.t=-1});
  for(let i=1;i<=5;i++){
    await page.keyboard.down('q');
    check('Q shows number '+i,await page.locator('#wheel .wheel-key').nth(i-1).textContent()===String(i));
    await page.keyboard.press(String(i));
    check('Q + '+i+' performs the matching gesture',await page.evaluate(i=>!WHEEL.on&&GEST.k===i-1&&GEST.t>=0,i));
    await page.keyboard.up('q');
  }
  for(let i=1;i<=5;i++){await page.evaluate(()=>GEST.t=-1);await page.keyboard.press(String(i));
    check('top-row '+i+' works without Q',await page.evaluate(i=>!WHEEL.on&&GEST.k===i-1&&GEST.t>=0,i));}
  await page.evaluate(()=>{GEST.t=-1;dispatchEvent(new KeyboardEvent('keydown',{code:'Digit2',key:'"',shiftKey:true,bubbles:true}))});
  check('physical top-row key works independently of layout/Shift',await page.evaluate(()=>GEST.k===1&&GEST.t>=0));
  await page.evaluate(()=>{GEST.t=-1;dispatchEvent(new KeyboardEvent('keydown',{code:'Digit1',key:'1',metaKey:true,bubbles:true}))});
  check('system number shortcuts never trigger gestures',await page.evaluate(()=>GEST.t===-1));
  await page.keyboard.press('Numpad1');check('numpad alone does not replace the top-row shortcut',await page.evaluate(()=>GEST.t===-1));
  await page.evaluate(()=>{const input=document.createElement('input');input.id='gestureTypingTest';document.body.appendChild(input);input.focus()});await page.keyboard.press('2');
  check('typing a number in a text field does not gesture',await page.evaluate(()=>GEST.t===-1&&document.getElementById('gestureTypingTest').value==='2'));
  await page.evaluate(()=>document.getElementById('gestureTypingTest').remove());
  await page.keyboard.down('q');await page.keyboard.press('Numpad3');await page.keyboard.up('q');
  check('numpad selection works too',await page.evaluate(()=>GEST.k===2&&GEST.t>=0));
  await page.evaluate(()=>{GEST.t=-1;G.hasMap=true;bigMap=1});await page.keyboard.press('2');await page.keyboard.down('q');await page.keyboard.press('2');await page.keyboard.up('q');
  check('map prevents gestures because both hands are occupied',await page.evaluate(()=>!WHEEL.on&&GEST.t===-1));
  await page.evaluate(()=>{bigMap=0;showMenu('set')});await page.keyboard.down('q');await page.keyboard.press('2');await page.keyboard.up('q');
  check('settings input never triggers gestures',await page.evaluate(()=>!WHEEL.on&&GEST.t===-1));
  await page.evaluate(()=>{document.getElementById('ui').style.display='none';locked=true;GEST.t=-1;wheelOpen();wheelMove(0,-80);dispatchEvent(new Event('blur'))});
  check('losing window focus cancels the wheel without a gesture',await page.evaluate(()=>!WHEEL.on&&GEST.t===-1));
  await page.evaluate(()=>{wheelClose(false);locked=true;wheelOpen();wheelMove(0,-80);showMenu('main')});
  await page.keyboard.up('q');await page.evaluate(()=>wheelKeyUp());
  check('opening a menu cancels a selected gesture',await page.evaluate(()=>!WHEEL.on&&GEST.t===-1));
  await page.evaluate(()=>{document.getElementById('ui').style.display='none';locked=true;NET.on=true;NET.st='in';wheelOpen();chatOpen()});
  await page.keyboard.press('2');await page.keyboard.up('q');
  check('chat cancels the wheel and receives numbers as text',await page.evaluate(()=>!WHEEL.on&&GEST.t===-1&&document.getElementById('chatIn').value==='2'));
  await page.evaluate(()=>{chatClose();NET.on=false;wheelClose(false)});
  for(const theme of ['dungeon','autumn','swamp']){
    await scene(page,theme,12,31);
    const result=await page.evaluate(()=>{const sheet=mapSheet(),ctx=sheet.getContext('2d'),a=ctx.getImageData(40,40,820,820).data;let holes=0;
      for(let i=3;i<a.length;i+=4)if(a[i]!==255)holes++;
      const markers=G.chests.filter(c=>c.kind==='chest'||c.kind==='altar').map(c=>{const p=toGrid(c.x,c.z),k=760/W.n,x=Math.round(70+p[0]*k),y=Math.round(70+p[1]*k),d=ctx.getImageData(x-2,y-2,5,5).data;let ink=false;
        for(let i=0;i<d.length;i+=4)if(c.kind==='altar'?d[i]<80&&d[i+1]>70&&d[i+2]>70:d[i]<130&&d[i+1]<85)ink=true;
        return {kind:c.kind,ink}});
      return {holes,markers,cached:sheet===mapSheet()}});
    check(theme+': no transparent holes inside parchment',result.holes===0,result.holes);
    check(theme+': every chest and altar has a distinct marker',result.markers.some(c=>c.kind==='altar')&&result.markers.some(c=>c.kind==='chest')&&result.markers.every(c=>c.ink),result.markers);
    check(theme+': map texture is cached for held maps',result.cached);
  }
  await page.evaluate(()=>{G.hasMap=true;bigMap=2;drawMap()});await page.screenshot({path:'/tmp/labyrinth-map-landmarks.png'});
  await page.evaluate(()=>audioInit());await page.keyboard.press('Shift');
  const audio=await page.evaluate(async()=>{await Snd.ctx.resume();const input=new Float32Array(1024).fill(.5),pcm=voiceEncode(input,48000),raw=atob(pcm);
    const p={id:999,relay:true,relayBytes:0,audio:null};voicePCM(p,pcm,24000);
    const source=[...p.audio.sources][0],first=p.audio.next;for(let i=0;i<80;i++)voicePCM(p,pcm,24000);
    const result={bytes:raw.length,rate:source.buffer.sampleRate,value:source.buffer.getChannelData(0)[0],queued:p.audio.next-Snd.ctx.currentTime,count:p.audio.sources.size,first};
    const before=p.relayBytes;voicePCM(p,pcm,12345);result.rejectRate=p.relayBytes===before;voiceFreeNodes(p.audio);
    const legacy={id:998,relay:true,relayBytes:0,audio:null};voicePCM(legacy,voiceEncode(input,48000,16000));result.legacy=[...legacy.audio.sources][0].buffer.sampleRate===16000;voiceFreeNodes(legacy.audio);
    const pc=new RTCPeerConnection(),t=pc.addTransceiver('audio');await voiceTune(t);await pc.setLocalDescription();result.opus=pc.localDescription.sdp.includes('opus/48000');pc.close();return result});
  check('24 kHz PCM retains duration and amplitude',audio.bytes===1024&&audio.rate===24000&&Math.abs(audio.value-.5)<.001,audio);
  check('bursty relay cannot overlap playback or grow an unbounded queue',audio.queued<.29&&audio.queued>0&&audio.count<15,audio);
  check('legacy 16 kHz relay remains supported; invalid rates rejected',audio.legacy&&audio.rejectRate);
  check('Opus tuning produces valid browser SDP',audio.opus);
  const proximity=await page.evaluate(()=>{
    const saved={on:NET.on,play:NET.play,st:NET.st,watch:NET.watch,spec:NET.spec,done:NET.done,cut:NET.cut,peers:NET.peers,x:pl.x,z:pl.z,voicePeers:VOICE.peers,vol:S.vol};
    const gain=Snd.ctx.createGain(),a={el:{volume:0},gain},result={};
    try{Object.assign(NET,{on:true,play:true,st:'in',watch:0,spec:false,done:false,cut:false,peers:new Map([[901,{id:901,st:'in',x:0,z:0}],[902,{id:902,st:'in',x:6,z:0}]])});
      pl.x=0;pl.z=0;S.vol=.4;VOICE.peers=new Map([[901,{id:901,audio:a}]]);
      const p=NET.peers.get(901);result.near=voiceHearing(901);p.x=VOICE_FAR;result.far=voiceHearing(901);p.x=6;result.middle=voiceHearing(901);
      voiceVolume();result.direct=Math.abs(a.el.volume-result.middle*S.vol)<1e-6;result.relay=Math.abs(gain.gain.value-result.middle)<1e-6;
      p.x=100;Object.assign(NET,{st:'ghost',watch:901});result.watched=voiceHearing(901);
      NET.peers.get(902).x=106;result.neighbour=voiceHearing(902);NET.peers.get(902).x=120;result.distant=voiceHearing(902);
      NET.watch=902;result.switched=voiceHearing(901);NET.peers.get(902).st='ghost';result.invalidWatch=voiceHearing(901);
      Object.assign(NET,{st:'in',watch:0});p.st='ghost';p.x=0;result.dead=voiceHearing(901);p.st='out';result.traderFromMaze=voiceHearing(901);
      NET.st='out';result.trader=voiceHearing(901);NET.spec=true;NET.watch=901;result.invalidSpec=voiceHearing(901);p.st='in';result.spec=voiceHearing(901);
      ROSTER.voice.add(901);result.muted=voiceHearing(901);ROSTER.voice.delete(901);p.off=true;result.offline=voiceHearing(901);p.off=false;
      NET.play=false;result.lobby=voiceHearing(901);NET.cut=true;result.cut=voiceHearing(901);
      return result;
    }finally{gain.disconnect();ROSTER.voice.delete(901);Object.assign(NET,{on:saved.on,play:saved.play,st:saved.st,watch:saved.watch,spec:saved.spec,done:saved.done,cut:saved.cut,peers:saved.peers});pl.x=saved.x;pl.z=saved.z;VOICE.peers=saved.voicePeers;S.vol=saved.vol}
  });
  check('voices fade by body distance on both audio paths',proximity.near===1&&proximity.far===0&&proximity.middle>0&&proximity.middle<1&&proximity.direct&&proximity.relay,proximity);
  check('spectators hear the watched player and nearby teammates, and switching updates hearing',proximity.watched===1&&proximity.neighbour===proximity.middle&&proximity.distant===0&&proximity.switched===0&&proximity.invalidWatch===0&&proximity.spec===1&&proximity.invalidSpec===0,proximity);
  check('living players cannot hear ghosts or trader voices; lobby and trader remain shared',proximity.dead===0&&proximity.traderFromMaze===0&&proximity.trader===1&&proximity.lobby===1,proximity);
  check('mute, disconnect and lost connection override proximity',proximity.muted===0&&proximity.offline===0&&proximity.cut===0,proximity);
  const capture=await page.evaluate(async()=>{const saved={on:VOICE.on,local:VOICE.local,peers:VOICE.peers,states:VOICE.states,ws:NET.ws,cut:NET.cut,send:voiceSend};
    const sent=[],source=Snd.ctx.createGain();try{VOICE.on=true;VOICE.local={source};VOICE.peers=new Map([[991,{id:991,relay:true}],[992,{id:992,relay:true}]]);VOICE.states=new Map([[991,{rate:24000}],[992,{rate:16000}]]);NET.cut=false;NET.ws={bufferedAmount:32768};voiceSend=(id,kind,data)=>sent.push({id,kind,...data});
      await voiceCapture();const samples=new Float32Array(1024).fill(.25);voiceCaptureSend(VOICE.capture,samples,Snd.ctx.sampleRate,Snd.ctx.currentTime*1000);const congested=sent.length;
      sent.length=0;NET.ws.bufferedAmount=0;voiceCaptureSend(VOICE.capture,samples,Snd.ctx.sampleRate,Snd.ctx.currentTime*1000);
      return {congested,rates:sent.map(p=>p.rate),sizes:sent.map(p=>atob(p.data).length),expected:[24000,16000].map(rate=>2*Math.round(1024*rate/Snd.ctx.sampleRate))};
    }finally{voiceCaptureStop();source.disconnect();Object.assign(VOICE,{on:saved.on,local:saved.local,peers:saved.peers,states:saved.states});NET.ws=saved.ws;NET.cut=saved.cut;voiceSend=saved.send}});
  check('congested sender drops voice instead of adding stale audio',capture.congested===0,capture);
  check('each receiver gets PCM at its negotiated rate',capture.rates.join() ==='24000,16000'&&capture.sizes.join()===capture.expected.join(),capture);

  check('no browser errors',errs.length===0,errs);
}finally{await browser.close()}process.exitCode=failures?1:0;
})().catch(e=>{console.error(e);process.exitCode=1});
