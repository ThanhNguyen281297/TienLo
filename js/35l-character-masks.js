/* Cosmetic faces attach to the body sprite; saved equipment selects local/online art. */
(function(){
 const masks=new Map(equipmentRules.masks.map(item=>[item.id,item])),cache=new Map(),portraits=new Map();
 // Face centre and width, relative to each original body PNG (not the canvas).
 const anchors=[
  {Nam:{truoc:[.49,.40,.29],trai:[.445,.405,.24],phai:[.62,.395,.22]},Nu:{truoc:[.51,.29,.29],trai:[.39,.29,.23],phai:[.67,.29,.23]}},
  {Nam:{truoc:[.50,.37,.33],trai:[.48,.395,.31],phai:[.53,.40,.32]},Nu:{truoc:[.49,.23,.29],trai:[.38,.23,.22],phai:[.69,.24,.22]}},
  {Nam:{truoc:[.45,.36,.30],trai:[.32,.36,.24],phai:[.75,.36,.24]},Nu:{truoc:[.46,.30,.24],trai:[.315,.30,.20],phai:[.75,.34,.18]}},
  {Nam:{truoc:[.49,.31,.29],trai:[.39,.31,.23],phai:[.67,.31,.23]},Nu:{truoc:[.48,.25,.20],trai:[.41,.245,.17],phai:[.62,.24,.17]}}
 ];
 const genderOf=ap=>ap?.gender==='Nu'?'Nu':'Nam',classOf=ap=>Number.isInteger(ap?.w)&&ap.w>=0&&ap.w<4?ap.w:0;
 function forAppearance(ap=P.ap){
  if(!ap)return null;
  const id=ap===P.ap?P.world?.equip?.matna?.id:ap.maskId,item=masks.get(id);
  return item?.gender===genderOf(ap)?item:null;
 }
 function load(src){
  if(cache.has(src))return cache.get(src);
  const entry={image:null,failed:false};cache.set(src,entry);
  const image=new Image();image.onload=()=>{
   // One compact, high-quality surface per visible face; don't retain 1254px decodes.
   const surface=document.createElement('canvas');surface.width=surface.height=384;
   const ctx=surface.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
   ctx.drawImage(image,0,0,384,384);entry.image=surface;refreshAvatar(true);
  };image.onerror=()=>{entry.failed=true;refreshAvatar(true);};image.src=artworkURL(src);return entry;
 }
 function drawFace(ctx,ap,direction,x,y,width,height){
  // Supplied art is frontal. The back view keeps the original hair, never a face.
  const item=forAppearance(ap);if(!item||direction==='sau')return false;
  const image=load(item.art).image;if(!image)return false;
  const gender=genderOf(ap),anchor=anchors[classOf(ap)][gender][direction];if(!anchor)return false;
  const side=direction!=='truoc',size=width*anchor[2]/(gender==='Nu'?.50:.76)/(side?.78:1);
  const faceHeight=side?Math.min(size,height*(gender==='Nu'?.34:.36)):size;
  const cx=x+width*anchor[0],cy=y+height*anchor[1];
  ctx.save();ctx.translate(cx,cy);
  // A narrow side projection follows the nose direction rather than floating beside it.
  ctx.scale(side?(direction==='trai'?-.78:.78):1,1);
  const sourceX=gender==='Nu'?.59:.51,sourceY=gender==='Nu'?.61:.51;
  renderArtwork(ctx,image,-size*sourceX,-faceHeight*sourceY,size,faceHeight);
  ctx.restore();return true;
 }
 function originalPortrait(ap){
  const key=classOf(ap)+'/'+genderOf(ap);if(portraits.has(key))return portraits.get(key);
  const image=new Image();portraits.set(key,image);image.onload=()=>refreshAvatar(true);
  image.src=artworkURL('Character/'+characterClasses[classOf(ap)].folder+'/'+genderOf(ap)+'/truoc.png');return image;
 }
 let avatarKey=null;
 function refreshAvatar(force=false){
  const canvas=$('player-avatar');if(!canvas)return;
  const ap=P.ap,item=forAppearance(ap),key=ap?classOf(ap)+'/'+genderOf(ap)+'/'+(item?.id||'original'):'empty';
  if(!force&&avatarKey===key)return;avatarKey=key;
  const ctx=canvas.getContext('2d'),size=canvas.width;ctx.clearRect(0,0,size,size);
  canvas.dataset.maskId=item?.id||'';canvas.setAttribute('aria-label',item?item.name:'Gương mặt gốc của nhân vật');canvas.title=item?.name||'Gương mặt gốc';
  if(!ap)return;
  ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.beginPath();ctx.arc(size/2,size/2,size*.49,0,Math.PI*2);ctx.clip();
  const mask=item&&load(item.art).image;
  if(mask){ctx.drawImage(mask,size*.025,size*.025,size*.95,size*.95);}
  else{
   const image=originalPortrait(ap);
   if(image.complete&&image.naturalWidth){
    const [fx,fy,fw]=anchors[classOf(ap)][genderOf(ap)].truoc,span=Math.min(image.naturalWidth,image.naturalWidth*fw*1.8);
    const sx=Math.max(0,Math.min(image.naturalWidth-span,image.naturalWidth*fx-span/2));
    const sy=Math.max(0,Math.min(image.naturalHeight-span,image.naturalHeight*fy-span*.60));
    ctx.drawImage(image,sx,sy,span,span,0,0,size,size);
   }
  }
  ctx.restore();
 }
 const previousHud=hud;hud=function(){previousHud();refreshAvatar();};
 addEventListener('tienlo-auth',()=>refreshAvatar(true));
 window.characterMasks={forAppearance,load,drawFace,refreshAvatar};refreshAvatar();
})();
