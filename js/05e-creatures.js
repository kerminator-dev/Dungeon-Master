'use strict';
// ---------- обитатели лабиринта: пиксельные спрайты в духе Skyrim ----------
// Каждое существо рисуется кодом в маленьком разрешении (как пиксель-арт), 4 кадра ходьбы.
// Отдельный слой «свечения» (глаза, огоньки) рисуется поверх без затенения — его видно в темноте.
// Модуль не зависит от three.js: его же использует страница выбора sprites.html.

function pxKit(c){const k={c};
  k.r=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))};
  k.p=(x,y,col)=>k.r(x,y,1,1,col);
  k.e=(cx,cy,rx,ry,col)=>{c.fillStyle=col;for(let y=-ry;y<=ry;y++){const w=Math.round(rx*Math.sqrt(Math.max(0,1-(y*y)/(ry*ry+.01))));c.fillRect(Math.round(cx-w),Math.round(cy+y),w*2+1,1)}};
  k.l=(x0,y0,x1,y1,col,t=1)=>{const n=Math.max(1,Math.round(Math.max(Math.abs(x1-x0),Math.abs(y1-y0))));
    for(let i=0;i<=n;i++)k.r(x0+(x1-x0)*i/n-(t-1)/2,y0+(y1-y0)*i/n-(t-1)/2,t,t,col)};
  k.poly=(pts,col)=>{c.fillStyle=col;c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill()};
  return k}
// жёсткие края (без сглаживания) + тёмный контур — классический вид спрайта
function crisp(c,w,h,outline){const id=c.getImageData(0,0,w,h),d=id.data,a=new Uint8Array(w*h);
  for(let i=0;i<w*h;i++){a[i]=d[i*4+3]>110?1:0;d[i*4+3]=a[i]?255:0}
  if(outline)for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(a[i])continue;
    if((x>0&&a[i-1])||(x<w-1&&a[i+1])||(y>0&&a[i-w])||(y<h-1&&a[i+w])){d[i*4]=outline[0];d[i*4+1]=outline[1];d[i*4+2]=outline[2];d[i*4+3]=255}}
  c.putImageData(id,0,0)}

const WALK=[0,1,0,-1],BOB=[0,-1,0,-1];

const CREATURES={
  draugr:{name:'Draugr',desc:'A withered undead Nord in a horned helmet, eyes glowing blue, an ancient sword in hand.',
    w:40,h:64,height:1.85,
    draw(k,f){const s=WALK[f],b=BOB[f],L=Math.max(0,s)*2,R=Math.max(0,-s)*2;
      // ноги в обмотках
      k.r(14,42,5,19-L,'#3e372c');k.r(21,42,5,19-R,'#3e372c');
      for(let y=44;y<60;y+=3){k.r(14,y-L,5,1,'#5a5040');k.r(21,y-R,5,1,'#5a5040')}
      k.r(13,59-L,7,4,'#241e16');k.r(20,59-R,7,4,'#241e16');
      // рваная туника
      k.poly([[11,22+b],[29,22+b],[31,46],[9,46]],'#4d4434');k.poly([[22,22+b],[29,22+b],[31,46],[24,46]],'#3a3226');
      for(let x=9;x<31;x+=2)k.r(x,46,2,(x*7%5)+1,x%4?'#4d4434':'#3a3226');
      k.l(12,24+b,27,37+b,'#5e4a32',2);k.r(10,37+b,20,3,'#2a2018');k.r(18,37+b,4,3,'#8a7a50');
      // меховые наплечники
      k.e(10,24+b,4,3,'#6a5a44');k.e(30,24+b,4,3,'#5e4e3a');k.r(7,23+b,2,1,'#8a7860');
      // высохшие руки
      k.r(7,26+b,4,15,'#7d6c52');k.r(9,26+b,2,15,'#5c4e3a');k.r(6,41+b,5,3,'#6e5e46');k.r(6,44+b,1,2,'#6e5e46');k.r(9,44+b,1,2,'#6e5e46');
      k.r(29,26+b,4,13,'#7d6c52');k.r(29,26+b,1,13,'#5c4e3a');k.r(29,38+b,5,4,'#6e5e46');
      // древний нордский меч
      k.poly([[31,42+b],[34,42+b],[37,62],[35,63]],'#6e6a60');k.l(32,43+b,35,61,'#9a958a');k.r(28,40+b,9,2,'#3a3026');k.r(31,37+b,3,3,'#2a2018');
      // шея и голова
      k.r(17,19+b,6,4,'#6e5e46');
      k.e(20,14+b,7,8,'#8c7b5f');k.r(13,14+b,3,5,'#6a5a44');k.r(24,14+b,3,5,'#6a5a44');
      k.r(16,18+b,8,4,'#241c14');for(let x=16;x<24;x+=2)k.r(x,18+b,1,1,'#c8bc9a');k.r(19,15+b,2,2,'#3a2e22');
      k.r(15,12+b,4,2,'#2a2018');k.r(21,12+b,4,2,'#2a2018');k.r(16,12+b,2,2,'#bff4ff');k.r(22,12+b,2,2,'#bff4ff');
      // рогатый шлем
      k.poly([[12,11+b],[14,4+b],[20,2+b],[26,4+b],[28,11+b]],'#5d5c58');k.r(12,10+b,16,2,'#44433f');k.r(16,4+b,6,2,'#8d8c86');
      k.poly([[12,8+b],[7,6+b],[4,0+b],[6,0+b],[10,4+b],[13,6+b]],'#cfc4a2');k.poly([[28,8+b],[33,6+b],[36,0+b],[34,0+b],[30,4+b],[27,6+b]],'#b8ad8c')},
    glow(k,f){const b=BOB[f];k.e(17,13+b,2,2,'rgba(120,220,255,.9)');k.e(23,13+b,2,2,'rgba(120,220,255,.9)');
      k.r(16,12+b,2,2,'#ffffff');k.r(22,12+b,2,2,'#ffffff')}},

  skeleton:{name:'Skeleton',desc:'The risen bones of an old warrior with a rusty sword, a wooden shield and cold lights in its eyes.',
    w:44,h:64,height:1.8,
    draw(k,f){const s=WALK[f],b=BOB[f],L=Math.max(0,s)*2,R=Math.max(0,-s)*2,B='#dcd4c0',D='#a89e88';
      k.r(17,42,3,18-L,B);k.r(24,42,3,18-R,B);k.r(16,50-L,5,2,D);k.r(23,50-R,5,2,D);k.r(15,60-L,6,3,B);k.r(23,60-R,6,3,B);
      k.e(22,41,7,3,B);k.r(19,40,6,2,D);
      k.r(21,24+b,2,17,D);for(let i=0;i<5;i++){const y=24+i*3+b;k.r(14+i*.6,y,16-i*1.2,2,i%2?D:B)}
      k.r(13,22+b,18,2,B);
      // правая рука с ржавым мечом
      k.l(31,23+b,34,33+b,B,2);k.l(34,33+b,33,40+b,B,2);k.r(32,39+b,4,3,D);
      k.poly([[32,37+b],[35,37+b],[42,15+b],[40,14+b]],'#8a8780');k.l(34,36+b,41,16+b,'#c0bcb2');k.p(37,28+b,'#8a5a3a');k.p(39,22+b,'#7a4a30');k.r(29,37+b,9,2,'#4a3a2a');k.r(33,39+b,2,3,'#3a2a1a');
      // левая рука и круглый щит
      k.l(13,23+b,10,33+b,B,2);k.e(9,35+b,8,9,'#6a4a2a');k.e(9,35+b,6,7,'#7d5834');k.e(9,35+b,2,2,'#7a7a7a');
      for(let a=0;a<6.28;a+=.4)k.p(9+Math.cos(a)*8,35+b+Math.sin(a)*9,'#5a5a5a');
      k.r(20,19+b,4,4,D);
      k.e(22,12+b,7,8,B);k.r(16,14+b,12,4,'#c8c0aa');k.e(19,12+b,2,2,'#161210');k.e(25,12+b,2,2,'#161210');k.r(21,15+b,2,2,'#2a2420');
      k.r(17,18+b,10,3,'#c8c0aa');for(let x=17;x<27;x+=2)k.r(x,19+b,1,2,'#3a3430')},
    glow(k,f){const b=BOB[f];k.p(19,12+b,'#c8f4ff');k.p(25,12+b,'#c8f4ff');k.e(19,12+b,1,1,'rgba(140,220,255,.7)');k.e(25,12+b,1,1,'rgba(140,220,255,.7)')}},

  ghost:{name:'Ghost',desc:'The spirit of a fallen warrior: translucent, glowing blue, floating above the floor.',
    w:44,h:66,height:1.95,alpha:.72,float:.25,
    draw(k,f){const b=BOB[f],w=f*1.6,A='#2a5c8a',M='#4a9ad0',Lt='#9fdcff';
      // струящийся низ вместо ног
      for(let i=0;i<5;i++){const x=12+i*4,len=10+((i*7+f*3)%7);k.poly([[x,42],[x+5,42],[x+3+Math.sin(w+i)*2,42+len],[x+1,42+len-2]],i%2?A:M)}
      k.poly([[10,22+b],[34,22+b],[35,44],[9,44]],M);k.poly([[22,22+b],[34,22+b],[35,44],[24,44]],A);
      k.r(10,34+b,24,3,A);k.r(20,24+b,4,10,Lt);
      k.e(10,24+b,5,3,Lt);k.e(34,24+b,5,3,M);
      k.r(6,26+b,4,15,M);k.r(34,26+b,4,13,M);
      k.poly([[37,38+b],[39,38+b],[41,58],[39,59]],Lt);k.r(34,36+b,8,2,A);
      k.e(22,14+b,7,8,M);k.poly([[15,16+b],[29,16+b],[27,26+b],[22,29+b],[17,26+b]],Lt);   // борода
      k.r(17,12+b,4,2,A);k.r(23,12+b,4,2,A);
      k.poly([[14,11+b],[16,4+b],[22,2+b],[28,4+b],[30,11+b]],A);k.r(14,10+b,16,2,'#1e4468');k.r(18,4+b,6,2,Lt);
      k.poly([[14,8+b],[9,5+b],[7,0+b],[9,0+b],[12,4+b]],Lt);k.poly([[30,8+b],[35,5+b],[37,0+b],[35,0+b],[32,4+b]],Lt)},
    glow(k,f){const b=BOB[f];k.e(22,30,12,22,'rgba(90,180,255,.07)');k.e(19,13+b,2,1,'rgba(220,250,255,1)');k.e(25,13+b,2,1,'rgba(220,250,255,1)')}},

  wispmother:{name:'Wispmother',desc:'A ghostly maiden of mist circled by wisps whose light shows from afar.',
    w:48,h:70,height:2.05,alpha:.8,float:.3,
    draw(k,f){const b=BOB[f],w=f*1.57,P='#cfe4f6',S='#8fb4d8',D='#5f84aa';
      // платье расходится книзу и колышется
      k.poly([[18,26+b],[30,26+b],[38+Math.sin(w)*2,64],[10+Math.sin(w+1)*2,64]],S);k.poly([[24,26+b],[30,26+b],[38+Math.sin(w)*2,64],[26,64]],D);
      for(let x=10;x<38;x+=3)k.r(x+Math.sin(w+x)*1,62+((x+f)%3),2,3,P);
      k.r(20,27+b,8,8,P);
      // руки разведены
      k.l(19,27+b,9,40+b,P,2);k.l(29,27+b,39,40+b,P,2);k.r(7,40+b,3,2,P);k.r(38,40+b,3,2,P);
      // длинные волосы
      k.poly([[16,8+b],[32,8+b],[34,30+b+Math.sin(w)],[14,30+b+Math.sin(w+2)]],S);
      k.e(24,13+b,5,6,P);k.r(22,12+b,1,2,D);k.r(26,12+b,1,2,D);k.r(23,16+b,3,1,S);
      k.poly([[18,7+b],[30,7+b],[29,4+b],[19,4+b]],P)},
    glow(k,f){const b=BOB[f];k.e(24,34,13,26,'rgba(170,215,255,.07)');
      for(let i=0;i<3;i++){const a=f*1.57+i*2.09,x=24+Math.cos(a)*18,y=30+Math.sin(a)*6+b;k.e(x,y,3,3,'rgba(150,220,255,.65)');k.e(x,y,1,1,'#ffffff')}}},

  falmer:{name:'Falmer',desc:'A blind, hunched cave elf in chitin armour with a jagged blade.',
    w:44,h:58,height:1.6,
    draw(k,f){const s=WALK[f],b=BOB[f],L=Math.max(0,s)*2,R=Math.max(0,-s)*2,S='#9aa4a8',SD='#6e787c',C='#7a6436',CH='#a8904c';
      k.l(16,38,13,56-L,S,3);k.l(26,38,29,56-R,S,3);k.r(11,55-L,6,3,SD);k.r(27,55-R,6,3,SD);
      k.e(21,30+b,10,10,S);k.e(24,30+b,7,9,SD);
      k.poly([[11,22+b],[21,18+b],[32,24+b],[30,32+b],[12,30+b]],C);k.l(14,23+b,29,27+b,CH,1);k.r(12,36+b,18,3,C);k.r(12,36+b,18,1,CH);
      k.l(12,26+b,6,40+b,S,3);k.r(4,40+b,4,3,SD);
      k.l(30,26+b,34,36+b,S,3);
      // зазубренный клинок из хитина
      k.poly([[33,34+b],[37,33+b],[42,48+b],[39,50+b]],'#6a5a30');for(let i=0;i<4;i++)k.p(40+i*.5,37+i*3+b,'#a8904c');
      // голова вперёд, большие уши, нет глаз
      k.e(19,16+b,6,6,S);k.poly([[13,14+b],[3,8+b],[12,17+b]],S);k.poly([[25,14+b],[33,7+b],[26,17+b]],SD);
      k.r(14,14+b,10,2,SD);k.r(15,19+b,8,3,'#241e1e');for(let x=15;x<23;x+=2)k.p(x,19+b,'#e8e0d0')},
    glow(k,f){}},

  spider:{name:'Frostbite spider',desc:'A huge pale spider from the ice caves with red eyes and venomous fangs.',
    w:72,h:44,height:1.15,
    draw(k,f){const up=[[0,1,0,1],[1,0,1,0]][f%2],W='#d8dcd8',G='#8a9090',D='#5a6062';
      // лапы: 4 с каждой стороны, через одну приподняты
      for(let i=0;i<4;i++){const lift=up[i]*3,y0=24+i*2,kx=12+i*3,fx=2+i*4;
        k.l(30,y0,kx,12+i*2-lift,G,2);k.l(kx,12+i*2-lift,fx,40+lift*0,D,2);
        k.l(42,y0,72-kx,12+i*2-(1-up[i])*3,G,2);k.l(72-kx,12+i*2-(1-up[i])*3,70-fx,40,D,2)}
      // брюшко (сзади, выше) с полосами
      k.e(36,16,13,11,W);for(let i=-2;i<=2;i++)k.r(26,16+i*4,20,1,G);k.e(36,16,13,11,'rgba(0,0,0,0)');
      k.e(36,28,10,8,'#b0b4b0');k.e(36,30,8,6,'#c4c8c4');
      // жвала и глаза
      k.r(31,35,3,6,D);k.r(38,35,3,6,D);k.r(30,40,2,2,'#2a2424');k.r(40,40,2,2,'#2a2424');
      for(const [x,y] of [[33,27],[39,27],[31,29],[41,29],[35,25],[37,25]])k.r(x,y,2,2,'#2a0808')},
    glow(k,f){for(const [x,y] of [[33,27],[39,27],[31,29],[41,29],[35,25],[37,25]]){k.r(x,y,1,1,'#ff5040')}}},
};

// атлас: 4 кадра в ряд; вторым холстом — свечение
function creatureAtlas(key){const C=CREATURES[key],w=C.w,h=C.h,mk=()=>{const c=document.createElement('canvas');c.width=w*4;c.height=h;return c};
  const base=mk(),glow=mk();
  for(let f=0;f<4;f++){const t=document.createElement('canvas');t.width=w;t.height=h;const x=t.getContext('2d');C.draw(pxKit(x),f);crisp(x,w,h,[18,14,12]);
    base.getContext('2d').drawImage(t,f*w,0);
    const g=document.createElement('canvas');g.width=w;g.height=h;C.glow(pxKit(g.getContext('2d')),f);glow.getContext('2d').drawImage(g,f*w,0)}
  return {base,glow,w,h}}
