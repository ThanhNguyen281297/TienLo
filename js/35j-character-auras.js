/* Cosmetic footsteps and cultivation aura. Materials are sampled from the user's
   transparent PNGs; individual petals, clouds, shards and feathers move separately. */
(function(){
 const TAU=Math.PI*2,reduced=matchMedia('(prefers-reduced-motion: reduce)'),cache=new Map(),steps=[],walkers=new Map(),MAX_STEPS=72;
 const clock=()=>worldMap.environmentClock||0,clamp=n=>Math.max(0,Math.min(1,n)),ease=n=>{n=clamp(n);return n*n*(3-2*n);};
 const styles=[
  {kind:'lotus',tone:'#d7b7ff',life:1.45,rect:[210,540,850,500]},
  {kind:'cloud',tone:'#d7f5ff',life:1.1,rect:[90,550,810,430]},
  {kind:'lightning',tone:'#ca87ff',life:.7,rect:[60,650,730,415]},
  {kind:'ice',tone:'#a5e5ff',life:1.6,rect:[185,545,850,510]},
  {kind:'feather',tone:'#ffae58',life:1.1,rect:[60,600,780,440]},
  {kind:'stars',tone:'#c2cdff',life:1.3,rect:[230,700,710,445]}
 ];
 function load(src){
  if(cache.has(src))return cache.get(src);const entry={src,ready:false};cache.set(src,entry);const image=new Image();image.src=artworkURL(src);
  image.onload=()=>{const c=document.createElement('canvas');c.width=src.startsWith('Item/CanhGioi/')?1024:512;c.height=Math.round(c.width*image.naturalHeight/image.naturalWidth);const ctx=c.getContext('2d');ctx.imageSmoothingQuality='high';ctx.drawImage(image,0,0,c.width,c.height);entry.canvas=c;
   const trail=equipmentRules.trails.find(t=>t.art===src);if(trail){const r=styles[trail.variant-1].rect,part=document.createElement('canvas');part.width=256;part.height=160;const g=part.getContext('2d');g.imageSmoothingQuality='high';g.drawImage(image,...r,0,0,256,160);g.globalCompositeOperation='destination-in';g.save();g.translate(128,80);g.scale(1,.625);const mask=g.createRadialGradient(0,0,35,0,0,128);mask.addColorStop(0,'#fff');mask.addColorStop(.55,'#fffd');mask.addColorStop(1,'#fff0');g.fillStyle=mask;g.fillRect(-128,-128,256,256);g.restore();entry.material=part;}
   entry.shine=document.createElement('canvas');entry.shine.width=c.width;entry.shine.height=c.height;entry.frame=-1;entry.ready=true;
  };image.onerror=()=>{entry.failed=true;};return entry;
 }
 function trailFor(ap=P.ap){const id=ap===P.ap?P.world?.equip?.dichuyen?.id:ap?.trailId;return equipmentData.byId.get(id)?.slot==='dichuyen'?equipmentData.byId.get(id):null;}
 function realmFor(ap=P.ap){const rank=ap===P.ap?P.r:ap?.realm;return equipmentRules.realmEffects.find(r=>r.realm===rank)||null;}
 function material(ctx,entry,w,h){ctx.drawImage(entry.material,-w/2,-h/2,w,h);}
 function petal(ctx,entry,w,h){ctx.beginPath();ctx.moveTo(0,-h);ctx.bezierCurveTo(w,-h*.55,w*.7,h*.25,0,h*.32);ctx.bezierCurveTo(-w*.7,h*.25,-w,-h*.55,0,-h);ctx.closePath();ctx.clip();ctx.drawImage(entry.material,-w,-h,w*2,h*1.4);}
 function star(ctx,r){ctx.beginPath();for(let n=0;n<8;n++){const a=n*Math.PI/4,rad=n%2?r*.23:r;const x=Math.cos(a)*rad,y=Math.sin(a)*rad;n?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();}
 function renderStep(ctx,step,age){
  const style=styles[step.variant-1],p=age/style.life;if(p<0||p>=1)return;const meta=equipmentRules.trails[step.variant-1],entry=load(meta.art);if(!entry.ready)return;
  const bloom=ease(age/.22),fade=ease((style.life-age)/.6),alpha=Math.min(1,age/.06)*fade,t=reduced.matches?0:age;
  ctx.save();ctx.translate(step.x,step.y);ctx.scale(1,.62);ctx.globalAlpha=alpha*.68;
  if(style.kind==='lotus'){
   for(let ring=0;ring<2;ring++)for(let n=0;n<7;n++){const a=(n+ring*.5)*TAU/7;ctx.save();ctx.rotate(a);ctx.translate(0,-bloom*(ring?1:3));ctx.scale(.35+bloom*.65,.45+bloom*.55);ctx.globalAlpha=alpha*(.84+Math.sin(t*4-n*.8)*.08);const h=ring?6:9,w=ring?2.6:3.6;ctx.beginPath();ctx.moveTo(0,-h);ctx.bezierCurveTo(w,-h*.55,w*.7,h*.25,0,h*.32);ctx.bezierCurveTo(-w*.7,h*.25,-w,-h*.55,0,-h);const light=ctx.createLinearGradient(0,-h,0,h*.32);light.addColorStop(0,'#f6deff');light.addColorStop(.5,ring?'#e5b9f1':'#b39bea');light.addColorStop(1,'#6578b9');ctx.fillStyle=light;ctx.fill();ctx.strokeStyle='#ffe9f8';ctx.lineWidth=.3;ctx.stroke();ctx.globalAlpha*=.45;petal(ctx,entry,w,h);ctx.restore();}
   ctx.fillStyle='#fff4ca';ctx.globalAlpha=alpha*.9;ctx.beginPath();ctx.arc(0,0,1.2*bloom,0,TAU);ctx.fill();
  }else if(style.kind==='cloud'){
   for(let n=0;n<3;n++){ctx.save();ctx.translate((n-1)*(4+t*3),Math.sin(n*2+t*2)*1.2);ctx.rotate(Math.sin(t*2+n)*.08);ctx.globalAlpha=alpha*(n===1?.58:.34);material(ctx,entry,22+t*9,15+t*6);ctx.restore();}
  }else if(style.kind==='lightning'){
   material(ctx,entry,25*(.6+bloom*.4),18);ctx.strokeStyle=style.tone;ctx.lineWidth=.7;ctx.globalCompositeOperation='screen';
   for(let n=0;n<4;n++){const a=n*TAU/4+step.seed;ctx.beginPath();ctx.globalAlpha=alpha*(.45+.4*Math.sin(t*18+n)**2);for(let j=0;j<6;j++){const r=2+j*2*bloom,bend=Math.sin(j*3+t*16+n)*1.6;const x=Math.cos(a)*r-Math.sin(a)*bend,y=Math.sin(a)*r+Math.cos(a)*bend;j?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();}
  }else if(style.kind==='ice'){
   ctx.globalAlpha=alpha*.5;material(ctx,entry,28*bloom,21*bloom);ctx.strokeStyle='#e0faff';ctx.lineWidth=.55;ctx.globalAlpha=alpha*.7;
   for(let n=0;n<6;n++){ctx.save();ctx.rotate(n*TAU/6);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-11*bloom);ctx.moveTo(0,-6*bloom);ctx.lineTo(-2.7,-8.3*bloom);ctx.moveTo(0,-6*bloom);ctx.lineTo(2.7,-8.3*bloom);ctx.stroke();ctx.restore();}
   ctx.fillStyle='#eaffff';for(let n=0;n<3;n++){const a=n*2.4+step.seed;ctx.globalAlpha=alpha*Math.max(0,Math.sin(t*6-n*2))*.7;ctx.save();ctx.translate(Math.cos(a)*8*bloom,Math.sin(a)*8*bloom);star(ctx,.8);ctx.fill();ctx.restore();}
  }else if(style.kind==='feather'){
   ctx.save();ctx.rotate(step.angle+Math.sin(t*3)*.12);ctx.translate(t*2,-t*2);ctx.globalAlpha=alpha*.86;ctx.save();petal(ctx,entry,4,14);ctx.restore();ctx.strokeStyle='#ffe5a9';ctx.lineWidth=.45;ctx.beginPath();ctx.moveTo(0,4);ctx.quadraticCurveTo(1,-5,0,-13);for(let n=0;n<5;n++){const y=-9+n*2;ctx.moveTo(0,y+2);ctx.lineTo(2.8,y);ctx.moveTo(0,y+2);ctx.lineTo(-2.8,y);}ctx.stroke();ctx.restore();
   ctx.fillStyle='#ffe3a0';for(let n=0;n<5;n++){const a=n*2.4+step.seed;ctx.globalAlpha=alpha*(1-p)*.8;ctx.beginPath();ctx.ellipse(Math.cos(a)*(2+t*8),Math.sin(a)*4-t*10,.5,.9,0,0,TAU);ctx.fill();}
  }else{
   for(let n=0;n<5;n++){const delay=n*.04,q=clamp((age-delay)/.25);if(!q)continue;const a=n*2.4+step.seed;ctx.save();ctx.translate(Math.cos(a)*(3+t*6),Math.sin(a)*(3+t*4));ctx.rotate(t*.4+a);ctx.globalAlpha=alpha*Math.sin(q*Math.PI*.7)*.8;const radius=(n?2.5:4)*ease(q);star(ctx,radius);ctx.clip();material(ctx,entry,radius*2.2,radius*2.2);ctx.restore();}
  }
  ctx.restore();
 }
 function clearOwner(owner){for(let n=steps.length-1;n>=0;n--)if(steps[n].owner===owner)steps.splice(n,1);walkers.delete(owner);}
 let serial=0,scene=worldMap.state.scene;
 function walk(owner,x,y,meta,allowed=true){
  const previous=walkers.get(owner),id=meta?.id||null;if(!previous||previous.id!==id){clearOwner(owner);walkers.set(owner,{x,y,id,distance:0,foot:1});return;}
  const dx=x-previous.x,dy=y-previous.y,d=Math.hypot(dx,dy),angle=Math.atan2(dy,dx),start={x:previous.x,y:previous.y};previous.x=x;previous.y=y;
  if(!meta||!allowed||d>45||d<.001){if(!allowed||d>45)previous.distance=0;return;}
  let offset=11-previous.distance;for(;offset<=d;offset+=11){previous.foot*=-1;steps.push({owner,variant:meta.variant,x:start.x+dx*offset/d-Math.sin(angle)*previous.foot*2.1,y:start.y+dy*offset/d+Math.cos(angle)*previous.foot*2.1,angle,born:clock(),seed:++serial*2.399963});}
  previous.distance=(previous.distance+d)%11;if(steps.length>MAX_STEPS)steps.splice(0,steps.length-MAX_STEPS);
 }
 function reset(){steps.length=0;walkers.clear();scene=worldMap.state.scene;}
 const update=up;up=function(dt){update(dt);if(paused()||worldMap.dialog.isOpen()||!P.ap)return;if(scene!==worldMap.state.scene)reset();
  const meta=trailFor();if(meta)load(meta.art);walk('local',P.x,P.y,meta,P.hp>0&&!P.med&&!classCombat.isDashing());
  for(let n=steps.length-1;n>=0;n--)if(clock()-steps[n].born>=styles[steps[n].variant-1].life)steps.splice(n,1);
 };
 const queue=worldMap.queueActors;worldMap.queueActors=function(items,...args){queue(items,...args);if(paused()||worldMap.dialog.isOpen()||!P.ap)return;const active=new Set(['local']);
  for(const peer of onlineWorld.state.players){const owner='peer:'+peer.id;active.add(owner);walk(owner,peer.drawX,peer.drawY,trailFor(peer.ap),!peer.med&&peer.hp>0&&peer.drawLift<1);}
  for(const owner of walkers.keys())if(!active.has(owner))clearOwner(owner);
 };
 const ground=worldMap.drawGroundDetails;worldMap.drawGroundDetails=function(ctx,cx,cy,vw,vh){ground(ctx,cx,cy,vw,vh);for(const step of steps)if(step.x>cx-28&&step.x<cx+vw+28&&step.y>cy-28&&step.y<cy+vh+28)renderStep(ctx,step,clock()-step.born);};
 function shine(entry,t){const frame=Math.floor(t*30);if(entry.frame===frame)return entry.shine;entry.frame=frame;const g=entry.shine.getContext('2d'),c=entry.canvas,w=c.width,h=c.height;
  g.clearRect(0,0,w,h);g.globalCompositeOperation='source-over';g.drawImage(c,0,0);g.globalCompositeOperation='source-in';const y=(t*.14%1)*h*1.5-h*.25,gradient=g.createLinearGradient(0,y-35,w,y+35);gradient.addColorStop(0,'#d1edff00');gradient.addColorStop(.43,'#d1edff00');gradient.addColorStop(.5,'#effaff');gradient.addColorStop(.58,'#d1edff00');gradient.addColorStop(1,'#d1edff00');g.fillStyle=gradient;g.fillRect(0,0,w,h);g.globalCompositeOperation='source-over';return entry.shine;
 }
 function realmSize(meta){const w=83+(meta.realm-3)*2.5;return{w,h:w*.86};}
 function drawRealm(ctx,x,y,meta,front=false){
  if(!meta)return;const entry=load(meta.art);if(!entry.ready)return;const t=reduced.matches?0:clock(),{w,h}=realmSize(meta),left=x-w/2,top=y-h*.87;
  ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';if(front){ctx.beginPath();ctx.rect(x-w/2,y-3,w,h*.2);ctx.clip();}
  // Keep the original color/detail opaque enough to read; light passes over the
  // source silhouette instead of bleaching the whole aura with additive bloom.
  ctx.globalAlpha=front?.46:.84;ctx.drawImage(entry.canvas,left,top,w,h);ctx.globalCompositeOperation='screen';ctx.globalAlpha=front?.4:.55;ctx.drawImage(shine(entry,t),left,top,w,h);
  if(!front){for(let n=0;n<9;n++){const p=(t*.14+n*.618)%1,a=n*2.4+t*.2;ctx.globalAlpha=Math.sin(p*Math.PI)*.56;ctx.fillStyle=meta.realm>=10?'#ffe6ac':'#bceaff';ctx.beginPath();ctx.arc(x+Math.cos(a)*w*(.2+p*.18),y-p*h*.82,.45+(1-p)*.35,0,TAU);ctx.fill();}}
  ctx.restore();
 }
 const draw=drawChar;drawChar=function(ctx,x,y,dir,facing,moving,phase,attacking,ap,...rest){
  const realm=realmFor(ap),trail=trailFor(ap);drawRealm(ctx,x,y,realm,false);
  if(ctx!==g&&trail)renderStep(ctx,{variant:trail.variant,x,y:y+1,angle:0,seed:0},reduced.matches?.4:.25+(Math.sin(clock()*2)+1)*.15);
  draw(ctx,x,y,dir,facing,moving,phase,attacking,ap,...rest);drawRealm(ctx,x,y,realm,true);
 };
 const height=characterNameHeight;characterNameHeight=ap=>Math.max(height(ap),realmFor(ap)?Math.ceil(realmSize(realmFor(ap)).h*.87+8):0);
 const respawn=classCombat.onRespawn;classCombat.onRespawn=function(...args){reset();return respawn(...args);};
 window.characterAuras={steps,styles,load,trailFor,realmFor,renderStep,drawRealm,walk,reset,MAX_STEPS,hasTrail:()=>!!trailFor()};
})();
