/* Đánh thường không tốn linh lực; projectile dùng vị trí thực và giới hạn hit. */
(function () {
  const profiles = combatBalance.profiles.map(profile=>profile.basic);
  const state = { combo: 0, sect: null, target: null, gap: 0, serial: 0,
    projectiles: [], swings: [], effects: [], lastHit: null };
  let enemies = E;
  const sect = () => P.ap?.w ?? 0;
  const profile = () => profiles[sect()];
  const range = () => profile().range;
  const live = e => !!e && E.includes(e) && !e.dead && e.hp > 0;
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const suspended = () => !P.ap || paused() || worldMap.dialog.isOpen();
  const busy = () => P.med || classCombat.isDashing() || !!getClassCombat().state.ultimate;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const mix = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  function quadratic(a, b, c, t) {
    const n = 1 - t;
    return { x: n * n * a.x + 2 * n * t * b.x + t * t * c.x,
      y: n * n * a.y + 2 * n * t * b.y + t * t * c.y };
  }
  function home(index) {
    const point = characterWeapon.position(index);
    return { x: point.x, y: point.y + 20 };
  }
  function effect(sect, kind, point, radius = 22, angle = 0) {
    state.effects.push({ sect, kind, x: point.x, y: point.y, radius, angle, age: 0, duration: .35 });
  }
  function clearChain() { state.combo = 0; state.target = null; state.gap = 0; state.lastHit = null; }
  function reset() {
    clearChain(); state.sect = null;
    state.projectiles.length = state.swings.length = state.effects.length = 0;
    P.acd = 0;
  }
  function syncEnemies() {
    if (enemies === E) return;
    // Đấu trường lọc E mỗi frame. Giữ đòn đang bay khi vẫn là cùng bầy quái;
    // xóa combat khi đổi tầng/wave thực sự thay toàn bộ đối tượng quái.
    const previous = new Set(enemies);
    if (!enemies.length || !E.length || !E.some(enemy => previous.has(enemy))) reset();
    enemies = E;
  }
  function face(point) {
    const dx = point.x - P.x, dy = point.y - P.y;
    if (Math.abs(dx) > Math.abs(dy)) { P.dir = 2; P.f = dx < 0 ? -1 : 1; }
    else P.dir = dy < 0 ? 1 : 0;
  }
  function stagger(enemy, seconds) {
    enemy.fr = Math.max(enemy.fr || 0, seconds);
    enemy.cd = Math.max(enemy.cd || 0, seconds);
  }
  function strike(enemy, power) { if (live(enemy)) hit(enemy, power); }
  function finisher(enemy, attack) {
    if (attack.sect === 0 && attack.step === 3) {
      stagger(enemy, .18);
      if (!attack.volley.refunded) {
        attack.volley.refunded = true;
        kiemCombat.state.cooldown[0] = Math.max(0, kiemCombat.state.cooldown[0] - .4);
        effect(0, 'x', enemy, 30);
      }
    }
  }
  function projectile(attack, start, end, bend, options = {}) {
    const d = distance(start, end) || 1, dx = (end.x - start.x) / d, dy = (end.y - start.y) / d;
    state.projectiles.push({ ...attack, ...options, x: start.x, y: start.y, start, end,
      control: { x: (start.x + end.x) / 2 - dy * bend, y: (start.y + end.y) / 2 + dx * bend },
      angle: Math.atan2(dy, dx), size: options.size || 18, duration: options.duration || .25,
      age: 0, returning: false, outHits: new Set(), backHits: new Set(), trail: [] });
  }
  function launch(attack, target) {
    const origin = { x: P.x, y: P.y }, angle = Math.atan2(target.y - P.y, target.x - P.x);
    const dx = Math.cos(angle), dy = Math.sin(angle), source = home(attack.sect);
    const end = { x: target.x, y: target.y };
    if (attack.sect === 0 && attack.step >= 2) {
      if (attack.step === 2) {
        projectile(attack, source, { x: end.x + dx * 22, y: end.y + dy * 22 }, 0, { piercing: true });
      } else {
        for (const side of [-1, 1]) projectile({ ...attack, power: attack.power / 2 },
          { x: source.x - dy * side * 16, y: source.y + dx * side * 16 },
          { x: end.x + dx * 22 + dy * side * 15, y: end.y + dy * 22 - dx * side * 15 },
          side * 8, { piercing: true });
      }
    } else if (attack.sect === 1) {
      const large = attack.step === 2;
      projectile(attack, source, large ? { x: end.x + dx * 35, y: end.y + dy * 35 } : end,
        large ? 0 : attack.step === 0 ? -55 : 55,
        { boomerang: true, piercing: true, size: large ? 34 : 26, duration: .45 });
    } else if (attack.sect === 3) {
      state.swings.push({ ...attack, ...origin, angle, age: 0, duration: .25, radius: range(), resolved: true });
      const count = attack.step === 1 ? 2 : 1;
      for (let n = 0; n < count; n++) projectile({ ...attack, power: attack.power / count }, source,
        end, count === 2 ? (n ? 40 : -40) : 0,
        { size: attack.step === 2 ? 20 : 12, duration: clamp(distance(source, end) / 360, .18, .78) });
    } else {
      state.swings.push({ ...attack, ...origin, angle, age: 0, duration: .25,
        delay: attack.sect === 0 ? .07 : .10, radius: range(), resolved: false });
    }
  }
  function attack(target) {
    syncEnemies();
    if (suspended() || busy() || !live(target) || P.acd > 0 || distance(P, target) > range() + T[target.t].s * .4) return false;
    if (state.sect !== sect() || state.target !== target || state.gap > 1.4) clearChain();
    state.sect = sect(); state.target = target; state.gap = 0;
    const step = state.combo, p = profile();
    const attack = { sect: sect(), step, power: atk() * p.power[step], volley: { id: ++state.serial, marked: new Set(), refunded: false } };
    face(target); launch(attack, target);
    state.combo = (step + 1) % p.steps;
    state.lastHit = { sect: sect(), step, name: p.name };
    // Trận Lôi tăng tốc đánh 25% (chu kỳ ngắn hơn 20%).
    P.acd = p.interval * (sect() === 2 && newClassCombat.damageTaken() < 1 ? .8 : 1);
    P.sl = Math.min(.22, p.interval * .7);
    return true;
  }
  function inCone(enemy, swing, width) {
    const delta = Math.atan2(enemy.y - swing.y, enemy.x - swing.x) - swing.angle;
    return distance(enemy, swing) <= swing.radius + T[enemy.t].s * .4 &&
      Math.abs(Math.atan2(Math.sin(delta), Math.cos(delta))) <= width / 2;
  }
  function resolveSwing(swing) {
    for (const enemy of E) {
      if (!live(enemy)) continue;
      let within;
      if (swing.sect === 2 && swing.step !== 2) {
        const end = { x: swing.x + Math.cos(swing.angle) * swing.radius, y: swing.y + Math.sin(swing.angle) * swing.radius };
        within = kiemCombat.segmentDistance(enemy, swing, end) <= T[enemy.t].s + 10;
      } else within = inCone(enemy, swing, swing.sect === 2 ? Math.PI * 1.25 : Math.PI * .8);
      if (!within) continue;
      strike(enemy, swing.power); effect(swing.sect, 'impact', enemy);
      if (swing.sect === 2 && swing.step === 3 && live(enemy)) {
        if (newClassCombat.markCount(enemy)) strike(enemy, atk() * .45);
        newClassCombat.addMark(enemy);
        effect(2, 'lightning', enemy, 30);
      }
    }
  }
  function paperImpact(p, enemy) {
    if (p.step === 1 && !p.volley.marked.has(enemy)) {
      p.volley.marked.add(enemy); newClassCombat.addMark(enemy); effect(3, 'seal', enemy);
    }
    if (p.step === 2) {
      effect(3, 'explode', enemy, 32);
      const center = { x: enemy.x, y: enemy.y };
      for (const other of E) if (live(other) && distance(other, center) <= 32 + T[other.t].s * .4) {
        if (other !== enemy) strike(other, p.power * .45);
        if (live(other) && newClassCombat.markCount(other)) {
          newClassCombat.consumeMark(other); strike(other, p.power * .5); effect(3, 'seal', other);
        }
      }
    }
  }
  function advanceProjectiles(dt) {
    const remove = new Set();
    for (const p of state.projectiles) {
      const old = { x: p.x, y: p.y };
      p.age += dt;
      const end = p.returning ? home(p.sect) : p.end;
      const pos = quadratic(p.start, p.control, end, clamp(p.age / p.duration, 0, 1));
      p.x = pos.x; p.y = pos.y; p.angle = Math.atan2(pos.y - old.y, pos.x - old.x);
      p.trail.push(old); if (p.trail.length > 10) p.trail.shift();
      const hits = p.returning ? p.backHits : p.outHits;
      for (const enemy of E) {
        if (!live(enemy) || hits.has(enemy) || kiemCombat.segmentDistance(enemy, old, pos) > T[enemy.t].s + (p.size > 25 ? 10 : 6)) continue;
        hits.add(enemy); strike(enemy, p.power * (p.returning ? .3 : 1));
        effect(p.sect, 'impact', enemy); finisher(enemy, p);
        if (p.sect === 1 && p.step === 2 && !p.returning) effect(1, 'converge', enemy, 34);
        if (p.sect === 3) paperImpact(p, enemy);
        if (!p.piercing) { remove.add(p); break; }
      }
      if (p.age >= p.duration) {
        if (p.boomerang && !p.returning) {
          p.returning = true; p.age = 0; p.duration = .48; p.start = { x: p.x, y: p.y };
          const dest = home(p.sect);
          p.control = mix(p.start, dest, .5);
        } else remove.add(p);
      }
    }
    state.projectiles = state.projectiles.filter(p => !remove.has(p));
  }
  function advance(dt) {
    if (suspended() || !Number.isFinite(dt) || dt <= 0) return;
    state.gap += dt;
    if (state.gap > 1.4 || state.sect !== null && state.sect !== sect()) clearChain();
    if (state.target && !live(state.target)) clearChain();
    for (const swing of state.swings) {
      swing.age += dt;
      if (!swing.resolved && swing.age >= swing.delay) { swing.resolved = true; resolveSwing(swing); }
    }
    state.swings = state.swings.filter(s => s.age < s.duration);
    advanceProjectiles(dt);
    for (const e of state.effects) e.age += dt;
    state.effects = state.effects.filter(e => e.age < e.duration);
  }
  function refresh() {
    if (!P.ap) return;
    const p = profile(), b = $('basic-attack');
    b.title = p.name + ' · ' + p.steps + ' đòn · Tầm ' + p.range + ' · Không tốn linh lực';
    if (state.lastHit) $('st').textContent += ' · ' + p.name + ' ' + (state.lastHit.step + 1) + '/' + p.steps;
  }
  window.basicCombat = { state, profiles, range, attack, advance, reset, suspended,
    targetChanged: enemy => { if (state.target !== enemy) clearChain(); },
    poseActive: () => !!state.lastHit && state.gap < .24 };
  const oldUp = up;
  up = function (dt) {
    syncEnemies();
    oldUp(dt);
    syncEnemies();
    advance(dt); refresh();
  };
  const oldRespawn = classCombat.onRespawn;
  classCombat.onRespawn = function () { reset(); return oldRespawn(); };
  const creator = $('ok').onclick;
  $('ok').onclick = () => { creator(); if (P.ap && cr.style.display === 'none') reset(); };
})();
