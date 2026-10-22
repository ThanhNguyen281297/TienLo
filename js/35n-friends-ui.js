/* Hệ thống bạn bè — danh sách, gửi/chấp nhận/từ chối lời mời, xóa bạn, mở tương tác từ hồ sơ. */
(function(){
  const world=worldMap,d=world.dialog;
  let panelMode='list';
  const btn=document.createElement('button');btn.id='friends-button';btn.textContent='Bạn bè';btn.onclick=open;$('bt').append(btn);
  const badge=document.createElement('span');badge.id='friends-badge';badge.className='community-badge';badge.hidden=true;badge.textContent='0';btn.appendChild(badge);
  function open(){
    if(!P.ap||paused()||d.isOpen())return;
    panelMode='list';render();
  }
  function render(){
    d.show('Bạn bè','Danh sách người bạn đã kết bạn và các lời mời đang chờ.');
    const content=$('world-content');content.replaceChildren();
    const tabs=document.createElement('div');tabs.className='community-tabs';content.append(tabs);
    for(const [id,label]of [['list','Danh sách'],['requests','Lời mời'],['sent','Đã gửi']]){
      const b=document.createElement('button');b.type='button';b.textContent=label;b.setAttribute('aria-pressed',String(panelMode===id));b.onclick=()=>{panelMode=id;render();};tabs.append(b);
    }
    const list=document.createElement('div');list.className='friends-list';content.append(list);
    const data=window.communityGame?.state||{};
    if(panelMode==='list'){
      const friends=data.friends||[];
      if(!friends.length){list.textContent='Chưa có bạn bè. Hãy tìm kiếm và kết bạn người chơi khác.';return;}
      friends.forEach(f=>{
        const card=document.createElement('div');card.className='friend-card';list.append(card);
        const nm=document.createElement('div');nm.className='friend-name';nm.textContent=f.name;card.append(nm);
        const st=document.createElement('div');st.className='friend-status';st.textContent=(f.online?'Đang online ('+(f.sect||'')+')':'Ngắt kết nối');st.style.color=f.online?'#8fd8a0':'#8a97a3';card.append(st);
        const act=document.createElement('div');act.className='friend-actions';card.append(act);
        function btn2(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;act.append(b);return b;}
        btn2('Mời tổ đội',()=>{window.communityGame?.inviteById?.(f.id);msg('Đã mời '+f.name+' vào tổ đội.');});
        btn2('Thách đấu',()=>{window.duelGame?.challengeById?.(f.id);msg('Đã thách đấu '+f.name+'.');});
        btn2('Xóa bạn',()=>{d.show('Xóa bạn','Bạn chắc chắn muốn xóa '+f.name+' khỏi danh sách bạn bè?');d.action('Xóa',async()=>{try{await account.transact('/api/community',{action:'friend_remove',target:f.id,operationId:crypto.randomUUID()});d.close();msg('Đã xóa bạn bè.');}catch(e){d.line(e.message);}});d.action('Hủy',render);});
      });
    }else if(panelMode==='requests'){
      const reqs=data.friendRequests||[];
      if(!reqs.length){list.textContent='Không có lời mời kết bạn nào.';return;}
      reqs.forEach(r=>{
        const card=document.createElement('div');card.className='friend-card';list.append(card);
        const nm=document.createElement('div');nm.className='friend-name';nm.textContent=r.name;card.append(nm);
        const act=document.createElement('div');act.className='friend-actions';card.append(act);
        function btn2(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;act.append(b);return b;}
        btn2('Chấp nhận',async()=>{try{await account.transact('/api/community',{action:'friend_accept',id:r.id,operationId:crypto.randomUUID()});render();msg('Đã chấp nhận kết bạn.');}catch(e){d.line(e.message);}});
        btn2('Từ chối',async()=>{try{await account.transact('/api/community',{action:'friend_decline',id:r.id,operationId:crypto.randomUUID()});render();msg('Đã từ chối.');}catch(e){d.line(e.message);}});
      });
    }else{
      const reqs=data.sentFriendRequests||[];
      if(!reqs.length){list.textContent='Chưa gửi lời mời nào đang chờ.';return;}
      reqs.forEach(r=>{
        const card=document.createElement('div');card.className='friend-card';list.append(card);
        const nm=document.createElement('div');nm.className='friend-name';nm.textContent=r.name;card.append(nm);
        const st=document.createElement('div');st.className='friend-status';st.textContent='Đang chờ…';st.style.color='#cfb982';card.append(st);
        const act=document.createElement('div');act.className='friend-actions';card.append(act);
        function btn2(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;act.append(b);return b;}
        btn2('Hủy mời',async()=>{try{await account.transact('/api/community',{action:'friend_decline',id:r.id,operationId:crypto.randomUUID()});render();msg('Đã hủy lời mời.');}catch(e){d.line(e.message);}});
      });
    }
  }
  function updateBadge(){const data=window.communityGame?.state;const n=data?data.friendRequests?.length||0:0;badge.textContent=String(n);badge.hidden=n<=0;}
  window.friendsGame={open,render,updateBadge,addById:async(targetId)=>{try{await account.transact('/api/community',{action:'friend_add',target:targetId,operationId:crypto.randomUUID()});msg('Đã gửi lời mời kết bạn.');updateBadge();}catch(e){msg(e.message);}}};
  const origRefresh=window.communityGame?.refresh;if(origRefresh){const wrapped=async()=>{await origRefresh();updateBadge();};window.communityGame.refresh=wrapped;}
})();