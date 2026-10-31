/* Linh thú (pets). Ownership and tiers come from the server (P.world.petBook is
   written only by /api/pets, raid chests and shard exchange). The pet item worn in
   the Linh thú gear slot follows its owner, casts its skill (js/35e-pet-combat.js)
   and adds flat HP/attack. Pets are bought and raised at the Ngự Thú Sư in
   Thiên Vân Thành; the item card shows the pet's skill and stats. */
(function(){
 const world=worldMap,d=world.dialog,ui=visualUI,TITLE='Ngự Thú Sư · Linh thú';
 const NPC=(a=>a?{x:a[0],y:a[1]}:{x:445,y:1160})(window.sceneAnchors?.hub?.stable);
 // Follower height and hover for species drawn from the expedition atlases.
 const LOOK={Ech:{h:30},Soi:{h:36},TeGiac:{h:36},BoCap:{h:32},RongNuoc:{h:40,fly:8},PhuongHoang:{h:40,fly:9},RongXuong:{h:40,fly:7}};
 const state={stable:null,busy:false};
 const meta=id=>equipmentData.byId.get('pet-'+id);
 // ---------- the worn pet
 function active(){const item=P.world?.equip?.linhthu,id=item?.petId;if(!id||!P.world?.petBook?.owned?.[id])return null;const m=meta(id);return m?{id,species:m.species,name:m.name,uid:item.uid}:null;}
 const tierOf=id=>P.world?.petBook?.owned?.[id]||1;
 const statsOf=(m,tier)=>{const k=1+.3*(tier-1);return {hp:Math.round((m.baseHp||0)*k),atk:Math.round((m.baseAtk||0)*k)};};
 // Same flat bonus the server counts in player_attack / player_max_hp.
 const stats=window.bonusStats;window.bonusStats=function(){const base=stats(),pet=active();if(!pet)return base;const s=statsOf(meta(pet.id),tierOf(pet.id));return {...base,hp:(base.hp||0)+s.hp,atk:(base.atk||0)+s.atk};};

 // ---------- art: the four classic pets use the creature sheets, the rest the expedition atlases
 const pictures=new Map(),cache=new Map();
 function classic(species,moving,time){const sheets=spriteCatalog.monsterFrames?.[species];if(!sheets)return null;const sheet=sheets[species==='BoNgua'||species==='Tho'?(moving?1:0):0],m=sheet[Math.floor(time*(moving?9:5))%sheet.length];
  if(!pictures.has(m.src)){const image=new Image();image.src=artworkURL(m.src);pictures.set(m.src,image);}return {meta:m,image:pictures.get(m.src),idle:sheets[0][0]};}
 function atlas(species,moving,time){const kind=window.expeditionMonsters?.kinds?.get(species);if(!kind)return null;const image=kind.ensure();if(!image.complete||!image.naturalWidth)return null;
  const row=moving?1:0,index=Math.floor(time*(moving?10:5))%4;return {image,f:kind.meta.frames[row*4+index],row,index,faceRight:kind.meta.faceRight[row],sourceHeight:kind.meta.sourceHeight,species};}
 function raster(fr,height){const key=fr.species+'/'+fr.row+'/'+fr.index+'/'+height;let hit=cache.get(key);if(hit)return hit;
  const [sx,sy,w,h]=fr.f.rect,scale=height/fr.sourceHeight,px=Math.max(16,Math.min(256,Math.round(h*scale*Z))),canvas=document.createElement('canvas');canvas.height=px;canvas.width=Math.max(1,Math.round(px*w/h));
  const c=canvas.getContext('2d');c.imageSmoothingQuality='high';c.drawImage(fr.image,sx,sy,w,h,0,0,canvas.width,canvas.height);
  hit={canvas,scale,pad:(window.groundPad?.(fr.image,sx,sy,w,Math.min(h,fr.f.anchor[1]))||0)*Math.min(h,fr.f.anchor[1]),w,h};cache.set(key,hit);if(cache.size>160)cache.delete(cache.keys().next().value);return hit;}
 function shadow(ctx,x,y,w){ctx.save();ctx.fillStyle='rgba(20,18,12,.28)';ctx.beginPath();ctx.ellipse(x,y+1,w,w*.28,0,0,Math.PI*2);ctx.fill();ctx.restore();}
 // Draws a creature standing at (x,y); returns its drawn height (for the name tag).
 function drawCreature(ctx,species,x,y,facing,moving,time){
  const c=classic(species,moving,time);
  if(c){if(!c.image.complete||!c.image.naturalWidth)return 0;const scale=25/c.idle.rect.h,height=c.meta.rect.h*scale,bob=species==='Doi'?Math.sin(time*6)*2-5:0;
   ctx.save();ctx.translate(x,y+bob);if(facing<0)ctx.scale(-1,1);renderArtwork(ctx,c.image,-c.meta.rect.w*scale/2-c.meta.padding*scale,-height-c.meta.padding*scale,c.image.naturalWidth*scale,c.image.naturalHeight*scale);ctx.restore();return height-bob;}
  const look=LOOK[species]||{h:32},fr=atlas(species,moving,time);if(!fr)return 0;const hit=raster(fr,look.h),hover=look.fly?look.fly+Math.sin(time*3)*2:0;
  shadow(ctx,x,y,look.h*.4);const [ax,ay]=fr.f.anchor;ctx.save();ctx.translate(x,y-hover);if((facing>0)!==fr.faceRight)ctx.scale(-1,1);ctx.drawImage(hit.canvas,-ax*hit.scale,-(ay-hit.pad)*hit.scale,hit.w*hit.scale,hit.h*hit.scale);ctx.restore();return look.h+hover;}

 // ---------- followers (own pet and other players' pets)
 const followers=new Map();let lastScene=world.state.scene;
 function follow(key,pet,x,y,dir,facing,dt){if(!pet?.species){followers.delete(key);return;}let f=followers.get(key);if(!f||f.id!==pet.id){f={...pet,x:x-28,y:y+18,time:0,moving:false};followers.set(key,f);}
  let tx=x+(dir===2?-facing*36:-32),ty=y+(dir===1?26:18);if(!world.canWalk({x:tx,y:ty})){tx=x;ty=y;}if(!world.canWalk(f)){f.x=x;f.y=y;}const distance=Math.hypot(tx-f.x,ty-f.y);if(distance>300){f.x=tx;f.y=ty;}
  const step=Math.min(distance,220*dt,distance*(1-Math.exp(-dt*6)));f.moving=distance>8;f.facing=tx>=f.x?1:-1;if(distance>1){const end=world.traceMove(f,{x:f.x+(tx-f.x)/distance*step,y:f.y+(ty-f.y)/distance*step});f.x=end.x;f.y=end.y;}f.time+=dt;}
 // Pets are drawn larger and animated: breathing at rest, a hop while running, a crouch,
 // lunge toward the target and a bright flash of their colour when they cast.
 const PET_SCALE=1.45;
 function draw(ctx,f){const cast=window.petCombat?.effects?.find(e=>e.petId===f.id&&e.age<.6),t=f.time,col=window.petCatalog?.[f.species]?.color||'#ffffff';
  let sx=1,sy=1,lift=0,dx=0,flash=0;
  if(cast){const p=cast.age/.6,wind=Math.min(1,p/.18),strike=p<.18?0:Math.sin(Math.min(1,(p-.18)/.42)*Math.PI);const dir=Math.sign((cast.tx??f.x)-f.x)||f.facing||1;
   f.facing=dir;sx=1+.12*wind*(1-strike)-.06*strike;sy=1-.14*wind*(1-strike)+.12*strike;dx=dir*(-5*wind*(1-strike)+22*strike);lift=12*strike;flash=strike;}
  else if(f.moving){const hop=Math.abs(Math.sin(t*10));lift=hop*4;sy=1+(hop-.5)*.08;sx=1-(hop-.5)*.05;}
  else{const b=Math.sin(t*2.6);sy=1+b*.035;sx=1-b*.02;lift=Math.max(0,Math.sin(t*1.3))*1.2;}
  ctx.save();ctx.fillStyle='rgba(20,18,12,.3)';ctx.beginPath();ctx.ellipse(f.x+dx*.5,f.y+1,13*PET_SCALE*(1-lift/40),4*PET_SCALE*(1-lift/40),0,0,Math.PI*2);ctx.fill();ctx.restore();
  ctx.save();ctx.translate(f.x+dx,f.y-lift);ctx.scale(PET_SCALE*sx,PET_SCALE*sy);ctx.translate(-f.x,-f.y);
  const h0=drawCreature(ctx,f.species,f.x,f.y,f.facing,f.moving||!!cast,t);
  if(flash>0&&h0){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=flash*.8;drawCreature(ctx,f.species,f.x,f.y,f.facing,true,t);}
  ctx.restore();
  if(flash>0){ctx.save();ctx.globalCompositeOperation='lighter';const gr=ctx.createRadialGradient(f.x+dx,f.y-20,0,f.x+dx,f.y-20,40);gr.addColorStop(0,col);gr.addColorStop(1,'rgba(0,0,0,0)');ctx.globalAlpha=flash*.5;ctx.fillStyle=gr;ctx.fillRect(f.x+dx-40,f.y-60,80,80);ctx.restore();}
  const h=h0*PET_SCALE*sy+lift;if(!h0)return;
  ctx.save();ctx.font='700 7px "Noto Serif",Georgia,serif';ctx.textAlign='center';ctx.strokeStyle='#1a0a05';ctx.lineWidth=2.4;ctx.strokeText(f.name,f.x,f.y-h-6);ctx.fillStyle=col;ctx.fillText(f.name,f.x,f.y-h-6);ctx.restore();}
 const update=up;up=function(dt){const result=update(dt);if(!P.ap||!account.state.ready||paused()||d.isOpen())return result;
  if(lastScene!==world.state.scene){followers.clear();lastScene=world.state.scene;}
  follow('self',active(),P.x,P.y,P.dir,P.f,dt);const seen=new Set(['self']);
  for(const peer of window.onlineWorld?.state.players||[]){const key='peer-'+peer.id;seen.add(key);follow(key,peer.pet,peer.drawX??peer.x,peer.drawY??peer.y,peer.dir,peer.f,dt);}
  for(const key of followers.keys())if(!seen.has(key))followers.delete(key);return result;};
 const queue=world.queueActors;world.queueActors=function(items,cx,cy,vw,vh){queue.call(this,items,cx,cy,vw,vh);
  for(const f of followers.values())if(f.x>cx-60&&f.x<cx+vw+60&&f.y>cy-70&&f.y<cy+vh+60)items.push([f.y,()=>draw(g,f)]);
  // Two beasts idle beside the Ngự Thú Sư.
  if(world.state.scene==='hub')for(const [species,x,y,f] of [['Soi',NPC.x-52,NPC.y-32,1],['TeGiac',NPC.x+62,NPC.y+28,-1]])if(x>cx-80&&x<cx+vw+80&&y>cy-80&&y<cy+vh+80)items.push([y,()=>drawCreature(g,species,x,y,f,false,tm+x*.01)]);};
 addEventListener('tienlo-auth',()=>followers.clear());
 const respawn=classCombat.onRespawn;classCombat.onRespawn=function(){followers.clear();return respawn();};

 // ---------- item card: skill and stats of a pet
 const render=itemCards.render;itemCards.render=function(root,item,options){const panel=render.call(this,root,item,options);const m=equipmentData.byId.get(item?.id);
  if(m?.slot==='linhthu'&&panel){const tier=tierOf(m.petId),s=statsOf(m,tier),box=ui.node('div','pet-card-info');
   box.append(ui.node('b','','Bậc '+tier+'/5 · +'+s.hp+' Sinh lực · +'+s.atk+' Tấn công'));
   const skill=ui.node('div','pet-card-skill');skill.append(ui.node('strong','','✦ '+m.skillName+' · hồi '+m.skillCooldown+' giây'),ui.node('p','',m.skillDesc));box.append(skill);
   box.append(ui.node('small','','Mặc vào ô Linh thú để xuất chiến. Bồi dưỡng tại Ngự Thú Sư (Thiên Vân Thành).'));panel.append(box);}
  return panel;};

 // ---------- Ngự Thú Sư (hub service)
 function addService(){if(world.state.scene==='hub'&&!world.services.some(s=>s.id==='stable'))world.services.push({id:'stable',name:'Ngự Thú Sư · Linh thú',x:NPC.x,y:NPC.y,color:'#e8c48a',npc:true});}
 addService();const change=world.switchScene;world.switchScene=function(...a){const r=change.apply(this,a);addService();return r;};
 const service=world.handleService;world.handleService=function(id){if(id==='stable'){open();return true;}return service(id);};
 const npc=creatureArt.drawNpc;creatureArt.drawNpc=function(ctx,s){return npc.call(this,ctx,s.id==='stable'?{...s,id:'arena'}:s);};
 const fmt=n=>Number(n||0).toLocaleString('vi-VN');
 async function load(){try{state.stable=(await account.api('/api/pets')).stable;}catch(e){msg(e.message);}}
 async function act(action,id){if(state.busy)return;state.busy=true;try{const r=await account.transact('/api/pets',{action,id,opId:crypto.randomUUID()},{live:true,gold:true,world:['petBook','equip']});state.stable=r.stable;if(r.message)msg(r.message);
   if(action==='buy'||action==='upgrade')window.skillImpact?.flash?.('#ffd27a');window.gameAudio?.play?.('reward');}
  catch(e){msg(e.message);}finally{state.busy=false;show();}}
 async function open(){if(!P.ap)return;d.show(TITLE,'Linh thú theo bạn chiến đấu, tự dùng kỹ năng và cộng sinh lực, tấn công.');$('world-content').closest('section')?.classList.add('visual-dialog');show();await load();show();}
 function show(){const content=$('world-content');if(!content||$('world-title').textContent!==TITLE)return;content.replaceChildren();
  const x=state.stable;if(!x){content.append(ui.node('p','world-line','Đang gọi linh thú…'));return;}
  content.append(ui.node('p','world-line pet-wallet','◈ '+fmt(x.gold)+' Linh Thạch · ✧ '+fmt(x.fragments)+' mảnh linh khí · Thu phục ở đây sẽ nhận vật phẩm linh thú; mặc vào ô Linh thú (hành trang, cột phải) để xuất chiến.'));
  const grid=ui.node('div','pet-grid');content.append(grid);
  for(const p of x.pets){const m=meta(p.id)||{};const card=ui.node('article','pet-shop-card'+(p.active?' active':'')+(p.owned?' owned':'')+(p.locked?' locked':''));grid.append(card);
   const art=ui.node('div','pet-art');art.append(ui.art(m.art,'pet-thumb'));if(p.owned)art.append(ui.node('span','pet-tier','Bậc '+p.tier+'/'+x.maxTier));card.append(art);
   const body=ui.node('div','pet-body');card.append(body);body.append(ui.node('h3','',p.name),ui.node('p','pet-desc',p.desc),ui.node('p','pet-skill','✦ '+m.skillName+' · '+m.skillDesc));
   ui.chips([['Sinh lực','+'+p.hp],['Tấn công','+'+p.atk],['Cấp',p.level]],body);
   const row=ui.node('div','pet-actions');body.append(row);
   if(!p.owned){if(p.source)row.append(ui.node('small','pet-source','✦ '+p.source));
     else ui.action(row,p.locked?'Cần cấp '+p.level:'Thu phục · '+(p.gold?fmt(p.gold)+' ◈':fmt(p.fragments)+' mảnh'),()=>act('buy',p.id),p.locked||state.busy||(p.gold?x.gold<p.gold:x.fragments<p.fragments));}
   else{if(p.where==='equip')ui.action(row,'Thu hồi',()=>act('unequip'),state.busy);else ui.action(row,p.where==='bag'?'Xuất chiến':'Nhận & xuất chiến',()=>act('equip',p.id),state.busy);
     if(!p.where)ui.action(row,'Nhận vào túi',()=>act('take',p.id),state.busy);
     if(p.upgrade)ui.action(row,'Bồi dưỡng · '+fmt(p.upgrade)+' ◈ (→ +'+p.nextHp+' SL, +'+p.nextAtk+' công)',()=>act('upgrade',p.id),state.busy||x.gold<p.upgrade);else row.append(ui.node('small','pet-source','Đã đạt bậc tối đa'));}}
 }
 const css=document.createElement('style');css.textContent=`
.pet-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:10px;margin-top:8px}
.pet-shop-card{display:flex;gap:10px;padding:10px;border-radius:12px;border:1px solid #6a5a3a88;background:linear-gradient(160deg,#1b2b30f0,#121c20f0);min-width:0}
.pet-shop-card.owned{border-color:#b8925088}.pet-shop-card.active{border-color:#ffd27a;box-shadow:0 0 0 1px #ffd27a55,0 0 16px #ffc85a33}.pet-shop-card.locked{opacity:.7}
.pet-art{position:relative;flex:0 0 92px;height:92px;border-radius:10px;background:radial-gradient(circle at 50% 70%,#3a5560,#101c22);display:grid;place-items:center;overflow:hidden}
.pet-thumb{max-width:88px;max-height:88px;object-fit:contain}.pet-tier{position:absolute;bottom:4px;right:4px;font:700 10px Arial;padding:2px 6px;border-radius:8px;background:#5a4012e6;color:#ffe3a0}
.pet-body{min-width:0;flex:1}.pet-body h3{margin:0 0 2px;font-size:15px;color:#ffe3a8}.pet-desc{margin:0 0 4px;font-size:12px;color:#c9d6cf;line-height:1.35}.pet-skill{margin:0 0 6px;font-size:12px;color:#a8f0c8;line-height:1.35}
.pet-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.pet-actions .visual-action{font-size:12px}.pet-source{color:#e8c48a;font-size:12px}.pet-wallet{font-size:12px}
.pet-card-info{display:grid;gap:6px;margin-top:8px;padding:10px;border-radius:10px;border:1px solid #6fae8a66;background:#10231c}.pet-card-info b{color:#ffe3a8;font-size:13px}
.pet-card-skill strong{color:#a8f0c8;font-size:13px}.pet-card-skill p{margin:3px 0 0;font-size:12px;color:#c9d6cf}.pet-card-info small{font-size:11px;color:#9fb7b0}`;document.head.append(css);
 // Kept name: 35e-pet-combat.js reads the worn pet and the follower positions from here.
 window.spiritPets={active,followers,open,drawCreature};
})();
