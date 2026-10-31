/* Character presence (graphics pass): the painted characters keep their art; this pass
   makes them feel alive and grounded in the scene. Presentation only.
   - Idle breathing, a light bounce and forward lean while walking, a lunge on attacks.
   - A long soft shadow cast away from the sun, plus a back-light halo in the scene's light.
   - Weapon enhancement aura (cường hóa), as in classic wuxia MMOs: +5 blue, +8 violet,
     +11 gold, +14 crimson; motes rise around the hero and a ring pulses at the feet.
   Applies to the world canvas only (UI previews are untouched). */
(function(){
 'use strict';
 if(typeof drawChar!=='function')return;
 const TAU=Math.PI*2,reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const clock=()=>reduced.matches?0:(worldMap.environmentClock||performance.now()/1000);
 const TIERS=[[14,'#ff4d5e','#ffd1d6'],[11,'#ffc44d','#fff2c4'],[8,'#b47cff','#ecdcff'],[5,'#5fb8ff','#d8f0ff']];
 const tierFor=level=>TIERS.find(t=>level>=t[0])||null;
 const sceneLight=()=>{const id=worldMap.state.scene,d=window.tienHiepLayouts?.scenes?.[id],th=d&&window.tienHiepLayouts.themes[d.theme];return th?.light||'#ffe6a8';};
 const night=()=>{const d=window.tienHiepLayouts?.scenes?.[worldMap.state.scene];return!!d&&['moonNight','storm','abyss','twilight','ember'].includes(d.theme);};
 function glow(ctx,x,y,r,color,a){if(a<=0)return;const gr=ctx.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,color);gr.addColorStop(1,'rgba(0,0,0,0)');ctx.save();ctx.globalAlpha=a;ctx.globalCompositeOperation='lighter';ctx.fillStyle=gr;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore();}
 function longShadow(ctx,x,y){ctx.save();ctx.translate(x+9,y+1);ctx.rotate(.35);ctx.scale(1,.32);const gr=ctx.createRadialGradient(0,0,0,0,0,26);gr.addColorStop(0,'rgba(15,20,25,.26)');gr.addColorStop(1,'rgba(15,20,25,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.ellipse(10,0,30,22,0,0,TAU);ctx.fill();ctx.restore();}
 function aura(ctx,x,y,tier,front,t){const [,main,hot]=tier;
  if(!front){ctx.save();ctx.translate(x,y+1);ctx.scale(1,.42);const pulse=.5+.5*Math.sin(t*3),r=17+pulse*3;
   ctx.globalAlpha=.55;ctx.strokeStyle='rgba(10,20,40,.5)';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.stroke();
   ctx.globalAlpha=.75+.25*pulse;ctx.strokeStyle=main;ctx.lineWidth=2.4;ctx.stroke();ctx.globalAlpha=.9;ctx.strokeStyle=hot;ctx.lineWidth=.8;ctx.stroke();
   for(let i=0;i<6;i++){const a=t*1.5+i*TAU/6;ctx.fillStyle=hot;ctx.globalAlpha=.9;ctx.beginPath();ctx.arc(Math.cos(a)*r,Math.sin(a)*r,1.6,0,TAU);ctx.fill();}ctx.restore();glow(ctx,x,y-20,30,main,.28);}
  for(let i=0;i<12;i++){const p=(t*.45+i/12)%1,a=i/12*TAU+t*.6,r=11+((i*7)%6),px=x+Math.cos(a)*r,behind=Math.sin(a)<0;if(behind===front)continue;const py=y-2-p*50,k=Math.sin(p*Math.PI);
   ctx.save();ctx.globalAlpha=k*.95;ctx.fillStyle=main;ctx.beginPath();ctx.arc(px,py,1.6+((i*13)%3)*.5,0,TAU);ctx.fill();ctx.fillStyle=hot;ctx.beginPath();ctx.arc(px,py,.8,0,TAU);ctx.fill();ctx.restore();glow(ctx,px,py,5,main,k*.6);}}
 const isHero=(x,y,ap)=>ap===P.ap&&Math.abs(x-P.x)<1&&Math.abs(y-P.y)<1;
 const base=drawChar,ghosts=[];
 drawChar=function(ctx,x,y,dir,facing,moving,phase,attacking,ap,...rest){
  if(typeof g==='undefined'||ctx!==g||!ap)return base.call(this,ctx,x,y,dir,facing,moving,phase,attacking,ap,...rest);
  const t=clock(),hero=isHero(x,y,ap),seed=(x*.013+y*.007)%TAU;
  longShadow(ctx,x,y);
  glow(ctx,x,y-22,night()?34:26,sceneLight(),night()?.22:.12);
  const level=hero?(P.world?.equip?.vukhi?.enhance|0):((ap.enhance??ap.weaponEnhance)|0),tier=tierFor(level);
  if(tier)aura(ctx,x,y,tier,false,t);
  // body motion: breathing when still, bounce and lean while walking, lunge while attacking
  let sx=1,sy=1,lift=0,lean=0,shift=0;
  if(moving){lift=Math.abs(Math.sin(t*9+seed))*1.6;lean=(dir===2?facing:0)*.045;}
  else{const b=Math.sin(t*2.1+seed);sy=1+b*.012;sx=1-b*.006;}
  if(attacking&&hero){const k=Math.max(0,P.sl||0)/.22;shift=(dir===2?facing:0)*2.5*k;}
  // Afterimages while dashing or blinking (hero only): fading copies along the path.
  if(hero&&window.vfxTrails){const dashing=!!window.classCombat?.isDashing?.();if(dashing)ghosts.push({x,y,dir,facing,phase});if(ghosts.length>5||(!dashing&&ghosts.length))ghosts.shift();
   ghosts.forEach((q,i)=>{ctx.save();ctx.globalAlpha=.12+.06*i;try{base.call(this,ctx,q.x,q.y,q.dir,q.facing,true,q.phase,false,ap,...rest);}catch{}ctx.restore();});}
  ctx.save();ctx.translate(x+shift,y-lift);ctx.transform(sx,0,-lean,sy,0,0);ctx.translate(-x,-y);
  try{return base.call(this,ctx,x,y,dir,facing,moving,phase,attacking,ap,...rest);}
  finally{ctx.restore();if(tier)aura(ctx,x,y,tier,true,t);}
 };
 window.characterPresence={tierFor,TIERS};
})();
/* Weapon in hand: while the hero's weapon is out in the world (a flying sword or crescent,
   a sword swing, a spear thrust or dash, the open fan), the copy in the hand is hidden, and
   it fades back in when the weapon returns. Returns the hand weapon's opacity (0..1). */
(function(){
 'use strict';
 let away=0,last=performance.now();
 const any=l=>Array.isArray(l)&&l.length>0;
 function out(){const w=P.ap?.w,b=window.basicCombat?.state;if(w==null)return false;
  if(b&&((b.swings||[]).some(s=>s.sect===w&&w!==3)||(b.projectiles||[]).some(p=>p.sect===w&&(w===0||w===1))||(w===3&&(b.casts||[]).some(c=>c.sect===3))))return true;
  if(w===0){const s=window.kiemCombat?.state;return!!s&&(any(s.flying)||!!s.dash||!!s.ultimate);}
  if(w===1){const s=window.moonCombat?.state;return!!s&&(any(s.flying)||!!s.ultimate);}
  const s=window.newClassCombat?.state;if(!s)return false;
  if(w===2)return!!s.dash||!!s.ultimate||(s.casts||[]).some(c=>c.index===1);
  return!!s.ultimate||(s.casts||[]).some(c=>c.index===1);}
 window.weaponHeld=function(ap,ctx){if(ap!==P.ap||typeof g==='undefined'||ctx!==g)return 1;
  const now=performance.now(),dt=Math.min(.1,(now-last)/1000);last=now;
  if(out()){away=1;return 0;}
  // back in the hand: a quick fade-in after the weapon returns
  away=Math.max(0,away-dt/.18);return 1-away;};
})();
