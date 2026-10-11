// ---------- Генерация лабиринта ----------
const HF=3.8; // высота второго этажа
function genMaze(n,th){
  const W=2*n+1, g=Array.from({length:W},()=>new Uint8Array(W).fill(1)); // 1=стена, 2=колонна, 3=сплошной объект
  const st=[[0,0]]; g[1][1]=0; const seen=new Set(['0,0']);
  while(st.length){
    const [cx,cy]=st[st.length-1];
    const nb=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>[cx+dx,cy+dy,dx,dy])
      .filter(([x,y])=>x>=0&&y>=0&&x<n&&y<n&&!seen.has(x+','+y));
    if(!nb.length){st.pop();continue}
    const [x,y,dx,dy]=nb[rnd()*nb.length|0];
    seen.add(x+','+y);
    g[2*cx+1+dx][2*cy+1+dy]=0; g[2*x+1][2*y+1]=0;
    st.push([x,y]);
  }
  for(let i=0;i<n*n/6;i++){const x=1+(rnd()*(W-2)|0),y=1+(rnd()*(W-2)|0);
    if(g[x][y]&&((x&1)!==(y&1)))g[x][y]=0}
  const hmap=new Float32Array(W*W), hmapU=new Float32Array(W*W), cmap=new Float32Array(W*W), cmapU=new Float32Array(W*W), wmap=new Float32Array(W*W), stairs=new Map();
  const structs=[], taken=[], lintels=[], gates=[], bridges=[], outdoor=!!th.outdoor;
  const overlaps=(x0,y0,w)=>taken.some(r=>x0<r[0]+r[2]+1&&r[0]<x0+w+1&&y0<r[1]+r[2]+1&&r[1]<y0+w+1);

  // ---- большие многоэтажные сооружения: залы / дома / башни ----
  const tryStruct=(kind,sc,SH,fix)=>{
    const w=2*sc-1; if(n<sc+2)return null;
    const key=(i,j)=>i+','+j;
    for(let t=0;t<140;t++){
      let a=rnd()*(n-sc+1)|0,b=rnd()*(n-sc+1)|0;
      if(fix&&fix.b!==undefined)b=fix.b;if(fix&&fix.far!==undefined){a=fix.far[rnd()*fix.far.length|0]}
      let x0=2*a+1,y0=2*b+1;
      if(fix&&fix.x0!==undefined){x0=fix.x0;y0=fix.y0}
      else{
        if(a<0||b<0||a>n-sc||b>n-sc)continue;
        if(a<=0&&b<=0)continue; if(a+sc>=n&&b+sc>=n)continue;
        if(overlaps(x0,y0,w))continue}
      let doors=[];
      if(fix&&fix.doors)doors=fix.doors;
      else for(let i=0;i<w;i++){
        if(g[x0+i][y0-1]===0)doors.push({i,j:0,rx:x0+i,ry:y0-1,ax:false});
        if(g[x0+i][y0+w]===0)doors.push({i,j:w-1,rx:x0+i,ry:y0+w,ax:false});
        if(g[x0-1][y0+i]===0)doors.push({i:0,j:i,rx:x0-1,ry:y0+i,ax:true});
        if(g[x0+w][y0+i]===0)doors.push({i:w-1,j:i,rx:x0+w,ry:y0+i,ax:true});
      }
      if(!doors.length)continue;
      const m=rnd()<.5?1:0,k=rnd()*4|0;
      const tf=(i,j)=>{if(m)i=w-1-i;for(let q=0;q<k;q++){const ni=w-1-j;j=i;i=ni}return [i,j]};
      const tv=(di,dj)=>{if(m)di=-di;for(let q=0;q<k;q++){const ni=-dj;dj=di;di=ni}return [di,dj]};
      const nS=w>=7?4:3,stl=[],pil=[];
      for(let q=0;q<nS;q++){const [i,j]=tf(nS-q,1);stl.push({i,j,q})}
      if(kind==='hall'){const P=w===7?[[2,3],[4,3],[2,5],[4,5]]:[[2,3],[4,3],[6,3],[2,5],[6,5],[2,7],[4,7],[6,7]];P.forEach(p=>pil.push(tf(...p)))}
      const SK=new Set(stl.map(o=>key(o.i,o.j))),PK=new Set(pil.map(p=>key(...p))),G=new Set();
      for(let i=0;i<w;i++)for(let j=0;j<w;j++){const kk=key(i,j);if(!SK.has(kk)&&!PK.has(kk))G.add(kk)}
      const ent=tf(nS+1,1);if(!G.has(key(...ent)))continue;
      if(doors.some(d=>!G.has(key(d.i,d.j))))continue;
      const first=doors[0],q0=[key(first.i,first.j)],vis=new Set(q0);
      while(q0.length){const [ci,cj]=q0.pop().split(',').map(Number);for(const [di,dj] of dirs){const kk=key(ci+di,cj+dj);if(G.has(kk)&&!vis.has(kk)){vis.add(kk);q0.push(kk)}}}
      if(vis.size!==G.size)continue;
      // --- применяем ---
      const isRing=(i,j)=>i===0||j===0||i===w-1||j===w-1;
      for(let i=0;i<w;i++)for(let j=0;j<w;j++){const x=x0+i,y=y0+j,kk=x*W+y;g[x][y]=0;
        if(isRing(i,j)){hmapU[kk]=HF;cmap[kk]=HF-.5;cmapU[kk]=SH}else cmap[kk]=SH}
      pil.forEach(([i,j])=>{g[x0+i][y0+j]=2});
      for(let i=-1;i<=w;i++)for(const j of [-1,w]){wmap[(x0+i)*W+(y0+j)]=SH;wmap[(x0+j)*W+(y0+i)]=SH}
      if(fix&&fix.ring){const dk=new Set(doors.map(d=>d.rx+','+d.ry));
        for(let i=-1;i<=w;i++)for(const j of [-1,w]){for(const [x,y] of [[x0+i,y0+j],[x0+j,y0+i]])if(!dk.has(x+','+y))g[x][y]=1}}
      const [sdx,sdy]=tv(-1,0),sts=[];
      stl.forEach(o=>{const bx=x0+o.i,by=y0+o.j,h0=o.q*HF/nS,h1=(o.q+1)*HF/nS;
        stairs.set(bx*W+by,{dx:sdx,dy:sdy,h0,h1});hmap[bx*W+by]=h0;sts.push({bx,by,dx:sdx,dy:sdy,h0,h1})});
      const topB=tf(1,1),topRing=tf(0,1);
      if(!outdoor)doors.forEach(d=>lintels.push([d.rx,d.ry,SH]));
      if(!(fix&&fix.x0!==undefined))taken.push([x0,y0,w]);
      const s={kind,layout:'gallery',x0,y0,w,a,b,sc,H:SH,doors,pil,stairsList:sts,topRing:key(...topRing),topIn:key(...topB),
               tf:(i,j)=>{const [p,q]=tf(i,j);return [x0+p,y0+q]},tv,
               ground:[...G].map(kk=>kk.split(',').map(Number))};
      structs.push(s);return s;
    }
    return null;
  };
  const cnt=(a,b,c)=>(n>=a?1:0)+(n>=b?1:0)+(n>=c?1:0);
  const plazas=[];
  if(outdoor){
    for(let pi=0;pi<cnt(9,16,24);pi++)for(let t=0;t<100;t++){
      const sc=6,wp=11;if(n<sc+1)break;
      const a=rnd()*(n-sc+1)|0,b=rnd()*(n-sc+1)|0;
      if(a<=0&&b<=0)continue; if(a+sc>=n&&b+sc>=n)continue;
      const px0=2*a+1,py0=2*b+1;if(overlaps(px0,py0,wp))continue;
      for(let x=px0;x<px0+wp;x++)for(let y=py0;y<py0+wp;y++)g[x][y]=0;
      taken.push([px0,py0,wp]);
      const bx0=px0+3,by0=py0+3,mid=2,side=rnd()*4|0;
      const door=[{i:mid,j:0,rx:bx0+mid,ry:by0-1,ax:false},{i:mid,j:4,rx:bx0+mid,ry:by0+5,ax:false},{i:0,j:mid,rx:bx0-1,ry:by0+mid,ax:true},{i:4,j:mid,rx:bx0+5,ry:by0+mid,ax:true}][side];
      const bs=tryStruct('keep',3,th.keepH||7.4,{x0:bx0,y0:by0,doors:[door],ring:true});
      if(!bs){for(let x=px0;x<px0+wp;x++)for(let y=py0;y<py0+wp;y++)g[x][y]=0;plazas.push({x0:px0,y0:py0,w:wp,b:null,side});break}
      plazas.push({x0:px0,y0:py0,w:wp,b:bs,side});break}
  }
  if(!outdoor){for(let i=0;i<cnt(10,17,25);i++)tryStruct('hall',rnd()<.5?4:5,th.hallH||7.4,null)}
  // башни: у уличных карт — парами по одной линии, чтобы соединить мостом
  const nt=n>=8?(1+(n>=14?1:0)+(n>=22?1:0)+(n>=28?1:0)):0;
  if(outdoor){
    for(let p=0;p<Math.ceil(nt/2);p++){
      const t1=tryStruct('tower',3,th.towerH||8,null);if(!t1)continue;
      if(p*2+1>=nt)continue;
      const far=[];for(let a=0;a<=n-3;a++)if(Math.abs(a-t1.a)>=4)far.push(a);
      const t2=tryStruct('tower',3,th.towerH||8,{b:t1.b,far});
      if(t2){ // мост по средней линии башен
        const L1=t1.x0<t2.x0?t1:t2,R1=t1.x0<t2.x0?t2:t1,rowY=t1.y0+2,Lx=L1.x0+5,Rx=R1.x0-1;
        const blocked=structs.some(r=>r!==L1&&r!==R1&&rowY>=r.y0-1&&rowY<=r.y0+r.w&&r.x0+r.w>=Lx&&r.x0-1<=Rx);
        if(!blocked){
          for(let x=Lx;x<=Rx;x++)hmapU[x*W+rowY]=HF;
          gates.push([Lx,rowY],[Rx,rowY]);bridges.push({y:rowY,x1:Lx,x2:Rx});L1.bridge=R1.bridge=true;
        }
      }
    }
  }else for(let i=0;i<nt;i++)tryStruct('tower',3,th.towerH||7.4,null);

  // ---- малые комнаты ----
  const rooms=[], want=n<7?1:Math.max(2,Math.round(n/2.4)), solid=['crypt','burial','crystal','frozen'], pil=['pillars','ruins'];
  for(let t=0;t<80&&rooms.length<want;t++){
    const big=rnd()<.35&&n>=9, sc=big?3:2, w=2*sc-1;
    if(n<sc+1)break;
    const a=rnd()*(n-sc+1)|0,b=rnd()*(n-sc+1)|0;
    if(a<=0&&b<=0)continue; if(a+sc>=n&&b+sc>=n)continue;
    const x0=2*a+1,y0=2*b+1;
    if(overlaps(x0,y0,w))continue;
    for(let x=x0;x<x0+w;x++)for(let y=y0;y<y0+w;y++)g[x][y]=0;
    const type=th.rooms[rnd()*th.rooms.length|0];
    if(big){
      for(const [i,j] of [[1,1],[3,1],[1,3],[3,3]])g[x0+i][y0+j]=2;
      if(solid.includes(type))g[x0+2][y0+2]=3;
    }else{
      if(pil.includes(type))g[x0+1][y0+1]=2;else if(solid.includes(type))g[x0+1][y0+1]=3;
    }
    taken.push([x0,y0,w]);
    rooms.push({x0,y0,w,type,big});
  }
  return {g,W,rooms,structs,plazas,hmap,hmapU,cmap,cmapU,wmap,stairs,lintels,gates,bridges,portals:[]};
}
const wc=(b)=>b*B+B/2;
