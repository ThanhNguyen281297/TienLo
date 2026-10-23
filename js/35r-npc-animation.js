/* City NPCs use the chibi portraits in Character/NPC (same style as players),
   animated procedurally from the single painting:
   - breathing (tiny vertical stretch of the torso),
   - head bob and cloth sway that grows toward the hem (strip warp),
   - per-role life: quest-giver flames, smith forge sparks, guard banner glint,
     ranking scholar golden aura.
   Feet stay planted; nothing changes NPC positions or interaction radius.
   When an authored atlas exists (ATLAS below, 6 frames x 4 rows, see
   Character/ART-V3-PROMPTS.md section 5b) it replaces the procedural motion. */
(function(){
 const ART={quest:'nhiemvu',shop:'thoren',forge:'thoren',arena:'dautruong',tower:'dautruong','field-road':'dautruong',rank:'bxh',skills:'bxh'};
 const ROW={nhiemvu:0,thoren:1,dautruong:2,bxh:3};
 const HEIGHT={nhiemvu:64,thoren:62,dautruong:68,bxh:66};
 // Set to e.g. 'Character/NPC/Motion/chibi-v1.png' after generating the atlas.
 const ATLAS=null,CELL=256,FOOT=250;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const images={},rasters=new Map(),atlas=ATLAS?Object.assign(new Image(),{src:artworkURL(ATLAS)}):null;
 for(const key of Object.keys(ROW)){const i=new Image();i.src=artworkURL('Character/NPC/'+key+'.png');images[key]=i;}
 const ready=i=>i&&i.complete&&i.naturalWidth>0;
 // Downscale once per on-screen size (sharpened), so warping strips stays cheap.
 function raster(key,pixels){
  const id=key+':'+pixels;if(rasters.has(id))return rasters.get(id);
  const img=images[key],c=document.createElement('canvas');c.height=pixels;c.width=Math.round(pixels*img.naturalWidth/img.naturalHeight);
  const ctx=c.getContext('2d');ctx.imageSmoothingQuality='high';
  // Two-step reduction keeps the painted outline crisp.
  let src=img;if(img.naturalHeight>pixels*2.2){const mid=document.createElement('canvas');mid.height=pixels*2;mid.width=c.width*2;const m=mid.getContext('2d');m.imageSmoothingQuality='high';m.drawImage(img,0,0,mid.width,mid.height);src=mid;}
  ctx.drawImage(src,0,0,c.width,c.height);window.actorClarity?.sharpen(c,.5);
  rasters.set(id,c);if(rasters.size>24)rasters.delete(rasters.keys().next().value);return c;
 }
 function spark(ctx,x,y,r,color,a){const gr=ctx.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,color);gr.addColorStop(1,'rgba(0,0,0,0)');ctx.globalAlpha=a;ctx.fillStyle=gr;ctx.fillRect(x-r,y-r,r*2,r*2);}
 function life(ctx,key,s,w,h,t){
  ctx.save();ctx.globalCompositeOperation='lighter';
  if(key==='nhiemvu'){ // rising flame motes around the robe
   for(let i=0;i<7;i++){const p=(t*.55+i/7)%1,x=s.x+Math.sin(i*2.3+t*1.7)*w*.42,y=s.y-h*(.15+p*.75);spark(ctx,x,y,2.2+(1-p)*2,'rgba(255,150,60,.9)',Math.sin(p*Math.PI)*.7);}
  }else if(key==='thoren'){ // forge sparks from the hammer hand
   for(let i=0;i<6;i++){const p=(t*1.3+i/6)%1,x=s.x-w*.36+Math.cos(i*1.9)*p*14,y=s.y-h*.42-p*14+p*p*22;spark(ctx,x,y,1.6,'rgba(255,200,110,1)',(1-p)*.9);}
  }else if(key==='dautruong'){ // glint travelling up the spear
   const p=(t*.35)%1;spark(ctx,s.x-w*.2,s.y-h*(.2+p*.75),5,'rgba(255,236,190,.95)',Math.sin(p*Math.PI)*.6);
  }else if(key==='bxh'){ // soft golden aura pulse and drifting light
   spark(ctx,s.x,s.y-h*.5,w*.75,'rgba(255,214,120,.35)',.35+.2*Math.sin(t*1.8));
   for(let i=0;i<5;i++){const p=(t*.3+i/5)%1;spark(ctx,s.x+Math.cos(i*1.3+t)*w*.45,s.y-h*(.1+p*.85),2,'rgba(255,230,150,1)',Math.sin(p*Math.PI)*.6);}
  }
  ctx.restore();
 }
 function drawProcedural(ctx,key,s){
  const img=images[key];if(!ready(img))return false;
  const h=HEIGHT[key],pixels=Math.max(48,Math.min(640,Math.round(h*(window.Z||2)/2)*2)),src=raster(key,pixels),w=h*src.width/src.height;
  const t=reduced.matches?0:(worldMap.environmentClock||0)+(s.x%37)*.11;
  const breathe=1+.014*Math.sin(t*2.1),sway=Math.sin(t*1.25),bob=Math.sin(t*2.1+.6)*.6;
  const strips=30,sh=src.height/strips,scale=h/src.height,top=s.y-h*breathe;
  ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  for(let i=0;i<strips;i++){
   const v=i/strips,next=(i+1)/strips;
   // Head (top 38%) bobs; robe below the waist sways, growing to the hem; feet planted.
   const cloth=Math.max(0,(v-.45)/.55),foot=v>.9?(1-v)/.1:1,off=sway*(cloth*cloth*2.6*foot)+(v<.38?bob*.35:0);
   const y=top+v*h*breathe+(v<.38?bob:0);
   ctx.drawImage(src,0,i*sh,src.width,sh+.6,s.x-w/2+off,y,w,(next-v)*h*breathe+.6);
  }
  ctx.restore();
  life(ctx,key,s,w,h,t);
  return true;
 }
 function drawAtlas(ctx,key,s){
  if(!atlas||!ready(atlas))return false;
  const t=reduced.matches?0:worldMap.environmentClock||0,n=Math.floor((t+(s.x%43)*.07)*4)%6,row=ROW[key],scale=HEIGHT[key]/240;
  ctx.drawImage(atlas,n*CELL,row*CELL,CELL,CELL,s.x-CELL*scale/2,s.y-FOOT*scale,CELL*scale,CELL*scale);life(ctx,key,s,CELL*scale*.6,HEIGHT[key],t);return true;
 }
 const fallback=creatureArt.drawNpc;
 creatureArt.drawNpc=function(ctx,s){const key=ART[s.id];if(!key)return fallback(ctx,s);return drawAtlas(ctx,key,s)||drawProcedural(ctx,key,s)||fallback(ctx,s);};
 creatureArt.npcHeight=s=>ART[s.id]?HEIGHT[ART[s.id]]:36;
 // Dialog portrait: the same painting as the NPC in the world.
 const original=creatureArt.decorateDialog;
 creatureArt.decorateDialog=function(title){original(title);const target=$('npc-dialog-portrait');if(!target)return;
  const key=/Luyện Khí|Bảo Khí/.test(title)?'thoren':/Vân Châu|Nhiệm vụ/.test(title)?'nhiemvu':/Đấu trường|Tháp|Lôi đài/.test(title)?'dautruong':/Thiên Vân Bảng|Truyền Công/.test(title)?'bxh':null;
  if(key)target.src=images[key].src;};
 window.npcAnimation={images,ART,HEIGHT,ATLAS};
})();
