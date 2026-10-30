'use strict';
// ---------- post-processing: fire glow, colour grading ----------
// The frame renders to a texture; bright areas are extracted, blurred at 1/4 size
// and blended back; then the theme tint. Things far outside the maze (the castles, villages and towers on the hills, the
// hills, the trees round it, the sky) are left as they are drawn: they write 0 into the frame's alpha (farMat), and neither
// glow nor tint is laid on them. A blind player (a watcher's
// touch) sees the frame blurred at 1/8 size instead, dimmer, greyer and dark at the edges.
const PP={};
const FSQ_V='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
// theme tints: gain = multiply, lift = shadow lift, sat = saturation, th = glow threshold
const GRADE={
  dungeon:{gain:[1.06,.97,.86],lift:[.008,.003,0],sat:1.05,th:.55,bloom:1},
  catacombs:{gain:[.95,1,1.07],lift:[0,.004,.01],sat:.88,th:.55,bloom:.9},
  ruins:{gain:[1.07,1,.9],lift:[.03,.015,0],sat:1.1,th:.8,bloom:.7},
  winter:{gain:[.93,.99,1.08],lift:[0,.012,.035],sat:.88,th:.82,bloom:.7},
  tomb:{gain:[1.08,1,.84],lift:[.012,.007,0],sat:1.02,th:.55,bloom:1},
  cistern:{gain:[.9,1.02,1.05],lift:[0,.01,.014],sat:.84,th:.55,bloom:.95},
  desert:{gain:[1.08,1,.86],lift:[.035,.02,0],sat:1.06,th:.82,bloom:.7},
  graveyard:{gain:[.88,.97,1.12],lift:[0,.008,.03],sat:.72,th:.6,bloom:.95}};

// a far thing's material (opaque, blended as such: what it writes into the alpha is its opacity): 0, untouched by the effects
const farMat=m=>{m.opacity=0;return m};

function ppInit(w,h){
  const opt={minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,format:THREE.RGBAFormat};
  if(PP.rt){PP.rt.dispose();PP.a.dispose();PP.b.dispose();PP.c.dispose();PP.d.dispose()}
  // (with a stencil the depth is 24 bits, not 16: near faces, a snow cap on a barrel, a brick by a brick, do not flicker)
  PP.rt=new THREE.WebGLRenderTarget(w,h,Object.assign({depthBuffer:true,stencilBuffer:true},opt));
  const rt=(k)=>new THREE.WebGLRenderTarget(Math.max(2,w>>k),Math.max(2,h>>k),Object.assign({depthBuffer:false},opt));
  PP.a=rt(2);PP.b=rt(2);PP.c=rt(3);PP.d=rt(3);   // a, b: the glow at 1/4 size; c, d: the blind blur at 1/8
  if(!PP.scene){PP.scene=new THREE.Scene();PP.cam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);PP.quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2));PP.quad.frustumCulled=false;PP.scene.add(PP.quad);
    PP.bright=new THREE.ShaderMaterial({uniforms:{t:{value:null},th:{value:.6}},vertexShader:FSQ_V,depthTest:false,depthWrite:false,
      fragmentShader:'uniform sampler2D t;uniform float th;varying vec2 vUv;void main(){vec4 T=texture2D(t,vUv);vec3 c=T.rgb;float l=max(c.r,max(c.g,c.b));gl_FragColor=vec4(c*smoothstep(th,th+.3,l)*T.a,1.);}'});   // (a far thing does not glow)
    PP.blur=new THREE.ShaderMaterial({uniforms:{t:{value:null},d:{value:new THREE.Vector2()}},vertexShader:FSQ_V,depthTest:false,depthWrite:false,
      fragmentShader:`uniform sampler2D t;uniform vec2 d;varying vec2 vUv;void main(){vec3 s=texture2D(t,vUv).rgb*.227;
        s+=(texture2D(t,vUv+d*1.38).rgb+texture2D(t,vUv-d*1.38).rgb)*.316;s+=(texture2D(t,vUv+d*3.23).rgb+texture2D(t,vUv-d*3.23).rgb)*.07;gl_FragColor=vec4(s,1.);}`});
    // a quarter of the size in one pass: four bilinear taps, each the mean of 2×2 texels, make the mean of a 4×4 block
    // (with d=0 a bilinear copy: half the size, each texel the mean of 2×2)
    PP.down=new THREE.ShaderMaterial({uniforms:{t:{value:null},d:{value:new THREE.Vector2()}},vertexShader:FSQ_V,depthTest:false,depthWrite:false,
      fragmentShader:'uniform sampler2D t;uniform vec2 d;varying vec2 vUv;void main(){gl_FragColor=vec4((texture2D(t,vUv-d).rgb+texture2D(t,vUv+d).rgb+texture2D(t,vUv+vec2(d.x,-d.y)).rgb+texture2D(t,vUv+vec2(-d.x,d.y)).rgb)*.25,1.);}'});
    // the glow added and the tint laid on (not on a far thing: the frame's alpha). blind: the blurred frame (bl) comes in for the
    // sharp one, the colour drains, the view dims and closes in from the edges (everywhere: it is not one of the effects)
    PP.comp=new THREE.ShaderMaterial({vertexShader:FSQ_V,depthTest:false,depthWrite:false,uniforms:{t:{value:null},b:{value:null},bl:{value:null},k:{value:1},
        lift:{value:new THREE.Vector3()},gain:{value:new THREE.Vector3(1,1,1)},sat:{value:1},hurt:{value:0},blind:{value:0}},
      fragmentShader:`uniform sampler2D t,b,bl;uniform float k,sat,hurt,blind;uniform vec3 lift,gain;varying vec2 vUv;
        const vec3 LUM=vec3(.299,.587,.114);
        void main(){vec4 T=texture2D(t,vUv);vec3 c=T.rgb;if(blind>0.)c=mix(c,texture2D(bl,vUv).rgb,min(1.,blind*1.6));c+=texture2D(b,vUv).rgb*k;
          vec3 g=c*gain+lift*(1.-c);g=mix(vec3(dot(g,LUM)),g,sat);c=mix(c,g,T.a);c=mix(vec3(dot(c,LUM)),c,1.-.5*blind);
          vec2 q=vUv-.5;float r=dot(q,q)*2.2;c*=(1.-.15*blind)*(1.-.55*blind*smoothstep(.1,.8,r));
          c=mix(c,vec3(c.r*1.4,c.g*.5,c.b*.5),hurt);
          gl_FragColor=vec4(c,1.);}`})}
  PP.w=w;PP.h=h}
function ppPass(mat,target){PP.quad.material=mat;renderer.setRenderTarget(target);renderer.render(PP.scene,PP.cam)}
// a separable blur of x, s texels a step (y holds the half-way result)
function blur2(x,y,s){const u=PP.blur.uniforms;u.t.value=x.texture;u.d.value.set(s/x.width,0);ppPass(PP.blur,y);
  u.t.value=y.texture;u.d.value.set(0,s/x.height);ppPass(PP.blur,x)}
const _ppSz=new THREE.Vector2();
// with post-processing off, a blind player's frame still goes through it, ungraded and with no glow
const GRADE_OFF={gain:[1,1,1],lift:[0,0,0],sat:1,th:1,bloom:0};
function renderFrame(){const bl=PP.blind||0;
  if(!(S.post||bl>0)||!TH){renderer.setRenderTarget(null);renderer.render(scene,camera);renderTorch();return}
  renderer.getDrawingBufferSize(_ppSz);if(!PP.rt||PP.w!==_ppSz.x||PP.h!==_ppSz.y)ppInit(_ppSz.x,_ppSz.y);
  const g=S.post?GRADE[game.theme]||GRADE.dungeon:GRADE_OFF;
  renderer.setRenderTarget(PP.rt);renderer.render(scene,camera);renderTorch();   // the held torch goes through the grade and the bloom like the rest
  if(S.post){PP.bright.uniforms.t.value=PP.rt.texture;PP.bright.uniforms.th.value=g.th;ppPass(PP.bright,PP.a);
    for(let i=0;i<2;i++)blur2(PP.a,PP.b,1.5)}
  // blind: the frame shrunk to a quarter (b is free once the glow is done), then to an eighth, and blurred there, the
  // harder the blinder
  if(bl>0){const d=PP.down.uniforms;d.t.value=PP.rt.texture;d.d.value.set(1/PP.w,1/PP.h);ppPass(PP.down,PP.b);
    d.t.value=PP.b.texture;d.d.value.set(0,0);ppPass(PP.down,PP.c);
    for(let i=0;i<2;i++)blur2(PP.c,PP.d,.6+1.4*bl)}
  const u=PP.comp.uniforms;u.t.value=PP.rt.texture;u.b.value=PP.a.texture;u.bl.value=PP.c.texture;u.k.value=g.bloom;u.sat.value=g.sat;
  u.gain.value.set(...g.gain);u.lift.value.set(...g.lift);u.hurt.value=Math.max(0,PP.hurt||0);u.blind.value=bl;
  ppPass(PP.comp,null)}
