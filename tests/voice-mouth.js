// Mouth rig, independent speakers and voice lifecycle guards.
const assert=require('assert');const {open,scene}=require('./helpers');
(async()=>{const {browser,page,errs}=await open();try{await scene(page,'dungeon',8,1);
const result=await page.evaluate(()=>{
 const root=new THREE.Group(),a=makeHero(root,0,'A'),b=makeHero(root,1,'B');
 const pose={id:910,x:0,z:0,yaw:0,pitch:0,mp:0,lt:0,pt:0};
 audioInit();NET.on=true;NET.cut=false;VOICE.on=true;VOICE.blocked=false;
 // The fake waveform exercises the same analyser entry point as WebRTC and PCM.
 const node={analyser:{getByteTimeDomainData(data){data.fill(148)}},data:new Uint8Array(512)};
 VOICE.peers.set(910,{audio:node});const oldHearing=voiceHearing;voiceHearing=()=>1;
 const oldCtx=Snd.ctx;Snd.ctx={state:'running'};
 for(let i=0;i<90;i++){animHero(a,1/60,i/60,pose);animHero(b,1/60,i/60,{...pose,id:911})}
 const opened=a.F.jaw.rotation.x,other=b.F.jaw.rotation.x;
 VOICE.states.set(910,{mic:true,muted:true});const muted=voiceMouthLevel(910);VOICE.states.clear();
 node.blocked=true;const blocked=voiceMouthLevel(910);node.blocked=false;
 VOICE.blocked=true;const independent=voiceMouthLevel(910);VOICE.blocked=false;
 // Exercise the actual third-person caller, not just animHero with a hand-built pose.
 VOICE.local=node;NET.id=912;NET.st='in';const oldThird=S.third;S.third=true;
 for(let i=0;i<90;i++)viewUpdate(1/60,i/60);
 const self=VIEW.self.F.jaw.rotation.x;VOICE.muted=true;const localMuted=voiceMouthLevel(NET.id);VOICE.muted=false;VOICE.local=null;S.third=oldThird;
 NET.cut=true;const disconnected=voiceMouthLevel(910);NET.cut=false;
 VOICE.peers.delete(910);for(let i=0;i<120;i++)animHero(a,1/60,2+i/60,pose);
 const closed=a.F.jaw.rotation.x;
 const compatibility=[];
 for(const mp of [0,1,2])for(const gk of [0,1,2,3,4]){
   animHero(a,1/60,4,{...pose,mp,gk,pt:.4});
   a.F.g.updateMatrixWorld(true);
   compatibility.push(a.F.head.matrixWorld.elements.every(Number.isFinite)&&a.F.jaw.matrixWorld.elements.every(Number.isFinite));
 }
 const rates=[30,60,144].map(hz=>{a.F.mouthState=null;for(let i=0;i<hz;i++){FROG.step(a.F,a.A,1/hz,i/hz,{vx:0,vz:0,face:0,look:0,pitch:0});FROG.mouth(a.F,.1,1/hz)}return a.F.jaw.rotation.x});
 const tongue=a.F.g.children.find(x=>x.isSkinnedMesh&&x.material.map),tp=tongue.geometry.attributes.position;let minX=Infinity,maxX=-Infinity,top=-Infinity,minZ=Infinity,maxZ=-Infinity;for(let i=0;i<tp.count;i++){minX=Math.min(minX,tp.getX(i));maxX=Math.max(maxX,tp.getX(i));top=Math.max(top,tp.getY(i));minZ=Math.min(minZ,tp.getZ(i));maxZ=Math.max(maxZ,tp.getZ(i))}const smallTongue=maxX-minX>.095&&maxX-minX<.105&&minZ<.02&&maxZ>.23&&maxZ-minZ>2*(maxX-minX)&&top>1.165&&tongue.geometry.attributes.uv.count===tp.count&&tongue.material.map.image.width===128;
 const mesh=a.F.g.children.find(x=>x.isSkinnedMesh),bones=mesh.skeleton.bones;
 const jawIndex=bones.indexOf(a.F.jaw);let weighted=false;
 for(const m of a.F.g.children.filter(x=>x.isSkinnedMesh)){const ix=m.geometry.attributes.skinIndex,w=m.geometry.attributes.skinWeight;for(let i=0;i<ix.count;i++)for(let j=0;j<4;j++)if(ix.array[i*4+j]===jawIndex&&w.array[i*4+j]>0)weighted=true}
 voiceHearing=oldHearing;Snd.ctx=oldCtx;VOICE.on=false;NET.on=false;
 return {opened,other,muted,blocked,disconnected,closed,weighted,independent,self,localMuted,compatibility:compatibility.every(Boolean),rates,smallTongue};
});assert(result.opened>.25,JSON.stringify(result));assert(result.other<.001);assert(result.closed<.001);assert(result.weighted);assert(result.smallTongue);assert(result.compatibility);assert(Math.max(...result.rates)-Math.min(...result.rates)<.002);assert(result.independent>.1);assert(result.self>.25);assert.equal(result.localMuted,0);assert.equal(result.muted,0);assert.equal(result.blocked,0);assert.equal(result.disconnected,0);assert.deepEqual(errs,[]);console.log('OK mouth rig, independent speakers, mute/block/disconnect and smooth closing',result);
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
