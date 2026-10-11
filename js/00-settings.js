"use strict";
// ---------- Настройки (сохраняются в браузере) ----------
const S = {sens:1, fov:70, pix:3, fps:true, bob:true, invert:false, cap:0, map:'dungeon', size:12};
try{Object.assign(S,JSON.parse(localStorage.getItem('lab_settings')||'{}'))}catch(e){}
function saveS(){try{localStorage.setItem('lab_settings',JSON.stringify(S))}catch(e){}}
const B = 2;                   // размер блока
let level = 0, N = 8;          // клеток по стороне
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({canvas, antialias:false, powerPreference:'high-performance'});
renderer.setPixelRatio(1);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(S.fov, 1, 0.2, 80);
camera.rotation.order = 'YXZ';
scene.add(camera);
function resize(){
  const w=innerWidth,h=innerHeight;
  renderer.setSize(Math.ceil(w/S.pix), Math.ceil(h/S.pix), false);
  camera.aspect=w/h; camera.fov=S.fov; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();
