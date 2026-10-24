/* MMORPG HUD in the spirit of Võ Lâm Truyền Kỳ Mobile: fewer words, more icons.
   - Top-left: round portrait + level badge, name, HP/MP with numbers, combat power, gold.
   - Top-right: painted activity icons beside the minimap (collapsible), gear for account.
   - Under the minimap: map name + coordinates with a safe/danger dot.
   - Left: compact quest tracker, then the party list.
   - Bottom: full-width EXP strip and a two-line chat ticker above the joystick.
   Existing buttons keep their handlers; the icons only click them. */
(function(){
 const ui=visualUI;
 const ready=i=>i&&i.complete&&i.naturalWidth>0;
 const fmt=n=>n>=1e6?(n/1e6).toFixed(n>=1e7?0:1)+'M':n>=1e4?(n/1e3).toFixed(n>=1e5?0:1)+'K':String(Math.floor(n));

 // ---------- painted round icons from existing artwork
 function paint(canvas,source,crop){const ctx=canvas.getContext('2d'),s=canvas.width;ctx.clearRect(0,0,s,s);
  const g=ctx.createRadialGradient(s/2,s*.38,2,s/2,s/2,s/2);g.addColorStop(0,'#3a5560');g.addColorStop(1,'#101c22');ctx.fillStyle=g;ctx.beginPath();ctx.arc(s/2,s/2,s/2-2,0,Math.PI*2);ctx.fill();
  if(source&&(source instanceof HTMLCanvasElement||ready(source))){const w=source.naturalWidth||source.width,h=source.naturalHeight||source.height,[cx,cy,cw,ch]=crop||[0,0,1,1],sw=w*cw,sh=h*ch,k=Math.min((s*.86)/sw,(s*.86)/sh);
   ctx.save();ctx.beginPath();ctx.arc(s/2,s/2,s/2-3,0,Math.PI*2);ctx.clip();ctx.imageSmoothingQuality='high';ctx.drawImage(source,w*cx,h*cy,sw,sh,s/2-sw*k/2,s/2-sh*k/2,sw*k,sh*k);ctx.restore();}
  ctx.lineWidth=3;const rim=ctx.createLinearGradient(0,0,0,s);rim.addColorStop(0,'#ffe9a8');rim.addColorStop(.5,'#b8862e');rim.addColorStop(1,'#6e4a16');ctx.strokeStyle=rim;ctx.beginPath();ctx.arc(s/2,s/2,s/2-2,0,Math.PI*2);ctx.stroke();}
 function art(src){const i=new Image();i.src=artworkURL(src);return i;}

 const ACTIVITIES=[
  {id:'welfare',label:'Phúc lợi',img:art('Item/Consumable/consume.png'),run:()=>window.engagementGame?.open(),badge:()=>window.engagementGame?.claimable()||0},
  {id:'event',label:'Sự kiện',img:art('Item/BuffThuan/1.png'),run:()=>window.engagementGame?.open('events'),live:()=>!!window.engagementGame?.state.data?.events?.some(e=>e.active)},
  {id:'quest',label:'Nhiệm vụ',img:art('Map/sprites/board.png'),run:()=>$('adventure-button')?.click()},
  {id:'rift',label:'Bí cảnh',img:art('Map/sprites/portal.png'),run:()=>$('rift-button')?.click()},
  {id:'raid',label:'Ma Quật',img:null,thumb:'RongXuong',run:()=>window.raidGame?.open()},
  {id:'duel',label:'Lôi đài',img:art('Item/VuKhi/Kiem.png'),crop:[.15,0,.7,.75],run:()=>$('duel-button')?.click()},
  {id:'rank',label:'Xếp hạng',img:art('Character/NPC/bxh.png'),crop:[.22,.02,.56,.5],run:()=>worldMap.handleService('rank')||worldMap.openRank?.()},
  {id:'pet',label:'Linh thú',img:null,thumb:'Tho',run:()=>$('pet-button')?.click()},
 ];
 const strip=document.createElement('nav');strip.id='vl-activities';strip.setAttribute('aria-label','Hoạt động');
 const toggle=document.createElement('button');toggle.id='vl-activities-toggle';toggle.type='button';toggle.setAttribute('aria-label','Thu gọn hoạt động');toggle.textContent='❯';
 toggle.onclick=()=>{strip.classList.toggle('collapsed');toggle.textContent=strip.classList.contains('collapsed')?'❮':'❯';};
 for(const a of ACTIVITIES){const b=document.createElement('button');b.type='button';b.className='vl-activity';b.dataset.id=a.id;b.setAttribute('aria-label',a.label);
  const c=document.createElement('canvas');c.width=c.height=96;const badge=document.createElement('i');badge.hidden=true;b.append(c,badge,ui.node('span','',a.label));
  b.onclick=()=>{if(!paused())a.run();};a.button=b;a.canvas=c;a.badgeEl=badge;strip.append(b);}
 document.body.append(strip,toggle);
 function paintIcons(){for(const a of ACTIVITIES){let source=a.img;if(a.thumb){const url=window.creatureArt?.thumbnail?.(a.thumb);if(url&&a.thumbUrl!==url){a.thumbUrl=url;a.img=new Image();a.img.src=url;a.painted=null;}source=a.img;}
   const key=source&&ready(source)?'ok':'wait';if(a.painted==='ok')continue;paint(a.canvas,source,a.crop);a.painted=key;}}

 // ---------- player frame
 const hud=$('hud');hud.classList.add('vl-frame');
 const level=ui.node('b','vl-level','1');hud.querySelector('.hud-identity')?.append(level);
 const id=ui.node('div','vl-id');const name=ui.node('b','vl-name','');const realm=ui.node('span','vl-realm','');id.append(name,realm);
 const stats=ui.node('div','vl-stats');const power=ui.node('span','vl-power','');const gold=ui.node('span','vl-gold','');stats.append(power,gold);
 hud.querySelector('.hud-identity-text')?.append(id,stats);
 const hpText=ui.node('em','vl-bar-text','');$('hp').append(hpText);const mpText=ui.node('em','vl-bar-text','');$('mp').append(mpText);
 const exp=$('xp');exp.classList.add('vl-exp');const expText=ui.node('em','vl-bar-text','');exp.append(expText);document.body.append(exp);
 const combatPower=()=>{const b=bonusStats();return Math.round(atk()*12+mhp()*1.2+mmp()*.6+(b.armor||0)*8+(b.crit||0)*1500+characterLevel()*25);};

 // ---------- settings gear (account badge becomes a popover)
 const gear=document.createElement('button');gear.id='vl-settings';gear.type='button';gear.setAttribute('aria-label','Tài khoản');gear.textContent='⚙';
 gear.onclick=()=>$('account-badge')?.classList.toggle('vl-open');document.body.append(gear);
 document.addEventListener('pointerdown',e=>{const badge=$('account-badge');if(badge&&!badge.contains(e.target)&&e.target!==gear)badge.classList.remove('vl-open');});

 // ---------- map name + coordinates
 const region=ui.node('div','','');region.id='vl-region';document.body.append(region);

 // ---------- chat ticker
 const ticker=document.createElement('button');ticker.id='vl-chat-ticker';ticker.type='button';ticker.setAttribute('aria-label','Mở trò chuyện');ticker.onclick=()=>$('hud-chat')?.click();document.body.append(ticker);
 function syncChat(){const lines=[...($('chat-messages')?.children||[])].slice(-2);ticker.replaceChildren(...lines.map(p=>{const row=p.cloneNode(true);row.className='vl-chat-line';return row;}));ticker.hidden=!lines.length;}
 const log=$('chat-messages');if(log)new MutationObserver(syncChat).observe(log,{childList:true});

 function update(){const on=!!P.ap&&account.state.ready;document.body.classList.toggle('vl-hud',on);if(!on)return;
  level.textContent=characterLevel();name.textContent=P.nm||'';realm.textContent=(window.cultivation?.realmName?.()||R[P.r]);
  power.textContent=fmt(combatPower());gold.textContent=fmt(P.gold||0);
  hpText.textContent=Math.max(0,Math.ceil(P.hp))+'/'+mhp();mpText.textContent=Math.max(0,Math.floor(P.mp))+'/'+mmp();
  const need=characterProgression?.required?.(characterLevel())||1;expText.textContent='EXP '+(Math.min(100,P.levelXp/need*100)).toFixed(1)+'%';
  const safe=worldMap.isSafe(P);region.innerHTML='';region.append(ui.node('i',safe?'safe':'danger',''),ui.node('b','',worldMap.sceneTitle?.()||''),ui.node('span','',Math.round(P.x/10)+'/'+Math.round(P.y/10)));
  for(const a of ACTIVITIES){const n=a.badge?.()||0;a.badgeEl.hidden=!n;a.badgeEl.textContent=n;a.button.classList.toggle('live',!!a.live?.());}
  paintIcons();
 }
 setInterval(update,250);update();

 const css=document.createElement('style');css.textContent=`
body.vl-hud #hud.vl-frame{left:8px!important;top:8px!important;width:286px!important;padding:8px 10px 8px 8px!important;border-radius:44px 14px 14px 44px!important;background:linear-gradient(90deg,#0f1d24f0,#14262ee0 70%,#14262e00)!important;border:0!important;box-shadow:none!important}
body.vl-hud #hud .hud-identity{position:relative;display:flex;gap:8px;align-items:center}
body.vl-hud #player-avatar{width:62px!important;height:62px!important;border-radius:50%;border:2px solid #d6aa52;box-shadow:0 0 0 2px #3a2a10,0 0 10px #ffcf7a55;background:#0c171c}
body.vl-hud #hud .vl-level{position:absolute;left:42px;top:44px;min-width:24px;height:24px;padding:0 3px;border-radius:12px;background:radial-gradient(circle at 40% 30%,#ffe7a0,#b07a22);color:#1e0f00!important;font:900 13px/24px Arial!important;text-align:center;border:1px solid #fff1c4;box-shadow:0 2px 4px #0008}
body.vl-hud #rn,body.vl-hud #gd,body.vl-hud #st{display:none!important}
body.vl-hud .hud-identity-text{display:grid;gap:3px;min-width:0;flex:1}
body.vl-hud .vl-id{display:flex;align-items:baseline;gap:6px;min-width:0}.vl-name{color:#ffe9b0!important;font:700 14px Georgia,serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 1px 2px #000}
.vl-realm{color:#9fd8c8;font:600 10px Arial;white-space:nowrap}
.vl-stats{display:flex;gap:10px;font:700 11px Arial;color:#f3e3b4}.vl-power::before{content:'⚔ ';color:#ff9a6a}.vl-gold::before{content:'◈ ';color:#ffd27a}
body.vl-hud #hud .bar{position:relative;height:11px!important;margin:4px 0 0 70px!important;border-radius:6px!important;background:#0a1418!important;border:1px solid #00000088!important;overflow:hidden}
body.vl-hud #hp i{background:linear-gradient(#ff8a7a,#c22a22 60%,#8a1410)!important}body.vl-hud #mp i{background:linear-gradient(#8ad4ff,#2a6ad2 60%,#14388a)!important}
body.vl-hud #hud #cultivation-progress{height:4px!important;margin-top:3px!important}
.vl-bar-text{position:absolute;inset:0;font:700 9px/11px Arial;color:#fff;text-align:center;font-style:normal;text-shadow:0 0 2px #000,0 0 2px #000;pointer-events:none}
body.vl-hud .vl-exp{position:fixed!important;left:0!important;right:0!important;bottom:0!important;top:auto!important;width:auto!important;height:6px!important;margin:0!important;border-radius:0!important;z-index:6;background:#081014cc!important;border:0!important}
body.vl-hud .vl-exp i{background:linear-gradient(90deg,#c9a14a,#ffe7a0)!important}body.vl-hud .vl-exp .vl-bar-text{bottom:6px;top:auto;inset:auto 8px 7px auto;font-size:9px;color:#ffe7a0}
#vl-activities{position:fixed;top:8px;right:148px;z-index:4;display:grid;grid-template-columns:repeat(4,52px);gap:4px 6px;transition:transform .2s,opacity .2s}
#vl-activities.collapsed{transform:translateX(30px);opacity:0;pointer-events:none}
body:not(.vl-hud) #vl-activities,body:not(.vl-hud) #vl-activities-toggle,body:not(.vl-hud) #vl-settings,body:not(.vl-hud) #vl-region,body:not(.vl-hud) #vl-chat-ticker{display:none!important}
.vl-activity{position:relative;display:grid;justify-items:center;gap:1px;padding:0;border:0!important;background:none!important;box-shadow:none!important;min-height:0!important;cursor:pointer}
.vl-activity canvas{position:static!important;inset:auto!important;display:block!important;width:44px!important;height:44px!important;filter:drop-shadow(0 2px 3px #000a)}.vl-activity span{font:700 10px Arial;color:#fff3cf;text-shadow:0 1px 2px #000,0 0 3px #000;white-space:nowrap}
.vl-activity i{position:absolute;top:-2px;right:2px;min-width:16px;height:16px;border-radius:8px;background:#e8442e;color:#fff;font:700 10px/16px Arial;font-style:normal;text-align:center;border:1px solid #ffd0c0}
.vl-activity.live canvas{filter:drop-shadow(0 0 6px #ffb84a) drop-shadow(0 2px 3px #000a)}
@media(prefers-reduced-motion:no-preference){.vl-activity.live canvas{animation:vl-glow 1.4s ease-in-out infinite}@keyframes vl-glow{50%{filter:drop-shadow(0 0 12px #ffcf6a)}}}
#vl-activities-toggle{position:fixed;top:40px;right:136px;z-index:5;width:16px;height:34px;padding:0;border-radius:8px;border:1px solid #c9a96088;background:#14262ee6;color:#ffe7a0;font:700 11px Arial;min-height:0!important}
#vl-settings{position:fixed;top:8px;right:8px;z-index:6;width:30px;height:30px;padding:0;border-radius:50%;border:1px solid #c9a960;background:#14262ee6;color:#ffe7a0;font:16px/1 Arial;min-height:0!important}
body.vl-hud #account-badge{display:none!important}body.vl-hud #account-badge.vl-open{display:flex!important;top:44px!important;right:8px!important;z-index:7}
body.vl-hud #world-minimap{top:42px!important;right:8px!important;width:128px!important;height:128px!important;border-radius:50%!important;border:3px solid #c9a14a!important;box-shadow:0 0 0 2px #3a2a10,0 4px 12px #000a!important;overflow:hidden}
body.vl-hud #world-region{display:none!important}
#vl-region{position:fixed;top:174px;right:8px;z-index:4;width:128px;display:flex;align-items:center;justify-content:center;gap:4px;padding:2px 6px;border-radius:9px;background:#0d1a20d0;color:#ffe9b0;font:700 10px Arial;white-space:nowrap;overflow:hidden}
#vl-region b{overflow:hidden;text-overflow:ellipsis;max-width:78px}#vl-region span{color:#9fd8c8;font-weight:600}#vl-region i{width:7px;height:7px;border-radius:50%;flex:none}#vl-region i.safe{background:#5fe08a;box-shadow:0 0 4px #5fe08a}#vl-region i.danger{background:#ff5a4a;box-shadow:0 0 4px #ff5a4a}
body.vl-hud #journey-objective{left:8px!important;right:auto!important;top:150px!important;width:178px!important;padding:6px 8px!important;border-radius:8px!important;background:linear-gradient(90deg,#0f1d24e6,#0f1d2400)!important;border:0!important;border-left:3px solid #d6aa52!important;box-shadow:none!important}
body.vl-hud #journey-objective small{display:none}body.vl-hud #journey-objective b{font-size:12px!important;color:#ffd27a!important}body.vl-hud #journey-objective span{font-size:11px!important}
body.vl-hud #party-hud{left:8px!important;top:236px!important}
#welfare-gift{display:none!important}
#hud-more-menu #welfare-button,#hud-more-menu #adventure-button,#hud-more-menu #rift-button,#hud-more-menu #raid-button,#hud-more-menu #duel-button,#hud-more-menu #pet-button{display:none!important}
#vl-chat-ticker{position:fixed;left:8px;bottom:186px;z-index:3;width:min(300px,40vw);padding:4px 8px;border:0;border-radius:6px;background:linear-gradient(90deg,#0a1418cc,#0a141800);text-align:left;display:grid;gap:1px;min-height:0!important;cursor:pointer}
#vl-chat-ticker[hidden]{display:none}.vl-chat-line{margin:0;font:11px/1.35 Arial;color:#e6efe8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 1px 2px #000}.vl-chat-line b{color:#ffd27a}
body.vl-hud #event-banner{top:92px;bottom:auto;font-size:11px;padding:4px 12px}body.vl-hud #raid-status{top:8px}
@media(max-width:700px),(max-height:500px){
 body.vl-hud #hud.vl-frame{width:236px!important;transform:scale(.9);transform-origin:0 0}
 #vl-activities{grid-template-columns:repeat(4,44px);right:120px;gap:2px 4px}.vl-activity canvas{width:36px!important;height:36px!important}.vl-activity span{font-size:9px}
 #vl-activities-toggle{right:108px;top:30px}
 body.vl-hud #world-minimap{width:100px!important;height:100px!important}#vl-region{top:146px;width:100px}
 body.vl-hud #journey-objective{top:132px!important;width:150px!important}body.vl-hud #party-hud{top:206px!important}
 #vl-chat-ticker{bottom:156px;width:min(240px,45vw)}}
@media(max-width:520px){#vl-activities{grid-template-columns:repeat(4,40px);right:112px}.vl-activity span{display:none}}`;
 document.head.append(css);
 window.vlHud={update,ACTIVITIES,combatPower,paint,art};
})();
