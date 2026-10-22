/* Đồng bộ 5 Hz: người chơi, chat, biểu cảm, quái chung và sự kiện thưởng. */
(function(){
  const stream=crypto.randomUUID?.()||('page-'+Date.now()+'-'+Math.random());
  const state={players:[],fields:[],connected:false,shared:false,hits:[],acks:[],seenRewards:new Set(),emote:null};
  let busy=false,retry=null,serial=0,lastMap=null,retryAt=0;
  const localHit=hit;
  hit=function(enemy,power){
    if(enemy.network){
      if(enemy.dead||enemy.hp<=0)return;
      const basic=!!(window.basicCombat?.state.dealing&&window.basicEffects?.available(P.ap?.w));
      if(state.hits.length<32)state.hits.push({id:enemy.id,basic,power:power*(enemy.boss||enemy.elite||enemy.t===2?1+(bonusStats().bossDamage||0):1)});
      if(!basic)spark(enemy.x,enemy.y-20,characterClasses[P.ap.w].color,5);
      return;
    }
    return localHit(enemy,power);
  };
  const chat=document.createElement('section');chat.id='online-panel';chat.innerHTML='<header><span id="online-status">Đang kết nối</span><button id="chat-toggle" type="button" aria-expanded="true">Chat</button></header><div id="chat-messages" role="log" aria-live="polite"></div><form id="chat-form"><input id="chat-input" maxlength="160" autocomplete="off" placeholder="Trò chuyện cùng đạo hữu…" aria-label="Tin nhắn"><button type="submit">Gửi</button></form><div class="emote-buttons"><button data-emote="wave" title="Chào đạo hữu">Chào</button><button data-emote="heart" title="Gửi trái tim">♥</button><button data-emote="ready" title="Sẵn sàng luyện công">Sẵn sàng</button></div>';document.body.append(chat);chat.hidden=true;
  $('chat-toggle').onclick=()=>{chat.classList.toggle('collapsed');$('chat-toggle').setAttribute('aria-expanded',String(!chat.classList.contains('collapsed')));};
  for(const button of chat.querySelectorAll('[data-emote]'))button.onclick=()=>{state.emote=button.dataset.emote;};
  $('chat-form').onsubmit=async event=>{event.preventDefault();const input=$('chat-input'),text=input.value.trim();if(!text)return;try{await account.api('/api/chat',{text,channel:$('chat-channel')?.value||'world'});input.value='';}catch(e){msg(e.message);}};
  $('chat-input').addEventListener('focus',()=>{K={};ptr=null;});
  let chatKey='';
  function showChat(messages){const key=messages.map(m=>m.id).join();if(chatKey===key)return;chatKey=key;const log=$('chat-messages');log.replaceChildren();for(const message of messages.slice(-25)){const p=document.createElement('p'),name=document.createElement('b');name.textContent=(message.channel==='party'?'[Đội] ':message.channel==='guild'?'[Tông] ':'')+message.name+': ';p.append(name,document.createTextNode(message.text));log.append(p);}log.scrollTop=log.scrollHeight;}
  async function frame(){
    if(busy||!account.state.ready||account.state.restoring||!P.ap||window.expeditionsGame?.assetsPending()||performance.now()<retryAt)return;
    busy=true;const scene=worldMap.state.scene;
    if(lastMap!==scene){state.hits=[];state.players=[];state.fields=[];state.shared=false;retry=null;lastMap=scene;}
    const batch=retry||{stream,batch:String(++serial)+'-'+Date.now(),map:scene,x:P.x,y:P.y,airborne:0,dir:P.dir,f:P.f,med:!!P.med,cast:state.cast,hp:P.hp,duelAttacks:(state.duelAttacks||[]).splice(0,8),ackBoss:window.communityGame?.bossAcks||[],field:window.fieldEffects?.descriptor()??null,petCast:state.petCast??null,paused:paused()||worldMap.dialog.isOpen(),hits:state.hits.splice(0,32),ack:state.acks.slice(-100),emote:state.emote};state.emote=null;state.cast=null;state.petCast=null;retry=batch;
    try{
      const data=await account.api('/api/world',{...batch,ackSustain:P.world.sustainIds||[]});retry=null;state.connected=true;chat.hidden=false;
      if(scene!==worldMap.state.scene||account.state.restoring)return;
      if(Math.hypot(data.x-batch.x,data.y-batch.y)>1){P.x=data.x;P.y=data.y;}
      state.players=data.players.map(peer=>{const old=state.players.find(p=>p.id===peer.id);return {...peer,drawX:old?.drawX??peer.x,drawY:old?.drawY??peer.y,drawLift:old?.drawLift??peer.airborne??0};});
      for(const peer of data.players){if(peer.cast&&peer.cast.id!==state.remoteCasts?.get(peer.id)){state.remoteCasts??=new Map();state.remoteCasts.set(peer.id,peer.cast.id);const color=characterClasses[peer.ap.w].color;window.combatVisuals?.pulse(peer.cast.x,peer.cast.y,peer.cast.index===3?145:peer.cast.index===2?100:45,color,.65);spark(peer.x,peer.y-25,color,8);}}
      equipmentSystem.receive(data.shield);
      window.duelArena?.receive(data.duel);window.expeditionsGame?.updatePending(data.pendingDrops);
      window.adventureGame?.receiveWallet(data.adventureWallet);
      const sustainIds=P.world.sustainIds??=[];for(const event of data.sustain||[]){if(!sustainIds.includes(event.id)){equipmentSystem.sustain(event.amount);sustainIds.push(event.id);if(sustainIds.length>100)sustainIds.shift();}}
      state.shared=data.shared;state.fields=data.fields||[];window.communityGame?.receive(data);
      if(data.shared){
        const ownBasicHits=new Set((batch.hits||[]).filter(h=>h.basic).map(h=>h.id));
        const ownHits=new Set();for(const hit of data.combatHits||[]){damageNumber(hit.x,hit.y-48,hit.amount,hit.critical);ownHits.add(hit.id);}
        const previous=new Map(E.filter(e=>e.network).map(e=>[e.id,e]));
        for(const reward of data.rewards){
          const claimed=P.world.networkRewardIds??=[];
          if(state.seenRewards.has(reward.eventId)||claimed.includes(reward.eventId)){if(!state.acks.includes(reward.eventId))state.acks.push(reward.eventId);continue;}
          state.seenRewards.add(reward.eventId);claimed.push(reward.eventId);if(claimed.length>100)claimed.shift();
          // Replay each server-issued death once through existing quest/loot hooks.
          const e={...reward,hp:1,dead:0,network:false,rewardReplay:true},existingPopups=new Set(X);localHit(e,1);
          // Reward replay is bookkeeping, not a real one-point attack popup.
          X=X.filter(popup=>existingPopups.has(popup)||popup.t!==1);
          account.flush().then(ok=>{if(ok)state.acks.push(reward.eventId);});
        }
        if(state.acks.length>100)state.acks.splice(0,state.acks.length-100);
        E=data.mobs.map(snapshot=>{const e=previous.get(snapshot.id);if(e){const damage=e.hp-snapshot.hp;window.creatureArt?.onNetworkMove(e,Math.hypot(e.x-snapshot.x,e.y-snapshot.y)>.1);if(snapshot.attackSerial!==e.attackSerial&&snapshot.attackSerial)window.creatureArt?.onAttack(e);if(damage>0&&e.hp>0){if(!ownHits.has(snapshot.id))damageNumber(snapshot.x,snapshot.y-48,damage,false);window.creatureArt?.onNetworkDamage(e,snapshot.hp<=0);if(!ownBasicHits.has(snapshot.id))window.worldVFX?.confirmedHit(e,damage,snapshot.hp<=0);}Object.assign(e,snapshot);return e;}return snapshot;});
        if(data.damage&&!worldMap.isSafe(P)){
          const bonus=bonusStats();if(window.combatDefense?.evading()||classCombat.isDashing()||Math.random()<Math.min(.2,bonus.dodge||0)){window.combatDefense?.dodge();}else{const amount=Math.max(1,Math.round((data.damage-(window.totalArmor?totalArmor(bonus):(P.world?.armor||0)+(bonus.armor||0)))*(window.newClassCombat?.damageTaken()||1)*(window.equipmentSystem?.damageTaken()||1)));P.hp=Math.max(0,P.hp-amount);P.med=0;fx(P.x,P.y-30,'-'+amount,'#ff788e');}
        }
      }
      if(P.hp<=0&&!data.duel){worldMap.dialog.close();classCombat.onRespawn();worldMap.respawn();P.hp=mhp();P.gold=Math.floor(P.gold*.9);P.med=0;saveCharacter();msg('Trọng thương! Trở về đài an toàn, mất 10% Linh Thạch.');}
      showChat(data.chat);$('online-status').textContent='● Online · '+data.online+' đạo hữu'+(data.shared?' · quái chung':'');
    }catch(e){state.connected=false;$('online-status').textContent='● Mất kết nối · đang thử lại';retryAt=performance.now()+1500;if(e.status===401){account.state.ready=false;$('account-screen').hidden=false;$('account-error').textContent='Phiên đã hết hạn. Đăng nhập lại.';}}
    finally{busy=false;}
  }
  const update=up;up=function(dt){if(!account.state.ready)return;return update(dt);};
  setInterval(frame,220);
  const queue=worldMap.queueActors;
  worldMap.queueActors=function(items,cx,cy,vw,vh){queue(items,cx,cy,vw,vh);queuePeers(items,cx,cy,vw,vh);};
  function queuePeers(items,cx,cy,vw,vh){if(!account.state.ready)return;
    for(const peer of state.players){peer.drawX+=(peer.x-peer.drawX)*.22;peer.drawY+=(peer.y-peer.drawY)*.22;peer.drawLift+=((peer.airborne||0)-peer.drawLift)*.22;
      peer.ap.meditating=!!peer.med;
      if(peer.drawX<cx-80||peer.drawX>cx+vw+80||peer.drawY<cy-100||peer.drawY>cy+vh+80)continue;
      const moving=!peer.med&&Math.hypot(peer.x-peer.drawX,peer.y-peer.drawY)>.5;
      items.push([peer.drawY,()=>{g.save();drawChar(g,peer.drawX,peer.drawY-peer.drawLift,peer.dir,peer.f,moving,tm*10,false,peer.ap,characterClasses[peer.ap.w].color);const displayName=(window.communityGame?.isAlly(peer.id)?'◆ ':'')+peer.name;drawWorldCaption(g,displayName,peer.drawX,peer.drawY-peer.drawLift+14,'#96efda',6.5);
        if(peer.emote){g.textAlign='center';g.font='bold 15px sans-serif';g.fillStyle='#fff1c9';g.fillText({wave:'✦ Xin chào!',heart:'♥',ready:'⚔ Sẵn sàng'}[peer.emote],peer.drawX,peer.drawY-peer.drawLift-(window.characterNameHeight?.(peer.ap)||70)-(window.characterTitles?.height(peer.ap)||0)-12);}
        g.restore();}]);
    }
  };
  window.onlineWorld={state,frame,queuePeers};
})();
