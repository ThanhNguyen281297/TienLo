/* A guide to the real game systems: no parallel rewards, inventory or combat rules. */
(function(){
  const world=worldMap,d=world.dialog;
  const priorityNames={nearest:'Gần nhất',boss:'Ưu tiên boss / thủ lĩnh',mobs:'Chỉ quái thường',weak:'Tỉ lệ máu thấp nhất'};
  const button=(label,fn,parent=$('world-content'))=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;parent.append(b);return b;};
  function tabs(entries){const bar=document.createElement('nav');bar.className='journal-tabs';bar.setAttribute('aria-label','Mục sổ tay');$('world-content').append(bar);for(const [label,fn]of entries)button(label,fn,bar);}
  function card(title,text,status,action,label='Xem chi tiết',disabled=false){
    const ui=visualUI,p=world.progress(),level=cultivationLevel();
    const key=title.includes('Bí Cảnh')?'portal':title.includes('Đấu trường')?'arena':title.includes('Huyết Ma')?'tower':title.includes('Tông môn')?'palace':title.includes('trang bị')?'forge':title.includes('Linh Mạch')?'garden':title.includes('nhập môn')?'school':'statue';
    const {card:box,body}=ui.panel(title,'Map/sprites/'+key+'.png',$('activity-grid')||$('world-content'));
    if(title==='Hành trình chính'){ui.meter(P.levelXp,characterProgression.required(characterLevel()),'EXP · Cấp '+characterLevel(),body);ui.meter(Math.floor(P.xp),need(),'Tu vi',body);}
    else if(title==='Bài tập nhập môn'){const q=p.sectQuest||{};ui.meter(q.status==='claimed'?3:q.kills||0,3,'Yêu thú',body);ui.chips([['◈',35],['EXP',20],['Tu vi',20]],body);}
    else if(title.includes('Linh Mạch'))ui.chips([['Linh Nguyên','×2'],['EXP / tu vi','+20%']],body);
    else if(title.includes('Bí Cảnh'))ui.chips([['◈',120+level*4]],body);
    else if(title.includes('Đấu trường'))ui.chips([['Lượt/ngày',2],['Đợt',30],['◈',300]],body);
    else if(title.includes('Huyết Ma'))ui.chips([['◈',250],['Linh Nguyên',60]],body);
    else if(title.includes('Tông môn'))ui.chips([['Đội','4'],['Nhiệm vụ/ngày',2]],body);
    body.append(ui.node('p','visual-note',status));
    if(action)ui.action(body,label,action,disabled);ui.details(text,body);return body;
  }
  function menu(){tabs([['Hoạt động',open],['Combo Auto',openAuto]]);}
  function travel(id){if(!world.progress().tutorial||!world.isSafe(P)||world.state.scene==='arena')return msg('Về đài an toàn và hoàn thành nhập môn trước khi truyền tống.');world.travel(id);}
  function trainer(){if(world.state.scene!=='hub'){travel('hub');if(world.state.scene!=='hub')return;}cultivation.openTrainer();}
  function open(){if(!P.ap||paused())return;
    const p=world.progress(),safe=world.isSafe(P)&&world.state.scene!=='arena',run=spiritRift.state()||world.arenaRun();
    d.show('Tiên Đồ · Hoạt động','Chọn hoạt động → chiến đấu → nhận thưởng.');menu();
    const grid=document.createElement('div');grid.className='visual-grid';grid.id='activity-grid';$('world-content').append(grid);
    if(run){card('Đang trong thử thách','Hoàn thành hoặc rời lượt hiện tại trước khi vào hoạt động khác.','Mở menu không kết thúc lượt.');button('Trở lại chiến đấu',d.close);return;}
    const learned=p.learnedSkills||[],next=cultivation.requirements.findIndex((_,i)=>!learned[i]);
    const main=card('Hành trình chính',!p.tutorial?'Di chuyển quanh sân và gặp Sư phụ để nhập môn.':next>=0?'Chiêu tiếp theo: '+combatNames[P.ap.w][next]+' · cần '+R[cultivation.requirements[next].realm]+' '+cultivation.requirements[next].stage+'.':'Đã học đủ bốn kỹ năng. Tiếp tục luyện kỹ năng, cường hóa trang bị và phối hợp đạo hữu.',
      'Cấp '+characterLevel()+' · '+cultivation.realmName()+' · Tu vi '+Math.floor(P.xp)+'/'+need(),inventory.openAttrs,'Thuộc tính');
    if(next>=0&&p.tutorial)button('Tới Truyền Công Các',trainer,main).disabled=!safe;
    const q=p.sectQuest||{status:'none',kills:0};
    card('Bài tập nhập môn','Hạ 3 yêu thú sau khi nhận bài từ Sư phụ. Thưởng 35 Linh Thạch, 20 EXP và 20 tu vi.',q.status==='claimed'?'Đã nhận thưởng':q.status==='active'?'Tiến độ '+Math.min(3,q.kills||0)+'/3':'Chưa nhận bài tập',()=>{const home=world.sectMapFor(P.ap.w);if(world.state.scene!==home)travel(home);if(world.state.scene===home)world.handleService('mentor');},'Gặp Sư phụ',!safe);
    card('Luyện công · Linh Mạch Cốc','Quái cho Linh Nguyên x2, EXP và tu vi nhiều hơn 20%, nhưng khỏe hơn 15%. Dùng nguyên liệu luyện đan và cường hóa.',p.tutorial?'Đã mở · quái chung, có thể tổ đội':'Cần hoàn thành nhập môn',()=>travel('valley'),'Đến Linh Mạch Cốc',!p.tutorial||!safe);
    const level=cultivationLevel();
    card('Vân Hải Bí Cảnh','3 đợt + Hộ Pháp. Thắng: '+(120+level*4)+' Linh Thạch.',(p.riftClears||0)+' lần thắng',spiritRift.open,'Xem bí cảnh',!safe||!p.tutorial);
    card('Đấu trường · 30 lượt','2 lượt/ngày; vào là tiêu lượt. Mỗi 5 lượt có thủ lĩnh; hoàn thành thêm 300 Linh Thạch.','Đã thắng '+(p.arenaClears||0)+' lần',()=>world.openArena(),'Kiểm tra lượt',!safe||!p.tutorial);
    const boss=communityGame.state.boss||communityGame.state.social?.worldBoss;
    card('Boss thế giới · Huyết Ma','Hợp lực, né vùng đỏ và góp đủ sát thương. Mỗi người đủ điều kiện nhận rương 250 Linh Thạch +60 Linh Nguyên.',boss?(boss.respawn>0?'Tái xuất sau '+Math.ceil(boss.respawn)+' giây':'Đang xuất hiện · '+Math.ceil(boss.hp)+'/'+boss.maxHp+' HP'):'Mở chi tiết để cập nhật trạng thái boss',()=>communityGame.open('boss'),'Boss & Rương',!p.tutorial);
    const guild=communityGame.state.social?.guild;
    card('Tổ đội & Tông môn','Lập đội tối đa 4 người. Nhiệm vụ tông môn mỗi ngày: 20 quái chung và 1 boss thế giới; nhận thưởng tại nơi an toàn.',guild?guild.name+' · Hôm nay '+guild.tasks.kills+'/20 quái · '+guild.tasks.bosses+'/1 boss':'Chưa có tông môn hoặc đang cập nhật',()=>communityGame.open(),'Mở Đạo hữu');
    card('Trang bị','4 ô trái theo class và cường hóa +15. 4 ô phải dùng chung; pháp bảo và thuẫn được tẩy luyện.','Túi '+p.bag.length+'/'+equipmentData.capacity(p),inventory.openBag,'Mở hành trang');
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
  for(const [id,label,fn]of [['activities-button','Tiên Đồ',open],['auto-plan-button','Chiến pháp',openAuto]]){const b=button(label,()=>{if(!paused())fn();},$('bt'));b.id=id;}
  const objective=$('journey-objective');objective.setAttribute('role','button');objective.tabIndex=0;objective.setAttribute('aria-label','Mở Tiên Đồ và hoạt động');objective.onclick=open;objective.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}};
  const style=document.createElement('style');style.textContent='.journal-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0}.journal-tabs button{flex:1;min-width:80px;font-size:11px!important}.journal-card{border:1px solid #567578;border-radius:12px;background:linear-gradient(135deg,#203b40,#142a34);padding:14px;margin:12px 0;overflow-wrap:anywhere}.journal-card h3{color:#f0d89c;font-size:15px;margin:0 0 8px}.journal-card p{font-size:12px;line-height:1.6;margin:6px 0}.journal-card small{display:block;color:#a7d9c5;line-height:1.5}.journal-card button{margin-top:10px}.journal-field{display:flex;align-items:center;gap:10px;justify-content:space-between;margin:12px 0;font-size:12px}.journal-field select{box-sizing:border-box;max-width:100%;padding:10px;background:#102833;color:#e3eee2;border:1px solid #658482;border-radius:8px}#auto-skill-order{padding:0;list-style:none}#auto-skill-order li{display:flex;gap:5px;margin:8px 0}#auto-skill-order li button:first-child{flex:1;min-width:0;font-size:12px}#auto-skill-order li button:not(:first-child){width:38px;flex-shrink:0;padding:6px}#world-content button[aria-pressed=true]{border-color:#b4da9e;background:#294b42}#journey-objective{cursor:pointer;pointer-events:auto}#journey-objective:focus-visible{outline:2px solid #e8cd88}@media(max-width:500px){.journal-field{align-items:flex-start;flex-direction:column}.journal-field select{width:100%}.journal-card{padding:11px}}';document.head.append(style);
  window.cultivatorJournal={open,openAuto};
})();
