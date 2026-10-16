/* Companion collection and persistent three-second hatching; pets gain skills through petCombat. */
(function(){
 const kinds=['BoNgua','Tho','Nhen','Doi'],names={BoNgua:'Linh Đường Lang',Tho:'Nguyệt Thố',Nhen:'Huyết Nhện',Doi:'Băng Dực Dơi'},tones={BoNgua:'#91d981',Tho:'#9cdfff',Nhen:'#f18d88',Doi:'#c5c5ff'};
 const followers=new Map(),icons=new Map(),pictures=new Map();let lastScene=worldMap.state.scene;
 function progress(){const p=inventory.progress();p.pets??=[];p.petEggGifted??=[];return p;}
 const uid=()=>crypto.randomUUID?.()||'pet-'+Date.now()+'-'+Math.random();
 function grantEggs(){if(!P.ap||!account.state.ready||account.state.restoring)return;const p=progress();for(const species of kinds){if(p.petEggGifted.includes(species))continue;if(p.bag.length>=30&&!p.bag.some(i=>i.id==='egg-'+species))break;const item=inventory.addItem('egg-'+species);if(item){p.petEggGifted.push(species);saveCharacter();}else break;}}
 function active(p=progress()){return p.pets.find(pet=>pet.id===p.activePet)||null;}
 function startHatch(itemUid){
  const p=progress(),item=p.bag.find(i=>i.uid===itemUid&&i.type==='egg');
  if(!item||!kinds.includes(item.species))return false;
  if(p.hatching){msg('Đang ấp một trứng.');open();return false;}if(p.pets.length>=20){msg('Linh thú đã đủ 20 ô.');return false;}
  p.hatching={id:uid(),species:item.species,readyAt:Date.now()+3000};item.qty=(item.qty||1)-1;if(item.qty<=0)p.bag.splice(p.bag.indexOf(item),1);saveCharacter();open();return true;
 }
 function finish(){if(!P.ap||!account.state.ready)return false;const p=progress(),h=p.hatching;if(!h||Date.now()<h.readyAt)return false;
  if(!kinds.includes(h.species)||p.pets.length>=20)return false;
  const pet={id:h.id,species:h.species,name:names[h.species]};if(!p.pets.some(i=>i.id===pet.id))p.pets.push(pet);
  if(!p.activePet)p.activePet=pet.id;delete p.hatching;saveCharacter();msg(pet.name+' đã nở! Mở Linh thú để xuất chiến.');if(worldMap.dialog.isOpen()&&$('world-title').textContent.startsWith('Linh thú'))open();return true;
 }
 function select(id){const p=progress();if(id!==null&&!p.pets.some(pet=>pet.id===id))return false;p.activePet=id;followers.delete('self');saveCharacter();open();return true;}
 function eggIcon(species){if(icons.has(species))return icons.get(species);const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d'),tone=tones[species]||'#ffdb87';
  const gradient=g.createRadialGradient(48,42,6,64,68,53);gradient.addColorStop(0,'#fff7d3');gradient.addColorStop(.5,tone);gradient.addColorStop(1,'#315367');g.fillStyle=gradient;g.beginPath();g.ellipse(64,66,35,47,0,0,Math.PI*2);g.fill();g.strokeStyle='#fff0b2';g.lineWidth=2;g.stroke();g.fillStyle='#ffffff70';for(const [x,y,r]of [[51,52,5],[76,77,6],[51,87,4]]){g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();}const url=c.toDataURL();icons.set(species,url);return url;}
 function open(){finish();const p=progress(),d=worldMap.dialog;d.show('Linh thú · Trứng và đồng hành','Ấp trứng trong 3 giây. Một linh thú xuất chiến. Nút Pet cạnh cụm skill để dùng kỹ năng; Auto hỗ trợ khi bật tự đánh.');
  if(p.hatching){d.line('Đang ấp '+names[p.hatching.species]+'…');const timer=document.createElement('div');timer.id='pet-hatch-progress';$('world-content').append(timer);}
  for(const egg of p.bag.filter(i=>i.type==='egg'))d.action('Ấp '+egg.name+' ×'+(egg.qty||1),()=>startHatch(egg.uid),!!p.hatching||p.pets.length>=20);
  const grid=document.createElement('div');grid.className='pet-collection';$('world-content').append(grid);
  for(const pet of p.pets){const card=document.createElement('button');card.type='button';card.className='pet-card';card.dataset.petId=pet.id;card.setAttribute('aria-pressed',String(p.activePet===pet.id));const img=document.createElement('img');img.src=artworkURL(spriteCatalog.monsterFrames[pet.species][0][0].src);img.alt='';const label=document.createElement('span');label.textContent=pet.name+(p.activePet===pet.id?' · Đang theo':' · Xuất chiến');card.append(img,label);const skill=document.createElement('small');skill.textContent=buildCatalog.pets[pet.species].name+' · '+buildCatalog.pets[pet.species].description;card.append(skill);card.onclick=()=>select(pet.id);grid.append(card);}
  d.action('Pet tự dùng skill khi Auto: '+(p.petAuto!==false?'BẬT':'TẮT'),()=>{p.petAuto=p.petAuto===false;saveCharacter();open();});if(window.petCombat)d.line('Hồi chiêu chung: '+Math.ceil(petCombat.remaining())+'s. Đổi pet hoặc tải lại không xóa hồi chiêu.');if(!p.pets.length)d.line('Ấp một trứng trong túi để nhận linh thú.');if(p.activePet)d.action('Thu hồi linh thú',()=>select(null));d.action('Mở túi đồ',inventory.openBag);
 }
 function pose(species,moving,time){const sheets=spriteCatalog.monsterFrames[species],sheet=sheets[species==='BoNgua'||species==='Tho'?(moving?1:0):0];const meta=sheet[Math.floor(time*(moving?9:5))%sheet.length];if(!pictures.has(meta.src)){const image=new Image();image.src=artworkURL(meta.src);pictures.set(meta.src,image);}return{meta,image:pictures.get(meta.src)};}
 function follow(key,pet,x,y,dir,facing,dt){if(!pet||!kinds.includes(pet.species)){followers.delete(key);return;}let f=followers.get(key);if(!f||f.id!==pet.id){f={...pet,x:x-28,y:y+18,time:0,moving:false};followers.set(key,f);}
  let tx=x+(dir===2?-facing*33:-29),ty=y+(dir===1?26:18);if(!worldMap.canWalk({x:tx,y:ty})){tx=x;ty=y;}if(!worldMap.canWalk(f)){f.x=x;f.y=y;}const distance=Math.hypot(tx-f.x,ty-f.y);if(distance>300){f.x=tx;f.y=ty;}
  const step=Math.min(distance,220*dt,distance*(1-Math.exp(-dt*6)));f.moving=distance>8;f.facing=tx>=f.x?1:-1;if(distance>1){const end=worldMap.traceMove(f,{x:f.x+(tx-f.x)/distance*step,y:f.y+(ty-f.y)/distance*step});f.x=end.x;f.y=end.y;}f.time+=dt;
 }
 function draw(ctx,f){const {meta,image}=pose(f.species,f.moving||!!window.petCombat?.isCasting(f.id),f.time);if(!image.complete||!image.naturalWidth)return;
  const idle=spriteCatalog.monsterFrames[f.species][0][0],scale=25/idle.rect.h,width=meta.rect.w*scale,height=meta.rect.h*scale,bob=f.species==='Doi'?Math.sin(f.time*6)*2-5:0;
  ctx.save();ctx.translate(f.x,f.y+bob);if(f.facing<0)ctx.scale(-1,1);renderArtwork(ctx,image,-width/2-meta.padding*scale,-height-meta.padding*scale,image.naturalWidth*scale,image.naturalHeight*scale);ctx.restore();
  ctx.save();ctx.font='600 6px Arial';ctx.textAlign='center';ctx.strokeStyle='#112630';ctx.lineWidth=2;ctx.strokeText(f.name,f.x,f.y-height-5+bob);ctx.fillStyle='#b5ebce';ctx.fillText(f.name,f.x,f.y-height-5+bob);ctx.restore();
 }
 const update=up;up=function(dt){const result=update(dt);if(!P.ap||!account.state.ready||paused()||worldMap.dialog.isOpen())return result;
  if(lastScene!==worldMap.state.scene){followers.clear();lastScene=worldMap.state.scene;}
  follow('self',active(),P.x,P.y,P.dir,P.f,dt);const seen=new Set(['self']);for(const peer of window.onlineWorld?.state.players||[]){const key='peer-'+peer.id;seen.add(key);follow(key,peer.pet,peer.drawX??peer.x,peer.drawY??peer.y,peer.dir,peer.f,dt);}for(const key of followers.keys())if(!seen.has(key))followers.delete(key);return result;
 };
 const queue=worldMap.queueActors;worldMap.queueActors=function(items,cx,cy,vw,vh){queue(items,cx,cy,vw,vh);for(const f of followers.values())if(f.x>cx-50&&f.x<cx+vw+50&&f.y>cy-60&&f.y<cy+vh+50)items.push([f.y,()=>draw(g,f)]);};
 const creator=$('ok').onclick;$('ok').onclick=()=>{creator();if(P.ap&&cr.style.display==='none')grantEggs();};addEventListener('tienlo-auth',()=>{followers.clear();grantEggs();finish();});
 setInterval(()=>{if(!P.ap||!account.state.ready)return;grantEggs();finish();const timer=$('pet-hatch-progress');if(timer&&progress().hatching)timer.textContent='Còn '+Math.max(0,Math.ceil((progress().hatching.readyAt-Date.now())/1000))+' giây';},500);
 const respawn=classCombat.onRespawn;classCombat.onRespawn=function(){followers.clear();return respawn();};
 const b=document.createElement('button');b.id='pet-button';b.textContent='Linh thú';b.onclick=()=>{if(!paused())open();};$('bt').append(b);
 const style=document.createElement('style');style.textContent='.pet-collection{display:grid;grid-template-columns:repeat(auto-fit,minmax(125px,1fr));gap:12px;margin:16px 0}.pet-card{display:flex;flex-direction:column;align-items:center;gap:8px;background:#132b37;border:1px solid #496674;border-radius:12px;padding:14px;color:#d8e8dd}.pet-card img{height:85px;width:85px;object-fit:contain}.pet-card[aria-pressed=true]{border-color:#b8eb9a;background:#244b42}.pet-card span{font:12px Arial}#pet-hatch-progress{color:#ffdf9b;padding:12px}';document.head.append(style);
 window.spiritPets={progress,active,startHatch,finish,select,open,grantEggs,eggIcon,followers,draw,pose};
})();
