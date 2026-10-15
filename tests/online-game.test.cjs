const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawn}=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const root=path.resolve(__dirname,'..'),artifacts=path.join(__dirname,'artifacts');fs.mkdirSync(artifacts,{recursive:true});
(async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'tienlo-online-'));
 const server=spawn('python',['-u','-c','import server; from functools import partial; from http.server import ThreadingHTTPServer; server.init_db(); http=server.GameServer(("127.0.0.1",0),partial(server.GameHandler,directory=str(server.ROOT))); print(http.server_port,flush=True); http.serve_forever()'],{cwd:root,windowsHide:true,env:{...process.env,TIENLO_DB:path.join(temp,'online.sqlite3'),TIENLO_QUIET:'1'},stdio:['ignore','pipe','pipe']});
 let browser;let serverErrors='';server.stderr.on('data',data=>{serverErrors=(serverErrors+data).slice(-12000);});
 try{
  const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('server timeout')),10000);server.stdout.once('data',data=>{clearTimeout(timer);resolve(Number(String(data).trim()));});server.once('error',reject);});
  assert.equal((await (await fetch('http://127.0.0.1:'+port+'/api/health')).json()).ok,true);
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server']});
  const a=await browser.newContext({viewport:{width:1440,height:1000}}),b=await browser.newContext({viewport:{width:1280,height:900}});
  const one=await a.newPage(),two=await b.newPage();const errors=[],missing=[];
  for(const page of [one,two]){page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()===404)missing.push(r.url());});}
  await one.goto('http://127.0.0.1:'+port,{waitUntil:'commit'});
  await one.waitForFunction(()=>window.account&&document.readyState!=='loading');await one.screenshot({path:path.join(artifacts,'online-login.png')});
  async function register(page,user,name){
   await page.goto('http://127.0.0.1:'+port,{waitUntil:'domcontentloaded'});await page.locator('[data-mode="register"]').click();await page.locator('#account-name').fill(user);await page.locator('#account-password').fill('test-password-123');await page.locator('.account-submit').click();await page.waitForFunction(()=>account.state.ready);await page.locator('#nm').fill(name);await page.locator('#ok').click();await page.waitForFunction(()=>P.ap&&cr.style.display==='none');await page.evaluate(()=>account.flush());await page.waitForFunction(()=>onlineWorld.state.connected);
  }
  await register(one,'online_one','Kiếm Một');await register(two,'online_two','Kiếm Hai');
  await one.waitForFunction(()=>onlineWorld.state.players.some(p=>p.name==='Kiếm Hai'));
  await two.waitForFunction(()=>onlineWorld.state.players.some(p=>p.name==='Kiếm Một'));
  console.log('PASS two accounts see each other on shared map');
  await one.locator('#chat-input').fill('Xin chào <script>');await one.locator('#chat-form button').click();await two.waitForFunction(()=>document.getElementById('chat-messages').textContent.includes('Xin chào <script>'));
  assert.equal(await two.locator('#chat-messages script').count(),0);
  console.log('PASS chat safely renders text between accounts');
  for(const page of [one,two]){await page.evaluate(()=>{worldMap.progress().tutorial=true;P.x=1105;});for(const y of [930,750,570,490]){await page.evaluate(y=>P.y=y,y);await page.waitForTimeout(350);}}
  await one.waitForTimeout(500);
  for(const page of [one,two])await page.evaluate(()=>{window.networkVisualHits=[];const confirmed=worldVFX.confirmedHit;worldVFX.confirmedHit=(enemy,damage,kill)=>{networkVisualHits.push({id:enemy.id,damage,kill,mode:creatureArt.frame(enemy).mode});return confirmed(enemy,damage,kill);};});
  await one.evaluate(()=>{const e=E.find(e=>e.network&&e.camp==='north'&&!e.dead);window.coopId=e.id;hit(e,10);});
  const id=await one.evaluate(()=>coopId);await two.waitForFunction(id=>E.some(e=>e.id===id&&e.hp<e.maxHp),id);
  await two.evaluate(id=>{const e=E.find(e=>e.id===id);hit(e,48);},id);
  await one.waitForFunction(()=>worldMap.progress().kills>=1);await two.waitForFunction(()=>worldMap.progress().kills>=1);
  for(const page of [one,two])assert(await page.evaluate(id=>networkVisualHits.some(h=>h.id===id&&h.damage>0),id),'Shared HP snapshots trigger real damage VFX on both clients');
  console.log('PASS shared monster HP, cooperative kill rewards');
  await one.evaluate(()=>{P.x=1000;P.y=1100;worldMap.dialog.close();inventory.openBag();});
  assert.equal(await one.locator('.bag-grid .item-cell').count(),30);assert.equal(await one.locator('[data-equip-slot]').count(),6);
  const source=one.locator('.bag-grid .item-cell').filter({has:one.locator('img')}).first();
  await source.dragTo(one.locator('[data-equip-slot="vukhi"]'));
  assert.equal(await one.evaluate(()=>worldMap.progress().equip.vukhi.id),'moc-kiem');
  await one.screenshot({path:path.join(artifacts,'online-inventory-desktop.png')});
  await one.locator('[data-equip-slot="vukhi"]').dragTo(one.locator('[data-bag-cell="29"]'));
  assert.equal(await one.evaluate(()=>worldMap.progress().equip.vukhi),null);
  console.log('PASS 30 inventory cells, drag equip, drag unequip');
  await one.evaluate(()=>{worldMap.dialog.close();P.xp=need()*2;P.med=1;up(.016);});assert(await one.evaluate(()=>P.xp>=need()*2));
  await one.evaluate(async()=>{P.med=0;P.x=1105;P.y=490;worldMap.progress().bag=[];P.gold=137;await account.flush();});
  await one.reload({waitUntil:'domcontentloaded'});await one.waitForFunction(()=>account.state.ready&&P.ap);
  assert.equal(await one.evaluate(()=>P.nm),'Kiếm Một');assert.equal(await one.evaluate(()=>P.gold),137);
  assert(Math.abs(await one.evaluate(()=>P.x)-1105)<5);assert(Math.abs(await one.evaluate(()=>P.y)-490)<5);
  console.log('PASS database reload preserves character, gold and valid saved location; meditation keeps reserve XP');
  await one.evaluate(async()=>{worldMap.switchScene('hub',true);P.hp=mhp();P.gold=137;await account.flush();});
  await one.screenshot({path:path.join(artifacts,'online-world-desktop.png')});
  await one.evaluate(()=>worldMap.openArena());await one.getByRole('button',{name:'Vào đấu trường · 30 lượt',exact:true}).click();await one.waitForFunction(()=>worldMap.state.scene==='arena');await one.evaluate(async()=>{worldMap.leaveArena();await account.flush();});assert.equal((await one.evaluate(()=>worldMap.arenaBudget())).remaining,1);console.log('PASS authenticated arena entry with CSRF and account daily budget');
  // New device/browser profile: login restores server state without localStorage.
  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const phone=await mobile.newPage();phone.on('pageerror',e=>errors.push(e.message));
  await phone.goto('http://127.0.0.1:'+port,{waitUntil:'domcontentloaded'});await phone.locator('#account-name').fill('online_one');await phone.locator('#account-password').fill('test-password-123');await phone.locator('.account-submit').click();await phone.waitForFunction(()=>account.state.ready&&P.ap);
  assert.equal(await phone.evaluate(()=>P.gold),137);
  await phone.evaluate(()=>{inventory.addItem('moc-kiem');inventory.openBag();});
  await phone.screenshot({path:path.join(artifacts,'online-inventory-mobile.png')});
  assert.equal(await phone.evaluate(()=>document.querySelector('.inventory-dialog').scrollWidth>document.querySelector('.inventory-dialog').clientWidth),false);
  const from=await phone.locator('.bag-grid .occupied').first().boundingBox(),to=await phone.locator('[data-equip-slot="vukhi"]').boundingBox();
  const cdp=await mobile.newCDPSession(phone),start={x:from.x+from.width/2,y:from.y+from.height/2},end={x:to.x+to.width/2,y:to.y+to.height/2};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[start]});
  for(let i=1;i<=10;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x+(end.x-start.x)*i/10,y:start.y+(end.y-start.y)*i/10}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await phone.waitForFunction(()=>worldMap.progress().equip.vukhi?.id==='moc-kiem');
  console.log('PASS real mobile touch drag equips the correct slot');

  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  console.log('PASS login on fresh mobile profile, responsive inventory, no runtime errors or missing assets');
 }catch(e){console.error('SERVER ERRORS',serverErrors);throw e;}finally{if(browser)await browser.close();server.kill();await new Promise(r=>server.once('exit',r));fs.rmSync(temp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
