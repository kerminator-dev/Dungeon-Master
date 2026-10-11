'use strict';
// ---------- случайность, шум, настройки ----------
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
let rnd=Math.random;
const rr=(a,b)=>a+(b-a)*rnd();
const ri=(a,b)=>a+Math.floor((b-a+1)*rnd());
const pick=a=>a[Math.floor(rnd()*a.length)];
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const sstep=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t)};

// градиентный шум Перлина 2D, значения примерно в [-0.7, 0.7]
const Noise=(()=>{const p=new Uint8Array(512);
  const seed=s=>{const r=mulberry(s),q=[];for(let i=0;i<256;i++)q[i]=i;
    for(let i=255;i>0;i--){const j=Math.floor(r()*(i+1)),t=q[i];q[i]=q[j];q[j]=t}for(let i=0;i<512;i++)p[i]=q[i&255]};
  seed(1);
  const f=t=>t*t*t*(t*(t*6-15)+10);
  const g=(h,x,y)=>{switch(h&7){case 0:return x+y;case 1:return -x+y;case 2:return x-y;case 3:return -x-y;case 4:return x;case 5:return -x;case 6:return y;default:return -y}};
  const n2=(x,y)=>{let X=Math.floor(x),Y=Math.floor(y);x-=X;y-=Y;X&=255;Y&=255;
    const u=f(x),v=f(y),a=p[X]+Y,b=p[X+1]+Y;
    const g00=g(p[a],x,y),g10=g(p[b],x-1,y),g01=g(p[a+1],x,y-1),g11=g(p[b+1],x-1,y-1);
    const l1=g00+(g10-g00)*u,l2=g01+(g11-g01)*u;return (l1+(l2-l1)*v)*.7};
  const fbm=(x,y,o=4)=>{let s=0,a=1,t=0;for(let i=0;i<o;i++){s+=a*n2(x,y);t+=a;x=x*2.03+17.1;y=y*2.03-9.3;a*=.5}return s/t};
  return {seed,n2,fbm}})();
const setSeed=s=>{rnd=mulberry(s);Noise.seed(s*7+3)};

const SET_DEF={autoq:true,post:true,music:.5,draw:120,vol:.7,sens:1,fov:75,pix:2,cap:0,showfps:false,bob:true,invert:false,size:10,theme:'dungeon'};
const S=Object.assign({},SET_DEF);
try{Object.assign(S,JSON.parse(localStorage.getItem('labyrinth2')||'{}'))}catch(e){}
const saveSet=()=>{try{localStorage.setItem('labyrinth2',JSON.stringify(S))}catch(e){}};
