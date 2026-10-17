const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawn}=require('node:child_process');
const {chromium}=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async()=>{
 const server=spawn('python',['-u','-c','from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer; s=ThreadingHTTPServer(("127.0.0.1",0),SimpleHTTPRequestHandler); print(s.server_port,flush=True); s.serve_forever()'],{windowsHide:true,stdio:['ignore','pipe','ignore']});let browser;
 try{
  const port=await new Promise(r=>server.stdout.once('data',d=>r(Number(String(d).trim()))));browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server']});
  const page=await browser.newPage({viewport:{width:1200,height:900}}),errors=[],missing=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()===404&&!r.url().includes('/api/'))missing.push(r.url());});
  await page.addInitScript(()=>requestAnimationFrame=()=>0);await require('./test-account.cjs')(page);await page.goto('http://127.0.0.1:'+port,{waitUntil:'networkidle'});
  await page.evaluate(async()=>{
   window.motionArt={backs:[],buffs:[]};for(const [key,folder,count]of [['backs','PhapBao',12],['buffs','BuffThuan',7]])for(let n=1;n<=count;n++){const img=new Image();img.src='Item/'+folder+'/'+n+'.png';await img.decode();motionArt[key].push(img);}
  });
  const summary=await page.evaluate(()=>{
   const c=document.createElement('canvas');c.width=c.height=300;const ctx=c.getContext('2d',{willReadFrequently:true});
   const pixels=()=>ctx.getImageData(0,0,300,300).data;
   const hash=()=>{let hash=2166136261,ink=0;const p=pixels();for(let n=0;n<p.length;n+=4){hash=Math.imul(hash^p[n],16777619);hash=Math.imul(hash^p[n+3],16777619);if(p[n+3])ink++;}return{hash:hash>>>0,ink};};
   const backs=[];for(const image of motionArt.backs){
    const m=equipmentMotion.mount(image,150,180,1,1),side=equipmentMotion.mount(image,150,180,2,-1);
    if(m.y!==156||side.x!==158||m.height>72)throw Error('Mount must attach below the head at the spine');
    const frames=[];for(let n=0;n<20;n++){ctx.clearRect(0,0,300,300);equipmentMotion.drawBack(ctx,image,150,180,1,1,0,n/60+.5);frames.push(hash());}
    if(new Set(frames.map(f=>f.hash)).size<19||frames.some(f=>f.ink<250))throw Error('Static/missing back '+m.variant);
    if(ctx.getImageData(150,143,1,1).data[3]!==0)throw Error('Back mount covers the head');
    backs.push(m.variant);
   }
   for(let n=0;n<7;n++){
    const frames=[];for(let j=0;j<20;j++){ctx.clearRect(0,0,300,300);for(const front of [false,true])equipmentMotion.drawBuff(ctx,motionArt.buffs[n],150,180,n+1,front,j/60+.5,58);frames.push(hash().hash);}
    if(new Set(frames).size<19)throw Error('Static shield '+n);
   }
   ctx.clearRect(0,0,300,300);equipmentMotion.drawBuff(ctx,motionArt.buffs[0],150,180,1,false,1,0);if(hash().ink)throw Error('Expired buff still visible');
   ctx.clearRect(0,0,300,300);equipmentMotion.drawBack(ctx,motionArt.backs[0],150,180,1,1,0,1.1);const a=hash();equipmentMotion.drawBack(ctx,motionArt.backs[0],150,180,1,1,0,.2);ctx.clearRect(0,0,300,300);equipmentMotion.drawBack(ctx,motionArt.backs[0],150,180,1,1,0,1.1);if(a.hash!==hash().hash)throw Error('Equipment depends on frame history');
   window.renderEquipmentProof=t=>{
    let proof=document.getElementById('equipment-proof');if(!proof){proof=document.createElement('canvas');proof.id='equipment-proof';proof.width=1200;proof.height=900;proof.style.cssText='position:fixed;inset:0;z-index:99999;width:1200px;height:900px';document.body.append(proof);}
    const g=proof.getContext('2d');g.fillStyle='#26353e';g.fillRect(0,0,1200,900);tm=t;
    const backIds=equipmentRules.backs.map(i=>i.id);
    for(let row=0;row<4;row++)for(let sect=0;sect<4;sect++){
     const index=row*4+sect,dir=row%2?0:1,gender=row<2?'Nam':'Nu',ap={w:sect,gender,backId:backIds[index%12],weaponId:'test-weapon',shieldId:'shield-'+(index%7+1),shieldState:{activeUntil:Date.now()/1000+58,buff:index%7+1}};
     g.save();g.translate(150+sect*300,180+row*220);g.scale(2.4,2.4);drawChar(g,0,0,dir,1,false,0,false,ap);g.restore();
     g.font='14px Arial';g.textAlign='center';g.fillStyle='#d6e5e8';g.fillText(['Kiếm','Liềm','Thương','Quạt'][sect]+' · '+gender+' · '+(dir?'sau':'trước'),150+sect*300,210+row*220);
    }
   };renderEquipmentProof(1);
   return{backs:backs.length,buffs:7,frames:380};
  });
  // EquipmentImage lazily loads each equipped variant used by the real renderer.
  await page.waitForTimeout(1000);await page.evaluate(()=>renderEquipmentProof(1.3));await page.screenshot({path:path.join(__dirname,'artifacts/equipment-animation-poses.png')});
  const video=await page.evaluate(async()=>{
   const stream=document.getElementById('equipment-proof').captureStream(30),recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9'}),chunks=[];recorder.ondataavailable=e=>chunks.push(e.data);const done=new Promise(r=>recorder.onstop=r);recorder.start();
   const start=performance.now();await new Promise(resolve=>{const tick=()=>{const t=(performance.now()-start)/1000;renderEquipmentProof(t+1);if(t>=3)resolve();else setTimeout(tick,1000/30);};tick();});recorder.stop();await done;stream.getTracks().forEach(t=>t.stop());let bytes='';for(const byte of new Uint8Array(await new Blob(chunks).arrayBuffer()))bytes+=String.fromCharCode(byte);return btoa(bytes);
  });
  fs.writeFileSync(path.join(__dirname,'artifacts/equipment-animation-preview.webm'),Buffer.from(video,'base64'));
  await page.emulateMedia({reducedMotion:'reduce'});assert(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=200;const g=c.getContext('2d');equipmentMotion.drawBack(g,motionArt.backs[4],100,120,1,1,0,.2);const a=c.toDataURL();g.clearRect(0,0,200,200);equipmentMotion.drawBack(g,motionArt.backs[4],100,120,1,1,0,2);return a===c.toDataURL();}));
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);console.log('PASS spine mounts, all backs/buffs continuous and deterministic, expiry, reduced motion, real character poses; '+JSON.stringify(summary));
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
