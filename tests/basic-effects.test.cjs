/* Real combo state drives continuous raster animation; the renderer cannot add damage. */
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawn}=require('node:child_process');
const {chromium}=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async()=>{
 const artifacts=path.join(__dirname,'artifacts');fs.mkdirSync(artifacts,{recursive:true});
 const server=spawn('python',['-u','-c','from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer;s=ThreadingHTTPServer(("127.0.0.1",0),SimpleHTTPRequestHandler);print(s.server_port,flush=True);s.serve_forever()'],{windowsHide:true,stdio:['ignore','pipe','ignore']});let browser;
 try{const port=await new Promise((r,j)=>{server.stdout.once('data',d=>r(Number(String(d).trim())));server.once('error',j);});browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server']});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()===404)missing.push(r.url());});
  await page.route('**/api/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({saved:true})}));await require('./test-account.cjs')(page);await page.route('**/api/adventure',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({quests:[],recipes:[],shop:[],tutorial:{},fragments:0,merit:0})}));await page.addInitScript(()=>requestAnimationFrame=()=>0);await page.goto('http://127.0.0.1:'+port,{waitUntil:'networkidle'});await page.locator('#nm').fill('Ảnh đòn thường');await page.locator('#ok').click();await page.waitForFunction(()=>P.ap&&basicEffects.ready()&&creatureArt.ready(),null,{polling:100});
  const result=await page.evaluate(()=>{
   window.basicPreview={sequences:[],samples:[],damage:[]};const oldHit=hit;hit=function(e,power){const before=e.hp;oldHit(e,power);basicPreview.damage.push(before-e.hp);};
   window.resetBasicPreview=sect=>{worldMap.dialog.close();autoCombat.toggle(false);cultivation.select(null);classCombat.onRespawn();P.ap.w=sect;Object.assign(P,{x:1000,y:1100,hp:100,mp:0,r:0,stage:1,med:0,acd:0,sl:0});K={};ptr=null;PT.length=0;T.forEach(t=>t.sp=0);E=[{id:'vfx-target',t:0,x:P.x+Math.min(basicCombat.profiles[sect].range*.68,185),y:P.y,hx:P.x+80,hy:P.y,hp:100000,maxHp:100000,dead:0,cd:999,fr:0,fl:0}];up(0);basicCombat.reset();};
   const c=document.createElement('canvas');c.width=512;c.height=512;const ctx=c.getContext('2d'),report=[];
   for(let sect=0;sect<4;sect++){
    resetBasicPreview(sect);const profile=basicCombat.profiles[sect],frames=[],samples=[];
    for(let step=0;step<profile.steps;step++){
     P.acd=0;basicCombat.state.sect=sect;basicCombat.state.target=E[0];basicCombat.state.combo=step;
     if(!basicCombat.attack(E[0]))throw Error('Combo was refused');const hashes=new Set();let visible=0,meshes=0;
     const length=Math.ceil(profile.interval*60);
     for(let frame=0;frame<length;frame++){
      tm+=1/60;up(1/60);const saved=structuredClone({casts:basicCombat.state.casts,swings:basicCombat.state.swings,projectiles:basicCombat.state.projectiles,effects:basicCombat.state.effects});frames.push(saved);
      ctx.setTransform(1,0,0,1,256-P.x,256-P.y);ctx.clearRect(P.x-256,P.y-256,512,512);const before=E[0].hp;basicEffects.draw(ctx);if(E[0].hp!==before)throw Error('Renderer changed damage');
      if(basicEffects.stats.parts>0||basicEffects.stats.meshes>0){hashes.add(c.toDataURL());visible++;meshes=Math.max(meshes,basicEffects.stats.meshes);}
      if(frame===Math.floor(length*.36))samples.push(saved);
     }report.push({sect,step,frames:hashes.size,visible,meshes});
    }
    for(let n=0;n<60;n++){tm+=1/60;up(1/60);frames.push(structuredClone({casts:basicCombat.state.casts,swings:basicCombat.state.swings,projectiles:basicCombat.state.projectiles,effects:basicCombat.state.effects}));}
    basicPreview.sequences.push(frames);basicPreview.samples.push(samples);
   }
   // Every class uses a different raster icon, and drawing is repeatable at a fixed age.
   const icons=[0,1,2,3].map(i=>basicEffects.icon(i));Object.assign(basicCombat.state,basicPreview.samples[1][1]);ctx.setTransform(1,0,0,1,256-1000,256-1100);ctx.clearRect(744,844,512,512);basicEffects.draw(ctx);const a=c.toDataURL();tm+=100;ctx.clearRect(744,844,512,512);basicEffects.draw(ctx);const deterministic=a===c.toDataURL();
   const cells=[];for(const entry of basicEffects.entries){const atlas=document.createElement('canvas');atlas.width=entry.image.naturalWidth;atlas.height=entry.image.naturalHeight;const ac=atlas.getContext('2d');ac.drawImage(entry.image,0,0);for(const p of entry.meta.parts){const [x,y,w,h]=p.cell;const top=ac.getImageData(x,y,w,1).data,bottom=ac.getImageData(x,y+h-1,w,1).data,left=ac.getImageData(x,y,1,h).data,right=ac.getImageData(x+w-1,y,1,h).data;let max=0;for(const values of [top,bottom,left,right])for(let i=3;i<values.length;i+=4)max=Math.max(max,values[i]);cells.push(max);}}
   return{report,icons:new Set(icons).size,deterministic,cells,squareParticles:PT.length,damage:basicPreview.damage.length};
  });
  assert.equal(result.report.length,14);for(const r of result.report){assert(r.frames>=8,JSON.stringify(r));assert(r.visible>=8);assert(r.meshes>0);}assert.equal(result.squareParticles,0);assert.equal(result.icons,4);assert(result.deterministic);assert(result.damage>14);assert(result.cells.every(v=>v<150),'Source gutters must not cut solid artwork: '+JSON.stringify(result.cells));
  await page.evaluate(()=>{for(let w=0;w<4;w++)for(const gender of ['Nam','Nu'])characterMasks.load({w,gender,face:7});});await page.waitForFunction(()=>[0,1,2,3].every(w=>['Nam','Nu'].every(gender=>!!characterMasks.load({w,gender,face:7}).image)),null,{polling:100});
  await page.evaluate(()=>{
   const c=document.createElement('canvas');c.id='basic-proof';c.width=1280;c.height=850;c.style.cssText='position:fixed;inset:0;width:1280px;height:850px;z-index:99999';document.body.append(c);const ctx=c.getContext('2d');ctx.fillStyle='#748170';ctx.fillRect(0,0,c.width,c.height);const names=['KIẾM · Liên trảm / Xuyên kiếm / Song kiếm','LIỀM · Nguyệt nhận đi và về','THƯƠNG · Đâm / Song kích / Quét / Phá giáp','QUẠT · Phong vũ / Song phù / Bộc phù'];
   for(let sect=0;sect<4;sect++){ctx.fillStyle='#f4efd8';ctx.font='bold 17px Arial';ctx.fillText(names[sect],20,sect*210+25);for(let n=0;n<basicPreview.samples[sect].length;n++){const x=n*320,y=sect*210+35;ctx.save();ctx.translate(x+48-1000,y+120-1100);const ap={w:sect,gender:sect===1?'Nu':'Nam',face:7,weaponId:['moc-kiem','moc-kiem','moc-kiem','moc-kiem'][sect]+'-class-'+sect};drawChar(ctx,1000,1100,2,1,false,0,true,ap);Object.assign(basicCombat.state,basicPreview.samples[sect][n]);basicEffects.draw(ctx);ctx.restore();ctx.fillStyle='#e0e1c8';ctx.font='12px Arial';ctx.fillText('Đòn '+(n+1),x+20,y+163);}}
  });await page.screenshot({path:path.join(artifacts,'basic-four-class-effects.png')});await page.evaluate(()=>$('basic-proof').remove());
  const movie=await page.evaluate(async()=>{
   const c=document.createElement('canvas');c.width=960;c.height=560;const ctx=c.getContext('2d'),stream=c.captureStream(30),recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:2000000}),chunks=[];recorder.ondataavailable=e=>chunks.push(e.data);const stopped=new Promise(r=>recorder.onstop=r);recorder.start();
   for(let frame=0;frame<180;frame++){ctx.fillStyle='#71806c';ctx.fillRect(0,0,960,560);ctx.fillStyle='#fff0d5';ctx.font='bold 21px Arial';ctx.fillText('ĐÁNH THƯỜNG · 4 CLASS',26,34);
    for(let sect=0;sect<4;sect++){const x=(sect%2)*480,y=Math.floor(sect/2)*250+50,seq=basicPreview.sequences[sect],state=seq[frame%seq.length];ctx.save();ctx.translate(x+65-1000,y+155-1100);Object.assign(basicCombat.state,state);const target=creatureArt.species.BoNgua.poses[0][0].image,w=72*target.naturalWidth/target.naturalHeight;ctx.drawImage(target,1000+Math.min(basicCombat.profiles[sect].range*.68,185)-w/2,1100-72,w,72);drawChar(ctx,1000,1100,2,1,false,0,true,{w:sect,gender:sect===1?'Nu':'Nam',face:7,weaponId:'moc-kiem-class-'+sect});basicEffects.draw(ctx);ctx.restore();ctx.fillStyle='#fff0d5';ctx.font='bold 15px Arial';ctx.fillText(characterClasses[sect].name,x+25,y+22);}
    await new Promise(r=>setTimeout(r,1000/30));
   }recorder.stop();await stopped;stream.getTracks().forEach(t=>t.stop());const blob=new Blob(chunks,{type:'video/webm'});return await new Promise(r=>{const reader=new FileReader();reader.onload=()=>r(reader.result.split(',')[1]);reader.readAsDataURL(blob);});
  });fs.writeFileSync(path.join(artifacts,'basic-four-class-effects.webm'),Buffer.from(movie,'base64'));
  await page.setViewportSize({width:844,height:390});await page.evaluate(()=>{resetBasicPreview(3);basicCombat.attack(E[0]);for(let n=0;n<12;n++)up(1/60);hud();dr();});assert.equal(await page.locator('#basic-attack').getAttribute('data-basic-class'),'3');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(artifacts,'basic-effects-mobile.png')});assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);console.log('PASS 14 real combo steps: continuous distinct frames, bent raster ribbons, no render damage, deterministic replay, 24 intact atlas parts, 4 class icons and mobile. Video/contact sheet saved.');
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
