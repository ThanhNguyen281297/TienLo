/* Tụ Bảo Các: auction house panel. Every listing, bid, buyout, cancel and claim
   is executed by the server (/api/auction); this module only renders the market,
   the sell form and the delivery box ("Hòm nhận"). */
(function(){
 const world=worldMap,d=world.dialog,ui=visualUI,TITLE='Tụ Bảo Các';
 const NPC=(a=>a?{x:a[0],y:a[1]}:{x:650,y:1235})(window.sceneAnchors?.hub?.auction);
 const GROUPS=[['','Tất cả'],['weapon','Vũ khí'],['armor','Phòng cụ'],['treasure','Pháp bảo'],['accessory','Trang sức'],['material','Nguyên liệu']];
 const SORTS=[['ending','Sắp kết thúc'],['new','Mới đăng'],['cheap','Giá thấp'],['expensive','Giá cao']];
 const RARITIES=[['','Mọi phẩm'],['pham','Phàm'],['huyen','Huyền'],['linh','Linh'],['tien','Tiên'],['than','Thần']];
 const state={tab:'buy',data:null,query:{group:'',rarity:'',text:'',sort:'ending',page:0},view:null,sell:null,busy:false,fetchedAt:0,lastPoll:0};
 const fmt=n=>Number(n||0).toLocaleString('vi-VN');
 const left=s=>{s=Math.max(0,Math.round(s-(performance.now()-state.fetchedAt)/1000));if(s<=0)return 'Đã hết';const h=Math.floor(s/3600),m=Math.floor(s%3600/60);return h?h+' giờ '+m+' phút':m?m+' phút':s+' giây';};
 const quality=item=>equipmentRules.qualities.find(q=>q.id===item.rarity)||equipmentRules.qualities[0];
 const query=()=>({group:state.query.group||undefined,rarity:state.query.rarity||undefined,text:state.query.text||undefined,sort:state.query.sort,page:state.query.page});
 const mailCount=()=>state.data?.mail?.length||0;
 const sellable=item=>item&&(item.slot||item.type==='material')&&!String(item.id).startsWith('outfit-');

 // ---------- data
 async function refresh(){try{state.data={...state.data,...await account.api('/api/auction')};state.fetchedAt=performance.now();state.data.lots=state.data.lots;}catch(e){if(isOpen())msg(e.message);}badges();}
 async function browse(){try{const r=await account.api('/api/auction',{action:'browse',query:query()});state.data={...(state.data||{}),...r};state.fetchedAt=performance.now();}catch(e){msg(e.message);}render();}
 async function act(action,extra={}){if(state.busy)return false;state.busy=true;render();let ok=false;
  try{const r=await account.transact('/api/auction',{action,opId:crypto.randomUUID(),query:query(),...extra},{live:true,gold:true});state.data=r;state.fetchedAt=performance.now();if(r.message)msg(r.message);ok=true;
   window.gameAudio?.play?.(action==='claim'||action==='buyout'?'reward':'tap');}
  catch(e){msg(e.message);}finally{state.busy=false;badges();render();}return ok;}
 function poll(){if(!P.ap||!account.state.ready||account.state.restoring||state.busy)return;if(performance.now()-state.lastPoll<45000)return;state.lastPoll=performance.now();refresh();}
 const isOpen=()=>d.isOpen()&&$('world-title').textContent===TITLE;

 // ---------- HUD entry, NPC
 const hudButton=document.createElement('button');hudButton.id='auction-button';hudButton.type='button';hudButton.textContent='Đấu giá';hudButton.onclick=()=>{if(!paused())open();};
 ($('hud-more-menu')||$('bt')).append(hudButton);
 function badges(){const n=mailCount();if(activity)activity.badgeEl.hidden=!n,activity.badgeEl.textContent=n;}
 function addService(){if(world.state.scene==='hub'&&!world.services.some(s=>s.id==='auction'))world.services.push({id:'auction',name:TITLE+' · Đấu giá',x:NPC.x,y:NPC.y,color:'#ffd88a',npc:true});}
 addService();const change=world.switchScene;world.switchScene=function(...a){const r=change.apply(this,a);addService();return r;};
 const service=world.handleService;world.handleService=function(id){if(id==='auction'){open();return true;}return service(id);};
 const npc=creatureArt.drawNpc;creatureArt.drawNpc=function(ctx,s){return npc.call(this,ctx,s.id==='auction'?{...s,id:'shop'}:s);};
 // Golden lantern glow over the auction stall.
 world.queueActors=(previous=>function(items,cx,cy,vw,vh){previous.call(this,items,cx,cy,vw,vh);if(world.state.scene!=='hub')return;
  items.push([NPC.y-40,()=>{g.save();g.globalCompositeOperation='lighter';const glow=g.createRadialGradient(NPC.x,NPC.y-70,2,NPC.x,NPC.y-70,30);glow.addColorStop(0,'rgba(255,210,110,'+(.35+Math.sin(tm*2)*.08)+')');glow.addColorStop(1,'rgba(255,180,60,0)');g.fillStyle=glow;g.fillRect(NPC.x-32,NPC.y-102,64,64);g.restore();}]);})(world.queueActors);

 // ---------- panel
 function open(tab){if(!P.ap)return;if(tab)state.tab=tab;state.view=null;d.show(TITLE,'Chợ đấu giá giữa các đạo hữu · mọi giao dịch do server xử lý');$('world-content').closest('section')?.classList.add('visual-dialog','auction-dialog');render();refresh().then(render);}
 const TABS=[['buy','Mua'],['sell','Bán'],['bids','Đang đặt giá'],['mail','Hòm nhận']];
 function render(){if(!isOpen())return;const content=$('world-content');content.replaceChildren();
  const nav=ui.node('nav','journal-tabs auction-tabs');nav.setAttribute('aria-label','Mục đấu giá');
  for(const [id,label]of TABS){const b=ui.node('button','',label);b.type='button';b.setAttribute('aria-pressed',String(state.tab===id));if(id==='mail'&&mailCount())b.append(ui.node('span','community-badge',String(mailCount())));b.onclick=()=>{state.tab=id;state.view=null;state.sell=null;render();};nav.append(b);}
  content.append(nav);const x=state.data;
  content.append(ui.node('p','auction-wallet','◈ '+fmt(x?.gold??P.gold)+' Linh Thạch'));
  if(!x){content.append(ui.node('p','world-line','Đang mở sạp…'));return;}
  if(state.view)return detail(content,state.view);
  ({buy,sell,bids,mail})[state.tab](content,x);}

 function itemCell(item){const cell=ui.node('span','auction-icon');cell.style.setProperty('--rarity',quality(item).color);const img=new Image();img.src=inventory.itemIcon(item,item.slot);img.alt='';cell.append(img);
  if(item.enhance)cell.append(ui.node('b','','+'+item.enhance));if(item.type==='material'&&item.qty>1)cell.append(ui.node('em','',String(item.qty)));return cell;}
 function lotRow(lot,parent,onClick){const row=ui.node('button','auction-row'+(lot.leading?' leading':'')+(lot.mine?' mine':''));row.type='button';row.onclick=onClick||(()=>{state.view=lot;render();});
  row.append(itemCell(lot.item));const text=ui.node('div','auction-text');const name=ui.node('b','',lot.name);name.style.color=quality(lot.item).color;
  text.append(name,ui.node('small','',(lot.status==='open'?'⏳ '+left(lot.endsIn):({sold:'Đã bán '+fmt(lot.price)+' ◈',expired:'Hết hạn, không ai mua',cancelled:'Đã hủy'})[lot.status])+' · '+(lot.mine?'Của bạn':lot.seller)+(lot.leading?' · Bạn đang dẫn đầu':'')));row.append(text);
  const price=ui.node('div','auction-price');price.append(ui.node('b','',fmt(lot.bids?lot.bid:lot.start)+' ◈'),ui.node('small','',lot.bids?lot.bids+' lượt giá':'Giá khởi điểm'));if(lot.buyout)price.append(ui.node('small','auction-buyout','Mua ngay '+fmt(lot.buyout)));row.append(price);parent.append(row);return row;}

 function buy(content,x){const bar=ui.node('div','auction-filters');content.append(bar);
  const select=(options,key)=>{const s=ui.node('select');s.setAttribute('aria-label',key);for(const [v,l]of options){const o=ui.node('option','',l);o.value=v;s.append(o);}s.value=state.query[key];s.onchange=()=>{state.query[key]=s.value;state.query.page=0;browse();};bar.append(s);};
  const chips=ui.node('div','auction-groups');for(const [v,l]of GROUPS){const b=ui.node('button','',l);b.type='button';b.setAttribute('aria-pressed',String(state.query.group===v));b.onclick=()=>{state.query.group=v;state.query.page=0;browse();};chips.append(b);}content.insertBefore(chips,bar);
  select(RARITIES,'rarity');select(SORTS,'sort');
  const search=ui.node('input');search.type='search';search.placeholder='Tìm tên vật phẩm…';search.value=state.query.text;search.maxLength=40;search.setAttribute('aria-label','Tìm tên vật phẩm');
  let timer;search.oninput=()=>{clearTimeout(timer);timer=setTimeout(()=>{state.query.text=search.value;state.query.page=0;browse();},400);};search.addEventListener('focus',()=>{K={};ptr=null;});bar.append(search);
  const list=ui.node('div','auction-list');content.append(list);
  if(!x.lots?.length)list.append(ui.node('p','auction-empty','Chưa có món nào phù hợp. Hãy là người đầu tiên treo bán!'));
  for(const lot of x.lots||[])lotRow(lot,list);
  if((x.pages||1)>1){const pager=ui.node('div','auction-pager');ui.action(pager,'‹ Trước',()=>{state.query.page--;browse();},state.query.page<=0);pager.append(ui.node('span','','Trang '+(x.page+1)+'/'+x.pages));ui.action(pager,'Sau ›',()=>{state.query.page++;browse();},x.page+1>=x.pages);content.append(pager);}
 }

 function detail(content,lot){const live=[...(state.data.lots||[]),...(state.data.bidding||[]),...(state.data.selling||[])].find(l=>l.id===lot.id)||lot;state.view=live;
  const wrap=ui.node('div','auction-detail');content.append(wrap);itemCards.render(wrap,live.item);
  const info=ui.node('div','auction-info');wrap.append(info);
  ui.chips([['Người bán',live.mine?'Bạn':live.seller],['Còn lại',live.status==='open'?left(live.endsIn):'Đã kết thúc'],[live.bids?'Giá hiện tại':'Khởi điểm',fmt(live.bids?live.bid:live.start)+' ◈'],['Mua ngay',live.buyout?fmt(live.buyout)+' ◈':'—']],info);
  if(live.leading)info.append(ui.node('p','auction-note good','Bạn đang trả giá cao nhất. Nếu bị vượt, Linh Thạch được hoàn vào Hòm nhận.'));
  const ref=state.data.refs?.[live.item.id];if(ref)info.append(ui.node('p','auction-note','Giá tham khảo gần đây: ~'+fmt(ref*(live.item.type==='material'?live.item.qty||1:1))+' ◈'));
  if(live.status==='open'&&!live.mine){const form=ui.node('div','auction-bid');const input=ui.node('input');input.type='number';input.inputMode='numeric';input.min=live.minBid;input.step=1;input.value=live.minBid;input.setAttribute('aria-label','Giá đặt');input.addEventListener('focus',()=>{K={};ptr=null;});
   form.append(ui.node('label','','Giá đặt (tối thiểu '+fmt(live.minBid)+' ◈)'),input);info.append(form);
   const row=ui.node('div','auction-actions');info.append(row);
   ui.action(row,'Đặt giá',()=>{const amount=Math.floor(Number(input.value));if(!(amount>=live.minBid))return msg('Giá đặt tối thiểu '+fmt(live.minBid)+' ◈.');act('bid',{id:live.id,amount});},state.busy);
   if(live.buyout)ui.action(row,'Mua ngay · '+fmt(live.buyout)+' ◈',()=>act('buyout',{id:live.id}).then(ok=>{if(ok){state.view=null;state.tab='mail';render();}}),state.busy);
   info.append(ui.node('small','auction-note','Linh Thạch được giữ ngay khi đặt giá. Đặt giá trong 2 phút cuối sẽ gia hạn thêm 2 phút.'));}
  if(live.mine&&live.status==='open'){const row=ui.node('div','auction-actions');info.append(row);ui.action(row,live.bids?'Đã có người trả giá':'Hủy bán, nhận lại đồ',()=>act('cancel',{id:live.id}).then(ok=>{if(ok){state.view=null;render();}}),!!live.bids||state.busy);}
  const back=ui.node('div','auction-actions');info.append(back);ui.action(back,'‹ Trở lại',()=>{state.view=null;render();});}

 function sell(content,x){const rules=x.rules||{};
  if(state.sell){const item=P.world.bag.find(i=>i.uid===state.sell);if(item)return sellForm(content,item,rules,x);state.sell=null;}
  const open=(x.selling||[]).filter(l=>l.status==='open').length;
  content.append(ui.node('p','auction-note','Chọn món trong túi để treo bán (đang treo '+open+'/'+(rules.maxLots||10)+'). Phí treo '+Math.round((rules.feeRate||.02)*100)+'% giá khởi điểm, thuế '+Math.round((rules.taxRate||.05)*100)+'% khi bán được.'));
  const grid=ui.node('div','auction-bag');content.append(grid);const items=P.world.bag.filter(sellable);
  if(!items.length)grid.append(ui.node('p','auction-empty','Túi chưa có trang bị hay nguyên liệu để bán.'));
  for(const item of items){const b=ui.node('button','auction-bag-cell');b.type='button';b.title=item.name;b.setAttribute('aria-label','Bán '+item.name);b.append(itemCell(item));b.onclick=()=>{state.sell=item.uid;render();};grid.append(b);}
  if(x.selling?.length){content.append(ui.node('h4','auction-heading','Món của bạn'));const list=ui.node('div','auction-list');content.append(list);for(const lot of x.selling)lotRow(lot,list);}
 }
 function sellForm(content,item,rules,x){const wrap=ui.node('div','auction-detail');content.append(wrap);itemCards.render(wrap,item);const info=ui.node('div','auction-info');wrap.append(info);
  const ref=x.refs?.[item.id],material=item.type==='material',suggest=Math.max(rules.minPrice||10,ref||Math.round((item.price||50)*1.5));
  const field=(label,attrs)=>{const box=ui.node('label','auction-field');box.append(ui.node('span','',label));const input=ui.node('input');Object.assign(input,attrs);input.addEventListener('focus',()=>{K={};ptr=null;});box.append(input);info.append(box);return input;};
  const qty=material?field('Số lượng (có '+item.qty+')',{type:'number',min:1,max:item.qty,value:item.qty,step:1,inputMode:'numeric'}):null;
  const start=field('Giá khởi điểm ◈',{type:'number',min:rules.minPrice||10,value:suggest*(material?item.qty:1),step:1,inputMode:'numeric'});
  const buyout=field('Giá mua ngay ◈ (để trống nếu không có)',{type:'number',min:0,value:'',step:1,inputMode:'numeric',placeholder:'Không bắt buộc'});
  const hours=ui.node('div','auction-durations');let chosen=24;for(const h of rules.durations||[12,24,48]){const b=ui.node('button','',h+' giờ');b.type='button';b.setAttribute('aria-pressed',String(h===chosen));b.onclick=()=>{chosen=h;for(const c of hours.children)c.setAttribute('aria-pressed',String(c===b));};hours.append(b);}info.append(hours);
  const fee=ui.node('p','auction-note');info.append(fee);const update=()=>{const s=Math.floor(Number(start.value)||0);fee.textContent='Phí treo bán: '+fmt(Math.max(rules.feeMin||5,Math.floor(s*(rules.feeRate||.02))))+' ◈ · Nhận về khi bán: giá cuối − '+Math.round((rules.taxRate||.05)*100)+'% thuế'+(ref?' · Giá tham khảo ~'+fmt(ref)+' ◈'+(material?'/cái':''):'');};start.oninput=update;update();
  const row=ui.node('div','auction-actions');info.append(row);
  ui.action(row,'Treo bán',()=>{const body={uid:item.uid,start:Math.floor(Number(start.value)),hours:chosen};const b=Math.floor(Number(buyout.value)||0);if(b)body.buyout=b;if(qty)body.qty=Math.floor(Number(qty.value));
   act('sell',body).then(ok=>{if(ok){state.sell=null;render();}});},state.busy);
  ui.action(row,'‹ Trở lại',()=>{state.sell=null;render();});}

 function bids(content,x){content.append(ui.node('p','auction-note','Các món bạn đang trả giá cao nhất. Khi bị vượt giá, Linh Thạch tự hoàn vào Hòm nhận.'));const list=ui.node('div','auction-list');content.append(list);
  if(!x.bidding?.length)list.append(ui.node('p','auction-empty','Bạn chưa dẫn đầu món nào.'));for(const lot of x.bidding||[])lotRow(lot,list);}
 function mail(content,x){content.append(ui.node('p','auction-note','Đồ mua được, Linh Thạch bán hàng, tiền hoàn khi bị vượt giá và đồ không bán được đều về đây.'));
  const list=ui.node('div','auction-list');content.append(list);
  if(!x.mail?.length){list.append(ui.node('p','auction-empty','Hòm nhận trống.'));return;}
  for(const m of x.mail){const row=ui.node('div','auction-row mail');row.append(m.lot?itemCell(m.lot):Object.assign(ui.node('span','auction-icon coin'),{textContent:'◈'}));const text=ui.node('div','auction-text');text.append(ui.node('b','',m.title));if(m.gold)text.append(ui.node('small','','+'+fmt(m.gold)+' Linh Thạch'));row.append(text);
   ui.action(row,'Nhận',()=>act('claim',{id:m.id}),state.busy);list.append(row);}
  const all=ui.node('div','auction-actions');content.append(all);ui.action(all,'Nhận tất cả ('+x.mail.length+')',()=>act('claim'),state.busy);}

 const update=up;up=function(dt){const r=update(dt);poll();return r;};
 const css=document.createElement('style');css.textContent=`
.auction-tabs button{position:relative}.auction-tabs .community-badge{position:absolute;top:-4px;right:-4px}
.auction-wallet{margin:6px 0;font:700 13px Arial;color:#ffd88a}
.auction-groups{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}.auction-groups button,.auction-durations button{padding:5px 10px;border-radius:999px;border:1px solid #8a7444aa;background:#1a2a2f;color:#e9dcc0;font-size:12px;min-height:30px}
.auction-groups button[aria-pressed=true],.auction-durations button[aria-pressed=true]{background:linear-gradient(90deg,#5a4012,#7a5a1c);border-color:#ffd27a;color:#fff3d6}
.auction-filters{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}.auction-filters select,.auction-filters input,.auction-field input,.auction-bid input{min-height:32px;padding:4px 8px;border-radius:8px;border:1px solid #6a7a6a;background:#0e1a1e;color:#f0e6cc;font-size:13px;min-width:0}
.auction-filters input{flex:1 1 160px}
.auction-list{display:grid;gap:6px}.auction-row{box-sizing:border-box;display:flex;align-items:center;gap:10px;width:100%;padding:6px 8px;border-radius:10px;border:1px solid #4a5a4a88;background:linear-gradient(90deg,#17262bf0,#121c20f0);color:inherit;text-align:left;min-height:56px}
.auction-row:hover{border-color:#c9a76a}.auction-row.leading{border-color:#7fd69a}.auction-row.mine{border-style:dashed}.auction-row.mail .visual-action{flex:0 0 auto;margin:0;width:auto}
.auction-icon{position:relative;flex:0 0 44px;height:44px;border-radius:8px;border:2px solid var(--rarity,#888);background:radial-gradient(circle,#2a3a40,#0e1618);display:grid;place-items:center}
.auction-icon img{max-width:38px;max-height:38px;object-fit:contain}.auction-icon b{position:absolute;top:-2px;right:2px;font:700 10px Arial;color:#ffd27a;text-shadow:0 1px 2px #000}
.auction-icon em{position:absolute;bottom:0;right:3px;font:700 10px Arial;font-style:normal;color:#fff;text-shadow:0 1px 2px #000}.auction-icon.coin{font:700 20px Arial;color:#ffd27a;--rarity:#b8925a}
.auction-text{flex:1;min-width:0;display:grid}.auction-text b{font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.auction-text small{font-size:11px;color:#b9c6be}
.auction-price{display:grid;text-align:right;flex:0 0 auto}.auction-price b{color:#ffd88a;font-size:13px}.auction-price small{font-size:10px;color:#9fb0a8}.auction-price .auction-buyout{color:#ffb67a}
.auction-empty{padding:16px;text-align:center;color:#9fb0a8}.auction-pager{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:8px}
.auction-detail{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px}.auction-info{display:grid;gap:8px;align-content:start}
.auction-actions{display:flex;flex-wrap:wrap;gap:6px}.auction-note{margin:0;font-size:12px;color:#c9d6cf;line-height:1.4}.auction-note.good{color:#9fe8b4}
.auction-field,.auction-bid{display:grid;gap:4px;font-size:12px;color:#d6c9a8}
.auction-bag{display:grid;grid-template-columns:repeat(auto-fill,52px);gap:6px;margin:8px 0}.auction-bag-cell{padding:2px;border:0;background:none;min-height:0}
.auction-heading{margin:12px 0 6px;color:#ffe3a8;font-size:14px}
.auction-durations{display:flex;gap:6px}
@media(max-width:640px){.auction-detail{grid-template-columns:1fr}.auction-price small{display:none}.auction-price .auction-buyout{display:block}}
#hud-more-menu #auction-button{display:none!important}`;document.head.append(css);

 let activity=null;const hud=window.vlHud;if(hud){const a={id:'auction',label:'Đấu giá',img:(()=>{const i=new Image();i.src=artworkURL('Map/sprites/market.png');return i;})(),run:()=>open()};
  const b=document.createElement('button');b.type='button';b.className='vl-activity';b.dataset.id=a.id;b.setAttribute('aria-label',a.label);const c=document.createElement('canvas');c.width=c.height=96;const badge=document.createElement('i');badge.hidden=true;
  b.append(c,badge,ui.node('span','',a.label));b.onclick=()=>{if(!paused())a.run();};Object.assign(a,{button:b,canvas:c,badgeEl:badge,badge:()=>mailCount()});hud.ACTIVITIES.push(a);$('vl-activities')?.append(b);activity=a;}
 window.auctionGame={state,open,refresh,mailCount};
})();
