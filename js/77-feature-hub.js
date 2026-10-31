/* Chức năng: one organised place for every feature, replacing the two overflow menus
   (the dock "…" grid and the top "Thêm" drawer). Grouped by purpose; each activity
   card says what it pays (which shard), when it is open and from which level, so the
   farming loop is readable: pick an activity → earn its shard → trade at Trưởng môn.
   Every tile only triggers the existing feature (no logic is duplicated here). */
(function(){
 'use strict';
 const d=worldMap.dialog,TITLE='Chức năng';
 const click=id=>()=>{const el=document.getElementById(id);if(el)el.click();};
 const SHARD={hothuan:['Hộ Thuẫn','Item/Thuan/1.png'],buocchan:['Bước Chân','Item/DiChuyen/1.png'],phapbao:['Pháp Bảo','Item/PhapBao/1.png'],phaptran:['Pháp Trận','Item/PhapTran/1.png'],
  matna:['Mặt Nạ','Item/MatNa/slot.svg'],nhan:['Nhẫn','Item/Nhan/gioi.png'],thuhon:['Thú Hồn','Character/Monsters/Soi/thumb.webp'],thanbinh:['Thần Binh','Item/VuKhi/Forms/manh-than-binh.png']};
 const sectMap=()=>worldMap.sectMapFor?.(P.ap?.w)||['sword','moon','thunder','mystic'][P.ap?.w|0];
 const ACTIVITIES=[
  {id:'quest',seal:'任',name:'Nhiệm vụ',desc:'Chính tuyến, phụ tuyến và hằng ngày.',shard:'matna',level:1,when:'Mỗi ngày',run:()=>window.adventureGame?.open('main')},
  {id:'hunt',seal:'獵',name:'Vùng săn',desc:'Săn yêu thú, tinh anh và thủ lĩnh bãi.',shard:'thuhon',level:1,when:'Luôn mở',run:click('field-maps-button')},
  {id:'rift',seal:'境',name:'Bí cảnh',desc:'Bốn bí cảnh theo cấp, thủ lĩnh rơi nhiều mảnh.',shard:'buocchan',level:10,when:'Luôn mở',run:click('rift-button')},
  {id:'tower',seal:'塔',name:'Tháp thí luyện',desc:'Leo tầng, mỗi tầng qua lần đầu trong ngày có thưởng.',shard:'phaptran',level:1,when:'Mỗi ngày',run:()=>window.questNav?.go({map:sectMap(),npc:'tower'},'Tháp thí luyện')},
  {id:'raid',seal:'窟',name:'Bí cảnh tổ đội · Ma Quật',desc:'Tổ đội 2–4 người hạ Huyết Trì Ma Long.',shard:'phapbao',level:20,when:'3 lượt/ngày',run:()=>window.raidGame?.open()},
  {id:'battle',seal:'戰',name:'Chiến trường Chính – Tà',desc:'Đấu phe 15 phút, giữ cờ và hạ đối thủ.',shard:'hothuan',level:15,when:'12:30 và 21:00',run:()=>window.battleGame?.open()},
  {id:'guildwar',seal:'宗',name:'Tông môn chiến',desc:'Tông môn tranh bốn cứ điểm Sơn Hà.',shard:'nhan',level:1,when:'Thứ 4 và Thứ 7 · 20:00',run:()=>window.communityGame?.open('home')},
  {id:'boss',seal:'魔',name:'Boss thế giới',desc:'Cả server hạ Thái Cổ Huyết Ma, chia thưởng theo hạng sát thương.',shard:'thanbinh',level:1,when:'Tái xuất sau 5 phút',run:()=>window.communityGame?.open('boss')},
  {id:'duel',seal:'擂',name:'Lôi đài',desc:'Tỉ thí 1 đấu 1 với đạo hữu.',shard:null,level:1,when:'Luôn mở',run:click('duel-button')}
 ];
 const GROUPS=[
  ['Nhân vật',[
   {seal:'包',name:'Túi đồ',run:click('bag-button')},{seal:'屬',name:'Thuộc tính',run:click('attr-button')},{seal:'途',name:'Tiên Đồ',run:click('activities-button')},
   {seal:'法',name:'Chiến pháp',run:click('auto-plan-button')},{seal:'坐',name:'Đả tọa',run:click('bq')},{seal:'破',name:'Đột phá',run:click('bb')},
   {seal:'寵',name:'Linh thú',run:()=>window.spiritPets?.open()},{seal:'碎',name:'Đổi mảnh',run:()=>window.shardsGame?.goMaster()}]],
  ['Giao lưu',[
   {seal:'隊',name:'Đội · Tông môn',run:click('community-button')},{seal:'友',name:'Bạn bè',run:click('friends-button')},{seal:'道',name:'Đạo hữu',run:click('player-lookup-button')},
   {seal:'易',name:'Giao dịch',run:click('trade-button')},{seal:'拍',name:'Đấu giá',run:()=>window.auctionGame?.open()},{seal:'榜',name:'Xếp hạng',run:()=>worldMap.handleService('rank')||worldMap.openRank?.()}]],
  ['Phúc lợi',[
   {seal:'福',name:'Phúc lợi',run:()=>window.engagementGame?.open()},{seal:'珍',name:'Kỳ Trân Các',run:()=>window.premiumGame?.open('shop')},{seal:'信',name:'Hòm thư',run:()=>window.mailbox?.open()},
   {seal:'慶',name:'Sự kiện',run:()=>window.engagementGame?.open('events')},{seal:'圖',name:'Bản đồ',run:click('hud-map')}]]
 ];
 const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;};
 function tile(t){const b=node('button','fh-tile');b.type='button';b.append(node('b','fh-seal',t.seal),node('span','',t.name));b.onclick=()=>{d.close();setTimeout(t.run,0);};return b;}
 function card(a){const lv=typeof characterLevel==='function'?characterLevel():1,locked=lv<a.level;const c=node('article','fh-card'+(locked?' locked':''));
  c.append(node('b','fh-seal big',a.seal));const body=node('div','fh-body');c.append(body);
  body.append(node('h3','',a.name),node('p','',a.desc));const meta=node('div','fh-meta');body.append(meta);
  if(a.shard){const s=SHARD[a.shard],chip=node('span','fh-chip shard');const img=new Image();img.src=artworkURL(s[1]);img.alt='';chip.append(img,document.createTextNode('Mảnh '+s[0]));meta.append(chip);}
  meta.append(node('span','fh-chip',a.when));if(a.level>1)meta.append(node('span','fh-chip'+(locked?' lock':''),'Cấp '+a.level));
  const go=node('button','fh-go',locked?'Cấp '+a.level:'Tham gia');go.type='button';go.disabled=locked;go.onclick=()=>{d.close();setTimeout(a.run,0);};c.append(go);return c;}
 function open(tab){if(!P.ap||paused())return;d.show(TITLE,'Chọn hoạt động để cày mảnh, rồi đổi trang bị tại Trưởng môn.');const root=$('world-content');root.closest('section')?.classList.add('visual-dialog','feature-hub');
  const wrap=node('div','fh');root.append(wrap);
  const act=node('section','fh-group');act.append(node('h4','','Hoạt động · phần thưởng'));const grid=node('div','fh-cards');ACTIVITIES.forEach(a=>grid.append(card(a)));act.append(grid);wrap.append(act);
  for(const [title,items] of GROUPS){const g=node('section','fh-group');g.append(node('h4','',title));const row=node('div','fh-tiles');items.forEach(t=>row.append(tile(t)));g.append(row);wrap.append(g);}
  if(tab==='activities')act.scrollIntoView?.({block:'start'});}
 // The dock "…" button opens the hub instead of the old icon grid.
 const more=$('hud-more');if(more)more.addEventListener('click',e=>{e.stopImmediatePropagation();e.preventDefault();open();},true);
 addEventListener('keydown',e=>{if((e.key==='h'||e.key==='H')&&!e.ctrlKey&&!e.metaKey&&!/INPUT|TEXTAREA/.test(document.activeElement?.tagName||'')&&P.ap&&!d.isOpen())open();});
 const css=node('style');css.textContent=`
#hud-more-menu,.vl-activity.vl-more,#vl-drawer{display:none!important}
#world-dialog>section.xx-scrolled::before,#world-dialog>section.xx-scrolled>.xx-corner{display:none!important}
.feature-hub .fh{display:grid;gap:16px}
.fh-group h4{margin:0 0 8px;font-size:12px;letter-spacing:2px;color:#e2c27e;text-transform:uppercase;font-weight:700}
.fh-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:8px}
.fh-card{display:grid;grid-template-columns:52px minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px 12px;border-radius:12px;border:1px solid #e2c27e3a;background:linear-gradient(180deg,#2a1610cc,#1a0d0acc)}
.fh-card.locked{opacity:.55;filter:saturate(.5)}
.fh-body{min-width:0}.fh-body h3{margin:0;font-size:14px;color:#f6e4b8}.fh-body p{margin:2px 0 6px;font-size:11.5px;line-height:1.45;color:#cdbb98}
.fh-meta{display:flex;flex-wrap:wrap;gap:4px}
.fh-chip{display:inline-flex;align-items:center;gap:4px;padding:2px 7px;border-radius:999px;font-size:10.5px;color:#e9dcb4;background:#00000055;border:1px solid #e2c27e33}
.fh-chip.shard{color:#ffe39a;border-color:#ffd27a66;background:#3a2a0a99}.fh-chip.shard img{width:16px;height:16px;object-fit:contain}
.fh-chip.lock{color:#ff9a8a;border-color:#ff8a7a55}
.fh-seal{display:grid;place-items:center;width:40px;height:40px;border-radius:50%;font:700 20px/1 "Noto Serif SC","Songti SC","SimSun",serif;color:#3a1c06;background:radial-gradient(circle at 35% 30%,#fff1c4,#e9b65a 55%,#9a6420);box-shadow:inset 0 0 0 2px #fff2c088,0 0 0 1px #6a3e12,0 3px 8px #0008}
.fh-seal.big{width:48px;height:48px;font-size:24px}
.fh-go{min-width:86px}
.fh-tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:8px}
.fh-tile{display:grid!important;justify-items:center;gap:6px;padding:10px 4px!important;min-height:0!important;border-radius:12px!important;background:linear-gradient(180deg,#2a1610,#1a0d0a)!important;border:1px solid #e2c27e3a!important;color:#f3e3b4!important;font-size:12px!important}
.fh-tile:hover{border-color:#ffd27a!important}
@media(max-width:600px){.fh-cards{grid-template-columns:1fr}.fh-card{grid-template-columns:42px minmax(0,1fr) auto;gap:8px;padding:9px 10px}.fh-card .fh-go{min-width:0!important;padding:8px 10px!important;font-size:12px!important}.fh-seal.big{width:42px;height:42px;font-size:21px}.fh-tiles{grid-template-columns:repeat(4,minmax(0,1fr))}}
`;document.head.append(css);
 // Framed panels draw their hairline and corner flourishes as absolute children, which
 // scroll away with long content and end up mid-panel; hide them once a panel scrolls.
 document.addEventListener('scroll',e=>{const t=e.target;if(t instanceof Element&&t.matches('#world-dialog>section'))t.classList.toggle('xx-scrolled',t.scrollTop>6);},true);
 const close=d.close;d.close=function(...a){document.querySelector('#world-dialog>section')?.classList.remove('xx-scrolled','feature-hub');return close.apply(this,a);};
 window.featureHub={open,ACTIVITIES};
})();
