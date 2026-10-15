const assert=require('node:assert/strict'),path=require('node:path'),{spawn}=require('node:child_process');
const {chromium}=require(path.join(require('node:os').homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async()=>{
 const root=path.resolve(__dirname,'..'),server=spawn('python',['-u','tests/world_server_fixture.py'],{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe']});let browser;
 try{
  const port=await new Promise((resolve,reject)=>{server.stdout.once('data',d=>resolve(Number(String(d).trim())));server.once('error',reject);});
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server']});const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/characters',r=>r.fulfill({status:201,contentType:'application/json',body:'{"saved":true}'}));await page.route('**/fonts.googleapis.com/**',r=>r.abort());await page.addInitScript(()=>requestAnimationFrame=()=>0);
  await require('./test-account.cjs')(page);await page.goto('http://127.0.0.1:'+port,{waitUntil:'networkidle'});await page.waitForFunction(()=>worldMap.asset('moonCourt')&&creatureArt.ready(),null,{polling:50});await page.locator('#nm').fill('Thử đấu');await page.locator('#ok').click();
  await page.evaluate(()=>{window.step=seconds=>{const n=Math.ceil(seconds/.01);for(let i=0;i<n;i++){tm+=seconds/n;up(seconds/n);}dr();};P.world.tutorial=true;step(.01);});
  for(const scene of ['sword','moon','thunder','mystic']){
   await page.evaluate(id=>{worldMap.travel(id);step(.01);},scene);
   assert.deepEqual(await page.evaluate(()=>worldMap.farmCamps.map(c=>({count:E.filter(e=>e.camp===c.id).length,types:[...new Set(E.filter(e=>e.camp===c.id).map(e=>e.t))]}))),[{count:6,types:[0]},{count:6,types:[1]},{count:6,types:[4]},{count:6,types:[3]}]);
   assert(await page.evaluate(()=>E.every(e=>worldMap.canWalk(e)&&!worldMap.isSafe(e))));
   assert(await page.evaluate(()=>worldMap.bridgeRoutes().every(route=>[{x:1000,y:1100},...route].every((p,i,list)=>!i||Math.hypot(worldMap.traceMove(list[i-1],p).x-p.x,worldMap.traceMove(list[i-1],p).y-p.y)<1))));
   await page.screenshot({path:path.join(__dirname,'artifacts/sect-'+scene+'-redesign.png')});
   await page.evaluate(()=>{P.x=1640;P.y=1138;dr();});await page.screenshot({path:path.join(__dirname,'artifacts/sect-'+scene+'-camp.png')});
  }
  await page.evaluate(()=>{worldMap.travel('hub');worldMap.openArena();});await page.getByRole('button',{name:'Vào đấu trường · 30 lượt',exact:true}).click();await page.waitForFunction(()=>worldMap.state.scene==='arena',null,{polling:50});
  assert.equal(await page.evaluate(()=>worldMap.arenaRun().wave),1);assert(await page.evaluate(()=>E.every(e=>e.arena&&worldMap.canWalk(e))));assert.equal(await page.evaluate(()=>worldMap.canWalk({x:1500,y:1100})),false);
  await page.evaluate(()=>dr());await page.screenshot({path:path.join(__dirname,'artifacts/arena-wave-1.png')});
  const cleared=await page.evaluate(()=>{const history=[];for(let w=1;w<=30;w++){history.push({wave:worldMap.arenaRun().wave,hp:E[0].maxHp});E.slice().forEach(e=>hit(e,99999));step(w===30?.01:2.1);}return {history,scene:worldMap.state.scene,clears:P.world.arenaClears,gold:P.gold,run:worldMap.arenaRun()};});
  assert.deepEqual(cleared.history.map(h=>h.wave),Array.from({length:30},(_,i)=>i+1));assert.equal(cleared.scene,'hub');assert.equal(cleared.clears,1);assert(cleared.gold>=300);assert.equal(cleared.run,null);
  assert.equal((await page.evaluate(()=>worldMap.arenaBudget())).remaining,1);
  await page.evaluate(()=>worldMap.openArena());await page.getByRole('button',{name:'Vào đấu trường · 30 lượt',exact:true}).click();await page.waitForFunction(()=>worldMap.state.scene==='arena',null,{polling:50});
  await page.evaluate(()=>{P.hp=0;step(.01);});assert.equal(await page.evaluate(()=>worldMap.state.scene),'hub');assert.equal((await page.evaluate(()=>worldMap.arenaBudget())).remaining,0);
  await page.reload({waitUntil:'networkidle'});await page.locator('#nm').fill('Thử lại');await page.locator('#ok').click();assert.equal((await page.evaluate(()=>worldMap.arenaBudget())).remaining,0,'Creating another character must not reset daily entries');
  const blocked=await page.evaluate(async()=>{const r=await fetch('/api/arena',{method:'POST',body:'{}'});return {status:r.status,data:await r.json()};});assert.equal(blocked.status,429);assert.equal(blocked.data.remaining,0);
  assert.deepEqual(errors,[]);assert.equal(await page.locator('#dbg').count(),0,await page.locator('#dbg').allTextContents());
  const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});mobile.on('pageerror',e=>errors.push(e.message));await mobile.route('**/api/characters',r=>r.fulfill({status:201,contentType:'application/json',body:'{"saved":true}'}));await mobile.route('**/fonts.googleapis.com/**',r=>r.abort());await mobile.context().addCookies([{name:'fixture-user',value:'2',domain:'127.0.0.1',path:'/'}]);await require('./test-account.cjs')(mobile);await mobile.goto('http://127.0.0.1:'+port,{waitUntil:'networkidle'});await mobile.locator('.sect-choice').nth(1).click();await mobile.locator('#nm').fill('Nguyệt đấu');await mobile.locator('#ok').click();await mobile.evaluate(()=>{P.world.tutorial=true;worldMap.openArena();});await mobile.getByRole('button',{name:'Vào đấu trường · 30 lượt',exact:true}).click();await mobile.waitForFunction(()=>worldMap.state.scene==='arena',null,{polling:50});await mobile.screenshot({path:path.join(__dirname,'artifacts/arena-mobile.png')});
  const boxes=await mobile.evaluate(()=>({banner:document.querySelector('#arena-status').getBoundingClientRect().top,hud:document.querySelector('#hud').getBoundingClientRect().bottom}));assert(boxes.banner>boxes.hud,'Wave banner must not overlap mobile HUD');await mobile.evaluate(()=>worldMap.leaveArena());assert.equal(await mobile.evaluate(()=>worldMap.state.scene),'moon');assert.equal((await mobile.evaluate(()=>worldMap.arenaBudget())).remaining,1);assert.deepEqual(errors,[]);assert.equal(await mobile.locator('#dbg').count(),0,await mobile.locator('#dbg').allTextContents());
  console.log('PASS Native sect layouts, four species camps, connected paths, separate circular arena, all 30 waves, victory/death exits and persistent 2/day cap');
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
