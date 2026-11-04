'use strict';
// Personal mutes stay local; kick authority and its session timeout belong to the server.
const ROSTER={on:false,voice:new Set(),chat:new Set(),signature:'',cursor:false,relocking:false,kick:0,kickUntil:0};
function rosterMode(){$('roster').classList.toggle('interactive',!locked);$('rosterCursorHint').textContent=locked?'C: cursor':ROSTER.cursor?'C: camera':''}
function rosterOpen(){if(!NET.on||ROSTER.on)return;ROSTER.on=true;ROSTER.cursor=false;ROSTER.kick=0;
  $('roster').classList.remove('hidden');rosterMode();rosterDraw();
}
function rosterCapture(){ROSTER.relocking=true;const done=()=>{ROSTER.relocking=false;ROSTER.cursor=ROSTER.on&&!locked;rosterMode()};
  try{const p=canvas.requestPointerLock();if(p&&p.then)p.then(done,done);else setTimeout(done,500)}catch(e){done()}
}
function rosterClose(resume=true){if(!ROSTER.on)return;const capture=resume&&ROSTER.cursor&&game.started&&$('ui').style.display==='none';
  ROSTER.on=false;ROSTER.cursor=false;ROSTER.kick=0;$('roster').classList.add('hidden');if(capture)rosterCapture();
}
function rosterDraw(){if(!ROSTER.on)return;const signature=JSON.stringify([NET.id,NET.admin,NET.players.map(p=>[p.id,p.name,p.col,p.st,p.off])]);
  if(signature!==ROSTER.signature){ROSTER.signature=signature;$('rosterList').innerHTML=NET.players.map(p=>{
    const me=p.id===NET.id,admin=p.id===NET.admin,color=HERO_COLS[p.col%HERO_COLS.length];
    return `<tr class="roster-player${me?' me':''}" data-player="${p.id}"><td><span class="roster-name"><b title="${esc(p.name)}">${esc(p.name)}</b>${voiceIcon(p.id)}</span></td><td><span class="roster-color"><i style="background:${color[1]}"></i>${color[0]}</span></td><td class="roster-status">${admin?'Admin':''}</td><td class="roster-ping"></td><td><div class="roster-actions">${me?'':`<button type="button" data-action="voice" aria-pressed="false"></button><button type="button" data-action="chat" aria-pressed="false"></button>${NET.admin===NET.id?'<button type="button" class="danger" data-action="kick">Kick</button>':''}`}</div></td></tr>`}).join('')}
  for(const row of $('rosterList').children){const id=+row.dataset.player,p=NET.players.find(p=>p.id===id);row.querySelector('.roster-ping').textContent=p.off?'Offline':num(p.ping)?Math.round(p.ping)+' ms':'— ms';
    for(const button of row.querySelectorAll('[data-action]')){const action=button.dataset.action;
      if(action==='kick'){button.textContent=ROSTER.kick===id&&performance.now()<ROSTER.kickUntil?'Confirm kick':'Kick';button.disabled=!!NET.cut;continue}
      const muted=ROSTER[action].has(id);button.textContent=(muted?'Unmute ':'Mute ')+(action==='voice'?'voice':'chat');button.setAttribute('aria-pressed',String(muted));button.setAttribute('aria-label',button.textContent+': '+p.name);
    }}
  voiceUI();
}
function rosterAction(button){const row=button.closest('[data-player]');if(!row)return;const id=+row.dataset.player,action=button.dataset.action;
  if(id===NET.id||!NET.players.some(p=>p.id===id))return;
  if(action==='kick'){if(NET.admin!==NET.id||NET.cut)return;
    if(ROSTER.kick!==id||performance.now()>ROSTER.kickUntil){ROSTER.kick=id;ROSTER.kickUntil=performance.now()+6000;rosterDraw();return}
    netSend({t:'kick',id});ROSTER.kick=0;rosterDraw();return;
  }
  if(!['voice','chat'].includes(action))return;const set=ROSTER[action];if(set.has(id))set.delete(id);else set.add(id);
  if(action==='voice'){const p=VOICE.peers.get(id);if(set.has(id)&&p&&p.audio){voiceActivity(id,false,p.audio);if(p.audio.sources)for(const source of p.audio.sources)try{source.stop()}catch(e){}}voiceVolume()}
  else chatDraw();rosterDraw();
}
function rosterInit(){$('rosterList').onclick=e=>{const b=e.target.closest('button[data-action]');if(b)rosterAction(b)};
  document.addEventListener('keydown',e=>{
    if(e.code==='Tab'&&(ROSTER.on||NET.on&&!chatOn()&&!(e.target.closest&&e.target.closest('#scr-set'))&&!/^(INPUT|TEXTAREA|SELECT)$/.test((e.target&&e.target.tagName)||''))){e.preventDefault();e.stopPropagation();if(!e.repeat)rosterOpen()}
    else if(e.code==='KeyC'&&ROSTER.on&&!chatOn()){e.preventDefault();e.stopPropagation();if(!e.repeat&&!ROSTER.relocking){if(locked){ROSTER.cursor=true;if(document.exitPointerLock)document.exitPointerLock()}else if(ROSTER.cursor)rosterCapture()}}
    else if(e.code==='Escape'&&ROSTER.on)rosterClose(false);
  },true);
  document.addEventListener('keyup',e=>{if(e.code==='Tab'&&ROSTER.on){e.preventDefault();e.stopPropagation();rosterClose()}},true);
  addEventListener('blur',()=>rosterClose(false));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)rosterClose(false)});
  setInterval(()=>{if(ROSTER.on)rosterDraw()},500);
}
