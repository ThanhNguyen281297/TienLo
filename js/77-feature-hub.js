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
  {id:'quest',icon:'quest',name:'Nhiệm vụ',desc:'Chính tuyến, phụ tuyến và hằng ngày.',shard:'matna',level:1,when:'Mỗi ngày',run:()=>window.adventureGame?.open('main')},
  {id:'hunt',icon:'hunt',name:'Vùng săn',desc:'Săn yêu thú, tinh anh và thủ lĩnh bãi.',shard:'thuhon',level:1,when:'Luôn mở',run:click('field-maps-button')},
  {id:'rift',icon:'rift',name:'Bí cảnh',desc:'Bốn bí cảnh theo cấp, thủ lĩnh rơi nhiều mảnh.',shard:'buocchan',level:10,when:'Luôn mở',run:click('rift-button')},
  {id:'tower',icon:'tower',name:'Tháp thí luyện',desc:'Leo tầng, mỗi tầng qua lần đầu trong ngày có thưởng.',shard:'phaptran',level:1,when:'Mỗi ngày',run:()=>window.questNav?.go({map:sectMap(),npc:'tower'},'Tháp thí luyện')},
  {id:'raid',icon:'raid',name:'Bí cảnh tổ đội · Ma Quật',desc:'Tổ đội 2–4 người hạ Huyết Trì Ma Long.',shard:'phapbao',level:20,when:'3 lượt/ngày',run:()=>window.raidGame?.open()},
  {id:'battle',icon:'battle',name:'Chiến trường Chính – Tà',desc:'Đấu phe 15 phút, giữ cờ và hạ đối thủ.',shard:'hothuan',level:15,when:'12:30 và 21:00',run:()=>window.battleGame?.open()},
  {id:'guildwar',icon:'guildwar',name:'Tông môn chiến',desc:'Tông môn tranh bốn cứ điểm Sơn Hà.',shard:'nhan',level:1,when:'Thứ 4 và Thứ 7 · 20:00',run:()=>window.communityGame?.open('home')},
  {id:'boss',icon:'boss',name:'Boss thế giới',desc:'Cả server hạ Thái Cổ Huyết Ma, chia thưởng theo hạng sát thương.',shard:'thanbinh',level:1,when:'Tái xuất sau 5 phút',run:()=>window.communityGame?.open('boss')},
  {id:'duel',icon:'duel',name:'Lôi đài',desc:'Tỉ thí 1 đấu 1 với đạo hữu.',shard:null,level:1,when:'Luôn mở',run:click('duel-button')}
 ];
 const GROUPS=[
  ['Nhân vật',[
   {icon:'bag',name:'Túi đồ',run:click('bag-button')},{icon:'attrs',name:'Thuộc tính',run:click('attr-button')},{icon:'path',name:'Tiên Đồ',run:click('activities-button')},
   {icon:'tactic',name:'Chiến pháp',run:click('auto-plan-button')},{icon:'meditate',name:'Đả tọa',run:click('bq')},{icon:'break',name:'Đột phá',run:click('bb')},
   {icon:'pet',name:'Linh thú',run:()=>window.spiritPets?.open()},{icon:'shard',name:'Đổi mảnh',run:()=>window.shardsGame?.goMaster()}]],
  ['Giao lưu',[
   {icon:'party',name:'Đội · Tông môn',run:click('community-button')},{icon:'friends',name:'Bạn bè',run:click('friends-button')},{icon:'lookup',name:'Đạo hữu',run:click('player-lookup-button')},
   {icon:'trade',name:'Giao dịch',run:click('trade-button')},{icon:'auction',name:'Đấu giá',run:()=>window.auctionGame?.open()},{icon:'rank',name:'Xếp hạng',run:()=>worldMap.handleService('rank')||worldMap.openRank?.()}]],
  ['Phúc lợi',[
   {icon:'gift',name:'Phúc lợi',run:()=>window.engagementGame?.open()},{icon:'gem',name:'Kỳ Trân Các',run:()=>window.premiumGame?.open('shop')},{icon:'mail',name:'Hòm thư',run:()=>window.mailbox?.open()},
   {icon:'event',name:'Sự kiện',run:()=>window.engagementGame?.open('events')},{icon:'map',name:'Bản đồ',run:click('hud-map')}]]
 ];

 // Gold medallion icons drawn in code (same line style as the HUD dock icons).
 const ICON_CACHE=new Map();
 const GLYPH={
  quest:(L,C,A)=>{L([[9,5],[23,5],[23,27],[9,27],[9,5]]);L([[12,11],[20,11]]);L([[12,16],[20,16]]);L([[12,21],[17,21]]);A(9,5,3,Math.PI*.5,Math.PI*1.5);},
  hunt:(L,C)=>{C(16,21,6);for(const [x,y] of [[7,12],[13,7],[19,7],[25,12]])C(x,y,2.6);},
  rift:(L,C,A)=>{A(16,16,11,0,Math.PI*1.6);A(16,16,7,Math.PI,Math.PI*2.5);A(16,16,3,0,Math.PI*1.8);},
  tower:(L)=>{L([[16,3],[16,6]]);L([[8,10],[16,6],[24,10]]);L([[10,10],[10,15],[22,15],[22,10]]);L([[7,18],[16,14],[25,18]]);L([[9,18],[9,27],[23,27],[23,18]]);L([[14,27],[14,22],[18,22],[18,27]]);},
  raid:(L,C)=>{L([[6,27],[6,15],[11,8],[21,8],[26,15],[26,27]]);C(12,17,2.6);C(20,17,2.6);L([[13,24],[19,24]]);L([[16,24],[16,27]]);},
  battle:(L)=>{L([[6,6],[22,22]]);L([[26,6],[10,22]]);L([[19,25],[25,19]]);L([[7,19],[13,25]]);L([[22,22],[26,26]]);L([[10,22],[6,26]]);},
  guildwar:(L)=>{L([[8,28],[8,4]]);L([[8,5],[25,7],[20,12],[25,17],[8,16]]);},
  boss:(L,C)=>{L([[6,6],[10,14]]);L([[26,6],[22,14]]);C(16,19,8);L([[12,18],[14,19]]);L([[20,18],[18,19]]);L([[13,23],[19,23]]);},
  duel:(L)=>{L([[5,27],[15,17]]);L([[27,27],[17,17]]);L([[12,14],[18,20]]);L([[20,14],[14,20]]);L([[16,4],[16,12]]);L([[12,8],[20,8]]);},
  bag:(L)=>{L([[8,12],[24,12],[26,27],[6,27],[8,12]]);L([[12,12],[12,8],[15,5],[17,5],[20,8],[20,12]]);L([[10,18],[22,18]]);},
  attrs:(L,C)=>{C(13,9,4);L([[5,26],[5,22],[9,17],[16,17],[20,21],[20,26]]);L([[23,9],[29,9]]);L([[26,6],[26,12]]);},
  path:(L,C)=>{L([[6,27],[12,20],[9,14],[16,9],[22,13]]);C(24,8,3.5);L([[24,11.5],[24,15]]);},
  tactic:(L,C)=>{C(16,16,5);for(let i=0;i<8;i++){const a=i*Math.PI/4;L([[16+Math.cos(a)*8,16+Math.sin(a)*8],[16+Math.cos(a)*11,16+Math.sin(a)*11]]);}},
  meditate:(L,C)=>{C(16,7,3);L([[16,11],[16,19],[8,25],[24,25],[16,19]]);L([[16,14],[10,18],[5,18]]);L([[16,14],[22,18],[27,18]]);},
  break:(L)=>{L([[8,26],[16,18],[24,26]]);L([[8,18],[16,10],[24,18]]);L([[8,10],[16,2],[24,10]]);},
  pet:(L,C)=>{L([[6,24],[10,12],[14,16],[18,16],[22,12],[26,24],[16,28],[6,24]]);C(12,21,1.4);C(20,21,1.4);},
  shard:(L)=>{L([[10,4],[18,9],[15,16],[20,22],[12,28],[8,18],[11,12],[10,4]]);L([[22,6],[27,10],[24,14]]);L([[24,20],[27,24]]);},
  party:(L,C)=>{C(11,10,3.5);C(21,10,3.5);L([[4,26],[5,19],[11,16],[17,19],[18,26]]);L([[14,26],[15,19],[21,16],[27,19],[28,26]]);},
  friends:(L)=>{L([[16,27],[6,16],[5,10],[9,6],[13,6],[16,10],[19,6],[23,6],[27,10],[26,16],[16,27]]);},
  lookup:(L,C)=>{C(13,13,8);L([[19,19],[27,27]]);},
  trade:(L)=>{L([[5,11],[25,11]]);L([[20,6],[25,11],[20,16]]);L([[27,21],[7,21]]);L([[12,16],[7,21],[12,26]]);},
  auction:(L)=>{L([[9,11],[17,3],[23,9],[15,17],[9,11]]);L([[14,14],[24,24]]);L([[6,28],[18,28]]);},
  rank:(L)=>{L([[9,5],[23,5],[23,12],[16,18],[9,12],[9,5]]);L([[9,7],[5,7],[5,11],[9,13]]);L([[23,7],[27,7],[27,11],[23,13]]);L([[16,18],[16,24]]);L([[10,27],[22,27],[20,24],[12,24],[10,27]]);},
  gift:(L)=>{L([[6,13],[26,13],[26,18],[6,18],[6,13]]);L([[8,18],[8,28],[24,28],[24,18]]);L([[16,13],[16,28]]);L([[16,13],[11,7],[8,10],[16,13],[21,7],[24,10],[16,13]]);},
  gem:(L)=>{L([[6,12],[11,6],[21,6],[26,12],[16,27],[6,12]]);L([[6,12],[26,12]]);L([[11,6],[14,12],[16,27]]);L([[21,6],[18,12],[16,27]]);},
  mail:(L)=>{L([[5,8],[27,8],[27,24],[5,24],[5,8]]);L([[5,8],[16,17],[27,8]]);},
  event:(L)=>{const p=[];for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?5.5:12;p.push([16+Math.cos(a)*r,17+Math.sin(a)*r]);}p.push(p[0]);L(p);},
  map:(L)=>{L([[5,8],[12,5],[21,9],[27,6],[27,24],[21,27],[12,23],[5,26],[5,8]]);L([[12,5],[12,23]]);L([[21,9],[21,27]]);}
 };
 function iconURL(key){if(ICON_CACHE.has(key))return ICON_CACHE.get(key);const c=document.createElement('canvas');c.width=c.height=96;const x=c.getContext('2d');
  const g=x.createRadialGradient(36,30,4,48,48,46);g.addColorStop(0,'#fff1c4');g.addColorStop(.55,'#e9b65a');g.addColorStop(1,'#8a5418');x.fillStyle=g;x.beginPath();x.arc(48,48,45,0,Math.PI*2);x.fill();
  x.strokeStyle='#5a3410';x.lineWidth=2.5;x.stroke();x.strokeStyle='#fff2c088';x.lineWidth=2;x.beginPath();x.arc(48,48,40,0,Math.PI*2);x.stroke();
  x.save();x.translate(18,18);x.scale(1.875,1.875);x.strokeStyle='#3a1c06';x.fillStyle='#3a1c06';x.lineWidth=2.2;x.lineCap='round';x.lineJoin='round';
  const L=pts=>{x.beginPath();pts.forEach(([a,b],i)=>i?x.lineTo(a,b):x.moveTo(a,b));x.stroke();},C=(a,b,r)=>{x.beginPath();x.arc(a,b,r,0,Math.PI*2);x.stroke();},A=(a,b,r,s,e)=>{x.beginPath();x.arc(a,b,r,s,e);x.stroke();};
  (GLYPH[key]||GLYPH.event)(L,C,A);x.restore();const url=c.toDataURL();ICON_CACHE.set(key,url);return url;}
 const iconNode=(key,big)=>{const i=new Image();i.className='fh-icon'+(big?' big':'');i.alt='';i.src=iconURL(key);return i;};
 const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;};
 function tile(t){const b=node('button','fh-tile');b.type='button';b.append(iconNode(t.icon),node('span','',t.name));b.onclick=()=>{d.close();setTimeout(t.run,0);};return b;}
 function card(a){const lv=typeof characterLevel==='function'?characterLevel():1,locked=lv<a.level;const c=node('article','fh-card'+(locked?' locked':''));
  c.append(iconNode(a.icon,true));const body=node('div','fh-body');c.append(body);
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
.fh-icon{display:block;width:42px;height:42px;filter:drop-shadow(0 3px 5px #0009)}
.fh-icon.big{width:50px;height:50px}
.fh-go{min-width:86px}
.fh-tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:8px}
.fh-tile{display:grid!important;justify-items:center;gap:6px;padding:10px 4px!important;min-height:0!important;border-radius:12px!important;background:linear-gradient(180deg,#2a1610,#1a0d0a)!important;border:1px solid #e2c27e3a!important;color:#f3e3b4!important;font-size:12px!important}
.fh-tile:hover{border-color:#ffd27a!important}
@media(max-width:600px){.fh-cards{grid-template-columns:1fr}.fh-card{grid-template-columns:42px minmax(0,1fr) auto;gap:8px;padding:9px 10px}.fh-card .fh-go{min-width:0!important;padding:8px 10px!important;font-size:12px!important}.fh-icon.big{width:42px;height:42px}.fh-tiles{grid-template-columns:repeat(4,minmax(0,1fr))}}
`;document.head.append(css);
 // Framed panels draw their hairline and corner flourishes as absolute children, which
 // scroll away with long content and end up mid-panel; hide them once a panel scrolls.
 document.addEventListener('scroll',e=>{const t=e.target;if(t instanceof Element&&t.matches('#world-dialog>section'))t.classList.toggle('xx-scrolled',t.scrollTop>6);},true);
 const close=d.close;d.close=function(...a){document.querySelector('#world-dialog>section')?.classList.remove('xx-scrolled','feature-hub');return close.apply(this,a);};
 window.featureHub={open,ACTIVITIES};
})();
