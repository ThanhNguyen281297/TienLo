/* Continuous scene animation: flowing cliff water, wind, cloth, portal interiors
   and weather with world anchors. All animation uses the simulation clock. */
(function(){
 const world=worldMap,TAU=Math.PI*2,reduced=matchMedia('(prefers-reduced-motion: reduce)'),rivers=new WeakMap(),highlights=new WeakMap();
 const profiles={
  hub:{kind:'petal',color:'#f5cfb7',wind:1,count:42,mist:'#dfbfa1',sky:'#ffe1ad'},
  sword:{kind:'leaf',color:'#b1e5c8',wind:1.3,count:30,mist:'#9edbd3',sky:'#b6f3df'},
  moon:{kind:'petal',color:'#facbeb',wind:.85,count:38,mist:'#bcbce8',sky:'#d9d2ff'},
  thunder:{kind:'snow',color:'#caecff',wind:1.6,count:42,mist:'#98bfec',sky:'#b3d8ff'},
  mystic:{kind:'leaf',color:'#d7e9a3',wind:.8,count:34,mist:'#a0d3b4',sky:'#d8efb7'},
  valley:{kind:'leaf',color:'#b0e1a3',wind:1.1,count:38,mist:'#9bcab2',sky:'#c6e8bd'},
  arena:{kind:'ember',color:'#ffc991',wind:.65,count:28,mist:'#d7ad90',sky:'#ffd4a6'},
  worldboss:{kind:'ash',color:'#d8b1a0',wind:1.2,count:32,mist:'#b896ab',sky:'#dca29f'}
 };
 const clock=()=>world.living.clock(),profile=()=>profiles[world.state.scene]||profiles.sword;
 const ready=image=>image?.complete&&image.naturalWidth>0;
 const fract=n=>n-Math.floor(n),seed=n=>fract(Math.sin(n*127.1+311.7)*43758.5453);
 const visible=(zone,cx,cy,vw,vh,pad=70)=>zone.x+zone.rx+pad>cx&&zone.x-zone.rx-pad<cx+vw&&zone.y+zone.ry+pad>cy&&zone.y-zone.ry-pad<cy+vh;
 const time=t=>reduced.matches?0:t;
 function wind(t,phase=0){return Math.sin(t*.7+phase)*.65+Math.sin(t*1.37+phase*.7)*.25;}
 function placement(key,image,x,y,width,height){
  const meta=world.mapThemes.metadata.get(key),map=spriteCatalog.maps.find(m=>m.id===key),w=meta?Math.min(width,meta.width):width,h=height||w*image.naturalHeight/image.naturalWidth;
  const bottom=meta?image.naturalHeight*(1-meta.padding/meta.height):(map?.bounds?map.bounds[3]/map.height*image.naturalHeight:image.naturalHeight);
  return {x:x-w/2,y:y-bottom*h/image.naturalHeight,w,h};
 }
 // The cloth starts below its support. Pole, roof and foot never move.
 function drawClothProp(ctx,key,x,y,w,height,alpha=1){
  if(key!=='lantern')return false;const image=world.asset(key);if(!ready(image))return false;
  const p=placement(key,image,x,y,w,height),sw=image.naturalWidth,sh=image.naturalHeight,t=clock(),scale=p.w/sw;
  const left=sw*.08,right=sw*.57,top=sh*.39,bottom=sh*.73;
  ctx.save();ctx.globalAlpha*=alpha;ctx.beginPath();ctx.rect(p.x,p.y,p.w,p.h);ctx.rect(p.x+left*scale,p.y+top*p.h/sh,(right-left)*scale,(bottom-top)*p.h/sh);ctx.clip('evenodd');renderArtwork(ctx,image,p.x,p.y,p.w,p.h);ctx.restore();
  ctx.save();ctx.globalAlpha*=alpha;
  for(let n=0;n<14;n++){const v=n/14,sy=top+(bottom-top)*v,span=(bottom-top)/14+.2,offset=wind(t-v*.8,x*.03)*w*.065*Math.sin(v*Math.PI/2);
   ctx.drawImage(image,left,sy,right-left,span,p.x+left*scale+offset,p.y+sy*p.h/sh,(right-left)*scale,span*p.h/sh);}
  ctx.restore();world.living.flame(ctx,x-w*.25,y-p.h*.56,x*.1,t,.9);return true;
 }
 function glowBand(image,t,color){
  if(!highlights.has(image)){const c=document.createElement('canvas');c.height=256;c.width=Math.max(1,Math.round(256*image.naturalWidth/image.naturalHeight));highlights.set(image,{canvas:c,frame:-1});}
  const entry=highlights.get(image),frame=Math.floor(t*24);if(frame===entry.frame&&entry.color===color)return entry.canvas;entry.frame=frame;entry.color=color;
  const c=entry.canvas,g=c.getContext('2d'),y=(t*.28%1)*c.height*1.5-c.height*.25;
  g.clearRect(0,0,c.width,c.height);g.globalCompositeOperation='source-over';g.drawImage(image,0,0,c.width,c.height);g.globalCompositeOperation='source-in';
  const gradient=g.createLinearGradient(0,y-28,c.width,y+28);gradient.addColorStop(0,color+'00');gradient.addColorStop(.43,color+'00');gradient.addColorStop(.5,'#f0ffff');gradient.addColorStop(.58,color+'00');gradient.addColorStop(1,color+'00');g.fillStyle=gradient;g.fillRect(0,0,c.width,c.height);g.globalCompositeOperation='source-over';return c;
 }
 function decorateProp(ctx,key,x,y,w,height,alpha){
  const t=clock(),p=profile(),image=world.asset(key);if(!ready(image))return;
  const box=placement(key,image,x,y,w,height);
  if(['lotusPond','pond','hubWell'].includes(key)){
   ctx.save();ctx.beginPath();ctx.ellipse(x,y-box.h*.25,w*.3,box.h*.14,0,0,TAU);ctx.clip();ctx.lineWidth=.4;ctx.strokeStyle='#e4fbf7';ctx.globalAlpha=alpha*.3;
   for(let n=0;n<5;n++){ctx.beginPath();for(let i=0;i<=20;i++){const u=i/20,px=x+(u-.5)*w*.8,py=y-box.h*.36+n*box.h*.06+Math.sin(u*13-t*1.8+n*2)*box.h*.035;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.stroke();}ctx.restore();
  }
  if(key==='portal'){
   const spiral=world.mapThemes.load('theme-11-061');if(!ready(spiral))return;
   ctx.save();ctx.translate(x,y-box.h*.415);ctx.scale(w*.155,box.h*.245);ctx.beginPath();ctx.arc(0,0,1,0,TAU);ctx.clip();ctx.rotate(t*.7);ctx.globalCompositeOperation='screen';ctx.globalAlpha=alpha*.7;
   ctx.drawImage(spiral,-1.3,-1.3,2.6,2.6);ctx.rotate(-t*1.05);ctx.globalAlpha=alpha*.3;ctx.drawImage(spiral,-.9,-.9,1.8,1.8);ctx.restore();
  }
  if(key==='crystalPillar'||key==='thunderAltar'||key==='statue'||/^theme-(10|11|14)-0(09|12|18|28)$/.test(key)){
   ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=alpha*.65;ctx.drawImage(glowBand(image,t,p.sky),box.x,box.y,box.w,box.h);ctx.restore();
   if(world.state.scene==='thunder'){
    ctx.save();ctx.strokeStyle='#ccefff';ctx.lineWidth=.55;ctx.globalAlpha=alpha*(.32+.18*Math.sin(t*4));
    for(let n=0;n<2;n++){ctx.beginPath();for(let i=0;i<=12;i++){const v=i/12,px=x+Math.sin(v*18-t*4+n*3)*w*.09*Math.sin(v*Math.PI),py=box.y+box.h*(.22+v*.65);i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.stroke();}ctx.restore();
   }
  }
 }
 // Source polygons follow only water in the existing 1536x1024 island PNG.
 // The rock, masonry and walkable deck are left in their original positions.
 const streams=[
  {box:[328,508,105,438],path:[[352,520],[393,531],[410,670],[422,851],[394,933],[360,913],[337,810],[336,650]]},
  {box:[1100,514,125,440],path:[[1115,525],[1173,539],[1205,657],[1213,823],[1160,945],[1126,895],[1132,731],[1121,602]]},
  {box:[861,640,43,301],path:[[880,649],[896,649],[894,804],[882,928],[867,918],[872,797]]}
 ];
 function texture(){
  const c=document.createElement('canvas');c.width=80;c.height=256;const g=c.getContext('2d');
  const wash=g.createLinearGradient(0,0,80,0);wash.addColorStop(0,'#58bcd633');wash.addColorStop(.5,'#e0ffff77');wash.addColorStop(1,'#7bd6e944');g.fillStyle=wash;g.fillRect(0,0,80,256);
  for(let n=0;n<36;n++){
   const x=seed(n)*80,a=seed(n+50)*TAU;g.strokeStyle=n%3?'rgba(219,255,255,.42)':'rgba(70,164,200,.4)';g.lineWidth=.5+seed(n+3)*1.7;g.beginPath();
   for(let y=0;y<=256;y+=4){const px=x+Math.sin(y/256*TAU+a)*2+Math.sin(y/256*TAU*3+a)*.6;y?g.lineTo(px,y):g.moveTo(px,y);}g.stroke();
  }
  for(let n=0;n<35;n++){const x=seed(n+84)*80,y=seed(n+105)*256;g.fillStyle='rgba(239,255,255,.48)';g.beginPath();g.ellipse(x,y,.5+seed(n+30),1+seed(n+42)*4,0,0,TAU);g.fill();}
  return c;
 }
 let waterTexture;
 function riverCache(image){
  if(rivers.has(image))return rivers.get(image);waterTexture??=texture();
  const entries=streams.map(({box,path})=>{
   const [x,y,w,h]=box,c=document.createElement('canvas'),mask=document.createElement('canvas');c.width=mask.width=w;c.height=mask.height=h;
   const m=mask.getContext('2d');m.drawImage(image,-x,-y);m.globalCompositeOperation='destination-in';m.beginPath();path.forEach(([px,py],i)=>i?m.lineTo(px-x,py-y):m.moveTo(px-x,py-y));m.closePath();m.fill();
   const g=c.getContext('2d');return{box,mask,canvas:c,ctx:g,pattern:g.createPattern(waterTexture,'repeat'),frame:-1};
  });rivers.set(image,entries);return entries;
 }
 function drawCliff(ctx,image,shape){
  if(!ready(image))return;const t=clock(),sx=shape.rx/625,sy=shape.ry/272,left=shape.x-768*sx,top=shape.y-355*sy;
  const cull=shape.view||{...gameCamera(),width:W/Z,height:H/Z};if(left+1536*sx<cull.x||left>cull.x+cull.width||top+1024*sy<cull.y||top>cull.y+cull.height)return;
  ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=.62;
  for(const [n,entry]of riverCache(image).entries()){
   const frame=Math.floor(t*30),[x,y,w,h]=entry.box;
   if(entry.frame!==frame){entry.frame=frame;const g=entry.ctx;g.clearRect(0,0,w,h);g.globalCompositeOperation='source-over';entry.pattern.setTransform(new DOMMatrix().translate(Math.sin(t*.6+n)*2,t*170+n*70));g.fillStyle=entry.pattern;g.fillRect(0,0,w,h);g.globalCompositeOperation='destination-in';g.drawImage(entry.mask,0,0);g.globalCompositeOperation='source-over';}
   ctx.drawImage(entry.canvas,left+x*sx,top+y*sy,w*sx,h*sy);
   for(let k=0;k<8;k++){const p=fract(t*.47+k*.618+n*.2),spread=2+p*9,px=left+(x+w*.52)*sx+Math.sin(k*2.4)*spread*sx,py=top+(y+h-18+p*43)*sy;ctx.globalAlpha=Math.sin(p*Math.PI)*.35;ctx.fillStyle='#c6f5ff';ctx.beginPath();ctx.ellipse(px,py,(.7+p)*sx,(1.2+p*2)*sy,0,0,TAU);ctx.fill();}ctx.globalAlpha=.62;
  }ctx.restore();
 }
 function mote(n,zone,t,settings=profile()){
  t=time(t);const salt=zone.x*.01+zone.y*.013,phase=seed(n+salt)*TAU,u=fract(t*(settings.kind==='ember'?.09:.035)+seed(n+salt+29));
  const rise=settings.kind==='ember',x=zone.x+(seed(n+salt+17)-.5)*zone.rx*1.7+wind(t,phase)*settings.wind*12+(u-.5)*settings.wind*24;
  const groundY=zone.y+(rise?1-u:u)*zone.ry*1.65-zone.ry*.8,height=8+seed(n+salt+71)*26;
  return{x,y:groundY,height,alpha:Math.sin(u*Math.PI)*.72,angle:phase+t*(.4+seed(n)*.4),size:.9+seed(n+11)*1.3,flip:Math.cos(t*2+phase),front:n%3===0};
 }
 function drawMote(ctx,p,settings){
  ctx.save();ctx.translate(p.x,p.y-p.height);ctx.rotate(p.angle);ctx.globalAlpha*=p.alpha;ctx.fillStyle=settings.color;ctx.strokeStyle=settings.color;
  const s=p.size,kind=settings.kind;
  if(kind==='leaf'){ctx.scale(.25+Math.abs(p.flip)*.75,1);ctx.beginPath();ctx.moveTo(0,-s*2);ctx.bezierCurveTo(s*1.4,-s,s*1.5,s,0,s*2);ctx.bezierCurveTo(-s,s,-s*.7,-s,0,-s*2);ctx.fill();ctx.lineWidth=.25;ctx.strokeStyle='#f1f4ce';ctx.beginPath();ctx.moveTo(0,-s*1.5);ctx.lineTo(0,s*1.5);ctx.stroke();}
  else if(kind==='petal'){ctx.scale(.2+Math.abs(p.flip)*.8,1);ctx.beginPath();ctx.moveTo(0,-s*1.7);ctx.bezierCurveTo(s*2,-s*.9,s*1.5,s*.9,0,s*1.3);ctx.bezierCurveTo(-s*1.1,s*.4,-s*1.4,-s,0,-s*1.7);ctx.fill();}
  else if(kind==='snow'){ctx.lineWidth=.4;for(let n=0;n<3;n++){ctx.rotate(Math.PI/3);ctx.beginPath();ctx.moveTo(-s,0);ctx.lineTo(s,0);ctx.stroke();}}
  else{ctx.beginPath();ctx.ellipse(0,0,s*.4,s*(kind==='ember'?1.7:.7),0,0,TAU);ctx.fill();}
  ctx.restore();
 }
 function count(){return Math.round(profile().count*(W/Z<500?.65:1));}
 function drawFireflies(ctx,zone,t){
  if(!['moon','mystic'].includes(world.state.scene))return;
  for(let n=0;n<6;n++){const phase=n*2.399+zone.x*.01,blink=Math.max(0,Math.sin(t*1.9+phase))**2,x=zone.x+Math.sin(phase)*zone.rx*.65+Math.sin(t*.9+phase)*7,y=zone.y+Math.cos(phase)*zone.ry*.6-12+Math.sin(t*1.1+phase)*4;
   world.living.light(ctx,x,y,4.5,'#deef9f',blink*.55);ctx.save();ctx.globalAlpha=blink*.85;ctx.fillStyle='#f1ffd2';ctx.beginPath();ctx.arc(x,y,.6,0,TAU);ctx.fill();ctx.restore();}
 }
 function drawSky(ctx,cx,cy,vw,vh){
  const t=clock(),p=profile();ctx.save();
  // Wide shafts live behind the terrain, so they cannot obscure fights.
  const light=ctx.createLinearGradient(cx+vw*.8,cy,cx+vw*.2,cy+vh);light.addColorStop(0,p.sky+'15');light.addColorStop(1,p.sky+'00');ctx.fillStyle=light;
  for(let n=0;n<3;n++){const x=900+n*240+wind(t*.2,n)*35;ctx.beginPath();ctx.moveTo(x,cy-50);ctx.lineTo(x+15,cy-50);ctx.lineTo(x-180,cy+vh+60);ctx.lineTo(x-270,cy+vh+60);ctx.closePath();ctx.fill();}
  if(!['arena','worldboss'].includes(world.state.scene))for(let n=0;n<5;n++){
   const x=fract(t*.005+n*.191)*2500-250+cx*.06,y=350+n*235+Math.sin(t*.22+n)*12,flap=Math.sin(t*4+n)*2;
   if(x<cx-10||x>cx+vw+10||y<cy-10||y>cy+vh+10)continue;ctx.globalAlpha=.45;ctx.strokeStyle='#c6d6d1';ctx.lineWidth=.7;
   for(let b=0;b<3;b++){ctx.beginPath();const bx=x-b*8,by=y+b*4;ctx.moveTo(bx-3,by-1-flap);ctx.quadraticCurveTo(bx-1,by-2,bx,by);ctx.quadraticCurveTo(bx+1,by-2,bx+3,by-1-flap);ctx.stroke();}
  }ctx.restore();
 }
 function mist(ctx,cx,cy,vw,vh){
  const image=world.layoutArt.modules.cloud;if(!ready(image))return;const t=clock();ctx.save();
  if(world.state.scene!=='hub')for(const zone of world.living.zones()){
   if(!visible(zone,cx,cy,vw,vh,180))continue;
   for(let n=0;n<2;n++){const x=zone.x-zone.rx*.7+n*zone.rx*.65+wind(t*.35,n+zone.x)*15,y=zone.y+zone.ry+32+n*18,w=zone.rx*.95;
    ctx.globalAlpha=.07+n*.02;renderArtwork(ctx,image,x,y,w,w*image.naturalHeight/image.naturalWidth);}
  }
  // A near layer passes the edge of the viewport, preserving the center.
  for(let n=0;n<2;n++){const x=cx+fract(t*.008+n*.53)*(vw+280)-180,y=cy+vh-12+n*15;ctx.globalAlpha=.045;renderArtwork(ctx,image,x,y,250,250*image.naturalHeight/image.naturalWidth);}ctx.restore();
 }
 function drawPortalPad(ctx,service,t){
  const image=world.mapThemes.load('theme-11-059');if(!ready(image))return;const near=Math.hypot(P.x-service.x,P.y-service.y)<62;
  ctx.save();ctx.translate(service.x,service.y);ctx.scale(1,.5);ctx.rotate(t*.23*(service.reverse?-1:1));ctx.globalAlpha=near?.55:.28;ctx.globalCompositeOperation='screen';ctx.drawImage(image,-18,-18,36,36);ctx.restore();
  if(near)for(let n=0;n<5;n++){const p=fract(t*.45+n*.2),a=t*.7+n*TAU/5;ctx.save();ctx.globalAlpha=Math.sin(p*Math.PI)*.65;ctx.fillStyle='#d4fff2';ctx.beginPath();ctx.arc(service.x+Math.cos(a)*13,service.y+Math.sin(a)*6-p*18,.55,0,TAU);ctx.fill();ctx.restore();}
 }
 const ground=world.drawGroundDetails;world.drawGroundDetails=function(ctx,cx,cy,vw,vh){ground(ctx,cx,cy,vw,vh);const settings=profile(),t=clock();
  for(const zone of world.living.zones())if(visible(zone,cx,cy,vw,vh)){
   for(let n=0;n<count();n++){const p=mote(n,zone,t,settings);if(!p.front)drawMote(ctx,p,settings);}drawFireflies(ctx,zone,t);
  }for(const service of world.services)if(service.farmPortal&&service.x>cx-25&&service.x<cx+vw+25&&service.y>cy-25&&service.y<cy+vh+25)drawPortalPad(ctx,service,t);mist(ctx,cx,cy,vw,vh);
 };
 const queue=world.queueActors;world.queueActors=function(items,cx,cy,vw,vh){queue(items,cx,cy,vw,vh);const settings=profile(),t=clock();
  for(const zone of world.living.zones())if(visible(zone,cx,cy,vw,vh))for(let n=0;n<count();n++){const p=mote(n,zone,t,settings);if(p.front)items.push([p.y,()=>drawMote(g,p,settings)]);}
 };
 world.atmosphere={profiles,profile,clock,wind,mote,drawMote,drawCliff,drawSky,drawClothProp,decorateProp,drawPortalPad,count,streams};
})();
