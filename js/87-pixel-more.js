/* More pixelfx moments (MIT, see Skill/pixelfx/LICENSE). Presentation only.
   Combat:   class-themed critical hits, class ultimates, parry on dodge, heavy hits on the player,
             boss ground slams, map-themed monster deaths, boss-kill fireworks, elite gems.
   Status:   frost crystal, paralysis spark, seal sigil over controlled monsters.
   Rewards:  xp orbs that fly to the player, shard crystals, streak star, pet hatch, small heals.
   Cultivation: halo + gathering qi while meditating, pillar of light on breakthrough,
             storm cloud during the tribulation and a sunburst when it is passed.
   World:    quest marker, campfires at hunting camps, fish and ripples on water, will-o'-wisp
             flames and void orbs on dark maps, ghosts, frogs, snakes, jellyfish, an arcane orb
             on the Thiên Cơ dais, shooting stars over Minh Nguyệt and fireworks over the city. */
(function(){
 'use strict';
 const fx=window.pixelFx;if(!fx||!window.worldMap)return;
 Object.assign(fx.sheets,{parry:{w:172,h:92,cols:23,n:26,fps:30,px:84,py:79},blunthit:{w:89,h:74,cols:26,n:26,fps:30,px:47,py:60},slam:{w:236,h:169,cols:17,n:45,fps:15,px:118,py:127},iceshatter:{w:176,h:100,cols:23,n:41,fps:15,px:48,py:80},snowburst:{w:106,h:106,cols:38,n:47,fps:15,px:53,py:100},zap:{w:121,h:94,cols:27,n:27,fps:30,px:74,py:47},thunderclap:{w:255,h:140,cols:16,n:55,fps:30,px:129,py:111},manaburst:{w:168,h:142,cols:24,n:52,fps:30,px:88,py:118},hex:{w:152,h:123,cols:26,n:59,fps:15,px:76,py:110},icecrystal:{w:49,h:69,cols:45,n:45,fps:15,px:25,py:63,loop:1},darkboom:{w:247,h:236,cols:16,n:57,fps:15,px:124,py:198},smite:{w:179,h:174,cols:22,n:39,fps:15,px:90,py:146},starfall:{w:169,h:154,cols:24,n:35,fps:15,px:95,py:135},feathers:{w:139,h:131,cols:29,n:40,fps:15,px:66,py:48},xporb:{w:58,h:41,cols:54,n:54,fps:30,px:30,py:39,loop:1},shard:{w:42,h:61,cols:48,n:48,fps:15,px:21,py:58,loop:1},gem:{w:35,h:42,cols:36,n:36,fps:15,px:17,py:38,loop:1},star:{w:72,h:70,cols:48,n:48,fps:30,px:36,py:62,loop:1},egg:{w:71,h:64,cols:47,n:47,fps:15,px:33,py:54},bloom:{w:109,h:112,cols:37,n:49,fps:15,px:54,py:104},halo:{w:37,h:37,cols:60,n:60,fps:30,px:17,py:62,loop:1},charge:{w:104,h:80,cols:39,n:48,fps:30,px:44,py:76,loop:1},pillar:{w:192,h:226,cols:21,n:51,fps:15,px:96,py:204},sunburst:{w:106,h:105,cols:38,n:60,fps:15,px:54,py:52,loop:1},storm:{w:155,h:171,cols:26,n:45,fps:15,px:82,py:161,loop:1},exclaim:{w:50,h:56,cols:40,n:40,fps:30,px:25,py:81},ripples:{w:122,h:41,cols:33,n:60,fps:30,px:61,py:23,loop:1},fish:{w:122,h:73,cols:33,n:72,fps:15,px:65,py:37,loop:1},campfire:{w:101,h:97,cols:40,n:45,fps:15,px:50,py:83,loop:1},brazier:{w:104,h:133,cols:39,n:45,fps:15,px:52,py:124,loop:1},spiritflame:{w:72,h:95,cols:45,n:45,fps:15,px:36,py:70,loop:1},shadowflame:{w:78,h:96,cols:36,n:36,fps:15,px:39,py:87,loop:1},voidorb:{w:128,h:138,cols:32,n:48,fps:15,px:64,py:130,loop:1},arcaneorb:{w:88,h:103,cols:36,n:36,fps:15,px:44,py:97,loop:1},ghost:{w:80,h:77,cols:36,n:36,fps:15,px:40,py:70,loop:1},frog:{w:60,h:50,cols:39,n:39,fps:15,px:32,py:46,loop:1},snake:{w:89,h:17,cols:36,n:36,fps:15,px:43,py:15,loop:1},jelly:{w:72,h:102,cols:48,n:48,fps:15,px:39,py:35,loop:1},stars:{w:320,h:180,cols:12,n:100,fps:10,px:160,py:180,loop:1},firework:{w:187,h:224,cols:21,n:47,fps:15,px:96,py:86},rocket:{w:258,h:292,cols:15,n:58,fps:15,px:125,py:284}});
 const TAU=Math.PI*2,rnd=(a,b)=>a+Math.random()*(b-a),cls=()=>Math.max(0,Math.min(3,P.ap?.w||0));
 const scene=()=>worldMap.state.scene||'',design=()=>window.tienHiep?.scenes?.[scene()];
 const theme=()=>{const s=scene();return /ember|fire|worldboss|raid/.test(s)?'fire':/frost/.test(s)?'ice':/abyss|void/.test(s)?'void':/marsh|tide/.test(s)?'water':'';};
 const near=(e,d=700)=>e&&Math.hypot(e.x-P.x,e.y-P.y)<d;
 let clock=0,last=performance.now(),quietUntil=0;

 /* ---------- combat ---------- */
 const CRIT=[{k:'crit',scale:1.25},{k:'iceshatter',scale:.7},{k:'zap',scale:1},{k:'manaburst',scale:.8}];
 fx.pick.crit=()=>CRIT[cls()];
 const baseDeath=fx.pick.death;
 fx.pick.death=e=>{const k=T[e.t]||{s:40},big=e.t===2;
  if(big)return {k:theme()==='void'?'darkboom':'smite',scale:1.2};
  const t=theme(),s=Math.max(.8,Math.min(1.6,k.s/40));
  if(t==='ice')return {k:'snowburst',scale:.8*s,add:true};
  if(t==='void')return {k:'darkboom',scale:.5*s,alpha:.9};
  return baseDeath(e);};
 fx.pick.onDeath=e=>{
  if(!near(e,900))return;
  // Experience flies back to the cultivator.
  for(let i=0;i<(e.t===2?6:e.elite?3:1);i++)flyers.push({x:e.x+rnd(-20,20),y:e.y-30,age:-i*.08,life:.75+rnd(0,.2),bend:rnd(-60,60)});
  if(e.elite&&e.t!==2)fx.play('gem',e.x+18,e.y-10,{scale:1.1,life:1.4,vy:30});
  if(e.t===2)for(let i=0;i<4;i++)setTimeout(()=>fx.play('firework',e.x+rnd(-160,160),e.y-rnd(160,260),{center:true,scale:1.3,add:true}),300+i*380);
 };
 // Ultimates (skill 4) of each school, at the aim point.
 if(typeof skill==='function'){const baseSkill=skill;skill=function(index){const mp=P.mp,result=baseSkill.apply(this,arguments);
  try{if(index===3&&P.ap&&P.mp<mp){const a=window.getClassCombat?.().state?.aim||P,c=cls();
   if(c===0)fx.play('smite',a.x,a.y+4,{scale:1.1,alpha:.9});
   else if(c===1)fx.play('starfall',a.x,a.y+4,{scale:1.4,add:true});
   else if(c===2)fx.play('thunderclap',a.x,a.y+4,{scale:1.1,add:true});
   else fx.play('hex',a.x,a.y-10,{center:true,scale:1.2,add:true});}}catch(e){}
  return result;};}
 if(window.combatDefense?.dodge){const base=combatDefense.dodge;combatDefense.dodge=function(){try{fx.play('parry',P.x,P.y-40,{center:true,scale:.9,add:true});}catch(e){}return base.apply(this,arguments);};}
 if(window.creatureArt?.onAttack){const base=creatureArt.onAttack;let lastSlam=0;creatureArt.onAttack=function(e){
  try{const now=performance.now();if(e&&(e.t===2||e.boss)&&near(e,800)&&now-lastSlam>1400){lastSlam=now;fx.play('slam',e.x,e.y+6,{scale:.75,alpha:.85});}}catch(err){}
  return base.apply(this,arguments);};}

 /* ---------- rewards ---------- */
 const flyers=[];
 if(window.shardsGame?.onDrop){const base=shardsGame.onDrop;shardsGame.onDrop=function(got,reward){try{const x=reward?.x??P.x,y=reward?.y??P.y;fx.play('shard',x,y-6,{scale:1.2,life:2.6,vy:6});}catch(e){}return base.apply(this,arguments);};}
 if(window.killStreak?.show){const base=killStreak.show;killStreak.show=function(n){try{fx.play('star',P.x,P.y-125,{center:true,scale:1,life:1.6,add:true,follow:true});}catch(e){}return base.apply(this,arguments);};}
 const CHEERS=[[/Tu luyện thành công/,()=>fx.play('pillar',P.x,P.y+6,{scale:1.1,follow:true,add:true})],
  [/Độ kiếp thành công/,()=>fx.play('sunburst',P.x,P.y-150,{center:true,scale:1,life:2.4,add:true,alpha:.8,follow:true})]];
 const baseMsg=msg;msg=function(s){try{const t=String(s??'');if(P.ap)for(const [re,fn] of CHEERS)if(re.test(t))fn();}catch(e){}return baseMsg.apply(this,arguments);};

 /* ---------- monster status ---------- */
 const sealSeen=new WeakMap();
 function statusMarks(ctx,v){
  for(const e of E){
   if(e.dead>0||e.hp<=0||e.x<v.x-80||e.x>v.x+v.vw+80||e.y<v.y-60||e.y>v.y+v.vh+160)continue;
   const list=e.fieldEffects;if(!list?.length)continue;const k=T[e.t]||{s:40},top=e.y-k.s-8;
   for(const f of list){if(!(f.hard>0))continue;
    if(f.key==='moonFrost')fx.frame(ctx,'icecrystal',Math.floor(clock*15),e.x,top-6,{center:true,scale:.8,add:true});
    else if(f.key==='thunderParalysis')fx.frame(ctx,'zap',Math.floor(clock*30)%10,e.x,e.y-k.s*.5,{center:true,scale:.7,add:true,alpha:.8});
    else if(f.key==='mysticSeal'){if(!sealSeen.get(e)||performance.now()-sealSeen.get(e)>4000){sealSeen.set(e,performance.now());fx.play('hex',e.x,e.y-k.s*.45,{center:true,scale:.7,add:true});}}
   }
  }
 }

 /* ---------- player ---------- */
 let lastHp=null,lastHurt=0,lastBloom=0,wasDash=false,petId=undefined;
 function player(ctx,now){
  const max=mhp();
  if(lastHp!==null&&P.hp>0){const d=P.hp-lastHp;
   if(d<=-max*.12&&now-lastHurt>500){lastHurt=now;fx.play('blunthit',P.x,P.y-45,{center:true,scale:.9,alpha:.9});}
   else if(d>=max*.06&&d<max*.18&&now-lastBloom>4000){lastBloom=now;fx.play('bloom',P.x+26,P.y+4,{scale:.75});}}
  lastHp=P.hp;
  const dash=!!window.classCombat?.isDashing?.();if(dash&&!wasDash)fx.play('feathers',P.x,P.y-40,{center:true,scale:.55,alpha:.75});wasDash=dash;
  // Meditation: halo over the head and qi gathering at the dantian.
  if(P.med){fx.frame(ctx,'charge',Math.floor(clock*30),P.x,P.y-40,{center:true,scale:.9,add:true,alpha:.8});fx.frame(ctx,'halo',Math.floor(clock*30),P.x,P.y-84,{center:true,scale:1,add:true});}
  if(window.tribulation?.active)fx.frame(ctx,'storm',Math.floor(clock*15),P.x,P.y-170,{center:true,scale:1.3,alpha:.85});
  const pet=window.spiritPets?.followers?.get?.('self');
  if(pet&&petId!==undefined&&pet.id!==petId&&now>quietUntil)fx.play('egg',pet.x,pet.y+4,{scale:1});
  petId=pet?.id??null;
 }
 function flyXp(ctx,dt){
  for(let i=flyers.length-1;i>=0;i--){const f=flyers[i];f.age+=dt;if(f.age<0)continue;const t=Math.min(1,f.age/f.life),ease=t*t*(3-2*t);
   const x=f.x+(P.x-f.x)*ease+Math.sin(t*Math.PI)*f.bend,y=f.y+(P.y-40-f.y)*ease-Math.sin(t*Math.PI)*70;
   fx.frame(ctx,'xporb',Math.floor(f.age*30),x,y,{center:true,scale:.9,add:true,alpha:1-t*.3});if(t>=1)flyers.splice(i,1);}
 }

 /* ---------- world ---------- */
 const AMBIENT={'field-marsh':[['frog',3],['snake',2]],'field-meadow':[['frog',2]],'field-bamboo':[['snake',2]],'rift-wood':[['frog',2]],
  'rift-tide':[['jelly',3]],'field-abyss':[['ghost',3],['voidorb',1]],'rift-void':[['ghost',2],['voidorb',1]],worldboss:[['ghost',1]],moon:[['ghost',0]]};
 const KIND={frog:{speed:14,scale:.8,alt:0,ground:1},snake:{speed:20,scale:.9,alt:0,ground:1},jelly:{speed:12,scale:.8,alt:[60,140]},ghost:{speed:18,scale:.8,alt:[20,70],alpha:.8},voidorb:{speed:8,scale:.9,alt:[160,240],alpha:.8}};
 let critters=[],statics=[],built='';
 function walkable(x,y){try{return worldMap.canWalk({x,y});}catch{return true;}}
 function build(){
  built=scene();critters=[];statics=[];if(fx.reduced()||fx.particles()<=0)return;const v=gameCamera(),d=design(),q=fx.particles();
  for(const [kind,n] of AMBIENT[built]||[])for(let i=0;i<Math.round(n*Math.min(1,q+.2));i++){const c={kind};place(c,v);critters.push(c);}
  if(d){
   const t=theme();for(const [x,y] of d.camps||[]){const side=x<1000?-1:1;statics.push({k:t==='fire'?'brazier':'campfire',x:x+side*95,y:y-40,scale:t==='fire'?.75:.8,alpha:.95});}
   // Only the three widest pools get ripples, and only wide water gets fish.
   const pools=(d.water||[]).map(w=>{const pts=(w.pts||[]).map(p=>Array.isArray(p)?p:[p.x,p.y]);if(pts.length<3)return null;const xs=pts.map(p=>p[0]);return {cx:xs.reduce((a,b)=>a+b,0)/pts.length,cy:pts.reduce((a,p)=>a+p[1],0)/pts.length,w:Math.max(...xs)-Math.min(...xs)};}).filter(Boolean).sort((a,b)=>b.w-a.w).slice(0,3);
   for(const o of pools){statics.push({k:'ripples',x:o.cx-o.w*.18,y:o.cy+6,scale:.8,alpha:.55,ground:1});if(o.w>=140)statics.push({k:'fish',x:o.cx+o.w*.12,y:o.cy,scale:.7,alpha:.45,ground:1});}
   for(const p of d.props||[]){const o=Array.isArray(p)?{key:p[0],x:p[1],y:p[2],w:p[3]}:p;if(o.key==='mysticDais')statics.push({k:'arcaneorb',x:o.x,y:o.y-110,scale:.9,alpha:.9,center:1,add:1});}
  }
  if(/abyss|void|marsh/.test(built)){const r=mulberry(built.length*97+13),k=/marsh/.test(built)?'spiritflame':null;
   for(let i=0,n=0;i<80&&n<(/marsh/.test(built)?4:7);i++){const x=200+r()*1600,y=200+r()*1600;if(!walkable(x,y))continue;n++;statics.push({k:k||(n%2?'spiritflame':'shadowflame'),x,y,scale:.6,alpha:.85,add:1});}}
 }
 function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
 function place(c,v){const k=KIND[c.kind];c.age=0;c.frame=rnd(0,30);c.phase=rnd(0,TAU);c.alt=Array.isArray(k.alt)?rnd(...k.alt):k.alt;
  for(let i=0;i<20;i++){c.x=rnd(v.x,v.x+v.vw);c.y=rnd(v.y+40,v.y+v.vh);if(!k.ground||walkable(c.x,c.y))break;}
  const a=rnd(0,TAU);c.vx=Math.cos(a)*k.speed;c.vy=Math.sin(a)*k.speed*.5;}
 function world(ctx,v,dt){
  for(const s of statics){if(s.ground||s.x<v.x-150||s.x>v.x+v.vw+150||s.y<v.y-150||s.y>v.y+v.vh+250)continue;fx.frame(ctx,s.k,Math.floor(clock*fx.sheets[s.k].fps+s.x),s.x,s.y,{scale:s.scale,alpha:s.alpha,center:!!s.center,add:!!s.add});}
  for(const c of critters){const k=KIND[c.kind];c.age+=dt;c.frame+=dt;
   if(!k.ground){const turn=Math.sin(clock*.5+c.phase)*dt;const vx=c.vx*Math.cos(turn)-c.vy*Math.sin(turn);c.vy=c.vx*Math.sin(turn)+c.vy*Math.cos(turn);c.vx=vx;}
   const nx=c.x+c.vx*dt,ny=c.y+c.vy*dt;if(k.ground&&!walkable(nx,ny)){c.vx*=-1;c.vy*=-1;}else{c.x=nx;c.y=ny;}
   if(c.x<v.x-300||c.x>v.x+v.vw+300||c.y<v.y-300||c.y>v.y+v.vh+300)place(c,v);
   const bob=k.ground?0:Math.sin(clock*1.6+c.phase)*7;
   fx.frame(ctx,c.kind,Math.floor(c.frame*fx.sheets[c.kind].fps),c.x,c.y-c.alt+bob,{scale:k.scale,alpha:(k.alpha??.95)*Math.min(1,c.age),flip:c.vx<0,center:!k.ground});}
 }
 // Water life sits on the ground layer so actors walk over it.
 const baseGround=worldMap.drawGroundDetails;
 if(baseGround)worldMap.drawGroundDetails=function(ctx,cx,cy,vw,vh){const r=baseGround.apply(this,arguments);
  try{for(const s of statics)if(s.ground&&s.x>cx-200&&s.x<cx+vw+200&&s.y>cy-120&&s.y<cy+vh+120)fx.frame(ctx,s.k,Math.floor(clock*fx.sheets[s.k].fps+s.x),s.x,s.y,{scale:s.scale,alpha:s.alpha,center:true});}catch(e){}
  return r;};
 // Quest marker over the navigation target on this map.
 function questMark(ctx){const st=window.questNav?.state,goal=st?.goal;if(!goal||goal.map!==scene())return;const t=st.target||goal;if(t?.x==null)return;
  fx.frame(ctx,'exclaim',Math.floor(clock*30)%34+6,t.x,t.y-130+Math.sin(clock*3)*5,{center:true,scale:1.2});}
 // City fireworks.
 let nextFirework=8;
 function fireworks(v){if(scene()!=='hub'||fx.particles()<.5)return;if(clock<nextFirework)return;nextFirework=clock+rnd(14,28);
  const x=rnd(v.x+v.vw*.15,v.x+v.vw*.85);if(Math.random()<.5)fx.play('rocket',x,v.y+v.vh*.62,{scale:1.1,add:true,alpha:.9});else fx.play('firework',x,v.y+v.vh*rnd(.18,.34),{center:true,scale:1.3,add:true});}
 function sky(){if(scene()!=='moon'||fx.particles()<.3)return;const s=W/320;g.save();g.setTransform(1,0,0,1,0,0);g.beginPath();g.rect(0,0,W,H*.4);g.clip();fx.frame(g,'stars',Math.floor(clock*10),W/2,90*s*.5,{center:true,scale:s,alpha:.5,add:true});g.restore();}

 const baseSwitch=worldMap.switchScene;worldMap.switchScene=function(){quietUntil=performance.now()+3000;flyers.length=0;return baseSwitch.apply(this,arguments);};
 const baseDraw=dr;
 dr=function(){
  baseDraw();
  const now=performance.now(),dt=Math.min(.05,(now-last)/1000);last=now;clock+=dt;
  if(!P.ap){lastHp=null;return;}
  try{
   if(scene()!==built)build();
   if(fx.reduced())return;
   const v=gameCamera();sky();fireworks(v);
   g.save();g.setTransform(Z,0,0,Z,-v.x*Z,-v.y*Z);world(g,v,dt);statusMarks(g,v);player(g,now);flyXp(g,dt);questMark(g);g.restore();
  }catch(e){critters=[];}
 };
 window.pixelMore={build,flyers,statics:()=>statics,critters:()=>critters};
})();
