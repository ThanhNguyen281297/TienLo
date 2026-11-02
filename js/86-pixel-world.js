/* Living maps with pixelfx sheets (MIT, see Skill/pixelfx/LICENSE). Presentation only.
   - Ambient creatures per map: butterflies, birds, wisps, bats that drift around the camera.
   - A slow rune circle under every portal on field and rift maps.
   - Stars over stunned monsters, a summoning ring when a monster respawns.
   - Kill coins, a loot beam where equipment shards drop, a chest for reward claims
     and confetti for breakthroughs, tribulation success and new tower floors.
   Reads only scene, camera, props and mob snapshots; changes no game state. */
(function(){
 'use strict';
 const fx=window.pixelFx;if(!fx||!window.worldMap)return;
 const TAU=Math.PI*2,rnd=(a,b)=>a+Math.random()*(b-a);
 // [kind, count] per map. Unknown maps get a light default.
 const AMBIENT={
  hub:[['butterfly',3],['bird',2]],sword:[['bird',3],['butterfly',1]],moon:[['wisp',3],['butterfly',2]],
  thunder:[['wisp',2],['bird',1]],mystic:[['butterfly',3],['wisp',2]],valley:[['butterfly',3],['bird',2]],
  'field-meadow':[['butterfly',4],['bird',2]],'field-bamboo':[['butterfly',3],['bird',2]],'field-marsh':[['wisp',3],['butterfly',1]],
  'field-frost':[['bird',2]],'field-ember':[['bat',2]],'field-abyss':[['bat',3],['wisp',2]],
  'rift-wood':[['butterfly',3],['bird',1]],'rift-tide':[['wisp',3]],'rift-fire':[['bat',2]],'rift-void':[['bat',3],['wisp',2]],
  worldboss:[['bat',3]],raid:[['bat',2]],guildboss:[['wisp',2]],tower:[],duel:[['butterfly',1]],battle:[['bird',2]]
 };
 const KIND={
  butterfly:{speed:26,scale:.75,alt:[30,90],alpha:.95},
  bird:{speed:150,scale:1.15,alt:[140,260],alpha:.95},
  wisp:{speed:16,scale:.8,alt:[10,60],alpha:.85,add:true},
  bat:{speed:85,scale:.8,alt:[90,180],alpha:.92}
 };
 let critters=[],scene='',last=performance.now(),clock=0;
 const cam=()=>gameCamera();
 function place(c,v,edge){
  const k=KIND[c.kind];c.age=0;c.alt=rnd(...k.alt);c.phase=rnd(0,TAU);c.frame=rnd(0,40);
  if(c.kind==='bird'){const left=Math.random()<.5;c.x=left?v.x-120:v.x+v.vw+120;c.y=rnd(v.y,v.y+v.vh);c.vx=(left?1:-1)*k.speed*rnd(.8,1.2);c.vy=rnd(-20,20);return;}
  c.x=edge?(Math.random()<.5?v.x-60:v.x+v.vw+60):rnd(v.x,v.x+v.vw);c.y=rnd(v.y+40,v.y+v.vh);
  const a=rnd(0,TAU);c.vx=Math.cos(a)*k.speed;c.vy=Math.sin(a)*k.speed*.6;
 }
 function populate(){
  scene=worldMap.state.scene;const q=fx.particles();critters=[];if(q<=0||fx.reduced())return;
  const v=cam();for(const [kind,n] of AMBIENT[scene]||[['butterfly',2],['bird',1]])for(let i=0;i<Math.round(n*Math.min(1,q+.2));i++){const c={kind};place(c,v,false);critters.push(c);fx.sheet(kind);}
 }
 function step(dt,v){
  for(const c of critters){
   const k=KIND[c.kind];c.age+=dt;c.frame+=dt;
   if(c.kind==='butterfly'||c.kind==='wisp'){const turn=Math.sin(clock*.6+c.phase)*1.4*dt;const vx=c.vx*Math.cos(turn)-c.vy*Math.sin(turn);c.vy=c.vx*Math.sin(turn)+c.vy*Math.cos(turn);c.vx=vx;}
   else if(c.kind==='bat'){c.vx+=rnd(-160,160)*dt;c.vy+=rnd(-120,120)*dt;const sp=Math.hypot(c.vx,c.vy)||1;c.vx*=k.speed/sp;c.vy*=k.speed*.7/sp;}
   c.x+=c.vx*dt;c.y+=c.vy*dt;
   const far=c.x<v.x-260||c.x>v.x+v.vw+260||c.y<v.y-260||c.y>v.y+v.vh+260;if(far)place(c,v,true);
  }
 }
 function drawCritters(ctx){
  for(const c of critters){
   const k=KIND[c.kind],bob=c.kind==='wisp'?Math.sin(clock*2+c.phase)*8:c.kind==='butterfly'?Math.sin(clock*3+c.phase)*6:0;
   const m=fx.sheets[c.kind],fade=Math.min(1,c.age/1.2);
   // Ground shadow keeps flyers anchored to the painted terrain.
   if(c.kind!=='bird'){ctx.save();ctx.globalAlpha=.12*fade;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(c.x,c.y,8*k.scale,3*k.scale,0,0,TAU);ctx.fill();ctx.restore();}
   fx.frame(ctx,c.kind,Math.floor(c.frame*m.fps),c.x,c.y-c.alt+bob,{scale:k.scale,alpha:k.alpha*fade,flip:c.vx<0,center:true,add:k.add});
  }
 }

 /* Portals: a slow rune circle on the ground, drawn with the ground details so actors stay on top. */
 function portals(){
  const s=window.tienHiep?.scenes?.[worldMap.state.scene];if(!s)return [];
  return (s.props||[]).map(p=>Array.isArray(p)?{key:p[0],x:p[1],y:p[2],w:p[3]}:p).filter(p=>p.key==='portal');
 }
 const baseGround=worldMap.drawGroundDetails;
 if(baseGround)worldMap.drawGroundDetails=function(ctx,cx,cy,vw,vh){
  const result=baseGround.apply(this,arguments);
  try{if(!fx.reduced()&&fx.particles()>0)for(const p of portals()){if(p.x<cx-200||p.x>cx+vw+200||p.y<cy-150||p.y>cy+vh+150)continue;
   fx.frame(ctx,'rune',Math.floor(clock*15),p.x,p.y+4,{scale:Math.max(.7,(p.w||60)*2.1/114),alpha:.8});}}catch(e){}
  return result;
 };

 /* Monsters: stars while hard-controlled (server fieldEffects), summoning ring on respawn. */
 const wasDead=new WeakMap();
 function mobs(ctx,v){
  const q=fx.particles();
  for(const e of E){
   const dead=!!(e.dead>0||e.hp<=0),before=wasDead.get(e);wasDead.set(e,dead);
   if(before===true&&!dead&&q>=.3&&e.x>v.x-100&&e.x<v.x+v.vw+100&&e.y>v.y-100&&e.y<v.y+v.vh+150)fx.play('spawn',e.x,e.y+6,{scale:.8,alpha:.85});
   if(dead)continue;
   if(e.fieldEffects?.some?.(f=>f.hard>0)){const k=T[e.t]||{s:40};fx.frame(ctx,'stun',Math.floor(clock*30),e.x,e.y-k.s-8,{scale:1.1,center:true});}
  }
 }

 /* Rewards. */
 if(window.creatureArt?.onNetworkDamage){const base=creatureArt.onNetworkDamage;creatureArt.onNetworkDamage=function(e,dead){
  try{if(dead&&e&&Math.hypot(e.x-P.x,e.y-P.y)<700)fx.play('coin',e.x,e.y-26,{scale:1,life:1,vy:38,alpha:.95});}catch(err){}
  return base.apply(this,arguments);};}
 if(window.shardsGame?.onDrop){const base=shardsGame.onDrop;shardsGame.onDrop=function(got,reward){
  try{const x=reward?.x??P.x,y=reward?.y??P.y;fx.play('lootbeam',x,y+4,{scale:.9,life:2.6,add:true});}catch(err){}
  return base.apply(this,arguments);};}
 const CONFETTI=/Độ kiếp thành công|Tu luyện thành công|Vạn Tầng Tháp · tầng ([2-9]|\d{2,})/,CHEST=/^(Nhận |Đã nhận thư|Đã nhận thưởng)/;
 const baseMsg=msg;let lastCheer=0;
 msg=function(s){
  try{const t=String(s??''),now=performance.now();if(P.ap&&now-lastCheer>1500){
   if(CONFETTI.test(t)){lastCheer=now;fx.play('confetti',P.x,P.y-40,{scale:1.5});}
   else if(CHEST.test(t)){lastCheer=now;fx.play('chest',P.x+50,P.y+8,{scale:.9});}}}catch(e){}
  return baseMsg.apply(this,arguments);
 };

 const baseDraw=dr;
 dr=function(){
  baseDraw();
  const now=performance.now(),dt=Math.min(.05,(now-last)/1000);last=now;clock+=dt;
  if(!P.ap)return;
  try{
   if(worldMap.state.scene!==scene)populate();
   const v=cam();step(dt,v);
   g.save();g.setTransform(Z,0,0,Z,-v.x*Z,-v.y*Z);mobs(g,v);drawCritters(g);g.restore();
  }catch(e){critters=[];}
 };
 window.graphicsSettings&&addEventListener('tienlo-graphics',()=>{scene='';});
 window.pixelWorld={populate,critters:()=>critters};
})();
