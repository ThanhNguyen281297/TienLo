/* Mục tiêu: make getting stronger visible.
   - Lực chiến: every rise shows a "Lực chiến +N" banner under the portrait.
   - Mục tiêu trang bị: the next pieces of gear each shard kind can buy (for this class,
     not owned yet) with a progress bar; a toast when one becomes affordable. Shown at
     the top of the Chức năng panel and as a small tracker chip under the HUD. */
(function(){
 'use strict';
 const hud=window.vlHud,d=worldMap.dialog;if(!hud)return;
 const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;};
 const fmt=n=>Math.round(n).toLocaleString('vi-VN');
 // ---------------------------------------------------------------- power gains
 const banner=node('div','vl-power-gain');banner.hidden=true;document.body.append(banner);
 let last=null,hideAt=0,pending=0,shownAt=0;
 setInterval(()=>{if(!P.ap||!account.state.ready)return;let now;try{now=hud.combatPower();}catch{return;}
  if(last!==null&&now>last){pending+=now-last;banner.textContent='Lực chiến +'+fmt(pending);banner.hidden=false;banner.classList.remove('pop');void banner.offsetWidth;banner.classList.add('pop');shownAt=performance.now();hideAt=shownAt+2200;}
  last=now;if(!banner.hidden&&performance.now()>hideAt){banner.hidden=true;pending=0;}},500);
 addEventListener('tienlo-auth',()=>{last=null;});
 // ---------------------------------------------------------------- gear goals
 const state={data:null,at:0,affordable:new Set()};
 const owned=id=>{const w=P.world||{};return Object.values(w.equip||{}).some(i=>i?.id===id)||(w.bag||[]).some(i=>i?.id===id);};
 function goals(){const data=state.data;if(!data)return[];const out=[];
  for(const kind of Object.keys(data.kinds||{})){
   const offers=(data.offers||[]).filter(o=>o.kind===kind&&o.forClass&&!o.owned&&!owned(o.id)&&(o.req||0)<=characterLevel()+10).sort((a,b)=>a.cost-b.cost);
   const o=offers.find(o=>o.cost>(data.wallet[kind]||0))||offers.at(-1);if(!o)continue;
   out.push({offer:o,kind,have:data.wallet[kind]||0,name:data.kinds[kind].name,icon:data.kinds[kind].icon,source:data.kinds[kind].source});}
  return out.sort((a,b)=>Math.min(1,b.have/b.offer.cost)-Math.min(1,a.have/a.offer.cost));}
 async function load(force){if(!P.ap||!account.state.ready)return;if(!force&&performance.now()-state.at<60000)return;state.at=performance.now();
  try{state.data=await account.api('/api/shards');}catch{return;}
  for(const g of goals()){const key=g.offer.id;if(g.have>=g.offer.cost&&!state.affordable.has(key)){state.affordable.add(key);if(state.primed){msg('Đủ '+g.offer.cost+' '+g.name+' để đổi '+g.offer.name+' tại Trưởng môn!');window.gameAudio?.play('chest');}}}
  state.primed=true;renderChip();}
 setInterval(()=>load(false),15000);addEventListener('tienlo-auth',()=>{state.data=null;state.primed=false;state.affordable.clear();setTimeout(()=>load(true),2500);});
 // a reward that may carry shards (mail claim, kill drop) refreshes sooner
 const drop=window.shardsGame?.onDrop;if(drop)window.shardsGame.onDrop=function(...a){const r=drop.apply(this,a);setTimeout(()=>load(true),400);return r;};
 function goalRow(g){const row=node('div','goal-row'+(g.have>=g.offer.cost?' ready':''));const item=equipmentData.byId.get(g.offer.id)||g.offer;
  const img=new Image();img.src=inventory.itemIcon(item,g.offer.slot);img.alt='';img.className='goal-art';row.append(img);
  const body=node('div','goal-body');row.append(body);body.append(node('b','',g.offer.name));
  const bar=node('div','goal-bar');const fill=node('i');fill.style.width=Math.min(100,g.have/g.offer.cost*100)+'%';bar.append(fill);body.append(bar);
  body.append(node('small','',fmt(Math.min(g.have,g.offer.cost))+'/'+g.offer.cost+' '+g.name+' · '+g.source));
  const go=node('button','goal-go',g.have>=g.offer.cost?'Đổi ngay':'Cày');go.type='button';
  go.onclick=()=>{d.close();if(g.have>=g.offer.cost)window.shardsGame?.goMaster();else{const act=window.featureHub?.ACTIVITIES.find(a=>a.shard===g.kind);setTimeout(()=>act?.run(),0);}};row.append(go);return row;}
 // top of the Chức năng panel
 const hub=window.featureHub;if(hub){const open=hub.open;hub.open=function(...a){const r=open.apply(this,a);const wrap=document.querySelector('#world-content .fh');if(wrap){const sec=node('section','fh-group goals');sec.append(node('h4','','Mục tiêu trang bị'));
   const list=node('div','goal-list');sec.append(list);const fill=()=>{list.replaceChildren();const gs=goals().slice(0,4);if(!gs.length)list.append(node('p','goal-empty',state.data?'Đã đổi hết trang bị trong tầm cấp. Hãy lên cấp để mở thêm.':'Đang tải mục tiêu…'));gs.forEach(g=>list.append(goalRow(g)));};
   fill();wrap.prepend(sec);if(!state.data)load(true).then(fill);}return r;};}
 // compact HUD chip: the closest goal
 const chip=node('button','vl-goal-chip');chip.type='button';chip.hidden=true;document.body.append(chip);chip.onclick=()=>window.featureHub?.open();
 function renderChip(){const g=goals()[0];if(!g||!P.ap||characterLevel()<10){chip.hidden=true;return;}chip.hidden=false;const ready=g.have>=g.offer.cost;chip.classList.toggle('ready',ready);
  chip.replaceChildren(node('small','',ready?'Có thể đổi':'Mục tiêu'),node('b','',g.offer.name),node('span','',fmt(Math.min(g.have,g.offer.cost))+'/'+g.offer.cost+' '+g.name));}
 setInterval(()=>{if(chip.hidden)return;chip.style.visibility=d.isOpen()||paused()?'hidden':'';},500);
 const css=node('style');css.textContent=`
.vl-power-gain{position:fixed;left:calc(18px + env(safe-area-inset-left,0px));top:calc(132px + env(safe-area-inset-top,0px));z-index:40;pointer-events:none;padding:5px 14px;border-radius:999px;font:800 15px/1.2 var(--xx-title,Georgia,serif);color:#fff3c4;background:linear-gradient(90deg,#7a3a08ee,#c98a2aee,#7a3a0800);text-shadow:0 1px 2px #000,0 0 10px #ffcf5a}
.vl-power-gain.pop{animation:vl-power-pop 2.2s ease-out both}@keyframes vl-power-pop{0%{transform:translateY(8px) scale(.8);opacity:0}12%{transform:none;opacity:1}80%{opacity:1}100%{transform:translateY(-10px);opacity:0}}
.vl-goal-chip{position:fixed;left:calc(10px + env(safe-area-inset-left,0px));top:calc(232px + env(safe-area-inset-top,0px));z-index:12;display:grid;gap:1px;text-align:left;max-width:220px;padding:6px 10px!important;min-height:0!important;border-radius:10px!important;border:1px solid #e2c27e55!important;background:linear-gradient(180deg,#2a1610e6,#1a0d0ae6)!important;color:#f3e3b4!important;cursor:pointer}
.vl-goal-chip small{font-size:9.5px;letter-spacing:1px;color:#e2c27e;text-transform:uppercase}.vl-goal-chip b{font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.vl-goal-chip span{font-size:10.5px;color:#cdbb98}
.vl-goal-chip.ready{border-color:#7fffb0!important;box-shadow:0 0 12px #5fe0a066}.vl-goal-chip.ready small{color:#8fffc0}
.goal-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:8px}
.goal-row{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:10px;align-items:center;padding:8px 10px;border-radius:12px;border:1px solid #e2c27e3a;background:#00000040}
.goal-row.ready{border-color:#7fffb088;background:#0a2a1a66}
.goal-art{width:44px;height:44px;object-fit:contain}.goal-body{min-width:0}.goal-body b{display:block;font-size:13px;color:#f6e4b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.goal-body small{display:block;font-size:10.5px;color:#cdbb98;margin-top:3px}
.goal-bar{height:6px;border-radius:3px;background:#00000080;overflow:hidden;margin-top:4px}.goal-bar i{display:block;height:100%;background:linear-gradient(90deg,#c98a2a,#ffe39a)}.goal-row.ready .goal-bar i{background:linear-gradient(90deg,#3fbf7f,#9fffc8)}
.goal-go{min-width:74px}.goal-empty{margin:0;color:#cdbb98;font-size:12px}
@media(max-width:600px){.vl-goal-chip{top:auto;bottom:calc(150px + env(safe-area-inset-bottom,0px));max-width:170px}.goal-list{grid-template-columns:1fr}}
`;document.head.append(css);
 window.gearGoals={goals,load,state};
})();
