'use strict';
// ---------- pixel-art kit: HUD icons and tree sprites ----------
// shapes drawn in code at low resolution, then hard-edged and outlined (crisp). no three.js dependency

function pxKit(c){const k={c};
  k.r=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))};
  k.p=(x,y,col)=>k.r(x,y,1,1,col);
  k.e=(cx,cy,rx,ry,col)=>{c.fillStyle=col;for(let y=-ry;y<=ry;y++){const w=Math.round(rx*Math.sqrt(Math.max(0,1-(y*y)/(ry*ry+.01))));c.fillRect(Math.round(cx-w),Math.round(cy+y),w*2+1,1)}};
  k.l=(x0,y0,x1,y1,col,t=1)=>{const n=Math.max(1,Math.round(Math.max(Math.abs(x1-x0),Math.abs(y1-y0))));
    for(let i=0;i<=n;i++)k.r(x0+(x1-x0)*i/n-(t-1)/2,y0+(y1-y0)*i/n-(t-1)/2,t,t,col)};
  k.poly=(pts,col)=>{c.fillStyle=col;c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill()};
  return k}
// hard edges (no antialiasing) + dark outline — classic sprite look
function crisp(c,w,h,outline){const id=c.getImageData(0,0,w,h),d=id.data,a=new Uint8Array(w*h);
  for(let i=0;i<w*h;i++){a[i]=d[i*4+3]>110?1:0;d[i*4+3]=a[i]?255:0}
  if(outline)for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(a[i])continue;
    if((x>0&&a[i-1])||(x<w-1&&a[i+1])||(y>0&&a[i-w])||(y<h-1&&a[i+w])){d[i*4]=outline[0];d[i*4+1]=outline[1];d[i*4+2]=outline[2];d[i*4+3]=255}}
  c.putImageData(id,0,0)}
