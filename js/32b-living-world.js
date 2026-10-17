/* Anchored environmental animation. Buildings and collision geometry stay fixed;
   foliage, water, flame and airborne particles move on separate depth layers. */
(function(){
 const world=worldMap,TAU=Math.PI*2,reduced=matchMedia('(prefers-reduced-motion: reduce)'),lights=new Map();
 const plants=new Set(['pineTree','whiteBlossom','sakura','tree','tree2','theme-14-055','theme-14-036','theme-10-015','theme-14-056']);
 const originalSprite=world.sprite,mapMeta=new Map(spriteCatalog.maps.map(m=>[m.id,m]));
 const clock=()=>reduced.matches?0:world.environmentClock||0;
 const tones={hub:'#ffda9c',sword:'#a5e9d3',moon:'#f1c5eb',thunder:'#a8d6ff',mystic:'#b7e99f',valley:'#b2e8bc',arena:'#ffbd89',worldboss:'#ed9f91'};
 const ready=image=>image?.complete&&image.naturalWidth>0;
 function light(ctx,x,y,r,color,opacity){
  if(!lights.has(color)){const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),a=g.createRadialGradient(32,32,0,32,32,32);a.addColorStop(0,color);a.addColorStop(.22,color+'a0');a.addColorStop(1,color+'00');g.fillStyle=a;g.fillRect(0,0,64,64);lights.set(color,c);}
  ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha*=opacity;ctx.drawImage(lights.get(color),x-r,y-r,r*2,r*2);ctx.restore();
 }
 function foliage(ctx,key,x,y,w,height,alpha){
  const image=world.asset(key);if(!ready(image))return false;
  const meta=world.mapThemes.metadata.get(key),width=meta?Math.min(w,meta.width):w,h=height||width*image.naturalHeight/image.naturalWidth;
  const bottom=meta?image.naturalHeight-meta.padding:(mapMeta.get(key)?.bounds?.[3]||image.naturalHeight),top=y-bottom*h/image.naturalHeight,t=clock(),phase=x*.017+y*.013;
  ctx.save();ctx.globalAlpha*=alpha;ctx.imageSmoothingQuality='high';
  for(let n=0;n<16;n++){
   const v=n/16,sourceY=n*image.naturalHeight/16,sourceH=Math.min(image.naturalHeight/16+.3,image.naturalHeight-sourceY);
   const canopy=Math.max(0,1-v/.8),gust=Math.sin(t*1.15+phase-v*2)*.7+Math.sin(t*1.8+phase*.6-v)*.3,bend=gust*width*.04*canopy**2,spread=1+Math.sin(t*.9+phase-v)*.014*canopy;
   ctx.drawImage(image,0,sourceY,image.naturalWidth,sourceH,x-width*spread/2+bend,top+v*h,width*spread,sourceH/image.naturalHeight*h);
  }ctx.restore();return true;
 }
 function water(ctx,x,y,w,h,t){
  ctx.save();ctx.beginPath();ctx.ellipse(x,y-h*.25,w*.35,h*.18,0,0,TAU);ctx.clip();ctx.strokeStyle='#d7f4ec';ctx.lineWidth=.42;
  for(let n=0;n<4;n++){const p=(t*.17+n*.25)%1;ctx.globalAlpha=Math.sin(p*Math.PI)*.42;ctx.beginPath();ctx.ellipse(x+Math.sin(n*4)*w*.16,y-h*.25+Math.cos(n*3)*h*.06,w*(.04+p*.23),h*(.012+p*.09),0,0,TAU);ctx.stroke();}ctx.restore();
 }
 function flame(ctx,x,y,phase,t,size=1){
  const pulse=.85+Math.sin(t*8+phase)*.09+Math.sin(t*13+phase*2)*.06;
  light(ctx,x,y,12*size,'#ffc174',.38*pulse);
  ctx.save();ctx.translate(x,y);ctx.scale(size,size);ctx.globalAlpha=.82;ctx.fillStyle='#ffc777';ctx.beginPath();ctx.moveTo(-1.4,1);ctx.quadraticCurveTo(-2,-2,Math.sin(t*6+phase)*.8,-5*pulse);ctx.quadraticCurveTo(2,-2,1.4,1);ctx.fill();ctx.fillStyle='#fff1ba';ctx.fillRect(-.6,-1,.9,2);ctx.restore();
 }
 world.sprite=function(ctx,key,x,y,w,height,alpha=1){
  if(world.atmosphere?.drawClothProp(ctx,key,x,y,w,height,alpha))return;
  if(plants.has(key)&&foliage(ctx,key,x,y,w,height,alpha))return;
  const result=originalSprite(ctx,key,x,y,w,height,alpha),b=world.spriteBounds(key,x,y,w,height);if(!b)return result;
  const h=b.bottom-b.top,t=clock();ctx.save();ctx.globalAlpha*=alpha;
  if(['lotusPond','pond','hubWell'].includes(key))water(ctx,x,y,w,h,t);
  if(key==='lantern')flame(ctx,x,y-h*.63,x*.1,t,.85);
  if(key==='forge'){
   flame(ctx,x+w*.13,y-h*.15,x,t,1.3);
   for(let n=0;n<5;n++){const p=(t*.13+n*.2)%1;ctx.globalAlpha=alpha*Math.sin(p*Math.PI)*.08;ctx.fillStyle='#b9b8b0';ctx.beginPath();ctx.ellipse(x+w*.13+Math.sin(t*.6+n)*p*7,y-h*.2-p*30,1+p*4,2+p*5,0,0,TAU);ctx.fill();}
  }
  if(key==='portal'||key==='crystalPillar'||key==='thunderAltar'||/^theme-(10|11|14)-0(09|12|18|28)$/.test(key)){
   const color=tones[world.state.scene]||'#a7e7dc';light(ctx,x,y-h*.48,Math.min(25,w*.48),color,.22+.08*Math.sin(t*2+x));
   for(let n=0;n<5;n++){const p=(t*.22+n*.2)%1;ctx.globalAlpha=alpha*Math.sin(p*Math.PI)*.65;ctx.fillStyle=color;ctx.beginPath();ctx.arc(x+Math.sin(n*2+t)*w*.17,y-h*.18-p*h*.7,.55,0,TAU);ctx.fill();}
  }world.atmosphere?.decorateProp(ctx,key,x,y,w,height,alpha);ctx.restore();return result;
 };
 function zones(){
  const scene=world.state.scene;if(scene==='hub'){const c=world.city;return[{x:1000,y:1080,rx:(c.right-c.left)/2,ry:(c.bottom-c.top)/2}];}
  const main=world.sectLayouts[scene];if(!main)return[{x:1000,y:1100,rx:200,ry:100}];
  const size=scene==='valley'?farmLayout.valley:farmLayout.camp;
  return [{x:1000,y:1100,rx:main.rx,ry:main.ry},...(scene==='valley'?world.valleyMines:world.farmCamps).map(c=>({...c,rx:size.rx,ry:size.ry}))];
 }
 function particle(n,zone,t){
  const p=(t*(.024+(n%3)*.004)+n*.6180339)%1,phase=n*2.399963;
  return {x:zone.x+Math.sin(phase)*zone.rx*.75+(p-.5)*30+Math.sin(t*.55+phase)*5,y:zone.y+Math.cos(phase)*zone.ry*.7-p*25,height:8+(n%4)*7,alpha:Math.sin(p*Math.PI)*.58,angle:phase+t*.5,front:n%3===0};
 }
 function particles(ctx,cx,cy,vw,vh,front=false){
  const t=clock(),scene=world.state.scene,color=tones[scene]||'#b4e8d1';ctx.save();
  for(const zone of zones()){
   if(zone.x+zone.rx<cx||zone.x-zone.rx>cx+vw||zone.y+zone.ry<cy||zone.y-zone.ry>cy+vh)continue;
   for(let n=0;n<14;n++){const p=particle(n,zone,t);if(p.front!==front)continue;ctx.save();ctx.translate(p.x,p.y-p.height);ctx.rotate(p.angle);ctx.globalAlpha=p.alpha;ctx.fillStyle=color;
    if(['moon','mystic','hub'].includes(scene)){ctx.beginPath();ctx.ellipse(0,0,1.6,.65,0,0,TAU);ctx.fill();}
    else{ctx.fillRect(-.45,-.7,.9,1.4);}ctx.restore();}
  }ctx.restore();
 }
 const ground=world.drawGroundDetails;world.drawGroundDetails=function(ctx,cx,cy,vw,vh){
  ground(ctx,cx,cy,vw,vh);if(!world.atmosphere)particles(ctx,cx,cy,vw,vh,false);
  if(world.state.scene==='hub'&&!world.atmosphere)for(const x of [650,1350])for(const y of [710,875,1045,1220,1390])if(x>cx-25&&x<cx+vw+25&&y>cy&&y<cy+vh+40)flame(ctx,x,y-30,x+y,clock(),.9);
 };
 const queue=world.queueActors;world.queueActors=function(items,cx,cy,vw,vh){
  queue(items,cx,cy,vw,vh);if(world.atmosphere)return;const t=clock();
  for(const zone of zones())if(zone.x+zone.rx>cx&&zone.x-zone.rx<cx+vw&&zone.y+zone.ry>cy&&zone.y-zone.ry<cy+vh){
   for(let n=0;n<14;n++){const p=particle(n,zone,t);if(!p.front)continue;items.push([p.y,()=>{g.save();g.translate(p.x,p.y-p.height);g.rotate(p.angle);g.globalAlpha=p.alpha*.85;g.fillStyle=tones[world.state.scene]||'#b4e8d1';g.beginPath();g.ellipse(0,0,1.6,.65,0,0,TAU);g.fill();g.restore();}]);}
  }
 };
 const draw=dr;dr=function(){draw();if(paused()||!P.ap||world.atmosphere)return;
  const image=world.layoutArt.modules.cloud;if(!ready(image))return;const c=gameCamera(),t=clock();g.save();g.setTransform(Z,0,0,Z,-c.x*Z,-c.y*Z);
  // A sparse near layer crosses the bottom edge; it never washes over combat.
  for(let n=0;n<2;n++){const x=c.x+((n*313+t*2.8)%(W/Z+240))-120,y=c.y+H/Z-8+n*16;g.globalAlpha=.065;renderArtwork(g,image,x,y,200,200*image.naturalHeight/image.naturalWidth);}g.restore();
 };
 world.living={clock,zones,particle,foliage,water,flame,light};
})();
