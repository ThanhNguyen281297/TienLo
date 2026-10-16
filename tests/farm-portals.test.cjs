const assert=require('node:assert/strict'),path=require('node:path'),os=require('node:os'),{spawn}=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async()=>{const server=spawn('python',['-u','-c','from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer; s=ThreadingHTTPServer(("127.0.0.1",0),SimpleHTTPRequestHandler); print(s.server_port,flush=True); s.serve_forever()'],{windowsHide:true,stdio:['ignore','pipe','ignore']});let browser;
try{const port=await new Promise(resolve=>server.stdout.once('data',d=>resolve(Number(String(d).trim()))));browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{requestAnimationFrame=()=>0;window.resized=false;addEventListener('resize',()=>resized=true);});await require('./test-account.cjs')(page);await page.route('**/api/characters',r=>r.fulfill({status:201,body:'{}'}));
await page.goto('http://127.0.0.1:'+port,{waitUntil:'networkidle'});await page.locator('#nm').fill('Trận truyền tống');await page.locator('#ok').click();
await page.evaluate(()=>{P.world.tutorial=true;window.portalStep=t=>{for(let i=0;i<Math.ceil(t/.01);i++){tm+=.01;up(.01);}dr();};});
for(const scene of ['sword','moon','thunder','mystic','valley']){
  const initial=await page.evaluate(scene=>{worldMap.travel(scene);const count=E.length,bad=E.filter(e=>!worldMap.canWalk(e)).length;E=[];portalStep(.01);return {count,bad,routes:farmPortals.routes(),services:worldMap.services.filter(s=>s.farmPortal).length,bridges:worldMap.bridgeRoutes().length};},scene);
  assert.equal(initial.count,scene==='valley'?36:48);assert.equal(initial.bad,0);assert.equal(initial.routes.length,scene==='valley'?3:4);assert.equal(initial.services,initial.routes.length*2);assert.equal(initial.bridges,0);
  for(const route of initial.routes){
    await page.evaluate(route=>{P.x=route.from.x;P.y=route.from.y;portalStep(1);},route);
    assert(await page.evaluate(()=>worldMap.state.near?.farmPortal),'E selects the nearby formation');
    await page.keyboard.press('e');
    assert(await page.evaluate(route=>Math.hypot(P.x-route.to.x,P.y-route.to.y)<.01&&worldMap.canWalk(P),route),scene+' '+route.id+': outbound');
    await page.evaluate(()=>portalStep(.01));await page.keyboard.press('e');
    assert(await page.evaluate(route=>Math.hypot(P.x-route.to.x,P.y-route.to.y)<.01,route),'Cooldown prevents immediate bounce');
    await page.evaluate(()=>portalStep(1));await page.keyboard.press('e');
    assert(await page.evaluate(route=>Math.hypot(P.x-route.from.x,P.y-route.from.y)<.01&&worldMap.canWalk(P),route),scene+' '+route.id+': return');
  }
  await page.evaluate(()=>{portalStep(1);dr();});await page.screenshot({path:path.join(__dirname,'artifacts','farm-portals-'+scene+'.png')});
  console.log('PASS '+scene+': expanded islands, doubled population, all E routes both ways and cooldown');
}
await page.evaluate(()=>{worldMap.travel('sword');E=[];resized=false;});await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>resized,null,{polling:50});
await page.evaluate(()=>{rs();const route=farmPortals.routes()[0];P.x=route.from.x;P.y=route.from.y;portalStep(1);});
await page.locator('#world-interact').click();assert(await page.evaluate(()=>Math.hypot(P.x-farmPortals.routes()[0].to.x,P.y-farmPortals.routes()[0].to.y)<.01));
await page.evaluate(()=>{portalStep(.01);dr();});await page.screenshot({path:path.join(__dirname,'artifacts','farm-portals-mobile.png')});
await page.evaluate(()=>worldMap.travel('hub'));assert.equal(await page.evaluate(()=>worldMap.services.filter(s=>s.farmPortal).length),0);
assert.deepEqual(errors,[]);console.log('PASS mobile interact button and cleanup on hub travel');
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
