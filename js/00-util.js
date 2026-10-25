'use strict';
// ---------- the same numbers in every browser ----------
// each browser has its own Math.sin, cos, atan2, hypot...: they differ in the last digit. a level is built from its seed, so
// together those digits (a hash made of a sine, a spot just on a wall's edge) turned into another maze in Safari than in
// Chrome. these are made of + - * / and sqrt only, which come out to the bit the same everywhere (fdlibm's formulas)
(()=>{const F=new Float64Array(1),U=new Uint32Array(F.buffer),M=Math,nat={pow:M.pow,atan2:M.atan2};
  const two=k=>{F[0]=0;U[1]=k+1023<<20;return F[0]};   // 2^k, -1022..1023
  // x minus n quarter turns, in three parts (n*P1 and n*P2 are exact)
  const P1=1.57079632673412561417,P2=6.07710050630396597660e-11,P3=2.02226624871116645580e-21,IP=.636619772367581343076;
  const ks=x=>{const z=x*x;return x+z*x*(-1.66666666666666324348e-01+z*(8.33333333332248946124e-03+z*(-1.98412698298579493134e-04+z*(2.75573137070700676789e-06+z*(-2.50507602534068634195e-08+z*1.58969099521155010221e-10)))))};
  const kc=x=>{const z=x*x;return 1-(.5*z-z*z*(4.16666666666666019037e-02+z*(-1.38888888888741095749e-03+z*(2.48015872894767294178e-05+z*(-2.75573143513906633035e-07+z*(2.08757232129817482790e-09+z*-1.13596475577881948265e-11))))))};
  const quad=(x,c)=>{if(!isFinite(x))return NaN;if(x>-.785398163397448&&x<.785398163397448)return c?kc(x):ks(x);
    const n=M.round(x*IP),r=x-n*P1-n*P2-n*P3,q=(n%4+4+(c?1:0))%4;return q===0?ks(r):q===1?kc(r):q===2?-ks(r):-kc(r)};
  const AH=[4.63647609000806093515e-01,7.85398163397448278999e-01,9.82793723247329054082e-01,1.57079632679489655800e+00],
    AL=[2.26987774529616870924e-17,3.06161699786838301793e-17,1.39033110312309984516e-17,6.12323399573676603587e-17],
    T=[3.33333333333329318027e-01,-1.99999999998764832476e-01,1.42857142725034663711e-01,-1.11111104054623557880e-01,9.09088713343650656196e-02,
      -7.69187620504482999495e-02,6.66107313738753120669e-02,-5.83357013379057348645e-02,4.97687799461593236017e-02,-3.65315727442169155270e-02,1.62858201153657823623e-02];
  const atan=x=>{if(x!==x)return x;const s=x<0?-1:1;let a=x*s,id=-1;if(a>=7.378697629483821e19)return s*AH[3]+s*AL[3];
    if(a<.4375){if(a<1.862645149230957e-9)return x}else if(a<1.1875){if(a<.6875){id=0;a=(2*a-1)/(2+a)}else{id=1;a=(a-1)/(a+1)}}
    else if(a<2.4375){id=2;a=(a-1.5)/(1+1.5*a)}else{id=3;a=-1/a}
    const z=a*a,w=z*z,s1=z*(T[0]+w*(T[2]+w*(T[4]+w*(T[6]+w*(T[8]+w*T[10]))))),s2=w*(T[1]+w*(T[3]+w*(T[5]+w*(T[7]+w*T[9]))));
    return id<0?s*(a-a*(s1+s2)):s*(AH[id]-((a*(s1+s2)-AL[id])-a))};
  const PI=3.14159265358979311600,PIL=1.22464679914735317720e-16;
  const atan2=(y,x)=>{if(x!==x||y!==y)return NaN;if(!isFinite(x)||!isFinite(y))return nat.atan2(y,x);
    if(y===0)return x>0||x===0&&1/x>0?y:1/y>0?PI:-PI;if(x===0)return y>0?PI/2:-PI/2;
    const a=atan(M.abs(y/x));return x>0?(y>0?a:-a):(y>0?PI-(a-PIL):-(PI-(a-PIL)))};
  const exp=x=>{if(x!==x)return x;if(x>709.782712893384)return Infinity;if(x<-745.1332191019411)return 0;
    const k=M.round(x*1.44269504088896338700),hi=x-k*6.93147180369123816490e-01,lo=k*1.90821492927058770002e-10,r=hi-lo,t=r*r,
      c=r-t*(1.66666666666666019037e-01+t*(-2.77777777770155933842e-03+t*(6.61375632143793436117e-05+t*(-1.65339022054652515390e-06+t*4.13813679705723846039e-08)))),
      y=1-((lo-(r*c)/(2-c))-hi);return k<-1021?y*two(k+1000)*two(-1000):k>1023?y*two(k-1)*2:y*two(k)};
  const log=x=>{if(!(x>0))return x===0?-Infinity:NaN;if(x===Infinity)return x;let k=0;if(x<2.2250738585072014e-308){k=-54;x*=18014398509481984}
    F[0]=x;let hx=U[1];k+=(hx>>20)-1023;hx&=0xfffff;const i=(hx+0x95f64)&0x100000;U[1]=hx|(i^0x3ff00000);k+=i>>20;
    const f=F[0]-1,s=f/(2+f),z=s*s,w=z*z,R=z*(6.666666666666735130e-01+w*(2.857142874366239149e-01+w*(1.818357216161805012e-01+w*1.479819860511658591e-01)))+
      w*(3.999999999940941908e-01+w*(2.222219843214978396e-01+w*1.531383769920937332e-01)),hf=.5*f*f;
    return k*6.93147180369123816490e-01-((hf-(s*(hf+R)+k*1.90821492927058770002e-10))-f)};
  // a whole power by squarings; otherwise by exp and log (the edge cases as the spec has them, exact everywhere)
  const pow=(x,y)=>{if(y===.5&&x>=0)return M.sqrt(x);if(y===M.floor(y)&&M.abs(y)<=64&&x===x){let r=1,b=x,e=M.abs(y);while(e){if(e&1)r*=b;b*=b;e=e>>>1}return y<0?1/r:r}
    return x>0&&isFinite(x)&&isFinite(y)?exp(y*log(x)):nat.pow(x,y)};
  Object.assign(M,{sin:x=>quad(x,0),cos:x=>quad(x,1),tan:x=>quad(x,0)/quad(x,1),atan,atan2,exp,log,pow,
    asin:x=>atan2(x,M.sqrt((1-x)*(1+x))),acos:x=>atan2(M.sqrt((1-x)*(1+x)),x),
    hypot:(a,b,c)=>c===undefined?M.sqrt(a*a+b*b):M.sqrt(a*a+b*b+c*c)})})();

// ---------- randomness, noise, settings ----------
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
let rnd=Math.random;
const rr=(a,b)=>a+(b-a)*rnd();
const ri=(a,b)=>a+Math.floor((b-a+1)*rnd());
const pick=a=>a[Math.floor(rnd()*a.length)];
// in place, by the stream (a sort by a random comparator comes out differently in every browser: their sorts differ)
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1)),t=a[i];a[i]=a[j];a[j]=t}return a};
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const sstep=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t)};

// 2D Perlin gradient noise, values roughly in [-0.7, 0.7]
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

const SET_DEF={autoq:true,post:true,music:.5,draw:120,vol:.7,sens:1,fov:75,pix:2,cap:0,showfps:false,bob:true,invert:false,size:12,theme:'dungeon'};
const S=Object.assign({},SET_DEF);
try{Object.assign(S,JSON.parse(localStorage.getItem('labyrinth2')||'{}'))}catch(e){}
const saveSet=()=>{try{localStorage.setItem('labyrinth2',JSON.stringify(S))}catch(e){}};
