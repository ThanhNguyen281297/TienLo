/* Shared item card for inventory, inspection and trade; no combat-power score. */
(function(){
 const node=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls||'';if(text!==undefined)e.textContent=text;return e;};
 const names={atk:'Tấn công',hp:'Sinh lực',mp:'Linh lực',armor:'Giáp',crit:'Bạo kích',dodge:'Né tránh',skill:'Sát thương kỹ năng'},limits={atk:[1,3],hp:[5,20],mp:[3,12],armor:[1,2],crit:[2,8],dodge:[2,6]};
 const tones=['#bcc7cf','#76d59a','#70bdff','#c499ff','#ffdb79'];
 const grade=(value,min,max)=>{const p=Math.max(0,Math.min(1,(value-min)/Math.max(1,max-min)));return p>=1?4:p>=.75?3:p>=.5?2:p>=.25?1:0;};
 const value=(v,percent=false)=>Number((v*(percent?100:1)).toFixed(2))+(percent?'%':'');
 function stars(parent,item){if(!equipmentRules.enhanceSlots.includes(item.slot))return;const n=equipmentProgression.level(item),bar=node('div','item-upgrade-stars');bar.setAttribute('aria-label','Cường hóa '+n+'/15');for(let i=1;i<=15;i++){const star=node('span',i<=n?'lit':'','★');if(i<=n)star.style.color=equipmentProgression.color(n);bar.append(star);}parent.append(bar);}
 function render(parent,item,{owned=false,compare=false}={}){
  const quality=equipmentRules.qualities.find(q=>q.id===item.rarity)||equipmentRules.qualities[0],n=equipmentProgression.level(item),panel=node('article','item-detail-panel item-card');panel.style.setProperty('--item-tone',quality.color);parent.append(panel);
  const header=node('header','item-card-head'),image=node('img');image.src=inventory.itemIcon(item,item.slot);image.alt='';const title=node('div');title.append(node('h4','','【'+quality.name+'】 '+item.name));header.append(image,title,node('strong','item-card-plus',n?'+'+n:''));panel.append(header);
  const meta=node('div','item-card-meta');meta.append(node('span','',equipmentRules.slots[item.slot]||({material:'Nguyên liệu',consume:'Đan dược'}[item.type])||'Vật phẩm'),node('span','','Lv.'+(item.req||0)));panel.append(meta);stars(panel,item);
  if(equipmentRules.classSlots.includes(item.slot)){const line=node('p','item-class-requirement','Class yêu cầu: '+equipmentRules.classes[item.classIndex]);line.classList.toggle('item-wrong-class',owned&&item.classIndex!==P.ap?.w);panel.append(line);}
  if(item.gender)panel.append(node('small','',item.gender==='Nu'?'Dành cho nữ':'Dành cho nam'));
  const lines=node('div','item-card-lines');panel.append(lines);
  const equipped=P.world?.equip?.[item.slot];
  for(const key of ['atk','hp','mp','armor','crit','dodge','skill']){if(!item[key])continue;const percent=['crit','dodge','skill'].includes(key),base=Number(item[key]),enhanced=base*(1+n*.05),row=node('div','item-detail-stat');row.append(node('span','',names[key]),node('b','',value(enhanced,percent)));if(n)row.append(node('small','item-enhance-gain','+'+value(enhanced-base,percent)));
   if(compare&&equipped&&equipped.uid!==item.uid){const diff=equipmentProgression.stat(item,key)-equipmentProgression.stat(equipped,key);if(Math.abs(diff)>.00001){const delta=node('small',diff>0?'stat-better':'stat-worse',(diff>0?'▲ ':'▼ ')+value(Math.abs(diff),percent));row.append(delta);}}lines.append(row);
  }
  function roll(label,amount,min,max,display,index){const row=node('div','item-roll'),rank=grade(amount,min,max);row.style.setProperty('--roll-tone',tones[rank]);row.dataset.grade=rank;row.append(node('span','',label),node('b','','+'+display(amount)),node('small','',display(amount)+' / '+display(max)));const bar=node('i');bar.style.setProperty('--roll-width',Math.round(amount/max*100)+'%');row.append(bar);
   if(owned&&index!==undefined){const lock=node('button','item-lock',item.locks?.includes(index)?'🔒':'◇');lock.type='button';lock.title=(item.locks?.includes(index)?'Mở khóa':'Khóa · 40 ◈')+' dòng '+(index+1);lock.setAttribute('aria-label',(item.locks?.includes(index)?'Mở khóa':'Khóa')+' dòng '+(index+1));lock.onclick=()=>equipmentSystem.reforge(item.uid,index);row.append(lock);}lines.append(row);
  }
  if(item.options?.length){lines.append(node('h5','','Thuộc tính thêm'));for(const option of item.options){const [min,max]=limits[option.key]||[1,option.value],pct=['crit','dodge'].includes(option.key);roll(names[option.key]||option.key,option.value,min,max,v=>Number((v/(pct?10:1)).toFixed(2))+(pct?'%':''));}}
  if(item.affixes?.length){lines.append(node('h5','','Tẩy luyện'));for(const [i,line]of item.affixes.entries()){const rule=equipmentData.pool(item).find(r=>r.key===line.key);if(rule)roll(rule.name,line.value,rule.min,rule.max,v=>Number((v/(rule.percent||rule.key==='regen'?100:1)).toFixed(2))+(rule.percent?'%':rule.key==='regen'?'/s':''),i);}}
  if(item.slot==='gioi')lines.append(node('div','item-detail-stat','Túi đồ +'+(item.capacity||0)+' ô'));
  if(item.slot==='ngoc'){const meta=equipmentData.byId.get(item.id);panel.append(node('small','item-card-note',(meta?.skillName||'Hộ Thể Kết Giới')+' · '+equipmentRules.shield.duration+'s / '+equipmentRules.shield.cooldown+'s'));}
  for(const [key,label]of [['heal','Hồi máu'],['mana','Hồi linh lực'],['xp','Đạo hạnh']])if(item[key])lines.append(node('div','item-detail-stat',label+' +'+item[key]));
  return panel;
 }
 function open(item){const d=worldMap.dialog;d.show('Vật phẩm','');render($('world-content'),item);if(window.tradeGame?.current())d.action('Trở lại giao dịch',()=>tradeGame.render());}
 window.itemCards={render,open,stars,grade};
})();
