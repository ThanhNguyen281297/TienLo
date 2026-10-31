/* Mảnh trang bị: typed shards (server wallet) and the exchange at every sect master
   (Trưởng môn). Kill drops arrive with the server kill event and show a toast. */
(function(){
 const ui=visualUI,d=worldMap.dialog,TITLE='Trưởng môn · Đổi mảnh';
 const state={data:null,busy:false,tab:'phapbao'};
 const RARITY={pham:'#d4cbb6',huyen:'#70df9c',linh:'#6fc8ff',tien:'#cf9cff',than:'#ffcc70'};
 const fmt=n=>Number(n||0).toLocaleString('vi-VN');
 async function load(){try{state.data=await account.api('/api/shards');}catch(e){msg(e.message);}}
 function kindName(k){return state.data?.kinds?.[k]?.name||k;}
 function onDrop(got){const parts=Object.entries(got||{}).map(([k,q])=>'+'+q+' '+(state.data?.kinds?.[k]?.name||({phapbao:'Mảnh Pháp Bảo',phaptran:'Mảnh Pháp Trận',hothuan:'Mảnh Hộ Thuẫn',buocchan:'Mảnh Bước Chân',matna:'Mảnh Mặt Nạ',nhan:'Mảnh Nhẫn',thanbinh:'Mảnh Thần Binh',thuhon:'Thú Hồn'})[k]||k));
  if(!parts.length)return;msg('✦ '+parts.join(' · '));try{fx(P.x,P.y-60,parts[0],'#ffd27a');}catch{}window.gameAudio?.play?.('pickup');if(state.data)for(const [k,q] of Object.entries(got))state.data.wallet[k]=(state.data.wallet[k]||0)+q;}
 async function exchange(id){if(state.busy)return;state.busy=true;render();try{const r=await account.transact('/api/shards',{action:'exchange',id,opId:crypto.randomUUID()},{live:true,world:['equip','mounts']});state.data=r.shards;msg(r.message||'Đã đổi.');window.skillImpact?.flash?.('#ffd27a');window.gameAudio?.play?.('reward');}
  catch(e){msg(e.message);}finally{state.busy=false;render();}}
 async function open(){if(!P.ap)return;d.show(TITLE,'Mỗi hoạt động cho một loại mảnh riêng: chiến trường → Hộ Thuẫn, bí cảnh → Bước Chân, bí cảnh tổ đội → Pháp Bảo, tháp → Pháp Trận, nhiệm vụ → Mặt Nạ, tông môn chiến → Nhẫn, bãi săn → Thú Hồn, boss thế giới → Thần Binh. Đổi tại Trưởng môn bất kỳ tông môn nào.');
  $('world-content').closest('section')?.classList.add('visual-dialog');render();await load();render();}
 function render(){const root=$('world-content');if(!root||$('world-title').textContent!==TITLE)return;root.replaceChildren();const data=state.data;
  if(!data){root.append(ui.node('p','world-line','Trưởng môn đang kiểm kê…'));return;}
  const wallet=ui.node('div','shard-wallet');root.append(wallet);
  for(const [k,meta] of Object.entries(data.kinds)){const b=ui.node('button','shard-chip'+(state.tab===k?' on':''));b.type='button';b.append(ui.art(meta.icon,'shard-icon'),ui.node('b','',fmt(data.wallet[k])),ui.node('small','',meta.name));b.onclick=()=>{state.tab=k;render();};wallet.append(b);}
  const src=data.kinds[state.tab]?.source;if(src){const line=ui.node('p','shard-source');line.append(ui.node('b','','Nguồn '+kindName(state.tab)+': '),document.createTextNode(src));root.append(line);}
  const grid=ui.node('div','shard-grid');root.append(grid);
  const offers=data.offers.filter(o=>o.kind===state.tab).sort((a,b)=>a.cost-b.cost);
  for(const o of offers){const item=equipmentData.byId.get(o.id)||o;const card=ui.node('article','shard-offer');card.style.setProperty('--q',RARITY[o.rarity]||'#ddd');grid.append(card);
   const img=ui.node('img','shard-offer-art');img.src=inventory.itemIcon(item,o.slot);img.alt='';card.append(img);
   const body=ui.node('div','shard-offer-body');card.append(body);body.append(ui.node('b','',o.name),ui.node('small','',o.cost+' '+kindName(o.kind)+(o.req?' · cấp '+o.req:'')));
   const can=(data.wallet[o.kind]||0)>=o.cost&&!o.owned;ui.action(body,o.owned?'Đã sở hữu':'Đổi',()=>exchange(o.id),!can||state.busy);
   card.onclick=e=>{if(e.target.tagName!=='BUTTON')window.itemCards?.open?.({...item,uid:'preview'});};}
  if(!offers.length)grid.append(ui.node('p','world-line','Chưa có vật phẩm.'));
 }
 // The sect master offers both the story quests and the shard exchange.
 const service=worldMap.handleService;worldMap.handleService=function(id){
  if(id==='mentor'){d.show('Trưởng môn','Muốn đổi mảnh hay nhận nhiệm vụ?');$('world-content').closest('section')?.classList.add('visual-dialog');
   const root=$('world-content');ui.action(root,'✦ Đổi mảnh trang bị',open);ui.action(root,'◆ Nhiệm vụ',()=>window.adventureGame?.open('main'));return true;}
  return service(id);};
 // Go to the player's own sect master (used by Kỳ Trân Các).
 function goMaster(){const map=worldMap.sectMapFor?.(P.ap.w)||'sword';window.questNav?.go({map,npc:'mentor'},'Gặp Trưởng môn');}
 const css=document.createElement('style');css.textContent=`
.shard-wallet{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:6px;margin:6px 0 10px}
.shard-chip{display:grid;justify-items:center;gap:1px;padding:6px 4px;border-radius:10px;border:1px solid #b8925066;background:#14232a;color:#f3e3b4;cursor:pointer;min-height:0!important}
.shard-chip.on{border-color:#ffd27a;box-shadow:0 0 0 1px #ffd27a55;background:#2a2a1c}.shard-chip b{font-size:14px}.shard-chip small{font-size:10px;color:#c9d6cf;text-align:center}
.shard-icon{width:34px;height:34px;object-fit:contain}
.shard-source{margin:0 0 10px;padding:7px 10px;border-radius:8px;background:#2a2a1c;border:1px solid #ffd27a44;color:#e9dcb4;font-size:12px}.shard-source b{color:#ffd27a}
.shard-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px}
.shard-offer{display:flex;gap:8px;align-items:center;padding:8px;border-radius:10px;border:1px solid color-mix(in srgb,var(--q) 45%,transparent);background:linear-gradient(160deg,#1b2b30f0,#121c20f0)}
.shard-offer-art{width:52px;height:52px;object-fit:contain;flex:none;filter:drop-shadow(0 0 6px color-mix(in srgb,var(--q) 50%,transparent))}
.shard-offer-body{display:grid;gap:3px;min-width:0}.shard-offer-body b{font-size:13px;color:var(--q)}.shard-offer-body small{font-size:11px;color:#c9d6cf}.shard-offer-body .visual-action{font-size:12px;min-height:30px}`;document.head.append(css);
 window.shardsGame={state,open,load,onDrop,goMaster};
})();
