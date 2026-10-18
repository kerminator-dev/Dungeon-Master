'use strict';
// ---------- trader between levels: sells a torch, lockpicks and the next maze's map, buys gems ----------
const WARES=[
  {id:'torch',name:'Torch',desc:'Light for the dark halls below. It burns down: relight it at any fire',icon:'torch',price:()=>TORCH_PRICE,buy:()=>{game.torch=true},sold:()=>game.torch},
  {id:'pick',name:'Lockpick',desc:'One more try at a lock',icon:'pick',price:()=>12,buy:()=>{game.picks++}},
  {id:'picks5',name:'Bundle of lockpicks ×5',desc:'Enough for a stubborn gate',icon:'pick',price:()=>50,buy:()=>{game.picks+=5}},
  {id:'map',name:'Map of the next maze',desc:'Start the next level with the map',icon:'map',price:()=>30+10*game.level,buy:()=>{game.mapNext=true},sold:()=>game.mapNext}];
function openTrader(sum){game.trading=true;game.sum=sum;if(document.exitPointerLock)document.exitPointerLock();showMenu('trader');drawTrader()}
function drawTrader(){const el=document.getElementById('scr-trader'),coin=`<img src="${hudIcon('coin')}">`,groups=new Map();
  for(const g of game.gems){const k=g.key+'|'+g.q;if(!groups.has(k))groups.set(k,{g,k,n:0});groups.get(k).n++}
  const total=game.gems.reduce((s,g)=>s+gemPrice(g),0);
  const row=(ic,name,small,btn)=>`<div class="ware"><img src="${hudIcon(ic)}"><span><b>${name}</b><small>${small}</small></span>${btn}</div>`;
  const buy=WARES.map(w=>{const p=w.price(),sold=w.sold&&w.sold();
    return row(w.icon,w.name,sold?'Bought':w.desc,`<button class="deal" data-buy="${w.id}"${sold||game.gold<p?' disabled':''}>${coin}${p}</button>`)}).join('');
  const sell=groups.size?[...groups.values()].map(({g,k,n})=>row('gem:'+g.key,g.name+(n>1?' ×'+n:''),gemPrice(g)+' gold each',`<button class="deal" data-sell="${k}">${coin}+${gemPrice(g)}</button>`)).join('')+
    `<button class="btn alt sellall" data-sellall>Sell all for ${total} gold</button>`:'<p>No gems to sell</p>';
  el.innerHTML=`<h2>Wandering trader</h2><p class="sum">${game.sum||''}</p>
    <div class="purse">${coin}<b>${game.gold}</b> gold <img src="${hudIcon('pick')}"><b>${game.picks}</b> lockpicks</div>
    <div class="trade"><section><h3>Buy</h3>${buy}</section><section><h3>Sell gems</h3>${sell}</section></div>
    <div class="menu row"><button class="btn" data-go>Descend to level ${game.level+1}</button></div>`}
function leaveTrader(){game.trading=false;game.level++;game.seed++;saveEntry();rollTheme();build();sndLevel();hideMenu();
  toast(TH.name+(TH.wname?' · '+TH.wname:'')+' · level '+game.level)}
document.getElementById('scr-trader').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;sndClick();
  const d=b.dataset;
  if(d.buy){const w=WARES.find(q=>q.id===d.buy),p=w.price();if(game.gold<p||(w.sold&&w.sold()))return;game.gold-=p;w.buy();sndCoins()}
  else if(d.sell){const i=game.gems.findIndex(g=>g.key+'|'+g.q===d.sell);if(i<0)return;game.gold+=gemPrice(game.gems[i]);game.gems.splice(i,1);sndCoins()}
  else if(d.sellall!==undefined){for(const g of game.gems)game.gold+=gemPrice(g);game.gems=[];sndCoins()}
  else if(d.go!==undefined){leaveTrader();return}
  drawTrader()});
