const assert=require('node:assert/strict'),path=require('node:path'),{spawn}=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||path.join(require('node:os').homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async()=>{
  const server=spawn('python',['-u','-c','from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer; s=ThreadingHTTPServer(("127.0.0.1",0),SimpleHTTPRequestHandler); print(s.server_port,flush=True); s.serve_forever()'],{cwd:path.resolve(__dirname,'..'),windowsHide:true,stdio:['ignore','pipe','ignore']});
  let browser;
  try{
    const port=await new Promise((resolve,reject)=>{server.stdout.once('data',d=>resolve(Number(String(d).trim())));server.once('error',reject);});
    browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server']});
    const context=await browser.newContext({viewport:{width:1280,height:800},hasTouch:true}),page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/api/characters',r=>r.fulfill({status:201,contentType:'application/json',body:'{"saved":true}'}));
    await page.route('**/fonts.googleapis.com/**',r=>r.abort());
    await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
    await require('./test-account.cjs')(page);await page.goto('http://127.0.0.1:'+port,{waitUntil:'networkidle'});
    await page.locator('.sect-choice').nth(1).click();await page.locator('#nm').fill('Ngắm thử');await page.locator('#ok').click();
    await page.evaluate(()=>{
      window.resetAimTest=(w=1)=>{classCombat.onRespawn();kiemCombat.state.cooldown.fill(0);moonCombat.state.cooldown.fill(0);kiemCombat.state.aim=moonCombat.state.aim=null;
        P.world.learnedSkills=[true,true,true,true];Object.assign(P,{x:1000,y:1100,r:3,level:40,mp:125,hp:310,dir:2,f:1});P.ap.w=w;K={};ptr=null;E.length=0;moonCombat.refreshUI(true);getClassCombat().refreshUI?.(true);cultivation.refresh();};
      window.previewHasInk=()=>{g.save();g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,W,H);g.restore();skillAim.drawPreview();const pixels=g.getImageData(0,0,W,H).data;return pixels.some((v,i)=>i%4===3&&v>0);};
      resetAimTest(0);E.push({t:0,x:900,y:1100,hp:1000,dead:0});skill(0);
    });
    assert(await page.evaluate(()=>kiemCombat.state.flying.every(s=>s.vx>0)),'Sword cast faces right despite enemy on left');
    await page.evaluate(()=>{resetAimTest();E.push({t:0,x:900,y:1100,hp:1000,dead:0});skill(0);});
    assert(await page.evaluate(()=>moonCombat.state.flying.every(b=>b.end.x>P.x)),'Moon cast does not select nearest enemy');
    await page.evaluate(()=>resetAimTest(0));
    await page.mouse.move(820,400);assert.equal(await page.evaluate(()=>skillAim.state.visible||previewHasInk()),false,'Moving the cursor must not show indicators');await page.keyboard.press('2');
    assert(await page.evaluate(()=>kiemCombat.state.dash.end.x>P.x),'Keyboard dash follows cursor');
    await page.evaluate(()=>resetAimTest());
    await page.mouse.move(440,400);await page.keyboard.press('2');
    assert(await page.evaluate(()=>P.x<1000),'Moon teleport follows cursor to left');
    await page.evaluate(()=>resetAimTest());await page.setViewportSize({width:390,height:844});
    const cdp=await context.newCDPSession(page);
    async function touch(type,x,y){await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'||type==='touchCancel'?[]:[{x,y,id:7}]});}
    let b=await page.locator('#sb button').first().boundingBox(),x=b.x+b.width/2,y=b.y+b.height/2;
    await touch('touchStart',x,y);await touch('touchMove',x+90,y);
    assert(await page.evaluate(()=>skillAim.isPreviewing()&&previewHasInk()),'Holding a skill shows its actual guide');assert.equal(await page.evaluate(()=>P.mp),125,'Hold to aim spends no mana');
    assert.equal(await page.evaluate(()=>moonCombat.state.flying.length),0,'Hold does not cast');
    await page.evaluate(()=>dr());
    await page.screenshot({path:path.join(__dirname,'artifacts','skill-aim-mobile.png')});
    await touch('touchEnd');
    assert.equal(await page.evaluate(()=>moonCombat.state.flying.length),3,'Release casts exactly one set of blades');
    assert.equal(await page.evaluate(()=>P.mp),116,'Release charges mana once');assert.equal(await page.evaluate(()=>skillAim.state.visible||previewHasInk()),false,'Release immediately hides all indicators');
    assert(await page.evaluate(()=>moonCombat.state.flying.every(b=>b.end.x>P.x&&Math.abs(b.end.y-P.y)<1)),'Right drag sets skill direction');
    await page.evaluate(()=>resetAimTest());
    b=await page.locator('#sb button').first().boundingBox();x=b.x+b.width/2;y=b.y+b.height/2;
    await touch('touchStart',x,y);
    const cancel=await page.locator('#aim-cancel').boundingBox();await touch('touchMove',cancel.x+cancel.width/2,cancel.y+cancel.height/2);await touch('touchEnd');
    assert.equal(await page.evaluate(()=>P.mp),125);assert.equal(await page.evaluate(()=>moonCombat.state.flying.length),0,'Cancel causes no cast');
    assert.equal(await page.locator('#aim-cancel').isVisible(),false);
    assert.equal(await page.evaluate(()=>skillAim.state.visible||previewHasInk()),false,'Canceled guide must be hidden');
    for(let sect=0;sect<4;sect++)for(let index=0;index<4;index++){
      await page.evaluate(sect=>resetAimTest(sect),sect);const box=await page.locator('#sb button').nth(index).boundingBox();const sx=box.x+box.width/2,sy=box.y+box.height/2;
      await touch('touchStart',sx,sy);assert(await page.evaluate(()=>skillAim.isPreviewing()&&previewHasInk()),'Guide missing for '+sect+'/'+index);await touch('touchEnd');assert.equal(await page.evaluate(()=>skillAim.state.visible||previewHasInk()),false,'Guide leaked after '+sect+'/'+index);
    }
    for(const reason of ['escape','blur','capture','respawn','dialog']){
      await page.evaluate(()=>resetAimTest(0));const box=await page.locator('#sb button').first().boundingBox();await touch('touchStart',box.x+box.width/2,box.y+box.height/2);
      await page.evaluate(reason=>{if(reason==='escape')dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));if(reason==='blur')dispatchEvent(new Event('blur'));if(reason==='capture')skillAim.state.drag.button.dispatchEvent(new PointerEvent('lostpointercapture',{pointerId:skillAim.state.drag.id}));if(reason==='respawn')classCombat.onRespawn();if(reason==='dialog'){worldMap.dialog.show('Test','');up(.01);}},reason);
      assert.equal(await page.evaluate(()=>skillAim.state.visible||previewHasInk()),false,'Guide leaked on '+reason);await touch('touchEnd');assert.equal(await page.evaluate(()=>kiemCombat.state.flying.length),0,'Abort must not cast: '+reason);await page.evaluate(()=>worldMap.dialog.close());
    }
    assert.deepEqual(errors,[]);
    console.log('PASS No enemy auto-target; cursor keyboard aim; touch hold/drag/release casts once; cancel spends no mana; all 16 held guides hide on release; cancel/blur/modal/respawn cleanup; no runtime errors');
  }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
