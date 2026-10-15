const assert=require('node:assert/strict'),{spawn}=require('node:child_process'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||path.join(require('node:os').homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async()=>{const server=spawn('python',['-u','-m','http.server','8097'],{windowsHide:true,stdio:'ignore'});let browser;try{await new Promise(r=>setTimeout(r,1200));browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server']});
for(let w=0;w<4;w++){const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[],failed=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()===404)failed.push(r.url());});await page.route('**/api/characters',r=>r.fulfill({status:201,body:'{}'}));await page.addInitScript(()=>requestAnimationFrame=()=>0);await require('./test-account.cjs')(page);await page.goto('http://127.0.0.1:8097',{waitUntil:'networkidle'});await page.locator('.sect-choice').nth(w).click();await page.locator('.gender-choice button').nth(1).click();await page.locator('#nm').fill('Thử nghiệm');await page.locator('#ok').click();
assert.equal(await page.evaluate(()=>P.ap.w),w);assert.equal(await page.evaluate(()=>P.ap.gender),'Nu');
assert.equal(await page.evaluate(()=>worldMap.state.scene),['sword','moon','thunder','mystic'][w]);
assert.deepEqual(await page.evaluate(()=>({x:P.x,y:P.y})),{x:1000,y:1110});
await page.evaluate(()=>{P.world.learnedSkills=[true,true,true,true];P.r=3;P.mp=999;P.hp=999;P.acd=999;E=[];dr();up(.01);});
if(w>=2){const result=await page.evaluate(()=>{const e={t:0,x:P.x+50,y:P.y,hx:P.x+50,hy:P.y,hp:10000,dead:0,cd:999,fr:999,fl:0};E=[e];const c=newClassCombat; c.state.aim={x:e.x,y:e.y};skill(0);for(let n=0;n<100;n++){tm+=.01;up(.01);}const count=c.state.marks.get(e)?.count||0;const hp=e.hp;skill(1);for(let n=0;n<60;n++)up(.01);skill(2);for(let n=0;n<190;n++)up(.01);skill(3);for(let n=0;n<420;n++){tm+=.01;up(.01);}dr();return{count,hp,final:e.hp,camera:gameCamera(),x:P.x,y:P.y,ultimate:c.state.ultimate};});assert(result.count>0,'Skill 1 applies mark');assert(result.final<result.hp,'Combo deals damage');assert.equal(result.ultimate,null);assert.equal(result.camera.x+result.camera.vw/2,result.x);}
if(w>=2)await page.evaluate(()=>{
  classCombat.onRespawn();P.mp=999;const c=newClassCombat;
  P.world.learnedSkills=[false,false,false,false];skill(0);if(c.state.dash||c.state.projectiles.length||P.mp!==999)throw Error('Unlearned skill cast');
  P.world.learnedSkills=[true,true,true,true];c.state.aim={x:P.x+100,y:P.y};
  const make=(x,y)=>({t:0,x,y,hx:x,hy:y,hp:10000,dead:0,cd:999,fr:999,fl:0});const front=make(P.x+50,P.y),back=make(P.x-50,P.y);E=[front,back];skill(1);
  if(front.hp===10000||back.hp!==10000)throw Error('Directional cone hit incorrect');const mana=P.mp;skill(1);if(P.mp!==mana)throw Error('Cooldown permits second cast');
  classCombat.onRespawn();if(c.state.marks.size||c.state.field||c.state.ultimate)throw Error('Reset failed');
});
await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{rs();dr();});
await page.evaluate(()=>dr());assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);console.log('PASS class '+w+' female assets, UI, camera'+(w>=2?', marks and combo':''));await page.close();}
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
