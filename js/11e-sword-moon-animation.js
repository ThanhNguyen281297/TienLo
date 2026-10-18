/* Sword/moon actors follow the same multi-hit phases as their combat modules. */
(function(){
 const parts=[],atlas=new Image(),reduced=matchMedia('(prefers-reduced-motion: reduce)'),TAU=Math.PI*2;
 const clamp=v=>Math.max(0,Math.min(1,v)),ease=v=>{v=clamp(v);return v*v*(3-2*v);};
 const rects=[[205,0,265,646],[701,75,520,575],[174,646,300,608],[694,700,525,514]];
 atlas.onload=()=>rects.forEach(([x,y,w,h],i)=>{const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(atlas,x,y,w,h,0,0,w,h);parts[i]=c;});
 atlas.src=artworkURL('Skill/VFX/sword-moon-parts-v4.png');
 const oldPose=spellImagery.pose,oldRender=spellImagery.render,oldUltimate=spellActors.ultimate,oldProjectile=spellActors.projectile,oldField=spellActors.field;
 const oldReady=Object.getOwnPropertyDescriptor(spellImagery,'ready').get;
 const timelines=[{duration:3.1,hitAt:2.05,waves:[.9,1.08,1.26,1.44,1.62,1.8]},{duration:4.25,hitAt:3.25,pulses:[.75,1.25],stormStart:1.55,stormEnd:3.05}];
 function add(nodes,id,part,x,y,w,h,angle=0,alpha=1,ay=.5,extra={}){nodes.push({id,part,x,y,w,h,angle,alpha,ay,...extra});}
 function swordPose(age,duration,hitAt,w,h){
  const t=age*2.05/hitAt,release=Math.max(0,age-hitAt),nodes=[],clock=reduced.matches?0:age;
  const fade=ease(age/.1)*ease((duration-age)/.3);
  if(age<0||age>=duration)return{nodes,phase:'ended',impact:false};
  if(t<.92)for(let i=0;i<7;i++){
   const born=ease((t-i*.045)/.3),a=i*TAU/7+clock*.6,r=w*.27*born;
   add(nodes,'gather-'+i,0,Math.cos(a)*r,(-h*.5+Math.sin(a)*h*.12)*born,20,64,-Math.cos(a)*.15,fade*born*(1-ease((t-.65)/.27)));
  }
  timelines[0].waves.forEach((impact,wave)=>{
   const p=(t-(impact-.32))/.32;if(p<0||t>impact+.13)return;
   for(let col=0;col<5;col++){
    const x=(col-2)*w*.13+Math.sin(wave*2+col)*w*.025,fall=ease(p),y=-h*.95*(1-fall);
    add(nodes,'rain-'+wave+'-'+col,0,x,y,19,62+wave*2,-.06*(col-2)*(1-fall),fade*(1-ease((t-impact)/.13)),1,{impactAt:impact*hitAt/2.05});
   }
  });
  if(t>=1.58){const fall=ease((t-1.64)/.41);add(nodes,'finisher',0,0,-h*1.05*(1-fall),49,Math.min(150,h*.78),0,fade*ease((t-1.58)/.12)*(1-ease(release/.26)),1,{impactAt:hitAt});}
  for(let i=0;i<10;i++){
   const a=i*2.4+clock*.4,p=release>0?clamp(release/.6):ease(t/.6),r=release>0?w*(.1+p*.5):w*.32;
   add(nodes,'ice-'+i,2,Math.cos(a)*r,-h*.15+Math.sin(a)*r*.45-p*(release>0?30:0),5,14,a,fade*(release>0?1-p:.3));
  }
  return{nodes,phase:t<.65?'summon':age<hitAt?'strike':'dissipate',impact:age>=hitAt};
 }
 function moonPose(age,duration,hitAt,w,h){
  const t=age*3.25/hitAt,release=Math.max(0,age-hitAt),nodes=[],clock=reduced.matches?0:age;
  if(age<0||age>=duration)return{nodes,phase:'ended',impact:false};
  const fade=ease(age/.15)*ease((duration-age)/.35),storm=ease((t-1.4)/.25)*(1-ease((t-3.0)/.22)),seal=ease((t-3.0)/.25);
  const moonY=-h*(.35+.16*Math.sin(Math.min(1,t/1.55)*Math.PI)),size=w*(.33+.12*ease(t/.7));
  const seams=[0,.42,.94,1.35,1.91,2.58,3.13,3.52,4.05,4.68,5.17,5.74,TAU];
  for(let i=0;i<12;i++){
   const a=(seams[i]+seams[i+1])*.5,open=release>0?ease(release/(.43+(i%3)*.06)):(.14*(1-ease(t/.8))),r=w*(release>0?.45+(i%4)*.08:1)*open;
   add(nodes,'moon-sector-'+i,3,Math.cos(a)*r,moonY+Math.sin(a)*r*.55+release*release*24,size,size,release>0?Math.sin(i*2.3)*open*.8:0,fade*(release>0?1-open:1),.5,{wedge:[seams[i]-.012,seams[i+1]+.012],eclipse:seal});
  }
  for(let i=0;i<3;i++){
   let x,y,angle;
   if(storm>0&&t<3.05){const s=t-1.55,a=s*6+i*TAU/3,r=20+65*(.5+.5*Math.sin(s*7+i*2));x=Math.cos(a)*r;y=Math.sin(a)*r*.58-9;angle=a+Math.PI/2;}
   else{const a=clock*2+i*TAU/3,r=w*.34*(1-seal);x=Math.cos(a)*r;y=moonY+Math.sin(a)*r*.5;angle=a;}
   const burst=release>0?ease(release/.42):0;
   add(nodes,'crescent-'+i,1,x*(1+burst*.7),y+burst*25,49+storm*12,49+storm*12,angle,fade*(1-burst*.75));
  }
  timelines[1].pulses.forEach((at,k)=>{
   const p=(t-at)/.32;if(p<0||p>1)return;
   for(let i=0;i<3;i++){const a=i*TAU/3+p*2;add(nodes,'pulse-'+k+'-'+i,1,Math.cos(a)*w*.48*p,Math.sin(a)*h*.2*p,38,38,a+p*2,fade*(1-p));}
  });
  return{nodes,phase:t<1.55?'summon':t<3.05?'storm':age<hitAt?'eclipse':'dissipate',impact:age>=hitAt};
 }
 function pose(sect,age,duration=timelines[sect]?.duration||3,hitAt=timelines[sect]?.hitAt||duration*.6,w=190,h=200){return sect===0?swordPose(age,duration,hitAt,w,h):sect===1?moonPose(age,duration,hitAt,w,h):oldPose(sect,age,duration,hitAt,w,h);}
 function paint(ctx,n){
  const image=parts[n.part];if(!image||n.alpha<=0)return;
  ctx.save();ctx.translate(n.x,n.y);ctx.rotate(n.angle);ctx.globalAlpha*=clamp(n.alpha);
  if(n.wedge){ctx.beginPath();ctx.moveTo(0,0);ctx.ellipse(0,0,n.w/2,n.h/2,0,...n.wedge);ctx.closePath();ctx.clip();}
  renderArtwork(ctx,image,-n.w/2,-n.h*n.ay,n.w,n.h);
  if(n.eclipse){ctx.fillStyle='rgba(10,25,40,'+n.eclipse*.78+')';ctx.beginPath();ctx.ellipse(-n.w*.08,-n.h*.04,n.w*.46,n.h*.46,0,0,TAU);ctx.fill();}ctx.restore();
 }
 function render(ctx,sect,x,y,age,duration,hitAt,w,h,alpha=1){
  if(sect>1)return oldRender(...arguments);
  const p=pose(sect,age,duration,hitAt,w,h);ctx.save();ctx.translate(x,y);ctx.globalAlpha*=alpha;for(const n of p.nodes)paint(ctx,n);ctx.restore();return p;
 }
 function ground(ctx,sect,f,alpha){
  const fade=ease(f.age/.3)*ease(((f.duration||5)-f.age)/.45)*alpha,clock=reduced.matches?0:f.age,r=f.radius*(.7+.3*ease(f.age/.4));
  if(fade<=0)return;ctx.save();ctx.translate(f.x,f.y);ctx.scale(1,.55);
  spellActors.part(ctx,sect,4,0,0,r*2.2,r*2.2,clock*.13,fade*.32);
  spellActors.part(ctx,sect,7,0,0,r*1.6,r*1.6,-clock*.18,fade*.15);
  for(let i=0;i<3;i++)spellActors.ribbon(ctx,sect,0,0,r*.88,r*.88,clock*.2+i*TAU/3,1.5,fade*.6);
  ctx.restore();
 }
 function ultimate(ctx,sect,index,age,duration,x,y,w,h,hitAt=duration*.6,alpha=1){
  if(sect>1||parts.length!==4)return oldUltimate(...arguments);if(age<0||age>=duration)return false;
  const groundY=y+(sect===0?48:58),fade=ease(age/.2)*ease((duration-age)/.35)*alpha;
  ground(ctx,sect,{x,y:groundY,radius:w*.42,age,duration},fade*.6);render(ctx,sect,x,groundY,age,duration,hitAt,w,h,alpha);
  const timeline=timelines[sect],scale=hitAt/timeline.hitAt;
  for(const event of sect===0?timeline.waves:timeline.pulses){const t=age-event*scale;if(t>=0&&t<.24)spellActors.impact(ctx,sect,x,groundY,t,w*.24,.24);}
  if(age>=hitAt)spellActors.impact(ctx,sect,x,groundY,age-hitAt,w*.6,Math.min(.65,duration-hitAt));return parts.length===4;
 }
 function fieldPose(sect,f){
  const nodes=[],clock=reduced.matches?0:f.age,count=sect===0?5:3,fade=ease(f.age/.3)*ease(((f.duration||5)-f.age)/.45);
  for(let i=0;i<count;i++){
   const a=sect===0?-Math.PI/2+i*TAU/5:f.age*1.8+i*TAU/3,r=f.radius*(sect===0?.83:.88)*ease((f.age-i*.035)/.3);
   const float=Math.sin(clock*3+i*1.7)*4;
   add(nodes,'boundary-'+i,sect===0?0:1,Math.cos(a)*r,Math.sin(a)*r*(sect===0?.55:.58)-14+float,sect===0?22:35,sect===0?54:35,sect===0?Math.sin(clock*2+i)*.07:a,fade);
  }return nodes;
 }
 spellActors.field=function(ctx,sect,f,alpha=1){
  if(sect>1||parts.length!==4)return oldField(...arguments);ground(ctx,sect,f,alpha);ctx.save();ctx.translate(f.x,f.y);ctx.globalAlpha*=alpha;for(const n of fieldPose(sect,f))paint(ctx,n);ctx.restore();
 };
 spellActors.projectile=function(ctx,sect,x,y,angle,age,size=32,alpha=1){
  if(sect>1||parts.length!==4)return oldProjectile(...arguments);spellActors.light(ctx,sect,x,y,size*.65,alpha*.14);ctx.save();ctx.translate(x,y);const clock=reduced.matches?0:age;
  for(let i=2;i>=0;i--){const d=i*size*.32;paint(ctx,{part:sect,x:-Math.cos(angle)*d,y:-Math.sin(angle)*d,w:sect===0?size*.48:size,h:sect===0?size*1.65:size,angle:sect===0?angle-Math.PI/2:angle+clock*4,alpha:alpha*(i?(.14/i):1),ay:.5});}ctx.restore();
 };
 spellActors.ultimate=skillSprites.animate=ultimate;spellImagery.pose=pose;spellImagery.render=render;spellImagery.swordMoonParts=parts;spellImagery.timelines=timelines;spellImagery.fieldPose=fieldPose;spellImagery.ownsFieldActors=sect=>sect<2&&parts.length===4;
 Object.defineProperty(spellImagery,'ready',{get:()=>oldReady()&&parts.length===4});
})();
