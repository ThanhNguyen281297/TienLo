/* Mask expressions are baked into complete character sprites. No face overlays. */
(function(){
 const masks=new Map(equipmentRules.masks.map(item=>[item.id,item]));
 const atlases=new Map(),rearAtlases=new Map(),frames=new Map(),frameLimit=64,empty=document.createElement('canvas');empty.width=empty.height=1;
 const genderOf=ap=>ap?.gender==='Nu'?'Nu':'Nam';
 const classOf=ap=>Number.isInteger(ap?.w)&&ap.w>=0&&ap.w<4?ap.w:0;
 const atlasKey=ap=>characterClasses[classOf(ap)].folder+'/'+genderOf(ap);
 function forAppearance(ap=P.ap){
  if(!ap)return null;
  const id=ap===P.ap?P.world?.equip?.matna?.id:ap.maskId,item=masks.get(id);
  return item?.gender===genderOf(ap)?item:null;
 }
 function faceFor(ap=P.ap){
  if(!ap)return null;
  return forAppearance(ap)||masks.get('mask-'+genderOf(ap).toLowerCase()+'-'+(Number.isInteger(ap.face)&&ap.face>=1&&ap.face<=10?ap.face:1));
 }
 function load(ap=P.ap){
  if(!ap)return null;
  loadRear(ap);
  const key=atlasKey(ap);if(atlases.has(key))return atlases.get(key);
  const meta=characterExpressionFrames.atlases[key],entry={image:null,failed:false,meta};
  atlases.set(key,entry);
  const image=new Image();image.onload=()=>{
   if(image.naturalWidth!==meta.size[0]||image.naturalHeight!==meta.size[1]){entry.failed=true;return;}
   entry.image=image;refreshAvatar(true);window.characterWardrobe?.refreshCreator();
  };
  image.onerror=()=>{entry.failed=true;};image.src=artworkURL(meta.file);return entry;
 }
 function loadRear(ap=P.ap){
  if(!ap)return null;
  const meta=characterExpressionFrames.rears[atlasKey(ap)];
  if(rearAtlases.has(meta.file))return rearAtlases.get(meta.file);
  const entry={image:null,failed:false};rearAtlases.set(meta.file,entry);
  const image=new Image();image.onload=()=>{
   if(image.naturalWidth!==meta.size[0]||image.naturalHeight!==meta.size[1]){entry.failed=true;return;}
   entry.image=image;window.characterWardrobe?.refreshCreator();
  };
  image.onerror=()=>{entry.failed=true;};image.src=artworkURL(meta.file);return entry;
 }
 function frameFor(ap,direction='truoc'){
  const item=faceFor(ap),rear=direction==='sau';
  if(!item||(!rear&&!characterExpressionFrames.directions.includes(direction)))return null;
  const atlas=rear?loadRear(ap):load(ap);if(!atlas.image)return null;
  const style=window.characterWardrobe?.styleOf(ap)||'class';
  // Rear artwork is shared across face choices: a mask never paints a rear face.
  const key=atlasKey(ap)+'/'+(rear?'rear':item.variant)+'/'+direction+'/'+style;
  if(frames.has(key)){const frame=frames.get(key);frames.delete(key);frames.set(key,frame);return frame;}
  const meta=rear?characterExpressionFrames.rears[atlasKey(ap)]:atlas.meta.frames.find(f=>f.variant===item.variant&&f.direction===direction);
  if(!meta)return null;
  const [x,y,width,height]=meta.rect,canvas=document.createElement('canvas');
  canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');
  // One atlas rectangle contains the entire painted character, including its face.
  ctx.drawImage(atlas.image,x,y,width,height,0,0,width,height);
  const image=window.characterWardrobe?.paint(canvas,ap,direction,style)||canvas;
  const frame={image,width,height,anchor:meta.anchor,pixelAspect:meta.pixelAspect,key,source:meta.rect};
  frames.set(key,frame);if(frames.size>frameLimit)frames.delete(frames.keys().next().value);
  return frame;
 }
 function geometry(frame,footX,footY,height){
  const scale=height/frame.anchor[1],sx=scale*frame.pixelAspect;
  return {image:frame.image,x:footX-frame.anchor[0]*sx,y:footY-height,
   width:frame.width*sx,height:frame.height*scale};
 }
 function drawBody(ctx,body,ap,direction,x,y,width,height,feet,motion){
  const animated=window.characterAnimation?.draw(ctx,ap,direction,feet?.x??x+width/2,feet?.y??y+height,height,motion);
  if(animated)return animated;
  const frame=frameFor(ap,direction);
  const result=frame?geometry(frame,feet?.x??x+width/2,feet?.y??y+height,height):{image:empty,x,y,width,height};
  renderArtwork(ctx,result.image,result.x,result.y,result.width,result.height);
  return result;
 }
 function portrait(ctx,ap,size){
  const frame=frameFor(ap,'truoc');if(!frame)return false;
  const image=frame.image,w=frame.width,h=frame.height;
  const center=[.50,genderOf(ap)==='Nam'?.38:.35,.56];
  const span=Math.min(w,h*center[2]),sx=Math.max(0,Math.min(w-span,w*center[0]-span/2));
  const sy=Math.max(0,Math.min(h-span,h*center[1]-span/2));
  ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.beginPath();ctx.arc(size/2,size/2,size*.49,0,Math.PI*2);ctx.clip();
  ctx.drawImage(image,sx,sy,span,span,0,0,size,size);ctx.restore();return true;
 }
 let avatarKey=null;
 function refreshAvatar(force=false){
  const canvas=$('player-avatar');if(!canvas)return;
  const ap=P.ap,item=forAppearance(ap),face=faceFor(ap),key=ap?atlasKey(ap)+'/'+face.variant+'/'+(item?.id||'base')+'/'+(window.characterWardrobe?.styleOf(ap)||'class'):'empty';
  if(!force&&avatarKey===key)return;avatarKey=key;
  const ctx=canvas.getContext('2d'),size=canvas.width;ctx.clearRect(0,0,size,size);
  canvas.dataset.maskId=item?.id||'';canvas.dataset.face=face?.variant||'';canvas.setAttribute('aria-label',item?item.name:'Dung mạo '+(face?.variant||''));canvas.title=item?.name||'Dung mạo '+(face?.variant||'');
  if(!ap)return;
  portrait(ctx,ap,size);
 }
 const previousHud=hud;hud=function(){previousHud();refreshAvatar();};
 addEventListener('tienlo-auth',()=>refreshAvatar(true));
 window.characterMasks={forAppearance,faceFor,portrait,load,loadRear,frameFor,geometry,drawBody,frameLimit,
  get cacheSize(){return frames.size;},get atlasCount(){return atlases.size;},get rearAtlasCount(){return rearAtlases.size;},refreshAvatar};
 refreshAvatar();
})();
