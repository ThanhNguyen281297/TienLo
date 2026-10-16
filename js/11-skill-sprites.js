/* Full individual PNG poses. No source rectangles or artwork clipping. */
(function(){
  const folders=['Kiem','Liem','Thuong','Quat'];
  const names=[['phikiemquyet','kiemanhbo','batquaikiemtran','vankiemquytong'],['tamnguyettram','nguyetanhbo','nguyetluantran','minhnguyetgiangthe'],['loithuongdotkich','hoanhtaothienquan','cuuthienloitran','loilonggiangthe'],['philinhchu','phonglinhphien','thiencotran','vanphuphongan']];
  const cache=new Map();let failed=0;
  function load(sect,index,frame){
    const meta=skillSpriteManifest[folders[sect]]?.[names[sect][index]]?.[Math.max(0,Math.min(5,frame))];
    if(!meta)return null;
    if(!cache.has(meta.src)){
      const image=new Image();image.src=window.artworkURL?artworkURL(meta.src):meta.src;image.onerror=()=>failed++;
      cache.set(meta.src,{image,meta});
    }
    return cache.get(meta.src);
  }
  function preload(sect){for(let i=0;i<4;i++)for(let frame=0;frame<6;frame++)load(sect,i,frame);}
  function draw(ctx,sect,index,frame,x,y,width,height,rotation=0,alpha=1){
    frame=Math.max(0,Math.min(5,frame));
    // All six paintings are key poses, not consecutive video frames. Blend over
    // the entire interval and interpolate their fit scale before drawing either
    // pose so neither the silhouette nor its size snaps at integer boundaries.
    const lower=Math.floor(frame),mix=frame-lower;
    const first=load(sect,index,lower),second=mix>0?load(sect,index,lower+1):null;
    const ready=a=>a&&a.image.complete&&a.image.naturalWidth;
    if(!ready(first)&&!ready(second))return false;
    const fit=a=>Math.min(width/(a.meta.bounds[2]-a.meta.bounds[0]),height/(a.meta.bounds[3]-a.meta.bounds[1]));
    const scale=ready(first)&&ready(second)?fit(first)*(1-mix)+fit(second)*mix:fit(ready(first)?first:second);
    ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.globalAlpha*=alpha;
    ctx.shadowBlur=0;ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    function paint(asset,opacity){
      if(!ready(asset)||opacity<=0)return;
      const {image,meta}=asset,[left,top,right,bottom]=meta.bounds;
      ctx.save();ctx.globalAlpha*=opacity;
      renderArtwork(ctx,image,-(left+right)/2*scale,-(top+bottom)/2*scale,image.naturalWidth*scale,image.naturalHeight*scale);
      ctx.restore();
    }
    if(ready(first)&&ready(second)){paint(first,1-mix);paint(second,mix);}
    else paint(ready(first)?first:second,1);
    ctx.restore();return true;
  }
  function animate(ctx,sect,index,age,duration,x,y,width,height,hitAt=duration*.6,alpha=1){
    const clamp=v=>Math.max(0,Math.min(1,v)),ease=v=>1-(1-clamp(v))**3;
    const wind=clamp(age/hitAt),release=clamp((age-hitAt)/Math.max(.01,duration-hitAt));
    const frame=age<hitAt?wind*3:3+release*2;
    const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
    const fade=smooth(age/.16)*smooth((duration-age)/.4)*alpha;
    let dx=0,dy=0,rotation=0,scale=.82+.18*ease(wind);
    if(sect===0){dy=age<hitAt?-18*(1-ease(wind)):8*Math.sin(release*Math.PI);scale+=.08*Math.sin(release*Math.PI);}
    if(sect===1){rotation=age<hitAt?-.14*(1-ease(wind)):.1*Math.sin(release*Math.PI);dy=-6*Math.sin(wind*Math.PI);}
    if(sect===2){dy=age<hitAt?-48*(1-wind*wind):12*Math.sin(release*Math.PI);dx=age<hitAt?-12*(1-ease(wind)):0;rotation=age<hitAt?-.12*(1-wind):0;}
    if(sect===3){dy=-10*Math.sin(wind*Math.PI);rotation=age<hitAt?.08*(1-ease(wind)):0;scale+=.05*Math.sin(release*Math.PI);}
    // Subtle breathing and drift keep a held charge alive between key poses.
    const pulse=Math.sin(Math.PI*clamp(age/duration));
    scale*=1+.025*Math.sin(age*5)*pulse;
    dx+=Math.sin(age*2.4)*2*pulse;dy+=Math.sin(age*3.2)*2*pulse;
    // Continuous ribbons move independently of the six painted key poses.
    // No random positions: every render is deterministic in simulation time.
    if(window.spellMotion)spellMotion.ribbons(ctx,sect,x+dx,y+dy,age,width*scale,height*scale,fade*.45);
    return draw(ctx,sect,index,frame,x+dx,y+dy,width*scale,height*scale,rotation,fade);
  }
  // Grow into the established formation; keep its identity until it dissipates.
  function fieldFrame(age,duration){
    if(age<.55)return Math.max(0,age/.55)*2;
    const exit=Math.max(0,Math.min(1,(age-(duration-.6))/.6));
    return 2+exit*exit*(3-2*exit)*3;
  }
  window.skillSprites={draw,animate,fieldFrame,preload,names,cache,get failed(){return failed;}};
  // Load one sect at a time; creator choices and the active character warm the rest.
  preload(P.ap?.w||0);
  const update=up;let current=P.ap?.w||0;
  up=function(dt){const sect=P.ap?.w??tp.w??0;if(sect!==current){current=sect;preload(sect);}return update(dt);};
})();
