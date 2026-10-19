/* Mask expressions are baked into complete character sprites. No face overlays. */
(function(){
 const masks=new Map(equipmentRules.masks.map(item=>[item.id,item]));
 const atlases=new Map(),frames=new Map(),originals=new Map(),frameLimit=64;
 const genderOf=ap=>ap?.gender==='Nu'?'Nu':'Nam';
 const classOf=ap=>Number.isInteger(ap?.w)&&ap.w>=0&&ap.w<4?ap.w:0;
 const atlasKey=ap=>characterClasses[classOf(ap)].folder+'/'+genderOf(ap);
 function forAppearance(ap=P.ap){
  if(!ap)return null;
  const id=ap===P.ap?P.world?.equip?.matna?.id:ap.maskId,item=masks.get(id);
  return item?.gender===genderOf(ap)?item:null;
 }
 function load(ap=P.ap){
  if(!ap)return null;
  const key=atlasKey(ap);if(atlases.has(key))return atlases.get(key);
  const meta=characterExpressionFrames.atlases[key],entry={image:null,failed:false,meta};
  atlases.set(key,entry);
  const image=new Image();image.onload=()=>{
   if(image.naturalWidth!==meta.size[0]||image.naturalHeight!==meta.size[1]){entry.failed=true;return;}
   entry.image=image;refreshAvatar(true);
  };
  image.onerror=()=>{entry.failed=true;};image.src=artworkURL(meta.file);return entry;
 }
 function frameFor(ap,direction='truoc'){
  const item=forAppearance(ap);
  if(!item||!characterExpressionFrames.directions.includes(direction))return null;
  const atlas=load(ap);if(!atlas.image)return null;
  const key=atlasKey(ap)+'/'+item.variant+'/'+direction;
  if(frames.has(key)){const frame=frames.get(key);frames.delete(key);frames.set(key,frame);return frame;}
  const meta=atlas.meta.frames.find(f=>f.variant===item.variant&&f.direction===direction);
  if(!meta)return null;
  const [x,y,width,height]=meta.rect,canvas=document.createElement('canvas');
  canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');
  // One atlas rectangle contains the entire painted character, including its face.
  ctx.drawImage(atlas.image,x,y,width,height,0,0,width,height);
  const frame={image:canvas,width,height,anchor:meta.anchor,pixelAspect:meta.pixelAspect,key,source:meta.rect};
  frames.set(key,frame);if(frames.size>frameLimit)frames.delete(frames.keys().next().value);
  return frame;
 }
 function geometry(frame,footX,footY,height){
  const scale=height/frame.anchor[1],sx=scale*frame.pixelAspect;
  return {image:frame.image,x:footX-frame.anchor[0]*sx,y:footY-height,
   width:frame.width*sx,height:frame.height*scale};
 }
 function drawBody(ctx,body,ap,direction,x,y,width,height,feet){
  const frame=frameFor(ap,direction);
  const result=frame?geometry(frame,feet?.x??x+width/2,feet?.y??y+height,height):{image:body,x,y,width,height};
  renderArtwork(ctx,result.image,result.x,result.y,result.width,result.height);
  return result;
 }
 function originalPortrait(ap){
  const key=atlasKey(ap);if(originals.has(key))return originals.get(key);
  const image=new Image();originals.set(key,image);image.onload=()=>refreshAvatar(true);
  image.src=artworkURL('Character/'+key+'/truoc.png');return image;
 }
 // These boxes are HUD crops only. They never position or replace a world face.
 const portraitCenters={Kiem:{Nam:[.50,.40,.47],Nu:[.51,.29,.46]},
  Liem:{Nam:[.50,.38,.56],Nu:[.51,.22,.44]},
  Thuong:{Nam:[.48,.36,.47],Nu:[.48,.30,.43]},
  Quat:{Nam:[.50,.32,.46],Nu:[.48,.24,.43]}};
 let avatarKey=null;
 function refreshAvatar(force=false){
  const canvas=$('player-avatar');if(!canvas)return;
  const ap=P.ap,item=forAppearance(ap),key=ap?atlasKey(ap)+'/'+(item?.id||'original'):'empty';
  if(!force&&avatarKey===key)return;avatarKey=key;
  const ctx=canvas.getContext('2d'),size=canvas.width;ctx.clearRect(0,0,size,size);
  canvas.dataset.maskId=item?.id||'';canvas.setAttribute('aria-label',item?item.name:'Gương mặt gốc của nhân vật');canvas.title=item?.name||'Gương mặt gốc';
  if(!ap)return;
  const frame=frameFor(ap,'truoc'),original=frame?null:originalPortrait(ap);
  const image=frame?.image||original;
  if(!image||image.complete===false||!(image.naturalWidth||image.width))return;
  const w=image.naturalWidth||image.width,h=image.naturalHeight||image.height;
  const folder=characterClasses[classOf(ap)].folder;
  const center=frame?[.50,genderOf(ap)==='Nam'?.38:.35,.56]:portraitCenters[folder][genderOf(ap)];
  const span=Math.min(w,h*center[2]),sx=Math.max(0,Math.min(w-span,w*center[0]-span/2));
  const sy=Math.max(0,Math.min(h-span,h*center[1]-span/2));
  ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.beginPath();ctx.arc(size/2,size/2,size*.49,0,Math.PI*2);ctx.clip();
  ctx.drawImage(image,sx,sy,span,span,0,0,size,size);ctx.restore();
 }
 const previousHud=hud;hud=function(){previousHud();refreshAvatar();};
 addEventListener('tienlo-auth',()=>refreshAvatar(true));
 window.characterMasks={forAppearance,load,frameFor,geometry,drawBody,frameLimit,
  get cacheSize(){return frames.size;},get atlasCount(){return atlases.size;},refreshAvatar};
 refreshAvatar();
})();
