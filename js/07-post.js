'use strict';
// ---------- post-processing: fire glow, vignette, colour grading ----------
// The frame renders to a texture; bright areas are extracted, blurred at 1/4 size
// and blended back; then the theme tint and edge darkening.
const PP={};
const FSQ_V='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
// theme tints: gain = multiply, lift = shadow lift, sat = saturation, vig = vignette, th = glow threshold
const GRADE={
  dungeon:{gain:[1.06,.97,.86],lift:[.008,.003,0],sat:1.05,vig:.58,th:.55,bloom:1},
  catacombs:{gain:[.95,1,1.07],lift:[0,.004,.01],sat:.88,vig:.6,th:.55,bloom:.9},
  ruins:{gain:[1.07,1,.9],lift:[.03,.015,0],sat:1.1,vig:.32,th:.8,bloom:.7},
  winter:{gain:[.93,.99,1.08],lift:[0,.012,.035],sat:.88,vig:.3,th:.82,bloom:.7},
  tomb:{gain:[1.08,1,.84],lift:[.012,.007,0],sat:1.02,vig:.56,th:.55,bloom:1},
  cistern:{gain:[.9,1.02,1.05],lift:[0,.01,.014],sat:.84,vig:.62,th:.55,bloom:.95},
  desert:{gain:[1.08,1,.86],lift:[.035,.02,0],sat:1.06,vig:.3,th:.82,bloom:.7},
  graveyard:{gain:[.88,.97,1.12],lift:[0,.008,.03],sat:.72,vig:.5,th:.6,bloom:.95}};

function ppInit(w,h){
  const opt={minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,format:THREE.RGBAFormat};
  if(PP.rt){PP.rt.dispose();PP.a.dispose();PP.b.dispose()}
  PP.rt=new THREE.WebGLRenderTarget(w,h,Object.assign({depthBuffer:true},opt));
  const bw=Math.max(2,w>>2),bh=Math.max(2,h>>2);
  PP.a=new THREE.WebGLRenderTarget(bw,bh,Object.assign({depthBuffer:false},opt));PP.b=new THREE.WebGLRenderTarget(bw,bh,Object.assign({depthBuffer:false},opt));
  if(!PP.scene){PP.scene=new THREE.Scene();PP.cam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);PP.quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2));PP.quad.frustumCulled=false;PP.scene.add(PP.quad);
    PP.bright=new THREE.ShaderMaterial({uniforms:{t:{value:null},th:{value:.6}},vertexShader:FSQ_V,depthTest:false,depthWrite:false,
      fragmentShader:'uniform sampler2D t;uniform float th;varying vec2 vUv;void main(){vec3 c=texture2D(t,vUv).rgb;float l=max(c.r,max(c.g,c.b));gl_FragColor=vec4(c*smoothstep(th,th+.3,l),1.);}'});
    PP.blur=new THREE.ShaderMaterial({uniforms:{t:{value:null},d:{value:new THREE.Vector2()}},vertexShader:FSQ_V,depthTest:false,depthWrite:false,
      fragmentShader:`uniform sampler2D t;uniform vec2 d;varying vec2 vUv;void main(){vec3 s=texture2D(t,vUv).rgb*.227;
        s+=(texture2D(t,vUv+d*1.38).rgb+texture2D(t,vUv-d*1.38).rgb)*.316;s+=(texture2D(t,vUv+d*3.23).rgb+texture2D(t,vUv-d*3.23).rgb)*.07;gl_FragColor=vec4(s,1.);}`});
    PP.comp=new THREE.ShaderMaterial({vertexShader:FSQ_V,depthTest:false,depthWrite:false,uniforms:{t:{value:null},b:{value:null},k:{value:1},vig:{value:.4},
        lift:{value:new THREE.Vector3()},gain:{value:new THREE.Vector3(1,1,1)},sat:{value:1},hurt:{value:0}},
      fragmentShader:`uniform sampler2D t,b;uniform float k,vig,sat,hurt;uniform vec3 lift,gain;varying vec2 vUv;
        void main(){vec3 c=texture2D(t,vUv).rgb+texture2D(b,vUv).rgb*k;
          c=c*gain+lift*(1.-c);float l=dot(c,vec3(.299,.587,.114));c=mix(vec3(l),c,sat);
          vec2 q=vUv-.5;c*=1.-vig*smoothstep(.25,.85,dot(q,q)*2.2);c=mix(c,vec3(c.r*1.4,c.g*.5,c.b*.5),hurt);
          gl_FragColor=vec4(c,1.);}`})}
  PP.w=w;PP.h=h}
function ppPass(mat,target){PP.quad.material=mat;renderer.setRenderTarget(target);renderer.render(PP.scene,PP.cam)}
const _ppSz=new THREE.Vector2();
function renderFrame(){
  if(!S.post||!TH){renderer.setRenderTarget(null);renderer.render(scene,camera);renderTorch();return}
  renderer.getDrawingBufferSize(_ppSz);if(!PP.rt||PP.w!==_ppSz.x||PP.h!==_ppSz.y)ppInit(_ppSz.x,_ppSz.y);
  const g=GRADE[game.theme]||GRADE.dungeon;
  renderer.setRenderTarget(PP.rt);renderer.render(scene,camera);renderTorch();   // the held torch goes through the grade and the bloom like the rest
  PP.bright.uniforms.t.value=PP.rt.texture;PP.bright.uniforms.th.value=g.th;ppPass(PP.bright,PP.a);
  for(let i=0;i<2;i++){PP.blur.uniforms.t.value=PP.a.texture;PP.blur.uniforms.d.value.set(1.5/PP.a.width,0);ppPass(PP.blur,PP.b);
    PP.blur.uniforms.t.value=PP.b.texture;PP.blur.uniforms.d.value.set(0,1.5/PP.a.height);ppPass(PP.blur,PP.a)}
  const u=PP.comp.uniforms;u.t.value=PP.rt.texture;u.b.value=PP.a.texture;u.k.value=g.bloom;u.vig.value=g.vig;u.sat.value=g.sat;
  u.gain.value.set(...g.gain);u.lift.value.set(...g.lift);u.hurt.value=Math.max(0,PP.hurt||0);
  ppPass(PP.comp,null)}
