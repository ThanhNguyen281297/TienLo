/* Giao dịch giữa người chơi — gửi/nhận/lệnh mua bán vật phẩm ở vùng an toàn. */
(function(){
  const world=worldMap,d=world.dialog;
  const btn=document.createElement('button');btn.id='trade-button';btn.textContent='Giao dịch';btn.onclick=open;$('bt').append(btn);
  const badge=document.createElement('span');badge.id='trade-badge';badge.className='community-badge';badge.hidden=true;badge.textContent='0';btn.appendChild(badge);
  function open(){
    if(!P.ap||paused()||d.isOpen())return;render();
  }
  async function load(){try{const res=await fetch('/api/trade');return await res.json();}catch(e){return {trade:{sent:[],received:[]}};}}
  function render(){
    d.show('Giao dịch','Trao đổi vật phẩm với người chơi khác tại vùng an toàn. Cả hai bên phải đồng ý.');
    const content=$('world-content');content.replaceChildren();
    const tabs=document.createElement('div');tabs.className='community-tabs';content.append(tabs);
    for(const [id,label]of [['sent','Đã gửi'],['received','Đã nhận']]){
      const b=document.createElement('button');b.type='button';b.textContent=label;b.setAttribute('aria-pressed',String(panelMode===id));b.onclick=()=>{panelMode=id;render();};tabs.append(b);
    }
    const list=document.createElement('div');list.className='trade-list';content.append(list);
    load().then(data=>renderOffers(data.trade||{sent:[],received:[]},list));
  }
  let panelMode='sent';
  function renderOffers(trade,list){
    list.replaceChildren();
    const offers=panelMode==='sent'?trade.sent:trade.received;
    if(!offers.length){list.textContent=panelMode==='sent'?'Chưa có lệnh giao dịch nào đang gửi.':'Không có lời mời giao dịch nào.';return;}
    offers.forEach(o=>{
      const card=document.createElement('div');card.className='trade-card';list.append(card);
      const info=document.createElement('div');info.className='trade-info';card.append(info);
      const nm=document.createElement('div');nm.className='trade-name';nm.textContent=(panelMode==='sent'?'Đến: ':'Từ: ')+o.name||'Người chơi';info.append(nm);
      const status=document.createElement('div');status.className='trade-status';status.textContent=o.status;status.style.color=o.status==='pending'?'#cfb982':(o.status==='accepted'?'#8fd8a0':'#e08278');info.append(status);
      const fromItems=document.createElement('div');fromItems.className='trade-items';fromItems.textContent='Bạn đưa: '+(o.items_from&&o.items_from.length?o.items_from.length+' món':'trống');card.append(fromItems);
      const toItems=document.createElement('div');toItems.className='trade-items';toItems.textContent='Nhận lại: '+(o.items_to&&o.items_to.length?o.items_to.length+' món':'trống');card.append(toItems);
      const act=document.createElement('div');act.className='trade-actions';card.append(act);
      function tbtn(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;act.append(b);return b;}
      if(panelMode==='received'&&o.status==='pending'){
        tbtn('Chấp nhận',async()=>{const sel=selectItemsForTrade();if(!sel)return;try{await account.transact('/api/trade',{action:'trade_accept',id:o.id,items_to:sel,operationId:crypto.randomUUID()});render();msg('Giao dịch thành công.');}catch(e){d.line(e.message);}});
        tbtn('Từ chối',async()=>{try{await account.transact('/api/trade',{action:'trade_reject',id:o.id,operationId:crypto.randomUUID()});render();msg('Đã từ chối.');}catch(e){d.line(e.message);}});
      }else if(panelMode==='sent'&&o.status==='pending'){
        tbtn('Hủy',async()=>{try{await account.transact('/api/trade',{action:'trade_cancel',id:o.id,operationId:crypto.randomUUID()});render();msg('Đã hủy.');}catch(e){d.line(e.message);}});
      }
    });
  }
  function selectItemsForTrade(){return [];}
  window.tradeGame={open,render,updateBadge:()=>{}};
})();