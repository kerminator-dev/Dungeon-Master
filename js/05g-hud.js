'use strict';
// ---------- gear panel: pixel icons and counters ----------
const _icons={};
function hudIcon(id){if(_icons[id])return _icons[id];const S=16,c=mkCanvas(S,S),x=c.getContext('2d'),k=pxKit(x);
  const P=(pts,col)=>k.poly(pts,col);
  if(id==='key'){k.e(4,5,3,3,'#e8b84a');k.e(4,5,1,1,'rgba(0,0,0,0)');x.clearRect(3,4,3,3);k.r(6,4,9,2,'#e8b84a');k.r(11,6,2,3,'#e8b84a');k.r(14,6,1,2,'#e8b84a');k.r(7,4,7,1,'#fff0b0')}
  else if(id==='map'){k.r(2,3,12,10,'#d9c79c');k.r(2,3,2,10,'#a88a5a');k.r(12,3,2,10,'#a88a5a');k.l(5,6,10,6,'#5a3a1a');k.l(5,8,8,8,'#5a3a1a');k.l(6,10,10,10,'#5a3a1a');k.p(10,8,'#a01a10')}
  else if(id==='pick'){k.l(2,13,12,3,'#c8c4bc');k.l(3,13,13,3,'#7a766e');k.r(1,12,3,3,'#5a4632');k.r(12,2,2,2,'#e8e4dc')}
  else if(id==='coin'){for(const [cx,cy] of [[5,10],[10,10],[7,6]]){k.e(cx,cy,3,2,'#b08a2a');k.e(cx,cy-1,3,2,'#e8b84a');k.p(cx-1,cy-2,'#fff0b0')}}
  else if(id==='torch'){k.l(3,14,9,8,'#7a4c2c',2);k.l(4,14,9,9,'#4a2c18');k.r(8,7,3,3,'#45423e');k.r(9,4,4,4,'#3a2a1e');k.r(9,5,4,1,'#5e4a34');
    P([[9,4],[11,-1],[12,1],[14,0],[13,4]],'#ff7a24');P([[10,4],[11,1],[13,4]],'#ffe08a')}
  else if(id==='chest'){k.r(2,6,12,8,'#6a4024');k.r(2,4,12,3,'#7a4c2c');k.r(2,6,12,1,'#34302c');k.r(4,4,1,10,'#34302c');k.r(11,4,1,10,'#34302c');k.r(7,7,2,2,'#c8a040')}
  else if(id.startsWith('gem:')){const g=GEMS.find(q=>q.key===id.slice(4))||GEMS[0],col=new THREE.Color(g.col),hex=m=>'#'+col.clone().multiplyScalar(m).getHexString(),lt='#'+col.clone().lerp(new THREE.Color('#ffffff'),.55).getHexString();
    if(g.shape==='pearl'){k.e(8,9,5,5,hex(.85));k.e(7,8,3,3,hex(1));k.r(5,6,2,2,'#ffffff')}
    else if(g.shape==='rough'){P([[3,9],[5,4],[10,3],[13,7],[12,12],[7,13]],hex(.8));P([[5,4],[10,3],[11,8],[6,8]],hex(1.05));k.r(6,5,2,1,lt)}
    else if(g.shape==='soul'){P([[8,1],[12,8],[8,15],[4,8]],hex(.85));P([[8,1],[12,8],[8,9]],hex(1.1));k.r(7,5,2,6,lt);k.p(8,7,'#ffffff')}
    else{P([[3,6],[6,3],[10,3],[13,6],[8,13]],hex(.75));P([[3,6],[6,3],[10,3],[13,6]],hex(1.1));P([[6,6],[10,6],[8,13]],hex(.95));k.r(6,4,2,1,'#ffffff');k.l(3,6,13,6,lt)}}
  crisp(x,S,S,[16,12,10]);return _icons[id]=c.toDataURL()}

let _hudSig='';
function updateHud(){const box=document.getElementById('inv');if(!box||!G.chests)return;
  const s=Math.floor(G.time),time=`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
  const chests=G.chests.filter(c=>c.kind==='chest'),opened=chests.filter(c=>c.opened).length;
  const counts={};for(const g of game.gems)counts[g.key]=(counts[g.key]||0)+1;
  const sig=[time,G.hasKey,G.hasMap,game.torch,game.picks,game.gold,opened,chests.length,JSON.stringify(counts)].join('|');if(sig===_hudSig)return;_hudSig=sig;
  const it=(ic,txt,off,title)=>`<span class="it${off?' off':''}" title="${title||''}"><img src="${hudIcon(ic)}">${txt===undefined?'':`<b>${txt}</b>`}</span>`;
  let h=`<div class="row"><span class="time">${time}</span>${it('key','',!G.hasKey,'Gate key')}${it('map','',!G.hasMap,'Map')}${game.torch?it('torch','',false,'Torch'):''}`+
    `${it('coin',game.gold,false,'Gold')}${it('pick',game.picks,false,'Lockpicks')}${it('chest',opened+'/'+chests.length,false,'Chests')}</div>`;
  const gk=GEMS.filter(g=>counts[g.key]);
  if(gk.length)h+=`<div class="row gems">${gk.map(g=>it('gem:'+g.key,counts[g.key],false,g.name)).join('')}</div>`;
  box.innerHTML=h}
