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
  const bodyScale=270/base.anchor[1],baseX=cx-base.anchor[0]*bodyScale*base.pixelAspect,baseY=floor-270+(motion.meditating?35:0),cut=base.height*(motion.meditating?.70:.78),step=base.height/40;
  // Authored leg frames are not centred like the standing body: line them up by
  // the robe just under the seam, and fade the seam instead of a hard cut.
  const legs=document.createElement('canvas');legs.width=legs.height=384;const lc=legs.getContext('2d');lc.imageSmoothingQuality='high';
  lc.drawImage(entry.image,sx,sy,w,h,dx,dy,w*scale,h*scale);
  const offset=alignment(base,baseX,baseY,bodyScale,lc,join,id);
  const fade=22;lc.globalCompositeOperation='destination-in';const mask=lc.createLinearGradient(0,join-fade,0,join+fade*.6);mask.addColorStop(0,'rgba(0,0,0,0)');mask.addColorStop(1,'#000');lc.fillStyle=mask;lc.fillRect(0,0,384,384);
  ctx.drawImage(legs,offset,0);
  for(let sy=0;sy<cut;sy+=step){const sh=Math.min(step+.5,cut-sy),v=sy/base.height,blend=Math.max(0,(v-.52)/.26),sway=motion.meditating?Math.sin(index*Math.PI/2)*blend*.5:Math.sin(index*Math.PI/2+v*3)*blend*4;
   ctx.globalAlpha=Math.min(1,Math.max(0,(cut/base.height-v)/(motion.meditating?.08:.10)));
   ctx.drawImage(base.image,0,sy,base.width,sh,baseX+sway,baseY+sy*bodyScale,base.width*bodyScale*base.pixelAspect,sh*bodyScale+.2);
  }
  ctx.globalAlpha=1;
  const painted=characterWardrobe.paint(canvas,ap,direction),value={image:painted,width:384,height:384,anchor:[cx,floor],pixelAspect:1,key:id,mode:motion.meditating?'meditate':'walk',index,row};
  cache.set(id,value);if(cache.size>LIMIT)cache.delete(cache.keys().next().value);return value;
 }
 // Horizontal shift that puts the leg frame's robe under the standing torso (cached per pose).
 const offsets=new Map();
 function centroid(c,top,bottom){let data;try{data=c.getImageData(0,top,384,bottom-top).data;}catch{return null;}let sum=0,weight=0;for(let i=3;i<data.length;i+=4){const a=data[i];if(a>40){sum+=((i>>2)%384)*a;weight+=a;}}return weight?sum/weight:null;}
 function alignment(base,baseX,baseY,bodyScale,lc,join,id){const key=id;if(offsets.has(key))return offsets.get(key);
  const probe=document.createElement('canvas');probe.width=probe.height=384;const pc=probe.getContext('2d');
  pc.drawImage(base.image,0,0,base.width,base.height,baseX,baseY,base.width*bodyScale*base.pixelAspect,base.height*bodyScale);
  const top=join-6,bottom=join+18,a=centroid(pc,top,bottom),b=centroid(lc,top,bottom),value=a!=null&&b!=null?Math.max(-40,Math.min(40,a-b)):0;
  offsets.set(key,value);return value;}
 function draw(ctx,ap,direction,x,y,height,motion={}){const pose=frame(ap,direction,motion);if(!pose)return null;const scale=height/270,result={image:pose.image,x:x-pose.anchor[0]*scale,y:y-pose.anchor[1]*scale,width:pose.width*scale,height:pose.height*scale};renderArtwork(ctx,result.image,result.x,result.y,result.width,result.height);return result;}
 const auth=()=>{if(P.ap)load(P.ap);};addEventListener('tienlo-auth',auth);const create=$('ok').onclick;$('ok').onclick=function(...args){const result=create(...args);auth();return result;};
 window.characterAnimation={load,frame,draw,cache,LIMIT,atlases,offsets};
})();
