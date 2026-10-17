/* Túi đồ · thuộc tính · trang bị: rơi đồ, mua/bán, cộng điểm tu luyện. */
(function () {
  const world = window.worldMap, dialog = world.dialog;
  const SLOTS = equipmentRules.slots;
  const RARITY = {
    pham: { name: 'Phàm', color: '#c9b58f' },
    huyen: { name: 'Huyền', color: '#7fd8a0' },
    linh: { name: 'Linh', color: '#7fd0ff' },
    tien: { name: 'Tiên', color: '#c9a0ff' }
  };
  // id, slot/type, chỉ số, yêu cầu cultivationLevel, giá mua.
  const TEMPLATES = [
    {id:'hoi-huyet-dan',type:'consume',name:'Hồi Huyết Đan',rarity:'pham',price:12,heal:80,desc:'Hồi 80 khí huyết.'},
    {id:'hoi-linh-dan',type:'consume',name:'Hồi Linh Đan',rarity:'pham',price:12,mana:40,desc:'Hồi 40 linh lực.'},
    {id:'tu-vi-dan',type:'consume',name:'Tu Vi Đan',rarity:'huyen',price:25,xp:30,desc:'+30 đạo hạnh.'}
  ];
  for(const [species,name] of [['BoNgua','Linh Đường Lang'],['Tho','Nguyệt Thố'],['Nhen','Huyết Nhện'],['Doi','Băng Dực Dơi']])TEMPLATES.push({id:'egg-'+species,type:'egg',species,name:'Trứng '+name,rarity:'huyen',price:0,desc:'Ấp để nở linh thú '+name+'.'});
  TEMPLATES.push(...equipmentData.templates);
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
      if (alive && e && E.includes(e) && !window.petCombat?.dealing) {
        const c = Math.min(0.35, window.bonusStats().crit || 0);
        if (Math.random() < c) {
          final = power * (1.6+(window.bonusStats().critDamage||0));
          setTimeout(() => { try { fx(e.x, e.y - 30, 'Bạo!', '#ffd23a'); } catch (err) {} }, 0);
        }
      }
    } catch (err) {}
    baseHit(e, final);
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
    if(e.rift)return;
    const p = progress();
    const isBoss = e.t === 2 || e.elite || e.boss || e.challenge;
    const valley = e.map === 'valley' || e.valley;
    const r = Math.random();
    // Boss/elite luôn rớt đồ xanh trở lên + chắc chắn 1 Thăng Vị Đan (30% thêm 1).
    if (isBoss) {
      const available=TEMPLATES.filter(t=>t.slot&&(t.classIndex===undefined||equipmentRules.sharedSlots.includes(t.slot)||t.classIndex===P.ap.w)&&t.req<=cultivationLevel()+10);
      const tier=Math.max(...available.map(t=>({pham:0,huyen:1,linh:2,tien:3}[t.rarity])));
      const pool=available.filter(t=>({pham:0,huyen:1,linh:2,tien:3}[t.rarity])===tier).map(t=>t.id);
      const id = pool[Math.floor(Math.random() * pool.length)];
      const item = addItem(id);
      if (item) { msg('Nhặt được ' + item.name + ' từ ' + (e.name || 'thủ lĩnh') + '!'); fx(e.x, e.y - 40, item.name, '#c9a0ff'); }
      addItem('tu-vi-dan');
      grantThangViDan(Math.random() < 0.3 ? 2 : 1, e);
      return;
    }
    // Thăng Vị Đan rớt thấp: thường 1.5%, đấu trường 2%, Cốc 2.5%.
    const tvdRate = arena ? 0.02 : valley ? 0.025 : 0.015;
    if (Math.random() < tvdRate) grantThangViDan(1, e);
    const consumeRate = arena ? 0.06 : valley ? 0.1 : 0.08;
    const equipRate = arena ? 0.03 : valley ? 0.04 : 0.02;
    if (r < consumeRate) {
      const id = ['hoi-huyet-dan', 'hoi-linh-dan', 'tu-vi-dan'][Math.floor(Math.random() * 3)];
      const item = addItem(id);
      if (item) fx(e.x, e.y - 34, '+1 ' + item.name, '#d9e6e6');
    } else if (r < consumeRate + equipRate) {
      const lvl = typeof cultivationLevel === 'function' ? cultivationLevel() : 0;
      const pool = TEMPLATES.filter(t => t.slot && (t.classIndex===undefined||equipmentRules.sharedSlots.includes(t.slot)||t.classIndex===P.ap.w) && (t.rarity === 'pham' || (t.rarity === 'huyen' && lvl >= 5)));
      const pick = pool[Math.floor(Math.random() * pool.length)];
      if (pick && lvl >= (pick.req || 0)) {
        const item = addItem(pick.id);
        if (item) { msg('Nhặt được ' + item.name + ' [' + statText(item) + ']'); fx(e.x, e.y - 40, item.name, RARITY[item.rarity].color); }
      }
    }
  }
  function equipItem(itemUid) {
    const p = progress();
    const idx = p.bag.findIndex(i => i.uid === itemUid);
    if (idx < 0) return;
    const item = p.bag[idx];
    if (!item.slot) return msg('Vật phẩm này không trang bị được.');
    const lvl = typeof cultivationLevel === 'function' ? cultivationLevel() : 0;
    if (!window.gmTest?.enabled && lvl < (item.req || 0)) return msg('Cần cấp ' + item.req + ' để mặc ' + item.name + '.');
    if(!equipmentRules.sharedSlots.includes(item.slot)&&item.classIndex!==undefined&&item.classIndex!==P.ap.w)return msg('Trang bị thuộc tông môn khác.');
    const nextCapacity=item.slot==='gioi'?30+(equipmentData.byId.get(item.id)?.capacity||0):equipmentData.capacity(p);
    if(p.bag.length-1+(p.equip[item.slot]?1:0)>nextCapacity)return msg('Nhẫn mới không đủ sức chứa. Hãy dọn túi trước.');
    p.bag.splice(idx, 1);
    const old = p.equip[item.slot];
    if (old) p.bag.push(old);
    p.equip[item.slot] = item;
    P.hp = Math.min(mhp(), P.hp); P.mp = Math.min(mmp(), P.mp);
    saveCharacter(); openBag();
  }
  function unequip(slot) {
    const p = progress();
    const old = p.equip[slot];
    if (!old) return;
    if (p.bag.length+1 > (slot==='gioi'?30:equipmentData.capacity(p))) return msg('Túi không đủ chỗ sau khi tháo nhẫn/trang bị.');
    p.equip[slot] = null;
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
    const p = progress(), b = window.bonusStats();
    dialog.show('Thuộc tính · Cấp '+characterLevel()+' · ' + (window.cultivation ? cultivation.realmName() : ''), 'Tăng tầng +3 điểm, đột phá +5 điểm. Điểm còn: ' + p.attrPoints);
    dialog.line('EXP '+P.levelXp+'/'+characterProgression.required(characterLevel())+' · Tu vi '+Math.floor(P.xp)+'/'+need());
    dialog.line('Công ' + Math.round(atk()) + ' · Máu ' + mhp() + ' · Linh ' + mmp() + ' · Bạo ' + Math.round(b.crit * 100) + '% · Né ' + Math.round(b.dodge * 100) + '% · Skill +' + Math.round(b.skill * 100) + '%');
    dialog.line('Hút máu '+((b.lifesteal||0)*100).toFixed(2)+'% · Hút linh lực '+((b.manasteal||0)*100).toFixed(2)+'% · Kháng '+((b.resist||0)*100).toFixed(2)+'% · Hồi máu '+(b.regen||0).toFixed(2)+'/s');
    for (const key of ['luc', 'the', 'nhanh', 'linh']) {
      const info = ATTR_INFO[key];
      dialog.line(info.name + ' ' + (p.attrs[key] || 0) + ' · ' + info.desc);
      dialog.action('+' + info.name + ' (1 điểm)', () => {
        if (p.attrPoints <= 0) return msg('Hết điểm. Tăng tầng/đột phá để nhận thêm.');
        p.attrPoints--; p.attrs[key]++;
        P.hp = Math.min(mhp(), P.hp + 20); P.mp = Math.min(mmp(), P.mp + 10);
        saveCharacter(); openAttrs();
      }, p.attrPoints <= 0);
    }
    dialog.action('Mở túi đồ', openBag);
  }
  let selectedUid=null;
  function itemIcon(item,slot) {
    const wornArt=equipmentData.appearance(item);if(wornArt)return artworkURL(wornArt);
    if(item?.art)return artworkURL(item.art);
    if(item?.slot==='ngoc'||slot==='ngoc')return artworkURL('Item/Thuan/'+(item?.variant||1)+'.png');
    if(item?.type==='egg'&&window.spiritPets)return spiritPets.eggIcon(item.species);
    if((item?.slot||slot)==='vukhi')return 'Item/VuKhi/'+characterClasses[P.ap.w].folder+'.png';
    const type=item?.type==='consume'?'consume':item?.slot||slot;
    const icons={daobao:'Item/Ao/daobao.png',chan:'Item/Chan/chan.png',giay:'Item/Giay/giay.png',gioi:'Item/Nhan/gioi.png',consume:'Item/Consumable/consume.png',phapbao:characterEquipmentArt(P.ap.w,'lung'),phaptran:characterEquipmentArt(P.ap.w,'vong')};
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
    const ctx=preview.getContext('2d');function paintPreview(){if(!preview.isConnected||!dialog.isOpen())return;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,preview.width,preview.height);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.setTransform(2.6*density,0,0,2.6*density,160*density,270*density);drawChar(ctx,0,0,0,1,false,tm*10,false,P.ap,characterClasses[P.ap.w].color);requestAnimationFrame(paintPreview);}paintPreview();
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
      details.replaceChildren();const name=document.createElement('h4');name.textContent=item.name+(equipmentProgression.level(item)?' +'+equipmentProgression.level(item):'');name.style.color=RARITY[item.rarity].color;const desc=document.createElement('p');desc.textContent=(equipmentData.byId.get(item.id)?.desc||item.desc||'')+' · '+statText(item);details.append(name,desc);
      const actions=document.createElement('div');actions.className='item-actions';details.append(actions);
      function action(label,fn){const button=document.createElement('button');button.textContent=label;button.onclick=fn;actions.append(button);}
      if(equipmentRules.classSlots.includes(item.slot)){const requirement=document.createElement('p');requirement.className='item-class-requirement';requirement.textContent='Class yêu cầu: '+equipmentRules.classes[item.classIndex];requirement.style.color=item.classIndex===P.ap.w?'#9de0bd':'#ff9f9f';details.append(requirement);}
      window.equipmentSystem?.describe(details,item);
      if(equipmentData.pool(item).length)action('Tẩy luyện · 60 ◈ / 12 LN',()=>equipmentSystem.reforge(item.uid));
      if(equipmentRules.enhanceSlots.includes(item.slot))action('Cường hóa +'+equipmentProgression.level(item),()=>{if(equipmentProgression.enhance(item.uid))openBag();});
      if(item.type==='egg')action('Ấp trứng',()=>spiritPets.startHatch(item.uid));
      if(equipped)action('Tháo trang bị',()=>unequip(item.slot));else{
        if(item.slot)action('Trang bị',()=>equipItem(item.uid));if(item.type==='consume')action('Sử dụng',()=>useItem(item.uid));
        action('Bán '+Math.max(1,Math.floor((item.price||10)*.5))*(item.qty||1)+' ◈',()=>sellItem(item.uid));
      }
    }
    const selected=p.bag.find(i=>i.uid===selectedUid);if(selected)showDetails(selected,false);else details.textContent='Chọn một vật phẩm để xem chỉ số. Kéo vào ô phù hợp để trang bị; kéo về ô túi trống để tháo.';
    const resources=document.createElement('div');resources.className='bag-resources';resources.textContent='Linh Nguyên '+(p.essence||0)+' · Đột Phá Đan '+(p.breakthroughPills||0)+' · Thăng Vị Đan '+(p.thangViDan||0);bag.append(resources);
    const shop=document.createElement('div');shop.className='quick-shop';bag.append(shop);
    ['hoi-huyet-dan','hoi-linh-dan'].forEach(id=>{const t=BY_ID[id],button=document.createElement('button');button.textContent=t.name+' · '+t.price+' ◈';button.onclick=()=>buyItem(id);button.disabled=P.gold<t.price;shop.append(button);});
    dialog.action('Cường hóa trang bị',equipmentProgression.open);dialog.action('Linh thú',()=>spiritPets.open());
    dialog.action('Thuộc tính (U)',openAttrs);
  }
  function openShopEquip() {
    // Gọi từ Bảo Khí Các: giữ dialog gốc, thêm quầy đồ mới.
    dialog.line('Trang bị đúng class và đồ dùng chung');
    TEMPLATES.filter(t => t.slot && t.source!=='rift').forEach(t => {
      const wi=['moc-kiem','huyen-kiem','linh-kiem','tien-kiem'].indexOf(t.id),name=wi<0?t.name:equipmentRules.weaponNames[P.ap.w][wi];
      if(!equipmentRules.sharedSlots.includes(t.slot)&&t.classIndex!==undefined&&t.classIndex!==P.ap.w)return;
      dialog.action(name + ' [' + RARITY[t.rarity].name + '] · ' + t.price + ' ◈ · ' + statText(t), () => buyItem(t.id, false), P.gold < t.price);
    });
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
  window.inventory = { itemIcon, registerTemplates(items){for(const item of items){if(equipmentData.pool(item).length&&!item.affixes)item.affixes=equipmentData.defaults(item);if(BY_ID[item.id])continue;TEMPLATES.push(item);BY_ID[item.id]=item;}}, equipItem, unequip, useItem, moveToBag, openBag, openAttrs, addItem, buyItem, progress, templates: TEMPLATES, bonus: () => window.bonusStats() };
})();
