const assert=require('node:assert/strict'),path=require('node:path'),os=require('node:os'),{spawn}=require('node:child_process');
const {chromium}=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async()=>{const server=spawn('python',['-u','-c','from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer; s=ThreadingHTTPServer(("127.0.0.1",0),SimpleHTTPRequestHandler); print(s.server_port,flush=True); s.serve_forever()'],{windowsHide:true,stdio:['ignore','pipe','ignore']});let browser;
try{const port=await new Promise(r=>server.stdout.once('data',d=>r(Number(String(d).trim()))));browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server']});
for(let sect=0;sect<4;sect++){
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[],missing=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()===404&&!r.url().includes('/api/'))missing.push(r.url());});
 await page.addInitScript(()=>requestAnimationFrame=()=>0);await require('./test-account.cjs')(page);await page.route('**/api/characters',r=>r.fulfill({status:201,contentType:'application/json',body:'{}'}));await page.goto('http://127.0.0.1:'+port,{waitUntil:'networkidle'});await page.locator('.sect-choice').nth(sect).click();await page.locator('#nm').fill('Class '+sect);await page.locator('#ok').click();await page.waitForFunction(()=>spellImagery.ready);
 await page.evaluate(()=>{
  window.visualCalls=[];for(const key of ['projectile','field']){const before=spellActors[key];spellActors[key]=function(ctx,sect,...args){visualCalls.push({kind:key,sect});return before.call(this,ctx,sect,...args);};}
  const animate=skillSprites.animate;skillSprites.animate=function(ctx,sect,...args){visualCalls.push({kind:'ultimate',sect});return animate.call(this,ctx,sect,...args);};
  window.prepareSkill=()=>{classCombat.onRespawn();worldMap.dialog.close();worldMap.switchScene('hub');worldMap.state.scene='arena';cultivation.select(null);autoCombat.toggle(false);gmTest.enabled=false;Object.assign(P,{x:1000,y:1100,r:3,stage:1,hp:9999,mp:9999,acd:100,med:0});P.world.learnedSkills=[true,true,true,true];P.world.tutorial=true;K={};ptr=null;E=[{id:'path',t:0,x:1080,y:1090,hx:1080,hy:1090,hp:1e6,maxHp:1e6,dead:0,cd:100,fr:0},{id:'origin',t:0,x:1008,y:1100,hx:1008,hy:1100,hp:1e6,maxHp:1e6,dead:0,cd:100,fr:0},{id:'impact',t:0,x:1120,y:1100,hx:1120,hy:1100,hp:1e6,maxHp:1e6,dead:0,cd:100,fr:0}];getClassCombat().state.aim={x:1120,y:1100};getClassCombat().state.cooldown.fill(0);visualCalls.length=0;up(.001);hud();};
  window.advanceSkill=seconds=>{for(let n=0;n<Math.ceil(seconds/.01);n++){tm+=.01;up(.01);}dr();};
 });
 await page.waitForFunction(()=>{worldVFX.paintIcons();return [...sb.children].every(b=>b.querySelector('canvas')?.dataset.spriteIcon);},null,{polling:50});
 assert.deepEqual(await page.locator('#sb button').evaluateAll(buttons=>buttons.map(b=>b.getAttribute('aria-label'))),await page.evaluate(()=>combatNames[P.ap.w]));
 for(let skillIndex=0;skillIndex<4;skillIndex++){
  await page.evaluate(()=>prepareSkill());assert(await page.locator('#sb button').nth(skillIndex).isEnabled(),'Class '+sect+' skill '+skillIndex+' must be usable after learning');await page.locator('#sb button').nth(skillIndex).click();
  await page.evaluate(()=>advanceSkill(.06));const first=await page.evaluate(()=>({class:P.ap.w,cd:getClassCombat().state.cooldown.slice(),calls:visualCalls.slice(),tears:voidStep.tears.length}));assert.equal(first.class,sect);assert(first.cd[skillIndex]>0,'Class '+sect+' skill '+skillIndex+' did not cast');
  if(skillIndex===1)assert(first.tears>0,'Movement skill needs a visible tear for class '+sect);else assert(first.calls.some(c=>c.sect===sect&&c.kind===['projectile',null,'field','ultimate'][skillIndex]),'Missing renderer for class '+sect+' skill '+skillIndex);
  await page.evaluate(()=>advanceSkill(.28));await page.screenshot({path:path.join(__dirname,'artifacts','four-class-'+sect+'-skill-'+skillIndex+'.png')});
  await page.evaluate(()=>advanceSkill(4.3));const damage=await page.evaluate(()=>E.some(e=>e.hp<e.maxHp));assert(damage,'Class '+sect+' skill '+skillIndex+' should damage a nearby target');
 }
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);console.log('PASS class '+sect+': all four real buttons cast, correct renderer, movement tear, damage, no missing assets');await page.close();
}
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
