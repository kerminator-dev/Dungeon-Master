// ---------- RNG ----------
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
let rnd = Math.random;

// ---------- Процедурные пиксельные текстуры ----------
function tex(w,h,fn,rx=1,ry=1){
  const c=document.createElement('canvas');c.width=w;c.height=h;
  const g=c.getContext('2d');fn(g,w,h);
  const t=new THREE.CanvasTexture(c);
  t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestMipmapNearestFilter;t.anisotropy=1;
  t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rx,ry);
  return t;
}
const R=(a,b)=>a+Math.random()*(b-a);
function shade(hex,k){const c=new THREE.Color(hex);c.r=Math.min(1,c.r*k);c.g=Math.min(1,c.g*k);c.b=Math.min(1,c.b*k);return '#'+c.getHexString()}
function bricks(g,w,h,base,mortar,moss,rowH=4,brickW=8){
  g.fillStyle=mortar;g.fillRect(0,0,w,h);
  let row=0;
  for(let y=0;y<h;y+=rowH,row++){
    const off=row%2?brickW/2:0;
    for(let x=-off;x<w;x+=brickW){
      g.fillStyle=shade(base,R(.78,1.18));
      g.fillRect(x+1,y+1,brickW-1,rowH-1);
      g.fillStyle=shade(base,1.3);g.fillRect(x+1,y+1,brickW-1,1); // блик сверху
    }
  }
  for(let i=0;i<w*h*.05;i++){g.fillStyle=shade(base,R(.6,1.3));g.fillRect(Math.random()*w|0,Math.random()*h|0,1,1)}
  if(moss)for(let i=0;i<w*h*.02;i++){g.fillStyle=moss;g.fillRect(Math.random()*w|0,Math.random()*h|0,1,R(1,3)|0)}
}
function cracks(g,w,h,n,col){g.fillStyle=col;for(let i=0;i<n;i++){let x=Math.random()*w|0,y=Math.random()*h|0;for(let k=0;k<R(4,10);k++){g.fillRect(x,y,1,1);x+=Math.random()<.5?0:(Math.random()<.5?-1:1);y+=1;}}}
function slabs(g,w,h,base,mortar,n){ // плиты пола n×n
  g.fillStyle=mortar;g.fillRect(0,0,w,h);const s=w/n;
  for(let i=0;i<n;i++)for(let j=0;j<n;j++){g.fillStyle=shade(base,R(.8,1.15));g.fillRect(i*s+1,j*s+1,s-1,s-1);
    for(let k=0;k<s*s*.12;k++){g.fillStyle=shade(base,R(.7,1.25));g.fillRect(i*s+1+Math.random()*(s-2)|0,j*s+1+Math.random()*(s-2)|0,1,1)}}
}
function px(g,c,x,y,w=1,h=1){g.fillStyle=c;g.fillRect(x,y,w,h)}
const T = {
  brick: tex(16,24,(g,w,h)=>bricks(g,w,h,'#7c5646','#2a1712','#4f6a2a')),
  brickCrack: tex(16,24,(g,w,h)=>{bricks(g,w,h,'#785444','#2a1712','#4f6a2a');cracks(g,w,h,4,'#1a0d09')}),
  brickMoss: tex(16,24,(g,w,h)=>{bricks(g,w,h,'#72503f','#241410','#3f6a22');
      for(let i=0;i<60;i++){px(g,shade('#4a7a28',R(.6,1.2)),Math.random()*w|0,h-1-(Math.random()*Math.random()*12|0),1,R(1,3)|0)}}),
  brickSnow: tex(16,24,(g,w,h)=>{bricks(g,w,h,'#7c5646','#33211c','#4f6a2a');
      g.fillStyle='#dfe8f2';for(let x=0;x<w;x++){if(Math.random()<.7)g.fillRect(x,0,1,R(1,4)|0)}}),
  brickSnow2: tex(16,24,(g,w,h)=>{bricks(g,w,h,'#6e4c40','#33211c','#4f6a2a');cracks(g,w,h,3,'#1f1210');
      g.fillStyle='#e6eef7';for(let x=0;x<w;x++){if(Math.random()<.6)g.fillRect(x,0,1,R(1,3)|0)}
      for(let i=0;i<20;i++)px(g,'#dfe8f2',Math.random()*w|0,Math.random()*h|0,2,1)}),
  snowTop: tex(8,8,(g,w,h)=>{g.fillStyle='#e6eef7';g.fillRect(0,0,w,h);for(let i=0;i<20;i++){g.fillStyle=shade('#e6eef7',R(.85,1));g.fillRect(Math.random()*w|0,Math.random()*h|0,1,1)}}),
  flag: tex(32,32,(g,w,h)=>{slabs(g,w,h,'#5a5048','#1e1815',2);cracks(g,w,h,5,'#1a1512');
      for(let i=0;i<8;i++)px(g,'#3f5a22',Math.random()*w|0,Math.random()*h|0,2,1)}),
  path: tex(16,16,(g,w,h)=>slabs(g,w,h,'#6a666c','#2d2b30',2)),
  ceil: tex(16,16,(g,w,h)=>bricks(g,w,h,'#5a3a2c','#1c110c',null,4,8)),
  snow: tex(32,32,(g,w,h)=>{g.fillStyle='#dbe6f2';g.fillRect(0,0,w,h);for(let i=0;i<160;i++){g.fillStyle=shade('#dbe6f2',R(.8,1.03));g.fillRect(Math.random()*w|0,Math.random()*h|0,R(1,3)|0,1)}}),
  wood: tex(8,8,(g,w,h)=>{for(let x=0;x<w;x++){g.fillStyle=shade('#6b4423',R(.8,1.15));g.fillRect(x,0,1,h)}g.fillStyle='#2a1a0c';g.fillRect(0,3,w,1);}),
  chest: tex(16,16,(g,w,h)=>{for(let y=0;y<h;y++){g.fillStyle=shade('#6e4a2a',R(.85,1.1));g.fillRect(0,y,w,1)}
      g.fillStyle='#3b3633';g.fillRect(0,0,w,2);g.fillRect(0,h-2,w,2);g.fillRect(3,0,2,h);g.fillRect(11,0,2,h);g.fillStyle='#c9a030';g.fillRect(7,6,2,3)}),
  pine: tex(8,8,(g,w,h)=>{g.fillStyle='#1d3b30';g.fillRect(0,0,w,h);for(let i=0;i<30;i++){g.fillStyle=Math.random()<.45?'#eef4fa':shade('#2b5642',R(.7,1.2));g.fillRect(Math.random()*w|0,Math.random()*h|0,2,1)}}),
  rock: tex(8,8,(g,w,h)=>{g.fillStyle='#6e6a70';g.fillRect(0,0,w,h);for(let i=0;i<24;i++){g.fillStyle=shade('#6e6a70',R(.7,1.2));g.fillRect(Math.random()*w|0,Math.random()*h|0,2,2)}}),
  snowRock: tex(8,8,(g,w,h)=>{g.fillStyle='#6e6a70';g.fillRect(0,0,w,h);for(let i=0;i<20;i++){g.fillStyle=shade('#6e6a70',R(.7,1.2));g.fillRect(Math.random()*w|0,Math.random()*h|0,2,2)}
      for(let i=0;i<40;i++)px(g,'#eef4fa',Math.random()*w|0,Math.random()*h*.6|0,2,1)}),
  flame: tex(8,12,(g,w,h)=>{const p=(x,y,c)=>{g.fillStyle=c;g.fillRect(x,y,1,1)};
      for(let y=0;y<h;y++){const wd=Math.max(1,Math.round(Math.sin(y/h*Math.PI)*3.5*(y/h<.3?.6:1)));
        for(let x=0;x<w;x++){const d=Math.abs(x-3.5);if(d<wd/1.1)p(x,h-1-y,y<h*.3?'#fff2b0':y<h*.6?'#ffb030':'#ff5a10')}}}),
  // ---- декали (с прозрачностью) ----
  banner: tex(16,32,(g,w,h)=>{
      for(let y=0;y<h;y++){const cut=y>h-6?Math.abs(((w/2)-Math.abs(((Math.floor(w/2))-(0))))):0;
        for(let x=0;x<w;x++){const tail=y>h-6&&((x%8)<(y-(h-6)));if(tail)continue;
          px(g,shade('#8c1616',(x%4<2?1:.88)*R(.92,1.05)),x,y)}}
      px(g,'#d8b040',0,0,w,2);px(g,'#d8b040',7,9,2,10);px(g,'#d8b040',4,12,8,2);px(g,'#d8b040',6,19,4,2)}),
  window: tex(16,22,(g,w,h)=>{
      const inArch=(x,y)=>y>=7?(x>=3&&x<=12):((x-7.5)**2+(y-7)**2<=4.5**2);
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){if(y<2&&(x<2||x>13))continue;px(g,shade('#7a4a38',R(.8,1.15)),x,y)}
      for(let y=2;y<h-2;y++)for(let x=2;x<14;x++)if(inArch(x,y)&&y>=2)px(g,'#0b0f1a',x,y);
      for(const bx of [5,8,11])px(g,'#8a8a92',bx,4,1,h-8);px(g,'#8a8a92',3,12,10,1);
      for(let y=2;y<h-2;y++)px(g,'#a07a50',2,y,1,1)}),
  door: tex(24,40,(g,w,h)=>{
      const inD=(x,y)=>y>=10?(x>=3&&x<=20):((x-11.5)**2+(y-10)**2<=8.5**2);
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){ if(inD(x,y)||Math.abs(x-11.5)<9&&y>=1&&y<10&&false)px(g,shade('#6b4423',R(.8,1.15)+(x%4==0?-.15:0)),x,y);
        else if(y>=1&&((x>=1&&x<=22)&&(y>=1)&&(inD(x+1,y)||inD(x-1,y)||inD(x,y+1)||inD(x,y-1)||inD(x+2,y)||inD(x-2,y))))px(g,'#8a8a92',x,y)}
      for(const by of [14,24,34])px(g,'#6e6e76',3,by,18,2);
      px(g,'#b8a030',10,21,4,5);px(g,'#222',11,22,2,2)}),
  cobweb: tex(16,16,(g,w,h)=>{g.fillStyle='rgba(220,220,230,.85)';
      for(let i=0;i<16;i++){g.fillRect(i,0,1,1);g.fillRect(0,i,1,1);g.fillRect(i,i,1,1)}
      for(const r of [5,9,13])for(let a=0;a<=r;a++){g.fillRect(Math.round(r*Math.sin(a/r*1.57)),Math.round(r*Math.cos(a/r*1.57)),1,1)}}),
  decal: tex(16,24,(g,w,h)=>{cracks(g,w,h,3,'#150a07');for(let i=0;i<14;i++)px(g,shade('#4a7a28',R(.6,1.2)),Math.random()*w|0,Math.random()*h|0,R(1,3)|0,R(1,4)|0)}),
  icicle: tex(16,6,(g,w,h)=>{let x=0;while(x<w){const len=R(2,6)|0,wd=R(1,3)|0;for(let k=0;k<len;k++)px(g,k<len*.4?'#eaf4ff':'#b8d4ee',x+(wd>1&&k>len*.6?1:0),k,wd>1&&k>len*.6?wd-1:wd,1);x+=wd+(R(0,2)|0)}
      px(g,'#e6eef7',0,0,w,1)}),
  slime: tex(8,8,(g,w,h)=>{g.fillStyle='#3c7a1c';g.fillRect(0,0,w,h);for(let i=0;i<24;i++){g.fillStyle=shade('#4f9a28',R(.6,1.3));g.fillRect(Math.random()*w|0,Math.random()*h|0,2,1)}}),
  skull: tex(8,8,(g,w,h)=>{g.fillStyle='#d8cfb4';g.fillRect(1,0,6,5);g.fillRect(2,5,4,2);g.fillStyle='#1a1410';g.fillRect(2,2,1,2);g.fillRect(5,2,1,2);g.fillRect(3,5,1,1);g.fillRect(4,5,1,1)}),
};
for(const k of ['flame','banner','window','door','cobweb','decal','icicle','skull'])T[k].wrapS=T[k].wrapT=THREE.ClampToEdgeWrapping;

// ---- дополнительные текстуры ----
function noiseTex(w,h,base,n,lo=.7,hi=1.25,rx=1,ry=1){return tex(w,h,(g,w,h)=>{g.fillStyle=base;g.fillRect(0,0,w,h);for(let i=0;i<n;i++)px(g,shade(base,R(lo,hi)),Math.random()*w|0,Math.random()*h|0,R(1,3)|0,1)},rx,ry)}
function rockTex(base,hl){return tex(16,24,(g,w,h)=>{g.fillStyle=shade(base,.75);g.fillRect(0,0,w,h);
  for(let i=0;i<14;i++){const x=Math.random()*w|0,y=Math.random()*h|0,ww=R(4,9)|0,hh=R(3,7)|0;px(g,shade(base,R(.8,1.2)),x,y,ww,hh);px(g,shade(base,1.25),x,y,ww,1)}
  for(let i=0;i<70;i++)px(g,shade(base,R(.6,1.3)),Math.random()*w|0,Math.random()*h|0,1,1);cracks(g,w,h,3,shade(base,.3));
  if(hl)for(let i=0;i<30;i++)px(g,hl,Math.random()*w|0,Math.random()*h*.7|0,2,1)})}
T.rockwall=rockTex('#6a5c50');T.rockwallSnow=rockTex('#665e58','#eef4fa');T.cavewall=rockTex('#50504c');T.cavewall2=rockTex('#46484a');
T.nord=tex(16,24,(g,w,h)=>{bricks(g,w,h,'#625f58','#1c1a17','#3f5a3a',6,12);px(g,'#6a5a30',0,11,w,1)});
T.nord2=tex(16,24,(g,w,h)=>{bricks(g,w,h,'#5a5852','#1c1a17','#3f5a3a',6,12);cracks(g,w,h,4,'#171512');px(g,'#6a5a30',0,11,w,1)});
T.catbrick=tex(16,24,(g,w,h)=>{bricks(g,w,h,'#7a7468','#1f1c18','#3a5a2a',4,8);cracks(g,w,h,3,'#14110e')});
T.skullwall=tex(16,24,(g,w,h)=>{bricks(g,w,h,'#726c60','#1f1c18',null,4,8);
  for(let k=0;k<6;k++){const x=(Math.random()*12|0)+1,y=(Math.random()*5|0)*4+1;px(g,'#d8cfb4',x,y,3,2);px(g,'#1a1410',x,y+1,1,1);px(g,'#1a1410',x+2,y+1,1,1)}});
T.icewall=tex(16,24,(g,w,h)=>{g.fillStyle='#4f7aa8';g.fillRect(0,0,w,h);
  for(let i=0;i<60;i++)px(g,shade('#6fa0cc',R(.7,1.3)),Math.random()*w|0,Math.random()*h|0,R(1,4)|0,R(1,5)|0);
  for(let i=0;i<10;i++)px(g,'#d8ecff',Math.random()*w|0,Math.random()*h|0,1,R(2,6)|0)});
T.icewall2=tex(16,24,(g,w,h)=>{g.fillStyle='#3f6a98';g.fillRect(0,0,w,h);
  for(let i=0;i<50;i++)px(g,shade('#5f90bc',R(.7,1.3)),Math.random()*w|0,Math.random()*h|0,R(1,5)|0,R(1,4)|0);cracks(g,w,h,5,'#c8e4ff')});
T.iceFloor=tex(32,32,(g,w,h)=>{slabs(g,w,h,'#7aa4cc','#3f6a98',2);cracks(g,w,h,6,'#d8ecff')});
T.nordFloor=tex(32,32,(g,w,h)=>{slabs(g,w,h,'#5e5c58','#1c1a18',2);cracks(g,w,h,4,'#141210')});
T.catFloor=tex(32,32,(g,w,h)=>{slabs(g,w,h,'#6a6050','#201a14',2);cracks(g,w,h,4,'#14100c');for(let i=0;i<10;i++)px(g,'#d8cfb4',Math.random()*w|0,Math.random()*h|0,2,1)});
T.caveFloor=noiseTex(16,16,'#4a4038',60);
T.ceilNord=tex(16,16,(g,w,h)=>bricks(g,w,h,'#4a4844','#12100e',null,4,8));
T.ceilCat=tex(16,16,(g,w,h)=>bricks(g,w,h,'#4c483e','#12100c',null,4,8));
T.ceilIce=noiseTex(16,16,'#2f5a88',40);T.ceilCave=noiseTex(16,16,'#2c2c2a',50);
T.pillar=tex(16,32,(g,w,h)=>{
  for(let x=0;x<w;x++){g.fillStyle=shade('#6a5e56',R(.8,1.15));g.fillRect(x,0,1,h)}
  for(let y=0;y<h;y+=8){g.fillStyle='#2a2320';g.fillRect(0,y,w,1)}
  for(let i=0;i<40;i++)px(g,shade('#6a5e56',R(.6,1.3)),Math.random()*w|0,Math.random()*h|0,1,2);
  for(let i=0;i<10;i++)px(g,'#3f5a22',Math.random()*w|0,h-1-(Math.random()*8|0),1,2)});
T.shield=tex(12,12,(g,w,h)=>{
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const d=(x-5.5)**2+(y-5.5)**2;if(d<30)px(g,d>20?'#6e6e76':(x<6)===(y<6)?'#8c1616':'#d8d0b8',x,y)}
  px(g,'#b8a030',5,2,2,8);px(g,'#b8a030',2,5,8,2)});
T.rune=tex(12,12,(g,w,h)=>{g.fillStyle='#e8c860';g.fillRect(5,1,2,10);g.fillRect(3,3,6,1);g.fillRect(3,7,2,1);g.fillRect(7,7,2,1);g.fillRect(2,9,3,1);g.fillRect(7,9,3,1)});
for(const k of ['shield','rune'])T[k].wrapS=T[k].wrapT=THREE.ClampToEdgeWrapping;
T.castle=tex(16,24,(g,w,h)=>{bricks(g,w,h,'#8a8a90','#2a2a30',null,6,12)});
T.castle2=tex(16,24,(g,w,h)=>{bricks(g,w,h,'#7c7c84','#26262c','#3f5a3a',6,12);cracks(g,w,h,3,'#18181c')});
T.castFloor=tex(32,32,(g,w,h)=>{const s=w/4;for(let i=0;i<4;i++)for(let j=0;j<4;j++){const c=(i+j)%2?'#9a9aa0':'#2e2e34';
  g.fillStyle=c;g.fillRect(i*s,j*s,s,s);for(let k=0;k<12;k++)px(g,shade(c,R(.85,1.15)),i*s+Math.random()*s|0,j*s+Math.random()*s|0,1,1)}});
T.ceilCast=tex(16,16,(g,w,h)=>bricks(g,w,h,'#5a5a62','#18181c',null,6,12));
T.mossBrick=tex(16,24,(g,w,h)=>{bricks(g,w,h,'#847e70','#2a2822','#456a2c',4,8);
  for(let i=0;i<28;i++)px(g,shade('#4f8a2a',R(.6,1.1)),Math.random()*w|0,Math.random()*h|0,R(1,3)|0,R(1,3)|0)});
T.mossBrick2=tex(16,24,(g,w,h)=>{bricks(g,w,h,'#78725f','#24221c','#456a2c',4,8);cracks(g,w,h,4,'#16140f')});
T.grass=noiseTex(32,32,'#4a6a30',200,.75,1.25);
T.dirt=noiseTex(16,16,'#6a5238',70,.75,1.2);
T.pineG=tex(8,8,(g,w,h)=>{g.fillStyle='#24442a';g.fillRect(0,0,w,h);for(let i=0;i<30;i++){g.fillStyle=shade('#34603a',R(.7,1.25));g.fillRect(Math.random()*w|0,Math.random()*h|0,2,1)}});
T.roof=tex(8,8,(g,w,h)=>{g.fillStyle='#6a3a2a';g.fillRect(0,0,w,h);for(let y=0;y<h;y+=2){g.fillStyle=shade('#6a3a2a',R(.7,1.15));g.fillRect(0,y,w,1)}});
T.houseWall=tex(8,8,(g,w,h)=>{for(let y=0;y<h;y++){g.fillStyle=shade('#8a6a44',R(.85,1.1));g.fillRect(0,y,w,1)}g.fillStyle='#3a2a18';for(let x=0;x<w;x+=3)g.fillRect(x,0,1,h)});
// ---- детализация: текстуры по референсам ----
T.archStone=tex(16,24,(g,w,h)=>{bricks(g,w,h,'#a29e94','#4e4a42',null,4,8);cracks(g,w,h,2,'#5a564e')});
T.timber=tex(16,16,(g,w,h)=>{g.fillStyle='#bba982';g.fillRect(0,0,w,h);
  for(let i=0;i<40;i++)px(g,shade('#bba982',R(.9,1.05)),Math.random()*w|0,Math.random()*h|0,2,1);
  g.fillStyle='#5a3a22';g.fillRect(0,0,2,h);g.fillRect(7,0,2,h);g.fillRect(14,0,2,h);g.fillRect(0,0,w,2);g.fillRect(0,7,w,2);g.fillRect(0,14,w,2);
  for(let k=0;k<5;k++){px(g,'#5a3a22',2+k,2+k);px(g,'#5a3a22',13-k,9+k)}});
T.slate=tex(8,8,(g,w,h)=>{for(let y=0;y<h;y+=2){for(let x=-(y%4);x<w;x+=4){g.fillStyle=shade('#4e525e',R(.8,1.2));g.fillRect(x,y,3,2);px(g,'#2c2e36',x+3,y,1,2);px(g,'#6a6e7a',x,y,3,1)}}
  for(let i=0;i<4;i++)px(g,'#5a7a38',Math.random()*w|0,Math.random()*h|0,1,1)});
T.plankFloor=tex(16,16,(g,w,h)=>{for(let y=0;y<h;y+=4){const off=(y/4)%2?8:0;for(let x=-off;x<w;x+=16){g.fillStyle=shade('#6a4a28',R(.9,1.1));g.fillRect(x,y,16,4);}px(g,'#2a1a0a',0,y,w,1);px(g,'#2a1a0a',(off+8)%16,y,1,4)}
  for(let i=0;i<20;i++)px(g,shade('#6a4a28',R(.8,1.05)),Math.random()*w|0,Math.random()*h|0,2,1)});
T.plankCeil=tex(16,16,(g,w,h)=>{for(let x=0;x<w;x+=4){g.fillStyle=shade('#6a4a28',R(.85,1.15));g.fillRect(x,0,4,h);px(g,'#2a1a0a',x,0,1,h)}});
T.carpet=tex(16,16,(g,w,h)=>{g.fillStyle='#8a1a1a';g.fillRect(0,0,w,h);
  g.fillStyle='#c8a030';g.fillRect(0,0,w,2);g.fillRect(0,h-2,w,2);g.fillStyle='#5a0e0e';g.fillRect(0,2,w,1);g.fillRect(0,h-3,w,1);
  for(let x=2;x<w;x+=4){px(g,'#c8a030',x+1,7,2,2);px(g,'#c8a030',x,8,1,1);px(g,'#c8a030',x+3,8,1,1);px(g,'#c8a030',x+1,6,2,1);px(g,'#c8a030',x+1,9,2,1)}
  for(let i=0;i<30;i++)px(g,shade('#8a1a1a',R(.85,1.1)),Math.random()*w|0,3+Math.random()*(h-6)|0,1,1)});
const latticeTex=(c,dk)=>tex(12,16,(g,w,h)=>{g.fillStyle=c;g.fillRect(0,0,w,h);for(let i=0;i<24;i++)px(g,shade(c,R(.85,1.2)),Math.random()*w|0,Math.random()*h|0,2,2);
  g.fillStyle=dk;for(let x=0;x<w;x+=4)g.fillRect(x,0,1,h);for(let y=0;y<h;y+=4)g.fillRect(0,y,w,1);g.fillRect(0,0,w,1);g.fillRect(0,h-1,w,1)});
T.latA=latticeTex('#4a6ad8','#14183a');T.latB=latticeTex('#d84a4a','#3a1414');T.latC=latticeTex('#d8b84a','#3a2e10');T.latG=latticeTex('#a8c8a0','#2a2418');
for(const k of ['latA','latB','latC','latG'])T[k].wrapS=T[k].wrapT=THREE.ClampToEdgeWrapping;
const bannerTex=(main,dark,emb)=>tex(16,32,(g,w,h)=>{
  g.fillStyle='#3a2616';g.fillRect(0,0,w,2);px(g,'#c8a030',0,0,1,2);px(g,'#c8a030',w-1,0,1,2);
  for(let y=2;y<h;y++){const cut=Math.abs(8-.5-7.5)>=0&&y>h-7?(y-(h-7)):0;
    for(let x=1;x<w-1;x++){if(y>h-7){const dd=Math.abs(x-7.5);if(dd<(y-(h-7)))continue}
      px(g,shade(x%4<2?main:dark,R(.94,1.04)),x,y)}}
  px(g,'#d8b040',1,2,w-2,1);emb(g)});
const embCross=g=>{px(g,'#d8b040',7,9,2,11);px(g,'#d8b040',4,12,8,2)};
const embFleur=g=>{px(g,'#e8c050',7,8,2,9);px(g,'#e8c050',4,10,2,5);px(g,'#e8c050',10,10,2,5);px(g,'#e8c050',5,15,6,2);px(g,'#e8c050',6,17,4,1)};
const embCrown=g=>{px(g,'#e8c050',4,12,8,5);px(g,'#e8c050',4,10,2,2);px(g,'#e8c050',7,10,2,2);px(g,'#e8c050',10,10,2,2)};
const archWinTex=(c,dk)=>tex(12,24,(g,w,h)=>{
  const inA=(x,y)=>y>=6?(x>=1&&x<=10):((x-5.5)**2+(y-6)**2<=4.5**2);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(inA(x,y))px(g,shade(c,R(.88,1.15)),x,y);
  g.fillStyle=dk;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(inA(x,y)&&(x%4===1||y%4===1))g.fillRect(x,y,1,1);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(inA(x,y)&&(!inA(x-1,y)||!inA(x+1,y)||!inA(x,y-1)||!inA(x,y+1)))px(g,'#d0c8b0',x,y)});
T.wA=archWinTex('#4a6ad8','#14183a');T.wB=archWinTex('#d84a4a','#3a1414');T.wC=archWinTex('#d8b84a','#3a2e10');T.wG=archWinTex('#9ec0a0','#2a2418');T.wW=archWinTex('#7a8aa8','#1c2030');
for(const k of ['wA','wB','wC','wG','wW'])T[k].wrapS=T[k].wrapT=THREE.ClampToEdgeWrapping;
T.bannerA=bannerTex('#9a1a1a','#7a1212',embCross);T.bannerB=bannerTex('#243a7a','#1a2a5a',embCrown);T.bannerC=bannerTex('#a02418','#801a10',embFleur);
T.shield2=tex(12,14,(g,w,h)=>{for(let y=0;y<h;y++)for(let x=0;x<w;x++){const half=y<9?5.5:5.5-(y-9)*1.2;if(Math.abs(x-5.5)<=half)px(g,Math.abs(x-5.5)>half-1||y<1?'#d88a30':'#243a7a',x,y)}
  px(g,'#e8c050',5,3,2,6);px(g,'#e8c050',3,5,2,3);px(g,'#e8c050',7,5,2,3);px(g,'#e8c050',4,9,4,1)});
T.mtn=tex(16,16,(g,w,h)=>{g.fillStyle='#f4f4f4';g.fillRect(0,0,w,h);for(let i=0;i<110;i++)px(g,shade('#f4f4f4',R(.62,1.0)),Math.random()*w|0,Math.random()*h|0,R(1,3)|0,R(1,2)|0);for(let i=0;i<8;i++)px(g,'#cfcfcf',Math.random()*w|0,Math.random()*h|0,5,1)});
T.water=tex(16,16,(g,w,h)=>{g.fillStyle='#3a76a8';g.fillRect(0,0,w,h);for(let i=0;i<60;i++)px(g,shade('#3a76a8',R(.8,1.3)),Math.random()*w|0,Math.random()*h|0,R(2,5)|0,1);for(let i=0;i<10;i++)px(g,'#a8d0f0',Math.random()*w|0,Math.random()*h|0,3,1)});
T.glow=tex(16,16,(g,w,h)=>{const gr=g.createRadialGradient(8,8,0,8,8,8);gr.addColorStop(0,'rgba(255,200,120,.9)');gr.addColorStop(.4,'rgba(255,140,40,.35)');gr.addColorStop(1,'rgba(255,100,0,0)');g.fillStyle=gr;g.fillRect(0,0,16,16)});
for(const k of ['bannerA','bannerB','bannerC','shield2','glow'])T[k].wrapS=T[k].wrapT=THREE.ClampToEdgeWrapping;
T.glow.magFilter=T.glow.minFilter=THREE.LinearFilter;
// ---- новые карты: текстуры ----
T.sandBrick=tex(16,24,(g,w,h)=>bricks(g,w,h,'#c8a870','#7a6038',null,4,8));
T.sandBrick2=tex(16,24,(g,w,h)=>{bricks(g,w,h,'#bc9c64','#6e5430',null,4,8);cracks(g,w,h,4,'#4a3a20')});
T.sandRock=rockTex('#b89a68');
T.sandFloor=noiseTex(32,32,'#d8bc82',220,.82,1.12);
T.sandPath=noiseTex(16,16,'#bc9a5c',80,.8,1.1);
T.palisade=tex(16,24,(g,w,h)=>{for(let x=0;x<w;x+=4){const c=shade('#5a4630',R(.8,1.2));g.fillStyle=c;g.fillRect(x,0,3,h);px(g,'#1c140a',x+3,0,1,h);for(let i=0;i<8;i++)px(g,shade(c,R(.6,1.3)),x+(Math.random()*3|0),Math.random()*h|0,1,2)}
  for(let i=0;i<24;i++)px(g,'#4f6a2a',Math.random()*w|0,Math.random()*h|0,1,R(1,4)|0);g.fillStyle='#2a1c0e';g.fillRect(0,5,w,1);g.fillRect(0,17,w,1)});
T.mud=noiseTex(32,32,'#4a4a2c',220,.7,1.15);
T.mudPath=noiseTex(16,16,'#5a4630',80,.75,1.1);
T.swampBrick=tex(16,24,(g,w,h)=>{bricks(g,w,h,'#5a6048','#1c2018','#3f6a2a',4,8);for(let i=0;i<50;i++)px(g,shade('#3f6a2a',R(.6,1.2)),Math.random()*w|0,Math.random()*h|0,R(1,3)|0,R(1,4)|0)});
T.sewerBrick=tex(16,24,(g,w,h)=>{bricks(g,w,h,'#5a6458','#1c221c','#3a6a2a',4,8);for(let i=0;i<14;i++)px(g,shade('#4a8a30',R(.6,1.2)),Math.random()*w|0,h-1-(Math.random()*12|0),1,R(2,5)|0)});
T.sewerBrick2=tex(16,24,(g,w,h)=>{bricks(g,w,h,'#4e5a4c','#171d17','#3a6a2a',4,8);cracks(g,w,h,4,'#0e120e')});
T.sewerFloor=tex(32,32,(g,w,h)=>{slabs(g,w,h,'#4a5248','#141a14',2);cracks(g,w,h,5,'#0e120e');for(let i=0;i<14;i++)px(g,'#3a6a2a',Math.random()*w|0,Math.random()*h|0,2,1)});
T.ceilSewer=tex(16,16,(g,w,h)=>bricks(g,w,h,'#3e463c','#101410',null,4,8));
T.basalt=tex(16,24,(g,w,h)=>{g.fillStyle='#1e1e24';g.fillRect(0,0,w,h);for(let i=0;i<14;i++){const x=Math.random()*w|0,y=Math.random()*h|0,ww=R(3,8)|0,hh=R(3,6)|0;px(g,shade('#2e2e36',R(.8,1.2)),x,y,ww,hh);px(g,'#3c3c46',x,y,ww,1)}
  for(let i=0;i<5;i++){let x=Math.random()*w|0,y=Math.random()*h|0;for(let k=0;k<R(4,9);k++){px(g,Math.random()<.5?'#ff6a20':'#ffa030',x,y,1,1);x+=Math.random()<.5?0:(Math.random()<.5?-1:1);y+=1}}});
T.basalt2=tex(16,24,(g,w,h)=>{g.fillStyle='#26262c';g.fillRect(0,0,w,h);for(let i=0;i<16;i++){const x=Math.random()*w|0,y=Math.random()*h|0;px(g,shade('#36363e',R(.8,1.2)),x,y,R(3,8)|0,R(3,6)|0)}cracks(g,w,h,4,'#0c0c10')});
T.lavaFloor=tex(32,32,(g,w,h)=>{slabs(g,w,h,'#2a2a30','#120c0c',2);for(let i=0;i<6;i++){let x=Math.random()*w|0,y=Math.random()*h|0;for(let k=0;k<R(6,14);k++){px(g,Math.random()<.5?'#ff6a20':'#ffb040',x,y,1,1);x+=Math.random()<.5?0:(Math.random()<.5?-1:1);y+=1}}});
T.ceilBasalt=noiseTex(16,16,'#1c1c22',60,.7,1.3);
T.crackOnly=tex(16,24,(g,w,h)=>{cracks(g,w,h,4,'#1a1008')});
T.lavaCrack=tex(16,24,(g,w,h)=>{for(let i=0;i<4;i++){let x=Math.random()*w|0,y=Math.random()*h|0;for(let k=0;k<R(6,16);k++){px(g,Math.random()<.4?'#ffc040':'#ff5a10',x,y,1,1);x+=Math.random()<.5?0:(Math.random()<.5?-1:1);y+=1}}});
T.pipe=tex(8,8,(g,w,h)=>{g.fillStyle='#4a5a4a';g.fillRect(0,0,w,h);g.fillStyle='#2a342a';g.fillRect(0,0,w,1);g.fillRect(0,h-1,w,1);for(let i=0;i<10;i++)px(g,shade('#4a5a4a',R(.7,1.3)),Math.random()*w|0,Math.random()*h|0,1,1)});
for(const k of ['crackOnly','lavaCrack'])T[k].wrapS=T[k].wrapT=THREE.ClampToEdgeWrapping;
// ---- здания: текстуры ----
T.plaster=tex(8,8,(g,w,h)=>{g.fillStyle='#d8cfb8';g.fillRect(0,0,w,h);for(let i=0;i<22;i++)px(g,shade('#d8cfb8',R(.88,1.05)),Math.random()*w|0,Math.random()*h|0,R(1,3)|0,1)});
T.sandPlaster=tex(8,8,(g,w,h)=>{g.fillStyle='#d8b880';g.fillRect(0,0,w,h);for(let i=0;i<24;i++)px(g,shade('#d8b880',R(.86,1.06)),Math.random()*w|0,Math.random()*h|0,R(1,3)|0,1)});
T.woodWall=tex(8,8,(g,w,h)=>{for(let y=0;y<h;y+=2){g.fillStyle=shade('#6a4a2c',R(.85,1.15));g.fillRect(0,y,w,2);px(g,'#241608',0,y,w,1)}});
T.tile=tex(8,8,(g,w,h)=>{for(let y=0;y<h;y+=2){for(let x=-(y%4);x<w;x+=4){g.fillStyle=shade('#b8562a',R(.8,1.2));g.fillRect(x,y,3,2);px(g,'#6a2a12',x+3,y,1,2);px(g,'#d8783a',x,y,3,1)}}});
T.awning=tex(8,8,(g,w,h)=>{for(let x=0;x<w;x+=2){g.fillStyle=(x/2)%2?'#d8d0b8':'#b82a2a';g.fillRect(x,0,2,h)}});
T.awning2=tex(8,8,(g,w,h)=>{for(let x=0;x<w;x+=2){g.fillStyle=(x/2)%2?'#d8d0b8':'#2a4aa8';g.fillRect(x,0,2,h)}});
T.cobble=tex(16,16,(g,w,h)=>{g.fillStyle='#3a3834';g.fillRect(0,0,w,h);for(let y=0;y<h;y+=4)for(let x=-(y%8?2:0);x<w;x+=4){px(g,shade('#7a766e',R(.75,1.2)),x+1,y+1,3,3);px(g,'#9a968c',x+1,y+1,3,1)}});
