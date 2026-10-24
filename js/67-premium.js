/* Kỳ Trân Các (premium shop, paid in Linh Quang) and Nạp Linh Quang (bank QR top-up).
   1.000 VND = 1 Linh Quang. A top-up request carries a transfer code; Linh Quang is
   credited by the server only after a GM confirms the bank transfer. */
(function(){
 const ui=visualUI,d=worldMap.dialog,TITLE='Kỳ Trân Các';
 const state={data:null,busy:false,tab:'shop',request:null};
 const fmt=n=>Number(n||0).toLocaleString('vi-VN');
 const STATUS={pending:'Chờ chuyển khoản',submitted:'Chờ GM xác nhận',approved:'Đã cộng',rejected:'Bị từ chối',cancelled:'Đã hủy'};
 const USABLE=new Set(['song-boi-phu','be-quan-lenh','ruong-manh','thu-hon-bao','tui-linh-thach','linh-nguyen-dan']);
 async function load(){try{state.data=await account.api('/api/premium');paintBuff();}catch(e){if(e.status!==401)msg(e.message);}}
 async function act(action,extra={}){if(state.busy)return null;state.busy=true;render();
  try{const r=await account.transact('/api/premium',{action,opId:crypto.randomUUID(),...extra},{live:true,gold:true,world:['essence']});state.data=r.premium;paintBuff();if(r.message)msg(r.message);return r;}
  catch(e){msg(e.message);return null;}finally{state.busy=false;render();}}
 async function open(tab){if(!P.ap||paused())return;if(tab)state.tab=tab;d.show(TITLE,'');$('world-content').closest('section')?.classList.add('visual-dialog','premium-dialog');render();await load();render();}
 function tabs(root){const nav=ui.node('nav','premium-tabs');root.append(nav);
  for(const [id,label] of [['shop','Cửa hàng'],['topup','Nạp Linh Quang'],['shards','Mảnh trang bị'],...(account.state.user?.gm?[['gm','GM · Duyệt nạp']]:[])]){const b=ui.action(nav,label,()=>{state.tab=id;render();if(id==='shards')shardsGame?.load().then(render);});b.setAttribute('aria-pressed',String(state.tab===id));}}
 function header(root){const data=state.data,bar=ui.node('div','premium-wallet');root.append(bar);
  bar.append(ui.node('b','premium-lq','✦ '+fmt(data.wallet.lq)+' Linh Quang'));
  if(data.expUntil)bar.append(ui.node('span','premium-buff','x2 EXP còn '+Math.ceil((data.expUntil-data.now)/60)+' phút'));
  ui.action(bar,'＋ Nạp',()=>{state.tab='topup';render();});}
 function render(){const root=$('world-content');if(!root||$('world-title').textContent!==TITLE)return;root.replaceChildren();
  if(!state.data){root.append(ui.node('p','world-line','Đang mở Kỳ Trân Các…'));return;}
  header(root);tabs(root);({shop,topup,shards,gm}[state.tab]||shop)(root);}

 // ---------- shop
 function shop(root){const data=state.data;
  if(data.card){const c=ui.node('div','premium-card-row');root.append(c);c.append(ui.node('span','','Nguyệt Tạp còn '+Math.ceil((data.card.until-data.now)/86400)+' ngày'));ui.action(c,data.card.claimable?'Nhận hôm nay · 8 ✦ + 10.000 ◈':'Đã nhận hôm nay',()=>act('card_claim'),!data.card.claimable||state.busy);}
  const grid=ui.node('div','premium-grid');root.append(grid);
  for(const s of data.shop){const card=ui.node('article','premium-item');grid.append(card);if(s.tag)card.append(ui.node('span','premium-tag',s.tag));
   card.append(ui.art(s.icon,'premium-icon'),ui.node('b','',s.name),ui.node('p','',s.desc));
   const left=s.limit?s.limit-s.bought:null;if(s.limit)card.append(ui.node('small','','Hôm nay còn '+left+'/'+s.limit));
   ui.action(card,'✦ '+s.price,async()=>{if(!window.confirm('Mua '+s.name+' với '+s.price+' Linh Quang?'))return;await act('buy',{id:s.id,qty:1});},state.busy||data.wallet.lq<s.price||left===0);}
  root.append(ui.node('p','premium-note','Vật phẩm mua sẽ vào túi đồ (khế ước, không bán / giao dịch). Mở túi đồ và chọn "Sử dụng". Phù Cường Hóa dùng ở lò rèn; Khóa Tẩy Luyện dùng khi khóa dòng thứ hai trở đi.'));}

 // ---------- top-up
 function topup(root){const data=state.data,req=state.request||data.requests.find(r=>r.status==='pending'||r.status==='submitted');
  root.append(ui.node('p','premium-note','Tỷ lệ: 1.000 VND = 1 Linh Quang. Chọn gói, chuyển khoản qua mã QR với đúng nội dung, rồi bấm "Tôi đã chuyển khoản". Linh Quang được cộng khi GM xác nhận giao dịch.'+(data.firstGift?' Lần nạp đầu tặng thêm 2 Song Bội Phù, 2 Phù Cường Hóa và 1 Rương Mảnh.':'')));
  if(req&&(req.status==='pending'||req.status==='submitted')){const box=ui.node('div','topup-box');root.append(box);
   const qr=ui.node('img','topup-qr');qr.src=artworkURL(data.bank.qr);qr.alt='Mã QR chuyển khoản '+data.bank.bank;box.append(qr);
   const info=ui.node('div','topup-info');box.append(info);
   info.append(ui.node('small','','Ngân hàng'),ui.node('b','',data.bank.bank),ui.node('small','','Số tiền'),ui.node('b','topup-amount',fmt(req.vnd)+' VND → '+fmt(req.lq)+' ✦'),ui.node('small','','Nội dung chuyển khoản (bắt buộc)'));
   const code=ui.node('div','topup-code');code.append(ui.node('b','','TIENLO '+req.code));const copy=ui.action(code,'Sao chép',()=>{navigator.clipboard?.writeText('TIENLO '+req.code).then(()=>msg('Đã sao chép nội dung.'),()=>msg('TIENLO '+req.code));});copy.classList.add('small');info.append(code);
   info.append(ui.node('p','',req.status==='submitted'?'Đã báo chuyển khoản · đang chờ GM xác nhận. Bạn sẽ nhận thư khi được cộng.':'Quét mã bằng app ngân hàng, nhập đúng số tiền và nội dung ở trên.'));
   const row=ui.node('div','topup-actions');info.append(row);
   if(req.status==='pending')ui.action(row,'Tôi đã chuyển khoản',async()=>{const r=await act('topup_submit',{id:req.id});if(r)state.request=null;},state.busy);
   ui.action(row,'Hủy yêu cầu',async()=>{if(await act('topup_cancel',{id:req.id}))state.request=null;},state.busy);}
  else{const grid=ui.node('div','topup-packages');root.append(grid);
   for(const vnd of data.packages){const b=ui.action(grid,fmt(vnd/1000)+' ✦',()=>create(vnd),state.busy);b.append(ui.node('small','',fmt(vnd)+' VND'));}
   const custom=ui.node('form','topup-custom');root.append(custom);const input=ui.node('input');input.type='number';input.min=data.min;input.step=1000;input.placeholder='Số tiền khác (VND)';input.inputMode='numeric';input.setAttribute('aria-label','Số tiền nạp');
   const go=ui.node('button','visual-action','Tạo mã nạp');go.type='submit';custom.append(input,go);custom.onsubmit=e=>{e.preventDefault();const v=Math.floor(Number(input.value)/1000)*1000;if(!(v>=data.min))return msg('Tối thiểu '+fmt(data.min)+' VND.');create(v);};}
  if(data.requests.length){root.append(ui.node('h4','','Lịch sử nạp'));const list=ui.node('div','topup-history');root.append(list);
   for(const r of data.requests){const row=ui.node('div','topup-row '+r.status);row.append(ui.node('b','',r.code),ui.node('span','',fmt(r.vnd)+' VND · '+fmt(r.lq)+' ✦'),ui.node('small','',STATUS[r.status]||r.status));list.append(row);}}}
 async function create(vnd){const r=await act('topup_create',{vnd});if(r)state.request=r.premium.requests.find(x=>x.status==='pending')||null;render();}

 // ---------- shards summary
 function shards(root){const s=window.shardsGame?.state.data;
  root.append(ui.node('p','premium-note','Mảnh rơi từ thủ lĩnh bí cảnh, tinh anh, rương Ma Quật, nhiệm vụ hằng ngày, Rương Mảnh Thần Binh. Đổi lấy pháp bảo, pháp trận, hộ thuẫn, thú cưỡi, bước chân, mặt nạ, nhẫn tại Trưởng môn các phái.'));
  if(s){const grid=ui.node('div','shard-wallet');root.append(grid);for(const [k,m] of Object.entries(s.kinds)){const c=ui.node('div','shard-chip');c.append(ui.art(m.icon,'shard-icon'),ui.node('b','',fmt(s.wallet[k])),ui.node('small','',m.name));grid.append(c);}}
  ui.action(root,'➤ Tới Trưởng môn đổi mảnh',()=>{d.close();shardsGame?.goMaster();});}

 // ---------- GM approvals
 function gm(root){const list=state.data.pending||[];root.append(ui.node('p','premium-note','Đối chiếu sao kê ngân hàng: số tiền và nội dung "TIENLO <mã>" phải khớp trước khi duyệt.'));
  if(!list.length){root.append(ui.node('p','world-line','Không có yêu cầu chờ duyệt.'));return;}
  for(const r of list){const row=ui.node('article','gm-topup '+r.status);root.append(row);
   row.append(ui.node('b','','TIENLO '+r.code),ui.node('span','',r.name+' · '+fmt(r.vnd)+' VND → '+fmt(r.lq)+' ✦'),ui.node('small','',STATUS[r.status]+' · '+new Date(r.created*1000).toLocaleString('vi-VN')));
   ui.action(row,'Duyệt',()=>act('gm_approve',{id:r.id}),state.busy);ui.action(row,'Từ chối',()=>act('gm_reject',{id:r.id}),state.busy);}}

 // ---------- using items from the bag
 const usable=item=>USABLE.has(item?.id);
 async function use(uid){d.close();const r=await act('use',{uid});if(r)setTimeout(()=>inventory.openBag(),50);}

 // ---------- x2 EXP indicator next to the player frame
 const buff=document.createElement('div');buff.id='exp-buff';buff.hidden=true;document.body.append(buff);
 function paintBuff(){const until=state.data?.expUntil||0,left=until-(Date.now()/1000);buff.hidden=!(left>0)||!P.ap;if(left>0)buff.textContent='x2 EXP · '+Math.ceil(left/60)+'′';}
 setInterval(paintBuff,20000);
 window.addActivity?.({id:'kytran',label:'Kỳ Trân',src:'Item/KyTran/ruong-manh.png',run:()=>open('shop'),badge:()=>state.data?.card?.claimable?1:0});
 addEventListener('tienlo-auth',()=>{state.data=null;setTimeout(load,2000);});setTimeout(load,3500);
 const css=document.createElement('style');css.textContent=`
.premium-wallet{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 8px}.premium-lq{font-size:16px;color:#ffe08a;text-shadow:0 0 8px #ffb84a66}
.premium-buff{font-size:12px;padding:3px 8px;border-radius:9px;background:#3a5a2acc;color:#d8ffb8}
.premium-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:4px 0 10px}.premium-tabs button[aria-pressed=true]{border-color:#e7c77e;background:#3c3a29}
.premium-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px}
.premium-item{position:relative;display:grid;justify-items:center;gap:4px;padding:10px;border-radius:12px;border:1px solid #b8925077;background:linear-gradient(160deg,#22303a,#131c22);text-align:center}
.premium-item b{font-size:13px;color:#ffe3a8}.premium-item p{margin:0;font-size:11px;color:#c9d6cf;line-height:1.35;flex:1}.premium-item small{font-size:10px;color:#9fb7b0}
.premium-item .visual-action{width:100%;font-weight:700;color:#ffe08a}.premium-icon{width:64px;height:64px;object-fit:contain}
.premium-tag{position:absolute;top:6px;right:6px;font:700 10px Arial;padding:2px 6px;border-radius:8px;background:#b4372e;color:#fff2d0}
.premium-note{font-size:12px;color:#c9d6cf;line-height:1.45;margin:8px 0}
.premium-card-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;margin-bottom:8px;border-radius:10px;border:1px solid #ffd27a88;background:#2e2a18}
.topup-packages{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px}.topup-packages .visual-action{display:grid;gap:2px;font-size:16px;color:#ffe08a}.topup-packages small{font-size:11px;color:#c9d6cf}
.topup-custom{display:flex;gap:8px;margin-top:10px}.topup-custom input{flex:1;min-width:0;padding:10px;border-radius:8px;border:1px solid #607c80;background:#102731;color:#e8efe0;font-size:15px}
.topup-box{display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start;padding:12px;border-radius:12px;border:1px solid #ffd27a88;background:#14232a}
.topup-qr{width:min(260px,100%);border-radius:12px;background:#fff}.topup-info{display:grid;gap:3px;flex:1;min-width:220px}.topup-info small{font-size:11px;color:#9fb7b0;margin-top:4px}
.topup-info b{color:#ffe3a8;font-size:15px}.topup-amount{font-size:18px!important;color:#ffe08a!important}.topup-code{display:flex;align-items:center;gap:8px;padding:8px;border-radius:8px;background:#0b1820;border:1px dashed #ffd27a}
.topup-code b{font:700 17px monospace;letter-spacing:.06em;color:#9ff0c8!important}.topup-info p{font-size:12px;color:#c9d6cf;margin:6px 0}.topup-actions{display:flex;gap:8px;flex-wrap:wrap}
.topup-history{display:grid;gap:4px}.topup-row{display:grid;grid-template-columns:auto 1fr auto;gap:8px;font-size:12px;padding:6px 8px;border-radius:8px;background:#14232a;color:#c9d6cf}.topup-row.approved small{color:#8fe0a5}.topup-row.rejected small{color:#ff9c8e}
.gm-topup{display:grid;grid-template-columns:1fr auto auto;gap:4px 8px;align-items:center;padding:8px;margin:6px 0;border-radius:10px;background:#14232a;border:1px solid #607c80}.gm-topup>b,.gm-topup>span,.gm-topup>small{grid-column:1}.gm-topup.submitted{border-color:#ffd27a}
#exp-buff{position:fixed;left:16px;top:132px;z-index:5;padding:3px 9px;border-radius:9px;background:#2f5a24e6;border:1px solid #b8f08a;color:#e8ffd0;font:700 11px Arial;pointer-events:none}#exp-buff[hidden]{display:none}
@media(max-width:700px){#exp-buff{top:112px;left:8px}}`;document.head.append(css);
 window.premiumGame={state,open,load,use,usable};
})();
