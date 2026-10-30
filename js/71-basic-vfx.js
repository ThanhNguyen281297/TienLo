/* Basic attack VFX (đánh thường) for all four sects, in the same code-drawn wuxia style
   as the skills (js/68, js/69). Presentation only: js/22-basic-combos.js decides timing,
   hits and damage; js/23 hands its drawing here.
   - Kiếm Tông: sword-qi crescents that sweep and leave a ribbon, flying swords, a cross cut.
   - Minh Nguyệt: spinning frost crescents that fly out and return.
   - Lôi Thương: lightning spear thrusts, a crackling wide sweep, a bolt on the finisher.
   - Thiên Cơ: a golden folding fan flicks paper talismans that burst into seals.
   Every blow lands with sparks; finishers add a short hit-stop and screen kick. */
(function(){
 'use strict';
 const C=window.basicCombat,K=window.skillVfxKit,S=window.skillVfxShapes;if(!C||!K||!S)return;
 const {TAU,rnd,clamp,ease,dot,ribbon,blade,burst,ring,kick,hitstop}=K;
 const H=18,seen=new WeakSet();
 const PAL=[{main:'#7fe8ff',core:'#ffffff',hot:'#d8fbff',deep:'#2a9bff',gold:'#ffe7a3'},
  {main:'#7fdcff',core:'#ffffff',hot:'#e8fbff',deep:'#3a7bff',mint:'#9fffe0'},
  {main:'#b48cff',core:'#ffffff',hot:'#efe4ff',deep:'#6a4cff',blue:'#8fb8ff'},
  {main:'#ffd36b',core:'#ffffff',hot:'#fff6d8',deep:'#c98a2a',jade:'#6dffc4'}];
 const life=o=>clamp(o.age/(o.duration||.3),0,1);
 const env=p=>Math.min(1,p/.08)*(1-ease((p-.55)/.45));
 // Points on an iso arc around (x,y): angle offsets a0..a1 relative to the facing.
 const arcPoints=(x,y,face,r,a0,a1,n=16)=>Array.from({length:n+1},(_,i)=>{const a=face+a0+(a1-a0)*i/n;return{x:x+Math.cos(a)*r,y:y+Math.sin(a)*r*.62};});

 // Dark underlay so light effects stay readable on bright jade and snow.
 function under(ctx,pts,w,a){if(pts.length<2)return;const op=ctx.globalCompositeOperation;ctx.globalCompositeOperation='source-over';ctx.globalAlpha=a*.3;ctx.strokeStyle='#0a2440';ctx.lineWidth=w;ctx.lineCap=ctx.lineJoin='round';ctx.beginPath();pts.forEach((q,i)=>i?ctx.lineTo(q.x,q.y+2):ctx.moveTo(q.x,q.y+2));ctx.stroke();ctx.globalCompositeOperation=op;}
 // ------------------------------------------------------------- swings
 function kiemSwing(ctx,s){const p=life(s),c=PAL[0],sign=s.step===1?-1:1,r=(s.radius||82)*.95,x=s.x,y=s.y-H,a=env(p);
  const start=-1.2*sign,head=start+2.4*sign*ease((p-.06)/.34);if(Math.abs(head-start)<.05)return;
  const pts=arcPoints(x,y,s.angle,r,start,head),inner=arcPoints(x,y,s.angle,r*.78,start,head);
  under(ctx,pts,26,a);ribbon(ctx,pts,24,c.main,a);ribbon(ctx,inner,12,c.hot,a*.8);ribbon(ctx,arcPoints(x,y,s.angle,r*1.12,start,head),6,c.deep,a*.6);
  for(let k=3;k>=1;k--){const q=pts[Math.max(0,pts.length-1-k*3)],q2=pts[Math.max(0,pts.length-2-k*3)]||q;blade(ctx,q.x,q.y,Math.atan2(q.y-q2.y,q.x-q2.x),40,a*(.25-k*.05),c.main);}
  const tip=pts[pts.length-1],prev=pts[pts.length-2]||tip;blade(ctx,tip.x,tip.y,Math.atan2(tip.y-prev.y,tip.x-prev.x),44,a,c.main);
  dot(ctx,tip.x,tip.y,22,c.hot,a*.7);}
 function spearThrust(ctx,s,side){const p=life(s),c=PAL[2],r=s.radius||115,heavy=s.step===3,x=s.x-Math.sin(s.angle)*side*6,y=s.y-H+Math.cos(s.angle)*side*4,a=env(p);
  const reach=14+(r*.78-14)*ease((p-.04)/.3)*(1-.5*ease((p-.55)/.45)),tx=x+Math.cos(s.angle)*reach,ty=y+Math.sin(s.angle)*reach*.8;
  const line=[{x,y},{x:(x+tx)/2,y:(y+ty)/2},{x:tx,y:ty}];under(ctx,line,heavy?30:22,a);ribbon(ctx,line,heavy?30:20,c.main,a*.85);ribbon(ctx,line,heavy?12:8,c.hot,a*.8);
  S.spear(ctx,tx-Math.cos(s.angle)*20,ty-Math.sin(s.angle)*16,s.angle,heavy?92:72,a);
  if(Math.random()<.6)S.drawBolt(ctx,S.jag(x,y,tx,ty,heavy?8:5,6),heavy?1.8:1.1,c.hot,a);
  dot(ctx,tx,ty,heavy?36:24,c.hot,a*.8);}
 function spearSweep(ctx,s){const p=life(s),c=PAL[2],r=(s.radius||115)*.8,x=s.x,y=s.y-H+8,a=env(p),start=-1.85,head=start+3.7*ease((p-.08)/.5);
  const pts=arcPoints(x,y,s.angle,r,start,head,20);under(ctx,pts,30,a);S.sweep(ctx,pts,30,c.main,a);S.drawBolt(ctx,pts.map(q=>({x:q.x+rnd(-4,4),y:q.y+rnd(-3,3)})),1.4,c.hot,a);
  const tip=pts[pts.length-1];S.spear(ctx,(x+tip.x)/2,(y-6+tip.y)/2,Math.atan2(tip.y-y+6,tip.x-x),r*1.05,a);dot(ctx,tip.x,tip.y,20,c.hot,a*.7);}
 function fanGust(ctx,s){const p=life(s),c=PAL[3],a=env(p),r=40+80*ease(p),pts=arcPoints(s.x,s.y-H+6,s.angle,r,-.55,.55,12);under(ctx,pts,16,a);S.sweep(ctx,pts,16,c.jade,a*.85);}

 // ------------------------------------------------------------- casts (Thiên Cơ folding fan)
 function fan(ctx,cst){const p=life(cst),c=PAL[3],a=env(p),open=ease(p/.35),x=cst.x+Math.cos(cst.angle)*14,y=cst.y-H-6+Math.sin(cst.angle)*10,span=1.9*open,len=40;
  ctx.save();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=a*.85;ctx.fillStyle='#fff0bf';ctx.beginPath();ctx.moveTo(x,y);
  for(let i=0;i<=12;i++){const k=cst.angle-span/2+span*i/12;ctx.lineTo(x+Math.cos(k)*len,y+Math.sin(k)*len*.8);}ctx.closePath();ctx.fill();
  ctx.strokeStyle='#c8382a';ctx.lineWidth=1;ctx.beginPath();for(let i=0;i<=12;i++){const k=cst.angle-span/2+span*i/12;ctx[i?'lineTo':'moveTo'](x+Math.cos(k)*len*.72,y+Math.sin(k)*len*.72*.8);}ctx.stroke();
  ctx.strokeStyle='#b07a24';ctx.lineWidth=1.2;for(let i=0;i<=8;i++){const k=cst.angle-span/2+span*i/8;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(k)*len,y+Math.sin(k)*len*.8);ctx.stroke();}
  ctx.restore();dot(ctx,x,y,10,c.main,a*.6);}

 // ------------------------------------------------------------- projectiles
 function projectile(ctx,p){const sect=p.sect,c=PAL[sect],dir=p.viewAngle??p.angle,y=p.y-H,a=p.returning?.75:1,trail=[...p.trail.map(t=>({x:t.x,y:t.y-H})),{x:p.x,y}];
  if(sect===0){under(ctx,trail,18,a);ribbon(ctx,trail,p.step===3?16:20,c.main,a);blade(ctx,p.x,y,dir,p.step===3?44:52,a,c.main);dot(ctx,p.x+Math.cos(dir)*18,y+Math.sin(dir)*18,16,c.hot,a*.7);}
  else if(sect===1){const big=p.step===2;under(ctx,trail,big?22:16,a);ribbon(ctx,trail,big?24:16,c.main,a*.9);S.crescent(ctx,p.x,y,big?24:17,p.age*16,a,c.main);}
  else if(sect===3){under(ctx,trail,12,a);ribbon(ctx,trail,p.step===2?14:10,c.jade,a*.9);S.talisman(ctx,p.x,y,dir,p.step===2?24:18,a,p.age*20);}}

 // ------------------------------------------------------------- impacts (spawned once per effect)
 function impact(e){const c=PAL[e.sect],x=e.x,y=e.y-H+4,r=Math.min(38,e.radius||22);
  if(e.kind==='impact'){const a0=rnd(0,Math.PI);K.arcs.push({x,y,angle:a0,r:20,age:0,life:.22,color:c.main,span:1.8,width:5,core:c.core});K.arcs.push({x,y,angle:a0+1.6,r:16,age:0,life:.2,color:c.hot,span:1.4,width:3,core:c.core});burst(x,y,12,190,c.hot,.34,12,1.4);ring(x,y+12,3,24,.28,c.main,1.8);if(e.sect===2)S.bolt(x,y,x+rnd(-26,26),y+rnd(-14,14),.16,c.main,1.2,0);}
  else if(e.kind==='x'){for(const a of [-.7,.7])K.arcs.push({x,y,angle:a+Math.PI/2,r:24,age:0,life:.3,color:c.main,span:2.6,width:6,core:c.core});burst(x,y,18,220,c.hot,.45,20,1.6);ring(x,y+12,4,40,.4,c.main,2.6);kick(2.2,.08,c.hot);hitstop(.05);}
  else if(e.kind==='converge'){ring(x,y+10,6,r*1.6,.4,c.main,2.6);burst(x,y,16,180,c.hot,.45,10,1.4);for(let i=0;i<3;i++){const a=i*TAU/3;K.arcs.push({x:x+Math.cos(a)*10,y:y+Math.sin(a)*6,angle:a,r:16,age:0,life:.3,color:c.mint,span:2,width:4,core:c.core});}kick(1.6);hitstop(.04);}
  else if(e.kind==='lightning'){S.bolt(x+rnd(-12,12),y-150,x,y,.32,c.main,3.5,2);ring(x,y+12,4,44,.4,c.hot,2.6);burst(x,y,18,220,c.hot,.45,20,1.5);kick(2.6,.1,c.hot);hitstop(.05);}
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
