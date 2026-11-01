/* Động phủ: private cave garden and Tụ Linh Thú (server: cave.py).
   Crops grow on the server clock, so they ripen while the player is offline; the beast
   gathers Linh Thạch for up to 12 hours. Opened from Chức năng → Động phủ. */
(function(){
 'use strict';
 const d=worldMap.dialog,ui=visualUI,TITLE='Động phủ';
 const state={data:null,busy:false,pick:null,loadedAt:0,timer:0};
 const fmt=n=>Number(n||0).toLocaleString('vi-VN');
 const dur=s=>{s=Math.max(0,Math.round(s));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return h?h+'g '+String(m).padStart(2,'0')+'p':m?m+'p '+String(x).padStart(2,'0')+'s':x+'s';};
 // Plants drawn in code: stage 0 sprout → 1 growing → 2 ripe (glows).
 function plant(kind,stage){
  const s=ui.node('span','cave-plant'+(stage===2?' ripe':''));let art='';
  const soil='<ellipse cx="40" cy="62" rx="30" ry="9" fill="#4a3220"/><ellipse cx="40" cy="60" rx="26" ry="6" fill="#6b4a2e"/>';
  if(kind==='linhthao')art=stage===0?'<path d="M40 60c0-8 4-12 9-13-1 6-4 10-9 13zM40 60c0-6-4-9-8-9 1 4 3 7 8 9z" fill="#7be08a"/>':
   '<path d="M40 60V'+(stage===2?28:38)+'" stroke="#5cbf6a" stroke-width="3"/>'+[0,1,2,3].map(i=>`<path d="M40 ${56-i*8}c${i%2?-14:14} -2 ${i%2?-18:18} -10 ${i%2?-18:18} -14c${i%2?6:-6} 0 ${i%2?14:-14} 6 ${i%2?18:-18} 14z" fill="${stage===2?'#9cf0a0':'#6fd27a'}"/>`).join('')+(stage===2?'<circle cx="40" cy="26" r="5" fill="#e9ffb0"/>':'');
  else if(kind==='huyetsam')art=stage===0?'<path d="M40 60c0-7 5-11 10-11-1 6-5 9-10 11z" fill="#5fae5a"/><circle cx="40" cy="60" r="3" fill="#b8323a"/>':
   '<path d="M40 60V34" stroke="#4f8f4a" stroke-width="3"/><path d="M40 44c-12-2-18-10-18-16 8 0 15 6 18 16zM40 40c12-2 18-10 18-16-8 0-15 6-18 16z" fill="#5fae5a"/>'+(stage===2?'<g fill="#e0303c"><circle cx="40" cy="28" r="4"/><circle cx="35" cy="31" r="3.5"/><circle cx="45" cy="31" r="3.5"/><circle cx="40" cy="34" r="3"/></g>':'<circle cx="40" cy="30" r="3" fill="#a8484f"/>');
  else art=stage===0?'<path d="M40 60v-6" stroke="#b08a5a" stroke-width="3"/><ellipse cx="40" cy="53" rx="6" ry="3" fill="#8a6fd8"/>':
   '<path d="M40 60V'+(stage===2?36:44)+'" stroke="#b08a5a" stroke-width="4"/><path d="M'+(stage===2?'18 38c4-14 40-14 44 0-14 5-30 5-44 0z':'26 46c3-9 25-9 28 0-9 3-19 3-28 0z')+'" fill="'+(stage===2?'#9b7cff':'#7d66c8')+'"/>'+(stage===2?'<path d="M24 36c10-6 22-6 32 0" stroke="#e5dcff" stroke-width="2" fill="none"/><circle cx="31" cy="31" r="2" fill="#fff"/><circle cx="49" cy="32" r="1.6" fill="#fff"/>':'');
  s.innerHTML='<svg viewBox="0 0 80 72" aria-hidden="true">'+soil+art+'</svg>';return s;}
 function beastArt(level){const s=ui.node('span','cave-beast-art');const hue=Math.min(10,level)*12;
  s.innerHTML=`<svg viewBox="0 0 96 80" aria-hidden="true"><ellipse cx="48" cy="72" rx="30" ry="6" fill="#0006"/><path d="M20 58c0-18 12-30 28-30s28 12 28 30c0 8-6 12-28 12S20 66 20 58z" fill="hsl(${190-hue},55%,62%)"/><path d="M30 34l-6-14 14 8zM66 34l6-14-14 8z" fill="hsl(${190-hue},55%,52%)"/><circle cx="38" cy="48" r="5" fill="#fff"/><circle cx="58" cy="48" r="5" fill="#fff"/><circle cx="39" cy="49" r="2.6" fill="#1b2430"/><circle cx="59" cy="49" r="2.6" fill="#1b2430"/><path d="M44 58q4 4 8 0" stroke="#1b2430" stroke-width="2" fill="none"/><circle cx="48" cy="20" r="${5+level*.6}" fill="#ffd96e" opacity=".9"/><path d="M48 12l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z" fill="#fff6c8"/></svg>`;return s;}

 async function load(){state.data=await account.api('/api/cave');state.loadedAt=performance.now();return state.data;}
 async function act(action,extra={}){if(state.busy)return;state.busy=true;render();
  try{const r=await account.transact('/api/cave',{action,...extra,opId:crypto.randomUUID()},{live:true,gold:true,world:['essence','thangViDan']});state.data=r.cave;state.loadedAt=performance.now();state.pick=null;if(r.message)msg('✿ '+r.message);if(typeof hud==='function')try{hud();}catch{}}
  catch(e){msg(e.message);}finally{state.busy=false;render();}}
 async function open(){if(!P.ap||paused())return;d.show(TITLE,'Ruộng linh dược và Tụ Linh Thú của riêng bạn.');$('world-content').closest('section')?.classList.add('visual-dialog');$('world-content').append(ui.node('p','world-line','Đang mở cửa động…'));try{await load();}catch(e){$('world-content').replaceChildren(ui.node('p','world-line',e.message));return;}render();
  clearInterval(state.timer);state.timer=setInterval(()=>{if(!d.isOpen()||$('world-title').textContent!==TITLE){clearInterval(state.timer);return;}tick();},1000);}
 const elapsed=()=>(performance.now()-state.loadedAt)/1000;
 function tick(){for(const el of document.querySelectorAll('[data-left]')){const left=+el.dataset.left-elapsed();el.textContent=left>0?'Còn '+dur(left):'Đã chín';if(left<=0&&!el.dataset.done){el.dataset.done=1;render();return;}}
  const b=state.data?.beast,st=document.querySelector('.cave-stock');if(b&&st){const now=Math.min(b.cap,b.stock+Math.floor(b.rate*elapsed()/3600));st.textContent=fmt(now)+' / '+fmt(b.cap)+' ◈';}}

 function render(){const root=$('world-content');if(!root||$('world-title').textContent!==TITLE||!state.data)return;root.replaceChildren();const c=state.data,el=elapsed();
  root.append(ui.node('p','cave-note','Gieo hạt, linh dược tự lớn kể cả khi offline. Mỗi ngày tưới linh tuyền một lần để chín sớm 30 phút. Ngọc Linh Chi cho Thăng Vị Đan để đột phá.'));
  const bar=ui.node('div','cave-bar');const ripe=c.plots.filter(p=>!p.empty&&p.left-el<=0).length;
  ui.action(bar,'Thu hoạch tất cả'+(ripe?' ('+ripe+')':''),()=>act('harvest_all'),state.busy||!ripe);
  ui.action(bar,c.watered?'Đã tưới hôm nay':'Tưới linh tuyền · −30 phút',()=>act('water'),state.busy||c.watered||!c.plots.some(p=>!p.empty));
  if(c.nextPlot)ui.action(bar,'Khai hoang ô '+c.nextPlot.index+' · '+fmt(c.nextPlot.price)+' ◈',()=>act('unlock'),state.busy||P.gold<c.nextPlot.price);root.append(bar);
  const grid=ui.node('div','cave-grid');root.append(grid);
  for(const p of c.plots){const card=ui.node('article','cave-plot'+(p.empty?' empty':''));grid.append(card);
   if(p.empty){card.append(plant('linhthao',-1));card.querySelector('svg').innerHTML='<ellipse cx="40" cy="62" rx="30" ry="9" fill="#4a3220"/><ellipse cx="40" cy="60" rx="26" ry="6" fill="#6b4a2e"/><path d="M28 58h24M32 54h16" stroke="#8a6440" stroke-width="2"/>';
    card.append(ui.node('b','','Ô ruộng trống'));
    if(state.pick===p.index){const list=ui.node('div','cave-seeds');for(const [k,meta] of Object.entries(c.catalog)){const have=c.seeds[k];const label=k==='linhthao'?'Linh Thảo · miễn phí':k==='huyetsam'?'Huyết Sâm · '+(have?have+' hạt':meta.price+' ◈'):'Ngọc Linh Chi · '+(have||0)+' hạt';
      ui.action(list,label+' · '+dur(meta.grow),()=>act('plant',{index:p.index,seed:k}),state.busy||(k==='ngocchi'&&!have)||(k==='huyetsam'&&!have&&P.gold<meta.price));}
     ui.action(list,'Hủy',()=>{state.pick=null;render();});card.append(list);}
    else ui.action(card,'Gieo hạt',()=>{state.pick=p.index;render();},state.busy);continue;}
   const left=p.left-el,stage=left<=0?2:left>p.total/2?0:1;card.append(plant(p.seed,stage),ui.node('b','',p.name));
   const t=ui.node('small','cave-left',left>0?'Còn '+dur(left):'Đã chín');if(left>0)t.dataset.left=p.left;card.append(t);
   const prog=ui.node('div','cave-prog');const i=ui.node('i');i.style.width=(100*Math.min(1,1-left/p.total)).toFixed(1)+'%';prog.append(i);card.append(prog);
   if(left<=0)ui.action(card,'Thu hoạch',()=>act('harvest',{index:p.index}),state.busy);
   const meta=c.catalog[p.seed];card.title='Thu: '+meta.reward.essence+' Linh Nguyên'+(meta.reward.gold?' · '+meta.reward.gold+' Linh Thạch':'')+(meta.thangViDan?' · '+meta.thangViDan+' Thăng Vị Đan':'')+' · '+meta.xp+' EXP';}
  const b=c.beast,card=ui.node('article','cave-beast');card.append(beastArt(b.level));const body=ui.node('div','cave-beast-body');card.append(body);
  body.append(ui.node('h3','','Tụ Linh Thú · Cấp '+b.level+'/'+b.max),ui.node('small','','Gom '+fmt(b.rate)+' Linh Thạch mỗi giờ, tối đa 12 giờ, kể cả khi offline.'));
  const now=Math.min(b.cap,b.stock+Math.floor(b.rate*el/3600));const sb=ui.node('div','cave-prog gold');const fi=ui.node('i');fi.style.width=(100*now/b.cap).toFixed(1)+'%';sb.append(fi);body.append(sb,ui.node('b','cave-stock',fmt(now)+' / '+fmt(b.cap)+' ◈'));
  const row=ui.node('div','cave-bar');ui.action(row,'Thu Linh Thạch',()=>act('collect'),state.busy||now<=0);
  if(b.cost)ui.action(row,'Cho ăn · '+b.cost.essence+' Linh Nguyên + '+fmt(b.cost.gold)+' ◈',()=>act('feed'),state.busy||(P.world.essence||0)<b.cost.essence||P.gold<b.cost.gold);body.append(row);root.append(card);
 }

 // A gentle reminder after login when something is ready.
 let reminded=false;setInterval(async()=>{if(reminded||!P.ap||!account.state.ready||paused())return;reminded=true;try{const c=await load();const ripe=c.plots.filter(p=>!p.empty&&p.left<=0).length;if(ripe||c.beast.full)msg('✿ Động phủ: '+(ripe?ripe+' ô linh dược đã chín':'')+(ripe&&c.beast.full?' · ':'')+(c.beast.full?'Tụ Linh Thú đã gom đầy':'')+' · mở Chức năng → Động phủ');}catch{}},8000);

 const css=document.createElement('style');css.textContent=`
.cave-note{font-size:12px;color:#b7c4bf;margin:0 0 8px;line-height:1.5}
.cave-bar{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 10px}.cave-bar .visual-action{flex:1 1 auto}
.cave-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;align-items:start}
.cave-plot{display:grid;justify-items:center;align-content:start;gap:4px;padding:8px;border-radius:12px;border:1px solid #6b8a5a66;background:linear-gradient(180deg,#1b2a22,#121d17);text-align:center}
.cave-plot.empty{border-style:dashed}.cave-plot b{color:#eaf3d0;font-size:13px}.cave-left{color:#a9c4a0}
.cave-plant{width:96px;height:86px;display:block}.cave-plant svg{width:100%;height:100%}.cave-plant.ripe{filter:drop-shadow(0 0 8px #e9ffb0aa)}
.cave-prog{width:100%;height:6px;border-radius:3px;background:#0b130e;overflow:hidden}.cave-prog i{display:block;height:100%;background:linear-gradient(90deg,#5fd27a,#d8ff9c)}.cave-prog.gold i{background:linear-gradient(90deg,#c99a4a,#ffe39a)}
.cave-seeds{display:grid;gap:4px;width:100%}.cave-plot>.visual-action{width:100%;min-height:0}.cave-seeds .visual-action{font-size:11px;padding:6px}
.cave-beast{display:grid;grid-template-columns:110px 1fr;gap:10px;align-items:center;margin-top:12px;padding:10px;border-radius:14px;border:1px solid #e3b86655;background:linear-gradient(180deg,#24210f,#15130a)}
.cave-beast-art svg{width:110px;height:92px}.cave-beast h3{margin:0;color:#ffe39a}.cave-beast small{color:#cdbf9c}.cave-beast-body{display:grid;gap:4px}.cave-stock{color:#fff1cc}
@media(max-width:520px){.cave-beast{grid-template-columns:1fr;justify-items:center;text-align:center}}`;document.head.append(css);
 window.caveGame={open};
})();
