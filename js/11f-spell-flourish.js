/* Continuous secondary motion from existing separate sprite parts. No pose sheets,
   frame histories or extra damage events; every trajectory uses simulation age. */
(function(){
 const TAU=Math.PI*2,reduced=matchMedia('(prefers-reduced-motion: reduce)'),small=matchMedia('(pointer:coarse)'),tones=['#d7f5ff','#c3ffef','#ddcaff','#fff0c8'];
 const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};
 const stats={sprites:0},count=()=>small.matches?7:11;
 function paint(ctx,sect,x,y,w,h,angle,alpha){
  const image=sect<2?spellImagery.swordMoonParts?.[sect===0?2:1]:spellImagery.parts?.[sect===2?1:6];if(!image||alpha<=0)return;
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha*=clamp(alpha);renderArtwork(ctx,image,-w/2,-h/2,w,h);ctx.restore();stats.sprites++;
 }
 function impactNodes(sect,age,radius,duration=.6){
  if(age<0||age>=duration)return[];const p=age/duration,travel=1-Math.exp(-p*3),fade=(1-p)**1.5,nodes=[];
  for(let i=0;i<count();i++){const a=i*2.399963,spread=radius*(.4+(i%4)*.16)*travel;
   const arc=sect===1?p*1.7:sect===3?Math.sin(p*5+i)*.25:0,angle=a+arc;
   nodes.push({x:Math.cos(angle)*spread,y:Math.sin(angle)*spread*.5-Math.sin(p*Math.PI)*(sect===3?24:12)+p*p*8,w:sect===0?3.5:sect===1?9:sect===2?8:4.5,h:sect===0?12:sect===1?9:sect===2?5:17,angle:sect===0?a+p*.35:sect===3?Math.sin(p*8+i)*.6:a+p*(sect===1?5:2),alpha:fade*.72});
  }return nodes;
 }
 const impact=spellActors.impact;spellActors.impact=function(ctx,sect,x,y,age,radius=55,duration=.6){impact(...arguments);if(reduced.matches)return;for(const n of impactNodes(sect,age,Math.min(100,radius),duration))paint(ctx,sect,x+n.x,y+n.y-3,n.w,n.h,n.angle,n.alpha);};
 const projectile=spellActors.projectile;spellActors.projectile=function(ctx,sect,x,y,angle,age,size=32,alpha=1){projectile(...arguments);if(reduced.matches)return;
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);const n=small.matches?3:5;
  for(let i=0;i<n;i++){const p=(age*1.5+i/n)%1,a=age*5+i*TAU/n,back=-size*(.3+p*1.6),side=Math.sin(a)*size*.22;
   paint(ctx,sect,back,side,sect===1?size*.28:size*.11,size*(sect===3?.45:.3),a*.3,alpha*(1-p)*.6);
  }ctx.restore();
 };
 const field=spellActors.field;spellActors.field=function(ctx,sect,f,alpha=1){field(...arguments);if(reduced.matches)return;const fade=ease(f.age/.3)*ease(((f.duration||5.5)-f.age)/.5)*alpha;if(!fade)return;
  for(let i=0;i<(small.matches?5:8);i++){const p=(f.age*.45+i*.618)%1,a=i*2.4+f.age*(sect===1?-.25:.16),r=f.radius*(.76+p*.12),x=f.x+Math.cos(a)*r,y=f.y+Math.sin(a)*r*.53-4-p*21;
   paint(ctx,sect,x,y,sect===1?10:5,sect===1?10:17,a*.12+Math.sin(f.age*3+i)*.24,fade*Math.sin(p*Math.PI)*.65);
  }
 };
 function charge(ctx,sect,x,y,age,duration){if(reduced.matches||age<0||age>=duration)return;const p=age/duration,fade=Math.sin(p*Math.PI)*.7;
  for(let i=0;i<4;i++){const a=i*TAU/4+age*3,r=26*(1-ease(p));paint(ctx,sect,x+Math.cos(a)*r,y+Math.sin(a)*r*.55,sect===1?8:4,sect===1?8:13,a+p,fade);}
 }
 const ultimate=spellActors.ultimate;function finish(ctx,sect,index,age,duration,x,y,w,h,hitAt=duration*.6,alpha=1){
  const result=ultimate(...arguments);if(reduced.matches||sect!==2||age<0||age>=hitAt)return result;
  const head=spellImagery.pose(sect,age,duration,hitAt,w,h).nodes.find(n=>n.id==='head');if(!head||head.alpha<=0)return result;
  ctx.save();ctx.translate(x+head.x,y+h*.32+head.y);ctx.rotate(head.angle);ctx.globalAlpha=head.alpha*alpha*.8;ctx.strokeStyle=tones[sect];ctx.lineWidth=.65;ctx.lineCap='round';
  for(const side of [-1,1])for(let i=0;i<2;i++){ctx.beginPath();ctx.moveTo(w*.06,side*h*.025);ctx.bezierCurveTo(w*.03,side*h*.1,-w*.12,side*h*(.08+.025*Math.sin(age*9-i)),-w*(.17+i*.03),side*h*.035);ctx.stroke();}ctx.restore();return result;
 }
 spellActors.ultimate=skillSprites.animate=finish;window.spellFlourish={impactNodes,charge,paint,stats};
})();
