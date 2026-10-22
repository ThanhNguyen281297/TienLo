/* Class artwork follows attack timing without dash streaks. Rendering never deals damage. */
(function(){
 const combat=basicCombat,TAU=Math.PI*2,HEIGHT=18,reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const clamp=v=>Math.max(0,Math.min(1,v)),ease=v=>{v=clamp(v);return v*v*(3-2*v);},age=o=>clamp(o.age/(o.duration||.3));
 const entries=[],icons=new Map(),stats={parts:0,meshes:0};
 const ready=e=>e?.image.complete&&e.image.naturalWidth>0;
 function load(sect){if(entries[sect])return entries[sect];const meta=basicEffectParts[sect],image=new Image(),entry=entries[sect]={image,meta};image.onerror=()=>msg('Không tải được hiệu ứng đánh thường '+meta.name+'. Hãy tải lại trang.');image.src=artworkURL(meta.file);return entry;}
 for(let sect=0;sect<4;sect++)load(sect);
 function part(sect,index){const entry=load(sect);if(!ready(entry))return null;return{image:entry.image,rect:entry.meta.parts[index].rect};}
 function paint(ctx,sect,index,x,y,w,h,angle=0,alpha=1,anchor=.5){
  if(alpha<=.001||w<=0||h<=0)return;const sprite=part(sect,index);if(!sprite)return;
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha*=clamp(alpha);ctx.drawImage(sprite.image,...sprite.rect,-w*anchor,-h/2,w,h);ctx.restore();stats.parts++;
 }
 // Basic attacks keep their painted shape without stretched dash trails.
 function curve(x,y,angle,r,start,end,count=18,flatten=.68){const points=[];for(let i=0;i<=count;i++){const a=start+(end-start)*i/count,u=Math.cos(a)*r,v=Math.sin(a)*r*flatten;points.push({x:x+Math.cos(angle)*u-Math.sin(angle)*v,y:y+Math.sin(angle)*u+Math.cos(angle)*v});}return points;}
 const envelope=p=>ease(p/.07)*Math.pow(1-ease((p-.58)/.42),.85);
 function cutArc(ctx,sect,index,x,y,angle,r,head,sign,alpha){
  // A moving cut reveals the painted cutting edge, anchored to the strike plane.
  const a=head-sign*.92,b=head;ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,r*1.6,Math.min(a,b),Math.max(a,b));ctx.closePath();ctx.clip();
  if(sect===0){ctx.scale(-1,1);paint(ctx,sect,index,-r*.58,0,r*.93,r*.94,0,alpha*.9);}
  else paint(ctx,sect,index,r*.57,0,r*.92,r*.96,0,alpha*.88);
  ctx.restore();
 }
 function fragments(ctx,sect,x,y,p,radius,angle=0,kind=3,alpha=1){
  const count=reduce.matches?3:sect===3?7:6,travel=1-(1-p)**2,fade=(1-p)**1.6;
  for(let i=0;i<count;i++){const a=angle+i*2.399963,spread=radius*(.45+(i%3)*.16)*travel,px=x+Math.cos(a)*spread,py=y+Math.sin(a)*spread*.65-8*Math.sin(p*Math.PI)+p*p*6;
   const w=sect===3?4.5:sect===1?7:3.5,h=sect===3?12:sect===1?8:10;
   paint(ctx,sect,kind,px,py,w,h,a+p*(i%2?.9:-.9),fade*alpha);
  }
 }
 function sword(ctx,s){const p=age(s),r=s.radius||82,sign=s.step===1?-1:1,head=sign*(-1.12+2.24*ease((p-.1)/.36)),fade=envelope(p),x=s.x,y=s.y-HEIGHT;
  cutArc(ctx,0,0,x,y,s.angle,r,head,sign,fade);
  const tip=curve(x,y,s.angle,r*.82,head,head,1)[0];paint(ctx,0,3,tip.x,tip.y,5,15,s.angle+head+Math.PI/2,fade*.85);
 }
 function spear(ctx,s){const p=age(s),r=s.radius||115,x=s.x,y=s.y-HEIGHT,fade=envelope(p);
  if(s.step===2){const head=-1.85+3.7*ease((p-.10)/.55);cutArc(ctx,2,2,x,y,s.angle,r,head,1,fade);return;}
  const thrust=ease((p-.04)/.36)*(1-.52*ease((p-.55)/.45)),reach=12+(r-12)*thrust,heavy=s.step===3;
  for(const side of s.step===1?[-1,1]:[0]){const ox=x-Math.sin(s.angle)*side*5,oy=y+Math.cos(s.angle)*side*5;
   paint(ctx,2,0,ox+Math.cos(s.angle)*reach,oy+Math.sin(s.angle)*reach,heavy?52:42,heavy?22:16,s.angle,fade,.96);
  }
  if(heavy&&p>.38)fragments(ctx,2,x+Math.cos(s.angle)*reach,y+Math.sin(s.angle)*reach,(p-.38)/.62,20,s.angle,3,.7);
 }
 function fan(ctx,c){const p=age(c),fade=envelope(p),x=c.x+Math.cos(c.angle)*15,y=c.y-HEIGHT+Math.sin(c.angle)*12;
  const open=ease(p/.38),w=36,h=29;
  // Five feather ribs unfold independently from a shared hinge.
  for(let n=0;n<5;n++){const a=-.93+n*.465;ctx.save();ctx.translate(x,y);ctx.rotate(c.angle+a*(.4+.6*open));ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(w,-h*.24);ctx.lineTo(w,h*.24);ctx.closePath();ctx.clip();paint(ctx,3,0,w*.45,0,w,h,-a,fade*.86);ctx.restore();}
  for(let n=0;n<3;n++){const a=c.angle+(n-1)*.22;paint(ctx,3,3,x+Math.cos(a)*(10+19*open),y+Math.sin(a)*(10+19*open),5,16,a+Math.PI/2,fade*.7);}
 }
 function cast(ctx,c){if(c.sect===3)fan(ctx,c);}
 function flutter(ctx,p,x,y,w,h,alpha){const sprite=part(3,1);if(!sprite)return;const [sx,sy,sw,sh]=sprite.rect;ctx.save();ctx.translate(x,y);ctx.rotate(p.angle);ctx.globalAlpha*=alpha;
  for(let n=0;n<10;n++){const t=(n+.5)/10,bend=Math.sin(p.age*18-t*4)*(1-t)*h*.13;ctx.drawImage(sprite.image,sx+n*sw/10,sy,Math.min(sw/10+.4,sw-n*sw/10),sh,-w*.85+n*w/10,-h/2+bend,w/10+.15,h);}
  ctx.restore();stats.parts++;
 }
 function projectile(ctx,p){const direction=p.viewAngle??p.angle;const sect=p.sect,y=p.y-HEIGHT,alpha=p.returning?.67:1;
  if(sect===0){paint(ctx,0,1,p.x,y,p.step===3?43:51,12,direction,alpha,.94);paint(ctx,0,5,p.x-3*Math.cos(direction),y-3*Math.sin(direction),6,6,0,alpha*.72);}
  else if(sect===1){const large=p.step===2;paint(ctx,1,1,p.x,y,large?54:40,large?39:29,direction,alpha,.64);for(let n=0;n<2;n++){const back=9+n*9,side=Math.sin(p.age*10+n*2)*(4+n);paint(ctx,1,5,p.x-Math.cos(direction)*back-Math.sin(direction)*side,y-Math.sin(direction)*back+Math.cos(direction)*side,8,10,direction,alpha*(.45-n*.12));}}
  else if(sect===3){const large=p.step===2;flutter(ctx,{...p,angle:direction},p.x,y,large?30:23,large?15:11,alpha);for(let n=0;n<3;n++){const back=10+n*7,side=Math.sin(p.age*14+n*2)*4;paint(ctx,3,n===2?5:3,p.x-Math.cos(direction)*back-Math.sin(direction)*side,y-Math.sin(direction)*back+Math.cos(direction)*side,n===2?6:4,n===2?6:10,direction+.4*Math.sin(p.age*8+n),alpha*(.5-n*.1));}}
 }
 function shatter(ctx,e,p,r,alpha){const x=e.x,y=e.y-HEIGHT,sect=e.sect,travel=ease(p/.72),count=reduce.matches?4:8;
  for(let n=0;n<count;n++){const a=n*TAU/count;ctx.save();ctx.translate(x+Math.cos(a)*r*.31*travel,y+Math.sin(a)*r*.2*travel);ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,r*.8,a-.05,a+TAU/count+.05);ctx.closePath();ctx.clip();paint(ctx,sect,4,0,0,r*1.45,r*1.2,0,alpha);ctx.restore();}
 }
 function effect(ctx,e){const p=age(e),fade=(1-p)**1.35,r=Math.min(38,e.radius||22),sect=e.sect,x=e.x,y=e.y-HEIGHT;
  if(e.kind==='seal'){flutter(ctx,{angle:-.16,age:e.age},x,y,13,22,fade*.8);return;}
  if(e.kind==='x'){for(const a of [-.6,.6])paint(ctx,0,1,x,y,r*1.8,9,(e.angle||0)+a,fade,.5);fragments(ctx,0,x,y,p,r,0,3,.7);return;}
  if(e.kind==='converge'){for(let n=0;n<3;n++){const a=n*TAU/3,pull=(1-ease(p/.7))*r*.65;paint(ctx,1,5,x+Math.cos(a)*pull,y+Math.sin(a)*pull*.65,12,16,a+.3,fade*.7);}return;}
  if(e.kind==='lightning'){fragments(ctx,2,x,y,p,r*1.2,e.angle||0,5,.85);shatter(ctx,e,p,r,fade*.8);return;}
  shatter(ctx,e,p,r,e.kind==='explode'?fade*.95:fade*.78);fragments(ctx,sect,x,y,p,r*(e.kind==='explode'?1.35:.9),e.angle||0,3,sect===3?.9:.72);
 }
 function icon(sect){if(icons.has(sect))return icons.get(sect);const sprite=part(sect,sect<2?1:0);if(!sprite)return null;const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),[x,y,w,h]=sprite.rect,scale=104/Math.max(w,h);ctx.translate(64,64);if(sect===0||sect===2)ctx.rotate(-Math.PI/4);ctx.drawImage(sprite.image,x,y,w,h,-w*scale/2,-h*scale/2,w*scale,h*scale);const result=c.toDataURL();icons.set(sect,result);return result;}
 function updateIcon(){if(!P.ap)return;const src=icon(P.ap.w),button=$('basic-attack');if(!src||!button)return;const url='url("'+src+'")';if(button.style.getPropertyValue('--hud-icon')!==url)button.style.setProperty('--hud-icon',url);button.dataset.basicClass=String(P.ap.w);}
 function drawEffects(ctx){stats.parts=stats.meshes=0;ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';for(const c of combat.state.casts||[])cast(ctx,c);for(const s of combat.state.swings||[]){if(s.sect===0)sword(ctx,s);else if(s.sect===2)spear(ctx,s);}for(const p of combat.state.projectiles||[])projectile(ctx,p);for(const e of combat.state.effects||[]){if(e.kind==='impact'&&combat.state.effects.some(o=>o!==e&&o.sect===e.sect&&o.kind!=='impact'&&Math.abs(o.age-e.age)<.03&&Math.hypot(o.x-e.x,o.y-e.y)<3))continue;effect(ctx,e);}ctx.restore();}
 combat.drawEffects=drawEffects;
 const previousDraw=dr;dr=function(){previousDraw();if(paused()||!P.ap)return;const camera=gameCamera();g.save();g.setTransform(Z,0,0,Z,-camera.x*Z,-camera.y*Z);drawEffects(g);g.restore();};
 const previousHud=hud;hud=function(){previousHud();updateIcon();};
 window.basicEffects={entries,load,available:sect=>!!ready(entries[sect]),ready:()=>entries.every(ready),draw:drawEffects,icon,updateIcon,stats,paint};
})();
