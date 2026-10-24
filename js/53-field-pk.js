/* Consensual PK in Sơn Hà. The ⚔ button (under the minimap) turns PK on/off.
   PK-on players (not in your party) become targets next to the monsters; hits are
   sent as intents and resolved on the server, which returns pvpDamage for you.
   Killing gives sát khí: 3+ makes your name red for everyone (decays over time). */
(function(){
 const world=worldMap;
 const state={pk:{on:false,sat:0,red:false,cooldown:0},busy:false};
 const field=()=>world.state.scene.startsWith('field-');
 const btn=document.createElement('button');btn.id='pk-toggle';btn.type='button';btn.hidden=true;btn.setAttribute('aria-label','Chế độ PK');document.body.append(btn);
 function paint(){btn.hidden=!field()||!P.ap||!account.state.ready;btn.classList.toggle('on',!!state.pk.on);btn.classList.toggle('red',!!state.pk.red);
  btn.textContent=state.pk.on?'⚔ PK':'☮';btn.title=state.pk.on?'PK đang bật · sát khí '+state.pk.sat:'Hòa bình · bấm để bật PK';}
 btn.onclick=async()=>{if(state.busy||paused())return;state.busy=true;try{state.pk=await account.api('/api/pk',{on:!state.pk.on});msg(state.pk.on?'⚔ Đã bật PK: người chơi bật PK khác có thể tấn công bạn.':'☮ Đã về chế độ hòa bình.');}catch(e){msg(e.message);}finally{state.busy=false;paint();}};
 const allies=()=>new Set((window.communityGame?.state?.social?.party?.members||[]).map(m=>m.id));
 function targets(){if(!field()||!state.pk.on)return[];const party=allies();
  return onlineWorld.state.players.filter(p=>p.pk&&!party.has(p.id)&&p.hp>0).map(p=>({id:'pk-'+p.id,pvpId:p.id,t:0,network:true,pvpTarget:true,pkTarget:true,worldMap:true,dead:0,cd:999,fr:0,fl:0,
   x:p.drawX??p.x,y:p.drawY??p.y,hx:p.x,hy:p.y,hp:p.hp,maxHp:p.maxHp||p.hp,name:p.name,level:p.level}));}
 function receive(data){if(!field())return;if(data.pk){const was=state.pk.on;state.pk=data.pk;if(was!==state.pk.on)paint();}
  if(data.pvpDamage>0&&P.hp>0){P.hp-=data.pvpDamage;fx(P.x,P.y-38,data.pvpDamage,'#ff6a5a');window.gameAudio?.play('hurt');}
  for(const e of data.pvpEvents||[])if(e.kill&&!seen.has(e.id)){seen.add(e.id);const k=onlineWorld.state.players.find(p=>p.id===e.owner)?.name||(e.owner===account.state.user?.id?P.nm:'?'),v=onlineWorld.state.players.find(p=>p.id===e.target)?.name||(e.target===account.state.user?.id?P.nm:'?');msg('⚔ '+k+' hạ '+v);}}
 const seen=new Set();
 const queue=(slot,point)=>{const events=onlineWorld.state.duelAttacks??=[];if(events.length<8)events.push({id:crypto.randomUUID(),slot,x:point.x,y:point.y});};
 const attack=basicCombat.attack;basicCombat.attack=function(target){const r=attack(target);if(r&&target?.pkTarget&&field()&&state.pk.on)queue(0,target);return r;};
 const cast=skill;skill=function(i){const before=P.mp,r=cast(i);if(field()&&state.pk.on&&P.mp<before){const enemies=E.filter(e=>e.pkTarget).sort((a,b)=>Math.hypot(a.x-P.x,a.y-P.y)-Math.hypot(b.x-P.x,b.y-P.y));
   if(enemies[0]&&Math.hypot(enemies[0].x-P.x,enemies[0].y-P.y)<600){const aim=getClassCombat()?.state?.aim;queue(i+1,i>=2&&aim?aim:enemies[0]);}}return r;};
 const update=up;up=function(dt){const r=update(dt);if(field()){E=E.filter(e=>!e.pkTarget).concat(targets());}else if(E.some(e=>e.pkTarget))E=E.filter(e=>!e.pkTarget);paint();return r;};
 const caption=window.drawWorldCaption;window.drawWorldCaption=function(ctx,text,x,y,color,size){if(field()){const name=String(text).replace(/^◆ /,''),p=onlineWorld.state.players.find(q=>q.name===name);
   if(p?.red)color='#ff4a3a';else if(p?.pk)color='#ffb067';else if(name===P.nm&&state.pk.red)color='#ff4a3a';else if(name===P.nm&&state.pk.on)color='#ffb067';}return caption(ctx,text,x,y,color,size);};
 const css=document.createElement('style');css.textContent=`#pk-toggle{position:fixed;top:198px;right:8px;z-index:4;min-width:46px;height:26px;padding:0 8px;border-radius:13px;border:1px solid #9fc4bb88;background:#14262ee6;color:#cfe6dd;font:700 11px Arial;min-height:0!important}
#pk-toggle.on{border-color:#ff8a5a;background:linear-gradient(90deg,#5a1a10,#7a2a14);color:#ffe0d0;box-shadow:0 0 10px #ff6a3a66}#pk-toggle.red{border-color:#ff3a2a;box-shadow:0 0 14px #ff3a2aaa}#pk-toggle[hidden]{display:none}
@media(max-width:700px),(max-height:500px){#pk-toggle{top:170px}}`;document.head.append(css);
 window.fieldPk={state,receive,targets};
})();
