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
    const construction=await page.evaluate(()=>{
      const canvas=document.createElement('canvas');canvas.width=600;canvas.height=400;
      const ctx=canvas.getContext('2d'),draw=ctx.drawImage.bind(ctx),scale=ctx.scale.bind(ctx),planks=[];let mirrors=0;
      ctx.drawImage=(image,...args)=>{planks.push({src:image.src,args:args.length});draw(image,...args);};
      worldMap.mapStructures.drawTimber(ctx,{x:100,y:200},{x:450,y:200});
      ctx.scale=(x,y)=>{if(x<0)mirrors++;scale(x,y);};
      worldMap.mapStructures.drawWall(ctx,[{x:100,y:100},{x:200,y:150}]);
      worldMap.mapStructures.drawWall(ctx,[{x:100,y:150},{x:200,y:100}]);
      return {boards:planks.filter(p=>p.src.includes('wood-plank.png')).length,whole:planks.every(p=>p.args===4),mirrors};
    });
    assert(construction.boards>=50&&construction.whole,'Bridge boards use whole individual PNGs rather than a stretched span');
    assert.equal(construction.mirrors,1,'Opposite wall slopes use matching sprite orientation');
    const joins=await page.evaluate(()=>{
      const model=worldMap.mapStructures.layout(),bridge=model.bridges.find(b=>b.id==='east');
      const canvas=document.createElement('canvas');canvas.width=600;canvas.height=400;const ctx=canvas.getContext('2d');ctx.translate(-1000,-900);
      worldMap.mapStructures.drawTimber(ctx,bridge.a,bridge.b);
      return {inside:ctx.getImageData(290,200,1,1).data[3],outside:ctx.getImageData(320,200,1,1).data[3],
        edge:Math.abs(bridge.a.x-bridge.from.x)/bridge.from.rx+Math.abs(bridge.a.y-bridge.from.y)/bridge.from.ry,
        wedge:worldMap.canWalk({x:1285,y:1118}),piers:model.piers.length,unique:new Set(model.piers.map(p=>p.x.toFixed(3)+','+p.y.toFixed(3))).size};
    });
    assert.equal(joins.inside,0,'Timber must never paint over paving or hide the pointed corner');
    assert(joins.outside>0&&Math.abs(joins.edge-1)<1e-8&&joins.wedge,'The V-shaped join meets the exact island edge and stays walkable');
    assert.equal(joins.piers,joins.unique,'Each shared wall joint has one pier');
    const corners=await page.evaluate(()=>{
      const canvas=document.createElement('canvas');canvas.width=600;canvas.height=400;const ctx=canvas.getContext('2d'),draw=stonePaving.draw;
      stonePaving.draw=ctx=>{ctx.fillStyle='#ff0000';ctx.fillRect(0,0,600,400);};
      try{worldMap.layoutArt.islandDeck(ctx,300,200,250,140);}finally{stonePaving.draw=draw;}
      const red=(x,y)=>{const p=ctx.getImageData(x,y,1,1).data;return p[0]===255&&p[1]===0&&p[2]===0;};
      return {center:red(300,200),tips:[[300,65],[545,200],[300,335],[55,200]].map(([x,y])=>red(x,y))};
    });
    assert(corners.center&&corners.tips.every(red=>!red),'All four stone tips remain free of procedural paving');
    for(const scene of ['sword','moon','thunder','mystic','valley']){
      const result=await page.evaluate(scene=>{
        worldMap.travel(scene);P.world.tutorial=true;E=[];
        const structure=worldMap.mapStructures,failures=[];
        for(const bridge of structure.layout().bridges){
          const {a,b,width}=bridge,length=Math.hypot(b.x-a.x,b.y-a.y);
          for(const reverse of [false,true]){
            const start=reverse?b:a,end=reverse?a:b;
            const stop=worldMap.traceMove(start,end);
            if(Math.hypot(stop.x-end.x,stop.y-end.y)>.01)failures.push({id:bridge.id,reverse,stop});
          }
          const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
          const outside={x:mid.x-(b.y-a.y)/length*(width/2+12),y:mid.y+(b.x-a.x)/length*(width/2+12)};
          if(worldMap.canWalk(outside))failures.push({id:bridge.id,outside});
        }
        const walls=structure.layout().walls,blocked=walls.filter(([a,b])=>!worldMap.canWalk({x:(a.x+b.x)/2,y:(a.y+b.y)/2})).length;
        dr();const canvas=document.createElement('canvas');canvas.width=canvas.height=900;worldMap.renderMapPreview(canvas.getContext('2d'),900);
        window.structureOverview=canvas.toDataURL();
        return {failures,bridges:structure.layout().bridges.length,walls:walls.length,blocked};
      },scene);
      assert.deepEqual(result.failures,[],scene+': every bridge is walkable both ways and its sides block movement');
      assert.equal(result.bridges,scene==='valley'?3:4);assert(result.walls>20);assert.equal(result.blocked,result.walls);
      require('node:fs').writeFileSync(path.join(__dirname,'artifacts','structures-'+scene+'-overview.png'),Buffer.from((await page.evaluate(()=>structureOverview)).split(',')[1],'base64'));
      await page.screenshot({path:path.join(__dirname,'artifacts','structures-'+scene+'.png')});
      console.log('PASS '+scene+': all bridge directions, closed walls, open entrances, blocked void');
    }
    await page.evaluate(()=>{worldMap.travel('sword');E=[];const a=worldMap.mapStructures.layout().bridges[0].a;P.x=a.x;P.y=a.y;K.w=1;for(let i=0;i<1600;i++){tm+=.01;up(.01);}K={};dr();});
    assert(await page.evaluate(()=>P.y<600&&worldMap.canWalk(P)),'Ordinary keyboard walking crosses the north bridge');
    await page.evaluate(()=>viewportResizeSeen=false);
    await page.setViewportSize({width:390,height:844});
    await page.waitForFunction(()=>viewportResizeSeen,null,{polling:50});
    await page.evaluate(()=>{rs();const bridge=worldMap.mapStructures.layout().bridges[1];P.x=(bridge.a.x+bridge.b.x)/2;P.y=(bridge.a.y+bridge.b.y)/2;up(.01);dr();});
    await page.screenshot({path:path.join(__dirname,'artifacts','structures-mobile.png')});
    await page.evaluate(()=>{worldMap.travel('hub');dr();});
    assert(await page.evaluate(()=>worldMap.mapStructures.layout().walls.length>20&&worldMap.mapStructures.layout().bridges.length===0));
    await page.screenshot({path:path.join(__dirname,'artifacts','structures-hub.png')});
    assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);console.log('PASS keyboard bridge walking, mobile, hub enclosure and removal of flight UI');
  }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
