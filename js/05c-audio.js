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
    if(due('drip',1.2,5)){const f=rr(1300,2400);tone(f,f*.55,'sine',.05,.09);if(rnd()<.5)tone(f*1.1,f*.6,'sine',.03,.07,now+.13)}
    if(due('rumble',14,30))burst(120,.7,'lowpass',.12,1.6);
    if(TH.torch==='candle'&&due('wind',8,18)){const s=noiseSrc(),f=c.createBiquadFilter(),g=c.createGain();f.type='bandpass';f.frequency.setValueAtTime(300,now);f.frequency.linearRampToValueAtTime(700,now+2);f.Q.value=4;
      s.connect(f);f.connect(g);g.connect(Snd.bus);g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(.04,now+1.2);g.gain.exponentialRampToValueAtTime(.0001,now+3.2);s.stop(now+3.3)}}
  else if(TH.snow){if(due('crow',10,25)){for(let i=0;i<ri(1,3);i++){const t=now+i*.38;tone(620,430,'sawtooth',.025,.22,t,.01)}}}
  else{if(due('bird',2.5,8)){let t=now;const b=rr(2400,3600);for(let i=0;i<ri(2,6);i++){tone(b*rr(.9,1.2),b*rr(1.1,1.6),'sine',.02,rr(.05,.1),t,.004);t+=rr(.08,.16)}}}
  // факелы: гул пламени и щелчки рядом
  let dn=99;for(const l of W.lights){const d=Math.hypot(l.x-pl.x,l.z-pl.z);if(d<dn)dn=d}
  const near=Math.max(0,1-dn/6);Snd.torchG.gain.setTargetAtTime(near*near*.09,now,.15);
  if(near>0&&rnd()<dt*14*near)burst(rr(1800,5200),.8,'bandpass',.12*near,rr(.008,.025));
  const de=Math.hypot(W.exitPos.x-pl.x,W.exitPos.z-pl.z),ne=Math.max(0,1-de/14);Snd.exitG.gain.setTargetAtTime(ne*ne*.035,now,.3)}

// шаги: свой звук для камня, травы и снега
function sndStep(run){const c=Snd.ctx;if(!c||c.state!=='running')return;const k=run?1.3:1,t=c.currentTime;
  if(TH.snow){for(let i=0;i<ri(3,6);i++)burst(rr(2500,5000),.7,'highpass',.05*k,.02,t+i*.014+rr(0,.006));burst(500,.6,'lowpass',.12*k,.12,t)}
  else if(TH.outdoor){burst(rr(2000,3000),.6,'bandpass',.06*k,.08,t);burst(rr(500,800),.8,'bandpass',.08*k,.06,t)}
  else{burst(rr(900,1500),1.2,'bandpass',.16*k,.06,t);tone(130,60,'sine',.12*k,.07,t)}}
function sndLevel(){const c=Snd.ctx;if(!c)return;const t=c.currentTime;[523,659,784,1047,1319].forEach((f,i)=>tone(f,f*1.001,'sine',.07,.9,t+i*.11,.01))}
function sndClick(){const c=Snd.ctx;if(!c)return;tone(420,260,'triangle',.05,.06)}
