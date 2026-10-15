/* Tự động chiến đấu: chọn mục tiêu gần, di chuyển, đánh thường + skill + đan dược. */
(function () {
  const state = { enabled: false, skillTimer: 0, potionTimer: 0 };
  const SEARCH_RADIUS = 380;

  function alive(e) { return !!e && E.includes(e) && !e.dead && e.hp > 0; }
  function suspended() {
    try {
      if (!P.ap) return true;
      if (typeof paused === 'function' && paused()) return true;
      if (window.worldMap && worldMap.dialog && worldMap.dialog.isOpen()) return true;
      return false;
    } catch (e) { return true; }
  }
  function combat() {
    try {
      if (window.getClassCombatSafe) return window.getClassCombatSafe();
      if (typeof getClassCombat === 'function') return getClassCombat();
    } catch (e) {}
    return window.classCombat;
  }
  function basicRange() {
    try { if (window.basicCombat) return window.basicCombat.range(); } catch (e) {}
    return 100;
  }
  function manaCost(i) {
    try {
      if (window.combatMana && P.ap) return combatMana[P.ap.w][i];
    } catch (e) {}
    return [10, 14, 20, 30][i] || 10;
  }
  function canUseSkill(i) {
    try {
      if (window.cultivation && !cultivation.canUse(i)) return false;
      else if (!window.cultivation && P.r < i) return false;
      const c = combat();
      if (!c || !c.state) return false;
      if (c.state.cooldown && c.state.cooldown[i] > 0) return false;
      if (c.state.ultimate) return false;
      if (P.mp < manaCost(i)) return false;
      if (window.classCombat && classCombat.isDashing && classCombat.isDashing()) return false;
      return true;
    } catch (e) { return false; }
  }
  function setAim(point) {
    try { if (window.kiemCombat) kiemCombat.state.aim = { x: point.x, y: point.y }; } catch (e) {}
    try { if (window.moonCombat) moonCombat.state.aim = { x: point.x, y: point.y }; } catch (e) {}
    try { if (window.newClassCombat) newClassCombat.state.aim = { x: point.x, y: point.y }; } catch (e) {}
    try { if (window.skillAim) skillAim.state.visible = true; } catch (e) {}
  }
  function findTarget() {
    let best = null, bd = SEARCH_RADIUS * SEARCH_RADIUS;
    for (const e of E) {
      if (!alive(e)) continue;
      const d = (e.x - P.x) * (e.x - P.x) + (e.y - P.y) * (e.y - P.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }
  function face(point) {
    const dx = point.x - P.x, dy = point.y - P.y;
    if (Math.abs(dx) > Math.abs(dy)) { P.dir = 2; P.f = dx < 0 ? -1 : 1; }
    else P.dir = dy < 0 ? 1 : 0;
  }
  function manualMoving() {
    try {
      if (ptr) return true;
      return !!(K.w || K.a || K.s || K.d || K.arrowup || K.arrowdown || K.arrowleft || K.arrowright);
    } catch (e) { return false; }
  }
  function autoMove(target, dt) {
    if (!target || manualMoving()) return;
    const range = basicRange();
    const dx = target.x - P.x, dy = target.y - P.y, d = Math.hypot(dx, dy);
    if (d <= range * 0.9) return;
    const speed = 150 + (P.r || 0) * 10;
    const step = Math.min(d - range * 0.5, speed * dt);
    if (step <= 0) return;
    const to = { x: P.x + dx / d * step, y: P.y + dy / d * step };
    try {
      const end = window.worldMap && worldMap.traceMove ? worldMap.traceMove(P, to) : to;
      P.x = end.x; P.y = end.y;
      P.med = 0;
      face(target);
    } catch (e) {}
  }
  function countNearby(center, radius) {
    let n = 0;
    for (const e of E) {
      if (!alive(e)) continue;
      if (Math.hypot(e.x - center.x, e.y - center.y) <= radius) n++;
    }
    return n;
  }
  function tryAutoSkills(target) {
    if (!target) return;
    // Ngắm vào mục tiêu để skill định hướng bắn đúng.
    setAim({ x: target.x, y: target.y });
    const d = Math.hypot(target.x - P.x, target.y - P.y);
    // Ưu tiên: ultimate > trận > skill0 > skill1.
    const order = [3, 2, 0, 1];
    for (const i of order) {
      if (!canUseSkill(i)) continue;
      if (i === 0 && d > 300) continue;
      if (i === 1 && d > 190) continue;
      if (i === 2 && d > 160) continue;
      if (i === 3) {
        if (d > 330) continue;
        // Ultimate đắt: chỉ dùng khi đông quái, boss, hoặc máu cao.
        const crowd = countNearby(target, 130);
        const maxHp = target.maxHp || (T[target.t] && T[target.t].hp) || target.hp;
        const hpRatio = target.hp / Math.max(1, maxHp);
        const isBig = target.t === 2 || target.elite || target.name;
        if (!(crowd >= 2 || isBig || hpRatio > 0.5)) continue;
      }
      // Moon teleport cần điểm đến đi được, tránh spam msg.
      if (i === 1 && P.ap && P.ap.w === 1) {
        try {
          if (window.worldMap && worldMap.canWalk && !worldMap.canWalk({ x: target.x, y: target.y })) {
            // Thử điểm gần hơn về phía mình.
            const dd = Math.max(1, d), pull = Math.min(d - 20, 185);
            const alt = { x: P.x + (target.x - P.x) / dd * pull, y: P.y + (target.y - P.y) / dd * pull };
            if (!worldMap.canWalk(alt)) continue;
            setAim(alt);
          }
        } catch (e) {}
      }
      try {
        const mpBefore = P.mp;
        skill(i);
        // skill thành công khi tụt mana hoặc vào cooldown.
        const c = combat();
        if (P.mp < mpBefore || (c && c.state && c.state.cooldown && c.state.cooldown[i] > 0)) break;
      } catch (e) {}
    }
  }
  function autoPotion(dt) {
    state.potionTimer += dt;
    if (state.potionTimer < 1) return;
    state.potionTimer = 0;
    try {
      const p = window.worldMap ? worldMap.progress() : null;
      if (!p || !p.bag) return;
      if (P.hp < mhp() * 0.3) {
        const item = p.bag.find(i => i.id === 'hoi-huyet-dan' && (i.qty || 1) > 0);
        if (item) {
          P.hp = Math.min(mhp(), P.hp + (item.heal || 80));
          item.qty--;
          if (item.qty <= 0) p.bag.splice(p.bag.indexOf(item), 1);
          saveCharacter(); fx(P.x, P.y - 30, '+thuốc', '#7fffc8');
          return;
        }
      }
      if (P.mp < mmp() * 0.2) {
        const item = p.bag.find(i => i.id === 'hoi-linh-dan' && (i.qty || 1) > 0);
        if (item) {
          P.mp = Math.min(mmp(), P.mp + (item.mana || 40));
          item.qty--;
          if (item.qty <= 0) p.bag.splice(p.bag.indexOf(item), 1);
          saveCharacter();
        }
      }
    } catch (e) {}
  }
  function toggle(force) {
    state.enabled = typeof force === 'boolean' ? force : !state.enabled;
    try {
      const btn = $('auto-button');
      if (btn) {
        btn.classList.toggle('on', state.enabled);
        btn.textContent = state.enabled ? 'Tắt auto (Z)' : 'Tự đánh (Z)';
      }
    } catch (e) {}
    if (!state.enabled) {
      try { if (window.cultivation) cultivation.select(null); } catch (e) {}
      msg('Đã tắt tự động chiến đấu.');
    } else {
      state.skillTimer = 0; state.potionTimer = 0;
      try { P.med = 0; } catch (e) {}
      msg('Bật tự động: tự chọn mục tiêu, đánh thường, skill và đan dược.');
    }
    return state.enabled;
  }
  // Nút + phím Z.
  const btn = document.createElement('button');
  btn.id = 'auto-button'; btn.textContent = 'Tự đánh (Z)';
  try { const bt = $('bt'); if (bt) bt.appendChild(btn); } catch (e) {}
  btn.onclick = () => { try { if (!P.ap) return; if (typeof paused === 'function' && paused()) return; } catch (e) { return; } toggle(); };
  addEventListener('keydown', e => {
    try {
      if (e.target instanceof HTMLInputElement) return;
      if (paused() || (window.worldMap && worldMap.dialog && worldMap.dialog.isOpen())) return;
      if ((e.key === 'z' || e.key === 'Z') && !e.repeat) toggle();
    } catch (err) {}
  });
  const style = document.createElement('style');
  style.textContent = '#auto-button{border-color:#8fdfff}#auto-button.on{background:#1d3a2e;border-color:#7fffc8;color:#c9ffe8}';
  document.head.appendChild(style);

  // Vòng auto chạy ngoài cùng: chọn mục tiêu + di chuyển trước, skill sau.
  const prevUp = up;
  up = function (dt) {
    if (state.enabled && !suspended() && Number.isFinite(dt) && dt > 0) {
      try {
        const target = findTarget();
        // Chọn mục tiêu cho đánh thường (cultivation.basicTarget dùng ở core).
        try {
          if (window.cultivation) {
            const sel = cultivation.basicSelection ? cultivation.basicSelection() : null;
            if ((sel && sel.target) !== target) cultivation.select(target);
          }
        } catch (e) {}
        if (target) {
          try { P.med = 0; } catch (e) {}
          face(target);
          autoMove(target, dt);
          state.skillTimer += dt;
          if (state.skillTimer >= 0.25) { state.skillTimer = 0; tryAutoSkills(target); }
          autoPotion(dt);
        } else {
          try {
            if (window.cultivation && cultivation.basicSelection && cultivation.basicSelection().target) cultivation.select(null);
          } catch (e) {}
        }
      } catch (e) {}
    }
    prevUp(dt);
  };
  // Reset khi tạo char / hồi sinh để không kẹt mục tiêu cũ.
  try {
    const prevRespawn = classCombat.onRespawn;
    classCombat.onRespawn = function () { try { if (window.cultivation) cultivation.select(null); } catch (e) {} return prevRespawn(); };
  } catch (e) {}
  try {
    const creator = $('ok').onclick;
    $('ok').onclick = () => { creator(); if (P.ap && cr.style.display === 'none' && state.enabled) toggle(false); };
  } catch (e) {}
  window.autoCombat = { state, toggle, findTarget };
})();
