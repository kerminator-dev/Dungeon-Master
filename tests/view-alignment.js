// GPU verification that stars remain static across changes in sky time.
const assert=require('assert');const {open,scene}=require('./helpers');
(async()=>{const {browser,page,errs}=await open(960,540);try{await scene(page,'winter',8,1);
const result=await page.evaluate(()=>{
 const starMap=W.sky.material.uniforms.stars.value,mat=W.sky.material.clone();mat.uniforms.stars.value=starMap;
 const final='gl_FragColor=vec4(mix(c,fogC,fogK*(1.-smoothstep(.0,.45,h))),1.);';
 if(!mat.fragmentShader.includes(final))throw Error('sky output changed');
 // Isolate the real star contribution from moving clouds/aurora; retain the production sampling code.
 mat.fragmentShader=mat.fragmentShader.replace(final,'gl_FragColor=vec4(vec3(starLight),1.);');
 const sc=new THREE.Scene(),sky=new THREE.Mesh(W.sky.geometry,mat);sc.add(sky);const cam=new THREE.PerspectiveCamera(75,320/180,.05,3200);cam.rotation.x=.7;
 const target=new THREE.WebGLRenderTarget(320,180),old=renderer.getRenderTarget();const draw=time=>{mat.uniforms.t.value=time;renderer.setRenderTarget(target);renderer.render(sc,cam);const bytes=new Uint8Array(320*180*4);renderer.readRenderTargetPixels(target,0,0,320,180,bytes);return bytes};
 const first=draw(0),later=draw(123);let differences=0,visible=0;for(let i=0;i<first.length;i+=4){if(first[i]!==later[i])differences++;if(first[i]>8)visible++}
 renderer.setRenderTarget(old);target.dispose();mat.dispose();
 return {differences,visible,filtered:starMap.magFilter===THREE.LinearFilter&&starMap.minFilter===THREE.LinearMipmapLinearFilter&&starMap.generateMipmaps};
});console.log(result);assert(result.visible>10);assert.equal(result.differences,0);assert(result.filtered);assert.deepEqual(errs,[]);console.log('OK stable filtered stars');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
