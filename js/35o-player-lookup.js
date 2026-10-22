/* Tra cứu thông tin người chơi khác theo tên — hiển thị perfil công khai, mở tổ đội / thách đấu / kết bạn. */
(function(){
  const world=worldMap,d=world.dialog;
  const btn=document.createElement('button');btn.id='player-lookup-button';btn.textContent='Tra cứu người chơi';btn.onclick=open;$('bt').append(btn);
  const SECTS=['Kiếm Tông','Minh Nguyệt Tông','Lôi Thương Tông','Thiên Cơ Môn'];
  function open(){
    if(!P.ap||paused()||d.isOpen())return;
    d.show('Tra cứu đạo hữu','Nhập tên nhân vật để xem thông tin công khai. Từ kết quả có thể mời tổ đội, thách đấu hoặc kết bạn.');
    const content=$('world-content');
    const wrap=document.createElement('div');wrap.className='player-lookup-wrap';content.append(wrap);
    const row=document.createElement('div');row.className='lookup-row';wrap.append(row);
    const input=document.createElement('input');input.type='text';input.placeholder='Nhập tên nhân vật…';input.maxLength=24;row.append(input);
    const search=document.createElement('button');search.type='button';search.textContent='Tìm';row.append(search);
    const result=document.createElement('div');result.className='lookup-result';wrap.append(result);
    async function doSearch(){
      const q=input.value.trim();if(q.length<2){result.textContent='Nhập ít nhất 2 ký tự.';return;}
      try{const res=await fetch('/api/player/lookup?name='+encodeURIComponent(q));const data=await res.json();renderResults(data);}catch(e){result.textContent='Không tra cứu được.';}
    }
    search.onclick=doSearch;input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();doSearch();}};
    function renderResults(list){
      result.replaceChildren();if(!list.length){result.textContent='Không tìm thấy người chơi nào.';return;}
      list.forEach(p=>{
        const card=document.createElement('div');card.className='player-card';result.append(card);
        const name=document.createElement('div');name.className='player-name';name.textContent=p.name;name.style.color=SECTS.indexOf(p.sect)>=0?'#f0d9a5':'#cddce7';card.append(name);
        const meta=document.createElement('div');meta.className='player-meta';meta.textContent=p.sect+' · Cảnh '+p.realm+' Tầng '+(p.stage||1)+(p.online?' · ONLINE':'');card.append(meta);
        const actions=document.createElement('div');actions.className='player-actions';card.append(actions);
        function act(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;actions.append(b);return b;}
        act('Mời tổ đội',()=>{window.communityGame?.inviteById?.(p.id);d.close();msg('Đã gửi mời tổ đội đến '+p.name+'.');});
        act('Thách đấu',()=>{window.duelGame?.challengeById?.(p.id);d.close();msg('Đã gửi thách đấu đến '+p.name+'.');});
        act('Kết bạn',()=>{window.friendsGame?.addById?.(p.id);d.close();msg('Đã gửi lời mời kết bạn đến '+p.name+'.');});
      });
    }
  }
  window.playerLookup={open};
})();