/* Real accounts, shared dungeon drops, two PvP clients and an isolated spectator. */
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawn}=require('node:child_process');
const {chromium}=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'tienlo-expeditions-')),server=spawn('python',['-u','-c','import server;from functools import partial;server.init_db();s=server.GameServer(("127.0.0.1",0),partial(server.GameHandler,directory=str(server.ROOT)));print(s.server_port,flush=True);s.serve_forever()'],{windowsHide:true,env:{...process.env,TIENLO_DB:path.join(temp,'game.sqlite3'),TIENLO_QUIET:'1'},stdio:['ignore','pipe','pipe']});let browser;let log='';server.stderr.on('data',d=>{log+=d;});
 try{
  const port=await new Promise((r,j)=>{server.stdout.once('data',d=>r(Number(String(d).trim())));server.once('exit',()=>j(Error('Server stopped '+log)));});
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server']});const pages=[],errors=[],missing=[];
  for(let n=0;n<3;n++){
   const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();pages.push(page);page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()===404)missing.push(r.url());});await page.addInitScript(()=>requestAnimationFrame=()=>0);
   await page.goto('http://127.0.0.1:'+port,{waitUntil:'load'});await page.locator('[data-mode=register]').click();await page.locator('#account-name').fill('arena_test_'+n);await page.locator('#account-password').fill('test-password-123');await page.locator('.account-submit').click();await page.waitForFunction(()=>account.state.ready,null,{polling:50});await page.locator('#nm').fill('Dao Huu '+n);await page.waitForFunction(()=>!!characterMasks.frameFor(tp,'truoc'),null,{polling:50});await page.locator('#ok').click();await page.waitForFunction(()=>P.ap,null,{polling:50});
   if(n===0){assert(await page.evaluate(()=>account.flush()));assert.equal(await page.evaluate(async()=>{try{await account.api('/api/world',{map:'rift-void',x:1000,y:1380});return 200;}catch(e){return e.status;}}),403,'Server must enforce the level gate even with a forged request');}
   await page.evaluate(()=>{P.level=80;characterProgression.normalize();P.world.tutorial=true;worldMap.switchScene('hub');P.hp=mhp();P.mp=mmp();});assert(await page.evaluate(()=>account.flush()));
  }
  const [a,b,spectator]=pages;
  assert.equal(await a.evaluate(()=>worldMap.services.filter(s=>expeditionsGame.maps.has(s.id)).length),4);
  await a.evaluate(()=>{P.level=1;worldMap.switchScene('rift-wood');});assert.equal(await a.evaluate(()=>worldMap.state.scene),'hub');
  await a.evaluate(()=>{P.level=80;characterProgression.normalize();});assert(await a.evaluate(()=>account.flush()));
  for(const scene of ['rift-wood','rift-tide','rift-fire','rift-void']){
   await a.evaluate(scene=>worldMap.switchScene(scene),scene);await a.waitForFunction(scene=>worldMap.state.scene===scene&&onlineWorld.state.shared&&E.length===25&&E.every(e=>e.expedition),scene,{polling:100,timeout:20000});
   await a.evaluate(()=>{for(const e of E)creatureArt.ensureSpecies(e.skin);});await a.waitForFunction(()=>E.every(e=>{const f=creatureArt.frame(e);return f.image?.complete&&f.image.naturalWidth;}),null,{polling:100});
   const summary=await a.evaluate(()=>({scene:worldMap.sceneTitle(),boss:E.filter(e=>e.boss).length,safe:worldMap.isSafe({x:1000,y:1380}),walk:worldMap.canWalk({x:1000,y:1100}),blocked:worldMap.canWalk({x:100,y:100})}));assert(summary.safe&&summary.walk&&!summary.blocked);assert.equal(summary.boss,1);
   assert(await a.evaluate(()=>{for(const skin of new Set(E.map(e=>e.skin))){const e={...E.find(e=>e.skin===skin)},s=creatureArt.reaction(e);creatureArt.onNetworkMove(e,true);if(creatureArt.frame(e).mode!=='move')return false;creatureArt.onAttack(e);if(creatureArt.frame(e).mode!=='attack')return false;creatureArt.onNetworkDamage(e,false);if(creatureArt.frame(e).mode!=='hurt')return false;if(creatureArt.frame({...e,corpse:true,age:.2}).mode!=='death')return false;}return true;}),'Every new species needs reachable move/attack/hurt/death animations');
   await a.evaluate(()=>{P.x=1000;P.y=1130;hud();dr();});await a.screenshot({path:path.join(__dirname,'artifacts/'+scene+'.png')});
  }
  await a.evaluate(()=>{const boss=E.find(e=>e.boss);for(let i=0;i<12;i++)hit(boss,1e6);});
  await a.waitForFunction(()=>expeditionsGame.pending>0,null,{polling:100,timeout:10000});await a.evaluate(()=>expeditionsGame.claim());
  assert(await a.evaluate(()=>P.world.bag.some(i=>i.id.startsWith('exp-70-')&&i.req===70&&i.classIndex===P.ap.w)));assert.equal(await a.evaluate(()=>expeditionsGame.pending),0);
  assert(await a.evaluate(()=>account.flush()));await a.reload({waitUntil:'load'});await a.waitForFunction(()=>account.state.ready&&P.ap,null,{polling:50});assert(await a.evaluate(()=>P.world.bag.some(i=>i.id.startsWith('exp-70-'))));
  for(const page of pages)await page.evaluate(()=>{worldMap.switchScene('hub');P.hp=mhp();P.mp=mmp();});
  await a.waitForTimeout(600);await a.evaluate(()=>duelArena.refresh());const target=await b.evaluate(()=>account.state.user.id);await a.evaluate(id=>duelArena.action('invite',{target:id}),target);
  await b.evaluate(()=>duelArena.refresh());const invitation=await b.evaluate(()=>duelArena.state.data.invites.find(i=>i.target===account.state.user.id)?.id);assert(invitation);await b.evaluate(id=>duelArena.action('accept',{id}),invitation);
  await a.waitForFunction(()=>duelArena.current()?.status==='active'&&worldMap.state.scene==='duel',null,{polling:100,timeout:10000});assert.equal(await b.evaluate(()=>worldMap.state.scene),'duel');
  const mid=await a.evaluate(()=>duelArena.current().id);await spectator.evaluate(id=>duelArena.action('watch',{id}),mid);assert(await spectator.evaluate(()=>duelArena.current().viewer));assert.equal(await spectator.evaluate(()=>worldMap.canWalk({x:1000,y:1100})),false);
  assert(await spectator.evaluate(()=>{const c=gameCamera();return Math.abs(c.x+W/Z/2-1000)<1&&Math.abs(c.y+H/Z/2-1100)<1;}),'Spectators must see the fight, not just their seat');
  await a.waitForTimeout(3200);await a.evaluate(()=>skill(0));await a.waitForFunction(()=>duelArena.current().fighters.find(f=>f.id===account.state.user.id).damage>0,null,{polling:100,timeout:10000});
  const before=await spectator.evaluate(()=>duelArena.current().fighters.map(f=>f.damage));await spectator.evaluate(()=>{skill(3);basicCombat.attack({duelTarget:true});});await spectator.waitForTimeout(600);const after=await spectator.evaluate(()=>duelArena.current().fighters.map(f=>f.damage));assert.deepEqual(after,before);assert.equal(await spectator.evaluate(()=>E.length),0);
  for(const [page,name]of [[a,'duel-fighter'],[spectator,'duel-spectator']]){await page.evaluate(()=>{hud();dr();});await page.screenshot({path:path.join(__dirname,'artifacts/'+name+'.png')});}
  await spectator.setViewportSize({width:844,height:390});await spectator.evaluate(()=>{rs();hud();dr();});assert(await spectator.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await spectator.screenshot({path:path.join(__dirname,'artifacts/duel-spectator-mobile.png')});
  const gold=await b.evaluate(()=>P.gold);await b.evaluate(()=>duelArena.leave());await a.waitForFunction(()=>duelArena.current()?.status==='finished',null,{polling:100,timeout:10000});assert.equal(await a.evaluate(()=>duelArena.current().winner),await a.evaluate(()=>account.state.user.id));assert.equal(await b.evaluate(()=>worldMap.state.scene),'hub');assert.equal(await b.evaluate(()=>P.gold),gold);
  await spectator.evaluate(()=>duelArena.leave());assert.equal(await spectator.evaluate(()=>worldMap.state.scene),'hub');assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);console.log('PASS 4 level-gated shared maps / 12 animated species, real level-70 boss drop and SQLite reload, consensual duel, authoritative skill damage, protected spectator ring/camera, mobile and surrender without currency loss.');
 }catch(e){console.error(log.slice(-3000));throw e;}finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
