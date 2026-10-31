/* Monsters and pets: elemental identity and skill effects. Presentation only
   (damage, timing and targeting stay in js/01, js/19, js/27 and js/35e).
   - Every monster species has an element. Its attacks show the element at the point
     of contact: claw rakes, fire spits, frost shards, poison globs, lightning, void rends.
     Elites and bosses carry a ground glow and rising element motes; boss attacks crack
     the ground with a shockwave.
   - Pets stand on a soft glow of their colour with orbiting motes, and their skills are
     drawn by kind: strike (an element bolt that bursts on the target), heal (a pillar of
     light and rising motes on the hero), poison (a lobbed glob and a lingering cloud),
     area (a shockwave with an element burst). Replaces the old line-and-spokes drawing. */
(function(){
 'use strict';
 const K=window.skillVfxKit;if(!K||!window.creatureArt)return;
 const {TAU,rnd,dot,burst,ring}=K,reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const EL={
  fire:{main:'#ff8a3a',hot:'#ffe08a',deep:'#a8280e'},frost:{main:'#8fd8ff',hot:'#ffffff',deep:'#2a6aa8'},
  poison:{main:'#9be35a',hot:'#e9ffb0',deep:'#3a6a12'},thunder:{main:'#b48cff',hot:'#f0e8ff',deep:'#4a2aa8'},
  void:{main:'#c070ff',hot:'#f2d8ff',deep:'#3a0f6a'},light:{main:'#ffe7a3',hot:'#ffffff',deep:'#a8862a'},
  wild:{main:'#ffffff',hot:'#ffffff',deep:'#6a1a1a'}};
 const SPECIES={PhuongHoang:'fire',DungNham:'fire',BoCap:'fire',TrauQuy:'fire',RongNuoc:'frost',Doi:'frost',Soi:'frost',SuaQuy:'frost',
  Nhen:'poison',Ech:'poison',BoCanhVang:'poison',TeGiac:'thunder',RongXuong:'void',QuyLiem:'void',Tho:'light',BoNgua:'wild'};
 const elementOf=sp=>EL[SPECIES[sp]||'wild'];
 const fx=[];const add=o=>{fx.push({age:0,...o});if(fx.length>80)fx.shift();};
 const big=e=>!!(e.boss||e.elite||e.t===2);

 // ---------------------------------------------------------------- monster attacks
 function onMonsterAttack(e){const el=elementOf(e.skin),kind=SPECIES[e.skin]||'wild',s=T[e.t]?.s||18;
  const dx=P.x-e.x,dy=P.y-e.y,d=Math.hypot(dx,dy)||1,near=d<s+60,tx=near?P.x:e.x+dx/d*(s+20),ty=(near?P.y:e.y+dy/d*(s+20))-16,ang=Math.atan2(dy,dx);
  if(kind==='wild')add({type:'claw',x:tx,y:ty,ang,life:.42,el,size:s});
  else if(kind==='fire')add({type:'spit',x:e.x,y:e.y-s*.6,tx,ty,life:.3,el,size:s,then:'flame'});
  else if(kind==='frost')add({type:'shards',x:tx,y:ty,life:.65,el,size:s,seed:Math.random()*9});
  else if(kind==='poison')add({type:'spit',x:e.x,y:e.y-s*.5,tx,ty,life:.32,el,size:s,then:'cloud'});
  else if(kind==='thunder')add({type:'zap',x:e.x,y:e.y-s*.6,tx,ty,life:.3,el,pts:null});
  else if(kind==='void')add({type:'rend',x:tx,y:ty,ang,life:.6,el,size:s});
  else add({type:'claw',x:tx,y:ty,ang,life:.42,el,size:s});
  if(big(e)){add({type:'quake',x:e.x,y:e.y,life:.7,el,r:s*3.2});K.dust?.(e.x,e.y,10,s*2);K.kick?.(1.6);}}
 const baseAttack=creatureArt.onAttack;creatureArt.onAttack=function(e){const r=baseAttack.apply(this,arguments);try{if(!reduced.matches)onMonsterAttack(e);}catch{}return r;};

 // ---------------------------------------------------------------- pet skills
 const seenPet=new WeakSet();
 function onPetCast(c){const rule=window.petCatalog?.[c.species]||{},kind=rule.kind||'strike',col=rule.color||'#ffffff',el=elementOf(c.species);
  const tone={main:col,hot:el.hot,deep:el.deep};
  if(kind==='heal'){add({type:'pillar',x:P.x,y:P.y,life:1,el:tone});ring(P.x,P.y,4,40,.6,col,2.4);for(let i=0;i<14;i++)K.parts.push({x:P.x+rnd(-14,14),y:P.y-rnd(0,30),vx:rnd(-6,6),vy:rnd(-50,-25),g:0,age:0,life:rnd(.8,1.3),size:rnd(1.2,2.2),color:i%3?col:'#ffffff',kind:'mote'});return;}
  add({type:'bolt',x:c.x,y:c.y,tx:c.tx,ty:c.ty,life:.35,el:tone,kind});}
 function land(o){const {tx:x,ty:y,el}=o;
  if(o.kind==='poison'){add({type:'cloud',x,y:y+10,life:2.4,el,seed:Math.random()*9});burst(x,y,10,120,el.main,.4,10,1.3);}
  else if(o.kind==='area'){add({type:'quake',x,y:y+12,life:.8,el,r:110});burst(x,y,26,240,el.main,.6,30,1.6);burst(x,y,12,160,el.hot,.5,20,1.2);K.kick?.(2);}
  else{burst(x,y,16,200,el.main,.45,16,1.5);ring(x,y+12,4,34,.35,el.main,2.2);K.arcs.push({x,y,angle:rnd(0,3),r:16,age:0,life:.25,color:el.main,span:2,width:5,core:el.hot});}}

 // ---------------------------------------------------------------- update
 const baseUp=up;up=function(dt){baseUp(dt);if(paused())return;
  for(const c of window.petCombat?.effects||[])if(!seenPet.has(c)){seenPet.add(c);try{onPetCast(c);}catch{}}
  for(const o of fx){o.age+=dt;
   if(o.type==='spit'&&o.age>=o.life&&!o.done){o.done=true;const el=o.el;burst(o.tx,o.ty,12,170,el.main,.4,12,1.4);
    if(o.then==='flame')add({type:'flame',x:o.tx,y:o.ty+14,life:.7,el});else add({type:'cloud',x:o.tx,y:o.ty+14,life:1.4,el,seed:Math.random()*9});}
   if(o.type==='bolt'&&o.age>=o.life&&!o.done){o.done=true;land(o);}
   if(o.type==='claw'&&!o.sparked&&o.age>.06){o.sparked=true;burst(o.x,o.y,8,150,'#ffe0c8',.3,10,1.2);}
   if(o.type==='shards'&&!o.sparked&&o.age>.05){o.sparked=true;ring(o.x,o.y+14,4,30,.4,o.el.main,2);}}
  for(let i=fx.length-1;i>=0;i--)if(fx[i].age>=fx[i].life&&(fx[i].done||!['spit','bolt'].includes(fx[i].type)))fx.splice(i,1);};

 // ---------------------------------------------------------------- drawing helpers
 // Dark soft underlay so bright effects stay readable on jade, snow and sunlit ground.
 function shade(ctx,x,y,rx,ry,a){if(a<=0)return;const op=ctx.globalCompositeOperation;ctx.globalCompositeOperation='source-over';ctx.globalAlpha=a*.42;ctx.drawImage(K.glow('#140804'),x-rx,y-ry,rx*2,ry*2);ctx.globalCompositeOperation=op;}
 function claw(ctx,o,p){const a=1-p,ang=o.ang+Math.PI/2,len=Math.max(40,o.size*1.6);shade(ctx,o.x,o.y,len*.7,len*.45,a);ctx.save();ctx.translate(o.x,o.y);ctx.rotate(ang+.5);
  for(let k=-1;k<=1;k++){const off=k*10,grow=Math.min(1,p/.25);ctx.beginPath();ctx.moveTo(-len/2,off-4);ctx.quadraticCurveTo(0,off+4,len/2*(-1+2*grow),off-4+8*grow*.5);
   ctx.lineCap='round';ctx.globalAlpha=a*.85;ctx.strokeStyle='#7a0e0e';ctx.lineWidth=6;ctx.stroke();ctx.globalAlpha=a;ctx.strokeStyle='#ffffff';ctx.lineWidth=2.4;ctx.stroke();}ctx.restore();}
 function rend(ctx,o,p){const a=1-p;shade(ctx,o.x,o.y,40,26,a);ctx.save();ctx.translate(o.x,o.y);ctx.rotate(o.ang);ctx.globalCompositeOperation='source-over';
  for(let k=0;k<3;k++){const off=(k-1)*11,len=Math.max(44,o.size*1.8)*Math.min(1,p/.2);ctx.globalAlpha=a*.8;ctx.fillStyle='#14051f';ctx.beginPath();ctx.ellipse(0,off,len*.55,2.6,(k-1)*.15,0,TAU);ctx.fill();}
  ctx.globalCompositeOperation='lighter';for(let k=0;k<3;k++){const off=(k-1)*11,len=Math.max(44,o.size*1.8)*Math.min(1,p/.2);ctx.globalAlpha=a*.95;ctx.strokeStyle=o.el.main;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,off,len*.55,3.2,(k-1)*.15,0,TAU);ctx.stroke();}ctx.restore();}
 function globAt(ctx,x,y,r,el,a){shade(ctx,x,y+2,r*2,r*1.6,a);dot(ctx,x,y,r*2.4,el.main,a*.5);ctx.save();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=a;const gr=ctx.createRadialGradient(x-r*.3,y-r*.3,0,x,y,r);gr.addColorStop(0,el.hot);gr.addColorStop(.5,el.main);gr.addColorStop(1,el.deep);ctx.fillStyle=gr;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.restore();}
 function cloud(ctx,o,p){const a=Math.min(1,p/.1)*(1-p);shade(ctx,o.x,o.y,40,22,a);ctx.save();ctx.globalCompositeOperation='source-over';for(let i=0;i<6;i++){const ang=i/6*TAU+o.seed+o.age*.6,r=10+i%3*4+p*14,x=o.x+Math.cos(ang)*r*1.3,y=o.y+Math.sin(ang)*r*.5-o.age*6;
   ctx.globalAlpha=a*.7;ctx.drawImage(K.glow(o.el.deep),x-16-p*10,y-10-p*6,32+p*20,20+p*12);ctx.globalAlpha=a*.6;ctx.drawImage(K.glow(o.el.main),x-12-p*8,y-8-p*5,24+p*16,16+p*10);}ctx.restore();
  for(let i=0;i<3;i++){const t=(o.age*.8+i/3)%1;dot(ctx,o.x+Math.sin(o.seed+i*2)*14,o.y-t*26,2.2,o.el.hot,a*(1-t));}}
 function flame(ctx,o,p){const a=1-p;shade(ctx,o.x,o.y-10,30,24,a);for(let i=0;i<7;i++){const t=(o.age*2.2+i/7)%1,x=o.x+(i-3)*6+Math.sin(o.age*9+i)*3,y=o.y-t*40,r=(12-i%2*3)*(1-t*.6);
   dot(ctx,x,y,r*2,o.el.main,a*(1-t)*.8);dot(ctx,x,y,r*.9,o.el.hot,a*(1-t));}}
 function shards(ctx,o,p){const a=1-p,grow=Math.min(1,p/.15);shade(ctx,o.x,o.y+8,34,18,a);ctx.save();ctx.globalCompositeOperation='source-over';
  for(let i=0;i<6;i++){const ang=-Math.PI/2+(i-2.5)*.42+Math.sin(o.seed+i)*.12,h=(20+((i*7)%5)*5)*grow,x=o.x+Math.cos(ang+Math.PI/2)*i*1.5-6,y=o.y+14;
   ctx.save();ctx.translate(x+(i-2.5)*5,y);ctx.rotate(ang+Math.PI/2);ctx.globalAlpha=a;const gr=ctx.createLinearGradient(0,0,0,-h);gr.addColorStop(0,o.el.deep);gr.addColorStop(.5,o.el.main);gr.addColorStop(1,'#ffffff');ctx.fillStyle=gr;
   ctx.beginPath();ctx.moveTo(-4.5,0);ctx.lineTo(0,-h);ctx.lineTo(4.5,0);ctx.closePath();ctx.fill();ctx.strokeStyle='#ffffff';ctx.lineWidth=.8;ctx.stroke();ctx.restore();}ctx.restore();dot(ctx,o.x,o.y+8,18,o.el.main,a*.4);}
 function zap(ctx,o,p){if(!o.pts||Math.random()<.5){o.pts=[];const n=7;for(let i=0;i<=n;i++){const t=i/n,j=i&&i<n?rnd(-8,8):0;o.pts.push([o.x+(o.tx-o.x)*t+j,o.y+(o.ty-o.y)*t+j*.6]);}}
  const a=1-p;shade(ctx,o.tx,o.ty,24,16,a);for(const [w,c,al] of [[8,o.el.deep,.5],[3.4,o.el.main,.95],[1.4,'#ffffff',1]]){ctx.globalAlpha=a*al;ctx.strokeStyle=c;ctx.lineWidth=w;ctx.beginPath();o.pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();}dot(ctx,o.tx,o.ty,16,o.el.main,a*.7);}
 function quake(ctx,o,p){const a=1-p,r=o.r*(.3+.7*Math.sqrt(p));ctx.save();ctx.translate(o.x,o.y);ctx.scale(1,.5);
  ctx.globalCompositeOperation='source-over';ctx.globalAlpha=a*.6;ctx.strokeStyle='#2a1608';ctx.lineWidth=3.5;for(let i=0;i<8;i++){const ang=i/8*TAU+o.r;ctx.beginPath();ctx.moveTo(Math.cos(ang)*8,Math.sin(ang)*8);ctx.lineTo(Math.cos(ang+.15)*r*.5,Math.sin(ang+.15)*r*.5);ctx.lineTo(Math.cos(ang-.05)*r*.8,Math.sin(ang-.05)*r*.8);ctx.stroke();}
  ctx.globalCompositeOperation='source-over';ctx.globalAlpha=a*.55;ctx.strokeStyle=o.el.deep;ctx.lineWidth=8*(1-p)+2;ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.stroke();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=a*.9;ctx.strokeStyle=o.el.main;ctx.lineWidth=4*(1-p)+1;ctx.stroke();ctx.globalAlpha=a*.5;ctx.lineWidth=10*(1-p);ctx.stroke();ctx.restore();}
 function pillar(ctx,o,p){const a=Math.min(1,p/.15)*(1-p),w=22*(1-p*.4),h=110;ctx.save();ctx.globalCompositeOperation='lighter';const gr=ctx.createLinearGradient(0,o.y-h,0,o.y);gr.addColorStop(0,o.el.main+'00');gr.addColorStop(.6,o.el.main+'99');gr.addColorStop(1,'#ffffff');
  ctx.globalAlpha=a*.8;ctx.fillStyle=gr;ctx.fillRect(o.x-w/2,o.y-h,w,h);ctx.globalAlpha=a;ctx.fillRect(o.x-w*.15,o.y-h,w*.3,h);ctx.restore();dot(ctx,o.x,o.y,30,o.el.main,a*.6);
  K.star?.(ctx,o.x,o.y-40-p*30,10*(1-p)+4,o.age*3,o.el.main,'#ffffff',a);}
 function petBolt(ctx,o,p){const t0=Math.min(1,p);shade(ctx,o.x+(o.tx-o.x)*t0,o.y+(o.ty-o.y)*t0,18,14,1);const t=t0,x=o.x+(o.tx-o.x)*t,y=o.y+(o.ty-o.y)*t-Math.sin(t*Math.PI)*(o.kind==='poison'?40:14);
  if(o.kind==='poison'){globAt(ctx,x,y,7,o.el,1);return;}
  dot(ctx,x,y,22,o.el.main,.55);dot(ctx,x,y,9,'#ffffff',.95);K.star?.(ctx,x,y,9,o.age*12,o.el.main,'#ffffff',.9);}

 // ---------------------------------------------------------------- auras
 const auraLayer=worldMap.drawGroundDetails;worldMap.drawGroundDetails=function(ctx,cx,cy,vw,vh){auraLayer.call(this,ctx,cx,cy,vw,vh);if(reduced.matches)return;const t=worldMap.environmentClock||0;
  for(const f of window.spiritPets?.followers?.values?.()||[]){if(f.x<cx-40||f.x>cx+vw+40||f.y<cy-40||f.y>cy+vh+40)continue;const col=window.petCatalog?.[f.species]?.color||'#ffffff';
   ctx.save();ctx.translate(f.x,f.y);ctx.scale(1,.45);ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.32;ctx.drawImage(K.glow(col),-24,-24,48,48);ctx.globalAlpha=.7;ctx.strokeStyle=col;ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(0,0,15+Math.sin(t*3)*1.5,0,TAU);ctx.stroke();ctx.restore();}
  for(const e of E){if(e.dead||!big(e)||e.x<cx-60||e.x>cx+vw+60||e.y<cy-60||e.y>cy+vh+60)continue;const el=elementOf(e.skin),s=T[e.t]?.s||18;
   ctx.save();ctx.translate(e.x,e.y);ctx.scale(1,.45);ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.3+.1*Math.sin(t*2+e.x);ctx.drawImage(K.glow(el.main),-s*2,-s*2,s*4,s*4);ctx.restore();}};
 function motes(ctx,x,y,col,n,h,spread,t,seed){for(let i=0;i<n;i++){const q=(t*.5+i/n+seed)%1,a=Math.sin(q*Math.PI);dot(ctx,x+Math.sin(seed*7+i*2.3+t)*spread,y-q*h,2,col,a*.8);}}

 const baseDraw=dr;dr=function(){baseDraw();if(paused()||!P.ap)return;const c=gameCamera();g.save();g.setTransform(Z,0,0,Z,-c.x*Z,-c.y*Z);g.globalCompositeOperation='lighter';
  const t=worldMap.environmentClock||0;
  if(!reduced.matches){for(const f of window.spiritPets?.followers?.values?.()||[]){const col=window.petCatalog?.[f.species]?.color||'#ffffff';for(let i=0;i<3;i++){const ang=t*2+i*TAU/3;dot(g,f.x+Math.cos(ang)*16,f.y-14+Math.sin(ang)*6,3,col,.75);}}
   for(const e of E){if(e.dead||!big(e))continue;const el=elementOf(e.skin),s=T[e.t]?.s||18;motes(g,e.x,e.y-4,el.main,6,s*2.4,s*.7,t,(e.x*.013)%1);}}
  for(const o of fx){const p=Math.min(1,o.age/o.life);try{
   if(o.type==='claw'){g.globalCompositeOperation='source-over';claw(g,o,p);g.globalCompositeOperation='lighter';}
   else if(o.type==='rend')rend(g,o,p);
   else if(o.type==='spit'&&!o.done){const x=o.x+(o.tx-o.x)*p,y=o.y+(o.ty-o.y)*p-Math.sin(p*Math.PI)*16;globAt(g,x,y,7,o.el,1);}
   else if(o.type==='flame')flame(g,o,p);
   else if(o.type==='cloud')cloud(g,o,p);
   else if(o.type==='shards')shards(g,o,p);
   else if(o.type==='zap')zap(g,o,p);
   else if(o.type==='quake')quake(g,o,p);
   else if(o.type==='pillar')pillar(g,o,p);
   else if(o.type==='bolt'&&!o.done)petBolt(g,o,p);}catch{}g.globalCompositeOperation='lighter';g.globalAlpha=1;}
  g.restore();};
 window.beastVfx={elementOf,fx,onMonsterAttack,onPetCast};
})();
