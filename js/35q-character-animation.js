/* Authored gait / lotus legs plus the intact selected upper-body rig. */
(function(){
 const atlases=new Map(),cache=new Map(),directions=['truoc','sau','trai','phai'],LIMIT=96;
 const key=ap=>characterClasses[ap?.w||0].folder+'/'+(ap?.gender==='Nu'?'Nu':'Nam');
 function load(ap){const meta=characterMotionFrames[key(ap)];if(!meta)return null;let image=atlases.get(meta.file);if(!image){image=new Image();image.src=artworkURL(meta.file);atlases.set(meta.file,image);}return{meta,image};}
 function frame(ap,direction,motion={}){
  if(!motion.moving&&!motion.meditating)return null;const entry=load(ap);if(!entry?.image.complete||!entry.image.naturalWidth)return null;
  const base=characterMasks.frameFor(ap,motion.meditating?'truoc':direction);if(!base)return null;
  const row=motion.meditating?4:directions.indexOf(direction),time=motion.time??(worldMap.environmentClock||0),index=Math.floor(time*(motion.meditating?1.6:8))%4,meta=entry.meta.frames[row*4+index],id=base.key+'/'+row+'/'+index;
  if(cache.has(id)){const value=cache.get(id);cache.delete(id);cache.set(id,value);return value;}
  const canvas=document.createElement('canvas');canvas.width=canvas.height=384;const ctx=canvas.getContext('2d'),floor=356,cx=192,scale=270/entry.meta.standingHeight;
  const [sx,sy,w,h]=meta.rect,dx=cx-meta.anchor[0]*scale,dy=floor-meta.anchor[1]*scale;
  ctx.imageSmoothingQuality='high';
  // The authored lower-body poses supply alternating feet / crossed lotus legs.
  // Keep the original complete head AND torso together, with no facial patches.
  const join=floor-(motion.meditating?102:112);
  ctx.save();ctx.beginPath();ctx.rect(0,join,384,384-join);ctx.clip();ctx.drawImage(entry.image,sx,sy,w,h,dx,dy,w*scale,h*scale);ctx.restore();
  const bodyScale=270/base.anchor[1],baseX=cx-base.anchor[0]*bodyScale*base.pixelAspect,baseY=floor-270+(motion.meditating?35:0),cut=base.height*(motion.meditating?.70:.78),step=base.height/40;
  for(let sy=0;sy<cut;sy+=step){const sh=Math.min(step+.5,cut-sy),v=sy/base.height,blend=Math.max(0,(v-.52)/.26),sway=motion.meditating?Math.sin(index*Math.PI/2)*blend*.5:Math.sin(index*Math.PI/2+v*3)*blend*4;
   ctx.globalAlpha=Math.min(1,Math.max(0,(cut/base.height-v)/(motion.meditating?.08:.10)));
   ctx.drawImage(base.image,0,sy,base.width,sh,baseX+sway,baseY+sy*bodyScale,base.width*bodyScale*base.pixelAspect,sh*bodyScale+.2);
  }
  ctx.globalAlpha=1;
  const painted=characterWardrobe.paint(canvas,ap,direction),value={image:painted,width:384,height:384,anchor:[cx,floor],pixelAspect:1,key:id,mode:motion.meditating?'meditate':'walk',index,row};
  cache.set(id,value);if(cache.size>LIMIT)cache.delete(cache.keys().next().value);return value;
 }
 function draw(ctx,ap,direction,x,y,height,motion={}){const pose=frame(ap,direction,motion);if(!pose)return null;const scale=height/270,result={image:pose.image,x:x-pose.anchor[0]*scale,y:y-pose.anchor[1]*scale,width:pose.width*scale,height:pose.height*scale};renderArtwork(ctx,result.image,result.x,result.y,result.width,result.height);return result;}
 const auth=()=>{if(P.ap)load(P.ap);};addEventListener('tienlo-auth',auth);const create=$('ok').onclick;$('ok').onclick=function(...args){const result=create(...args);auth();return result;};
 window.characterAnimation={load,frame,draw,cache,LIMIT,atlases};
})();
