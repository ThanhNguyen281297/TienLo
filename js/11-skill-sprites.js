/* Full individual PNG poses. No source rectangles or artwork clipping. */
(function(){
  const folders=['Kiem','Liem','Thuong','Quat'];
  const names=[['phikiemquyet','kiemanhbo','batquaikiemtran','vankiemquytong'],['tamnguyettram','nguyetanhbo','nguyetluantran','minhnguyetgiangthe'],['loithuongdotkich','hoanhtaothienquan','cuuthienloitran','loilonggiangthe'],['philinhchu','phonglinhphien','thiencotran','vanphuphongan']];
  const cache=new Map();let failed=0;
  function load(sect,index,frame){
    const meta=skillSpriteManifest[folders[sect]]?.[names[sect][index]]?.[Math.max(0,Math.min(5,frame))];
    if(!meta)return null;
    if(!cache.has(meta.src)){
      const image=new Image();image.src=meta.src;image.onerror=()=>failed++;
      cache.set(meta.src,{image,meta});
    }
    return cache.get(meta.src);
  }
  function preload(sect){for(let i=0;i<4;i++)for(let frame=0;frame<6;frame++)load(sect,i,frame);}
  function draw(ctx,sect,index,frame,x,y,width,height,rotation=0,alpha=1){
    const asset=load(sect,index,frame);if(!asset||!asset.image.complete||!asset.image.naturalWidth)return false;
    const {image,meta}=asset,[left,top,right,bottom]=meta.bounds;
    // Contain the complete visible pose, preserve aspect ratio, draw the WHOLE PNG.
    const scale=Math.min(width/(right-left),height/(bottom-top));
    ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.globalAlpha*=alpha;
    ctx.shadowBlur=0;ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    renderArtwork(ctx,image,-(left+right)/2*scale,-(top+bottom)/2*scale,image.naturalWidth*scale,image.naturalHeight*scale);
    ctx.restore();return true;
  }
  window.skillSprites={draw,preload,names,cache,get failed(){return failed;}};
  // Load one sect at a time; creator choices and the active character warm the rest.
  preload(P.ap?.w||0);
  const update=up;let current=P.ap?.w||0;
  up=function(dt){const sect=P.ap?.w??tp.w??0;if(sect!==current){current=sect;preload(sect);}return update(dt);};
})();
