/* Real browser combat regression tests. No test records are written to the TXT DB. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const packageRoot = process.env.PLAYWRIGHT_MODULE || path.join(require('node:os').homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { chromium } = require(packageRoot);
const root = path.resolve(__dirname, '..');
const output = path.join(__dirname, 'artifacts');
fs.mkdirSync(output, { recursive: true });

(async () => {
  const server = spawn('python', ['-u', '-c', 'from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer; s=ThreadingHTTPServer(("127.0.0.1",0),SimpleHTTPRequestHandler); print(s.server_port,flush=True); s.serve_forever()'], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
  let browser;
  try {
    const port = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Local server startup timed out')), 10000);
      server.stdout.once('data', data => { clearTimeout(timer); resolve(Number(data.toString().trim())); });
      server.once('error', reject);
    });
    browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--no-proxy-server'] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/characters', route => route.fulfill({ status: 201, contentType: 'application/json', body: '{"saved":true}' }));
    await page.route('**/fonts.googleapis.com/**', route => route.abort());
    // Drive the actual game functions at deterministic frame intervals.
    await page.addInitScript(() => { window.requestAnimationFrame = () => 0; });
    const url = 'http://127.0.0.1:' + port;
    await require('./test-account.cjs')(page);await page.goto(url, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('#cr').isVisible(), true);
    await page.locator('#nm').fill('Kiếm thử');
    await page.locator('#ok').click();
    assert.equal(await page.locator('#sb button').first().getAttribute('aria-label'), 'Phi Kiếm Quyết');
    await page.evaluate(() => {
      window.damageLog = [];
      const originalHit = hit;
      hit = (enemy, value) => { damageLog.push({ id: enemy.id, value }); originalHit(enemy, value); };
      window.resetTest = () => {
        window.kiemCombat.onRespawn();
        window.kiemCombat.state.cooldown.fill(0);
        window.kiemCombat.state.aim = null;
        E.length=0;B.length=0;SP.length=0;V.length=0;LT.length=0;X.length=0;PT.length=0;
        K={};ptr=null;damageLog.length=0;
        P.world.learnedSkills=[true,true,true,true];Object.assign(P,{x:1000,y:1100,r:3,hp:280,mp:125,acd:100,scd:0,dir:2,f:1,med:0});
      };
      window.enemyTest = (id,x,y) => ({id,t:2,x,y,hx:x,hy:y,hp:10000,dead:0,cd:0,fr:0,fl:0});
      window.stepTest = (seconds) => {
        const count=Math.ceil(seconds/.01),dt=seconds/count;
        for(let i=0;i<count;i++){tm+=dt;up(dt);}
        dr();
      };
      resetTest();
      E.push(enemyTest('near',1080,1078),enemyTest('far',1180,1078));
      kiemCombat.state.aim={x:1300,y:1100};
      skill(0);
      const source=characterWeapon.position(0);
      if(!kiemCombat.state.flying.every(s=>Math.abs(s.x-source.x)<.001&&Math.abs(s.y-10-source.y)<.001))throw new Error('Swords must launch from the orbiting weapon');
      const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d'),images=[],draw=window.renderArtwork;
      window.renderArtwork=(context,img,...args)=>{images.push(img.src||'');draw(context,img,...args);};
      try{drawChar(ctx,60,70,0,1,false,0,false,P.ap);}finally{window.renderArtwork=draw;}
      if(!images.some(src=>src.endsWith('/Kiem/Lung/lung.png'))||images.some(src=>src.includes('/Skill/')))throw new Error('Original sword back equipment must remain, without idle skill blades');
      stepTest(1.5);
    });
    const phi = await page.evaluate(() => ({ hits: damageLog, flying: kiemCombat.state.flying.length, fireballs: B.length, mp: P.mp }));
    for (const id of ['near', 'far']) {
      const hits = phi.hits.filter(h => h.id === id);
      assert.equal(hits.length, 3, 'All three swords must pierce ' + id);
      assert(hits[0].value > hits[1].value && hits[1].value > hits[2].value, 'Repeated hits need diminishing damage');
    }
    assert.equal(phi.flying, 0, 'Swords must return to the back');
    assert.equal(phi.fireballs, 0, 'Sword class must not cast fireballs');
    console.log('PASS Phi Kiếm: 3 piercing swords, diminishing damage, return to back');

    await page.evaluate(() => {
      resetTest();K.d=1;
      E.push(enemyTest('dash-a',1070,1100),enemyTest('dash-b',1130,1100));
      skill(1);stepTest(.07);
    });
    await page.screenshot({ path: path.join(output, 'dash.png') });
    await page.evaluate(() => stepTest(.07));
    const dash = await page.evaluate(() => ({ x:P.x,hp:P.hp,hits:damageLog,cooldown:kiemCombat.state.cooldown[1],active:kiemCombat.isDashing() }));
    assert.equal(dash.x, 1180);
    assert.equal(dash.hp, 280, 'Dash must avoid contact attacks');
    assert.equal(dash.hits.length, 2);
    assert(dash.cooldown < 4 && dash.cooldown > 3.7, 'Cooldown refund must happen once');
    assert.equal(dash.active, false);
    await page.evaluate(() => {resetTest();const shape=worldMap.sectLayouts.sword;P.y=1150;P.x=1000+shape.rx*(1-50/shape.ry)-30;window.dashBoundaryStart=P.x;K.d=1;skill(1);stepTest(.16);});
    assert(await page.evaluate(() => P.x<dashBoundaryStart+180&&worldMap.canWalk(P)&&!worldMap.canWalk({x:P.x+4,y:P.y})), 'Dash must stop at the current island edge');
    console.log('PASS Dash: line damage, invulnerability, one refund, map bounds');

    await page.evaluate(() => {resetTest();E.push(enemyTest('inside',1020,1100),enemyTest('outside',1450,1100));skill(2);stepTest(.4);});
    await page.screenshot({ path: path.join(output, 'formation.png') });
    const formation = await page.evaluate(() => {
      const inside=E[0],oldHP=inside.hp;hit(inside,100);
      const buff=oldHP-inside.hp,slow=kiemCombat.enemySpeed(inside);
      damageLog.length=0;stepTest(4.5);
      return {buff,slow,hits:damageLog,field:kiemCombat.state.field};
    });
    assert.equal(formation.buff, Math.round(100*1.25*1.06), 'Sword self-buff combines with boss-resistant pressure vulnerability');
    assert.equal(formation.slow, .8);
    assert.equal(formation.hits.filter(h=>h.id==='inside').length, 8);
    assert.equal(formation.hits.filter(h=>h.id==='outside').length, 0);
    assert.equal(formation.field, null);
    console.log('PASS Formation: 4.8s duration, 8 pulses, 20% slow, 25% sword buff and boss-resistant pressure');

    await page.evaluate(() => {
      resetTest();E.push(enemyTest('ultimate',1120,1100),enemyTest('outside',1460,1100));
      kiemCombat.state.aim={x:1120,y:1100};skill(3);stepTest(.6);
    });
    await page.screenshot({ path: path.join(output, 'ultimate-charge.png') });
    await page.evaluate(() => stepTest(.8));
    await page.screenshot({ path: path.join(output, 'ultimate-rain.png') });
    await page.evaluate(() => stepTest(.7));
    await page.screenshot({ path: path.join(output, 'ultimate-finish.png') });
    await page.evaluate(() => stepTest(1.1));
    const ultimate = await page.evaluate(() => ({hits:damageLog,active:kiemCombat.state.ultimate}));
    const ultiHits=ultimate.hits.filter(h=>h.id==='ultimate');
    assert.equal(ultiHits.length, 7);
    assert(ultiHits[6].value > ultiHits[0].value * 9);
    assert.equal(ultimate.hits.filter(h=>h.id==='outside').length, 0);
    assert.equal(ultimate.active, null);
    console.log('PASS Ultimate: 6 small damage waves + 1 sword finisher, bounded target area');

    await page.evaluate(()=>{resetTest();skill(2);skill(0);stepTest(1.5);});
    assert.equal(await page.evaluate(()=>kiemCombat.state.flying.length),0,'Phi swords return to an active formation');
    assert(await page.evaluate(()=>!!kiemCombat.state.field));
    await page.evaluate(()=>{skill(3);});
    assert.equal(await page.evaluate(()=>kiemCombat.state.ultimate.power),47*1.25,'Formation buff is retained by ultimate when it absorbs the formation');
    assert.equal(await page.evaluate(()=>kiemCombat.state.field),null);
    console.log('PASS Formation-to-Phi-to-Ultimate combo and sword ownership');

    await page.evaluate(() => {resetTest();skill(0);skill(0);});
    assert.equal(await page.evaluate(() => kiemCombat.state.flying.length), 3, 'Cooldown prevents duplicate casts');
    await page.evaluate(() => {resetTest();P.r=0;skill(3);});
    assert.equal(await page.evaluate(() => kiemCombat.state.ultimate), null, 'Realm gate must stay active');
    await page.evaluate(() => {resetTest();P.mp=0;skill(1);});
    assert.equal(await page.evaluate(() => kiemCombat.state.dash), null, 'No mana means no dash');
    await page.evaluate(() => {resetTest();skill(2);P.hp=-1;stepTest(.01);});
    assert.equal(await page.evaluate(() => kiemCombat.state.field), null, 'Respawn cancels active formation');

    await page.reload({ waitUntil:'networkidle' });
    assert.equal(await page.locator('#cr').isVisible(), true);
    await page.locator('.sect-choice').nth(1).click();
    await page.locator('#nm').fill('Nguyệt thử');await page.locator('#ok').click();
    assert.equal(await page.locator('#sb button').first().getAttribute('aria-label'), 'Tam Nguyệt Trảm');
    await page.evaluate(()=>{P.stage=3;P.world.learnedSkills[0]=true;cultivation.refresh();});await page.keyboard.press('Space');
    assert.equal(await page.evaluate(() => B.length), 0);
    assert.equal(await page.evaluate(() => moonCombat.state.flying.length), 3);
    assert.equal(await page.evaluate(() => kiemCombat.state.flying.length), 0);
    console.log('PASS Class isolation, mana/realm/cooldown gates, respawn cleanup, mandatory creation');
    await page.setViewportSize({width:390,height:844});
    await page.reload({waitUntil:'networkidle'});
    await page.evaluate(() => {tm=.5;pv.setTransform(1,0,0,1,0,0);pv.clearRect(0,0,320,320);pv.setTransform(4,0,0,4,0,0);drawChar(pv,32,63,0,1,false,0,false,tp,'#5fb3a1');});
    await page.screenshot({path:path.join(output,'mobile-creator.png')});
    assert.deepEqual(errors, [], 'No uncaught browser errors');
    assert.equal(await page.locator('#dbg').count(),0,'No swallowed game rendering errors');
    const realtime=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
    realtime.on('pageerror',error=>errors.push(error.message));
    await realtime.route('**/api/characters',route=>route.fulfill({status:201,contentType:'application/json',body:'{"saved":true}'}));
    await realtime.route('**/fonts.googleapis.com/**',route=>route.abort());
    await require('./test-account.cjs')(realtime);await realtime.goto(url,{waitUntil:'networkidle'});
    await realtime.locator('#nm').fill('Kiếm thực');await realtime.locator('#ok').click();
    await realtime.evaluate(()=>{P.world.learnedSkills=[true,true,true,true];P.r=3;lr=3;P.mp=125;P.hp=280;E.length=0;skill(2);});
    await realtime.waitForFunction(()=>kiemCombat.state.field&&kiemCombat.state.field.age>.4);
    await realtime.screenshot({path:path.join(output,'mobile-realtime-formation.png')});
    await realtime.evaluate(()=>{P.mp=125;kiemCombat.state.aim={x:P.x,y:P.y};skill(3);});
    await realtime.waitForFunction(()=>kiemCombat.state.ultimate&&kiemCombat.state.ultimate.finished);
    await realtime.screenshot({path:path.join(output,'mobile-realtime-ultimate.png')});
    await realtime.waitForFunction(()=>!kiemCombat.state.ultimate);
    assert.equal(await realtime.locator('#dbg').count(),0);
    assert(await realtime.evaluate(()=>{
      const skills=sb.getBoundingClientRect(),controls=$('bt').getBoundingClientRect();
      return skills.bottom<controls.top;
    }),'Mobile skill bar must not overlap the action buttons');
    assert.deepEqual(errors,[]);
    await realtime.close();
    console.log('PASS Browser rendering: no runtime errors; desktop/mobile screenshots saved');
  } finally {
    if(browser)await browser.close();
    server.kill();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
