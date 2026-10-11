'use strict';
// ---------- звук: всё синтезируется WebAudio на лету, без файлов ----------
const Snd={ctx:null,amb:[],t:{}};
function audioInit(){
  if(Snd.ctx){if(Snd.ctx.state==='suspended')Snd.ctx.resume();return}
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  const c=Snd.ctx=new AC();
  Snd.out=c.createGain();Snd.out.gain.value=S.vol;Snd.out.connect(c.destination);
  Snd.bus=c.createGain();Snd.bus.connect(Snd.out);                       // сухой сигнал
  Snd.rev=c.createConvolver();Snd.send=c.createGain();Snd.bus.connect(Snd.send);Snd.send.connect(Snd.rev);Snd.rev.connect(Snd.out);
  const len=c.sampleRate*2,b=c.createBuffer(1,len,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;Snd.noise=b;
  // постоянные источники: факелы и гул выхода, громкость меняется по расстоянию
  Snd.torchG=c.createGain();Snd.torchG.gain.value=0;const tn=noiseSrc(),tf=c.createBiquadFilter();tf.type='lowpass';tf.frequency.value=420;tn.connect(tf);tf.connect(Snd.torchG);Snd.torchG.connect(Snd.bus);
  Snd.exitG=c.createGain();Snd.exitG.gain.value=0;const ef=c.createBiquadFilter();ef.type='lowpass';ef.frequency.value=900;ef.connect(Snd.exitG);Snd.exitG.connect(Snd.bus);
  for(const [f,ty] of [[220,'triangle'],[330.5,'sine'],[440.8,'sine'],[110,'sine']]){const o=c.createOscillator();o.type=ty;o.frequency.value=f;o.connect(ef);o.start()}
  if(TH)sndTheme()}
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

// фон для темы
function sndTheme(){const c=Snd.ctx;if(!c)return;
  for(const n of Snd.amb){try{n.stop?n.stop():n.disconnect()}catch(e){}}Snd.amb=[];Snd.t={};
  Snd.rev.buffer=TH.indoor?impulse(2.8,3.2):impulse(1.2,5);Snd.send.gain.value=TH.indoor?.55:.12;
  const keep=(...n)=>Snd.amb.push(...n);
  const g0=c.createGain();g0.connect(Snd.bus);keep(g0);
  const lfo=(freq,depth,param)=>{const o=c.createOscillator(),g=c.createGain();o.frequency.value=freq;g.gain.value=depth;o.connect(g);g.connect(param);o.start();keep(o)};
  const band=(type,f,q,gain)=>{const s=noiseSrc(),fl=c.createBiquadFilter(),g=c.createGain();fl.type=type;fl.frequency.value=f;fl.Q.value=q;g.gain.value=gain;s.connect(fl);fl.connect(g);g.connect(g0);keep(s);return {fl,g}};
  if(TH.indoor){
    const low=TH.torch==='candle'?41:55;
    for(const f of [low,low*1.012,low*1.5]){const o=c.createOscillator(),g=c.createGain(),fl=c.createBiquadFilter();o.type='sawtooth';o.frequency.value=f;fl.type='lowpass';fl.frequency.value=140;g.gain.value=.03;o.connect(fl);fl.connect(g);g.connect(g0);o.start();keep(o)}
    const r=band('bandpass',260,.6,.02);lfo(.05,90,r.fl.frequency)}
  else if(TH.snow){const w=band('bandpass',520,.7,.07);lfo(.07,320,w.fl.frequency);lfo(.11,.04,w.g.gain);
    const h=band('bandpass',1300,6,.012);lfo(.09,500,h.fl.frequency);band('lowpass',180,.5,.05)}
  else{const w=band('bandpass',700,.6,.03);lfo(.06,300,w.fl.frequency);lfo(.13,.015,w.g.gain);
    // сверчки
    const o=c.createOscillator(),g=c.createGain(),am=c.createGain();o.frequency.value=4400;g.gain.value=.0035;am.gain.value=.5;o.connect(am);am.connect(g);g.connect(g0);o.start();keep(o);
    const sq=c.createOscillator(),sg=c.createGain();sq.type='square';sq.frequency.value=31;sg.gain.value=.5;sq.connect(sg);sg.connect(am.gain);sq.start();keep(sq)}}

// случайные события и громкость по расстоянию — каждый кадр
function sndUpdate(dt){const c=Snd.ctx;if(!c||c.state!=='running')return;const T=Snd.t,now=c.currentTime;
  const due=(k,a,b)=>{if(T[k]===undefined)T[k]=now+rr(a,b);if(now<T[k])return false;T[k]=now+rr(a,b);return true};
  if(TH.indoor){
    if(due('drip',6,14)){const f=rr(1300,2400);tone(f,f*.55,'sine',.02,.09)}   // далёкие капли; ближние — из луж
    if(due('rumble',14,30))burst(120,.7,'lowpass',.12,1.6);
    if(TH.torch==='candle'&&due('wind',8,18)){const s=noiseSrc(),f=c.createBiquadFilter(),g=c.createGain();f.type='bandpass';f.frequency.setValueAtTime(300,now);f.frequency.linearRampToValueAtTime(700,now+2);f.Q.value=4;
      s.connect(f);f.connect(g);g.connect(Snd.bus);g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(.04,now+1.2);g.gain.exponentialRampToValueAtTime(.0001,now+3.2);s.stop(now+3.3)}}
  else if(TH.snow){if(due('crow',10,25)){for(let i=0;i<ri(1,3);i++){const t=now+i*.38;tone(620,430,'sawtooth',.025,.22,t,.01)}}}
  else{if(due('bird',2.5,8)){let t=now;const b=rr(2400,3600);for(let i=0;i<ri(2,6);i++){tone(b*rr(.9,1.2),b*rr(1.1,1.6),'sine',.02,rr(.05,.1),t,.004);t+=rr(.08,.16)}}}
  // слушатель = камера (для звуков с позицией)
  const L=c.listener,f=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
  if(L.positionX){L.positionX.value=pl.x;L.positionY.value=pl.y;L.positionZ.value=pl.z;L.forwardX.value=f.x;L.forwardY.value=f.y;L.forwardZ.value=f.z;L.upX.value=0;L.upY.value=1;L.upZ.value=0}
  else{L.setPosition(pl.x,pl.y,pl.z);L.setOrientation(f.x,f.y,f.z,0,1,0)}
  // факелы: гул пламени и щелчки рядом
  let dn=99;for(const l of W.lights){const d=Math.hypot(l.x-pl.x,l.z-pl.z);if(d<dn)dn=d}
  const near=Math.max(0,1-dn/6);Snd.torchG.gain.setTargetAtTime(near*near*.09,now,.15);
  if(near>0&&rnd()<dt*14*near)burst(rr(1800,5200),.8,'bandpass',.12*near,rr(.008,.025));
  const de=Math.hypot(W.exitPos.x-pl.x,W.exitPos.z-pl.z),ne=Math.max(0,1-de/14);Snd.exitG.gain.setTargetAtTime(ne*ne*.035,now,.3);
  musicUpdate(dt)}

// шаги: свой звук для камня, травы и снега
function sndStep(run){const c=Snd.ctx;if(!c||c.state!=='running')return;const k=run?1.3:1,t=c.currentTime;
  if(TH.snow){for(let i=0;i<ri(3,6);i++)burst(rr(2500,5000),.7,'highpass',.05*k,.02,t+i*.014+rr(0,.006));burst(500,.6,'lowpass',.12*k,.12,t)}
  else if(TH.outdoor){burst(rr(2000,3000),.6,'bandpass',.06*k,.08,t);burst(rr(500,800),.8,'bandpass',.08*k,.06,t)}
  else{burst(rr(900,1500),1.2,'bandpass',.16*k,.06,t);tone(130,60,'sine',.12*k,.07,t)}}
function sndLevel(){const c=Snd.ctx;if(!c)return;const t=c.currentTime;[523,659,784,1047,1319].forEach((f,i)=>tone(f,f*1.001,'sine',.07,.9,t+i*.11,.01))}
function sndClick(){const c=Snd.ctx;if(!c)return;tone(420,260,'triangle',.05,.06)}

// звук из точки мира: панорама + затухание с расстоянием
// звук из точки мира. Узлы панорамы созданы один раз и переиспользуются по кругу:
// раньше на каждый шаг/каплю создавался новый HRTF-узел, и при долгой игре браузер захлёбывался
function at(x,y,z){const c=Snd.ctx;
  if(!Snd.pans){Snd.pans=[];Snd.panI=0;for(let i=0;i<10;i++){const p=c.createPanner();p.panningModel='equalpower';p.distanceModel='inverse';p.refDistance=1.5;p.maxDistance=40;p.rolloffFactor=1.3;p.connect(Snd.bus);Snd.pans.push(p)}}
  const p=Snd.pans[Snd.panI++%Snd.pans.length];if(p.positionX){p.positionX.value=x;p.positionY.value=y;p.positionZ.value=z}else p.setPosition(x,y,z);return p}
const sndOk=()=>Snd.ctx&&Snd.ctx.state==='running';
function sndMonsterStep(x,z){if(!sndOk())return;const p=at(x,.3,z),t=Snd.ctx.currentTime;   // скелет: сухой стук костей
  burst(rr(1800,2800),6,'bandpass',.35,.03,t,p);burst(rr(900,1400),5,'bandpass',.25,.04,t+.03,p);if(rnd()<.4)burst(rr(2500,3500),8,'bandpass',.18,.02,t+.08,p)}
function sndGrowl(x,z){if(!sndOk())return;const p=at(x,1.5,z),t=Snd.ctx.currentTime;   // скелет заметил: дребезжание костей и шипение
  for(let i=0;i<14;i++)burst(rr(1500,3200),7,'bandpass',.3,.025,t+i*.045+rr(0,.02),p);
  const c=Snd.ctx,sN=noiseSrc(),f=c.createBiquadFilter(),g=c.createGain();f.type='bandpass';f.frequency.value=2600;f.Q.value=1.5;sN.connect(f);f.connect(g);g.connect(p);env(g,t+.1,.2,.18,.9);sN.stop(t+1.3)}
function sndCaught(){if(!sndOk())return;const t=Snd.ctx.currentTime;[110,116.5,155].forEach(f=>tone(f,f*.7,'sawtooth',.12,1.4,t,.01));burst(200,.5,'lowpass',.4,1.2,t)}
function sndPickup(k){if(!sndOk())return;const t=Snd.ctx.currentTime,seq=k==='key'?[659,880,1175]:k==='map'?[523,659,784]:k==='gem'?[1568,1976,2349,3136]:[1047,1319];
  seq.forEach((f,i)=>tone(f,f,'triangle',.08,.35,t+i*.08,.005))}
function sndChestOpen(){if(!sndOk())return;const c=Snd.ctx,t=c.currentTime,o=c.createOscillator(),f=c.createBiquadFilter(),g=c.createGain();
  o.type='sawtooth';o.frequency.setValueAtTime(140,t);o.frequency.linearRampToValueAtTime(95,t+.5);f.type='bandpass';f.frequency.value=900;f.Q.value=6;
  o.connect(f);f.connect(g);g.connect(Snd.bus);env(g,t,.05,.12,.5);o.start(t);o.stop(t+.6);burst(160,.8,'lowpass',.35,.15,t+.62)}
function sndCoins(){if(!sndOk())return;const t=Snd.ctx.currentTime;for(let i=0;i<9;i++){const f=rr(2600,4200);tone(f,f*.98,'sine',.04,.12,t+i*.035+rr(0,.02),.002)}}
function sndLocked(){if(!sndOk())return;const t=Snd.ctx.currentTime;burst(900,6,'bandpass',.25,.12,t);tone(220,180,'square',.05,.15,t)}
function sndGate(){if(!sndOk())return;const t=Snd.ctx.currentTime;for(let i=0;i<22;i++)burst(rr(700,1600),5,'bandpass',.1,.05,t+i*.08+rr(0,.03));tone(90,70,'sawtooth',.08,1.8,t,.2)}
function sndIgnite(){if(!sndOk())return;const c=Snd.ctx,t=c.currentTime,s=noiseSrc(),f=c.createBiquadFilter(),g=c.createGain();f.type='bandpass';f.Q.value=1.2;
  f.frequency.setValueAtTime(300,t);f.frequency.exponentialRampToValueAtTime(2500,t+.35);s.connect(f);f.connect(g);g.connect(Snd.bus);env(g,t,.05,.25,.45);s.stop(t+.6)}
function sndDrip(x,z){if(!sndOk())return;const p=at(x,.1,z),f=rr(1400,2300),t=Snd.ctx.currentTime;tone(f,f*.5,'sine',.25,.08,t,.002,p);tone(f*1.3,f*.7,'sine',.1,.06,t+.07,.002,p)}
function sndUrn(){if(!sndOk())return;const t=Snd.ctx.currentTime;burst(500,3,'bandpass',.3,.12,t);burst(1200,6,'bandpass',.15,.08,t+.12);tone(320,300,'triangle',.06,.25,t+.05)}
function sndLockStart(){if(!sndOk())return;const t=Snd.ctx.currentTime;burst(2200,8,'bandpass',.2,.05,t);burst(1500,6,'bandpass',.15,.05,t+.07)}
function sndPickScrape(){if(!sndOk())return;burst(rr(3000,5000),9,'bandpass',.05,.03)}
function sndUnlock(){if(!sndOk())return;const t=Snd.ctx.currentTime;burst(900,5,'bandpass',.4,.08,t);burst(400,3,'bandpass',.35,.15,t+.06);tone(180,120,'square',.05,.12,t+.05)}
function sndPickBreak(){if(!sndOk())return;const t=Snd.ctx.currentTime;burst(4200,10,'bandpass',.5,.04,t);burst(2600,8,'bandpass',.3,.06,t+.02);tone(1800,600,'triangle',.08,.15,t)}
function sndBless(){if(!sndOk())return;const t=Snd.ctx.currentTime;[293.7,370,440,587.3].forEach((f,i)=>tone(f,f,'triangle',.05,2.2,t+i*.12,.4))}
// шёпот у Стены слов: шумовые «гласные» через форманты
function sndWhisper(x,z){if(!sndOk())return;const c=Snd.ctx,p=at(x,1.4,z),t=c.currentTime;
  for(const [f,q,g] of [[650,9,.25],[1100,11,.18],[2600,14,.08]]){const s=noiseSrc(),fl=c.createBiquadFilter(),gn=c.createGain();fl.type='bandpass';fl.frequency.value=f*rr(.9,1.1);fl.Q.value=q;
    s.connect(fl);fl.connect(gn);gn.connect(p);env(gn,t,.5,g,1.4);s.stop(t+2.1)}}
function sndWordLearn(){if(!sndOk())return;const t=Snd.ctx.currentTime;for(const [f,d] of [[146.8,0],[220,.15],[293.7,.3],[349.2,.45],[440,.6]])choirNote(f,t+d,3.2,.07)}
function sndShout(){if(!sndOk())return;const c=Snd.ctx,t=c.currentTime;tone(90,35,'sawtooth',.5,.9,t,.01);burst(220,.6,'lowpass',.9,1.1,t);
  const s=noiseSrc(),f=c.createBiquadFilter(),g=c.createGain();f.type='bandpass';f.Q.value=1;f.frequency.setValueAtTime(400,t);f.frequency.exponentialRampToValueAtTime(2400,t+.5);
  s.connect(f);f.connect(g);g.connect(Snd.bus);env(g,t,.02,.6,.7);s.stop(t+.9);for(const fq of [110,164.8,220])choirNote(fq,t+.05,1.4,.1)}

// ---------- музыка: нордский хор (форманты «а») и гул; у выхода и в погоне громче, в погоне — барабаны ----------
function choirNote(f,t,dur,vol,dest){const c=Snd.ctx,g=c.createGain(),f1=c.createBiquadFilter(),f2=c.createBiquadFilter(),lp=c.createBiquadFilter(),vib=c.createOscillator(),vg=c.createGain();
  f1.type=f2.type='bandpass';f1.frequency.value=720;f1.Q.value=5;f2.frequency.value=1180;f2.Q.value=7;lp.type='lowpass';lp.frequency.value=2600;
  vib.frequency.value=4.8;vg.gain.value=f*.006;vib.connect(vg);vib.start(t);vib.stop(t+dur+.1);
  for(const det of [-7,0,6]){const o=c.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=det;vg.connect(o.frequency);o.connect(f1);o.connect(f2);o.start(t);o.stop(t+dur+.1)}
  f1.connect(lp);f2.connect(lp);lp.connect(g);g.connect(dest||Snd.bus);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+dur*.35);g.gain.setValueAtTime(vol,t+dur*.6);g.gain.exponentialRampToValueAtTime(.0001,t+dur)}
// ре минор: Dm — B♭ — C — Am, медленно, с перекрытием
const MUS_CHORDS=[[146.8,174.6,220,293.7],[116.5,146.8,174.6,233.1],[130.8,164.8,196,261.6],[110,130.8,164.8,220]];
function musicUpdate(dt){const c=Snd.ctx;if(!c||c.state!=='running'||!G||!W)return;
  if(!Snd.mus){Snd.mus=c.createGain();Snd.mus.gain.value=0;Snd.mus.connect(Snd.out);Snd.mus.connect(Snd.send);Snd.musT=0;Snd.musI=0;Snd.drumT=0}
  const chase=(G.monsters||[]).some(m=>m.mode==='chase'&&!(m.stun>0)),de=W.exitPos?Math.hypot(W.exitPos.x-pl.x,W.exitPos.z-pl.z):99;
  const want=S.music*(chase?1:de<10?.75:.4);Snd.mus.gain.setTargetAtTime(want,c.currentTime,1.2);
  if((Snd.musT-=dt)<=0){Snd.musT=7.5;const ch=MUS_CHORDS[Snd.musI++%MUS_CHORDS.length],t=c.currentTime;ch.forEach((f,i)=>choirNote(f,t+i*.25,10,i?.035:.045,Snd.mus))}
  if(chase&&(Snd.drumT-=dt)<=0){Snd.drumT=.72;const t=c.currentTime;tone(75,42,'sine',.55,.28,t,.004,Snd.mus);burst(180,.7,'lowpass',.35,.2,t,Snd.mus)}}
