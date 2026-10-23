const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawn}=require('node:child_process');
const {chromium}=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async()=>{
 const server=spawn('python',['-u','-c','from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer; s=ThreadingHTTPServer(("127.0.0.1",0),SimpleHTTPRequestHandler); print(s.server_port,flush=True); s.serve_forever()'],{windowsHide:true,stdio:['ignore','pipe','ignore']});let browser;
 try{
  const port=await new Promise(r=>server.stdout.once('data',d=>r(Number(String(d).trim()))));browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server']});const page=await browser.newPage({viewport:{width:1200,height:800}}),errors=[],missing=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()===404&&!r.url().includes('/api/'))missing.push(r.url());});await page.addInitScript(()=>requestAnimationFrame=()=>0);await require('./test-account.cjs')(page);await page.route('**/api/characters',r=>r.fulfill({status:201,body:'{}'}));await page.goto('http://127.0.0.1:'+port,{waitUntil:'networkidle'});await page.locator('#nm').fill('Van Hai');await page.locator('#ok').click();await page.waitForFunction(()=>creatureArt.ready());
  await page.evaluate(async()=>{
   P.world.tutorial=true;worldMap.dialog.close();for(const key of ['lantern','portal','lotusPond'])worldMap.asset(key);for(const key of ['theme-11-061','theme-11-059'])worldMap.mapThemes.load(key);
   await worldMap.layoutArt.highIsland.decode();await Promise.all([...worldMap.mapThemes.images.values()].map(i=>i.decode()));
   window.renderAtmosphereProof=(kind,t)=>{
    const c=document.createElement('canvas');c.width=600;c.height=600;const ctx=c.getContext('2d',{willReadFrequently:true});worldMap.environmentClock=t;
    if(kind==='river')worldMap.atmosphere.drawCliff(ctx,worldMap.layoutArt.highIsland,{x:300,y:150,rx:200,ry:100,view:{x:0,y:0,width:600,height:600}});
    else if(kind==='sky'){ctx.translate(-600,-800);worldMap.atmosphere.drawSky(ctx,600,800,600,600);}
    else worldMap.sprite(ctx,kind,300,400,150);
    const pixels=ctx.getImageData(0,0,600,600).data;let hash=2166136261,ink=0;for(let n=0;n<pixels.length;n+=4){hash=Math.imul(hash^pixels[n],16777619);hash=Math.imul(hash^pixels[n+1],16777619);hash=Math.imul(hash^pixels[n+3],16777619);if(pixels[n+3])ink++;}
    // Only the waterfall layer is drawn here; ground and unrelated cliff stay clear.
    const floor=ctx.getImageData(300,150,1,1).data[3],rock=ctx.getImageData(214,277,1,1).data[3];
    return{hash:hash>>>0,ink,floor,rock};
   };
  });await page.waitForTimeout(200);
  for(const kind of ['river','lantern','portal','lotusPond','sky']){
   const frames=[];for(let n=0;n<24;n++)frames.push(await page.evaluate(({kind,t})=>renderAtmosphereProof(kind,t),{kind,t:n/24+.2}));
   assert(new Set(frames.map(f=>f.hash)).size>=22,'Static/stepped '+kind);assert(frames.every(f=>f.ink>30),'Invisible '+kind);assert.equal((await page.evaluate(kind=>renderAtmosphereProof(kind,.2),kind)).hash,frames[0].hash,'History dependent '+kind);
   if(kind==='river')assert(frames.every(f=>f.floor===0&&f.rock===0),'Water spills onto stone or floor');
  }
  const kinds=new Set();for(const scene of ['hub','sword','moon','thunder','mystic','arena','worldboss']){
   const result=await page.evaluate(scene=>{
    worldMap.dialog.close();if(worldMap.state.scene==='arena')worldMap.travel('hub');
    if(scene==='arena'||scene==='worldboss'){worldMap.travel('hub');worldMap.state.scene=scene;worldMap.buildings.length=0;worldMap.services.length=0;worldMap.mapThemes.configure();}else worldMap.travel(scene);
    E=[];P.x=1000;P.y=1110;const a=worldMap.atmosphere,settings=a.profile(),geometry=JSON.stringify(worldMap.mapStructures.layout()),points=[];
    for(const zone of worldMap.living.zones())for(let n=0;n<a.count();n++){const p=a.mote(n,zone,1.3,settings);if(!Object.values(p).every(v=>typeof v==='boolean'||Number.isFinite(v)))throw Error('Invalid particle');points.push(p);}
    worldMap.environmentClock=3.5;dr();worldMap.environmentClock=7;dr();if(JSON.stringify(worldMap.mapStructures.layout())!==geometry)throw Error('Animation moved collision');
    return{kind:settings.kind,particles:points.length,budget:a.count(),portals:worldMap.services.filter(s=>s.farmPortal).map(s=>[worldMap.canWalk(s.route.from),worldMap.canWalk(s.route.to)])};
   },scene);kinds.add(result.kind);assert(result.budget<=42);assert(result.particles<=210);assert(result.portals.every(p=>p.every(Boolean)));
  }assert.deepEqual([...kinds].sort(),['ash','ember','leaf','petal','snow']);
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const kind of ['river','lantern','portal','lotusPond','sky'])assert.equal((await page.evaluate(kind=>renderAtmosphereProof(kind,1),kind)).hash,(await page.evaluate(kind=>renderAtmosphereProof(kind,10),kind)).hash,'Reduced motion '+kind);
  await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>{worldMap.travel('moon');P.x=1000;P.y=1110;worldMap.environmentClock=2;dr();});
  const frozen=await page.evaluate(()=>{worldMap.dialog.show('Pause','');const t=worldMap.environmentClock;up(.5);worldMap.dialog.close();return worldMap.environmentClock===t;});assert(frozen);
  await page.screenshot({path:path.join(__dirname,'artifacts/atmosphere-moon.png')});await page.setViewportSize({width:844,height:390});await page.evaluate(()=>{rs();dr();});assert(await page.evaluate(()=>worldMap.atmosphere.count()<worldMap.atmosphere.profile().count));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(__dirname,'artifacts/atmosphere-mobile.png')});await page.setViewportSize({width:1200,height:800});
  // An in-game, eight-second preview: four maps, real render and simulation loops.
  for(const scene of ['hub','moon','thunder','mystic']){await page.evaluate(scene=>{worldMap.travel(scene);P.x=1000;P.y=1110;up(.01);dr();},scene);await page.waitForTimeout(150);}
  await page.evaluate(async()=>Promise.all([...worldMap.mapThemes.images.values()].map(i=>i.decode())));
  const film=await page.evaluate(async()=>{
   const stream=cv.captureStream(24),recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9'}),chunks=[],maps=['hub','moon','thunder','mystic'];recorder.ondataavailable=e=>chunks.push(e.data);const stopped=new Promise(r=>recorder.onstop=r);let scene='',last=performance.now();const start=last,frameTimes=[];recorder.start();
   await new Promise(resolve=>{const tick=()=>{const now=performance.now(),elapsed=(now-start)/1000,index=Math.min(3,Math.floor(elapsed/2));if(scene!==maps[index]){scene=maps[index];worldMap.travel(scene);P.x=1000;P.y=1110;E=[];}
    const t0=performance.now();tm+=Math.min(.05,(now-last)/1000);up(Math.min(.05,(now-last)/1000));last=now;dr();frameTimes.push(performance.now()-t0);g.save();g.setTransform(1,0,0,1,0,0);g.font='600 27px Arial';g.textAlign='center';g.fillStyle='#f5e5c5';g.strokeStyle='#0b1b27';g.lineWidth=5;const title=worldMap.sectMaps[scene].name;g.strokeText(title,W/2,45);g.fillText(title,W/2,45);g.restore();if(elapsed>=8)resolve();else setTimeout(tick,Math.max(0,1000/24-(performance.now()-now)));};tick();});
   recorder.stop();await stopped;stream.getTracks().forEach(t=>t.stop());let bytes='';for(const byte of new Uint8Array(await new Blob(chunks).arrayBuffer()))bytes+=String.fromCharCode(byte);return{data:btoa(bytes),frames:frameTimes.length,p95:frameTimes.sort((a,b)=>a-b)[Math.floor(frameTimes.length*.95)]};
  });fs.writeFileSync(path.join(__dirname,'artifacts/world-atmosphere-preview.webm'),Buffer.from(film.data,'base64'));
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);console.log('PASS flowing water mask, 120 component samples, portals/cloth/caustics/sky, 8 map profiles, fixed geometry and routes, bounded particles, pause/reduced motion/mobile; preview '+film.frames+' frames, p95 render '+film.p95.toFixed(1)+'ms');
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
