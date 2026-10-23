/* Actor clarity: crisper downsampled painted art and grounded actors.
   - Unsharp mask (alpha-weighted, applied once per cached raster) restores the
     edge contrast lost when 1000+ px paintings are reduced to ~60-200 px.
   - Soft contact shadows for expedition monsters, atlas NPCs and other players.
   No PNG is modified; every effect is cached and skipped under file:// taint. */
(function(){
 const DEFAULT_AMOUNT=.55;
 // file:// pages taint every canvas; never attempt a pixel read there.
 let disabled=location.protocol==='file:';
 const done=new WeakSet();

 // Alpha-weighted 3x3 blur so transparent neighbours do not darken the rim.
 function sharpen(canvas,amount=DEFAULT_AMOUNT,skipOpaqueTiles=false){
  if(disabled||!canvas||done.has(canvas)||!(amount>0))return canvas;
  const w=canvas.width,h=canvas.height;
  if(w<3||h<3||w*h>1600000){done.add(canvas);return canvas;}
  let ctx,data;
  try{ctx=canvas.getContext('2d',{willReadFrequently:true});data=ctx.getImageData(0,0,w,h);}
  catch(e){disabled=true;return canvas;} // tainted (file://) - keep plain art
  const src=data.data;
  // Repeating ground textures are opaque edge to edge; sharpening them would
  // leave a soft 1 px border that shows as a seam between tiles.
  if(skipOpaqueTiles&&src[3]===255&&src[(w-1)*4+3]===255&&src[((h-1)*w)*4+3]===255&&src[(h*w-1)*4+3]===255){done.add(canvas);return canvas;}
  const out=new Uint8ClampedArray(src);
  for(let y=1;y<h-1;y++){
   for(let x=1;x<w-1;x++){
    const i=(y*w+x)*4,a=src[i+3];if(!a)continue;
    let r=0,g=0,b=0,wa=0;
    for(let oy=-1;oy<=1;oy++){
     let j=((y+oy)*w+x-1)*4;
     for(let ox=-1;ox<=1;ox++,j+=4){const k=src[j+3];if(!k)continue;r+=src[j]*k;g+=src[j+1]*k;b+=src[j+2]*k;wa+=k;}
    }
    if(!wa)continue;
    out[i]=src[i]+(src[i]-r/wa)*amount;
    out[i+1]=src[i+1]+(src[i+1]-g/wa)*amount;
    out[i+2]=src[i+2]+(src[i+2]-b/wa)*amount;
   }
  }
  data.data.set(out);ctx.putImageData(data,0,0);done.add(canvas);return canvas;
 }

 // Same contract as 00-render-quality renderArtwork, plus a sharpened copy of
 // the mip level actually drawn. Intermediate levels stay unsharpened.
 const chains=new WeakMap(),sharp=new WeakMap();
 function sharpLevel(image,index,level){
  let list=sharp.get(image);if(!list){list=[];sharp.set(image,list);}
  if(list[index])return list[index];
  const copy=document.createElement('canvas');copy.width=level.width;copy.height=level.height;
  copy.getContext('2d').drawImage(level,0,0);
  list[index]=sharpen(copy,DEFAULT_AMOUNT,true);return list[index];
 }
 function renderArtwork(ctx,image,x,y,width,height){
  const sw=image.naturalWidth||image.width,sh=image.naturalHeight||image.height;
  if(!sw||!sh||width<=0||height<=0)return;
  const m=ctx.getTransform(),sx=Math.hypot(m.a,m.b),sy=Math.hypot(m.c,m.d);
  const target=Math.max(width*sx/sw,height*sy/sh);
  let source=image;
  if(target<.5&&!/\.svg(?:[?#]|$)/i.test(image.currentSrc||image.src||'')){
   let chain=chains.get(image);if(!chain){chain=[image];chains.set(image,chain);}
   let index=0,ratio=1;
   while(ratio*.5>=target&&Math.min(sw,sh)*ratio>96){
    index++;ratio*=.5;
    if(!chain[index]){
     const prev=chain[index-1],c=document.createElement('canvas');
     c.width=Math.max(1,Math.round(sw*ratio));c.height=Math.max(1,Math.round(sh*ratio));
     const cc=c.getContext('2d');cc.imageSmoothingEnabled=true;cc.imageSmoothingQuality='high';
     cc.drawImage(prev,0,0,c.width,c.height);chain[index]=c;
    }
   }
   source=index?sharpLevel(image,index,chain[index]):image;
  }
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(source,x,y,width,height);
 }
 if(window.renderArtwork)window.renderArtwork=renderArtwork;

 // Shared soft contact shadow, slightly offset away from the top-left light.
 let shadowSprite=null;
 function contactShadow(ctx,x,y,width,alpha=1){
  if(!shadowSprite){
   shadowSprite=document.createElement('canvas');shadowSprite.width=128;shadowSprite.height=32;
   const c=shadowSprite.getContext('2d');c.scale(1,.25);
   const gr=c.createRadialGradient(64,64,0,64,64,64);
   gr.addColorStop(0,'rgba(6,14,18,.55)');gr.addColorStop(.55,'rgba(6,14,18,.28)');gr.addColorStop(1,'rgba(6,14,18,0)');
   c.fillStyle=gr;c.fillRect(0,0,128,128);
  }
  const h=Math.max(4,width*.26);
  ctx.save();ctx.globalAlpha*=alpha;ctx.drawImage(shadowSprite,x-width/2+width*.04,y-h*.45,width,h);ctx.restore();
 }

 // Expedition monsters (35n) draw no ground shadow of their own.
 if(typeof mon==='function'&&window.expeditionMonsters){
  const previous=mon;
  mon=function(e){
   if(!e.corpse&&!e.duelTarget){
    const kind=window.expeditionMonsters.kinds.get(e.skin);
    if(kind){const height=kind.height*(e.boss?1.25:1);contactShadow(g,e.x,e.y,Math.max(18,height*.75));}
   }
   return previous(e);
  };
 }

 // Atlas NPCs (35r) stand on bare ground.
 if(window.creatureArt?.drawNpc){
  const previous=creatureArt.drawNpc;
  creatureArt.drawNpc=function(ctx,s){contactShadow(ctx,s.x,s.y,30,.9);return previous(ctx,s);};
 }

 // Other players: the local hero already gets a shadow inside human().
 if(typeof drawChar==='function'){
  const previous=drawChar;
  drawChar=function(ctx,x,y,dir,facing,moving,phase,attacking,ap,...rest){
   if(typeof g!=='undefined'&&ctx===g&&ap&&ap!==P.ap&&(typeof tp==='undefined'||ap!==tp))contactShadow(ctx,x,y+1,22,.85);
   return previous(ctx,x,y,dir,facing,moving,phase,attacking,ap,...rest);
  };
 }

 window.actorClarity={sharpen,contactShadow,renderArtwork,get disabled(){return disabled;}};
})();
