/* Small one-shot pixel effects from pixelfx (MIT, © Patch & Hugo Duprez, see Skill/pixelfx/LICENSE).
   Only quick moments that happen around the painted art: hit sparks, critical hits,
   monster death puff, level up, heal, arrive after teleport, respawn and item success.
   The sheets are drawn with smoothing on and slightly translucent so the pixel edges
   blend with the HD art. Presentation only: no gameplay value is read or changed. */
(function(){
 'use strict';
 const M={poof:{w:83,h:73,cols:24,n:43,fps:30,px:38,py:63},spark:{w:115,h:67,cols:14,n:14,fps:30,px:28,py:55},crit:{w:163,h:121,cols:12,n:25,fps:30,px:67,py:93},heal:{w:44,h:81,cols:46,n:52,fps:30,px:22,py:71},blink:{w:90,h:86,cols:22,n:38,fps:30,px:45,py:72},respawn:{w:120,h:149,cols:17,n:35,fps:15,px:60,py:136},collect:{w:75,h:84,cols:27,n:33,fps:30,px:34,py:79},levelup:{w:154,h:133,cols:13,n:49,fps:15,px:77,py:111}};
 const img={},fx=[],reduced=matchMedia('(prefers-reduced-motion: reduce)'),lastSpark=new WeakMap();
 const MAX=matchMedia('(pointer:coarse)').matches?16:28;
 let last=performance.now(),lastHp=null,quiet=0;
 function sheet(k){let i=img[k];if(!i){i=img[k]=new Image();i.decoding='async';i.src=(window.artworkURL||(s=>s))('Skill/pixelfx/'+k+'.webp');}return i;}
 const particles=()=>window.graphicsQuality?.particles??1;
 /* opts: center=true anchors the frame centre (impacts) instead of its ground pivot;
    follow=true keeps it on the player as they move. */
 function play(k,x,y,o={}){
  if(reduced.matches||!M[k])return;
  const i=sheet(k);fx.push({k,x,y,age:0,scale:o.scale||2,alpha:o.alpha??.92,flip:!!o.flip,center:!!o.center,follow:!!o.follow,add:!!o.add});
  if(fx.length>MAX)fx.shift();return i;
 }
 function draw(e){
  const m=M[e.k],i=img[e.k],f=Math.floor(e.age*m.fps);if(f>=m.n){e.done=true;return;}
  if(!i?.complete||!i.naturalWidth)return;
  const x=e.follow?P.x:e.x,y=e.follow?P.y:e.y,s=e.scale,sx=(f%m.cols)*m.w,sy=Math.floor(f/m.cols)*m.h;
  const ax=e.center?m.w/2:m.px,ay=e.center?m.h/2:m.py;
  g.save();g.globalAlpha=e.alpha;if(e.add)g.globalCompositeOperation='lighter';g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
  g.translate(x,y);if(e.flip)g.scale(-1,1);
  g.drawImage(i,sx,sy,m.w,m.h,-ax*s,-ay*s,m.w*s,m.h*s);g.restore();
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
 window.pixelFx={play,sheets:M};
})();
