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
    frame=Math.max(0,Math.min(5,frame));
    // A short exposure overlap keeps painted edges readable. Long full-frame
    // dissolves turn six different silhouettes into a translucent double image.
    const lower=Math.floor(frame),fraction=frame-lower,mix=Math.max(0,(fraction-.78)/.22);
    if(mix>.001){
      const first=draw(ctx,sect,index,lower,x,y,width,height,rotation,alpha*(1-mix));
      const second=draw(ctx,sect,index,lower+1,x,y,width,height,rotation,alpha*mix);
      return first||second;
    }
    frame=lower;
    const asset=load(sect,index,frame);if(!asset||!asset.image.complete||!asset.image.naturalWidth)return false;
    const {image,meta}=asset,[left,top,right,bottom]=meta.bounds;
    // Contain the complete visible pose, preserve aspect ratio, draw the WHOLE PNG.
    const scale=Math.min(width/(right-left),height/(bottom-top));
    ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.globalAlpha*=alpha;
    ctx.shadowBlur=0;ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    renderArtwork(ctx,image,-(left+right)/2*scale,-(top+bottom)/2*scale,image.naturalWidth*scale,image.naturalHeight*scale);
    ctx.restore();return true;
  }
  function animate(ctx,sect,index,age,duration,x,y,width,height,hitAt=duration*.6,alpha=1){
    const clamp=v=>Math.max(0,Math.min(1,v)),ease=v=>1-(1-clamp(v))**3;
    const wind=clamp(age/hitAt),release=clamp((age-hitAt)/Math.max(.01,duration-hitAt));
    const frame=age<hitAt?wind*2.8:3+release*2;
    const fade=clamp(age/.12)*clamp((duration-age)/.3)*alpha;
    let dx=0,dy=0,rotation=0,scale=.82+.18*ease(wind);
    if(sect===0){dy=age<hitAt?-18*(1-ease(wind)):8*Math.sin(release*Math.PI);scale+=.08*Math.sin(release*Math.PI);}
    if(sect===1){rotation=age<hitAt?-.14*(1-ease(wind)):.1*Math.sin(release*Math.PI);dy=-6*Math.sin(wind*Math.PI);}
    if(sect===2){dy=age<hitAt?-48*(1-wind*wind):12*Math.sin(release*Math.PI);dx=age<hitAt?-12*(1-ease(wind)):0;rotation=age<hitAt?-.12*(1-wind):0;}
    if(sect===3){dy=-10*Math.sin(wind*Math.PI);rotation=age<hitAt?.08*(1-ease(wind)):0;scale+=.05*Math.sin(release*Math.PI);}
    return draw(ctx,sect,index,frame,x+dx,y+dy,width*scale,height*scale,rotation,fade);
  }
  window.skillSprites={draw,animate,preload,names,cache,get failed(){return failed;}};
  // Load one sect at a time; creator choices and the active character warm the rest.
  preload(P.ap?.w||0);
  const update=up;let current=P.ap?.w||0;
  up=function(dt){const sect=P.ap?.w??tp.w??0;if(sect!==current){current=sect;preload(sect);}return update(dt);};
})();
