// Общие помощники для тестов (нужен playwright). Chromium берётся из /opt/pw-browsers, если есть.
const path=require('path'),fs=require('fs');
let pw;try{pw=require('playwright')}catch(e){pw=require(path.join(require('child_process').execSync('npm root -g').toString().trim(),'playwright'))}
const CHROME=process.env.CHROME||'/opt/pw-browsers/chromium';
async function open(w=960,h=540){
  const opts={args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']};
  if(fs.existsSync(CHROME))opts.executablePath=CHROME;
  const browser=await pw.chromium.launch(opts);
  const page=await browser.newPage({viewport:{width:w,height:h}});
  const errs=[];page.on('pageerror',e=>errs.push(e.message));page.on('console',m=>m.type()==='error'&&errs.push(m.text()));
  await page.goto('file://'+path.resolve(__dirname,'..','index.html'));
  return {browser,page,errs};
}
// строит уровень и ставит камеру: pose = 'start' | [x,z,yaw,pitch]
async function scene(page,theme,size=8,seed=1){
  return page.evaluate(([th,n,sd])=>{S.pix=2;onResize();game.peaceful=true;game.level=1;game.theme=th;game.size=n;game.seed=sd;const t=performance.now();build();game.started=true;
    document.getElementById('ui').style.display='none';
    return {ms:Math.round(performance.now()-t),wallTris:W.wallTris,loose:W.looseCount,lights:W.lights.length,niches:W.niches.length}},[theme,size,seed]);
}
async function pose(page,x,z,yaw,pitch=0){await page.evaluate(([x,z,yaw,pitch])=>{pl.x=x;pl.z=z;pl.yaw=yaw;pl.pitch=pitch;pl.y=floorH(x,z)+1.6;
  camera.position.set(x,pl.y,z);camera.rotation.set(pitch,yaw,0,'YXZ');animate(1,.016);renderFrame()},[x,z,yaw,pitch])}
module.exports={open,scene,pose};
