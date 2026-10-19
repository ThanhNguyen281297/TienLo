const assert=require('node:assert/strict'),path=require('node:path'),{spawn}=require('node:child_process');
const {chromium}=require(path.join(require('node:os').homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async()=>{
 const server=spawn('python',['-u','-c','from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer; s=ThreadingHTTPServer(("127.0.0.1",0),SimpleHTTPRequestHandler); print(s.server_port,flush=True); s.serve_forever()'],{windowsHide:true,stdio:['ignore','pipe','ignore']});let browser;
 try{
  const port=await new Promise(r=>server.stdout.once('data',d=>r(Number(String(d).trim()))));browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server']});
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>requestAnimationFrame=()=>0);await require('./test-account.cjs')(page);await page.route('**/api/characters',r=>r.fulfill({status:201,body:'{}'}));await page.goto('http://127.0.0.1:'+port,{waitUntil:'networkidle'});await page.locator('#nm').fill('Auto Balance');await page.locator('#ok').click();
  await page.evaluate(()=>{
   window.autoStep=seconds=>{for(let n=0;n<Math.ceil(seconds/.01);n++){tm+=.01;up(.01);}};
   window.autoReset=(sect,learned=true)=>{
    autoCombat.toggle(false);classCombat.onRespawn();basicCombat.reset();worldMap.dialog.close();gmTest.enabled=false;K={};ptr=null;mobileInput.active=false;
    P.ap.w=sect;Object.assign(P,{x:1000,y:1100,r:3,level:learned?40:1,stage:1,hp:99999,mp:9999,acd:0,med:0,sl:0});lr=3;P.world.learnedSkills=[learned,learned,learned,learned];P.world.skillLevels=[0,0,0,0];P.world.tutorial=true;
    E=[{id:'training',t:0,x:1180,y:1100,hx:1180,hy:1100,hp:999999,maxHp:999999,dead:0,cd:99999,fr:0}];T.forEach(t=>t.sp=0);
    window.autoCasts=[];window.autoBasic=0;
   };
   const cast=skill;skill=i=>{const mp=P.mp;cast(i);if(P.mp<mp)autoCasts.push({index:i,time:tm,cd:getClassCombat().state.cooldown[i],fieldAge:getClassCombat().state.field?.age});};
   const attack=basicCombat.attack;basicCombat.attack=e=>{const accepted=attack(e);if(accepted)autoBasic++;return accepted;};
  });
  for(let sect=0;sect<4;sect++){
   const result=await page.evaluate(sect=>{autoReset(sect);autoCombat.toggle(true);autoStep(65);autoCombat.toggle(false);return{guide:skillAim.state.visible,casts:autoCasts,basic:autoBasic,expected:combatBalance.cooldowns(sect)};},sect);
   assert.equal(result.guide,false,'Auto must not show manual aiming guides');assert.deepEqual([...new Set(result.casts.map(c=>c.index))].sort(),[0,1,2,3],'Auto must use every skill for class '+sect);assert(result.basic>10,'Auto must keep using normal attacks');
   for(const c of result.casts)assert(Math.abs(c.cd-result.expected[c.index])<.01,'Actual cast uses configured cooldown');
   for(let n=1;n<result.casts.length;n++)assert(result.casts[n].time-result.casts[n-1].time>=.84,'No skill burst spam');
   console.log('PASS class '+sect+' all five attacks, '+result.basic+' normal attacks, '+result.casts.length+' skill casts, cooldowns '+result.expected);
  }
  for(let sect=0;sect<4;sect++){
   const gm=await page.evaluate(sect=>{
    autoReset(sect);gmTest.enabled=true;const used=new Set(),native=skill;
    skill=i=>{const before=spellActors.stats.sprites;const c=getClassCombat(),snapshot=[c.state.field,c.state.ultimate,c.state.dash,c.state.blink,...['flying','projectiles','effects','ghosts','slash'].map(k=>c.state[k]?.length||0)];native(i);const next=[c.state.field,c.state.ultimate,c.state.dash,c.state.blink,...['flying','projectiles','effects','ghosts','slash'].map(k=>c.state[k]?.length||0)];if(next.some((v,n)=>v!==snapshot[n]))used.add(i);};
    autoCombat.toggle(true);autoStep(18);autoCombat.toggle(false);skill=native;gmTest.enabled=false;return [...used].sort();
   },sect);assert.deepEqual(gm,[0,1,2,3],'GM must not starve ultimate by refreshing the field');
  }
  const locked=await page.evaluate(()=>{autoReset(3,false);P.mp=0;autoCombat.toggle(true);autoStep(4);const count=autoCasts.length,basic=autoBasic;autoCombat.toggle(false);autoStep(2);return{count,basic,after:autoBasic};});assert.equal(locked.count,0);assert(locked.basic>0);assert.equal(locked.after,locked.basic);
  const joystick=await page.evaluate(()=>{autoReset(0);autoCombat.toggle(true);mobileInput.active=true;mobileInput.x=mobileInput.y=0;autoStep(1);mobileInput.active=false;autoCombat.toggle(false);return{x:P.x,y:P.y,casts:autoCasts.length};});assert.equal(joystick.x,1000);assert.equal(joystick.y,1100);assert.equal(joystick.casts,0);
  const pause=await page.evaluate(()=>{autoReset(0);autoCombat.toggle(true);worldMap.dialog.show('test','test');autoStep(1);const count=autoCasts.length,basic=autoBasic;worldMap.dialog.close();autoCombat.toggle(false);return{count,basic};});assert.equal(pause.count,0);assert.equal(pause.basic,0);
  assert.deepEqual(errors,[]);console.log('PASS locked skills/no mana fallback, stop toggle, joystick priority and modal pause');
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
