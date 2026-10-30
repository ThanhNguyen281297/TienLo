/* Monsters and combat text in the wuxia style. Presentation only.
   - Damage numbers: bold serif digits in a gold-to-amber gradient with a dark brown
     outline; critical hits are larger, crimson-gold, shaken, under a "Bạo kích" tag.
   - Elite and boss monsters stand on a slowly turning red/gold seal.
   - The current target gets a rotating gold lock ring at its feet. */
(function(){
 'use strict';
 const TAU=Math.PI*2,reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const clock=()=>reduced.matches?0:(worldMap.environmentClock||performance.now()/1000);
 const grads=new Map();
 function grad(ctx,key,top,bot,h){let m=grads.get(ctx);if(!m){m=new Map();grads.set(ctx,m);}const k=key+h;if(!m.has(k)){const gr=ctx.createLinearGradient(0,-h,0,h*.2);gr.addColorStop(0,top);gr.addColorStop(1,bot);m.set(k,gr);}return m.get(k);}
 window.floatingText=function(ctx,f){if(!f.damage)return false;
  const age=.9-f.l,pop=age<.1?.7+age/.1*.5:1.2-Math.min(1,(age-.1)/.18)*.2,crit=!!f.critical,size=crit?16:12;
  ctx.save();ctx.translate(f.x+(crit&&age<.15?Math.sin(age*120)*1.5:0),f.y-age*(crit?10:16));ctx.scale(pop,pop);ctx.globalAlpha=Math.min(1,f.l*2.6);
  ctx.textAlign='center';ctx.lineJoin='round';ctx.font='900 '+size+'px "Noto Serif",Georgia,serif';const text=String(f.t);
  ctx.lineWidth=crit?3.6:3;ctx.strokeStyle='#2a0e04';ctx.strokeText(text,0,0);
  ctx.fillStyle=crit?grad(ctx,'c','#fff2a0','#ff3a1a',size):grad(ctx,'n','#fffbe6','#f0b040',size);ctx.fillText(text,0,0);
  if(crit){ctx.font='800 7px "Noto Serif",Georgia,serif';ctx.lineWidth=3;ctx.strokeText('Bạo kích',0,-size+2);ctx.fillStyle='#ffd27a';ctx.fillText('Bạo kích',0,-size+2);}
  ctx.restore();return true;};
 function seal(ctx,x,y,r,color,t,dash){ctx.save();ctx.translate(x,y);ctx.scale(1,.42);ctx.rotate(t);if(dash)ctx.setLineDash(dash);ctx.beginPath();ctx.arc(0,0,r,0,TAU);const fill=ctx.createRadialGradient(0,0,r*.2,0,0,r);fill.addColorStop(0,color+'00');fill.addColorStop(1,color+'55');ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle='#1e0804';ctx.lineWidth=6;ctx.stroke();ctx.strokeStyle=color;ctx.lineWidth=3.2;ctx.stroke();ctx.setLineDash([]);
  ctx.lineWidth=1;ctx.beginPath();for(let i=0;i<8;i++){const a=i/8*TAU;ctx.moveTo(Math.cos(a)*r*.7,Math.sin(a)*r*.7);ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.stroke();ctx.restore();}
 const target=()=>window.basicCombat?.state?.target||window.autoCombat?.state?.target||null;
 if(typeof mon==='function'){const base=mon;mon=function(e){
  if(!e.corpse&&typeof g!=='undefined'){const t=clock(),s=(T[e.t]?.s||18);
   if(e.boss||e.elite||e.t===2){g.save();g.globalAlpha=.95;seal(g,e.x,e.y,Math.max(38,s*1.7),e.boss?'#ffb020':'#ff3a2a',t*.6,null);g.globalAlpha=.55;seal(g,e.x,e.y,Math.max(46,s*2),e.boss?'#ffcf5a':'#ff5a4a',-t*.4,[6,6]);g.restore();}
   if(e===target()){g.save();g.globalAlpha=.9;seal(g,e.x,e.y,Math.max(28,s*1.3)+Math.sin(t*5)*1.5,'#ffe08a',t*1.5,[10,5]);g.restore();}}
  return base(e);};}
})();
