const L = m => new THREE.MeshLambertMaterial(m);
const decalMat = (map,extra={}) => L(Object.assign({map,transparent:true,alphaTest:.5,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2},extra));
const basic = (c,e={}) => new THREE.MeshBasicMaterial(Object.assign({color:c},e));
const M = {
  wallD:[L({map:T.brick}),L({map:T.brickCrack}),L({map:T.brickMoss}),L({map:T.rockwall})],
  wallW:[L({map:T.brickSnow}),L({map:T.brickSnow2}),L({map:T.rockwallSnow})],
  wallC:[L({map:T.skullwall}),L({map:T.catbrick}),L({map:T.rockwall})],
  wallI:[L({map:T.icewall}),L({map:T.icewall2}),L({map:T.icewall2})],
  wallN:[L({map:T.nord}),L({map:T.nord2}),L({map:T.rockwall})],
  wallK:[L({map:T.cavewall}),L({map:T.cavewall2}),L({map:T.cavewall})],
  rockwall:L({map:T.rockwall}),
  snowTop: L({map:T.snowTop}), ceil: L({map:T.ceil}), wood: L({map:T.wood}), chest: L({map:T.chest}),
  metal: L({color:0x4a4a52}), bone: L({color:0xd8cfb4}),
  banner: decalMat(T.banner), window: decalMat(T.window), door: decalMat(T.door), cobweb: decalMat(T.cobweb),
  decal: decalMat(T.decal), icicle: decalMat(T.icicle), skull: decalMat(T.skull), shield: decalMat(T.shield),
  rune: decalMat(T.rune,{emissive:0x806020}),
  flame: new THREE.SpriteMaterial({map:T.flame,fog:false,transparent:true}),
  lantern: basic(0xffd070),
  pine: L({map:T.pine}), rock: L({map:T.rock}), snowRock: L({map:T.snowRock}), stone: L({map:T.path}),
  trunk: L({color:0x4a3220}), coal: L({color:0x222222}), snow: L({color:0xb4c2d6}),
  slime: basic(0xb0e890,{map:T.slime}),
  puddle: new THREE.MeshLambertMaterial({color:0x1d2c3c,transparent:true,opacity:.8}),
  ice: new THREE.MeshLambertMaterial({color:0x9fc4e4,transparent:true,opacity:.55}),
  rubble: L({color:0x6a625a}), pot: L({color:0x1c1c20}), pillar: L({map:T.pillar}), trimStone:L({color:0x9a968c}),
  gold: L({color:0xd8b030,emissive:0x4a3800}), candle: L({color:0xeee4c0,emissive:0x302a18}),
  sack: L({color:0x8a7650}), clay: L({color:0x8a5436}),
  wrap: L({color:0xb8a47a}), wrap2: L({color:0xa08c62}), wrapD: L({color:0x5a4a2e}),
  night: basic(0x0b1224), dayGlow: basic(0x7f98c8), void: basic(0x000000),
  crystalI: basic(0x7cc8ff), crystalP: basic(0xc080ff), shroomB: basic(0x40ffc0), shroomC: basic(0x60a0ff),
  shroomStem: L({color:0xc8c0a8}), iceRock: L({map:T.icewall}), caveRock: L({map:T.cavewall}),
  ember: basic(0xff7a20),
};
Object.assign(M,{
  wallCs:[L({map:T.castle}),L({map:T.castle2}),L({map:T.castle})],
  wallF:[L({map:T.mossBrick}),L({map:T.mossBrick2}),L({map:T.rockwallSnow})],
  carpet:L({color:0x8a1a1a}), trim:L({color:0xc8a030,emissive:0x302400}),
  dirtPath:L({map:T.dirt}), pineG:L({map:T.pineG}), roof:L({map:T.roof}), snowRoof:L({color:0xd0dcea}), houseWall:L({map:T.houseWall}),
  leafA:L({color:0xc8601e}), leafB:L({color:0xd89a2a}), leafC:L({color:0x9a3a1e}), bush:L({color:0x3a5a2a}),
  win:basic(0xffd070), armor:L({color:0x8a8e98}), book1:L({color:0x6a2a2a}), book2:L({color:0x2a4a6a}), book3:L({color:0x4a6a2a}),
  stainA:basic(0x4a6ad8), stainB:basic(0xd84a4a), stainC:basic(0xd8b84a), stoneLite:L({color:0x8a8a90}),
});
Object.assign(M,{
  archStone:L({map:T.archStone}), timber:L({map:T.timber}), slateRoof:L({map:T.slate}), plankFloor:L({map:T.plankFloor}), plankCeil:L({map:T.plankCeil}),
  carpetM:L({map:T.carpet}), wood2:L({color:0x4a2a24}), ceilStone:L({map:T.ceilNord}), stoneBase:L({map:T.catbrick}),
  winA:basic(0xffffff,{map:T.wA,transparent:true,alphaTest:.5,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),winB:basic(0xffffff,{map:T.wB,transparent:true,alphaTest:.5,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),winC:basic(0xffffff,{map:T.wC,transparent:true,alphaTest:.5,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),winG:basic(0xffffff,{map:T.wG,transparent:true,alphaTest:.5,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),winW:basic(0xffffff,{map:T.wW,transparent:true,alphaTest:.5,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),parapet:L({map:T.archStone}),
  latA:basic(0xffffff,{map:T.latA}),latB:basic(0xffffff,{map:T.latB}),latC:basic(0xffffff,{map:T.latC}),latG:basic(0xffffff,{map:T.latG}),
  bannerB:decalMat(T.bannerB),bannerC:decalMat(T.bannerC),shield2:decalMat(T.shield2),
  glowS:new THREE.SpriteMaterial({map:T.glow,fog:false,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:.8}),
});
M.banner=decalMat(T.bannerA);M.bannerList=[M.banner,M.bannerB,M.bannerC];
M.stainA=M.latA;M.stainB=M.latB;M.stainC=M.latC;
Object.assign(M,{
  wallS:[L({map:T.sandBrick}),L({map:T.sandBrick2}),L({map:T.sandRock})],
  wallSw:[L({map:T.palisade}),L({map:T.swampBrick}),L({map:T.swampBrick})],
  wallSe:[L({map:T.sewerBrick}),L({map:T.sewerBrick2}),L({map:T.rockwall})],
  wallV:[L({map:T.basalt}),L({map:T.basalt2}),L({map:T.basalt2})],
  decalC:decalMat(T.crackOnly), lavaCrack:new THREE.MeshBasicMaterial({map:T.lavaCrack,transparent:true,alphaTest:.5,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),
  lava:new THREE.MeshBasicMaterial({color:0xff7a20}), lavaD:L({color:0x2a2020}), pipe:L({map:T.pipe}),
  cactus:L({color:0x4a8a3a}), palmTrunk:L({color:0x8a6a3a}), palmLeaf:L({color:0x4a9a3a,side:THREE.DoubleSide}), reed:L({color:0x6a8a3a}), mangLeaf:L({color:0x2a4a2a}), sandStone:L({map:T.sandBrick}),
  wisp:new THREE.SpriteMaterial({map:T.glow,fog:false,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,color:0x80ffc0,opacity:.9}),
});
Object.assign(M,{
  plasterM:L({map:T.plaster}), sandPlaster:L({map:T.sandPlaster}), woodWallM:L({map:T.woodWall}), tileRoof:L({map:T.tile}),
  awnA:L({map:T.awning,side:THREE.DoubleSide}), awnB:L({map:T.awning2,side:THREE.DoubleSide}), cobble:L({map:T.cobble}),
  leafG:L({color:0x3a6a2a}), leafG2:L({color:0x56842e}), flowerR:L({color:0xc83a3a}), flowerY:L({color:0xe0c040}), flowerP:L({color:0xb060c0}),
  apple:L({color:0xc02a2a}), grain:L({color:0xd8b84a}), hay:L({color:0xc8a838}), iron:L({color:0x2a2a30}),
});
Object.assign(M,{sandPathM:L({map:T.sandPath}),mudPathM:L({map:T.mudPath}),basaltM:L({map:T.basalt}),bannerFlag:decalMat(T.bannerA),grass:L({map:T.grass}),sunGlow:basic(0xe0a870),portalGlow:new THREE.MeshBasicMaterial({color:0xa070ff,transparent:true,opacity:.55,side:THREE.DoubleSide,depthWrite:false}),portalGlow2:new THREE.MeshBasicMaterial({color:0x60d0ff,transparent:true,opacity:.4,side:THREE.DoubleSide,depthWrite:false}),plank:L({map:T.wood})});
const mkFloor=(t,tile)=>({tex:t,tile});
