/* Basic attack VFX (đánh thường) for all four sects, in the same code-drawn wuxia style
   as the skills (js/68, js/69). Presentation only: js/22-basic-combos.js decides timing,
   hits and damage; js/23 hands its drawing here.
   - Kiếm Tông: a sword flash that releases a flying crescent of sword-qi, flying swords, a cross cut.
   No trails anywhere: energy is drawn as shapes (waves, glints, halos), never as smears.
   - Minh Nguyệt: spinning frost crescents that fly out and return.
   - Lôi Thương: lightning spear thrusts, a crackling wide sweep, a bolt on the finisher.
   - Thiên Cơ: a golden folding fan flicks paper talismans that burst into seals.
   Every blow lands with sparks; finishers add a short hit-stop and screen kick. */
(function(){
 'use strict';
 const C=window.basicCombat,K=window.skillVfxKit,S=window.skillVfxShapes;if(!C||!K||!S)return;
 const {TAU,rnd,clamp,ease,dot,blade,burst,ring,kick,hitstop}=K;
 const H=18,seen=new WeakSet();
 const PAL=[{main:'#7fe8ff',core:'#ffffff',hot:'#d8fbff',deep:'#2a9bff',gold:'#ffe7a3'},
  {main:'#7fdcff',core:'#ffffff',hot:'#e8fbff',deep:'#3a7bff',mint:'#9fffe0'},
  {main:'#b48cff',core:'#ffffff',hot:'#efe4ff',deep:'#6a4cff',blue:'#8fb8ff'},
  {main:'#ffd36b',core:'#ffffff',hot:'#fff6d8',deep:'#c98a2a',jade:'#6dffc4'}];
 const life=o=>clamp(o.age/(o.duration||.3),0,1);
 const env=p=>Math.min(1,p/.08)*(1-ease((p-.55)/.45));

 // ------------------------------------------------------------- swings
 // Kiếm Tông: the sword flashes across and releases a crescent of sword-qi that flies ahead.
 function kiemSwing(ctx,s){const p=life(s),c=PAL[0],sign=s.step===1?-1:1,x=s.x,y=s.y-H,a=env(p),r=(s.radius||82);
  // the sword sweeps through a wide arc in front of the hero, then a crescent of qi flies on
  const head=-.95*sign+1.9*sign*ease((p-.02)/.4),cx=x+Math.cos(s.angle)*30,cy=y+Math.sin(s.angle)*18,R=26,bx=cx+Math.cos(s.angle+head)*R,by=cy+Math.sin(s.angle+head)*R*.62;
  blade(ctx,bx,by,s.angle+head,84,Math.min(1,p/.06)*(1-ease((p-.6)/.3)),c.main);
  if(p>.25)S.wave(ctx,x,y+8,s.angle,34+r*.7*ease((p-.25)/.6),1.1,7,c.main,a*.6);}
 // Lôi Thương: the spear thrusts out; lightning crackles only around the tip.
 function spearThrust(ctx,s,side){const p=life(s),c=PAL[2],r=s.radius||115,heavy=s.step===3,x=s.x-Math.sin(s.angle)*side*6,y=s.y-H+Math.cos(s.angle)*side*4,a=env(p);
  const reach=14+(r*.78-14)*ease((p-.04)/.3)*(1-.5*ease((p-.55)/.45)),tx=x+Math.cos(s.angle)*reach,ty=y+Math.sin(s.angle)*reach*.8;
  S.spear(ctx,tx-Math.cos(s.angle)*20,ty-Math.sin(s.angle)*16,s.angle,heavy?92:72,a);dot(ctx,tx,ty,heavy?40:26,c.main,a*.6);dot(ctx,tx,ty,heavy?16:10,c.core,a);
  if(Math.random()<.7)S.drawBolt(ctx,S.jag(tx,ty,tx+rnd(-18,18),ty+rnd(-14,14),5,4),1.2,c.hot,a);}
 function spearSweep(ctx,s){const p=life(s),c=PAL[2],r=(s.radius||115)*.8,x=s.x,y=s.y-H+8,a=env(p),head=-1.85+3.7*ease((p-.08)/.5);
  S.wave(ctx,x,y,s.angle,30+r*ease(p/.6),3.2,24,c.main,a);const tip={x:x+Math.cos(s.angle+head)*r*.7,y:y+Math.sin(s.angle+head)*r*.42};
  S.spear(ctx,(x+tip.x)/2,(y-6+tip.y)/2,Math.atan2(tip.y-y+6,tip.x-x),r,a);if(Math.random()<.6)S.drawBolt(ctx,S.jag(tip.x,tip.y,tip.x+rnd(-20,20),tip.y+rnd(-14,14),5,4),1.3,c.hot,a);}
 function fanGust(ctx,s){const p=life(s),c=PAL[3],a=env(p);S.wave(ctx,s.x,s.y-H+6,s.angle,30+90*ease(p),1.1,14,c.jade,a*.85);}

 // ------------------------------------------------------------- casts (Thiên Cơ folding fan)
 function fan(ctx,cst){const p=life(cst),c=PAL[3],a=env(p),open=ease(p/.35),x=cst.x+Math.cos(cst.angle)*16,y=cst.y-H-6+Math.sin(cst.angle)*10;
  // the painted fan snaps open toward the target, then flicks the talisman out
  if(!S.weaponArt(ctx,'quat',x,y,cst.angle+Math.PI/2+(1-open)*.6,34+22*open,a,c.jade))dot(ctx,x,y,10,c.main,a*.6);}

 // ------------------------------------------------------------- projectiles
 function projectile(ctx,p){const sect=p.sect,c=PAL[sect],dir=p.viewAngle??p.angle,y=p.y-H,a=p.returning?.75:1;
  if(sect===0){dot(ctx,p.x,y,26,c.main,a*.35);blade(ctx,p.x,y,dir,p.step===3?72:86,a,c.main);dot(ctx,p.x+Math.cos(dir)*18,y+Math.sin(dir)*18,16,c.hot,a*.7);}
  else if(sect===1){const big=p.step===2;dot(ctx,p.x,y,big?34:24,c.main,a*.4);S.crescent(ctx,p.x,y,big?24:17,p.age*16,a,c.main);}
  else if(sect===3){dot(ctx,p.x,y,22,c.jade,a*.35);S.talisman(ctx,p.x,y,dir,p.step===2?24:18,a,p.age*20);}}

 // ------------------------------------------------------------- impacts (spawned once per effect)
 function impact(e){const c=PAL[e.sect],x=e.x,y=e.y-H+4,r=Math.min(38,e.radius||22);
  if(e.kind==='impact'){const a0=rnd(0,Math.PI);K.arcs.push({x,y,angle:a0,r:12,age:0,life:.22,color:c.main,span:1.8,width:5,core:c.core});burst(x,y,10,190,c.main,.34,12,1.2);ring(x,y+12,3,24,.28,c.main,1.8);if(e.sect===2)S.bolt(x,y,x+rnd(-26,26),y+rnd(-14,14),.16,c.main,1.2,0);}
  else if(e.kind==='x'){for(const a of [-.7,.7])K.arcs.push({x,y,angle:a+Math.PI/2,r:24,age:0,life:.3,color:c.main,span:2.6,width:6,core:c.core});burst(x,y,18,220,c.hot,.45,20,1.6);ring(x,y+12,4,40,.4,c.main,2.6);kick(2.2,.08,c.hot);hitstop(.05);K.dust(x,y+14,6,26);}
  else if(e.kind==='converge'){ring(x,y+10,6,r*1.6,.4,c.main,2.6);burst(x,y,16,180,c.hot,.45,10,1.4);for(let i=0;i<3;i++){const a=i*TAU/3;K.arcs.push({x:x+Math.cos(a)*10,y:y+Math.sin(a)*6,angle:a,r:16,age:0,life:.3,color:c.mint,span:2,width:4,core:c.core});}kick(1.6);hitstop(.04);}
  else if(e.kind==='lightning'){S.bolt(x+rnd(-12,12),y-150,x,y,.32,c.main,3.5,2);ring(x,y+12,4,44,.4,c.hot,2.6);burst(x,y,18,220,c.hot,.45,20,1.5);kick(2.6,.1,c.hot);hitstop(.05);K.dust(x,y+14,8,30);}
  else if(e.kind==='explode'){ring(x,y+12,6,r*1.8,.45,c.main,3);ring(x,y+12,4,r*1.2,.35,c.jade,2);burst(x,y,22,230,c.main,.5,30,1.6);for(let i=0;i<5;i++)K.parts.push({x,y,vx:rnd(-70,70),vy:rnd(-90,-30),g:120,age:0,life:rnd(.5,.8),size:rnd(1.4,2.2),color:'#fff0bf',kind:'mote'});kick(2.2,.08,c.hot);hitstop(.04);}
  else if(e.kind==='seal'){ring(x,y+10,3,22,.3,c.jade,1.6);}}
 function sealMark(ctx,e){const p=life(e),a=(1-p);S.talisman(ctx,e.x,e.y-H-10-p*8,-Math.PI/2,12,a,e.age*10);}

 // ------------------------------------------------------------- frame
 function draw(ctx,state){if(!P.ap)return false;
  for(const e of state.effects||[])if(!seen.has(e)){seen.add(e);try{impact(e);}catch{}}
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.imageSmoothingQuality='high';
  for(const cst of state.casts||[])if(cst.sect===3)fan(ctx,cst);
  for(const s of state.swings||[]){if(s.sect===0)kiemSwing(ctx,s);else if(s.sect===2){if(s.step===2)spearSweep(ctx,s);else for(const side of s.step===1?[-1,1]:[0])spearThrust(ctx,s,side);}else if(s.sect===3)fanGust(ctx,s);}
  for(const p of state.projectiles||[])projectile(ctx,p);
  for(const e of state.effects||[])if(e.kind==='seal')sealMark(ctx,e);
  ctx.restore();return true;}
 window.basicVfx={draw};
})();
