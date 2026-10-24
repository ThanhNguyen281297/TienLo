/* Thú cưỡi. Ownership, stats and tiers come from the server (P.world.mounts is
   written only by /api/mounts and raid chests). This module draws the mount under
   riders (local and remote), applies the speed bonus while riding, dismounts during
   combat (remounts 3 s later) and renders the Mã Phu stable panel. */
(function(){
 const world=worldMap,d=world.dialog,ui=visualUI;
 const SPECIES={'doc-thiem':'Ech','bang-lang':'Soi','loi-te':'TeGiac','diem-hat':'BoCap','thuy-long':'RongNuoc','phan-phuong':'PhuongHoang','cot-long':'RongXuong'};
 const BASE={'doc-thiem':1.2,'bang-lang':1.3,'loi-te':1.35,'diem-hat':1.35,'thuy-long':1.45,'phan-phuong':1.5,'cot-long':1.5};
 // Display height, saddle lift and how much of the body covers the rider's legs (fractions of height).
 const LOOK={Ech:{h:40,lift:.5,cover:.62,dx:-3},Soi:{h:50,lift:.5,cover:.6,dx:-6},TeGiac:{h:50,lift:.52,cover:.6,dx:-4},BoCap:{h:44,lift:.48,cover:.55,dx:-2},
  RongNuoc:{h:60,lift:.42,cover:.5,dx:0,fly:9},PhuongHoang:{h:62,lift:.4,cover:.5,dx:-2,fly:12},RongXuong:{h:60,lift:.46,cover:.52,dx:-4,fly:10}};
 const STATS={'doc-thiem':[30,2],'bang-lang':[80,5],'loi-te':[160,9],'diem-hat':[140,12],'thuy-long':[260,16],'phan-phuong':[320,22],'cot-long':[360,26]};
 const NO_RIDE=new Set(['arena','battle','raid','tower','worldboss','duel']);
 const STABLE={x:830,y:1345};
 const state={stable:null,busy:false,combatUntil:0,pref:true};
 try{state.pref=localStorage.getItem('tienlo.ride')!=='0';}catch{}
 const record=()=>P.world?.mounts||null;
 const active=()=>{const r=record();return r?.active&&r.owned?.[r.active]?r.active:null;};
 const tier=()=>record()?.owned?.[active()]||1;
 const multiplier=()=>{const id=active();return id?Math.min(1.6,BASE[id]+.02*(tier()-1)):1;};
 const allowed=()=>!NO_RIDE.has(world.state.scene)&&!window.duelGame?.active?.();
 const riding=()=>!!(state.pref&&active()&&allowed()&&P.ap&&!P.med&&P.hp>0&&performance.now()>state.combatUntil);

 // Same flat bonus the server counts in player_attack / player_max_hp.
 const stats=window.bonusStats;window.bonusStats=function(){const base=stats();const id=active();if(!id)return base;const k=1+.3*(tier()-1);return {...base,hp:(base.hp||0)+Math.round(STATS[id][0]*k),atk:(base.atk||0)+Math.round(STATS[id][1]*k)};};
 // ---------- art
 const kinds=()=>window.expeditionMonsters?.kinds;
 const cache=new Map();
 function frame(species,moving,phase){const kind=kinds()?.get(species);if(!kind)return null;const image=kind.ensure();if(!image.complete||!image.naturalWidth)return null;
  const row=moving?1:0,index=Math.floor((tm+phase)*(moving?10:5))%4,f=kind.meta.frames[row*4+index];
  return {image,f,row,index,faceRight:kind.meta.faceRight[row],sourceHeight:kind.meta.sourceHeight,species};}
 function raster(fr,height){const key=fr.species+'/'+fr.row+'/'+fr.index+'/'+height;let hit=cache.get(key);if(hit)return hit;
  const [sx,sy,w,h]=fr.f.rect,scale=height/fr.sourceHeight,px=Math.max(16,Math.min(512,Math.round(h*scale*Z))),canvas=document.createElement('canvas');canvas.height=px;canvas.width=Math.max(1,Math.round(px*w/h));
  const c=canvas.getContext('2d');c.imageSmoothingQuality='high';c.drawImage(fr.image,sx,sy,w,h,0,0,canvas.width,canvas.height);
  const pad=(window.groundPad?.(fr.image,sx,sy,w,Math.min(h,fr.f.anchor[1]))||0)*Math.min(h,fr.f.anchor[1]);
  // Horizontal centre of the solid body (where the saddle goes), measured once per frame.
  let sum=0,count=0;try{const data=c.getImageData(0,0,canvas.width,canvas.height).data;for(let y=Math.floor(canvas.height*.3);y<canvas.height*.8;y+=2)for(let x=0;x<canvas.width;x+=2)if(data[(y*canvas.width+x)*4+3]>140){sum+=x;count++;}}catch{}
  hit={canvas,scale,pad,w,h,ay:fr.f.anchor[1],center:count?sum/count*(w/canvas.width):fr.f.anchor[0],front:new Map()};
  cache.set(key,hit);if(cache.size>160)cache.delete(cache.keys().next().value);return hit;}
 // The lower body, faded in under the saddle line, is drawn again over the rider's legs.
 function front(hit,coverPx){const key=Math.round(coverPx);let canvas=hit.front.get(key);if(canvas)return canvas;
  const src=hit.canvas;canvas=document.createElement('canvas');canvas.width=src.width;canvas.height=src.height;const c=canvas.getContext('2d');c.drawImage(src,0,0);
  const k=src.height/hit.h,ground=(hit.ay-hit.pad)*k,line=Math.max(0,ground-(coverPx/hit.scale)*k);
  c.globalCompositeOperation='destination-in';const fade=Math.max(2,src.height*.05),gr=c.createLinearGradient(0,line-fade,0,line+fade);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'#000');c.fillStyle=gr;c.fillRect(0,0,canvas.width,canvas.height);
  hit.front.set(key,canvas);return canvas;}
 function place(ctx,hit,fr,x,y,f,canvas){const [ax,ay]=fr.f.anchor;ctx.save();ctx.translate(x,y);if((f>0)!==fr.faceRight)ctx.scale(-1,1);ctx.imageSmoothingQuality='high';
  ctx.drawImage(canvas,-ax*hit.scale,-(ay-hit.pad)*hit.scale,hit.w*hit.scale,hit.h*hit.scale);ctx.restore();}
 function shadow(ctx,x,y,w,a){ctx.save();ctx.fillStyle='rgba(20,18,12,'+a+')';ctx.beginPath();ctx.ellipse(x,y+1,w,w*.28,0,0,Math.PI*2);ctx.fill();ctx.restore();}

 // ---------- riders
 let riders=new WeakMap();
 function mark(){riders=new WeakMap();if(riding())riders.set(P.ap,{id:active(),moving:P.mv,phase:0});
  for(const p of window.onlineWorld?.state.players||[])if(p.mount&&SPECIES[p.mount.id]&&!p.med)riders.set(p.ap,{id:p.mount.id,moving:Math.hypot(p.x-(p.drawX??p.x),p.y-(p.drawY??p.y))>.5,phase:(p.id%7)*.13});}
 const queue=world.queueActors;world.queueActors=function(items,...args){mark();return queue.call(this,items,...args);};
 const baseDraw=drawChar;
 drawChar=function(ctx,x,y,dir,f,moving,t,attack,ap,...rest){
  const m=ctx===g&&ap&&riders.get(ap);if(!m)return baseDraw.call(this,ctx,x,y,dir,f,moving,t,attack,ap,...rest);
  const species=SPECIES[m.id],look=LOOK[species],fr=frame(species,m.moving,m.phase);
  if(!fr)return baseDraw.call(this,ctx,x,y,dir,f,moving,t,attack,ap,...rest);
  const hit=raster(fr,look.h),face=f<0?-1:1,hover=look.fly?look.fly+Math.sin(tm*3+m.phase*9)*2.5:0,top=y-hover;
  const flip=(face>0)!==fr.faceRight?-1:1,riderX=x+((hit.center-fr.f.anchor[0])*hit.scale*flip)+look.dx*face,lift=look.h*look.lift;
  shadow(ctx,x,y,look.h*.42,look.fly?.22:.3);
  // The rider's formation spreads on the ground under the mount, not at saddle height.
  const eq=window.equipmentSystem;eq?.drawFormation?.(ctx,x,y,ap,null,Math.max(1.15,look.h*2.1/86));
  place(ctx,hit,fr,x,top,face,hit.canvas);
  if(eq)eq.suppressFormation=true;let r;try{r=baseDraw.call(this,ctx,riderX,top-lift,2,face,false,t,attack,ap,...rest);}finally{if(eq)eq.suppressFormation=false;}
  place(ctx,hit,fr,x,top,face,front(hit,look.h*look.cover));
  if(look.fly&&m.moving&&Math.random()<.3)PT.push({x:x+rn(-12,12),y:top-rn(0,8),vx:-face*rn(10,30),vy:rn(-8,4),l:.6,m:.6,c:species==='RongNuoc'?'#9fdcff':species==='RongXuong'?'#7fb6ff':'#ffb36a',s:rn(1,2)});
  return r;};

 // ---------- speed and combat dismount
 const update=up;up=function(dt){const x=P.x,y=P.y,acd=P.acd,mp=P.mp,result=update(dt);
  if(P.acd>acd+.01||P.mp<mp-.5)state.combatUntil=performance.now()+3000;
  if(riding()&&!window.classCombat?.isDashing?.()){const dx=P.x-x,dy=P.y-y,dist=Math.hypot(dx,dy),max=(150+P.r*10)*dt*1.05;
   if(dist>0&&dist<=max){const k=multiplier()-1,to={x:Math.max(20,Math.min(M-20,P.x+dx*k)),y:Math.max(20,Math.min(M-20,P.y+dy*k))},end=world.traceMove?world.traceMove(P,to):to;P.x=end.x;P.y=end.y;}}
  paint();return result;};
 const cast=skill;skill=function(i){const before=P.mp,r=cast(i);if(P.mp<before)state.combatUntil=performance.now()+3000;return r;};
 const attack=basicCombat.attack;basicCombat.attack=function(...a){const r=attack.apply(this,a);if(r)state.combatUntil=performance.now()+3000;return r;};

 // ---------- HUD toggle (under the PK button)
 const btn=document.createElement('button');btn.id='mount-toggle';btn.type='button';btn.hidden=true;btn.textContent='🐎';btn.setAttribute('aria-label','Cưỡi thú');document.body.append(btn);
 btn.onclick=()=>{if(paused())return;toggle();};
 function toggle(){if(!active()){openStable();return;}state.pref=!state.pref;try{localStorage.setItem('tienlo.ride',state.pref?'1':'0');}catch{}
  window.gameAudio?.play?.('tap');msg(state.pref?'🐎 Lên '+(state.stable?.mounts.find(m=>m.id===active())?.name||'thú cưỡi')+(allowed()?'':' (vùng này không thể cưỡi)'):'Xuống thú cưỡi.');paint();}
 let painted='';function paint(){const show=!!(P.ap&&account.state.ready&&active()&&allowed()&&!paused());const key=show+'/'+riding()+'/'+state.pref;if(key===painted)return;painted=key;
  btn.hidden=!show;btn.classList.toggle('on',riding());btn.classList.toggle('wait',state.pref&&!riding());
  const hud=window.vlHud,species=SPECIES[active()];if(hud&&species){if(!btn.querySelector('canvas')){btn.replaceChildren(document.createElement('canvas'),document.createElement('span'));btn.firstChild.width=btn.firstChild.height=96;}
   const url=creatureArt.thumbnail?.(species);if(url&&btn.dataset.art!==url){btn.dataset.art=url;const image=new Image();image.onload=()=>hud.paint(btn.firstChild,image);image.src=url;}else if(!url){creatureArt.ensureSpecies?.(species);painted='';}
   btn.lastChild.textContent=riding()?'Đang cưỡi':state.pref?'Giao chiến':'Cưỡi';}btn.title=riding()?'Đang cưỡi · bấm để xuống (phím H)':state.pref?'Đang giao chiến · tự lên lại sau 3 giây':'Bấm để cưỡi (phím H)';}
 addEventListener('keydown',e=>{if(e.key?.toLowerCase()!=='h'||e.repeat||/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)||paused()||!P.ap||!active())return;toggle();});

 // ---------- Mã Phu stable (hub service + HUD icon)
 const hudButton=document.createElement('button');hudButton.id='mount-button';hudButton.type='button';hudButton.textContent='Thú cưỡi';hudButton.onclick=()=>{if(!paused())openStable();};
 ($('hud-more-menu')||$('bt')).append(hudButton);
 function addService(){if(world.state.scene==='hub'&&!world.services.some(s=>s.id==='stable'))world.services.push({id:'stable',name:'Mã Phu · Thú cưỡi',x:STABLE.x,y:STABLE.y,color:'#e8c48a',npc:true});}
 addService();const change=world.switchScene;world.switchScene=function(...a){const r=change.apply(this,a);addService();painted='';return r;};
 const service=world.handleService;world.handleService=function(id){if(id==='stable'){openStable();return true;}return service(id);};
 const npc=creatureArt.drawNpc;creatureArt.drawNpc=function(ctx,s){return npc.call(this,ctx,s.id==='stable'?{...s,id:'arena'}:s);};
 // Two tethered mounts idle beside the stable master.
 world.queueActors=(previous=>function(items,cx,cy,vw,vh){previous.call(this,items,cx,cy,vw,vh);if(world.state.scene!=='hub')return;
  for(const [species,x,y,f] of [['Soi',STABLE.x-48,STABLE.y+44,1],['TeGiac',STABLE.x+62,STABLE.y+40,-1]])if(x>cx-80&&x<cx+vw+80&&y>cy-80&&y<cy+vh+80)items.push([y,()=>{const fr=frame(species,false,x*.01);if(!fr)return;const hit=raster(fr,LOOK[species].h);shadow(g,x,y,LOOK[species].h*.42,.3);place(g,hit,fr,x,y,f,hit.canvas);}]);})(world.queueActors);

 async function load(){try{state.stable=(await account.api('/api/mounts')).stable;}catch(e){msg(e.message);}}
 async function act(action,id){if(state.busy)return;state.busy=true;try{const result=await account.transact('/api/mounts',{action,id,opId:crypto.randomUUID()},{live:true,gold:true,world:["mounts"]});state.stable=result.stable;if(result.message)msg(result.message);
   if(action==='buy'||action==='equip'){state.pref=true;try{localStorage.setItem('tienlo.ride','1');}catch{}}if(action==='buy'||action==='upgrade')window.skillImpact?.flash?.('#ffd27a');window.gameAudio?.play?.('reward');}
  catch(e){msg(e.message);}finally{state.busy=false;painted='';render();}}
 const fmt=n=>Number(n||0).toLocaleString('vi-VN');
 async function openStable(){if(!P.ap)return;d.show('Mã Phu · Thú cưỡi','Thú cưỡi tăng tốc độ di chuyển và cộng sinh lực, tấn công.');$('world-content').closest('section')?.classList.add('visual-dialog');render();await load();render();}
 function render(){const content=$('world-content');if(!content||$('world-title').textContent!=='Mã Phu · Thú cưỡi')return;content.replaceChildren();
  const x=state.stable;if(!x){content.append(ui.node('p','world-line','Đang dắt thú ra chuồng…'));return;}
  content.append(ui.node('p','world-line mount-wallet','◈ '+fmt(x.gold)+' Linh Thạch · ✧ '+fmt(x.fragments)+' mảnh linh khí · Thú xuất hành cộng chỉ số kể cả khi không cưỡi. Phím H hoặc nút 🐎 để lên/xuống.'));
  const grid=ui.node('div','mount-grid');content.append(grid);
  for(const m of x.mounts){const card=ui.node('article','mount-card'+(m.active?' active':'')+(m.owned?' owned':'')+(m.locked?' locked':''));grid.append(card);
   const art=ui.node('div','mount-art');const thumb=creatureArt.thumbnail?.(m.species);if(thumb)art.append(ui.art(thumb,'mount-thumb'));else{creatureArt.ensureSpecies?.(m.species);setTimeout(render,700);}
   if(m.fly)art.append(ui.node('span','mount-tag','Bay'));if(m.owned)art.append(ui.node('span','mount-tier','Bậc '+m.tier+'/'+x.maxTier));card.append(art);
   const body=ui.node('div','mount-body');card.append(body);body.append(ui.node('h3','',m.name),ui.node('p','mount-desc',m.desc));
   ui.chips([['Tốc độ','+'+Math.round((m.speed-1)*100)+'%'],['Sinh lực','+'+m.hp],['Tấn công','+'+m.atk],['Cấp',m.level]],body);
   const row=ui.node('div','mount-actions');body.append(row);
   if(!m.owned){if(m.source)row.append(ui.node('small','mount-source','✦ '+m.source));
     else ui.action(row,m.locked?'Cần cấp '+m.level:'Thu phục · '+(m.gold?fmt(m.gold)+' ◈':fmt(m.fragments)+' mảnh'),()=>act('buy',m.id),m.locked||state.busy||(m.gold?x.gold<m.gold:x.fragments<m.fragments));}
   else{if(!m.active)ui.action(row,'Xuất hành',()=>act('equip',m.id),state.busy);else ui.action(row,'Cho về chuồng',()=>act('unequip'),state.busy);
     if(m.upgrade)ui.action(row,'Thuần hóa · '+fmt(m.upgrade)+' ◈ (→ +'+m.nextHp+' SL, +'+m.nextAtk+' công)',()=>act('upgrade',m.id),state.busy||x.gold<m.upgrade);else row.append(ui.node('small','mount-source','Đã đạt bậc tối đa'));}}
 }

 const css=document.createElement('style');css.textContent=`
#mount-toggle{position:fixed;top:198px;right:16px;z-index:4;width:52px;padding:0;border:0!important;background:none!important;box-shadow:none!important;display:grid;justify-items:center;gap:1px;min-height:0!important;color:#fff3cf;font:700 10px Arial;cursor:pointer}
#mount-toggle canvas{position:static!important;inset:auto!important;display:block!important;width:40px;height:40px;filter:drop-shadow(0 2px 3px #000a) grayscale(.75) brightness(.8)}#mount-toggle span{text-shadow:0 1px 2px #000,0 0 3px #000;white-space:nowrap}
#mount-toggle.on canvas{filter:drop-shadow(0 0 6px #ffc85a) drop-shadow(0 2px 3px #000a)}#mount-toggle.on span{color:#ffd27a}#mount-toggle.wait canvas{filter:drop-shadow(0 2px 3px #000a) grayscale(.3)}#mount-toggle[hidden]{display:none}
@media(max-width:700px),(max-height:500px){#mount-toggle{top:166px;right:8px;width:44px}#mount-toggle canvas{width:34px;height:34px}#mount-toggle span{font-size:9px}}
@media(max-height:500px){#mount-toggle{top:62px;right:116px}}
.mount-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;margin-top:8px}
.mount-card{display:flex;gap:10px;padding:10px;border-radius:12px;border:1px solid #6a5a3a88;background:linear-gradient(160deg,#1b2b30f0,#121c20f0);min-width:0}
.mount-card.owned{border-color:#b8925088}.mount-card.active{border-color:#ffd27a;box-shadow:0 0 0 1px #ffd27a55,0 0 16px #ffc85a33}.mount-card.locked{opacity:.7}
.mount-art{position:relative;flex:0 0 96px;height:96px;border-radius:10px;background:radial-gradient(circle at 50% 70%,#3a5560,#101c22);display:grid;place-items:center;overflow:hidden}
.mount-thumb{max-width:92px;max-height:92px;object-fit:contain}
.mount-tag,.mount-tier{position:absolute;font:700 10px Arial;padding:2px 6px;border-radius:8px}.mount-tag{top:4px;left:4px;background:#2a4a6acc;color:#bfe6ff}.mount-tier{bottom:4px;right:4px;background:#5a4012e6;color:#ffe3a0}
.mount-body{min-width:0;flex:1}.mount-body h3{margin:0 0 2px;font-size:15px;color:#ffe3a8}.mount-desc{margin:0 0 6px;font-size:12px;color:#c9d6cf;line-height:1.35}
.mount-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.mount-actions .visual-action{font-size:12px}.mount-source{color:#e8c48a;font-size:12px}.mount-wallet{font-size:12px}
#hud-more-menu #mount-button{display:none!important}`;document.head.append(css);

 // VLTK activity icon.
 const hud=window.vlHud;if(hud){const a={id:'mount',label:'Thú cưỡi',img:null,thumb:'Soi',run:openStable};const b=document.createElement('button');b.type='button';b.className='vl-activity';b.dataset.id=a.id;b.setAttribute('aria-label',a.label);
  const c=document.createElement('canvas');c.width=c.height=96;const badge=document.createElement('i');badge.hidden=true;b.append(c,badge,ui.node('span','',a.label));b.onclick=()=>{if(!paused())a.run();};Object.assign(a,{button:b,canvas:c,badgeEl:badge});
  hud.ACTIVITIES.push(a);$('vl-activities')?.append(b);}
 window.mountGame={state,riding,active,multiplier,openStable,toggle,SPECIES};
})();
