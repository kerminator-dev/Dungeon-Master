'use strict';
// Normal frames render directly. Only the Watcher's temporary blindness needs an offscreen frame.
const BlindRender={size:new THREE.Vector2()};
const BLIND_QUAD='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
function blindTargetsFree(){for(const key of ['frame','quarter','blurA','blurB'])if(BlindRender[key]){BlindRender[key].dispose();BlindRender[key]=null}}
function blindInit(w,h){const b=BlindRender;blindTargetsFree();
  const options={minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,format:THREE.RGBAFormat};
  b.frame=new THREE.WebGLRenderTarget(w,h,Object.assign({depthBuffer:true,stencilBuffer:true},options));
  const target=k=>new THREE.WebGLRenderTarget(Math.max(2,w>>k),Math.max(2,h>>k),Object.assign({depthBuffer:false},options));
  b.quarter=target(2);b.blurA=target(3);b.blurB=target(3);b.w=w;b.h=h;
  if(b.scene)return;
  b.scene=new THREE.Scene();b.camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);b.quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2));b.quad.frustumCulled=false;b.scene.add(b.quad);
  const shader=(uniforms,fragmentShader)=>new THREE.ShaderMaterial({uniforms,vertexShader:BLIND_QUAD,fragmentShader,depthTest:false,depthWrite:false});
  b.down=shader({t:{value:null},d:{value:new THREE.Vector2()}},
    'uniform sampler2D t;uniform vec2 d;varying vec2 vUv;void main(){gl_FragColor=vec4((texture2D(t,vUv-d).rgb+texture2D(t,vUv+d).rgb+texture2D(t,vUv+vec2(d.x,-d.y)).rgb+texture2D(t,vUv+vec2(-d.x,d.y)).rgb)*.25,1.);}');
  b.blur=shader({t:{value:null},d:{value:new THREE.Vector2()}},
    'uniform sampler2D t;uniform vec2 d;varying vec2 vUv;void main(){vec3 c=texture2D(t,vUv).rgb*.227;c+=(texture2D(t,vUv+d*1.38).rgb+texture2D(t,vUv-d*1.38).rgb)*.316;c+=(texture2D(t,vUv+d*3.23).rgb+texture2D(t,vUv-d*3.23).rgb)*.07;gl_FragColor=vec4(c,1.);}');
  b.combine=shader({t:{value:null},bl:{value:null},blind:{value:0}},
    'uniform sampler2D t,bl;uniform float blind;varying vec2 vUv;void main(){vec3 c=mix(texture2D(t,vUv).rgb,texture2D(bl,vUv).rgb,min(1.,blind*1.6));c=mix(vec3(dot(c,vec3(.299,.587,.114))),c,1.-.5*blind);vec2 q=vUv-.5;float r=dot(q,q)*2.2;c*=(1.-.15*blind)*(1.-.55*blind*smoothstep(.1,.8,r));gl_FragColor=vec4(c,1.);}');
}
function blindPass(material,target){BlindRender.quad.material=material;renderer.setRenderTarget(target);renderer.render(BlindRender.scene,BlindRender.camera)}
function renderFrame(){const b=BlindRender,blind=G.viewBlind||0;
  if(blind<=0){if(b.frame)blindTargetsFree();renderer.setRenderTarget(null);renderer.render(scene,camera);renderTorch();return}
  renderer.getDrawingBufferSize(b.size);if(!b.frame||b.w!==b.size.x||b.h!==b.size.y)blindInit(b.size.x,b.size.y);
  renderer.setRenderTarget(b.frame);renderer.render(scene,camera);renderTorch();
  const down=b.down.uniforms;down.t.value=b.frame.texture;down.d.value.set(1/b.w,1/b.h);blindPass(b.down,b.quarter);
  down.t.value=b.quarter.texture;down.d.value.set(0,0);blindPass(b.down,b.blurA);
  const blur=b.blur.uniforms,step=.6+1.4*blind;
  for(let i=0;i<2;i++){blur.t.value=b.blurA.texture;blur.d.value.set(step/b.blurA.width,0);blindPass(b.blur,b.blurB);blur.t.value=b.blurB.texture;blur.d.value.set(0,step/b.blurA.height);blindPass(b.blur,b.blurA)}
  b.combine.uniforms.t.value=b.frame.texture;b.combine.uniforms.bl.value=b.blurA.texture;b.combine.uniforms.blind.value=blind;blindPass(b.combine,null);
}
