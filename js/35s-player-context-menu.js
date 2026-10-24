/* One menu for left click, touch and right click on a visible player. */
(function(){
 const d=worldMap.dialog,node=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls||'';if(text!==undefined)e.textContent=text;return e;};
 const panel=node('section','player-menu');panel.id='player-context-menu';panel.hidden=true;panel.setAttribute('aria-label','Tương tác người chơi');document.body.append(panel);let target=null,epoch=0;
 function close(){panel.hidden=true;target=null;}
 async function party(id){if(!communityGame.state.social?.party){await account.api('/api/community',{action:'party_create',operationId:crypto.randomUUID()});await communityGame.refresh();}await account.api('/api/community',{action:'party_invite',target:id,operationId:crypto.randomUUID()});await communityGame.refresh();msg('Đã gửi lời mời tổ đội.');}
 async function challenge(id){await account.api('/api/duel',{action:'invite',target:id});await duelArena.refresh();msg('Đã gửi lời thách đấu.');}
 function action(root,label,icon,fn,disabled=false){const b=node('button','player-menu-action');b.type='button';b.disabled=disabled;b.append(node('span','',icon),node('b','',label));b.onclick=async()=>{close();try{await fn();}catch(e){msg(e.message);}};root.append(b);return b;}
 function actions(root,p){const self=p.id===account.state.user?.id,social=communityGame.state.social,friend=social?.friends?.some(f=>f.id===p.id),ally=social?.party?.members.some(m=>m.id===p.id);action(root,'Xem thông tin','◉',()=>inspect(p.id));if(self)return;action(root,'Giao dịch','⇄',()=>tradeGame.invite(p.id),!p.online);action(root,friend?'Đã là bạn':'Kết bạn','♡',()=>friendsGame.addById(p.id),friend);action(root,ally?'Cùng tổ đội':'Mời tổ đội','♟',()=>party(p.id),ally||!p.online);action(root,'Thách đấu','⚔',()=>challenge(p.id),!p.online);}
 async function open(peer,point){if(!peer||peer.id===account.state.user?.id||!P.ap)return;target=peer;const serial=++epoch;panel.replaceChildren();panel.hidden=false;const header=node('header','player-menu-head');header.append(node('b','',peer.name),node('small','',peer.online===false?'Offline':'Online'));panel.append(header);actions(panel,{...peer,online:peer.online!==false});const x=point?.x??innerWidth/2,y=point?.y??innerHeight/2;panel.style.left=Math.max(8,Math.min(innerWidth-panel.offsetWidth-8,x+12))+'px';panel.style.top=Math.max(8,Math.min(innerHeight-panel.offsetHeight-8,y-30))+'px';try{const p=await account.api('/api/player/info?id='+peer.id);if(serial===epoch&&target?.id===peer.id)header.querySelector('small').textContent=equipmentRules.classes[p.ap.w]+' · Lv.'+p.level;}catch(e){msg(e.message);}}
 async function inspect(id){const p=await account.api('/api/player/info?id='+id);d.show(p.name,'');const root=$('world-content'),layout=node('div','player-profile');root.append(layout);const portrait=node('section','profile-portrait'),gear=node('section','profile-gear'),detail=node('div','profile-item-detail');layout.append(portrait,gear,detail);
  portrait.append(node('h3','',p.name),node('small','',equipmentRules.classes[p.ap.w]+' · Lv.'+p.level),node('small','',R[p.realm]+' '+p.stage));if(p.guild)portrait.append(node('small','',p.guild));
  const preview=node('canvas','profile-preview'),density=Math.max(1.5,Math.min(3,devicePixelRatio||1));
  preview.width=Math.round(320*density);preview.height=Math.round(380*density);preview.setAttribute('role','img');preview.setAttribute('aria-label','Nhân vật '+p.name);portrait.append(preview);
  const ap={...p.ap,realm:p.realm,meditating:false};
  for(const [key,slot]of [['weaponId','vukhi'],['robeId','daobao'],['backId','phapbao'],['shieldId','ngoc'],['formationId','phaptran'],['ringId','gioi'],['trailId','dichuyen'],['maskId','matna'],['helmetId','mu']])ap[key]=p.equip[slot]?.id||null;
  for(const [key,slot]of [['weaponEnhance','vukhi'],['backEnhance','phapbao'],['bodyEnhance','daobao']])ap[key]=p.equip[slot]?.enhance||0;
  ap.weaponRarity=p.equip.vukhi?.rarity||'pham';
  const ctx=preview.getContext('2d');
  function paint(){
   if(!preview.isConnected||!d.isOpen())return;
   ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,preview.width,preview.height);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
   ctx.setTransform(3.2*density,0,0,3.2*density,160*density,280*density);
   drawChar(ctx,0,0,0,1,false,tm*10,false,ap,characterClasses[ap.w].color);
   requestAnimationFrame(paint);
  }
  paint();
  const summary=node('div','profile-stat-pills');summary.append(node('span','','♥ '+p.stats.hp),node('span','','⚔ '+p.stats.attack));portrait.append(summary);
  for(const [slot,label]of Object.entries(equipmentRules.slots)){const item=p.equip[slot],b=node('button','profile-slot');b.type='button';b.dataset.profileSlot=slot;b.title=label;const img=node('img');img.src=inventory.itemIcon(item,slot);img.alt='';b.append(img,node('small','',label));if(item){equipmentProgression.decorate(b,item);b.onclick=()=>{detail.replaceChildren();itemCards.render(detail,item);};}else b.disabled=true;gear.append(b);}
  const first=Object.values(p.equip).find(Boolean);if(first)itemCards.render(detail,first);const menu=node('nav','profile-actions');root.append(menu);actions(menu,p);
 }
 function select(event){if(!P.ap||paused()||d.isOpen()||duelArena.fighting()||skillAim.state.visible)return;if(panel.contains(event.target))return;if(event.target!==cv){close();return;}if(event.type==='pointerdown'&&event.button!==0)return;const box=cv.getBoundingClientRect(),camera=gameCamera(),point={x:camera.x+(event.clientX-box.left)/box.width*W/Z,y:camera.y+(event.clientY-box.top)/box.height*H/Z};const peer=onlineWorld.state.players.filter(p=>{const x=p.drawX??p.x,y=(p.drawY??p.y)-(p.drawLift||0);return Math.abs(x-point.x)<27&&point.y>y-58&&point.y<y+18;}).sort((a,b)=>(b.drawY??b.y)-(a.drawY??a.y))[0];
  if(!peer){close();return;}event.preventDefault();event.stopImmediatePropagation();ptr=null;K={};skillAim.cancel();open(peer,{x:event.clientX,y:event.clientY});
 }
 document.addEventListener('pointerdown',select,true);document.addEventListener('contextmenu',select,true);addEventListener('keydown',e=>{if(e.key==='Escape')close();});addEventListener('tienlo-auth',close);const change=worldMap.switchScene;worldMap.switchScene=function(...args){close();return change(...args);};
 const show=d.show;d.show=function(...args){close();return show(...args);};
 window.playerMenu={open,close,inspect,party,challenge,actions,get target(){return target;}};
})();
