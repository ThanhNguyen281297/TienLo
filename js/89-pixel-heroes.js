/* Hand-drawn pixel heroes (pixel mode only). Atlases from tools/pixel/build_atlas.py:
   4 columns × 5 rows of 32×48 cells — front, back, side facing right, side facing left,
   seated meditation. Classes without a pixel atlas keep their painted sprites. */
(function(){
 'use strict';
 if(window.artStyle?.get()!=='pixel'||!window.characterMasks)return;
 const READY={Kiem:true,Liem:true,Thuong:true,Quat:true},CW=32,CH=48,FIG=44;
 const ROW={truoc:0,sau:1,trai:2,phai:3};
 const sheets=new Map(),frames=new Map();
 function sheet(ap){
  const cls=characterClasses[ap?.w||0]?.folder;if(!READY[cls])return null;
  const key=cls+'-'+(ap?.gender==='Nu'?'Nu':'Nam');let s=sheets.get(key);
  if(!s){s=new Image();s.src=artworkURL('Character/Pixel/'+key+'.png');sheets.set(key,s);}
  return s.complete&&s.naturalWidth?{image:s,key}:null;
 }
 function cell(s,row,col){
  const id=s.key+row+'/'+col;let c=frames.get(id);if(c)return c;
  c=document.createElement('canvas');c.width=CW;c.height=CH;c.getContext('2d').drawImage(s.image,col*CW,row*CH,CW,CH,0,0,CW,CH);frames.set(id,c);return c;
 }
 const base=characterMasks.drawBody;
 characterMasks.drawBody=function(ctx,body,ap,direction,x,y,width,height,feet,motion={}){
  const s=sheet(ap);if(!s)return base.apply(this,arguments);
  const fx=feet?.x??x+width/2,fy=feet?.y??y+height;
  const fit=window.characterFit?.(ap,direction,fx,fy,height),figure=fit?.H||height*.8;
  const t=motion.time??(worldMap.environmentClock||performance.now()/1000);
  const row=motion.meditating?4:(ROW[direction]??0),col=motion.meditating?Math.floor(t*1.6)%4:motion.moving?Math.floor(t*8)%4:0;
  const image=cell(s,row,col),scale=figure*1.12/FIG,w=CW*scale,h=CH*scale,left=fx-w/2,top=fy-h;
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(image,left,top,w,h);ctx.restore();
  return {image,x:left,y:top,width:w,height:h};
 };
 window.pixelHeroes={ready:READY,sheet};
})();
