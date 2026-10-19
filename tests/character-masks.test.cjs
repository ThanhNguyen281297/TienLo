/* Real accounts: all masks, appearance, restore, gender rules and phone HUD. */
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawn}=require('node:child_process');
const {chromium}=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'tienlo-masks-')),server=spawn('python',['-u','-c','import server; from functools import partial; server.init_db(); s=server.GameServer(("127.0.0.1",0),partial(server.GameHandler,directory=str(server.ROOT))); print(s.server_port,flush=True); s.serve_forever()'],{windowsHide:true,env:{...process.env,TIENLO_DB:path.join(temp,'test.sqlite3'),TIENLO_QUIET:'1'},stdio:['ignore','pipe','pipe']});let browser;
 try{
  const port=await new Promise((resolve,reject)=>{server.stdout.once('data',d=>resolve(Number(String(d).trim())));server.once('exit',()=>reject(Error('Server stopped')));});
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server']});
  const errors=[],missing=[];let proofPage;
  for(const gender of ['Nam','Nu']){
   const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();proofPage=page;
   page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()===404)missing.push(r.url());});
   await page.addInitScript(()=>requestAnimationFrame=()=>0);
   await page.goto('http://127.0.0.1:'+port,{waitUntil:'load'});await page.locator('[data-mode=register]').click();await page.locator('#account-name').fill('mask_'+gender.toLowerCase());await page.locator('#account-password').fill('test-password-123');await page.locator('.account-submit').click();await page.waitForFunction(()=>account.state.ready,null,{polling:50});
   await page.locator('.gender-choice button').nth(gender==='Nu'?1:0).click();await page.locator('#nm').fill('Mat Na '+gender);await page.locator('#ok').click();await page.waitForFunction(()=>P.ap,null,{polling:50});
   assert.equal(await page.evaluate(()=>P.world.bag.length),0);assert.equal(await page.evaluate(()=>Object.values(P.world.equip).filter(Boolean).length),0);
   await page.evaluate(()=>{P.world.tutorial=true;worldMap.travel('hub');E=[];gmTest.enabled=true;hud();});
   await page.waitForFunction(()=>{characterMasks.refreshAvatar(true);return $('player-avatar').getContext('2d').getImageData(64,64,1,1).data[3]>0;},null,{polling:50});
   await page.waitForTimeout(100);await page.evaluate(()=>characterMasks.refreshAvatar(true));const original=await page.locator('#player-avatar').evaluate(c=>{window.avatarBaseline=Array.from(c.getContext('2d').getImageData(0,0,128,128).data);return c.toDataURL();});await page.locator('#player-avatar').screenshot({path:path.join(__dirname,'artifacts/masks-avatar-original-'+gender+'.png')});
   const hashes=[];
   for(let i=1;i<=10;i++){
    const id='mask-'+gender.toLowerCase()+'-'+i;
    await page.evaluate(id=>{gmEquipment.take(id,true);worldMap.dialog.close();hud();},id);
    await page.waitForFunction(id=>!!characterMasks.load(equipmentData.byId.get(id).art).image,id,{polling:50});
    await page.evaluate(()=>characterMasks.refreshAvatar(true));
    assert.equal(await page.locator('#player-avatar').getAttribute('data-mask-id'),id);
    const hash=await page.locator('#player-avatar').evaluate(c=>c.toDataURL());assert.notEqual(hash,original);hashes.push(hash);
    assert.equal(await page.evaluate(()=>P.world.equip.matna.id),id);
   }
   assert.equal(new Set(hashes).size,10);
   const rejected=await page.evaluate(gender=>{const before=JSON.stringify(P.world),other=gender==='Nam'?'nu':'nam';gmEquipment.take('mask-'+other+'-1',true);return before===JSON.stringify(P.world);},gender);assert(rejected,'GM must reject wrong gender before granting an item');
   await page.evaluate(gender=>{const item=inventory.addItem('mask-'+(gender==='Nam'?'nu':'nam')+'-1');inventory.equipItem(item.uid);},gender);
   assert.equal(await page.evaluate(()=>P.world.equip.matna.gender),gender);
   await page.evaluate(()=>{inventory.unequip('matna');worldMap.dialog.close();});await page.locator('#player-avatar').screenshot({path:path.join(__dirname,'artifacts/masks-avatar-removed-'+gender+'.png')});assert(await page.locator('#player-avatar').evaluate(c=>{const a=c.getContext('2d').getImageData(0,0,128,128).data;return !c.dataset.maskId&&a.reduce((n,v,i)=>n+Math.abs(v-avatarBaseline[i]),0)/a.length<3;}),'Unequip must restore original portrait '+gender);
   // Actual drag/drop into the slot, not just the GM shortcut.
   await page.evaluate(gender=>{inventory.openBag();const item=P.world.bag.find(i=>i.id==='mask-'+gender.toLowerCase()+'-4'),dt=new DataTransfer();dt.setData('text/plain',item.uid);document.querySelector('[data-equip-slot=matna]').dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt}));},gender);
   assert.equal(await page.evaluate(()=>P.world.equip.matna.variant),4);
   assert(await page.evaluate(()=>account.flush()));await page.reload({waitUntil:'load'});await page.waitForFunction(()=>account.state.ready&&P.ap,null,{polling:50});
   assert.equal(await page.evaluate(()=>P.world.equip.matna.id),'mask-'+gender.toLowerCase()+'-4');
   await page.waitForFunction(()=>!!characterMasks.load(P.world.equip.matna.art).image,null,{polling:50});await page.evaluate(()=>{hud();gmTest.enabled=true;gmEquipment.open();});
   await page.getByRole('combobox',{name:'Lọc ô trang bị GM'}).selectOption('matna');assert.equal(await page.locator('[data-gm-item]').count(),20);
   assert(await page.locator('[data-gm-item="mask-'+(gender==='Nam'?'nu':'nam')+'-1"]').getByRole('button',{name:'Mặc thử'}).isDisabled());
   await page.evaluate(()=>{worldMap.dialog.close();hud();dr();});await page.screenshot({path:path.join(__dirname,'artifacts/masks-hud-'+gender+'.png')});
   for(const size of [{width:390,height:844},{width:568,height:320}]){
    await page.setViewportSize(size);await page.evaluate(()=>{rs();hud();dr();});
    assert(await page.locator('#player-avatar').evaluate(c=>{const a=c.getBoundingClientRect(),h=$('hud').getBoundingClientRect();return a.x>=h.x&&a.y>=h.y&&a.right<=h.right&&a.bottom<=h.bottom&&h.right<=innerWidth;}));
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:path.join(__dirname,'artifacts/masks-hud-'+gender+'-'+size.width+'.png')});
   }
   // Load all masks once to inspect real body poses with remote appearances.
   await page.evaluate(()=>equipmentRules.masks.forEach(m=>characterMasks.load(m.art)));
   await page.waitForFunction(()=>equipmentRules.masks.every(m=>characterMasks.load(m.art).image),null,{polling:50});
   const audit=await page.evaluate(()=>{
    const c=document.createElement('canvas');c.width=240;c.height=280;const ctx=c.getContext('2d',{willReadFrequently:true});
    const pixels=(ap,dir,f)=>{ctx.resetTransform();ctx.clearRect(0,0,240,280);ctx.setTransform(4,0,0,4,120,240);drawChar(ctx,0,0,dir,f,false,0,false,ap);return ctx.getImageData(0,0,240,280).data;};
    let cases=0;
    for(const m of equipmentRules.masks)for(let w=0;w<4;w++)for(const [dir,f]of [[0,1],[2,-1],[2,1],[1,1]]){
     const ap={w,gender:m.gender,realm:0,maskId:null,backId:null,formationId:null,shieldId:null,ringId:null,trailId:null,weaponId:null};
     pixels(ap,dir,f);const before=pixels(ap,dir,f);ap.maskId=m.id;const after=pixels(ap,dir,f);
     let changes=0,lower=0;for(let n=0;n<before.length;n++){if(before[n]!==after[n]){changes++;if(n>=240*190*4)lower++;}}
     if(dir===1?changes!==0:changes<50)throw Error('Face missing/rear face shown '+m.id+' class '+w+' dir '+dir+' '+changes);
     if(lower)throw Error('Mask changed lower outfit '+m.id+' class '+w+' dir '+dir+' facing '+f+' '+lower);
     cases++;
    }
    return cases;
   });assert.equal(audit,320);
  }
  await proofPage.setViewportSize({width:1600,height:1290});
  await proofPage.evaluate(()=>{
   const c=document.createElement('canvas');c.id='mask-proof';c.width=1600;c.height=1290;c.style.cssText='position:fixed;inset:0;width:1600px;height:1290px;z-index:99999';document.body.append(c);const ctx=c.getContext('2d');ctx.fillStyle='#273e47';ctx.fillRect(0,0,c.width,c.height);
   for(let row=0;row<5;row++)for(let col=0;col<8;col++){
    const gender=col<4?'Nam':'Nu',w=col%4,variant=row<3?8:4,ap={w,gender,realm:0,maskId:row===0?null:'mask-'+gender.toLowerCase()+'-'+variant,backId:null,formationId:null,shieldId:null,ringId:null,trailId:null,weaponId:null},x=100+col*200,y=215+row*250;
    ctx.save();ctx.translate(x,y);ctx.scale(4,4);drawChar(ctx,0,0,row===2||row===3?2:row===4?1:0,row===2?-1:1,false,0,false,ap);ctx.restore();ctx.fillStyle='#e9d9ac';ctx.font='13px Arial';ctx.textAlign='center';ctx.fillText(characterClasses[w].name+' · '+gender,x,y+20);ctx.fillText(['Mặt gốc','Mặt nạ 8 · trước','Mặt nạ 8 · trái','Mặt nạ 4 · phải','Quay lưng'][row],x,y+39);
   }
  });await proofPage.screenshot({path:path.join(__dirname,'artifacts/masks-all-classes.png')});
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);console.log('PASS 20 masks, 320 class/gender/direction renders, unchanged outfits/rear views, HUD wear/remove, gender validation, GM, drag/drop, DB restore and phone HUD');
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
