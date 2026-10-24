// shared test helpers (needs playwright). uses chromium from /opt/pw-browsers if present.
const path=require('path'),fs=require('fs');
let pw;try{pw=require('playwright')}catch(e){pw=require(path.join(require('child_process').execSync('npm root -g').toString().trim(),'playwright'))}
const CHROME=process.env.CHROME||'/opt/pw-browsers/chromium';
const launch=()=>{const opts={args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']};
  if(fs.existsSync(CHROME))opts.executablePath=CHROME;return pw.chromium.launch(opts)};
// a page of the game; init: a script run in it before the game's own (tests of playing together put a socket in)
async function page(browser,w,h,init,url){const ctx=await browser.newContext({viewport:{width:w,height:h}}),page=await ctx.newPage();
  const errs=[];page.on('pageerror',e=>errs.push(e.message));page.on('console',m=>m.type()==='error'&&errs.push(m.text()));
  if(init)await page.addInitScript(init);
  await page.goto(url||'file://'+path.resolve(__dirname,'..','index.html'));
  // levels are built at once, with no loading screen (a test of the screen turns it back on)
  await page.evaluate(()=>{game.instant=true});
  return {page,errs};
}
async function open(w=960,h=540){const browser=await launch();return Object.assign({browser},await page(browser,w,h))}
// builds a level and places the camera: pose = 'start' | [x,z,yaw,pitch]
async function scene(page,theme,size=8,seed=1){
  return page.evaluate(([th,n,sd])=>{S.pix=2;onResize();game.peaceful=true;game.level=1;game.theme=th;game.size=n;game.seed=sd;const t=performance.now();build();game.started=true;
    document.getElementById('ui').style.display='none';
    return {ms:Math.round(performance.now()-t),wallTris:W.wallTris,loose:W.looseCount,lights:W.lights.length,niches:W.niches.length}},[theme,size,seed]);
}
async function pose(page,x,z,yaw,pitch=0){await page.evaluate(([x,z,yaw,pitch])=>{pl.x=x;pl.z=z;pl.yaw=yaw;pl.pitch=pitch;pl.y=floorH(x,z)+1.6;
  camera.position.set(x,pl.y,z);camera.rotation.set(pitch,yaw,0,'YXZ');animate(1,.016);renderFrame()},[x,z,yaw,pitch])}
module.exports={open,scene,pose,launch,page};
