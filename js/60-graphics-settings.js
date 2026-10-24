/* Graphics quality: Cao / Vừa / Thấp / Tự động (⚙ menu). Presentation only.
   window.graphicsQuality is read every frame by:
     01-core-game rs()      canvas density (minDensity..maxDensity × screen)
     38-cinematic-world     haze + sun shafts       (cinematic)
     41-color-grade         self-overlay contrast   (post)
     58-lighting            night bloom             (bloom)
     32c / 39 particles     ambient particle count  (particles, 0..1)
   "Tự động" picks Vừa on touch devices with ≤4 cores or ≤4 GB, otherwise Cao,
   and steps down once if the measured frame cost stays high. */
(function(){
 'use strict';
 const LEVELS={
  high:{label:'Cao',minDensity:1.5,maxDensity:3,post:true,cinematic:true,bloom:true,particles:1},
  medium:{label:'Vừa',minDensity:1.25,maxDensity:2,post:false,cinematic:true,bloom:true,particles:.6},
  low:{label:'Thấp',minDensity:1,maxDensity:1.25,post:false,cinematic:false,bloom:false,particles:.3}};
 const ORDER=['auto','high','medium','low'];
 let choice='auto';try{choice=localStorage.getItem('tienlo.gfx')||'auto';}catch{}
 if(!ORDER.includes(choice))choice='auto';
 const weak=()=>matchMedia('(pointer:coarse)').matches&&((navigator.hardwareConcurrency||8)<=4||(navigator.deviceMemory||8)<=4);
 let autoLevel=weak()?'medium':'high';
 function apply(){const level=choice==='auto'?autoLevel:choice;window.graphicsQuality={level,choice,...LEVELS[level]};if(typeof rs==='function')rs();label();}

 // Auto: if a frame of the scene keeps costing > 26 ms for ~4 s, drop one level (once per step).
 let slow=0,lastCheck=performance.now();
 setInterval(()=>{if(choice!=='auto'||document.hidden||!P.ap)return;const cost=window.colorGrade?.frameCost||0,now=performance.now(),dt=(now-lastCheck)/1000;lastCheck=now;
  slow=cost>26?slow+dt:Math.max(0,slow-dt);if(slow>4&&autoLevel!=='low'){autoLevel=autoLevel==='high'?'medium':'low';slow=0;apply();}},1000);

 // ---------- ⚙ menu entry
 const button=document.createElement('button');button.type='button';button.id='graphics-toggle';
 function label(){const q=window.graphicsQuality;if(!q)return;button.textContent='Đồ hoạ: '+(q.choice==='auto'?'Tự động · '+LEVELS[q.level].label:LEVELS[q.level].label);}
 button.onclick=()=>{choice=ORDER[(ORDER.indexOf(choice)+1)%ORDER.length];try{localStorage.setItem('tienlo.gfx',choice);}catch{}apply();
  msg('Chất lượng đồ hoạ: '+(choice==='auto'?'Tự động':LEVELS[choice].label)+'.');};
 const badge=$('account-badge');if(badge)badge.append(button);
 const css=document.createElement('style');css.textContent=`#graphics-toggle{margin-top:4px;padding:5px 10px;border-radius:8px;border:1px solid #c9a96088;background:#14262e;color:#f3e3b4;font:600 12px Arial;min-height:0!important;cursor:pointer}`;document.head.append(css);
 apply();
 window.graphicsSettings={LEVELS,apply,get choice(){return choice;},set(level){if(ORDER.includes(level)){choice=level;apply();}}};
})();
