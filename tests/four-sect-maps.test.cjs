/* Real browser map/navigation regression; HTTP APIs are mocked and file:// uses an isolated context. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { spawn } = require('node:child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const root = path.resolve(__dirname, '..'), artifacts = path.join(__dirname, 'artifacts');
const maps = [
  { id: 'sword', name: 'Vạn Kiếm Sơn', folder: 'Kiem' },
  { id: 'moon', name: 'Nguyệt Hồ Cung', folder: 'Liem' },
  { id: 'thunder', name: 'Lôi Vân Phong', folder: 'Thuong' },
  { id: 'mystic', name: 'Thiên Cơ Các', folder: 'Quat' }
];
fs.mkdirSync(artifacts, { recursive: true });

(async () => {
  const server = spawn('python', ['-u', '-c', 'from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer; s=ThreadingHTTPServer(("127.0.0.1",0),SimpleHTTPRequestHandler); print(s.server_port,flush=True); s.serve_forever()'], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
  let browser;
  try {
    const port = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Local HTTP server startup timed out')), 10000);
      server.stdout.once('data', data => { clearTimeout(timer); resolve(Number(String(data).trim())); }); server.once('error', reject);
    });
    browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--no-proxy-server'] });
    const errors = [], missing = [], mentors = [], artHashes = [];
    async function makePage(url, sect, viewport = { width: 1440, height: 900 }) {
      const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
      page.on('pageerror', error => errors.push(url + ': ' + error.message));
      page.on('response', response => { if (response.status() === 404) missing.push(response.url()); });
      await page.route('**/api/characters', route => route.fulfill({ status: 201, contentType: 'application/json', body: '{"saved":true}' }));
      await page.route('**/api/arena', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ used: route.request().method() === 'POST' ? 1 : 0, remaining: route.request().method() === 'POST' ? 1 : 2 }) }));
      await page.route('**/fonts.googleapis.com/**', route => route.abort());
      await page.addInitScript(() => {
        requestAnimationFrame = () => 0;
        window.mapPixelReads = 0;
        CanvasRenderingContext2D.prototype.getImageData = function () { mapPixelReads++; throw new DOMException('Origin-protected canvas must not be read', 'SecurityError'); };
      });
      await require('./test-account.cjs')(page);await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => creatureArt.ready() && worldMap.state.ready, null, { polling: 50 });
      await page.locator('.sect-choice').nth(sect).click();
      if (url.startsWith('file:')) await page.locator('.gender-choice button').nth(1).click();
      await page.locator('#nm').fill('Thử bốn map'); await page.locator('#ok').click();
      await page.evaluate(() => {
        window.mapStep = seconds => { const count = Math.ceil(seconds / .01), dt = seconds / count; for (let i = 0; i < count; i++) { tm += dt; up(dt); } dr(); };
        P.world.tutorial = true; T.forEach(enemy => enemy.sp = 0); dr();
      });
      return page;
    }
    async function snapshot(page, id, suffix = 'desktop') {
      await page.evaluate(() => { worldMap.dialog.close(); mapStep(.01); });
      await page.screenshot({ path: path.join(artifacts, 'four-map-' + id + '-' + suffix + '.png'), animations: 'disabled' });
      if (suffix === 'desktop') {
        await page.evaluate(() => {
          const canvas = document.createElement('canvas'); canvas.id = 'map-audit-overview'; canvas.width = canvas.height = 600;
          canvas.style.cssText = 'position:fixed;left:10px;top:10px;z-index:100;width:600px;height:600px'; document.body.appendChild(canvas);
          worldMap.renderMini(canvas.getContext('2d'), 600);
        });
        await page.locator('#map-audit-overview').screenshot({ path: path.join(artifacts, 'four-map-' + id + '-overview.png') });
        await page.evaluate(() => {
          const canvas = $('map-audit-overview'); canvas.width = canvas.height = 800;
          canvas.style.width = canvas.style.height = '800px'; worldMap.renderMapPreview(canvas.getContext('2d'), 800);
        });
        const rendered = await page.locator('#map-audit-overview').screenshot({ path: path.join(artifacts, 'four-map-' + id + '-art-overview.png') });
        artHashes.push(crypto.createHash('sha256').update(rendered).digest('hex'));
        await page.evaluate(() => $('map-audit-overview').remove());
      }
    }
    async function verifyTeleportMenu(page) {
      await page.evaluate(() => { worldMap.state.near = worldMap.services.find(service => service.id === 'teleport'); worldMap.interact(); });
      assert(await page.locator('#world-dialog').isVisible(), 'Teleport service opens a destination menu');
      const buttons = await page.locator('#world-content button').allTextContents();
      assert.equal(buttons.length, 6, 'Hub and all four sects are available destinations');
      for (const name of ['Thiên Vân Thành','Linh Mạch Cốc', ...maps.map(map => map.name)]) assert(buttons.some(label => label.startsWith(name)), 'Teleport destination ' + name);
      assert.equal(await page.locator('#world-content button:disabled').count(), 0);
      return buttons;
    }

    let main;
    for (const protocol of ['http', 'file']) for (let sect = 0; sect < maps.length; sect++) {
      const definition = maps[sect], url = protocol === 'http' ? 'http://127.0.0.1:' + port : pathToFileURL(path.join(root, 'index.html')).href;
      const page = await makePage(url, sect);
      const facts = await page.evaluate(() => {
        const routes = worldMap.bridgeRoutes(), spawn = { x: P.x, y: P.y }, water = { x: 200, y: 300 }, stop = worldMap.traceMove(spawn, water);
        const routeFailures = [];
        for (const route of routes) for (let i = 1; i < route.length; i++) {
          const end = worldMap.traceMove(route[i - 1], route[i]);
          if (!worldMap.canWalk(route[i]) || Math.hypot(end.x - route[i].x, end.y - route[i].y) > 1) routeFailures.push({ from: route[i - 1], to: route[i], end });
        }
        const images = [], draw = g.drawImage; g.drawImage = function (image, ...args) { if (image.src) images.push(image.src); return draw.call(this, image, ...args); };
        try { const actors = []; worldMap.queueActors(actors, 0, 0, M, M); actors.forEach(actor => actor[1]()); } finally { g.drawImage = draw; }
        return { scene: worldMap.state.scene, appearance: P.ap, title: worldMap.sceneTitle(), spawn, safe: worldMap.isSafe(P), zoom: Z * innerWidth / W,
          camera: gameCamera(), keys: Object.keys(worldMap.sectMaps), regions: worldMap.regions.map(region => region.id), routes: routes.length, routeFailures,
          waterWalkable: worldMap.canWalk(water), stop, stopWalkable: worldMap.canWalk(stop),
          camps: worldMap.farmCamps.map(camp => ({ id: camp.id, x: camp.x, y: camp.y, type: camp.t, count: E.filter(enemy => enemy.camp === camp.id).length })),
          enemiesOnLand: E.every(enemy => worldMap.canWalk(enemy) && !worldMap.isSafe(enemy) && enemy.map === worldMap.state.scene),
          servicesOnLand: worldMap.services.filter(service => ['mentor', 'sectSkills', 'teleport', 'boss'].includes(service.id)).every(service => worldMap.canWalk(service) && worldMap.isSafe(service)),
          mentor: worldMap.services.find(service => service.id === 'mentor').name, images };
      });
      assert.equal(facts.scene, definition.id); assert.equal(facts.appearance.w, sect); assert.equal(facts.title, definition.name);
      assert.deepEqual(facts.spawn, { x: 1000, y: 1110 }); assert(facts.safe, 'Starting platform is safe'); assert(Math.abs(facts.zoom-2.4)<.001);
      assert.equal(facts.camera.x + facts.camera.vw / 2, 1000); assert.equal(facts.camera.y + facts.camera.vh / 2, 1110);
      assert.deepEqual(facts.keys.sort(), ['hub','valley', ...maps.map(map => map.id)].sort()); assert.deepEqual(facts.regions.sort(), facts.keys.sort());
      assert.equal(facts.routes, 4); assert.deepEqual(facts.routeFailures, [], protocol + ' ' + definition.id + ' routes remain connected');
      assert.equal(facts.waterWalkable, false); assert(facts.stopWalkable); assert(Math.hypot(facts.stop.x - 200, facts.stop.y - 300) > 50, 'Movement stops at the land edge');
      assert.deepEqual(facts.camps, [
        { id: 'north', x: 1000, y: 490, type: 0, count: 6 }, { id: 'east', x: 1640, y: 1100, type: 1, count: 6 },
        { id: 'south', x: 1000, y: 1650, type: 4, count: 6 }, { id: 'west', x: 360, y: 1100, type: 3, count: 6 }
      ]);
      assert(facts.enemiesOnLand, 'Farm monsters occupy walkable, unsafe land belonging to their map');
      assert(facts.servicesOnLand, 'Mentor, teacher, teleport and arena services occupy accessible safe land');
      assert(facts.mentor.includes('Sư phụ')); assert(!facts.mentor.includes('undefined'));
      assert(facts.images.some(source => source.endsWith('/CHARACTER/' + definition.folder + '/Nam/truoc.png')), 'NPCs use the correct sect artwork');
      if (protocol === 'http') mentors.push(facts.mentor);
      await page.evaluate(() => worldMap.handleService('mentor'));
      assert((await page.locator('#world-title').textContent()).includes(facts.mentor.split(' · ')[0]), 'Mentor dialogue names the local teacher');
      await page.getByRole('button', { name: 'Chọn tầng luyện công', exact: true }).click();
      assert((await page.locator('#world-title').textContent()).includes('Tầng luyện công'), 'Training opens in every sect');
      await page.evaluate(() => { worldMap.dialog.close(); P.r = 1; cultivation.training(); });
      await page.getByRole('button', { name: 'Luyện Khí · Đã mở', exact: true }).click();
      assert(await page.evaluate(() => E.length === 24 && E.every(enemy => enemy.trainingRealm === 1 && enemy.map === worldMap.state.scene)), 'Selecting a training realm rebuilds the local farm');
      await page.evaluate(() => { P.r = 0; P.stage = 1; P.hp = mhp(); P.mp = mmp(); dr(); });
      await verifyTeleportMenu(page); await page.evaluate(() => worldMap.dialog.close());
      if (protocol === 'http') await snapshot(page, definition.id);
      assert.equal(await page.evaluate(() => mapPixelReads), 0); assert.equal(await page.locator('#dbg').count(), 0);
      console.log('PASS ' + protocol + ' ' + definition.id + ': creation, spawn/camera, routes/water, farm/safety, mentor artwork, training and five-destination teleport');
      if (protocol === 'http' && sect === 0) main = page; else await page.close();
    }
    assert.equal(new Set(mentors).size, 4, 'Each sect has its own mentor');

    const cache = await main.evaluate(ids => {
      const saved = {}, references = [];
      for (const id of ids) { worldMap.travel(id); const enemy = E[0]; enemy.hp -= 1; saved[id] = { enemy, hp: enemy.hp }; references.push(enemy); }
      const matches = ids.map(id => { worldMap.travel(id); return { id, same: E[0] === saved[id].enemy, hp: E[0].hp, expected: saved[id].hp }; });
      return { independent: new Set(references).size, matches };
    }, maps.map(map => map.id));
    assert.equal(cache.independent, 4, 'Every sect has its own monster objects');
    for (const result of cache.matches) { assert(result.same, 'Returning restores the ' + result.id + ' farm cache'); assert.equal(result.hp, result.expected); }
    await main.evaluate(() => worldMap.travel('hub')); await snapshot(main, 'hub');
    assert.equal(new Set(artHashes).size, 5, 'All five full map artwork overviews are distinct');
    for (const destination of ['hub', ...maps.map(map => map.id)]) {
      await verifyTeleportMenu(main);
      const name = destination === 'hub' ? 'Thiên Vân Thành' : maps.find(map => map.id === destination).name;
      await main.getByRole('button', { name: new RegExp('^' + name) }).click();
      assert.equal(await main.evaluate(() => worldMap.state.scene), destination, 'Teleport button reaches ' + destination);
    }
    console.log('PASS independent farm caches, all five teleport buttons and hub rendering');

    for (const id of ['thunder', 'mystic']) {
      await main.evaluate(id => { worldMap.travel(id); P.x = 1640; P.y = 1100; P.hp = -999; mapStep(.01); }, id);
      assert.deepEqual(await main.evaluate(() => ({ scene: worldMap.state.scene, x: P.x, y: P.y, alive: P.hp > 0 })), { scene: id, x: 1000, y: 1110, alive: true }, 'Respawn stays in ' + id);
      for (const death of [false, true]) {
        await main.evaluate(() => worldMap.openArena());
        await main.getByRole('button', { name: 'Vào đấu trường · 30 lượt', exact: true }).click();
        await main.waitForFunction(() => worldMap.state.scene === 'arena', null, { polling: 50 });
        await main.evaluate(death => { if (death) { P.hp = -999; mapStep(.01); } else worldMap.leaveArena(); }, death);
        assert.deepEqual(await main.evaluate(() => ({ scene: worldMap.state.scene, map: P.world.map, x: P.x, y: P.y, enemies: E.length, arena: worldMap.arenaRun() })),
          { scene: id, map: id, x: 1000, y: 1110, enemies: 24, arena: null }, (death ? 'Arena death' : 'Arena exit') + ' returns to ' + id);
      }
      const mobile = await makePage('http://127.0.0.1:' + port, maps.findIndex(map => map.id === id), { width: 390, height: 844 });
      await snapshot(mobile, id, 'mobile');
      assert(await mobile.evaluate(() => sb.getBoundingClientRect().bottom <= $('bt').getBoundingClientRect().top), 'Mobile controls do not overlap in ' + id);
      await mobile.keyboard.press('m');
      assert(await mobile.locator('#world-content .world-overview').isVisible(), 'M opens the artwork overview in ' + id);
      const overviewText = await mobile.locator('#world-content').textContent();
      for (const map of maps) assert(overviewText.includes(map.name), 'Overview lists ' + map.name);
      await mobile.screenshot({ path: path.join(artifacts, 'four-map-' + id + '-mobile-map.png'), animations: 'disabled' });
      await mobile.close();
    }
    assert.deepEqual(errors, [], 'No script errors on HTTP or direct file opening'); assert.deepEqual(missing, [], 'No missing map/character assets');
    assert.equal(await main.locator('#dbg').count(), 0);
    console.log('PASS thunder/mystic respawn, arena exit/death return and mobile rendering; five center/minimap screenshots saved');
  } finally { await browser?.close(); server.kill(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
