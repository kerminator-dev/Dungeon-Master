'use strict';
// ---------- sound: all synthesized live with WebAudio, no files ----------
const Snd={ctx:null,amb:[],t:{}};
function audioInit(){
  if(Snd.ctx){if(Snd.ctx.state==='suspended')Snd.ctx.resume();return}
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  const c=Snd.ctx=new AC();
  Snd.out=c.createGain();Snd.out.gain.value=S.vol;Snd.out.connect(c.destination);
  Snd.bus=c.createGain();Snd.bus.connect(Snd.out);                       // dry signal
  Snd.rev=c.createConvolver();Snd.send=c.createGain();Snd.bus.connect(Snd.send);Snd.send.connect(Snd.rev);Snd.rev.connect(Snd.out);
  const len=c.sampleRate*2,b=c.createBuffer(1,len,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;Snd.noise=b;
  // constant source: torch hum, volume by distance (portals are silent)
  Snd.torchG=c.createGain();Snd.torchG.gain.value=0;const tn=noiseSrc(),tf=c.createBiquadFilter();tf.type='lowpass';tf.frequency.value=420;tn.connect(tf);tf.connect(Snd.torchG);Snd.torchG.connect(Snd.bus);
  if(TH)sndTheme()}
// thunder: crack and long rumble, delayed after the flash
function sndThunder(delay){if(!sndOk())return;const c=Snd.ctx,t=c.currentTime+delay,near=delay<1.2;
  if(near)burst(rr(1500,2500),.6,'bandpass',.25,.25,t);
  const s=noiseSrc(),f=c.createBiquadFilter(),g=c.createGain();f.type='lowpass';f.frequency.setValueAtTime(near?500:260,t);f.frequency.exponentialRampToValueAtTime(90,t+4);
  s.connect(f);f.connect(g);g.connect(Snd.bus);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(near?.7:.4,t+.15);
  g.gain.setValueAtTime(near?.55:.3,t+.8);g.gain.exponentialRampToValueAtTime(.0001,t+4.5);s.stop(t+4.6)}
function sndVol(){if(Snd.ctx)Snd.out.gain.value=S.vol}
function noiseSrc(){const s=Snd.ctx.createBufferSource();s.buffer=Snd.noise;s.loop=true;s.start(0,Math.random()*1.9);return s}
function env(g,t,a,peak,dec){g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(peak,.0002),t+a);g.gain.exponentialRampToValueAtTime(.0001,t+a+dec)}
function burst(freq,q,type,peak,dec,t,dest){const c=Snd.ctx;t=t||c.currentTime;
  const s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=Snd.noise;f.type=type;f.frequency.value=freq;f.Q.value=q;
  s.connect(f);f.connect(g);g.connect(dest||Snd.bus);env(g,t,.003,peak,dec);s.start(t,Math.random()*1.8);s.stop(t+dec+.06)}
function tone(f0,f1,type,peak,dur,t,a=.005,dest){const c=Snd.ctx;t=t||c.currentTime;const o=c.createOscillator(),g=c.createGain();o.type=type;
  o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+dur);o.connect(g);g.connect(dest||Snd.bus);env(g,t,a,peak,dur);o.start(t);o.stop(t+a+dur+.05)}
function impulse(sec,decay){const c=Snd.ctx,n=c.sampleRate*sec,b=c.createBuffer(2,n,c.sampleRate);
  for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,decay)}return b}

// theme ambience
function sndTheme(){const c=Snd.ctx;if(!c)return;
  for(const n of Snd.amb){try{n.stop?n.stop():n.disconnect()}catch(e){}}Snd.amb=[];Snd.t={};
  // the cistern's stone and water ring on far longer than any other hall
  Snd.rev.buffer=TH.water?impulse(4.6,2.6):TH.indoor?impulse(2.8,3.2):impulse(1.2,5);Snd.send.gain.value=TH.water?.75:TH.indoor?.55:.12;
  const keep=(...n)=>Snd.amb.push(...n);
  const g0=c.createGain();g0.connect(Snd.bus);keep(g0);
  const lfo=(freq,depth,param)=>{const o=c.createOscillator(),g=c.createGain();o.frequency.value=freq;g.gain.value=depth;o.connect(g);g.connect(param);o.start();keep(o)};
  const band=(type,f,q,gain)=>{const s=noiseSrc(),fl=c.createBiquadFilter(),g=c.createGain();fl.type=type;fl.frequency.value=f;fl.Q.value=q;g.gain.value=gain;s.connect(fl);fl.connect(g);g.connect(g0);keep(s);return {fl,g}};
  // weather: rain noise, strong wind in blizzards and sandstorms
  if(TH.rain){band('highpass',1500,.4,.05);band('lowpass',500,.5,.05);const d=band('bandpass',3200,.8,.02);lfo(.3,.01,d.g.gain)}
  if(TH.wind){const w=band('bandpass',450,.7,.06*TH.wind);lfo(.09,250,w.fl.frequency);lfo(.17,.03*TH.wind,w.g.gain);const h=band('bandpass',1100,8,.008*TH.wind);lfo(.13,400,h.fl.frequency)}
  if(TH.indoor){
    const low=TH.torch==='candle'?41:55;
    for(const f of [low,low*1.012,low*1.5]){const o=c.createOscillator(),g=c.createGain(),fl=c.createBiquadFilter();o.type='sawtooth';o.frequency.value=f;fl.type='lowpass';fl.frequency.value=140;g.gain.value=.03;o.connect(fl);fl.connect(g);g.connect(g0);o.start();keep(o)}
    const r=band('bandpass',260,.6,.02);lfo(.05,90,r.fl.frequency);
    // the cistern: water lapping at the walls, a slow slosh rising and falling
    if(TH.water){const w=band('bandpass',380,1.2,.05);lfo(.17,140,w.fl.frequency);lfo(.29,.035,w.g.gain);band('lowpass',90,.6,.05)}
    // the tomb: a dry moan of air through the passages
    if(TH.glyphs){const w=band('bandpass',520,3,.018);lfo(.04,180,w.fl.frequency);lfo(.07,.012,w.g.gain)}}
  else if(TH.snow){const w=band('bandpass',520,.7,.07);lfo(.07,320,w.fl.frequency);lfo(.11,.04,w.g.gain);
    const h=band('bandpass',1300,6,.012);lfo(.09,500,h.fl.frequency);band('lowpass',180,.5,.05)}
  else if(TH.dunes){// the desert: a hot steady wind, sand hissing along the walls
    const w=band('bandpass',620,.6,.045);lfo(.05,260,w.fl.frequency);lfo(.09,.025,w.g.gain);const h=band('highpass',4200,.5,.008);lfo(.21,.006,h.g.gain)}
  else if(TH.graves){// the graveyard: a low wind in the dead trees, and quieter crickets than in summer
    const w=band('bandpass',380,.8,.05);lfo(.05,180,w.fl.frequency);lfo(.11,.03,w.g.gain);
    const o=c.createOscillator(),g=c.createGain(),am=c.createGain();o.frequency.value=3900;g.gain.value=.0018;am.gain.value=.5;o.connect(am);am.connect(g);g.connect(g0);o.start();keep(o);
    const sq=c.createOscillator(),sg=c.createGain();sq.type='square';sq.frequency.value=23;sg.gain.value=.5;sq.connect(sg);sg.connect(am.gain);sq.start();keep(sq)}
  else{const w=band('bandpass',700,.6,.03);lfo(.06,300,w.fl.frequency);lfo(.13,.015,w.g.gain);
    // crickets
    const o=c.createOscillator(),g=c.createGain(),am=c.createGain();o.frequency.value=4400;g.gain.value=.0035;am.gain.value=.5;o.connect(am);am.connect(g);g.connect(g0);o.start();keep(o);
    const sq=c.createOscillator(),sg=c.createGain();sq.type='square';sq.frequency.value=31;sg.gain.value=.5;sq.connect(sg);sg.connect(am.gain);sq.start();keep(sq)}}

// random events and distance volume — every frame
function sndUpdate(dt){const c=Snd.ctx;if(!c||c.state!=='running')return;const T=Snd.t,now=c.currentTime;
  const due=(k,a,b)=>{if(T[k]===undefined)T[k]=now+rr(a,b);if(now<T[k])return false;T[k]=now+rr(a,b);return true};
  if(TH.glyphs&&due('grind',16,34)){const s=noiseSrc(),f=c.createBiquadFilter(),g=c.createGain();f.type='bandpass';f.frequency.value=180;f.Q.value=2;s.connect(f);f.connect(g);g.connect(Snd.bus);
    env(g,now,.8,.12,2.2);s.stop(now+3.2)}                                              // a stone slab grinding somewhere far off
  if(TH.water&&due('slosh',3,8)){const f=rr(500,900);tone(f,f*.6,'sine',.03,.18);burst(rr(700,1100),2,'bandpass',.04,.2)}
  if(TH.indoor){
    if(!TH.dry&&due('drip',TH.water?2:6,TH.water?5:14)){const f=rr(1300,2400);tone(f,f*.55,'sine',.02,.09)}   // distant drips; near ones come from puddles
    if(due('rumble',14,30))burst(120,.7,'lowpass',.12,1.6);
    if(TH.torch==='candle'&&due('wind',8,18)){const s=noiseSrc(),f=c.createBiquadFilter(),g=c.createGain();f.type='bandpass';f.frequency.setValueAtTime(300,now);f.frequency.linearRampToValueAtTime(700,now+2);f.Q.value=4;
      s.connect(f);f.connect(g);g.connect(Snd.bus);g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(.04,now+1.2);g.gain.exponentialRampToValueAtTime(.0001,now+3.2);s.stop(now+3.3)}}
  else if(TH.snow){if(due('crow',10,25)){for(let i=0;i<ri(1,3);i++){const t=now+i*.38;tone(620,430,'sawtooth',.025,.22,t,.01)}}}
  else if(TH.graves){// an owl, crows, and now and then the chapel bell tolling far off
    if(due('owl',8,18)){const t=now;tone(380,330,'sine',.04,.35,t,.08);tone(390,320,'sine',.035,.5,t+.55,.1)}
    if(due('crow',12,28)){for(let i=0;i<ri(1,3);i++){const t=now+i*.4;tone(600,420,'sawtooth',.022,.22,t,.01)}}
    if(due('bell',30,60)){for(let i=0;i<ri(2,4);i++){const t=now+i*3.2;for(const [f,k] of [[196,1],[392,.5],[466,.3],[587,.25],[784,.15]])tone(f,f*.995,'sine',.035*k,4,t,.005)}}}
  else if(TH.dunes){if(due('hawk',14,30)){const t=now;tone(2200,1500,'sine',.018,.6,t,.05);tone(2000,1300,'sine',.012,.5,t+.7,.05)}
    if(due('gust',6,14)){const s=noiseSrc(),f=c.createBiquadFilter(),g=c.createGain();f.type='bandpass';f.Q.value=1;f.frequency.setValueAtTime(400,now);f.frequency.linearRampToValueAtTime(1200,now+1.5);
      s.connect(f);f.connect(g);g.connect(Snd.bus);env(g,now,1,.05,2);s.stop(now+3.2)}}
  else{if(due('bird',2.5,8)){let t=now;const b=rr(2400,3600);for(let i=0;i<ri(2,6);i++){tone(b*rr(.9,1.2),b*rr(1.1,1.6),'sine',.02,rr(.05,.1),t,.004);t+=rr(.08,.16)}}}
  // listener = camera (for positional sounds)
  const L=c.listener,f=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
  if(L.positionX){L.positionX.value=pl.x;L.positionY.value=pl.y;L.positionZ.value=pl.z;L.forwardX.value=f.x;L.forwardY.value=f.y;L.forwardZ.value=f.z;L.upX.value=0;L.upY.value=1;L.upZ.value=0}
  else{L.setPosition(pl.x,pl.y,pl.z);L.setOrientation(f.x,f.y,f.z,0,1,0)}
  // torches: flame hum and nearby crackles
  let dn=99;for(const l of W.lights){const d=Math.hypot(l.x-pl.x,l.z-pl.z);if(d<dn)dn=d}
  const near=Math.max(0,1-dn/6);Snd.torchG.gain.setTargetAtTime(near*near*.09,now,.15);
  if(near>0&&rnd()<dt*14*near)burst(rr(1800,5200),.8,'bandpass',.12*near,rr(.008,.025));
  musicUpdate(dt)}

// footsteps: separate sound for stone, grass and snow
function sndStep(run){const c=Snd.ctx;if(!c||c.state!=='running')return;const k=run?1.3:1,t=c.currentTime;
  if(TH.water){// wading: a slosh and a splash, the water closing round the boot
    burst(rr(600,900),1.4,'bandpass',.16*k,.14,t);burst(rr(1800,2600),1.2,'bandpass',.06*k,.1,t+.03);tone(rr(300,420),180,'sine',.04*k,.1,t+.02)}
  else if(TH.sand){for(let i=0;i<ri(2,4);i++)burst(rr(1800,3200),.8,'bandpass',.04*k,.03,t+i*.02);burst(380,.7,'lowpass',.1*k,.09,t)}   // dry sand crunching
  else if(TH.snow){for(let i=0;i<ri(3,6);i++)burst(rr(2500,5000),.7,'highpass',.05*k,.02,t+i*.014+rr(0,.006));burst(500,.6,'lowpass',.12*k,.12,t)}
  else if(TH.outdoor){burst(rr(2000,3000),.6,'bandpass',.06*k,.08,t);burst(rr(500,800),.8,'bandpass',.08*k,.06,t)}
  else{burst(rr(900,1500),1.2,'bandpass',.16*k,.06,t);tone(130,60,'sine',.12*k,.07,t)}}
function sndLevel(){const c=Snd.ctx;if(!c)return;const t=c.currentTime;[523,659,784,1047,1319].forEach((f,i)=>tone(f,f*1.001,'sine',.07,.9,t+i*.11,.01))}
function sndClick(){const c=Snd.ctx;if(!c)return;tone(420,260,'triangle',.05,.06)}

// sound from a world point: panning + distance falloff
// sound from a world point. panner nodes are created once and reused round-robin:
// previously each step/drip made a new HRTF node, and long sessions choked the browser
function at(x,y,z){const c=Snd.ctx;
  if(!Snd.pans){Snd.pans=[];Snd.panI=0;for(let i=0;i<10;i++){const p=c.createPanner();p.panningModel='equalpower';p.distanceModel='inverse';p.refDistance=1.5;p.maxDistance=40;p.rolloffFactor=1.3;p.connect(Snd.bus);Snd.pans.push(p)}}
  const p=Snd.pans[Snd.panI++%Snd.pans.length];if(p.positionX){p.positionX.value=x;p.positionY.value=y;p.positionZ.value=z}else p.setPosition(x,y,z);return p}
const sndOk=()=>Snd.ctx&&Snd.ctx.state==='running';
function sndLantern(x,z){if(!sndOk())return;const p=at(x,.9,z),t=Snd.ctx.currentTime;   // wraith: its lantern chain clinks, the robe whispers
  const f=rr(2300,3100);tone(f,f*.98,'triangle',.035,.09,t,.002,p);if(rnd()<.5)tone(f*1.33,f*1.3,'triangle',.02,.07,t+.05,.002,p);
  burst(rr(500,800),.8,'bandpass',.05,.35,t,p)}
function sndSkitter(x,z){if(!sndOk())return;const p=at(x,.15,z),t=Snd.ctx.currentTime;   // spider: dry chitin ticks of many feet
  for(let i=0;i<3;i++)burst(rr(3200,5200),9,'bandpass',.13,.012,t+i*.035+rr(0,.015),p)}
function sndHiss(x,z){if(!sndOk())return;const p=at(x,.4,z),t=Snd.ctx.currentTime,c=Snd.ctx;   // spider spotted you: a hiss and clacking fangs
  const sN=noiseSrc(),f=c.createBiquadFilter(),g=c.createGain();f.type='highpass';f.frequency.value=3800;sN.connect(f);f.connect(g);g.connect(p);env(g,t,.05,.22,.7);sN.stop(t+.9);
  for(let i=0;i<6;i++)burst(rr(1800,2600),12,'bandpass',.22,.018,t+.15+i*.07,p)}
function sndWail(x,z){if(!sndOk())return;const p=at(x,1.5,z),c=Snd.ctx,t=c.currentTime;   // wraith spotted you: a hollow rising wail and a breath of air
  for(const [f,dt] of [[240,0],[243.5,.06],[361,.12]]){const o=c.createOscillator(),v=c.createOscillator(),vg=c.createGain(),g=c.createGain();o.type='sine';
    o.frequency.setValueAtTime(f,t+dt);o.frequency.linearRampToValueAtTime(f*1.5,t+dt+.7);o.frequency.linearRampToValueAtTime(f*1.12,t+dt+1.6);
    v.frequency.value=5.5;vg.gain.value=f*.025;v.connect(vg);vg.connect(o.frequency);o.connect(g);g.connect(p);
    g.gain.setValueAtTime(.0001,t+dt);g.gain.exponentialRampToValueAtTime(f>300?.05:.09,t+dt+.35);g.gain.exponentialRampToValueAtTime(.0001,t+dt+1.7);
    o.start(t+dt);v.start(t+dt);o.stop(t+dt+1.75);v.stop(t+dt+1.75)}
  const sN=noiseSrc(),fl=c.createBiquadFilter(),g=c.createGain();fl.type='bandpass';fl.frequency.setValueAtTime(700,t);fl.frequency.linearRampToValueAtTime(1500,t+.8);fl.Q.value=2;
  sN.connect(fl);fl.connect(g);g.connect(p);env(g,t,.4,.14,1.1);sN.stop(t+1.6)}
function sndShriek(x,z){if(!sndOk())return;const p=at(x,1.5,z),c=Snd.ctx,t=c.currentTime;   // the watcher's scream: a piercing wavering cry, wet and shrill, heard far off
  for(const [f,k,dt] of [[1240,1,0],[1316,.6,.03],[1870,.4,.05],[620,.5,0]]){const o=c.createOscillator(),v=c.createOscillator(),vg=c.createGain(),g=c.createGain();o.type=f>1000?'sawtooth':'triangle';
    o.frequency.setValueAtTime(f*.8,t+dt);o.frequency.exponentialRampToValueAtTime(f*1.18,t+dt+.25);o.frequency.exponentialRampToValueAtTime(f*.7,t+dt+1.5);
    v.frequency.value=11;vg.gain.value=f*.04;v.connect(vg);vg.connect(o.frequency);const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=4200;o.connect(lp);lp.connect(g);
    g.connect(p);g.connect(Snd.bus);env(g,t+dt,.06,.05*k,1.45);o.start(t+dt);v.start(t+dt);o.stop(t+dt+1.6);v.stop(t+dt+1.6)}
  burst(2400,1.5,'bandpass',.12,.5,t,p)}
function sndSquelch(x,z){if(!sndOk())return;const p=at(x,1.4,z),t=Snd.ctx.currentTime;   // the watcher drifting: a soft wet pulse, like a slow heartbeat
  tone(70,48,'sine',.06,.16,t,.01,p);tone(64,44,'sine',.04,.14,t+.22,.01,p)}
function sndCaught(){if(!sndOk())return;const t=Snd.ctx.currentTime;[110,116.5,155].forEach(f=>tone(f,f*.7,'sawtooth',.12,1.4,t,.01));burst(200,.5,'lowpass',.4,1.2,t)}
function sndPickup(k){if(!sndOk())return;const t=Snd.ctx.currentTime,seq=k==='key'?[659,880,1175]:k==='map'?[523,659,784]:k==='gem'?[1568,1976,2349,3136]:[1047,1319];
  seq.forEach((f,i)=>tone(f,f,'triangle',.08,.35,t+i*.08,.005))}
// chest lid on rusty hinges: a loud creak. a dry hinge pin sticks and slips; every slip is a click that rings the
// boards of the chest. the clicks come as fast as the lid moves (quick at first, slow and distinct as it eases open),
// never quite evenly, and go through three wood resonances. then the lid settles against its stop. shadows hear it (chestNoise)
// a chest opening, in the order it happens: the iron hasp clacks, the lid comes unstuck with a dull knock, the hinges
// creak while it swings (the lid animation takes about .5 s), the lid lands against its stop, the contents settle
function sndChestOpen(x,z){if(!sndOk())return;const c=Snd.ctx,t=c.currentTime,dest=x===undefined?Snd.bus:at(x,.5,z);
  // hasp: two metal clicks and a short ring
  burst(rr(2600,3200),7,'bandpass',.5,.035,t,dest);burst(rr(4200,5000),9,'bandpass',.3,.025,t+.045,dest);tone(1850,1780,'triangle',.06,.12,t+.045,.002,dest);
  // the lid comes unstuck: a dull wooden knock
  burst(220,1.2,'lowpass',.55,.09,t+.1,dest);tone(140,95,'sine',.18,.1,t+.1,.003,dest);
  // hinges: a click train that starts quick and slows down as the lid swings, through three resonances
  const sr=c.sampleRate,dur=.42,N=Math.floor(sr*dur),b=c.createBuffer(1,N,sr),d=b.getChannelData(0);
  for(let ts=.01;ts<dur-.02;){const u=ts/dur,rate=22+90*Math.pow(1-u,1.6),i=Math.floor(ts*sr),a=rr(.55,1)*Math.min(1,ts/.05)*(u>.85?(1-u)/.15+.2:1);
    d[i]+=a;if(i+1<N)d[i+1]-=a*.6;ts+=rr(.75,1.3)/rate}
  const src=c.createBufferSource(),out=c.createGain();src.buffer=b;out.gain.value=2.6;out.connect(dest);
  for(const [f,q,k] of [[rr(480,600),5,1],[rr(1100,1350),6,.6],[rr(2300,2700),8,.3]]){const bp=c.createBiquadFilter(),g=c.createGain();bp.type='bandpass';bp.frequency.value=f;bp.Q.value=q;g.gain.value=k*q;
    src.connect(bp);bp.connect(g);g.connect(out)}
  src.start(t+.14);
  // the air under the lid: a soft rising swish
  {const n=noiseSrc(),f=c.createBiquadFilter(),g=c.createGain();f.type='bandpass';f.Q.value=1.4;f.frequency.setValueAtTime(350,t+.15);f.frequency.exponentialRampToValueAtTime(1100,t+.5);
    n.connect(f);f.connect(g);g.connect(dest);env(g,t+.15,.18,.05,.3);n.stop(t+.7)}
  // the lid lands against its stop: a heavy thud with a wooden body and a hinge rattle
  const hit=t+.55;burst(160,.8,'lowpass',2.6,.2,hit,dest);tone(105,62,'sine',.5,.22,hit,.004,dest);burst(420,3,'bandpass',.9,.08,hit,dest);
  for(let i=0;i<3;i++)burst(rr(1800,2600),8,'bandpass',.08,.03,hit+.05+i*.04,dest);
  // the contents settle: a couple of faint clinks
  for(let i=0;i<2;i++){const f=rr(2800,3800);tone(f,f*.97,'sine',.03,.12,hit+.12+i*.07+rr(0,.03),.002,dest)}}
function sndCoins(){if(!sndOk())return;const t=Snd.ctx.currentTime;for(let i=0;i<9;i++){const f=rr(2600,4200);tone(f,f*.98,'sine',.04,.12,t+i*.035+rr(0,.02),.002)}}
function sndCoinClink(x,z,k=1){if(!sndOk())return;const p=at(x,.05,z),t=Snd.ctx.currentTime;   // coin on stone: a bright ring and a short rattle
  for(let i=0;i<(k<1?2:4);i++){const f=rr(3200,4600);tone(f,f*.97,'sine',.09*k,.18,t+i*.05*(1+i*.3),.001,p)}burst(rr(4000,6000),9,'bandpass',.12*k,.02,t,p)}
function sndLocked(){if(!sndOk())return;const t=Snd.ctx.currentTime;burst(900,6,'bandpass',.25,.12,t);tone(220,180,'square',.05,.15,t)}
function sndGate(){if(!sndOk())return;const t=Snd.ctx.currentTime;for(let i=0;i<22;i++)burst(rr(700,1600),5,'bandpass',.1,.05,t+i*.08+rr(0,.03));tone(90,70,'sawtooth',.08,1.8,t,.2)}
function sndIgnite(){if(!sndOk())return;const c=Snd.ctx,t=c.currentTime,s=noiseSrc(),f=c.createBiquadFilter(),g=c.createGain();f.type='bandpass';f.Q.value=1.2;
  f.frequency.setValueAtTime(300,t);f.frequency.exponentialRampToValueAtTime(2500,t+.35);s.connect(f);f.connect(g);g.connect(Snd.bus);env(g,t,.05,.25,.45);s.stop(t+.6)}
function sndDrip(x,z){if(!sndOk())return;const p=at(x,.1,z),f=rr(1400,2300),t=Snd.ctx.currentTime;tone(f,f*.5,'sine',.25,.08,t,.002,p);tone(f*1.3,f*.7,'sine',.1,.06,t+.07,.002,p)}
function sndUrn(){if(!sndOk())return;const t=Snd.ctx.currentTime;burst(500,3,'bandpass',.3,.12,t);burst(1200,6,'bandpass',.15,.08,t+.12);tone(320,300,'triangle',.06,.25,t+.05)}
function sndLockStart(){if(!sndOk())return;const t=Snd.ctx.currentTime;burst(2200,8,'bandpass',.2,.05,t);burst(1500,6,'bandpass',.15,.05,t+.07)}
function sndPickScrape(){if(!sndOk())return;burst(rr(3000,5000),9,'bandpass',.05,.03)}
function sndUnlock(){if(!sndOk())return;const t=Snd.ctx.currentTime;burst(900,5,'bandpass',.4,.08,t);burst(400,3,'bandpass',.35,.15,t+.06);tone(180,120,'square',.05,.12,t+.05)}
// a lockpick snaps: a loud crack in the lock, a short metallic ring, then the broken tip tinkling down
function sndPickBreak(x,z){if(!sndOk())return;const t=Snd.ctx.currentTime,p=x===undefined?Snd.bus:at(x,.6,z);
  burst(4200,10,'bandpass',.7,.04,t,p);burst(2600,8,'bandpass',.45,.06,t+.02,p);burst(1200,4,'bandpass',.3,.05,t+.01,p);tone(1800,600,'triangle',.1,.15,t,.005,p);
  tone(3400,3300,'sine',.04,.35,t+.03,.002,p);for(const [d,f] of [[.22,5200],[.31,4600],[.37,5600]])burst(f,14,'bandpass',.14,.02,t+d,p)}
function sndBless(){if(!sndOk())return;const t=Snd.ctx.currentTime;[293.7,370,440,587.3].forEach((f,i)=>tone(f,f,'triangle',.05,2.2,t+i*.12,.4))}

// ---------- music: nordic choir ("ah" formants) and drone; louder near the exit and in chases, drums in chases ----------
function choirNote(f,t,dur,vol,dest){const c=Snd.ctx,g=c.createGain(),f1=c.createBiquadFilter(),f2=c.createBiquadFilter(),lp=c.createBiquadFilter(),vib=c.createOscillator(),vg=c.createGain();
  f1.type=f2.type='bandpass';f1.frequency.value=720;f1.Q.value=5;f2.frequency.value=1180;f2.Q.value=7;lp.type='lowpass';lp.frequency.value=2600;
  vib.frequency.value=4.8;vg.gain.value=f*.006;vib.connect(vg);vib.start(t);vib.stop(t+dur+.1);
  for(const det of [-7,0,6]){const o=c.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=det;vg.connect(o.frequency);o.connect(f1);o.connect(f2);o.start(t);o.stop(t+dur+.1)}
  f1.connect(lp);f2.connect(lp);lp.connect(g);g.connect(dest||Snd.bus);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+dur*.35);g.gain.setValueAtTime(vol,t+dur*.6);g.gain.exponentialRampToValueAtTime(.0001,t+dur)}
// D minor: Dm — B♭ — C — Am, slow, overlapping
const MUS_CHORDS=[[146.8,174.6,220,293.7],[116.5,146.8,174.6,233.1],[130.8,164.8,196,261.6],[110,130.8,164.8,220]];
function musicUpdate(dt){const c=Snd.ctx;if(!c||c.state!=='running'||!G||!W)return;
  if(!Snd.mus){Snd.mus=c.createGain();Snd.mus.gain.value=0;Snd.mus.connect(Snd.out);Snd.mus.connect(Snd.send);Snd.musT=0;Snd.musI=0;Snd.drumT=0}
  const chase=(G.monsters||[]).some(m=>m.mode==='chase'&&!(m.stun>0)),de=W.exitPos?Math.hypot(W.exitPos.x-pl.x,W.exitPos.z-pl.z):99;
  const want=S.music*(chase?1:de<10?.75:.4);Snd.mus.gain.setTargetAtTime(want,c.currentTime,1.2);
  if((Snd.musT-=dt)<=0){Snd.musT=7.5;const ch=MUS_CHORDS[Snd.musI++%MUS_CHORDS.length],t=c.currentTime;ch.forEach((f,i)=>choirNote(f,t+i*.25,10,i?.035:.045,Snd.mus))}
  if(chase&&(Snd.drumT-=dt)<=0){Snd.drumT=.72;const t=c.currentTime;tone(75,42,'sine',.55,.28,t,.004,Snd.mus);burst(180,.7,'lowpass',.35,.2,t,Snd.mus)}}
