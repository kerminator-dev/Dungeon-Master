'use strict';
// ---------- trader between levels: sells a torch, Candlelight, lockpicks and the next maze's map, buys gems ----------
// Candlelight is the dearest ware; once it is had, a torch is of no more use
const WARES=[
  {id:'torch',name:'Torch',desc:'Light for the dark halls and the night. It burns down: relight it at any fire',icon:'torch',price:()=>TORCH_PRICE,buy:()=>{game.torch=true},sold:()=>game.torch,
    off:()=>game.orb&&'Not needed: Candlelight lights your way'},
  {id:'orb',name:'Candlelight',desc:'An orb of light at your shoulder. It never goes out, and outshines any torch',icon:'orb',price:()=>ORB_PRICE,buy:()=>{game.orb=true},sold:()=>game.orb},
  {id:'pick',name:'Lockpick',desc:'One more try at a lock',icon:'pick',price:()=>24,buy:()=>{game.picks++}},
  {id:'picks5',name:'Bundle of lockpicks ×5',desc:'Enough for a stubborn gate',icon:'pick',price:()=>100,buy:()=>{game.picks+=5}},
  // dearer with every level, but never as dear as Candlelight. together it is the team's: one of them buys it for all
  {id:'map',name:'Map of the next maze',desc:'Start the next level with the map',icon:'map',price:()=>Math.min(60+20*game.level,ORB_PRICE-100),buy:()=>{game.mapNext=true},
    sold:()=>game.mapNext||NET.on&&!!NET.mapBuy}];
const wareOff=w=>!(w.sold&&w.sold())&&w.off&&w.off();
// a ware bought: by this player, or (the team's map) by a teammate
const wareSold=w=>w.id==='map'&&NET.on&&NET.mapBuy&&NET.mapBuy!==NET.id?'Bought by '+esc(netName(NET.mapBuy))+' for the team':'Bought';
function openTrader(sum){game.trading=true;game.sum=sum;if(document.exitPointerLock)document.exitPointerLock();showMenu('trader');drawTrader()}
function drawTrader(){const el=document.getElementById('scr-trader'),coin=`<img src="${hudIcon('coin')}">`,groups=new Map();
  for(const g of game.gems){const k=g.key+'|'+g.q;if(!groups.has(k))groups.set(k,{g,k,n:0});groups.get(k).n++}
  const total=game.gems.reduce((s,g)=>s+gemPrice(g),0);
  const row=(ic,name,small,btn)=>`<div class="ware"><img src="${hudIcon(ic)}"><span><b>${name}</b><small>${small}</small></span>${btn}</div>`;
  // dearest first: the map's price grows with the level, so the order is set anew each time
  const buy=[...WARES].sort((a,b)=>b.price()-a.price()).map(w=>{const p=w.price(),sold=w.sold&&w.sold(),off=wareOff(w);
    return row(w.icon,w.name,sold?wareSold(w):off||w.desc,`<button class="deal" data-buy="${w.id}"${sold||off||game.gold<p?' disabled':''}>${coin}${p}</button>`)}).join('');
  const sell=groups.size?[...groups.values()].map(({g,k,n})=>row('gem:'+g.key,g.name+(n>1?' ×'+n:''),gemPrice(g)+' gold each',`<button class="deal" data-sell="${k}">${coin}+${gemPrice(g)}</button>`)).join('')+
    `<button class="btn alt sellall" data-sellall>Sell all for ${total} gold</button>`:'<p>No gems to sell</p>';
  el.innerHTML=`<h2>Wandering trader</h2><p class="sum">${game.sum||''}</p>
    <div class="purse">${coin}<b>${game.gold}</b> gold <img src="${hudIcon('pick')}"><b>${game.picks}</b> lockpicks</div>
    <div class="trade"><section><h3>Buy</h3>${buy}</section><section><h3>Sell gems</h3>${sell}</section></div>
    ${NET.on?traderTeam():`<div class="menu row"><button class="btn" data-go>Descend to level ${game.level+1}</button></div>`}`}
// together: everyone trades on their own; the next level begins when the last one is through and everyone is ready
function traderTeam(){const me=netMe()||{},rd=!!me.ready;
  return `<div class="team">${netTeam()}</div><p class="wait">${!NET.done?'The others are still in the maze: the level goes on until they are through':
      rd?'Waiting for everyone to be ready':'Everyone is through. The next level begins when all are ready'}</p>
    <div class="menu row"><button class="btn alt" data-leave>Leave the game</button><button class="btn" data-go>${rd?'Not ready':'Ready for level '+(game.level+1)}</button></div>`}
// the mouse is captured right on the click (it needs one), the next level is built behind the loading screen
function leaveTrader(){game.trading=false;game.level++;game.seed++;saveEntry();rollTheme();hideMenu();
  loadLevel({done:()=>{sndLevel();toast(TH.name+(TH.wname?' · '+TH.wname:'')+' · level '+game.level)}})}
document.getElementById('scr-trader').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;sndClick();
  const d=b.dataset;
  if(d.buy){const w=WARES.find(q=>q.id===d.buy),p=w.price();if(game.gold<p||(w.sold&&w.sold())||wareOff(w))return;
    // the team's map: paid when the server says this player was the first to buy it (netMapNext)
    if(NET.on&&w.id==='map'){netAsk({t:'mapnext'});return}
    game.gold-=p;w.buy();sndCoins()}
  else if(d.sell){const i=game.gems.findIndex(g=>g.key+'|'+g.q===d.sell);if(i<0)return;game.gold+=gemPrice(game.gems[i]);game.gems.splice(i,1);sndCoins()}
  else if(d.sellall!==undefined){for(const g of game.gems)game.gold+=gemPrice(g);game.gems=[];sndCoins()}
  else if(d.go!==undefined){if(NET.on)netReady();else{leaveTrader();return}}
  else if(d.leave!==undefined){netQuit();return}
  drawTrader()});
