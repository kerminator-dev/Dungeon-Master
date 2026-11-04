// Reload during loot animation: the saved purse and receipts must agree, including partial collection.
const assert=require('assert/strict');
const {open}=require('./helpers');
(async()=>{const {browser,page,errs}=await open(640,360);
  const welcome={t:'welcome',v:7,id:1,token:'recoverytest',purse:null,pos:null,room:{
    players:[{id:1,name:'A',col:0,st:'in',loaded:true}],leader:1,admin:1,host:1,play:true,done:false,go:true,
    lv:{key:1,n:1,seed:4242,theme:'dungeon',size:8,extra:0,mapNext:false,restart:false},opened:[],back:[],rewards:[]}};
  const restore=async w=>page.evaluate(w=>{S.voice=false;game.instant=true;game.peaceful=true;
    window.__saved=null;NET.ws={readyState:1,bufferedAmount:0,send(s){const m=JSON.parse(s);if(m.t==='purse')window.__saved=m.p}};
    netWelcome(w);
  },w);
  try{
    await restore(welcome);
    const opened=await page.evaluate(()=>{
      const i=G.chests.findIndex(c=>c.kind==='chest'&&c.loot0.filter(l=>l.t!=='key'&&l.t!=='map').length>=2);
      if(i<0)throw Error('Fixture needs a chest with multiple rewards');
      const c=G.chests[i],purse=JSON.parse(JSON.stringify(__saved));
      netOn({t:'opened',i,by:NET.id});
      return {i,purse,loot:c.loot0};
    });
    const economic=opened.loot.filter(l=>l.t!=='key'&&l.t!=='map');
    const expected={gold:economic.filter(l=>l.t==='gold').reduce((n,l)=>n+l.n,0),
      picks:5+economic.filter(l=>l.t==='picks').reduce((n,l)=>n+l.n,0),gems:economic.filter(l=>l.t==='gem').length};
    const w=structuredClone(welcome);w.room.opened=[[opened.i,1]];w.room.rewards=[opened.i];w.purse=opened.purse;
    await page.reload();await restore(w);
    const balance=()=>page.evaluate(()=>({gold:game.gold,picks:game.picks,gems:game.gems.length}));
    assert.deepEqual(await balance(),expected);
    console.log('OK reload before animation restores all rewards');
    w.purse=await page.evaluate(()=>__saved);
    assert.equal(w.purse.claims.length,economic.length);
    await page.reload();await restore(w);
    assert.deepEqual(await balance(),expected);
    console.log('OK another reload does not duplicate rewards');

    await page.reload();await restore(welcome);
    w.purse=await page.evaluate(i=>{const c=G.chests[i];netOn({t:'opened',i,by:NET.id});
      netLoot(c.loot0.find(l=>l.t!=='key'&&l.t!=='map'),c);return __saved;
    },opened.i);
    assert.equal(w.purse.claims.length,1);
    await page.reload();await restore(w);
    assert.deepEqual(await balance(),expected);
    console.log('OK partially collected loot resumes without loss or duplication');

    // A key returned while its owner's page was gone: the economic reward still belongs to the first opener.
    await page.reload();await restore(welcome);
    const keyChest=await page.evaluate(()=>{const i=G.chests.findIndex(c=>c.isKey),c=G.chests[i];
      return {i,gold:c.loot0.filter(l=>l.t==='gold').reduce((n,l)=>n+l.n,0),purse:__saved};});
    const returned=structuredClone(welcome);returned.purse=keyChest.purse;returned.room.back=[keyChest.i];returned.room.rewards=[keyChest.i];
    await page.reload();await restore(returned);
    assert.equal((await balance()).gold,keyChest.gold);
    assert.equal(await page.evaluate(()=>G.hasKey),false);
    console.log('OK returned key does not lose or duplicate its original gold');

    // An older snapshot arriving with a restart still rolls back locally, without replacing the entry balance.
    const restarted=structuredClone(welcome);restarted.room.lv.key=2;restarted.room.lv.restart=true;
    restarted.purse={key:1,gold:150,picks:2,gems:[],entry:{gold:100,picks:5,gems:[]},claims:['0:1']};
    await page.reload();await restore(restarted);
    assert.deepEqual(await balance(),{gold:100,picks:5,gems:0});
    assert.equal(await page.evaluate(()=>game.entry.gold),100);
    assert.equal(await page.evaluate(()=>NET.claims.size),0);
    console.log('OK restart restores the entry purse and resets reward receipts');
    // Reconnect without reloading the old scene, after the team advanced to a different maze.
    const next=structuredClone(welcome);next.room.lv.key=3;next.room.lv.seed=77;
    next.room.opened=[[0,1]];next.room.rewards=[0];
    next.purse={key:3,gold:100,picks:5,gems:[],entry:{gold:100,picks:5,gems:[]},claims:[]};
    await page.reload();await restore(next);const nextBalance=await balance();
    await page.reload();await restore(welcome);await restore(next);
    assert.deepEqual(await balance(),nextBalance);
    console.log('OK reconnect to a new maze never applies its reward indices to the old scene');
    assert.deepEqual(errs,[]);
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
