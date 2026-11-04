'use strict';
// ---------- voice chat: WebRTC between teammates, with audio relayed by the game server if no direct route opens ----------
const VOICE_ICE=[{urls:['stun:stun.l.google.com:19302']}];
const VOICE_LEVEL=.015,VOICE_RATE=24000;
const VOICE_NEAR=3,VOICE_FAR=12; // world metres: full volume nearby, silence beyond this radius
const VOICE={on:false,busy:false,muted:false,stream:null,peers:new Map(),ready:new Set(),known:new Set(),states:new Map(),gen:0,timer:0,local:null,capture:null,error:'',blocked:false,opus:false,codecProbe:null};

// Receiving is independent of microphone permission; the saved setting controls the whole session.
function voiceState(id){const me=id===NET.id,p=VOICE.peers.get(id),state=VOICE.states.get(id),player=NET.players.find(p=>p.id===id);
  if(player&&player.off||!NET.on||NET.cut)return ['off','Voice unavailable'];
  if(me){if(!VOICE.on)return ['off','Voice chat off'];if(VOICE.blocked)return ['blocked','Click or press a key to hear voice'];
    if(VOICE.busy)return ['connecting','Starting microphone'];if(!VOICE.stream)return ['listen',VOICE.error||'Listening only'];
    if(VOICE.muted)return ['muted','Microphone muted'];return VOICE.local&&VOICE.local.speaking?['speaking','Speaking']:['connected','Microphone on']}
  if(ROSTER.voice.has(id))return ['muted','Muted for you'];
  if(!VOICE.on||!VOICE.ready.has(id))return ['off','Voice chat off'];
  if(state&&state.muted)return ['muted','Microphone muted'];if(state&&!state.mic)return ['listen','Listening only'];
  if(!p||!(p.relay?p.relayBytes>0:p.pc&&p.pc.connectionState==='connected'))return ['connecting','Voice connecting'];
  return p.audio&&p.audio.speaking?['speaking','Speaking']:['connected','Voice connected'];
}
function voiceGlyph(state){const path=state==='listen'?'<path d="M3 10V8a5 5 0 0 1 10 0v2M3 9H2v4h3V9H3m10 0h1v4h-3V9h2"/>':'<rect x="6" y="2" width="4" height="8" rx="2"/><path d="M4 7v1a4 4 0 0 0 8 0V7M8 12v2M5 14h6"/>';
  return `<svg viewBox="0 0 16 16" aria-hidden="true">${path}${['off','muted','blocked'].includes(state)?'<path d="M2 2l12 12"/>':''}${state==='speaking'?'<path d="M14 4v5M2 4v5"/>':''}</svg>`}
function voiceIcon(id){const [state,label]=voiceState(id);return `<span class="voice-icon" data-voice-id="${id}" data-state="${state}" role="img" title="${esc(label)}" aria-label="${esc(label)}">${voiceGlyph(state)}</span>`}
function voiceUI(){const set=$('voice');set.checked=!!S.voice;set.disabled=false;
  const status=$('voiceStatus');if(status)status.textContent=VOICE.error||(!S.voice?'Voice disabled':!NET.on?'Nearby voices · N: mute microphone':VOICE.busy?'Starting microphone…':VOICE.blocked?'Click or press a key to hear voice':!VOICE.stream?'Listening only · N: retry microphone':'Nearby voices · N: mute microphone');
  for(const el of document.querySelectorAll('[data-voice-id]')){const [state,label]=voiceState(+el.dataset.voiceId);if(el.dataset.state===state&&el.title===label)continue;
    el.dataset.state=state;el.title=label;el.setAttribute('role','img');el.setAttribute('aria-label',label);
    el.innerHTML=voiceGlyph(state);
  }
}
function voiceError(s){VOICE.busy=false;VOICE.error=s;voiceAnnounce();voiceUI()}
function voiceAnnounce(id,reply=false){const data={mic:!!VOICE.stream,muted:VOICE.muted,rate:VOICE_RATE,opus:VOICE.opus,reply};
  if(id!==undefined)voiceSend(id,'ready',data);else for(const id of NET.peers.keys())voiceSend(id,'ready',data)}
function voiceToggle(){S.voice=$('voice').checked;saveSet();if(S.voice)voiceEnable();else voiceStop();voiceUI()}
async function voiceEnable(){if(!NET.on||!S.voice)return;if(VOICE.on)return;
  VOICE.on=true;VOICE.error='';audioInit();voiceCodecInit();VOICE.timer=setInterval(voiceMonitor,100);voiceSync();voiceResume();await voiceMicrophone();
}
async function voiceMicrophone(){if(!VOICE.on||VOICE.busy||VOICE.stream)return;
  if(!window.isSecureContext||!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){
    voiceError('Listening only: microphone needs HTTPS or localhost');return}
  const gen=++VOICE.gen;VOICE.busy=true;VOICE.error='';voiceUI();let stream;
  try{stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1,sampleRate:{ideal:48000},sampleSize:{ideal:16}},video:false})}
  catch(e){if(gen===VOICE.gen)voiceError(e&&e.name==='NotAllowedError'?'Listening only: microphone access denied':'Listening only: microphone unavailable');return}
  if(gen!==VOICE.gen||!VOICE.on||!NET.on){for(const t of stream.getTracks())t.stop();return}
  VOICE.stream=stream;VOICE.busy=false;
  for(const t of stream.getAudioTracks()){t.enabled=!VOICE.muted;t.onended=()=>{if(gen===VOICE.gen&&VOICE.on)voiceMicrophoneLost()}}
  VOICE.local=voiceNodes(stream,false);
  for(const p of VOICE.peers.values())if(p.pc)voiceAttach(p).catch(()=>voiceRelay(p));
  if([...VOICE.peers.values()].some(p=>p.relay))voiceCapture();voiceAnnounce();voiceUI();
}
function voiceMicrophoneLost(){++VOICE.gen;VOICE.busy=false;voiceCaptureStop();
  if(VOICE.stream)for(const t of VOICE.stream.getTracks())t.stop();VOICE.stream=null;
  voiceActivity(NET.id,false,VOICE.local);voiceFreeNodes(VOICE.local);VOICE.local=null;voiceError('Listening only: microphone disconnected · N: retry')}
function voiceStop(){if(VOICE.on)for(const id of NET.peers.keys())voiceSend(id,'stop');
  ++VOICE.gen;VOICE.on=false;VOICE.busy=false;VOICE.muted=false;VOICE.error='';VOICE.blocked=false;VOICE.ready.clear();VOICE.known.clear();VOICE.states.clear();clearInterval(VOICE.timer);VOICE.timer=0;voiceReset();voiceCaptureStop();
  if(VOICE.stream)for(const t of VOICE.stream.getTracks())t.stop();VOICE.stream=null;
  voiceFreeNodes(VOICE.local);voiceActivity(NET.id,false,VOICE.local);VOICE.local=null;voiceUI();
}
function voiceMute(){if(!VOICE.on)return;if(!VOICE.stream){voiceMicrophone();return}VOICE.muted=!VOICE.muted;for(const t of VOICE.stream.getAudioTracks())t.enabled=!VOICE.muted;
  if(VOICE.muted)voiceActivity(NET.id,false,VOICE.local);voiceAnnounce();voiceUI()}
// Use body positions, including the watched player's body, so camera mode cannot change hearing.
function voiceHearing(id){if(ROSTER.voice.has(id)||!NET.on||NET.cut)return 0;
  const p=NET.peers.get(id);if(!p||p.off)return 0;
  if(!NET.play)return 1;
  if(netWatching()){
    if(!netWatchOk(NET.watch)||p.st!=='in')return 0;
    if(id===NET.watch)return 1;
  }else if(NET.st!=='in')return NET.st==='out'&&p.st==='out'?1:0;
  if(p.st!=='in')return 0;
  const listener=netWatching()?NET.peers.get(NET.watch):pl;
  if(!listener||![listener.x,listener.z,p.x,p.z].every(num))return 0;
  const d=Math.hypot(p.x-listener.x,p.z-listener.z);
  return 1-sstep(VOICE_NEAR,VOICE_FAR,d);
}
function voicePan(id){if(!NET.play)return 0;const p=NET.peers.get(id),listener=netWatching()?NET.peers.get(NET.watch):pl;
  if(!p||!listener||p.st!=='in'||![p.x,p.z,listener.x,listener.z].every(num))return 0;
  const dx=p.x-listener.x,dz=p.z-listener.z,d=Math.hypot(dx,dz),yaw=listener.yaw||0;
  return d<.05?0:clamp((dx*Math.cos(yaw)-dz*Math.sin(yaw))/Math.max(1,d),-1,1);
}
function voiceOutput(out,id){const c=Snd.ctx;out.gain=c.createGain();out.gain.gain.value=voiceHearing(id);out.pan=c.createStereoPanner();out.pan.channelCount=1;out.pan.channelCountMode='explicit';out.pan.pan.value=voicePan(id);
  out.analyser.connect(out.gain);out.gain.connect(out.pan);out.pan.connect(Snd.out);voiceApplyVolume(id,out);
}
function voiceApplyVolume(id,a){if(!a)return;const level=voiceHearing(id);
  // Media elements only unlock the incoming MediaStream on browsers that need it; audible output is Web Audio.
  if(a.el)a.el.volume=a.pan?0:level*S.vol;
  if(a.gain)a.gain.gain.value=level;
  if(a.pan){const pan=voicePan(id);if(pan!==a.panValue){a.pan.pan.setTargetAtTime(pan,Snd.ctx.currentTime,.025);a.panValue=pan}}
}
function voiceVolume(){for(const p of VOICE.peers.values())voiceApplyVolume(p.id,p.audio)}
function voiceResume(){if(!VOICE.on)return;if(Snd.ctx&&Snd.ctx.state==='suspended')Snd.ctx.resume().then(voiceBlocked).catch(voiceBlocked);for(const p of VOICE.peers.values())voicePlay(p.audio)}

function voiceSend(id,kind,data){if(NET.on)netSend(Object.assign({t:'voice',to:id,kind},data||{}))}
function voiceSync(){if(VOICE.on&&NET.on&&!NET.cut){const keep=new Set();
    for(const p of NET.players)if(p.id!==NET.id&&!p.off&&NET.peers.has(p.id)){keep.add(p.id);
      if(!VOICE.known.has(p.id)){VOICE.known.add(p.id);voiceAnnounce(p.id,true)}
      if(VOICE.ready.has(p.id)&&!VOICE.peers.has(p.id))voicePeer(p.id)}
    for(const id of VOICE.known)if(!keep.has(id)){VOICE.known.delete(id);VOICE.ready.delete(id);VOICE.states.delete(id)}
    for(const id of VOICE.peers.keys())if(!keep.has(id))voiceClose(id)}
  voiceUI();
}
function voiceReconnect(){voiceReset();VOICE.ready.clear();VOICE.known.clear();VOICE.states.clear();voiceUI()}
async function voiceAttach(p){if(!p.pc||p.relay)return;const t=p.pc.getTransceivers().find(t=>t.receiver.track.kind==='audio');if(!t)return;
  t.direction='sendrecv';await t.sender.replaceTrack(VOICE.stream?VOICE.stream.getAudioTracks()[0]:null);await voiceTune(t)}
// Prefer Opus where supported; optional tuning must never break the call on older browsers.
async function voiceTune(t){
  try{const codecs=RTCRtpReceiver.getCapabilities('audio').codecs;if(t.setCodecPreferences&&codecs.some(c=>c.mimeType.toLowerCase()==='audio/opus'))
    t.setCodecPreferences([...codecs.filter(c=>c.mimeType.toLowerCase()==='audio/opus'),...codecs.filter(c=>c.mimeType.toLowerCase()!=='audio/opus')])}catch(e){}
  try{const p=t.sender.getParameters();if(p.encodings&&p.encodings.length){for(const e of p.encodings)e.maxBitrate=64000;await t.sender.setParameters(p)}}catch(e){}
}
function voicePeer(id){let p=VOICE.peers.get(id);if(p)return p;
  p={id,pc:null,offer:NET.id<id,chain:Promise.resolve(),candidates:[],audio:null,retry:0,relay:false,relayBytes:0};VOICE.peers.set(id,p);
  if(!window.RTCPeerConnection){voiceRelay(p);return p}
  let pc;try{pc=p.pc=new RTCPeerConnection({iceServers:VOICE_ICE})}catch(e){voiceRelay(p);return p}
  pc.onnegotiationneeded=async()=>{if(!p.offer)return;try{await pc.setLocalDescription();
    if(VOICE.peers.get(id)===p&&!p.relay)voiceSend(id,'sdp',{desc:{type:pc.localDescription.type,sdp:pc.localDescription.sdp}})}catch(e){voiceRelay(p)}};
  pc.onicecandidate=e=>{if(VOICE.peers.get(id)===p&&!p.relay)voiceSend(id,'ice',{candidate:e.candidate?(e.candidate.toJSON?e.candidate.toJSON():e.candidate):null})};
  pc.ontrack=e=>{if(VOICE.peers.get(id)!==p||p.relay)return;voiceFreeNodes(p.audio);voiceActivity(id,false,p.audio);
    const stream=e.streams[0]||new MediaStream([e.track]);p.audio=voiceNodes(stream,true,id);voiceActivity(id,false,p.audio)};
  pc.onconnectionstatechange=()=>{if(VOICE.peers.get(id)!==p||p.relay)return;if(pc.connectionState==='failed')voiceRelay(p);
    else{if(pc.connectionState==='connected'){clearTimeout(p.retry);p.retry=0;for(const t of pc.getTransceivers())voiceTune(t)}else if(pc.connectionState==='disconnected'&&!p.retry)p.retry=setTimeout(()=>voiceRelay(p),6000);voiceUI()}};
  p.retry=setTimeout(()=>{if(VOICE.peers.get(id)===p&&!p.relay&&pc.connectionState!=='connected')voiceRelay(p)},6000);
  // Only the offerer creates the audio slot; the answerer reuses it, even without a microphone.
  if(p.offer){const track=VOICE.stream&&VOICE.stream.getAudioTracks()[0];voiceTune(pc.addTransceiver(track||'audio',{direction:'sendrecv',streams:VOICE.stream?[VOICE.stream]:[]}))}
  return p;
}
function voiceRelay(p){if(VOICE.peers.get(p.id)!==p||p.relay)return;p.relay=true;clearTimeout(p.retry);p.retry=0;
  if(p.pc){p.pc.onnegotiationneeded=p.pc.onicecandidate=p.pc.ontrack=p.pc.onconnectionstatechange=null;try{p.pc.close()}catch(e){}p.pc=null}
  voiceFreeNodes(p.audio);voiceActivity(p.id,false,p.audio);p.audio=null;voiceCapture();voiceSend(p.id,'relay');voiceUI();
}
function voiceClose(id){const p=VOICE.peers.get(id);if(!p)return;VOICE.peers.delete(id);clearTimeout(p.retry);
  if(p.pc){p.pc.onnegotiationneeded=p.pc.onicecandidate=p.pc.ontrack=p.pc.onconnectionstatechange=null;try{p.pc.close()}catch(e){}}
  voiceFreeNodes(p.audio);voiceActivity(id,false,p.audio);p.audio=null;if(![...VOICE.peers.values()].some(p=>p.relay))voiceCaptureStop();voiceUI();
}
function voiceReset(){for(const id of [...VOICE.peers.keys()])voiceClose(id)}
function voiceOn(m){const id=m.from;if(!num(id)||!NET.peers.has(id))return;
  if(m.kind==='stop'){VOICE.ready.delete(id);VOICE.states.delete(id);voiceClose(id);voiceUI();return}if(m.kind==='restart'){voiceClose(id);voiceSync();return}if(!VOICE.on||NET.cut)return;
  if(m.kind==='ready'){VOICE.ready.add(id);VOICE.states.set(id,{mic:m.mic!==false,muted:!!m.muted,rate:m.rate===VOICE_RATE?VOICE_RATE:16000,opus:m.opus===true});if(m.reply!==false)voiceAnnounce(id);voiceSync();return}
  if(!VOICE.ready.has(id)||!['sdp','ice','relay','pcm'].includes(m.kind))return;
  const p=voicePeer(id);if(m.kind==='relay'){voiceRelay(p);return}if(m.kind==='pcm'){if(m.codec==='opus')voiceOpus(p,m);else voicePCM(p,m.data,m.rate,m);return}if(p.relay)return;
  p.chain=p.chain.then(()=>voiceSignal(p,m)).catch(()=>{if(VOICE.peers.get(id)===p)voiceRelay(p)});
}
async function voiceCandidates(p){if(!p.pc)return;for(const c of p.candidates.splice(0))await p.pc.addIceCandidate(c)}
async function voiceSignal(p,m){const pc=p.pc,id=p.id;if(!pc||p.relay||VOICE.peers.get(id)!==p)return;
  if(m.kind==='sdp'){const d=m.desc;if(!d||!['offer','answer'].includes(d.type)||typeof d.sdp!=='string')return;
    if(d.type==='offer'&&p.offer)return;await pc.setRemoteDescription(d);await voiceCandidates(p);if(p.relay)return;
    if(d.type==='offer'){await voiceAttach(p);await pc.setLocalDescription();if(VOICE.peers.get(id)===p&&!p.relay)voiceSend(id,'sdp',{desc:{type:pc.localDescription.type,sdp:pc.localDescription.sdp}})}}
  else if(m.kind==='ice'&&(m.candidate===null||typeof m.candidate==='object')){
    if(pc.remoteDescription&&pc.remoteDescription.type)await pc.addIceCandidate(m.candidate);else p.candidates.push(m.candidate)}
}

function voiceEncode(input,rate,target=VOICE_RATE){const n=Math.max(1,Math.round(input.length*target/rate)),bytes=new Uint8Array(n*2),view=new DataView(bytes.buffer);
  for(let i=0;i<n;i++){const a=Math.floor(i*input.length/n),b=Math.max(a+1,Math.floor((i+1)*input.length/n));let sum=0;
    for(let j=a;j<b;j++)sum+=input[j]||0;const v=Math.max(-1,Math.min(1,sum/(b-a)));view.setInt16(i*2,v*32767,true)}
  let binary='';for(const b of bytes)binary+=String.fromCharCode(b);return btoa(binary)
}
// WebCodecs is optional: negotiate Opus only when both sides can encode and decode it.
async function voiceCodecInit(){if(VOICE.codecProbe)return VOICE.codecProbe;
  VOICE.codecProbe=(async()=>{try{if(typeof AudioEncoder==='undefined'||typeof AudioDecoder==='undefined')return;
    const rate=Snd.ctx.sampleRate,enc=await AudioEncoder.isConfigSupported({codec:'opus',sampleRate:rate,numberOfChannels:1,bitrate:48000}),
      dec=await AudioDecoder.isConfigSupported({codec:'opus',sampleRate:48000,numberOfChannels:1});
    VOICE.opus=!!(enc.supported&&dec.supported);if(VOICE.on)voiceAnnounce();
  }catch(e){VOICE.opus=false}})();return VOICE.codecProbe;
}
function voiceBytes(bytes){let binary='';for(const b of bytes)binary+=String.fromCharCode(b);return btoa(binary)}
function voiceUnpack(data){if(typeof data!=='string'||!data.length||data.length>8192)return null;try{const raw=atob(data);return Uint8Array.from(raw,c=>c.charCodeAt(0))}catch(e){return null}}
function voiceCaptureSend(n,input,rate,ts){n.blocks=(n.blocks||0)+1;n.age=Snd.ctx.currentTime-ts/1000;if(VOICE.capture!==n||!VOICE.on||VOICE.muted||NET.cut||!NET.ws)return;
  // Worklet messages can wait behind a long frame: never send a backlog of old speech.
  if(n.age>.3){n.stale=(n.stale||0)+1;return}
  const peers=[...VOICE.peers.values()].filter(p=>p.relay);if(!peers.length)return;
  const budget=peers.reduce((sum,p)=>sum+(VOICE.opus&&VOICE.states.get(p.id)?.opus?8000:(VOICE.states.get(p.id)?.rate===VOICE_RATE?VOICE_RATE:16000)*2*4/3)*.12,0);
  if(NET.ws.bufferedAmount>budget){n.congested=(n.congested||0)+1;return}
  const seq=n.seq++,encoded=new Map();
  for(const p of peers){const state=VOICE.states.get(p.id),target=state?.rate===VOICE_RATE?VOICE_RATE:16000;
    if(VOICE.opus&&state?.opus){continue}
    if(!encoded.has(target))encoded.set(target,voiceEncode(input,rate,target));
    voiceSend(p.id,'pcm',{data:encoded.get(target),rate:target,ts,seq,sid:n.sid});
  }
  if(!VOICE.opus||!peers.some(p=>VOICE.states.get(p.id)?.opus))return;
  try{if(!n.encoder){n.timeline=[];n.encoder=new AudioEncoder({output:chunk=>{
      // Encoders may timestamp a continuous sample stream across capture gaps. Track the
      // original capture clock ourselves so mute/load stalls never make all later packets stale.
      const ts=n.timeline[0]?.ts;let remaining=(chunk.duration||20000)/1000;
      while(n.timeline.length&&remaining>1e-6){const segment=n.timeline[0],take=Math.min(remaining,segment.duration);segment.ts+=take;segment.duration-=take;remaining-=take;if(segment.duration<1e-6)n.timeline.shift()}
      if(VOICE.capture!==n||!VOICE.on||!VOICE.opus||VOICE.muted||NET.cut||!NET.ws||NET.ws.bufferedAmount>budget)return;
      if(ts===undefined||Snd.ctx.currentTime-ts/1000>.5)return;
      const bytes=new Uint8Array(chunk.byteLength);chunk.copyTo(bytes);const data=voiceBytes(bytes),seq=n.opusSeq++;
      for(const peer of VOICE.peers.values())if(peer.relay&&VOICE.states.get(peer.id)?.opus)voiceSend(peer.id,'pcm',{codec:'opus',data,ts,seq,sid:n.sid});
    },error:()=>voiceCodecFailed()});n.encoder.configure({codec:'opus',sampleRate:rate,numberOfChannels:1,bitrate:48000,opus:{format:'opus',application:'voip',signal:'voice',frameDuration:20000}})}
    if(n.encoder.encodeQueueSize>4)return;
    const audio=new AudioData({format:'f32-planar',sampleRate:rate,numberOfFrames:input.length,numberOfChannels:1,timestamp:Math.round(ts*1000),data:input});
    try{n.timeline.push({ts,duration:input.length/rate*1000});n.encoder.encode(audio)}finally{audio.close()}
  }catch(e){voiceCodecFailed()}
}
function voiceCodecFailed(){VOICE.opus=false;voiceAnnounce()}
async function voiceCapture(){if(VOICE.capture||!VOICE.local||!VOICE.local.source)return;
  const c=Snd.ctx,n={source:VOICE.local.source,seq:0,opusSeq:0,sid:Date.now()+':'+VOICE.gen},zero=n.zero=c.createGain();zero.gain.value=0;zero.connect(Snd.out);VOICE.capture=n;
  const receive=(input,ts)=>voiceCaptureSend(n,input,c.sampleRate,ts);
  try{if(!c.audioWorklet||typeof AudioWorkletNode==='undefined')throw Error('legacy');
    if(VOICE.workletContext!==c){VOICE.workletContext=c;VOICE.workletReady=c.audioWorklet.addModule('js/voice-capture-worklet.js')}
    await VOICE.workletReady;if(VOICE.capture!==n)return;
    n.processor=new AudioWorkletNode(c,'voice-capture');n.processor.port.onmessage=e=>receive(e.data.samples,e.data.time*1000);
  }catch(e){if(VOICE.capture!==n)return;n.processor=c.createScriptProcessor(1024,1,1);n.processor.onaudioprocess=e=>receive(e.inputBuffer.getChannelData(0),e.playbackTime*1000)}
  if(VOICE.capture===n){n.source.connect(n.processor);n.processor.connect(zero)}
}
function voiceCaptureStop(){const n=VOICE.capture;if(!n)return;VOICE.capture=null;
  if(n.encoder&&n.encoder.state!=='closed')n.encoder.close();
  if(n.processor){if(n.processor.port){n.processor.port.onmessage=null;n.processor.port.postMessage('stop');n.processor.port.close()}else n.processor.onaudioprocess=null;
    try{n.source.disconnect(n.processor)}catch(e){}try{n.processor.disconnect()}catch(e){}}
  try{n.zero.disconnect()}catch(e){}
}
function voiceRelayNodes(p){if(p.audio)return p.audio;const c=Snd.ctx,out={speaking:false,lastLoud:0,level:0,next:0,sources:new Set(),received:0,dropped:0,jitter:0,delay:.06};
  out.analyser=c.createAnalyser();out.analyser.fftSize=512;out.data=new Uint8Array(512);voiceOutput(out,p.id);p.audio=out;return out;
}
function voicePacket(a,m){if(!Number.isSafeInteger(m.seq)||typeof m.sid!=='string')return true;
  const sid=m.sid+':'+(m.codec||'pcm');
  if(a.sid!==sid){a.sid=sid;a.seq=-1;a.clock=null;a.transit=undefined;if(a.decoder&&a.decoder.state!=='closed'){a.decoder.close();a.decoder=null}}
  if(m.seq<=a.seq){a.dropped++;return false}a.seq=m.seq;return true;
}
function voiceQueue(p,buffer,m={}){const c=Snd.ctx;if(!c||c.state!=='running')return;const a=voiceRelayNodes(p),now=c.currentTime;
  const stamp=Number.isFinite(m.ts)?m.ts/1000:null;
  if(stamp!==null){const transit=now-stamp;if(a.transit!==undefined)a.jitter+=(Math.min(.2,Math.abs(transit-a.transit))-a.jitter)*.1;
    a.transit=transit;a.delay=clamp(.04+a.jitter*3,.04,.12);
    // Establish a clock offset per talkspurt, then discard stale TCP bursts instead of replaying them late.
    if(a.clock===null||a.clock===undefined||now-a.received>.5)a.clock=transit;
    if(transit-a.clock>.22){a.dropped++;if(now-a.received>.25)a.clock=transit;else return}
  }
  a.received=now;voiceApplyVolume(p.id,a);
  if(a.next>now+.22){a.dropped++;return}
  const gap=!a.next||a.next<now+.004;if(gap)a.next=now+a.delay;
  const source=c.createBufferSource(),edge=c.createGain();source.buffer=buffer;source.connect(edge);edge.connect(a.analyser);
  // Fade discontinuities, but keep normal consecutive packets continuous (no 50 Hz amplitude dips).
  const start=a.next,end=start+buffer.duration,fade=Math.min(.001,buffer.duration/4);
  const contiguous=!gap&&a.tail&&a.tail.end>now+.002&&(stamp===null||a.tail.stamp!==null&&Math.abs(stamp-a.tail.stamp-a.tail.duration)<.003);
  if(contiguous){a.tail.edge.gain.cancelScheduledValues(a.tail.end-a.tail.fade);a.tail.edge.gain.setValueAtTime(1,a.tail.end-a.tail.fade);edge.gain.setValueAtTime(1,start)}
  else{edge.gain.setValueAtTime(0,start);edge.gain.linearRampToValueAtTime(1,start+fade)}
  edge.gain.setValueAtTime(1,end-fade);edge.gain.linearRampToValueAtTime(0,end);a.tail={edge,end,fade,stamp,duration:buffer.duration};
  a.sources.add(source);source.onended=()=>{a.sources.delete(source);source.disconnect();edge.disconnect()};source.voiceEdge=edge;source.start(start);a.next=end;
  p.relayBytes+=m.bytes||0;
}
function voicePCM(p,data,rate=16000,m={}){if(![16000,VOICE_RATE].includes(rate)||ROSTER.voice.has(p.id)||!p.relay||!Snd.ctx||Snd.ctx.state!=='running')return;
  const raw=voiceUnpack(data);if(!raw||raw.length<2||raw.length%2)return;
  const a=voiceRelayNodes(p);if(!voicePacket(a,m))return;
  const buffer=Snd.ctx.createBuffer(1,raw.length/2,rate),out=buffer.getChannelData(0),view=new DataView(raw.buffer);
  for(let i=0;i<out.length;i++)out[i]=view.getInt16(i*2,true)/32768;
  voiceQueue(p,buffer,Object.assign({bytes:raw.length},m));
}
function voiceOpus(p,m){if(!VOICE.opus||!p.relay||ROSTER.voice.has(p.id)||!Snd.ctx||Snd.ctx.state!=='running')return;
  const raw=voiceUnpack(m.data);if(!raw||raw.length>2048||!Number.isFinite(m.ts)||m.ts<0)return;
  const a=voiceRelayNodes(p);if(!voicePacket(a,m))return;
  try{if(!a.decoder){a.packetBytes=new Map();a.decoder=new AudioDecoder({output:audio=>{try{
      if(p.audio!==a||!VOICE.on||!p.relay||ROSTER.voice.has(p.id))return;
      const buffer=Snd.ctx.createBuffer(1,audio.numberOfFrames,audio.sampleRate);audio.copyTo(buffer.getChannelData(0),{planeIndex:0,format:'f32-planar'});
      const bytes=a.packetBytes.get(audio.timestamp)||0;a.packetBytes.delete(audio.timestamp);voiceQueue(p,buffer,{ts:audio.timestamp/1000,bytes});
    }finally{audio.close()}},error:()=>voiceCodecFailed()});a.decoder.configure({codec:'opus',sampleRate:48000,numberOfChannels:1})}
    if(a.decoder.decodeQueueSize>8){a.dropped++;return}a.packetBytes.set(Math.round(m.ts*1000),raw.length);
    a.decoder.decode(new EncodedAudioChunk({type:'key',timestamp:Math.round(m.ts*1000),data:raw}));
  }catch(e){voiceCodecFailed()}
}

function voiceNodes(stream,remote,id){const out={speaking:false,lastLoud:0,level:0};
  if(remote){const el=out.el=document.createElement('audio');el.autoplay=true;el.playsInline=true;el.srcObject=stream;el.volume=Snd.ctx?0:voiceHearing(id)*S.vol}
  if(Snd.ctx){const c=Snd.ctx,source=out.source=c.createMediaStreamSource(stream),analyser=out.analyser=c.createAnalyser();analyser.fftSize=512;analyser.smoothingTimeConstant=.25;source.connect(analyser);
    out.data=new Uint8Array(analyser.fftSize);if(remote)voiceOutput(out,id);if(!remote){out.zero=c.createGain();out.zero.gain.value=0;analyser.connect(out.zero);out.zero.connect(Snd.out)}}
  if(remote)voicePlay(out);return out;
}
function voicePlay(n){if(!n||!n.el)return;n.el.play().then(()=>{if(VOICE.on&&n.el.srcObject){n.blocked=false;voiceBlocked()}}).catch(()=>{if(VOICE.on&&n.el.srcObject){n.blocked=true;voiceBlocked()}})}
function voiceBlocked(){VOICE.blocked=!!(Snd.ctx&&Snd.ctx.state==='suspended')||[...VOICE.peers.values()].some(p=>p.audio&&p.audio.blocked);voiceUI()}
function voiceFreeNodes(n){if(!n)return;if(n.el){n.el.pause();n.el.srcObject=null;n.el.remove()}
  if(n.decoder&&n.decoder.state!=='closed')n.decoder.close();
  if(n.sources)for(const s of n.sources){s.onended=null;try{s.stop()}catch(e){}try{s.disconnect();if(s.voiceEdge)s.voiceEdge.disconnect()}catch(e){}}
  for(const k of ['source','analyser','gain','pan','zero'])if(n[k])try{n[k].disconnect()}catch(e){}}
function voiceActivity(id,speaking,n){if(!n||n.speaking===speaking)return;n.speaking=speaking;
  document.dispatchEvent(new CustomEvent('voiceactivity',{detail:{id,isSpeaking:speaking}}));voiceUI();
}
function voiceMeasure(id,n){if(!n||!n.analyser)return;n.analyser.getByteTimeDomainData(n.data);let sum=0;
  for(const v of n.data){const x=(v-128)/128;sum+=x*x}n.level=Math.sqrt(sum/n.data.length);const now=performance.now();if(n.level>=VOICE_LEVEL)n.lastLoud=now;
  voiceActivity(id,n.level>=VOICE_LEVEL||n.speaking&&now-n.lastLoud<300,n);
}
// Read the received waveform at render cadence; never animate unavailable or muted voices.
function voiceMouthLevel(id){if(!VOICE.on||!NET.on||NET.cut||!Snd.ctx||Snd.ctx.state!=='running')return 0;
  const local=id===NET.id,state=VOICE.states.get(id),peer=VOICE.peers.get(id);
  if(local?VOICE.muted:!voiceHearing(id)||state&&(!state.mic||state.muted))return 0;
  const n=local?VOICE.local:peer&&peer.audio;if(!n||!n.analyser||n.blocked)return 0;
  n.analyser.getByteTimeDomainData(n.data);let sum=0;for(const v of n.data){const x=(v-128)/128;sum+=x*x}return Math.sqrt(sum/n.data.length);
}
function voiceMonitor(){if(!VOICE.on)return;voiceVolume();voiceBlocked();if(!VOICE.muted)voiceMeasure(NET.id,VOICE.local);for(const p of VOICE.peers.values()){if(voiceHearing(p.id)>0)voiceMeasure(p.id,p.audio);else if(p.audio){p.audio.lastLoud=0;voiceActivity(p.id,false,p.audio)}}}

function voiceInitUI(){$('voice').onchange=voiceToggle;
  addEventListener('pointerdown',voiceResume);addEventListener('keydown',voiceResume);addEventListener('pagehide',()=>{if(VOICE.on||VOICE.busy)voiceStop()});voiceUI()}

// Read-only developer diagnostics; call await voiceDiagnostics() twice to measure actual bitrate.
async function voiceDiagnostics(){const peers=[];
  for(const p of VOICE.peers.values()){const a=p.audio,row={id:p.id,mode:p.relay?(a?.decoder?'server-opus':'server-pcm'):'webrtc',speaking:!!a?.speaking,pan:voicePan(p.id),volume:voiceHearing(p.id),queuedMs:a?.next?Math.max(0,(a.next-(Snd.ctx?.currentTime||0))*1000):0,jitterMs:(a?.jitter||0)*1000,dropped:a?.dropped||0};
    if(p.pc)try{const stats=await p.pc.getStats();stats.forEach(s=>{if(s.type==='inbound-rtp'&&s.kind==='audio'){row.codec=stats.get(s.codecId)?.mimeType;row.lost=s.packetsLost;row.jitterMs=(s.jitter||0)*1000;
      if(p.stats&&s.timestamp>p.stats.time)row.kbps=(s.bytesReceived-p.stats.bytes)*8/(s.timestamp-p.stats.time);p.stats={time:s.timestamp,bytes:s.bytesReceived}}
      if(s.type==='candidate-pair'&&s.state==='succeeded'&&s.nominated){row.rttMs=(s.currentRoundTripTime||0)*1000;row.candidate=stats.get(s.localCandidateId)?.candidateType}})}catch(e){row.error=e.name}
    peers.push(row);
  }
  return {capture:VOICE.capture?.processor?.port?'AudioWorklet':VOICE.capture?'ScriptProcessor':'off',serverOpus:VOICE.opus,captureStats:VOICE.capture?{blocks:VOICE.capture.blocks,stale:VOICE.capture.stale,congested:VOICE.capture.congested,ageMs:VOICE.capture.age*1000,seq:VOICE.capture.seq,encoder:VOICE.capture.encoder?.state,encoderQueue:VOICE.capture.encoder?.encodeQueueSize}:null,microphone:VOICE.stream?.getAudioTracks()[0]?.getSettings(),peers};
}
