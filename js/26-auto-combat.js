/* Tự động chiến đấu: chọn mục tiêu gần, di chuyển, đánh thường + skill + đan dược. */
(function () {
  const state = { enabled: false, skillTimer: 0, potionTimer: 0, cursor: 0, sect: null };
  const SEARCH_RADIUS = 380;
  const SKILL_GAP = .85, ROTATION = [2, 0, 1, 3];
  const priorities=['nearest','boss','mobs','weak'];
  let cachedWorld,cachedClass,cachedPlans;
  function normalizePlan(raw={},boss=false){
    if(!raw||typeof raw!=='object')raw={};
    const order=Array.isArray(raw.order)?[...new Set(raw.order.filter(i=>Number.isInteger(i)&&i>=0&&i<4))]:[];
    for(const i of ROTATION)if(!order.includes(i))order.push(i);
    return {priority:priorities.includes(raw.priority)?raw.priority:boss?'boss':'nearest',order,
      skills:[0,1,2,3].map(i=>Array.isArray(raw.skills)?raw.skills[i]!==false:!(boss&&i===1)),
      basic:raw.basic!==false,potions:raw.potions!==false,
      hp:Number.isFinite(raw.hp)?Math.max(.1,Math.min(.8,raw.hp)):.3,
      mp:Number.isFinite(raw.mp)?Math.max(.1,Math.min(.8,raw.mp)):.2};
  }
  function plans(){
    const p=worldMap.progress(),classId=P.ap?.w||0;
    if(cachedWorld!==p||cachedClass!==classId){
      const raw=p.autoCombatPlans?.[classId]||{};
      cachedPlans={active:raw.active==='boss'?'boss':'farm',automatic:raw.automatic===true,
        farm:normalizePlan(raw.farm),boss:normalizePlan(raw.boss,true)};
      p.autoCombatPlans??={};p.autoCombatPlans[classId]=cachedPlans;
      cachedWorld=p;cachedClass=classId;
    }
    return cachedPlans;
  }
  const isBoss=e=>!!(e&&(e.boss||e.worldBoss||e.elite||e.t===2));
  function plan(target){const s=plans();return s[s.automatic&&target?(isBoss(target)?'boss':'farm'):s.active];}
  function configure(change){const s=plans();if(change.active)s.active=change.active==='boss'?'boss':'farm';if(typeof change.automatic==='boolean')s.automatic=change.automatic;
    if(change.plan)s[s.active]=normalizePlan({...s[s.active],...change.plan},s.active==='boss');state.cursor=0;saveCharacter();return s;}

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
      if (i===2&&c.state.field) return false;
      if ((i===0||i===2)&&c.state.flying?.length) return false;
      if (P.mp < manaCost(i)) return false;
      if (window.classCombat && classCombat.isDashing && classCombat.isDashing()) return false;
      return true;
    } catch (e) { return false; }
  }
  function setAim(point) {
    try { if (window.kiemCombat) kiemCombat.state.aim = { x: point.x, y: point.y }; } catch (e) {}
    try { if (window.moonCombat) moonCombat.state.aim = { x: point.x, y: point.y }; } catch (e) {}
    try { if (window.newClassCombat) newClassCombat.state.aim = { x: point.x, y: point.y }; } catch (e) {}
  }
  // Auto-farm stays inside one hunting camp: the camp of the first target (or the
  // spot where auto started, in rifts and other maps without camps). Walking by
  // hand re-anchors it; the bot never wanders into the next camp on its own.
  const LEASH = 300;
  function anchor() {
    if (state.anchor && state.anchor.scene === worldMap.state?.scene) return state.anchor;
    let best = null;
    for (const e of E) if (alive(e) && e.camp && Number.isFinite(e.campX)) {
      const d = Math.hypot(e.campX - P.x, e.campY - P.y);
      if (d < 420 && (!best || d < best.d)) best = { d, camp: e.camp, x: e.campX, y: e.campY, rx: e.campRX || 190, ry: e.campRY || 150 };
    }
    state.anchor = best ? { scene: worldMap.state?.scene, camp: best.camp, x: best.x, y: best.y, rx: best.rx, ry: best.ry }
      : { scene: worldMap.state?.scene, camp: null, x: P.x, y: P.y };
    return state.anchor;
  }
  function inLeash(e, a) {
    if (a.camp) return e.camp === a.camp || (!e.camp && Math.hypot(e.x - a.x, e.y - a.y) < LEASH);
    return Math.hypot(e.x - a.x, e.y - a.y) < LEASH;
  }
  function findTarget() {
    const candidates=[],a=anchor();
    for (const e of E) {
      if (!alive(e) || !inLeash(e, a)) continue;
      const d = (e.x - P.x) * (e.x - P.x) + (e.y - P.y) * (e.y - P.y);
      if(d<SEARCH_RADIUS*SEARCH_RADIUS)candidates.push({e,d});
    }
    const priority=plan().priority;
    const filtered=priority==='mobs'?candidates.filter(c=>!isBoss(c.e)):candidates;
    filtered.sort((a,b)=>priority==='boss'?(Number(isBoss(b.e))-Number(isBoss(a.e))||a.d-b.d):priority==='weak'?(a.e.hp/Math.max(1,a.e.maxHp||a.e.hp)-b.e.hp/Math.max(1,b.e.maxHp||b.e.hp)||a.d-b.d):a.d-b.d);
    const best=filtered[0],selected=window.cultivation?.basicSelection()?.target,current=filtered.find(c=>c.e===selected);
    // Keep a target through small distance changes so movement does not reset combos.
    if(best&&current&&(priority==='nearest'||(priority==='boss'&&isBoss(current.e)===isBoss(best.e)))&&Math.sqrt(current.d)<=Math.sqrt(best.d)*1.2+20)return current.e;
    return best?.e||null;
  }
  function face(point) {
    const dx = point.x - P.x, dy = point.y - P.y;
    if (Math.abs(dx) > Math.abs(dy)) { P.dir = 2; P.f = dx < 0 ? -1 : 1; }
    else P.dir = dy < 0 ? 1 : 0;
  }
  function manualMoving() {
    try {
      if (ptr || window.mobileInput?.active) return true;
      return !!(K.w || K.a || K.s || K.d || K.arrowup || K.arrowdown || K.arrowleft || K.arrowright);
    } catch (e) { return false; }
  }
  function autoMove(target, dt) {
    if (!target || manualMoving() || combat()?.state.ultimate || combat()?.state.blink || classCombat.isDashing()) return;
    // Ranged classes must approach to place a field or use their short skill,
    // rather than stopping forever at normal-attack range.
    const policy=plan(target);
    const range = Math.min(basicRange(),policy.skills[2]&&canUseSkill(2)?230:policy.skills[1]&&canUseSkill(1)?140:basicRange());
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
  function returnToAnchor(dt) {
    const a = state.anchor;if (!a || manualMoving()) return;
    const dx = a.x - P.x, dy = a.y - P.y, d = Math.hypot(dx, dy);if (d < 60) return;
    const step = Math.min(d - 40, (150 + (P.r || 0) * 10) * dt), to = { x: P.x + dx / d * step, y: P.y + dy / d * step };
    const end = worldMap.traceMove ? worldMap.traceMove(P, to) : to;P.x = end.x;P.y = end.y;face(a);
  }
  function tryAutoSkills(target) {
    if (!target) return;
    const policy=plan(target),rotation=policy.order;
    // Ngắm vào mục tiêu để skill định hướng bắn đúng.
    setAim({ x: target.x, y: target.y });
    const d = Math.hypot(target.x - P.x, target.y - P.y);
    // Resume after the last successful cast; unavailable slots never block
    // other skills. A separate gap leaves room for normal combo attacks.
    for (let offset=0;offset<rotation.length;offset++) {
      const slot=(state.cursor+offset)%rotation.length,i=rotation[slot];
      if(!policy.skills[i])continue;
      if (!canUseSkill(i)) continue;
      if (i === 0 && d > 300) continue;
      if (i === 1 && d > 190) continue;
      if (i === 2 && d > 250) continue;
      if(i===1&&P.ap.w===0&&combat().state.field)continue;
      if (i === 3) {
        if (d > 330) continue;
        // Both sword and moon ultimates clear their active field. Let its
        // final pulses resolve before starting a long channel.
        const field=combat()?.state?.field;
        if(field&&field.age<(field.duration||5.5)-.15)continue;
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
        const mpBefore = P.mp,cBefore=combat();
        const signature=c=>[c.state.field,c.state.ultimate,c.state.dash,c.state.blink,...['flying','projectiles','effects','ghosts','slash'].map(k=>c.state[k]?.length||0)];
        const before=signature(cBefore);
        skill(i);
        // skill thành công khi tụt mana hoặc vào cooldown.
        const c = combat();
        if (P.mp < mpBefore || (c?.state.cooldown?.[i] > 0) || (window.gmTest?.enabled&&signature(c).some((v,n)=>v!==before[n]))) {
          state.cursor=(slot+1)%rotation.length;return true;
        }
      } catch (e) {}
    }
  }
  function autoPotion(dt) {
    const policy=plan(cultivation.basicSelection()?.target);
    if(!policy.potions)return;
    state.potionTimer += dt;
    if (state.potionTimer < 1) return;
    state.potionTimer = 0;
    try {
      const p = window.worldMap ? worldMap.progress() : null;
      if (!p || !p.bag) return;
      if (P.hp < mhp() * policy.hp) {
        const item = p.bag.find(i => i.id === 'hoi-huyet-dan' && (i.qty || 1) > 0);
        if (item) {
          P.hp = Math.min(mhp(), P.hp + (item.heal || 80));
          item.qty--;
          if (item.qty <= 0) p.bag.splice(p.bag.indexOf(item), 1);
          saveCharacter(); fx(P.x, P.y - 30, '+thuốc', '#7fffc8');
          return;
        }
      }
      if (P.mp < mmp() * policy.mp) {
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
    state.anchor = null;
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
      state.skillTimer = 0; state.potionTimer = 0; state.cursor = 0;state.sect=P.ap?.w;
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
            const attacking=!!target&&plan(target).basic;
            if ((sel && sel.target) !== target || !!sel?.attacking!==attacking) cultivation.select(target,attacking);
          }
        } catch (e) {}
        if (target) {
          try { P.med = 0; } catch (e) {}
          face(target);
          autoMove(target, dt);
          if(state.sect!==P.ap.w){state.sect=P.ap.w;state.cursor=0;state.skillTimer=0;}
          state.skillTimer=Math.min(SKILL_GAP,state.skillTimer+dt);
          // Manual movement/aim takes precedence over automatic mobility casts.
          if (state.skillTimer>=SKILL_GAP&&!manualMoving()&&!window.skillAim?.state.drag) {
            if(tryAutoSkills(target))state.skillTimer=0;
          }
          autoPotion(dt);
        } else {
          try {
            if (window.cultivation && cultivation.basicSelection && cultivation.basicSelection().target) cultivation.select(null);
          } catch (e) {}
          returnToAnchor(dt);
        }
        if (manualMoving()) state.anchor = null;
      } catch (e) {}
    }
    prevUp(dt);
  };
  // Reset khi tạo char / hồi sinh để không kẹt mục tiêu cũ.
  try {
    const prevRespawn = classCombat.onRespawn;
    classCombat.onRespawn = function () { state.skillTimer=0;state.cursor=0;try { if (window.cultivation) cultivation.select(null); } catch (e) {} return prevRespawn(); };
  } catch (e) {}
  try {
    const creator = $('ok').onclick;
    $('ok').onclick = () => { creator(); if (P.ap && cr.style.display === 'none' && state.enabled) toggle(false); };
  } catch (e) {}
  window.autoCombat = { state, toggle, findTarget, plans, plan, configure, isBoss };
})();
