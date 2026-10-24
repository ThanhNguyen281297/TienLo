/* Equipment animation keeps the mounting point fixed; only the outer fabric,
   feathers and energy bend. Source artwork is cached at a useful render size. */
(function(){
  const TAU=Math.PI*2,reduced=matchMedia('(prefers-reduced-motion: reduce)'),cache=new WeakMap();
  const tones=['#79dfed','#89d6ff','#e7d998','#b59aff','#abd7ff','#ffae64','#86ebce','#ba94ff','#6fe9d9','#88dcf5','#e8d697','#be9aff'];
  const mounts=[.49,.49,.44,.48,.45,.43,.45,.46,.72,.53,.43,.48];
  const heights=[68,68,65,70,70,70,70,70,68,70,66,72];
  const smooth=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);};
  function prepared(image){
    if(!image?.complete||!image.naturalWidth)return null;
    if(cache.has(image))return cache.get(image);
    const source=document.createElement('canvas');source.height=256;source.width=Math.round(256*image.naturalWidth/image.naturalHeight);
    const c=source.getContext('2d');c.imageSmoothingQuality='high';
    if(/\/BuffThuan\//.test(image.src))c.filter='saturate(1.5) contrast(1.16)';
    c.drawImage(image,0,0,source.width,256);c.filter='none';
    const shine=document.createElement('canvas');shine.width=source.width;shine.height=256;
    const entry={source,shine,frame:-1};cache.set(image,entry);return entry;
  }
  function profile(image){const variant=Math.max(1,Math.min(12,Number(/\/(\d+)\.png/.exec(image?.src||'')?.[1])||9));return{variant,height:heights[variant-1],mount:mounts[variant-1],tone:tones[variant-1]};}
  // Mounted on the upper back (below the big chibi head), sized to the measured body.
  function mount(image,x,y,dir,facing,bob=0,fit){
    const p=profile(image),height=fit?Math.min(p.height,fit.H*1.42):p.height,at=fit?fit.spine:{x:x+(dir===2?-facing*8:0),y:y-24-bob};
    return{...p,height,x:at.x,y:at.y,width:height*(image.naturalWidth||1)/(image.naturalHeight||1),squeeze:dir===2?.62:1};
  }
  // Adjacent strips share boundaries. The spine stays at x=0, y=0 in every pose.
  // part -1/1 draws only the left/right half (each wing hinges on the spine).
  function cloth(ctx,source,w,h,pivot,t,strength,part=0){
    const step=source.height/20,sw=part?source.width/2:source.width,sx=part>0?source.width/2:0;
    for(let n=0;n<20;n++){
      const sy=n*step,v=(sy+step*.5)/source.height,d=v-pivot;
      const spread=1+Math.sin(t*1.65-v*3)*Math.abs(d)*strength;
      const bend=Math.sin(t*1.65-v*3)*d*d*strength*12,dw=part?w*spread/2:w*spread,dx=part<0?-dw+bend:part>0?bend:-dw/2+bend;
      ctx.drawImage(source,sx,sy,sw,Math.min(step+.35,source.height-sy),dx,(v-pivot)*h-h/40,dw,h/20+.08);
    }
  }
  // How each back treasure moves: wings beat from the spine, rings and moons sway and
  // glow, sword arrays hover, fans and talismans breathe.
  const KIND={1:'swords',2:'halo',3:'fan',4:'wings',5:'wings',6:'wings',7:'wings',8:'wings',9:'swords',10:'halo',11:'fan',12:'wings'};
  function shimmer(entry,t,tone){
    const frame=Math.floor(t*30);if(entry.frame===frame)return entry.shine;entry.frame=frame;
    const c=entry.shine.getContext('2d'),w=entry.source.width,h=entry.source.height;
    c.clearRect(0,0,w,h);c.globalCompositeOperation='source-over';c.drawImage(entry.source,0,0);
    c.globalCompositeOperation='source-in';const cy=((t*.19)%1)*h*1.6-h*.3,g=c.createLinearGradient(0,cy-45,w,cy+45);
    g.addColorStop(0,tone+'00');g.addColorStop(.44,tone+'00');g.addColorStop(.51,'#f6fff8');g.addColorStop(.57,tone+'88');g.addColorStop(1,tone+'00');
    c.fillStyle=g;c.fillRect(0,0,w,h);c.globalCompositeOperation='source-over';return entry.shine;
  }
  function drawBack(ctx,image,x,y,dir,facing,bob,time,fit){
    const entry=prepared(image);if(!entry)return;
    const m=mount(image,x,y,dir,facing,bob,fit),still=reduced.matches,t=still?0:time,kind=KIND[m.variant]||'fan',fast=fit?.moving?1.6:1;
    ctx.save();ctx.translate(m.x,m.y);ctx.scale(m.squeeze,1);
    if(dir===1){
      // A back mount can cover the robe and hair below the neck, never the head.
      const hy=fit?-(m.y-fit.top-fit.H*.24):-13,rx=fit?fit.H*.3:7,ry=fit?fit.H*.25:10;ctx.beginPath();ctx.rect(-120,-160,240,280);ctx.moveTo(rx,hy);ctx.ellipse(0,hy,rx,ry,0,0,TAU);ctx.clip('evenodd');
    }
    const strength=still?0:kind==='wings'?.07:.05,shine=shimmer(entry,t,m.tone);
    const layer=(src,part)=>cloth(ctx,src,m.width,m.height,m.mount,t,strength,part);
    const both=part=>{layer(entry.source,part);ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha*=.32;layer(shine,part);ctx.restore();};
    if(kind==='wings'){
      // Each wing turns about the shoulder: tips rise and fall, and the wing
      // foreshortens as it sweeps back, so the pair reads as a real wingbeat.
      const beat=still?0:Math.sin(t*4.4*fast),lift=.15*beat,fold=1-.16*(1-Math.cos(t*4.4*fast))/2;
      for(const side of [-1,1]){ctx.save();ctx.rotate(-side*lift);ctx.scale(fold,1);both(side);ctx.restore();}
      if(!still&&ctx===g&&beat<-.85&&Math.random()<.25)for(const side of [-1,1])PT?.push?.({x:m.x+side*m.width*.4*m.squeeze,y:m.y-m.height*.1,vx:side*rn(4,12),vy:rn(4,14),l:.7,m:.7,c:m.tone,s:rn(.8,1.6)});
    }else if(kind==='halo'){
      // The ring sways slowly behind the shoulders and pulses with light.
      ctx.translate(0,-m.height*.08);ctx.rotate(still?0:Math.sin(t*.9)*.07);ctx.translate(0,m.height*.08);
      both(0);if(!still){ctx.globalCompositeOperation='lighter';ctx.globalAlpha*=.12+.1*Math.sin(t*2.3);cloth(ctx,entry.source,m.width*1.04,m.height*1.04,m.mount,t,0);}
    }else if(kind==='swords'){
      // Flying swords hover and breathe apart a little.
      const hover=still?0:Math.sin(t*2.1)*1.6,spread=still?1:1+Math.sin(t*1.3)*.035;
      ctx.translate(0,hover);ctx.scale(spread,1);both(0);
      if(!still){ctx.globalCompositeOperation='lighter';ctx.globalAlpha*=.14+.12*Math.max(0,Math.sin(t*3.1));cloth(ctx,shine,m.width,m.height,m.mount,t,0);}
    }else{
      // Fans and talismans: a slow breath and a gentle sway.
      const breath=still?1:1+Math.sin(t*1.6)*.03;ctx.rotate(still?0:Math.sin(t*.8)*.045);ctx.scale(breath,breath);both(0);
    }
    ctx.globalCompositeOperation='screen';
    if(!still)for(let n=0;n<6;n++){
      const life=(t*.18+n*.618)%1,side=n%2?1:-1;
      const px=side*m.width*(.22+.2*life)+Math.sin(t+n)*1.3,py=6-life*m.height*.7;
      ctx.fillStyle=m.tone;ctx.globalAlpha=Math.sin(life*Math.PI)*.45;ctx.beginPath();ctx.arc(px,py,.4+.3*(1-life),0,TAU);ctx.fill();
    }
    ctx.restore();
  }
  const shieldTones=['#b697ff','#7ed9ff','#ffb777','#83edca','#ffcf73','#91dfff','#d5b2ff'];
  function drawBuff(ctx,image,x,y,variant,front,time,remaining,duration=equipmentRules.shield.duration){
    const entry=prepared(image);if(!entry||remaining<=0)return;
    const t=reduced.matches?0:time,tone=shieldTones[(variant-1)%7],opacity=smooth((duration-remaining)/.32)*smooth(remaining/1.2);
    if(opacity<=0)return;
    ctx.save();ctx.translate(x,y-24);ctx.scale(.82+.18*smooth((duration-remaining)/.32),1);
    // The rear shell surrounds the actor; only the lower rim passes in front.
    if(front){ctx.beginPath();ctx.rect(-60,4,120,60);ctx.clip();}
    ctx.globalAlpha=opacity*(front?.4:.72);
    cloth(ctx,entry.source,82,90,.53,t*.65,reduced.matches?0:.028);
    ctx.globalCompositeOperation='screen';ctx.globalAlpha=opacity*(front?.36:.3);
    cloth(ctx,shimmer(entry,t,tone),82,90,.53,t*.65,reduced.matches?0:.028);
    ctx.globalCompositeOperation='lighter';ctx.strokeStyle=tone;ctx.lineCap='round';
    // Moving latitude bands follow a sphere rather than sliding a flat picture.
    for(let n=0;n<3;n++){
      const p=(t*.18+n/3)%1,latitude=-Math.PI/2+p*Math.PI,r=35*Math.cos(latitude),cy=Math.sin(latitude)*43;
      ctx.globalAlpha=opacity*Math.sin(p*Math.PI)*(front?.66:.58);ctx.lineWidth=1.05;
      ctx.beginPath();ctx.ellipse(0,cy,Math.max(.1,r),Math.max(.1,r*.22),0,front?0:Math.PI,front?Math.PI:TAU);ctx.stroke();
    }
    if(!front)for(let n=0;n<8;n++){
      const p=(t*.14+n*.618)%1,a=n*2.4+t*.3,px=Math.cos(a)*33,py=39-p*78;
      ctx.globalAlpha=Math.sin(p*Math.PI)*opacity*.8;ctx.fillStyle=tone;
      ctx.beginPath();ctx.arc(px,py,.6,0,TAU);ctx.fill();
    }
    ctx.restore();
  }
  window.equipmentMotion={drawBack,drawBuff,mount,profile};
})();
