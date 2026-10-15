const assert=require('node:assert/strict'),path=require('node:path'),{spawn}=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||path.join(require('node:os').homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async()=>{
  const server=spawn('python',['-u','tests/world_server_fixture.py'],{cwd:path.resolve(__dirname,'..'),windowsHide:true,stdio:['ignore','pipe','pipe']});let browser;
  try{
    const port=await new Promise((resolve,reject)=>{server.stdout.once('data',d=>resolve(Number(String(d).trim())));server.once('error',reject);});
    browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server']});const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/api/characters',r=>r.fulfill({status:201,contentType:'application/json',body:'{"saved":true}'}));await page.route('**/fonts.googleapis.com/**',r=>r.abort());await page.addInitScript(()=>window.requestAnimationFrame=()=>0);
    await require('./test-account.cjs')(page);await page.goto('http://127.0.0.1:'+port,{waitUntil:'networkidle'});await page.waitForFunction(()=>creatureArt.ready(),null,{polling:50});await page.locator('#nm').fill('Quái thử');await page.locator('#ok').click();
    await page.evaluate(()=>{P.world.tutorial=true;window.stepCreatures=seconds=>{for(let i=0;i<Math.ceil(seconds/.01);i++){tm+=.01;up(.01);}dr();};stepCreatures(.01);});
    assert.deepEqual(await page.evaluate(()=>[...new Set(E.map(e=>T[e.t].skin))].sort()),['BoNgua','Doi','Nhen','Tho']);
    await page.evaluate(()=>{worldMap.travel('moon');stepCreatures(.01);});assert.deepEqual(await page.evaluate(()=>[...new Set(E.map(e=>T[e.t].skin))].sort()),['BoNgua','Doi','Nhen','Tho']);
    const moving=await page.evaluate(()=>{const e={t:3,x:1000,y:1660,hx:1000,hy:1660,hp:40,dead:0,cd:100,fr:0,fl:0,worldMap:true};E=[e];P.x=1030;P.y=1680;P.acd=100;P.hp=100;K={};stepCreatures(.1);return creatureArt.frame(e).mode;});assert.equal(moving,'move');
    const attack=await page.evaluate(()=>{P.x=E[0].x;P.y=E[0].y;E[0].cd=0;const hp=P.hp;stepCreatures(.01);return {mode:creatureArt.frame(E[0]).mode,damaged:P.hp<hp};});assert.equal(attack.mode,'attack');assert(attack.damaged);
    await page.evaluate(()=>hit(E[0],1));assert.equal(await page.evaluate(()=>creatureArt.frame(E[0]).mode),'hurt');await page.evaluate(()=>stepCreatures(.39));assert.equal(await page.evaluate(()=>creatureArt.frame(E[0]).mode),'attack');
    const death=await page.evaluate(()=>{const before=P.gold;hit(E[0],10000);const reward=P.gold-before;hit(E[0],10000);return {reward,second:P.gold-before,mode:creatureArt.frame(creatureArt.corpses[0]).mode,count:creatureArt.corpses.length};});assert(death.reward>0);assert.equal(death.reward,death.second);assert.equal(death.mode,'death');assert.equal(death.count,1);
    await page.evaluate(()=>stepCreatures(1));assert.equal(await page.evaluate(()=>creatureArt.corpses.length),0);await page.evaluate(()=>stepCreatures(7.1));assert(await page.evaluate(()=>E[0].hp>0&&E[0].dead===0&&worldMap.canWalk(E[0])));
    // Every sheet selects a single frame; hurt animations have five rather than six.
    assert(await page.evaluate(()=>Object.values(creatureArt.species).every(k=>k.sheets[k.hurt-1]===5&&k.sheets[k.death-1]===6)));
    await page.evaluate(()=>{worldMap.travel('sword');P.x=1000;P.y=1700;P.acd=100;P.hp=mhp();P.mp=mmp();E=[0,1,3,4].map((t,i)=>({t,x:910+i*60,y:1650,hx:910+i*60,hy:1650,hp:T[t].hp,dead:0,cd:100,fr:0,fl:0,worldMap:true}));stepCreatures(.01);});await page.screenshot({path:path.join(__dirname,'artifacts/monster-lineup.png')});
    await page.evaluate(()=>{worldMap.travel('hub');const s=worldMap.services.find(s=>s.id==='forge');P.x=s.x;P.y=s.y;stepCreatures(.01);worldMap.interact();});assert.equal(await page.locator('#npc-dialog-portrait').getAttribute('src'),await page.evaluate(()=>creatureArt.npcImages.thoren.src));await page.screenshot({path:path.join(__dirname,'artifacts/npc-forge-dialog.png')});
    const pausedFrame=await page.evaluate(()=>{const e={t:0,x:1400,y:1500,hx:1400,hy:1500,hp:20,dead:0,cd:1,fr:0,fl:0};E.push(e);creatureArt.onAttack(e);const before=creatureArt.frame(e).index;stepCreatures(.5);return creatureArt.frame(e).index===before;});assert(pausedFrame,'Enemy attack animation must pause while talking to an NPC');await page.getByRole('button',{name:'Đóng',exact:true}).click();
    await page.evaluate(()=>{P.x=1000;P.y=1000;stepCreatures(.01);});await page.screenshot({path:path.join(__dirname,'artifacts/npc-hub.png')});
    assert.deepEqual(errors,[]);assert.equal(await page.locator('#dbg').count(),0,await page.locator('#dbg').allTextContents());console.log('PASS All NPC/monster assets, species distribution, movement/attack/hurt/death animations, single kill reward, respawn, dialogues and rendering');
  }finally{if(browser)await browser.close();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
