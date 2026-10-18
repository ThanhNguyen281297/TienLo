const assert=require('node:assert/strict'),path=require('node:path'),os=require('node:os'),{spawn}=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async()=>{const server=spawn('python',['-u','-c','from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer; s=ThreadingHTTPServer(("127.0.0.1",0),SimpleHTTPRequestHandler); print(s.server_port,flush=True); s.serve_forever()'],{windowsHide:true,stdio:['ignore','pipe','ignore']});let browser;
try{const port=await new Promise(resolve=>server.stdout.once('data',d=>resolve(Number(String(d).trim()))));browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server']});
const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{requestAnimationFrame=()=>0;window.resized=false;addEventListener('resize',()=>resized=true);});await require('./test-account.cjs')(page);await page.route('**/api/characters',r=>r.fulfill({status:201,body:'{}'}));await page.goto('http://127.0.0.1:'+port,{waitUntil:'networkidle'});
assert(await page.locator('#move-joystick').isHidden());await page.locator('#nm').fill('Mobile HUD');await page.locator('#ok').click();
await page.evaluate(()=>{P.world.tutorial=true;E=[];P.r=3;P.level=40;P.hp=mhp();P.mp=mmp();P.world.learnedSkills=[true,true,true,true];window.hudStep=t=>{for(let i=0;i<Math.ceil(t/.01);i++){tm+=.01;up(.01);}dr();};hudStep(2);V.length=0;dr();});
await page.waitForFunction(()=>{worldVFX.paintIcons();return [...sb.children].every(b=>b.querySelector('canvas')?.dataset.spriteIcon);},null,{polling:50});
for(const viewport of [{width:390,height:844},{width:844,height:390},{width:568,height:320},{width:320,height:568},{width:1440,height:900}]){
  await page.evaluate(()=>resized=false);if(viewport.width!==390||viewport.height!==844){await page.setViewportSize(viewport);await page.waitForFunction(()=>resized,null,{polling:50});}
  const layout=await page.evaluate(()=>{rs();hudStep(.01);const box=id=>{const b=$(id).getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height,right:b.right,bottom:b.bottom};};
    return {width:innerWidth,height:innerHeight,stick:box('move-joystick'),wheel:box('combat-wheel'),dock:box('bt'),attack:box('basic-attack'),skills:[...sb.children].map(b=>{const r=b.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,radius:getComputedStyle(b).borderRadius};}),labels:[...$('bt').children].map(b=>b.getAttribute('aria-label'))};});
  const overlap=(a,b)=>Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>1&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>1;
  for(const b of [layout.stick,layout.wheel,layout.dock])assert(b.x>=0&&b.y>=0&&b.right<=layout.width+1&&b.bottom<=layout.height+1,JSON.stringify(layout));
  assert(layout.stick.x<layout.width/2&&layout.wheel.x+layout.wheel.w/2>layout.width/2);assert(!overlap(layout.stick,layout.wheel)&&!overlap(layout.dock,layout.wheel)&&!overlap(layout.dock,layout.stick),JSON.stringify(layout));
  assert.equal(layout.skills.length,4);assert(layout.skills.every(b=>b.radius==='50%'&&Math.abs(b.w-b.h)<1&&!overlap(b,layout.attack)));
  assert.equal(layout.labels.length,5);await page.screenshot({path:path.join(__dirname,'artifacts',`mobile-hud-${viewport.width}x${viewport.height}.png`)});
}
await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{rs();P.x=1000;P.y=1110;hudStep(.01);});
const stick=await page.locator('#move-joystick').boundingBox(),skill=await page.locator('#sb button').first().boundingBox(),cdp=await context.newCDPSession(page);
const center={x:stick.x+stick.width/2,y:stick.y+stick.height/2},held={id:1,x:center.x+stick.width*.31,y:center.y},cast={id:2,x:skill.x+skill.width/2,y:skill.y+skill.height/2};
await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,...center}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[held]});
await page.evaluate(()=>hudStep(.2));const moved=await page.evaluate(()=>P.x);assert(moved>1025,'Joystick moves character to the right');assert(await page.evaluate(()=>mobileInput.active));
const mana=await page.evaluate(()=>P.mp);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[held,cast]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[cast]});
await page.evaluate(()=>hudStep(.02));assert(await page.evaluate(()=>mobileInput.active),'Releasing the skill finger must keep the joystick held');assert(await page.evaluate(mana=>P.mp<mana,mana),'Second finger casts the real skill');assert(await page.locator('#sb button').first().getAttribute('data-cooldown'));
await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});const stopped=await page.evaluate(()=>{const x=P.x;hudStep(.3);return {x,after:P.x,active:mobileInput.active};});assert.equal(stopped.active,false);assert.equal(stopped.x,stopped.after);
await page.locator('#bag-button').tap();assert(await page.evaluate(()=>worldMap.dialog.isOpen()));assert(await page.locator('#move-joystick').isHidden());await page.evaluate(()=>worldMap.dialog.close());
await page.locator('#attr-button').tap();assert(await page.evaluate(()=>worldMap.dialog.isOpen()));await page.evaluate(()=>worldMap.dialog.close());
await page.locator('#auto-button').tap();await page.evaluate(()=>hudStep(.01));assert.equal(await page.locator('#auto-button').getAttribute('aria-pressed'),'true');await page.locator('#auto-button').tap();
await page.locator('#hud-more').tap();assert(await page.locator('#hud-more-menu').isVisible());await page.locator('#gm-skills').tap();assert(await page.evaluate(()=>gmTest.enabled));assert(await page.locator('#hud-more-menu').isHidden());
await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,...center}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[held]});await page.evaluate(()=>worldMap.dialog.show('Tạm dừng',''));assert.equal(await page.evaluate(()=>mobileInput.active),false);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.evaluate(()=>worldMap.dialog.close());
assert.deepEqual(errors,[]);console.log('PASS five responsive layouts, genuine multitouch movement + casting, release stops movement, inventory/attributes/auto/GM and modal cancellation');
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
