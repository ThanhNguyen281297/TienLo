/* Kiếm Tông skill VFX, drawn entirely with canvas code (no sprite art), in a bright
   wuxia style: luminous sword blades with ribbon trails and afterimages, sword-qi
   crescents, a rotating Bát Quái seal on the ground, a sky of falling swords for
   Vạn Kiếm Quy Tông, hit sparks, shockwaves, light pillars and a short screen flash.

   Presentation only: damage, timing and cooldowns stay in js/14-kiem-tong-skills.js,
   which hands its draw calls to this module (kiemVfx.drawEffects / drawGround).
   Older flourish layers (28, 30, 31, 44) stand down for the classes listed in
   skillVfx.owns(). */
(function(){
 const TAU=Math.PI*2,reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const C={core:'#ffffff',hot:'#d8fbff',qi:'#7fe8ff',deep:'#2a9bff',gold:'#ffe7a3'};
 const parts=[],rings=[],arcs=[],beams=[],streaks=[];
 let flash=0,flashColor=C.hot,lastPulse=-1,lastUltPulse=0,ultFinale=false;
 const kiem=()=>P.ap?.w===0;
 const rnd=(a,b)=>a+Math.random()*(b-a);
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const ease=t=>1-Math.pow(1-clamp(t,0,1),3);
 const cap=(list,n)=>{if(list.length>n)list.splice(0,list.length-n);};
 const state=()=>window.kiemCombat?.state;

 // ---------------------------------------------------------------- toolkit
 const glows=new Map();
 function glow(color){let c=glows.get(color);if(c)return c;c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),gr=x.createRadialGradient(32,32,0,32,32,32);
  gr.addColorStop(0,color);gr.addColorStop(.35,color+'99');gr.addColorStop(1,color+'00');x.fillStyle=gr;x.fillRect(0,0,64,64);glows.set(color,c);return c;}
 function dot(ctx,x,y,r,color,alpha){if(alpha<=0||r<=0)return;ctx.globalAlpha=alpha;ctx.drawImage(glow(color),x-r,y-r,r*2,r*2);}
 // Tapered glowing ribbon through points (oldest first): wide coloured pass + white core.
 function ribbon(ctx,pts,width,color,alpha){if(pts.length<2)return;ctx.lineCap='round';
  for(const [w,col,a] of [[width,color,alpha*.55],[width*.35,C.core,alpha]])for(let i=1;i<pts.length;i++){const t=i/(pts.length-1);
   ctx.globalAlpha=a*t;ctx.strokeStyle=col;ctx.lineWidth=Math.max(.3,w*t);ctx.beginPath();ctx.moveTo(pts[i-1].x,pts[i-1].y);ctx.lineTo(pts[i].x,pts[i].y);ctx.stroke();}}
 // A luminous sword pointing along `angle` (0 = right), centre at (x,y).
 function blade(ctx,x,y,angle,len,alpha,hue=C.qi){if(alpha<=0)return;
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);
  // A dark-blue underglow (normal blending) keeps the light blade readable in daylight.
  const op=ctx.globalCompositeOperation;ctx.globalCompositeOperation='source-over';ctx.globalAlpha=alpha*.3;ctx.drawImage(glow('#0b3d7a'),-len*.6,-len*.17,len*1.2,len*.34);ctx.globalCompositeOperation=op;
  ctx.globalAlpha=alpha*.75;ctx.drawImage(glow(hue),-len*.66,-len*.24,len*1.32,len*.48);
  const half=len/2,w=Math.max(1.4,len*.07);
  const gr=ctx.createLinearGradient(-half,0,half,0);gr.addColorStop(0,hue);gr.addColorStop(.55,C.hot);gr.addColorStop(1,C.core);
  ctx.globalAlpha=alpha;ctx.fillStyle=gr;ctx.beginPath();ctx.moveTo(half,0);ctx.lineTo(-half*.35,-w);ctx.lineTo(-half*.42,0);ctx.lineTo(-half*.35,w);ctx.closePath();ctx.fill();
  ctx.fillStyle=C.gold;ctx.fillRect(-half*.44,-w*2.1,len*.04,w*4.2);       // guard
  ctx.fillStyle='#9fd8ff';ctx.fillRect(-half,-w*.55,half*.56,w*1.1);         // grip
  dot(ctx,-half,0,w*1.8,C.gold,alpha*.8);                                     // pommel gem
  ctx.restore();}
 // Iso (2:1) ellipse helpers.
 function ellipse(ctx,x,y,r,width,color,alpha,start=0,end=TAU){ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.ellipse(x,y,r,r*.5,0,start,end);ctx.stroke();}
 function burst(x,y,n,speed,color,life=.5,up=0,size=1.4){for(let i=0;i<n;i++){const a=rnd(0,TAU),s=rnd(speed*.4,speed);parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s*.6-up,g:120,age:0,life:rnd(life*.6,life),size:rnd(size*.6,size),color,kind:'spark'});}cap(parts,420);}
 function motes(x,y,n,spread,color){for(let i=0;i<n;i++)parts.push({x:x+rnd(-spread,spread),y:y+rnd(-spread*.5,spread*.5),vx:rnd(-6,6),vy:rnd(-38,-18),g:0,age:0,life:rnd(.7,1.4),size:rnd(1,2.2),color,kind:'mote'});cap(parts,420);}
 function ring(x,y,r0,r1,life,color,width=2){rings.push({x,y,r0,r1,age:0,life,color,width});cap(rings,60);}
 function arc(x,y,angle,r,life,color,span=2.2,width=6){arcs.push({x,y,angle,r,age:0,life,color,span,width});cap(arcs,40);}
 function beam(x,y,h,w,life,color){beams.push({x,y,h,w,age:0,life,color});cap(beams,24);}
 function kick(amount,flashAmount=0){if(reduced.matches)return;try{shk=Math.max(shk||0,amount);}catch{}if(flashAmount){flash=Math.max(flash,flashAmount);flashColor=C.hot;}}

 // ---------------------------------------------------------------- the Bát Quái seal
 const TRI=[[1,1,1],[0,1,1],[1,0,1],[0,0,1],[1,1,0],[0,1,0],[1,0,0],[0,0,0]];
 function seal(ctx,x,y,r,rot,alpha,pulse=0){if(alpha<=0)return;ctx.save();ctx.translate(x,y);ctx.scale(1,.5);
  ctx.globalAlpha=alpha*.35;ctx.drawImage(glow(C.deep),-r*1.25,-r*1.25,r*2.5,r*2.5);
  const lines=(w,col,a)=>{ctx.strokeStyle=col;ctx.lineWidth=w;ctx.globalAlpha=alpha*a;
   ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.stroke();ctx.beginPath();ctx.arc(0,0,r*.9,0,TAU);ctx.stroke();ctx.beginPath();ctx.arc(0,0,r*.42,0,TAU);ctx.stroke();
   ctx.save();ctx.rotate(rot);
   for(let i=0;i<48;i++){const a=i/48*TAU,l=i%6?.04:.08;ctx.beginPath();ctx.moveTo(Math.cos(a)*r*.9,Math.sin(a)*r*.9);ctx.lineTo(Math.cos(a)*r*(.9-l),Math.sin(a)*r*(.9-l));ctx.stroke();}
   for(let i=0;i<8;i++){const a=i/8*TAU;ctx.save();ctx.rotate(a);ctx.translate(r*.66,0);ctx.rotate(Math.PI/2);
    TRI[i].forEach((solid,k)=>{const yy=(k-1)*r*.06,half=r*.11;ctx.beginPath();if(solid){ctx.moveTo(-half,yy);ctx.lineTo(half,yy);}else{ctx.moveTo(-half,yy);ctx.lineTo(-half*.2,yy);ctx.moveTo(half*.2,yy);ctx.lineTo(half,yy);}ctx.stroke();});ctx.restore();}
   ctx.restore();
   ctx.save();ctx.rotate(-rot*1.6);ctx.beginPath();for(let i=0;i<8;i++){const a=i/8*TAU,b=(i+3)/8*TAU;ctx.moveTo(Math.cos(a)*r*.42,Math.sin(a)*r*.42);ctx.lineTo(Math.cos(b)*r*.42,Math.sin(b)*r*.42);}ctx.stroke();ctx.restore();};
  ctx.globalCompositeOperation='lighter';lines(4.5,C.qi,.45+pulse*.4);lines(1.4,C.core,.85);
  // taiji in the centre
  ctx.save();ctx.rotate(rot*2);ctx.globalAlpha=alpha*.75;ctx.fillStyle=C.hot;ctx.beginPath();ctx.arc(0,0,r*.16,-Math.PI/2,Math.PI/2);ctx.arc(0,r*.08,r*.08,Math.PI/2,-Math.PI/2,true);ctx.arc(0,-r*.08,r*.08,Math.PI/2,-Math.PI/2);ctx.fill();ctx.restore();
  ctx.restore();}

 // ---------------------------------------------------------------- cast events
 function weaponPoint(){try{return characterWeapon.position(0,P.x,P.y,0);}catch{return {x:P.x,y:P.y-26};}}
 function onCast(index){const s=state();if(!s)return;const w=weaponPoint(),aim=s.aim||{x:P.x+P.f*100,y:P.y},ang=Math.atan2(aim.y-P.y,aim.x-P.x);
  if(index===0){ring(w.x,w.y,4,34,.35,C.qi,2.4);arc(w.x,w.y,ang,26,.28,C.hot,1.6,5);for(let i=0;i<14;i++){const a=ang+rnd(-.5,.5),sp=rnd(120,260);parts.push({x:w.x,y:w.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp*.6,g:0,age:0,life:rnd(.2,.4),size:rnd(1,1.8),color:C.qi,kind:'spark'});}kick(1.2);}
  if(index===1){ring(P.x,P.y,6,46,.45,C.qi,3);burst(P.x,P.y-4,16,90,C.hot,.45,20);kick(2);}
  if(index===2&&s.field){beam(s.field.x,s.field.y,170,26,.7,C.qi);ring(s.field.x,s.field.y,10,s.field.radius*1.15,.6,C.hot,3);kick(1.5);}
  if(index===3){beam(P.x,P.y,140,22,.6,C.gold);motes(P.x,P.y-20,24,30,C.gold);lastUltPulse=0;ultFinale=false;}
 }
 function onHit(enemy){const x=enemy.x,y=enemy.y-14,a=rnd(0,Math.PI);
  arc(x,y,a,15,.22,C.core,1.4,3.2);arc(x,y,a+Math.PI/2,15,.22,C.qi,1.4,3.2);burst(x,y,9,150,C.hot,.35,10,1.3);ring(x,y+12,3,20,.3,C.qi,1.6);}

 // ---------------------------------------------------------------- per-frame updates
 let fieldSeen=null;
 function step(dt){const s=state();
  for(const list of [parts,rings,arcs,beams,streaks])for(const e of list)e.age+=dt;
  for(const p of parts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=(p.g||0)*dt;p.vx*=1-dt*2.2;if(p.kind==='mote')p.vy*=1-dt*.4;}
  for(const list of [parts,rings,arcs,beams,streaks])for(let i=list.length-1;i>=0;i--)if(list[i].age>=list[i].life)list.splice(i,1);
  flash=Math.max(0,flash-dt*2.4);
  if(!s||!kiem())return;
  for(const sw of s.flying)if(Math.random()<dt*30)parts.push({x:sw.x+rnd(-3,3),y:sw.y-10+rnd(-3,3),vx:rnd(-10,10),vy:rnd(-14,4),g:0,age:0,life:.35,size:rnd(.8,1.5),color:C.qi,kind:'mote'});
  if(s.dash){const d=s.dash,t=clamp(d.elapsed/d.duration,0,1);streaks.push({x:P.x,y:P.y-20,age:0,life:.25,angle:d.angle});cap(streaks,40);if(t>=.99&&!d._vfxEnd){d._vfxEnd=true;arc(d.end.x,d.end.y-20,d.angle,42,.4,C.hot,2.6,9);arc(d.end.x,d.end.y-20,d.angle+.5,34,.4,C.qi,2,5);burst(d.end.x,d.end.y-6,18,140,C.hot,.5,30);ring(d.end.x,d.end.y,8,56,.45,C.qi,3);kick(2.5);}}
  const f=s.field;
  if(f){if(fieldSeen!==f){fieldSeen=f;lastPulse=-1;}
   if(Math.random()<dt*18)motes(f.x+rnd(-f.radius*.8,f.radius*.8),f.y+rnd(-f.radius*.3,f.radius*.3),1,0,Math.random()<.3?C.gold:C.qi);
   const pulse=Math.floor(f.age/.55);if(pulse!==lastPulse&&f.age<=f.duration){lastPulse=pulse;if(pulse>0){ring(f.x,f.y,f.radius*.3,f.radius*1.05,.5,C.hot,2.4);
     // a hovering sword stabs down onto the seal
     const slot=pulse%5,a=-Math.PI/2+slot*TAU/5;streaks.push({x:f.x+Math.cos(a)*f.radius*.45,y:f.y+Math.sin(a)*f.radius*.25,age:0,life:.3,stab:true});burst(f.x+Math.cos(a)*f.radius*.45,f.y+Math.sin(a)*f.radius*.25,7,90,C.hot,.35,40,1.2);}}}
  const u=s.ultimate;
  if(u){const n=Math.min(6,Math.floor(Math.max(0,u.age-.9)/.18)+(u.age>=.9?1:0));
   while(lastUltPulse<n){lastUltPulse++;for(let i=0;i<5;i++){const a=rnd(0,TAU),r=rnd(0,80);const x=u.x+Math.cos(a)*r,y=u.y+Math.sin(a)*r*.5;burst(x,y-4,6,110,C.hot,.4,40,1.2);ring(x,y,2,22,.3,C.qi,1.6);}kick(1.4);}
   if(!ultFinale&&u.age>=2.05){ultFinale=true;burst(u.x,u.y-10,60,260,C.hot,.9,60,2);burst(u.x,u.y-10,30,180,C.gold,.8,40,1.8);ring(u.x,u.y,10,190,.8,C.hot,5);ring(u.x,u.y,6,130,.6,C.gold,3);beam(u.x,u.y,260,60,.6,C.hot);kick(9,.55);}}
 }

 // ---------------------------------------------------------------- drawing
 function drawGround(ctx,s){
  const f=s.field;
  if(f){const spawn=ease(f.age/.4),fade=clamp((f.duration-f.age)/.4,0,1),pulse=Math.max(0,1-(f.age%.55)/.25);seal(ctx,f.x,f.y,f.radius*(.55+.45*spawn),f.age*.6,fade,pulse);}
  const u=s.ultimate;
  if(u){const grow=ease(u.age/.8),fade=clamp((u.duration-u.age)/.5,0,1),hot=u.age>=2.05?Math.max(0,1-(u.age-2.05)/.6):0;seal(ctx,u.x,u.y,(70+60*grow)*(1+hot*.2),u.age*1.4,fade*(.75+hot*.25),hot);
   if(u.age>=2.05){ctx.save();ctx.globalCompositeOperation='lighter';const k=clamp((u.age-2.05)/.9,0,1);ctx.strokeStyle=C.hot;for(let i=0;i<14;i++){const a=i/14*TAU+.2,len=60+((i*37)%50);ctx.globalAlpha=(1-k)*.7;ctx.lineWidth=2.2*(1-k)+.4;ctx.beginPath();ctx.moveTo(u.x+Math.cos(a)*14,u.y+Math.sin(a)*7);ctx.lineTo(u.x+Math.cos(a)*len*(.4+k*.6),u.y+Math.sin(a)*len*.5*(.4+k*.6));ctx.stroke();}ctx.restore();}}
  return true;}
 function drawEffects(ctx,s){ctx.save();ctx.globalCompositeOperation='lighter';
  // Flying swords: ribbon trail, two afterimages, then the blade.
  for(const sw of s.flying){const trail=[...sw.trail,{x:sw.x,y:sw.y}].map(p=>({x:p.x,y:p.y-10}));ribbon(ctx,trail,sw.returning?5:11,C.qi,sw.returning?.45:.95);
   const ang=sw.angle+Math.PI/2,len=sw.returning?30:46;
   for(let k=2;k>=1;k--){const p=trail[Math.max(0,trail.length-1-k*2)];blade(ctx,p.x,p.y,ang,len,.22/k);}
   blade(ctx,sw.x,sw.y-10,ang,len,1);dot(ctx,sw.x+Math.cos(ang)*len*.5,sw.y-10+Math.sin(ang)*len*.5,8,C.core,.9);
   if(!sw.returning){ctx.save();ctx.translate(sw.x+Math.cos(ang)*len*.35,sw.y-10+Math.sin(ang)*len*.35);ctx.rotate(ang);ctx.scale(.6,1);
    for(const [w,col,k] of [[7,C.qi,.45],[2.2,C.core,.9]]){ctx.globalAlpha=k;ctx.strokeStyle=col;ctx.lineWidth=w;ctx.beginPath();ctx.arc(0,0,18,-1.1,1.1);ctx.stroke();}ctx.restore();}}
  // Hovering swords of the seal.
  const f=s.field;
  if(f){const spawn=ease(f.age/.4),fade=clamp((f.duration-f.age)/.35,0,1);
   for(let slot=0;slot<5;slot++){if(s.flying.some(x=>x.slot===slot))continue;const a=-Math.PI/2+slot*TAU/5+f.age*.6,px=f.x+Math.cos(a)*f.radius*.83,py=f.y+Math.sin(a)*f.radius*.55*.83,bob=Math.sin(f.age*3+slot)*3,
    home=f.source||P,x=home.x+(px-home.x)*spawn,y=home.y+(py-home.y)*spawn-22+bob;
    dot(ctx,px,py,12,C.qi,.45*fade);blade(ctx,x,y,Math.PI/2,40,fade*spawn);}}
  // Dash: comet streak along the path (the body is hidden by 14 during the dash).
  for(const st of streaks){const p=st.age/st.life;
   if(st.stab){blade(ctx,st.x,st.y-36+p*30,Math.PI/2,34,1-p);dot(ctx,st.x,st.y,14*(1-p)+4,C.hot,1-p);continue;}
   dot(ctx,st.x,st.y,18*(1-p),C.qi,(1-p)*.6);dot(ctx,st.x,st.y,8*(1-p),C.core,(1-p)*.9);}
  if(s.dash){const d=s.dash;blade(ctx,P.x,P.y-20,d.angle,40,1);}
  // Vạn Kiếm Quy Tông: a ring of swords in the sky, waves raining down, one giant sword.
  const u=s.ultimate;
  if(u){const t=u.age,fade=clamp((u.duration-t)/.5,0,1),sky=u.y-150;
   if(t<2.05){const gather=ease(t/.8);for(let i=0;i<24;i++){const a=i/24*TAU+t*.8,r=95*gather,x=u.x+Math.cos(a)*r,y=sky+Math.sin(a)*r*.32;
     const fallen=t>=.9&&i<Math.min(24,Math.floor((t-.9)/.18+1)*5)?clamp((t-.9-Math.floor(i/5)*.18)/.18,0,1):0;
     blade(ctx,x+(u.x-x)*fallen*.4,y+(u.y-y)*fallen,Math.PI/2,34,(1-fallen*.7)*gather);if(fallen>0&&fallen<1)ribbon(ctx,[{x,y},{x:x+(u.x-x)*fallen*.4,y:y+(u.y-y)*fallen}],3,C.qi,.6);}
    dot(ctx,u.x,sky,50*gather,C.qi,.45);ctx.save();ctx.globalCompositeOperation='source-over';seal(ctx,u.x,sky,90*gather,-t*1.2,gather*.8);ctx.restore();}
   // the giant sword: hangs above, then drops at 2.05
   const drop=clamp((t-1.75)/.3,0,1),gy=sky-30+(u.y-60-(sky-30))*ease(drop);
   if(t>1.2&&t<2.45){const a=clamp((t-1.2)/.4,0,1)*fade*(t<2.05?1:1-(t-2.05)/.4);blade(ctx,u.x,gy,Math.PI/2,150,a,C.hot);if(drop>0&&drop<1)ribbon(ctx,[{x:u.x,y:sky-80},{x:u.x,y:gy-60}],22,C.qi,.7);}}
  // Generic layers: beams, rings, crescents, particles.
  for(const b of beams){const p=b.age/b.life,a=(1-p)*(p<.15?p/.15:1);ctx.globalAlpha=a*.7;const gr=ctx.createLinearGradient(0,b.y-b.h,0,b.y);gr.addColorStop(0,b.color+'00');gr.addColorStop(.7,b.color+'aa');gr.addColorStop(1,'#ffffff');ctx.fillStyle=gr;const w=b.w*(1-p*.5);ctx.fillRect(b.x-w/2,b.y-b.h,w,b.h);dot(ctx,b.x,b.y,w*1.2,C.core,a*.8);}
  for(const r of rings){const p=ease(r.age/r.life);ellipse(ctx,r.x,r.y,r.r0+(r.r1-r.r0)*p,r.width*(1-p)+.4,r.color,(1-p)*.85);}
  for(const c of arcs){const p=c.age/c.life,a=1-p,r=c.r*(.7+.5*ease(p));ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.angle);ctx.scale(1,.55);
   for(const [w,col,k] of [[c.width*1.8,c.color,.5],[c.width*.5,C.core,1]]){ctx.globalAlpha=a*k;ctx.strokeStyle=col;ctx.lineWidth=w*(1-p*.6);ctx.lineCap='round';ctx.beginPath();ctx.arc(0,0,r,-c.span/2,c.span/2);ctx.stroke();}ctx.restore();}
  for(const p of parts){const k=1-p.age/p.life;if(p.kind==='spark'){ctx.globalAlpha=k;ctx.strokeStyle=p.color;ctx.lineWidth=p.size;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-p.vx*.03,p.y-p.vy*.03);ctx.stroke();}else dot(ctx,p.x,p.y,p.size*2.4,p.color,k*.8);}
  ctx.restore();return true;}

 // ---------------------------------------------------------------- hooks
 const castSkill=skill;skill=function(index){const mp=P.mp,result=castSkill(index);try{if(kiem()&&P.mp<mp)onCast(index);}catch{}return result;};
 const baseHit=hit;hit=function(enemy,power){const alive=enemy&&!enemy.dead&&enemy.hp>0,s=state(),result=baseHit(enemy,power);
  try{if(alive&&kiem()&&s&&!enemy.rewardReplay&&!window.petCombat?.dealing&&(s.flying.length||s.dash||s.field||s.ultimate))onHit(enemy);}catch{}return result;};
 const update=up;up=function(dt){update(dt);if(!paused())step(dt);};
 const draw=dr;dr=function(){draw();if(flash>0&&kiem()){g.save();g.setTransform(1,0,0,1,0,0);g.globalCompositeOperation='lighter';g.globalAlpha=flash*.55;g.fillStyle=flashColor;g.fillRect(0,0,W,H);g.restore();}};
 // Effects not tied to a live skill state (hit sparks after the swords return) still draw.
 const lateDraw=dr;dr=function(){lateDraw();if(!kiem()||!P.ap)return;const s=state();if(s&&(s.flying.length||s.dash||s.field||s.ultimate))return;
  if(!(parts.length||rings.length||arcs.length||beams.length||streaks.length))return;const c=gameCamera();g.save();g.setTransform(Z,0,0,Z,-c.x*Z,-c.y*Z);drawEffects(g,{flying:[],field:null,dash:null,ultimate:null});g.restore();};
 const respawn=classCombat.onRespawn;classCombat.onRespawn=function(...a){for(const l of [parts,rings,arcs,beams,streaks])l.length=0;flash=0;return respawn.apply(this,a);};
 window.kiemVfx={drawEffects,drawGround,onCast,onHit,seal,blade};
 // Which classes the new VFX own (the older flourish layers skip them).
 window.skillVfx={owns:cls=>cls===0};
})();
