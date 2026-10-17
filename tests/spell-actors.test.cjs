const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{spawn}=require('node:child_process');
const {chromium}=require(path.join(require('node:os').homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async()=>{
 const server=spawn('python',['-u','-c','from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer; s=ThreadingHTTPServer(("127.0.0.1",0),SimpleHTTPRequestHandler); print(s.server_port,flush=True); s.serve_forever()'],{windowsHide:true,stdio:['ignore','pipe','ignore']});let browser;
 try{
  const port=await new Promise(r=>server.stdout.once('data',d=>r(Number(String(d).trim()))));
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server']});
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>requestAnimationFrame=()=>0);await require('./test-account.cjs')(page);
  await page.goto('http://127.0.0.1:'+port,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>spellActors.ready&&spellImagery.ready);
  const result=await page.evaluate(()=>{
   const c=document.createElement('canvas');c.width=400;c.height=320;const g=c.getContext('2d',{willReadFrequently:true});
   const original=skillSprites.draw;skillSprites.draw=()=>{throw Error('World effects must not dissolve whole finished illustrations');};
   function render(sect,t){
    g.clearRect(0,0,400,320);spellActors.ultimate(g,sect,3,t,3,200,155,150,170,1.7);
    const data=g.getImageData(0,0,400,320).data;let hash=2166136261,lit=0;
    for(let n=0;n<data.length;n+=4){hash=Math.imul(hash^data[n],16777619);hash=Math.imul(hash^data[n+3],16777619);if(data[n+3])lit++;}
    return {hash:hash>>>0,lit};
   }
   const summaries=[];
   for(let sect=0;sect<4;sect++){
    const subjectFrames=[];
    for(let n=0;n<24;n++){
     g.clearRect(0,0,400,320);spellImagery.render(g,sect,200,240,n/60+.5,3,1.7,180,200);
     const p=g.getImageData(0,0,400,320).data;let h=2166136261;
     for(let i=0;i<p.length;i+=4)h=Math.imul(h^p[i]^p[i+3],16777619);
     subjectFrames.push(h>>>0);
    }
    if(new Set(subjectFrames).size!==24)throw Error('Articulated actors are static for class '+sect);
    const samples=[];for(let n=0;n<45;n++)samples.push(render(sect,.4+n/60));
    if(new Set(samples.map(s=>s.hash)).size!==samples.length)throw Error('Frozen animation for class '+sect);
    if(samples.some(s=>s.lit<100))throw Error('Missing visible texture for class '+sect);
    const first=render(sect,1.1);render(sect,.5);const repeated=render(sect,1.1);
    if(first.hash!==repeated.hash)throw Error('Frame-rate dependent particle history');
    for(const t of [1.699,1.7,1.701,2,2.5,2.99])render(sect,t);
    summaries.push({sect,uniqueFrames:new Set(samples.map(s=>s.hash)).size,lit:samples[20].lit});
   }
   const a=spellImagery.pose(3,.5,3,1.7),b=spellImagery.pose(3,.8,3,1.7);
   const joint=(p,id)=>p.nodes.find(n=>n.id===id);
   const bend=p=>joint(p,'wing-tip--1').angle-joint(p,'wing-root--1').angle;
   if(Math.abs(bend(a)-bend(b))<.15)throw Error('Phoenix elbow does not articulate independently');
   const dragon=spellImagery.pose(2,1,3,1.7);
   if(dragon.nodes.filter(n=>n.id.startsWith('vertebra-')).length<15||!joint(dragon,'head'))throw Error('Dragon must use a chain of independent body joints');
   const dragonImpact=joint(spellImagery.pose(2,1.7,3,1.7),'head');
   if(Math.hypot(dragonImpact.x,dragonImpact.y)>1e-6)throw Error('Dragon head must dive to the impact point at hit time');
   const swords=spellImagery.pose(0,1.7,3,1.7).nodes;
   if(swords.some(n=>Math.hypot(n.x,n.y)>1e-6))throw Error('Sword impact does not meet the damage time');
   for(let sect=0;sect<4;sect++)if(spellImagery.pose(sect,3,3,1.7).nodes.length)throw Error('Finished cast leaves actors behind');
   skillSprites.draw=original;
   document.getElementById('actor-proof')?.remove();const proof=document.createElement('canvas');proof.id='actor-proof';proof.width=1280;proof.height=800;proof.style.cssText='position:fixed;inset:0;z-index:99999;width:1280px;height:800px';document.body.appendChild(proof);
   window.renderActorProof=(t)=>{
    const ctx=proof.getContext('2d');ctx.fillStyle='#14222b';ctx.fillRect(0,0,1280,800);
    for(let sect=0;sect<4;sect++){
     const x=160+sect*320;ctx.fillStyle='#d8e4df';ctx.font='18px sans-serif';ctx.textAlign='center';ctx.fillText(['Kiếm Tông','Minh Nguyệt','Lôi Thương','Thiên Cơ'][sect],x,45);
     spellActors.ultimate(ctx,sect,3,t,3,x,195,210,220,1.7);
     spellActors.field(ctx,sect,{x,y:560,age:t,duration:3,radius:100},.8);
     spellActors.projectile(ctx,sect,x+Math.sin(t)*60,680,-.25,t,40,1);
    }
   };renderActorProof(1.2);return summaries;
  });
  await page.screenshot({path:path.join(__dirname,'artifacts','layered-skills-charge.png')});
  await page.evaluate(()=>renderActorProof(1.9));await page.screenshot({path:path.join(__dirname,'artifacts','layered-skills-impact.png')});
  // A real-time recording makes the movement reviewable, not only still frames.
  const video=await page.evaluate(async()=>{
   const c=document.getElementById('actor-proof'),stream=c.captureStream(30),recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9'}),chunks=[];
   recorder.ondataavailable=e=>chunks.push(e.data);const finished=new Promise(r=>recorder.onstop=r);recorder.start();
   const start=performance.now();await new Promise(resolve=>{const tick=()=>{const elapsed=(performance.now()-start)/1000;renderActorProof(elapsed%3);if(elapsed>=6)resolve();else setTimeout(tick,1000/30);};tick();});
   recorder.stop();await finished;stream.getTracks().forEach(t=>t.stop());const bytes=new Uint8Array(await new Blob(chunks).arrayBuffer());let str='';for(const byte of bytes)str+=String.fromCharCode(byte);return btoa(str);
  });
  fs.writeFileSync(path.join(__dirname,'artifacts','layered-skills-preview.webm'),Buffer.from(video,'base64'));
  assert.deepEqual(errors,[]);console.log('PASS articulated spells: separate joints, independent elbows, dragon chain, sword impact timing, cleanup, 180 distinct frames and deterministic rendering; '+JSON.stringify(result));
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
