const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawn}=require('node:child_process');
const {chromium}=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'tienlo-outfits-')),server=spawn('python',['-u','-c','import server; from functools import partial; server.init_db(); s=server.GameServer(("127.0.0.1",0),partial(server.GameHandler,directory=str(server.ROOT))); print(s.server_port,flush=True); s.serve_forever()'],{windowsHide:true,env:{...process.env,TIENLO_DB:path.join(temp,'test.sqlite3'),TIENLO_QUIET:'1'},stdio:['ignore','pipe','ignore']});let browser;
 try{
 const port=await new Promise((r,j)=>{server.stdout.once('data',d=>r(Number(String(d).trim())));server.once('exit',()=>j(Error('Server stopped')));});
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server']});const errors=[],missing=[],pages=[];
 for(let w=0;w<4;w++){
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();pages.push(page);
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()===404)missing.push(r.url());});await page.addInitScript(()=>requestAnimationFrame=()=>0);
  await page.goto('http://127.0.0.1:'+port,{waitUntil:'load'});await page.locator('[data-mode=register]').click();await page.locator('#account-name').fill('outfit_'+w);await page.locator('#account-password').fill('test-password-123');await page.locator('.account-submit').click();await page.waitForFunction(()=>account.state.ready,null,{polling:50});
  await page.locator('.sect-choice').nth(w).click();await page.locator('.gender-choice button').nth(w%2).click();await page.locator('[data-face="'+(w+3)+'"]').click();
  const color=['xich-diem','han-suong','bach-nguyet','huyen-da'][w];await page.locator('[data-outfit-style="'+color+'"]').click();
  assert.equal(await page.locator('.face-options button').count(),10);assert.equal(await page.locator('.color-options button').count(),6);
  await page.waitForFunction(()=>!!characterMasks.frameFor(tp,'truoc'),null,{polling:50});await page.evaluate(()=>previewCharacter());
  if(w===0){await page.screenshot({path:path.join(__dirname,'artifacts/outfit-creator-desktop.png')});for(const size of [{width:390,height:844},{width:844,height:390}]){await page.setViewportSize(size);await page.evaluate(()=>previewCharacter());assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(__dirname,'artifacts/outfit-creator-'+size.width+'.png')});}await page.setViewportSize({width:1440,height:1000});}
  await page.locator('#nm').fill('Dao Huu '+w);await page.locator('#ok').click();await page.waitForFunction(()=>P.ap&&P.world?.starterOutfit,null,{polling:50});
  assert.deepEqual(await page.evaluate(()=>({face:P.ap.face,style:P.ap.outfitStyle,bag:P.world.bag.length,slots:Object.entries(P.world.equip).filter(([,v])=>v).map(([k])=>k).sort(),actual:characterWardrobe.styleOf(P.ap)})),{face:w+3,style:color,bag:0,slots:['chan','daobao','giay'],actual:color});
  assert(await page.evaluate(()=>account.flush()));await page.reload({waitUntil:'load'});await page.waitForFunction(()=>account.state.ready&&P.ap,null,{polling:50});assert.equal(await page.evaluate(()=>P.ap.face),w+3);assert.equal(await page.evaluate(()=>characterWardrobe.styleOf(P.ap)),color);
  await page.evaluate(()=>{P.world.tutorial=true;worldMap.switchScene('hub');hud();});assert(await page.evaluate(()=>account.flush()));
 }
 const page=pages[0];await page.evaluate(()=>{for(const gender of ['Nam','Nu'])for(let w=0;w<4;w++)characterMasks.load({w,gender});});await page.waitForFunction(()=>['Nam','Nu'].every(gender=>[0,1,2,3].every(w=>characterMasks.load({w,gender}).image&&characterMasks.loadRear({w,gender}).image)),null,{polling:50});
 const audit=await page.evaluate(()=>{
  let poses=0,changed=0,heads=0;const dirs=['truoc','trai','phai','sau'];
  for(const gender of ['Nam','Nu'])for(let w=0;w<4;w++)for(const direction of dirs){
   const ap={w,gender,face:4,maskId:null,robeId:null},base=characterMasks.frameFor(ap,direction),a=base.image.getContext('2d').getImageData(0,0,base.width,base.height).data;
   for(const style of characterWardrobe.styles){ap.robeId='outfit-'+style.id+'-daobao-class-'+w;const f=characterMasks.frameFor(ap,direction),b=f.image.getContext('2d').getImageData(0,0,f.width,f.height).data;let diff=0;
    for(let i=0;i<a.length;i+=4){if(a[i+3]!==b[i+3])throw Error('Palette changed silhouette');if(i<base.width*Math.floor(base.height*.5)*4){for(let c=0;c<4;c++)if(a[i+c]!==b[i+c])throw Error('Palette changed face/head');heads++;}else if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2])diff++;}
    if(diff<30)throw Error('No clothing change '+gender+' '+w+' '+direction+' '+style.id+' '+diff);changed+=diff;poses++;
   }
  }
  const c=document.createElement('canvas');c.width=c.height=300;const ctx=c.getContext('2d',{willReadFrequently:true});const ap={w:0,gender:'Nam',face:4,robeId:null,maskId:null,backId:null,formationId:null,weaponId:null,shieldId:null,ringId:null,trailId:null};
  drawChar(ctx,150,220,0,1,false,0,false,ap);const plain=ctx.getImageData(0,0,300,300).data;ctx.clearRect(0,0,300,300);ap.backId='back-class-0';drawChar(ctx,150,220,0,1,false,0,false,ap);const data=ctx.getImageData(0,0,300,300).data;
  const ornamentChanges=plain.reduce((n,v,i)=>n+(v!==data[i]),0),error=plain.reduce((n,v,i)=>n+Math.abs(v-data[i]),0);if(error>30)throw Error('Hidden ornaments still rendered '+JSON.stringify({ornamentChanges,error}));
  if(equipmentSystem.backImage(ap)!==null||equipmentSystem.formationImage(ap)!==null)throw Error('Hidden ornaments exposed');
  if(characterMasks.cacheSize>characterMasks.frameLimit)throw Error('Unbounded costume cache');
  return{poses,changed,heads,items:equipmentRules.classGear.filter(t=>t.id.startsWith("outfit-")).length,cache:characterMasks.cacheSize};
 });assert.equal(audit.poses,160);assert.equal(audit.items,60);
 // A robe controls the outfit even if boots/belt come from other colors.
 await page.evaluate(()=>{gmTest.enabled=true;gmEquipment.take('outfit-thanh-truc-daobao-class-0',true);worldMap.dialog.close();});assert.equal(await page.evaluate(()=>characterWardrobe.styleOf(P.ap)),'thanh-truc');assert.equal(await page.evaluate(()=>P.world.equip.giay.outfitStyle),'xich-diem');
 await page.evaluate(()=>{inventory.unequip('daobao');worldMap.dialog.close();});assert.equal(await page.evaluate(()=>characterWardrobe.styleOf(P.ap)),'class');assert.equal(await page.evaluate(()=>characterMasks.faceFor(P.ap).variant),3);
 await page.evaluate(()=>{gmEquipment.take('mask-nam-9',true);worldMap.dialog.close();});assert.equal(await page.evaluate(()=>characterMasks.faceFor(P.ap).variant),9);await page.evaluate(()=>{inventory.unequip('matna');worldMap.dialog.close();});assert.equal(await page.evaluate(()=>characterMasks.faceFor(P.ap).variant),3);
 await page.evaluate(()=>{worldMap.dialog.close();const c=document.createElement('canvas');c.id='outfits-proof';c.width=1500;c.height=1260;c.style.cssText='position:fixed;inset:0;width:1500px;height:1260px;z-index:99999';document.body.append(c);const ctx=c.getContext('2d');ctx.fillStyle='#243640';ctx.fillRect(0,0,1500,1260);
 for(let row=0;row<8;row++)for(let col=0;col<6;col++){const w=row%4,gender=row<4?'Nam':'Nu',style=col?characterWardrobe.styles[col-1]:null,ap={w,gender,face:4,maskId:null,robeId:style?'outfit-'+style.id+'-daobao-class-'+w:null,backId:null,formationId:null,weaponId:null,shieldId:null,trailId:null},x=125+col*250,y=140+row*155;ctx.save();ctx.translate(x,y);ctx.scale(2.7,2.7);drawChar(ctx,0,0,0,1,false,0,false,ap);ctx.restore();ctx.fillStyle='#dfdabd';ctx.textAlign='center';ctx.font='11px Arial';ctx.fillText(characterClasses[w].name+' '+gender+' · '+(style?.name||'Tông môn'),x,y+14);}});await page.setViewportSize({width:1500,height:1260});await page.screenshot({path:path.join(__dirname,'artifacts/outfits-all-classes.png')});
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);console.log('PASS creator faces/colors, four real accounts, correct starter clothing/SQLite, 160 colored poses with unchanged heads/alpha, robe priority, mask removal restores selected face, hidden back equipment, equipped-only formations, bounded cache, mobile layouts; '+JSON.stringify(audit));
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
