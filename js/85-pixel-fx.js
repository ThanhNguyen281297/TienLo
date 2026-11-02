/* Small one-shot pixel effects from pixelfx (MIT, © Patch & Hugo Duprez, see Skill/pixelfx/LICENSE).
   Only quick moments that happen around the painted art: hit sparks, critical hits,
   monster death puff, level up, heal, arrive after teleport, respawn and item success.
   The sheets are drawn with smoothing on and slightly translucent so the pixel edges
   blend with the HD art. Presentation only: no gameplay value is read or changed. */
(function(){
 'use strict';
 const M={poof:{w:83,h:73,cols:24,n:43,fps:30,px:38,py:63},spark:{w:115,h:67,cols:14,n:14,fps:30,px:28,py:55},crit:{w:163,h:121,cols:12,n:25,fps:30,px:67,py:93},heal:{w:44,h:81,cols:46,n:52,fps:30,px:22,py:71},blink:{w:90,h:86,cols:22,n:38,fps:30,px:45,py:72},respawn:{w:120,h:149,cols:17,n:35,fps:15,px:60,py:136},collect:{w:75,h:84,cols:27,n:33,fps:30,px:34,py:79},levelup:{w:154,h:133,cols:13,n:49,fps:15,px:77,py:111},butterfly:{w:106,h:74,cols:19,n:48,fps:15,px:53,py:38,loop:1},bird:{w:48,h:37,cols:36,n:36,fps:15,px:34,py:17,loop:1},bat:{w:98,h:60,cols:20,n:36,fps:15,px:53,py:27,loop:1},wisp:{w:119,h:93,cols:17,n:48,fps:15,px:60,py:87,loop:1},stun:{w:49,h:32,cols:41,n:60,fps:30,px:24,py:54,loop:1},spawn:{w:192,h:128,cols:10,n:54,fps:15,px:92,py:102},lootbeam:{w:61,h:166,cols:33,n:36,fps:15,px:30,py:159,loop:1},chest:{w:166,h:78,cols:12,n:66,fps:15,px:84,py:65},coin:{w:35,h:35,cols:48,n:48,fps:30,px:17,py:33,loop:1},confetti:{w:193,h:92,cols:10,n:50,fps:15,px:96,py:80},rune:{w:114,h:85,cols:17,n:60,fps:15,px:57,py:66,loop:1}};
 const img={},fx=[],reduced=matchMedia('(prefers-reduced-motion: reduce)'),lastSpark=new WeakMap();
 const MAX=matchMedia('(pointer:coarse)').matches?16:28;
 let last=performance.now(),lastHp=null,quiet=0;
 function sheet(k){let i=img[k];if(!i){i=img[k]=new Image();i.decoding='async';i.src=(window.artworkURL||(s=>s))('Skill/pixelfx/'+k+'.webp');}return i;}
 const particles=()=>window.graphicsQuality?.particles??1;
 /* opts: center=true anchors the frame centre (impacts) instead of its ground pivot;
    follow=true keeps it on the player as they move. */
 function play(k,x,y,o={}){
  if(reduced.matches||!M[k])return;
  const i=sheet(k);fx.push({k,x,y,age:0,scale:o.scale||2,alpha:o.alpha??.92,flip:!!o.flip,center:!!o.center,follow:!!o.follow,add:!!o.add,life:o.life||0,vy:o.vy||0});
  if(fx.length>MAX)fx.shift();return i;
 }
 function draw(e){
  const m=M[e.k];let f=Math.floor(e.age*m.fps),alpha=e.alpha;
  // Looping sheets play for `life` seconds and fade out over the last 0.4 s.
  if(e.life){if(e.age>=e.life){e.done=true;return;}f%=m.n;alpha*=Math.min(1,(e.life-e.age)/.4);}
  else if(f>=m.n){e.done=true;return;}
  frame(g,e.k,f,e.follow?P.x:e.x,(e.follow?P.y:e.y)-e.vy*e.age,{scale:e.scale,alpha,flip:e.flip,center:e.center,add:e.add});
 }
 // Draws frame f of sheet k with its ground pivot (or centre) at x,y in the current transform.
 function frame(ctx,k,f,x,y,o={}){
  const m=M[k],i=sheet(k);if(!i.complete||!i.naturalWidth)return false;f=((f%m.n)+m.n)%m.n;
  const s=o.scale||2,sx=(f%m.cols)*m.w,sy=Math.floor(f/m.cols)*m.h,ax=o.center?m.w/2:m.px,ay=o.center?m.h/2:m.py;
  ctx.save();ctx.globalAlpha*=o.alpha??.92;if(o.add)ctx.globalCompositeOperation='lighter';ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.translate(x,y);if(o.flip)ctx.scale(-1,1);
  ctx.drawImage(i,sx,sy,m.w,m.h,-ax*s,-ay*s,m.w*s,m.h*s);ctx.restore();return true;
 }

 /* Hits: a small spark per enemy (throttled), a bigger burst on critical hits.
    damageNumber knows if the hit was critical, so it records it for hit(). */
 let critical=false;
 const baseNumber=damageNumber;
 damageNumber=function(x,y,value,crit=false){if(crit)critical=true;return baseNumber.apply(this,arguments);};
 const baseHit=hit;
 hit=function(enemy,power){
  const alive=enemy&&!enemy.dead&&enemy.hp>0;critical=false;
  const result=baseHit.apply(this,arguments);
  try{
   if(alive&&P.ap&&!enemy.rewardReplay){
    const k=T[enemy.t]||{s:40},cy=enemy.y-k.s*.55,now=performance.now();
    if((enemy.hp<=0||enemy.dead)&&!enemy.pixelPoof&&(enemy.pixelPoof=1))play('poof',enemy.x,enemy.y+4,{scale:Math.max(1.6,Math.min(3,k.s/34)),alpha:.85});
    else if(critical&&particles()>=.3)play('crit',enemy.x,cy,{center:true,scale:1.25,add:true,flip:enemy.x<P.x});
    else if(particles()>=.5&&now-(lastSpark.get(enemy)||0)>220){lastSpark.set(enemy,now);play('spark',enemy.x+(enemy.x<P.x?8:-8),cy,{center:true,scale:1.1,add:true,alpha:.85,flip:enemy.x<P.x});}
   }
  }catch(e){}
  critical=false;return result;
 };

 // Online the server decides kills; the world update reports them through creatureArt.
 if(window.creatureArt?.onNetworkDamage){const base=creatureArt.onNetworkDamage;creatureArt.onNetworkDamage=function(e,dead){
  try{if(dead&&e&&!e.pixelPoof){e.pixelPoof=1;const k=T[e.t]||{s:40};play('poof',e.x,e.y+4,{scale:Math.max(1.6,Math.min(3,k.s/34)),alpha:.85});}}catch(err){}
  return base.apply(this,arguments);};}
 addEventListener('tienlo-level-up',()=>{if(P.ap)play('levelup',P.x,P.y+6,{scale:1.7,follow:true});});
 addEventListener('tienlo-item-success',()=>{if(P.ap)play('collect',P.x,P.y-30,{scale:1.6,follow:true});});
 // Arriving on a new map (portal, recall, NPC transfer). Respawn shows its own beam.
 const baseSwitch=worldMap.switchScene;
 worldMap.switchScene=function(...args){const before=worldMap.state.scene,result=baseSwitch.apply(this,args);
  if(P.ap&&worldMap.state.scene!==before&&performance.now()>quiet)setTimeout(()=>play('blink',P.x,P.y+4,{scale:1.6,follow:true,alpha:.8}),120);return result;};
 if(worldMap.respawn){const baseRespawn=worldMap.respawn;worldMap.respawn=function(...args){quiet=performance.now()+1500;const result=baseRespawn.apply(this,args);
  setTimeout(()=>{if(P.ap)play('respawn',P.x,P.y+6,{scale:1.6,follow:true});},150);return result;};}

 const baseDraw=dr;
 dr=function(){
  baseDraw();
  const now=performance.now(),dt=Math.min(.05,(now-last)/1000);last=now;
  if(!P.ap){fx.length=0;lastHp=null;return;}
  // Healing: a jump of at least 18% max HP in one frame (potion, skill, pet heal).
  try{const max=mhp();if(lastHp!==null&&P.hp>0&&lastHp>0&&P.hp-lastHp>=max*.18)play('heal',P.x,P.y+4,{scale:1.6,follow:true});lastHp=P.hp;}catch(e){}
  if(!fx.length)return;
  try{
   const cam=gameCamera();g.save();g.setTransform(Z,0,0,Z,-cam.x*Z,-cam.y*Z);
   for(const e of fx){e.age+=dt;draw(e);}
   g.restore();
  }catch(e){fx.length=0;}
  for(let i=fx.length-1;i>=0;i--)if(fx[i].done)fx.splice(i,1);
 };
 // Warm the small, frequent sheets once the player is in the world.
 addEventListener('tienlo-auth',()=>setTimeout(()=>['spark','poof','crit'].forEach(sheet),1500));
 window.pixelFx={play,frame,sheet,sheets:M,reduced:()=>reduced.matches,particles};
})();
