/* Đảo tông môn (sân trung tâm, không có bãi quái) và Thiên Vân Thành. Quái chỉ ở Sơn Hà, Bí Cảnh, tháp và boss. */
(function(){
  const world=worldMap,dialog=world.dialog;
  world.customLayout=true;
  Object.assign(world.definitions,{moonCourt:[2,0,510/1086,375/1448,225/1086],moonDais:[2,375/1448,530/1086,270/1448,174/1086],stairs:[2,0,850/1086,200/1448,236/1086],bridgeRail:[2,8/1448,995/1086,20/1448,50/1086]});world.preloadSprites();
  const layouts={
    sword:{rx:420,ry:235,sky:'#172e31',light:'#82b9aa',hall:null,subtitle:'Thiên kiếm giữa biển mây',trees:'pineTree'},
    moon:{rx:430,ry:240,sky:'#0e253d',light:'#84c2da',hall:'palace',subtitle:'Thủy đình và vườn trăng',trees:'whiteBlossom'},
    thunder:{rx:420,ry:235,sky:'#1b203e',light:'#aaa7e3',hall:'thunderHall',subtitle:'Lôi đài trên đỉnh mây',trees:'pineTree'},
    mystic:{rx:430,ry:240,sky:'#173531',light:'#a6cfb4',hall:'mysticHall',subtitle:'Thư các và trận pháp trong vườn ngọc',trees:'sakura'},
    tower:{rx:460,ry:300,sky:'#1a2236',light:'#c8a9e9',hall:'arena',subtitle:'Vạn Tầng Tháp · trận pháp luân hồi',trees:'crystalPillar'}
  };
  world.sectLayouts=layouts;
  const clan=()=>world.isSectMap(world.state.scene),layout=()=>layouts[world.state.scene]||layouts.sword;
  const ready=image=>image&&image.complete&&image.naturalWidth>0;
  const nativeSwitch=world.switchScene,nativeService=world.handleService,nativeCamera=world.camera;
  const originalTitle=world.sceneTitle;
  const point=(x,y)=>({x,y});
  const mainShape=()=>layout();
  const diamond=(p,x,y,rx,ry)=>Math.abs((p.x-x)/rx)+Math.abs((p.y-y)/ry)<1;
  function terrain(p){if(world.state.scene==='arena')return Math.hypot(p.x-1000,(p.y-1100)*2)<190;
    if(world.mapStructures&&world.state.scene!=='tower'&&!world.mapStructures.onSurface(p))return false;
    if(world.state.scene==='tower')return diamond(p,1000,1100,460,300);
    const main=mainShape();return diamond(p,1000,1100,main.rx,main.ry);}
  const oldWalk=world.canWalk;
  // Thiên Vân Thành is a floating diamond island like the sect courts.
  const HUB_DECK={rx:740,ry:470};world.hubDeck=HUB_DECK;
  const hubWalk=p=>Math.abs(p.x-1000)/(HUB_DECK.rx*.95)+Math.abs(p.y-1100)/(HUB_DECK.ry*.95)<1&&!world.buildings.some(b=>b.solid&&p.x>b.x+b.solid[0]&&p.x<b.x+b.solid[2]&&p.y>b.y+b.solid[1]&&p.y<b.y+b.solid[3]);
  world.canWalk=p=>world.state.scene==='hub'?hubWalk(p):p.x>20&&p.x<M-20&&p.y>20&&p.y<M-20&&terrain(p)&&!world.buildings.some(b=>b.solid&&p.x>b.x+b.solid[0]&&p.x<b.x+b.solid[2]&&p.y>b.y+b.solid[1]&&p.y<b.y+b.solid[3]);
  world.traceMove=(from,to)=>{if(!world.canWalk(from))return {...from};const steps=Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.y-from.y)/3));let last={...from};for(let i=1;i<=steps;i++){const p={x:from.x+(to.x-from.x)*i/steps,y:from.y+(to.y-from.y)*i/steps};if(!world.canWalk(p))break;last=p;}return last;};
  world.sceneSafety=p=>clan()&&diamond(p,1000,1100,mainShape().rx+5,mainShape().ry+5);
  world.bridgeRoutes=()=>[];
  world.sceneTitle=()=>world.state.scene==='arena'?'Đấu trường tông môn':world.state.scene==='tower'?'Vạn Tầng Tháp':originalTitle();
  world.camera=(vw,vh)=>{if(world.state.scene!=='arena')return nativeCamera(vw,vh);const axis=(v,size,lo,hi)=>size>hi-lo?(lo+hi-size)/2:Math.max(lo,Math.min(hi-size,v-size/2));return {x:axis(P.x,vw,620,1380),y:axis(P.y,vh,760,1510),vw,vh};};
  function assetAt(ctx,key,x,y,width,groundY=.34){const image=world.asset(key);if(!ready(image))return;width=Math.min(width,spriteCatalog.maps.find(m=>m.id===key)?.width||image.naturalWidth);const height=width*image.naturalHeight/image.naturalWidth;ctx.drawImage(image,x-width/2,y-height*groundY,width,height);}
  const modules=Object.fromEntries(Object.entries(spriteCatalog.modules).map(([key,meta])=>{const image=new Image();image.src=artworkURL(meta.src);return[key,image];}));
  const terrainSprites=Object.fromEntries(Object.entries(mapAtlasSprites.terrain).map(([key,meta])=>{const image=new Image();image.src=artworkURL(meta.src);return[key,image];}));
  // Complete connected island sprites: no rectangular cuts through neighbours.
  for(const [key,id]of Object.entries({emptyIsland:'atlas-06-024',gardenIsland:'atlas-06-038',wildIsland:'atlas-06-022',smallIsland:'atlas-06-026'})){
    const meta=mapAtlasSprites.sprites.find(s=>s.id===id);if(meta){const image=new Image();image.src=artworkURL(meta.src);terrainSprites[key]=image;}
  }
  const highIsland=new Image();highIsland.src=artworkURL('Map/hd/courtyard-island.png');
  const themes={
    sword:{base:'emptyIsland',motif:'court',satellites:[['gardenIsland',560,805,180],['wildIsland',1440,820,150],['rockSpire',690,1430,95]]},
    moon:{base:'gardenIsland',motif:'roundCourt',satellites:[['smallIsland',600,845,185],['lotusTerrace',1410,820,205],['smallIsland',1430,1400,130]]},
    thunder:{base:'emptyIsland',motif:'roundCourt',satellites:[['rockSpire',560,830,160],['emptyIsland',1430,820,190],['rockSpire',1400,1430,120]]},
    mystic:{base:'gardenIsland',motif:'court',satellites:[['lotusTerrace',575,835,200],['wildIsland',1430,815,180],['smallIsland',650,1400,140]]}
  };
  const districts={sword:[['school',560,805,230],['gate',1450,815,160]],moon:[['garden',555,810,220],['moonCourt',1450,810,190]],thunder:[['thunderHall',560,810,230],['thunderAltar',1440,815,100]],mystic:[['mysticArchive',560,810,210],['mysticGarden',1440,810,220]]};
  function terrainArt(ctx,key,x,y,width,plane=.43,opacity=1){const image=terrainSprites[key];if(!ready(image))return false;
    const height=width*image.naturalHeight/image.naturalWidth;ctx.save();ctx.globalAlpha*=opacity;renderArtwork(ctx,image,x-width/2,y-height*plane,width,height);ctx.restore();return true;}
  function diamondPath(ctx,x,y,rx,ry){ctx.beginPath();ctx.moveTo(x,y-ry);ctx.lineTo(x+rx,y);ctx.lineTo(x,y+ry);ctx.lineTo(x-rx,y);ctx.closePath();}
  function pavedOutline(ctx,x,y,rx,ry){
    const cut=Math.min(.3,Math.max(.14,24/ry));
    const points=[[-cut,-1+cut],[cut,-1+cut],[1-cut,-cut],[1-cut,cut],[cut,1-cut],[-cut,1-cut],[-1+cut,cut],[-1+cut,-cut]];
    points.forEach(([px,py],i)=>i?ctx.lineTo(x+px*rx,y+py*ry):ctx.moveTo(x+px*rx,y+py*ry));ctx.closePath();
  }
  let floorView=null;
  function islandDeck(ctx,x,y,rx,ry,depth=70){
    if(ready(highIsland)){
      // Keep the original stone corners; paving ends before all four tips.
      ctx.save();ctx.beginPath();ctx.rect(x-rx*1.4,y-ry*2,rx*2.8,ry*5);
      pavedOutline(ctx,x,y,rx,ry);ctx.clip('evenodd');
      renderArtwork(ctx,world.mapThemes?.terrainFor(highIsland)||highIsland,x-rx*768/625,y-ry*355/272,rx*1536/625,ry*1024/272);ctx.restore();
      world.atmosphere?.drawCliff(ctx,highIsland,{x,y,rx,ry,view:floorView});
    }else{
      ctx.save();ctx.fillStyle='#40545c';ctx.beginPath();ctx.moveTo(x-rx,y);ctx.lineTo(x,y+ry);ctx.lineTo(x+rx,y);ctx.lineTo(x,y+ry+depth);ctx.closePath();ctx.fill();ctx.restore();
    }
    ctx.save();ctx.beginPath();pavedOutline(ctx,x,y,rx,ry);ctx.clip();stonePaving.draw(ctx,{x,y,rx,ry},floorView);world.mapThemes?.finishDeck(ctx,x,y,rx,ry);ctx.restore();
  }
  function rail(ctx,route,sides=[-1,1]){const image=world.asset('bridgeRail');if(!ready(image))return;
    for(const side of sides){const edge=route.map((p,i)=>{const normal=(a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1;return {x:-dy/l,y:dx/l};};const before=normal(route[Math.max(0,i-1)],route[Math.max(1,i)]),after=normal(route[Math.min(i,route.length-2)],route[Math.min(i+1,route.length-1)]);const dot=before.x*after.x+before.y*after.y,factor=side*25/Math.max(.5,1+dot);return {x:p.x+(before.x+after.x)*factor,y:p.y+(before.y+after.y)*factor};});
      edge.forEach((b,i)=>{if(!i)return;const a=edge[i-1],length=Math.hypot(b.x-a.x,b.y-a.y),angle=Math.atan2(b.y-a.y,b.x-a.x);ctx.save();ctx.translate(a.x,a.y);ctx.rotate(angle);for(let x=0;x<length;x+=48){const span=Math.min(48,length-x);ctx.drawImage(image,0,0,image.naturalWidth*span/48,image.naturalHeight,x,-10,span,12);}ctx.restore();});}}
  function court(ctx,shape){islandDeck(ctx,1000,1100,shape.rx,shape.ry,90);
    if(ready(highIsland))return;
    const x=1000,y=1100,rx=shape.rx,ry=shape.ry;
    [[point(x+30,y-ry+14),point(x+rx-35,y-18)],[point(x+rx-35,y+18),point(x+38,y+ry-14)],
      [point(x-38,y+ry-14),point(x-rx+35,y+18)],[point(x-rx+35,y-18),point(x-30,y-ry+14)]].forEach(edge=>rail(ctx,edge,[0]));
  }
  function sky(ctx,cx,cy,vw,vh){const l=layout(),gradient=ctx.createLinearGradient(0,cy,0,cy+vh);gradient.addColorStop(0,l.sky);gradient.addColorStop(1,world.state.scene==='mystic'?'#35564b':l.sky);ctx.fillStyle=gradient;ctx.fillRect(cx,cy,vw,vh);
    const themed=world.mapThemes?.drawBackdrop(ctx,cx,cy,vw,vh);
    const theme=themes[world.state.scene];if(!themed&&theme)for(const [key,x,y,width]of theme.satellites)terrainArt(ctx,key,x,y,width,.42,.65);
    if(!themed)for(const [key,x,y,width]of districts[world.state.scene]||[]){ctx.save();ctx.globalAlpha=.72;world.sprite(ctx,key,x,y,width);ctx.restore();}
    // Two distant parallax layers. Simulation time freezes with dialogs and pause.
    const clock=world.environmentClock||0;
    if(ready(modules.cloud))for(let i=0;i<10;i++){const far=i<5,span=2600,speed=far?2.5:5.5,x=((i*437+clock*speed)%span)-300+cx*(far?.08:.035),y=230+(i*269)%1680+Math.sin(i*2+clock*.035)*8;const width=far?380:250;ctx.save();ctx.globalAlpha=far?.16:.25;renderArtwork(ctx,modules.cloud,x,y,width,width*modules.cloud.naturalHeight/modules.cloud.naturalWidth);ctx.restore();}
    if(world.state.scene==='thunder')for(const [x,y]of [[590,865],[1440,730],[1320,1560]])world.sprite(ctx,'cloudRock',x,y,155,undefined,.6);
  }
  const hubDecor=[{key:'pineTree',x:655,y:970,w:42},{key:'whiteBlossom',x:1345,y:970,w:42},
    {key:'sakura',x:590,y:1285,w:42},{key:'rock',x:1345,y:1320,w:58},
    {key:'lotusPond',x:1100,y:1170,w:60},{key:'lotusPond',x:900,y:1285,w:65},
    {key:'guardianLion',x:950,y:875,w:36},{key:'guardianLion',x:1050,y:875,w:36}];
  function hubFloor(ctx,cx,cy,vw,vh){if(!window.mapIdentity?.hubSky?.(ctx,cx,cy,vw,vh))sky(ctx,cx,cy,vw,vh);
    const {rx,ry}=HUB_DECK;islandDeck(ctx,1000,1100,rx,ry,110);
    // Stairs descend from the two lower edges; lanterns line the rim.
    for(const s of [-1,1])assetAt(ctx,'stairs',1000+s*rx*.5,1100+ry*.5+20,86,.5);
    assetAt(ctx,'stairs',1000,1100+ry-6,90,.5);
    for(const [ax,ay,bx,by] of [[1000,1100-ry,1000+rx,1100],[1000+rx,1100,1000,1100+ry],[1000,1100+ry,1000-rx,1100],[1000-rx,1100,1000,1100-ry]])
      for(let t=.14;t<.9;t+=.18){if(ay>1100&&by>1100||ay===1100&&by===1100+ry||ay===1100+ry){if(Math.abs(t-.5)<.1)continue;}
        const x=ax+(bx-ax)*t,y=ay+(by-ay)*t;world.sprite(ctx,'lantern',1000+(x-1000)*.93,1100+(y-1100)*.93,20);}
  }
  const decor={sword:[],moon:[],thunder:[],mystic:[]};
  for(const id of world.sectIds){const l=layouts[id];
    for(const [x,y]of [[820,1140],[1180,1145]])decor[id].push({key:l.trees,x,y,w:44});
  }
  decor.moon.push({key:'lotusPond',x:750,y:1120,w:85},{key:'lotusPond',x:1250,y:1120,w:85});
  decor.thunder.push({key:'crystalPillar',x:1220,y:1100,w:22});
  decor.mystic.push({key:'lotusPond',x:750,y:1120,w:70},{key:'lotusPond',x:1250,y:1120,w:70});
  world.mapDecorations=decor;
  function paintGround(ctx,cx,cy,vw,vh){floorView={x:cx-2,y:cy-2,width:vw+4,height:vh+4};ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    if(world.state.scene==='hub'){hubFloor(ctx,cx,cy,vw,vh);ctx.restore();return;}
    sky(ctx,cx,cy,vw,vh);
    if(world.state.scene==='arena'||world.state.scene==='worldboss'){const large=world.state.scene==='worldboss';islandDeck(ctx,1000,1100,large?320:200,large?160:100,65);ctx.restore();return;}
    court(ctx,layout());ctx.restore();
  }
  drawGround=(cx,cy,vw,vh)=>paintGround(g,cx,cy,vw,vh);
  world.drawGroundDetails=function(ctx,cx,cy,vw,vh){if(world.state.scene==='hub')return;
    // The painted terrain already contains its courtyard. Do not stack a second
    // raised island beneath the player or duplicate the same dais at every camp.
  };
  function configure(){
    if(world.state.scene==='hub'){
      const positions={palace:[1000,805,400],school:[700,925,200],board:[1290,925,100],market:[625,1150,185],hubBazaar:[625,1150,185],forge:[1375,1145,180],tower:[1300,1345,190],portal:[1000,1300,70],garden:[720,1395,150]};
      for(const b of world.buildings){if(b.key==='arena')b.key='tower';const p=positions[b.key];if(p){[b.x,b.y,b.w]=p;if(b.solid)b.solid=[-b.w*.26,-12,b.w*.26,-2];}if(b.key==='market')b.key='hubBazaar';}
      const services={quest:[1000,935],shop:[760,1210],forge:[1240,1210],teleport:[1000,1330],tower:[1240,1385],rank:[1240,1015],skills:[760,1000]};
      for(const s of world.services){if(s.id==='arena')s.id='tower';if(services[s.id])[s.x,s.y]=services[s.id];}
      return;
    }
    if(world.state.scene==='tower'){
      world.buildings.splice(0,world.buildings.length,{key:'arena',x:1000,y:920,w:340,ground:true},{key:'portal',x:1000,y:1320,w:72},{key:'crystalPillar',x:720,y:1050,w:38},{key:'crystalPillar',x:1280,y:1050,w:38},{key:'lotusPond',x:770,y:1190,w:96},{key:'lotusPond',x:1230,y:1190,w:96});
      world.services.splice(0,world.services.length,{id:'leaveTower',name:'Rời Vạn Tầng Tháp',x:1000,y:1325,color:'#eed8a7'});world.state.near=null;return;
    }
    if(!clan())return;
    const id=world.state.scene,meta=world.sectMaps[id],l=layout();
    // Three reserved zones: west academy, east archive, open central crossing.
    const buildings=[{key:'portal',x:870,y:1165,w:38},
      {key:l.hall||'school',x:835,y:1060,w:id==='sword'?170:id==='mystic'?190:210,solid:[-42,-12,42,-2]}];
    buildings.push({key:{sword:'statue',moon:'lotusPond',thunder:'thunderAltar',mystic:'crystalPillar'}[id],x:1080,y:1000,w:id==='moon'?60:40,solid:[-9,-6,9,-1]});
    if(id==='mystic')buildings.push({key:'school',x:1195,y:1070,w:130,solid:[-24,-10,24,-2]});
    buildings.push({key:'board',x:1130,y:1190,w:30});
    world.buildings.splice(0,world.buildings.length,...buildings);
    world.services.splice(0,world.services.length,
      {id:'mentor',name:meta.mentor+' · Sư phụ',x:910,y:1125,npc:true,color:meta.color},
      {id:'sectSkills',name:'Truyền công',x:1120,y:1125,npc:true,color:meta.color},
      {id:'teleport',name:'Truyền tống · Thiên Vân Thành',x:870,y:1175,color:'#eed8a7'},
      {id:'board',name:'Bảng Sơn Hà · Đi săn',x:1130,y:1175,color:'#eed8a7'});
    world.state.near=null;
  }
  world.layoutArt={modules,islandDeck,hubDecor,decor,terrainSprites,highIsland,stonePaving,themes,districts};
  const actorBodies=[];['Kiem','Liem','Thuong','Quat'].forEach((folder,i)=>{const img=new Image();Object.defineProperty(actorBodies,i,{enumerable:true,get(){if(!img.src)img.src='Character/'+folder+'/Nam/truoc.png';return img;}});}); // loaded when a sect NPC of that class is drawn
  world.layoutArt.placements=function(){
    const decorations=world.state.scene==='hub'?hubDecor:clan()?decor[world.state.scene]:[];
    const props=[...world.buildings.filter(b=>!b.ground),...decorations].map((p,i)=>{const bounds=world.spriteBounds(p.key,p.x,p.y,p.w);return{id:p.key+':'+i,type:'prop',...(bounds||{left:p.x,right:p.x,top:p.y,bottom:p.y})};});
    const roles={quest:'nhiemvu',shop:'thoren',forge:'thoren',arena:'dautruong',tower:'dautruong',rank:'bxh'};
    for(const s of world.services)if(s.npc){const index=world.sectMaps[world.state.scene]?.classIndex||0,role=world.state.scene==='hub'?roles[s.id]:null,image=role?creatureArt.npcImages[role]:actorBodies[index],h=role?(s.id==='rank'?68:60):index===2?52.5:42,w=ready(image)?h*image.naturalWidth/image.naturalHeight:24;props.push({id:s.id,type:'npc',left:s.x-w/2,right:s.x+w/2,top:s.y-h,bottom:s.y});}
    return props;
  };
  world.queueActors=function(items,cx,cy,vw,vh){if(world.state.scene==='hub'){
    for(const d of [...world.buildings.filter(b=>!b.ground),...hubDecor])items.push([d.y,()=>world.sprite(g,d.key,d.x,d.y,d.w)]);
    for(const s of world.services)if(s.npc)items.push([s.y,()=>{if(!creatureArt.drawNpc(g,s)){const image=actorBodies[0],h=42;if(ready(image))renderArtwork(g,image,s.x-h*image.naturalWidth/image.naturalHeight/2,s.y-h,h*image.naturalWidth/image.naturalHeight,h);}}]);
    return;
  }
    for(const e of window.creatureArt?.corpses||[])items.push([e.y,()=>mon(e)]);
    const decorations=clan()?decor[world.state.scene]:world.mapThemes?.battleProps()||[{key:'guardianLion',x:780,y:1090,w:65},{key:'guardianLion',x:1220,y:1090,w:65}];
    for(const b of [...world.buildings,...decorations])if(b.x>cx-b.w&&b.x<cx+vw+b.w&&b.y>cy-40&&b.y<cy+vh+b.w)items.push([b.y,()=>world.sprite(g,b.key,b.x,b.y,b.w)]);
    for(const s of world.services)if(s.npc)items.push([s.y,()=>{const index=world.sectMaps[world.state.scene]?.classIndex||0,image=actorBodies[index];if(ready(image)){const h=index===2?52.5:42,w=h*image.naturalWidth/image.naturalHeight;g.drawImage(image,s.x-w/2,s.y-h,w,h);}}]);
  };
  world.renderMapPreview=function(ctx,size){ctx.save();
    if(world.state.scene==='hub'){const c=world.city,w=c.right-c.left+120,h=c.bottom-c.top+120,zoom=size/Math.max(w,h);ctx.translate((size-w*zoom)/2,(size-h*zoom)/2);ctx.scale(zoom,zoom);ctx.translate(-c.left+60,-c.top+60);}
    else ctx.scale(size/M,size/M);
    paintGround(ctx,0,0,M,M);world.drawGroundDetails(ctx,0,0,M,M);
    const decorations=world.state.scene==='hub'?hubDecor:clan()?decor[world.state.scene]:world.mapThemes?.battleProps()||[{key:'guardianLion',x:780,y:1090,w:65},{key:'guardianLion',x:1220,y:1090,w:65}];
    [...world.buildings.filter(b=>!b.ground),...decorations].sort((a,b)=>a.y-b.y).forEach(d=>world.sprite(ctx,d.key,d.x,d.y,d.w));
    ctx.font='bold 28px Georgia,serif';ctx.textAlign='center';ctx.fillStyle='#f9e7b6';ctx.strokeStyle='#15272b';ctx.lineWidth=5;
    world.services.forEach(s=>{ctx.fillStyle=s.id==='teleport'?'#ffe29c':'#7ce0cd';ctx.beginPath();ctx.arc(s.x,s.y,12,0,Math.PI*2);ctx.fill();});
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(P.x,P.y,16,0,Math.PI*2);ctx.fill();ctx.restore();
  };
  // Sect courts are safe hubs: no local or networked farm mobs.
  world.farmPopulation=()=>0;spawn=()=>{};
  world.switchScene=function(id,initial=false){if(id==='arena')return world.openArena();if(world.state.scene==='arena')return leaveArena(id);
    nativeSwitch(id,initial);configure();};
  const creator=$('ok').onclick;$('ok').onclick=()=>{creator();if(P.ap&&cr.style.display==='none')configure();};
  // The old 30-wave arena was replaced by Vạn Tầng Tháp (js/35u-tower.js owns openArena).
  // Scene 'arena' is a bare battle deck (tests, legacy saves); leaving it restores the previous map.
  let returnMap='hub',entryEpoch=0;
  function resetCombat(){classCombat.onRespawn();B.length=SP.length=V.length=LT.length=X.length=PT.length=0;K={};ptr=null;P.med=0;P.sl=0;P.acd=.5;kiemCombat.state.aim=moonCombat.state.aim=null;skillAim.state.visible=false;}
  function leaveArena(destination=returnMap){entryEpoch++;world.stopArena();resetCombat();E=[];world.state.scene='hub';P.world.map='hub';nativeSwitch(world.sectMaps[destination]?destination:'hub');configure();}
  world.arenaRun=()=>null;world.leaveArena=()=>leaveArena();
  world.handleService=function(id){if(id==='boss'||id==='arena'){dialog.show('Thử thách','Nội dung thử thách cũ đã khép lại. Hãy đến Vạn Tầng Tháp trong Thiên Vân Thành.');return true;}if(id==='leaveArena'){dialog.show('Rời đấu trường','Thử thách cũ đã đóng.');dialog.action('Rời đấu trường',()=>leaveArena());return true;}
    if(id==='board'&&clan()){dialog.show('Bảng Sơn Hà','Tông môn là nơi an toàn để nhận chỉ dạy và truyền công. Yêu thú ở Sơn Hà và Tứ Phương Bí Cảnh.');dialog.action('Mở bản đồ vùng săn',()=>{dialog.close();window.overworldGame?.openRoutes();});return true;}
    return nativeService(id);};
  const oldMini=world.renderMini;world.renderMini=function(ctx,size){if(world.state.scene==='hub')return oldMini(ctx,size);ctx.fillStyle=layout().sky;ctx.fillRect(0,0,size,size);ctx.save();ctx.scale(size/M,size/M);
    if(world.state.scene==='arena'){ctx.fillStyle='#c2b49a';ctx.beginPath();ctx.ellipse(1000,1100,190,95,0,0,Math.PI*2);ctx.fill();}
    else{const mark=(x,y,rx,ry)=>{ctx.beginPath();ctx.moveTo(x,y-ry);ctx.lineTo(x+rx,y);ctx.lineTo(x,y+ry);ctx.lineTo(x-rx,y);ctx.closePath();ctx.fill();};ctx.fillStyle='#d5c8aa';const main=mainShape();mark(1000,1100,main.rx,main.ry);}
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(P.x,P.y,18,0,Math.PI*2);ctx.fill();ctx.restore();};
  world.openOverview=()=>{dialog.show('Tông môn',world.sceneTitle());const c=document.createElement('canvas');c.width=c.height=360;c.className='world-overview';$('world-content').appendChild(c);world.renderMapPreview(c.getContext('2d'),360);world.regions.forEach(r=>dialog.line(r.name+' · '+r.description));dialog.line('Truyền tống về Thiên Vân Thành để nhận nhiệm vụ, rèn đồ và ra Sơn Hà săn yêu thú.');};
})();
