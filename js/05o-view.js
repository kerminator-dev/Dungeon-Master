'use strict';
// ---------- gestures, the view from behind, one's own frog ----------
// gestures (FROG.gesture): GEST.k which one (FROG.GD: 0 point where one looks, 1 wave, 2 come here, 3 stop, 4 hush), GEST.t
// s since it began (-1: none). together the others see it (the snapshot's gk, pt); from behind one sees one's own frog do it.
// they are picked on a wheel: Q held, the mouse toward one, Q let go (or a click)
const GEST={k:0,t:-1};
const GEST_NAMES=['Point','Wave','Come here','Stop','Hush'];
// (caught or through, there is no frog to make them; nor while picking a lock, nor with the map out: both hands hold it)
const gestCan=()=>game.started&&!game.loading&&!LP.active&&!(NET.on&&NET.st!=='in')&&!(G.hasMap&&bigMap);
// begun again while it is on, it goes on (pointing keeps pointing, a wave waves on)
function gestStart(k){if(!gestCan()||!FROG.GD[k])return;if(GEST.t>=0&&GEST.k===k){GEST.t=Math.min(GEST.t,FROG.GD[k][1]);return}GEST.k=k;GEST.t=0}
function gestTick(dt){if(GEST.t>=0&&(GEST.t+=dt)>=FROG.GD[GEST.k][0])GEST.t=-1}

// the wheel: the mouse's way from where it opened picks a sector (0 at the top, clockwise); near the middle nothing
const WHEEL={on:false,x:0,y:0,sel:-1,el:null};
function wheelBuild(){const N=GEST_NAMES.length,R=150,r=58,el=document.createElement('div');el.id='wheel';
  const pt=(a,d)=>[(R+Math.sin(a)*d).toFixed(1),(R-Math.cos(a)*d).toFixed(1)],w=2*Math.PI/N;
  el.innerHTML=`<svg viewBox="0 0 ${2*R} ${2*R}">${GEST_NAMES.map((n,i)=>{const a0=(i-.5)*w+.02,a1=(i+.5)*w-.02,[x0,y0]=pt(a0,R-4),[x1,y1]=pt(a1,R-4),[x2,y2]=pt(a1,r),[x3,y3]=pt(a0,r),[tx,ty]=pt(i*w,(R+r)/2);
    return `<path data-i="${i}" d="M${x0} ${y0}A${R-4} ${R-4} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${r} ${r} 0 0 0 ${x3} ${y3}Z"/><text x="${tx}" y="${ty}">${n}</text>`}).join('')}</svg><b></b>`;
  document.body.appendChild(el);return el}
function wheelOpen(){if(WHEEL.on||!gestCan())return;const el=WHEEL.el||(WHEEL.el=wheelBuild());Object.assign(WHEEL,{on:true,x:0,y:0,sel:-1});
  el.style.display='block';wheelDraw()}
function wheelMove(dx,dy){const l0=Math.hypot(WHEEL.x+=dx,WHEEL.y+=dy),k=l0>120?120/l0:1;WHEEL.x*=k;WHEEL.y*=k;const N=GEST_NAMES.length;
  WHEEL.sel=Math.hypot(WHEEL.x,WHEEL.y)<28?-1:((Math.round(Math.atan2(WHEEL.x,-WHEEL.y)/(2*Math.PI/N))%N)+N)%N;wheelDraw()}
function wheelDraw(){const el=WHEEL.el;el.querySelectorAll('path').forEach(p=>p.classList.toggle('sel',+p.dataset.i===WHEEL.sel));
  domSet(el.querySelector('b'),'text',WHEEL.sel>=0?GEST_NAMES[WHEEL.sel]:'Gestures')}
// go: the one picked is made (nothing picked: none)
function wheelClose(go){if(!WHEEL.on)return;WHEEL.on=false;WHEEL.el.style.display='none';if(go&&WHEEL.sel>=0)gestStart(WHEEL.sel)}
// Q let go: a pick is made, or with nothing picked the wheel is simply put away
function wheelKeyUp(){wheelClose(true)}

// ---------- the view from behind (V) ----------
// the camera over the right shoulder of the player (or of the teammate a caught player watches), looking where they look; it
// comes in closer where a wall is behind and off the shoulder where one is beside, both eased (a turn by a wall does not jerk
// the view) but never into the wall (VIEW_HARD is kept at once). the player's own frog is drawn then, making the gestures,
// holding the torch (the world is lit from its flame, not from in front of the eyes)
const VIEW={self:null,d:0,side:0,col:-1};
// VIEW_WALL: the room the camera eases to keep from a wall; VIEW_HARD: what it always keeps (the near plane is .05)
const VIEW_D=1.5,VIEW_SIDE=.36,VIEW_UP=.12,VIEW_WALL=.3,VIEW_HARD=.12,VIEW_RISE=.45,VIEW_SINK=.55;
const viewThird=()=>!!S.third&&game.started;
function viewToggle(){S.third=!S.third;saveSet();VIEW.d=0;VIEW.side=0;drawMap();toast(S.third?'View from behind · V: through the eyes':'View through the eyes · V: from behind',1800)}
// a wall where the camera would be (the arches of the outer wall and the maze beyond the grates are open; the exit's only
// once its gate is open)
function viewWall(x,z){const tx=Math.floor(x),tz=Math.floor(z);if(!W.tile||tx<0||tz<0||tx>=W.TW||tz>=W.TW)return true;const t=W.tile[tx*W.TW+tz];
  if(t===3){const A=W.exitArch;return !!G.gate&&!G.gate.open&&tx>=A.x0&&tx<A.x1&&tz>=A.z0&&tz<A.z1}
  return t>0&&t!==5}
// (m all round it, the diagonals too: the near plane never reaches a wall)
const VIEW_RING=[[1,0],[-1,0],[0,1],[0,-1],[.71,.71],[-.71,.71],[.71,-.71],[-.71,-.71]];
const viewFree=(x,z,m=VIEW_WALL)=>!viewWall(x,z)&&VIEW_RING.every(([a,b])=>!viewWall(x+a*m,z+b*m));
// the camera behind p (x, y: the eyes, z, yaw, pitch)
function viewCam(p,dt){const cy=Math.cos(p.pitch),fx=-Math.sin(p.yaw)*cy,fy=Math.sin(p.pitch),fz=-Math.cos(p.yaw)*cy,rx=Math.cos(p.yaw),rz=-Math.sin(p.yaw);
  // over the shoulder as far out as there is room (eased there), and no further out than the wall allows right now
  // (a thing standing beside, a gravestone, counts as a wall here)
  const sideOk=(s,m)=>viewFree(p.x+rx*s,p.z+rz*s,m)&&!blocked(p.x+rx*s,p.z+rz*s);
  let side=VIEW_SIDE;while(side>0&&!sideOk(side))side-=.04;
  VIEW.side+=(Math.max(0,side)-VIEW.side)*Math.min(1,dt*6);while(VIEW.side>0&&!sideOk(VIEW.side,VIEW_HARD))VIEW.side-=.02;
  VIEW.side=Math.max(0,VIEW.side);const ox=p.x+rx*VIEW.side,oz=p.z+rz*VIEW.side;
  // back as far as there is room (nor into a tall thing standing in the way: a shelf, a gravestone): in quickly, out slowly,
  // never past where the wall is right now (a thing it is only eased away from: one right behind would put it in the head)
  const room=(m,things)=>{let d=0;while(d<VIEW_D&&viewFree(ox-fx*(d+.05),oz-fz*(d+.05),m)&&!(things&&blocked(ox-fx*(d+.15),oz-fz*(d+.15))))d+=.05;return d};
  const d=room(VIEW_WALL,true);VIEW.d=Math.min(VIEW.d+(d-VIEW.d)*Math.min(1,dt*(d<VIEW.d?7:3)),room(VIEW_HARD,false));
  // never higher than a little over the eyes (looking down it would rise over the walls and see past them), nor into the vault;
  // never lower than the chest (looking up it would sink among the bones and rubble on the floor)
  const cx=ox-fx*VIEW.d,cz=oz-fz*VIEW.d,top=Math.min(p.y+VIEW_RISE,TH.indoor?ceilH(cx,cz)-.25:1e9);
  camera.position.set(cx,clamp(p.y+VIEW_UP-fy*VIEW.d,Math.max(floorH(cx,cz)+.3,p.y-VIEW_SINK),top),cz);camera.rotation.set(p.pitch,p.yaw,0,'YXZ');
  if(G.shake>0&&p.own)shakeCam()}
// one's own frog, made with the level (so its shaders are built with the rest) in one's cloak colour
function viewSelf(){const col=NET.on?(netMe()||{}).col|0:0;if(VIEW.self&&VIEW.self.m.parent===root&&VIEW.col===col)return VIEW.self;
  if(VIEW.self&&VIEW.self.m.parent){VIEW.self.m.parent.remove(VIEW.self.m);disposeTree(VIEW.self.m)}
  if(!root)return null;VIEW.col=col;VIEW.self=makeHero(root,col,'');VIEW.self.tag.visible=false;return VIEW.self}
// every frame, after the player has moved and the view is set (step, netWatchView): from behind, the camera put there, one's
// own frog shown and moved, the held light taken off the view and put on the frog's torch or its Candlelight
function viewUpdate(dt,t){const me=VIEW.self&&VIEW.self.m.parent===root?VIEW.self:null,w=netWatching()?netWatched():null;
  const mine=viewThird()&&!w&&!(NET.on&&NET.st!=='in');
  if(me)me.m.visible=mine;
  if(!viewThird())return;
  if(w&&w.x===undefined)return;
  const p=w||{x:pl.x,y:pl.y,z:pl.z,yaw:pl.yaw,pitch:pl.pitch,own:true};
  if(!w&&NET.on&&NET.st!=='in')return;
  viewCam(p,dt);
  let av=w?w.av:null;
  if(mine){const a=viewSelf();if(a){a.m.visible=true;a.m.position.set(pl.x,pl.y-1.6,pl.z);
    animHero(a,dt,t,{x:pl.x,z:pl.z,yaw:pl.yaw,pitch:pl.pitch,lt:game.orb?2:game.torch?1:0,fu:G.fuel,pt:GEST.t>0?GEST.t:0,gk:GEST.k,mp:G.hasMap?bigMap:0});av=a;
    // right against a wall the camera is in the frog's head: it is not drawn then
    a.m.visible=VIEW.d>.6}}
  if(TORCH)TORCH.T.visible=false;if(ORB)ORB.g.visible=false;
  if(av&&hand.visible){camera.updateMatrixWorld(true);hand.position.copy(camera.worldToLocal(av.light.clone()))}}
