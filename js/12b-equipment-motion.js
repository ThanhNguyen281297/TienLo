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
    if(/\/BuffThuan\//.test(image.src))c.filter='saturate(1.22) contrast(1.05)';
    c.drawImage(image,0,0,source.width,256);c.filter='none';
    const shine=document.createElement('canvas');shine.width=source.width;shine.height=256;
    const entry={source,shine,frame:-1};cache.set(image,entry);return entry;
  }
  function profile(image){const variant=Math.max(1,Math.min(12,Number(/\/(\d+)\.png/.exec(image?.src||'')?.[1])||9));return{variant,height:heights[variant-1],mount:mounts[variant-1],tone:tones[variant-1]};}
  function mount(image,x,y,dir,facing,bob=0){
    const p=profile(image);return{...p,x:x+(dir===2?-facing*8:0),y:y-24-bob,width:p.height*(image.naturalWidth||1)/(image.naturalHeight||1),squeeze:dir===2?.62:1};
  }
  // Adjacent strips share boundaries. The spine stays at x=0, y=0 in every pose.
  function cloth(ctx,source,w,h,pivot,t,strength){
    const step=source.height/20;
    for(let n=0;n<20;n++){
      const sy=n*step,v=(sy+step*.5)/source.height,d=v-pivot;
      const spread=1+Math.sin(t*1.65-v*3)*Math.abs(d)*strength;
      const bend=Math.sin(t*1.65-v*3)*d*d*strength*12;
      ctx.drawImage(source,0,sy,source.width,Math.min(step+.35,source.height-sy),-w*spread/2+bend,(v-pivot)*h-h/40,w*spread,h/20+.08);
    }
  }
  function shimmer(entry,t,tone){
    const frame=Math.floor(t*30);if(entry.frame===frame)return entry.shine;entry.frame=frame;
    const c=entry.shine.getContext('2d'),w=entry.source.width,h=entry.source.height;
    c.clearRect(0,0,w,h);c.globalCompositeOperation='source-over';c.drawImage(entry.source,0,0);
    c.globalCompositeOperation='source-in';const cy=((t*.19)%1)*h*1.6-h*.3,g=c.createLinearGradient(0,cy-45,w,cy+45);
    g.addColorStop(0,tone+'00');g.addColorStop(.44,tone+'00');g.addColorStop(.51,'#f6fff8');g.addColorStop(.57,tone+'88');g.addColorStop(1,tone+'00');
    c.fillStyle=g;c.fillRect(0,0,w,h);c.globalCompositeOperation='source-over';return entry.shine;
  }
  function drawBack(ctx,image,x,y,dir,facing,bob,time){
    const entry=prepared(image);if(!entry)return;
    const m=mount(image,x,y,dir,facing,bob),t=reduced.matches?0:time;
    ctx.save();ctx.translate(m.x,m.y);ctx.scale(m.squeeze,1);
    if(dir===1){
      // A back mount can cover the robe and hair below the neck, never the head.
      ctx.beginPath();ctx.rect(-120,-160,240,280);ctx.moveTo(7,-13);ctx.ellipse(0,-13,7,10,0,0,TAU);ctx.clip('evenodd');
    }
    const strength=reduced.matches?0:([5,6,7,8,12].includes(m.variant)?.12:.055);
    cloth(ctx,entry.source,m.width,m.height,m.mount,t,strength);
    ctx.globalCompositeOperation='screen';ctx.globalAlpha=.32;
    cloth(ctx,shimmer(entry,t,m.tone),m.width,m.height,m.mount,t,strength);
    ctx.globalAlpha=.6;
    if(!reduced.matches)for(let n=0;n<6;n++){
      const life=(t*.18+n*.618)%1,side=n%2?1:-1;
      const px=side*m.width*(.22+.2*life)+Math.sin(t+n)*1.3,py=6-life*m.height*.7;
      ctx.fillStyle=m.tone;ctx.globalAlpha=Math.sin(life*Math.PI)*.45;ctx.beginPath();ctx.arc(px,py,.4+.3*(1-life),0,TAU);ctx.fill();
    }
    ctx.restore();
  }
  const shieldTones=['#b697ff','#7ed9ff','#ffb777','#83edca','#ffcf73','#91dfff','#d5b2ff'];
  function drawBuff(ctx,image,x,y,variant,front,time,remaining,duration=60){
    const entry=prepared(image);if(!entry||remaining<=0)return;
    const t=reduced.matches?0:time,tone=shieldTones[(variant-1)%7],opacity=smooth((duration-remaining)/.32)*smooth(remaining/1.2);
    if(opacity<=0)return;
    ctx.save();ctx.translate(x,y-24);ctx.scale(.82+.18*smooth((duration-remaining)/.32),1);
    // The rear shell surrounds the actor; only the lower rim passes in front.
    if(front){ctx.beginPath();ctx.rect(-60,4,120,60);ctx.clip();}
    ctx.globalAlpha=opacity*(front?.22:.34);
    cloth(ctx,entry.source,82,90,.53,t*.65,reduced.matches?0:.028);
    ctx.globalCompositeOperation='screen';ctx.globalAlpha=opacity*(front?.22:.16);
    cloth(ctx,shimmer(entry,t,tone),82,90,.53,t*.65,reduced.matches?0:.028);
    ctx.globalCompositeOperation='lighter';ctx.strokeStyle=tone;ctx.lineCap='round';
    // Moving latitude bands follow a sphere rather than sliding a flat picture.
    for(let n=0;n<3;n++){
      const p=(t*.18+n/3)%1,latitude=-Math.PI/2+p*Math.PI,r=35*Math.cos(latitude),cy=Math.sin(latitude)*43;
      ctx.globalAlpha=opacity*Math.sin(p*Math.PI)*(front?.38:.3);ctx.lineWidth=.8;
      ctx.beginPath();ctx.ellipse(0,cy,Math.max(.1,r),Math.max(.1,r*.22),0,front?0:Math.PI,front?Math.PI:TAU);ctx.stroke();
    }
    if(!front)for(let n=0;n<8;n++){
      const p=(t*.14+n*.618)%1,a=n*2.4+t*.3,px=Math.cos(a)*33,py=39-p*78;
      ctx.globalAlpha=Math.sin(p*Math.PI)*opacity*.55;ctx.fillStyle=tone;
      ctx.beginPath();ctx.arc(px,py,.6,0,TAU);ctx.fill();
    }
    ctx.restore();
  }
  window.equipmentMotion={drawBack,drawBuff,mount,profile};
})();
