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
  const head=-1.1*sign+2.2*sign*ease((p-.04)/.3),bx=x+Math.cos(s.angle+head)*22,by=y+Math.sin(s.angle+head)*14;blade(ctx,bx,by,s.angle+head+sign*Math.PI/2*.6,40,a*(1-ease((p-.35)/.3)),c.main);
  S.wave(ctx,x,y+8,s.angle,24+r*.8*ease(p/.7),1.5,16,c.main,a);S.wave(ctx,x,y+8,s.angle,18+r*.6*ease(p/.7),1.1,8,c.hot,a*.8);}
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
 function fan(ctx,cst){const p=life(cst),c=PAL[3],a=env(p),open=ease(p/.35),x=cst.x+Math.cos(cst.angle)*14,y=cst.y-H-6+Math.sin(cst.angle)*10,span=1.9*open,len=40;
  ctx.save();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=a*.85;ctx.fillStyle='#fff0bf';ctx.beginPath();ctx.moveTo(x,y);
  for(let i=0;i<=12;i++){const k=cst.angle-span/2+span*i/12;ctx.lineTo(x+Math.cos(k)*len,y+Math.sin(k)*len*.8);}ctx.closePath();ctx.fill();
  ctx.strokeStyle='#c8382a';ctx.lineWidth=1;ctx.beginPath();for(let i=0;i<=12;i++){const k=cst.angle-span/2+span*i/12;ctx[i?'lineTo':'moveTo'](x+Math.cos(k)*len*.72,y+Math.sin(k)*len*.72*.8);}ctx.stroke();
  ctx.strokeStyle='#b07a24';ctx.lineWidth=1.2;for(let i=0;i<=8;i++){const k=cst.angle-span/2+span*i/8;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(k)*len,y+Math.sin(k)*len*.8);ctx.stroke();}
  ctx.restore();dot(ctx,x,y,10,c.main,a*.6);}

 // ------------------------------------------------------------- projectiles
 function projectile(ctx,p){const sect=p.sect,c=PAL[sect],dir=p.viewAngle??p.angle,y=p.y-H,a=p.returning?.75:1;
  if(sect===0){dot(ctx,p.x,y,26,c.main,a*.35);blade(ctx,p.x,y,dir,p.step===3?44:52,a,c.main);dot(ctx,p.x+Math.cos(dir)*18,y+Math.sin(dir)*18,16,c.hot,a*.7);}
  else if(sect===1){const big=p.step===2;dot(ctx,p.x,y,big?34:24,c.main,a*.4);S.crescent(ctx,p.x,y,big?24:17,p.age*16,a,c.main);}
  else if(sect===3){dot(ctx,p.x,y,22,c.jade,a*.35);S.talisman(ctx,p.x,y,dir,p.step===2?24:18,a,p.age*20);}}

 // ------------------------------------------------------------- impacts (spawned once per effect)
 function impact(e){const c=PAL[e.sect],x=e.x,y=e.y-H+4,r=Math.min(38,e.radius||22);
  if(e.kind==='impact'){const a0=rnd(0,Math.PI);K.arcs.push({x,y,angle:a0,r:20,age:0,life:.22,color:c.main,span:1.8,width:5,core:c.core});K.arcs.push({x,y,angle:a0+1.6,r:16,age:0,life:.2,color:c.hot,span:1.4,width:3,core:c.core});burst(x,y,12,190,c.hot,.34,12,1.4);ring(x,y+12,3,24,.28,c.main,1.8);if(e.sect===2)S.bolt(x,y,x+rnd(-26,26),y+rnd(-14,14),.16,c.main,1.2,0);}
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
