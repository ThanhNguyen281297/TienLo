/* Khi trọng thương (mọi bản đồ trừ lôi đài và chiến trường, vốn tự hồi sinh):
   - tắt tự động đánh, huỷ dẫn đường, dừng đả toạ;
   - đưa về Thiên Vân Thành (bãi săn, bí cảnh, Ma Quật, boss thế giới); trong thành và
     tông môn thì về điểm hồi sinh an toàn;
   - 3 giây được bảo hộ (máu không giảm) để không chết lại ngay khi vừa đứng dậy. */
(function(){
 const world=worldMap;
 let guardUntil=0;
 const respawn=world.respawn;
 world.respawn=function(...args){
  try{window.autoCombat?.toggle(false);}catch{}
  const result=respawn.apply(this,args);
  P.med=0;K={};ptr=null;
  // Hunting grounds, rifts and every other danger zone send the fallen back to
  // Thiên Vân Thành; sect maps and the city respawn at their own safe spawn.
  const scene=world.state.scene;
  if(!['battle','duel','hub'].includes(scene)&&!world.isSectMap?.(scene))world.switchScene('hub');
  else if(!world.isSafe(P))world.switchScene('hub');
  // The server otherwise treats the jump to the spawn point as a teleport and puts us back.
  if(window.onlineWorld?.state)onlineWorld.state.respawned=true;
  try{window.autoCombat?.toggle(false);}catch{}
  guardUntil=performance.now()+3000;
  window.gameAudio?.play?.('hurt');
  return result;
 };
 // Short protection after standing up again.
 const update=up;up=function(dt){const result=update(dt);if(performance.now()<guardUntil&&P.hp>0)P.hp=Math.max(P.hp,mhp());return result;};
 window.deathRules={get guarded(){return performance.now()<guardUntil;}};
})();
