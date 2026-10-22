/* Exercise real combat in Chrome with a deterministic clock and no writes to the player DB. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const root = path.resolve(__dirname, '..');
const artifacts = path.join(__dirname, 'artifacts');
fs.mkdirSync(artifacts, { recursive: true });

async function installHelpers(page) {
  await page.evaluate(() => {
    window.basicDamage = [];
    const originalHit = hit;
    hit = (enemy, value) => { const before = enemy.hp; originalHit(enemy, value); basicDamage.push({ id: enemy.id, value: before - enemy.hp, time: tm }); };
    window.basicEnemy = (id, x, y) => ({ id, t: 0, x, y, hx: x, hy: y, hp: 10000, dead: 0, cd: 999, fr: 0, fl: 0 });
    window.basicStep = seconds => {
      const count = Math.ceil(seconds / .005), dt = seconds / count;
      for (let i = 0; i < count; i++) { tm += dt; up(dt); }
      dr();
    };
    window.basicReset = sect => {
      worldMap.dialog.close(); classCombat.onRespawn(); cultivation.select(null);
      P.ap.w = sect; Object.assign(P, { x: 1000, y: 1100, r: 0, stage: 1, hp: 100, mp: 0, acd: 0, scd: 0, med: 0, sl: 0, dir: 2, f: 1 });
      kiemCombat.state.cooldown.fill(0); moonCombat.state.cooldown.fill(0);
      kiemCombat.state.stamp = null; moonCombat.state.stamp = false;
      getClassCombat().refreshUI?.(true);
      P.world.learnedSkills = [false, false, false, false]; P.world.skillLevels = [0, 0, 0, 0]; P.world.tutorial = true;
      E = []; B = []; X = []; K = {}; ptr = null;
      T.forEach(enemy => enemy.sp = 0); basicDamage.length = 0; basicCombat.reset();
      cultivation.refresh();
    };
    window.basicChain = enemy => {
      const profile = basicCombat.profiles[P.ap.w], steps = [];
      for (let i = 0; i < profile.steps; i++) {
        const accepted = basicCombat.attack(enemy); steps.push(basicCombat.state.lastHit && { ...basicCombat.state.lastHit, accepted, gap: basicCombat.state.gap, cooldown: P.acd });
        if (i < profile.steps - 1) basicStep(profile.interval + .005);
      }
      return steps;
    };
  });
}

(async () => {
  const server = spawn('python', ['-u', '-c', 'from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer; s=ThreadingHTTPServer(("127.0.0.1",0),SimpleHTTPRequestHandler); print(s.server_port,flush=True); s.serve_forever()'], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
  let browser;
  try {
    const port = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('HTTP server startup timed out')), 10000);
      server.stdout.once('data', data => { clearTimeout(timer); resolve(Number(String(data).trim())); });
      server.once('error', reject);
    });
    browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--no-proxy-server'] });
    const errors = [], missing = [];
    async function createPage(options) {
      const page = await browser.newPage(options);
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => { if (response.status() === 404) missing.push(response.url()); });
      await page.route('**/api/**', route => route.fulfill({ status: 201, contentType: 'application/json', body: '{"saved":true}' }));
      let arenaEntries = 0;
      await page.route('**/api/arena', route => {
        if (route.request().method() === 'POST') arenaEntries++;
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ day: '2026-10-14', used: arenaEntries, remaining: 2 - arenaEntries }) });
      });
      await page.route('**/fonts.googleapis.com/**', route => route.abort());
      await page.addInitScript(() => { window.requestAnimationFrame = () => 0; });
      await require('./test-account.cjs')(page);
      await page.route('**/api/adventure',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({quests:[],recipes:[],shop:[],tutorial:{},fragments:0,merit:0})}));
      await page.goto('http://127.0.0.1:' + port, { waitUntil: 'networkidle' });
      await page.locator('#nm').fill('Kiểm tra combo'); await page.locator('#ok').click();
      await page.waitForFunction(() => !!window.basicCombat && creatureArt.ready());
      await installHelpers(page);
      return page;
    }
    const page = await createPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });

    const profiles = await page.evaluate(() => basicCombat.profiles.map(p => ({ steps: p.steps, interval: p.interval, range: p.range, name: p.name })));
    assert.deepEqual(profiles.map(p => p.steps), [4, 3, 4, 3]);
    assert(profiles[0].interval < profiles[1].interval && profiles[1].interval < profiles[2].interval && profiles[2].interval <= profiles[3].interval, 'Sword is fastest, spear/fan slower');
    assert(profiles[0].range < profiles[2].range && profiles[2].range < profiles[1].range && profiles[1].range < profiles[3].range, 'Each class keeps its own reach');
    assert.deepEqual(profiles.map(p => p.name), ['Ngự Kiếm Liên Trảm', 'Tam Nguyệt Luân', 'Lôi Thương Tứ Kích', 'Linh Phù Tam Thức']);

    for (let sect = 0; sect < 4; sect++) {
      const result = await page.evaluate(sect => {
        basicReset(sect); const range = basicCombat.range();
        const target = basicEnemy('target', P.x + Math.min(range * .65, 160), P.y), far = basicEnemy('far', P.x + range + 45, P.y), back = basicEnemy('back', P.x - 80, P.y);
        E = [target, far, back];
        const steps = basicChain(target), manaBefore = P.mp; basicStep(1.3);
        return { steps, target: target.hp, far: far.hp, back: back.hp, manaBefore, damage: basicDamage, combo: basicCombat.state.combo, last: basicCombat.state.lastHit };
      }, sect);
      assert(result.steps.every(s => s.accepted), 'All combo strikes accepted for sect ' + sect + ': ' + JSON.stringify(result.steps));
      assert.deepEqual(result.steps.map(s => s.step), Array.from({ length: profiles[sect].steps }, (_, i) => i), 'Ordered combo for sect ' + sect);
      assert(result.target < 10000, 'Combo damages target for sect ' + sect);
      assert.equal(result.far, 10000, 'Beyond-range enemy stays unharmed for sect ' + sect);
      assert.equal(result.back, 10000, 'Enemy behind the attack stays unharmed for sect ' + sect);
      assert(Math.abs(result.manaBefore - 1.5 * (profiles[sect].steps - 1) * (profiles[sect].interval + .005)) < .001, 'Basic attacks do not spend regenerated mana');

      const gates = await page.evaluate(sect => {
        basicReset(sect); const enemy = basicEnemy('cadence', P.x + 50, P.y); E = [enemy];
        basicCombat.attack(enemy); const first = { ...basicCombat.state.lastHit };
        basicCombat.attack(enemy); const repeated = { ...basicCombat.state.lastHit };
        basicStep(basicCombat.profiles[sect].interval + .005); basicCombat.attack(enemy); const second = { ...basicCombat.state.lastHit };
        basicStep(1.41); P.acd = 0; basicCombat.attack(enemy); const timedOut = { ...basicCombat.state.lastHit };
        basicStep(basicCombat.profiles[sect].interval + .005); const other = basicEnemy('other', P.x + 55, P.y); E.push(other); basicCombat.attack(other); const changed = { ...basicCombat.state.lastHit };
        basicStep(basicCombat.profiles[sect].interval + .005); cultivation.select(enemy); cultivation.select(other); basicCombat.attack(other); const reselected = { ...basicCombat.state.lastHit };
        basicReset(sect); const far = basicEnemy('too-far', P.x + basicCombat.range() + 50, P.y); E = [far]; basicCombat.attack(far); basicStep(.8);
        return { first, repeated, second, timedOut, changed, reselected, far: far.hp, rangedLast: basicCombat.state.lastHit };
      }, sect);
      assert.equal(gates.first.step, 0); assert.equal(gates.repeated.step, 0, 'Attack interval prevents a duplicate strike');
      assert.equal(gates.second.step, 1); assert.equal(gates.timedOut.step, 0, 'Interrupted chain restarts after 1.4s');
      assert.equal(gates.changed.step, 0, 'Changing target restarts chain');
      assert.equal(gates.reselected.step, 0, 'Selecting A then B then A between attacks restarts the chain');
      assert.equal(gates.far, 10000); assert.equal(gates.rangedLast, null, 'Out-of-range attacks do not advance combo');
      console.log('PASS sect ' + sect + ': ordered combo, cadence, reach, target change, timeout, no skill/mana requirement');
    }

    const sword = await page.evaluate(() => {
      basicReset(0); const enemy = basicEnemy('sword', P.x + 50, P.y); E = [enemy];
      kiemCombat.state.cooldown[0] = 4;
      for (let i = 0; i < 3; i++) { basicCombat.attack(enemy); basicStep(basicCombat.profiles[0].interval + .005); }
      const prior = basicDamage.length; basicCombat.attack(enemy); basicStep(.2);
      return { damage: basicDamage, prior, cooldown: kiemCombat.state.cooldown[0], freeze: enemy.fr, combo: basicCombat.state.combo };
    });
    assert(sword.damage.slice(sword.prior).reduce((total, hit) => total + hit.value, 0) > Math.max(...sword.damage.slice(0, sword.prior).map(hit => hit.value)), 'Sword X finisher is heavier than the earlier strikes');
    const swordElapsed = 3 * (profiles[0].interval + .005) + .2;
    assert(Math.abs(sword.cooldown - (4 - swordElapsed - .4)) < .02, 'Sword finisher refunds Skill 1 once');
    assert(sword.freeze > 0, 'Sword finisher applies brief stagger');
    assert.equal(sword.combo, 0, 'Full combo loops back to first strike');
    console.log('PASS sword X finisher: heavier damage, one cooldown refund, stagger');

    const moon = await page.evaluate(() => {
      basicReset(1); const enemy = basicEnemy('moon', P.x + 140, P.y); E = [enemy];
      basicCombat.attack(enemy); const instant = enemy.hp; basicStep(1.3);
      const hits = basicDamage.slice(), final = enemy.hp;
      basicReset(1); const moved = basicEnemy('miss', P.x + 140, P.y); E = [moved]; basicCombat.attack(moved); moved.y += 140; basicStep(1.3);
      return { instant, hits, final, miss: moved.hp };
    });
    assert.equal(moon.instant, 10000, 'Moon attacks travel instead of applying instant ranged damage');
    assert.equal(moon.hits.length, 2, 'Moon projectile hits once going out and once coming back');
    assert(moon.hits[1].value < moon.hits[0].value, 'Return hit is lighter');
    assert.equal(moon.miss, 10000, 'Moving clear of moon trajectory avoids damage');
    console.log('PASS moon boomerang: physical travel, one hit per direction, lighter return, dodgeable path');

    const spear = await page.evaluate(() => {
      function run(marked) {
        basicReset(2); const enemy = basicEnemy('spear', P.x + 65, P.y); E = [enemy]; if (marked) newClassCombat.addMark(enemy);
        basicChain(enemy); basicStep(.25); return { hp: enemy.hp, marks: newClassCombat.markCount(enemy), damage: basicDamage.slice() };
      }
      return { fresh: run(false), marked: run(true) };
    });
    assert.equal(spear.fresh.marks, 1, 'Spear fourth strike adds one shared lightning mark');
    assert.equal(spear.marked.marks, 2, 'Spear fourth strike retains and extends an existing mark');
    assert(spear.marked.hp < spear.fresh.hp, 'Existing lightning mark adds mini lightning damage');
    console.log('PASS spear fourth strike: shared marks and extra lightning on a marked enemy');

    const fan = await page.evaluate(() => {
      basicReset(3); const enemy = basicEnemy('fan', P.x + 150, P.y), splash = basicEnemy('splash', P.x + 150, P.y + 26); E = [enemy, splash];
      basicCombat.attack(enemy); const instant = enemy.hp; basicStep(.5); const firstMarks = newClassCombat.markCount(enemy);
      basicStep(.09); const firstHits = basicDamage.length; basicCombat.attack(enemy); basicStep(.5);
      const twinHits = basicDamage.slice(firstHits).filter(hit => hit.id === 'fan'), secondMarks = newClassCombat.markCount(enemy), beforeSplash = splash.hp;
      basicStep(.09); basicCombat.attack(enemy); basicStep(.8);
      return { instant, firstMarks, twinHits, secondMarks, beforeSplash, finalMarks: newClassCombat.markCount(enemy), hp: enemy.hp, splash: splash.hp };
    });
    assert.equal(fan.instant, 10000, 'Fan launches physical talismans');
    assert.equal(fan.twinHits.length, 2, 'Both converging talismans strike the target');
    assert.equal(fan.firstMarks, 0); assert.equal(fan.secondMarks, 1, 'Twin talismans grant one mark total per enemy');
    assert.equal(fan.finalMarks, 0, 'Finisher consumes one shared mark');
    assert.equal(fan.beforeSplash, 10000, 'Nearby splash enemy lies clear of the first two projectile paths');
    assert(fan.splash < fan.beforeSplash, 'Explosive talisman damages a nearby enemy');
    console.log('PASS fan talismans: ranged travel, one twin mark, finisher mark consumption and AoE');

    const suspend = await page.evaluate(() => {
      basicReset(0); const enemy = basicEnemy('gate', P.x + 50, P.y); E = [enemy]; P.med = 1; basicCombat.attack(enemy); const meditate = enemy.hp;
      P.med = 0; kiemCombat.state.dash = { age: 0 }; basicCombat.attack(enemy); const dash = enemy.hp; kiemCombat.state.dash = null;
      kiemCombat.state.ultimate = { age: 0 }; basicCombat.attack(enemy); const ultimate = enemy.hp; kiemCombat.state.ultimate = null;
      worldMap.dialog.show('Kiểm tra', 'Tạm dừng'); basicCombat.attack(enemy); const dialog = enemy.hp; worldMap.dialog.close();
      ttl.style.display = ''; basicCombat.attack(enemy); const title = enemy.hp; ttl.style.display = 'none';
      return { meditate, dash, ultimate, dialog, title, last: basicCombat.state.lastHit };
    });
    assert.deepEqual([suspend.meditate, suspend.dash, suspend.ultimate, suspend.dialog, suspend.title], [10000, 10000, 10000, 10000, 10000]);
    assert.equal(suspend.last, null);
    console.log('PASS attacks suspend during meditation, dash, ultimate, modal and title pause');

    assert(await page.evaluate(() => !$('world-dialog').contains(document.activeElement)), 'Closing a dialog restores focus outside the hidden modal');
    await page.evaluate(() => { basicReset(3); const enemy = basicEnemy('selected', P.x + 190, P.y); E = [enemy]; });
    await page.keyboard.press('f');
    await page.evaluate(() => basicStep(.25));
    assert.equal(await page.evaluate(() => basicCombat.state.lastHit?.sect), 3, 'F attacks a selected target within class reach');
    await page.keyboard.press('f');
    const stopped = await page.evaluate(() => { const before = basicCombat.state.lastHit; basicStep(.8); return before === basicCombat.state.lastHit; });
    assert(stopped, 'F stops repeated attacks');

    await page.evaluate(async () => { worldMap.travel('sword'); basicReset(0); await worldMap.openArena(); });
    await page.getByRole('button', { name: 'Vào đấu trường · 30 lượt', exact: true }).click();
    await page.waitForFunction(() => worldMap.state.scene === 'arena', null, { polling: 50 });
    assert.equal(await page.evaluate(() => worldMap.arenaRun().wave), 1, 'Arena opens through its real UI flow');
    for (const sect of [0, 1]) {
      await page.evaluate(sect => {
        classCombat.onRespawn(); P.ap.w = sect; P.acd = 0; P.med = 0; P.hp = mhp(); P.mp = 0;
        basicDamage.length = 0; T.forEach(enemy => enemy.sp = 0);
        E.forEach((enemy, index) => Object.assign(enemy, { id: index ? 'arena-other-' + index : 'arena-target', hp: 10000, maxHp: 10000, dead: 0, cd: 999, fr: 0,
          x: index ? P.x - 150 : P.x + (sect === 0 ? 50 : 145), y: index ? P.y + (index % 2 ? 30 : -30) : P.y }));
      }, sect);
      await page.keyboard.press('f');
      const steps = [];
      for (let strike = 0; strike < profiles[sect].steps; strike++) {
        steps.push(await page.evaluate(({ sect, strike, interval }) => {
          if (sect === 0 && strike === 1) { const unrelated = E.find(enemy => enemy.id !== 'arena-target'); unrelated.hp = 0; unrelated.dead = 8; }
          basicStep(strike ? interval + .005 : .13);
          return basicCombat.state.lastHit?.step;
        }, { sect, strike, interval: profiles[sect].interval }));
      }
      assert.deepEqual(steps, Array.from({ length: profiles[sect].steps }, (_, index) => index), 'Arena filtering retains sect ' + sect + ' combo over many frames');
      await page.keyboard.press('f');
      const arena = await page.evaluate(() => {
        basicStep(.95); const target = E.find(enemy => enemy.id === 'arena-target');
        return { hp: target.hp, hits: basicDamage.filter(hit => hit.id === target.id), scene: worldMap.state.scene, count: E.length, wave: worldMap.arenaRun().wave };
      });
      assert.equal(arena.scene, 'arena'); assert.equal(arena.wave, 1); assert.equal(arena.count, 2, 'Arena removes the defeated unrelated enemy');
      assert(arena.hp < 10000, 'Sect ' + sect + ' attacks actually damage an arena target');
      assert(arena.hits.length >= profiles[sect].steps, 'Multiple melee/ranged strikes survive arena filtering');
    }
    await page.evaluate(() => worldMap.leaveArena());
    for (const sect of [0, 1]) {
      const replacement = await page.evaluate(sect => {
        basicReset(sect); const oldTarget = basicEnemy('old-list', P.x + 50, P.y); E = [oldTarget];
        basicCombat.attack(oldTarget); basicStep(.03);
        const queued = basicCombat.state.swings.length + basicCombat.state.projectiles.length;
        const newTarget = basicEnemy('new-list', P.x + 50, P.y); E = [newTarget]; basicStep(1);
        return { queued, oldHp: oldTarget.hp, newHp: newTarget.hp, combo: basicCombat.state.combo, swings: basicCombat.state.swings.length,
          projectiles: basicCombat.state.projectiles.length, effects: basicCombat.state.effects.length, last: basicCombat.state.lastHit };
      }, sect);
      assert(replacement.queued > 0, 'Attack has a pending melee/ranged hit before enemy replacement');
      assert.deepEqual({ oldHp: replacement.oldHp, newHp: replacement.newHp, combo: replacement.combo, swings: replacement.swings,
        projectiles: replacement.projectiles, effects: replacement.effects, last: replacement.last },
      { oldHp: 10000, newHp: 10000, combo: 0, swings: 0, projectiles: 0, effects: 0, last: null }, 'A wholly new enemy list cancels old attack references');
    }
    console.log('PASS real arena F combos survive per-frame filtering; full enemy replacement cancels pending melee/ranged attacks');

    const reset = await page.evaluate(() => {
      basicReset(1); const enemy = basicEnemy('reset', P.x + 150, P.y); E = [enemy]; basicCombat.attack(enemy); classCombat.onRespawn();
      const respawn = { combo: basicCombat.state.combo, effects: basicCombat.state.effects.length, projectiles: basicCombat.state.projectiles.length };
      basicCombat.attack(enemy); worldMap.travel('hub');
      const map = { combo: basicCombat.state.combo, effects: basicCombat.state.effects.length, projectiles: basicCombat.state.projectiles.length };
      worldMap.travel('sword'); basicReset(1); E = [basicEnemy('recreate', P.x + 150, P.y)]; basicCombat.attack(E[0]);
      P.ap=null;cr.style.display='flex';
      $('ok').onclick();
      const creator = { combo: basicCombat.state.combo, effects: basicCombat.state.effects.length, projectiles: basicCombat.state.projectiles.length };
      return { respawn, map, creator };
    });
    assert.deepEqual(reset.respawn, { combo: 0, effects: 0, projectiles: 0 });
    assert.deepEqual(reset.map, { combo: 0, effects: 0, projectiles: 0 });
    assert.deepEqual(reset.creator, { combo: 0, effects: 0, projectiles: 0 });
    console.log('PASS F toggles real targeted attacks; respawn/map travel/creation clear all basic combat');

    for (let sect = 0; sect < 4; sect++) {
      await page.evaluate(sect => { P.world.tutorial = true; worldMap.travel(['sword','moon','thunder','mystic'][sect]); basicReset(sect); E = [basicEnemy('preview', P.x + 65, P.y)]; basicChain(E[0]); basicStep([.18, .32, .14, .24][sect]); }, sect);
      await page.screenshot({ path: path.join(artifacts, 'basic-combo-' + ['sword', 'moon', 'spear', 'fan'][sect] + '-desktop.png') });
    }
    const mobile = await createPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await mobile.evaluate(() => { P.world.tutorial = true; worldMap.travel('mystic'); basicReset(3); E = [basicEnemy('touch', P.x + 40, P.y)]; });
    await mobile.locator('#basic-attack').tap(); await mobile.evaluate(() => basicStep(.65));
    assert.equal(await mobile.evaluate(() => basicCombat.state.lastHit?.sect), 3, 'Touch button activates class combo');
    await mobile.screenshot({ path: path.join(artifacts, 'basic-combo-fan-mobile.png') });
    assert(await mobile.evaluate(() => sb.getBoundingClientRect().bottom <= $('bt').getBoundingClientRect().top), 'Skill and attack controls do not overlap on mobile');
    assert.deepEqual(errors, [], 'No browser script errors'); assert.deepEqual(missing, [], 'No missing game assets');
    console.log('PASS desktop/mobile combat rendering and controls; screenshots saved to tests/artifacts');
  } finally { await browser?.close(); server.kill(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
