/* Hand-drawn pixel heroes (pixel mode only). Atlases from tools/pixel/build_atlas.py:
   4 columns × 5 rows of 46×46 cells (figure 42 px). Walk rows: contact, passing, contact, passing with
   hand-drawn pixel legs and shoes (tools/pixel/build_heroes_v5.py) — front, back, walking left, walking
   right, seated meditation. Drawn at a whole number of screen pixels per art pixel and snapped
   to the pixel grid so every hero stays sharp. Classes without a pixel atlas keep their painted sprites. */
(function(){
 'use strict';
 if(!window.characterMasks)return;
 const READY={Kiem:true,Liem:true,Thuong:true,Quat:true},CW=46,CH=46,FIG=42;
 const ROW={truoc:0,sau:1,trai:2,phai:3};
 const sheets=new Map(),frames=new Map();
 function sheet(ap){
  const cls=characterClasses[ap?.w||0]?.folder;if(!READY[cls])return null;
  const key=cls+'-'+(ap?.gender==='Nu'?'Nu':'Nam');let s=sheets.get(key);
  if(!s){s=new Image();s.src=artworkURL('Character/Pixel/'+key+'.png');sheets.set(key,s);}
  return s.complete&&s.naturalWidth?{image:s,key}:null;
 }
 // One frame; with an outfit colour (Xích Diệm, Hàn Sương…) the robe is recoloured by the wardrobe
 // shader, which keeps face, skin, outline and gold trim. Cached per class/gender/style/frame.
 const DIRS=['truoc','sau','trai','phai','truoc'];
 // Pale robe panels (white, cream) take a light wash of the outfit colour too, so the whole garment
 // reads as the new colour; gold trim, skin and the head stay untouched.
 function tintLight(c,style,row){
  const meta=equipmentRules.outfitStyles.find(o=>o.id===style);if(!meta)return;
  const t=[1,3,5].map(i=>parseInt(meta.color.slice(i,i+2),16)),x=c.getContext('2d',{willReadFrequently:true}),img=x.getImageData(0,0,c.width,c.height),d=img.data;
  const top=Math.round(c.height*(row===1?.52:.55));
  for(let y=top;y<c.height;y++)for(let i=y*c.width*4,e=i+c.width*4;i<e;i+=4){if(!d[i+3])continue;
   const r=d[i],g2=d[i+1],b=d[i+2],mx=Math.max(r,g2,b),mn=Math.min(r,g2,b),sat=mx?(mx-mn)/mx:0;
   if(mx<120||sat>.42)continue;                                  // only pale cloth
   if(r>g2&&g2>b&&sat>.12&&r-b>30)continue;                       // warm skin / gold highlights
   const k=.58,l=mx/255;for(let j=0;j<3;j++)d[i+j]=Math.round(d[i+j]*(1-k)+t[j]*l*k*1.05);}
  x.putImageData(img,0,0);
 }
 function cell(s,row,col,ap){
  const style=ap&&window.characterWardrobe?.styleOf?characterWardrobe.styleOf(ap):'class';
  const id=s.key+row+'/'+col+'/'+style;let c=frames.get(id);if(c)return c;
  c=document.createElement('canvas');c.width=CW;c.height=CH;c.getContext('2d').drawImage(s.image,col*CW,row*CH,CW,CH,0,0,CW,CH);
  if(style!=='class'){try{const painted=characterWardrobe.paint(c,{...ap},DIRS[row],style);if(painted&&painted!==c)c=painted;}catch(e){}}
  if(style!=='class')try{tintLight(c,style,row);}catch(e){}
  frames.set(id,c);if(frames.size>400)frames.delete(frames.keys().next().value);return c;
 }
 // The ground point of the actor being drawn (drawChar gets the feet position as x,y).
 let ground=null;
 if(typeof drawChar==='function'){const dc=drawChar;drawChar=function(ctx,x,y,...rest){const before=ground;ground=y;try{return dc.call(this,ctx,x,y,...rest);}finally{ground=before;}};}
 const base=characterMasks.drawBody;
 characterMasks.drawBody=function(ctx,body,ap,direction,x,y,width,height,feet,motion={}){
  const s=sheet(ap);if(!s)return base.apply(this,arguments);
  // Feet stand exactly on the actor's ground point (painted-art offsets and bob are ignored).
  const fx=feet?.x??x+width/2,fy=ground??feet?.y??y+height;
  const fit=window.characterFit?.(ap,direction,fx,fy,height),figure=fit?.H||height*.8;
  const t=motion.time??(worldMap.environmentClock||performance.now()/1000);
  const row=motion.meditating?4:(ROW[direction]??0),col=motion.meditating?Math.floor(t*1.6)%4:motion.moving?(Number.isFinite(motion.phase)?Math.floor(motion.phase/(Math.PI/2)+.5)%4:Math.floor(t*8)%4):0;
  const m=ctx.getTransform(),k=Math.hypot(m.a,m.b)||1,px=Math.max(1,Math.round(figure/FIG*k)),scale=px/k;
  const image=cell(s,row,col,ap),w=CW*scale,h=CH*scale;
  // Snap the top-left corner to the device pixel grid (axis-aligned transforms).
  const left=(Math.round((fx-w/2)*m.a+m.e)-m.e)/m.a,top=(Math.round((fy-h)*m.d+m.f)-m.f)/m.d;
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(image,left,top,w,h);ctx.restore();
  return {image,x:left,y:top,width:w,height:h};
 };
 // HUD portrait: the pixel hero's head and shoulders instead of the painted face.
 let avatarKey='';
 setInterval(()=>{const c=document.getElementById('player-avatar');if(!c||!P.ap)return;const s=sheet(P.ap);if(!s)return;
  const key=s.key+'/'+c.width+'/'+(window.characterWardrobe?.styleOf?.(P.ap)||'');let painted=false;try{painted=c.getContext('2d').getImageData(0,0,1,1).data[3]===0;}catch{}if(key===avatarKey&&!painted)return;avatarKey=key;
  const x=c.getContext('2d'),n=c.width;x.save();x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,n,n);
  const bg=x.createLinearGradient(0,0,0,n);bg.addColorStop(0,'#2b3d4a');bg.addColorStop(1,'#13202a');x.fillStyle=bg;x.fillRect(0,0,n,n);
  x.imageSmoothingEnabled=false;const crop=26,scale=n/crop;x.drawImage(cell(s,0,0,P.ap),10,1,crop,crop,(n-crop*scale)/2,n-crop*scale,crop*scale,crop*scale);x.restore();
 },700);
 // Idle pose for sect NPCs (Sư phụ, Truyền công…): same pixel art as the players, facing front.
 function drawIdle(ctx,w,gender,x,y,figure=42,t=0){const s=sheet({w,gender});if(!s)return false;
  const m=ctx.getTransform(),k=Math.hypot(m.a,m.b)||1,px=Math.max(1,Math.round(figure/FIG*k)),scale=px/k,image=cell(s,0,0),cw=CW*scale,ch=CH*scale;
  const breathe=Math.floor(t*1.2)%2?scale:0;
  const left=(Math.round((x-cw/2)*m.a+m.e)-m.e)/m.a,top=(Math.round((y-ch)*m.d+m.f)-m.f)/m.d;
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.fillStyle='rgba(10,20,24,.28)';ctx.beginPath();ctx.ellipse(x,y,figure*.26,figure*.08,0,0,Math.PI*2);ctx.fill();
  ctx.drawImage(image,0,0,CW,CH-1,left,top+breathe,cw,ch-scale);ctx.drawImage(image,0,CH-1,CW,1,left,top+ch-scale,cw,scale);ctx.restore();return true;}
 window.pixelHeroes={ready:READY,sheet,drawIdle};
})();
