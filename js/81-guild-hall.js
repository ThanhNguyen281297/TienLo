/* Tông môn hall: contribution shop and Hộ Sơn Thần Thú (weekly guild boss).
   The boss lives in a private room per guild ('guildboss' scene). Rendering, walking and
   the exit portal reuse the shared expedition arena (like Ma Quật); this module adds the
   HP banner, the hall dialog and the buttons in the Tông môn tab. Server: guildhall.py. */
(function(){
 'use strict';
 const world=worldMap,d=world.dialog,ui=visualUI,exp=expeditionsGame,TITLE='Tông môn · Hộ Sơn Điện';
 const SKINS=['TeGiac','RongNuoc','PhuongHoang','RongXuong'];
 const RULE={id:'guildboss',name:'Hộ Sơn Điện',level:1,theme:'worldboss',species:SKINS,boss:'TeGiac',color:'#7fd6ff',direction:'Tông môn',dropRate:0,portal:{x:-999,y:-999}};
 exp.maps.set('guildboss',RULE);
 world.sectMaps.guildboss={...RULE,description:'Boss tông môn · máu chung cả tuần',spawn:{x:1000,y:1380}};
 world.mapThemes.themes.guildboss={...world.mapThemes.themes['rift-tide'],name:RULE.name};
 if(world.atmosphere?.profiles)world.atmosphere.profiles.guildboss={...world.atmosphere.profiles['rift-tide']};
 const state={data:null,busy:false,tab:'shop'};
 const fmt=n=>Number(n||0).toLocaleString('vi-VN');
 const inHall=()=>world.state.scene==='guildboss';

 // Small code-drawn icons for the shop (no external art).
 const ICON={
  essence:'<circle cx="20" cy="22" r="11" fill="#6fe0c0"/><circle cx="16" cy="18" r="4" fill="#e8fff6" opacity=".8"/><path d="M20 4l3 7h-6z" fill="#b8fff0"/>',
  gold:'<path d="M8 24l12-14 12 14-12 10z" fill="#ffd36e" stroke="#9a6420" stroke-width="2"/><path d="M14 22l6-7 6 7" fill="none" stroke="#fff3c8" stroke-width="2"/>',
  shard:'<path d="M12 6l14 6-4 10 6 10-16 2-4-14z" fill="#c9a0ff" stroke="#5b3a8a" stroke-width="2"/><path d="M15 12l6 3" stroke="#fff" stroke-width="2"/>',
  stone:'<path d="M7 26l6-16h14l6 16-13 8z" fill="#8fb7d8" stroke="#2c4d66" stroke-width="2"/><path d="M14 14l5 5 7-5" stroke="#e8f6ff" stroke-width="2" fill="none"/>',
  stone2:'<path d="M7 26l6-16h14l6 16-13 8z" fill="#ff9f8a" stroke="#7a2c1e" stroke-width="2"/><path d="M14 14l5 5 7-5" stroke="#fff0e8" stroke-width="2" fill="none"/>',
  charm:'<rect x="11" y="5" width="18" height="30" rx="2" fill="#f2d27a" stroke="#8a2e1e" stroke-width="2"/><path d="M20 9l-4 8h6l-4 9" stroke="#b5241a" stroke-width="2.4" fill="none"/><path d="M14 30h12" stroke="#b5241a" stroke-width="2"/>',
  seed:'<ellipse cx="20" cy="26" rx="8" ry="6" fill="#a8743c"/><path d="M20 22c0-8 6-12 11-12-1 6-5 10-11 12zM20 22c0-6-5-9-10-9 1 5 4 8 10 9z" fill="#6fd27a"/>'};
 const icon=k=>{const s=ui.node('span','gh-icon');s.innerHTML='<svg viewBox="0 0 40 40" aria-hidden="true">'+(ICON[k]||ICON.gold)+'</svg>';return s;};

 async function load(){state.data=await account.api('/api/guildhall');return state.data;}
 async function buy(id){if(state.busy)return;state.busy=true;render();
  try{const r=await account.transact('/api/guildhall',{action:'buy',id,opId:crypto.randomUUID()},{live:true,gold:true,world:['essence','tribCharms']});state.data=r.hall;msg(r.message||'Đã đổi.');window.skillImpact?.flash?.('#ffd27a');if(typeof hud==='function')hud();}
  catch(e){msg(e.message);}finally{state.busy=false;render();}}
 async function open(tab='shop'){if(!P.ap||paused())return;state.tab=tab;d.show(TITLE,'Cống hiến cho tông môn để đổi vật phẩm, cùng nhau hạ Hộ Sơn Thần Thú mỗi tuần.');$('world-content').closest('section')?.classList.add('visual-dialog');$('world-content').append(ui.node('p','world-line','Đang mở Hộ Sơn Điện…'));try{await load();}catch(e){$('world-content').replaceChildren(ui.node('p','world-line',e.message));return;}render();}
 function enter(){if(!state.data?.guild)return msg('Hãy gia nhập tông môn trước.');if(state.data.boss?.killed)return msg('Hộ Sơn Thần Thú tuần này đã bị hạ. Tuần sau sẽ mạnh hơn!');for(const s of SKINS)creatureArt.ensureSpecies(s);world.switchScene('guildboss');}

 function render(){const root=$('world-content');if(!root||$('world-title').textContent!==TITLE)return;root.replaceChildren();const data=state.data;
  if(!data?.guild){root.append(ui.node('p','world-line','Bạn chưa có tông môn. Lập hoặc xin gia nhập ở mục Đội · Tông môn để mở cửa hàng cống hiến và boss tông môn.'));ui.action(root,'Mở Đội · Tông môn',()=>window.communityGame?.open('guild'));return;}
  const head=ui.node('div','gh-head');head.append(ui.node('b','',data.guild.name),ui.node('span','gh-contrib','Cống hiến: '+fmt(data.contribution)));root.append(head);
  const tabs=ui.node('div','gh-tabs');for(const [id,label] of [['shop','Cửa hàng cống hiến'],['boss','Hộ Sơn Thần Thú']]){const b=ui.node('button','gh-tab'+(state.tab===id?' on':''),label);b.type='button';b.onclick=()=>{state.tab=id;render();};tabs.append(b);}root.append(tabs);
  if(state.tab==='shop'){
   root.append(ui.node('p','gh-note','Cống hiến kiếm từ: đóng góp Linh Thạch (+10), nhận thưởng nhiệm vụ tông môn (+15), đánh Hộ Sơn Thần Thú (theo sát thương, +30 khi hạ). Rời tông môn sẽ mất phần chưa dùng. Giới hạn làm mới mỗi thứ Hai.'));
   const grid=ui.node('div','gh-grid');root.append(grid);
   for(const it of data.shop){const card=ui.node('article','gh-item');card.append(icon(it.icon));const body=ui.node('div','gh-body');body.append(ui.node('b','',it.name),ui.node('small','',it.cost+' cống hiến · tuần này '+it.bought+'/'+it.limit));if(it.desc)body.append(ui.node('small','gh-desc',it.desc));card.append(body);
    ui.action(card,it.bought>=it.limit?'Hết lượt':'Đổi',()=>buy(it.id),state.busy||it.bought>=it.limit||data.contribution<it.cost);grid.append(card);}
  }else{
   const b=data.boss;const card=ui.node('article','gh-boss');const pic=creatureArt.thumbnail(b.skin);if(pic)card.append(ui.art(pic,'gh-boss-art'));
   const body=ui.node('div','gh-body');body.append(ui.node('h3','',b.name+' · Cấp '+b.level));
   const bar=ui.node('div','gh-hp');const fill=ui.node('i');fill.style.width=(100*b.hp/b.maxHp).toFixed(1)+'%';bar.append(fill,ui.node('span','',b.killed?'Đã bị hạ tuần này':fmt(b.hp)+' / '+fmt(b.maxHp)));body.append(bar);
   ui.chips([['Sát thương của bạn',fmt(b.mine)],['Rương hạng thường',fmt(b.chest.gold)+' ◈'],['Linh Nguyên',b.chest.essence],['Mảnh Nhẫn',b.chest.shards.nhan+'+']],body);
   body.append(ui.node('p','gh-note','Máu boss dùng chung cho cả tông môn trong tuần, vào đánh lúc nào cũng được, cùng nhau sẽ nhanh hơn. Khi hạ, mọi người góp sát thương nhận rương theo hạng qua hòm thư, tuần sau boss lên một cấp.'));
   ui.action(body,b.killed?'Đã hạ · chờ tuần sau':inHall()?'Đang ở Hộ Sơn Điện':'Vào Hộ Sơn Điện',enter,b.killed||inHall());card.append(body);root.append(card);
   if(b.ranks.length){const list=ui.node('ol','gh-ranks');for(const r of b.ranks){const li=ui.node('li');li.append(ui.node('span','',r.name),ui.node('b','',fmt(r.damage)));list.append(li);}root.append(ui.node('h4','','Bảng sát thương tuần này'),list);}
  }
 }

 // ---------- scene: entering requires a guild; leaving goes back to the city.
 const change=world.switchScene;world.switchScene=function(id,initial=false){
  if(id==='guildboss'&&initial)return change('hub',true);
  const result=change(id,initial);if(inHall()){world.services[0].name='Rời Hộ Sơn Điện';msg('Hộ Sơn Điện: cả tông môn cùng hạ Hộ Sơn Thần Thú. Máu boss giữ nguyên cả tuần.');}
  banner.hidden=!inHall();return result;};
 const banner=ui.node('aside','');banner.id='guildboss-banner';banner.hidden=true;document.body.append(banner);
 let lastBanner='';
 const update=up;up=function(dt){const r=update(dt);if(inHall()){const boss=E.find(e=>e.network&&String(e.id).startsWith('guildboss:'));const text=boss?(boss.name+'|'+Math.max(0,Math.round(boss.hp))+'|'+boss.maxHp):'none';if(text!==lastBanner){lastBanner=text;banner.replaceChildren();if(boss){const pct=Math.max(0,boss.hp)/boss.maxHp*100;banner.textContent=boss.hp>0?'Máu chung cả tông môn trong tuần · '+fmt(Math.round(boss.hp))+' / '+fmt(boss.maxHp)+' ('+pct.toFixed(1)+'%)':'Đã hạ Hộ Sơn Thần Thú · rương gửi qua hòm thư';}else banner.textContent='Hộ Sơn Thần Thú đang tới…';}}return r;};

 // ---------- buttons in the Tông môn tab of Đội · Tông môn
 const show=d.show;d.show=function(title,description){const r=show.apply(this,arguments);
  if(title==='Đạo hữu · Tổ đội và tông môn')queueMicrotask(()=>{const data=window.communityGame?.state?.social;if(!data?.guild||!$('world-content'))return;if(!document.querySelector('.community-tabs [aria-pressed="true"]')?.textContent?.includes('Tông môn'))return;
   const row=ui.node('div','gh-shortcuts');ui.action(row,'◆ Cửa hàng cống hiến',()=>open('shop'));ui.action(row,'⚔ Hộ Sơn Thần Thú',()=>open('boss'));const tabs=$('world-content').querySelector('.community-tabs');if(tabs)tabs.after(row);else $('world-content').prepend(row);});
  return r;};

 const css=document.createElement('style');css.textContent=`
.gh-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:2px 0 8px;color:#f3e3b4}
.gh-contrib{padding:4px 10px;border-radius:999px;background:#3a2a0a;border:1px solid #e3b86688;color:#ffe39a;font-weight:700}
.gh-tabs{display:flex;gap:6px;margin-bottom:8px}.gh-tab{flex:1;padding:8px;border-radius:10px;border:1px solid #b8925066;background:#14232a;color:#d8cba6;cursor:pointer}.gh-tab.on{background:linear-gradient(180deg,#f6dc9c,#c99a4a);color:#2a1a06;font-weight:700}
.gh-note{font-size:12px;color:#b7c4bf;margin:4px 0 10px;line-height:1.5}
.gh-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px}
.gh-item{display:grid;grid-template-columns:44px 1fr auto;align-items:center;gap:8px;padding:8px;border-radius:12px;border:1px solid #b8925055;background:linear-gradient(180deg,#16262d,#0f1b20)}
.gh-item .visual-action{min-width:70px}
.gh-icon{width:44px;height:44px;display:grid;place-items:center;border-radius:10px;background:radial-gradient(circle at 40% 35%,#2a4a52,#0d1a1f)}.gh-icon svg{width:36px;height:36px}
.gh-body{display:grid;gap:2px;min-width:0}.gh-body b{color:#fff1cc}.gh-body small{color:#a9b6b3}.gh-desc{color:#ffd77e!important}
.gh-boss{display:grid;grid-template-columns:120px 1fr;gap:12px;padding:12px;border-radius:14px;border:1px solid #7fd6ff55;background:linear-gradient(180deg,#132a33,#0d1a20)}
.gh-boss-art{width:120px;height:120px;object-fit:contain;filter:drop-shadow(0 8px 12px #000a)}
.gh-boss h3{margin:0 0 6px;color:#bfeaff}
.gh-hp{position:relative;height:18px;border-radius:9px;background:#0a1418;border:1px solid #7fd6ff66;overflow:hidden;margin:4px 0 8px}
.gh-hp i{position:absolute;inset:0 auto 0 0;background:linear-gradient(90deg,#d23b4a,#ff8a5c)}.gh-hp span{position:relative;display:block;text-align:center;font:700 11px/18px Arial;color:#fff;text-shadow:0 1px 2px #000}
.gh-ranks{margin:4px 0 0;padding-left:22px;color:#e8dcc0;font-size:13px}.gh-ranks li{display:flex;justify-content:space-between;gap:10px;padding:2px 0}
.gh-shortcuts{display:flex;gap:6px;margin-bottom:8px}.gh-shortcuts .visual-action{flex:1}
#guildboss-banner{position:fixed;top:calc(96px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);z-index:6;max-width:calc(100vw - 32px);padding:4px 12px;border-radius:999px;background:#0d1a20d9;border:1px solid #7fd6ff66;color:#dff4ff;text-align:center;font:12px Arial;pointer-events:none;white-space:nowrap}
#guildboss-banner[hidden]{display:none}#guildboss-banner .gh-hp{margin:5px 0 0}
@media(max-width:560px){.gh-boss{grid-template-columns:1fr}.gh-boss-art{margin:auto}}`;document.head.append(css);
 window.guildHall={open,enter,state};
})();
