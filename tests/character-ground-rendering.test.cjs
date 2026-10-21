/* Complete rear poses and equipped formations: real browser rendering, no DB writes. */
const assert=require('node:assert/strict'),os=require('node:os'),path=require('node:path'),{spawn}=require('node:child_process');
const {chromium}=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async()=>{
 const server=spawn('python',['-u','-c','from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer; s=ThreadingHTTPServer(("127.0.0.1",0),SimpleHTTPRequestHandler);print(s.server_port,flush=True);s.serve_forever()'],{windowsHide:true,stdio:['ignore','pipe','ignore']});let browser;
 try{
  const port=await new Promise(r=>server.stdout.once('data',d=>r(Number(String(d).trim()))));
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server']});
  const page=await browser.newPage({viewport:{width:1540,height:1300}}),errors=[],missing=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()===404&&!r.url().includes('/api/'))missing.push(r.url());});
  await page.addInitScript(()=>requestAnimationFrame=()=>0);await require('./test-account.cjs')(page);
  await page.goto(process.env.TIENLO_RENDER_URL||'http://127.0.0.1:'+port,{waitUntil:'load'});
  await page.evaluate(()=>{
   for(const gender of ['Nam','Nu'])for(let w=0;w<4;w++)characterMasks.load({w,gender});
   for(const item of equipmentRules.formations)equipmentSystem.formationImage({formationId:item.id});
  });
  await page.waitForFunction(()=>['Nam','Nu'].every(gender=>[0,1,2,3].every(w=>characterMasks.load({w,gender}).image&&characterMasks.loadRear({w,gender}).image))&&equipmentRules.formations.every(item=>{const i=equipmentSystem.formationImage({formationId:item.id});return i?.complete&&i.naturalWidth;}),null,{polling:100});
  const audit=await page.evaluate(()=>{
   const c=document.createElement('canvas');c.width=c.height=400;const ctx=c.getContext('2d',{willReadFrequently:true});
   const hash=()=>{let value=2166136261,ink=0;const data=ctx.getImageData(0,0,400,400).data;for(let i=0;i<data.length;i+=4){value=Math.imul(value^data[i],16777619);value=Math.imul(value^data[i+3],16777619);if(data[i+3])ink++;}return{value:value>>>0,ink};};
   const bare=(w,gender)=>({w,gender,face:4,realm:0,maskId:null,robeId:null,backId:null,formationId:null,weaponId:null,shieldId:null,ringId:null,trailId:null});
   let bodies=0,formations=0;const render=renderArtwork,directions=[['truoc',0,1],['trai',2,-1],['phai',2,1],['sau',1,1]];
   try{
    for(const gender of ['Nam','Nu'])for(let w=0;w<4;w++)for(const [direction,dir,facing]of directions){
     const ap=bare(w,gender),frame=characterMasks.frameFor(ap,direction),height=w===2&&gender==='Nam'?52.5:42,calls=[];
     window.renderArtwork=(g,image,x,y,width,height)=>{calls.push({image,x,y,width,height});return render(g,image,x,y,width,height);};
     ctx.resetTransform();ctx.clearRect(0,0,400,400);ctx.setTransform(4,0,0,4,200,300);drawChar(ctx,0,0,dir,facing,false,0,false,ap);
     const body=calls.find(call=>call.image===frame.image);if(!body||hash().ink<2000)throw Error('Missing complete body '+gender+w+direction);
     const scale=body.height/frame.height;
     if(Math.abs(body.x+frame.anchor[0]*scale*frame.pixelAspect)>1e-7||Math.abs(body.y+frame.anchor[1]*scale)>0.41||Math.abs(frame.anchor[1]*scale-height)>1e-7)throw Error('Rear/front size or feet mismatch '+gender+w+direction);
     if(calls.length!==1)throw Error('An unequipped character must have no formation');bodies++;
     for(const item of equipmentRules.formations){
      ap.formationId=item.id;calls.length=0;ctx.resetTransform();ctx.clearRect(0,0,400,400);ctx.setTransform(3,0,0,3,200,280);drawChar(ctx,0,0,dir,facing,false,0,false,ap);
      if(calls[0]?.image!==equipmentSystem.formationImage(ap)||calls.findIndex(call=>call.image===frame.image)<1)throw Error('Formation missing or painted over body '+item.id+gender+w+direction);
      formations++;
     }
    }
   }finally{window.renderArtwork=render;}
   const appearances=new Set();
   for(const item of equipmentRules.formations){ctx.resetTransform();ctx.clearRect(0,0,400,400);ctx.setTransform(3,0,0,3,200,200);equipmentSystem.drawFormation(ctx,0,0,{formationId:item.id});const sample=hash();if(sample.ink<1000)throw Error('Empty formation '+item.id);appearances.add(sample.value);}
   if(appearances.size!==7)throw Error('Distinct formation art was replaced by a generic circle');
   const savedAp=P.ap,savedWorld=P.world;P.ap=bare(0,'Nam');P.world={equip:{},bag:[]};
   try{for(const item of equipmentRules.formations){P.world.equip.phaptran=item;if(equipmentSystem.formationImage(P.ap)!==equipmentSystem.formationImage({formationId:item.id}))throw Error('Local/remote formation mismatch');}P.world.equip.phaptran=null;if(equipmentSystem.formationImage(P.ap)!==null)throw Error('Unequip must remove formation');}finally{P.ap=savedAp;P.world=savedWorld;}
   ctx.resetTransform();ctx.clearRect(0,0,400,400);equipmentSystem.drawFormation(ctx,200,200,{formationId:null});if(hash().ink)throw Error('Formation remained after unequip');
   return{bodies,formations,distinct:appearances.size,rearAtlases:characterMasks.rearAtlasCount};
  });
  assert.deepEqual(audit,{bodies:32,formations:224,distinct:7,rearAtlases:2});
  for(const kind of ['directions','formations']){
   await page.evaluate(kind=>{
    document.getElementById('ground-proof')?.remove();const c=document.createElement('canvas');c.id='ground-proof';c.width=1540;c.height=1300;c.style.cssText='position:fixed;inset:0;width:1540px;height:1300px;z-index:999999';document.body.append(c);const ctx=c.getContext('2d');ctx.fillStyle='#263540';ctx.fillRect(0,0,1540,1300);
    const directions=[[0,1,'Trước'],[2,-1,'Trái'],[2,1,'Phải'],[1,1,'Sau']],columns=kind==='directions'?4:7,cell=1540/columns;
    for(let row=0;row<8;row++)for(let col=0;col<columns;col++){
     const w=row%4,gender=row<4?'Nam':'Nu',[dir,facing,label]=kind==='directions'?directions[col]:[1,1,equipmentRules.formations[col].name];
     const ap={w,gender,face:4,realm:0,maskId:null,robeId:null,backId:null,formationId:kind==='formations'?equipmentRules.formations[col].id:null,weaponId:null,shieldId:null,ringId:null,trailId:null},x=(col+.5)*cell,y=128+row*161;
     ctx.save();ctx.translate(x,y);ctx.scale(2.55,2.55);drawChar(ctx,0,0,dir,facing,false,0,false,ap);ctx.restore();ctx.fillStyle='#dedcc7';ctx.font='12px Arial';ctx.textAlign='center';ctx.fillText(characterClasses[w].name+' '+gender+' · '+label,x,y+29,cell-8);
    }
   },kind);
   await page.locator('#ground-proof').screenshot({path:path.join(__dirname,'artifacts/character-'+kind+'-fixed.png')});
  }
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);console.log('PASS '+JSON.stringify(audit)+'; consistent full rear sprites, anchored feet, all 7 shared formations below 32 body poses, local/remote, empty/equipped/unequipped rendering.');
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
