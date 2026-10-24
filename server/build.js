// builds the co-op server: one executable with the whole game inside it, nothing else needed to run it (dist/).
//   node server/build.js              for this computer
//   node server/build.js --universal  macOS: one file for both Apple silicon and Intel Macs
//                                     (once: rustup target add x86_64-apple-darwin aarch64-apple-darwin)
// the game is baked in at build time: build again after changing it (players get the game from the server)
const {execFileSync}=require('child_process'),fs=require('fs'),path=require('path');
const here=__dirname,dist=path.join(here,'..','dist'),exe=process.platform==='win32'?'.exe':'';
const run=(cmd,args)=>execFileSync(cmd,args,{cwd:here,stdio:'inherit'});
const out=path.join(dist,'DungeonMasterServer'+exe);
fs.mkdirSync(dist,{recursive:true});
if(process.argv.includes('--universal')){
  if(process.platform!=='darwin')throw new Error('--universal is for macOS');
  const arches=['aarch64-apple-darwin','x86_64-apple-darwin'];
  for(const t of arches)run('cargo',['build','--release','--target',t]);
  run('lipo',['-create','-output',out,...arches.map(t=>path.join(here,'target',t,'release','dungeon-master-server'))]);
  // a file put together by lipo needs signing again before macOS runs it
  run('codesign',['--sign','-','--force',out])}
else{run('cargo',['build','--release']);fs.copyFileSync(path.join(here,'target','release','dungeon-master-server'+exe),out);fs.chmodSync(out,0o755)}
console.log(`\n  ${path.relative(process.cwd(),out)}  ${(fs.statSync(out).size/1048576).toFixed(1)} MB: start it, then open the address it shows`)
