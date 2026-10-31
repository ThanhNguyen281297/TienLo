/* Nhắc sự kiện: battle, guild war and timed welfare events are announced 5 minutes
   before and when they open, with a "Tham gia" banner in game. With permission (asked
   from the Chức năng panel, never automatically) a system notification is also shown
   when the game tab is in the background. All times are Vietnam time (GMT+7). */
(function(){
 'use strict';
 const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;};
 const vn=()=>{const d=new Date(Date.now()+7*3600e3);return{day:(d.getUTCDay()+6)%7,min:d.getUTCHours()*60+d.getUTCMinutes(),date:d.toISOString().slice(0,10)};};
 const SCHEDULE=[
  {id:'battle-noon',name:'Chiến trường Chính – Tà',at:12*60+30,days:null,level:15,shard:'Mảnh Hộ Thuẫn',run:()=>window.battleGame?.open()},
  {id:'battle-night',name:'Chiến trường Chính – Tà',at:21*60,days:null,level:15,shard:'Mảnh Hộ Thuẫn',run:()=>window.battleGame?.open()},
  {id:'guildwar',name:'Tông môn chiến',at:20*60,days:[2,5],level:1,shard:'Mảnh Nhẫn',run:()=>window.battleGame?.open()}
 ];
 const KEY='tienlo.reminders';let sent={};try{sent=JSON.parse(localStorage.getItem(KEY)||'{}');}catch{}
 const enabled=()=>{try{return localStorage.getItem('tienlo.remind')!=='off';}catch{return true;}};
 const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(sent));}catch{}};
 const banner=node('aside','vl-remind');banner.hidden=true;document.body.append(banner);
 function show(e,soon){banner.replaceChildren();banner.append(node('small','',soon?'Sắp bắt đầu · 5 phút':'Đang diễn ra'),node('b','',e.name),node('span','',e.shard?'Thưởng '+e.shard:''));
  const go=node('button','',soon?'Xem':'Tham gia');go.type='button';go.onclick=()=>{banner.hidden=true;e.run?.();};const x=node('button','vl-remind-x','✕');x.type='button';x.setAttribute('aria-label','Đóng');x.onclick=()=>{banner.hidden=true;};
  banner.append(go,x);banner.hidden=false;window.gameAudio?.play('level');clearTimeout(show.t);show.t=setTimeout(()=>{banner.hidden=true;},soon?20000:40000);
  if(document.hidden&&'Notification' in window&&Notification.permission==='granted'){const body=(soon?'Bắt đầu sau 5 phút':'Đã mở')+(e.shard?' · thưởng '+e.shard:'');
   const icon='Character/App/icon-192.png';
   navigator.serviceWorker?.getRegistration?.().then(reg=>reg?reg.showNotification('Tiên Lộ · '+e.name,{body,icon,tag:e.id}):new Notification('Tiên Lộ · '+e.name,{body,icon,tag:e.id})).catch(()=>{try{new Notification('Tiên Lộ · '+e.name,{body,icon});}catch{}});}}
 function tick(){if(!P.ap||!account.state.ready||!enabled())return;const t=vn();
  const events=[...SCHEDULE];
  // timed welfare events (Linh Triều, Huyết Ma Nộ…) from the Phúc lợi data
  const eg=window.engagementGame?.state,age=eg?.fetchedAt?(performance.now()-eg.fetchedAt)/1000:0;
  for(const ev of eg?.data?.events||[])if(ev.startsIn-age>-120&&!ev.weekend&&!ev.active){const at=t.min+Math.round((ev.startsIn-age)/60);events.push({id:'ev-'+ev.id,name:ev.name+(ev.mult>1?' · x'+ev.mult:''),at,days:null,level:1,shard:null,run:()=>window.engagementGame?.open('events')});}
  for(const e of events){if(e.days&&!e.days.includes(t.day))continue;if(characterLevel()<e.level)continue;
   for(const [offset,soon] of [[-5,true],[0,false]]){const due=e.at+offset,key=t.date+':'+e.id+':'+(soon?'s':'o');if(sent[key])continue;
    if(t.min>=due&&t.min<due+2){sent[key]=1;save();show(e,soon);return;}}}
  for(const k of Object.keys(sent))if(!k.startsWith(t.date))delete sent[k];}
 setInterval(tick,20000);setTimeout(tick,6000);
 // a tile in the Chức năng panel to turn reminders and system notifications on/off
 const hub=window.featureHub;if(hub){const open=hub.open;hub.open=function(...a){const r=open.apply(this,a);const wrap=document.querySelector('#world-content .fh');if(wrap){
   const sec=node('section','fh-group');sec.append(node('h4','','Nhắc sự kiện'));const row=node('div','vl-remind-settings');sec.append(row);
   const state=()=>enabled()?('Notification' in window&&Notification.permission==='granted'?'Đang bật · có thông báo khi game chạy nền':'Đang bật · chỉ nhắc trong game'):'Đang tắt';
   const label=node('span','',state());const toggle=node('button','',enabled()?'Tắt nhắc':'Bật nhắc');toggle.type='button';
   toggle.onclick=()=>{try{localStorage.setItem('tienlo.remind',enabled()?'off':'on');}catch{}label.textContent=state();toggle.textContent=enabled()?'Tắt nhắc':'Bật nhắc';};
   row.append(label,toggle);
   if('Notification' in window&&Notification.permission==='default'){const ask=node('button','','Cho phép thông báo');ask.type='button';ask.onclick=()=>Notification.requestPermission().then(()=>{label.textContent=state();ask.remove();});row.append(ask);}
   row.append(node('small','','Chiến trường 12:30 và 21:00 · Tông môn chiến Thứ 4, Thứ 7 lúc 20:00 · sự kiện Phúc lợi. Nhắc trước 5 phút.'));wrap.append(sec);}return r;};}
 const css=node('style');css.textContent=`
.vl-remind{position:fixed;left:50%;top:calc(84px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:45;display:grid;grid-template-columns:minmax(0,1fr) auto auto;grid-template-rows:auto auto auto;column-gap:10px;align-items:center;min-width:260px;max-width:min(420px,92vw);padding:9px 12px;border-radius:12px;border:1px solid #ffd27a88;background:linear-gradient(180deg,#3a2410f2,#1a0d0af2);box-shadow:0 8px 24px #000a,0 0 18px #ffb84a44;color:#f3e3b4;animation:vl-remind-in .35s ease-out}
.vl-remind small{grid-column:1;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#ffcf6a}.vl-remind b{grid-column:1;font-size:14px}.vl-remind span{grid-column:1;font-size:11px;color:#cdbb98}
.vl-remind>button{grid-row:1/4;min-height:0!important;padding:7px 12px!important}.vl-remind .vl-remind-x{padding:4px 8px!important;background:transparent!important;border-color:transparent!important;color:#cdbb98!important}
@keyframes vl-remind-in{from{transform:translate(-50%,-10px);opacity:0}}
.vl-remind-settings{display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-size:12.5px;color:#e9dcb4}.vl-remind-settings small{flex-basis:100%;color:#cdbb98;font-size:11px}
`;document.head.append(css);
 window.eventReminders={tick,SCHEDULE};
})();
