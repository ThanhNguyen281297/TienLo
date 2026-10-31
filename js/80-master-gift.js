/* Sư phụ truyền công: a newcomer (level 2–19) hunting in the field is lent the sect's
   ultimate once, so they see early how strong they will become. The master's voice
   appears with a "Thi triển" button; for 30 seconds skill 4 is unlocked and mana stays
   full. Used once per character (retried a few minutes later if ignored). */
(function(){
 'use strict';
 const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;};
 const key=()=>'tienlo-master-gift-'+(account.state.user?.id||'x');
 const done=()=>{try{return localStorage.getItem(key())==='1';}catch{return false;}};
 const finish=()=>{try{localStorage.setItem(key(),'1');}catch{}};
 const state={until:0,used:false,nextOffer:0};
 const MASTER=['Kiếm Tôn','Nguyệt Tôn','Lôi Tôn','Thiên Cơ Lão Nhân'];
 const active=i=>i===3&&performance.now()<state.until&&!state.used;
 const card=node('aside','vl-master');card.hidden=true;card.setAttribute('aria-live','polite');document.body.append(card);
 function close(){card.hidden=true;state.until=0;}
 function offer(){if(!P.ap)return;const name=window.combatNames?.[P.ap.w]?.[3]||'Tuyệt kỹ';
  state.until=performance.now()+30000;state.used=false;card.replaceChildren();
  card.append(node('small','','Sư phụ truyền công'),node('p','','"Đồ nhi, ta tạm truyền cho con '+name+'. Hãy xem sức mạnh khi con đạt cấp '+characterProgression.SKILL_LEVELS[3]+'!"'));
  const go=node('button','','Thi triển '+name+' (phím 4)');go.type='button';go.onclick=()=>{skill(3);};
  const x=node('button','vl-master-x','Để sau');x.type='button';x.onclick=()=>{close();state.nextOffer=performance.now()+300000;};
  card.append(go,x);card.hidden=false;card.dataset.master=MASTER[P.ap.w]||'';window.gameAudio?.play('level');
  for(const b of document.querySelectorAll('#sb > *'))b.classList.remove('vl-master-glow');document.querySelectorAll('#sb > *')[3]?.classList.add('vl-master-glow');}
 // borrowed power: full mana while the gift is open
 const tick=up;up=function(dt){const r=tick(dt);try{if(performance.now()<state.until&&!state.used&&P.ap)P.mp=mmp();}catch{}return r;};
 // detect the cast: cooldown on skill 4 changed or mana spent
 const cast=skill;skill=function(i,...rest){const wasActive=active(i);if(wasActive)P.mp=9999;const mp=P.mp;const r=cast.call(this,i,...rest);if(wasActive)P.mp=Math.min(P.mp,mmp());
  if(wasActive&&P.mp<mp-.5){state.used=true;finish();setTimeout(()=>{card.hidden=true;document.querySelectorAll('.vl-master-glow').forEach(b=>b.classList.remove('vl-master-glow'));msg('Sư phụ: "Đạt cấp '+characterProgression.SKILL_LEVELS[3]+', chiêu này sẽ là của con."');},2600);}
  return r;};
 setInterval(()=>{
  if(!P.ap||!account.state.ready||paused()||done())return;
  if(card.hidden===false&&performance.now()>state.until&&!state.used){close();state.nextOffer=performance.now()+180000;document.querySelectorAll('.vl-master-glow').forEach(b=>b.classList.remove('vl-master-glow'));return;}
  if(!card.hidden||performance.now()<state.nextOffer)return;
  const lv=characterLevel();if(lv<2||lv>=characterProgression.SKILL_LEVELS[3])return;
  if(worldMap.dialog.isOpen()||worldMap.isSafe?.(P))return;
  const near=(typeof E!=='undefined'?E:[]).some(e=>!e.dead&&e.hp>0&&Math.hypot(e.x-P.x,e.y-P.y)<320);if(near)offer();
 },1500);
 const css=node('style');css.textContent=`
.vl-master{position:fixed;right:calc(16px + env(safe-area-inset-right,0px));bottom:calc(150px + env(safe-area-inset-bottom,0px));z-index:30;width:min(300px,86vw);padding:12px 14px;border-radius:14px;border:1px solid #ffd27a99;background:linear-gradient(180deg,#3a2410f2,#140a06f2);box-shadow:0 10px 30px #000b,0 0 22px #ffb84a55;color:#f3e3b4;animation:vl-remind-in .35s ease-out}
.vl-master small{display:block;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#ffcf6a}
.vl-master p{margin:4px 0 10px;font:italic 13px/1.5 var(--xx-title,Georgia,serif)}
.vl-master button{width:100%;margin-top:4px}.vl-master .vl-master-x{background:transparent!important;border-color:#e2c27e44!important;color:#cdbb98!important}
.vl-master-glow{outline:3px solid #ffd27a;outline-offset:2px;box-shadow:0 0 18px #ffcf5a!important;animation:vl-pulse 1.1s ease-in-out infinite}
@keyframes vl-remind-in{from{transform:translateY(10px);opacity:0}}

.vl-coach-name{display:block;font:700 15px/1.3 var(--xx-title,Georgia,serif);color:#ffe39a;margin-top:2px}
.vl-coach{bottom:calc(300px + env(safe-area-inset-bottom,0px))}
@media(max-width:600px){.vl-master{right:50%;transform:translateX(50%);bottom:calc(220px + env(safe-area-inset-bottom,0px))}}
`;document.head.append(css);
 // ---------------------------------------------------------------- first boss by hand
 // The first time a player meets each kind of thủ lĩnh, auto-combat steps aside and a
 // coach card explains the fight; auto is restored after the boss falls or is left.
 const coach=node('aside','vl-master vl-coach');coach.hidden=true;document.body.append(coach);
 const seenKey=()=>'tienlo-boss-coach-'+(account.state.user?.id||'x');
 const seen=()=>{try{return JSON.parse(localStorage.getItem(seenKey())||'[]');}catch{return[];}};
 const mark=k=>{try{const s=seen();if(!s.includes(k)){s.push(k);localStorage.setItem(seenKey(),JSON.stringify(s.slice(-40)));}}catch{}};
 const fight={boss:null,restore:false,away:0};
 function startCoach(e){fight.boss=e;fight.away=0;fight.restore=!!window.autoCombat?.state?.enabled;if(fight.restore)autoCombat.toggle(false);
  coach.replaceChildren(node('small','','Thủ lĩnh xuất hiện'),node('b','vl-coach-name',(e.name||'').replace(/\s*·\s*Thủ lĩnh$/,'')),node('p','','Lần đầu gặp: hãy tự tay đánh. Dùng chiêu 1–4, lướt hoặc chạy khỏi vòng đỏ dưới chân khi nó gồng chiêu. Tự tay đánh nhận thêm 20% EXP.'));
  const ok=node('button','','Rõ, chiến!');ok.type='button';ok.onclick=()=>{coach.hidden=true;};coach.append(ok);coach.hidden=false;window.gameAudio?.play('level');}
 function endCoach(won){const e=fight.boss;if(!e)return;mark(e.skin||e.name);fight.boss=null;coach.hidden=true;
  if(won)msg('Bạn đã tự tay hạ '+(e.name||'thủ lĩnh')+'!');if(fight.restore&&window.autoCombat&&!autoCombat.state.enabled)autoCombat.toggle(true);}
 setInterval(()=>{if(!P.ap||!account.state.ready||paused())return;
  if(fight.boss){const e=fight.boss;if(e.dead||e.hp<=0||!(typeof E!=='undefined'?E:[]).includes(e)){endCoach(e.dead||e.hp<=0);return;}
   fight.away=Math.hypot(e.x-P.x,e.y-P.y)>600?fight.away+1:0;if(fight.away>=7)endCoach(false);return;}
  if(characterLevel()>=60)return;const s=seen();
  const e=(typeof E!=='undefined'?E:[]).find(m=>m.boss&&!m.worldBoss&&!m.dead&&m.hp>0&&Math.hypot(m.x-P.x,m.y-P.y)<360&&!s.includes(m.skin||m.name));if(e)startCoach(e);
 },1500);
 window.masterGift={active,offer,state};
 window.bossCoach={fight,seen};
})();
