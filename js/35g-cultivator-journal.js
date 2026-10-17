/* A guide to the real game systems: no parallel rewards, inventory or combat rules. */
(function(){
  const world=worldMap,d=world.dialog;
  const priorityNames={nearest:'Gần nhất',boss:'Ưu tiên boss / thủ lĩnh',mobs:'Chỉ quái thường',weak:'Tỉ lệ máu thấp nhất'};
  const button=(label,fn,parent=$('world-content'))=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;parent.append(b);return b;};
  function tabs(entries){const bar=document.createElement('nav');bar.className='journal-tabs';bar.setAttribute('aria-label','Mục sổ tay');$('world-content').append(bar);for(const [label,fn]of entries)button(label,fn,bar);}
  function card(title,text,status,action,label='Xem chi tiết',disabled=false){
    const ui=visualUI,p=world.progress(),level=cultivationLevel();
    const key=title.includes('Bí Cảnh')?'portal':title.includes('Đấu trường')?'arena':title.includes('Huyết Ma')?'tower':title.includes('Tông môn')?'palace':title.includes('trang bị')?'forge':title.includes('Linh Mạch')?'garden':title.includes('nhập môn')?'school':'statue';
    const {card:box,body}=ui.panel(title,'MAP/sprites/'+key+'.png',$('activity-grid')||$('world-content'));
    if(title==='Hành trình chính')ui.meter(Math.floor(P.xp),need(),'Đạo hạnh',body);
    else if(title==='Bài tập nhập môn'){const q=p.sectQuest||{};ui.meter(q.status==='claimed'?3:q.kills||0,3,'Yêu thú',body);ui.chips([['◈',35],['Đạo hạnh',20]],body);}
    else if(title.includes('Linh Mạch'))ui.chips([['Linh Nguyên','×2'],['Đạo hạnh','+20%']],body);
    else if(title.includes('Bí Cảnh'))ui.chips([['◈',120+level*4],['Mảnh',3],['Đồ bộ',1]],body);
    else if(title.includes('Đấu trường'))ui.chips([['Lượt/ngày',2],['Đợt',30],['◈',300]],body);
    else if(title.includes('Huyết Ma'))ui.chips([['◈',250],['Linh Nguyên',60],['Mảnh',5]],body);
    else if(title.includes('Tông môn'))ui.chips([['Đội','4'],['Nhiệm vụ/ngày',2]],body);
    else if(title.includes('trang bị'))ui.meter(p.riftShards||0,6,'Mảnh đổi món',body);
    body.append(ui.node('p','visual-note',status));
    if(action)ui.action(body,label,action,disabled);ui.details(text,body);return body;
  }
  function menu(){tabs([['Hoạt động',open],['Combo Auto',openAuto],['Bách khoa',()=>openCodex()]]);}
  function travel(id){if(!world.progress().tutorial||!world.isSafe(P)||world.state.scene==='arena')return msg('Về đài an toàn và hoàn thành nhập môn trước khi truyền tống.');world.travel(id);}
  function trainer(){if(world.state.scene!=='hub'){travel('hub');if(world.state.scene!=='hub')return;}cultivation.openTrainer();}
  function open(){if(!P.ap||paused())return;
    const p=world.progress(),safe=world.isSafe(P)&&world.state.scene!=='arena',run=spiritRift.state()||world.arenaRun();
    d.show('Tiên Đồ · Hoạt động','Chọn hoạt động → chiến đấu → nhận thưởng.');menu();
    const grid=document.createElement('div');grid.className='visual-grid';grid.id='activity-grid';$('world-content').append(grid);
    if(run){card('Đang trong thử thách','Hoàn thành hoặc rời lượt hiện tại trước khi vào hoạt động khác.','Mở menu không kết thúc lượt.');button('Trở lại chiến đấu',d.close);return;}
    const learned=p.learnedSkills||[],next=cultivation.requirements.findIndex((_,i)=>!learned[i]);
    const main=card('Hành trình chính',!p.tutorial?'Di chuyển quanh sân và gặp Sư phụ để nhập môn.':next>=0?'Chiêu tiếp theo: '+combatNames[P.ap.w][next]+' · cần '+R[cultivation.requirements[next].realm]+' '+cultivation.requirements[next].stage+'.':'Đã học đủ bốn kỹ năng. Tiếp tục luyện kỹ năng, săn bộ đồ và phối hợp đạo hữu.',
      cultivation.realmName()+' · Đạo hạnh '+Math.floor(P.xp)+'/'+need(),cultivation.overview,'Xem tu luyện');
    if(next>=0&&p.tutorial)button('Tới Truyền Công Các',trainer,main).disabled=!safe;
    const q=p.sectQuest||{status:'none',kills:0};
    card('Bài tập nhập môn','Hạ 3 yêu thú sau khi nhận bài từ Sư phụ. Thưởng 35 Linh Thạch +20 đạo hạnh.',q.status==='claimed'?'Đã nhận thưởng':q.status==='active'?'Tiến độ '+Math.min(3,q.kills||0)+'/3':'Chưa nhận bài tập',()=>{const home=world.sectMapFor(P.ap.w);if(world.state.scene!==home)travel(home);if(world.state.scene===home)world.handleService('mentor');},'Gặp Sư phụ',!safe);
    card('Luyện công · Linh Mạch Cốc','Quái cho Linh Nguyên x2, đạo hạnh nhiều hơn 20%, nhưng khỏe hơn 15%. Dùng nguyên liệu luyện đan và cường hóa.',p.tutorial?'Đã mở · quái chung, có thể tổ đội':'Cần hoàn thành nhập môn',()=>travel('valley'),'Đến Linh Mạch Cốc',!p.tutorial||!safe);
    const level=cultivationLevel();
    card('Vân Hải Bí Cảnh','3 đợt + Hộ Pháp. Thắng: '+(120+level*4)+' Linh Thạch, '+(30+Math.floor(level/2))+' Linh Nguyên, 1 Đột Phá Đan, 3 mảnh và 1 món bộ.','Đang săn '+equipmentSets.focus().name+' · '+(p.riftClears||0)+' lần thắng'+(p.riftPendingItem?' · Có trang bị chờ nhận':''),spiritRift.open,'Xem bí cảnh',!safe||!p.tutorial);
    card('Đấu trường · 30 lượt','2 lượt/ngày; vào là tiêu lượt. Mỗi 5 lượt có thủ lĩnh; hoàn thành thêm 300 Linh Thạch.','Đã thắng '+(p.arenaClears||0)+' lần',()=>world.openArena(),'Kiểm tra lượt',!safe||!p.tutorial);
    const boss=communityGame.state.boss||communityGame.state.social?.worldBoss;
    card('Boss thế giới · Huyết Ma','Hợp lực, né vùng đỏ và góp đủ sát thương. Mỗi người đủ điều kiện nhận rương 250 Linh Thạch +60 Linh Nguyên +5 mảnh.',boss?(boss.respawn>0?'Tái xuất sau '+Math.ceil(boss.respawn)+' giây':'Đang xuất hiện · '+Math.ceil(boss.hp)+'/'+boss.maxHp+' HP'):'Mở chi tiết để cập nhật trạng thái boss',()=>communityGame.open('boss'),'Boss & Rương',!p.tutorial);
    const guild=communityGame.state.social?.guild;
    card('Tổ đội & Tông môn','Lập đội tối đa 4 người. Nhiệm vụ tông môn mỗi ngày: 20 quái chung và 1 boss thế giới; nhận thưởng tại nơi an toàn.',guild?guild.name+' · Hôm nay '+guild.tasks.kills+'/20 quái · '+guild.tasks.bosses+'/1 boss':'Chưa có tông môn hoặc đang cập nhật',()=>communityGame.open(),'Mở Đạo hữu');
    card('Mục tiêu trang bị','Chọn một bộ để săn; đủ 6 mảnh đổi đúng slot còn thiếu. Thưởng bộ 2/4/6 món có thể phối; full cường hóa +9/+11/+13/+15 thêm 5/10/15/20%.',(p.riftShards||0)+' mảnh bí cảnh · Túi '+p.bag.length+'/30',equipmentSets.open,'Chọn bộ & Đổi món');
  }
  function openAuto(){if(!P.ap||paused())return;const settings=autoCombat.plans(),plan=settings[settings.active];
    d.show('Chiến pháp · Combo Auto','Chạm chiêu để bật/tắt · ↑ ↓ để xếp combo.');menu();
    tabs([['Luyện công'+(settings.active==='farm'?' ✓':''),()=>{autoCombat.configure({active:'farm'});openAuto();}],['Săn boss'+(settings.active==='boss'?' ✓':''),()=>{autoCombat.configure({active:'boss'});openAuto();}]]);
    const toggle=(text,value,change)=>{const b=button((value?'✓ ':'○ ')+text,()=>{change(!value);openAuto();});b.setAttribute('aria-pressed',String(value));return b;};
    toggle('Tự đổi chiến pháp theo mục tiêu',settings.automatic,value=>autoCombat.configure({automatic:value}));
    visualUI.details('Tự đổi bộ theo quái thường hoặc boss. Ưu tiên mục tiêu lấy từ bộ đang chọn. Auto vẫn cần học chiêu, đủ mana và hết hồi chiêu.',$('world-content'),'Quy tắc Auto');
    const label=document.createElement('label');label.className='journal-field';label.textContent='Ưu tiên mục tiêu';const select=document.createElement('select');select.id='auto-target-priority';select.setAttribute('aria-label','Ưu tiên mục tiêu');for(const [value,text]of Object.entries(priorityNames)){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);}select.value=plan.priority;select.onchange=()=>{autoCombat.configure({plan:{priority:select.value}});};label.append(select);$('world-content').append(label);
    toggle('Đánh thường',plan.basic,value=>autoCombat.configure({plan:{basic:value}}));
    const list=document.createElement('ol');list.id='auto-skill-order';$('world-content').append(list);
    plan.order.forEach((i,index)=>{const row=document.createElement('li'),name=combatNames[P.ap.w][i];row.dataset.skill=String(i);row.append(visualUI.skillArt(P.ap.w,i));const b=button((plan.skills[i]?'✓ ':'○ ')+(i+1)+'. '+name,()=>{const skills=plan.skills.slice();skills[i]=!skills[i];autoCombat.configure({plan:{skills}});openAuto();},row);b.setAttribute('aria-pressed',String(plan.skills[i]));b.title='Hồi '+combatBalance.cooldowns(P.ap.w)[i]+'s · '+combatMana[P.ap.w][i]+' MP';
      for(const [delta,text]of [[-1,'↑'],[1,'↓']]){const move=button(text,()=>{const order=plan.order.slice(),to=index+delta;[order[index],order[to]]=[order[to],order[index]];autoCombat.configure({plan:{order}});openAuto();},row);move.disabled=index+delta<0||index+delta>=4;move.setAttribute('aria-label',(delta<0?'Đưa lên: ':'Đưa xuống: ')+name);}list.append(row);});
    visualUI.details('Bộ Săn boss mặc định giữ skill 2 để bạn chủ động né. Auto không tự né vùng đỏ. Chiêu chưa sẵn sàng được bỏ qua để dùng chiêu sau.',$('world-content'),'Né boss');
    toggle('Tự dùng đan hồi phục trong túi',plan.potions,value=>autoCombat.configure({plan:{potions:value}}));
    for(const [key,text]of [['hp','Dùng thuốc khi HP dưới'],['mp','Dùng thuốc khi MP dưới']]){const field=document.createElement('label');field.className='journal-field';field.textContent=text;const input=document.createElement('select');input.setAttribute('aria-label',text);for(let n=1;n<=8;n++){const o=document.createElement('option');o.value=String(n/10);o.textContent=n*10+'%';input.append(o);}input.value=String(plan[key]);input.onchange=()=>autoCombat.configure({plan:{[key]:Number(input.value)}});field.append(input);$('world-content').append(field);}
    button(autoCombat.state.enabled?'Tắt Auto':'Bật Auto và trở lại',()=>{const enabled=autoCombat.toggle();if(enabled)d.close();else openAuto();});
  }
  const fold=text=>String(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
  function entries(){const result=[];
    for(let c=0;c<4;c++){const profile=combatBalance.profiles[c];result.push({group:'skills',title:profile.basic.name,text:profile.name+' · Đánh thường · '+profile.basic.steps+' nhịp · '+profile.basic.interval+'s/đòn · Tầm '+profile.basic.range+'. '+profile.description,source:'Không tốn mana · dùng ngay khi tạo nhân vật.'});
      combatNames[c].forEach((name,i)=>{const req=cultivation.requirements[i],field=fieldRules[c],state=c===P.ap.w?(P.world.learnedSkills?.[i]?'Đã học · tu luyện '+(P.world.skillLevels?.[i]||0)+'/3':'Chưa học'):'Kỹ năng của '+profile.name;let detail=i===1?'Dịch chuyển / cơ động. Thi triển thành công cho 0,22s né đòn.':i===2?field.name+' · Bán kính '+field.radius+' · Tồn tại '+field.duration+'s · Chậm '+Math.round((1-field.slow)*100)+'%. '+profile.description:i===3?'Chiêu bộc phát. Chọn thời điểm boss kết thúc chiêu để phản công.':profile.description;
        result.push({group:'skills',title:name,text:profile.name+' · Ô '+(i+1)+' · Hồi '+profile.cooldowns[i]+'s · '+combatMana[c][i]+' MP. '+detail,source:R[req.realm]+' '+req.stage+' · Học '+req.cost+' Linh Thạch tại Truyền Công Các · '+state});});}
    const statNames={atk:'Công',hp:'HP',mp:'MP',armor:'Giáp',crit:'Bạo',dodge:'Né',skill:'Sát thương skill'};
    for(const item of inventory.templates){const stats=Object.entries(statNames).filter(([key])=>item[key]).map(([key,label])=>label+' +'+(['crit','dodge','skill'].includes(key)?Math.round(item[key]*100)+'%':item[key])).join(' · ');let source;
      if(item.source==='rift')source='Vân Hải Bí Cảnh: chọn bộ tương ứng hoặc đổi 6 mảnh lấy slot chỉ định.';
      else if(item.type==='egg')source='Quà khởi hành một lần trong túi đồ. Ấp trong mục Linh thú.';
      else source=item.type==='consume'?'Bảo Khí Các · '+item.price+' Linh Thạch.':'Bảo Khí Các · '+item.price+' Linh Thạch; hoặc rơi ngẫu nhiên từ quái phù hợp cấp.';
      result.push({group:'items',title:item.name,text:'Cấp yêu cầu '+(item.req||0)+' · '+stats+' '+(item.desc||''),source});}
    for(const [id,map]of Object.entries(world.sectMaps))result.push({group:'maps',title:map.name,text:map.description||'Boss thế giới · mọi cảnh giới cùng tham gia.',source:id==='worldboss'?'Khác → Đạo hữu → Boss & Rương.':id==='hub'?'Truyền tống từ vùng an toàn sau nhập môn.':id==='valley'?'Linh Nguyên x2, đạo hạnh +20%, yêu thú khỏe hơn 15%.':'Bốn bãi Bắc / Đông / Nam / Tây · dùng trận truyền tống ở mép sân.'});
    for(const [i,mob]of T.entries())result.push({group:'monsters',title:mob.n,text:'Thông số gốc: '+mob.hp+' HP · Công '+mob.at+' · '+mob.xp+' đạo hạnh. Thực tế thay đổi theo tầng luyện công và hoạt động.',source:i===2?'Boss/thủ lĩnh: theo hoạt động tương ứng; né vùng báo chiêu.':'Bãi luyện công và Linh Mạch Cốc · quái chung hồi sau 8s.'});
    for(const pet of Object.values(buildCatalog.pets))result.push({group:'pets',title:pet.name,text:pet.description+' Hồi '+pet.cooldown+'s'+(pet.range?' · Tầm '+pet.range:'.'),source:'Ấp trứng trong túi. Chọn một pet xuất chiến ở Khác → Linh thú. Hồi chiêu dùng chung giữa các pet.'});
    return result;
  }
  function openCodex(group='all',query=''){if(!P.ap||paused())return;d.show('Bách khoa · Tiên Lộ','Chạm Chi tiết để xem chỉ số và nguồn nhận.');menu();
    const input=document.createElement('input');input.id='journal-search';input.type='search';input.placeholder='Tìm kỹ năng, trang bị, quái, bản đồ…';input.setAttribute('aria-label','Tìm trong bách khoa');input.value=query;$('world-content').append(input);
    let offset=0;const pageSize=12;
    const filters=document.createElement('nav');filters.className='journal-tabs';filters.setAttribute('aria-label','Loại tra cứu');$('world-content').append(filters);for(const [id,text]of [['all','Tất cả'],['skills','Kỹ năng'],['items','Vật phẩm'],['maps','Bản đồ'],['monsters','Yêu thú'],['pets','Linh thú']]){const b=button(text,()=>{group=id;offset=0;render();},filters);b.dataset.group=id;}
    const count=document.createElement('p'),list=document.createElement('div');list.id='journal-results';count.setAttribute('role','status');$('world-content').append(count,list);const data=entries();
    const pager=document.createElement('nav');pager.className='journal-tabs';pager.setAttribute('aria-label','Trang tra cứu');$('world-content').append(pager);
    function render(){const term=fold(input.value.trim()),matches=data.filter(e=>(group==='all'||e.group===group)&&fold(e.title+' '+e.text+' '+e.source).includes(term));count.textContent=matches.length+' kết quả · Trang '+(Math.floor(offset/pageSize)+1)+'/'+Math.max(1,Math.ceil(matches.length/pageSize));list.replaceChildren();for(const b of filters.children)b.setAttribute('aria-pressed',String(b.dataset.group===group));for(const item of matches.slice(offset,offset+pageSize)){const box=document.createElement('article');box.className='journal-card';const title=document.createElement('h3');title.textContent=item.title;const template=inventory.templates.find(t=>t.name===item.title);let image;
      if(template){image=visualUI.art(inventory.itemIcon(template));visualUI.chips([['Cấp',template.req||0],['Phẩm',template.rarity]],box);}
      else if(item.group==='skills'){for(let c=0;c<4;c++){const i=combatNames[c].indexOf(item.title);if(i>=0){image=visualUI.skillArt(c,i);visualUI.chips([['Hồi',combatBalance.cooldowns(c)[i]+'s'],['MP',combatMana[c][i]]],box);break;}}}
      else if(item.group==='monsters'){const t=T.find(t=>t.n===item.title);if(t){image=visualUI.art(spriteCatalog.monsterFrames[t.skin][0][0].src);visualUI.chips([['HP',t.hp],['Công',t.at]],box);}}
      else if(item.group==='maps')image=visualUI.art('MAP/sprites/portal.png');
      else if(item.group==='pets'){const species=Object.keys(buildCatalog.pets).find(k=>buildCatalog.pets[k].name===item.title);image=visualUI.art(spriteCatalog.monsterFrames[species][0][0].src);}
      if(image)box.prepend(image);box.prepend(title);visualUI.details(item.text+' '+item.source,box);list.append(box);}
      pager.replaceChildren();button('← Trước',()=>{offset=Math.max(0,offset-pageSize);render();},pager).disabled=offset===0;button('Sau →',()=>{offset+=pageSize;render();},pager).disabled=offset+pageSize>=matches.length;
    }
    input.oninput=()=>{offset=0;render();};render();
  }
  for(const [id,label,fn]of [['activities-button','Tiên Đồ',open],['auto-plan-button','Chiến pháp',openAuto],['codex-button','Bách khoa',()=>openCodex()]]){const b=button(label,()=>{if(!paused())fn();},$('bt'));b.id=id;}
  const objective=$('journey-objective');objective.setAttribute('role','button');objective.tabIndex=0;objective.setAttribute('aria-label','Mở Tiên Đồ và hoạt động');objective.onclick=open;objective.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}};
  const style=document.createElement('style');style.textContent='.journal-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0}.journal-tabs button{flex:1;min-width:80px;font-size:11px!important}.journal-card{border:1px solid #567578;border-radius:12px;background:linear-gradient(135deg,#203b40,#142a34);padding:14px;margin:12px 0;overflow-wrap:anywhere}.journal-card h3{color:#f0d89c;font-size:15px;margin:0 0 8px}.journal-card p{font-size:12px;line-height:1.6;margin:6px 0}.journal-card small{display:block;color:#a7d9c5;line-height:1.5}.journal-card button{margin-top:10px}.journal-field{display:flex;align-items:center;gap:10px;justify-content:space-between;margin:12px 0;font-size:12px}.journal-field select,#journal-search{box-sizing:border-box;max-width:100%;padding:10px;background:#102833;color:#e3eee2;border:1px solid #658482;border-radius:8px}#journal-search{width:100%}#auto-skill-order{padding:0;list-style:none}#auto-skill-order li{display:flex;gap:5px;margin:8px 0}#auto-skill-order li button:first-child{flex:1;min-width:0;font-size:12px}#auto-skill-order li button:not(:first-child){width:38px;flex-shrink:0;padding:6px}#world-content button[aria-pressed=true]{border-color:#b4da9e;background:#294b42}#journey-objective{cursor:pointer;pointer-events:auto}#journey-objective:focus-visible{outline:2px solid #e8cd88}@media(max-width:500px){.journal-field{align-items:flex-start;flex-direction:column}.journal-field select{width:100%}.journal-card{padding:11px}}';document.head.append(style);
  window.cultivatorJournal={open,openAuto,openCodex,entries};
})();
