/* Túi đồ · thuộc tính · trang bị: rơi đồ, mua/bán, cộng điểm tu luyện. */
(function () {
  const world = window.worldMap, dialog = world.dialog;
  const SLOTS = equipmentRules.slots;
  const RARITY = {
    pham: { name: 'Thường', color: '#d4cbb6' },
    huyen: { name: 'Hiếm', color: '#70df9c' },
    linh: { name: 'Cực hiếm', color: '#6fc8ff' },
    tien: { name: 'Siêu phẩm', color: '#cf9cff' },
    than: { name: 'Thần phẩm', color: '#ffcc70' }
  };
  // id, slot/type, chỉ số, yêu cầu cultivationLevel, giá mua.
  const TEMPLATES = [
    {id:'hoi-huyet-dan',type:'consume',name:'Hồi Huyết Đan',rarity:'pham',price:12,heal:80,desc:'Hồi 80 khí huyết.'},
    {id:'hoi-linh-dan',type:'consume',name:'Hồi Linh Đan',rarity:'pham',price:12,mana:40,desc:'Hồi 40 linh lực.'},
    {id:'tu-vi-dan',type:'consume',name:'Tu Vi Đan',rarity:'huyen',price:25,xp:30,desc:'+30 đạo hạnh.'}
  ];
  for(const [species,name] of [['BoNgua','Linh Đường Lang'],['Tho','Nguyệt Thố'],['Nhen','Huyết Nhện'],['Doi','Băng Dực Dơi']])TEMPLATES.push({id:'egg-'+species,type:'egg',species,name:'Trứng '+name,rarity:'huyen',price:0,desc:'Ấp để nở linh thú '+name+'.'});
  TEMPLATES.push(...equipmentData.templates,...equipmentData.materials);
  const BY_ID = Object.fromEntries(TEMPLATES.map(t => [t.id, t]));
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'it-' + Date.now() + '-' + Math.floor(Math.random() * 1e9));

  function progress() {
    const p = world.progress();
    p.attrs = p.attrs || { luc: 0, the: 0, nhanh: 0, linh: 0 };
    p.attrPoints = p.attrPoints ?? 0;
    p.bag = p.bag || [];
    p.equip = p.equip || { vukhi: null, daobao: null, ngoc: null, gioi: null, giay: null, phapbao: null };
    return P.ap?equipmentData.normalize(p):p;
  }
  function makeItem(id, qty = 1) {
    const t = BY_ID[equipmentData.canonicalId(id)];
    if (!t) return null;
    const item = Object.assign({}, t);
    item.uid = uid();
    if(equipmentData.pool(item).length)item.affixes=equipmentData.defaults(item);
    if (['consume','egg'].includes(item.type)) item.qty = qty;
    return item;
  }
  function addItem(id, qty = 1) {
    const p = progress(), t = BY_ID[equipmentData.canonicalId(id)];
    if (!t) return null;
    if (['consume','egg'].includes(t.type)) {
      const found = p.bag.find(i => i.id === id);
      if (found) { found.qty = (found.qty || 1) + qty; saveCharacter(); return found; }
    }
    // Sức chứa phụ thuộc nhẫn đang trang bị.
    const slots = p.bag.length;
    if (slots >= equipmentData.capacity(p)) { msg('Túi đã đầy. Trang bị nhẫn trữ vật hoặc dọn túi.'); return null; }
    const item = makeItem(id, qty);
    p.bag.push(item);
    saveCharacter();
    return item;
  }
  function statText(t) {
    if(window.equipmentProgression&&t.slot){const original=t;t={...t};for(const key of ['atk','hp','mp','armor','crit','dodge','skill'])t[key]=equipmentProgression.stat(original,key);}
    const parts = [];
    if(t.options?.length)parts.push('Option: '+t.options.map(o=>({atk:'Công',hp:'HP',mp:'MP',armor:'Giáp',crit:'Bạo kích',dodge:'Né'}[o.key])+' +'+(['crit','dodge'].includes(o.key)?(o.value/10)+'%':o.value)).join(' / '));
    if (t.atk) parts.push('Công+' + t.atk);
    if (t.hp) parts.push('Máu+' + t.hp);
    if (t.mp) parts.push('Linh+' + t.mp);
    if (t.armor) parts.push('Giáp+' + t.armor);
    if (t.crit) parts.push('Bạo+' + Math.round(t.crit * 100) + '%');
    if (t.dodge) parts.push('Né+' + Math.round(t.dodge * 100) + '%');
    if (t.skill) parts.push('Skill+' + Math.round(t.skill * 100) + '%');
    if (t.heal) parts.push('Hồi ' + t.heal + ' máu');
    if (t.mana) parts.push('Hồi ' + t.mana + ' linh');
    if (t.xp) parts.push('+' + t.xp + ' đạo hạnh');
    if(t.slot==='gioi')parts.push('Túi +'+(equipmentData.byId.get(t.id)?.capacity||0)+' ô');
    if (t.req) parts.push('Yêu cầu cấp ' + t.req);
    return parts.join(' · ');
  }
  // Tổng chỉ số từ thuộc tính + trang bị, dùng bởi 01-core (mhp/mmp/atk) và skill.
  window.bonusStats = function () {
    try {
      const p = progress(), a = p.attrs || { luc: 0, the: 0, nhanh: 0, linh: 0 };
      let atk = (a.luc || 0) * 2, hp = (a.the || 0) * 15, mp = (a.linh || 0) * 8;
      let armor = Math.floor((a.the || 0) / 5), crit = (a.nhanh || 0) * 0.006, dodge = (a.nhanh || 0) * 0.004, skill = (a.linh || 0) * 0.005;
      for (const slot of Object.keys(SLOTS)) {
        const it = p.equip && p.equip[slot];
        if (!it) continue;
        atk += window.equipmentProgression?equipmentProgression.stat(it,'atk'):(it.atk||0); hp += window.equipmentProgression?equipmentProgression.stat(it,'hp'):(it.hp||0); mp += window.equipmentProgression?equipmentProgression.stat(it,'mp'):(it.mp||0); armor += window.equipmentProgression?equipmentProgression.stat(it,'armor'):(it.armor||0);
        crit += window.equipmentProgression?equipmentProgression.stat(it,'crit'):(it.crit||0); dodge += window.equipmentProgression?equipmentProgression.stat(it,'dodge'):(it.dodge||0); skill += window.equipmentProgression?equipmentProgression.stat(it,'skill'):(it.skill||0);
      }
      return { atk, hp, mp, armor, crit: Math.min(0.35, crit), dodge: Math.min(0.2, dodge), skill };
    } catch (e) { return { atk: 0, hp: 0, mp: 0, armor: 0, crit: 0, dodge: 0, skill: 0 }; }
  };
  // Linh + đồ tăng sát thương skill, cộng dồn với tu luyện 8%/cấp.
  if (window.skillPower) {
    const basePower = window.skillPower;
    window.skillPower = (index, power) => basePower(index, power) * (1 + (window.bonusStats().skill || 0));
  }
  // Bạo kích + rơi đồ khi hạ quái.
  const baseHit = hit;
  hit = function (e, power) {
    const alive = e && !e.dead && e.hp > 0;
    let final = power;
    try {
      if (alive && e && E.includes(e) && !e.rewardReplay && !window.petCombat?.dealing) {
        const c = Math.min(0.35, window.bonusStats().crit || 0);
        if (Math.random() < c) {
          final = power * (1.6+(window.bonusStats().critDamage||0));
          e.criticalHit=true;
        }
      }
    } catch (err) {}
    baseHit(e, final);
    if(e)e.criticalHit=false;
    try {
      if (alive && e.hp <= 0 && e.worldMap && !e.arena) rollDrop(e);
      else if (alive && e.hp <= 0 && e.arena) rollDrop(e, true);
    } catch (err) {}
  };
  function grantThangViDan(n, e) {
    const p = progress();
    p.thangViDan = (p.thangViDan || 0) + n;
    saveCharacter();
    try { fx(e.x, e.y - 52, '+' + n + ' Thăng Vị Đan', '#ffd23a'); } catch (err) {}
    msg('Nhặt được ' + n + ' Thăng Vị Đan! (đang có ' + p.thangViDan + ')');
  }
  function rollDrop(e, arena = false) {
    // Shared training drops and dungeon fragments are issued by the server.
    // Solo challenges retain their own currency rewards, never random equipment.
    return;
  }
  function equipItem(itemUid) {
    const p = progress();
    const idx = p.bag.findIndex(i => i.uid === itemUid);
    if (idx < 0) return;
    const item = p.bag[idx];
    if (!item.slot) return msg('Vật phẩm này không trang bị được.');
    if (!window.gmTest?.enabled && characterLevel() < (item.req || 0)) return msg('Cần cấp nhân vật ' + item.req + ' để mặc ' + item.name + '.');
    if(!equipmentRules.sharedSlots.includes(item.slot)&&item.classIndex!==undefined&&item.classIndex!==P.ap.w)return msg('Trang bị thuộc tông môn khác.');
    const gender=equipmentData.byId.get(item.id)?.gender;
    if(gender&&gender!==(P.ap.gender||'Nam'))return msg('Mặt nạ dành cho nhân vật '+(gender==='Nu'?'nữ':'nam')+'.');
    const nextCapacity=item.slot==='gioi'?30+(equipmentData.byId.get(item.id)?.capacity||0):equipmentData.capacity(p);
    if(p.bag.length-1+(p.equip[item.slot]?1:0)>nextCapacity)return msg('Nhẫn mới không đủ sức chứa. Hãy dọn túi trước.');
    p.bag.splice(idx, 1);
    const old = p.equip[item.slot];
    if (old) p.bag.push(old);
    p.equip[item.slot] = item;
    window.characterMasks?.refreshAvatar();
    P.hp = Math.min(mhp(), P.hp); P.mp = Math.min(mmp(), P.mp);
    saveCharacter(); openBag();
  }
  function unequip(slot) {
    const p = progress();
    const old = p.equip[slot];
    if (!old) return;
    if (p.bag.length+1 > (slot==='gioi'?30:equipmentData.capacity(p))) return msg('Túi không đủ chỗ sau khi tháo nhẫn/trang bị.');
    p.equip[slot] = null;
    window.characterMasks?.refreshAvatar();
    p.bag.push(old);
    P.hp=Math.min(mhp(),P.hp);P.mp=Math.min(mmp(),P.mp);
    saveCharacter(); openBag();
  }
  function useItem(itemUid) {
    const p = progress();
    const item = p.bag.find(i => i.uid === itemUid);
    if (!item || item.type !== 'consume') return;
    if (item.id === 'hoi-huyet-dan') P.hp = Math.min(mhp(), P.hp + item.heal);
    else if (item.id === 'hoi-linh-dan') P.mp = Math.min(mmp(), P.mp + item.mana);
    else if (item.id === 'tu-vi-dan') P.xp = Math.min(need() * 3, P.xp + item.xp);
    item.qty = (item.qty || 1) - 1;
    if (item.qty <= 0) p.bag.splice(p.bag.indexOf(item), 1);
    saveCharacter(); openBag();
  }
  function sellItem(itemUid) {
    const p = progress();
    const idx = p.bag.findIndex(i => i.uid === itemUid);
    if (idx < 0) return;
    const item = p.bag[idx];
    const price = Math.max(1, Math.floor((item.price || 10) * 0.5)) * (item.qty || 1);
    P.gold += price;
    p.bag.splice(idx, 1);
    saveCharacter(); openBag(); msg('Bán ' + item.name + ' +' + price + ' ◈.');
  }
  function buyItem(id, reopen = true) {
    const t = BY_ID[equipmentData.canonicalId(id)];
    if (!t) return;
    if(t.slot)return msg('Trang bị được ghép từ mảnh hoặc đổi tại Sư môn.');
    const lvl = typeof cultivationLevel === 'function' ? cultivationLevel() : 0;
    if (lvl < (t.req || 0)) return msg('Cần cấp ' + t.req + '.');
    if (P.gold < t.price) return msg('Cần ' + t.price + ' ◈.');
    const item = addItem(id);
    if (!item) return;
    P.gold -= t.price;
    saveCharacter();
    msg('Mua ' + t.name + ' -' + t.price + ' ◈.');
    if (!reopen) return;
    try {
      const title = $('world-title').textContent || '';
      if (title.includes('Túi')) openBag();
      // Ở Bảo Khí Các: không reopen (tránh mất shop gốc), chỉ cập nhật mô tả vàng.
      else if (title.includes('Bảo Khí')) {
        try { $('world-description').textContent = 'Trang bị tăng sức chiến đấu. Linh Thạch: ' + P.gold + ' ◈'; } catch (e) {}
      }
    } catch (e) {}
  }
  const ATTR_INFO = {
    luc: { name: 'Lực', desc: '+2 công / điểm' },
    the: { name: 'Thể', desc: '+15 máu, +1 giáp mỗi 5 điểm' },
    nhanh: { name: 'Nhanh', desc: '+0.6% bạo, +0.4% né / điểm' },
    linh: { name: 'Linh', desc: '+8 linh lực, +0.5% skill / điểm' }
  };
  function openAttrs() {
    characterProgression.normalize();
    const p = progress(), b = window.bonusStats();
    dialog.show('Thuộc tính · Cấp '+characterLevel()+' · ' + (window.cultivation ? cultivation.realmName() : ''), 'Mỗi level +3 điểm. Điểm còn: ' + p.attrPoints);
    dialog.line('EXP '+P.levelXp+'/'+characterProgression.required(characterLevel())+' · Tu vi '+Math.floor(P.xp)+'/'+need());
    dialog.line('Công ' + Math.round(atk()) + ' · Máu ' + mhp() + ' · Linh ' + mmp() + ' · Bạo ' + Math.round(b.crit * 100) + '% · Né ' + Math.round(b.dodge * 100) + '% · Skill +' + Math.round(b.skill * 100) + '%');
    dialog.line('Hút máu '+((b.lifesteal||0)*100).toFixed(2)+'% · Hút linh lực '+((b.manasteal||0)*100).toFixed(2)+'% · Kháng '+((b.resist||0)*100).toFixed(2)+'% · Hồi máu '+(b.regen||0).toFixed(2)+'/s');
    const form=document.createElement('form'),inputs={},status=document.createElement('output'),apply=document.createElement('button');
    form.id='attribute-allocation';status.setAttribute('aria-live','polite');apply.type='submit';apply.textContent='Cộng điểm';
    const amount=key=>Number(inputs[key].value),total=()=>Object.keys(inputs).reduce((n,key)=>n+amount(key),0);
    function refreshDraft(){const sum=total(),valid=Object.entries(inputs).every(([key,input])=>input.value!==''&&Number.isInteger(amount(key))&&amount(key)>=0&&amount(key)<=1000-(p.attrs[key]||0));
      status.textContent=!valid?'Nhập số nguyên không âm.':sum>p.attrPoints?'Vượt '+(sum-p.attrPoints)+' điểm hiện có.':'Dùng '+sum+' · Còn '+(p.attrPoints-sum)+' điểm';
      apply.disabled=!valid||sum<=0||sum>p.attrPoints;}
    for (const key of ['luc', 'the', 'nhanh', 'linh']) {
      const info=ATTR_INFO[key],row=document.createElement('div'),label=document.createElement('label'),value=document.createElement('b'),hint=document.createElement('small'),input=document.createElement('input'),max=document.createElement('button');
      row.className='attribute-row';input.type='number';input.id='attribute-'+key;input.name=key;input.min=0;input.max=Math.min(p.attrPoints,1000-(p.attrs[key]||0));input.step=1;input.value='0';input.inputMode='numeric';input.required=true;input.disabled=p.attrPoints<=0;inputs[key]=input;
      label.htmlFor=input.id;value.textContent=info.name+' · '+(p.attrs[key]||0);hint.textContent=info.desc;label.append(value,hint);input.setAttribute('aria-label','Điểm cộng '+info.name);input.oninput=refreshDraft;
      max.type='button';max.textContent='Tối đa';max.disabled=input.disabled;max.setAttribute('aria-label','Cộng tối đa '+info.name);max.onclick=()=>{const other=total()-amount(key);input.value=String(Math.max(0,Math.min(1000-(p.attrs[key]||0),p.attrPoints-(Number.isFinite(other)?other:0))));refreshDraft();};
      row.append(label,input,max);form.append(row);
    }
    form.append(status,apply);$('world-content').append(form);refreshDraft();
    form.onsubmit=event=>{event.preventDefault();refreshDraft();if(apply.disabled||!form.reportValidity())return;
      const sum=total(),health=mhp(),mana=mmp();for(const key of Object.keys(inputs))p.attrs[key]=(p.attrs[key]||0)+amount(key);p.attrPoints-=sum;
      P.hp=Math.min(mhp(),P.hp+Math.max(0,mhp()-health));P.mp=Math.min(mmp(),P.mp+Math.max(0,mmp()-mana));saveCharacter();openAttrs();};
    dialog.action('Mở túi đồ', openBag);
  }
  let selectedUid=null;
  function itemIcon(item,slot) {
    const costume=window.characterWardrobe?.itemIcon(item);if(costume)return costume;
    const wornArt=equipmentData.appearance(item);if(wornArt)return artworkURL(wornArt);
    if(item?.art)return artworkURL(item.art);
    if(item?.slot==='ngoc'||slot==='ngoc')return artworkURL('Item/Thuan/'+(item?.variant||1)+'.png');
    if(item?.type==='egg'&&window.spiritPets)return spiritPets.eggIcon(item.species);
    if((item?.slot||slot)==='vukhi')return 'Item/VuKhi/'+characterClasses[P.ap.w].folder+'.png';
    const type=item?.type==='consume'?'consume':item?.slot||slot;
    const icons={daobao:'Item/Ao/daobao.png',chan:'Item/Chan/dai-v2.png',giay:'Item/Giay/giay.png',gioi:'Item/Nhan/gioi.png',consume:'Item/Consumable/consume.png',phapbao:characterEquipmentArt(P.ap.w,'lung'),phaptran:characterEquipmentArt(P.ap.w,'vong'),dichuyen:'Item/DiChuyen/1.png',matna:'Item/MatNa/slot.svg'};
    return artworkURL(icons[type]||'Item/Thuan/1.png');
  }
  function cells(p) {
    const used=new Set();
    for(const item of p.bag){if(!Number.isInteger(item.cell)||item.cell<0||item.cell>=equipmentData.capacity(p)||used.has(item.cell)){item.cell=Array.from({length:equipmentData.capacity(p)},(_,i)=>i).find(i=>!used.has(i));}used.add(item.cell);}
    return Array.from({length:equipmentData.capacity(p)},(_,i)=>p.bag.find(item=>item.cell===i)||null);
  }
  function moveToBag(source,index) {
    const p=progress();cells(p);
    if(source.startsWith('equip:')){
      const slot=source.slice(6),item=p.equip[slot];if(!item)return;
      if(p.bag.some(i=>i.cell===index))return msg('Chọn ô túi trống để tháo trang bị.');
      if(p.bag.length+1>(slot==='gioi'?30:equipmentData.capacity(p))||index>=(slot==='gioi'?30:equipmentData.capacity(p)))return msg('Không đủ ô sau khi tháo trang bị.');
      p.equip[slot]=null;item.cell=index;p.bag.push(item);
      window.characterMasks?.refreshAvatar();
      P.hp=Math.min(mhp(),P.hp);P.mp=Math.min(mmp(),P.mp);
    }else{
      const item=p.bag.find(i=>i.uid===source);if(!item)return;
      const other=p.bag.find(i=>i.cell===index);if(other)other.cell=item.cell;item.cell=index;
    }
    saveCharacter();openBag();
  }
  function dropItem(source,target) {
    if(target.dataset.bagCell!==undefined)return moveToBag(source,Number(target.dataset.bagCell));
    const slot=target.dataset.equipSlot;
    if(slot){const item=progress().bag.find(i=>i.uid===source);if(!item)return;if(item.slot!==slot){msg('Vật phẩm không phù hợp ô '+SLOTS[slot]+'.');return;}equipItem(source);}
  }
  function dragSource(button,source) {
    button.draggable=true;
    button.ondragstart=e=>{e.dataTransfer.setData('text/plain',source);e.dataTransfer.effectAllowed='move';};
    // Touch/pen dragging; taps still show the item details.
    button.addEventListener('pointerdown',event=>{
      if(event.pointerType==='mouse')return;
      const start={x:event.clientX,y:event.clientY};let moved=false,ghost=null;
      button.setPointerCapture(event.pointerId);
      const move=e=>{if(!moved&&Math.hypot(e.clientX-start.x,e.clientY-start.y)<12)return;moved=true;
        if(!ghost){ghost=button.cloneNode(true);ghost.className='item-drag-ghost';document.body.append(ghost);}
        ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';};
      const end=e=>{button.removeEventListener('pointermove',move);button.removeEventListener('pointerup',end);button.removeEventListener('pointercancel',cancel);ghost?.remove();if(moved){e.preventDefault();const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-bag-cell],[data-equip-slot]');if(target)dropItem(source,target);}};
      const cancel=e=>{button.removeEventListener('pointermove',move);button.removeEventListener('pointerup',end);button.removeEventListener('pointercancel',cancel);ghost?.remove();};
      button.addEventListener('pointermove',move);button.addEventListener('pointerup',end);button.addEventListener('pointercancel',cancel);
    });
  }
  function dropTarget(button) {
    button.ondragover=e=>{e.preventDefault();button.classList.add('drop-over');};
    button.ondragleave=()=>button.classList.remove('drop-over');
    button.ondrop=e=>{e.preventDefault();button.classList.remove('drop-over');dropItem(e.dataTransfer.getData('text/plain'),button);};
  }
  function openBag() {
    const p=progress(),b=window.bonusStats();
    dialog.show('Hành trang', 'Linh Thạch '+P.gold+' ◈ · '+p.bag.length+'/'+equipmentData.capacity(p)+' ô · Kéo vật phẩm vào ô trang bị hoặc chạm để xem.');
    const content=$('world-content');content.closest('section').classList.add('inventory-dialog');
    const layout=document.createElement('div');layout.className='inventory-layout';content.append(layout);
    const gear=document.createElement('section');gear.className='gear-panel';layout.append(gear);
    const heading=document.createElement('h3');heading.textContent=P.nm+' · '+sectName();gear.append(heading);
    const paper=document.createElement('div');paper.className='paper-doll';gear.append(paper);
    const preview=document.createElement('canvas');const density=Math.max(1.5,Math.min(3,devicePixelRatio||1));preview.width=Math.round(320*density);preview.height=Math.round(380*density);preview.className='gear-preview';paper.append(preview);
    const ctx=preview.getContext('2d');function paintPreview(){if(!preview.isConnected||!dialog.isOpen())return;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,preview.width,preview.height);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.setTransform(2.3*density,0,0,2.3*density,160*density,232*density);drawChar(ctx,0,0,0,1,false,tm*10,false,P.ap,characterClasses[P.ap.w].color);requestAnimationFrame(paintPreview);}paintPreview();
    Object.keys(SLOTS).forEach((slot,i)=>{
      const item=p.equip[slot],button=document.createElement('button');button.type='button';button.className='item-cell gear-slot gear-'+i;button.dataset.equipSlot=slot;button.style.setProperty('--rarity',RARITY[item?.rarity||'pham'].color);button.setAttribute('aria-label',SLOTS[slot]+': '+(item?.name||'trống'));
      const img=document.createElement('img');img.src=itemIcon(item,slot);img.alt='';button.append(img);
      const label=document.createElement('small');label.textContent=SLOTS[slot];button.append(label);
      if(item){button.classList.add('occupied');window.equipmentProgression?.decorate(button,item);dragSource(button,'equip:'+slot);button.onclick=()=>showDetails(item,true);}
      else button.onclick=()=>{const item=p.bag.find(i=>i.uid===selectedUid);if(item){if(item.slot!==slot)return msg('Chọn trang bị phù hợp '+SLOTS[slot]+'.');equipItem(item.uid);}};
      dropTarget(button);paper.append(button);
    });
    const stats=document.createElement('div');stats.className='gear-stats';stats.textContent='Công '+Math.round(atk())+' · Máu '+mhp()+' · Linh '+mmp()+' · Giáp '+Math.round(totalArmor(b))+' · Bạo '+Math.round(b.crit*100)+'%';gear.append(stats);
    const bag=document.createElement('section');bag.className='bag-panel';layout.append(bag);
    const toolbar=document.createElement('div');toolbar.className='bag-toolbar';bag.append(toolbar);
    const title=document.createElement('h3');title.textContent='Túi đồ';toolbar.append(title);
    const sort=document.createElement('button');sort.textContent='Sắp xếp';sort.onclick=()=>{const order={tien:0,linh:1,huyen:2,pham:3};p.bag.sort((a,b)=>(order[a.rarity]??9)-(order[b.rarity]??9)||a.name.localeCompare(b.name)).forEach((item,i)=>item.cell=i);saveCharacter();openBag();};toolbar.append(sort);
    const grid=document.createElement('div');grid.className='bag-grid';grid.setAttribute('aria-label',equipmentData.capacity(p)+' ô túi đồ');bag.append(grid);
    cells(p).forEach((item,i)=>{
      const button=document.createElement('button');button.type='button';button.className='item-cell';button.dataset.bagCell=i;button.setAttribute('aria-label',item?item.name:'Ô trống '+(i+1));dropTarget(button);
      if(item){button.classList.add('occupied');window.equipmentProgression?.decorate(button,item);button.dataset.itemId=item.id;button.style.setProperty('--rarity',RARITY[item.rarity].color);const img=document.createElement('img');img.src=itemIcon(item);img.alt='';button.append(img);
        if(item.qty>1){const qty=document.createElement('span');qty.className='item-qty';qty.textContent=item.qty;button.append(qty);}
        button.title=item.name+' · '+statText(item);button.onclick=()=>{selectedUid=item.uid;grid.querySelectorAll('.selected').forEach(b=>b.classList.remove('selected'));button.classList.add('selected');showDetails(item,false);};dragSource(button,item.uid);
      }else{const label=document.createElement('span');label.className='cell-index';label.textContent=i+1;button.append(label);}
      grid.append(button);
    });
    const details=document.createElement('div');details.className='item-details';details.setAttribute('aria-live','polite');bag.append(details);
    function showDetails(item,equipped){
      details.replaceChildren();
      const panel=document.createElement('div');panel.className='item-detail-panel';details.append(panel);
      // Header: icon + name + stars + meta
      const header=document.createElement('div');header.className='item-detail-header';panel.append(header);
      const iconBox=document.createElement('div');iconBox.className='item-detail-icon';header.append(iconBox);
      const iconImg=document.createElement('img');iconImg.src=itemIcon(item,item.slot);iconImg.alt='';iconBox.append(iconImg);
      const info=document.createElement('div');info.className='item-detail-info';header.append(info);
      const nameRow=document.createElement('div');nameRow.className='item-detail-name-row';info.append(nameRow);
      const name=document.createElement('h4');name.textContent=item.name;name.style.color=RARITY[item.rarity].color;nameRow.append(name);
      const rarityLabel=document.createElement('span');rarityLabel.className='rarity-label rarity-'+item.rarity+'-label';rarityLabel.textContent=RARITY[item.rarity].name;nameRow.append(rarityLabel);
      const enhance=document.createElement('span');enhance.className='item-detail-enhance';enhance.textContent=equipmentProgression.level(item)?'+'+equipmentProgression.level(item):'';nameRow.append(enhance);
      const stars=document.createElement('div');stars.className='item-detail-rarity-stars';info.append(stars);
      const starCount={'pham':1,'huyen':2,'linh':3,'tien':4,'than':5}[item.rarity]||1;
      for(let s=0;s<5;s++){const st=document.createElement('span');st.className='star'+(s<starCount?' filled':'');stars.append(st);}
      const meta=document.createElement('div');meta.className='item-detail-meta';info.append(meta);
      const slotLabel=document.createElement('span');slotLabel.className='meta-grade';slotLabel.textContent=SLOTS[item.slot]||item.type;meta.append(slotLabel);
      const gradeLabel=document.createElement('span');gradeLabel.className='meta-level';gradeLabel.textContent='Bậc '+(item.req||0);meta.append(gradeLabel);
      if(item.slot&&equipmentRules.enhanceSlots.includes(item.slot)){const lvlLabel=document.createElement('span');lvlLabel.className='meta-level';lvlLabel.textContent='Cường hóa '+(equipmentProgression.level(item)||0);meta.append(lvlLabel);}
      const divider=document.createElement('div');divider.className='item-detail-divider';panel.append(divider);
      // Stat lines with rarity colors
      const statsBox=document.createElement('div');statsBox.className='item-detail-stats';panel.append(statsBox);
      function addStat(nameText,valueText,rarityKey){const row=document.createElement('div');row.className='item-detail-stat';const nm=document.createElement('span');nm.className='stat-name';nm.textContent=nameText;const vl=document.createElement('span');vl.className='stat-value'+(rarityKey?' rarity-'+rarityKey:'');vl.textContent=valueText;row.append(nm,vl);statsBox.append(row);}
      // Base stats from equipment data
      const baseStats=[['Công',item.atk],['Máu',item.hp],['Linh',item.mp],['Giáp',item.armor],['Bạo kích',item.crit?Math.round(item.crit*100)+'%':0],['Né',item.dodge?Math.round(item.dodge*100)+'%':0],['Skill',item.skill?Math.round(item.skill*100)+'%':0]];
      for(const [nm,val]of baseStats){if(val)addStat(nm,val+'',item.rarity);}
      // Affix lines (option lines) colored by rarity
      if(item.options&&item.options.length){for(const o of item.options){const keyMap={atk:'Công',hp:'HP',mp:'MP',armor:'Giáp',crit:'Bạo kích',dodge:'Né',skill:'Kỹ năng'};const kn=keyMap[o.key]||o.key;const unit=['crit','dodge'].includes(o.key)?'%':'';const val=(o.value/(['crit','dodge'].includes(o.key)?10:1)).toFixed(2);addStat(kn,'+'+val+unit,item.rarity);}}
      if(item.heal)addStat('Hồi máu',item.heal+'',item.rarity);
      if(item.mana)addStat('Hồi linh',item.mana+'',item.rarity);
      if(item.xp)addStat('Đạo hạnh','+'+item.xp,item.rarity);
      // Desc / awaken note
      const desc=(equipmentData.byId.get(item.id)?.desc||item.desc||'');
      if(desc){const d=document.createElement('div');d.className='item-detail-note';d.textContent=desc;panel.append(d);}
      // Actions
      const actions=document.createElement('div');actions.className='item-detail-actions';panel.append(actions);
      function action(label,fn){const button=document.createElement('button');button.type='button';button.textContent=label;button.onclick=fn;actions.append(button);return button;}
      if(equipmentRules.classSlots.includes(item.slot)){const req=document.createElement('div');req.className='item-detail-note';req.textContent='Class: '+equipmentRules.classes[item.classIndex]+(item.classIndex===P.ap.w?' · Đồng bộ':' · Không phù hợp');req.style.color=item.classIndex===P.ap.w?'#9de0bd':'#ff9f9f';panel.insertBefore(req,actions);}
      if(equipmentData.pool(item).length)action('Tẩy luyện · '+(60+(item.locks?.length||0)*25)+' ◈',()=>equipmentSystem.reforge(item.uid));
      if(equipmentRules.enhanceSlots.includes(item.slot)){action('Cường hóa',()=>{enhance(item.uid);dialog.close();});}
      if(item.type==='egg')action('Ấp trứng',()=>spiritPets.startHatch(item.uid));
      if(equipped)action('Tháo trang bị',()=>unequip(item.slot));else{
        if(item.slot)action('Trang bị',()=>equipItem(item.uid));
        if(item.type==='consume')action('Sử dụng',()=>useItem(item.uid));
        action('Bán '+Math.max(1,Math.floor((item.price||10)*.5))*(item.qty||1)+' ◈',()=>sellItem(item.uid));
      }
    }
    const selected=p.bag.find(i=>i.uid===selectedUid);if(selected)showDetails(selected,false);else details.textContent='Chọn một vật phẩm để xem chỉ số. Kéo vào ô phù hợp để trang bị; kéo về ô túi trống để tháo.';
    const resources=document.createElement('div');resources.className='bag-resources';resources.textContent='Linh Nguyên '+(p.essence||0)+' · Đột Phá Đan '+(p.breakthroughPills||0)+' · Thăng Vị Đan '+(p.thangViDan||0);bag.append(resources);
    const shop=document.createElement('div');shop.className='quick-shop';bag.append(shop);
    ['hoi-huyet-dan','hoi-linh-dan'].forEach(id=>{const t=BY_ID[id],button=document.createElement('button');button.textContent=t.name+' · '+t.price+' ◈';button.onclick=()=>buyItem(id);button.disabled=P.gold<t.price;shop.append(button);});
    dialog.action('Linh thú',()=>spiritPets.open());
    dialog.action('Thuộc tính (U)',openAttrs);
  }
  function openShopEquip() {
    dialog.line('Trang bị ghép bằng mảnh linh khí hoặc đổi cống hiến sư môn.');
    dialog.action('Ghép trang bị',()=>window.adventureGame?.open('craft'));
    dialog.action('Cửa hàng sư môn',()=>window.adventureGame?.open('sect'));
  }
  // Tiêm quầy đồ vào Bảo Khí Các có sẵn.
  const prevShow = dialog.show;
  dialog.show = function (title, desc) {
    prevShow(title, desc);
    try {
      if (title === 'Bảo Khí Các') openShopEquip();
    } catch (e) {}
  };
  // Nút + phím tắt.
  const bagBtn = document.createElement('button');
  bagBtn.id = 'bag-button'; bagBtn.textContent = 'Túi (I)';
  const attrBtn = document.createElement('button');
  attrBtn.id = 'attr-button'; attrBtn.textContent = 'Thuộc tính (U)';
  const bt = $('bt');
  if (bt) { bt.appendChild(bagBtn); bt.appendChild(attrBtn); }
  bagBtn.onclick = () => { if (!paused() && !dialog.isOpen()) openBag(); };
  attrBtn.onclick = () => { if (!paused() && !dialog.isOpen()) openAttrs(); };
  addEventListener('keydown', e => {
    if (e.target instanceof HTMLInputElement || paused() || dialog.isOpen()) return;
    const k = e.key.toLowerCase();
    if (k === 'i' && !e.repeat) openBag();
    if (k === 'u' && !e.repeat) openAttrs();
  });
  const style = document.createElement('style');
  style.textContent = '#bag-button,#attr-button{border-color:#7fd8c4}#world-content .world-line{white-space:normal}';
  document.head.appendChild(style);
  window.inventory = { statText, itemIcon, registerTemplates(items){for(const item of items){if(equipmentData.pool(item).length&&!item.affixes)item.affixes=equipmentData.defaults(item);if(BY_ID[item.id])continue;TEMPLATES.push(item);BY_ID[item.id]=item;}}, equipItem, unequip, useItem, moveToBag, openBag, openAttrs, addItem, buyItem, progress, templates: TEMPLATES, bonus: () => window.bonusStats() };
})();
