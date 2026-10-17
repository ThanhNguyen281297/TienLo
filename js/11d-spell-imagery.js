/* Illustrated spell subjects have their own deformation and flight. The same
   complete sprite stays alive throughout a cast, without pose-image dissolves. */
(function(){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),subjects=[],fields=[],folders=['Kiem','Liem','Thuong','Quat'];
 const atlas=new Image(),bounds=[[92,58,536,562],[86,93,558,575],[91,50,558,556],[95,65,551,555]];
 const smooth=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);};
 atlas.onload=()=>{
  const w=atlas.naturalWidth/2,h=atlas.naturalHeight/2;
  for(let n=0;n<4;n++){
   const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(atlas,(n%2)*w,Math.floor(n/2)*h,w,h,0,0,w,h);
   subjects[n]={image:c,bounds:bounds[n]};
  }
 };atlas.src=artworkURL('Skill/VFX/class-spirit-actors-v2.png');
 for(let n=0;n<4;n++){
  const meta=skillSpriteManifest[folders[n]][skillSprites.names[n][2]][2],image=new Image();image.src=artworkURL(meta.src);fields[n]={image,bounds:meta.bounds};
 }
 function draw(ctx,sect,x,y,width,height,age,alpha=1,rotation=0,kind='subject'){
  const asset=kind==='field'?fields[sect]:subjects[sect],source=asset?.image;
  if(!source||(source instanceof HTMLImageElement&&(!source.complete||!source.naturalWidth)))return false;
  const [l,t,r,b]=asset.bounds,fit=Math.min(width/(r-l),height/(b-t)),sw=source.naturalWidth||source.width,sh=source.naturalHeight||source.height;
  const w=sw*fit,h=sh*fit,clock=reduced.matches?0:age;
  ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.globalAlpha*=Math.max(0,Math.min(1,alpha));ctx.globalCompositeOperation='source-over';
  ctx.translate(-(l+r)*fit/2,-(t+b)*fit/2);
  if(kind==='field')renderArtwork(ctx,source,0,0,w,h);
  else if(sect===3){
   // Both wings hinge around the chest. The feather tips lift more than the root.
   const step=sw/24;
   for(let n=0;n<24;n++){
    const lift=u=>{const d=Math.abs(u-.5)*2;return reduced.matches?0:Math.sin(clock*5.8-d*.7)*d*d*height*.055;};
    const left=lift(n/24),right=lift((n+1)/24);
    ctx.save();ctx.transform(1,(right-left)/(w/24),0,1,n*step*fit,left);
    ctx.drawImage(source,n*step,0,Math.min(step+.3,sw-n*step),sh,0,0,w/24+.08,h);ctx.restore();
   }
  }else{
   const step=sh/24;
   for(let n=0;n<24;n++){
    const wind=v=>reduced.matches?0:Math.sin(clock*(sect===2?4.2:2.3)-v*5)*Math.sin(v*Math.PI)*width*(sect===2?.035:.012);
    const top=wind(n/24),bottom=wind((n+1)/24);
    ctx.save();ctx.transform(1,0,(bottom-top)/(h/24),1,top,n*step*fit);
    ctx.drawImage(source,0,n*step,sw,Math.min(step+.3,sh-n*step),0,0,w,h/24+.08);ctx.restore();
   }
  }
  ctx.restore();return true;
 }
 const baseUltimate=spellActors.ultimate,baseField=spellActors.field,baseProjectile=spellActors.projectile;
 function ultimate(ctx,sect,index,age,duration,x,y,width,height,hitAt=duration*.6,alpha=1){
  if(!subjects[sect])return baseUltimate(...arguments);
  if(age<0||age>=duration)return false;
  const charge=smooth(age/hitAt),release=Math.max(0,(age-hitAt)/(duration-hitAt)),flight=smooth(release/.65);
  const fade=smooth(age/.22)*smooth((duration-age)/.35)*(1-smooth((release-.15)/.75))*alpha;
  baseUltimate(ctx,sect,index,age,duration,x,y,width,height,hitAt,alpha*.18);
  const clock=reduced.matches?0:age,scale=.58+.42*charge+flight*.12;
  const cy=y-height*.08+flight*height*.22+Math.sin(clock*2)*2;
  const tilt=sect===1?Math.sin(clock*.9)*.09:sect===2?Math.sin(clock*1.7)*.035:Math.sin(clock)*.025;
  draw(ctx,sect,x,cy,width*scale,height*scale,clock,fade,tilt);
  return true;
 }
 spellActors.ultimate=skillSprites.animate=ultimate;
 spellActors.field=function(ctx,sect,f,alpha=1){
  baseField(ctx,sect,f,alpha*.32);
  const duration=f.duration||5.5,fade=smooth(f.age/.45)*smooth((duration-f.age)/.5)*alpha;
  if(fade<=0)return;
  const clock=reduced.matches?0:f.age,size=f.radius*1.85*(.75+.25*smooth(f.age/.45));
  ctx.save();ctx.translate(f.x,f.y);ctx.scale(1,.58);
  draw(ctx,sect,0,0,size,size,clock,fade*.7,Math.sin(clock*.55)*.025,'field');ctx.restore();
 };
 spellActors.projectile=function(ctx,sect,x,y,angle,age,size=32,alpha=1){
  baseProjectile(ctx,sect,x,y,angle,age,size,alpha*(sect===3?.35:.7));
  if(sect===3){ctx.save();ctx.translate(x,y-2);ctx.scale(Math.cos(angle)<0?-1:1,1);draw(ctx,3,0,0,size*1.15,size*1.15,age,alpha,Math.sin(angle)*.18);ctx.restore();}
 };
 window.spellImagery={atlas,draw,subjects,fields,get ready(){return subjects.length===4&&fields.every(f=>f.image.complete&&f.image.naturalWidth);}};
})();
