/* Khi trọng thương (mọi bản đồ trừ lôi đài và chiến trường, vốn tự hồi sinh):
   - tắt tự động đánh, huỷ dẫn đường, dừng đả toạ;
   - đưa về điểm an toàn của bản đồ (bãi săn: trạm phía nam; bí cảnh, Ma Quật,
     boss thế giới: Thiên Vân Thành). Nếu điểm hồi sinh không an toàn thì về thành;
   - 3 giây được bảo hộ (máu không giảm) để không chết lại ngay khi vừa đứng dậy. */
(function(){
 const world=worldMap;
 let guardUntil=0;
 const respawn=world.respawn;
 world.respawn=function(...args){
  try{window.autoCombat?.toggle(false);}catch{}
  const result=respawn.apply(this,args);
  P.med=0;K={};ptr=null;
  if(!world.isSafe(P)&&world.state.scene!=='hub'&&!['battle','duel'].includes(world.state.scene))world.switchScene('hub');
  try{window.autoCombat?.toggle(false);}catch{}
  guardUntil=performance.now()+3000;
  window.gameAudio?.play?.('hurt');
  return result;
 };
 // Short protection after standing up again.
 const update=up;up=function(dt){const result=update(dt);if(performance.now()<guardUntil&&P.hp>0)P.hp=Math.max(P.hp,mhp());return result;};
 window.deathRules={get guarded(){return performance.now()<guardUntil;}};
})();
