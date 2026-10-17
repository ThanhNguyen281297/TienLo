/* Explicit GM sandbox: inspect every current template and equip matching items. */
(function(){
 const d=worldMap.dialog,button=document.createElement('button');button.id='gm-equipment-button';button.textContent='GM · Kho trang bị';button.hidden=true;button.onclick=()=>open();$('bt').append(button);
 function take(id,wear=false){if(!gmTest.enabled)return msg('Bật GM để dùng kho trang bị.');const template=inventory.templates.find(t=>t.id===id);if(!template)return;
  if(wear&&equipmentRules.classSlots.includes(template.slot)&&template.classIndex!==P.ap.w)return msg('Chỉ mặc trang bị bên trái đúng class.');
  const item=inventory.addItem(id);if(!item)return;const equipped=!!(wear&&item.slot);if(equipped)inventory.equipItem(item.uid);else msg('GM: đã lấy '+item.name+'.');return item;
 }
 function open(){if(!gmTest.enabled||!P.ap||paused())return;d.show('GM · Kho trang bị','Lấy đồ miễn phí để thử. Mặc thử bỏ qua yêu cầu cấp; 4 ô bên trái vẫn phải đúng class.');const ui=visualUI,root=$('world-content'),tools=ui.node('div','gm-catalog-tools');root.append(tools);
  const search=ui.node('input','');search.type='search';search.placeholder='Tìm tên trang bị…';search.setAttribute('aria-label','Tìm trang bị GM');tools.append(search);
  const slots=ui.node('select','');slots.setAttribute('aria-label','Lọc ô trang bị GM');for(const [value,label]of [['all','Tất cả'],...Object.entries(equipmentRules.slots),['other','Đan dược và trứng']]){const o=ui.node('option','',label);o.value=value;slots.append(o);}tools.append(slots);
  const classes=ui.node('select','');classes.setAttribute('aria-label','Lọc class GM');for(const [value,label]of [['all','Mọi class'],['own','Class của bạn'],['shared','Dùng chung'],...equipmentRules.classes.map((n,i)=>[String(i),n])]){const o=ui.node('option','',label);o.value=value;classes.append(o);}tools.append(classes);
  const count=ui.node('p','visual-note'),grid=ui.node('div','visual-grid gm-catalog');root.append(count,grid);
  function render(){const query=search.value.trim().toLocaleLowerCase('vi'),list=inventory.templates.filter(t=>(!query||t.name.toLocaleLowerCase('vi').includes(query))&&(slots.value==='all'||(slots.value==='other'?!t.slot:t.slot===slots.value))&&(classes.value==='all'||(classes.value==='shared'?!equipmentRules.classSlots.includes(t.slot):t.classIndex===(classes.value==='own'?P.ap.w:Number(classes.value))&&equipmentRules.classSlots.includes(t.slot))));count.textContent=list.length+' / '+inventory.templates.length+' vật phẩm';grid.replaceChildren();for(const item of list){const {card,body}=ui.panel(item.name,inventory.itemIcon(item),grid);card.dataset.gmItem=item.id;const locked=equipmentRules.classSlots.includes(item.slot),wrong=locked&&item.classIndex!==P.ap.w;const requirement=ui.node('p','item-class-requirement',locked?'Class yêu cầu: '+equipmentRules.classes[item.classIndex]:'Class yêu cầu: Dùng chung');requirement.style.color=wrong?'#ffaca0':'#9de0bd';body.append(requirement);ui.chips([['Cấp',item.req||0],['Ô',equipmentRules.slots[item.slot]||'Vật phẩm']],body);ui.action(body,'Lấy vào túi',()=>take(item.id));if(item.slot)ui.action(body,'Mặc thử',()=>take(item.id,true),wrong);}}
  search.oninput=slots.onchange=classes.onchange=render;render();
 }
 addEventListener('tienlo-gm-change',()=>{button.hidden=!gmTest.enabled;if(gmTest.enabled)open();else if($('world-title').textContent==='GM · Kho trang bị')d.close();});
 window.gmEquipment={open,take};
})();
