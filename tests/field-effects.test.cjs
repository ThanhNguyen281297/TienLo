const assert=require('node:assert/strict'),path=require('node:path'),{spawn}=require('node:child_process');
const {chromium}=require(path.join(require('node:os').homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async()=>{const server=spawn('python',['-u','-c','from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer; s=ThreadingHTTPServer(("127.0.0.1",0),SimpleHTTPRequestHandler); print(s.server_port,flush=True); s.serve_forever()'],{windowsHide:true,stdio:['ignore','pipe','ignore']});let browser;try{
 const port=await new Promise(r=>server.stdout.once('data',d=>r(Number(String(d).trim()))));browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server']});const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>requestAnimationFrame=()=>0);await require('./test-account.cjs')(page);await page.route('**/api/characters',r=>r.fulfill({status:201,body:'{}'}));await page.goto('http://127.0.0.1:'+port,{waitUntil:'networkidle'});await page.locator('#nm').fill('Field effects');await page.locator('#ok').click();
 await page.evaluate(()=>{
  window.fieldReset=w=>{classCombat.onRespawn();P.ap.w=w;getClassCombat().state.cooldown.fill(0);Object.assign(P,{x:1000,y:1100,r:3,stage:1,level:40,hp:280,mp:125,acd:100,med:0});lr=3;P.world.learnedSkills=[true,true,true,true];P.world.skillLevels=[0,0,0,0];gmTest.enabled=false;P.hp=mhp();K={};ptr=null;E=[{id:'inside',t:0,x:1010,y:1100,hx:1010,hy:1100,hp:10000,maxHp:10000,dead:0,cd:100,fr:0},{id:'outside',t:0,x:1160,y:1100,hx:1160,hy:1100,hp:10000,maxHp:10000,dead:0,cd:100,fr:0}];skill(2);fieldEffects.tick(.001);};
  window.expose=seconds=>{for(let n=0;n<Math.ceil(seconds/.01);n++)fieldEffects.tick(.01);};
 });
 for(let sect=0;sect<4;sect++){
  const state=await page.evaluate(sect=>{fieldReset(sect);fieldEffects.tick(.01);const e=E[0],outside=fieldEffects.list(E[1]).length;const r=fieldRules[sect];expose(r.threshold||.1);return{key:fieldEffects.list(e)[0]?.key,speed:classCombat.enemySpeed(e),hard:fieldEffects.blocksAttack(e),vulnerability:fieldEffects.vulnerability(e),outgoing:fieldEffects.attackMultiplier(e),outside,descriptor:fieldEffects.descriptor(),cooldown:combatBalance.cooldowns(sect)[2],configured:r.cooldown};},sect);
  assert.equal(state.key,['swordPressure','moonFrost','thunderParalysis','mysticSeal'][sect]);assert.equal(state.outside,0);assert.equal(state.cooldown,state.configured);assert(state.descriptor.id);assert.equal(state.hard,sect!==0);
  if(sect===0){assert.equal(state.speed,.8);assert.equal(state.vulnerability,1.12);}else assert.equal(state.speed,sect===3?.65:0);
  if(sect===3)assert.equal(state.outgoing,.8);
  await page.evaluate(()=>{getClassCombat().state.field.age=Math.max(1.5,fieldRules[P.ap.w].threshold+.1);E[0].x=P.x+40;E[0].y=P.y+25;tm+=.3;V.length=PT.length=X.length=0;P.world.tutorial=true;dr();});
  await page.screenshot({path:path.join(__dirname,'artifacts','field-status-'+sect+'.png')});
  const cleanup=await page.evaluate(()=>{const e=E[0];e.x=1200;fieldEffects.tick(.01);const exited=fieldEffects.list(e).length;e.x=1010;expose(.1);const reentered=fieldEffects.blocksAttack(e);getClassCombat().state.field=null;fieldEffects.tick(.01);return{exited,reentered,removed:fieldEffects.list(e).length,speed:classCombat.enemySpeed(e)};});assert.equal(cleanup.exited,0);assert.equal(cleanup.reentered,false);assert.equal(cleanup.removed,0);assert.equal(cleanup.speed,1);
  console.log('PASS class '+sect+' field effect, boundary, control, cooldown agreement, exit/re-entry and expiry');
 }
 const specifics=await page.evaluate(()=>{
  fieldReset(1);expose(.6);E[0].x=1200;fieldEffects.tick(.01);E[0].x=1010;expose(.7);const continuous=fieldEffects.blocksAttack(E[0]);expose(.6);const frozen=fieldEffects.blocksAttack(E[0]);expose(.7);const expired=!fieldEffects.blocksAttack(E[0]);
  fieldReset(2);E[0].elite=true;expose(3.01);const bossHard=fieldEffects.list(E[0])[0].hard;
  fieldReset(3);E[0].x=1080;expose(2);const outer=!fieldEffects.blocksAttack(E[0])&&fieldEffects.attackMultiplier(E[0])===.8;
  const remote={network:true,hp:100,fieldEffects:[{...fieldRules[1],hard:.4}]};const serverControl=fieldEffects.blocksAttack(remote)&&fieldEffects.speed(remote)===0;remote.fieldEffects=[];const cleared=!fieldEffects.blocksAttack(remote);
  classCombat.onRespawn();return{continuous,frozen,expired,bossHard,outer,serverControl,cleared,reset:fieldEffects.statuses.size};
 });assert.equal(specifics.continuous,false);assert(specifics.frozen&&specifics.expired);assert(specifics.bossHard<=.181);assert(specifics.outer&&specifics.serverControl&&specifics.cleared);assert.equal(specifics.reset,0);const gameplay=await page.evaluate(()=>{
  worldMap.state.scene='arena';fieldReset(1);fieldEffects.tick(.001);E[0].x=P.x;E[0].y=P.y;E[0].arena=true;E[0].attackScale=20;E[0].cd=0;expose(1.3);const before=P.hp;up(.01);const frozenDamage=before-P.hp;expose(.7);E[0].cd=0;up(.01);const thawedDamage=before-P.hp;
  fieldReset(3);E[0].x=P.x;E[0].y=P.y;E[0].arena=true;E[0].attackScale=20;E[0].cd=0;const hp=P.hp;up(.01);const weakened=hp-P.hp;getClassCombat().state.field=null;E[0].cd=0;const after=P.hp;up(.01);const normal=after-P.hp;
  return{frozenDamage,thawedDamage,weakened,normal};
 });assert.equal(gameplay.frozenDamage,0);assert(gameplay.thawedDamage>0);assert(gameplay.weakened<gameplay.normal);assert.deepEqual(errors,[]);console.log('PASS continuous exposure, boss resistance, center seal, server snapshots and respawn cleanup');
 }finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});

