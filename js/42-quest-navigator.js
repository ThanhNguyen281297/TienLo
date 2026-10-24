/* Quest auto-navigation (MMORPG "tự tìm đường").
   goal = {map, x?, y?, npc?, auto?} from the server quest list.
   1. Different map: walk to this map's safe zone, then teleport (level checks
      stay in switchScene / server).
   2. Same map: steer with a virtual joystick toward the NPC or point, with a
      simple detour when blocked.
   3. Arrival: talk to the NPC, or start Auto at a hunting ground.
   Any manual movement input cancels navigation. */
(function(){
 const ARRIVE=26,NPC_ARRIVE=38,STEP_CHECK=.7,MAX_DETOURS=10;
 const state={goal:null,label:'',phase:'idle',target:null,checkT:0,lastX:0,lastY:0,detour:0,detourT:0,detourSide:1,switchTries:0};
 const banner=document.createElement('div');banner.id='quest-nav-banner';banner.hidden=true;
 const text=document.createElement('span'),stop=document.createElement('button');stop.type='button';stop.textContent='Dừng';stop.onclick=()=>cancel('Đã dừng tự tìm đường.');
 banner.append(text,stop);document.body.append(banner);
 const css=document.createElement('style');css.textContent='#quest-nav-banner{position:fixed;left:50%;top:58px;transform:translateX(-50%);z-index:40;display:flex;gap:10px;align-items:center;padding:7px 8px 7px 14px;border:1px solid #c9a96a;border-radius:999px;background:rgba(14,26,32,.88);color:#f3e2b8;font:600 12px Arial,sans-serif;box-shadow:0 6px 18px #0006;pointer-events:auto}#quest-nav-banner span:before{content:"➤ ";color:#ffd88a}#quest-nav-banner button{border:1px solid #7f9c94;border-radius:999px;background:#203a40;color:#e7ecd9;padding:4px 10px;font:inherit;cursor:pointer}';document.head.append(css);

 const scene=()=>worldMap.state.scene;
 const mapName=id=>state.goal?.map===id&&state.goal.name?state.goal.name:id==='hub'?'Thiên Vân Thành':(worldMap.regions?.find(r=>r.id===id)?.name||id);
 // Safe points per map family; the first that the live map reports as safe wins.
 function safePoint(){
  const candidates=[[P.x,P.y],[1000,1770],[1000,1380],[1000,1100],[1000,1210],[1000,1000]];
  for(const [x,y] of candidates)if(worldMap.isSafe({x,y}))return {x,y};
  return null;
 }
 function npcPoint(id){
  const s=worldMap.services.find(s=>s.id===id)||worldMap.services.find(s=>id==='mentor'&&/Sư phụ|Trưởng môn/.test(s.name||''));
  return s?{x:s.x,y:s.y+14,npc:s.id}:null;
 }
 function show(t){text.textContent=t;banner.hidden=false;}
 function cancel(message){
  state.goal=null;state.phase='idle';state.target=null;banner.hidden=true;
  if(message)msg(message);
 }
 function go(goal,label=''){
  if(!goal||!goal.map){msg('Nhiệm vụ này không có điểm đến cụ thể.');return false;}
  if(!P.ap||(window.duelArena?.fighting&&duelArena.fighting()))return false;
  worldMap.dialog.close?.();
  Object.assign(state,{goal,label,phase:'plan',target:null,detour:0,detourT:0,switchTries:0,checkT:0,lastX:P.x,lastY:P.y});
  if(window.autoCombat?.state.enabled)autoCombat.toggle(false);
  P.med=0;show((label?label+' · ':'')+mapName(goal.map));plan();return true;
 }
 function plan(){
  const goal=state.goal;if(!goal)return;
  if(scene()!==goal.map){
   if(worldMap.isSafe(P)){
    if(state.switchTries++>2){cancel('Không thể tới '+mapName(goal.map)+'.');return;}
    worldMap.switchScene(goal.map);
    if(scene()!==goal.map){cancel();return;} // switchScene already explained why (level, duel...)
    state.phase='plan';state.target=null;return plan();
   }
   const safe=safePoint();if(!safe){cancel('Hãy về vùng an toàn để truyền tống.');return;}
   state.phase='to-safe';state.target=safe;show('Về vùng an toàn để truyền tống · '+mapName(goal.map));return;
  }
  if(goal.safeOnly){const p=safePoint();if(!p){cancel('Không tìm thấy vùng an toàn trên bản đồ này.');return;}state.phase='walk';state.target=p;show('Về vùng an toàn');return;}
  if(goal.npc){const p=npcPoint(goal.npc);if(p){state.phase='walk';state.target=p;show((state.label?state.label+' · ':'')+'Tới '+(worldMap.services.find(s=>s.id===p.npc)?.name||'NPC'));return;}}
  if(Number.isFinite(goal.x)&&Number.isFinite(goal.y)){state.phase='walk';state.target={x:goal.x,y:goal.y};show((state.label?state.label+' · ':'')+mapName(goal.map));return;}
  arrive();
 }
 function arrive(){
  const goal=state.goal;cancel();
  if(!goal)return;
  if(goal.npc){
   // interact() talks to state.near, which the world refreshes next frame.
   // Talk to the goal NPC itself, not whatever service happens to be nearest
   // (the hub quest giver stands next to a rift portal).
   const s=npcPoint(goal.npc)&&worldMap.services.find(v=>v.id===goal.npc||(goal.npc==='mentor'&&/Sư phụ/.test(v.name||'')));
   setTimeout(()=>{if(s){worldMap.state.near=s;worldMap.interact();}else msg('Đã tới nơi. Nhấn E để nói chuyện.');},60);return;
  }
  if(goal.auto&&window.autoCombat&&!autoCombat.state?.enabled){autoCombat.toggle(true);msg('Đã tới bãi săn · bật Auto.');return;}
  msg('Đã tới nơi làm nhiệm vụ.');
 }
 function manualInput(){
  for(const k of ['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'])if(K[k])return true;
  return !!(ptr||window.mobileInput?.active);
 }
 function steer(dt){
  const t=state.target;if(!t)return null;
  const dx=t.x-P.x,dy=t.y-P.y,d=Math.hypot(dx,dy);
  if(d<(t.npc?NPC_ARRIVE:ARRIVE)){state.target=null;return 'arrived';}
  let ux=dx/d,uy=dy/d;
  state.checkT+=dt;
  if(state.checkT>=STEP_CHECK){
   const moved=Math.hypot(P.x-state.lastX,P.y-state.lastY);state.checkT=0;state.lastX=P.x;state.lastY=P.y;
   if(moved<6&&!window.classCombat?.isDashing?.()){
    if(++state.detour>MAX_DETOURS){cancel('Đường bị chặn. Hãy tự di chuyển một đoạn rồi thử lại.');return null;}
    state.detourT=.8;state.detourSide=-state.detourSide*(state.detour%3===0?-1:1);
   }
  }
  if(state.detourT>0){state.detourT-=dt;const a=state.detourSide*1.25,c=Math.cos(a),s=Math.sin(a);[ux,uy]=[ux*c-uy*s,ux*s+uy*c];}
  return {x:ux,y:uy};
 }
 const baseUp=up;
 up=function(dt){
  if(!state.goal||state.phase==='idle')return baseUp(dt);
  if(manualInput()){cancel('Đã dừng tự tìm đường.');return baseUp(dt);}
  if(worldMap.dialog.isOpen?.()||(typeof paused==='function'&&paused()))return baseUp(dt);
  if(state.phase==='plan'){plan();if(!state.goal)return baseUp(dt);}
  // The map changed under us (death, portal, manual teleport): re-plan.
  if(state.phase==='walk'&&scene()!==state.goal.map){state.phase='plan';plan();if(!state.goal)return baseUp(dt);}
  const dir=steer(dt);
  if(dir==='arrived'){
   if(state.phase==='to-safe'){state.phase='plan';plan();return baseUp(dt);}
   arrive();return baseUp(dt);
  }
  if(!dir)return baseUp(dt);
  const real=window.mobileInput;
  window.mobileInput={active:true,x:dir.x,y:dir.y,pointerId:null};
  try{return baseUp(dt);}finally{window.mobileInput=real;}
 };
 // A death sends the hero home: stop instead of dragging the corpse along.
 // switchScene also calls onRespawn, so only a real death (hp <= 0) cancels.
 const respawn=classCombat.onRespawn;classCombat.onRespawn=function(...a){if(state.goal&&P.hp<=0)cancel();return respawn.apply(this,a);};
 window.questNav={go,cancel,state,get active(){return !!state.goal;}};
})();
