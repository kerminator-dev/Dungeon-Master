// Общие помощники для тестов. Запуск: node tests/smoke.js  (нужен playwright: npm i playwright)
const path=require('path');
let pw;try{pw=require('playwright')}catch(e){pw=require(path.join(require('child_process').execSync('npm root -g').toString().trim(),'playwright'))}
const CHROME=process.env.CHROME||'/opt/pw-browsers/chromium';
async function open(w=1024,h=576){
  const fs=require('fs');
  const opts={args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']};
  if(fs.existsSync(CHROME))opts.executablePath=CHROME;
  const browser=await pw.chromium.launch(opts);
  const page=await browser.newPage({viewport:{width:w,height:h}});
  const errs=[];page.on('pageerror',e=>errs.push(e.message));page.on('console',m=>m.type()==='error'&&errs.push(m.text()));
  await page.goto('file://'+path.resolve(__dirname,'..','index.html'));
  await page.evaluate(()=>{document.getElementById('ui').style.display='none'});
  return {browser,page,errs};
}
module.exports={open};
