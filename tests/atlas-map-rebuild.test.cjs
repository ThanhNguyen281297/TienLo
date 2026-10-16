const assert=require('node:assert/strict'),path=require('node:path'),os=require('node:os'),{spawn}=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async()=>{
  const server=spawn('python',['-u','-c','from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer; s=ThreadingHTTPServer(("127.0.0.1",0),SimpleHTTPRequestHandler); print(s.server_port,flush=True); s.serve_forever()'],{windowsHide:true,stdio:['ignore','pipe','ignore']});let browser;
  try{
    const port=await new Promise(resolve=>server.stdout.once('data',d=>resolve(Number(String(d).trim()))));
    browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server']});
    const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],missing=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().includes('/api/'))missing.push(r.url());});
    await page.addInitScript(()=>requestAnimationFrame=()=>0);await require('./test-account.cjs')(page);
    await page.route('**/api/characters',r=>r.fulfill({status:201,body:'{}'}));
    await page.goto('http://127.0.0.1:'+port,{waitUntil:'networkidle'});
    await page.locator('#nm').fill('Map rebuild');await page.locator('#ok').click();
    await page.waitForFunction(()=>[worldMap.layoutArt.highIsland,...Object.values(worldMap.layoutArt.terrainSprites)].every(i=>i.complete&&i.naturalWidth),null,{polling:50});
    assert(await page.evaluate(()=>worldMap.layoutArt.highIsland.naturalWidth>=1536),'Cliff scenery must use HD artwork');
    const paving=await page.evaluate(()=>{
      const c=document.createElement('canvas');c.width=600;c.height=400;const ctx=c.getContext('2d');
      ctx.drawImage=ctx.createPattern=()=>{throw new Error('Floor must not use images or texture patterns');};
      const region={x:300,y:200,rx:250,ry:140},count=stonePaving.draw(ctx,region);
      const a=stonePaving.model(region),b=stonePaving.model(region);
      return {count,cached:a===b,unique:new Set(a.tiles.map(t=>t.x+':'+t.y)).size,total:a.tiles.length,grass:performance.getEntriesByType('resource').some(r=>r.name.includes('garden-grass.png'))};
    });
    assert(paving.count>100&&paving.cached&&paving.unique===paving.total);
    assert.equal(paving.grass,false,'Grass floor texture is no longer loaded');
    const grounded=await page.evaluate(()=>{
      const canvas=document.createElement('canvas');canvas.width=canvas.height=600;const ctx=canvas.getContext('2d'),failures=[];
      for(const key of Object.keys(worldMap.definitions)){
        ctx.clearRect(0,0,600,600);let ellipses=0,draws=0;const ellipse=ctx.ellipse.bind(ctx),draw=ctx.drawImage.bind(ctx);
        ctx.ellipse=(...a)=>{ellipses++;return ellipse(...a);};ctx.drawImage=(...a)=>{draws++;return draw(...a);};
        worldMap.sprite(ctx,key,300,300,90);ctx.ellipse=ellipse;ctx.drawImage=draw;
        const pixels=ctx.getImageData(0,0,600,600).data;let bottom=-1;
        for(let y=599;y>=0&&bottom<0;y--)for(let x=0;x<600;x++)if(pixels[(y*600+x)*4+3]){bottom=y+1;break;}
        if(ellipses||draws!==1||Math.abs(bottom-300)>3)failures.push({key,ellipses,draws,bottom});
      }return failures;
    });
    assert.deepEqual(grounded,[],'Map props must draw once, without artificial oval shadows, with visible feet on the ground');
    for(const scene of ['sword','moon','thunder','mystic','hub','valley']){
      const draws=await page.evaluate(scene=>{
        worldMap.travel(scene);P.world.tutorial=true;up(.01);
        let count=0;const original=g.drawImage;
        g.drawImage=function(...args){if(args[0]===worldMap.layoutArt.highIsland)count++;return original.apply(this,args);};
        try{dr();}finally{g.drawImage=original;}
        return count;
      },scene);
      assert.equal(draws,scene==='hub'?0:scene==='valley'?4:5,scene+': every island retains its cliff scenery behind procedural paving');
      await page.screenshot({path:path.join(__dirname,'artifacts','map-rebuild-'+scene+'.png')});
    }
    await page.evaluate(()=>{for(let i=0;i<4;i++)skillSprites.preload(i);});
    await page.waitForFunction(()=>skillSprites.cache.size===96&&[...skillSprites.cache.values()].every(a=>a.image.complete&&a.image.naturalWidth),null,{polling:50});
    const motion=await page.evaluate(()=>{
      const c=document.createElement('canvas');c.width=c.height=400;const ctx=c.getContext('2d'),calls=[],positions=[];
      const originalDraw=ctx.drawImage.bind(ctx),originalTranslate=ctx.translate.bind(ctx);
      ctx.drawImage=(...args)=>{calls.push(args.length);return originalDraw(...args);};
      ctx.translate=(x,y)=>{positions.push([x,y]);originalTranslate(x,y);};
      for(let sect=0;sect<4;sect++)for(const t of [.05,.3,.8,1.3,1.8,2.15])skillSprites.animate(ctx,sect,3,t,2.2,200,200,150,170,1.3);
      return {calls,positions};
    });
    assert(motion.calls.length>=24&&motion.calls.every(n=>n===5),'Animated poses keep the entire PNG');
    assert(motion.positions.every(p=>p.every(Number.isFinite)));
    assert(new Set(motion.positions.map(p=>p.map(v=>v.toFixed(2)).join(','))).size>12,'Animation must move through distinct positions, not only dissolve opacity');
    await page.goto('http://127.0.0.1:'+port+'/MAP/atlas-sprites/index.html',{waitUntil:'networkidle'});
    for(let i=1;i<=9;i++){
      const atlas=String(i).padStart(2,'0');await page.locator('#atlas').selectOption(atlas);
      const expected=await page.evaluate(atlas=>mapAtlasSprites.sprites.filter(r=>r.id.startsWith('atlas-'+atlas+'-')).length,atlas);
      assert(expected>0);assert.equal(await page.locator('figure').count(),expected);
      await page.locator('figure img').first().waitFor();
      await page.waitForFunction(()=>document.querySelector('figure img').naturalWidth>0,null,{polling:50});
    }
    assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
    console.log('PASS six scene renders, HD terrain coverage, whole-pose movement and searchable exports from all nine atlases');
  }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
