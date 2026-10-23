/* Phúc lợi: daily check-in, offline cultivation (bế quan), timed events,
   achievements with titles and weekly leaderboards. All rewards are granted by
   the server (/api/engagement); this module only renders and requests them. */
(function(){
 const world=worldMap,d=world.dialog,ui=visualUI;
 const state={data:null,fetchedAt:0,busy:false,popped:false,tab:'checkin',titles:new Map(),lastEvents:''};
 const fmt=s=>{s=Math.max(0,Math.round(s));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return (h?h+':'+String(m).padStart(2,'0'):m)+':'+String(x).padStart(2,'0');};
 const elapsed=()=>(performance.now()-state.fetchedAt)/1000;

 // ---------- HUD entry points
 const button=document.createElement('button');button.id='welfare-button';button.type='button';button.textContent='Phúc lợi';
 const badge=document.createElement('span');badge.className='community-badge welfare-badge';badge.hidden=true;button.append(badge);
 button.onclick=()=>{if(!paused())open();};
 const home=$('hud-more-menu')||$('bt');home.prepend(button);
 const copy=$('adventure-button');if(copy){button.classList.add('hud-icon');button.dataset.hudLabel='Phúc lợi';button.style.setProperty('--hud-icon',copy.style.getPropertyValue('--hud-icon'));}
 const banner=document.createElement('button');banner.id='event-banner';banner.type='button';banner.hidden=true;banner.onclick=()=>{if(!paused())open('events');};document.body.append(banner);
 const gift=document.createElement('button');gift.id='welfare-gift';gift.type='button';gift.hidden=true;gift.setAttribute('aria-label','Phúc lợi có quà chưa nhận');gift.textContent='🎁';gift.onclick=()=>{if(!paused())open();};document.body.append(gift);

 function claimable(){const x=state.data;if(!x)return 0;return (x.checkin.today?0:1)+(x.offline.minutes>=1?1:0)+x.achievements.filter(a=>!a.claimed&&a.value>=a.target).length;}
 function refreshBadges(){const n=claimable();badge.hidden=!n;badge.textContent=n;gift.hidden=!n||!P.ap||!account.state.ready;const more=$('hud-more');if(more)more.classList.toggle('welfare-alert',!!n);}

 async function refresh(){if(state.busy||!P.ap||!account.state.ready||account.state.restoring)return;try{state.data=await account.api('/api/engagement');state.fetchedAt=performance.now();refreshBadges();
   if(!state.popped&&!world.dialog.isOpen()&&!paused()){const x=state.data;if(!x.checkin.today||x.offline.minutes>=5){state.popped=true;open(!x.checkin.today?'checkin':'offline');}else state.popped=true;}
   if(d.isOpen()&&$('world-title').textContent==='Phúc lợi')render();}catch{}}

 async function act(action,extra={}){if(state.busy)return;state.busy=true;try{const result=await account.transact('/api/engagement',{action,opId:crypto.randomUUID(),...extra});state.data=result.engagement;state.fetchedAt=performance.now();if(result.message){msg(result.message);window.skillImpact?.flash?.('#ffd27a');}refreshBadges();render();}catch(e){msg(e.message);}finally{state.busy=false;}}

 // ---------- panel
 function open(tab){if(!P.ap)return;if(tab)state.tab=tab;d.show('Phúc lợi','');$('world-content').closest('section')?.classList.add('visual-dialog');render();if(!state.data||elapsed()>20)refresh();}
 const TABS=[['checkin','Điểm danh'],['offline','Bế quan'],['events','Sự kiện'],['achievements','Thành tựu'],['boards','Bảng tuần']];
 function render(){const content=$('world-content');if(!content||$('world-title').textContent!=='Phúc lợi')return;content.replaceChildren();
  const nav=ui.node('nav','journal-tabs welfare-tabs');nav.setAttribute('aria-label','Mục phúc lợi');
  for(const [id,label]of TABS){const b=ui.node('button','',label);b.type='button';b.setAttribute('aria-pressed',String(state.tab===id));b.onclick=()=>{state.tab=id;render();};nav.append(b);}content.append(nav);
  const x=state.data;if(!x){content.append(ui.node('p','world-line','Đang tải…'));return;}
  ({checkin,offline,events,achievements,boards})[state.tab](content,x);}

 // Rewards as item icons with a quantity corner, VLTK style.
 const REWARD_ART={essence:'Item/CanhGioi/kimdan.png',fragments:'Item/PhapTran/5.png'};
 function rewardIcons(r){const row=ui.node('div','welfare-icons');const add=(src,qty,label,cls='')=>{const cell=ui.node('span','welfare-icon '+cls);cell.title=label;if(src){const img=new Image();img.src=artworkURL(src);img.alt='';cell.append(img);}else cell.append(ui.node('b','coin','◈'));cell.append(ui.node('em','',qty>=1000?(qty/1000)+'K':String(qty)));row.append(cell);};
  if(r.gold)add(null,r.gold,'Linh Thạch','gold');if(r.essence)add(REWARD_ART.essence,r.essence,'Linh Nguyên');if(r.fragments)add(REWARD_ART.fragments,r.fragments,'Mảnh linh khí');
  for(const i of r.items||[])add(i.art,i.qty,i.name);return row;}
 function checkin(root,x){
  const grid=ui.node('div','welfare-days');
  x.checkin.rewards.forEach((r,i)=>{const day=i+1,done=x.checkin.today?day<=x.checkin.streak:day<=x.checkin.streak,next=!x.checkin.today&&day===x.checkin.next;
   const card=ui.node('div','welfare-day'+(done?' done':'')+(next?' next':'')+(day===7?' grand':''));card.title=r.text;card.append(ui.node('b','','Ngày '+day),rewardIcons(r),ui.node('small','',done?'✔':next?'Hôm nay':''));grid.append(card);});
  root.append(grid);
  const b=d.action(x.checkin.today?'✔ Đã điểm danh':'Điểm danh',()=>act('checkin'),x.checkin.today);b.classList.add('welfare-primary');
 }
 function offline(root,x){
  const o=x.offline,{body}=ui.panel('Bế quan tu luyện',null,root);
  ui.meter(o.seconds,o.cap,'Thời gian bế quan (tối đa 12 giờ)',body);
  ui.chips([['Phút',o.minutes],['EXP',o.xp],['◈',o.gold]],body);
  body.append(ui.node('p','visual-note','Khi bạn offline từ 5 phút trở lên, nhân vật tự bế quan và tích tu vi theo cấp hiện tại. Nhận trước khi đầy 12 giờ để không phí.'));
  d.action(o.minutes>=1?'Xuất quan · nhận '+o.xp+' EXP và '+o.gold+' ◈':'Chưa có tu vi bế quan',()=>act('offline'),o.minutes<1).classList.add('welfare-primary');
 }
 function events(root,x){
  const list=ui.node('div','welfare-events');
  for(const e of x.events){const live=e.active&&e.endsIn-elapsed()>0,card=ui.node('div','welfare-event'+(live?' live':''));
   card.append(ui.node('b','',e.name+(e.mult>1?' · x'+e.mult:'')),ui.node('span','',e.desc),ui.node('small','',(e.weekend?'Thứ Bảy, Chủ nhật':'Hằng ngày '+e.hours)+' · '+(live?'Đang diễn ra · còn '+fmt(e.endsIn-elapsed()):'Bắt đầu sau '+fmt(e.startsIn-elapsed()))));list.append(card);}
  root.append(list);root.append(ui.node('p','world-line','Giờ sự kiện theo giờ Việt Nam (GMT+7). Banner trên màn hình báo khi sự kiện bắt đầu.'));
 }
 function achievements(root,x){
  const current=ui.node('div','welfare-title-row');current.append(ui.node('span','','Danh hiệu: '),ui.node('b','',x.title?'「'+x.title+'」':'Chưa đeo'));root.append(current);
  if(x.titles.length){const row=ui.node('div','welfare-title-pick');for(const t of ['',...x.titles]){const b=ui.node('button','',t||'Bỏ danh hiệu');b.type='button';b.setAttribute('aria-pressed',String(x.title===t));b.onclick=()=>act('title',{title:t});row.append(b);}root.append(row);}
  const list=ui.node('div','welfare-achievements');
  for(const a of [...x.achievements].sort((p,q)=>(p.claimed-q.claimed)||((q.value>=q.target)-(p.value>=p.target)))){const ready=!a.claimed&&a.value>=a.target,card=ui.node('div','welfare-ach'+(a.claimed?' done':ready?' ready':''));
   card.append(ui.node('b','',a.name),ui.node('span','',a.desc+' · Danh hiệu「'+a.title+'」'),ui.node('small','','Thưởng: '+a.reward));
   const bar=ui.node('progress');bar.max=a.target;bar.value=a.value;bar.setAttribute('aria-label',a.name);card.append(bar,ui.node('small','',a.value+'/'+a.target));
   if(ready){const b=ui.node('button','','Nhận thưởng');b.type='button';b.onclick=()=>act('achievement',{id:a.id});card.append(b);}list.append(card);}
  root.append(list);
 }
 function boards(root,x){
  root.append(ui.node('p','world-line','Tuần '+x.week+' · chốt sau '+fmt(x.weekEndsIn-elapsed())+'. Top 10 nhận thưởng qua hộp thư (Đội / Tông môn → Rương).'));
  const rewards=ui.node('div','welfare-board-rewards');for(const r of x.boardRewards)rewards.append(ui.node('span','',(r.top===1?'Hạng 1':'Top '+r.top)+': '+r.text));root.append(rewards);
  const grid=ui.node('div','welfare-boards');
  for(const b of x.boards){const card=ui.node('div','welfare-board');card.append(ui.node('b','',b.name));const table=ui.node('ol');
   if(!b.top.length)table.append(ui.node('li','empty','Chưa có ai ghi danh. Hãy là người đầu tiên!'));
   for(const e of b.top){const li=ui.node('li',e.id===account.state.user?.id?'me':'');li.append(ui.node('span','',e.rank+'. '+e.name),ui.node('em','',e.value+' '+b.unit));table.append(li);}
   card.append(table,ui.node('small','','Của bạn: '+b.mine+' '+b.unit+(b.rank?' · hạng '+b.rank:'')));grid.append(card);}
  root.append(grid);
 }

 // ---------- event banner
 function tickBanner(){const x=state.data;if(!x||!P.ap||!account.state.ready){banner.hidden=true;return;}
  const live=x.events.filter(e=>e.active&&e.endsIn-elapsed()>0),soon=x.events.filter(e=>!e.active&&e.startsIn-elapsed()>0&&e.startsIn-elapsed()<3600).sort((a,b)=>a.startsIn-b.startsIn)[0];
  if(live.length){banner.hidden=false;banner.classList.add('live');banner.textContent='⚡ '+live.map(e=>e.name+(e.mult>1?' x'+e.mult:'')).join(' · ')+' · còn '+fmt(Math.min(...live.map(e=>e.endsIn))-elapsed());}
  else if(soon){banner.hidden=false;banner.classList.remove('live');banner.textContent='⏳ '+soon.name+' sau '+fmt(soon.startsIn-elapsed());}
  else banner.hidden=true;
  if(x.events.some(e=>(e.active?e.endsIn:e.startsIn)-elapsed()<-1))refresh();
 }
 setInterval(tickBanner,1000);

 // ---------- titles over names (self and peers)
 const caption=window.drawWorldCaption;
 window.drawWorldCaption=function(ctx,text,x,y,color,size){caption(ctx,text,x,y,color,size);
  const name=String(text).replace(/^◆ /,''),title=name===P.nm?state.data?.title:state.titles.get(name);
  if(title)caption(ctx,'「'+title+'」',x,y+(size||6.5)*1.25,'#ffd27a',(size||6.5)*.82);};
 function receive(data){state.titles=new Map((data.players||[]).filter(p=>p.title).map(p=>[p.name,p.title]));
  const key=(data.events||[]).map(e=>e.id).join();if(key!==state.lastEvents){if(key&&state.lastEvents!=='')msg('⚡ Sự kiện bắt đầu: '+data.events.map(e=>e.name).join(', ')+'!');state.lastEvents=key;if(key)refresh();}}

 // ---------- lifecycle
 setInterval(()=>{if(!state.data||elapsed()>60)refresh();},5000);
 const css=document.createElement('style');css.textContent=`
#event-banner{position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:4;max-width:calc(100vw - 32px);padding:6px 14px;border-radius:999px;border:1px solid #c9a96088;background:#1a2a33e6;color:#f3e3b4;font:600 12px Arial;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer}
#event-banner.live{border-color:#ffd27a;background:linear-gradient(90deg,#5a2a12ee,#7a4a14ee);color:#fff3c8;box-shadow:0 0 14px #ffb84a66}
#event-banner[hidden],#welfare-gift[hidden]{display:none}
#welfare-gift{position:fixed;top:66px;right:152px;z-index:4;width:44px;height:44px;border-radius:50%;border:1px solid #ffd27a;background:radial-gradient(circle at 35% 30%,#7a4a14,#2a1a10);font-size:22px;line-height:1;cursor:pointer;box-shadow:0 0 12px #ffb84a88}
@media(prefers-reduced-motion:no-preference){#welfare-gift{animation:welfare-bob 1.6s ease-in-out infinite}@keyframes welfare-bob{50%{transform:translateY(-3px)}}}
#hud-more.welfare-alert::after{content:'';position:absolute;top:2px;right:2px;width:9px;height:9px;border-radius:50%;background:#ff7a5a;box-shadow:0 0 6px #ff7a5a}
.welfare-badge{margin-left:5px}
.welfare-days{display:grid;grid-template-columns:repeat(auto-fit,minmax(92px,1fr));gap:8px;margin:10px 0}
.welfare-day,.welfare-event,.welfare-ach,.welfare-board{display:grid;gap:4px;padding:10px;border:1px solid #5d7774;border-radius:10px;background:#132a33;color:#d9e7de;font-size:12px}
.welfare-day b,.welfare-event b,.welfare-ach b,.welfare-board b{color:#f3e3b4;font-size:13px}.welfare-day small,.welfare-ach small,.welfare-event small{color:#9fc4bb}
.welfare-day.done{opacity:.6}.welfare-day.next{border-color:#ffd27a;box-shadow:0 0 10px #ffd27a44}.welfare-day.grand{background:linear-gradient(160deg,#3a2a12,#132a33)}
.welfare-events,.welfare-achievements{display:grid;gap:8px;margin:10px 0}.welfare-event.live{border-color:#ffb84a;background:linear-gradient(160deg,#4a2a12,#132a33)}
.welfare-ach.ready{border-color:#ffd27a}.welfare-ach.done{opacity:.55}.welfare-ach progress{width:100%}.welfare-ach button{justify-self:start}
.welfare-title-row{margin:8px 0;color:#d9e7de}.welfare-title-row b{color:#ffd27a}
.welfare-title-pick{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}.welfare-title-pick button[aria-pressed=true],.welfare-tabs button[aria-pressed=true]{border-color:#ffd27a;color:#ffd27a}
.welfare-boards{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px}.welfare-board ol{margin:0;padding:0;list-style:none;display:grid;gap:3px}
.welfare-board li{display:flex;justify-content:space-between;gap:8px}.welfare-board li.me{color:#ffd27a}.welfare-board li.empty{color:#9fc4bb}.welfare-board em{font-style:normal;color:#9fc4bb}
.welfare-board-rewards{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 10px;font-size:12px;color:#f3e3b4}.welfare-board-rewards span{padding:3px 8px;border:1px solid #c9a96066;border-radius:999px}
.welfare-primary{margin-top:8px}
.welfare-icons{display:flex;flex-wrap:wrap;gap:4px;justify-content:center}.welfare-icon{position:relative;width:40px;height:40px;border-radius:8px;border:1px solid #c9a96088;background:radial-gradient(circle at 50% 35%,#2e4a52,#0e1a20);display:grid;place-items:center;overflow:hidden}
.welfare-icon img{width:34px;height:34px;object-fit:contain}.welfare-icon .coin{color:#ffd27a;font-size:22px;text-shadow:0 0 6px #ffb84a}.welfare-icon em{position:absolute;right:2px;bottom:0;font:700 10px Arial;font-style:normal;color:#fff;text-shadow:0 0 2px #000,0 0 2px #000}
.welfare-day{justify-items:center;text-align:center}`;
 document.head.append(css);
 window.engagementGame={state,open,refresh,receive,claimable};
})();
