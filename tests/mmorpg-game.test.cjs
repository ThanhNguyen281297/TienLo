/* Real browser/SQLite: NPC forge, material slots, live auto-loot, six outdoor regions. */
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawn,execFileSync}=require('node:child_process');
const {chromium}=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'tienlo-mmorpg-')),db=path.join(temp,'game.sqlite3');
 const server=spawn('python',['-u','-c','import server;from functools import partial;server.init_db();s=server.GameServer(("127.0.0.1",0),partial(server.GameHandler,directory=str(server.ROOT)));print(s.server_port,flush=True);s.serve_forever()'],{windowsHide:true,env:{...process.env,TIENLO_DB:db,TIENLO_QUIET:'1'},stdio:['ignore','pipe','pipe']});
 let browser,log='';server.stderr.on('data',d=>log+=d);
 const sql=code=>execFileSync('python',['-c','import sqlite3,json,equipment;db=sqlite3.connect(__import__("sys").argv[1]);'+code+';db.commit();db.close()',db],{windowsHide:true});
 try{
  const port=await new Promise((r,j)=>{server.stdout.once('data',d=>r(Number(String(d).trim())));server.once('exit',()=>j(Error(log)));});
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server']});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()===404)missing.push(r.url());});await page.addInitScript(()=>requestAnimationFrame=()=>0);
  await page.goto('http://127.0.0.1:'+port,{waitUntil:'load'});await page.locator('[data-mode=register]').click();await page.locator('#account-name').fill('outdoor_hero');await page.locator('#account-password').fill('test-password-123');await page.locator('.account-submit').click();await page.waitForFunction(()=>account.state.ready,null,{polling:100});await page.locator('#nm').fill('Thanh Phong');await page.waitForFunction(()=>!!characterMasks.frameFor(tp,'truoc'),null,{polling:100});await page.locator('#ok').click();await page.waitForFunction(()=>P.ap,null,{polling:100});assert(await page.evaluate(()=>account.flush()));
  assert.equal(await page.locator('#expedition-loot').count(),0);assert.equal(await page.locator('#enhance-button').count(),0);assert.equal(await page.evaluate(async()=>{try{await account.api('/api/world',{map:'field-abyss',x:1000,y:1770});return 200;}catch(e){return e.status;}}),403);
  await page.evaluate(()=>account.state.ready=false);
  sql('p=json.loads(db.execute("SELECT player FROM characters WHERE user_id=1").fetchone()[0]);p.update(level=80,gold=1000,x=1240,y=1210);p["world"].update(map="hub",tutorial=True,essence=500);p["world"]["bag"]=[dict(meta,uid=iid,qty=50) for iid,meta in equipment.MATERIALS.items()];db.execute("UPDATE characters SET player=?,revision=revision+1 WHERE user_id=1",(json.dumps(p),))');
  await page.evaluate(async()=>{const r=await account.api('/api/characters');account.state.revision=r.character.revision;account.restore(r.character);account.state.ready=true;});
  await page.evaluate(()=>worldMap.handleService('forge'));assert.equal(await page.locator('.forge-slot').count(),3);
  const uid=await page.evaluate(()=>P.world.equip.daobao.uid),name=await page.evaluate(()=>P.world.equip.daobao.name);
  await page.locator('.forge-choices button').filter({hasText:name}).click();await page.locator('.forge-choices button').filter({hasText:'Cường Hóa Thạch ×50'}).click();
  const upgrade=page.getByRole('button',{name:'Cường hóa +1',exact:true});assert(await upgrade.isEnabled());await page.screenshot({path:path.join(__dirname,'artifacts/mmorpg-forge.png')});await upgrade.click();
  await page.waitForFunction(()=>P.world.equip.daobao.enhance===1,null,{polling:100});assert.deepEqual(await page.evaluate(()=>({gold:P.gold,essence:P.world.essence,stones:P.world.bag.find(i=>i.id==='cuong-hoa-thach').qty})),{gold:1000,essence:485,stones:46});
  assert.equal(await page.evaluate(async()=>{worldMap.dialog.close();P.x=1000;await account.flush();try{await account.api('/api/equipment',{action:'enhance',uid:P.world.equip.daobao.uid,materials:{'cuong-hoa-thach':'cuong-hoa-thach'},revision:account.state.revision,opId:'wrong-npc-position'});return 200;}catch(e){return e.status;}}),409);
  await page.evaluate(()=>{worldMap.switchScene('field-meadow');});await page.waitForFunction(()=>!account.state.restoring,null,{polling:100});for(let attempt=0;attempt<12&&!(await page.evaluate(()=>onlineWorld.state.shared&&E.length===48));attempt++){await page.evaluate(()=>onlineWorld.frame());await page.waitForTimeout(200);}assert.equal(await page.evaluate(()=>onlineWorld.state.shared&&E.length),48);
  assert.equal(await page.evaluate(()=>worldMap.traceMove({x:1000,y:1770},{x:1000,y:1400}).y),1400);
  // A durable server drop reaches the bag while auto is enabled, without scene/position reset.
  sql('db.execute("INSERT INTO expedition_drops VALUES(\'loot-proof\',1,\'field-meadow\',\'train-10-daobao-class-0\',0,NULL)")');
  await page.evaluate(async()=>{autoCombat.toggle(true);expeditionsGame.updatePending(1);await expeditionsGame.claim();});
  assert(await page.evaluate(()=>autoCombat.state.enabled));assert.equal(await page.evaluate(()=>worldMap.state.scene),'field-meadow');assert(await page.evaluate(()=>P.world.bag.some(i=>i.uid==='loot-proof'&&i.options.length>=1&&i.options.length<=3)));
  assert.equal(await page.evaluate(async()=>{const p=structuredClone(P),i=p.world.bag.find(i=>i.uid==='loot-proof');i.options[0].value=999;try{await account.api('/api/characters',{player:p,revision:account.state.revision});return 201;}catch(e){return e.status;}}),400);
  for(const id of ['field-meadow','field-bamboo','field-marsh','field-frost','field-ember','field-abyss']){
   await page.evaluate(id=>{worldMap.switchScene(id);dr();},id);await page.waitForFunction(()=>!account.state.restoring,null,{polling:100});for(let attempt=0;attempt<12&&!(await page.evaluate(id=>worldMap.state.scene===id&&onlineWorld.state.shared&&E.length===48&&E.every(e=>e.map===id),id));attempt++){await page.evaluate(()=>onlineWorld.frame());await page.waitForTimeout(200);}assert(await page.evaluate(id=>worldMap.state.scene===id&&onlineWorld.state.shared&&E.length===48&&E.every(e=>e.map===id),id));
   await page.evaluate(()=>{P.x=1000;P.y=1280;for(const b of worldMap.buildings)worldMap.asset(b.key);dr();});
   await page.waitForFunction(()=>worldMap.buildings.every(b=>{const i=worldMap.asset(b.key);return i?.complete&&i.naturalWidth;}),null,{polling:100});await page.evaluate(()=>{hud();dr();});
   await page.screenshot({path:path.join(__dirname,'artifacts/mmorpg-'+id+'.png')});
   assert(await page.evaluate(()=>worldMap.buildings.length>100));assert(await page.evaluate(()=>E.every(e=>typeof e.name==='string'&&!e.name.includes('undefined'))));
  }
  await page.evaluate(()=>{worldMap.switchScene('field-meadow');});await page.waitForFunction(()=>E.length===48&&E.every(e=>e.map==='field-meadow'),null,{polling:100});await page.evaluate(()=>{P.x=440;P.y=1410;hud();worldMap.updateInterface();dr();});await page.screenshot({path:path.join(__dirname,'artifacts/mmorpg-hunting-camp.png')});
  // Chibi NPC paintings from Character/NPC, animated procedurally: six distinct poses per role.
  await page.waitForFunction(()=>Object.values(npcAnimation.images).every(i=>i.complete&&i.naturalWidth),null,{polling:100});
  assert.equal(await page.evaluate(()=>{const hashes=new Set(),c=document.createElement('canvas');c.width=120;c.height=100;const ctx=c.getContext('2d');for(let n=0;n<6;n++){ctx.clearRect(0,0,120,100);worldMap.environmentClock=n*.5;creatureArt.drawNpc(ctx,{id:'forge',x:60,y:90});hashes.add(c.toDataURL());}return hashes.size;}),6);
  await page.evaluate(()=>{worldMap.switchScene('hub');P.x=1200;P.y=1100;hud();dr();});await page.screenshot({path:path.join(__dirname,'artifacts/mmorpg-city-npc.png')});
  await page.setViewportSize({width:844,height:390});await page.evaluate(()=>{worldMap.handleService('forge');});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(__dirname,'artifacts/mmorpg-forge-mobile.png')});
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);console.log('PASS NPC material-slot forge and exact costs; remote forge blocked; live auto-loot preserves Auto; bounded server options; six 48-monster maps and loaded props; six NPC poses; mobile layout.');
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
