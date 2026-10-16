const assert=require('node:assert/strict'),path=require('node:path'),os=require('node:os'),{spawn}=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async()=>{
  const server=spawn('python',['-u','-c','from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer; s=ThreadingHTTPServer(("127.0.0.1",0),SimpleHTTPRequestHandler); print(s.server_port,flush=True); s.serve_forever()'],{windowsHide:true,stdio:['ignore','pipe','ignore']});let browser;
  try{
    const port=await new Promise(resolve=>server.stdout.once('data',d=>resolve(Number(String(d).trim()))));
    browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server']});
    const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],missing=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()===404)missing.push(r.url());});
    await page.addInitScript(()=>{requestAnimationFrame=()=>0;window.viewportResizeSeen=false;addEventListener('resize',()=>viewportResizeSeen=true);});await require('./test-account.cjs')(page);
    await page.route('**/api/characters',r=>r.fulfill({status:201,body:'{}'}));
    await page.goto('http://127.0.0.1:'+port,{waitUntil:'networkidle'});
    await page.locator('#nm').fill('Cầu gỗ và thành');await page.locator('#ok').click();
    await page.waitForFunction(()=>Object.values(worldMap.mapStructures.images).every(i=>i.complete&&i.naturalWidth),null,{polling:50});
    assert.equal(await page.locator('#lightness-button').count(),0);
    assert(await page.evaluate(()=>!window.lightness));
    for(const scene of ['sword','moon','thunder','mystic','valley']){
      const result=await page.evaluate(scene=>{
        worldMap.travel(scene);P.world.tutorial=true;E=[];
        const structure=worldMap.mapStructures,failures=[];
        for(const surface of structure.layout().surfaces){const {x,y,rx,ry}=surface;
          for(const p of [{x:x+rx-2,y},{x:x-rx+2,y},{x,y:y+ry-2},{x,y:y-ry+2}])if(worldMap.canWalk(p))failures.push(p);
        }
        for(const camp of scene==='valley'?worldMap.valleyMines:worldMap.farmCamps){
          const gap={x:(1000+camp.x)/2,y:(1100+camp.y)/2};if(worldMap.canWalk(gap))failures.push(gap);
        }
        const walls=structure.layout().walls,blocked=walls.filter(([a,b])=>!worldMap.canWalk({x:(a.x+b.x)/2,y:(a.y+b.y)/2})).length;
        dr();const canvas=document.createElement('canvas');canvas.width=canvas.height=900;worldMap.renderMapPreview(canvas.getContext('2d'),900);
        window.structureOverview=canvas.toDataURL();
        return {failures,bridges:structure.layout().bridges.length,walls:walls.length,blocked};
      },scene);
      assert.deepEqual(result.failures,[],scene+': removed corner platforms and old bridge gaps are unwalkable');
      assert.equal(result.bridges,0);assert(result.walls>20);assert.equal(result.blocked,result.walls);
      require('node:fs').writeFileSync(path.join(__dirname,'artifacts','structures-'+scene+'-overview.png'),Buffer.from((await page.evaluate(()=>structureOverview)).split(',')[1],'base64'));
      await page.screenshot({path:path.join(__dirname,'artifacts','structures-'+scene+'.png')});
      console.log('PASS '+scene+': no bridges, no corner platforms, closed walls and blocked void');
    }
    await page.evaluate(()=>{worldMap.travel('sword');E=[];P.x=1000;P.y=1110;K.d=1;for(let i=0;i<800;i++){tm+=.01;up(.01);}K={};dr();});
    assert(await page.evaluate(()=>P.x<1300&&worldMap.canWalk(P)),'Keyboard movement stops before the removed corner and gap');
    await page.evaluate(()=>viewportResizeSeen=false);
    await page.setViewportSize({width:390,height:844});
    await page.waitForFunction(()=>viewportResizeSeen,null,{polling:50});
    await page.evaluate(()=>{rs();P.x=1000;P.y=1110;up(.01);dr();});
    await page.screenshot({path:path.join(__dirname,'artifacts','structures-mobile.png')});
    await page.evaluate(()=>{worldMap.travel('hub');dr();});
    assert(await page.evaluate(()=>worldMap.mapStructures.layout().walls.length>20&&worldMap.mapStructures.layout().bridges.length===0));
    await page.screenshot({path:path.join(__dirname,'artifacts','structures-hub.png')});
    assert(await page.evaluate(()=>!performance.getEntriesByType('resource').some(r=>/wood-(?:plank|post|span)\.png/.test(r.name))),'Bridge sprites are no longer loaded');
    assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);console.log('PASS blocked old exits, mobile, hub enclosure and removal of flight UI');
  }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
