/* Pixel ground and water (Pixel art style only).
   - Ground: every baked terrain chunk (js/70-tien-hiep-world.js) gets hand-made-looking pixel
     detail once, when it is first drawn: grass tufts on green ground, pebbles on earth and sand,
     cracks and specks on stone, glints on snow. Deterministic per world position.
   - Water: animated pixel ripples and glints on every pool of the current map, drawn with the
     ground layer so actors stay on top. Presentation only. */
(function(){
 'use strict';
 if(typeof g==='undefined'||!window.worldMap)return;
 const TAU=Math.PI*2,done=new WeakSet();
 const hash=(x,y,s=0)=>{let h=(x*374761393+y*668265263+s*982451653)|0;h=(h^(h>>>13))*1274126177|0;return((h^(h>>>16))>>>0)/4294967296;};
 function hsl(r,g2,b){r/=255;g2/=255;b/=255;const mx=Math.max(r,g2,b),mn=Math.min(r,g2,b),l=(mx+mn)/2;if(mx===mn)return [0,0,l];
  const d=mx-mn,s=l>.5?d/(2-mx-mn):d/(mx+mn);let h=mx===r?(g2-b)/d+(g2<b?6:0):mx===g2?(b-r)/d+2:(r-g2)/d+4;return [h*60,s,l];}
 const STAMP={
  tuft:[[0,0,-1],[0,-1,-1],[2,0,-1],[2,-1,-1],[2,-2,-1],[4,0,-1],[4,-1,-1],[1,-1,1],[3,-2,1]],
  tuft2:[[0,0,-1],[1,-1,-1],[1,-2,1],[2,0,-1],[3,-1,-1]],
  pebble:[[0,0,1],[1,0,1],[0,1,-1],[1,1,-1],[2,1,-1]],
  crack:[[0,0,-1],[1,0,-1],[1,1,-1],[2,1,-1],[3,2,-1]],
  speck:[[0,0,-1]],glint:[[0,0,2]],
  sprout:[[0,0,-1],[0,-1,1],[0,-2,2],[2,0,-1],[2,-1,1]],
  flower:[[0,0,3],[1,0,3],[0,-1,3],[1,-1,4],[2,1,-1]]};
 /* Detail one chunk canvas in place. `res` = canvas pixels per world unit. */
 function detail(cv,worldX,worldY,res){
  const w=cv.width,h=cv.height,x=cv.getContext('2d',{willReadFrequently:true});let img;try{img=x.getImageData(0,0,w,h);}catch{return;}
  const d=img.data,p=Math.max(1,Math.round(res)),step=6*p;
  const theme=String(window.tienHiep?.scenes?.[worldMap.state.scene]?.theme||''),hot=/ember|ash|lava|fire/.test(theme);
  const FLOWERS=[[255,246,214],[255,214,92],[248,160,196],[196,214,255]];let flower=FLOWERS[0];
  const put=(px,py,k,base)=>{if(px<0||py<0||px>=w-p||py>=h-p)return;const f=k===2?1.45:k===1?1.2:.7;
   const c=k===3?flower:k===4?[255,236,140]:[base[0]*f,base[1]*f,base[2]*f];
   for(let yy=0;yy<p;yy++)for(let xx=0;xx<p;xx++){const i=((py+yy)*w+px+xx)*4;if(!d[i+3])continue;d[i]=Math.min(255,c[0]);d[i+1]=Math.min(255,c[1]);d[i+2]=Math.min(255,c[2]);}};
  for(let py=step;py<h-step;py+=step)for(let px=step;px<w-step;px+=step){
   const gx=Math.round(worldX+px/res),gy=Math.round(worldY+py/res),r=hash(gx,gy);if(r>.42)continue;
   const jx=px+Math.floor(hash(gx,gy,1)*step*.8)-step*.4|0,jy=py+Math.floor(hash(gx,gy,2)*step*.8)-step*.4|0;if(jx<0||jy<0||jx>=w||jy>=h)continue;
   const i=(jy*w+jx)*4;if(d[i+3]<250)continue;const base=[d[i],d[i+1],d[i+2]],[hue,sat,l]=hsl(...base);
   let kind=null;
   if(hue>185&&hue<255&&sat>.25)continue;                      // water: animated separately
   if(l>.86&&sat<.25)kind=r<.1?'glint':null;                    // snow / pale floor
   else if(hue>=65&&hue<=170&&sat>.18){kind=r<.03?'flower':r<.13?'tuft':r<.24?'tuft2':r<.32?'sprout':null;if(kind==='flower')flower=FLOWERS[Math.floor(hash(gx,gy,3)*FLOWERS.length)];}
   else if(hue>=15&&hue<65&&sat>.16)kind=r<.12?'pebble':r<.2?'speck':null;
   else if(sat<.18)kind=r<.07?'crack':r<.16?'speck':null;
   if(!kind)continue;
   if(kind==='crack'&&hot){flower=[255,150,52];for(const [ox,oy] of STAMP.crack)put(jx+ox*p,jy+oy*p,3,base);continue;}
   for(const [ox,oy,k] of STAMP[kind])put(jx+ox*p,jy+oy*p,k,base);
  }
  x.putImageData(img,0,0);
 }
 const draw=g.drawImage;
 g.drawImage=function(src,...a){
  try{if(src instanceof HTMLCanvasElement&&!done.has(src)&&a.length===4&&src.width===src.height&&Math.abs(a[2]-250)<.5&&Math.abs(a[3]-250)<.5){
   done.add(src);detail(src,a[0],a[1],src.width/250);}}catch(e){}
  return draw.call(this,src,...a);
 };
 // A chunk is baked fresh after each scene switch; also re-detail after the renderer resets.

 /* ---------- water ---------- */
 let cells=null,cellScene='';
 function inside(pts,x,y){let c=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const [xi,yi]=pts[i],[xj,yj]=pts[j];if(((yi>y)!==(yj>y))&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)c=!c;}return c;}
 function edgeDist(pts,x,y){let m=1e9;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const [ax,ay]=pts[j],[bx,by]=pts[i],dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy||1)));m=Math.min(m,Math.hypot(x-ax-dx*t,y-ay-dy*t));}return m;}
 function buildCells(){
  cellScene=worldMap.state.scene;cells=[];const s=window.tienHiep?.scenes?.[cellScene];if(!s)return;const theme=String(s.theme||'');
  for(const w of s.water||[]){if(w.ice||w.walk)continue;const pts=(w.pts||[]).map(p=>Array.isArray(p)?p:[p.x,p.y]);if(pts.length<3)continue;
   const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),lava=/lava|ember|fire/.test(theme)||w.lava;
   for(let y=Math.min(...ys);y<Math.max(...ys);y+=9)for(let x=Math.min(...xs);x<Math.max(...xs);x+=11){
    const gx=Math.round(x),gy=Math.round(y);if(!inside(pts,gx,gy)||edgeDist(pts,gx,gy)<10)continue;const r=hash(gx,gy,7);
    if(r<.26)cells.push({x:gx,y:gy,len:3+Math.floor(hash(gx,gy,8)*4),ph:hash(gx,gy,9)*TAU,glint:r<.04,lava});}
   // shore foam: pulsing pixels just inside the edge
   for(let i=0,j=pts.length-1;i<pts.length;j=i++){const [ax,ay]=pts[j],[bx,by]=pts[i],L=Math.hypot(bx-ax,by-ay)||1,n=Math.floor(L/7);
    for(let k=0;k<n;k++){const t=k/n,x=ax+(bx-ax)*t,y=ay+(by-ay)*t,nx=-(by-ay)/L,ny=(bx-ax)/L,ix=inside(pts,x+nx*4,y+ny*4)?1:-1;
     cells.push({x:Math.round(x+nx*4*ix),y:Math.round(y+ny*4*ix),len:2,ph:k*.55+i,foam:true,lava});}}}
 }
 const baseGround=worldMap.drawGroundDetails;
 if(baseGround)worldMap.drawGroundDetails=function(ctx,cx,cy,vw,vh){
  const result=baseGround.apply(this,arguments);
  try{
   if(cellScene!==worldMap.state.scene||!cells)buildCells();if(!cells.length)return result;
   const t=performance.now()/1000,u=1/Math.max(.5,Z);ctx.save();
   for(const c of cells){if(c.x<cx-20||c.x>cx+vw+20||c.y<cy-20||c.y>cy+vh+20)continue;
    const wave=Math.sin(t*1.3+c.ph),x=Math.round((c.x+wave*3)/u)*u,y=Math.round((c.y+Math.sin(t*.7+c.ph)*1.2)/u)*u;
    if(c.foam){const a=.25+.45*Math.max(0,Math.sin(t*2+c.ph));ctx.fillStyle=c.lava?`rgba(255,190,90,${a})`:`rgba(245,255,255,${a})`;ctx.fillRect(Math.round(c.x/u)*u,Math.round(c.y/u)*u,u*2,u);continue;}
    ctx.fillStyle=c.lava?(wave>0?'rgba(255,214,120,.8)':'rgba(255,150,60,.6)'):(wave>0?'rgba(235,252,255,.72)':'rgba(190,232,245,.5)');
    ctx.fillRect(x,y,Math.max(2,Math.round(c.len*(.6+.4*Math.abs(wave))))*u,u);
    if(c.glint&&Math.sin(t*2.6+c.ph*3)>.82){ctx.fillStyle='rgba(255,255,255,.9)';ctx.fillRect(x+u,y-u,u,u);ctx.fillRect(x,y-2*u,u,u*3);ctx.fillRect(x-u,y-u,u*3,u);}
   }
   ctx.restore();
  }catch(e){}
  return result;
 };
 /* ---------- biome air: snow, embers, motes, fireflies, leaves, seeds ---------- */
 const AIR={frost:{n:46,col:['#ffffff','#dff1ff'],vy:[14,26],vx:[-8,8],size:[1,2],fall:1},
  ember:{n:34,col:['#ffb347','#ff7a2a','#ffe08a'],vy:[-26,-12],vx:[-6,6],size:[1,2],blink:1},
  abyss:{n:30,col:['#c39bff','#8a5cff','#f0d8ff'],vy:[-14,-6],vx:[-4,4],size:[1,2],blink:1},
  marsh:{n:22,col:['#e8ff8a','#b8f060'],vy:[-4,4],vx:[-6,6],size:[1,1],blink:1,wander:1},
  bamboo:{n:18,col:['#7fbf5a','#a8d870','#5c9a44'],vy:[10,18],vx:[6,14],size:[2,2],fall:1,leaf:1},
  meadow:{n:16,col:['#ffffff','#fff3c8'],vy:[-3,3],vx:[8,16],size:[1,1],wander:1}};
 let air=[],airScene='',airKind=null;
 function biome(){const s=window.tienHiep?.scenes?.[worldMap.state.scene],t=String(s?.theme||'')+' '+worldMap.state.scene;
  return /frost|snow/.test(t)?'frost':/ember|ash|lava|fire/.test(t)?'ember':/abyss|void/.test(t)?'abyss':/marsh|tide/.test(t)?'marsh':/bamboo|wood/.test(t)?'bamboo':/meadow|verdant|spring/.test(t)?'meadow':null;}
 const rnd=(a,b)=>a+Math.random()*(b-a);
 function seed(v,anywhere){const k=AIR[airKind];return {x:rnd(v.x,v.x+v.vw),y:anywhere?rnd(v.y,v.y+v.vh):k.fall?v.y-10:k.vy[1]<0?v.y+v.vh+10:rnd(v.y,v.y+v.vh),
  vx:rnd(...k.vx),vy:rnd(...k.vy),c:k.col[Math.floor(Math.random()*k.col.length)],s:Math.round(rnd(...k.size)),ph:Math.random()*TAU};}
 let lastAir=performance.now();
 const baseDr=dr;
 dr=function(){baseDr.apply(this,arguments);
  try{const now=performance.now(),dt=Math.min(.05,(now-lastAir)/1000);lastAir=now;if(!P.ap)return;
   if(worldMap.state.scene!==airScene){airScene=worldMap.state.scene;airKind=biome();air=[];}
   if(!airKind||(window.graphicsQuality?.particles??1)<.3)return;
   const v=gameCamera(),k=AIR[airKind],u=1/Math.max(.5,Z),t=now/1000;
   while(air.length<k.n)air.push(seed(v,true));
   g.save();g.setTransform(Z,0,0,Z,-v.x*Z,-v.y*Z);
   for(let i=0;i<air.length;i++){const a=air[i];
    a.x+=(a.vx+(k.wander?Math.sin(t*1.3+a.ph)*10:0)+(k.leaf?Math.sin(t*2+a.ph)*12:0))*dt;a.y+=(a.vy+(k.wander?Math.cos(t+a.ph)*6:0))*dt;
    if(a.x<v.x-30||a.x>v.x+v.vw+30||a.y<v.y-30||a.y>v.y+v.vh+30){air[i]=seed(v,false);continue;}
    if(k.blink&&Math.sin(t*3+a.ph)<-.4)continue;
    g.fillStyle=a.c;const x=Math.round(a.x/u)*u,y=Math.round(a.y/u)*u;
    if(k.leaf){g.fillRect(x,y,2*u,u);g.fillRect(x+u,y-u,u,u);}else g.fillRect(x,y,a.s*u,a.s*u);}
   g.restore();
  }catch(e){}
 };
 window.pixelGround={detail,cells:()=>cells};
})();
