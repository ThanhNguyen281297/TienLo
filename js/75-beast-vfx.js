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
  else{add({type:'pop',x,y,life:.55,el,size:96});add({type:'quake',x,y:y+12,life:.6,el,r:46});burst(x,y,10,180,el.main,.4,16,1.3);K.arcs.push({x,y,angle:rnd(0,3),r:16,age:0,life:.25,color:el.main,span:2,width:5,core:el.hot});}}

 // ---------------------------------------------------------------- update
 const baseUp=up;up=function(dt){baseUp(dt);if(paused())return;
  for(const c of window.petCombat?.effects||[])if(!seenPet.has(c)){seenPet.add(c);try{onPetCast(c);}catch{}}
  for(const o of fx){o.age+=dt;
   if(o.type==='spit'&&o.age>=o.life&&!o.done){o.done=true;const el=o.el;add({type:'pop',x:o.tx,y:o.ty,life:.4,el,size:54});
    if(o.then==='flame')add({type:'flame',x:o.tx,y:o.ty+14,life:.7,el});else add({type:'cloud',x:o.tx,y:o.ty+14,life:1.4,el,seed:Math.random()*9});}
   if(o.type==='bolt'&&o.age>=o.life&&!o.done){o.done=true;land(o);}
   if(o.type==='claw'&&!o.sparked&&o.age>.06){o.sparked=true;burst(o.x,o.y,8,150,'#ffe0c8',.3,10,1.2);}
   if(o.type==='shards'&&!o.sparked&&o.age>.05){o.sparked=true;ring(o.x,o.y+14,4,30,.4,o.el.main,2);}}
  for(let i=fx.length-1;i>=0;i--)if(fx[i].age>=fx[i].life&&(fx[i].done||!['spit','bolt'].includes(fx[i].type)))fx.splice(i,1);};

 // ---------------------------------------------------------------- painted parts
 // Skill/VFX/spirit-components-v1.png holds eight hand-painted white elements; each is
 // tinted per element once and cached, so every effect below is painted, not vector.
 const SHEET=new Image();SHEET.src=artworkURL('Skill/VFX/spirit-components-v1.png');
 const PARTS={crescent:[89,115,282,261],wisp:[507,207,327,99],smoke:[1024,98,181,293],star:[1420,119,248,262],rune:[57,502,329,321],leaf:[542,529,256,287],burst:[951,503,307,316],swirl:[1405,509,314,310]};
 const tinted=new Map();
 function part(name,color){const key=name+color;if(tinted.has(key))return tinted.get(key);if(!SHEET.complete||!SHEET.naturalWidth)return null;
  const [x,y,w,h]=PARTS[name],k=SHEET.naturalWidth/1774,S=Math.min(1,160/Math.max(w,h)),c=document.createElement('canvas');c.width=Math.round(w*S);c.height=Math.round(h*S);const t=c.getContext('2d');
  t.drawImage(SHEET,x*k,y*k,w*k,h*k,0,0,c.width,c.height);
  // multiply keeps the brush shading in the element colour; destination-in restores the alpha
  t.globalCompositeOperation='multiply';t.fillStyle=color;t.fillRect(0,0,c.width,c.height);t.globalCompositeOperation='destination-in';t.drawImage(SHEET,x*k,y*k,w*k,h*k,0,0,c.width,c.height);tinted.set(key,c);return c;}
 // Draw a tinted part centred at (x,y); size = longest side; iso=true lays it on the ground.
 function paint(ctx,name,color,x,y,size,rot,a,mode='source-over',iso=false){if(a<=0)return;const c=part(name,color);if(!c)return;const k=size/Math.max(c.width,c.height),w=c.width*k,h=c.height*k;
  ctx.save();ctx.translate(x,y);if(iso)ctx.scale(1,.5);ctx.rotate(rot);ctx.globalCompositeOperation=mode;ctx.globalAlpha=a;ctx.drawImage(c,-w/2,-h/2,w,h);if(mode==='source-over'){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=a*.3;ctx.drawImage(c,-w/2,-h/2,w,h);}ctx.restore();}
 function shade(ctx,x,y,rx,ry,a){if(a<=0)return;ctx.save();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=a*.35;ctx.drawImage(K.glow('#140804'),x-rx,y-ry,rx*2,ry*2);ctx.restore();}
 const ease=t=>1-Math.pow(1-Math.min(1,Math.max(0,t)),3);

 // ---------------------------------------------------------------- effects
 function claw(ctx,o,p){const a=1-ease((p-.4)/.6),g2=ease(p/.2),sz=Math.max(36,o.size*1.5);shade(ctx,o.x,o.y,sz*.6,sz*.4,a);
  for(let k=-1;k<=1;k++){const off=k*9;paint(ctx,'crescent','#c81e1e',o.x+Math.cos(o.ang+Math.PI/2)*off,o.y+Math.sin(o.ang+Math.PI/2)*off*.6,sz*g2,o.ang+2.4,a);}
  paint(ctx,'star','#ffd0c0',o.x,o.y,20*(1-p),p*3,a);}
 function rend(ctx,o,p){const a=1-ease((p-.4)/.6),g2=ease(p/.2),sz=Math.max(40,o.size*1.6);shade(ctx,o.x,o.y,sz*.6,sz*.4,a);
  paint(ctx,'swirl','#3a0f6a',o.x,o.y+8,sz*1.2*g2,p*2,a*.8,'source-over',true);
  for(let k=-1;k<=1;k++){const off=k*10;paint(ctx,'crescent','#9a3aff',o.x+Math.cos(o.ang+Math.PI/2)*off,o.y+Math.sin(o.ang+Math.PI/2)*off*.6,sz*g2,o.ang+2.4,a);}}
 function flame(ctx,o,p){const a=1-ease((p-.3)/.7);shade(ctx,o.x,o.y-10,30,24,a);
  for(let i=0;i<5;i++){const t=(o.age*1.6+i/5)%1;paint(ctx,'smoke',i%2?'#ff5a10':'#ffb020',o.x+(i-2)*7+Math.sin(o.age*6+i)*3,o.y-10-t*34,30+t*16,Math.sin(i)*.4,a*(1-t)*.95);}
  paint(ctx,'burst','#ff6a1a',o.x,o.y,48*ease(p/.25),p*2,a*.8,'source-over',true);}
 function cloud(ctx,o,p){const a=Math.min(1,p/.1)*(1-ease((p-.5)/.5));
  for(let i=0;i<5;i++){const t=(o.age*.5+i/5)%1;paint(ctx,'smoke',i%2?'#4a9a1a':'#86d040',o.x+Math.sin(o.seed+i*1.9)*18,o.y-4-t*22,34+t*14,Math.sin(o.seed+i),a*(1-t)*.8,'source-over');}
  paint(ctx,'swirl','#3a7a1a',o.x,o.y+4,64,o.age*.8,a*.6,'source-over',true);}
 function shards(ctx,o,p){const a=1-ease((p-.4)/.6),g2=ease(p/.18);shade(ctx,o.x,o.y+6,36,20,a);
  paint(ctx,'burst','#3aa0e8',o.x,o.y+4,58*g2,o.seed,a);paint(ctx,'burst','#bfeaff',o.x,o.y+4,40*g2,o.seed+.3,a*.8);
  paint(ctx,'star','#e8f8ff',o.x,o.y-4,28*(1-p*.6),p*2,a);paint(ctx,'rune','#3aa0e8',o.x,o.y+14,56*g2,p,a*.8,'source-over',true);}
 function zap(ctx,o,p){if(!o.pts||Math.random()<.5){o.pts=[];const n=7;for(let i=0;i<=n;i++){const t=i/n,j=i&&i<n?rnd(-8,8):0;o.pts.push([o.x+(o.tx-o.x)*t+j,o.y+(o.ty-o.y)*t+j*.6]);}}
  const a=1-p;shade(ctx,o.tx,o.ty,26,18,a);for(const [w,c,al] of [[8,o.el.deep,.5],[3.4,o.el.main,.95],[1.4,'#ffffff',1]]){ctx.globalAlpha=a*al;ctx.strokeStyle=c;ctx.lineWidth=w;ctx.beginPath();o.pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();}
  paint(ctx,'burst','#7a4aff',o.tx,o.ty,48*ease(p/.2),p*3,a);paint(ctx,'star','#e8dcff',o.tx,o.ty,28,p*4,a);}
 function quake(ctx,o,p){const a=1-ease((p-.3)/.7),r=o.r*(.4+.6*ease(p));paint(ctx,'swirl',o.el.deep,o.x,o.y,r*2,p*1.5,a*.7,'source-over',true);paint(ctx,'swirl',o.el.main,o.x,o.y,r*2.1,-p,a*.8,'source-over',true);paint(ctx,'rune',o.el.main,o.x,o.y,r*1.2,p*2,a*.7,'source-over',true);}
 function pillar(ctx,o,p){const a=Math.min(1,p/.15)*(1-ease((p-.5)/.5)),w=24*(1-p*.4),h=120;ctx.save();ctx.globalCompositeOperation='lighter';const gr=ctx.createLinearGradient(0,o.y-h,0,o.y);gr.addColorStop(0,o.el.main+'00');gr.addColorStop(.6,o.el.main+'88');gr.addColorStop(1,'#ffffff');
  ctx.globalAlpha=a*.7;ctx.fillStyle=gr;ctx.fillRect(o.x-w/2,o.y-h,w,h);ctx.restore();
  paint(ctx,'rune',o.el.main,o.x,o.y,90*ease(p/.3),o.age*1.5,a,'source-over',true);
  for(let i=0;i<4;i++){const t=(o.age*.7+i/4)%1;paint(ctx,'leaf',o.el.main,o.x+Math.sin(i*1.7+o.age*2)*16,o.y-10-t*60,18,Math.sin(o.age*3+i),a*(1-t));}}
 function globAt(ctx,x,y,size,color,a,spin){shade(ctx,x,y+2,size*.6,size*.45,a);paint(ctx,'swirl',color,x,y,size,spin,a);paint(ctx,'star',color,x,y,size*.55,spin*2,a*.9);}
 function pop(ctx,o,p){const a=1-ease((p-.3)/.7),g2=ease(p/.2);shade(ctx,o.x,o.y,o.size*.45,o.size*.32,a);paint(ctx,'burst',o.el.main,o.x,o.y,o.size*g2,p*2,a,'source-over');paint(ctx,'star',o.el.hot,o.x,o.y,o.size*.5*(1-p*.5),p*3,a);}
 function petBolt(ctx,o,p){const t=Math.min(1,p),x=o.x+(o.tx-o.x)*t,y=o.y+(o.ty-o.y)*t-Math.sin(t*Math.PI)*(o.kind==='poison'?40:14),ang=Math.atan2(o.ty-o.y,o.tx-o.x);
  if(o.kind==='poison'){globAt(ctx,x,y,30,o.el.main,1,o.age*10);return;}
  shade(ctx,x,y,22,14,1);paint(ctx,'wisp',o.el.main,x-Math.cos(ang)*20,y-Math.sin(ang)*20,84,ang,.95);paint(ctx,'burst',o.el.main,x,y,40,o.age*8,.8);paint(ctx,'star',o.el.hot,x,y,34,o.age*10,1);}
 // ---------------------------------------------------------------- auras
 const auraLayer=worldMap.drawGroundDetails;worldMap.drawGroundDetails=function(ctx,cx,cy,vw,vh){auraLayer.call(this,ctx,cx,cy,vw,vh);if(reduced.matches)return;const t=worldMap.environmentClock||0;
  for(const f of window.spiritPets?.followers?.values?.()||[]){if(f.x<cx-40||f.x>cx+vw+40||f.y<cy-40||f.y>cy+vh+40)continue;const col=window.petCatalog?.[f.species]?.color||'#ffffff';
   ctx.save();ctx.translate(f.x,f.y);ctx.scale(1,.45);ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.3;ctx.drawImage(K.glow(col),-24,-24,48,48);ctx.restore();paint(ctx,'rune',col,f.x,f.y,40,t*.6,.8,'source-over',true);}
  for(const e of E){if(e.dead||!big(e)||e.x<cx-60||e.x>cx+vw+60||e.y<cy-60||e.y>cy+vh+60)continue;const el=elementOf(e.skin),s=T[e.t]?.s||18;
   ctx.save();ctx.translate(e.x,e.y);ctx.scale(1,.45);ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.3+.1*Math.sin(t*2+e.x);ctx.drawImage(K.glow(el.main),-s*2,-s*2,s*4,s*4);ctx.restore();}};
 function motes(ctx,x,y,col,n,h,spread,t,seed){for(let i=0;i<n;i++){const q=(t*.5+i/n+seed)%1,a=Math.sin(q*Math.PI);dot(ctx,x+Math.sin(seed*7+i*2.3+t)*spread,y-q*h,2,col,a*.8);}}

 const baseDraw=dr;dr=function(){baseDraw();if(paused()||!P.ap)return;const c=gameCamera();g.save();g.setTransform(Z,0,0,Z,-c.x*Z,-c.y*Z);g.globalCompositeOperation='lighter';
  const t=worldMap.environmentClock||0;
  if(!reduced.matches){for(const f of window.spiritPets?.followers?.values?.()||[]){const col=window.petCatalog?.[f.species]?.color||'#ffffff';for(let i=0;i<3;i++){const ang=t*2+i*TAU/3;dot(g,f.x+Math.cos(ang)*16,f.y-14+Math.sin(ang)*6,3,col,.75);}}
   for(const e of E){if(e.dead||!big(e))continue;const el=elementOf(e.skin),s=T[e.t]?.s||18;motes(g,e.x,e.y-4,el.main,6,s*2.4,s*.7,t,(e.x*.013)%1);}}
  for(const o of fx){const p=Math.min(1,o.age/o.life);try{
   if(o.type==='claw')claw(g,o,p);
   else if(o.type==='rend')rend(g,o,p);
   else if(o.type==='spit'&&!o.done){const x=o.x+(o.tx-o.x)*p,y=o.y+(o.ty-o.y)*p-Math.sin(p*Math.PI)*16;globAt(g,x,y,22,o.el.main,1,o.age*12);}
   else if(o.type==='flame')flame(g,o,p);
   else if(o.type==='cloud')cloud(g,o,p);
   else if(o.type==='shards')shards(g,o,p);
   else if(o.type==='zap')zap(g,o,p);
   else if(o.type==='quake')quake(g,o,p);
   else if(o.type==='pop')pop(g,o,p);
   else if(o.type==='pillar')pillar(g,o,p);
   else if(o.type==='bolt'&&!o.done)petBolt(g,o,p);}catch{}g.globalCompositeOperation='lighter';g.globalAlpha=1;}
  g.restore();};
 window.beastVfx={elementOf,fx,onMonsterAttack,onPetCast};
})();
