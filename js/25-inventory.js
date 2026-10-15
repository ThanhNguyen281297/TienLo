/* Túi đồ · thuộc tính · trang bị: rơi đồ, mua/bán, cộng điểm tu luyện. */
(function () {
  const world = window.worldMap, dialog = world.dialog;
  const SLOTS = { vukhi: 'Vũ khí', daobao: 'Đạo bào', ngoc: 'Linh ngọc', gioi: 'Nhẫn', giay: 'Giày', phapbao: 'Pháp bảo' };
  const RARITY = {
    pham: { name: 'Phàm', color: '#c9b58f' },
    huyen: { name: 'Huyền', color: '#7fd8a0' },
    linh: { name: 'Linh', color: '#7fd0ff' },
    tien: { name: 'Tiên', color: '#c9a0ff' }
  };
  // id, slot/type, chỉ số, yêu cầu cultivationLevel, giá mua.
  const TEMPLATES = [
    { id: 'moc-kiem', slot: 'vukhi', name: 'Mộc Kiếm', rarity: 'pham', atk: 3, price: 20, req: 0, desc: 'Kiếm gỗ cho tân thủ.' },
    { id: 'huyen-kiem', slot: 'vukhi', name: 'Huyền Thiết Kiếm', rarity: 'huyen', atk: 8, hp: 20, price: 80, req: 10, desc: 'Rèn từ huyền thiết.' },
    { id: 'linh-kiem', slot: 'vukhi', name: 'Linh Quang Kiếm', rarity: 'linh', atk: 15, crit: 0.03, price: 200, req: 25, desc: 'Ẩn chứa linh quang.' },
    { id: 'tien-kiem', slot: 'vukhi', name: 'Cửu Tiêu Tiên Kiếm', rarity: 'tien', atk: 28, crit: 0.06, skill: 0.08, price: 500, req: 45, desc: 'Tiên kiếm lôi vân.' },
    { id: 'vai-bao', slot: 'daobao', name: 'Vải Bố Đạo Bào', rarity: 'pham', armor: 2, hp: 20, price: 20, req: 0, desc: 'Đạo bào thô sơ.' },
    { id: 'huyen-bao', slot: 'daobao', name: 'Huyền Tơ Đạo Bào', rarity: 'huyen', armor: 4, hp: 60, price: 90, req: 10, desc: 'Mềm mà chắc.' },
    { id: 'linh-giap', slot: 'daobao', name: 'Linh Quang Giáp', rarity: 'linh', armor: 7, hp: 120, dodge: 0.02, price: 220, req: 25, desc: 'Hộ thể linh quang.' },
    { id: 'tien-y', slot: 'daobao', name: 'Thiên Tằm Tiên Y', rarity: 'tien', armor: 12, hp: 220, dodge: 0.04, price: 550, req: 45, desc: 'Tiên y bất hoại.' },
    { id: 'thach-ngoc', slot: 'ngoc', name: 'Linh Thạch Ngọc', rarity: 'pham', mp: 15, skill: 0.03, price: 20, req: 0, desc: 'Ngọc tụ linh.' },
    { id: 'tu-linh-ngoc', slot: 'ngoc', name: 'Tụ Linh Ngọc', rarity: 'huyen', mp: 35, skill: 0.06, price: 85, req: 10, desc: 'Tụ linh nhanh hơn.' },
    { id: 'minh-nguyet-ngoc', slot: 'ngoc', name: 'Minh Nguyệt Ngọc', rarity: 'linh', mp: 70, skill: 0.1, price: 210, req: 25, desc: 'Ánh trăng hội tụ.' },
    { id: 'dong-gioi', slot: 'gioi', name: 'Đồng Giới', rarity: 'pham', atk: 2, crit: 0.01, price: 18, req: 0, desc: 'Nhẫn đồng.' },
    { id: 'linh-gioi', slot: 'gioi', name: 'Linh Ngọc Giới', rarity: 'huyen', atk: 5, crit: 0.03, price: 75, req: 10, desc: 'Nhẫn linh ngọc.' },
    { id: 'tien-gioi', slot: 'gioi', name: 'Càn Khôn Giới', rarity: 'tien', atk: 12, crit: 0.07, skill: 0.05, price: 480, req: 45, desc: 'Tự thành càn khôn.' },
    { id: 'vai-giay', slot: 'giay', name: 'Vải Bố Hài', rarity: 'pham', hp: 15, dodge: 0.01, price: 15, req: 0, desc: 'Nhẹ chân.' },
    { id: 'than-hanh-ngoa', slot: 'giay', name: 'Thần Hành Ngoa', rarity: 'huyen', hp: 40, dodge: 0.025, price: 70, req: 10, desc: 'Đi như gió.' },
    { id: 'dang-van-ngoa', slot: 'giay', name: 'Đằng Vân Ngoa', rarity: 'linh', hp: 90, dodge: 0.04, price: 190, req: 25, desc: 'Cưỡi mây.' },
    { id: 'ho-tam-kinh', slot: 'phapbao', name: 'Hộ Tâm Kính', rarity: 'huyen', armor: 3, hp: 50, skill: 0.04, price: 95, req: 10, desc: 'Hộ tâm trừ tà.' },
    { id: 'tu-linh-chau', slot: 'phapbao', name: 'Tụ Linh Châu', rarity: 'linh', mp: 50, skill: 0.1, atk: 6, price: 240, req: 25, desc: 'Linh châu thượng phẩm.' },
    { id: 'cuu-chuyen-dinh', slot: 'phapbao', name: 'Cửu Chuyển Đỉnh', rarity: 'tien', atk: 10, hp: 150, mp: 40, skill: 0.12, price: 600, req: 45, desc: 'Đỉnh luyện cửu chuyển.' },
    { id: 'hoi-huyet-dan', type: 'consume', name: 'Hồi Huyết Đan', rarity: 'pham', price: 12, heal: 80, desc: 'Hồi 80 khí huyết.' },
    { id: 'hoi-linh-dan', type: 'consume', name: 'Hồi Linh Đan', rarity: 'pham', price: 12, mana: 40, desc: 'Hồi 40 linh lực.' },
    { id: 'tu-vi-dan', type: 'consume', name: 'Tu Vi Đan', rarity: 'huyen', price: 25, xp: 30, desc: '+30 đạo hạnh.' }
  ];
  const BY_ID = Object.fromEntries(TEMPLATES.map(t => [t.id, t]));
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'it-' + Date.now() + '-' + Math.floor(Math.random() * 1e9));

  function progress() {
    const p = world.progress();
    p.attrs = p.attrs || { luc: 0, the: 0, nhanh: 0, linh: 0 };
    p.attrPoints = p.attrPoints ?? 0;
    p.bag = p.bag || [];
    p.equip = p.equip || { vukhi: null, daobao: null, ngoc: null, gioi: null, giay: null, phapbao: null };
    return p;
  }
  function makeItem(id, qty = 1) {
    const t = BY_ID[id];
    if (!t) return null;
    const item = Object.assign({}, t);
    item.uid = uid();
    if (item.type === 'consume') item.qty = qty;
    return item;
  }
  function addItem(id, qty = 1) {
    const p = progress(), t = BY_ID[id];
    if (!t) return null;
    if (t.type === 'consume') {
      const found = p.bag.find(i => i.id === id);
      if (found) { found.qty = (found.qty || 1) + qty; saveCharacter(); return found; }
    }
    // Túi tối đa 30 ô để tránh spam.
    const slots = p.bag.length;
    if (slots >= 30) { msg('Túi đã đầy (30 ô). Hãy bán bớt.'); return null; }
    const item = makeItem(id, qty);
    p.bag.push(item);
    saveCharacter();
    return item;
  }
  function statText(t) {
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
        atk += it.atk || 0; hp += it.hp || 0; mp += it.mp || 0; armor += it.armor || 0;
        crit += it.crit || 0; dodge += it.dodge || 0; skill += it.skill || 0;
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
      if (alive && e && E.includes(e)) {
        const c = Math.min(0.35, window.bonusStats().crit || 0);
        if (Math.random() < c) {
          final = power * 1.6;
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
    const p = progress();
    p.thangViFragments=(p.thangViFragments||0)+1;
    if(p.thangViFragments>=20){p.thangViFragments-=20;grantThangViDan(1,e);}
    const isBoss = e.t === 2 || e.elite || e.name;
    const valley = e.map === 'valley' || e.valley;
    const r = Math.random();
    // Boss/elite luôn rớt đồ xanh trở lên + chắc chắn 1 Thăng Vị Đan (30% thêm 1).
    if (isBoss) {
      const available=TEMPLATES.filter(t=>t.slot&&t.req<=cultivationLevel()+10);
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
      const pool = TEMPLATES.filter(t => t.slot && (t.rarity === 'pham' || (t.rarity === 'huyen' && lvl >= 5)));
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
    if (lvl < (item.req || 0)) return msg('Cần cấp ' + item.req + ' để mặc ' + item.name + '.');
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
    if (p.bag.length >= 30) return msg('Túi đầy, không thể tháo.');
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
    const t = BY_ID[id];
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
    dialog.show('Thuộc tính · ' + (window.cultivation ? cultivation.realmName() : ''), 'Tăng tầng +3 điểm, đột phá +5 điểm. Điểm còn: ' + p.attrPoints);
    dialog.line('Công ' + Math.round(atk()) + ' · Máu ' + mhp() + ' · Linh ' + mmp() + ' · Bạo ' + Math.round(b.crit * 100) + '% · Né ' + Math.round(b.dodge * 100) + '% · Skill +' + Math.round(b.skill * 100) + '%');
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
    if((item?.slot||slot)==='vukhi')return 'CHARACTER/'+characterClasses[P.ap.w].folder+'/VuKhi/vukhi.png';
    const paths={daobao:'M15 10 L24 5 L33 10 L42 22 L35 27 L31 20 L33 43 L15 43 L17 20 L13 27 L6 22 Z',ngoc:'M24 7 L37 22 L24 42 L11 22 Z',gioi:'M24 8 A15 15 0 1 0 24 38 A15 15 0 1 0 24 8 M24 16 A7 7 0 1 1 24 30 A7 7 0 1 1 24 16',giay:'M17 8 L30 8 L30 29 L40 34 L39 41 L10 41 L10 31 L17 27 Z',phapbao:'M12 17 L36 17 L33 36 L29 42 L19 42 L15 36 Z M10 13 L38 13 M19 8 L29 8',consume:'M19 7 L29 7 L29 18 Q39 23 37 36 Q35 43 24 43 Q13 43 11 36 Q9 23 19 18 Z M18 6 L30 6 M14 30 L34 30'};
    const type=item?.type==='consume'?'consume':item?.slot||slot, color=RARITY[item?.rarity||'pham'].color;
    const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="'+(paths[type]||paths.ngoc)+'" fill="'+color+'33" fill-rule="evenodd" stroke="'+color+'" stroke-width="2" stroke-linejoin="round"/><path d="M18 14 L24 11" stroke="white" opacity=".6" stroke-width="2"/></svg>';
    return 'data:image/svg+xml,'+encodeURIComponent(svg);
  }
  function cells(p) {
    const used=new Set();
    for(const item of p.bag){if(!Number.isInteger(item.cell)||item.cell<0||item.cell>=30||used.has(item.cell)){item.cell=Array.from({length:30},(_,i)=>i).find(i=>!used.has(i));}used.add(item.cell);}
    return Array.from({length:30},(_,i)=>p.bag.find(item=>item.cell===i)||null);
  }
  function moveToBag(source,index) {
    const p=progress();cells(p);
    if(source.startsWith('equip:')){
      const slot=source.slice(6),item=p.equip[slot];if(!item)return;
      if(p.bag.some(i=>i.cell===index))return msg('Chọn ô túi trống để tháo trang bị.');
      if(p.bag.length>=30)return msg('Túi đã đầy.');
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
    dialog.show('Hành trang', 'Linh Thạch '+P.gold+' ◈ · '+p.bag.length+'/30 ô · Kéo vật phẩm vào ô trang bị hoặc chạm để xem.');
    const content=$('world-content');content.closest('section').classList.add('inventory-dialog');
    const layout=document.createElement('div');layout.className='inventory-layout';content.append(layout);
    const gear=document.createElement('section');gear.className='gear-panel';layout.append(gear);
    const heading=document.createElement('h3');heading.textContent=P.nm+' · '+sectName();gear.append(heading);
    const paper=document.createElement('div');paper.className='paper-doll';gear.append(paper);
    const preview=document.createElement('canvas');const density=Math.max(1.5,Math.min(3,devicePixelRatio||1));preview.width=Math.round(320*density);preview.height=Math.round(380*density);preview.className='gear-preview';paper.append(preview);
    const ctx=preview.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.setTransform(3*density,0,0,3*density,160*density,285*density);drawChar(ctx,0,0,0,1,false,tm*10,false,P.ap,characterClasses[P.ap.w].color);
    Object.keys(SLOTS).forEach((slot,i)=>{
      const item=p.equip[slot],button=document.createElement('button');button.type='button';button.className='item-cell gear-slot gear-'+i;button.dataset.equipSlot=slot;button.style.setProperty('--rarity',RARITY[item?.rarity||'pham'].color);button.setAttribute('aria-label',SLOTS[slot]+': '+(item?.name||'trống'));
      const img=document.createElement('img');img.src=itemIcon(item,slot);img.alt='';button.append(img);
      const label=document.createElement('small');label.textContent=SLOTS[slot];button.append(label);
      if(item){button.classList.add('occupied');dragSource(button,'equip:'+slot);button.onclick=()=>showDetails(item,true);}
      else button.onclick=()=>{const item=p.bag.find(i=>i.uid===selectedUid);if(item){if(item.slot!==slot)return msg('Chọn trang bị phù hợp '+SLOTS[slot]+'.');equipItem(item.uid);}};
      dropTarget(button);paper.append(button);
    });
    const stats=document.createElement('div');stats.className='gear-stats';stats.textContent='Công '+Math.round(atk())+' · Máu '+mhp()+' · Linh '+mmp()+' · Giáp '+b.armor+' · Bạo '+Math.round(b.crit*100)+'%';gear.append(stats);
    const bag=document.createElement('section');bag.className='bag-panel';layout.append(bag);
    const toolbar=document.createElement('div');toolbar.className='bag-toolbar';bag.append(toolbar);
    const title=document.createElement('h3');title.textContent='Túi đồ';toolbar.append(title);
    const sort=document.createElement('button');sort.textContent='Sắp xếp';sort.onclick=()=>{const order={tien:0,linh:1,huyen:2,pham:3};p.bag.sort((a,b)=>(order[a.rarity]??9)-(order[b.rarity]??9)||a.name.localeCompare(b.name)).forEach((item,i)=>item.cell=i);saveCharacter();openBag();};toolbar.append(sort);
    const grid=document.createElement('div');grid.className='bag-grid';grid.setAttribute('aria-label','30 ô túi đồ');bag.append(grid);
    cells(p).forEach((item,i)=>{
      const button=document.createElement('button');button.type='button';button.className='item-cell';button.dataset.bagCell=i;button.setAttribute('aria-label',item?item.name:'Ô trống '+(i+1));dropTarget(button);
      if(item){button.classList.add('occupied');button.style.setProperty('--rarity',RARITY[item.rarity].color);const img=document.createElement('img');img.src=itemIcon(item);img.alt='';button.append(img);
        if(item.qty>1){const qty=document.createElement('span');qty.className='item-qty';qty.textContent=item.qty;button.append(qty);}
        button.title=item.name+' · '+statText(item);button.onclick=()=>{selectedUid=item.uid;grid.querySelectorAll('.selected').forEach(b=>b.classList.remove('selected'));button.classList.add('selected');showDetails(item,false);};dragSource(button,item.uid);
      }else{const label=document.createElement('span');label.className='cell-index';label.textContent=i+1;button.append(label);}
      grid.append(button);
    });
    const details=document.createElement('div');details.className='item-details';details.setAttribute('aria-live','polite');bag.append(details);
    function showDetails(item,equipped){
      details.replaceChildren();const name=document.createElement('h4');name.textContent=item.name;name.style.color=RARITY[item.rarity].color;const desc=document.createElement('p');desc.textContent=item.desc+' · '+statText(item);details.append(name,desc);
      const actions=document.createElement('div');actions.className='item-actions';details.append(actions);
      function action(label,fn){const button=document.createElement('button');button.textContent=label;button.onclick=fn;actions.append(button);}
      if(equipped)action('Tháo trang bị',()=>unequip(item.slot));else{
        if(item.slot)action('Trang bị',()=>equipItem(item.uid));if(item.type==='consume')action('Sử dụng',()=>useItem(item.uid));
        action('Bán '+Math.max(1,Math.floor((item.price||10)*.5))*(item.qty||1)+' ◈',()=>sellItem(item.uid));
      }
    }
    const selected=p.bag.find(i=>i.uid===selectedUid);if(selected)showDetails(selected,false);else details.textContent='Chọn một vật phẩm để xem chỉ số. Kéo vào ô phù hợp để trang bị; kéo về ô túi trống để tháo.';
    const resources=document.createElement('div');resources.className='bag-resources';resources.textContent='Linh Nguyên '+(p.essence||0)+' · Đột Phá Đan '+(p.breakthroughPills||0)+' · Thăng Vị Đan '+(p.thangViDan||0);bag.append(resources);
    const shop=document.createElement('div');shop.className='quick-shop';bag.append(shop);
    ['hoi-huyet-dan','hoi-linh-dan'].forEach(id=>{const t=BY_ID[id],button=document.createElement('button');button.textContent=t.name+' · '+t.price+' ◈';button.onclick=()=>buyItem(id);button.disabled=P.gold<t.price;shop.append(button);});
    dialog.action('Thuộc tính (U)',openAttrs);
  }
  function openShopEquip() {
    // Gọi từ Bảo Khí Các: giữ dialog gốc, thêm quầy đồ mới.
    dialog.line('--- Quầy pháp bảo (mới) ---');
    TEMPLATES.filter(t => t.slot).forEach(t => {
      dialog.action(t.name + ' [' + RARITY[t.rarity].name + '] · ' + t.price + ' ◈ · ' + statText(t), () => buyItem(t.id, false), P.gold < t.price);
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
  // Nối vào màn Tu luyện (C) để dễ phát hiện tính năng mới.
  try {
    if (window.cultivation && cultivation.overview) {
      const baseOverview = cultivation.overview;
      cultivation.overview = function () {
        baseOverview();
        try {
          const p = progress(), b = window.bonusStats();
          dialog.line('Thuộc tính: ' + p.attrPoints + ' điểm còn · Lực' + p.attrs.luc + ' Thể' + p.attrs.the + ' Nhanh' + p.attrs.nhanh + ' Linh' + p.attrs.linh);
          dialog.line('Trang bị: Công+' + b.atk + ' Máu+' + b.hp + ' Giáp+' + b.armor + ' · Túi ' + p.bag.length + '/30');
          dialog.action('Mở túi đồ (I)', openBag);
          dialog.action('Bảng thuộc tính (U)', openAttrs);
        } catch (e) {}
      };
    }
  } catch (e) {}
  const style = document.createElement('style');
  style.textContent = '#bag-button,#attr-button{border-color:#7fd8c4}#world-content .world-line{white-space:normal}';
  document.head.appendChild(style);
  window.inventory = { equipItem, unequip, useItem, moveToBag, openBag, openAttrs, addItem, buyItem, progress, templates: TEMPLATES, bonus: () => window.bonusStats() };
})();
