/* Combat feel: a fallen monster's spirit dissolves into rising light instead of
   simply vanishing. Presentation only; reads creatureArt.corpses. */
(function(){
 'use strict';
 const K=window.skillVfxKit,art=window.creatureArt;if(!K||!art?.corpses)return;
 const seen=new WeakSet();
 const base=up;up=function(dt){base(dt);if(paused())return;
  for(const c of art.corpses){if(seen.has(c))continue;seen.add(c);const s=(T[c.t]?.s||20),x=c.x,y=c.y-s*.5;
   K.burst(x,y,14,150,'#e8f6ff',.55,40,1.4);K.ring(x,c.y,4,s*1.6,.5,'#bfe9ff',2);
   for(let i=0;i<10;i++)K.parts.push({x:x+K.rnd(-s*.5,s*.5),y:y+K.rnd(-s*.4,s*.4),vx:K.rnd(-8,8),vy:K.rnd(-60,-28),g:0,age:0,life:K.rnd(.8,1.3),size:K.rnd(1.2,2.2),color:i%3?'#d7f3ff':'#fff4c8',kind:'mote'});}};
})();
/* The lacquer-and-gold UI skin (css/vltk-skin.css) must come after every stylesheet
   that scripts inject at start-up, so move its <link> after the last stylesheet in the document. */
(function(){const move=()=>{const l=document.querySelector('link[href$="vltk-skin.css"]'),all=[...document.querySelectorAll('link[rel=stylesheet],style')],last=all[all.length-1];if(l&&last&&last!==l)last.after(l);};
 move();addEventListener('load',move);setTimeout(move,1500);})();
/* iOS Safari ignores user-scalable=no: block pinch and double-tap zoom, and snap any
   accidental page scroll back to the origin so the HUD never drifts off screen. */
(function(){let lastTouch=0;
 for(const ev of ['gesturestart','gesturechange','gestureend'])document.addEventListener(ev,e=>e.preventDefault(),{passive:false});
 document.addEventListener('touchend',e=>{const now=Date.now();if(now-lastTouch<320&&!e.target.closest('input,textarea,select'))e.preventDefault();lastTouch=now;},{passive:false});
 document.addEventListener('touchmove',e=>{if(e.touches.length>1)e.preventDefault();},{passive:false});
 const snap=()=>{if(scrollX||scrollY)scrollTo(0,0);};addEventListener('scroll',snap,{passive:true});addEventListener('resize',snap);addEventListener('orientationchange',()=>setTimeout(snap,300));})();
