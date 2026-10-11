// Проверяет, что по всем лестницам, галереям и мостам можно пройти (реальная коллизия игрока).
const {open}=require('./helpers');
(async()=>{const {browser,page,errs}=await open(320,200);
  const res=await page.evaluate(()=>{const out={};
    for(const th of Object.keys(THEMES)){let fail=0,tot=0,br=0,brOK=0;
      for(let k=0;k<8;k++){game.theme=th;level=0;N=16;rnd=mulberry(k*53+3);build();game.started=true;
        const walkTo=(tx,tz)=>{let n=0;while(Math.hypot(tx-player.x,tz-player.z)>.12&&n++<500){const dx=tx-player.x,dz=tz-player.z,l=Math.hypot(dx,dz),st=Math.min(.06,l);move(dx/l*st,dz/l*st)}return n<500};
        for(const s of maze.structs){tot++;const w=s.w,nS=w>=7?4:3,ent=s.tf(nS+1,1);player.x=wc(ent[0]);player.z=wc(ent[1]);player.floor=0;player.eyeY=0;
          let ok=true;for(const o of s.stairsList){if(!walkTo(wc(o.bx),wc(o.by))){ok=false;break}}
          const top=s.tf(0,1);if(ok)ok=walkTo(wc(top[0]),wc(top[1]));
          if(ok){const ring=[];for(let i=0;i<w;i++)ring.push([i,0]);for(let j=1;j<w;j++)ring.push([w-1,j]);for(let i=w-2;i>=0;i--)ring.push([i,w-1]);for(let j=w-2;j>=1;j--)ring.push([0,j]);
            const ti=ring.findIndex(([i,j])=>i+','+j===s.topRing);for(let q=0;q<=ring.length&&ok;q++){const [i,j]=ring[(ti+q)%ring.length];ok=walkTo(wc(s.x0+i),wc(s.y0+j))}}
          if(!ok||player.floor<3.5)fail++}
        for(const b of maze.bridges){br++;player.x=wc(b.x1-1);player.z=wc(b.y);player.floor=3.8;player.eyeY=3.8;let n=0;const tx=wc(b.x2+1);while(player.x<tx-.1&&n++<900)move(.06,0);if(player.x>=tx-.1&&player.floor>3.5)brOK++}}
      out[th]=`stairs fail ${fail}/${tot}, bridges ${brOK}/${br}`}
    return out});
  console.log(JSON.stringify(res,null,1),errs);await browser.close();process.exit(errs.length||Object.values(res).some(v=>!v.startsWith('stairs fail 0/')||/bridges (\d+)\/(\d+)/.exec(v).slice(1).some((x,i,a)=>a[0]!==a[1]))?1:0)})();
