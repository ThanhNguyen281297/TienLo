const assert=require('node:assert/strict'),path=require('node:path'),os=require('node:os'),{spawn}=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async()=>{const server=spawn('python',['-u','-c','from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer; s=ThreadingHTTPServer(("127.0.0.1",0),SimpleHTTPRequestHandler); print(s.server_port,flush=True); s.serve_forever()'],{windowsHide:true,stdio:['ignore','pipe','ignore']});let browser;
try{
  const port=await new Promise(resolve=>server.stdout.once('data',d=>resolve(Number(String(d).trim()))));browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server']});
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>requestAnimationFrame=()=>0);await require('./test-account.cjs')(page);
  let saved;await page.route('**/api/characters',r=>{if(r.request().method()==='POST')saved=r.request().postDataJSON().player;return r.fulfill({status:201,body:'{"revision":1}'});});
  await page.goto('http://127.0.0.1:'+port,{waitUntil:'networkidle'});await page.locator('#nm').fill('Khinh công');await page.locator('#ok').click();
  await page.evaluate(()=>{window.stepFlight=t=>{for(let i=0;i<Math.ceil(t/.01);i++){tm+=.01;up(.01);}dr();};P.world.tutorial=true;});
  for(const scene of ['sword','moon','thunder','mystic','valley']){
    const result=await page.evaluate(scene=>{
      worldMap.travel(scene);E=[];const checks=[];
      for(const port of lightness.ports())for(const reverse of [false,true]){
        lightness.cancel();const from=reverse?port.to:port.from,to=reverse?port.from:port.to;P.x=from.x;P.y=from.y;
        const walking=worldMap.traceMove(from,to),gap={x:(from.x+to.x)/2,y:(from.y+to.y)/2};
        const started=lightness.start();stepFlight(lightness.state.flight.duration/2);
        const mid={active:lightness.active,lift:lightness.height(),x:P.x,y:P.y,footsteps:worldVFX.steps.length};
        const mp=P.mp;skill(0);cast();const blocked=P.mp===mp;
        worldMap.dialog.show('Pause','');const age=lightness.state.flight.age;stepFlight(.2);const frozen=age===lightness.state.flight.age;worldMap.dialog.close();
        stepFlight(2.2);checks.push({started,mid,blocked,frozen,landed:!lightness.active&&worldMap.canWalk(P)&&Math.hypot(P.x-to.x,P.y-to.y)<.01,blockedGap:!worldMap.canWalk(gap),walkStopped:Math.hypot(walking.x-to.x,walking.y-to.y)>50});
      }return {checks,bridges:worldMap.bridgeRoutes().length};
    },scene);
    assert.equal(result.bridges,0);assert.equal(result.checks.length,scene==='valley'?6:8);
    for(const check of result.checks){assert(check.started&&check.mid.active&&check.mid.lift>50&&check.mid.footsteps===0);assert(check.blocked&&check.frozen&&check.landed&&check.blockedGap&&check.walkStopped);}
    console.log('PASS '+scene+': all two-way flights, blocked void, casting gates, pause and exact landings');
  }
  await page.evaluate(()=>{worldMap.travel('sword');E=[];const p=lightness.ports()[0];P.x=p.from.x;P.y=p.from.y;});
  await page.locator('#c').focus();await page.keyboard.press('g');assert(await page.evaluate(()=>lightness.active));
  const from=await page.evaluate(()=>lightness.safePosition());await page.evaluate(()=>stepFlight(.7));
  assert(await page.evaluate(()=>{const c=gameCamera(),screenY=(P.y-lightness.height()-c.y)*innerHeight/c.vh;return screenY>innerHeight*.4&&screenY<innerHeight*.6;}),'The renderer camera must keep the airborne character near screen centre');
  await page.evaluate(()=>account.flush());assert.deepEqual({x:saved.x,y:saved.y},from,'Midair saves must preserve a grounded position');
  await page.screenshot({path:path.join(__dirname,'artifacts','lightness-flight-desktop.png')});
  await page.evaluate(()=>classCombat.onRespawn());assert(await page.evaluate(()=>!lightness.active&&worldMap.canWalk(P)));
  await page.evaluate(()=>{lightness.start();worldMap.travel('moon');stepFlight(.1);});assert(await page.evaluate(()=>!lightness.active&&worldMap.state.scene==='moon'&&worldMap.canWalk(P)));
  await page.evaluate(()=>{worldMap.travel('sword');const p=lightness.ports()[0];P.x=p.from.x;P.y=p.from.y;});
  await page.evaluate(()=>{document.getElementById('online-panel').hidden=false;});await page.locator('#chat-input').focus();assert.equal(await page.evaluate(()=>document.activeElement.id),'chat-input');await page.keyboard.press('g');assert.equal(await page.evaluate(()=>lightness.active),false,'Typing in chat must not fly');
  await page.setViewportSize({width:390,height:844});await page.locator('#lightness-button').click();assert(await page.evaluate(()=>lightness.active));await page.evaluate(()=>stepFlight(.65));await page.screenshot({path:path.join(__dirname,'artifacts','lightness-flight-mobile.png')});await page.evaluate(()=>stepFlight(2));
  for(const scene of ['hub','arena']){await page.evaluate(scene=>{lightness.cancel();worldMap.state.scene=scene;up(.01);},scene);assert(await page.locator('#lightness-button').isHidden());assert.equal(await page.evaluate(()=>lightness.start()),false);}
  assert.deepEqual(errors,[]);console.log('PASS keyboard/mobile button, chat focus, midair save safety, respawn/map cancellation and unsupported scenes');
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
