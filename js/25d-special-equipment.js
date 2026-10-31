/* Equipment effects. Reforges and shield clocks are issued by the server. */
(function(){
 const data=equipmentData,rules=data.rules,images=new Map();
 function image(src){src=rules.assetAliases[src]||src;if(!images.has(src)){const img=new Image();img.src=artworkURL(src);images.set(src,img);}return images.get(src);}
 let state={readyAt:0,activeUntil:0},offset=0,busy=false;
 const now=()=>Date.now()/1000+offset;
 function receive(value){if(!value)return;state=value;offset=value.now-Date.now()/1000;}
 const respawn=worldMap.respawn;worldMap.respawn=function(...args){state.activeUntil=0;account.api('/api/equipment',{action:'shield_end'}).then(r=>receive(r.shield)).catch(()=>{});return respawn.apply(this,args);};
 const equipped=()=>P.world?.equip?.ngoc;
 const active=()=>!!(equipped()&&state.sourceUid===equipped().uid&&state.activeUntil>now()&&P.hp>0);
 const stats=window.bonusStats;
 window.bonusStats=function(){const base=stats(),a=data.affixStats(inventory.progress());return{...base,atk:base.atk+(a.attackFlat||0),crit:Math.min(window.sectPotential?.critCap?.()??.35,base.crit+(a.crit||0)),dodge:Math.min(.2,base.dodge+(a.dodge||0)),skill:base.skill+(a.skill||0),armor:(base.armor+(a.armorFlat||0))*(1+(a.armorPercent||0)),atkPercent:(base.atkPercent||0)+(a.attackPercent||0),hpPercent:(base.hpPercent||0)+(a.hpPercent||0),mpPercent:(base.mpPercent||0)+(a.mpPercent||0),...Object.fromEntries(['lifesteal','manasteal','critDamage','bossDamage','resist','regen'].map(k=>[k,a[k]||0]))};};
 const armor=window.totalArmor;
 window.totalArmor=function(b=bonusStats()){const base=armor(b);return base+(active()?Math.min(rules.shield.armorMax,Math.max(rules.shield.armorMin,Math.round(base*rules.shield.armorPercent))):0);};
 function damageTaken(){return 1-Math.min(.15,bonusStats().resist||0);}
 function sustain(damage){if(!(damage>0)||P.hp<=0)return;const b=bonusStats();P.hp=Math.min(mhp(),P.hp+damage*b.lifesteal);P.mp=Math.min(mmp(),P.mp+damage*b.manasteal);}
 const localHit=hit;
 hit=function(enemy,power){const hp=enemy?.hp||0;const result=localHit(enemy,power*(enemy?.boss||enemy?.elite||enemy?.t===2?1+bonusStats().bossDamage:1));if(enemy&&!enemy.network&&!enemy.rewardReplay&&!window.petCombat?.dealing)sustain(Math.min(hp,Math.max(0,hp-enemy.hp)));return result;};
 async function reforge(uid,index){if(busy)return;if(!worldMap.isSafe(P))return msg('Về đài an toàn để tẩy luyện.');busy=true;try{await account.transact('/api/equipment',{action:index===undefined?'reforge':'lock',uid,index,opId:crypto.randomUUID()});inventory.openBag();const item=[...P.world.bag,...Object.values(P.world.equip).filter(Boolean)].find(i=>i.uid===uid);const equippedSlot=item&&P.world.equip[item.slot]?.uid===uid?item.slot:null;if(equippedSlot)document.querySelector('[data-equip-slot="'+equippedSlot+'"]')?.click();else [...document.querySelectorAll('[data-bag-cell]')].find(el=>el.dataset.bagCell===String(item?.cell))?.click();msg(index===undefined?'Đã tẩy luyện các dòng chưa khóa.':'Đã cập nhật khóa dòng.');}catch(e){msg(e.message);}finally{busy=false;}}
 function describe(parent,item){const pool=data.pool(item);if(!pool.length)return;const list=document.createElement('div');list.className='affix-list';for(const [index,line] of (item.affixes||[]).entries()){const rule=pool.find(r=>r.key===line.key);if(!rule)continue;const row=document.createElement('div');row.className='affix-row';const text=document.createElement('span');const unit=rule.percent?'%':rule.key==='regen'?' HP/s':'';const display=v=>Number((v/(rule.percent||rule.key==='regen'?100:1)).toFixed(2));text.textContent=rule.name+' +'+display(line.value)+unit;const cap=document.createElement('small');cap.textContent='Tối đa '+display(rule.max)+unit;const meter=document.createElement('progress');meter.max=rule.max;meter.value=line.value;const lock=document.createElement('button');lock.type='button';const locked=item.locks?.includes(index);lock.textContent=locked?'🔒 Mở khóa':'Khóa · 40 ◈';lock.setAttribute('aria-label',(locked?'Mở khóa':'Khóa')+' dòng '+(index+1));lock.onclick=()=>reforge(item.uid,index);row.append(text,cap,meter,lock);list.append(row);}parent.append(list);if(item.slot==='ngoc'){const meta=data.byId.get(item.id)||data.byId.get('shield-'+data.shieldVariant(item));const note=document.createElement('p');note.textContent=(meta?.skillName||'Hộ Thể Kết Giới')+' · +35% giáp (6–25) trong '+rules.shield.duration+' giây · hồi '+rules.shield.cooldown+' giây';parent.append(note);}}
 const button=document.createElement('button');button.id='shield-skill';button.type='button';button.setAttribute('aria-label','Kỹ năng hộ thuẫn');button.innerHTML='<img alt=""><span></span>';button.onclick=async()=>{if(busy||paused()||worldMap.dialog.isOpen()||!equipped())return;busy=true;try{if(!await account.flush())throw new Error('Chưa lưu được trang bị.');const result=await account.api('/api/equipment',{action:'shield',revision:account.state.revision});receive(result.shield);msg((data.byId.get(equipped().id)?.skillName||'Hộ Thể Kết Giới')+' · '+rules.shield.duration+' giây');}catch(e){msg(e.message);}finally{busy=false;}};$('bt').append(button);
 function refresh(){const item=equipped();button.hidden=!item;const seconds=Math.ceil(Math.max(0,state.readyAt-now())),remaining=Math.ceil(Math.max(0,state.activeUntil-now()));button.disabled=busy||seconds>0;button.classList.toggle('shield-active',active());button.querySelector('span').textContent=active()?remaining+'s':seconds?seconds+'s':'Thuẫn';const src=item?'Item/Thuan/'+data.shieldVariant(item)+'.png':'';if(src&&button.dataset.src!==src){button.querySelector('img').src=artworkURL(src);button.dataset.src=src;}button.title=(data.byId.get(item?.id)?.skillName||'Hộ Thể Kết Giới')+' · '+rules.shield.duration+' giây / hồi '+rules.shield.cooldown+' giây';}
 addEventListener('tienlo-auth',async()=>{try{receive((await account.api('/api/equipment')).shield);}catch{}});
 let wasAlive=true;const update=up;up=function(dt){const result=update(dt);if(!P.ap||!account.state.ready)return result;refresh();if(P.hp<=0){if(wasAlive)state.activeUntil=0;wasAlive=false;}else{wasAlive=true;if(!paused()&&!worldMap.dialog.isOpen())P.hp=Math.min(mhp(),P.hp+bonusStats().regen*dt);}return result;};
 function gear(ap,slot,remoteKey){if(ap===P.ap)return P.world?.equip?.[slot];return ap?.[remoteKey]?data.byId.get(ap[remoteKey])||data.collection(ap[remoteKey]):null;}
 function backImage(ap){const item=gear(ap,'phapbao','backId');return item?image(data.appearance(item)):null;}
 function formationImage(ap){const item=gear(ap,'phaptran','formationId');return item?image(data.appearance(item)):null;}
 const reducedFormationMotion=matchMedia('(prefers-reduced-motion: reduce)');
 // Formation art is trimmed to its painted disc and stretched to a square once, so
 // every seal (some are drawn as ellipses or on non-square sheets) spins as a true
 // circle; the ground projection (2:1, like the iso tiles) is applied after rotation.
 const discs=new WeakMap();
 function disc(img){let c=discs.get(img);if(c)return c;const w=img.naturalWidth,h=img.naturalHeight,k=Math.min(1,320/Math.max(w,h)),sw=Math.max(1,Math.round(w*k)),sh=Math.max(1,Math.round(h*k));
  const probe=document.createElement('canvas');probe.width=sw;probe.height=sh;const p=probe.getContext('2d');p.drawImage(img,0,0,sw,sh);
  let l=0,t=0,r=sw,b=sh;try{const d=p.getImageData(0,0,sw,sh).data;l=sw;t=sh;r=0;b=0;for(let y=0;y<sh;y++)for(let x=0;x<sw;x++)if(d[(y*sw+x)*4+3]>24){if(x<l)l=x;if(x>r)r=x;if(y<t)t=y;if(y>b)b=y;}if(r<=l||b<=t){l=0;t=0;r=sw;b=sh;}}catch{}
  c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(img,l/k,t/k,(r-l+1)/k,(b-t+1)/k,0,0,256,256);
  // Soft circular edge: nothing square pokes out of the disc while it turns.
  x.globalCompositeOperation='destination-in';const gr=x.createRadialGradient(128,128,118,128,128,128);gr.addColorStop(0,'#000');gr.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=gr;x.fillRect(0,0,256,256);
  discs.set(img,c);return c;}
 function drawFormation(ctx,x,y,ap,fit,scale=1){
  const img=formationImage(ap);if(!img?.complete||!img.naturalWidth)return;
  const size=80*scale,spin=reducedFormationMotion.matches?0:tm*.45,pulse=reducedFormationMotion.matches?1:1+Math.sin(tm*2.2)*.015;
  ctx.save();ctx.translate(fit?.feetX??x,y+1);ctx.scale(pulse,.5*pulse);ctx.rotate(spin);
  ctx.globalAlpha*=.92;ctx.drawImage(disc(img),-size/2,-size/2,size,size);
  // A faint counter-turning echo gives the seal depth without new art.
  if(!reducedFormationMotion.matches){ctx.rotate(-spin*2);ctx.globalCompositeOperation='lighter';ctx.globalAlpha*=.18+.08*Math.sin(tm*1.7);ctx.drawImage(disc(img),-size*.36,-size*.36,size*.72,size*.72);}
  ctx.restore();
 }
 // Shield on the off-hand forearm: a little over half the body height, foreshortened in profile.
 function drawShield(ctx,x,y,dir,facing,ap,front,fit){const item=gear(ap,'ngoc','shieldId');if(!item)return;if(front!==null&&front!==undefined&&(dir===1)===front)return;const img=image('Item/Thuan/'+data.shieldVariant(item)+'.png');if(!img.complete||!img.naturalWidth)return;
  const H=fit?.H||40,size=H*(dir===2?.4:.44),at=fit?.arm||{x:x-14,y:y-20};ctx.save();ctx.translate(at.x,at.y);ctx.scale(dir===2?.62:1,1);if(dir===2&&facing>0)ctx.scale(-1,1);ctx.drawImage(img,-size/2,-size/2,size,size);ctx.restore();}
 function drawRing(ctx,x,y,dir,facing,ap,fit){const item=gear(ap,'gioi','ringId');if(!item)return;const img=image(data.appearance(item));if(!img.complete||!img.naturalWidth)return;const tier=Math.max(0,rules.rings.findIndex(r=>r.id===item.id)),size=5+tier*.5,tone=['#d9b67b','#8de3bc','#85c9ff','#ffdc81'][tier];const at=fit?.hand||{x:x+(dir===2?facing*10:11),y:y-17};ctx.save();ctx.translate(at.x,at.y+1);ctx.shadowColor=tone;ctx.shadowBlur=2+tier;ctx.drawImage(img,-size/2,-size/2,size,size);ctx.restore();}
 function drawBuff(ctx,x,y,ap,front){const buff=ap===P.ap?state:ap?.shieldState;if(!buff||buff.activeUntil<=now()||(ap===P.ap&&!active()))return;const img=image('Item/BuffThuan/'+(buff.buff||1)+'.png');window.equipmentMotion?.drawBuff(ctx,img,x,y,buff.buff||1,front,tm,buff.activeUntil-now(),rules.shield.duration);}
 window.equipmentSystem={reforge,describe,damageTaken,sustain,receive,active,backImage,formationImage,drawFormation,drawShield,drawRing,drawBuff,get shield(){return state;}};
})();
