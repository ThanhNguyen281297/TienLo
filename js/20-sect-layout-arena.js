/* Đảo tông môn và bãi luyện công; các đảo riêng, không có cầu nối. */
(function(){
  const world=worldMap,dialog=world.dialog;
  world.customLayout=true;
  const camps=[
    {id:'north',name:'Bắc · Bọ Ngựa',x:1000,y:490,t:0},
    {id:'east',name:'Đông · Nguyệt Thố',x:1640,y:1100,t:1},
    {id:'south',name:'Nam · Huyết Nhện',x:1000,y:1650,t:4},
    {id:'west',name:'Tây · Băng Dực Dơi',x:360,y:1100,t:3}
  ];
  world.farmCamps=camps;
  Object.assign(world.definitions,{moonCourt:[2,0,510/1086,375/1448,225/1086],moonDais:[2,375/1448,530/1086,270/1448,174/1086],stairs:[2,0,850/1086,200/1448,236/1086],bridgeRail:[2,8/1448,995/1086,20/1448,50/1086]});world.preloadSprites();
  const layouts={
    sword:{rx:300,ry:165,sky:'#172e31',light:'#82b9aa',hall:null,subtitle:'Thiên kiếm giữa biển mây',trees:'pineTree'},
    moon:{rx:330,ry:180,sky:'#0e253d',light:'#84c2da',hall:'palace',subtitle:'Thủy đình và vườn trăng',trees:'whiteBlossom'},
    thunder:{rx:310,ry:175,sky:'#1b203e',light:'#aaa7e3',hall:'thunderHall',subtitle:'Lôi đài trên đỉnh mây',trees:'pineTree'},
    mystic:{rx:330,ry:180,sky:'#173531',light:'#a6cfb4',hall:'mysticHall',subtitle:'Thư các và trận pháp trong vườn ngọc',trees:'sakura'},
    valley:{rx:340,ry:190,sky:'#1d3a2e',light:'#9fe8b8',hall:null,subtitle:'Mạch linh hội tụ · Linh Nguyên x2',trees:'pineTree'}
  };
  const valleyMines=[
    {id:'vein-north',name:'Mạch Bắc · Bọ Ngựa',x:1000,y:580,t:0},
    {id:'vein-east',name:'Mạch Đông · Nguyệt Thố',x:1500,y:1260,t:1},
    {id:'vein-west',name:'Mạch Tây · Băng Dực Dơi',x:500,y:1260,t:3}
  ];
  world.sectLayouts=layouts;world.valleyMines=valleyMines;
  const clan=()=>world.isSectMap(world.state.scene),isValley=()=>world.state.scene==='valley',layout=()=>layouts[world.state.scene]||layouts.sword;
  const ready=image=>image&&image.complete&&image.naturalWidth>0;
  const nativeSwitch=world.switchScene,nativeRespawn=world.respawn,nativeService=world.handleService,nativeCamera=world.camera;
  const originalTitle=world.sceneTitle;
  const point=(x,y)=>({x,y});
  const mainShape=()=>layout();
  const diamond=(p,x,y,rx,ry)=>Math.abs((p.x-x)/rx)+Math.abs((p.y-y)/ry)<1;
  function terrain(p){if(world.state.scene==='arena')return Math.hypot(p.x-1000,(p.y-1100)*2)<190;
    if(world.mapStructures&&!world.mapStructures.onSurface(p))return false;
    if(isValley()){const main=layouts.valley;return diamond(p,1000,1100,main.rx,main.ry)||valleyMines.some(c=>diamond(p,c.x,c.y,150,78));}
    const main=mainShape();return diamond(p,1000,1100,main.rx,main.ry)||camps.some(c=>diamond(p,c.x,c.y,156,80));}
  const oldWalk=world.canWalk;
  world.canWalk=p=>world.state.scene==='hub'?oldWalk(p):p.x>20&&p.x<M-20&&p.y>20&&p.y<M-20&&terrain(p)&&!world.buildings.some(b=>b.solid&&p.x>b.x+b.solid[0]&&p.x<b.x+b.solid[2]&&p.y>b.y+b.solid[1]&&p.y<b.y+b.solid[3]);
  world.traceMove=(from,to)=>{if(!world.canWalk(from))return {...from};const steps=Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.y-from.y)/3));let last={...from};for(let i=1;i<=steps;i++){const p={x:from.x+(to.x-from.x)*i/steps,y:from.y+(to.y-from.y)*i/steps};if(!world.canWalk(p))break;last=p;}return last;};
  world.sceneSafety=p=>{if(isValley())return diamond(p,1000,1100,layouts.valley.rx+5,layouts.valley.ry+5);return clan()&&diamond(p,1000,1100,mainShape().rx+5,mainShape().ry+5);};
  world.bridgeRoutes=()=>[];
  world.sceneTitle=()=>world.state.scene==='arena'?'Đấu trường tông môn':originalTitle();
  world.camera=(vw,vh)=>{if(world.state.scene!=='arena')return nativeCamera(vw,vh);const axis=(v,size,lo,hi)=>size>hi-lo?(lo+hi-size)/2:Math.max(lo,Math.min(hi-size,v-size/2));return {x:axis(P.x,vw,620,1380),y:axis(P.y,vh,760,1510),vw,vh};};
  function assetAt(ctx,key,x,y,width,groundY=.34){const image=world.asset(key);if(!ready(image))return;width=Math.min(width,image.naturalWidth);const height=width*image.naturalHeight/image.naturalWidth;ctx.drawImage(image,x-width/2,y-height*groundY,width,height);}
  const modules=Object.fromEntries(Object.entries(spriteCatalog.modules).map(([key,meta])=>{const image=new Image();image.src=artworkURL(meta.src);return[key,image];}));
  const terrainSprites=Object.fromEntries(Object.entries(mapAtlasSprites.terrain).map(([key,meta])=>{const image=new Image();image.src=artworkURL(meta.src);return[key,image];}));
  // Complete connected island sprites: no rectangular cuts through neighbours.
  for(const [key,id]of Object.entries({emptyIsland:'atlas-06-024',gardenIsland:'atlas-06-038',wildIsland:'atlas-06-022',smallIsland:'atlas-06-026'})){
    const meta=mapAtlasSprites.sprites.find(s=>s.id===id);if(meta){const image=new Image();image.src=artworkURL(meta.src);terrainSprites[key]=image;}
  }
  const highIsland=new Image();highIsland.src=artworkURL('MAP/hd/courtyard-island.png');
  const themes={
    sword:{base:'emptyIsland',motif:'court',satellites:[['gardenIsland',560,805,180],['wildIsland',1440,820,150],['rockSpire',690,1430,95]]},
    moon:{base:'gardenIsland',motif:'roundCourt',satellites:[['smallIsland',600,845,185],['lotusTerrace',1410,820,205],['smallIsland',1430,1400,130]]},
    thunder:{base:'emptyIsland',motif:'roundCourt',satellites:[['rockSpire',560,830,160],['emptyIsland',1430,820,190],['rockSpire',1400,1430,120]]},
    mystic:{base:'gardenIsland',motif:'court',satellites:[['lotusTerrace',575,835,200],['wildIsland',1430,815,180],['smallIsland',650,1400,140]]},
    valley:{base:'emptyIsland',motif:null,satellites:[['wildIsland',660,820,210],['wildIsland',1360,850,185],['smallIsland',1190,1450,150]]}
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
      renderArtwork(ctx,highIsland,x-rx*768/625,y-ry*355/272,rx*1536/625,ry*1024/272);ctx.restore();
    }else{
      ctx.save();ctx.fillStyle='#40545c';ctx.beginPath();ctx.moveTo(x-rx,y);ctx.lineTo(x,y+ry);ctx.lineTo(x+rx,y);ctx.lineTo(x,y+ry+depth);ctx.closePath();ctx.fill();ctx.restore();
    }
    ctx.save();ctx.beginPath();pavedOutline(ctx,x,y,rx,ry);ctx.clip();stonePaving.draw(ctx,{x,y,rx,ry},floorView);ctx.restore();
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
    const theme=themes[world.state.scene];if(theme)for(const [key,x,y,width]of theme.satellites)terrainArt(ctx,key,x,y,width,.42,.65);
    for(const [key,x,y,width]of districts[world.state.scene]||[]){ctx.save();ctx.globalAlpha=.72;world.sprite(ctx,key,x,y,width);ctx.restore();}
    // Two distant parallax layers. Simulation time freezes with dialogs and pause.
    const clock=world.environmentClock||0;
    if(ready(modules.cloud))for(let i=0;i<10;i++){const far=i<5,span=2600,speed=far?2.5:5.5,x=((i*437+clock*speed)%span)-300+cx*(far?.08:.035),y=230+(i*269)%1680+Math.sin(i*2+clock*.035)*8;const width=far?380:250;ctx.save();ctx.globalAlpha=far?.16:.25;renderArtwork(ctx,modules.cloud,x,y,width,width*modules.cloud.naturalHeight/modules.cloud.naturalWidth);ctx.restore();}
    if(world.state.scene==='thunder')for(const [x,y]of [[590,865],[1440,730],[1320,1560]])world.sprite(ctx,'cloudRock',x,y,155,undefined,.6);
  }
  const hubDecor=[{key:'pineTree',x:655,y:970,w:42},{key:'whiteBlossom',x:1345,y:970,w:42},
    {key:'sakura',x:655,y:1320,w:42},{key:'rock',x:1345,y:1320,w:58},
    {key:'lotusPond',x:1100,y:1170,w:60},{key:'lotusPond',x:900,y:1285,w:65},
    {key:'guardianLion',x:950,y:875,w:36},{key:'guardianLion',x:1050,y:875,w:36}];
  function hubFloor(ctx,cx,cy,vw,vh){sky(ctx,cx,cy,vw,vh);const c=world.city;
    stonePaving.draw(ctx,{left:c.left,top:c.top,right:c.right,bottom:c.bottom},floorView);
    assetAt(ctx,'stairs',1000,c.bottom+18,80,.5);
    // Vườn trang trí nằm ngoài các trục đi tới NPC.
    for(const x of [650,1350])for(const y of [710,875,1045,1220,1390])world.sprite(ctx,'lantern',x,y,20);
  }
  const decor={sword:[],moon:[],thunder:[],mystic:[]};
  for(const id of world.sectIds){const l=layouts[id];
    for(const [x,y]of [[820,1140],[1180,1145]])decor[id].push({key:l.trees,x,y,w:44});
    camps.forEach(c=>{
      decor[id].push({key:l.trees,x:c.x,y:c.y+(c.id==='south'?50:-50),w:40});
    });
  }
  decor.moon.push({key:'lotusPond',x:750,y:1120,w:85},{key:'lotusPond',x:1250,y:1120,w:85});
  decor.thunder.push({key:'crystalPillar',x:1220,y:1100,w:22});
  decor.mystic.push({key:'lotusPond',x:750,y:1120,w:70},{key:'lotusPond',x:1250,y:1120,w:70});
  world.mapDecorations=decor;
  const valleyDecor=[{key:'pineTree',x:740,y:1105,w:82},{key:'pineTree',x:1260,y:1105,w:82},{key:'crystalPillar',x:1000,y:620,w:34},{key:'crystalPillar',x:1500,y:1300,w:30},{key:'crystalPillar',x:500,y:1300,w:30},{key:'lotusPond',x:850,y:1210,w:95},{key:'lotusPond',x:1150,y:1210,w:95}];
  function paintGround(ctx,cx,cy,vw,vh){floorView={x:cx-2,y:cy-2,width:vw+4,height:vh+4};ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    if(world.state.scene==='hub'){hubFloor(ctx,cx,cy,vw,vh);ctx.restore();return;}
    sky(ctx,cx,cy,vw,vh);
    if(world.state.scene==='arena'){islandDeck(ctx,1000,1100,200,100,65);ctx.restore();return;}
    const layers=[{y:1100,priority:0,draw:()=>court(ctx,layout())}];
    (isValley()?valleyMines:camps).forEach(c=>layers.push({y:c.y,priority:2,draw:()=>islandDeck(ctx,c.x,c.y,isValley()?150:156,isValley()?78:80,65)}));
    layers.sort((a,b)=>a.y-b.y||a.priority-b.priority).forEach(layer=>layer.draw());ctx.restore();
  }
  drawGround=(cx,cy,vw,vh)=>paintGround(g,cx,cy,vw,vh);
  world.drawGroundDetails=function(ctx,cx,cy,vw,vh){if(world.state.scene==='hub')return;
    // The painted terrain already contains its courtyard. Do not stack a second
    // raised island beneath the player or duplicate the same dais at every camp.
  };
  function configure(){
    if(world.state.scene==='hub'){
      const positions={palace:[1000,830,300],school:[760,940,160],board:[1240,940,85],market:[760,1140,160],hubBazaar:[760,1140,160],forge:[1240,1140,150],arena:[1240,1340,155],portal:[1000,1300,65],garden:[760,1340,130]};
      for(const b of world.buildings){const p=positions[b.key];if(p){[b.x,b.y,b.w]=p;if(b.solid)b.solid=[-b.w*.26,-12,b.w*.26,-2];}if(b.key==='market')b.key='hubBazaar';}
      const services={quest:[1000,935],shop:[760,1210],forge:[1240,1210],teleport:[1000,1330],arena:[1240,1385],rank:[1240,1015],skills:[760,1000]};
      for(const s of world.services)if(services[s.id])[s.x,s.y]=services[s.id];
      return;
    }
    if(isValley()){
      world.buildings.splice(0,world.buildings.length,{key:'portal',x:870,y:1165,w:45},{key:'crystalPillar',x:1000,y:1020,w:34},{key:'crystalPillar',x:940,y:1040,w:26},{key:'crystalPillar',x:1060,y:1040,w:26});
      world.services.splice(0,world.services.length,
        {id:'teleport',name:'Truyền tống · Về tông môn',x:870,y:1175,color:'#eed8a7'},
        {id:'valley-info',name:'Linh Mạch · x2 Linh Nguyên',x:1000,y:1050,color:'#9fe8b8'},
        ...valleyMines.map(c=>({id:'vein-'+c.id,name:c.name,x:c.x,y:c.y+38,color:'#c9f2d4'})));
      world.state.near=null;return;
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
      {id:'boss',name:'Đấu trường · 30 lượt',x:1130,y:1175,color:'#eed8a7'},
      ...camps.map(c=>({id:'camp-'+c.id,name:c.name,x:c.x,y:c.y+38,color:'#d4e4d9'})));
    world.state.near=null;
  }
  world.layoutArt={modules,islandDeck,hubDecor,decor,valleyDecor,terrainSprites,highIsland,stonePaving,themes,districts};
  const actorBodies=['Kiem','Liem','Thuong','Quat'].map(folder=>{const img=new Image();img.src='CHARACTER/'+folder+'/Nam/truoc.png';return img;});
  world.layoutArt.placements=function(){
    const decorations=world.state.scene==='hub'?hubDecor:isValley()?valleyDecor:clan()?decor[world.state.scene]:[];
    const props=[...world.buildings.filter(b=>!b.ground),...decorations].map((p,i)=>{const bounds=world.spriteBounds(p.key,p.x,p.y,p.w);return{id:p.key+':'+i,type:'prop',...(bounds||{left:p.x,right:p.x,top:p.y,bottom:p.y})};});
    const roles={quest:'nhiemvu',shop:'thoren',forge:'thoren',arena:'dautruong',rank:'bxh'};
    for(const s of world.services)if(s.npc){const index=world.sectMaps[world.state.scene]?.classIndex||0,role=world.state.scene==='hub'?roles[s.id]:null,image=role?creatureArt.npcImages[role]:actorBodies[index],h=role?(s.id==='rank'?68:60):index===2?52.5:42,w=ready(image)?h*image.naturalWidth/image.naturalHeight:24;props.push({id:s.id,type:'npc',left:s.x-w/2,right:s.x+w/2,top:s.y-h,bottom:s.y});}
    return props;
  };
  world.queueActors=function(items,cx,cy,vw,vh){if(world.state.scene==='hub'){
    for(const d of [...world.buildings.filter(b=>!b.ground),...hubDecor])items.push([d.y,()=>world.sprite(g,d.key,d.x,d.y,d.w)]);
    for(const s of world.services)if(s.npc)items.push([s.y,()=>{if(!creatureArt.drawNpc(g,s)){const image=actorBodies[0],h=42;if(ready(image))renderArtwork(g,image,s.x-h*image.naturalWidth/image.naturalHeight/2,s.y-h,h*image.naturalWidth/image.naturalHeight,h);}}]);
    return;
  }
    for(const e of window.creatureArt?.corpses||[])items.push([e.y,()=>mon(e)]);
    const decorations=isValley()?valleyDecor:clan()?decor[world.state.scene]:[{key:'guardianLion',x:780,y:1090,w:65},{key:'guardianLion',x:1220,y:1090,w:65}];
    for(const b of [...world.buildings,...decorations])if(b.x>cx-b.w&&b.x<cx+vw+b.w&&b.y>cy-40&&b.y<cy+vh+b.w)items.push([b.y,()=>world.sprite(g,b.key,b.x,b.y,b.w)]);
    for(const s of world.services)if(s.npc)items.push([s.y,()=>{const index=world.sectMaps[world.state.scene]?.classIndex||0,image=actorBodies[index];if(ready(image)){const h=index===2?52.5:42,w=h*image.naturalWidth/image.naturalHeight;g.drawImage(image,s.x-w/2,s.y-h,w,h);}}]);
  };
  world.renderMapPreview=function(ctx,size){ctx.save();
    if(world.state.scene==='hub'){const c=world.city,w=c.right-c.left+120,h=c.bottom-c.top+120,zoom=size/Math.max(w,h);ctx.translate((size-w*zoom)/2,(size-h*zoom)/2);ctx.scale(zoom,zoom);ctx.translate(-c.left+60,-c.top+60);}
    else ctx.scale(size/M,size/M);
    paintGround(ctx,0,0,M,M);world.drawGroundDetails(ctx,0,0,M,M);
    const decorations=world.state.scene==='hub'?hubDecor:isValley()?valleyDecor:clan()?decor[world.state.scene]:[{key:'guardianLion',x:780,y:1090,w:65},{key:'guardianLion',x:1220,y:1090,w:65}];
    [...world.buildings.filter(b=>!b.ground),...decorations].sort((a,b)=>a.y-b.y).forEach(d=>world.sprite(ctx,d.key,d.x,d.y,d.w));
    ctx.font='bold 28px Georgia,serif';ctx.textAlign='center';ctx.fillStyle='#f9e7b6';ctx.strokeStyle='#15272b';ctx.lineWidth=5;
    if(isValley())valleyMines.forEach(c=>{ctx.strokeText(c.name,c.x,c.y+125);ctx.fillText(c.name,c.x,c.y+125);});
    else if(clan())camps.forEach(c=>{ctx.strokeText(c.name,c.x,c.y+125);ctx.fillText(c.name,c.x,c.y+125);});
    world.services.forEach(s=>{ctx.fillStyle=s.id==='teleport'?'#ffe29c':'#7ce0cd';ctx.beginPath();ctx.arc(s.x,s.y,12,0,Math.PI*2);ctx.fill();});
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(P.x,P.y,16,0,Math.PI*2);ctx.fill();ctx.restore();
  };
  world.generateFarm=function(index){
    if(isValley()){
      const mine=valleyMines[index%valleyMines.length],slot=Math.floor(index/valleyMines.length),a=slot*Math.PI*2/6,r=40+(slot%3)*28;
      const x=mine.x+Math.cos(a)*r*1.6,y=mine.y+Math.sin(a)*r*.7;
      E[index]={t:mine.t,x,y,hx:x,hy:y,hp:T[mine.t].hp,dead:0,cd:1,fr:0,fl:0,worldMap:true,map:'valley',camp:mine.id,valley:true};return;
    }
    if(!clan())return;const camp=camps[Math.floor(index/6)%4],slot=index%6,a=slot*Math.PI/3,r=slot%2?67:43;
    const spread=90+(slot%2)*5,x=camp.x+Math.cos(a)*spread,y=camp.y+Math.sin(a)*spread*.45;E[index]={t:camp.t,x,y,hx:x,hy:y,hp:T[camp.t].hp,dead:0,cd:1,fr:0,fl:0,worldMap:true,map:world.state.scene,camp:camp.id};};
  const nativeGenerateFarm=world.generateFarm;
  spawn=index=>{if(isValley()||clan())world.generateFarm(index);};
  // Farm giữ theo map, đấu trường không đưa vào bộ nhớ quái tông môn.
  world.switchScene=function(id,initial=false){if(id==='arena')return world.openArena();if(world.state.scene==='arena')return leaveArena(id);
    nativeSwitch(id,initial);configure();};
  const creator=$('ok').onclick;$('ok').onclick=()=>{creator();if(P.ap&&cr.style.display==='none')configure();};
  const banner=document.createElement('div');banner.id='arena-status';banner.hidden=true;banner.style.cssText='position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:3;padding:12px 20px;border:1px solid #bda576;border-radius:12px;background:#13232fee;color:#f6e3b7;text-align:center;font-size:13px;max-width:40vw;pointer-events:none';document.body.appendChild(banner);
  const arenaCss=document.createElement('style');arenaCss.textContent='@media(max-width:700px){#arena-status{top:172px!important;left:8px!important;transform:none!important;padding:8px 12px!important;font-size:11px!important;max-width:calc(100vw - 110px)!important;box-sizing:border-box}}';document.head.appendChild(arenaCss);
  let run=null,busy=false,returnMap='hub',entryEpoch=0;
  async function budget(consume=false){
    if(location.protocol==='file:')throw new Error('Đấu trường online cần đăng nhập qua server.');
    return account.api('/api/arena',consume?{}:undefined);
  }
  function resetCombat(){classCombat.onRespawn();B.length=SP.length=V.length=LT.length=X.length=PT.length=0;K={};ptr=null;P.med=0;P.sl=0;P.acd=.5;kiemCombat.state.aim=moonCombat.state.aim=null;skillAim.state.visible=false;}
  function nextWave(){if(!run)return;run.wave++;run.wait=0;E=[];P.mp=Math.min(mmp(),P.mp+Math.max(4,mmp()*.12));P.hp=Math.min(mhp(),P.hp+mhp()*.08);
    const count=Math.min(10,3+Math.floor((run.wave-1)/4)),multiplier=1+(run.wave-1)*.045,level=run.level||0,types=[0,1,4,3];
    for(let i=0;i<count;i++){const a=i*Math.PI*2/count,x=1000+Math.cos(a)*160,y=1100+Math.sin(a)*80,t=types[(run.wave+i-1)%4],elite=run.wave%5===0&&i===0;
      const hp=Math.round(T[t].hp*multiplier*(1+level*.11)*(elite?2:1));E.push({t,x,y,hx:x,hy:y,hp,maxHp:hp,elite,attackScale:multiplier*(1+level*.04),xpReward:Math.round(T[t].xp*(1+level*.08)),dead:0,cd:1,fr:0,fl:0,worldMap:true,arena:true,map:'arena',name:elite?T[t].n+' · Thủ lĩnh':undefined});}
    msg('Đấu trường · lượt '+run.wave+'/30');updateBanner();}
  function updateBanner(){banner.hidden=!run;if(run)banner.textContent=`ĐẤU TRƯỜNG · ${run.wave}/30 · ${E.filter(e=>e.hp>0&&!e.dead).length} quái${run.wait>0?' · Chuẩn bị lượt tiếp theo':''}`;}
  function enterArena(){returnMap=world.state.scene;resetCombat();run={wave:0,wait:0,separate:true,level:cultivationLevel()};world.state.arena=run;world.state.scene='arena';P.world.map='arena';E=[];
    world.buildings.length=0;world.services.splice(0,world.services.length,{id:'leaveArena',name:'Rời đấu trường',x:1000,y:1180,color:'#efdbaf'});P.x=1000;P.y=1100;P.hp=mhp();P.mp=mmp();world.state.near=null;dialog.close();nextWave();saveCharacter();}
  function leaveArena(destination=returnMap){entryEpoch++;run=null;world.stopArena();resetCombat();banner.hidden=true;E=[];world.state.scene='hub';P.world.map='hub';nativeSwitch(world.sectMaps[destination]?destination:'hub');configure();}
  world.arenaRun=()=>run;world.arenaBudget=budget;world.leaveArena=()=>leaveArena();
  world.openArena=async function(){if(run||busy)return;const epoch=++entryEpoch;dialog.show('Đấu trường tông môn','Map thử thách riêng gồm 30 lượt. Quái mạnh dần, mỗi 5 lượt có thủ lĩnh. Mỗi ngày được vào 2 lần; vào trận là dùng một lượt, kể cả khi rời sớm hoặc trọng thương.');dialog.line('Đang kiểm tra lượt trong ngày…');
    try{const info=await budget();if(epoch!==entryEpoch||!dialog.isOpen()||$('world-title').textContent!=='Đấu trường tông môn')return;dialog.line(`Hôm nay còn ${info.remaining}/2 lượt · đặt lại lúc 00:00.`);
      dialog.action('Vào đấu trường · 30 lượt',async()=>{if(busy)return;busy=true;try{await budget(true);if(epoch===entryEpoch)enterArena();}catch(error){dialog.line(error.message);}finally{busy=false;}},!info.remaining||!world.progress().tutorial);
    }catch(error){if(epoch===entryEpoch&&dialog.isOpen())dialog.line(error.message);}};
  world.handleService=function(id){if(id==='boss'||id==='arena'){world.openArena();return true;}if(id==='leaveArena'){dialog.show('Rời đấu trường','Lượt đã dùng không được hoàn lại.');dialog.action('Rời đấu trường',()=>leaveArena());return true;}
    if(id==='valley-info'){dialog.show('Linh Mạch Cốc','Ba mạch linh: Bắc / Đông / Tây. Quái cho x2 Linh Nguyên, nhiều đạo hạnh hơn 20%, nhưng khỏe hơn 15%. Trọng thương trở về tông môn.');dialog.line('Mạch Bắc: Bọ Ngựa · Mạch Đông: Nguyệt Thố · Mạch Tây: Băng Dực Dơi.');dialog.action('Về đài an toàn · hồi linh lực',()=>{P.x=1000;P.y=1100;P.mp=typeof mmp==='function'?mmp():P.mp;dialog.close();});return true;}
    if(id.startsWith('vein-')){const mine=valleyMines.find(c=>'vein-'+c.id===id);dialog.show(mine?.name||'Mạch linh','Mạch linh hội tụ, quái quanh mạch cho x2 Linh Nguyên.');dialog.line('Farm 6 quái quanh mạch, hồi sinh sau 8 giây. Cẩn thận quái khỏe hơn bãi thường.');return true;}
    if(id==='teleport'&&isValley()){dialog.show('Truyền tống','Rời Linh Mạch Cốc về nơi tu hành.');const back=P.world?.sectHome||world.sectMapFor(P.ap?.w||0);dialog.action('Về tông môn',()=>world.switchScene(back));dialog.action('Về Thiên Vân Thành',()=>world.switchScene('hub'));return true;}
    if(id.startsWith('camp-')){dialog.show('Bãi luyện công',camps.find(c=>'camp-'+c.id===id)?.name||'Yêu thú');dialog.line('Bốn bãi ở bốn hướng, mỗi bãi có 6 quái cùng loài, hồi sinh sau 8 giây. Các bãi luyện công nằm trên các đảo riêng.');return true;}return nativeService(id);};
  const nativeValleyRespawn=nativeRespawn;
  world.respawn=function(){if(run){leaveArena();msg('Thử thách kết thúc do trọng thương.');return;}if(world.state.scene==='valley'){const home=world.sectMapFor(P.ap?.w||0);msg('Trọng thương ở Linh Mạch Cốc! Được đưa về tông môn.');world.state.scene='hub';P.world.map='hub';nativeSwitch(home);configure();P.hp=typeof mhp==='function'?mhp():P.hp;return;}return nativeValleyRespawn();};
  const previousUp=up;up=function(dt){previousUp(dt);if(!run||paused()||dialog.isOpen())return;
    // Quái chết trong đấu trường không được spawn lại như quái farm.
    E=E.filter(e=>!e.dead&&e.hp>0);if(!E.length){if(run.wave===30){const total=30;P.gold+=300;const p=world.progress();p.arenaClears=(p.arenaClears||0)+1;p.bestArenaWave=Math.max(p.bestArenaWave||0,total);leaveArena();saveCharacter();msg('Hoàn tất 30 lượt! +300 Linh Thạch.');return;}
      run.wait+=dt;if(run.wait>=2)nextWave();}updateBanner();};
  const oldMini=world.renderMini;world.renderMini=function(ctx,size){if(world.state.scene==='hub')return oldMini(ctx,size);ctx.fillStyle=layout().sky;ctx.fillRect(0,0,size,size);ctx.save();ctx.scale(size/M,size/M);
    if(world.state.scene==='arena'){ctx.fillStyle='#c2b49a';ctx.beginPath();ctx.ellipse(1000,1100,190,95,0,0,Math.PI*2);ctx.fill();}
    else{const mark=(x,y,rx,ry)=>{ctx.beginPath();ctx.moveTo(x,y-ry);ctx.lineTo(x+rx,y);ctx.lineTo(x,y+ry);ctx.lineTo(x-rx,y);ctx.closePath();ctx.fill();};ctx.fillStyle='#d5c8aa';const main=isValley()?layouts.valley:mainShape();mark(1000,1100,main.rx,main.ry);(isValley()?valleyMines:camps).forEach(c=>{ctx.fillStyle=['#91b67e','#9fd8ed','#d58a80','#bac7e1'][[0,1,4,3].indexOf(c.t)];mark(c.x,c.y,150,78);});}
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(P.x,P.y,18,0,Math.PI*2);ctx.fill();ctx.restore();};
  world.openOverview=()=>{dialog.show(isValley()?'Linh Mạch Cốc':'Tông môn và đấu trường',world.sceneTitle());const c=document.createElement('canvas');c.width=c.height=360;c.className='world-overview';$('world-content').appendChild(c);world.renderMapPreview(c.getContext('2d'),360);world.regions.forEach(r=>dialog.line(r.name+' · '+r.description));(isValley()?valleyMines:camps).forEach(c=>dialog.line(c.name));dialog.line(isValley()?'Linh Mạch Cốc: x2 Linh Nguyên, quái +15% máu/công, +20% đạo hạnh. Trọng thương về tông môn.':'Các đảo luyện công đã tách rời sân tông môn. Trung tâm: Sư phụ, truyền công, truyền tống và lối vào đấu trường. Đấu trường là map riêng: 30 lượt, 2 lần/ngày. Linh Mạch Cốc mở ở Truyền Tống Trận sau khi nhập môn.');};
})();
