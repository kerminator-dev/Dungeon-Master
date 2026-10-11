// ---------- Игрок и управление ----------
const player={x:0,z:0,yaw:0,pitch:0,bob:0,eye:1.6,floor:0,eyeY:0,cool:0};
const keys={};
const $=id=>document.getElementById(id);
const ui=$('ui'), mapEl=$('map');
function pickTheme(){
  if(S.map==='random'||!THEMES[S.map]){const ids=Object.keys(THEMES).filter(i=>i!==game.theme);return ids[Math.random()*ids.length|0]}
  return S.map}
function toast(t){const e=$('toast');e.textContent=t;e.style.opacity=1;clearTimeout(toast.h);toast.h=setTimeout(()=>e.style.opacity=0,1800)}
function showScreen(id){for(const s of ['scr-main','scr-play','scr-set'])$(s).classList.toggle('hidden',s!==id)}
function startGame(){
  level=0;N=S.size;game.theme=pickTheme();build();game.started=true;
  canvas.requestPointerLock();}
addEventListener('keydown',e=>{keys[e.code]=true;
  if(e.code==='KeyM')mapEl.style.display=mapEl.style.display==='block'?'none':'block';
  if(e.code==='KeyR'&&document.pointerLockElement===canvas)build()});
addEventListener('keyup',e=>keys[e.code]=false);
document.addEventListener('pointerlockchange',()=>{
  const locked=document.pointerLockElement===canvas;
  ui.style.display=locked?'none':'flex';
  if(!locked){showScreen('scr-main');$('btnResume').classList.toggle('hidden',!game.started);for(const k in keys)keys[k]=false}});
addEventListener('mousemove',e=>{if(document.pointerLockElement!==canvas)return;
  const k=.0022*S.sens;
  player.yaw-=e.movementX*k;player.pitch=Math.max(-1.45,Math.min(1.45,player.pitch-e.movementY*k*(S.invert?-1:1)))});

// --- меню ---
$('btnResume').onclick=()=>canvas.requestPointerLock();
$('btnPlay').onclick=()=>showScreen('scr-play');
$('btnSet').onclick=()=>showScreen('scr-set');
$('btnStart').onclick=startGame;
document.querySelectorAll('[data-back]').forEach(b=>b.onclick=()=>showScreen('scr-main'));
// карточки карт
const mapsEl=$('maps');
function renderMaps(){
  mapsEl.innerHTML='';
  const items=[...Object.entries(THEMES).map(([id,t])=>({id,name:t.name,desc:t.desc,sw:t.sw})),{id:'random',name:'Случайная',desc:'Новая карта при каждом выходе',sw:['#8a4a30','#40a0ff']}];
  for(const it of items){
    const c=document.createElement('div');c.className='card'+(S.map===it.id?' sel':'');
    c.innerHTML='<i style="background:linear-gradient(90deg,'+it.sw[0]+','+it.sw[1]+')"></i><b>'+it.name+'</b><span>'+it.desc+'</span>';
    c.onclick=()=>{S.map=it.id;saveS();renderMaps()};mapsEl.appendChild(c)}
}
renderMaps();
function bindSlider(id,key,fmt,apply){
  const el=$(id),lab=$(id+'V');el.value=S[key];lab.textContent=fmt(S[key]);
  el.addEventListener('input',()=>{S[key]=+el.value;lab.textContent=fmt(S[key]);saveS();apply&&apply()})}
function bindCheck(id,key,apply){const el=$(id);el.checked=S[key];el.addEventListener('change',()=>{S[key]=el.checked;saveS();apply&&apply()})}
bindSlider('sens','sens',v=>'×'+(+v).toFixed(2));
bindSlider('fov','fov',v=>v+'°',resize);
bindSlider('pix','pix',v=>v+'px',resize);
bindSlider('size','size',v=>v+'×'+v);
bindCheck('showfps','fps',()=>{$('fps').style.display=S.fps?'block':'none'});
bindCheck('bob','bob');bindCheck('invert','invert');
$('cap').value=String(S.cap);$('cap').onchange=()=>{S.cap=+$('cap').value;nextT=0;saveS()};
$('fps').style.display=S.fps?'block':'none';

const RAD=.38;
function solidL(x,z,ref){const bx=Math.floor(x/B),bz=Math.floor(z/B),g=maze.g;if(!g[bx]||g[bx][bz]===undefined)return true;
  const up=maze.hmapU[bx*maze.W+bz];if(up>0&&Math.abs(up-ref)<.9)return false;return g[bx][bz]!==0}
function blockedL(x,z,ref){return solidL(x-RAD,z-RAD,ref)||solidL(x+RAD,z-RAD,ref)||solidL(x-RAD,z+RAD,ref)||solidL(x+RAD,z+RAD,ref)}
function canGo(nx,nz){const ref=player.floor;return !blockedL(nx,nz,ref)&&Math.abs(floorAt(nx,nz,ref)-ref)<=.65}
function move(dx,dz){if(canGo(player.x+dx,player.z))player.x+=dx;if(canGo(player.x,player.z+dz))player.z+=dz;player.floor=floorAt(player.x,player.z,player.floor)}

const mapC=mapEl,mg=mapC.getContext('2d');
function updateMap(){const W=maze.W;mapC.width=W;mapC.height=W;mapC.style.width=mapC.style.height=Math.min(220,Math.max(W*4,120))+'px'}
function drawMap(){const W=maze.W;mg.clearRect(0,0,W,W);
  for(let x=0;x<W;x++)for(let y=0;y<W;y++){mg.fillStyle=maze.g[x][y]?'#5a3a2c':(maze.hmap[x*W+y]>0?'#3a4a6a':(maze.cmap[x*W+y]>0?'#2a2230':'#1a1210'));mg.fillRect(x,y,1,1)}
  mg.fillStyle='#a070ff';for(const p of maze.portals)mg.fillRect(p.x/B-.5,p.z/B-.5,1,1);
  mg.fillStyle='#ffcc66';mg.fillRect(exitPos.x/B|0,exitPos.z/B|0,1,1);
  mg.fillStyle='#4af';mg.fillRect(player.x/B-.5,player.z/B-.5,1,1)}

const clock=new THREE.Clock();let t=0,fN=0,fT=0,nextT=0,rafLast=0,rafDt=[],msAcc=0,hzTxt='';
function frame(now){
  requestAnimationFrame(frame);
  if(rafLast){rafDt.push(now-rafLast);if(rafDt.length>40)rafDt.shift()}rafLast=now;
  const tStart=performance.now();
  if(S.cap>0){const iv=1000/S.cap;if(now<nextT-2)return;nextT+=iv;if(nextT<now-iv)nextT=now}
  const rawDt=clock.getDelta(),dt=Math.min(rawDt,.05);t+=dt;
  fN++;fT+=rawDt;
  if(fT>=.5){
    const srt=[...rafDt].sort((a,b)=>a-b),med=srt.length?srt[srt.length>>1]:16.7,hz=Math.round(1000/med);
    hzTxt=hz+' Гц';
    $('fps').textContent=Math.round(fN/fT)+' FPS'+(S.cap?' (лимит '+S.cap+')':'')+' · монитор/браузер ~'+hz+' Гц · кадр '+(msAcc/fN).toFixed(1)+' мс';
    $('hzInfo').textContent='Частота обновления браузера: ~'+hz+' Гц'+(hz<=35?' — браузер/система ограничивает до 30 (проверь режим энергосбережения, Low Power Mode, частоту монитора)':'');
    fN=0;fT=0;msAcc=0}
  if(document.pointerLockElement===canvas){
    const inW=maze.water&&maze.water.has(Math.floor(player.x/B)+','+Math.floor(player.z/B)),sp=(keys.ShiftLeft?5.5:3.2)*dt*(inW&&!curTh.snowy?.62:1);
    let f=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0);
    let s=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0);
    if(f||s){const l=Math.hypot(f,s);f/=l;s/=l;
      const sy=Math.sin(player.yaw),cy=Math.cos(player.yaw);
      move((-sy*f+cy*s)*sp,(-cy*f-sy*s)*sp);player.bob+=dt*(keys.ShiftLeft?11:8)}
  }
  camera.position.set(player.x,player.eyeY+player.eye+(S.bob?Math.sin(player.bob)*.04:0),player.z);
  camera.rotation.set(player.pitch,player.yaw,0);
  player.eyeY+=(player.floor-player.eyeY)*Math.min(1,dt*14);
  T.water.offset.set(t*.05,t*.03);
  if(player.cool>0)player.cool-=dt;
  const th=curTh;
  const j=.85+Math.sin(t*17)*.08+Math.sin(t*31)*.07;
  hand.intensity=th.hand[1]*j;
  const cam=camera.position;
  const near=torches.map(p=>[p,p.distanceToSquared(cam)]).sort((a,b)=>a[1]-b[1]).slice(0,pool.length);
  pool.forEach((l,i)=>{if(near[i]){l.position.copy(near[i][0]);l.color.setHex(near[i][0].col||0xffa860);l.intensity=(1.3+Math.sin(t*13+i*2)*.25)}else l.intensity=0});
  for(const f of flames){const s=1+Math.sin(t*20+f.id)*.08;f.scale.y=(f.scale.x*1.5)*s}
  if(parts){const u=parts.userData,p=parts.geometry.attributes.position;parts.position.set(player.x,0,player.z);
    for(let i=0;i<p.count;i++){let y=p.getY(i)-dt*u.fall;if(y<0)y+=u.H;if(y>u.H)y-=u.H;p.setY(i,y);p.setX(i,p.getX(i)+Math.sin(t+i)*dt*u.sway)}p.needsUpdate=true}
  if(skyMesh&&skyMesh.visible){skyMesh.position.set(player.x,0,player.z);{const bp=moonSprite.userData.bpos;moonSprite.position.set(player.x+bp[0],bp[1],player.z+bp[2])}}
  if(game.started&&Math.hypot(player.x-exitPos.x,player.z-exitPos.z)<1.3){
    level++;game.theme=pickTheme();build();toast('Выход найден! Уровень '+(level+1))}
  if(mapEl.style.display==='block')drawMap();
  renderer.render(scene,camera);
  msAcc+=performance.now()-tStart;
}
for(const k in THEMES)THEMES[k].id=k;
game.theme=THEMES[S.map]?S.map:'dungeon';
build();requestAnimationFrame(frame);
