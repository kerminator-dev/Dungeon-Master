// pictures of the maps for the map picker in the menu (img/maps/<map>.jpg): node tests/thumbs.js [map ...]
// each map is built from a fixed seed in its first (clear) weather and seen from a fixed spot along a corridor; a level
// generator change may move the walls, so a view may need a new spot. underground a soft light of the player's own
// shows the walls the way a torch would
const {open}=require('./helpers'),fs=require('fs'),path=require('path');
// map: [seed, x, z, yaw, pitch, forward]
const VIEWS={ruins:[11,24.2,3,Math.PI/2,.07,0],winter:[7,5.8,35,-Math.PI/2,.07,0],graveyard:[11,47,25.8,Math.PI,.09,0],desert:[7,47,21.8,Math.PI,.07,0],
  dungeon:[11,19,37.8,Math.PI,-.03,0],catacombs:[7,19,16.2,0,-.03,1.6],cistern:[11,3,44.2,0,-.03,0],tomb:[11,11,33.8,Math.PI,-.03,0]};
(async()=>{const want=process.argv.slice(2),{browser,page,errs}=await open(440,220),dir=path.resolve(__dirname,'..','img','maps');fs.mkdirSync(dir,{recursive:true});
  for(const [th,v] of Object.entries(VIEWS)){if(want.length&&!want.includes(th))continue;
    // a frame once came out blank (one colour, under 1 KB): such a picture is made again
    let img='';for(let k=0;k<3&&img.length<3000;k++)img=await page.evaluate(([th,[seed,x,z,yaw,pitch,fwd]])=>{S.pix=1;S.post=true;S.fov=60;onResize();game.peaceful=true;
      const T=THEMES[th],w0=T.weather;if(w0){const k=Object.keys(w0)[0];T.weather={[k]:w0[k]}}
      game.theme=th;game.size=12;game.level=1;game.seed=seed;build();if(w0)T.weather=w0;game.started=true;document.getElementById('ui').style.display='none';
      x-=Math.sin(yaw)*fwd;z-=Math.cos(yaw)*fwd;pl.x=x;pl.z=z;pl.yaw=yaw;pl.pitch=pitch;pl.y=floorH(x,z)+1.6;camera.position.set(x,pl.y,z);camera.rotation.set(pitch,yaw,0,'YXZ');
      updateTorch(0,10);updateOrb(0,10);if(TH.indoor){hand.visible=true;hand.color.set(TH.hand[0]);hand.intensity=TH.hand[1]*2.2;hand.distance=TH.hand[2]*1.4;hand.position.set(.3,.1,-.4)}
      lastPool=-1;for(let k=0;k<4;k++)animate(10+k*.2,.2);renderFrame();return renderer.domElement.toDataURL('image/jpeg',.84)},[th,v]);
    fs.writeFileSync(path.join(dir,th+'.jpg'),Buffer.from(img.split(',')[1],'base64'));console.log(th,'img/maps/'+th+'.jpg')}
  if(errs.length)console.log('errors:',errs);await browser.close()})();
